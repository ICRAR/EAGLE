import * as ko from "knockout";

import { ActionMessage } from "./ActionMessage";
import {Eagle} from './Eagle';
import {Setting} from './Setting';
import {Utils} from './Utils';

export class Errors {


    static fixAll = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        const initialNumWarnings = eagle.graphWarnings().length;
        const initialNumErrors = eagle.graphErrors().length;
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

        // show notification
        Utils.showNotification("Fix All Graph Errors", initialNumErrors + " error(s), " + numErrors + " remain. " + initialNumWarnings + " warning(s), " + numWarnings + " remain.", "info");

        Utils.postFixFunc(eagle);
    }

    static hasWarnings = (errorsWarnings: Errors.ErrorsWarnings) : boolean => {
        return errorsWarnings.warnings.length > 0;
    }

    static hasErrors = (errorsWarnings: Errors.ErrorsWarnings) : boolean => {
        return errorsWarnings.errors.length > 0;
    }

    static getWarnings : ko.PureComputed<ActionMessage[]> = ko.pureComputed(() => {
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

    static getErrors : ko.PureComputed<ActionMessage[]> = ko.pureComputed(() => {
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
        const errors: ActionMessage[] = Errors.getErrors();
        const warnings: ActionMessage[] = Errors.getWarnings();

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
