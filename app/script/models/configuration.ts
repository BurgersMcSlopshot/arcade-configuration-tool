export interface ApplicationArgs {
    application: string,
    environment: string,
    applicationsDirectory: string,
    groupVarsDirectory: string,
    additionalConfigurationParameters?: {[key: string]: string},
};

export interface Configuration {
    applicationsDirectory: string,
    groupVarsDirectory: string,
};