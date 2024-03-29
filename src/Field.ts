import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {Daliuge} from './Daliuge';

export class Field {
    private displayText : ko.Observable<string>; // user-facing name
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
    private parameterType : ko.Observable<Daliuge.FieldType>;
    private usage : ko.Observable<Daliuge.FieldUsage>;
    private isEvent : ko.Observable<boolean>;
    private nodeKey : ko.Observable<number>;

    constructor(id: string, displayText: string, value: string, defaultValue: string, description: string, readonly: boolean, type: string, precious: boolean, options: string[], positional: boolean, parameterType: Daliuge.FieldType, usage: Daliuge.FieldUsage, keyAttribute: boolean){
        this.displayText = ko.observable(displayText);
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

    toggleReadOnly = () => {
        this.readonly(!this.readonly())
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

    toggleDefault = () => {
        this.defaultValue((!Utils.asBool(this.defaultValue())).toString());
    }

    setType = (type: string) : void => {
        this.type(type);
    }

    setPrecious = (precious: boolean) : void => {
        this.precious(precious);
    }

    togglePrecious = () : void => {
        this.precious(!this.precious());
    }

    isPrecious = () : boolean => {
        return this.precious();
    }

    getOptions = () : string[] => {
        return this.options();
    }

    editOption = (optionIndex:any,newVal:string) : void => {
        //if the option we are editing is selected well update the value or default value
        if(this.options()[optionIndex] === this.value()){
            this.value(newVal)
        }
        if(this.options()[optionIndex] === this.defaultValue()){
            this.defaultValue(newVal)
        }

        this.options()[optionIndex] = newVal
        this.options.valueHasMutated()
    }

    addOption = (newOption:string) : void => {
        let duplicate = false;
        
        for(const option of this.options()){
            if(option.toLowerCase() === newOption.toLowerCase()){
                duplicate = true
                break
            }
        }
        if(!duplicate){
            this.options().push(newOption)
            this.options.valueHasMutated()
        }
    }

    removeOption = (index:number) : void => {
        if(this.options().length <= 1){
            Utils.showNotification("Cannot Remove","There must be at least one option in the select!",'danger');

            return
        }

        //checking if a selected option is being deleted
        let valueDeleted = false
        let defaultValueDeleted = false;
        if(this.options()[index] === this.value()){
            valueDeleted = true
        }
        if(this.options()[index] === this.defaultValue()){
            defaultValueDeleted = true
        }

        //deleting the option
        this.options().splice(index,1)

        //if either the selected value or selected default value option was deleted we set it to the first option on the select
        if(valueDeleted){
            this.value(this.options()[0])
        }
        if(defaultValueDeleted){
            this.defaultValue(this.options()[0])
        }
        this.options.valueHasMutated()
    }

    isPositionalArgument = () : boolean => {
        return this.positional();
    }

    togglePositionalArgument = () : void => {
        this.positional(!this.positional());
    }

    setPositionalArgument = (positional: boolean): void => {
        this.positional(positional);
    }

    getParameterType = (): Daliuge.FieldType => {
        return this.parameterType();
    }

    setParameterType = (parameterType: Daliuge.FieldType) : void => {
        this.parameterType(parameterType);
    }

    getUsage = (): Daliuge.FieldUsage => {
        return this.usage();
    }

    setUsage = (usage: Daliuge.FieldUsage) : void => {
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
        this.value("");
        this.defaultValue("");
        this.description("");
        this.readonly(false);
        this.type(Daliuge.DataType.Unknown);
        this.precious(false);
        this.options([]);
        this.positional(false);
        this.parameterType(Daliuge.FieldType.Unknown);
        this.usage(Daliuge.FieldUsage.NoPort);
        this.keyAttribute(false);

        this.id("");
        this.isEvent(false);
        this.nodeKey(0);
    }

    clone = () : Field => {
        const options : string[] = []
        for (let i = 0 ; i < this.options().length ; i++){
            options.push(this.options()[i]);
        }

        const f = new Field(this.id(), this.displayText(), this.value(), this.defaultValue(), this.description(), this.readonly(), this.type(), this.precious(), options, this.positional(), this.parameterType(), this.usage(), this.keyAttribute());
        f.setIsEvent(this.isEvent());
        f.setNodeKey(this.nodeKey());
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
        return this.usage() === Daliuge.FieldUsage.InputPort || this.usage() === Daliuge.FieldUsage.InputOutput;
    }

    isOutputPort = () : boolean => {
        return this.usage() === Daliuge.FieldUsage.OutputPort || this.usage() === Daliuge.FieldUsage.InputOutput;
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

    fitsConstructSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if(Eagle.constructParamsSearchString() === ""){
            return true
        }else if(this.displayText().toLowerCase().indexOf(Eagle.constructParamsSearchString().toLowerCase())>=0){
            return true
        }else{
            return false
        }
    },this)

    fitsTableSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if (Eagle.tableSearchString() === ""){
            return true;
        }

        const eagle = (<any>window).eagle;
        let searchTermNo : number = 0
        let searchTermTrueNo : number = 0
        const that = this

        Eagle.tableSearchString().toLocaleLowerCase().split(',').forEach(function(term){
            term = term.trim()
            searchTermNo ++
            let result : boolean = false

            //check if the display text matches
            if(that.displayText().toLowerCase().indexOf(term) >= 0){
                result = true
            }

            //check if the node name matches, but only if using the key parameter table modal
            if(eagle.tableModalType() === 'keyParametersTableModal'){
                if(Eagle.getInstance().logicalGraph().findNodeByKey(that.nodeKey()).getName().toLowerCase().indexOf(term) >= 0){
                    result = true
                }
            }

            //check if the usage matches
            if(that.usage().toLowerCase().indexOf(term) >= 0){
                result = true
            }

            //check if the parameter type matches
            if(that.parameterType().toLowerCase().indexOf(term) >= 0){   
                result = true
            }

            //check if the type matches
            if(that.type().toLowerCase().indexOf(term) >= 0){
                result = true
            }

            //count up the number of matches
            if(result){
                searchTermTrueNo ++
            }
        })

        //comparing the number of search terms requested with the number of matches, if any of the search terms did not find anything, we return false
        return searchTermNo === searchTermTrueNo
    }, this);

    isDaliugeField : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return Object.values<string>(Daliuge.FieldName).includes(this.displayText());
    }, this);

    getHtmlInputType = () : string => {
        const typePrefix = Utils.dataTypePrefix(this.type());
        switch (typePrefix){
            case Daliuge.DataType.Float:
            case Daliuge.DataType.Integer:
                return "number";
            case Daliuge.DataType.Boolean:
                return "checkbox";
            case Daliuge.DataType.Password:
                return "password";
            case Daliuge.DataType.Select:
                return "select";
            default:
                return "text";
        }
    }

    static getHtmlTitleText = (parameterType: Daliuge.FieldType, usage: Daliuge.FieldUsage) : string => {
        if (usage === Daliuge.FieldUsage.NoPort){
            switch(parameterType){
                case Daliuge.FieldType.ApplicationArgument:
                return "Application Argument";
                case Daliuge.FieldType.ComponentParameter:
                return "Component Parameter";
            }
        } else {
            switch(usage){
                case Daliuge.FieldUsage.InputPort:
                return "Input Port";
                case Daliuge.FieldUsage.OutputPort:
                return "Output Port";
                case Daliuge.FieldUsage.InputOutput:
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
            case Daliuge.DataType.Boolean:
                return Utils.asBool(value);
            case Daliuge.DataType.Float:
                return parseFloat(value);
            case Daliuge.DataType.Integer:
                return parseInt(value, 10);
            default:
                return value;
        }
    }

    static toOJSJson = (field : Field) : object => {
        const result : any = {
            name:field.displayText(),
            value:Field.stringAsType(field.value(), field.type()),
            defaultValue:field.defaultValue(),
            description:field.description(),
            readonly:field.readonly(),
            type:field.isEvent() ? "Event" : field.type(),
            precious:field.precious(),
            options:field.options(),
            positional:field.positional(),
            keyAttribute:field.keyAttribute(),
            id: field.id(),
            parameterType: field.parameterType(),
            usage: field.usage(),
        }

        return result;
    }

    static toV3Json = (field : Field) : object => {
        const result : any =  {
            name:field.displayText(),
            value:Field.stringAsType(field.value(), field.type()),
            defaultValue:field.defaultValue(),
            description:field.description(),
            readonly:field.readonly(),
            type:field.isEvent() ? "Event" : field.type(),
            precious:field.precious(),
            options:field.options(),
            positional: field.positional(),
            keyAttribute:field.keyAttribute(),
            id: field.id(),
            parameterType: field.parameterType(),
            usage: field.usage()
        };

        return result;
    }

    static toOJSJsonPort = (field : Field) : object => {
        return {
            Id:field.id(),
            name:field.displayText(),
            event:field.isEvent(),
            type:field.type(),
            description:field.description(),
            keyAttribute:field.keyAttribute()
        };
    }

    static fromOJSJson = (data : any) : Field => {
        let id: string = Utils.uuidv4();
        let name: string = "";
        let description: string = "";
        let readonly: boolean = false;
        let type: string = Daliuge.DataType.Unknown;
        let value: string = "";
        let defaultValue: string = "";
        let precious: boolean = false;
        let options: string[] = [];
        let positional: boolean = false;
        let parameterType: Daliuge.FieldType = Daliuge.FieldType.Unknown;
        let usage: Daliuge.FieldUsage = Daliuge.FieldUsage.NoPort;
        let isEvent: boolean = false;
        let keyAttribute: boolean = false;

        if (typeof data.id !== 'undefined')
            id = data.id;
            
        if (typeof data.name !== 'undefined')
            name = data.name;
        if (typeof data.description !== 'undefined')
            description = data.description;
        if (typeof data.readonly !== 'undefined')
            readonly = data.readonly;
        if (typeof data.type !== 'undefined'){
            if (data.type === "Event"){
                isEvent = true;
                type = Daliuge.DataType.Unknown;
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
                    parameterType = Daliuge.FieldType.ComponentParameter;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                case "ApplicationArgument":
                    parameterType = Daliuge.FieldType.ApplicationArgument;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                case "InputPort":
                    parameterType = Daliuge.FieldType.ApplicationArgument;
                    usage = Daliuge.FieldUsage.InputPort;
                    break;
                case "OutputPort":
                    parameterType = Daliuge.FieldType.ApplicationArgument;
                    usage = Daliuge.FieldUsage.OutputPort;
                    break;
                case "ConstructParameter":
                    parameterType = Daliuge.FieldType.ConstructParameter;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                default:
                    console.warn("Unhandled fieldType", data.fieldType);
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
        const result = new Field(id, name, value, defaultValue, description, readonly, type, precious, options, positional, parameterType, usage, keyAttribute);
        result.setIsEvent(isEvent);
        return result;
    }

    static fromOJSJsonPort = (data : any) : Field => {
        let name: string = "";
        let event: boolean = false;
        let type: string;
        let description: string = "";
        let keyAttribute: boolean = false;

        if (typeof data.name !== 'undefined')
            name = data.name;
        if (typeof data.event !== 'undefined')
            event = data.event;
        if (typeof data.type !== 'undefined')
            type = data.type;
        if (typeof data.description !== 'undefined')
            description = data.description;
        if (typeof data.keyAttribute !== 'undefined')
            keyAttribute = data.keyAttribute;

        // avoid empty text fields if we can
        if (name === ""){
            name = data.IdText;
        }
     
        const f = new Field(data.Id, name, "", "", description, false, type, false, [], false, Daliuge.FieldType.Unknown, Daliuge.FieldUsage.NoPort, keyAttribute);
        f.setIsEvent(event);
        return f;
    }

    public static sortFunc = (a: Field, b: Field) : number => {
        if (a.displayText() < b.displayText())
            return -1;

        if (a.displayText() > b.displayText())
            return 1;

        if (a.type() < b.type())
            return -1;

        if (a.type() > b.type())
            return 1;

        return 0;
    }
}
