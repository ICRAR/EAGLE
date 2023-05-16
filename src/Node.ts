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

import {Utils} from './Utils';
import {GraphUpdater} from './GraphUpdater';
import {Eagle} from './Eagle';
import {Field} from './Field';
import {Errors} from './Errors';
import {Category} from './Category';
import {CategoryData} from './CategoryData';
import {Setting} from './Setting';
import {Daliuge} from './Daliuge';

export class Node {
    private _id : string
    private key : ko.Observable<number>;
    private name : ko.Observable<string>;
    private description : ko.Observable<string>;

    private x : number; // display position
    private y : number;
    private realX : number; // underlying position (pre snap-to-grid)
    private realY : number;
    
    
    private width : number;
    private height : number;
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
    private flipPorts : ko.Observable<boolean>;

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

    public static readonly DEFAULT_WIDTH : number = 200;
    public static readonly DEFAULT_HEIGHT : number = 72;
    public static readonly MINIMUM_WIDTH : number = 200;
    public static readonly MINIMUM_HEIGHT : number = 72;
    public static readonly DEFAULT_COLOR : string = "ffffff";

    public static readonly GROUP_DEFAULT_WIDTH : number = 400;
    public static readonly GROUP_DEFAULT_HEIGHT : number = 200;
    public static readonly GROUP_COLLAPSED_WIDTH : number = 128;
    public static readonly GROUP_COLLAPSED_HEIGHT : number = 128;
    public static readonly DATA_COMPONENT_WIDTH : number = 48;
    public static readonly DATA_COMPONENT_HEIGHT : number = 48;

    public static readonly NO_APP_STRING : string = "<no app>";

    // when creating a new construct to enclose a selection, or shrinking a node to enclose its children,
    // this is the default margin that should be left on each side
    public static readonly CONSTRUCT_MARGIN_LEFT: number = 24;
    public static readonly CONSTRUCT_MARGIN_RIGHT: number = 24;
    public static readonly CONSTRUCT_MARGIN_TOP: number = 72;
    public static readonly CONSTRUCT_MARGIN_BOTTOM: number = 16;

    constructor(key : number, name : string, description : string, category : Category){
        this._id = Utils.uuidv4();
        this.key = ko.observable(key);
        this.name = ko.observable(name);
        this.description = ko.observable(description);
        
        // display position
        this.x = 0;
        this.y = 0;
        this.realX = 0;
        this.realY = 0;

        this.width = Node.DEFAULT_WIDTH;
        this.height = Node.DEFAULT_HEIGHT;
        this.color = ko.observable(Utils.getColorForNode(category));
        this.drawOrderHint = ko.observable(0);

        this.parentKey = ko.observable(null);
        this.embedKey = ko.observable(null);
        this.collapsed = ko.observable(true);
        this.peek = false;
        this.flipPorts = ko.observable(false);

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
    }

    getId = () : string => {
        return this._id;
    }

    setId = (id: string) : void => {
        this._id = id;
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
        return {x: this.x, y: this.y};
    }

    getRealPosition = () : {x:number, y:number} => {
        return {x: this.realX, y: this.realY};
    }

    setPosition = (x: number, y: number, allowSnap: boolean = true) : void => {
        this.realX = x;
        this.realY = y;

        if (Eagle.getInstance().snapToGrid() && allowSnap){
            this.x = Utils.snapToGrid(this.realX, this.getDisplayWidth());
            this.y = Utils.snapToGrid(this.realY, this.getDisplayHeight());
        } else {
            this.x = this.realX;
            this.y = this.realY;
        }
    }

    changePosition = (dx : number, dy : number, allowSnap: boolean = true) : {dx:number, dy:number} => {
        this.realX += dx;
        this.realY += dy;

        const beforePos = {x:this.x, y:this.y};

        if (Eagle.getInstance().snapToGrid() && allowSnap){
            this.x = Utils.snapToGrid(this.realX, this.getDisplayWidth());
            this.y = Utils.snapToGrid(this.realY, this.getDisplayHeight());

            return {dx:this.x - beforePos.x, dy:this.y - beforePos.y};
        } else {
            this.x = this.realX;
            this.y = this.realY;
            
            return {dx:dx, dy:dy};
        }
    }

    resetReal = () : void => {
        this.realX = this.x;
        this.realY = this.y;
    }

    getWidth = () : number => {
        return this.width;
    }

    setWidth = (width : number) : void => {
        this.width = width;
    }

    getHeight = () : number => {
        return this.height;
    }

    setHeight = (height : number) : void => {
        this.height = height;
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

    isFlipPorts = () : boolean => {
        return this.flipPorts();
    }

    setFlipPorts = (value : boolean) : void => {
        this.flipPorts(value);
    }

    toggleFlipPorts = () : void => {
        this.flipPorts(!this.flipPorts());
    }

    isLocked : ko.PureComputed<boolean> = ko.pureComputed(() => {
        if(Eagle.selectedLocation() === Eagle.FileType.Graph){
            const allowComponentEditing : boolean = Eagle.allowComponentEditing();
            return !allowComponentEditing;
        }else{
            const allowPaletteEditing : boolean = Eagle.allowPaletteEditing();
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
        const allowParam : boolean = Eagle.allowComponentEditing();

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
            return "<p><h5>" + this.getName() + "</h5></p><p>" + Utils.markdown2html(this.getDescription()) +  "</p>";
        } else {
            return "<p><h5>" + this.getCategory() + " : " + this.getName() + "</h5></p><p>" + Utils.markdown2html(this.getDescription()) +  "</p>";
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
        this._id = "";
        this.key(0);
        this.name("");
        this.description("");
        this.x = 0;
        this.y = 0;
        this.width = Node.DEFAULT_WIDTH;
        this.height = Node.DEFAULT_HEIGHT;
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

    getDisplayWidth = () : number => {
        if (this.isGroup() && this.isCollapsed()){
            return Node.GROUP_COLLAPSED_WIDTH;
        }

        if (!this.isGroup() && !this.isCollapsed()){
            return this.width;
        }

        if (this.isData() && !this.isCollapsed() && !this.isPeek()){
            return Node.DATA_COMPONENT_WIDTH;
        }

        return this.width;
    }

    getDisplayHeight = () : number => {
        if (this.isResizable()){
            if (this.isCollapsed()){
                return Node.GROUP_COLLAPSED_HEIGHT;
            } else {
                return this.height;
            }
        }

        if (!this.isGroup() && this.isCollapsed() && !this.isPeek()){
            return 32;
        }

        if (this.isData() && this.isCollapsed() && !this.isPeek()){
            return Node.DATA_COMPONENT_HEIGHT;
        }

        if (this.getCategory() === Category.Service){
            // NOTE: Service nodes can't have input ports, or input application output ports!
            return (2 * 30) +
                (this.getInputApplicationInputPorts().length * 24) +
                (this.getInputApplicationOutputPorts().length * 24) +
                8;
        }

        const leftHeight = (
            this.getInputPorts().length +
            this.getInputApplicationInputPorts().length +
            this.getInputApplicationOutputPorts().length +
            2) * 24;
        const rightHeight = (
            this.getOutputPorts().length +
            this.getOutputApplicationInputPorts().length +
            this.getOutputApplicationOutputPorts().length +
            2) * 24;

        return Math.max(leftHeight, rightHeight);
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

    removeAllInputPorts = () : void => {
        for (let i = this.fields().length - 1 ; i >= 0 ; i--){
            if (this.fields()[i].getUsage() === Daliuge.FieldUsage.InputPort){
                this.fields.splice(i, 1);
            }
        }
    }

    removeAllOutputPorts = () : void => {
        for (let i = this.fields().length - 1 ; i >= 0 ; i--){
            if (this.fields()[i].getUsage() === Daliuge.FieldUsage.OutputPort){
                this.fields.splice(i, 1);
            }
        }
    }

    clone = () : Node => {
        const result : Node = new Node(this.key(), this.name(), this.description(), this.category());

        result._id = this._id;
        result.x = this.x;
        result.y = this.y;
        result.width = this.width;
        result.height = this.height;
        result.categoryType(this.categoryType());
        result.color(this.color());
        result.drawOrderHint(this.drawOrderHint());

        result.parentKey(this.parentKey());
        result.embedKey(this.embedKey());

        result.collapsed(this.collapsed());
        result.expanded(this.expanded());
        result.keepExpanded(this.expanded());

        result.peek = this.peek;
        result.flipPorts(this.flipPorts());

        // copy input,output and exit applications
        if (this.inputApplication() === null){
            result.inputApplication(null);
        } else {
            result.inputApplication(this.inputApplication().clone());
        }
        if (this.outputApplication() === null){
            result.outputApplication(null);
        } else {
            result.outputApplication(this.outputApplication().clone());
        }

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

    static getUniqueKey = (node: Node): string => {
        return node.name() + node.key();    
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
        let category: Category = GraphUpdater.translateOldCategory(nodeData.category);

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
        let width = Node.DEFAULT_WIDTH;
        let height = Node.DEFAULT_HEIGHT;
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
        node.width = width;
        node.height = height;

        // if node is not a group or comment/description, make its width/height the default values
        if (!CategoryData.getCategoryData(node.getCategory()).isResizable){
            node.width = Node.DEFAULT_WIDTH;
            node.height = Node.DEFAULT_HEIGHT;
        }

        // flipPorts
        if (typeof nodeData.flipPorts !== 'undefined'){
            node.flipPorts(nodeData.flipPorts);
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

        // set parentKey if a group is defined
        if (typeof nodeData.group !== 'undefined'){
            node.parentKey(nodeData.group);
        }

        // set embedKey if defined
        if (typeof nodeData.embedKey !== 'undefined'){
            node.embedKey(nodeData.embedKey);
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
                const field = Field.fromJson(fieldData);

                // if the parameter type is not specified, assume it is a ComponentParameter
                if (field.getParameterType() === Daliuge.FieldType.Unknown){
                    field.setParameterType(Daliuge.FieldType.ComponentParameter);
                }

                node.addField(field);
            }
        }

        // add application params
        // TODO: remove
        if (typeof nodeData.applicationArgs !== 'undefined'){
            for (const paramData of nodeData.applicationArgs){
                const field = Field.fromJson(paramData);
                field.setParameterType(Daliuge.FieldType.ApplicationArgument);
                node.addField(field);
            }
        }

        // add inputAppFields
        // TODO: remove
        if (typeof nodeData.inputAppFields !== 'undefined'){
            for (const fieldData of nodeData.inputAppFields){
                if (node.hasInputApplication()){
                    const field = Field.fromJson(fieldData);
                    node.inputApplication().addField(field);
                } else {
                    errorsWarnings.errors.push(Errors.Message("Can't add input app field " + fieldData.text + " to node " + node.getName() + ". No input application."));
                }
            }
        }

        // add outputAppFields
        // TODO: remove
        if (typeof nodeData.outputAppFields !== 'undefined'){
            for (const fieldData of nodeData.outputAppFields){
                if (node.hasOutputApplication()){
                    const field = Field.fromJson(fieldData);
                    node.outputApplication().addField(field);
                } else {
                    errorsWarnings.errors.push(Errors.Message("Can't add output app field " + fieldData.text + " to node " + node.getName() + ". No output application."));
                }
            }
        }

        // add input ports
        // TODO: remove
        if (typeof nodeData.inputPorts !== 'undefined'){
            for (const inputPort of nodeData.inputPorts){
                const port = Field.fromJson(inputPort);
                port.setParameterType(Daliuge.FieldType.ApplicationArgument);
                port.setUsage(Daliuge.FieldUsage.InputPort);

                if (node.canHaveInputs()){
                    node.addField(port);
                } else {
                    //Node.addPortToEmbeddedApplication(node, port, true, errorsWarnings, generateKeyFunc);
                    errorsWarnings.errors.push(Errors.Message("Node (" + node.getName() + ") not allowed to have input ports. Can't add " + port.getDisplayText()));
                }
            }
        }

        // add output ports
        // TODO: remove
        if (typeof nodeData.outputPorts !== 'undefined'){
            for (const outputPort of nodeData.outputPorts){
                const port = Field.fromJson(outputPort);
                port.setParameterType(Daliuge.FieldType.ApplicationArgument);
                port.setUsage(Daliuge.FieldUsage.OutputPort);

                if (node.canHaveOutputs()){
                    node.addField(port);
                } else {
                    //Node.addPortToEmbeddedApplication(node, port, false, errorsWarnings, generateKeyFunc);
                    errorsWarnings.errors.push(Errors.Message("Node (" + node.getName() + ") not allowed to have output ports. Can't add " + port.getDisplayText()));
                }
            }
        }

        // add input local ports
        // TODO: remove
        if (typeof nodeData.inputLocalPorts !== 'undefined'){
            for (const inputLocalPort of nodeData.inputLocalPorts){
                if (node.hasInputApplication()){
                    const port = Field.fromJson(inputLocalPort);
                    port.setParameterType(Daliuge.FieldType.ApplicationArgument);
                    port.setUsage(Daliuge.FieldUsage.OutputPort);

                    node.inputApplication().addField(port);
                } else {
                    errorsWarnings.errors.push(Errors.Message("Can't add inputLocal port " + inputLocalPort.IdText + " to node " + node.getName() + ". No input application."));
                }
            }
        }

        // add output local ports
        // TODO: remove
        if (typeof nodeData.outputLocalPorts !== 'undefined'){
            for (const outputLocalPort of nodeData.outputLocalPorts){
                const port = Field.fromJson(outputLocalPort);
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

    static toOJSJson = (node: Node): object => {
        const result: any = {};

        // TODO: more

        return result;
    }

    private static copyPorts(src: Field[], dest: {}[]):void{
        for (const port of src){
            dest.push(Field.toJson(port));
        }
    }

    static toNodeDataJson = (node: Node): object => {
        const result: any = {};

        result.category = node.category();
        result.categoryType = node.categoryType();

        result.isGroup = node.isGroup();
        result.group = node.getEmbedKey();
        result.key = node.key();
        result.name = node.name();
        result.description = node.description();

        result.repositoryUrl = node.repositoryUrl();
        result.commitHash = node.commitHash();
        result.paletteDownloadUrl = node.paletteDownloadUrl();
        result.dataHash = node.dataHash();

        result.fields = {};
        for (const field of node.fields()){
            const key: string = field.getDisplayText();
            const value: object = Field.toJson(field);
            result.fields[key] = value;
        }

        if (node.hasInputApplication()){
            result.inputApplicationKey = node.getInputApplication().getName() + node.getInputApplication().getKey();
        } else {
            result.inputApplicationKey = null;
        }
        
        if (node.hasOutputApplication()){
            result.outputApplicationKey = node.getOutputApplication().getName() + node.getOutputApplication().getKey();
        } else {
            result.outputApplicationKey = null;
        }

        result.reprodata = Node.reproData(node);

        result.id = node.getId();
        result.parentConstructKey = node.getEmbedKey();

        return result;
    }

    static fromAppRefJson = (nodeData : any, usData: any, errorsWarnings: Errors.ErrorsWarnings, isPaletteNode: boolean, generateKeyFunc: () => number) : Node => {
        let key: number = 0;
        let name: string = "";
        let description: string = "";
        let category: Category = Category.Unknown;
        
        const result: Node = new Node(key, name, description, category);

        return result;
    }

    static toNodeUxJson = (node: Node): object => {
        const result: any = {};

        result.color = node.color();
        result.drawOrderHint = node.drawOrderHint();
        result.x = node.x;
        result.y = node.y;
        result.width = node.width;
        result.height = node.height;
        result.collapsed = node.collapsed();
        result.flipPorts = node.flipPorts();
        result.subject = node.subject();
        result.expanded = node.expanded();
        result.id = node._id;

        return result;
    }

    static toOJSPaletteJson = (node : Node) : object => {
        const result : any = {};
        const useNewCategories : boolean = Setting.findValue(Setting.TRANSLATE_WITH_NEW_CATEGORIES);

        result.category = useNewCategories ? GraphUpdater.translateNewCategory(node.category()) : node.category();
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
            result.fields.push(Field.toJson(field));
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationKey  = node.inputApplication().key();
        } else {
            result.inputApplicationKey  = null;
        }
        if (node.hasOutputApplication()){
            result.outputApplicationKey  = node.outputApplication().key();
        } else {
            result.outputApplicationKey  = null;
        }

        return result;
    }

    static toGraphJson = (node : Node) : object => {
        const result : any = {};
        const useNewCategories : boolean = Setting.findValue(Setting.TRANSLATE_WITH_NEW_CATEGORIES);

        result.category = useNewCategories ? GraphUpdater.translateNewCategory(node.category()) : node.category();
        result.categoryType = node.categoryType();

        result.isGroup = node.isGroup();
        result.color = node.color();
        result.drawOrderHint = node.drawOrderHint();

        result.key = node.key();
        result.name = node.name();
        result.description = node.description();
        result.x = node.x;
        result.y = node.y;
        result.width = node.width;
        result.height = node.height;
        result.collapsed = node.collapsed();
        result.flipPorts = node.flipPorts();
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
            result.fields.push(Field.toJson(field));
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationKey  = node.inputApplication().key();
        } else {
            result.inputApplicationKey  = null;
        }
        if (node.hasOutputApplication()){
            result.outputApplicationKey  = node.outputApplication().key();
        } else {
            result.outputApplicationKey  = null;
        }

        return result;
    }

    static createEmbeddedApplicationNode = (key: number, name : string, category: Category, description: string, embedKey: number) : Node => {
        console.assert(CategoryData.getCategoryData(category).categoryType === Category.Type.Application);

        const node = new Node(key, name, description, category);
        node.setEmbedKey(embedKey);
        return node;
    }

    // TODO: replace
    static reproData = (node: Node) : object => {
        return {
            "rmode": "0",
            "NOTHING": {
                "rmode": "0",
                "lgt_data": {
                    "merkleroot": null
                },
                "lg_parenthashes": {},
                "lg_data": {
                    "merkleroot": null
                },
                "lg_blockhash": "b33f465166e678698582a66db1f75d28949c4bd51a72e6f608c9d124b9196e73"
            }
        };
    }

    static isValid = (eagle: Eagle, node: Node, selectedLocation: Eagle.FileType, showNotification : boolean, showConsole : boolean, errorsWarnings: Errors.ErrorsWarnings) : Eagle.LinkValid => {
        // check that all port dataTypes have been defined
        for (const port of node.getInputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has input port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }
        for (const port of node.getOutputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has output port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        for (const port of node.getInputApplicationInputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has input application (" + node.getInputApplication().getName() + ") with input port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        for (const port of node.getInputApplicationOutputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has input application (" + node.getInputApplication().getName() + ") with output port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        for (const port of node.getOutputApplicationInputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has output application (" + node.getOutputApplication().getName() + ") with input port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        for (const port of node.getOutputApplicationOutputPorts()){
            if (port.isType(Daliuge.DataType.Unknown)){
                const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has output application (" + node.getOutputApplication().getName() + ") with output port (" + port.getDisplayText() + ") whose type is not specified", function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixFieldType(eagle, port)}, "");
                errorsWarnings.warnings.push(issue);
            }
        }

        // check that all fields have ids
        for (const field of node.getFields()){
            if (field.getId() === "" || field.getId() === null){
                const issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has field (" + field.getDisplayText() + ") with no id", function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixFieldId(eagle, field)}, "Generate id for field");
                errorsWarnings.errors.push(issue);
            }
        }

        // check that all fields have default values
        for (const field of node.getFields()){
            if (field.getDefaultValue() === "" && !field.isType(Daliuge.DataType.String) && !field.isType(Daliuge.DataType.Password) && !field.isType(Daliuge.DataType.Object) && !field.isType(Daliuge.DataType.Unknown)) {
                const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has a component parameter (" + field.getDisplayText() + ") whose default value is not specified", function(){Utils.showNode(eagle, node.getKey())}, function(){Utils.fixFieldDefaultValue(eagle, field)}, "Generate default value for parameter");
                errorsWarnings.warnings.push(issue);
            }
        }

        // check that all fields have known types
        for (const field of node.getFields()){
            if (!Utils.validateType(field.getType())) {
                const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has a component parameter (" + field.getDisplayText() + ") whose type (" + field.getType() + ") is unknown", function(){Utils.showNode(eagle, node.getKey())}, function(){Utils.fixFieldType(eagle, field)}, "Prepend existing type (" + field.getType() + ") with 'Object.'");
                errorsWarnings.warnings.push(issue);
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
                        const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has multiple attributes with the same display text (" + field0.getDisplayText() + ").", function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixNodeMergeFieldsByIndex(eagle, node, i, j)}, "Merge fields");
                        errorsWarnings.warnings.push(issue);
                    } else {
                        const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has multiple attributes with the same display text (" + field0.getDisplayText() + ").", function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixNodeMergeFields(eagle, node, field0, field1)}, "Merge fields");
                        errorsWarnings.warnings.push(issue);
                    }
                }
            }
        }

        // check that fields have parameter types that are suitable for this node
        for (const field of node.getFields()){
            if (
                (field.getParameterType() === Daliuge.FieldType.ComponentParameter) && !CategoryData.getCategoryData(node.getCategory()).canHaveComponentParameters ||
                (field.getParameterType() === Daliuge.FieldType.ApplicationArgument) && !CategoryData.getCategoryData(node.getCategory()).canHaveApplicationArguments ||
                (field.getParameterType() === Daliuge.FieldType.ConstructParameter) && !CategoryData.getCategoryData(node.getCategory()).canHaveConstructParameters
            ){
                // determine a suitable type
                let suitableType: Daliuge.FieldType = Daliuge.FieldType.Unknown;
                if (CategoryData.getCategoryData(node.getCategory()).canHaveComponentParameters){
                    suitableType = Daliuge.FieldType.ComponentParameter;
                } else {
                    if (CategoryData.getCategoryData(node.getCategory()).canHaveApplicationArguments){
                        suitableType = Daliuge.FieldType.ApplicationArgument;
                    } else {
                        suitableType = Daliuge.FieldType.ConstructParameter;
                    }
                }

                const message = "Node " + node.getKey() + " (" + node.getName() + ") with category " + node.getCategory() + " contains field (" + field.getDisplayText() + ") with unsuitable type (" + field.getParameterType() + ").";
                const issue: Errors.Issue = Errors.Fix(message, function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixFieldParameterType(eagle, field, suitableType)}, "Switch to suitable type");
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
            const issue: Errors.Issue = Errors.Fix("Node " + node.getKey() + " (" + node.getName() + ") has no connected edges. It should be connected to the graph in some way", function(){Utils.showNode(eagle, node.getKey())}, null, "");
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
        for (const requirement of Daliuge.requiredFields){
            if (node.getCategory() === requirement.category){
                for (const requiredField of requirement.fields){
                    // check if the node already has this field
                    const existingField = node.getFieldByDisplayText(requiredField.getDisplayText());

                    // if not, create one by cloning the required field
                    // if so, check the attributes of the field match
                    if (existingField === null){
                        const message = "Node " + node.getKey() + " (" + node.getName() + ") has category " + node.getCategory() + " but has no '" + requiredField.getDisplayText() + "' field.";
                        const newField = requiredField.clone();
                        newField.setId(Utils.uuidv4());
                        errorsWarnings.errors.push(Errors.Fix(message, function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixNodeAddField(eagle, node, newField)}, "Add '" + newField.getDisplayText() + "' field to node"));
                    } else {
                        if (existingField.getParameterType() !== requiredField.getParameterType()){
                            const message = "Node " + node.getKey() + " (" + node.getName() + ") has a '" + requiredField.getDisplayText() + "' field with the wrong parameter type (" + existingField.getParameterType() + "), should be a " + requiredField.getParameterType();
                            errorsWarnings.errors.push(Errors.Fix(message, function(){Utils.showNode(eagle, node.getKey());}, function(){Utils.fixFieldParameterType(eagle, existingField, requiredField.getParameterType())}, "Switch type of field to '" + requiredField.getParameterType()));
                        }
                    }
                }
            }
        }

        return Utils.worstEdgeError(errorsWarnings);
    }
}
