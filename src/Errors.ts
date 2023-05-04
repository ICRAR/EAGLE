import * as ko from "knockout";

import { ActionMessage } from "./ActionMessage";
import {Eagle} from './Eagle';
import {Setting} from './Setting';
import {Utils} from './Utils';

export class Errors {


    static fixAll = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        const initialNumMessages = eagle.actionMessages().length;
        let numMessages   = Infinity;
        let numIterations = 0;

        while (numMessages !== eagle.actionMessages().length){
            if (numIterations > 10){
                console.warn("Too many iterations in fixAll()");
                break;
            }
            numIterations = numIterations+1;

            numMessages = eagle.actionMessages().length;

            for (const message of eagle.actionMessages()){
                if (message.fix !== null){
                    message.fix();
                }
            }

            // TODO: if the fixAll function performed component updates, then we do not need to re-check the graph
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
        const eagle: Eagle = Eagle.getInstance();
        let count: number = 0;

        // count the warnings
        for (const message of eagle.actionMessages()){
            if (message.fix !== null){
                count += 1;
            }
        }

        return count;
    }, this);
}
