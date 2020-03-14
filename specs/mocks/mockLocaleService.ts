import { ILocaleService } from "../../src/localization/ILocaleService";
import { LocaleModel } from "../../src/localization";

export class MockLocaleService implements ILocaleService {
    private currentLocale: string;
    
    constructor() {
        this.currentLocale = "en-us";
    }

    public async getLocales(): Promise<LocaleModel[]> {
        const localeEnUs = new LocaleModel();
        localeEnUs.code = "en-us";
        localeEnUs.displayName = "English (US)";

        const localeRuRu = new LocaleModel();
        localeRuRu.code = "ru-ru";
        localeRuRu.displayName = "Русский (Россия)";

        return [localeEnUs, localeRuRu];
    }

    public async createLocale(code: string, displayName: string): Promise<void> {
        // TODO
    }

    public async deleteLocale(code: string): Promise<void> {
        // TODO
    }

    public async getDefaultLocale(): Promise<string> {
        return "en-us";
    }

    public async getCurrentLocale(): Promise<string> {
        return this.currentLocale;
    }

    public async setCurrentLocale(localeCode: string): Promise<void> {
        this.currentLocale = localeCode;
    }

    public async isLocalizationEnabled(): Promise<boolean> {
        return true;
    }
}