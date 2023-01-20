import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

export class SettingsGroup {
    private name : string;
    private displayFunc : (eagle: Eagle) => boolean;
    private settings : Setting[];

    constructor(name: string, displayFunc: () => boolean, settings: Setting[]){
        this.name = name;
        this.displayFunc = displayFunc;
        this.settings = settings;
    }

    isVisible = (eagle: Eagle) : boolean => {
        return this.displayFunc(eagle);
    }

    getSettings = () : Setting[] => {
        return this.settings;
    }

    // used by the settings modal html to generate an id from the name
    getHtmlId = () : string => {
        return 'settingCategory' + this.name.split(' ').join('');
    }
}

export class Setting {
    value : ko.Observable<any>;
    private name : string;
    private description : string;
    private type : Setting.Type;
    private key : string;
    private defaultValue : any;
    private oldValue : any;
    private options : string[];

    constructor(name : string, description : string, type : Setting.Type, key : string, defaultValue : any, options?: string[]){
        this.name = name;
        this.description = description;
        this.type = type;
        this.key = key;
        this.value = ko.observable(defaultValue);
        this.defaultValue = defaultValue;
        this.oldValue = "";
        this.options = options;

        this.load();

        const that = this;
        this.value.subscribe(function(){
            that.save();
        });
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

    getOldValue = () : any => {
        return this.oldValue;
    }

    setValue = (value: any) : void => {
        this.value(value);
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
            case Setting.Type.Select:
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

    static find = (key : string) : Setting => {
        // check if Eagle constructor has not been run (usually the case when this module is being used from a tools script)
        if (typeof Eagle.settings === 'undefined'){
            return null;
        }

        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                if (setting.getKey() === key){
                    return setting;
                }
            }
        }

        return null;
    }

    static findValue = (key : string) : any => {
        const setting = Setting.find(key);

        if (setting === null){
            console.warn("No setting", key);
            return null;
        }

        return setting.value();
    }

    static setValue = (key : string, value : any) : void => {
        const setting = Setting.find(key);
        console.log('settings changed')
        if (setting === null){
            console.warn("No setting", key);
            return;
        }

        return setting.value(value);
    }

    static resetDefaults = () : void => {
        // if a reset would turn off the expert mode setting,
        // AND we are currently on the 'advanced editing' or 'developer' tabs of the setting modal,
        // then those tabs will disappear and we'll be left looking at nothing, so switch to the 'User Options' tab
        const uiModeSetting: Setting = Setting.find(Utils.USER_INTERFACE_MODE);
        const turningOffExpertMode = uiModeSetting.value() !== Eagle.UIMode.Expert && uiModeSetting.getOldValue() === Eagle.UIMode.Expert;
        const currentSettingsTab: string = $('.settingsModalButton.settingCategoryBtnActive').attr('id');

        if (turningOffExpertMode && (currentSettingsTab === "settingCategoryAdvancedEditing" || currentSettingsTab === "settingCategoryDeveloper")){
            // switch back to "User Options" tab
            $('#settingCategoryUserOptions').click();
        }

        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                setting.resetDefault();
            }
        }
    }
}

export namespace Setting {
    export enum Type {
        String,
        Number,
        Boolean,
        Password,
        Select
    }
}
