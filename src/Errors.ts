import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Utils } from './Utils';

export type Issue = {message: string, show: (() => void) | null, fix: (() => void) | null, fixDescription: string};
export type ErrorsWarnings = {warnings: Issue[], errors: Issue[]};

export enum Validity {
    Unknown = "Unknown",        // validity of the edge is unknown
    Impossible = "Impossible",  // never useful or valid
    Error = "Error",        // invalid, but possibly useful for expert users?   change to error
    Warning = "Warning",        // valid, but some issue that the user should be aware of
    Fixable = "Fixable",        // there is an issue with the connection but for drawing edges eagle will fix this for you
    Valid = "Valid"             // fine
}

export enum Mode {
    Loading = "Loading",
    Graph = "Graph"
}

export class Errors {
    static readonly Validity = Validity;
    static readonly Mode = Mode;

    static Message(message: string): Issue {
        return {message: message, show: null, fix: null, fixDescription:""};
    }
    static Show(message: string, show: () => void): Issue {
        return {message: message, show: show, fix: null, fixDescription:""};
    }
    static Fix(message: string, fix: () => void, fixDescription: string): Issue {
        return {message: message, show: null, fix: fix, fixDescription: fixDescription};
    }
    static ShowFix(message: string, show: () => void, fix: () => void, fixDescription: string): Issue {
        return {message: message, show: show, fix: fix, fixDescription: fixDescription};
    }

    // Guard flag: prevents re-entrant or rapid back-to-back calls (e.g. held key) from
    // each pushing their own partial-fix snapshot into the undo history.
    private static _fixAllRunning: boolean = false;

    static fixAll() : void {
        if (Errors._fixAllRunning){
            return;
        }
        Errors._fixAllRunning = true;

        try {
            const eagle: Eagle = Eagle.getInstance();
            const initialNumWarnings = eagle.graphWarnings().length;
            const initialNumErrors = eagle.graphErrors().length;
            let numErrors   = Infinity;
            let numWarnings = Infinity;
            let numIterations = 0;
            let appliedFixes = false;
            const MAX_ITERATIONS = 10;

            while (numWarnings !== eagle.graphWarnings().length || numErrors !== eagle.graphErrors().length){
                if (numIterations > MAX_ITERATIONS){
                    console.warn("Too many iterations in fixAll()");
                    break;
                }
                numIterations = numIterations+1;

                numWarnings = eagle.graphWarnings().length;
                numErrors = eagle.graphErrors().length;

                for (const error of eagle.graphErrors()){
                    if (error.fix !== null){
                        error.fix();
                        appliedFixes = true;
                    }
                }

                for (const warning of eagle.graphWarnings()){
                    if (warning.fix !== null){
                        warning.fix();
                        appliedFixes = true;
                    }
                }

                eagle.checkEagle();
            }

            // show notification
            Utils.showNotification("Fix All Graph Errors", initialNumErrors + " error(s), " + numErrors + " remain. " + initialNumWarnings + " warning(s), " + numWarnings + " remain.", "info");

            // Only push a snapshot when at least one fix function actually ran.
            if (appliedFixes){
                Utils.postFixFunc(eagle);
            }
        } finally {
            Errors._fixAllRunning = false;
        }
    }

    static hasWarnings(errorsWarnings: ErrorsWarnings) : boolean {
        return errorsWarnings.warnings.length > 0;
    }

    static hasErrors(errorsWarnings: ErrorsWarnings) : boolean {
        return errorsWarnings.errors.length > 0;
    }

    static getWarnings : ko.PureComputed<Issue[]> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();

        switch (eagle.errorsMode()){
            case Mode.Loading:
                return eagle.loadingWarnings();
            case Mode.Graph:
                return eagle.graphWarnings();
            default:
                console.warn("Unknown errorsMode (" + eagle.errorsMode() + "). Unable to getWarnings()");
                return [];
        }
    }, this);

    static getErrors : ko.PureComputed<Issue[]> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();

        switch (eagle.errorsMode()){
            case Mode.Loading:
                return eagle.loadingErrors();
            case Mode.Graph:
                return eagle.graphErrors();
            default:
                console.warn("Unknown errorsMode (" + eagle.errorsMode() + "). Unable to getErrors()");
                return [];
        }
    }, this);

    static getNumFixableIssues : ko.PureComputed<number> = ko.pureComputed(() => {
        let count: number = 0;
        const errors: Issue[] = Errors.getErrors();
        const warnings: Issue[] = Errors.getWarnings();

        // count the errors
        for (const error of errors){
            if (error.fix !== null){
                count += 1;
            }
        }

        // count the warnings
        for (const warning of warnings){
            if (warning.fix !== null){
                count += 1;
            }
        }

        return count;
    }, this);

    // helper function to convert unknown error type to string
    // typically used in catch blocks where the error type is unknown
    static UnknownToError(error: unknown): string {
        // handle Error objects
        if (error instanceof Error){
            return error.message;
        }

        // handle JSON
        if (typeof error === "string"){
            try {
                const errorObj = JSON.parse(error);
                if (errorObj.error){
                    return errorObj.error;
                }
            } catch (err){
                // not JSON, ignore
                return error;
            }
        }

        return String(error);
    }
}