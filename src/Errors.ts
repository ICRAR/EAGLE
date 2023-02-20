import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Setting} from './Setting';
import {Utils} from './Utils';

export class Errors {
    static Message(message: string): Errors.Issue {
        return {message: message, show: null, fix: null, fixDescription:""};
    }
    static Show(message: string, show: () => void): Errors.Issue {
        return {message: message, show: show, fix: null, fixDescription:""};
    }
    static Fix(message: string, show: () => void, fix: () => void, fixDescription: string): Errors.Issue {
        return {message: message, show: show, fix: fix, fixDescription: fixDescription};
    }

    static fixAll = () : void => {
        const eagle: Eagle = Eagle.getInstance();

        console.log("fixAll()");
        let numErrors   = Infinity;
        let numWarnings = Infinity;
        let numIterations = 0;

        while (numWarnings !== eagle.graphWarnings().length || numErrors !== eagle.graphErrors().length){
            if (numIterations > 10){
                console.warn("Too many iterations in fixAll()");
                break;
            }
            numIterations = numIterations+1;

            numWarnings = eagle.graphWarnings().length;
            numErrors = eagle.graphErrors().length;

            for (const error of eagle.graphErrors()){
                if (error.fix !== null){
                    error.fix();
                }
            }

            for (const warning of eagle.graphWarnings()){
                if (warning.fix !== null){
                    warning.fix();
                }
            }

            eagle.checkGraph();
        }

        Utils.postFixFunc(eagle);
    }

    static getWarnings : ko.PureComputed<Errors.Issue[]> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();

        switch (eagle.errorsMode()){
            case Setting.ErrorsMode.Loading:
                return eagle.loadingWarnings();
            case Setting.ErrorsMode.Graph:
                return eagle.graphWarnings();
            default:
                console.warn("Unknown errorsMode (" + eagle.errorsMode() + "). Unable to getWarnings()");
                return [];
        }
    }, this);

    static getErrors : ko.PureComputed<Errors.Issue[]> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();

        switch (eagle.errorsMode()){
            case Setting.ErrorsMode.Loading:
                return eagle.loadingErrors();
            case Setting.ErrorsMode.Graph:
                return eagle.graphErrors();
            default:
                console.warn("Unknown errorsMode (" + eagle.errorsMode() + "). Unable to getErrors()");
                return [];
        }
    }, this);

    static getNumFixableIssues : ko.PureComputed<number> = ko.pureComputed(() => {
        let count: number = 0;
        const errors: Errors.Issue[] = Errors.getErrors();
        const warnings: Errors.Issue[] = Errors.getWarnings();

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
}

export namespace Errors
{
    export type Issue = {message: string, show: () => void, fix: () => void, fixDescription: string};
    export type ErrorsWarnings = {warnings: Issue[], errors: Issue[]};
}
