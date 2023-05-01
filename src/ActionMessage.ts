export class ActionMessage {
    message: string;
    show: () => void;
    fix: () => void;
    fixDescription: string

    constructor (message: string, show: () => void, fix: () => void, fixDescription: string){
        this.message = message;
        this.show = show;
        this.fix = fix;
        this.fixDescription = fixDescription;
    }

    static Message(message: string): ActionMessage {
        return new ActionMessage(message, null, null, "");
    }
    static Show(message: string, show: () => void): ActionMessage {
        return new ActionMessage(message, show, null, "");
    }
    static Fix(message: string, show: () => void, fix: () => void, fixDescription: string): ActionMessage {
        return new ActionMessage(message, show, fix, fixDescription);
    }
}