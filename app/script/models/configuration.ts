export interface ApplicationArgs {
    application: string,
    environment: string,
    applicationsDirectory: string,
    groupVarsDirectory: string,
    additionalConfigurationParameters?: {[key: string]: string | boolean},
};

export interface Configuration {
    applicationsDirectory: string,
    groupVarsDirectory: string,
};