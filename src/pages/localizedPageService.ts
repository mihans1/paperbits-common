﻿import * as Utils from "../utils";
import * as Constants from "../constants";
import { PageContract, IPageService } from ".";
import { IObjectStorage, Operator, Query } from "../persistence";
import { IBlockService } from "../blocks";
import { Contract } from "../contract";
import { ILocaleService } from "../localization";
import { LocalizedPageContract } from "./localizedPageContract";
import { PageMetadata } from "./pageMetadata";

const pagesPath = "pages";
const documentsPath = "files";
const templateBlockKey = "blocks/new-page-template";

export class LocalizedPageService implements IPageService {
    constructor(
        private readonly objectStorage: IObjectStorage,
        private readonly blockService: IBlockService,
        private readonly localeService: ILocaleService
    ) { }

    private localizedPageContractToPageContract(localeCode: string, defaultLocale: string, localizedPageContract: LocalizedPageContract): PageContract {
        const pageMetadata = localizedPageContract[Constants.localePrefix][localeCode] || localizedPageContract[Constants.localePrefix][defaultLocale];

        const pageContract: any = {
            key: localizedPageContract.key,
            ...pageMetadata
        };

        return pageContract;
    }

    public async getPageByPermalink(permalink: string, locale: string = null): Promise<PageContract> {
        if (!permalink) {
            throw new Error(`Parameter "permalink" not specified.`);
        }

        locale = locale || await this.localeService.getCurrentLocale();
        const defaultLocale = await this.localeService.getDefaultLocale();

        /* Attempting to get selected locale */

        const permalinkProperty = locale
            ? `${Constants.localePrefix}/${locale}/permalink`
            : `permalink`;

        const query = Query
            .from<PageContract>()
            .where(permalinkProperty, Operator.equals, permalink);

        let result = await this.objectStorage.searchObjects<any>(pagesPath, query);

        const pages: any[] = Object.values(result);

        if (pages.length === 0) {
            /* Attempting to get default locale */

            locale = defaultLocale;

            const permalinkProperty = locale
                ? `${Constants.localePrefix}/${defaultLocale}/permalink`
                : `permalink`;

            const query = Query
                .from<PageContract>()
                .where(permalinkProperty, Operator.equals, permalink);

            result = await this.objectStorage.searchObjects<any>(pagesPath, query);

            const pages = Object.values(result);

            if (pages.length === 0) {
                return null;
            }
        }

        const firstPage = pages[0];

        if (locale) {
            return this.localizedPageContractToPageContract(locale, defaultLocale, firstPage);
        }
        else {
            return <PageContract>firstPage;
        }
    }

    public async getPageByKey(key: string, locale?: string): Promise<PageContract> {
        if (!key) {
            throw new Error(`Parameter "key" not specified.`);
        }

        if (!locale) {
            locale = await this.localeService.getCurrentLocale();
        }

        const defaultLocale = await this.localeService.getDefaultLocale();

        const result = await this.objectStorage.getObject<any>(key);

        if (locale) {
            return this.localizedPageContractToPageContract(locale, defaultLocale, result);
        }
        else {
            return result;
        }
    }

    public async search(pattern: string, locale?: string): Promise<PageContract[]> {
        locale = await this.localeService.getCurrentLocale();
        const defaultLocale = await this.localeService.getDefaultLocale();

        const query = Query
            .from<PageContract>()
        // .where("title", Operator.contains, pattern)
        // .orderBy("title");
        // .select(`${Constants.localePrefix}/${locale}`);

        const result = await this.objectStorage.searchObjects<any>(pagesPath, query);
        const pages = Object.values(result);

        return pages.map(x => this.localizedPageContractToPageContract(locale, defaultLocale, x));
    }

    public async deletePage(page: PageContract | LocalizedPageContract, locale?: string): Promise<void> {
        if (!page) {
            throw new Error(`Parameter "page" not specified.`);
        }

        locale = await this.localeService.getCurrentLocale();

        if (locale) {
            /* if locale is specified, we delete only locale */
            const localizedPage = <LocalizedPageContract>page;
            const deleteContentPromise = this.objectStorage.deleteObject(localizedPage.locales[locale].contentKey);
            const deletePagePromise = this.objectStorage.deleteObject(`${page.key}/${Constants.localePrefix}/${locale}`);

            await Promise.all([deleteContentPromise, deletePagePromise]);
            return;
        }

        /* if locale is not specified, we delete entire page */
        const regularPage = <PageContract>page;
        const deleteContentPromise = this.objectStorage.deleteObject(regularPage.contentKey);
        const deletePagePromise = this.objectStorage.deleteObject(regularPage.key);

        await Promise.all([deleteContentPromise, deletePagePromise]);
    }

    public async createPage(permalink: string, title: string, description: string, keywords: string, locale?: string): Promise<PageContract> {
        locale = await this.localeService.getCurrentLocale();


        const identifier = Utils.guid();
        const pageKey = `${pagesPath}/${identifier}`;
        const contentKey = `${documentsPath}/${identifier}`;

        const page: LocalizedPageContract = {
            key: pageKey,
            locales: {
                [locale]: {
                    title: title,
                    description: description,
                    keywords: keywords,
                    permalink: permalink,
                    contentKey: contentKey
                }
            }
        };

        await this.objectStorage.addObject(pageKey, page);

        const template = await this.blockService.getBlockContent(templateBlockKey);

        await this.objectStorage.addObject(contentKey, template);

        return <any>page;
    }

    public async updatePage(page: PageContract, locale?: string): Promise<void> {
        if (!page) {
            throw new Error(`Parameter "page" not specified.`);
        }

        await this.objectStorage.updateObject<PageContract>(page.key, page);
    }

    public async getPageContent(pageKey: string, locale?: string): Promise<Contract> {
        if (!pageKey) {
            throw new Error(`Parameter "pageKey" not specified.`);
        }

        if (!locale) {
            locale = await this.localeService.getCurrentLocale();
        }
        
        const defaultLocale = await this.localeService.getDefaultLocale();
        const localizedPageContract = await this.objectStorage.getObject<LocalizedPageContract>(pageKey);

        let pageMetadata = localizedPageContract.locales[locale];

        if (!pageMetadata) {
            pageMetadata = localizedPageContract.locales[defaultLocale];
        }

        let pageContent;

        if (pageMetadata.contentKey) {
            pageContent = await this.objectStorage.getObject<Contract>(pageMetadata.contentKey);
        }
        else {
            const pageDefaultLocaleMetadata = localizedPageContract.locales[defaultLocale];
            pageContent = await this.objectStorage.getObject<Contract>(pageDefaultLocaleMetadata.contentKey);
        }

        console.warn(`Page content with key "${pageMetadata.contentKey}" could not be found.`);

        return pageContent;
    }

    public async updatePageContent(pageKey: string, content: Contract, locale?: string): Promise<void> {
        if (!pageKey) {
            throw new Error(`Parameter "pageKey" not specified.`);
        }

        if (!content) {
            throw new Error(`Parameter "content" not specified.`);
        }

        const localizedPageContract = await this.objectStorage.getObject<LocalizedPageContract>(pageKey);

        if (!localizedPageContract) {
            throw new Error(`Page with key "${pageKey}" not found.`);
        }

        if (!locale) {
            locale = await this.localeService.getCurrentLocale();
        }

        let pageMetadata = localizedPageContract.locales[locale];

        if (!pageMetadata) {
            const defaultLocale = await this.localeService.getDefaultLocale();
            const defaultPageMetadata = localizedPageContract.locales[defaultLocale];
            const identifier = Utils.guid();

            pageMetadata = {
                title: defaultPageMetadata.title,
                description: defaultPageMetadata.description,
                permalink: defaultPageMetadata.permalink,
                contentKey: `${documentsPath}/${identifier}`
            };

            localizedPageContract.locales[locale] = pageMetadata;

            await this.objectStorage.updateObject(pageKey, localizedPageContract);
        }
        else if (!pageMetadata.contentKey) {
            const identifier = Utils.guid();
            pageMetadata.contentKey = `${documentsPath}/${identifier}`;
        }

        await this.objectStorage.updateObject(pageMetadata.contentKey, content);
    }
}