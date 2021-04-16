import * as ko from "knockout";

import {Eagle} from './Eagle';

export class Field {
    private text : ko.Observable<string>;
    private name : ko.Observable<string>;
    private value : ko.Observable<string>;
    private description : ko.Observable<string>;
    private readonly : ko.Observable<boolean>;
    private type : ko.Observable<Eagle.DataType>;

    constructor(text: string, name: string, value: string, description: string, readonly: boolean, type: Eagle.DataType){
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

    getDescriptionText : ko.PureComputed<string> = ko.pureComputed(() => {
        return this.description() == "" ? "No description available" + " (" + this.type() + ")" : this.description() + " (" + this.type() + ")";
    }, this);

    isReadonly = () : boolean => {
        return this.readonly();
    }

    setReadonly = (readonly: boolean): void => {
        this.readonly(readonly);
    }

    getType = () : Eagle.DataType => {
        return this.type();
    }

    setType = (type: Eagle.DataType) : void => {
        this.type(type);
    }

    clear = () : void => {
        this.text("");
        this.name("");
        this.value("");
        this.description("");
        this.readonly(false);
        this.type(Eagle.DataType.Unknown);
    }

    clone = () : Field => {
        return new Field(this.text(), this.name(), this.value(), this.description(), this.readonly(), this.type());
    }

    isDaliugeField : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return this.name() === "execution_time" || this.name() === "num_cpus" || this.name() === "group_start" || this.name() === "group_end" || this.name() === "data_volume";
    }, this);

    // used to transform the value attribute of a field into a variable with the correct type
    // the value attribute is always stored as a string internally
    private static string2Type = (value: string, type: Eagle.DataType) : any => {
        switch (type){
            case Eagle.DataType.Boolean:
                return value === 'true';
            case Eagle.DataType.Float:
                return parseFloat(value);
            case Eagle.DataType.Integer:
                return parseInt(value, 10);
            default:
                return value;
        }
    }

    static toOJSJson = (field : Field) : object => {
        return {
            text:field.text(),
            name:field.name(),
            value:Field.string2Type(field.value(), field.type()),
            description:field.description(),
            readonly:field.readonly(),
            type:field.type()
        };
    }

    static toV3Json = (field : Field) : object => {
        return {
            text:field.text(),
            name:field.name(),
            value:Field.string2Type(field.value(), field.type()),
            description:field.description(),
            readonly:field.readonly(),
            type:field.type()
        };
    }

    static fromOJSJson = (data : any) : Field => {
        let readonly = false;
        let type = Eagle.DataType.Unknown;

        if (typeof data.readonly !== 'undefined')
            readonly = data.readonly;
        if (typeof data.type !== 'undefined')
            type = data.type;

        return new Field(data.text, data.name, data.value.toString(), data.description, readonly, type);
    }
}
