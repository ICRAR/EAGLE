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
import { Errors } from './Errors';
import { Field } from './Field';
import { GraphRenderer } from "./GraphRenderer";
import { GraphUpdater } from './GraphUpdater';
import { Setting } from './Setting';
import { Utils } from './Utils';
import { GraphConfig } from "./graphConfig";

export class Node {
    private _id : ko.Observable<string>;
    private key : ko.Observable<number>;
    private name : ko.Observable<string>;
    private description : ko.Observable<string>;
    private x : ko.Observable<number>;
    private y : ko.Observable<number>;
    private radius : ko.Observable<number>;

    private realX : number; // underlying position (pre snap-to-grid)
    private realY : number;
    
    private color : ko.Observable<string>;
    private drawOrderHint : ko.Observable<number>; // a secondary sorting hint when ordering the nodes for drawing
                                                   // (primary method is using parent-child relationships)
                                                   // a node with greater drawOrderHint is always in front of an element with a lower drawOrderHint

    private parentKey : ko.Observable<number>;
    private embedKey : ko.Observable<number>;
    private collapsed : ko.Observable<boolean>;    // indicates whether the node is shown collapsed in the graph display
    private expanded : ko.Observable<boolean>;     // true, if the node has been expanded in the hierarchy tab in EAGLE
    private keepExpanded : ko.Observable<boolean>;    //states if a node in the hierarchy is forced Open. groups that contain nodes that a drawn edge is connecting to are kept open

    private peek : boolean;                        // true if we are temporarily showing the ports based on the users mouse position

    private inputApplication : ko.Observable<Node>;
    private outputApplication : ko.Observable<Node>;

    private fields : ko.ObservableArray<Field>;

    private category : ko.Observable<Category>;
    private categoryType : ko.Observable<Category.Type>;

    private subject : ko.Observable<number>;       // the key of another node that is the subject of this node. used by comment nodes only.

    private repositoryUrl : ko.Observable<string>;
    private commitHash : ko.Observable<string>;
    private paletteDownloadUrl : ko.Observable<string>;
    private dataHash : ko.Observable<string>;

    private portAngles : number[]

    public static readonly DEFAULT_COLOR : string = "ffffff";

    public static readonly NO_APP_STRING : string = "-no app-";
    public static readonly NO_APP_NAME_STRING : string = "-no name-";

    constructor(key : number, name : string, description : string, category : Category){
        this._id = ko.observable(Utils.uuidv4());
        this.key = ko.observable(key);
        this.name = ko.observable(name);
        this.description = ko.observable(description);
        this.x = ko.observable(0);
        this.y = ko.observable(0);
        this.radius = ko.observable(0);
        
        this.key = ko.observable(key);
        this.name = ko.observable(name);
        this.description = ko.observable(description);

        // display position
        this.realX = 0;
        this.realY = 0;

        this.color = ko.observable(Utils.getColorForNode(category));
        this.drawOrderHint = ko.observable(0);

        this.parentKey = ko.observable(null);
        this.embedKey = ko.observable(null);
        this.collapsed = ko.observable(true);
        this.peek = false;

        this.inputApplication = ko.observable(null);
        this.outputApplication = ko.observable(null);

        this.fields = ko.observableArray([]);

        this.category = ko.observable(category);

        // lookup correct categoryType based on category
        this.categoryType = ko.observable(CategoryData.getCategoryData(category).categoryType);

        this.subject = ko.observable(null);

        this.expanded = ko.observable(true);
        this.keepExpanded = ko.observable(false);

        this.repositoryUrl = ko.observable("");
        this.commitHash = ko.observable("");
        this.paletteDownloadUrl = ko.observable("");
        this.dataHash = ko.observable("");

        this.portAngles = []
    }

    getId = () : string => {
        return this._id();
    }

    setId = (id: string) : void => {
        this._id(id);
    }

    getKey = () : number => {
        return this.key();
    }

    setKey = (key : number) : void => {
        this.key(key);

        // go through all fields on this node, and make sure their nodeKeys are all updated, important for ports
        for (const field of this.fields()){
            field.setNodeKey(key);
        }
    }

    getGraphNodeId = () :string => {
        const x = Math.abs(this.getKey())-1
        return 'node'+x
    }

    getName = () : string => {
        return this.name();
    }

    setName = (name : string) : void => {
        this.name(name);
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

    setDescription = (description : string) : void => {
        this.description(description);
    }

    getPosition = () : {x:number, y:number} => {
        return {x: this.x(), y: this.y()};
    }

    getRealPosition = () : {x:number, y:number} => {
        return {x: this.realX, y: this.realY};
    }

    getPortAngles = () : number[] => {
        return this.portAngles
    }

    addPortAngle = (angle:number) : void => {
        this.portAngles.push(angle)
    }

    resetPortAngles = () :void => {
        this.portAngles = []
    }

    setPosition = (x: number, y: number, allowSnap: boolean = true) : void => {
        this.realX = x;
        this.realY = y;

        if (Eagle.getInstance().snapToGrid() && allowSnap){
            this.x(Utils.snapToGrid(this.realX, this.getDisplayRadius()));
            this.y(Utils.snapToGrid(this.realY, this.getDisplayRadius()));
        } else {
            this.x(this.realX);
            this.y(this.realY);
        }
    }

    changePosition = (dx : number, dy : number, allowSnap: boolean = true) : {dx:number, dy:number} => {
        this.realX += dx;
        this.realY += dy;

        const beforePos = {x:this.x(), y:this.y()};

        if (Eagle.getInstance().snapToGrid() && allowSnap){
            this.x(Utils.snapToGrid(this.realX, this.getDisplayRadius()));
            this.y(Utils.snapToGrid(this.realY, this.getDisplayRadius()));

            return {dx:this.x() - beforePos.x, dy:this.y() - beforePos.y};
        } else {
            this.x(this.realX);
            this.y(this.realY);
            
            return {dx:dx, dy:dy};
        }
    }

    resetReal = () : void => {
        this.realX = this.x();
        this.realY = this.y();
    }

    getRadius = () : number => {
        return this.radius();
    }

    setRadius = (radius : number) : void => {
        this.radius(radius);
    }

    getColor = () : string => {
        return this.color();
    }

    setColor = (color: string) : void => {
        this.color(color);
    }

    getDrawOrderHint = () : number => {
        return this.drawOrderHint();
    }

    // move node towards the front
    incrementDrawOrderHint = () : void => {
        this.drawOrderHint(this.drawOrderHint() + 1);
    }

    // move node towards the back
    decrementDrawOrderHint = () : void => {
        this.drawOrderHint(this.drawOrderHint() - 1);
    }

    setDrawOrderHint = (drawOrderHint : number) : void => {
        this.drawOrderHint(drawOrderHint);
    }

    getParentKey = () : number => {
        return this.parentKey();
    }

    setParentKey = (key : number) : void => {
        // check that we are not making this node its own parent
        if (key === this.key()){
            console.warn("Setting node as its own parent!");
            return;
        }

        this.parentKey(key);
    }

    getEmbedKey = () : number => {
        return this.embedKey();
    }

    setEmbedKey = (key : number) : void => {
        this.embedKey(key);
    }

    isEmbedded = () : boolean => {
        return this.embedKey() !== null;
    }

    isCollapsed = () : boolean => {
        return this.collapsed();
    }

    setCollapsed = (value : boolean) : void => {
        this.collapsed(value);
    }

    toggleCollapsed = () : void => {
        this.collapsed(!this.collapsed());
    }

    isStreaming = () : boolean => {
        const streamingField = this.findFieldByDisplayText(Daliuge.FieldName.STREAMING, Daliuge.FieldType.ComponentParameter);

        if (streamingField !== null){
            return streamingField.valIsTrue(streamingField.getValue());
        }

        return false;
    }

    isPersist = () : boolean => {
        const persistField = this.findFieldByDisplayText(Daliuge.FieldName.PERSIST, Daliuge.FieldType.ComponentParameter);

        if (persistField !== null){
            return persistField.valIsTrue(persistField.getValue());
        }

        return false;
    }

    isPeek = () : boolean => {
        return this.peek;
    }

    setPeek = (value : boolean) : void => {
        this.peek = value;
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

    getInputPorts = () : Field[] => {
        const result: Field[] = []

        for (const field of this.fields()){
            if (field.isInputPort()){
                result.push(field);
            }
        }

        return result;
    }

    getOutputPorts = () : Field[] => {
        const result: Field[] = []

        for (const field of this.fields()){
            if (field.isOutputPort()){
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

    hasLocalPortWithId = (id : string) : boolean => {
        // check output ports of input application, if one exists
        if (this.hasInputApplication()){
            for (const outputPort of this.inputApplication().getOutputPorts()){
                if (outputPort.getId() === id){
                    return true;
                }
            }
        }
        // check input ports of outputApplication, if one exists
        if (this.hasOutputApplication()){
            for (const inputPort of this.outputApplication().getInputPorts()){
                if (inputPort.getId() === id){
                    return true;
                }
            }
        }

        return false;
    }

    getFieldByDisplayText = (displayText : string) : Field | null => {
        for (const field of this.fields()){
            if (field.getDisplayText() === displayText){
                return field;
            }
        }

        return null;
    }

    getFieldById = (id : string) : Field | null => {
        for (const field of this.fields()){
            if (field.getId() === id){
                return field;
            }
        }

        return null;
    }

    hasFieldWithDisplayText = (displayText : string) : boolean => {
        for (const field of this.fields()){
            if (field.getDisplayText() === displayText){
                return true;
            }
        }
        return false;
    }

    getFields = () : Field[] => {
        return this.fields();
    }

    getNumFields = () : number => {
        return this.fields().length;
    }

    getComponentParameters = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields()){
            if (field.getParameterType() === Daliuge.FieldType.ComponentParameter){
                result.push(field);
            }
        }

        return result;
    }

    getComponentParametersWithNoPorts = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields()){
            if (field.getParameterType() === Daliuge.FieldType.ComponentParameter && field.getUsage() === Daliuge.FieldUsage.NoPort){
                result.push(field);
            }
        }

        return result;
    }

    getApplicationArguments = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields()){
            if (field.getParameterType() === Daliuge.FieldType.ApplicationArgument){
                result.push(field);
            }
        }

        return result;
    }

    getApplicationArgumentsWithNoPorts = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields()){
            if (field.getParameterType() === Daliuge.FieldType.ApplicationArgument && field.getUsage() === Daliuge.FieldUsage.NoPort){
                result.push(field);
            }
        }

        return result;
    }

    getConstructParameters = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields()){
            if (field.getParameterType() === Daliuge.FieldType.ConstructParameter){
                result.push(field);
            }
        }

        return result;
    }

    getConstructParametersWithNoPorts = () : Field[] => {
        const result: Field[] = [];

        for (const field of this.fields()){
            if (field.getParameterType() === Daliuge.FieldType.ConstructParameter && field.getUsage() === Daliuge.FieldUsage.NoPort){
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

    isResizable = () : boolean => {
        return CategoryData.getCategoryData(this.category()).isResizable;
    }

    isGroup = () : boolean => {
        return CategoryData.getCategoryData(this.category()).canContainComponents;
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

    canHaveInputApplication = () : boolean => {
        return CategoryData.getCategoryData(this.category()).canHaveInputApplication;
    }

    canHaveOutputApplication = () : boolean => {
        return CategoryData.getCategoryData(this.category()).canHaveOutputApplication;
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
        if (parameterType === Daliuge.FieldType.ComponentParameter){
            return this.canHaveComponentParameters()
        }
        if (parameterType === Daliuge.FieldType.ApplicationArgument){
            return this.canHaveApplicationArguments();
        }

        return false;
    }

    fitsSearchQuery : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if(Eagle.paletteComponentSearchString() === ""){
            return true
        }else if(this.name().toLowerCase().indexOf(Eagle.paletteComponentSearchString().toLowerCase())>=0){
            return true
        }else{
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
            return "###"+ this.getName() + "\n" + this.getDescription();
        } else {
            return "###" + this.getCategory() + " : " + this.getName() + "\n" + Utils.markdown2html(this.getDescription());
        }
    }, this);

    getDescriptionHTML : ko.PureComputed<string> = ko.pureComputed(() => {
        return Utils.markdown2html(this.getDescription());
    }, this);

    getSubjectKey = () : number => {
        return this.subject();
    }

    setSubjectKey = (key : number) : void => {
        this.subject(key);
    }

    setInputApplication = (inputApplication : Node) : void => {
        this.inputApplication(inputApplication);

        if (inputApplication !== null){
            inputApplication.setEmbedKey(this.getKey());
            console.assert(this.canHaveInputApplication());
        }
    }

    getInputApplication = () : Node => {
        return this.inputApplication();
    }

    hasInputApplication = () : boolean => {
        return this.inputApplication() !== null;
    }

    setOutputApplication = (outputApplication : Node) : void => {
        this.outputApplication(outputApplication);

        if (outputApplication !== null){
            outputApplication.setEmbedKey(this.getKey());
            console.assert(this.canHaveOutputApplication());
        }
    }

    getOutputApplication = () : Node => {
        return this.outputApplication();
    }

    hasOutputApplication = () : boolean => {
        return this.outputApplication() !== null;
    }

    clear = () : void => {
        this._id("");
        this.key(0);
        this.name("");
        this.description("");
        this.x(0);
        this.y(0);
        this.radius(GraphConfig.MINIMUM_CONSTRUCT_RADIUS);
        this.color(Node.DEFAULT_COLOR);
        this.drawOrderHint(0);

        this.parentKey(null);
        this.embedKey(null);
        this.collapsed(true);

        this.inputApplication(null);
        this.outputApplication(null);

        this.fields([]);

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

    getDisplayRadius = () : number => {
        if (this.isGroup() && this.isCollapsed()){
            return GraphConfig.MINIMUM_CONSTRUCT_RADIUS;
        }

        if (!this.isGroup() && !this.isCollapsed()){
            return this.radius();
        }

        /*
        if (this.isData() && !this.isCollapsed() && !this.isPeek()){
            return Node.DATA_COMPONENT_WIDTH;
        }
        */

        return this.radius();
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

    findFieldById = (id: string) : Field => {
        for (const field of this.fields()){
            if (field.getId() === id){
                return field;
            }
        }

        return null;
    }

    findPortInApplicationsById = (portId : string) : {key: number, port: Field} => {
        // if node has an inputApplication, check those ports too
        if (this.hasInputApplication()){
            for (const inputPort of this.inputApplication().getInputPorts()){
                if (inputPort.getId() === portId){
                    return {key: this.inputApplication().getKey(), port: inputPort};
                }
            }
            for (const outputPort of this.inputApplication().getOutputPorts()){
                if (outputPort.getId() === portId){
                    return {key: this.inputApplication().getKey(), port: outputPort};
                }
            }
        }

        // if node has an outputApplication, check those ports too
        if (this.hasOutputApplication()){
            for (const inputPort of this.outputApplication().getInputPorts()){
                if (inputPort.getId() === portId){
                    return {key: this.outputApplication().getKey(), port: inputPort};
                }
            }
            for (const outputPort of this.outputApplication().getOutputPorts()){
                if (outputPort.getId() === portId){
                    return {key: this.outputApplication().getKey(), port: outputPort};
                }
            }
        }

        return {key: null, port: null};
    }

    findPortIndexById = (portId : string) : number => {
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

        for (const field of this.fields()){
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
        for (const field of this.fields()){
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
        this.fields.push(field);
        field.setNodeKey(this.key());
    }

    addFieldByIndex = (field : Field, i : number) : void => {
        this.fields.splice(i, 0, field);
        field.setNodeKey(this.key());
    }

    setGroupStart = (value: boolean) => {
        if (!this.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_START)){
            this.addField(new Field(
                Utils.uuidv4(),
                Daliuge.FieldName.GROUP_START,
                value.toString(),
                "false",
                "Is this node the start of a group?",
                false,
                Daliuge.DataType.Boolean,
                false,
                [],
                false,
                Daliuge.FieldType.ComponentParameter,
                Daliuge.FieldUsage.NoPort,
                false));
        } else {
            this.getFieldByDisplayText(Daliuge.FieldName.GROUP_START).setValue(value.toString());
        }
    }

    setGroupEnd = (value: boolean) => {
        if (!this.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_END)){
            this.addField(new Field(
                Utils.uuidv4(),
                Daliuge.FieldName.GROUP_END,
                value.toString(),
                "false",
                "Is this node the end of a group?",
                false,
                Daliuge.DataType.Boolean,
                false,
                [],
                false,
                Daliuge.FieldType.ComponentParameter,
                Daliuge.FieldUsage.NoPort,
                false));
        } else {
            this.getFieldByDisplayText(Daliuge.FieldName.GROUP_END).setValue(value.toString());
        }
    }

    removeFieldByIndex = (index : number) : void => {
        this.fields.splice(index, 1);
    }

    removeFieldById = (id: string) : void => {
        for (let i = 0; i < this.fields().length ; i++){
            if (this.fields()[i].getId() === id){
                this.fields.splice(i, 1);
                return;
            }
        }

        console.warn("Could not remove field from node, id not found:", id);
    }

    removeAllFields = () : void => {
        this.fields([]);
    }

    removeAllComponentParameters = () : void => {
        for (let i = this.fields().length - 1 ; i >= 0 ; i--){
            if (this.fields()[i].getParameterType() === Daliuge.FieldType.ComponentParameter){
                this.fields.splice(i, 1);
            }
        }
    }

    removeAllApplicationArguments = () : void => {
        for (let i = this.fields().length - 1 ; i >= 0 ; i--){
            if (this.fields()[i].getParameterType() === Daliuge.FieldType.ApplicationArgument){
                this.fields.splice(i, 1);
            }
        }
    }

    // removes all InputPort ports, and changes all InputOutput ports to be OutputPort
    removeAllInputPorts = () : void => {
        for (let i = this.fields().length - 1 ; i >= 0 ; i--){
            const field: Field = this.fields()[i];

            if (field.getUsage() === Daliuge.FieldUsage.InputPort){
                this.fields.splice(i, 1);
            }
            if (field.getUsage() === Daliuge.FieldUsage.InputOutput){
                field.setUsage(Daliuge.FieldUsage.OutputPort);
            }
        }
    }

    // removes all OutputPort ports, and changes all InputOutput ports to be InputPort
    removeAllOutputPorts = () : void => {
        for (let i = this.fields().length - 1 ; i >= 0 ; i--){
            const field: Field = this.fields()[i];

            if (field.getUsage() === Daliuge.FieldUsage.OutputPort){
                this.fields.splice(i, 1);
            }
            if (field.getUsage() === Daliuge.FieldUsage.InputOutput){
                field.setUsage(Daliuge.FieldUsage.InputPort);
            }
        }
    }

    clone = () : Node => {

        const result : Node = new Node(this.key(), this.name(), this.description(), this.category());

        result._id(this._id());
        result.x(this.x());
        result.y(this.y());
        result.radius(this.radius());
        result.categoryType(this.categoryType());
        result.color(this.color());
        result.drawOrderHint(this.drawOrderHint());

        result.parentKey(this.parentKey());
        result.embedKey(this.embedKey());

        result.collapsed(this.collapsed());
        result.expanded(this.expanded());
        result.keepExpanded(this.expanded());

        result.peek = this.peek;

        result.subject = this.subject;

        // clone fields
        for (const field of this.fields()){
            result.fields.push(field.clone());
        }

        result.repositoryUrl(this.repositoryUrl());
        result.commitHash(this.commitHash());
        result.paletteDownloadUrl(this.paletteDownloadUrl());
        result.dataHash(this.dataHash());
        
        return result;
    }

    getErrorsWarnings = (eagle: Eagle): Errors.ErrorsWarnings => {
        const result: {warnings: Errors.Issue[], errors: Errors.Issue[]} = {warnings: [], errors: []};

        Node.isValid(eagle, this, Eagle.selectedLocation(), false, false, result);

        return result;
    }

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

    getCustomData = () : string => {
        if (this.fields().length === 0){
            return "";
        }

        return this.fields()[0].getValue();
    }

    customDataChanged = (eagle : Eagle, event : JQueryEventObject) : void => {
        const e : HTMLTextAreaElement = <HTMLTextAreaElement> event.originalEvent.target;

        console.log("customDataChanged()", e.value);

        // if no fields exist, create at least one, to store the custom data
        if (this.fields().length === 0){
            this.addField(new Field(Utils.uuidv4(), "", "", "", "", false, Daliuge.DataType.Unknown, false, [], false, Daliuge.FieldType.ComponentParameter, Daliuge.FieldUsage.NoPort, false));
        }

        this.fields()[0].setValue(e.value);
    }

    addEmptyField = (index:number) :void => {
        const newField = new Field(Utils.uuidv4(), "New Parameter", "", "", "", false, Daliuge.DataType.String, false, [], false, Daliuge.FieldType.ComponentParameter, Daliuge.FieldUsage.NoPort, false);

        if(index === -1){
            this.addField(newField);
        }else{
            this.addFieldByIndex(newField, index);
        }
    }

    toggleExpanded = () : void => {
        if(!this.keepExpanded()){
            this.expanded(!this.expanded());
        }
    }

    getExpanded = () : boolean => {
        return this.expanded();
    }

    setExpanded = (value : boolean) : void => {
        if(!this.keepExpanded()){
            this.expanded(value);
        }else{
            this.expanded(true)
        }
    }

    getKeepExpanded = () : boolean => {
        return this.keepExpanded();
    }

    setKeepExpanded = (value : boolean) : void => {
        this.keepExpanded(value);
    }

    static match = (node0: Node, node1: Node) : boolean => {
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

    static requiresUpdate = (node0: Node, node1: Node) : boolean => {
        return node0.getRepositoryUrl() !== "" &&
               node1.getRepositoryUrl() !== "" &&
               node0.getRepositoryUrl() === node1.getRepositoryUrl() &&
               node0.getName() === node1.getName() &&
               node0.getCommitHash() !== node1.getCommitHash();
    }

    static canHaveInputApp = (node : Node) : boolean => {
        return CategoryData.getCategoryData(node.getCategory()).canHaveInputApplication;
    }

    static canHaveOutputApp = (node : Node) : boolean => {
        return CategoryData.getCategoryData(node.getCategory()).canHaveOutputApplication;
    }

    static fromOJSJson = (nodeData : any, errorsWarnings: Errors.ErrorsWarnings, isPaletteNode: boolean, generateKeyFunc: () => number) : Node => {
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

        let key = 0;
        if (typeof nodeData.key !== 'undefined' && nodeData.key !== null){
            key = nodeData.key;
        } else {
            key = generateKeyFunc();
        }

        // translate categories if required
        let category: Category = nodeData.category;

        // if category is not known, then add error
        if (!Utils.isKnownCategory(category)){
            errorsWarnings.errors.push(Errors.Message("Node with name " + name + " has unknown category: " + category));
            category = Category.Unknown;
        }

        const node : Node = new Node(key, name, "", category);

        // set position
        node.setPosition(x, y, !isPaletteNode);

        // set categoryType based on the category
        node.categoryType(CategoryData.getCategoryData(category).categoryType);

        // get description (if exists)
        if (typeof nodeData.description !== 'undefined'){
            node.description(nodeData.description);
        }

        // get size (if exists)
        let width = GraphConfig.NORMAL_NODE_RADIUS;
        let height = GraphConfig.NORMAL_NODE_RADIUS;
        if (typeof nodeData.desiredSize !== 'undefined'){
            width = nodeData.desiredSize.width;
            height = nodeData.desiredSize.height;
        }
        if (typeof nodeData.width !== 'undefined'){
            width = nodeData.width;
        }
        if (typeof nodeData.height !== 'undefined'){
            height = nodeData.height;
        }

        if (node.isGroup()){
            node.radius(Math.max(width, height));
        } else {
            if (node.isBranch()){
                node.radius(GraphConfig.BRANCH_NODE_RADIUS);
            } else {
                node.radius(GraphConfig.NORMAL_NODE_RADIUS);
            }
        }

        // expanded
        if (typeof nodeData.expanded !== 'undefined'){
            node.expanded(nodeData.expanded)
        }else{
            node.expanded(true);
        }

        // NOTE: use color from Eagle CategoryData instead of from the input file

        // drawOrderHint
        if (typeof nodeData.drawOrderHint !== 'undefined'){
            node.drawOrderHint(nodeData.drawOrderHint);
        }

        // keys for embedded applications
        let inputApplicationKey: number = null;
        let outputApplicationKey: number = null;
        if (typeof nodeData.inputApplicationKey !== 'undefined'){
            inputApplicationKey = nodeData.inputApplicationKey;
        }
        if (typeof nodeData.outputApplicationKey !== 'undefined'){
            outputApplicationKey = nodeData.outputApplicationKey;
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

        // debug
        //console.log("node", nodeData.text);
        //console.log("inputAppName", nodeData.inputAppName, "inputApplicationName", nodeData.inputApplicationName, "inpuApplication", nodeData.inputApplication, "inputApplicationType", nodeData.inputApplicationType);
        //console.log("outputAppName", nodeData.outputAppName, "outputApplicationName", nodeData.outputApplicationName, "outputApplication", nodeData.outputApplication, "outputApplicationType", nodeData.outputApplicationType);

        // these next six if statements are covering old versions of nodes, that
        // specified input and output applications using name strings rather than nested nodes.
        // NOTE: the key for the new nodes are not set correctly, they will have to be overwritten later
        if (inputApplicationName !== ""){
            if (!CategoryData.getCategoryData(category).canHaveInputApplication){
                errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication to unsuitable node: " + category));
            } else {
                // check applicationType is an application
                if (CategoryData.getCategoryData(inputApplicationType).categoryType === Category.Type.Application){
                    node.inputApplication(Node.createEmbeddedApplicationNode(inputApplicationKey, inputApplicationName, inputApplicationType, inputApplicationDescription, node.getKey()));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication of unsuitable type: " + inputApplicationType + ", to node."));
                }
            }
        }

        if (inputApplicationName !== "" && inputApplicationType !== Category.None){
            if (!CategoryData.getCategoryData(category).canHaveInputApplication){
                errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication to unsuitable node: " + category));
            } else {
                // check applicationType is an application
                if (CategoryData.getCategoryData(inputApplicationType).categoryType === Category.Type.Application){
                    node.inputApplication(Node.createEmbeddedApplicationNode(inputApplicationKey, inputApplicationName, inputApplicationType, inputApplicationDescription, node.getKey()));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication of unsuitable type: " + inputApplicationType + ", to node."));
                }
            }
        }

        if (outputApplicationName !== ""){
            if (!CategoryData.getCategoryData(category).canHaveOutputApplication){
                errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication to unsuitable node: " + category));
            } else {
                // check applicationType is an application
                if (CategoryData.getCategoryData(outputApplicationType).categoryType === Category.Type.Application){
                    node.outputApplication(Node.createEmbeddedApplicationNode(outputApplicationKey, outputApplicationName, outputApplicationType, outputApplicationDescription, node.getKey()));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication of unsuitable type: " + outputApplicationType + ", to node."));
                }
            }
        }

        if (outputApplicationName !== "" && outputApplicationType !== Category.None){
            if (!CategoryData.getCategoryData(category).canHaveOutputApplication){
                errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication to unsuitable node: " + category));
            } else {
                if (CategoryData.getCategoryData(outputApplicationType).categoryType === Category.Type.Application){
                    node.outputApplication(Node.createEmbeddedApplicationNode(outputApplicationKey, outputApplicationName, outputApplicationType, outputApplicationDescription, node.getKey()));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication of unsuitable type: " + outputApplicationType + ", to node."));
                }
            }
        }

        // set parentKey if a group is defined
        if (typeof nodeData.group !== 'undefined'){
            node.parentKey(nodeData.group);
        }

        // set embedKey if defined
        if (typeof nodeData.embedKey !== 'undefined'){
            node.embedKey(nodeData.embedKey);
        }

        // debug hack for *really* old nodes that just use 'application' to specify the inputApplication
        if (nodeData.application !== undefined && nodeData.application !== ""){
            errorsWarnings.errors.push(Errors.Message("Only found old application type, not new input application type and output application type: " + category));

            if (!CategoryData.getCategoryData(category).canHaveInputApplication){
                errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication to unsuitable node: " + category));
            } else {
                if (CategoryData.getCategoryData(category).categoryType === Category.Type.Application){
                    node.inputApplication(Node.createEmbeddedApplicationNode(null, nodeData.application, category, "", node.getKey()));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication of unsuitable type: " + category + ", to node."));
                }
            }
        }

        // read the 'real' input and output apps, correctly specified as nested nodes
        if (typeof nodeData.inputApplication !== 'undefined' && nodeData.inputApplication !== null){
            if (!CategoryData.getCategoryData(category).canHaveInputApplication){
                errorsWarnings.errors.push(Errors.Message("Attempt to add inputApplication to unsuitable node: " + category));
            } else {
                node.inputApplication(Node.fromOJSJson(nodeData.inputApplication, errorsWarnings, isPaletteNode, generateKeyFunc));
                node.inputApplication().setEmbedKey(node.getKey());
            }
        }
        if (typeof nodeData.outputApplication !== 'undefined' && nodeData.outputApplication !== null){
            if (!CategoryData.getCategoryData(category).canHaveOutputApplication){
                errorsWarnings.errors.push(Errors.Message("Attempt to add outputApplication to unsuitable node: " + category));
            } else {
                node.outputApplication(Node.fromOJSJson(nodeData.outputApplication, errorsWarnings, isPaletteNode, generateKeyFunc));
                node.outputApplication().setEmbedKey(node.getKey());
            }
        }

        // collapsed
        if (typeof nodeData.collapsed !== 'undefined'){
            node.collapsed(nodeData.collapsed);
        } else {
            node.collapsed(true);
        }

        // HACK! use old 'showPorts' attribute (if found) and overwrite the 'collapsed' value
        // never collapse groups
        if (typeof nodeData.showPorts !== 'undefined'){
            if (nodeData.showPorts === false){
                if (!node.isGroup()){
                    node.setCollapsed(true);
                }
            }
        }

        // handle obsolete 'precious' attribute, add it as a 'persist' field
        if (typeof nodeData.precious !== 'undefined'){
            const preciousField = new Field(
                Utils.uuidv4(),
                Daliuge.FieldName.PERSIST,
                nodeData.precious.toString(), 
                "false",
                "Specifies whether this data component contains data that should not be deleted after execution",
                false,
                Daliuge.DataType.Boolean,
                false,
                [],
                false,
                Daliuge.FieldType.ComponentParameter,
                Daliuge.FieldUsage.NoPort,
                false);
            node.addField(preciousField);
        }

        // handle obsolete 'streaming' attribute, add it as a 'streaming' field
        if (typeof nodeData.streaming !== 'undefined'){
            const streamingField = new Field(
                Utils.uuidv4(),
                Daliuge.FieldName.STREAMING,
                nodeData.streaming.toString(),
                "false",
                "Specifies whether this data component streams input and output data",
                false,
                Daliuge.DataType.Boolean,
                false,
                [],
                false,
                Daliuge.FieldType.ComponentParameter,
                Daliuge.FieldUsage.NoPort,
                false);
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
                    field.setParameterType(Daliuge.FieldType.ComponentParameter);
                }

                node.addField(field);
            }
        }

        // add application params
        if (typeof nodeData.applicationArgs !== 'undefined'){
            for (const paramData of nodeData.applicationArgs){
                const field = Field.fromOJSJson(paramData);
                field.setParameterType(Daliuge.FieldType.ApplicationArgument);
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
                port.setParameterType(Daliuge.FieldType.ApplicationArgument);
                port.setUsage(Daliuge.FieldUsage.InputPort);

                if (node.canHaveInputs()){
                    node.addField(port);
                } else {
                    Node.addPortToEmbeddedApplication(node, port, true, errorsWarnings, generateKeyFunc);
                }
            }
        }

        // add output ports
        if (typeof nodeData.outputPorts !== 'undefined'){
            for (const outputPort of nodeData.outputPorts){
                const port = Field.fromOJSJsonPort(outputPort);
                port.setParameterType(Daliuge.FieldType.ApplicationArgument);
                port.setUsage(Daliuge.FieldUsage.OutputPort);

                if (node.canHaveOutputs()){
                    node.addField(port);
                } else {
                    Node.addPortToEmbeddedApplication(node, port, false, errorsWarnings, generateKeyFunc);
                }
            }
        }

        // add input local ports
        if (typeof nodeData.inputLocalPorts !== 'undefined'){
            for (const inputLocalPort of nodeData.inputLocalPorts){
                if (node.hasInputApplication()){
                    const port = Field.fromOJSJsonPort(inputLocalPort);
                    port.setParameterType(Daliuge.FieldType.ApplicationArgument);
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
                port.setParameterType(Daliuge.FieldType.ApplicationArgument);
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

    private static copyPorts(src: Field[], dest: {}[]):void{
        for (const port of src){
            dest.push(Field.toOJSJsonPort(port));
        }
    }

    private static addPortToEmbeddedApplication(node: Node, port: Field, input: boolean, errorsWarnings: Errors.ErrorsWarnings, generateKeyFunc: () => number){
        // check that the node already has an appropriate embedded application, otherwise create it
        if (input){
            if (!node.hasInputApplication()){
                if (Setting.findValue(Setting.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                    node.inputApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getDisplayText(), Category.UnknownApplication, "", node.getKey()));
                    errorsWarnings.errors.push(Errors.Message("Created new embedded input application (" + node.inputApplication().getName() + ") for node (" + node.getName() + ", " + node.getKey() + "). Application category is " + node.inputApplication().getCategory() + " and may require user intervention."));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Cannot add input port to construct that doesn't support input ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name" + port.getDisplayText() ));
                    return;
                }
            }
            node.inputApplication().addField(port);
            errorsWarnings.warnings.push(Errors.Message("Moved input port (" + port.getDisplayText() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + ", " + node.getKey() + ") to an embedded input application (" + node.inputApplication().getName() + ", " + node.inputApplication().getKey() + ")"));
        } else {
            // determine whether we should check (and possibly add) an output or exit application, depending on the type of this node
            if (node.canHaveOutputApplication()){
                if (!node.hasOutputApplication()){
                    if (Setting.findValue(Setting.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                        node.outputApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getDisplayText(), Category.UnknownApplication, "", node.getKey()));
                        errorsWarnings.errors.push(Errors.Message("Created new embedded output application (" + node.outputApplication().getName() + ") for node (" + node.getName() + ", " + node.getKey() + "). Application category is " + node.outputApplication().getCategory() + " and may require user intervention."));
                    } else {
                        errorsWarnings.errors.push(Errors.Message("Cannot add output port to construct that doesn't support output ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name" + port.getDisplayText() ));
                        return;
                    }
                }
                node.outputApplication().addField(port);
                errorsWarnings.warnings.push(Errors.Message("Moved output port (" + port.getDisplayText() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + ", " + node.getKey() + ") to an embedded output application (" + node.outputApplication().getName() + ", " + node.outputApplication().getKey() + ")"));
            } else {
                // if possible, add port to output side of input application
                if (node.canHaveInputApplication()){
                    if (!node.hasInputApplication()){
                        if (Setting.findValue(Setting.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                            node.inputApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getDisplayText(), Category.UnknownApplication, "", node.getKey()));
                        } else {
                            errorsWarnings.errors.push(Errors.Message("Cannot add input port to construct that doesn't support input ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name" + port.getDisplayText() ));
                            return;
                        }
                    }
                    node.inputApplication().addField(port);
                    errorsWarnings.warnings.push(Errors.Message("Moved output port (" + port.getDisplayText() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + "," + node.getKey() + ") to output of the embedded input application"));
                } else {
                    errorsWarnings.errors.push(Errors.Message("Can't add port to embedded application. Node can't have output OR exit application."));
                }
            }
        }
    }

    static toOJSPaletteJson = (node : Node) : object => {
        const result : any = {};

        result.category = node.category();
        result.categoryType = node.categoryType();

        result.key = node.key();
        result.name = node.name();
        result.description = node.description();

        result.repositoryUrl = node.repositoryUrl();
        result.commitHash = node.commitHash();
        result.paletteDownloadUrl = node.paletteDownloadUrl();
        result.dataHash = node.dataHash();

        if (node.parentKey() !== null){
            result.group = node.parentKey();
        }

        if (node.embedKey() !== null){
            result.embedKey = node.embedKey();
        }

        // add fields
        result.fields = [];
        for (const field of node.fields()){
            result.fields.push(Field.toOJSJson(field));
        }

        // add fields from inputApplication
        result.inputAppFields = [];
        if (node.hasInputApplication()){
            for (const field of node.inputApplication().fields()){
                result.inputAppFields.push(Field.toOJSJson(field));
            }
        }

        // add fields from outputApplication
        result.outputAppFields = [];
        if (node.hasOutputApplication()){
            for (const field of node.outputApplication().fields()){
                result.outputAppFields.push(Field.toOJSJson(field));
            }
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationName = node.inputApplication().name();
            result.inputApplicationType = node.inputApplication().category();
            result.inputApplicationKey  = node.inputApplication().key();
            result.inputApplicationDescription = node.inputApplication().description();
        } else {
            result.inputApplicationName = "";
            result.inputApplicationType = Category.None;
            result.inputApplicationKey  = null;
            result.inputApplicationDescription = "";
        }
        if (node.hasOutputApplication()){
            result.outputApplicationName = node.outputApplication().name();
            result.outputApplicationType = node.outputApplication().category();
            result.outputApplicationKey  = node.outputApplication().key();
            result.outputApplicationDescription = node.outputApplication().description();
        } else {
            result.outputApplicationName = "";
            result.outputApplicationType = Category.None;
            result.outputApplicationKey  = null;
            result.outputApplicationDescription = "";
        }

        return result;
    }

    static toOJSGraphJson = (node : Node) : object => {
        const result : any = {};

        result.category = node.category();
        result.categoryType = node.categoryType();

        result.isGroup = node.isGroup();
        result.color = node.color();
        result.drawOrderHint = node.drawOrderHint();

        result.key = node.key();
        result.name = node.name();
        result.description = node.description();
        result.x = node.x();
        result.y = node.y();
        result.radius = node.radius();
        result.collapsed = node.collapsed();
        result.subject = node.subject();
        result.expanded = node.expanded();
        result.repositoryUrl = node.repositoryUrl();
        result.commitHash = node.commitHash();
        result.paletteDownloadUrl = node.paletteDownloadUrl();
        result.dataHash = node.dataHash();


        if (node.parentKey() !== null){
            result.group = node.parentKey();
        }

        if (node.embedKey() !== null){
            result.embedKey = node.embedKey();
        }

        // add fields
        result.fields = [];
        for (const field of node.fields()){
            result.fields.push(Field.toOJSJson(field));
        }

        // add fields from inputApplication
        result.inputAppFields = [];
        if (node.hasInputApplication()){
            for (const field of node.inputApplication().fields()){
                result.inputAppFields.push(Field.toOJSJson(field));
            }
        }

        // add fields from outputApplication
        result.outputAppFields = [];
        if (node.hasOutputApplication()){
            for (const field of node.outputApplication().fields()){
                result.outputAppFields.push(Field.toOJSJson(field));
            }
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationName = node.inputApplication().name();
            result.inputApplicationType = node.inputApplication().category();
            result.inputApplicationKey  = node.inputApplication().key();
            result.inputApplicationDescription = node.inputApplication().description();
        } else {
            result.inputApplicationName = "";
            result.inputApplicationType = Category.None;
            result.inputApplicationKey  = null;
            result.inputApplicationDescription = "";
        }
        if (node.hasOutputApplication()){
            result.outputApplicationName = node.outputApplication().name();
            result.outputApplicationType = node.outputApplication().category();
            result.outputApplicationKey  = node.outputApplication().key();
            result.outputApplicationDescription = node.outputApplication().description();
        } else {
            result.outputApplicationName = "";
            result.outputApplicationType = Category.None;
            result.outputApplicationKey  = null;
            result.outputApplicationDescription = "";
        }

        return result;
    }

    static createEmbeddedApplicationNode = (key: number, name : string, category: Category, description: string, embedKey: number) : Node => {
        console.assert(CategoryData.getCategoryData(category).categoryType === Category.Type.Application);

        const node = new Node(key, name, description, category);
        node.setEmbedKey(embedKey);
        node.setRadius(GraphConfig.NORMAL_NODE_RADIUS);
        return node;
    }

    getInputAppText = () : string => {
        if (!Node.canHaveInputApp(this)){
            return "";
        }

        const inputApplication : Node = this.getInputApplication();

        if (typeof inputApplication === "undefined" || inputApplication === null){
            return Node.NO_APP_STRING;
        }

        return inputApplication.getName() === "" ? Node.NO_APP_NAME_STRING : inputApplication.getName();
    }

    getOutputAppText = () : string => {
        if (!Node.canHaveOutputApp(this)){
            return "";
        }

        const outputApplication : Node = this.getOutputApplication();

        if (typeof outputApplication === "undefined" || outputApplication === null){
            return Node.NO_APP_STRING;
        }

        return outputApplication.getName() === "" ? Node.NO_APP_NAME_STRING : outputApplication.getName()
    }

    getInputAppColor = () : string => {
        if (!Node.canHaveInputApp(this)){
            return "white";
        }

        const inputApplication : Node = this.getInputApplication();

        if (typeof inputApplication === "undefined" || inputApplication === null){
            return "white";
        }

        return inputApplication.getColor();
    }

    getOutputAppColor = () : string => {
        if (!Node.canHaveOutputApp(this)){
            return "white";
        }

        const outputApplication : Node = this.getOutputApplication();

        if (typeof outputApplication === "undefined" || outputApplication === null){
            return "white";
        }

        return outputApplication.getColor();
    }

    getDataIcon = () : string => {
        switch (this.getCategory()){
            case Category.File:
                return "/static/assets/svg/hard-drive.svg";
            case Category.Memory:
                return "/static/assets/svg/memory.svg";
            case Category.S3:
                return "/static/assets/svg/s3_bucket.svg";
            case Category.NGAS:
                return "/static/assets/svg/ngas.svg";
            case Category.Plasma:
                return "/static/assets/svg/plasma.svg";
            default:
                console.warn("No icon available for node category", this.getCategory());
                return "";
        }
    }

    static isValid = (eagle: Eagle, node: Node, selectedLocation: Eagle.FileType, showNotification : boolean, showConsole : boolean, errorsWarnings: Errors.ErrorsWarnings) : Eagle.LinkValid => {
        // check that all port dataTypes have been defined
        for (const port of node.getInputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has input port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }
        for (const port of node.getOutputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has output port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        for (const port of node.getInputApplicationInputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has input application (" + node.getInputApplication().getName() + ") with input port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        for (const port of node.getInputApplicationOutputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has input application (" + node.getInputApplication().getName() + ") with output port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        for (const port of node.getOutputApplicationInputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has output application (" + node.getOutputApplication().getName() + ") with input port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        for (const port of node.getOutputApplicationOutputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has output application (" + node.getOutputApplication().getName() + ") with output port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        // check that all fields have ids
        for (const field of node.getFields()){
            if (field.getId() === "" || field.getId() === null){
                const issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has field (" + field.getDisplayText() + ") with no id", function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixFieldId(eagle, field)}, "Generate id for field");
                errorsWarnings.errors.push(issue);
            }
        }

        // check that all fields have default values
        for (const field of node.getFields()){
            if (field.getDefaultValue() === "" && !field.isType(Daliuge.DataType.String) && !field.isType(Daliuge.DataType.Password) && !field.isType(Daliuge.DataType.Object) && !field.isType(Daliuge.DataType.Unknown)) {
                const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has a component parameter (" + field.getDisplayText() + ") whose default value is not specified", function(){Utils.showNode(eagle, selectedLocation, node.getId())}, function(){Utils.fixFieldDefaultValue(eagle, field)}, "Generate default value for parameter");
                errorsWarnings.warnings.push(issue);
            }
        }

        // check that all fields have known types
        for (const field of node.getFields()){
            if (!Utils.validateType(field.getType())) {
                const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has a component parameter (" + field.getDisplayText() + ") whose type (" + field.getType() + ") is unknown", function(){Utils.showNode(eagle, selectedLocation, node.getId())}, function(){Utils.fixFieldType(eagle, field)}, "Prepend existing type (" + field.getType() + ") with 'Object.'");
                errorsWarnings.warnings.push(issue);
            }
        }

        // check that all fields "key" attribute is the same as the key of the node they belong to
        for (const field of node.getFields()){
            if (field.getNodeKey() !== node.getKey()) {
                const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has a field (" + field.getDisplayText() + ") whose key (" + field.getNodeKey() + ") doesn't match the node (" + node.getKey() + ")", function(){Utils.showNode(eagle, selectedLocation, node.getId())}, function(){Utils.fixFieldKey(eagle, node, field)}, "Set field node key correctly");
                errorsWarnings.errors.push(issue);
            }
        }

        // check that multiple fields don't share the same name
        // NOTE: this code checks many pairs of fields twice
        for (let i = 0 ; i < node.getFields().length ; i++){
            const field0 = node.getFields()[i];
            for (let j = 0 ; j < node.getFields().length ; j++){
                const field1 = node.getFields()[j];
                if (i !== j && field0.getDisplayText() === field1.getDisplayText() && field0.getParameterType() === field1.getParameterType()){
                    if (field0.getId() === field1.getId()){
                        const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has multiple attributes with the same display text (" + field0.getDisplayText() + ").", function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixNodeMergeFieldsByIndex(eagle, node, i, j)}, "Merge fields");
                        errorsWarnings.warnings.push(issue);
                    } else {
                        const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has multiple attributes with the same display text (" + field0.getDisplayText() + ").", function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixNodeMergeFields(eagle, node, field0, field1)}, "Merge fields");
                        errorsWarnings.warnings.push(issue);
                    }
                }
            }
        }

        // check that fields have parameter types that are suitable for this node
        for (const field of node.getFields()){
            // skip the 'drop class' component parameter, those are always suitable for every node
            if (field.getDisplayText() === Daliuge.FieldName.DROP_CLASS && field.getParameterType() === Daliuge.FieldType.ComponentParameter){
                continue;
            }

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

                const message = "Node " + node.getKey() + " (" + node.getName() + ") with category " + node.getCategory() + " contains field (" + field.getDisplayText() + ") with unsuitable type (" + field.getParameterType() + ").";
                const issue: Errors.Issue = Errors.ShowFix(message, function(){Utils.showNode(eagle, selectedLocation, node.getId());}, function(){Utils.fixFieldParameterType(eagle, node, field, suitableType)}, "Switch to suitable type, or remove if no suitable type");
                errorsWarnings.warnings.push(issue);
            }
        }

        // check that all nodes have correct numbers of inputs and outputs
        const cData: Category.CategoryData = CategoryData.getCategoryData(node.getCategory());
        const minInputs  = cData.minInputs;
        const maxInputs  = cData.maxInputs;
        const minOutputs = cData.minOutputs;
        const maxOutputs = cData.maxOutputs;

        if (node.getInputPorts().length < minInputs){
            errorsWarnings.warnings.push(Errors.Message("Node " + node.getKey() + " (" + node.getName() + ") may have too few input ports. A " + node.getCategory() + " component would typically have at least " + minInputs));
        }
        if (node.getInputPorts().length > maxInputs){
            errorsWarnings.errors.push(Errors.Message("Node " + node.getKey() + " (" + node.getName() + ") has too many input ports. Should have at most " + maxInputs));
        }
        if (node.getOutputPorts().length < minOutputs){
            errorsWarnings.warnings.push(Errors.Message("Node " + node.getKey() + " (" + node.getName() + ") may have too few output ports.  A " + node.getCategory() + " component would typically have at least " + minOutputs));
        }
        if (node.getOutputPorts().length > maxOutputs){
            errorsWarnings.errors.push(Errors.Message("Node " + node.getKey() + " (" + node.getName() + ") may have too many output ports. Should have at most " + maxOutputs));
        }

        // check that all nodes should have at least one connected edge, otherwise what purpose do they serve?
        let isConnected: boolean = false;
        for (const edge of eagle.logicalGraph().getEdges()){
            if (edge.getSrcNodeKey() === node.getKey() || edge.getDestNodeKey() === node.getKey()){
                isConnected = true;
                break;
            }
        }

        // check if a node is completely disconnected from the graph, which is sometimes an indicator of something wrong
        // only check this if the component has been selected in the graph. If it was selected from the palette, it doesnt make sense to complain that it is not connected.
        if (!isConnected && !(maxInputs === 0 && maxOutputs === 0) && selectedLocation === Eagle.FileType.Graph){
            const issue: Errors.Issue = Errors.ShowFix("Node " + node.getKey() + " (" + node.getName() + ") has no connected edges. It should be connected to the graph in some way", function(){Utils.showNode(eagle, selectedLocation, node.getId())}, null, "");
            errorsWarnings.warnings.push(issue);
        }

        // check embedded application categories are not 'None'
        if (node.hasInputApplication() && node.getInputApplication().getCategory() === Category.None){
            errorsWarnings.errors.push(Errors.Message("Node " + node.getKey() + " (" + node.getName() + ") has input application with category 'None'."));
        }
        if (node.hasOutputApplication() && node.getOutputApplication().getCategory() === Category.None){
            errorsWarnings.errors.push(Errors.Message("Node " + node.getKey() + " (" + node.getName() + ") has output application with category 'None'."));
        }

        // check that Service nodes have inputApplications with no output ports!
        if (node.getCategory() === Category.Service && node.hasInputApplication() && node.getInputApplication().getOutputPorts().length > 0){
            errorsWarnings.errors.push(Errors.Message("Node " + node.getKey() + " (" + node.getName() + ") is a Service node, but has an input application with at least one output."));
        }

        // check the embedded applications
        if (node.hasInputApplication()){
            Node.isValid(eagle, node.getInputApplication(), selectedLocation, showNotification, showConsole, errorsWarnings);
        }
        if (node.hasOutputApplication()){
            Node.isValid(eagle, node.getOutputApplication(), selectedLocation, showNotification, showConsole, errorsWarnings);
        }

        // check that this category of node contains all the fields it requires
        for (const requirement of Daliuge.categoryFieldsRequired){
            if (requirement.categories.includes(node.getCategory())){
                for (const requiredField of requirement.fields){
                    Node._checkForField(eagle, selectedLocation, node, requiredField, errorsWarnings);
                }
            }
        }

        // check that this categoryType of node contains all the fields it requires
        for (const requirement of Daliuge.categoryTypeFieldsRequired){
            if (requirement.categoryTypes.includes(node.getCategoryType())){
                for (const requiredField of requirement.fields){
                    Node._checkForField(eagle, selectedLocation, node, requiredField, errorsWarnings);
                }
            }
        }

        return Utils.worstEdgeError(errorsWarnings);
    }

    private static _checkForField = (eagle: Eagle, location: Eagle.FileType, node: Node, field: Field, errorsWarnings: Errors.ErrorsWarnings) : void => {
        // check if the node already has this field
        const existingField = node.getFieldByDisplayText(field.getDisplayText());

        // if not, create one by cloning the required field
        // if so, check the attributes of the field match
        if (existingField === null){
            const message = "Node " + node.getKey() + " (" + node.getName() + ":" + node.category() + ":" + node.categoryType() + ") does not have the required '" + field.getDisplayText() + "' field";
            errorsWarnings.errors.push(Errors.Show(message, function(){Utils.showNode(eagle, location, node.getId());}));
        } else {
            if (existingField.getParameterType() !== field.getParameterType()){
                const message = "Node " + node.getKey() + " (" + node.getName() + ") has a '" + field.getDisplayText() + "' field with the wrong parameter type (" + existingField.getParameterType() + "), should be a " + field.getParameterType();
                errorsWarnings.errors.push(Errors.ShowFix(message, function(){Utils.showNode(eagle, location, node.getId());}, function(){Utils.fixFieldParameterType(eagle, node, existingField, field.getParameterType())}, "Switch type of field to '" + field.getParameterType()));
            }
        }
    }
}
