export interface ApplicationRole {
    role:string;
    when:string
};

export interface ApplicationVariables {
    app_yaml_schema: string;
    files: string[];
}

export interface Application {
    hosts: string;
    roles: ApplicationRole[];
    vars: ApplicationVariables;
}