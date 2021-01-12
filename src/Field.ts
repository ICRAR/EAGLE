import * as ko from "knockout";

import {Utils} from './Utils';
import {Eagle} from './Eagle';

export class Field {
    private text : ko.Observable<string>;
    private name : ko.Observable<string>;
    private value : ko.Observable<string>;
    private description : ko.Observable<string>;
    private readonly : ko.Observable<boolean>;
    private type : ko.Observable<Eagle.FieldDataType>;

    constructor(text: string, name: string, value: string, description: string, readonly: boolean, type: Eagle.FieldDataType){
        this.text = ko.observable(text);
        this.name = ko.observable(name);
        this.value = ko.observable(value);
        this.description = ko.observable(description);
        this.readonly = ko.observable(readonly);
        this.type = ko.observable(type);
    }

    getText = () : string => {
        return this.text();
    }

    setText = (text: string): void => {
        this.text(text);
    }

    getName = () : string => {
        return this.name();
    }

    setName = (name: string): void => {
        this.name(name);
    }

    getValue = () : string => {
        return this.value();
    }

    setValue = (value: string): void => {
        this.value(value);
    }

    getDescription = () : string => {
        return this.description();
    }

    setDescription = (description: string): void => {
        this.description(description);
    }

    getDescriptionText = () : string => {
        return this.description() == "" ? "No description available" + " (" + this.type() + ")" : this.description() + " (" + this.type() + ")";
    }

    isReadonly = () : boolean => {
        return this.readonly();
    }

    setReadonly = (readonly: boolean): void => {
        this.readonly(readonly);
    }

    getType = () : Eagle.FieldDataType => {
        return this.type();
    }

    setType = (type: Eagle.FieldDataType) : void => {
        this.type(type);
    }

    clear = () : void => {
        this.text("");
        this.name("");
        this.value("");
        this.description("");
        this.readonly(false);
        this.type(Eagle.FieldDataType.Unknown);
    }

    clone = () : Field => {
        return new Field(this.text(), this.name(), this.value(), this.description(), this.readonly(), this.type());
    }

    editable : ko.PureComputed<boolean> = ko.pureComputed(() => {
        let allowParam : boolean = Eagle.findSettingValue(Utils.ALLOW_READONLY_PARAMETER_EDITING);
        let allowCompo : boolean = Eagle.findSettingValue(Utils.ALLOW_COMPONENT_EDITING);

        let result : boolean = (allowCompo && allowParam) || (allowCompo && !allowParam && !this.readonly());
        //console.log("check if", this.name, "editable:", result, "(", allowCompo, allowParam, this.readonly, ")");
        return result;
    }, this);

    static toOJSJson = (field : Field) : object => {
        return {
            text:field.text,
            name:field.name,
            value:field.value,
            description:field.description,
            readonly:field.readonly,
            type:field.type
        };
    }

    static toV3Json = (field : Field) : object => {
        return {
            text:field.text,
            name:field.name,
            value:field.value,
            description:field.description,
            readonly:field.readonly,
            type:field.type
        };
    }

    static fromOJSJson = (data : any) : Field => {
        let readonly = false;
        let type = Eagle.FieldDataType.Unknown;

        if (typeof data.readonly !== 'undefined')
            readonly = data.readonly;
        if (typeof data.type !== 'undefined')
            type = data.type;

        return new Field(data.text, data.name, data.value, data.description, readonly, type);
    }
}
