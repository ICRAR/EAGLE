import * as ko from "knockout";

export class Setting {

    value : ko.Observable<any>;
    private name : string;
    private description : string;
    private type : Setting.Type;
    private key : string;
    private defaultValue : any;

    constructor(name : string, description : string, type : Setting.Type, key : string, defaultValue : any){
        this.name = name;
        this.description = description;
        this.type = type;
        this.key = key;
        this.value = ko.observable(defaultValue);
        this.defaultValue = defaultValue;

        this.load();
        this.save();
    }

    getName = () : string => {
        return this.name;
    }

    getDescription = () : string => {
        return this.description;
    }

    getType = () : Setting.Type => {
        return this.type;
    }

    getKey = () : string => {
        return this.key;
    }

    setValue = (value : any) : void => {
        this.value(value);
        this.save();
    }

    save = () : void => {
        localStorage.setItem(this.key, this.valueToString(this.value()));
    }

    load = () : void => {
        var v = localStorage.getItem(this.key);

        if (v === null)
            this.value(this.defaultValue);
        else
            this.value(this.stringToValue(v));
    }

    toggle = () : void => {
        if (this.type !== Setting.Type.Boolean){
            console.warn("toggle() called on Setting that is not a boolean!" + this.getName() + " " + this.getType() + " " + this.value());
            return;
        }

        // update the value
        this.value(!this.value());

        // save to localStorage
        this.save();
    }

    private valueToString = (value : any) : string => {
        return value.toString();
    }

    private stringToValue = (s : string) : any => {
        switch (this.type){
            case Setting.Type.String:
                return s;
            case Setting.Type.Number:
                return Number(s);
            case Setting.Type.Boolean:
                return s === "true";
        }
    }
}
export namespace Setting {
    export enum Type {
        String,
        Number,
        Boolean
    }
}
