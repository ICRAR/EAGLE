import * as ko from "knockout";

import { ActionMessage } from "./Action";
import { Eagle } from './Eagle';
import { Utils } from './Utils';

export class ActionList {

    mode: ko.Observable<ActionList.Mode>;
    messages: ko.ObservableArray<ActionMessage>;

    constructor(){
        this.mode = ko.observable(ActionList.Mode.None)
        this.messages = ko.observableArray([]);
    }

    fixAll = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        const initialNumMessages = this.messages().length;
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

    static getNumWarnings : ko.PureComputed<number> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();
        let result: number = 0;

        for (const error of eagle.checkGraphMessages()){
            if (error.level === ActionMessage.Level.Warning){
                result += 1;
            }
        }

        return result;

    }, this);

    static getNumErrors : ko.PureComputed<number> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();
         let result: number = 0;

        for (const error of eagle.checkGraphMessages()){
            if (error.level === ActionMessage.Level.Error){
                result += 1;
            }
        }

        return result;
    }, this);

    static getNumFixableIssues : ko.PureComputed<number> = ko.pureComputed(() => {
        let count: number = 0;

        // count the warnings
        for (const message of eagle.actionMessages()){
            if (message.fix !== null){
                count += 1;
            }
        }

        return count;
    }, this);


    static getNumWarnings : ko.PureComputed<number> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();
        let result: number = 0;

        for (const error of eagle.actionMessages()){
            if (error.level === ActionMessage.Level.Warning){
                result += 1;
            }
        }

        return result;

    }, this);

    static getNumErrors : ko.PureComputed<number> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();
         let result: number = 0;

        for (const error of eagle.actionMessages()){
            if (error.level === ActionMessage.Level.Error){
                result += 1;
            }
        }

        return result;
    }, this);

    static hasWarnings = (errors: ActionMessage[]) : boolean => {
        if (errors === null){
            return false;
        }

        for (const error of errors){
            if (error.level === ActionMessage.Level.Warning){
                return true;
            }
        }
        return false;
    }

    static hasErrors = (errors: ActionMessage[]) : boolean => {
        if (errors === null){
            return false;
        }

        for (const error of errors){
            if (error.level === ActionMessage.Level.Error){
                return true;
            }
        }
        return false;
    }

    // only update result if it is worse that current result
    static worstError(errors: ActionMessage[]) : Eagle.LinkValid {
        const hasWarnings: boolean = ActionMessage.hasWarnings(errors);
        const hasErrors: boolean   = ActionMessage.hasErrors(errors);

        if (!hasWarnings && !hasErrors){
            return Eagle.LinkValid.Valid;
        }

        if (hasErrors){
            return Eagle.LinkValid.Invalid;
        }

        return Eagle.LinkValid.Warning;
    }
}

export namespace ActionList
{
    export enum Mode {
        None = "None",
        CheckGraph = "CheckGraph",
        Loading = "Loading",
        UpdateComponents = "UpdateComponents"
    }
}