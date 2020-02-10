export const EXPR_TYPE = {
    STRING: 1,
    TEMPLATE_VALUE: 2,
}

export interface TemplateExpression {
    start: number;
    end: number;
    type: number;
}

export class Template {
    private dependencies: {[key: string]: boolean} = {};
    private renderers: ((dependencies: {[key: string]: string}) => string)[] = [];

    constructor(templateString: string, expressions: TemplateExpression[]) {
        for(let x = 0; x < expressions.length; x++) {
            const currentExpression = expressions[x];
            if(currentExpression.type === EXPR_TYPE.TEMPLATE_VALUE) {
                const dependencyName = templateString.substring(currentExpression.start, currentExpression.end+1).trim();
                if(dependencyName.length < 1) {
                    throw `undefined variable name in "${templateString}" at characters ${currentExpression.start}-${currentExpression.end}`;
                }
                this.dependencies[dependencyName] = true;
                this.renderers.push((deps) => {
                    const value = deps[dependencyName] || `[MISSING VALUE ${dependencyName}]`;
                    return value;
                });
            } else {
                this.renderers.push((deps) => {
                    return templateString.substring(currentExpression.start, currentExpression.end);
                })
            }
        }
    }

    public getDependencies(): string[] {
        return Object.keys(this.dependencies);
    }

    public render(dependencies: {[key: string]: string}): string {
        return this.renderers.reduce((result, renderer) => result + renderer(dependencies), '');
    }
}