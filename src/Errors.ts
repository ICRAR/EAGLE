export class Errors {
    static NoFix(message: string): Errors.Issue {
        return {message: message, show: null, fix: null, fixDescription:""};
    }
    static Fix(message: string, show: () => void, fix: () => void, fixDescription: string): Errors.Issue {
        return {message: message, show: show, fix: fix, fixDescription: fixDescription};
    }
}

export namespace Errors
{
    export type Issue = {message: string, show: () => void, fix: () => void, fixDescription: string};
    export type ErrorsWarnings = {warnings: Issue[], errors: Issue[]};
}
