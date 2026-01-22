import * as ko from "knockout";

import { CategoryData } from './CategoryData';
import { Category } from './Category';
import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { Edge } from "./Edge";
import { Errors } from './Errors';
import { GraphConfigField } from "./GraphConfig";
import { Node } from './Node';
import { Setting } from './Setting';
import { Utils } from './Utils';

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
    private node : ko.Observable<Node>;
    private edges: ko.Observable<Map<EdgeId, Edge>>;

    // run-time only attributes
    private changeable : ko.Observable<boolean>;

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
        this.node = ko.observable(null);
        this.edges = ko.observable(new Map<EdgeId, Edge>());

        // run-time only attributes
        this.changeable = ko.observable(true); // whether the field can be renamed or not

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

    setId = (id: FieldId): Field => {
        this.id(id);
        return this;
    }

    getDisplayText = () : string => {
        return this.displayText();
    }

    setDisplayText = (displayText: string): Field => {
        this.displayText(displayText);
        return this;
    }

    getValue = () : string => {
        return this.value();
    }

    setValue = (value: string): Field => {
        this.value(value);
        return this;
    }

    getDefaultValue = () : string => {
        return this.defaultValue();
    }

    setDefaultValue = (value: string): Field => {
        this.defaultValue(value);
        return this;
    }

    hasDefaultValue = () : boolean => {
        return this.value() === this.defaultValue();
    }

    getDescription = () : string => {
        return this.description();
    }

    setDescription = (description: string): Field => {
        this.description(description);
        return this;
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

    setInputPosition = (x: number, y: number) : Field => {
        this.inputX(x);
        this.inputY(y);
        return this;
    }

    setOutputPosition = (x: number, y: number) : Field => {
        this.outputX(x);
        this.outputY(y);
        return this;
    }

    setInputAngle = (angle: number) : Field => {
        this.inputAngle = angle;
        return this;
    }

    getInputAngle = () : number => {
        return this.inputAngle
    }

    flagInputAngleMutated = () : Field => {
        this.displayText.valueHasMutated()
        return this;
    }

    setOutputAngle = (angle: number): Field => {
        this.outputAngle = angle;
        return this;
    }

    getOutputAngle = () : number => {
        return this.outputAngle
    }

    isReadonly = () : boolean => {
        return this.readonly();
    }

    setReadonly = (readonly: boolean): Field => {
        this.readonly(readonly);
        return this;
    }

    toggleReadOnly = (): Field => {
        this.readonly(!this.readonly())

        // trigger graph check
        Eagle.getInstance().checkGraph();

        return this;
    }

    getType = () : Daliuge.DataType => {
        return this.type();
    }

    isType = (type: string) => {
        return Utils.dataTypePrefix(this.type()) === type;
    }
    
    setEncoding = (encoding: Daliuge.Encoding): Field => {
        this.encoding(encoding);
        return this;
    }

    getEncoding = () : Daliuge.Encoding => {
        return this.encoding();
    }

    valIsTrue = (val:string) : boolean => {
        return Utils.asBool(val);
    }

    toggle = (): Field => {
        this.value((!Utils.asBool(this.value())).toString());
        return this;
    }

    toggleDefault = (): Field => {
        this.defaultValue((!Utils.asBool(this.defaultValue())).toString());
        return this;
    }

    setType = (type: Daliuge.DataType) : Field => {
        this.type(type);
        return this;
    }

    setPrecious = (precious: boolean) : Field => {
        this.precious(precious);
        return this;
    }

    togglePrecious = () : Field => {
        this.precious(!this.precious());

        // trigger graph check
        Eagle.getInstance().checkGraph();

        return this;
    }

    isPrecious = () : boolean => {
        return this.precious();
    }

    isChangeable = () : boolean => {
        return this.changeable();
    }

    setChangeable = (changeable: boolean): Field => {
        this.changeable(changeable);
        return this;
    }

    toggleChangeable = () : Field => {
        this.changeable(!this.changeable());

        // trigger graph check
        Eagle.getInstance().checkGraph();

        return this;
    }

    updateEdgeId(oldId: EdgeId, newId: EdgeId): void {
        const edge = this.edges().get(oldId);

        if (typeof edge === 'undefined') {
            console.warn("Could not find edge with id:", oldId);
            return;
        }

        this.edges().delete(oldId);
        edge.setId(newId);
        this.edges().set(newId, edge);
    }

    getOptions = () : string[] => {
        return this.options();
    }

    editOption = (optionIndex: number, newVal: string) : Field => {
        //if the option we are editing is selected well update the value or default value
        if(this.options()[optionIndex] === this.value()){
            this.value(newVal)
        }
        if(this.options()[optionIndex] === this.defaultValue()){
            this.defaultValue(newVal)
        }

        this.options()[optionIndex] = newVal
        this.options.valueHasMutated()
        return this;
    }

    addOption = (newOption: string) : Field => {
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

        return this;
    }

    removeOption = (index:number) : Field => {
        if(this.options().length <= 1){
            Utils.showNotification("Cannot Remove","There must be at least one option in the select!",'danger');
            return this;
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
        return this;
    }

    isPositionalArgument = () : boolean => {
        return this.positional();
    }

    togglePositionalArgument = () : Field => {
        this.positional(!this.positional());

        // trigger graph check
        Eagle.getInstance().checkGraph();

        return this;
    }

    setPositionalArgument = (positional: boolean): Field => {
        this.positional(positional);
        return this;
    }

    getParameterType = (): Daliuge.FieldType => {
        return this.parameterType();
    }

    setParameterType = (parameterType: Daliuge.FieldType) : Field => {
        this.parameterType(parameterType);
        return this;
    }

    getUsage = (): Daliuge.FieldUsage => {
        return this.usage();
    }

    setUsage = (usage: Daliuge.FieldUsage) : Field => {
        this.usage(usage);
        return this;
    }

    getIsEvent = (): boolean => {
        return this.isEvent();
    }

    setIsEvent = (isEvent: boolean) : Field => {
        this.isEvent(isEvent);
        return this;
    }

    toggleEvent = (): Field => {
        this.isEvent(!this.isEvent());
        return this;
    }

    getNode = () : Node => {
        return this.node();
    }

    getEdges = (): MapIterator<Edge> => {
        return this.edges().values();
    }

    getEdgeById = (id: EdgeId): Edge | undefined => {
        return this.edges().get(id);
    }

    getNumEdges = () : number => {
        return this.edges().size;
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

    addError = (issue:Errors.Issue, validity:Errors.Validity): Field => {
        this.issues().push({issue:issue,validity:validity})
        return this;
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

    setNode = (node: Node) : Field => {
        this.node(node);
        return this;
    }

    addEdge = (edge: Edge) : Field => {
        this.edges().set(edge.getId(), edge);
        this.edges.valueHasMutated();
        return this;
    }

    removeEdge = (id: EdgeId) : Field => {
        this.edges().delete(id);
        this.edges.valueHasMutated();
        return this;
    }

    getGraphConfigField : ko.PureComputed<GraphConfigField> = ko.pureComputed(() => {
        return Eagle.getInstance().logicalGraph().getActiveGraphConfig()?.getNodeById(this.node().getId())?.getFieldById(this.id());
    }, this);

    clear = () : Field => {
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
        this.node(null);
        this.edges().clear();
        this.changeable(true);

        return this;
    }

    clone = () : Field => {
        const options : string[] = []
        for (const option of this.options()){
            options.push(option);
        }

        const f = new Field(this.id(), this.displayText(), this.value(), this.defaultValue(), this.description(), this.readonly(), this.type(), this.precious(), options, this.positional(), this.parameterType(), this.usage());
        f.encoding(this.encoding());
        f.isEvent(this.isEvent());
        f.changeable(this.changeable());
        f.node(this.node());
        f.edges(new Map<EdgeId, Edge>());
        for (const edge of this.edges().values()) {
            f.edges().set(edge.getId(), edge.clone());
        }
        return f;
    }

    shallowCopy = () : Field => {
        const f = new Field(this.id(), this.displayText(), this.value(), this.defaultValue(), this.description(), this.readonly(), this.type(), this.precious(), this.options(), this.positional(), this.parameterType(), this.usage());

        f.id = this.id;
        f.displayText = this.displayText;
        f.value = this.value;
        f.defaultValue = this.defaultValue;
        f.description = this.description;
        f.readonly = this.readonly;
        f.type = this.type;
        f.precious = this.precious;
        f.options = this.options;
        f.positional = this.positional;
        f.parameterType = this.parameterType;
        f.usage = this.usage;

        f.encoding = this.encoding;
        f.isEvent = this.isEvent;
        f.node = this.node;
        f.edges = this.edges;
        f.changeable = this.changeable;

        return f;
    }

    resetToDefault = () : Field => {
        this.value(this.defaultValue());
        return this;
    }

    clearEdges = () : Field => {
        this.edges().clear();
        return this;
    }

    // TODO: rename this slightly so that it is more obvious that it is a user-facing version of the value
    //       as it is I get confused between this and getValue() when auto-completing
    getFieldValue = () : string => {
        const tooltipText = "Val: " + this.value();
        if  (tooltipText === "Val: "){
            return "";
        }
        return tooltipText;
    }

    copyWithIds = (src: Field, node: Node, id: FieldId) : Field => {
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
        this.changeable(src.changeable());

        // NOTE: these two are not copied from the src, but come from the function's parameters
        this.id(id);
        this.node(node);

        return this;
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
            if(Setting.findValue(Setting.BOTTOM_WINDOW_MODE) === Eagle.BottomWindowMode.ConfigParameterTable){
                if(that.node().getName().toLowerCase().indexOf(term) >= 0){
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

    isFloatValueType = () : boolean => {
        const typePrefix = Utils.dataTypePrefix(this.type());
        return typePrefix === Daliuge.DataType.Float || typePrefix === Daliuge.DataType.float;
    }

    isIntegerValueType = () : boolean => {
        const typePrefix = Utils.dataTypePrefix(this.type());
        return typePrefix === Daliuge.DataType.Integer || typePrefix === Daliuge.DataType.int;
    }

    isBooleanValueType = () : boolean => {
        const typePrefix = Utils.dataTypePrefix(this.type());
        return typePrefix === Daliuge.DataType.Boolean || typePrefix === Daliuge.DataType.bool;
    }

    isSelectValueType = () : boolean => {
        return Utils.dataTypePrefix(this.type()) === Daliuge.DataType.Select;
    }

    isStringValueType = () : boolean => {
        //this serves as the fallback input type
        return !this.isFloatValueType() && !this.isIntegerValueType() && !this.isBooleanValueType() && !this.isSelectValueType();
    }

    static getHtmlTitleText(parameterType: Daliuge.FieldType, usage: Daliuge.FieldUsage) : string {
        if (usage === Daliuge.FieldUsage.NoPort){
            switch(parameterType){
                case Daliuge.FieldType.Application:
                return "Application Argument";
                case Daliuge.FieldType.Component:
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

    setInputPeek = (value:boolean) : Field => {
        this.inputPeek(value);
        return this;
    }

    isOutputPeek = () : boolean => {
        return this.outputPeek()
    }

    setOutputPeek = (value:boolean) : Field => {
        this.outputPeek(value);
        return this;
    }

    getInputConnected = (): boolean => {
        return this.inputConnected()
    }

    setInputConnected = (value:boolean) : Field => {
        this.inputConnected(value);
        return this;
    }

    getOutputConnected = (): boolean => {
        return this.outputConnected()
    }

    setOutputConnected = (value:boolean) : Field => {
        this.outputConnected(value);
        return this;
    }

    // used to transform the value attribute of a field into a variable with the correct type
    // the value attribute is always stored as a string internally
    static stringAsType(value: string, type: Daliuge.DataType) : boolean | number | string {
        switch (type){
            case Daliuge.DataType.Boolean:
                return Utils.asBool(value);
            case Daliuge.DataType.Float:
                return parseFloat(value);
            case Daliuge.DataType.Integer:
                const parsedValue = parseInt(value, 10);
                if (isNaN(parsedValue)){
                    console.warn("Field.stringAsType(): Unable to parse value as integer:", value);
                    return value; // return the original value if parsing fails
                }
                return parsedValue;
            default:
                return value;
        }
    }

    static toOJSJson(field : Field) : object {
        return {
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
            parameterType: Daliuge.fieldTypeToDlgMap[field.parameterType()] || Daliuge.DLGFieldType.Unknown,
            usage: field.usage(),
        };
    }

    static toV4Json(field : Field) : object {
        return {
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
            edgeIds: Array.from(field.edges().keys()),
        };
    }

    static fromOJSJson(data : any, changeable: boolean) : Field {
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
                case Daliuge.DLGFieldType.ApplicationArgument:
                    parameterType = Daliuge.FieldType.Application;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                case Daliuge.DLGFieldType.ComponentParameter:
                    parameterType = Daliuge.FieldType.Component;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                case Daliuge.DLGFieldType.ConstraintParameter:
                    parameterType = Daliuge.FieldType.Constraint;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                case Daliuge.DLGFieldType.ConstructParameter:
                    parameterType = Daliuge.FieldType.Construct;
                    usage = Daliuge.FieldUsage.NoPort;
                    break;
                case Daliuge.FieldUsage.InputPort:
                    parameterType = Daliuge.FieldType.Application;
                    usage = Daliuge.FieldUsage.InputPort;
                    break;
                case Daliuge.FieldUsage.OutputPort:
                    parameterType = Daliuge.FieldType.Application;
                    usage = Daliuge.FieldUsage.OutputPort;
                    break;
                default:
                    console.warn("Unhandled fieldType", data.fieldType);
            }
        }

        if (typeof data.parameterType !== 'undefined')
            parameterType = Daliuge.dlgToFieldTypeMap[<Daliuge.DLGFieldType>data.parameterType] || Daliuge.FieldType.Unknown;
        if (typeof data.usage !== 'undefined')
            usage = data.usage;
        if (typeof data.event !== 'undefined')
            isEvent = data.event;
        if (typeof data.encoding !== 'undefined')
            encoding = data.encoding;
        const result = new Field(id, name, value, defaultValue, description, readonly, type, precious, options, positional, parameterType, usage);
        result.isEvent(isEvent);
        result.encoding(encoding);
        result.changeable(changeable);
        return result;
    }

    static fromOJSJsonPort(data : any, changeable: boolean) : Field {
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
        f.changeable(changeable);
        return f;
    }

    static fromV4Json(data: any, changeable: boolean): Field {
        let id: FieldId;
        let name: string;
        let value: string;
        let defaultValue: string;
        let description: string;
        let readonly: boolean;
        let type: Daliuge.DataType;
        let precious: boolean;
        let options: string[];
        let positional: boolean;
        let parameterType: Daliuge.FieldType;
        let usage: Daliuge.FieldUsage;

        let event: boolean;
        let encoding: Daliuge.Encoding;

        if (typeof data.id !== 'undefined')
            id = data.id;
        if (typeof data.name !== 'undefined')
            name = data.name;
        if (typeof data.value !== 'undefined')
            value = data.value.toString();
        if (typeof data.defaultValue !== 'undefined')
            defaultValue = data.defaultValue.toString();
        if (typeof data.description !== 'undefined')
            description = data.description;
        if (typeof data.readonly !== 'undefined')
            readonly = data.readonly;
        if (typeof data.type !== 'undefined')
            type = data.type;
        if (typeof data.precious !== 'undefined')
            precious = data.precious;
        if (typeof data.options !== 'undefined')
            options = data.options;
        if (typeof data.positional !== 'undefined')
            positional = data.positional;
        if (typeof data.parameterType !== 'undefined')
            parameterType = data.parameterType;
        if (typeof data.usage !== 'undefined')
            usage = data.usage;

        if (typeof data.event !== 'undefined')
            event = data.event;
        if (typeof data.encoding !== 'undefined')
            encoding = data.encoding;

        const f = new Field(id, name, value, defaultValue, description, readonly, type, precious, options, positional, parameterType, usage);
        f.isEvent(event);
        f.encoding(encoding);
        f.changeable(changeable);
        return f;
    }

    static isValid(node:Node, field:Field, location:Eagle.FileType){
        const eagle = Eagle.getInstance()
        field.issues([]) //clear old issues
    
        //checks for input ports
        if(field.isInputPort()){

            //check the data type is known (except in the case of event ports, they can be unknown)
            if (!field.isEvent() && field.isType(Daliuge.DataType.Unknown)){
                let issue: Errors.Issue

                // for normal nodes
                if(!node.isEmbedded()){
                    issue = Errors.ShowFix("Node (" + node.getName() + ") has input port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                }else{
                    // for embedded nodes
                    const constructNode = node.getEmbed();

                    if(constructNode.getInputApplication() === node){
                        //if node is input application
                        issue = Errors.ShowFix("Node (" + constructNode.getName() + ") has input application (" + node.getName() + ") with input port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                    }else{
                        issue = Errors.ShowFix("Node (" + constructNode.getName() + ") has output application (" + node.getName() + ") with input port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                    }
                }
                field.issues().push({issue:issue,validity:Errors.Validity.Warning})
            }


        }

        // checks for output ports
        if(field.isOutputPort()){

            //check the data type is known (except in the case of event ports, they can be unknown)
            if (!field.isEvent() && field.isType(Daliuge.DataType.Unknown)){
                let issue: Errors.Issue

                //for normal nodes
                if(!node.isEmbedded()){
                    issue = Errors.ShowFix("Node (" + node.getName() + ") has output port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                }else{
                    // for embedded nodes
                    const constructNode = node.getEmbed();
                    
                    if(constructNode.getInputApplication() === node){
                        //if node is input application
                        issue = Errors.ShowFix("Node (" + constructNode.getName() + ") has input application (" + node.getName() + ") with output port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                    }else{
                        issue = Errors.ShowFix("Node (" + constructNode.getName() + ") has output application (" + node.getName() + ") with output port (" + field.getDisplayText() + ") whose type is not specified", function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixFieldType(eagle, field)}, "");
                    }
                }
                field.issues().push({issue:issue,validity:Errors.Validity.Warning})
            }


        }

        //check that the field has an id
        if (field.getId() === "" || field.getId() === null){
            const issue = Errors.ShowFix("Node (" + node.getName() + ") has field (" + field.getDisplayText() + ") with no id", function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixFieldId(eagle, field)}, "Generate id for field");
                field.issues().push({issue:issue,validity:Errors.Validity.Error})
        }

        // check that the field has a known type
        if (!Utils.validateType(field.getType())) {
            const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") has a component parameter (" + field.getDisplayText() + ") whose type (" + field.getType() + ") is unknown", function(){Utils.showField(eagle, location, node, field)}, function(){Utils.fixFieldType(eagle, field)}, "Prepend existing type (" + field.getType() + ") with 'Object.'");
                field.issues().push({issue:issue,validity:Errors.Validity.Warning})
        }

        // check that the fields "key" is the same as the key of the node it belongs to
        if (field.getNode().getId() !== node.getId()) {
            const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") has a field (" + field.getDisplayText() + ") whose node id (" + field.getNode().getId() + ") doesn't match the node (" + node.getId() + ")", function(){Utils.showField(eagle, location, node, field)}, function(){Utils.fixFieldNodeId(eagle, node, field)}, "Set field node id correctly");
                field.issues().push({issue:issue,validity:Errors.Validity.Error})
        }

        // check that the field has a unique display text on the node
        for (const field1 of node.getFields()){
            if(field.getId() === field1.getId()){
                continue
            }

            if (field.getDisplayText() === field1.getDisplayText() && field.getParameterType() === field1.getParameterType()){
                if (field.getId() === field1.getId()){
                    const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") has multiple attributes with the same display text and id (" + field.getDisplayText() + ").", function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixNodeMergeFields(eagle, node, field.getId(), field1.getId())}, "Merge fields");
                    field.issues().push({issue:issue,validity:Errors.Validity.Warning})
                    // errorsWarnings.warnings.push(issue);
                } else {
                    const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") has multiple attributes with the same display text (" + field.getDisplayText() + ").", function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixNodeMergeFields(eagle, node, field.getId(), field1.getId())}, "Merge fields");
                    field.issues().push({issue:issue,validity:Errors.Validity.Warning})
                    // errorsWarnings.warnings.push(issue);
                }
            }
        }

        // check that PythonObject's self port is input for only one edge
        if (node.getCategory() === Category.PythonObject && field.getDisplayText() === Daliuge.FieldName.SELF){
            let numSelfPortConnections: number = 0;
            for (const edge of eagle.logicalGraph().getEdges()){
                if (edge.getDestPort().getId() === field.getId()){
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
        if (field.getDisplayText() != Daliuge.FieldName.DROP_CLASS && field.getParameterType() != Daliuge.FieldType.Component){
            if (
                (field.getParameterType() === Daliuge.FieldType.Component) && !CategoryData.getCategoryData(node.getCategory()).canHaveComponentParameters ||
                (field.getParameterType() === Daliuge.FieldType.Application) && !CategoryData.getCategoryData(node.getCategory()).canHaveApplicationArguments ||
                (field.getParameterType() === Daliuge.FieldType.Construct) && !CategoryData.getCategoryData(node.getCategory()).canHaveConstructParameters
            ){
                // determine a suitable type
                let suitableType: Daliuge.FieldType = Daliuge.FieldType.Unknown;
                const categoryData: Category.CategoryData = CategoryData.getCategoryData(node.getCategory());

                if (categoryData.canHaveComponentParameters){
                    suitableType = Daliuge.FieldType.Component;
                } else {
                    if (categoryData.canHaveApplicationArguments){
                        suitableType = Daliuge.FieldType.Application;
                    } else {
                        if (categoryData.canHaveConstructParameters){
                            suitableType = Daliuge.FieldType.Construct;
                        }
                    }
                }

                const message = "Node (" + node.getName() + ") with category " + node.getCategory() + " contains field (" + field.getDisplayText() + ") with unsuitable type (" + field.getParameterType() + ").";
                const issue: Errors.Issue = Errors.ShowFix(message, function(){Utils.showField(eagle, location, node, field);}, function(){Utils.fixFieldParameterType(eagle, node, field, suitableType)}, "Switch to suitable type, or remove if no suitable type");
                field.issues().push({issue:issue,validity:Errors.Validity.Warning})
            }
        }

        // if this field has edges, it must be a port
        if (field.edges().size > 0){
            if (field.getUsage() === Daliuge.FieldUsage.NoPort){
                const issue: Errors.Issue = Errors.Show("Node (" + node.getName() + ") field (" + field.getDisplayText() + ") has edges, but is not a port.", function(){Utils.showField(eagle, location, node, field)});
                field.issues().push({issue: issue, validity: Errors.Validity.Error});
            }
        }

        // check that all edges on this field actually start or end on the field
        for (const edge of field.edges().values()){
            if (edge.getSrcPort().getId() !== field.getId() && edge.getDestPort().getId() !== field.getId()){
                const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") field (" + field.getDisplayText() + ") has edge that isn't connected to the field", function(){Utils.showNode(eagle, location, field.getNode())}, function(){Utils.fixFieldEdges(eagle, field)}, "Regenerate the list of edges for this field");
                field.issues().push({issue:issue, validity:Errors.Validity.Error});
            }

            if (edge.getSrcNode().getId() !== field.getNode().getId() && edge.getDestNode().getId() !== field.getNode().getId()){
                const issue: Errors.Issue = Errors.ShowFix("Node (" + node.getName() + ") field (" + field.getDisplayText() + ") has edge that isn't connected to the field", function(){Utils.showNode(eagle, location, field.getNode())}, function(){Utils.fixFieldEdges(eagle, field)}, "Regenerate the list of edges for this field");
                field.issues().push({issue:issue, validity:Errors.Validity.Error});
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
