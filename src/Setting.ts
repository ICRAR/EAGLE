import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

export class Setting {
    value : ko.Observable<any>;
    private name : string;
    private description : string;
    private type : Setting.Type;
    private key : string;
    private displayFunc : (eagle: Eagle) => boolean;
    private toggleFunc : (value: boolean) => void;
    private defaultValue : any;
    private oldValue : any;

    constructor(name : string, description : string, type : Setting.Type, key : string, displayFunc: (eagle:Eagle) => boolean, toggleFunc: (value: boolean) => void, defaultValue : any){
        this.name = name;
        this.description = description;
        this.type = type;
        this.key = key;
        this.displayFunc = displayFunc;
        this.toggleFunc = toggleFunc;
        this.value = ko.observable(defaultValue);
        this.defaultValue = defaultValue;
        this.oldValue = "";

        this.load();

        const that = this;
        this.value.subscribe(function(){
            that.save();
        });
    }

    static expertModeEnabled = (eagle: Eagle) : boolean => {
        return Eagle.findSettingValue(Utils.ENABLE_EXPERT_MODE);
    }

    static true = (eagle: Eagle) : boolean => {
        return true;
    }

    static noop = (value: boolean) : void => {
        return;
    }

    static toggleExpertMode = (value: boolean) : void => {
        // enable some other settings
        Eagle.setSettingValue(Utils.ALLOW_INVALID_EDGES, value);
        Eagle.setSettingValue(Utils.ALLOW_COMPONENT_EDITING, value);
        Eagle.setSettingValue(Utils.ALLOW_PALETTE_EDITING, value);
        Eagle.setSettingValue(Utils.ALLOW_READONLY_PALETTE_EDITING, value);
        Eagle.setSettingValue(Utils.ALLOW_EDGE_EDITING, value);
        Eagle.setSettingValue(Utils.SHOW_DALIUGE_RUNTIME_PARAMETERS, value);
    }

    getName = () : string => {
        return this.name;
    }

    getDescription = () : string => {
        return this.description + " (default value: " + this.defaultValue + ")";
    }

    getType = () : Setting.Type => {
        return this.type;
    }

    getKey = () : string => {
        return this.key;
    }

    getDisplay = (eagle: Eagle) : boolean => {
        return this.displayFunc(eagle);
    }

    // TODO: do we need this?
    getSettings = () :any => {
        console.log("bop")
    }

    save = () : void => {
        localStorage.setItem(this.key, this.valueToString(this.value()));
    }

    load = () : void => {
        const v = localStorage.getItem(this.key);

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

        this.toggleFunc(this.value());
    }

    copy = () : void => {
        navigator.clipboard.writeText(this.value().toString()).then(function() {
            Utils.showNotification("Success", "Copying to clipboard was successful!", "success");
        }, function(err) {
            Utils.showNotification("Error", "Could not copy setting. " + err, "danger");
        });
    }

    resetDefault = () : void => {
        this.value(this.defaultValue);
    }

    cancelChanges = () : void => {
        this.value(this.oldValue)
    }

    copyCurrentSettings = () : void => {
        this.oldValue = this.value()
    }

    private valueToString = (value : any) : string => {
        return value.toString();
    }

    private stringToValue = (s : string) : any => {
        switch (this.type){
            case Setting.Type.String:
            case Setting.Type.Password:
                return s;
            case Setting.Type.Number:
                return Number(s);
            case Setting.Type.Boolean:
                return Utils.asBool(s);
            default:
                console.warn("Unknown setting type", this.type);
                return s;
        }
    }
}

export namespace Setting {
    export enum Type {
        String,
        Number,
        Boolean,
        Password
    }
}
