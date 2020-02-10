import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import { Application } from '../models/application'
import TemplateParser from '../utils/template-parser';
import { Template } from '../models/template';
import {Configuration, ApplicationArgs} from '../models/configuration'

type NeptuneConfigurationFile = {filename: string, configuration: any}

function resolveApplicationFiles(args: ApplicationArgs, files: string[]): string[] {
    const {environment, application} = args
    const applicationFile = `${application}.yml`
    const applicationFiles = [path.join(args.groupVarsDirectory, applicationFile), path.join(args.groupVarsDirectory, environment, applicationFile)];
    return files
    .map(f => {
        const filename = `${f}.yml`;
        const globalFile = path.join(args.groupVarsDirectory, 'globals', filename);
        const environmentGlobal = path.join(args.groupVarsDirectory, environment, 'globals', filename);
        return [globalFile, environmentGlobal];
    })
    .reduce((prev, current) => prev.concat(current), [])
    .concat(applicationFiles)
    .filter(fs.existsSync);
}

function getFilesFromApplication(document: YAML.ast.Document) {
    const [application] = document.toJSON() as Application[];
    return application.vars.files;
}

function isObject(thing: any) {
    return typeof(thing) === "object" && thing.length === undefined;
}

function isArray(thing: any) {
    return typeof(thing) === "object" && thing.length !== undefined;
}

type key = {
    name: string,
    indexes?: number[],
    isArray: boolean,
};

type ConfigurationValueOld = {
    sourceFile: string;
    value: any;
}

type ConfigValueType = ConfigurationValue | ConfigurationValue[] | string | number;



class ConfigurationValue {    

    sourceFile: string;
    value: ConfigValueType;

    public constructor(sourceFile: string, value: ConfigValueType) {
        this.sourceFile = sourceFile;
        this.value = value;
    }
}

type valueResolverFactory = (template: Template) => (config: ConfigurationValueOld, resolvingDependencies: {[key: string]: boolean}) => string 

const DEFAULT_RESOLVING_DEPENDENCIES: {[key: string]: boolean} = {};

const makeValueResolver: valueResolverFactory = (template) => (config, resolvingDependencies = {...DEFAULT_RESOLVING_DEPENDENCIES}) => {
    const dependencyMap: {[key: string]: string} = template
    
    .getDependencies()
    .reduce((dependencyMap, dependency) => {
        if(dependencyMap[dependency] === undefined) {
            if(resolvingDependencies[dependency]) {
                dependencyMap[dependency] = `[CIRCULAR DEPENDENCY ${dependency}]`;
            } else {
                const unknownResolver = () => `[UNKNOWN DEPENDENCY ${dependency}]`;
                const resolver = (config.value && 
                config.value[dependency] && 
                config.value[dependency].value) || unknownResolver;
                dependencyMap[dependency] = resolver(config, resolvingDependencies);
            }
        }
        return dependencyMap
    }, {} as {[key: string]: string});
    return template.render(dependencyMap);
}

export function mergeConfiguration(target: ConfigurationValueOld, source: any, sourceFile: string): ConfigurationValueOld {
    const keyresolver = function(key: string | number, sourceObject: any, targetObject: ConfigurationValueOld): void {
        if(isObject(sourceObject)) {            
            if(targetObject.value[key] === undefined) {
                targetObject.value[key] = {sourceFile, value: {}}
            }
            const newTarget = targetObject.value[key];
            Object.keys(sourceObject).forEach(key => keyresolver(key, sourceObject[key], newTarget))
        } else if (isArray(sourceObject)) {
            if(targetObject.value[key] === undefined || !isArray(targetObject.value[key])) {
                targetObject.value[key] = {sourceFile, value:[]}
            }
            (sourceObject as any[]).forEach((val, idx) => keyresolver(idx, val, targetObject.value[key]));            
        } else {
            let value: any;
            if(typeof(sourceObject) === "string") {
                const templateExpressions = TemplateParser.parseToTemplate(sourceObject);
                if (templateExpressions.length > 1) {
                    const template = new Template(sourceObject, templateExpressions);
                    value = makeValueResolver(template);
                } else {
                    value = () => sourceObject
                }
            } else {
                value = () => sourceObject;
            }
            targetObject.value[key] = {sourceFile, value};
        }
    };    
    Object.keys(source).map(key => keyresolver(key, source[key], target))
    return target;
}

export function toJSON(root:ConfigurationValueOld, source: ConfigurationValueOld): any {
    if(isArray(source.value)) {
        return (source.value as ConfigurationValueOld[]).map(v => toJSON(root, v));
    } else if (isObject(source.value)) {
        return Object.keys(source.value).reduce((target, key) => {
            target[key] = toJSON(root, source.value[key]);
            return target;
        } ,{} as {[key:string]: any});
    } else {
        return source.value(root);
    }
}

export function getApplicatonConfigurations(args: ApplicationArgs, document: YAML.ast.Document): Promise<NeptuneConfigurationFile[]> {
    const applicationFiles = getFilesFromApplication(document);
    const files = resolveApplicationFiles(args, applicationFiles)
    return Promise.all(
        files.map(filename => {
        return fs.promises.readFile(filename)
        .then(buffer => ({filename, configuration: YAML.parseDocument(buffer.toString()).toJSON()}), reason => {
            console.warn(`could not parse ${filename}: ${reason}`);
            return {filename, configuration: {}};
        });
    }));
}

export function withApplication(args: ApplicationArgs): Promise<YAML.ast.Document> {
    const applicationPath = path.join(args.applicationsDirectory, `${args.application}.yml`);
    return fs.promises.realpath(applicationPath)
    .then(file => fs.promises.readFile(file))
    .then(document => YAML.parseDocument(document.toString()))
}
