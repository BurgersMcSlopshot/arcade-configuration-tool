export interface ApplicationArgs {
    applications: string[],
    environment: string,
    applicationsDirectory: string,
    groupVarsDirectory: string,
    additionalConfigurationParameters?: {[key: string]: string},
};

export interface Configuration {
    applicationsDirectory: string,
    groupVarsDirectory: string,
};