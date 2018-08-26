﻿import "reflect-metadata";
import { IInjector, IInjectorModule } from "../injection";
import { inject, injectable, Container, decorate, interfaces } from "inversify";


export class InversifyInjector implements IInjector {
    private kernel: Container;

    constructor() {
        this.kernel = new Container();

        this.bindSingleton = this.bindSingleton.bind(this);
        this.bind = this.bind.bind(this);
        this.bindComponent = this.bindComponent.bind(this);
    }

    public getFunctionArguments(func): string[] {
        if (!func) {
            debugger;
        }

        const signature = func.toString();
        const matches = signature.match(/function.*?\(([^)]*)\)/);

        if (!matches || matches.length < 2) {
            throw new Error(`Unable to parse function signature: ${signature}`);
        }

        const args = matches[1];

        return args.split(",")
            .map((arg) => {
                return arg.replace(/\/\*.*\*\//, "").trim();
            })
            .filter((arg) => {
                return arg;
            });
    }

    private bindInternal<T>(name: string, component: any): interfaces.BindingInWhenOnSyntax<T> {
        if (this.kernel.isBound(name)) {
            this.kernel.unbind(name);
        }

        const metaDataKeys = Reflect.getMetadataKeys(component);

        try {
            decorate(injectable(), component);
        }
        catch (error) {
            console.warn(`Unable to decorate component "${name}". ${error}`);
        }

        const constructorArguments = this.getFunctionArguments(component);

        for (let i = 0; i < constructorArguments.length; i++) {
            try {
                decorate(inject(constructorArguments[i]), component, i);
            }
            catch (error) {
                console.warn(`Unable to decorate constructor argument "${constructorArguments[i]}" for component "${name}". ${error}`);
            }
        }

        return this.kernel.bind<T>(name).to(component);
    }

    public bind(name: string, transient: any): void {
        this.bindInternal(name, transient);
    }

    public bindSingleton(name: string, singletone: any): void {
        this.bindInternal(name, singletone).inSingletonScope();
    }

    public bindComponent<T>(name, factory: (ctx: IInjector, params?: any) => T): void {
        const construct: any = function () {
            this.factory = factory;
        }
        this.bindInternal(name, construct).inSingletonScope();
    }

    public bindFactory<T>(name, factory: (ctx: IInjector) => T): void {
        let injector = this;

        let construct: any = function () {
            return factory(injector);
        }
        this.bindInternal(name, construct);
    }

    public bindSingletonFactory<T>(name, factory: (ctx: IInjector) => T): void {
        let injector = this;

        let construct: any = function () {
            return factory(injector);
        }
        this.bindInternal(name, construct).inSingletonScope(); //TODO: Read how to bind factory
    }

    public bindInstance<T>(name: string, instance: T): void {
        if (this.kernel.isBound(name)) {
            this.kernel.unbind(name);
        }

        this.kernel.bind(name).toConstantValue(instance);
    }

    public resolve<TImplementationType>(runtimeIdentifier: string): TImplementationType {
        let component = this.kernel.get<TImplementationType>(runtimeIdentifier);

        if (!component) {
            throw `Component ${runtimeIdentifier} not found.`;
        }

        return component;
    }

    public bindModule(module: IInjectorModule): void {
        module.register(this);
    }
}
