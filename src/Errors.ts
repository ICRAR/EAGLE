export class Errors {
    static NoFix(message: string): Errors.Issue {
        return {message: message, visit: null, fix: null, fixDescription:""};
    }
    static Fix(message: string, visit: () => void, fix: () => void, fixDescription: string): Errors.Issue {
        return {message: message, visit: visit, fix: fix, fixDescription: fixDescription};
    }
}

export namespace Errors
{
    export type Issue = {message: string, visit: () => void, fix: () => void, fixDescription: string};
    export type ErrorsWarnings = {warnings: Issue[], errors: Issue[]};
}
