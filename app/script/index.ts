import { withApplication, getApplicatonConfigurations, mergeConfiguration, toJSON } from "./utils/configuration-reader";
import { ApplicationArgs, Configuration } from "./models/configuration";
import process from 'process';
import path from 'path';

const DEFAULT_CONFIG: Configuration = {
    applicationsDirectory: 'code/neptune-deploy/applications',
    groupVarsDirectory: 'code/neptune-deploy/group_vars',
}


function parseArgs(): ApplicationArgs {
    let capturingKey: string | undefined;
    let capturingValue: string | undefined;
    const commandLineConfig = process.argv.reduce((config, arg) => {
        if(arg.startsWith('-')) {
            if(capturingKey) {
                config[capturingKey] = capturingValue ? capturingValue : true;
                capturingKey = arg.substring(1);
                capturingValue = undefined;
            } else {
                capturingKey = arg.substring(1);
            }
        } else if (capturingKey) {
            capturingValue = capturingValue ? + ' ' + arg : arg;
        }
        return config;
    },{} as {[key: string]: string | boolean});
    
    if(capturingKey) {
        commandLineConfig[capturingKey] = capturingValue ? capturingValue : true;
    }
    const {application, environment, groupVarsDirectory, applicationsDirectory, ...additionalArgs} = commandLineConfig;
    if(!application) {
        throw '-application is a required argument';
    }
    if(!environment) {
        throw '-environment is a required argument';
    }
    return {
        application: application.toString(),
        environment: environment.toString(),
        groupVarsDirectory: (groupVarsDirectory || path.join(process.env.HOME || '', DEFAULT_CONFIG.groupVarsDirectory)).toString(),
        applicationsDirectory: (applicationsDirectory || path.join(process.env.HOME || '', DEFAULT_CONFIG.applicationsDirectory)).toString(),
        additionalConfigurationParameters: {
            env: environment,
            ...additionalArgs,
        },
    }
}

const args = parseArgs();
withApplication(args)
.then(document => getApplicatonConfigurations(args, document)
    .then(configurations => {
        const result = configurations.reduce((wholeConfiguration, configFileTuple) => {
            const {filename, configuration} = configFileTuple;
            return mergeConfiguration(wholeConfiguration, configuration, filename);
        },{sourceFile: "", value:{}});
        console.log(JSON.stringify(toJSON(result, result), null, 2));
    }, reason => {
        console.warn(`loading configuration failed: ${reason}`);
    }));