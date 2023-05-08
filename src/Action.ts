import * as ko from "knockout";

import { Eagle } from "./Eagle";

export class ActionMessage {
    level: ActionMessage.Level;
    message: string;
    show: () => void;
    fix: () => void;
    fixDescription: string;

    constructor (level: ActionMessage.Level, message: string, show: () => void, fix: () => void, fixDescription: string){
        this.level = level;
        this.message = message;
        this.show = show;
        this.fix = fix;
        this.fixDescription = fixDescription;
    }

    static Error(message: string): ActionMessage {
        return new ActionMessage(ActionMessage.Level.Error, message, null, null, "");
    }
    static Message(level: ActionMessage.Level, message: string): ActionMessage {
        return new ActionMessage(level, message, null, null, "");
    }
    static Show(level: ActionMessage.Level, message: string, show: () => void): ActionMessage {
        return new ActionMessage(level, message, show, null, "");
    }
    static Fix(level: ActionMessage.Level, message: string, show: () => void, fix: () => void, fixDescription: string): ActionMessage {
        return new ActionMessage(level, message, show, fix, fixDescription);
    }

    // sorting order
    // 1. by level
    // 2. alphabetically by message
    public static actionMessageSortFunc(a : ActionMessage, b : ActionMessage) : number {
        if (a.level < b.level)
            return -1;

        if (a.level > b.level)
            return 1;

        if (a.message < b.message)
            return -1;

        if (a.message > b.message)
            return 1;

        return 0;
    }

    // TODO: more cases?
    public static levelToCss(level: ActionMessage.Level) : "danger" | "warning" | "info" | "success" {
        switch (level){
            case ActionMessage.Level.Error:
                return "danger";
            case ActionMessage.Level.Warning:
                return "warning";
            default:
                return "info";
        }
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
}

export namespace ActionMessage {
    export enum Level {
        Success = "Success",
        Error = "Error",
        Warning = "Warning",
        Info = "Info"
    }
}