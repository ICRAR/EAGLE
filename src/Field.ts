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
    private type : ko.Observable<Eagle.DataType>;
    private precious : ko.Observable<boolean>; // indicates that the field is somehow important and should always be shown to the user
    private options : ko.ObservableArray<string>;
    private positional : ko.Observable<boolean>;

    // port-specific attributes
    private id : ko.Observable<string>;
    private portType : ko.Observable<Eagle.PortType>;
    private isEvent : ko.Observable<boolean>;
    private nodeKey : ko.Observable<number>;

    constructor(id: string, displayText: string, idText: string, value: string, defaultValue: string, description: string, readonly: boolean, type: Eagle.DataType, precious: boolean, options: string[], positional: boolean){
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

        this.id = ko.observable(id);
        this.portType = ko.observable(Eagle.PortType.Parameter);
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

    getPortType = (): Eagle.PortType => {
        return this.portType();
    }

    setPortType = (portType: Eagle.PortType) : void => {
        this.portType(portType);
    }

    getIsEvent = (): boolean => {
        return this.isEvent();
    }

    setIsEvent = (isEvent: boolean) : void => {
        this.isEvent(isEvent);
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
        this.type(Eagle.DataType.Unknown);
        this.precious(false);
        this.options([]);
        this.positional(false);

        // TODO
    }

    clone = () : Field => {
        const f = new Field(this.id(), this.displayText(), this.idText(), this.value(), this.defaultValue(), this.description(), this.readonly(), this.type(), this.precious(), this.options(), this.positional());
        f.setIsEvent(this.isEvent());
        // TODO
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
        this.id(id);
        this.idText(src.idText());
        this.displayText(src.displayText());
        this.nodeKey(nodeKey);
        this.isEvent(src.isEvent());
        this.type(src.type());
        this.description(src.description());

        // TODO: more
    }

    isInputPort = () : boolean => {
        return this.portType() === Eagle.PortType.InputPort;
    }

    isOutputPort = () : boolean => {
        return this.portType() === Eagle.PortType.OutputPort;
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

        return this.displayText().toLowerCase().indexOf(Eagle.tableSearchString().toLowerCase()) >= 0;
    }, this);

    isDaliugeField : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return Config.DALIUGE_PARAMETER_NAMES.indexOf(this.idText()) > -1;
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
            text:field.displayText(),
            name:field.idText(),
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
            text:field.displayText(),
            name:field.idText(),
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
        let id: string = Utils.uuidv4();
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

        return new Field(id, text, name, value, defaultValue, description, readonly, type, precious, options, positional);
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

    static toOJSJsonPort = (field : Field) : object => {
        return {
            Id:field.id(),
            IdText:field.idText(),
            text:field.displayText(),
            event:field.isEvent(),
            type:field.type(),
            description:field.description()
        };
    }

    static fromOJSJsonPort = (data : any) : Field => {
        let text: string = "";
        let event: boolean = false;
        let type: Eagle.DataType;
        let description: string = "";

        if (typeof data.text !== 'undefined')
            text = data.text;
        if (typeof data.event !== 'undefined')
            event = data.event;
        if (typeof data.type !== 'undefined')
            type = data.type;
        if (typeof data.description !== 'undefined')
            description = data.description;

        const f = new Field(data.Id, text, data.IdText, "", "", description, false, type, false, [], false);
        f.setIsEvent(event);
        return f;
    }
}
