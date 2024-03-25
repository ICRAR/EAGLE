import * as ko from "knockout";

import { ActionMessage } from "./Action";
import { ComponentUpdater } from "./ComponentUpdater";
import { Eagle } from './Eagle';
import { Utils } from './Utils';

export class ActionList {

    mode: ko.Observable<ActionList.Mode>;
    messages: ko.ObservableArray<ActionMessage>;

    constructor(){
        this.mode = ko.observable(ActionList.Mode.None)
        this.messages = ko.observableArray([]);
    }

    static perform = (index: number): void => {
        console.log("ActionList.perform()", index);

        const eagle: Eagle = Eagle.getInstance();
        const actionList: ActionList = eagle.actionList();

        const message = actionList.messages()[index];
        if (message.fix !== null){
            // perform the action
            message.fix();

            // and remove it from the list
            actionList.messages.splice(index, 1);
        }

        this.postPerformFunc(eagle);
    }

    static performAll = () : void => {
        console.log("performAll()");

        const eagle: Eagle = Eagle.getInstance();
        const actionList: ActionList = eagle.actionList();
        const initialNumMessages = actionList.messages().length;
        let numMessages   = Infinity;
        let numIterations = 0;

        // iterate through the messages list multiple times, until the length of the list is unchanged
        while (numMessages !== actionList.messages().length){
            // check that we haven't iterated through the list too many times
            if (numIterations > 10){
                console.warn("Too many iterations in performAll()");
                break;
            }
            numIterations = numIterations+1;

            numMessages = actionList.messages().length;

            for (let i = numMessages - 1 ; i >= 0 ; i--){
                const message = actionList.messages()[i];
                if (message.fix !== null){
                    // perform the action
                    message.fix();

                    // and remove it from the list
                    actionList.messages.splice(i, 1);
                }
            }
        }

        // show notification
        Utils.showNotification("Performed All Actions: ", initialNumMessages + " action(s), " + numMessages + " remain. ", "info");

        this.postPerformFunc(eagle);
    }

    static postPerformFunc = (eagle: Eagle) => {
        eagle.selectedObjects.valueHasMutated();
        eagle.logicalGraph().fileInfo().modified = true;

        switch (eagle.actionList().mode()){
            case ActionList.Mode.UpdateComponents:
                ComponentUpdater.determineUpdates(eagle.palettes(), eagle.logicalGraph(), function(errors: ActionMessage[], updates: ActionMessage[]){
                    this.messages(errors.concat(updates));
                });
                break;
            case ActionList.Mode.Loading:
                break;
        }

        eagle.undo().pushSnapshot(eagle, "Performed Action(s)");
    }

    getNumPerformableActions : ko.PureComputed<number> = ko.pureComputed(() => {
        let count: number = 0;

        // count the warnings
        for (const message of this.messages()){
            if (message.fix !== null){
                count += 1;
            }
        }

        return count;
    }, this);


    getNumWarnings : ko.PureComputed<number> = ko.pureComputed(() => {
        let result: number = 0;

        for (const error of this.messages()){
            if (error.level === ActionMessage.Level.Warning){
                result += 1;
            }
        }

        return result;

    }, this);

    getNumErrors : ko.PureComputed<number> = ko.pureComputed(() => {
        let result: number = 0;

        for (const error of this.messages()){
            if (error.level === ActionMessage.Level.Error){
                result += 1;
            }
        }

        return result;
    }, this);

    getNumInfo : ko.PureComputed<number> = ko.pureComputed(() => {
        let result: number = 0;

        for (const error of this.messages()){
            if (error.level === ActionMessage.Level.Info){
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
        // TODO: can probably avoid doing two loops here!
        const hasWarnings: boolean = ActionList.hasWarnings(errors);
        const hasErrors: boolean   = ActionList.hasErrors(errors);

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
        Loading = "Loading",
        UpdateComponents = "UpdateComponents"
    }
}
