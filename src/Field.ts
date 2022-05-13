import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {Config} from './Config';

export class Field {
    private text : ko.Observable<string>; // external user-facing name
    private name : ko.Observable<string>; // internal no-whitespace name
    private value : ko.Observable<string>; // the current value
    private defaultValue : ko.Observable<string>;  // default value
    private description : ko.Observable<string>;
    private readonly : ko.Observable<boolean>;
    private type : ko.Observable<Eagle.DataType>;
    private precious : ko.Observable<boolean>; // indicates that the field is somehow important and should always be shown to the user
    private options : ko.ObservableArray<string>;
    private positional : ko.Observable<boolean>;

    constructor(text: string, name: string, value: string, defaultValue: string, description: string, readonly: boolean, type: Eagle.DataType, precious: boolean, options: string[], positional: boolean){
        this.text = ko.observable(text);
        this.name = ko.observable(name);
        this.value = ko.observable(value);
        this.defaultValue = ko.observable(defaultValue);
        this.description = ko.observable(description);
        this.readonly = ko.observable(readonly);
        this.type = ko.observable(type);
        this.precious = ko.observable(precious);
        this.options = ko.observableArray(options);
        this.positional = ko.observable(positional);
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

    getDefaultValue = () : string => {
        return this.defaultValue();
    }

    setDefaultValue = (value: string): void => {
        this.defaultValue(value);
    }

    hasDefaultValue = () : boolean => {
        return this.value() === this.defaultValue();
    }

    getDescription = () : string => {
        return this.description();
    }

    setDescription = (description: string): void => {
        this.description(description);
    }

    getDescriptionText : ko.PureComputed<string> = ko.pureComputed(() => {
        return this.description() == "" ? "No description available" + " (" + this.type() + ", default value:'" + this.defaultValue() + "')" : this.description() + " (" + this.type() + ", default value:'" + this.defaultValue() + "')";
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

    valIsTrue = (val:string) : boolean => {
        return Utils.asBool(val);
    }

    setType = (type: Eagle.DataType) : void => {
        this.type(type);
    }

    setPrecious = (precious: boolean) : void => {
        this.precious(precious);
    }

    isPrecious = () : boolean => {
        return this.precious();
    }

    getOptions = () : string[] => {
        return this.options();
    }

    isPositionalArgument = () : boolean => {
        return this.positional();
    }

    setPositionalArgument = (positional: boolean): void => {
        this.positional(positional);
    }

    clear = () : void => {
        this.text("");
        this.name("");
        this.value("");
        this.defaultValue("");
        this.description("");
        this.readonly(false);
        this.type(Eagle.DataType.Unknown);
        this.precious(false);
        this.options([]);
        this.positional(false);
    }

    clone = () : Field => {
        return new Field(this.text(), this.name(), this.value(), this.defaultValue(), this.description(), this.readonly(), this.type(), this.precious(), this.options(), this.positional());
    }

    resetToDefault = () : void => {
        this.value(this.defaultValue());
    }

    getFieldValue = () : string => {
        const tooltipText = "Val: " + this.value();
        if  (tooltipText === "Val: "){
            return "";
        }
        return tooltipText;
    }

    fitsComponentSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if(Eagle.componentParamsSearchString() === ""){
            return true
        }else if(this.text().toLowerCase().indexOf(Eagle.componentParamsSearchString().toLowerCase())>=0){
            return true
        }else{
            return false
        }
    },this)

    fitsApplicationSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if(Eagle.applicationArgsSearchString() === ""){
            return true
        }else if(this.text().toLowerCase().indexOf(Eagle.applicationArgsSearchString().toLowerCase())>=0){
            return true
        }else{
            return false
        }
    },this)

    fitsTableSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if (Eagle.tableSearchString() === ""){
            return true;
        }

        return this.text().toLowerCase().indexOf(Eagle.tableSearchString().toLowerCase()) >= 0;
    }, this);

    isDaliugeField : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return Config.DALIUGE_PARAMETER_NAMES.indexOf(this.name()) > -1;
    }, this);

    select = (selection:string, selectionName:string, readOnlyState:boolean, selectionParent:Field, selectionIndex:number, event:any) : void => {
        Eagle.parameterTableSelectionName(selectionName);
        Eagle.parameterTableSelectionParent(selectionParent);
        Eagle.parameterTableSelectionParentIndex(selectionIndex);
        Eagle.parameterTableSelection(selection);
        Eagle.parameterTableSelectionReadonly(readOnlyState);
    }

    // used to transform the value attribute of a field into a variable with the correct type
    // the value attribute is always stored as a string internally
    static string2Type = (value: string, type: Eagle.DataType) : any => {
        switch (type){
            case Eagle.DataType.Boolean:
                return Utils.asBool(value);
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
            defaultValue:field.defaultValue(),
            description:field.description(),
            readonly:field.readonly(),
            type:field.type(),
            precious:field.precious(),
            options:field.options(),
            positional:field.positional()
        };
    }

    static toV3Json = (field : Field) : object => {
        return {
            text:field.text(),
            name:field.name(),
            value:Field.string2Type(field.value(), field.type()),
            defaultValue:field.defaultValue(),
            description:field.description(),
            readonly:field.readonly(),
            type:field.type(),
            precious:field.precious(),
            options:field.options(),
            positional: field.positional()
        };
    }

    static fromOJSJson = (data : any) : Field => {
        let text: string = "";
        let name: string = "";
        let description: string = "";
        let readonly: boolean = false;
        let type: Eagle.DataType = Eagle.DataType.Unknown;
        let value: string = "";
        let defaultValue: string = "";
        let precious: boolean = false;
        let options: string[] = [];
        let positional: boolean = false;

        if (typeof data.text !== 'undefined')
            text = data.text;
        if (typeof data.name !== 'undefined')
            name = data.name;
        if (typeof data.description !== 'undefined')
            description = data.description;
        if (typeof data.readonly !== 'undefined')
            readonly = data.readonly;
        if (typeof data.type !== 'undefined')
            type = data.type;
        if (typeof data.value !== 'undefined' && data.value !== null)
            value = data.value.toString();
        if (typeof data.default !== 'undefined' && data.default !== null)
            defaultValue = data.default.toString();
        if (typeof data.precious !== 'undefined')
            precious = data.precious;
        if (typeof data.options !== 'undefined')
            options = data.options;
        if (typeof data.positional !== 'undefined')
            positional = data.positional;

        return new Field(text, name, value, defaultValue, description, readonly, type, precious, options, positional);
    }

    public static sortFunc = (a: Field, b: Field) : number => {
        if (a.name() < b.name())
            return -1;

        if (a.name() > b.name())
            return 1;

        if (a.type() < b.type())
            return -1;

        if (a.type() > b.type())
            return 1;

        return 0;
    }
}
