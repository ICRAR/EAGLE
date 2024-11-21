import * as ko from "knockout";

import { CategoryData } from './CategoryData';
import { Category } from './Category';
import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { Errors } from './Errors';
import { GraphConfigField } from "./GraphConfig";
import { Node } from './Node';
import { Setting } from './Setting';
import { Utils } from './Utils';
import { ParameterTable } from "./ParameterTable";

export class Field {
    private displayText : ko.Observable<string>; // user-facing name
    private value : ko.Observable<string>; // the current value
    private defaultValue : ko.Observable<string>;  // default value
    private description : ko.Observable<string>;
    private readonly : ko.Observable<boolean>;
    private type : ko.Observable<Daliuge.DataType>; // NOTE: this is a little unusual (type can have more values than just the enum)
    private precious : ko.Observable<boolean>; // indicates that the field is somehow important and should always be shown to the user
    private options : ko.ObservableArray<string>;
    private positional : ko.Observable<boolean>;
    private encoding : ko.Observable<Daliuge.Encoding>;

    // port-specific attributes
    private id : ko.Observable<FieldId>;
    private parameterType : ko.Observable<Daliuge.FieldType>;
    private usage : ko.Observable<Daliuge.FieldUsage>;
    private isEvent : ko.Observable<boolean>;
    private nodeId : ko.Observable<NodeId>;

    // graph related attributes
    private inputX : ko.Observable<number>;
    private inputY : ko.Observable<number>;
    private outputX : ko.Observable<number>;
    private outputY : ko.Observable<number>;
    private inputPeek : ko.Observable<boolean>;
    private outputPeek : ko.Observable<boolean>;
    private inputConnected : ko.Observable<boolean>
    private outputConnected : ko.Observable<boolean>
    private inputAngle : number;
    private outputAngle : number;

    private issues : ko.ObservableArray<{issue:Errors.Issue, validity:Errors.Validity}>//keeps track of issues on the field

    constructor(id: FieldId, displayText: string, value: string, defaultValue: string, description: string, readonly: boolean, type: Daliuge.DataType, precious: boolean, options: string[], positional: boolean, parameterType: Daliuge.FieldType, usage: Daliuge.FieldUsage){
        this.displayText = ko.observable(displayText);
        this.value = ko.observable(value);
        this.defaultValue = ko.observable(defaultValue);
        this.description = ko.observable(description);
        this.readonly = ko.observable(readonly);
        this.type = ko.observable(type);
        this.precious = ko.observable(precious);
        this.options = ko.observableArray(options);
        this.positional = ko.observable(positional);
        this.encoding = ko.observable(Daliuge.Encoding.Pickle);

        this.id = ko.observable(id);
        this.parameterType = ko.observable(parameterType);
        this.usage = ko.observable(usage);
        this.isEvent = ko.observable(false);
        this.nodeId = ko.observable(null);

        //graph related things
        this.inputX = ko.observable(0);
        this.inputY = ko.observable(0);
        this.outputX = ko.observable(0);
        this.outputY = ko.observable(0);
        this.inputPeek = ko.observable(false);
        this.outputPeek = ko.observable(false);
        this.inputConnected = ko.observable(false)
        this.outputConnected = ko.observable(false)
        this.inputAngle = 0;
        this.outputAngle = 0;

        this.issues = ko.observableArray([])
    }

    getId = () : FieldId => {
        return this.id();
    }

    setId = (id: FieldId): void => {
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

    getInputPosition = () : {x:number, y:number} => {
        return {x: this.inputX(), y: this.inputY()};
    }

    getOutputPosition = () : {x:number, y:number} => {
        return {x: this.outputX(), y: this.outputY()};
    }

    setInputPosition = (x: number, y: number) : void => {
        this.inputX(x);
        this.inputY(y);
    }

    setOutputPosition = (x: number, y: number) : void => {
        this.outputX(x);
        this.outputY(y);
    }

    setInputAngle = (angle:number) : void => {
        this.inputAngle = angle
    }

    getInputAngle = () : number => {
        return this.inputAngle
    }

    flagInputAngleMutated = () : void => {
        this.displayText.valueHasMutated()
    }

    setOutputAngle = (angle:number) :void => {
        this.outputAngle = angle
    }

    getOutputAngle = () : number => {
        return this.outputAngle
    }

    isReadonly = () : boolean => {
        return this.readonly();
    }

    setReadonly = (readonly: boolean): void => {
        this.readonly(readonly);
    }

    toggleReadOnly = () => {
        this.readonly(!this.readonly())
    }

    getType = () : Daliuge.DataType => {
        return this.type();
    }

    isType = (type: string) => {
        return Utils.dataTypePrefix(this.type()) === type;
    }
    
    setEncoding = (encoding: Daliuge.Encoding) => {
        this.encoding(encoding);
    }

    getEncoding = () : Daliuge.Encoding => {
        return this.encoding();
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

    setType = (type: Daliuge.DataType) : void => {
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

    getNodeId = () : NodeId => {
        return this.nodeId();
    }

    getErrorsWarnings : ko.PureComputed<Errors.ErrorsWarnings> = ko.pureComputed(() => {
        const errorsWarnings : Errors.ErrorsWarnings = {warnings: [], errors: []};
        
        this.getIssues().forEach(function(error){
            if(error.validity === Errors.Validity.Error || error.validity === Errors.Validity.Unknown){
                errorsWarnings.errors.push(error.issue)
            }else{
                errorsWarnings.warnings.push(error.issue)
            }
        })

        return errorsWarnings;
    }, this);

    getIssues = (): {issue:Errors.Issue, validity:Errors.Validity}[] => {
        return this.issues();
    }

    addError(issue:Errors.Issue, validity:Errors.Validity){
        this.issues().push({issue:issue,validity:validity})
    }

    // TODO: these colors could be added to EagleConfig.ts
    getBackgroundColor : ko.PureComputed<string> = ko.pureComputed(() => {
        const errorsWarnings = this.getErrorsWarnings()

        if(errorsWarnings.errors.length>0 && Setting.findValue(Setting.SHOW_GRAPH_WARNINGS) != Setting.ShowErrorsMode.None){
            return EagleConfig.getColor('graphError')
        }else if(errorsWarnings.warnings.length>0 && Setting.findValue(Setting.SHOW_GRAPH_WARNINGS) === Setting.ShowErrorsMode.Warnings){
            return EagleConfig.getColor('graphWarning')
        }else{
            return ''
        }
    }, this);

    getHasErrors = () : boolean => {
        const errorsWarnings = this.getErrorsWarnings()
        return errorsWarnings.errors.length>0;
    }

    getHasOnlyWarnings = () : boolean => {
        const errorsWarnings = this.getErrorsWarnings()
        return errorsWarnings.warnings.length>0 && errorsWarnings.errors.length === 0;
    }

    setNodeId = (id: NodeId) : void => {
        this.nodeId(id);
    }

    getGraphConfigField : ko.PureComputed<GraphConfigField> = ko.pureComputed(() => {
        return Eagle.getInstance().logicalGraph().getActiveGraphConfig()?.findNodeById(this.nodeId())?.findFieldById(this.id());
    }, this);

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
        this.encoding(Daliuge.Encoding.Pickle);

        this.id(null);
        this.isEvent(false);
        this.nodeId(null);
    }

    clone = () : Field => {
        const options : string[] = []
        for (const option of this.options()){
            options.push(option);
        }

        const f = new Field(this.id(), this.displayText(), this.value(), this.defaultValue(), this.description(), this.readonly(), this.type(), this.precious(), options, this.positional(), this.parameterType(), this.usage());
        f.encoding(this.encoding());
        f.isEvent(this.isEvent());
        f.nodeId(this.nodeId());
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

    copyWithIds = (src: Field, nodeId: NodeId, id: FieldId) : void => {
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
        this.encoding(src.encoding());
        this.isEvent(src.isEvent());

        // NOTE: these two are not copied from the src, but come from the function's parameters
        this.id(id);
        this.nodeId(nodeId);
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

    // TODO: move to ParameterTable class?
    fitsTableSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if (Eagle.tableSearchString() === ""){
            return true;
        }

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
            if(Setting.findValue(Setting.BOTTOM_WINDOW_MODE) === Eagle.BottomWindowMode.GraphConfigAttributesTable){
                if(Eagle.getInstance().logicalGraph().findNodeById(that.nodeId()).getName().toLowerCase().indexOf(term) >= 0){
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

    // TODO: move to Daliuge.ts?
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

    static getHtmlTitleText(parameterType: Daliuge.FieldType, usage: Daliuge.FieldUsage) : string {
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

    getHelpHtml= () : string => {
        return "###"+ this.getDisplayText() + "\n" + this.getDescription();
    }

    isInputPeek = () : boolean => {
        return this.inputPeek()
    }

    setInputPeek = (value:boolean) : void => {
        this.inputPeek(value);
    }

    isOutputPeek = () : boolean => {
        return this.outputPeek()
    }

    setOutputPeek = (value:boolean) : void => {
        this.outputPeek(value);
    }

    getInputConnected = () :boolean => {
        return this.inputConnected()
    }

    setInputConnected = (value:boolean) : void => {
        this.inputConnected(value)
    }

    getOutputConnected = () :boolean => {
        return this.outputConnected()
    }

    setOutputConnected = (value:boolean) : void => {
        this.outputConnected(value)
    }

    // used to transform the value attribute of a field into a variable with the correct type
    // the value attribute is always stored as a string internally
    static stringAsType(value: string, type: string) : any {
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

    static toOJSJson(field : Field) : object {
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
            encoding:field.encoding(),
            id: field.id(),
            parameterType: field.parameterType(),
            usage: field.usage(),
        }

        return result;
    }

    static toOJSJsonPort(field : Field) : object {
        return {
            Id:field.id(),
            name:field.displayText(),
            event:field.isEvent(),
            type:field.type(),
            description:field.description(),
            encoding:field.encoding()
        };
    }

    static fromOJSJson(data : any) : Field {
        let id: FieldId = Utils.generateFieldId();
        let name: string = "";
        let description: string = "";
        let readonly: boolean = false;
        let type: Daliuge.DataType = Daliuge.DataType.Unknown;
        let value: string = "";
        let defaultValue: string = "";
        let precious: boolean = false;
        let options: string[] = [];
        let positional: boolean = false;
        let parameterType: Daliuge.FieldType = Daliuge.FieldType.Unknown;
        let usage: Daliuge.FieldUsage = Daliuge.FieldUsage.NoPort;
        let isEvent: boolean = false;
        let encoding: Daliuge.Encoding = Daliuge.Encoding.Pickle;

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
                case "ApplicationArgument":
                    parameterType = Daliuge.FieldType.ApplicationArgument;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                case "ComponentParameter":
                    parameterType = Daliuge.FieldType.ComponentParameter;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                case "ConstraintParameter":
                    parameterType = Daliuge.FieldType.ConstraintParameter;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                case "ConstructParameter":
                    parameterType = Daliuge.FieldType.ConstructParameter;
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
                default:
                    console.warn("Unhandled fieldType", data.fieldType);
            }
        }

        if (typeof data.parameterType !== 'undefined')
            parameterType = data.parameterType;
        if (typeof data.usage !== 'undefined')
            usage = data.usage;
        if (typeof data.event !== 'undefined')
            isEvent = data.event;
        if (typeof data.encoding !== 'undefined')
            encoding = data.encoding;
        const result = new Field(id, name, value, defaultValue, description, readonly, type, precious, options, positional, parameterType, usage);
        result.isEvent(isEvent);
        result.encoding(encoding);
        return result;
    }

    static fromOJSJsonPort(data : any) : Field {
        let name: string = "";
        let event: boolean = false;
        let type: Daliuge.DataType = Daliuge.DataType.Unknown;
        let description: string = "";
        let encoding: Daliuge.Encoding = Daliuge.Encoding.Pickle;

        if (typeof data.name !== 'undefined')
            name = data.name;
        if (typeof data.event !== 'undefined')
            event = data.event;
        if (typeof data.type !== 'undefined')
            type = data.type;
        if (typeof data.description !== 'undefined')
            description = data.description;
        if (typeof data.encoding !== 'undefined')
            encoding = data.encoding;

        // avoid empty text fields if we can
        if (name === ""){
            name = data.IdText;
        }
     
        const f = new Field(data.Id, name, "", "", description, false, type, false, [], false, Daliuge.FieldType.Unknown, Daliuge.FieldUsage.NoPort);
        f.isEvent(event);
        f.encoding(encoding);
        return f;
    }

    static isValid(node:Node, field:Field, selectedLocation:Eagle.FileType, fieldIndex:number){
        const eagle = Eagle.getInstance()
        field.issues([]) //clear old issues
    
        //checks for input ports
        if(field.isInputPort()){

            //check the data type is known
            if (field.isType(Daliuge.DataType.Unknown)){
                let issue: Errors.Issue

                // for normal nodes
                if(!node.isEmbedded()){
                    issue = Errors.ShowFix("Node (" + node.getName() + ") has input port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                }else{

                    // for embedded nodes
                    const constructNode = eagle.logicalGraph().findNodeById(node.getEmbedId())

                    if(constructNode.getInputApplication() === node){
                        //if node is input application
                        issue = Errors.ShowFix("Node (" + constructNode.getName() + ") has input application (" + node.getName() + ") with input port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                    }else{
                        issue = Errors.ShowFix("Node (" + constructNode.getName() + ") has output application (" + node.getName() + ") with input port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                    }
                }
                field.issues().push({issue:issue,validity:Errors.Validity.Warning})
            }


        }

        // checks for output ports
        if(field.isOutputPort()){

            //check the data type is known
            if (field.isType(Daliuge.DataType.Unknown)){
                let issue: Errors.Issue

                //for normal nodes
                if(!node.isEmbedded()){
                    issue = Errors.ShowFix("Node (" + node.getName() + ") has output port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                }else{

                    // for embedded nodes
                    const constructNode = eagle.logicalGraph().findNodeById(node.getEmbedId())
                    
                    if(constructNode.getInputApplication() === node){
                        //if node is input application
                        issue = Errors.ShowFix("Node (" + constructNode.getName() + ") has input application (" + node.getName() + ") with output port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                    }else{
                        issue = Errors.ShowFix("Node (" + constructNode.getName() + ") has output application (" + node.getName() + ") with output port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                    }
                }
                field.issues().push({issue:issue,validity:Errors.Validity.Warning})
            }


        }

        //check that the field has an id
        if (field.getId() === "" || field.getId() === null){
            const issue = Errors.ShowFix("Node (" + node.getName() + ") has field (" + field.getDisplayText() + ") with no id", function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixFieldId(eagle, field)}, "Generate id for field");
                field.issues().push({issue:issue,validity:Errors.Validity.Error})
        }

        // check that the field has a default value
        if (field.getDefaultValue() === "" && !field.isType(Daliuge.DataType.String) && !field.isType(Daliuge.DataType.Password) && !field.isType(Daliuge.DataType.Object) && !field.isType(Daliuge.DataType.Unknown)) {
            const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") has a component parameter (" + field.getDisplayText() + ") whose default value is not specified", function(){Utils.showField(eagle, node.getId(),field)}, function(){Utils.fixFieldDefaultValue(eagle, field)}, "Generate default value for parameter");
                field.issues().push({issue:issue,validity:Errors.Validity.Warning})
        }

        // check that the field has a known type
        if (!Utils.validateType(field.getType())) {
            const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") has a component parameter (" + field.getDisplayText() + ") whose type (" + field.getType() + ") is unknown", function(){Utils.showField(eagle, node.getId(),field)}, function(){Utils.fixFieldType(eagle, field)}, "Prepend existing type (" + field.getType() + ") with 'Object.'");
                field.issues().push({issue:issue,validity:Errors.Validity.Warning})
        }

        // check that the fields "key" is the same as the key of the node it belongs to
        if (field.getNodeId() !== node.getId()) {
            const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") has a field (" + field.getDisplayText() + ") whose node id (" + field.getNodeId() + ") doesn't match the node (" + node.getId() + ")", function(){Utils.showField(eagle, node.getId(),field)}, function(){Utils.fixFieldNodeId(eagle, node, field)}, "Set field node id correctly");
                field.issues().push({issue:issue,validity:Errors.Validity.Error})
        }

        // check that the field has a unique display text on the node
        for (let j = 0 ; j < node.getFields().length ; j++){
            const field1 = node.getFields()[j];
            if(field === field1){
                continue
            }

            if (field.getDisplayText() === field1.getDisplayText() && field.getParameterType() === field1.getParameterType()){
                if (field.getId() === field1.getId()){
                    const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") has multiple attributes with the same display text and id (" + field.getDisplayText() + ").", function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixNodeMergeFieldsByIndex(eagle, node, fieldIndex, j)}, "Merge fields");
                    field.issues().push({issue:issue,validity:Errors.Validity.Warning})
                    // errorsWarnings.warnings.push(issue);
                } else {
                    const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") has multiple attributes with the same display text (" + field.getDisplayText() + ").", function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixNodeMergeFields(eagle, node, field, field1)}, "Merge fields");
                    field.issues().push({issue:issue,validity:Errors.Validity.Warning})
                    // errorsWarnings.warnings.push(issue);
                }
            }
        }

        // check that PythonObject's self port is input for only one edge
        if (node.getCategory() === Category.PythonObject && field.getDisplayText() === Daliuge.FieldName.SELF){
            let numSelfPortConnections: number = 0;
            for (const edge of eagle.logicalGraph().getEdges()){
                if (edge.getDestPortId() === field.getId()){
                    numSelfPortConnections += 1;
                }
            }

            if (numSelfPortConnections > 1){
                const issue: Errors.Issue = Errors.Message("Port " + field.getDisplayText() + " on node " + node.getName() + " cannot have multiple inputs.")
                field.issues().push({issue:issue,validity:Errors.Validity.Error})
            }
        }

        // check that fields have parameter types that are suitable for this node
        // skip the 'drop class' component parameter, those are always suitable for every node
        if (field.getDisplayText() != Daliuge.FieldName.DROP_CLASS && field.getParameterType() != Daliuge.FieldType.ComponentParameter){
            if (
                (field.getParameterType() === Daliuge.FieldType.ComponentParameter) && !CategoryData.getCategoryData(node.getCategory()).canHaveComponentParameters ||
                (field.getParameterType() === Daliuge.FieldType.ApplicationArgument) && !CategoryData.getCategoryData(node.getCategory()).canHaveApplicationArguments ||
                (field.getParameterType() === Daliuge.FieldType.ConstructParameter) && !CategoryData.getCategoryData(node.getCategory()).canHaveConstructParameters
            ){
                // determine a suitable type
                let suitableType: Daliuge.FieldType = Daliuge.FieldType.Unknown;
                const categoryData: Category.CategoryData = CategoryData.getCategoryData(node.getCategory());

                if (categoryData.canHaveComponentParameters){
                    suitableType = Daliuge.FieldType.ComponentParameter;
                } else {
                    if (categoryData.canHaveApplicationArguments){
                        suitableType = Daliuge.FieldType.ApplicationArgument;
                    } else {
                        if (categoryData.canHaveConstructParameters){
                            suitableType = Daliuge.FieldType.ConstructParameter;
                        }
                    }
                }

                const message = "Node (" + node.getName() + ") with category " + node.getCategory() + " contains field (" + field.getDisplayText() + ") with unsuitable type (" + field.getParameterType() + ").";
                const issue: Errors.Issue = Errors.ShowFix(message, function(){Utils.showField(eagle, node.getId(),field);}, function(){Utils.fixFieldParameterType(eagle, node, field, suitableType)}, "Switch to suitable type, or remove if no suitable type");
                field.issues().push({issue:issue,validity:Errors.Validity.Warning})
            }
        }
    }

    public static sortFunc(a: Field, b: Field) : number {
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
