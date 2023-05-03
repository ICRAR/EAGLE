import * as ko from "knockout";

import { ActionMessage } from "./ActionMessage";
import {Eagle} from './Eagle';
import {Setting} from './Setting';
import {Utils} from './Utils';

export class Errors {


    static fixAll = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        const initialNumMessages = eagle.checkGraphMessages().length;
        let numMessages   = Infinity;
        let numIterations = 0;

        while (numMessages !== eagle.checkGraphMessages().length){
            if (numIterations > 10){
                console.warn("Too many iterations in fixAll()");
                break;
            }
            numIterations = numIterations+1;

            numMessages = eagle.checkGraphMessages().length;

            for (const message of eagle.checkGraphMessages()){
                if (message.fix !== null){
                    message.fix();
                }
            }

            eagle.checkGraph();
        }

        // show notification
        Utils.showNotification("Fix All Graph Errors", initialNumMessages + " error(s), " + numMessages + " remain. ", "info");

        Utils.postFixFunc(eagle);
    }

    static hasWarnings = (errors: ActionMessage[]) : boolean => {
        for (const error of errors){
            if (error.level === ActionMessage.Level.Warning){
                return true;
            }
        }
        return false;
    }

    static hasErrors = (errors: ActionMessage[]) : boolean => {
        for (const error of errors){
            if (error.level === ActionMessage.Level.Error){
                return true;
            }
        }
        return false;
    }

    static getWarnings : ko.PureComputed<ActionMessage[]> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();
        const result: ActionMessage[] = [];

        for (const error of eagle.checkGraphMessages()){
            if (error.level === ActionMessage.Level.Warning){
                result.push(error);
            }
        }

        return result;

    }, this);

    static getErrors : ko.PureComputed<ActionMessage[]> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();
        const result: ActionMessage[] = [];

        for (const error of eagle.checkGraphMessages()){
            if (error.level === ActionMessage.Level.Error){
                result.push(error);
            }
        }

        return result;
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
