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
}

export namespace ActionMessage {
    export enum Level {
        Primary = "Primary",
        Secondary = "Secondary",
        Success = "Success",
        Danger = "Danger",
        Warning = "Warning",
        Info = "Info",
        Light = "Light",
        Dark ="Dark",
    }
}