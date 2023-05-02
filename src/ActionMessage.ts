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
}

export namespace ActionMessage {
    export enum Level {
        Success = "Success",
        Error = "Error",
        Warning = "Warning",
        Info = "Info"
    }
}