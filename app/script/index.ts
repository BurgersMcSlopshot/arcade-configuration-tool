import { withApplication, getApplicatonConfigurations, mergeConfiguration, toJSON } from "./utils/configuration-reader";
import { ApplicationArgs, Configuration } from "./models/configuration";
import process from 'process';
import path from 'path';
import fs from 'fs'

const DEFAULT_CONFIG: Configuration = {
    applicationsDirectory: 'code/neptune-deploy/applications',
    groupVarsDirectory: 'code/neptune-deploy/group_vars',
}

function resolveApplicatonPattern(applicationDirectory: string, pattern: string): string[] {
    const directory = fs.readdirSync(applicationDirectory)
    return directory
    .filter(f=>f.endsWith(".yml"))
    .map(f=>f.substring(0, f.length-4))
    .filter(f=>f.match(pattern));
}

function parseArgs(): ApplicationArgs {
    let capturingKey: string | undefined;
    let capturingValue: string | undefined;
    const commandLineConfig = process.argv.reduce((config, arg) => {
        if(arg.startsWith('-')) {
            if(capturingKey) {
                config[capturingKey] = capturingValue ? capturingValue : 'TRUE';
                capturingKey = arg.substring(1);
                capturingValue = undefined;
            } else {
                capturingKey = arg.substring(1);
            }
        } else if (capturingKey) {
            capturingValue = capturingValue ? + ' ' + arg : arg;
        }
        return config;
    },{} as {[key: string]: string });
    
    if(capturingKey) {
        commandLineConfig[capturingKey] = capturingValue ? capturingValue : 'TRUE';
    }
    const {application, environment, groupVarsDirectory, applicationsDirectory, ...additionalArgs} = commandLineConfig;
    if(!application) {
        throw '-application is a required argument';
    }
    if(!environment) {
        throw '-environment is a required argument';
    }

    const resolvedApplicationDirectory = (applicationsDirectory || path.join(process.env.HOME || '', DEFAULT_CONFIG.applicationsDirectory)).toString();
    const applications = resolveApplicatonPattern(resolvedApplicationDirectory, application);

    return {
        applications,
        environment: environment.toString(),
        groupVarsDirectory: (groupVarsDirectory || path.join(process.env.HOME || '', DEFAULT_CONFIG.groupVarsDirectory)).toString(),
        applicationsDirectory: resolvedApplicationDirectory,
        additionalConfigurationParameters: {
            env: environment,
            ...additionalArgs,
        },
    }
}

const args = parseArgs();
args.applications.map(application => 
withApplication(application, args)
.then(document => getApplicatonConfigurations(application, args, document)
    .then(configurations => {
        const result = configurations.reduce((wholeConfiguration, configFileTuple) => {
            const {filename, configuration} = configFileTuple;
            return mergeConfiguration(wholeConfiguration, configuration, filename);
        },{sourceFile: "", value:{}});
        fs.writeFileSync(`${application}.${args.environment}.json`, JSON.stringify(toJSON(result, result, args.additionalConfigurationParameters), null, 2));
    }, reason => {
        console.warn(`loading configuration failed: ${reason}`);
    })));