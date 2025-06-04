/*
#
#    ICRAR - International Centre for Radio Astronomy Research
#    (c) UWA - The University of Western Australia, 2016
#    Copyright by UWA (in the framework of the ICRAR)
#    All rights reserved
#
#    This library is free software; you can redistribute it and/or
#    modify it under the terms of the GNU Lesser General Public
#    License as published by the Free Software Foundation; either
#    version 2.1 of the License, or (at your option) any later version.
#
#    This library is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#    Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public
#    License along with this library; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston,
#    MA 02111-1307  USA
#
*/

import * as ko from "knockout";

import { Category } from './Category';
import { CategoryData } from './CategoryData';
import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { Errors } from './Errors';
import { Field } from './Field';
import { Fields } from './Fields';
import { GraphRenderer } from "./GraphRenderer";
import { Setting } from './Setting';
import { Utils } from './Utils';

export class Node {
    private id : ko.Observable<NodeId>;
    private name : ko.Observable<string>;
    private description : ko.Observable<string>;

    private x : ko.Observable<number>;
    private y : ko.Observable<number>;

    private parent : ko.Observable<Node>;     // link to the node of which this node is a child
    private embed : ko.Observable<Node>;      // link to the node in which this node is embedded as an input or output application

    private inputApplication : ko.Observable<Node>;
    private outputApplication : ko.Observable<Node>; // TODO: remove inputApplication, outputApplication and embed

    private fields : ko.Observable<Fields>;

    private category : ko.Observable<Category>;
    private categoryType : ko.Observable<Category.Type>;

    private subject : ko.Observable<Node>;       // the node that is the subject of this node. used by comment nodes only.

    private repositoryUrl : ko.Observable<string>;
    private commitHash : ko.Observable<string>;
    private paletteDownloadUrl : ko.Observable<string>;
    private dataHash : ko.Observable<string>;

    private issues : ko.ObservableArray<{issue:Errors.Issue, validity:Errors.Validity}>//keeps track of node level errors

    //graph related things
    private expanded : ko.Observable<boolean>;     // true, if the node has been expanded in the hierarchy tab in EAGLE
    private keepExpanded : ko.Observable<boolean>;    //states if a node in the hierarchy is forced Open. groups that contain nodes that a drawn edge is connecting to are kept open
    private peek : ko.Observable<boolean>;     // true if we are temporarily showing the ports based on the users mouse position
    private radius : ko.Observable<number>;
    
    private color : ko.Observable<string>;
    private drawOrderHint : ko.Observable<number>; // a secondary sorting hint when ordering the nodes for drawing
                                                   // (primary method is using parent-child relationships)
                                                   // a node with greater drawOrderHint is always in front of an element with a lower drawOrderHint

    constructor(name : string, description : string, category : Category){
        this.id = ko.observable(Utils.generateNodeId());
        this.name = ko.observable(name);
        this.description = ko.observable(description);

        this.x = ko.observable(0);
        this.y = ko.observable(0);

        this.parent = ko.observable(null);
        this.embed = ko.observable(null);

        this.inputApplication = ko.observable(null);
        this.outputApplication = ko.observable(null);

        this.fields = ko.observable(new Fields());
        this.category = ko.observable(category);

        // lookup correct categoryType based on category
        this.categoryType = ko.observable(CategoryData.getCategoryData(category).categoryType);
        this.subject = ko.observable(null);

        this.repositoryUrl = ko.observable("");
        this.commitHash = ko.observable("");
        this.paletteDownloadUrl = ko.observable("");
        this.dataHash = ko.observable("");

        this.issues = ko.observableArray([]);

        //graph related things
        this.expanded = ko.observable(true);
        this.keepExpanded = ko.observable(false);
        this.peek = ko.observable(false);

        this.color = ko.observable(Utils.getColorForNode(category));
        this.drawOrderHint = ko.observable(0);

        if(this.isData()){
            this.radius = ko.observable(EagleConfig.DATA_NODE_RADIUS);
        }else if (this.isBranch()){
            this.radius = ko.observable(EagleConfig.BRANCH_NODE_RADIUS);
        }else if (this.isGroup()){
            this.radius = ko.observable(EagleConfig.MINIMUM_CONSTRUCT_RADIUS);
        }else{
            this.radius = ko.observable(EagleConfig.NORMAL_NODE_RADIUS);
        }
    }

    getId = () : NodeId => {
        return this.id();
    }

    setId = (id: NodeId): Node => {
        this.id(id);

        // go through all fields on this node, and make sure their nodeIds are all updated, important for ports
        // TODO: maybe this isn't necessary
        for (const field of this.fields().all()){
            field.setNode(this);
        }

        return this;
    }

    getName = () : string => {
        return this.name();
    }

    setName = (name : string): Node => {
        this.name(name);
        return this;
    }

    getNameNumLines = (width: number) : number => {
        return Math.ceil(this.name().length / (width / 8));
    }

    getDisplayName : ko.PureComputed<string> = ko.pureComputed(() => {
        if (this.name() === 'Enter label' || this.name() == ''){
            return this.category();
        } else {
            return this.name();
        }
    }, this);

    getPaletteComponentId = () : string => {
        if (this.name() === 'Enter label' || this.name() == ''){
            const processedCategory = this.category().replace(/\s/g, '_')
            return processedCategory;
        } else {
            const processedName = this.name().replace(/\s/g, '_')
            return processedName;
        }
    };

    getNoWhiteSpaceName = () : string => {
        return this.getDisplayName().replace(/ /g, '');
    }

    getDescription = () : string => {
        return this.description();
    }

    setDescription = (description : string): Node => {
        this.description(description);
        return this;
    }

    getPosition = () : {x:number, y:number} => {
        return {x: this.x(), y: this.y()};
    }

    setPosition = (x: number, y: number): Node => {
        this.x(x)
        this.y(y)
        return this;
    }

    changePosition = (dx : number, dy : number) : Node => {
        this.x(this.x()+dx)
        this.y(this.y()+dy)
        return this;
    }

    getRadius = () : number => {
        return this.radius();
    }

    setRadius = (radius : number) : Node => {
        this.radius(radius);
        return this;
    }

    getColor = () : string => {
        return this.color();
    }

    setColor = (color: string) : Node => {
        this.color(color);
        return this;
    }

    getDrawOrderHint = () : number => {
        return this.drawOrderHint();
    }

    // move node towards the front
    incrementDrawOrderHint = () : Node => {
        this.drawOrderHint(this.drawOrderHint() + 1);
        return this;
    }

    // move node towards the back
    decrementDrawOrderHint = () : Node => {
        this.drawOrderHint(this.drawOrderHint() - 1);
        return this;
    }

    setDrawOrderHint = (drawOrderHint : number) : Node => {
        this.drawOrderHint(drawOrderHint);
        return this;
    }

    getParent = () : Node => {
        return this.parent();
    }

    setParent = (node: Node) : Node => {
        // TODO: maybe we should allow this here and just check for the bad state in checkGraph() ?
        // check that we are not making this node its own parent
        if (node !== null && node.id() === this.id()){
            console.warn("Setting node as its own parent!");
            return this;
        }

        this.parent(node);
        return this;
    }

    getEmbed = () : Node => {
        return this.embed();
    }

    setEmbed = (node: Node) : Node => {
        this.embed(node);
        return this;
    }

    isEmbedded = () : boolean => {
        return this.embed() !== null;
    }

    isStreaming = () : boolean => {
        const streamingField = this.findFieldByDisplayText(Daliuge.FieldName.STREAMING, Daliuge.FieldType.Component);

        if (streamingField !== null){
            return streamingField.valIsTrue(streamingField.getValue());
        }

        return false;
    }

    isPersist = () : boolean => {
        const persistField = this.findFieldByDisplayText(Daliuge.FieldName.PERSIST, Daliuge.FieldType.Component);

        if (persistField !== null){
            return persistField.valIsTrue(persistField.getValue());
        }

        return false;
    }

    isPeek = () : boolean => {
        return this.peek();
    }

    setPeek = (value : boolean) : void => {
        this.peek(value);
    }

    togglePeek = () : void => {
        this.setPeek(!this.peek());
    }

    isLocked : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if(Eagle.selectedLocation() === Eagle.FileType.Graph){
            const allowComponentEditing : boolean = Setting.findValue(Setting.ALLOW_COMPONENT_EDITING);
            return !allowComponentEditing;
        }else{
            const allowPaletteEditing : boolean = Setting.findValue(Setting.ALLOW_PALETTE_EDITING);
            return !allowPaletteEditing;
        }
    }, this);

    usageOptions : ko.PureComputed<Daliuge.FieldUsage[]> = ko.pureComputed(() => {
        // fields on construct nodes cannot be ports
        if (this.categoryType() === Category.Type.Construct){
            return [Daliuge.FieldUsage.NoPort];
        }
        return Object.values(Daliuge.FieldUsage)
    }, this);

    getInputPorts = () : Field[] => {
        const result: Field[] = []

        for (const field of this.fields().all()){
            if (field.isInputPort()){
                result.push(field);
            }
        }

        return result;
    }

    getInputEventPorts = () : Field[] => {
        const result: Field[] = []

        for (const field of this.fields().all()){
            if (field.isInputPort() && field.getIsEvent()){
                result.push(field);
            }
        }

        return result;
    }

    getOutputPorts = () : Field[] => {
        const result: Field[] = []

        for (const field of this.fields().all()){
            if (field.isOutputPort()){
                result.push(field);
            }
        }

        return result;
    }

    getOutputEventPorts = () : Field[] => {
        const result: Field[] = []

        for (const field of this.fields().all()){
            if (field.isOutputPort() && field.getIsEvent()){
                result.push(field);
            }
        }

        return result;
    }

    getPorts = () : Field[] => {
        const results: Field[] = this.getInputPorts()
        this.getOutputPorts().forEach(function(outputPort){
            for (const result of results){
                if(result.getId() === outputPort.getId()){
                    continue
                }else{
                    results.push(outputPort)
                }
            }
        })

        return results;
    }

    getInputApplicationInputPorts = () : Field[] => {
        if (this.inputApplication() === null){
            return [];
        }

        return this.inputApplication().getInputPorts();
    }

    getInputApplicationOutputPorts = () : Field[] => {
        if (this.inputApplication() === null){
            return [];
        }

        return this.inputApplication().getOutputPorts();
    }

    getOutputApplicationInputPorts = () : Field[] => {
        if (this.outputApplication() === null){
            return [];
        }

        return this.outputApplication().getInputPorts();
    }

    getOutputApplicationOutputPorts = () : Field[] => {
        if (this.outputApplication() === null){
            return [];
        }

        return this.outputApplication().getOutputPorts();
    }

    getFieldByDisplayText = (displayText : string) : Field | null => {
        for (const field of this.fields().all()){
            if (field.getDisplayText() === displayText){
                return field;
            }
        }

        return null;
    }

    getFieldById = (id : string) : Field | null => {
        for (const field of this.fields().all()){
            if (field.getId() === id){
                return field;
            }
        }

        return null;
    }

    hasFieldWithDisplayText = (displayText : string) : boolean => {
        for (const field of this.fields().all()){
            if (field.getDisplayText() === displayText){
                return true;
            }
        }
        return false;
    }

    getFields = () : Field[] => {
        return this.fields().all();
    }

    getNumFields = () : number => {
        return this.fields().all().length;
    }

    getComponentParameters = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields().all()){
            if (field.getParameterType() === Daliuge.FieldType.Component){
                result.push(field);
            }
        }

        return result;
    }

    getComponentParametersWithNoPorts = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields().all()){
            if (field.getParameterType() === Daliuge.FieldType.Component && field.getUsage() === Daliuge.FieldUsage.NoPort){
                result.push(field);
            }
        }

        return result;
    }

    getApplicationArguments = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields().all()){
            if (field.getParameterType() === Daliuge.FieldType.Application){
                result.push(field);
            }
        }

        return result;
    }

    getApplicationArgumentsWithNoPorts = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields().all()){
            if (field.getParameterType() === Daliuge.FieldType.Application && field.getUsage() === Daliuge.FieldUsage.NoPort){
                result.push(field);
            }
        }

        return result;
    }

    getConstructParameters = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields().all()){
            if (field.getParameterType() === Daliuge.FieldType.Construct){
                result.push(field);
            }
        }

        return result;
    }

    getConstructParametersWithNoPorts = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields().all()){
            if (field.getParameterType() === Daliuge.FieldType.Construct && field.getUsage() === Daliuge.FieldUsage.NoPort){
                result.push(field);
            }
        }

        return result;
    }

    getDescriptionReadonly = () : boolean => {
        const allowParam : boolean =Setting.findValue(Setting.ALLOW_COMPONENT_EDITING);

        return !allowParam;
    }

    getCategory = () : Category => {
        return this.category();
    }

    setCategory = (category: Category): void => {
        this.category(category);
        this.color(Utils.getColorForNode(category));
    }

    getCategoryType = () : Category.Type => {
        return this.categoryType();
    }

    setCategoryType = (categoryType: Category.Type) : void => {
        this.categoryType(categoryType);
    }

    setRepositoryUrl = (url: string) : void => {
        this.repositoryUrl(url);
    }

    getRepositoryUrl = () : string => {
        return this.repositoryUrl();
    }

    getCommitHash = () : string => {
        return this.commitHash();
    }

    getPaletteDownloadUrl = () : string => {
        return this.paletteDownloadUrl();
    }

    getDataHash = () : string => {
        return this.dataHash();
    }

    isData = () : boolean => {
        return this.categoryType() === Category.Type.Data;
    }

    isConstruct = () : boolean => {
        return this.categoryType() === Category.Type.Construct;
    }

    isApplication = () : boolean => {
        return this.categoryType() === Category.Type.Application;
    }

    isScatter = () : boolean => {
        return this.category() === Category.Scatter;
    }

    isSubgraph = () : boolean => {
        return this.category() === Category.SubGraph;
    }

    isExclusiveForceNode = () : boolean => {
        return this.category() === Category.ExclusiveForceNode;
    }

    isDocker = () : boolean => {
        return this.category() === Category.Docker;
    }

    isComment = () : boolean => {
        return this.category() === Category.Comment;
    }

    isDescription = () : boolean => {
        return this.category() === Category.Description;
    }

    isGather = () : boolean => {
        return this.category() === Category.Gather;
    }

    isMKN = () : boolean => {
        return this.category() === Category.MKN;
    }

    isLoop = () : boolean => {
        return this.category() === Category.Loop;
    }

    isBranch = () : boolean => {
        return this.category() === Category.Branch;
    }

    isService = () : boolean => {
        return this.category() === Category.Service;
    }

    isGroup = () : boolean => {
        return CategoryData.getCategoryData(this.category()).isGroup;
    }

    canHaveInputs = () : boolean => {
        return CategoryData.getCategoryData(this.category()).maxInputs > 0;
    }

    canHaveOutputs = () : boolean => {
        return CategoryData.getCategoryData(this.category()).maxOutputs > 0;
    }

    maxInputs = () : number => {
        return CategoryData.getCategoryData(this.category()).maxInputs;
    }

    maxOutputs = () : number => {
        return CategoryData.getCategoryData(this.category()).maxOutputs;
    }

    canHaveComponentParameters = () : boolean => {
        return CategoryData.getCategoryData(this.category()).canHaveComponentParameters;
    }

    canHaveApplicationArguments = () : boolean => {
        return CategoryData.getCategoryData(this.category()).canHaveApplicationArguments;
    }

    canHaveConstructParameters = () : boolean => {
        return CategoryData.getCategoryData(this.category()).canHaveConstructParameters;
    }

    canHaveConstraintParameters = () : boolean => {
        return true;
    }

    canHaveType = (parameterType: Daliuge.FieldType) : boolean => {
        if (parameterType === Daliuge.FieldType.Component){
            return this.canHaveComponentParameters()
        }
        if (parameterType === Daliuge.FieldType.Application){
            return this.canHaveApplicationArguments();
        }

        return false;
    }

    hasFunc_code = () : boolean => {
        for(const field of this.getFields()){
            if(field.getDisplayText() === Daliuge.FieldName.FUNC_CODE){
                return true
            }
        }

        return false
    }

    fitsSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if(Eagle.paletteComponentSearchString() === ""){
            return true
        }else if(this.name().toLowerCase().indexOf(Eagle.paletteComponentSearchString().toLowerCase())>=0){
            $('.leftWindow .accordion-collapse').collapse('show')
            return true
        }else{
            $('.leftWindow .accordion-collapse').collapse('show')
            return false
        }
    },this)

    getHelpHTML : ko.PureComputed<string> = ko.pureComputed(() => {
        // handle error if name is undefined
        if (typeof this.name() === 'undefined'){
            return "<p><h5>Undefined</h5></p>";
        }

        // check if name and category are the same (or similar except for capitalisation and whitespace)
        // if so, only use the name, the category is redundant
        if (this.getName().split(" ").join("").toLowerCase() === this.getCategory().toLowerCase()){
            return "||| <h3>"+ this.getName() + "</h3> ||| " + this.getDescription();
        } else {
            return "||| <h3>" + this.getCategory() + " : " + this.getName() + "</h3> ||| " +this.getDescription();
        }
    }, this);

    getDescriptionHTML : ko.PureComputed<string> = ko.pureComputed(() => {
        return Utils.markdown2html(this.description());
    }, this);

    getSubject = () : Node => {
        return this.subject();
    }

    setSubject = (node: Node): Node => {
        this.subject(node);
        return this;
    }

    setInputApplication = (inputApplication : Node) : Node => {
        console.assert(this.isConstruct(), "Can't set input application on node that is not a construct");

        this.inputApplication(inputApplication);

        if (inputApplication !== null){
            inputApplication.setEmbed(this);
        }

        return this;
    }

    getInputApplication = () : Node => {
        return this.inputApplication();
    }

    hasInputApplication = () : boolean => {
        return this.inputApplication() !== null;
    }

    setOutputApplication = (outputApplication : Node) : Node => {
        console.assert(this.isConstruct(), "Can't set output application on node that is not a construct");

        this.outputApplication(outputApplication);

        if (outputApplication !== null){
            outputApplication.setEmbed(this);
        }

        return this;
    }

    getOutputApplication = () : Node => {
        return this.outputApplication();
    }

    hasOutputApplication = () : boolean => {
        return this.outputApplication() !== null;
    }

    clear = () : void => {
        this.id(null);
        this.name("");
        this.description("");
        this.x(0);
        this.y(0);
        this.radius(EagleConfig.MINIMUM_CONSTRUCT_RADIUS);
        this.color(EagleConfig.getColor('nodeDefault'));
        this.drawOrderHint(0);

        this.parent(null);
        this.embed(null);

        this.inputApplication(null);
        this.outputApplication(null);

        this.fields().clear();

        this.category(Category.Unknown);
        this.categoryType(Category.Type.Unknown);

        this.subject(null);

        this.expanded(false);
        this.keepExpanded(false)

        this.repositoryUrl("");
        this.commitHash("");
        this.paletteDownloadUrl("");
        this.dataHash("");
    }

    getGitHTML : ko.PureComputed<string> = ko.pureComputed(() => {
        let url = "Unknown";
        let hash = "Unknown";

        if (this.repositoryUrl() !== ""){
            url = this.repositoryUrl();
        }
        if (this.commitHash() !== ""){
            hash = this.commitHash();
        }

        return '- Git -</br>Url:&nbsp;' + url + '</br>Hash:&nbsp;' + hash;
    }, this);

    findFieldById = (id: FieldId) : Field => {
        return this.fields().get(id);
    }

    // TODO: still used?
    findPortInApplicationsById = (portId: FieldId) : {node: Node, port: Field} => {
        // if node has an inputApplication, check those ports too
        if (this.hasInputApplication()){
            for (const inputPort of this.inputApplication().getInputPorts()){
                if (inputPort.getId() === portId){
                    return {node: this.inputApplication(), port: inputPort};
                }
            }
            for (const outputPort of this.inputApplication().getOutputPorts()){
                if (outputPort.getId() === portId){
                    return {node: this.inputApplication(), port: outputPort};
                }
            }
        }

        // if node has an outputApplication, check those ports too
        if (this.hasOutputApplication()){
            for (const inputPort of this.outputApplication().getInputPorts()){
                if (inputPort.getId() === portId){
                    return {node: this.outputApplication(), port: inputPort};
                }
            }
            for (const outputPort of this.outputApplication().getOutputPorts()){
                if (outputPort.getId() === portId){
                    return {node: this.outputApplication(), port: outputPort};
                }
            }
        }

        return {node: null, port: null};
    }

    findPortIndexById = (portId: FieldId) : number => {
        // check input ports
        for (let i = 0; i < this.getInputPorts().length; i++){
            const port = this.getInputPorts()[i];
            if (port.getId() === portId){
                return i;
            }
        }

        // check output ports
        for (let i = 0; i < this.getOutputPorts().length; i++){
            const port = this.getOutputPorts()[i];
            if (port.getId() === portId){
                return i;
            }
        }

        return -1;
    }

    findPortByDisplayText = (displayText : string, input : boolean, local : boolean) : Field => {
        console.assert(!local);

        for (const field of this.fields().all()){
            if (field.getDisplayText() === displayText){
                if (input && field.isInputPort()){
                    return field;
                }
                if (!input && field.isOutputPort()){
                    return field;
                }
            }
        }

        return null;
    }

    findFieldByDisplayText = (displayText: string, fieldType: Daliuge.FieldType) : Field => {
        for (const field of this.fields().all()){
            if (field.getParameterType() === fieldType && field.getDisplayText() === displayText){
                return field;
            }
        }

        return null;
    }


    findPortByMatchingType = (type: string, input: boolean) : Field => {
        if (input){
            // check input ports
            for (const inputPort of this.getInputPorts()){
                if (Utils.typesMatch(inputPort.getType(), type)){
                    return inputPort;
                }
            }
        } else {
            // check output ports
            for (const outputPort of this.getOutputPorts()){
                if (Utils.typesMatch(outputPort.getType(), type)){
                    return outputPort;
                }
            }
        }
        return null;
    }

    findPortOfAnyType = (input: boolean) : Field => {
        if (input){
            const inputPorts = this.getInputPorts();
            if (inputPorts.length > 0){
                return inputPorts[0];
            }
        } else {
            const outputPorts = this.getOutputPorts();
            if (outputPorts.length > 0){
                return outputPorts[0];
            }
        }
        return null;
    }

    // TODO: this seems similar to findPortTypeById(), maybe we can just use this one!
    findPortIsInputById = (portId: string) : boolean => {
        // find the port within the node
        for (const inputPort of this.getInputPorts()){
            if (inputPort.getId() === portId){
                return true;
            }
        }

        for (const outputPort of this.getOutputPorts()){
            if (outputPort.getId() === portId){
                return false;
            }
        }

        // check input application ports
        if (this.hasInputApplication()){
            for (const inputPort of this.inputApplication().getInputPorts()){
                if (inputPort.getId() === portId){
                    return true;
                }
            }

            for (const outputPort of this.inputApplication().getOutputPorts()){
                if (outputPort.getId() === portId){
                    return false;
                }
            }
        }

        // check output application ports
        if (this.hasOutputApplication()){
            for (const inputPort of this.outputApplication().getInputPorts()){
                if (inputPort.getId() === portId){
                    return true;
                }
            }

            for (const outputPort of this.outputApplication().getOutputPorts()){
                if (outputPort.getId() === portId){
                    return false;
                }
            }
        }

        return null;
    }

    hasPortWithDisplayText = (displayText : string, input : boolean, local : boolean) : boolean => {
        return this.findPortByDisplayText(displayText, input, local) !== null;
    }

    addField = (field : Field) : void => {
        this.fields().add(field);
        this.fields.valueHasMutated();
        field.setNode(this);
    }

    setGroupStart = (value: boolean) => {
        if (!this.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_START)){
            this.addField(new Field(
                Utils.generateFieldId(),
                Daliuge.FieldName.GROUP_START,
                value.toString(),
                "false",
                "Is this node the start of a group?",
                false,
                Daliuge.DataType.Boolean,
                false,
                [],
                false,
                Daliuge.FieldType.Component,
                Daliuge.FieldUsage.NoPort));
        } else {
            this.getFieldByDisplayText(Daliuge.FieldName.GROUP_START).setValue(value.toString());
        }
    }

    setGroupEnd = (value: boolean) => {
        if (!this.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_END)){
            this.addField(new Field(
                Utils.generateFieldId(),
                Daliuge.FieldName.GROUP_END,
                value.toString(),
                "false",
                "Is this node the end of a group?",
                false,
                Daliuge.DataType.Boolean,
                false,
                [],
                false,
                Daliuge.FieldType.Component,
                Daliuge.FieldUsage.NoPort));
        } else {
            this.getFieldByDisplayText(Daliuge.FieldName.GROUP_END).setValue(value.toString());
        }
    }

    removeFieldByIndex = (index : number) : void => {
        const field = this.fields().all()[index];
        this.fields().remove(field.getId());
    }

    removeFieldById = (id: FieldId) : void => {
        this.fields().remove(id);
    }

    removeAllFields = () : void => {
        this.fields().clear();
    }

    removeAllComponentParameters = () : void => {
        for (let i = this.fields().all().length - 1 ; i >= 0 ; i--){
            const field: Field = this.fields().all()[i];
            if (field.getParameterType() === Daliuge.FieldType.Component){
                this.fields().remove(field.getId());
            }
        }
    }

    removeAllApplicationArguments = () : void => {
        for (let i = this.fields().all().length - 1 ; i >= 0 ; i--){
            const field: Field = this.fields().all()[i];
            if (field.getParameterType() === Daliuge.FieldType.Application){
                this.fields().remove(field.getId());
            }
        }
    }

    // removes all InputPort ports, and changes all InputOutput ports to be OutputPort
    removeAllInputPorts = () : void => {
        for (let i = this.fields().all().length - 1 ; i >= 0 ; i--){
            const field: Field = this.fields().all()[i];

            if (field.getUsage() === Daliuge.FieldUsage.InputPort){
                this.fields().remove(field.getId());
            }
            if (field.getUsage() === Daliuge.FieldUsage.InputOutput){
                field.setUsage(Daliuge.FieldUsage.OutputPort);
            }
        }
    }

    // removes all OutputPort ports, and changes all InputOutput ports to be InputPort
    removeAllOutputPorts = () : void => {
        for (let i = this.fields().all().length - 1 ; i >= 0 ; i--){
            const field: Field = this.fields().all()[i];

            if (field.getUsage() === Daliuge.FieldUsage.OutputPort){
                this.fields().remove(field.getId());
            }
            if (field.getUsage() === Daliuge.FieldUsage.InputOutput){
                field.setUsage(Daliuge.FieldUsage.InputPort);
            }
        }
    }

    clone = () : Node => {
        const result : Node = new Node(this.name(), this.description(), this.category());

        result.id(this.id());
        result.x(this.x());
        result.y(this.y());
        result.categoryType(this.categoryType());
        result.color(this.color());
        result.drawOrderHint(this.drawOrderHint());

        result.parent(this.parent());
        result.embed(this.embed());

        // result.expanded(this.expanded());
        // result.keepExpanded(this.expanded());

        result.peek(this.peek());

        result.subject(this.subject());

        // clone fields
        for (const field of this.fields().all()){
            result.fields().add(field.clone());
            result.fields.valueHasMutated();
        }

        result.repositoryUrl(this.repositoryUrl());
        result.commitHash(this.commitHash());
        result.paletteDownloadUrl(this.paletteDownloadUrl());
        result.dataHash(this.dataHash());
        
        if (this.hasInputApplication()){
            result.inputApplication(this.inputApplication().clone());
        }
        if (this.hasOutputApplication()){
            result.outputApplication(this.outputApplication().clone());
        }

        return result;
    }

    getIssues = (): {issue:Errors.Issue, validity:Errors.Validity}[] => {
        return this.issues();
    }

    getAllErrors = () : {issue:Errors.Issue, validity:Errors.Validity}[] => {
        const allNodeErrors : {issue:Errors.Issue, validity:Errors.Validity}[] = []

        allNodeErrors.push(...this.getIssues())
        this.getFields().forEach(function(field){
            allNodeErrors.push(...field.getIssues())
        })

        return allNodeErrors
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

    getAllErrorsWarnings : ko.PureComputed<Errors.ErrorsWarnings> = ko.pureComputed(() => {
        const errorsWarnings : Errors.ErrorsWarnings = {warnings: [], errors: []};
        const nodeErrors = this.getErrorsWarnings()

        errorsWarnings.errors.push(...nodeErrors.errors)
        errorsWarnings.warnings.push(...nodeErrors.warnings)

        this.getFields().forEach((field) =>{
            const fieldErrors = field.getErrorsWarnings()
            errorsWarnings.errors.push(...fieldErrors.errors)
            errorsWarnings.warnings.push(...fieldErrors.warnings)
        })

        return errorsWarnings
    }, this);

    getBorderColor : ko.PureComputed<string> = ko.pureComputed(() => {
        const errorsWarnings = this.getAllErrorsWarnings()

        if(this.isEmbedded()){
            return '' //returning nothing lets the means we are not over writing the default css behaviour
        }else if(errorsWarnings.errors.length>0 && Setting.findValue(Setting.SHOW_GRAPH_WARNINGS) != Setting.ShowErrorsMode.None){
            return EagleConfig.getColor('graphError')
        }else if(errorsWarnings.warnings.length>0 && Setting.findValue(Setting.SHOW_GRAPH_WARNINGS) === Setting.ShowErrorsMode.Warnings){
            return EagleConfig.getColor('graphWarning')
        }else{
            return EagleConfig.getColor('bodyBorder')
        }
    }, this);

    getIconColor : ko.PureComputed<string> = ko.pureComputed(() => {
        const errorsWarnings = this.getAllErrorsWarnings()

        if(errorsWarnings.errors.length>0){
            return EagleConfig.getColor('graphError')
        }else if(errorsWarnings.warnings.length>0){
            return EagleConfig.getColor('graphWarning')
        }else{
            return 'transparent'
        }
    }, this);

    getBackgroundColor : ko.PureComputed<string> = ko.pureComputed(() => {
        const errorsWarnings = this.getAllErrorsWarnings()

        if(errorsWarnings.errors.length>0 && Setting.findValue(Setting.SHOW_GRAPH_WARNINGS) != Setting.ShowErrorsMode.None){
            return EagleConfig.getColor('errorBackground');
        }else if(errorsWarnings.warnings.length>0 && Setting.findValue(Setting.SHOW_GRAPH_WARNINGS) === Setting.ShowErrorsMode.Warnings){
            return EagleConfig.getColor('warningBackground');
        }else{
            return '' //returning nothing lets the means we are not over writing the default css behaviour
        }
    }, this);

    getNodeIssuesHtml : ko.PureComputed<string> = ko.pureComputed(() => {
        const errorsWarnings = this.getAllErrorsWarnings()
        return 'This Node has **' + errorsWarnings.errors.length + '** errors and **' + errorsWarnings.warnings.length + '** warnings. \ Click to view the graph issues table.'
    }, this);

    getInspectorFields : ko.PureComputed<Field[]> = ko.pureComputed(() => {
        const activeConfig = Eagle.getInstance().logicalGraph().getActiveGraphConfig()

        const importantFields : Field[] = [] //fields for a node we deem important eg. num copies for scatter nodes
        const configFields : Field[] = [] 
        const selectedNode = this

        selectedNode.getFields().forEach(function(field:Field){
            // get important fields 
            if(selectedNode.isGather()){
                if(field.getDisplayText() === Daliuge.FieldName.NUM_OF_INPUTS || field.getDisplayText() === Daliuge.FieldName.GATHER_AXIS){
                    importantFields.push(field)
                    return
                }
            }else if (selectedNode.isScatter()){
                if(field.getDisplayText() === Daliuge.FieldName.NUM_OF_COPIES){
                    importantFields.push(field)
                    return
                }
            }else if (selectedNode.isLoop()){
                if(field.getDisplayText() === Daliuge.FieldName.NUM_OF_ITERATIONS){
                    importantFields.push(field)
                    return
                }
            }else if(field.getDisplayText() === Daliuge.FieldName.FUNC_CODE){
                importantFields.push(field)
                return
            }
            
            //check if field is a graph config field
            if(activeConfig?.hasField(field)){
                configFields.push(field)
            }
        })

        return importantFields.concat(configFields)
    }, this);

    // find the right icon for this node
    getIcon = () : string => {
        return CategoryData.getCategoryData(this.category()).icon;
    }

    //get icon color
    getGraphIconAttr = () : string => {
        const attr = "font-size: 44px; color:" + CategoryData.getCategoryData(this.category()).color
        return attr
    }

    getLocalMultiplicity = () : number => {
        if (this.isMKN()){
            const k : Field = this.getFieldByDisplayText(Daliuge.FieldName.K);

            if (k === null){
                return 1;
            }

            return parseInt(k.getValue(), 10);
        }

        if (this.isScatter()){
            const numCopies = this.getFieldByDisplayText(Daliuge.FieldName.NUM_OF_COPIES);

            if (numCopies === null){
                return 1;
            }

            return parseInt(numCopies.getValue(), 10);
        }

        // TODO: check this is correct!
        if (this.isGather()){
            return 1;
        }

        if (this.isLoop()){
            const numIter = this.getFieldByDisplayText(Daliuge.FieldName.NUM_OF_ITERATIONS);

            if (numIter === null){
                return 1;
            }

            return parseInt(numIter.getValue(), 10);
        }

        return 1;
    }

    addEmptyField = () :void => {
        const newField = new Field(Utils.generateFieldId(), "New Parameter", "", "", "", false, Daliuge.DataType.String, false, [], false, Daliuge.FieldType.Application, Daliuge.FieldUsage.NoPort);
        this.addField(newField);
    }

    toggleExpanded = (): Node => {
        if(!this.keepExpanded()){
            this.expanded(!this.expanded());
        }
        return this;
    }

    getExpanded = () : boolean => {
        return this.expanded();
    }

    setExpanded = (value : boolean): Node => {
        if(!this.keepExpanded()){
            this.expanded(value);
        }else{
            this.expanded(true)
        }
        return this;
    }

    getKeepExpanded = () : boolean => {
        return this.keepExpanded();
    }

    setKeepExpanded = (value : boolean): Node => {
        this.keepExpanded(value);
        return this;
    }

    static match(node0: Node, node1: Node) : boolean {
        // first just check if they have matching ids
        if (node0.getId() === node1.getId()){
            return true;
        }

        // then check if the reproducibility data matches
        return node0.getRepositoryUrl() !== "" &&
               node1.getRepositoryUrl() !== "" &&
               node0.getRepositoryUrl() === node1.getRepositoryUrl() &&
               node0.getCommitHash() === node1.getCommitHash();
    }

    static requiresUpdate(node0: Node, node1: Node) : boolean {
        return node0.getRepositoryUrl() !== "" &&
               node1.getRepositoryUrl() !== "" &&
               node0.getRepositoryUrl() === node1.getRepositoryUrl() &&
               node0.getName() === node1.getName() &&
               node0.getCommitHash() !== node1.getCommitHash();
    }

    static fromOJSJson(nodeData : any, errorsWarnings: Errors.ErrorsWarnings, isPaletteNode: boolean) : Node {
        let id: NodeId = Node.determineNodeId(nodeData);

        if (id === null){
            errorsWarnings.warnings.push(Errors.Message("Node has undefined id, generating new id"));
            id = Utils.generateNodeId();
        }

        let name = "";
        if (typeof nodeData.name !== 'undefined'){
            name = nodeData.name;
        } else {
            if (typeof nodeData.text !== 'undefined'){
                name = nodeData.text;
            } else {
                errorsWarnings.errors.push(Errors.Message("Node " + nodeData.key + " has undefined text and name " + nodeData + "!"));
            }
        }

        let x = 0;
        let y = 0;
        if (typeof nodeData.loc !== 'undefined'){
            x = parseInt(nodeData.loc.substring(0, nodeData.loc.indexOf(' ')), 10);
            y = parseInt(nodeData.loc.substring(nodeData.loc.indexOf(' ')), 10);
        }
        if (typeof nodeData.x !== 'undefined'){
            x = nodeData.x;
        }
        if (typeof nodeData.y !== 'undefined'){
            y = nodeData.y;
        }

        // translate categories if required
        const category: Category = nodeData.category;

        // if category is not known, then add error
        if (!Utils.isKnownCategory(category)){
            errorsWarnings.errors.push(Errors.Message("Node with name " + name + " has unknown category: " + category));
        }

        const node : Node = new Node(name, "", category);
        const categoryData: Category.CategoryData = CategoryData.getCategoryData(category);

        node.setId(id);

        // set position
        node.setPosition(x, y);

        // set categoryType based on the category
        node.categoryType(categoryData.categoryType);

        // get description (if exists)
        if (typeof nodeData.description !== 'undefined'){
            node.description(nodeData.description);
        }

        if(!isPaletteNode && nodeData.radius === undefined){
            GraphRenderer.legacyGraph = true
        }

        // drawOrderHint
        if (typeof nodeData.drawOrderHint !== 'undefined'){
            node.drawOrderHint(nodeData.drawOrderHint);
        }

        // read embedded application data from node
        let inputApplicationName: string = "";
        let inputApplicationType: Category = Category.None;
        let inputApplicationDescription: string = "";
        let outputApplicationName: string = "";
        let outputApplicationType: Category = Category.None;
        let outputApplicationDescription: string = "";

        if (typeof nodeData.inputAppName !== 'undefined'){
            inputApplicationName = nodeData.inputAppName;
        }
        if (typeof nodeData.inputApplicationName !== 'undefined'){
            inputApplicationName = nodeData.inputApplicationName;
        }
        if (typeof nodeData.inputApplicationType !== 'undefined'){
            inputApplicationType = nodeData.inputApplicationType;
        }
        if (typeof nodeData.inputApplicationDescription !== 'undefined'){
            inputApplicationDescription = nodeData.inputApplicationDescription;
        }
        if (typeof nodeData.outputAppName !== 'undefined'){
            outputApplicationName = nodeData.outputAppName;
        }
        if (typeof nodeData.outputApplicationName !== 'undefined'){
            outputApplicationName = nodeData.outputApplicationName;
        }
        if (typeof nodeData.outputApplicationType !== 'undefined'){
            outputApplicationType = nodeData.outputApplicationType;
        }
        if (typeof nodeData.outputApplicationDescription !== 'undefined'){
            outputApplicationDescription = nodeData.outputApplicationDescription;
        }

        // these next six if statements are covering old versions of nodes, that
        // specified input and output applications using name strings rather than nested nodes.
        // NOTE: the key for the new nodes are not set correctly, they will have to be overwritten later
        if (inputApplicationName !== ""){
            if (categoryData.categoryType !== Category.Type.Construct){
                errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication to unsuitable node: " + category));
            } else {
                // check applicationType is an application
                if (CategoryData.getCategoryData(inputApplicationType).categoryType === Category.Type.Application){
                    node.inputApplication(Node.createEmbeddedApplicationNode(inputApplicationName, inputApplicationType, inputApplicationDescription, node));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication of unsuitable type: " + inputApplicationType + ", to node."));
                }
            }
        }

        if (inputApplicationName !== "" && inputApplicationType !== Category.None){
            if (categoryData.categoryType !== Category.Type.Construct){
                errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication to unsuitable node: " + category));
            } else {
                // check applicationType is an application
                if (CategoryData.getCategoryData(inputApplicationType).categoryType === Category.Type.Application){
                    node.inputApplication(Node.createEmbeddedApplicationNode(inputApplicationName, inputApplicationType, inputApplicationDescription, node));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication of unsuitable type: " + inputApplicationType + ", to node."));
                }
            }
        }

        if (outputApplicationName !== ""){
            if (categoryData.categoryType !== Category.Type.Construct){
                errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication to unsuitable node: " + category));
            } else {
                // check applicationType is an application
                if (CategoryData.getCategoryData(outputApplicationType).categoryType === Category.Type.Application){
                    node.outputApplication(Node.createEmbeddedApplicationNode(outputApplicationName, outputApplicationType, outputApplicationDescription, node));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication of unsuitable type: " + outputApplicationType + ", to node."));
                }
            }
        }

        if (outputApplicationName !== "" && outputApplicationType !== Category.None){
            if (categoryData.categoryType !== Category.Type.Construct){
                errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication to unsuitable node: " + category));
            } else {
                if (CategoryData.getCategoryData(outputApplicationType).categoryType === Category.Type.Application){
                    node.outputApplication(Node.createEmbeddedApplicationNode(outputApplicationName, outputApplicationType, outputApplicationDescription, node));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication of unsuitable type: " + outputApplicationType + ", to node."));
                }
            }
        }

        // TODO: parent and embed will have to be set using data outside this node
        /*
        // set parentId if a parentId is defined
        const parentId = Node.determineNodeParentId(nodeData);
        if (parentId !== null){
            node.parentId(parentId);
        }

        // set embedId if defined
        if (typeof nodeData.embedId !== 'undefined'){
            node.embedId(nodeData.embedId);
        }
        */

        // debug hack for *really* old nodes that just use 'application' to specify the inputApplication
        if (nodeData.application !== undefined && nodeData.application !== ""){
            errorsWarnings.errors.push(Errors.Message("Only found old application type, not new input application type and output application type: " + category));

            if (categoryData.categoryType !== Category.Type.Construct){
                errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication to unsuitable node: " + category));
            } else {
                node.inputApplication(Node.createEmbeddedApplicationNode(nodeData.application, category, "", node));
            }
        }

        // read the 'real' input and output apps, correctly specified as nested nodes
        if (typeof nodeData.inputApplication !== 'undefined' && nodeData.inputApplication !== null){
            if (categoryData.categoryType !== Category.Type.Construct){
                errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication to unsuitable node: " + category));
            } else {
                node.inputApplication(Node.fromOJSJson(nodeData.inputApplication, errorsWarnings, isPaletteNode));
                node.inputApplication().setEmbed(node);
            }
        }
        if (typeof nodeData.outputApplication !== 'undefined' && nodeData.outputApplication !== null){
            if (categoryData.categoryType !== Category.Type.Construct){
                errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication to unsuitable node: " + category));
            } else {
                node.outputApplication(Node.fromOJSJson(nodeData.outputApplication, errorsWarnings, isPaletteNode));
                node.outputApplication().setEmbed(node);
            }
        }

        // handle obsolete 'precious' attribute, add it as a 'persist' field
        if (typeof nodeData.precious !== 'undefined'){
            const preciousField = new Field(
                Utils.generateFieldId(),
                Daliuge.FieldName.PERSIST,
                nodeData.precious.toString(), 
                "false",
                "Specifies whether this data component contains data that should not be deleted after execution",
                false,
                Daliuge.DataType.Boolean,
                false,
                [],
                false,
                Daliuge.FieldType.Component,
                Daliuge.FieldUsage.NoPort);
            node.addField(preciousField);
        }

        // handle obsolete 'streaming' attribute, add it as a 'streaming' field
        if (typeof nodeData.streaming !== 'undefined'){
            const streamingField = new Field(
                Utils.generateFieldId(),
                Daliuge.FieldName.STREAMING,
                nodeData.streaming.toString(),
                "false",
                "Specifies whether this data component streams input and output data",
                false,
                Daliuge.DataType.Boolean,
                false,
                [],
                false,
                Daliuge.FieldType.Component,
                Daliuge.FieldUsage.NoPort);
            node.addField(streamingField);
        }

        // subject (for comment nodes)
        if (typeof nodeData.subject !== 'undefined'){
            node.subject(nodeData.subject);
        } else {
            node.subject(null);
        }

        // add fields
        if (typeof nodeData.fields !== 'undefined'){
            for (const fieldData of nodeData.fields){
                const field = Field.fromOJSJson(fieldData);

                // if the parameter type is not specified, assume it is a ComponentParameter
                if (field.getParameterType() === Daliuge.FieldType.Unknown){
                    field.setParameterType(Daliuge.FieldType.Component);
                }

                node.addField(field);
            }
        }

        // add application params
        if (typeof nodeData.applicationArgs !== 'undefined'){
            for (const paramData of nodeData.applicationArgs){
                const field = Field.fromOJSJson(paramData);
                field.setParameterType(Daliuge.FieldType.Application);
                node.addField(field);
            }
        }

        // add inputAppFields
        if (typeof nodeData.inputAppFields !== 'undefined'){
            for (const fieldData of nodeData.inputAppFields){
                if (node.hasInputApplication()){
                    const field = Field.fromOJSJson(fieldData);
                    node.inputApplication().addField(field);
                } else {
                    errorsWarnings.errors.push(Errors.Message("Can't add input app field " + fieldData.text + " to node " + node.getName() + ". No input application."));
                }
            }
        }

        // add outputAppFields
        if (typeof nodeData.outputAppFields !== 'undefined'){
            for (const fieldData of nodeData.outputAppFields){
                if (node.hasOutputApplication()){
                    const field = Field.fromOJSJson(fieldData);
                    node.outputApplication().addField(field);
                } else {
                    errorsWarnings.errors.push(Errors.Message("Can't add output app field " + fieldData.text + " to node " + node.getName() + ". No output application."));
                }
            }
        }

        // add input ports
        if (typeof nodeData.inputPorts !== 'undefined'){
            for (const inputPort of nodeData.inputPorts){
                const port = Field.fromOJSJsonPort(inputPort);
                port.setParameterType(Daliuge.FieldType.Application);
                port.setUsage(Daliuge.FieldUsage.InputPort);

                if (node.canHaveInputs()){
                    node.addField(port);
                } else {
                    if (node.getCategoryType() === Category.Type.Construct){
                        Node.addPortToEmbeddedApplication(node, port, true, errorsWarnings);
                    } else {
                        errorsWarnings.errors.push(Errors.Message("Can't add input field " + inputPort.text + " to node " + node.getName() + ". Node cannot have inputs, and cannot have an embedded input application."));
                    }
                }
            }
        }

        // add output ports
        if (typeof nodeData.outputPorts !== 'undefined'){
            for (const outputPort of nodeData.outputPorts){
                const port = Field.fromOJSJsonPort(outputPort);
                port.setParameterType(Daliuge.FieldType.Application);
                port.setUsage(Daliuge.FieldUsage.OutputPort);

                if (node.canHaveOutputs()){
                    node.addField(port);
                } else {
                    if (node.getCategoryType() === Category.Type.Construct){
                        Node.addPortToEmbeddedApplication(node, port, false, errorsWarnings);
                    } else {
                        errorsWarnings.errors.push(Errors.Message("Can't add output field " + outputPort.text + " to node " + node.getName() + ". Node cannot have outputs, and cannot have an embedded output application."));
                    }
                }
            }
        }

        // add input local ports
        if (typeof nodeData.inputLocalPorts !== 'undefined'){
            for (const inputLocalPort of nodeData.inputLocalPorts){
                if (node.hasInputApplication()){
                    const port = Field.fromOJSJsonPort(inputLocalPort);
                    port.setParameterType(Daliuge.FieldType.Application);
                    port.setUsage(Daliuge.FieldUsage.OutputPort);

                    node.inputApplication().addField(port);
                } else {
                    errorsWarnings.errors.push(Errors.Message("Can't add inputLocal port " + inputLocalPort.IdText + " to node " + node.getName() + ". No input application."));
                }
            }
        }

        // add output local ports
        if (typeof nodeData.outputLocalPorts !== 'undefined'){
            for (const outputLocalPort of nodeData.outputLocalPorts){
                const port = Field.fromOJSJsonPort(outputLocalPort);
                port.setParameterType(Daliuge.FieldType.Application);
                port.setUsage(Daliuge.FieldUsage.InputPort);

                if (node.hasOutputApplication()){
                    node.outputApplication().addField(port);
                } else {
                    errorsWarnings.errors.push(Errors.Message("Can't add outputLocal port " + outputLocalPort.IdText + " to node " + node.getName() + ". No output application."));
                }
            }
        }

        // add git url and hash
        if (typeof nodeData.repositoryUrl !== 'undefined'){
            node.repositoryUrl(nodeData.repositoryUrl);
        }
        if (typeof nodeData.commitHash !== 'undefined'){
            node.commitHash(nodeData.commitHash);
        }
        if (typeof nodeData.paletteDownloadUrl != 'undefined'){
            node.paletteDownloadUrl(nodeData.paletteDownloadUrl);
        }
        if (typeof nodeData.dataHash !== 'undefined'){
            node.dataHash(nodeData.dataHash);
        }

        return node;
    }

    private static addPortToEmbeddedApplication(node: Node, port: Field, input: boolean, errorsWarnings: Errors.ErrorsWarnings){
        console.assert(node.getCategoryType() === Category.Type.Construct, "Can't add a port to the embedded application of a node that is not a construct");

        // check that the node already has an appropriate embedded application, otherwise create it
        if (input){
            if (!node.hasInputApplication()){
                if (Setting.findValue(Setting.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                    node.inputApplication(Node.createEmbeddedApplicationNode(port.getDisplayText(), Category.UnknownApplication, "", node));
                    errorsWarnings.errors.push(Errors.Message("Created new embedded input application (" + node.inputApplication().getName() + ") for node (" + node.getName() + "). Application category is " + node.inputApplication().getCategory() + " and may require user intervention."));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Cannot add input port to construct that doesn't support input ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name" + port.getDisplayText() ));
                    return;
                }
            }
            node.inputApplication().addField(port);
            errorsWarnings.warnings.push(Errors.Message("Moved input port (" + port.getDisplayText() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + ") to an embedded input application (" + node.inputApplication().getName() + ", " + node.inputApplication().getId() + ")"));
        } else {
            if (!node.hasOutputApplication()){
                if (Setting.findValue(Setting.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                    node.outputApplication(Node.createEmbeddedApplicationNode(port.getDisplayText(), Category.UnknownApplication, "", node));
                    errorsWarnings.errors.push(Errors.Message("Created new embedded output application (" + node.outputApplication().getName() + ") for node (" + node.getName() + "). Application category is " + node.outputApplication().getCategory() + " and may require user intervention."));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Cannot add output port to construct that doesn't support output ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name" + port.getDisplayText() ));
                    return;
                }
            }
            node.outputApplication().addField(port);
            errorsWarnings.warnings.push(Errors.Message("Moved output port (" + port.getDisplayText() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + ") to an embedded output application (" + node.outputApplication().getName() + ", " + node.outputApplication().getId() + ")"));
        }
    }

    static toOJSPaletteJson(node : Node) : object {
        const result : any = {};

        result.category = node.category();
        result.categoryType = node.categoryType();

        result.id = node.id();
        result.name = node.name();
        result.description = node.description();

        result.repositoryUrl = node.repositoryUrl();
        result.commitHash = node.commitHash();
        result.paletteDownloadUrl = node.paletteDownloadUrl();
        result.dataHash = node.dataHash();

        if (node.parent() !== null){
            result.parentId = node.parent().getId();
        }

        if (node.embed() !== null){
            result.embedId = node.embed().getId();
        }

        // add fields
        result.fields = [];
        for (const field of node.fields().all()){
            result.fields.push(Field.toOJSJson(field));
        }

        // add fields from inputApplication
        result.inputAppFields = [];
        if (node.hasInputApplication()){
            for (const field of node.inputApplication().fields().all()){
                result.inputAppFields.push(Field.toOJSJson(field));
            }
        }

        // add fields from outputApplication
        result.outputAppFields = [];
        if (node.hasOutputApplication()){
            for (const field of node.outputApplication().fields().all()){
                result.outputAppFields.push(Field.toOJSJson(field));
            }
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationName = node.inputApplication().name();
            result.inputApplicationType = node.inputApplication().category();
            result.inputApplicationId  = node.inputApplication().id();
            result.inputApplicationDescription = node.inputApplication().description();
        } else {
            result.inputApplicationName = "";
            result.inputApplicationType = Category.None;
            result.inputApplicationId = null;
            result.inputApplicationDescription = "";
        }
        if (node.hasOutputApplication()){
            result.outputApplicationName = node.outputApplication().name();
            result.outputApplicationType = node.outputApplication().category();
            result.outputApplicationId  = node.outputApplication().id();
            result.outputApplicationDescription = node.outputApplication().description();
        } else {
            result.outputApplicationName = "";
            result.outputApplicationType = Category.None;
            result.outputApplicationId = null;
            result.outputApplicationDescription = "";
        }

        return result;
    }

    static toOJSGraphJson(node : Node) : object {
        const result : any = {};

        result.category = node.category();
        result.categoryType = node.categoryType();

        result.isGroup = node.isGroup();
        result.color = node.color();
        result.drawOrderHint = node.drawOrderHint();

        result.id = node.id();
        result.name = node.name();
        result.description = node.description();
        result.x = node.x();
        result.y = node.y();
        result.subject = node.subject();
        result.repositoryUrl = node.repositoryUrl();
        result.commitHash = node.commitHash();
        result.paletteDownloadUrl = node.paletteDownloadUrl();
        result.dataHash = node.dataHash();

        if (node.parent() !== null){
            result.parentId = node.parent().getId();
        }

        if (node.embed() !== null){
            result.embedId = node.embed().getId();
        }

        // add fields
        result.fields = [];
        for (const field of node.fields().all()){
            result.fields.push(Field.toOJSJson(field));
        }

        // add fields from inputApplication
        result.inputAppFields = [];
        if (node.hasInputApplication()){
            for (const field of node.inputApplication().fields().all()){
                result.inputAppFields.push(Field.toOJSJson(field));
            }
        }

        // add fields from outputApplication
        result.outputAppFields = [];
        if (node.hasOutputApplication()){
            for (const field of node.outputApplication().fields().all()){
                result.outputAppFields.push(Field.toOJSJson(field));
            }
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationName = node.inputApplication().name();
            result.inputApplicationType = node.inputApplication().category();
            result.inputApplicationId  = node.inputApplication().id();
            result.inputApplicationDescription = node.inputApplication().description();
        } else {
            result.inputApplicationName = "";
            result.inputApplicationType = Category.None;
            result.inputApplicationId  = null;
            result.inputApplicationDescription = "";
        }
        if (node.hasOutputApplication()){
            result.outputApplicationName = node.outputApplication().name();
            result.outputApplicationType = node.outputApplication().category();
            result.outputApplicationId  = node.outputApplication().id();
            result.outputApplicationDescription = node.outputApplication().description();
        } else {
            result.outputApplicationName = "";
            result.outputApplicationType = Category.None;
            result.outputApplicationId  = null;
            result.outputApplicationDescription = "";
        }

        return result;
    }

    static createEmbeddedApplicationNode(name : string, category: Category, description: string, embed: Node) : Node {
        console.assert(CategoryData.getCategoryData(category).categoryType === Category.Type.Application);

        const node = new Node(name, description, category);
        node.setEmbed(embed);
        node.setRadius(EagleConfig.NORMAL_NODE_RADIUS);
        return node;
    }

    getFieldIndex = (targetField:Field) : number => {
        let x:number = null

        for(let i = 0;  this.getFields().length; i++){
            const field = this.getFields()[i]
            if (field === targetField){
                x = i
            }
        }

        if( x = null){
            console.warn('could not find field on node', targetField, this)
        }

        return x
    }

    static isValid(node: Node, selectedLocation: Eagle.FileType) : void {
        const eagle = Eagle.getInstance()
        node.issues([])//clear old issues

        // looping through and checking all the fields on the node
        for (let i = 0 ; i < node.getFields().length ; i++){
            const field:Field = node.getFields()[i]
            Field.isValid(node,field,selectedLocation,i)
        }

        if(!Utils.isKnownCategory(node.getCategory())){
            const message: string = "Node (" + node.getName() + ") has unrecognised category " + node.getCategory();
            const issue: Errors.Issue = Errors.Show(message, function(){Utils.showNode(eagle, node.getId())});
            node.issues().push({issue:issue,validity:Errors.Validity.Warning});
        }

        if(node.isConstruct()){
            //checking the input application if one is present
            if(node.hasInputApplication()){
                Node.isValid(node.getInputApplication(),selectedLocation)
            }

            //checking the output application if one is present
            if(node.hasOutputApplication()){
                Node.isValid(node.getOutputApplication(),selectedLocation)
            }
        }
        
        // check that node has correct number of inputs and outputs
        const cData: Category.CategoryData = CategoryData.getCategoryData(node.getCategory());

        if (node.getInputPorts().length < cData.minInputs){
            const message: string = "Node (" + node.getName() + ") may have too few input ports. A " + node.getCategory() + " component would typically have at least " + cData.minInputs;
            const issue: Errors.Issue = Errors.Show(message, function(){Utils.showNode(eagle, node.getId())});
            node.issues().push({issue:issue,validity:Errors.Validity.Warning})
        }
        if ((node.getInputPorts().length - node.getInputEventPorts().length) > cData.maxInputs){
            const message: string = "Node (" + node.getName() + ") has too many input ports. Should have at most " + cData.maxInputs;
            const issue: Errors.Issue = Errors.Show(message, function(){Utils.showNode(eagle, node.getId())});
            node.issues().push({issue:issue,validity:Errors.Validity.Warning})
        }
        if (node.getOutputPorts().length < cData.minOutputs){
            const message: string = "Node (" + node.getName() + ") may have too few output ports.  A " + node.getCategory() + " component would typically have at least " + cData.minOutputs;
            const issue: Errors.Issue = Errors.Show(message, function(){Utils.showNode(eagle, node.getId())});
            node.issues().push({issue:issue,validity:Errors.Validity.Warning})
        }
        if ((node.getOutputPorts().length - node.getOutputEventPorts().length) > cData.maxOutputs){
            const message: string = "Node (" + node.getName() + ") may have too many output ports. Should have at most " + cData.maxOutputs;
            const issue: Errors.Issue = Errors.Show(message, function(){Utils.showNode(eagle, node.getId())});
            node.issues().push({issue:issue,validity:Errors.Validity.Warning})
        }

        // check if this category of node is a legacy node
        if (cData.sortOrder === Category.SortOrder.Legacy){
            const message: string = "Node (" + node.getName() + ") has a legacy category (" + node.getCategory() + ").  Consider updating to a more modern node category.";
            const issue: Errors.Issue = Errors.Show(message, function(){Utils.showNode(eagle, node.getId())});
            node.issues().push({issue:issue,validity:Errors.Validity.Warning})
        }

        // check that node has at least one connected edge, otherwise what purpose does it serve?
        let hasInputEdge: boolean = false;
        let hasOutputEdge: boolean = false;
        for (const edge of eagle.logicalGraph().getEdges()){
            if (!hasOutputEdge && edge.getSrcNode().getId() === node.getId()){
                hasOutputEdge = true;
            }
            if (!hasInputEdge && edge.getDestNode().getId() === node.getId()){
                hasInputEdge = true;
            }
            // abort loop if we've found both input and output already
            if (hasInputEdge && hasOutputEdge) {
                break;
            }
        }
        const isConnected: boolean = hasInputEdge || hasOutputEdge;

        // check if a node is completely disconnected from the graph, which is sometimes an indicator of something wrong
        // only check this if the component has been selected in the graph. If it was selected from the palette, it doesn't make sense to complain that it is not connected.
        if (!isConnected && !(cData.maxInputs === 0 && cData.maxOutputs === 0) && selectedLocation === Eagle.FileType.Graph){
            const issue: Errors.Issue = Errors.Show("Node (" + node.getName() + ") has no connected edges. It should be connected to the graph in some way", function(){Utils.showNode(eagle, node.getId())});
            node.issues().push({issue:issue,validity:Errors.Validity.Warning})
        }

        // check that Memory and SharedMemory nodes have at least one input OR have a pydata field with a non-"None" value
        if (node.category() === Category.Memory || node.category() === Category.SharedMemory){
            const pydataField: Field = node.getFieldByDisplayText(Daliuge.FieldName.PYDATA);
            const hasPydataValue: boolean = pydataField !== null && pydataField.getValue() !== Daliuge.DEFAULT_PYDATA_VALUE;

            if (!hasInputEdge && !hasPydataValue){
                const message: string = node.category() + " node (" + node.getName() + ") has no connected input edges, and no data in its '" + Daliuge.FieldName.PYDATA + "' field. The node will not contain data.";
                const issue: Errors.Issue = Errors.Show(message, function(){Utils.showNode(eagle, node.getId())});
                node.issues().push({issue:issue,validity:Errors.Validity.Warning})
            }

            if (hasInputEdge && hasPydataValue){
                const message: string = node.category() + " node (" + node.getName() + ") has a connected input edge, and also contains data in its '" + Daliuge.FieldName.PYDATA + "' field. The two sources of data could cause a conflict. Note that a " + Daliuge.FieldName.PYDATA + " field is considered a source of data if its value is NOT '" + Daliuge.DEFAULT_PYDATA_VALUE + "'.";
                const issue: Errors.Issue = Errors.ShowFix(message, function(){Utils.showNode(eagle, node.getId())}, function(){if (pydataField.getValue() === ""){pydataField.setValue(Daliuge.DEFAULT_PYDATA_VALUE);}}, "Replace empty pydata with default value (" + Daliuge.DEFAULT_PYDATA_VALUE + ")");
                node.issues().push({issue:issue,validity:Errors.Validity.Warning})
            }
        }

        // check embedded application categories are not 'None'
        if (node.hasInputApplication() && node.getInputApplication().getCategory() === Category.None){
            const issue: Errors.Issue = Errors.Message("Node (" + node.getName() + ") has input application with category 'None'.")
            node.issues().push({issue:issue,validity:Errors.Validity.Error});
        }
        if (node.hasOutputApplication() && node.getOutputApplication().getCategory() === Category.None){
            const issue : Errors.Issue = Errors.Message("Node (" + node.getName() + ") has output application with category 'None'.")
            node.issues().push({issue:issue,validity:Errors.Validity.Error});
        }

        // check that Service nodes have inputApplications with no output ports!
        if (node.getCategory() === Category.Service && node.hasInputApplication() && node.getInputApplication().getOutputPorts().length > 0){
            const issue : Errors.Issue = Errors.Message("Node (" + node.getName() + ") is a Service node, but has an input application with at least one output.")
            node.issues().push({issue:issue,validity:Errors.Validity.Error});
        }

        // check if this category of node is an old PythonApp node
        if (node.getCategory() === Category.PythonApp){
            let newCategory: Category = Category.DALiuGEApp;
            const dropClassField = node.getFieldByDisplayText(Daliuge.FieldName.DROP_CLASS);

            // by default, update PythonApp to a DALiuGEApp, unless dropclass field value indicates it is a PyFuncApp
            if (dropClassField && dropClassField.getValue() === Daliuge.DEFAULT_PYFUNCAPP_DROPCLASS_VALUE){
                newCategory = Category.PyFuncApp;
            }

            const issue : Errors.Issue = Errors.ShowFix(
                "Node (" + node.getName() + ") is a " + node.getCategory() + " node, which is a legacy category. The node should be updated to a " + newCategory + " node.",
                function(){Utils.showNode(eagle, node.getId())},
                function(){Utils.fixNodeCategory(eagle, node, newCategory, node.getCategoryType())},
                "Change node category from " + node.getCategory() + " to " + newCategory
            );
            node.issues().push({issue:issue,validity:Errors.Validity.Warning});
        }

        // check that this category of node contains all the fields it requires
        for (const requirement of Daliuge.categoryFieldsRequired){
            if (requirement.categories.includes(node.getCategory())){
                for (const requiredField of requirement.fields){
                    Node._checkForField(eagle, node, requiredField);
                }
            }
        }

        // check that this categoryType of node contains all the fields it requires
        for (const requirement of Daliuge.categoryTypeFieldsRequired){
            if (requirement.categoryTypes.includes(node.getCategoryType())){
                for (const requiredField of requirement.fields){
                    Node._checkForField(eagle, node, requiredField);
                }
            }
        }

        // check PyFuncApp nodes to make sure contents of func_name field is actually found within the func_code field
        // check whether the value of func_name is also present in func_code should only be applied if func_code is not empty
        if (node.category() === Category.PyFuncApp){
            const funcCodeField = node.getFieldByDisplayText(Daliuge.FieldName.FUNC_CODE);
            const funcNameField = node.getFieldByDisplayText(Daliuge.FieldName.FUNC_NAME);

            if (funcCodeField && funcNameField){
                if (funcCodeField.getValue().trim() !== ""){
                    if (!funcCodeField.getValue().includes(funcNameField.getValue())){
                        const issue : Errors.Issue = Errors.Show("Node (" + node.getName() + ") has a value of func_name (" + funcNameField.getValue() + ") which does not appear in its func_code field.", function(){Utils.showNode(eagle, node.getId())});
                        node.issues().push({issue:issue,validity:Errors.Validity.Error});
                    }
                }
            }
        }
    }

    // helper functions used when loading graphs from JSON
    static determineNodeId(nodeData: any): NodeId | null {
        if (typeof nodeData.oid !== 'undefined'){
            return nodeData.oid;
        }
        if (typeof nodeData.id !== 'undefined'){
            return nodeData.id;
        }
        return null;
    }

    static determineNodeParentId(nodeData: any): NodeId | null {
        if (typeof nodeData.parentId !== 'undefined'){
            return nodeData.parentId;
        }
        if (typeof nodeData.group !== 'undefined'){
            return nodeData.group;
        }
        return null;
    }

    private static _checkForField(eagle: Eagle, node: Node, field: Field) : void {
        // check if the node already has this field
        const existingField = node.getFieldByDisplayText(field.getDisplayText());

        // if not, create one by cloning the required field
        // if so, check the attributes of the field match
        if (existingField === null){
            const message = "Node (" + node.getName() + ":" + node.category() + ":" + node.categoryType() + ") does not have the required '" + field.getDisplayText() + "' field";
            const issue : Errors.Issue = Errors.ShowFix(message, function(){Utils.showNode(eagle, node.getId());}, function(){Utils.addMissingRequiredField(eagle, node, field);}, "Add missing " + field.getDisplayText() + " field.")
            node.issues().push({issue:issue,validity:Errors.Validity.Error});
        } else if (existingField.getParameterType() !== field.getParameterType()){
            const message = "Node (" + node.getName() + ") has a '" + field.getDisplayText() + "' field with the wrong parameter type (" + existingField.getParameterType() + "), should be a " + field.getParameterType();
            const issue : Errors.Issue = Errors.ShowFix(message, function(){Utils.showField(eagle, node.getId(),existingField);}, function(){Utils.fixFieldParameterType(eagle, node, existingField, field.getParameterType())}, "Switch type of field to '" + field.getParameterType())
            existingField.addError(issue,Errors.Validity.Error)
        }
    }
}
