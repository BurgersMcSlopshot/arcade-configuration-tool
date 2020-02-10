import {EXPR_TYPE, TemplateExpression} from '../models/template'

class TemplateParser {    
    public static parseToTemplate(template: string): TemplateExpression[] {
        let exprs: TemplateExpression[] = [];
        let currExpr: TemplateExpression | undefined = undefined;
        for(let x = 0; x < template.length; x++) {
            const curr = template[x];
            if(currExpr === undefined) {
                currExpr = {start: x, type: EXPR_TYPE.STRING | EXPR_TYPE.TEMPLATE_VALUE, end: x};
            }
            if (curr === '{') {
                x++;
                if(x < template.length) {
                    if(template[x] === '{') {
                        if(currExpr.type === EXPR_TYPE.STRING || currExpr.type === (EXPR_TYPE.TEMPLATE_VALUE | EXPR_TYPE.STRING)) {
                            currExpr.type = EXPR_TYPE.STRING;
                            currExpr.end = x-1;
                            exprs.push(currExpr);
                            currExpr = undefined;
                        }
                        x++;
                        if(x < template.length) {
                            currExpr = {start:x, end: x, type: EXPR_TYPE.STRING | EXPR_TYPE.TEMPLATE_VALUE};
                        }
                    }
                }
            } else if (curr === '}') {
                x++;
                if(x < template.length) {
                    if(template[x] === '}') {
                        if (currExpr.type === (EXPR_TYPE.TEMPLATE_VALUE | EXPR_TYPE.STRING)) {
                            currExpr.type = EXPR_TYPE.TEMPLATE_VALUE;
                            currExpr.end = x-2;                            
                            exprs.push(currExpr);
                            currExpr = undefined
                        }
                    }
                }
            } 
        }
        if(currExpr !== undefined) {
            currExpr.end = template.length;
            if(currExpr.start !== currExpr.end) {
                currExpr.type = EXPR_TYPE.STRING;
                exprs.push(currExpr);
            }
        }
        return exprs;
    }
}

export default TemplateParser;