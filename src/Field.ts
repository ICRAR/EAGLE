import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {Config} from './Config';

export class Field {
    private displayText : ko.Observable<string>; // external user-facing name
    private idText : ko.Observable<string>; // internal no-whitespace name
    private value : ko.Observable<string>; // the current value
    private defaultValue : ko.Observable<string>;  // default value
    private description : ko.Observable<string>;
    private readonly : ko.Observable<boolean>;
    private type : ko.Observable<string>;
    private precious : ko.Observable<boolean>; // indicates that the field is somehow important and should always be shown to the user
    private options : ko.ObservableArray<string>;
    private positional : ko.Observable<boolean>;
    private keyAttribute : ko.Observable<boolean>;

    // port-specific attributes
    private id : ko.Observable<string>;
    private parameterType : ko.Observable<Eagle.ParameterType>;
    private usage : ko.Observable<Eagle.ParameterUsage>;
    private isEvent : ko.Observable<boolean>;
    private nodeKey : ko.Observable<number>;

    constructor(id: string, displayText: string, idText: string, value: string, defaultValue: string, description: string, readonly: boolean, type: string, precious: boolean, options: string[], positional: boolean, parameterType: Eagle.ParameterType, usage: Eagle.ParameterUsage, keyAttribute: boolean){
        this.displayText = ko.observable(displayText);
        this.idText = ko.observable(idText);
        this.value = ko.observable(value);
        this.defaultValue = ko.observable(defaultValue);
        this.description = ko.observable(description);
        this.readonly = ko.observable(readonly);
        this.type = ko.observable(type);
        this.precious = ko.observable(precious);
        this.options = ko.observableArray(options);
        this.positional = ko.observable(positional);
        this.keyAttribute = ko.observable(keyAttribute);

        this.id = ko.observable(id);
        this.parameterType = ko.observable(parameterType);
        this.usage = ko.observable(usage);
        this.isEvent = ko.observable(false);
        this.nodeKey = ko.observable(0);
    }

    getId = () : string => {
        return this.id();
    }

    setId = (id: string): void => {
        this.id(id);
    }

    getDisplayText = () : string => {
        return this.displayText();
    }

    setDisplayText = (displayText: string): void => {
        this.displayText(displayText);
    }

    getIdText = () : string => {
        return this.idText();
    }

    setIdText = (name: string): void => {
        this.idText(name);
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

    getType = () : string => {
        return this.type();
    }

    isType = (type: string) => {
        return Utils.dataTypePrefix(this.type()) === type;
    }

    isKeyAttribute = () : boolean => {
        return this.keyAttribute();
    }

    setKeyAttribute = (keyAttribute: boolean) => {
        this.keyAttribute(keyAttribute);
    }

    toggleKeyAttribute = () => {
        this.keyAttribute(!this.keyAttribute())
    }

    valIsTrue = (val:string) : boolean => {
        return Utils.asBool(val);
    }

    toggle = () => {
        this.value((!Utils.asBool(this.value())).toString());
    }

    setType = (type: string) : void => {
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

    getParameterType = (): Eagle.ParameterType => {
        return this.parameterType();
    }

    setParameterType = (parameterType: Eagle.ParameterType) : void => {
        this.parameterType(parameterType);
    }

    getUsage = (): Eagle.ParameterUsage => {
        return this.usage();
    }

    setUsage = (usage: Eagle.ParameterUsage) : void => {
        this.usage(usage);
    }

    getIsEvent = (): boolean => {
        return this.isEvent();
    }

    setIsEvent = (isEvent: boolean) : void => {
        this.isEvent(isEvent);
    }

    toggleEvent = (): void => {
        this.isEvent(!this.isEvent());
    }

    getNodeKey = () : number => {
        return this.nodeKey();
    }

    setNodeKey = (key : number) : void => {
        this.nodeKey(key);
    }

    clear = () : void => {
        this.displayText("");
        this.idText("");
        this.value("");
        this.defaultValue("");
        this.description("");
        this.readonly(false);
        this.type(Eagle.DataType_Unknown);
        this.precious(false);
        this.options([]);
        this.positional(false);
        this.parameterType(Eagle.ParameterType.Unknown);
        this.usage(Eagle.ParameterUsage.NoPort);
        this.keyAttribute(false);

        this.id("");
        this.isEvent(false);
        this.nodeKey(0);
    }

    clone = () : Field => {
        const f = new Field(this.id(), this.displayText(), this.idText(), this.value(), this.defaultValue(), this.description(), this.readonly(), this.type(), this.precious(), this.options(), this.positional(), this.parameterType(), this.usage(), this.keyAttribute());
        f.setIsEvent(this.isEvent());
        return f;
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

    copyWithKeyAndId = (src: Field, nodeKey: number, id: string) : void => {
        this.displayText(src.displayText());
        this.idText(src.idText());
        this.value(src.value());
        this.defaultValue(src.defaultValue());
        this.description(src.description());
        this.readonly(src.readonly());
        this.type(src.type());
        this.precious(src.precious());
        this.options(src.options());
        this.positional(src.positional());
        this.parameterType(src.parameterType());
        this.usage(src.usage());
        this.setKeyAttribute(src.keyAttribute());
        this.isEvent(src.isEvent());

        // NOTE: these two are not copied from the src, but come from the function's parameters
        this.id(id);
        this.nodeKey(nodeKey);
    }

    isInputPort = () : boolean => {
        return this.usage() === Eagle.ParameterUsage.InputPort || this.usage() === Eagle.ParameterUsage.InputOutput;
    }

    isOutputPort = () : boolean => {
        return this.usage() === Eagle.ParameterUsage.OutputPort || this.usage() === Eagle.ParameterUsage.InputOutput;
    }

    fitsComponentSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if(Eagle.componentParamsSearchString() === ""){
            return true
        }else if(this.displayText().toLowerCase().indexOf(Eagle.componentParamsSearchString().toLowerCase())>=0){
            return true
        }else{
            return false
        }
    },this)

    fitsApplicationSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if(Eagle.applicationArgsSearchString() === ""){
            return true
        }else if(this.displayText().toLowerCase().indexOf(Eagle.applicationArgsSearchString().toLowerCase())>=0){
            return true
        }else{
            return false
        }
    },this)

    fitsTableSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if (Eagle.tableSearchString() === ""){
            return true;
        }

        const nameMatch = this.displayText().toLowerCase().indexOf(Eagle.tableSearchString().toLowerCase()) >= 0
        const nodeParentNameMatch = Eagle.getInstance().logicalGraph().findNodeByKey(this.nodeKey()).getName().toLowerCase().indexOf(Eagle.tableSearchString().toLowerCase()) >= 0
        const useAsMatch = this.usage().toLowerCase().indexOf(Eagle.tableSearchString().toLowerCase()) >= 0
        const fieldTypeMatch = this.type().toLowerCase().indexOf(Eagle.tableSearchString().toLowerCase()) >= 0

        return nameMatch || nodeParentNameMatch || useAsMatch || fieldTypeMatch;
    }, this);

    isDaliugeField : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return Config.DALIUGE_PARAMETER_NAMES.indexOf(this.idText()) > -1;
    }, this);

    getHtmlInputType = () : string => {
        const typePrefix = Utils.dataTypePrefix(this.type());
        switch (typePrefix){
            case Eagle.DataType_Float:
            case Eagle.DataType_Integer:
                return "number";
            case Eagle.DataType_Boolean:
                return "checkbox";
            case Eagle.DataType_Password:
                return "password";
            case Eagle.DataType_Select:
                return "select";
            default:
                return "text";
        }
    }

    static getHtmlTitleText = (parameterType: Eagle.ParameterType, usage: Eagle.ParameterUsage) : string => {
        if (usage === Eagle.ParameterUsage.NoPort){
            switch(parameterType){
                case Eagle.ParameterType.ApplicationArgument:
                return "Application Argument";
                case Eagle.ParameterType.ComponentParameter:
                return "Component Parameter";
            }
        } else {
            switch(usage){
                case Eagle.ParameterUsage.InputPort:
                return "Input Port";
                case Eagle.ParameterUsage.OutputPort:
                return "Output Port";
                case Eagle.ParameterUsage.InputOutput:
                return "Input/Output Port";
            }
        }

        console.warn("Unable to determine title for unexpected field type", parameterType, usage);
        return "";
    }

    // used to transform the value attribute of a field into a variable with the correct type
    // the value attribute is always stored as a string internally
    static stringAsType = (value: string, type: string) : any => {
        switch (type){
            case Eagle.DataType_Boolean:
                return Utils.asBool(value);
            case Eagle.DataType_Float:
                return parseFloat(value);
            case Eagle.DataType_Integer:
                return parseInt(value, 10);
            default:
                return value;
        }
    }

    static toOJSJson = (field : Field) : object => {
        return {
            id:field.id(),
            text:field.displayText(),
            name:field.idText(),
            value:Field.stringAsType(field.value(), field.type()),
            defaultValue:field.defaultValue(),
            description:field.description(),
            readonly:field.readonly(),
            type:field.isEvent() ? "Event" : field.type(),
            precious:field.precious(),
            options:field.options(),
            positional:field.positional(),
            parameterType:field.parameterType(),
            usage:field.usage(),
            keyAttribute:field.keyAttribute()
        };
    }

    static toV3Json = (field : Field) : object => {
        return {
            id:field.id(),
            text:field.displayText(),
            name:field.idText(),
            value:Field.stringAsType(field.value(), field.type()),
            defaultValue:field.defaultValue(),
            description:field.description(),
            readonly:field.readonly(),
            type:field.isEvent() ? "Event" : field.type(),
            precious:field.precious(),
            options:field.options(),
            positional: field.positional(),
            parameterType:field.parameterType(),
            usage:field.usage(),
            keyAttribute:field.keyAttribute()
        };
    }

    static fromOJSJson = (data : any) : Field => {
        let id: string = Utils.uuidv4();
        let text: string = "";
        let name: string = "";
        let description: string = "";
        let readonly: boolean = false;
        let type: string = Eagle.DataType_Unknown;
        let value: string = "";
        let defaultValue: string = "";
        let precious: boolean = false;
        let options: string[] = [];
        let positional: boolean = false;
        let parameterType: Eagle.ParameterType = Eagle.ParameterType.Unknown;
        let usage: Eagle.ParameterUsage = Eagle.ParameterUsage.NoPort;
        let isEvent: boolean = false;
        let keyAttribute: boolean = false;

        if (typeof data.id !== 'undefined')
            id = data.id;
        if (typeof data.text !== 'undefined')
            text = data.text;
        if (typeof data.name !== 'undefined')
            name = data.name;
        if (typeof data.description !== 'undefined')
            description = data.description;
        if (typeof data.readonly !== 'undefined')
            readonly = data.readonly;
        if (typeof data.type !== 'undefined'){
            if (data.type === "Event"){
                isEvent = true;
                type = Eagle.DataType_Unknown;
            } else {
                isEvent = false;
                type = data.type;
            }
        }
        if (typeof data.value !== 'undefined' && data.value !== null)
            value = data.value.toString();
        if (typeof data.defaultValue !== 'undefined' && data.defaultValue !== null)
            defaultValue = data.defaultValue.toString();
        if (typeof data.precious !== 'undefined')
            precious = data.precious;
        if (typeof data.options !== 'undefined')
            options = data.options;
        if (typeof data.positional !== 'undefined')
            positional = data.positional;

        // handle legacy fieldType
        if (typeof data.fieldType !== 'undefined'){
            switch (data.fieldType){
                case "ComponentParameter":
                    parameterType = Eagle.ParameterType.ComponentParameter;
                    usage = Eagle.ParameterUsage.NoPort;
                    break;
                case "ApplicationArgument":
                    parameterType = Eagle.ParameterType.ApplicationArgument;
                    usage = Eagle.ParameterUsage.NoPort;
                    break;
                case "InputPort":
                    parameterType = Eagle.ParameterType.ApplicationArgument;
                    usage = Eagle.ParameterUsage.InputPort;
                    break;
                case "OutputPort":
                    parameterType = Eagle.ParameterType.ApplicationArgument;
                    usage = Eagle.ParameterUsage.OutputPort;
                    break;
                default:
                    console.log("Unhandled fieldType", data.fieldType);
            }
        }

        if (typeof data.parameterType !== 'undefined')
            parameterType = data.parameterType;
        if (typeof data.usage !== 'undefined')
            usage = data.usage;
        if (typeof data.event !== 'undefined')
            event = data.event;
        if (typeof data.keyAttribute !== 'undefined')
            keyAttribute = data.keyAttribute;
        const result = new Field(id, text, name, value, defaultValue, description, readonly, type, precious, options, positional, parameterType, usage, keyAttribute);
        result.setIsEvent(isEvent);
        return result;
    }

    static fromOJSJsonPort = (data : any) : Field => {
        let text: string = "";
        let event: boolean = false;
        let type: string;
        let description: string = "";
        let keyAttribute: boolean = false;

        if (typeof data.text !== 'undefined')
            text = data.text;
        if (typeof data.event !== 'undefined')
            event = data.event;
        if (typeof data.type !== 'undefined')
            type = data.type;
        if (typeof data.description !== 'undefined')
            description = data.description;
        if (typeof data.keyAttribute !== 'undefined')
            keyAttribute = data.keyAttribute;

        // avoid empty text fields if we can
        if (text === ""){
            text = data.IdText;
        }
     
        const f = new Field(data.Id, text, data.IdText, "", "", description, false, type, false, [], false, Eagle.ParameterType.Unknown, Eagle.ParameterUsage.NoPort, keyAttribute);
        f.setIsEvent(event);
        return f;
    }

    public static sortFunc = (a: Field, b: Field) : number => {
        if (a.idText() < b.idText())
            return -1;

        if (a.idText() > b.idText())
            return 1;

        if (a.type() < b.type())
            return -1;

        if (a.type() > b.type())
            return 1;

        return 0;
    }
}
