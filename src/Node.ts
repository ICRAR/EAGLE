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
import {Port} from './Port';
import {Field} from './Field';

export class Node {
    private _id : string
    private key : ko.Observable<number>;
    private name : ko.Observable<string>;
    private description : ko.Observable<string>;
    private x : number;
    private y : number;
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

    private streaming : ko.Observable<boolean>;
    private precious : ko.Observable<boolean>;
    private peek : boolean;                        // true if we are temporarily showing the ports based on the users mouse position
    private flipPorts : ko.Observable<boolean>;

    private inputApplication : ko.Observable<Node>;
    private outputApplication : ko.Observable<Node>;
    private exitApplication : ko.Observable<Node>;

    private inputPorts : ko.ObservableArray<Port>;
    private outputPorts : ko.ObservableArray<Port>;

    private fields : ko.ObservableArray<Field>;
    private applicationParams : ko.ObservableArray<Field>;

    private category : ko.Observable<Eagle.Category>;

    private subject : ko.Observable<number>;       // the key of another node that is the subject of this node. used by comment nodes only.

    private readonly : ko.Observable<boolean>;

    private gitUrl : ko.Observable<string>;
    private gitHash : ko.Observable<string>;

    public static readonly DEFAULT_WIDTH : number = 200;
    public static readonly DEFAULT_HEIGHT : number = 72;
    public static readonly MINIMUM_WIDTH : number = 200;
    public static readonly MINIMUM_HEIGHT : number = 72;
    public static readonly DEFAULT_COLOR : string = "ffffff";

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

    constructor(key : number, name : string, description : string, category : Eagle.Category, readonly: boolean){
        this._id = Utils.uuidv4();
        this.key = ko.observable(key);
        this.name = ko.observable(name);
        this.description = ko.observable(description);
        this.x = 0;
        this.y = 0;
        this.width = Node.DEFAULT_WIDTH;
        this.height = Node.DEFAULT_HEIGHT;
        this.color = ko.observable(Utils.getColorForNode(category));
        this.drawOrderHint = ko.observable(0);

        this.parentKey = ko.observable(null);
        this.embedKey = ko.observable(null);
        this.collapsed = ko.observable(true);
        this.streaming = ko.observable(false);
        this.precious = ko.observable(false);
        this.peek = false;
        this.flipPorts = ko.observable(false);

        this.inputApplication = ko.observable(null);
        this.outputApplication = ko.observable(null);
        this.exitApplication = ko.observable(null);

        this.inputPorts = ko.observableArray([]);
        this.outputPorts = ko.observableArray([]);

        this.fields = ko.observableArray([]);
        this.applicationParams = ko.observableArray([]);

        this.category = ko.observable(category);

        this.subject = ko.observable(null);

        this.expanded = ko.observable(false); // indicates whether the node is shown expanded in the hierarchy display
        this.readonly = ko.observable(readonly);

        this.gitUrl = ko.observable("");
        this.gitHash = ko.observable("");
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

        // go through all ports on this node, and make sure their nodeKeys are all updated
        for (const inputPort of this.inputPorts()){
            inputPort.setNodeKey(key);
        }
        for (const outputPort of this.outputPorts()){
            outputPort.setNodeKey(key);
        }
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
            var processedCategory = this.category().replace(/\s/g, '_')
            return processedCategory;
        } else {
            var processedName = this.name().replace(/\s/g, '_')
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

    setPosition = (x: number, y: number) : void => {
        this.x = x;
        this.y = y;
    }

    changePosition = (dx : number, dy : number) : void => {
        this.x += dx;
        this.y += dy;
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
        return this.streaming();
    }

    setStreaming = (value : boolean) : void => {
        this.streaming(value);
    }

    toggleStreaming = () : void => {
        this.streaming(!this.streaming());
    }

    isPrecious = () : boolean => {
        return this.precious();
    }

    setPrecious = (value : boolean) : void => {
        this.precious(value);
    }

    togglePrecious = () : void => {
        this.precious(!this.precious());
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

    isReadonly = (): boolean => {
        return this.readonly();
    }

    isLocked : ko.PureComputed<boolean> = ko.pureComputed(() => {
        const allowComponentEditing : boolean = Eagle.findSettingValue(Utils.ALLOW_COMPONENT_EDITING);
        return this.readonly() && !allowComponentEditing;
    }, this);

    setReadonly = (readonly: boolean) : void => {
        this.readonly(readonly);
    }

    getInputPorts = () : Port[] => {
        return this.inputPorts();
    }

    getOutputPorts = () : Port[] => {
        return this.outputPorts();
    }

    getInputApplicationInputPorts = () : Port[] => {
        if (this.inputApplication() === null){
            return [];
        }

        return this.inputApplication().inputPorts();
    }

    getInputApplicationOutputPorts = () : Port[] => {
        if (this.inputApplication() === null){
            return [];
        }

        return this.inputApplication().outputPorts();
    }

    getOutputApplicationInputPorts = () : Port[] => {
        if (this.outputApplication() === null){
            return [];
        }

        return this.outputApplication().inputPorts();
    }

    getOutputApplicationOutputPorts = () : Port[] => {
        if (this.outputApplication() === null){
            return [];
        }

        return this.outputApplication().outputPorts();
    }

    getExitApplicationInputPorts = () : Port[] => {
        if (this.exitApplication() === null){
            return [];
        }

        return this.exitApplication().inputPorts();
    }

    getExitApplicationOutputPorts = () : Port[] => {
        if (this.exitApplication() === null){
            return [];
        }

        return this.exitApplication().outputPorts();
    }

    hasLocalPortWithId = (id : string) : boolean => {
        // check output ports of input application, if one exists
        if (this.hasInputApplication()){
            for (const outputPort of this.inputApplication().outputPorts()){
                if (outputPort.getId() === id){
                    return true;
                }
            }
        }
        // check input ports of outputApplication, if one exists
        if (this.hasOutputApplication()){
            for (const inputPort of this.outputApplication().inputPorts()){
                if (inputPort.getId() === id){
                    return true;
                }
            }
        }
        // check input ports of exitApplication, if one exists
        if (this.hasExitApplication()){
            for (const inputPort of this.exitApplication().inputPorts()){
                if (inputPort.getId() === id){
                    return true;
                }
            }
        }

        return false;
    }

    getFieldByName = (name : string) : Field | null => {
        for (const field of this.fields()){
            if (field.getName() === name){
                return field;
            }
        }

        return null;
    }

    hasFieldWithName = (name : string) : boolean => {
        for (const field of this.fields()){
            if (field.getName() === name){
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

    getFieldReadonly = (index: number) : boolean => {
        console.assert(index < this.fields().length);

        const field: Field = this.fields()[index];

        // modify using settings and node readonly
        const allowParam : boolean = Eagle.findSettingValue(Utils.ALLOW_READONLY_PARAMETER_EDITING);

        return (field.isReadonly() || this.readonly()) && !allowParam;
    }

    getApplicationParamByName = (name : string) : Field | null => {
        for (const param of this.applicationParams()){
            if (param.getName() === name){
                return param;
            }
        }

        return null;
    }

    hasApplicationParamWithName = (name : string) : boolean => {
        for (const param of this.applicationParams()){
            if (param.getName() === name){
                return true;
            }
        }
        return false;
    }

    getApplicationParams = () : Field[] => {
        return this.applicationParams();
    }

    getNumApplicationParams = () : number => {
        return this.applicationParams().length;
    }

    getApplicationParamReadonly = (index: number) : boolean => {
        console.assert(index < this.applicationParams().length);

        const param: Field = this.applicationParams()[index];

        // modify using settings and node readonly
        const allowParam : boolean = Eagle.findSettingValue(Utils.ALLOW_READONLY_PARAMETER_EDITING);

        return (param.isReadonly() || this.readonly()) && !allowParam;
    }

    getCategory = () : Eagle.Category => {
        return this.category();
    }

    setCategory = (category: Eagle.Category): void => {
        this.category(category);
        this.color(Utils.getColorForNode(category));
    }

    isData = () : boolean => {
        return Eagle.getCategoryData(this.category()).isData;
    }

    isGroup = () : boolean => {
        return Eagle.getCategoryData(this.category()).isGroup;
    }

    isApplication = () : boolean => {
        return Eagle.getCategoryData(this.category()).isApplication;
    }

    isScatter = () : boolean => {
        return this.category() === Eagle.Category.Scatter;
    }

    isGather = () : boolean => {
        return this.category() === Eagle.Category.Gather;
    }

    isMKN = () : boolean => {
        return this.category() === Eagle.Category.MKN;
    }

    isLoop = () : boolean => {
        return this.category() === Eagle.Category.Loop;
    }

    isBranch = () : boolean => {
        return this.category() === Eagle.Category.Branch;
    }

    isService = () : boolean => {
        return this.category() === Eagle.Category.Service;
    }

    isResizable = () : boolean => {
        return Eagle.getCategoryData(this.category()).isResizable;
    }

    canHaveInputs = () : boolean => {
        return Eagle.getCategoryData(this.category()).maxInputs > 0;
    }

    canHaveOutputs = () : boolean => {
        return Eagle.getCategoryData(this.category()).maxOutputs > 0;
    }

    canHaveInputApplication = () : boolean => {
        return Eagle.getCategoryData(this.category()).canHaveInputApplication;
    }

    canHaveOutputApplication = () : boolean => {
        return Eagle.getCategoryData(this.category()).canHaveOutputApplication;
    }

    canHaveExitApplication = () : boolean => {
        return Eagle.getCategoryData(this.category()).canHaveExitApplication;
    }

    canHaveParameters = () : boolean => {
        return Eagle.getCategoryData(this.category()).canHaveParameters;
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
            return "<p><h5>" + this.getName() + "</h5></p><p>" + this.getDescription() +  "</p>";
        } else {
            return "<p><h5>" + this.getCategory() + " : " + this.getName() + "</h5></p><p>" + this.getDescription() +  "</p>";
        }
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

    setExitApplication = (exitApplication : Node) : void => {
        this.exitApplication(exitApplication);

        if (exitApplication !== null){
            exitApplication.setEmbedKey(this.getKey());
            console.assert(this.canHaveExitApplication());
        }
    }

    getExitApplication = () : Node => {
        return this.exitApplication();
    }

    hasExitApplication = () : boolean => {
        return this.exitApplication() !== null;
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
        this.streaming(false);
        this.precious(false);

        this.inputApplication(null);
        this.outputApplication(null);
        this.exitApplication(null);

        this.inputPorts([]);
        this.outputPorts([]);

        this.fields([]);
        this.applicationParams([]);

        this.category(Eagle.Category.Unknown);

        this.subject(null);

        this.expanded(false);
        this.readonly(true);

        this.gitUrl("");
        this.gitHash("");
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

        if (this.getCategory() === Eagle.Category.Service){
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
            this.getExitApplicationInputPorts().length +
            this.getExitApplicationOutputPorts().length +
            2) * 24;

        return Math.max(leftHeight, rightHeight);
    }

    getGitHTML : ko.PureComputed<string> = ko.pureComputed(() => {
        let url = "Unknown";
        let hash = "Unknown";

        if (this.gitUrl() !== ""){
            url = this.gitUrl();
        }
        if (this.gitHash() !== ""){
            hash = this.gitHash();
        }

        return '- Git -</br>Url:&nbsp;' + url + '</br>Hash:&nbsp;' + hash;
    }, this);

    addPort = (port : Port, input : boolean) : void => {
        port.setNodeKey(this.key());

        if (input){
            this.inputPorts.push(port);
        } else {
            this.outputPorts.push(port);
        }
    }

    findPortById = (portId : string) : Port => {
        // check input ports
        for (const inputPort of this.inputPorts()){
            if (inputPort.getId() === portId){
                return inputPort;
            }
        }

        // check output ports
        for (const outputPort of this.outputPorts()){
            if (outputPort.getId() === portId){
                return outputPort;
            }
        }

        return null;
    }

    findPortInApplicationsById = (portId : string) : {key: number, port: Port} => {
        // if node has an inputApplication, check those ports too
        if (this.hasInputApplication()){
            for (const inputPort of this.inputApplication().inputPorts()){
                if (inputPort.getId() === portId){
                    return {key: this.inputApplication().getKey(), port: inputPort};
                }
            }
            for (const outputPort of this.inputApplication().outputPorts()){
                if (outputPort.getId() === portId){
                    return {key: this.inputApplication().getKey(), port: outputPort};
                }
            }
        }

        // if node has an outputApplication, check those ports too
        if (this.hasOutputApplication()){
            for (const inputPort of this.outputApplication().inputPorts()){
                if (inputPort.getId() === portId){
                    return {key: this.outputApplication().getKey(), port: inputPort};
                }
            }
            for (const outputPort of this.outputApplication().outputPorts()){
                if (outputPort.getId() === portId){
                    return {key: this.outputApplication().getKey(), port: outputPort};
                }
            }
        }

        // if node has an exitApplication, check those ports too
        if (this.hasExitApplication()){
            for (const inputPort of this.exitApplication().inputPorts()){
                if (inputPort.getId() === portId){
                    return {key: this.exitApplication().getKey(), port: inputPort};
                }
            }
            for (const outputPort of this.exitApplication().outputPorts()){
                if (outputPort.getId() === portId){
                    return {key: this.exitApplication().getKey(), port: outputPort};
                }
            }
        }

        return {key: null, port: null};
    }

    // TODO: I have a feeling this should not be necessary. Especially the 'inputLocal' and 'outputLocal' stuff
    findPortTypeById = (portId : string) : string => {
        // check input ports
        for (const inputPort of this.inputPorts()){
            if (inputPort.getId() === portId){
                return "input";
            }
        }

        // check output ports
        for (const outputPort of this.outputPorts()){
            if (outputPort.getId() === portId){
                return "output";
            }
        }

        // if node has an inputApplication, check those ports too
        if (this.hasInputApplication()){
            for (const inputPort of this.inputApplication().inputPorts()){
                if (inputPort.getId() === portId){
                    return "input";
                }
            }
            for (const outputPort of this.inputApplication().outputPorts()){
                if (outputPort.getId() === portId){
                    return "inputLocal";
                }
            }
        }

        // if node has an outputApplication, check those ports too
        if (this.hasOutputApplication()){
            for (const inputPort of this.outputApplication().inputPorts()){
                if (inputPort.getId() === portId){
                    return "outputLocal";
                }
            }
            for (const outputPort of this.outputApplication().outputPorts()){
                if (outputPort.getId() === portId){
                    return "output";
                }
            }
        }

        // if node has an exitApplication, check those ports too
        if (this.hasExitApplication()){
            for (const inputPort of this.exitApplication().inputPorts()){
                if (inputPort.getId() === portId){
                    return "outputLocal";
                }
            }
            for (const outputPort of this.exitApplication().outputPorts()){
                if (outputPort.getId() === portId){
                    return "output";
                }
            }
        }

        return "";
    }

    findPortIndexById = (portId : string) : number => {
        // check input ports
        for (let i = 0; i < this.inputPorts().length; i++){
            const port = this.inputPorts()[i];
            if (port.getId() === portId){
                return i;
            }
        }

        // check output ports
        for (let i = 0; i < this.outputPorts().length; i++){
            const port = this.outputPorts()[i];
            if (port.getId() === portId){
                return i;
            }
        }

        return -1;
    }

    findPortByName = (name : string, input : boolean, local : boolean) : Port => {
        console.assert(!local);

        if (input){
            // check input ports
            for (const inputPort of this.inputPorts()){
                if (inputPort.getName() === name){
                    return inputPort;
                }
            }
        } else {
            // check output ports
            for (const outputPort of this.outputPorts()){
                if (outputPort.getName() === name){
                    return outputPort;
                }
            }
        }
        return null;
    }

    hasPortWithName = (name : string, input : boolean, local : boolean) : boolean => {
        return this.findPortByName(name, input, local) !== null;
    }

    // WARN: dangerous! removes a port without considering if the port is in use by an edge
    removePortByIndex = (index : number, input : boolean) : void => {
        if (input){
            this.inputPorts.splice(index, 1);
        } else {
            this.outputPorts.splice(index, 1);
        }
    }

    addField = (field : Field) : void => {
        this.fields.push(field);
    }

    addFieldAtPosition = (field : Field, i : number) : void => {
        this.fields.splice(i, 0, field);
    }

    removeFieldByIndex = (fieldType: Eagle.FieldType, index : number) : void => {
        if (fieldType === Eagle.FieldType.Field){
            this.fields.splice(index, 1);
        } else {
            this.applicationParams.splice(index, 1);
        }
    }

    removeAllFields = () : void => {
        this.fields([]);
    }

    removeAllNonArgFields = () : Field[] => {
        const result : Field[] = [];

        for (let i = this.fields().length - 1 ; i >= 0 ; i--){
            const field : Field = this.fields()[i];
            if (!Utils.isParameterArgument(field.getName())){
                result.push(this.fields.splice(i, 1)[0]);
            }
        }

        return result;
    }

    addApplicationParam = (param : Field) : void => {
        this.applicationParams.push(param);
    }

    removeApplicationParamByIndex = (index : number) : void => {
        this.applicationParams.splice(index, 1);
    }

    clone = () : Node => {
        const result : Node = new Node(this.key(), this.name(), this.description(), this.category(), this.readonly());

        result._id = this._id;
        result.x = this.x;
        result.y = this.y;
        result.width = this.width;
        result.height = this.height;
        result.color(this.color());
        result.drawOrderHint(this.drawOrderHint());

        result.parentKey(this.parentKey());
        result.embedKey(this.embedKey());

        result.collapsed(this.collapsed());
        result.expanded(this.expanded());
        result.streaming(this.streaming());
        result.precious(this.precious());

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
        if (this.exitApplication() === null){
            result.exitApplication(null);
        } else {
            result.exitApplication(this.exitApplication().clone());
        }

        result.subject = this.subject;

        // clone ports
        for (const inputPort of this.inputPorts()){
            result.addPort(inputPort.clone(), true);
        }
        for (const outputPort of this.outputPorts()){
            result.addPort(outputPort.clone(), false);
        }

        // clone fields
        for (const field of this.fields()){
            result.fields.push(field.clone());
        }

        // clone applicationParams
        for (const param of this.applicationParams()){
            result.applicationParams.push(param.clone());
        }

        result.readonly(this.readonly());

        result.gitUrl(this.gitUrl());
        result.gitHash(this.gitHash());

        return result;
    }

    // find the right icon for this node
    getIcon = () : string => {
        return Eagle.getCategoryData(this.category()).icon;
    }

    //get icon color
    getGraphIconAttr = () : string => {
        var attr = "font-size: 45px; color:" + Eagle.getCategoryData(this.category()).color
        return attr
    }

    getInputMultiplicity = () : number => {
        if (this.isMKN()){
            const m : Field = this.getFieldByName("m");

            if (m === null){
                console.warn("Unable to determine input multiplicity of MKN, no 'm' field. Using default value (1).");
                return 1;
            }

            return parseInt(m.getValue(), 10);
        }

        if (this.isGather()){
            const numInputs : Field = this.getFieldByName("num_of_inputs");

            if (numInputs === null){
                console.warn("Unable to determine input multiplicity of Gather, no 'num_of_inputs' field. Using default value (1).");
                return 1;
            }

            return parseInt(numInputs.getValue(), 10);
        }

        return 1;
    }

    getOutputMultiplicity = () : number => {
        if (this.isMKN()){
            const n : Field = this.getFieldByName("n");

            if (n === null){
                console.warn("Unable to determine output multiplicity of MKN, no 'n' field. Using default value (1).");
                return 1;
            }

            return parseInt(n.getValue(), 10);
        }

        if (this.isScatter()){
            const numCopies : Field = this.getFieldByName("num_of_copies");

            if (numCopies === null){
                console.warn("Unable to determine output multiplicity of Scatter, no 'num_of_copies' field. Using default value (1).");
                return 1;
            }

            return parseInt(numCopies.getValue(), 10);
        }

        return 1;
    }

    getLocalMultiplicity = () : number => {
        if (this.isMKN()){
            const k : Field = this.getFieldByName("k");

            if (k === null){
                console.warn("Unable to determine local multiplicity of MKN, no 'k' field. Using default value (1).");
                return 1;
            }

            return parseInt(k.getValue(), 10);
        }

        if (this.isScatter()){
            const numCopies = this.getFieldByName("num_of_copies");

            if (numCopies === null){
                console.warn("Unable to determine local multiplicity of Scatter, no 'num_of_copies' field. Using default value (1).");
                return 1;
            }

            return parseInt(numCopies.getValue(), 10);
        }

        // TODO: check this is correct!
        if (this.isGather()){
            return 1;
        }

        if (this.isLoop()){
            const numCopies = this.getFieldByName("num_of_iter");

            if (numCopies === null){
                console.warn("Unable to determine local multiplicity of Loop, no 'num_of_iter' field. Using default value (1).");
                return 1;
            }

            return parseInt(numCopies.getValue(), 10);
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
            this.addField(new Field("", "", "", "", "", false, Eagle.DataType.Unknown, false));
        }

        this.fields()[0].setValue(e.value);
    }

    // TODO: this seems similar to findPortTypeById(), maybe we can just use this one!
    findPortIsInputById = (portId: string) : boolean => {
        // find the port within the node
        for (const inputPort of this.inputPorts()){
            if (inputPort.getId() === portId){
                return true;
            }
        }

        for (const outputPort of this.outputPorts()){
            if (outputPort.getId() === portId){
                return false;
            }
        }

        // check input application ports
        if (this.hasInputApplication()){
            for (const inputPort of this.inputApplication().inputPorts()){
                if (inputPort.getId() === portId){
                    return true;
                }
            }

            for (const outputPort of this.inputApplication().outputPorts()){
                if (outputPort.getId() === portId){
                    return false;
                }
            }
        }

        // check output application ports
        if (this.hasOutputApplication()){
            for (const inputPort of this.outputApplication().inputPorts()){
                if (inputPort.getId() === portId){
                    return true;
                }
            }

            for (const outputPort of this.outputApplication().outputPorts()){
                if (outputPort.getId() === portId){
                    return false;
                }
            }
        }

        // TODO: check exit application ports
        if (this.hasExitApplication()){
            for (const inputPort of this.exitApplication().inputPorts()){
                if (inputPort.getId() === portId){
                    return true;
                }
            }

            for (const outputPort of this.exitApplication().outputPorts()){
                if (outputPort.getId() === portId){
                    return false;
                }
            }
        }

        return null;
    }

    toggleExpanded = () : void => {
        this.expanded(!this.expanded());
    }

    getExpanded = () : boolean => {
        return this.expanded();
    }

    setExpanded = (value : boolean) : void => {
        this.expanded(value);
    }

    static canHaveInputApp = (node : Node) : boolean => {
        return Eagle.getCategoryData(node.getCategory()).canHaveInputApplication;
    }

    static canHaveOutputApp = (node : Node) : boolean => {
        return Eagle.getCategoryData(node.getCategory()).canHaveOutputApplication;
    }

    static canHaveExitApp = (node : Node) : boolean => {
        return Eagle.getCategoryData(node.getCategory()).canHaveExitApplication;
    }

    static fromOJSJson = (nodeData : any, errorsWarnings: Eagle.ErrorsWarnings, generateKeyFunc: () => number) : Node => {
        let name = "";
        if (typeof nodeData.text !== 'undefined'){
            name = nodeData.text;
        } else {
            errorsWarnings.errors.push("Node " + nodeData.key + " has undefined text " + nodeData + "!");
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

        let readonly = true;
        if (typeof nodeData.readonly !== 'undefined'){
            readonly = nodeData.readonly;
        }

        // translate categories if required
        let category: Eagle.Category = GraphUpdater.translateOldCategory(nodeData.category);

        // if category is not known, then add error
        if (!Utils.isKnownCategory(category)){
            errorsWarnings.errors.push("Node with key " + nodeData.key + " has unknown category: " + category);
            category = Eagle.Category.Unknown;
        }

        const node : Node = new Node(nodeData.key, name, "", category, readonly);

        // set position
        node.setPosition(x, y);

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
        if (!Eagle.getCategoryData(node.getCategory()).isResizable){
            node.width = Node.DEFAULT_WIDTH;
            node.height = Node.DEFAULT_HEIGHT;
        }

        // flipPorts
        if (typeof nodeData.flipPorts !== 'undefined'){
            node.flipPorts(nodeData.flipPorts);
        }

        // expanded
        if (typeof nodeData.expanded !== 'undefined'){
            node.expanded(nodeData.expanded);
        }

        // NOTE: use color from Eagle CategoryData instead of from the input file

        // drawOrderHint
        if (typeof nodeData.drawOrderHint !== 'undefined'){
            node.drawOrderHint(nodeData.drawOrderHint);
        }

        // keys for embedded applications
        let inputApplicationKey: number = null;
        let outputApplicationKey: number = null;
        let exitApplicationKey: number = null;
        if (typeof nodeData.inputApplicationKey !== 'undefined'){
            inputApplicationKey = nodeData.inputApplicationKey;
        }
        if (typeof nodeData.outputApplicationKey !== 'undefined'){
            outputApplicationKey = nodeData.outputApplicationKey;
        }
        if (typeof nodeData.exitApplicationKey !== 'undefined'){
            exitApplicationKey = nodeData.exitApplicationKey;
        }

        // debug
        //console.log("node", nodeData.text);
        //console.log("inputAppName", nodeData.inputAppName, "inputApplicationName", nodeData.inputApplicationName, "inpuApplication", nodeData.inputApplication, "inputApplicationType", nodeData.inputApplicationType);
        //console.log("outputAppName", nodeData.outputAppName, "outputApplicationName", nodeData.outputApplicationName, "outputApplication", nodeData.outputApplication, "outputApplicationType", nodeData.outputApplicationType);
        //console.log("exitAppName", nodeData.exitAppName, "exitApplicationName", nodeData.exitApplicationName, "exitApplication", nodeData.exitApplication, "exitApplicationType", nodeData.exitApplicationType);

        // these next six if statements are covering old versions of nodes, that
        // specified input and output applications using name strings rather than nested nodes.
        // NOTE: the key for the new nodes are not set correctly, they will have to be overwritten later
        if (nodeData.inputAppName !== undefined && nodeData.inputAppName !== ""){
            if (!Eagle.getCategoryData(category).canHaveInputApplication){
                errorsWarnings.errors.push("Attempt to add inputApplication to unsuitable node: " + category);
            } else {
                // check applicationType is an application
                if (Eagle.getCategoryData(nodeData.inputApplicationType).isApplication){
                    node.inputApplication(Node.createEmbeddedApplicationNode(inputApplicationKey, nodeData.inputAppName, nodeData.inputApplicationType, node.getKey(), readonly));
                } else {
                    errorsWarnings.errors.push("Attempt to add inputApplication of unsuitable type: " + nodeData.inputApplicationType + ", to node.");
                }
            }
        }

        if (nodeData.inputApplicationName !== undefined && nodeData.inputApplicationType !== Eagle.Category.None){
            if (!Eagle.getCategoryData(category).canHaveInputApplication){
                errorsWarnings.errors.push("Attempt to add inputApplication to unsuitable node: " + category);
            } else {
                // check applicationType is an application
                if (Eagle.getCategoryData(nodeData.inputApplicationType).isApplication){
                    node.inputApplication(Node.createEmbeddedApplicationNode(inputApplicationKey, nodeData.inputApplicationName, nodeData.inputApplicationType, node.getKey(), readonly));
                } else {
                    errorsWarnings.errors.push("Attempt to add inputApplication of unsuitable type: " + nodeData.inputApplicationType + ", to node.");
                }
            }
        }

        if (nodeData.outputAppName !== undefined && nodeData.outputAppName !== ""){
            if (!Eagle.getCategoryData(category).canHaveOutputApplication){
                errorsWarnings.errors.push("Attempt to add outputApplication to unsuitable node: " + category);
            } else {
                // check applicationType is an application
                if (Eagle.getCategoryData(nodeData.outputApplicationType).isApplication){
                    node.outputApplication(Node.createEmbeddedApplicationNode(outputApplicationKey, nodeData.outputAppName, nodeData.outputApplicationType, node.getKey(), readonly));
                } else {
                    errorsWarnings.errors.push("Attempt to add outputApplication of unsuitable type: " + nodeData.outputApplicationType + ", to node.");
                }
            }
        }

        if (nodeData.outputApplicationName !== undefined && nodeData.outputApplicationType !== Eagle.Category.None){
            if (!Eagle.getCategoryData(category).canHaveOutputApplication){
                errorsWarnings.errors.push("Attempt to add outputApplication to unsuitable node: " + category);
            } else {
                if (Eagle.getCategoryData(nodeData.outputApplicationType).isApplication){
                    node.outputApplication(Node.createEmbeddedApplicationNode(outputApplicationKey, nodeData.outputApplicationName, nodeData.outputApplicationType, node.getKey(), readonly));
                } else {
                    errorsWarnings.errors.push("Attempt to add outputApplication of unsuitable type: " + nodeData.outputApplicationType + ", to node.");
                }
            }
        }

        if (nodeData.exitAppName !== undefined && nodeData.exitAppName !== ""){
            if (!Eagle.getCategoryData(category).canHaveExitApplication){
                errorsWarnings.errors.push("Attempt to add exitApplication to unsuitable node: " + category);
            } else {
                if (Eagle.getCategoryData(nodeData.exitApplicationType).isApplication){
                    node.exitApplication(Node.createEmbeddedApplicationNode(exitApplicationKey, nodeData.exitAppName, nodeData.exitApplicationType, node.getKey(), readonly));
                } else {
                    errorsWarnings.errors.push("Attempt to add exitApplication of unsuitable type: " + nodeData.exitApplicationType + ", to node.");
                }
            }
        }

        if (nodeData.exitApplicationName !== undefined && nodeData.exitApplicationType !== Eagle.Category.None){
            if (!Eagle.getCategoryData(category).canHaveExitApplication){
                errorsWarnings.errors.push("Attempt to add exitApplication to unsuitable node: " + category);
            } else {
                if (Eagle.getCategoryData(nodeData.exitApplicationType).isApplication){
                    node.exitApplication(Node.createEmbeddedApplicationNode(exitApplicationKey, nodeData.exitApplicationName, nodeData.exitApplicationType, node.getKey(), readonly));
                } else {
                    errorsWarnings.errors.push("Attempt to add exitApplication of unsuitable type: " + nodeData.exitApplicationType + ", to node.");
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
            errorsWarnings.errors.push("Only found old application type, not new input application type and output application type: " + category);

            if (!Eagle.getCategoryData(category).canHaveInputApplication){
                errorsWarnings.errors.push("Attempt to add inputApplication to unsuitable node: " + category);
            } else {
                if (Eagle.getCategoryData(category).isApplication){
                    node.inputApplication(Node.createEmbeddedApplicationNode(null, nodeData.application, category, node.getKey(), readonly));
                } else {
                    errorsWarnings.errors.push("Attempt to add inputApplication of unsuitable type: " + category + ", to node.");
                }
            }
        }

        // read the 'real' input and output apps, correctly specified as nested nodes
        if (typeof nodeData.inputApplication !== 'undefined' && nodeData.inputApplication !== null){
            if (!Eagle.getCategoryData(category).canHaveInputApplication){
                errorsWarnings.errors.push("Attempt to add inputApplication to unsuitable node: " + category);
            } else {
                node.inputApplication(Node.fromOJSJson(nodeData.inputApplication, errorsWarnings, generateKeyFunc));
                node.inputApplication().setEmbedKey(node.getKey());
            }
        }
        if (typeof nodeData.outputApplication !== 'undefined' && nodeData.outputApplication !== null){
            if (!Eagle.getCategoryData(category).canHaveOutputApplication){
                errorsWarnings.errors.push("Attempt to add outputApplication to unsuitable node: " + category);
            } else {
                node.outputApplication(Node.fromOJSJson(nodeData.outputApplication, errorsWarnings, generateKeyFunc));
                node.outputApplication().setEmbedKey(node.getKey());
            }
        }
        if (typeof nodeData.exitApplication !== 'undefined' && nodeData.exitApplication !== null){
            if (!Eagle.getCategoryData(category).canHaveExitApplication){
                errorsWarnings.errors.push("Attempt to add inputApplication to unsuitable node: " + category);
            } else {
                node.exitApplication(Node.fromOJSJson(nodeData.exitApplication, errorsWarnings, generateKeyFunc));
                node.exitApplication().setEmbedKey(node.getKey());
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

        // streaming
        if (typeof nodeData.streaming !== 'undefined'){
            node.streaming(nodeData.streaming);
        } else {
            node.streaming(false);
        }

        // precious
        if (typeof nodeData.precious !== 'undefined'){
            node.precious(nodeData.precious);
        } else {
            node.precious(false);
        }

        // subject (for comment nodes)
        if (typeof nodeData.subject !== 'undefined'){
            node.subject(nodeData.subject);
        } else {
            node.subject(null);
        }

        // add input ports
        if (typeof nodeData.inputPorts !== 'undefined'){
            for (const inputPort of nodeData.inputPorts){
                const port = Port.fromOJSJson(inputPort);
                if (node.canHaveInputs()){
                    node.addPort(port, true);
                } else {
                    Node.addPortToEmbeddedApplication(node, port, true, errorsWarnings, nodeData.readonly, generateKeyFunc);
                }
            }
        }

        // add output ports
        if (typeof nodeData.outputPorts !== 'undefined'){
            for (const outputPort of nodeData.outputPorts){
                const port = Port.fromOJSJson(outputPort);

                if (node.canHaveOutputs()){
                    node.addPort(port, false);
                } else {
                    Node.addPortToEmbeddedApplication(node, port, false, errorsWarnings, nodeData.readonly, generateKeyFunc);
                }
            }
        }

        // add input local ports
        if (typeof nodeData.inputLocalPorts !== 'undefined'){
            for (const inputLocalPort of nodeData.inputLocalPorts){
                if (node.hasInputApplication()){
                    const port = Port.fromOJSJson(inputLocalPort);
                    node.inputApplication().addPort(port, false);
                } else {
                    errorsWarnings.errors.push("Can't add inputLocal port " + inputLocalPort.IdText + " to node " + node.getName() + ". No input application.");
                }
            }
        }

        // add output local ports
        if (typeof nodeData.outputLocalPorts !== 'undefined'){
            for (const outputLocalPort of nodeData.outputLocalPorts){
                const port = Port.fromOJSJson(outputLocalPort);
                if (node.hasOutputApplication()){
                    node.outputApplication().addPort(port, true);
                }

                if (node.hasExitApplication()){
                    node.exitApplication().addPort(port, true);
                }

                if (!node.hasOutputApplication() && !node.hasExitApplication()){
                    errorsWarnings.errors.push("Can't add outputLocal port " + outputLocalPort.IdText + " to node " + node.getName() + ". No output or exit application.");
                }
            }
        }

        // add fields
        if (typeof nodeData.fields !== 'undefined'){
            for (const fieldData of nodeData.fields){
                node.addField(Field.fromOJSJson(fieldData));
            }
        }

        // add application params
        if (typeof nodeData.applicationParams !== 'undefined'){
            for (const paramData of nodeData.applicationParams){
                node.addApplicationParam(Field.fromOJSJson(paramData));
            }
        }

        // add inputAppFields
        if (typeof nodeData.inputAppFields !== 'undefined'){
            for (const fieldData of nodeData.inputAppFields){
                if (node.hasInputApplication()){
                    node.inputApplication().addField(Field.fromOJSJson(fieldData));
                } else {
                    errorsWarnings.errors.push("Can't add input app field " + fieldData.text + " to node " + node.getName() + ". No input application.");
                }
            }
        }

        // add outputAppFields
        if (typeof nodeData.outputAppFields !== 'undefined'){
            for (const fieldData of nodeData.outputAppFields){
                if (node.hasOutputApplication()){
                    node.outputApplication().addField(Field.fromOJSJson(fieldData));
                } else {
                    errorsWarnings.errors.push("Can't add output app field " + fieldData.text + " to node " + node.getName() + ". No output application.");
                }
            }
        }

        // add exitAppFields
        if (typeof nodeData.exitAppFields !== 'undefined'){
            for (const fieldData of nodeData.exitAppFields){
                if (node.hasExitApplication()){
                    node.exitApplication().addField(Field.fromOJSJson(fieldData));
                } else {
                    errorsWarnings.errors.push("Can't add exit app field " + fieldData.text + " to node " + node.getName() + ". No exit application.");
                }
            }
        }

        // add git url and hash
        if (typeof nodeData.git_url !== 'undefined'){
            node.gitUrl(nodeData.git_url);
        }
        if (typeof nodeData.sha !== 'undefined'){
            node.gitHash(nodeData.sha);
        }

        return node;
    }

    private static copyPorts(src: Port[], dest: {}[]):void{
        for (const port of src){
            dest.push(Port.toOJSJson(port));
        }
    }

    private static addPortToEmbeddedApplication(node: Node, port: Port, input: boolean, errorsWarnings: Eagle.ErrorsWarnings, readonly: boolean, generateKeyFunc: () => number){
        // check that the node already has an appropriate embedded application, otherwise create it
        if (input){
            if (!node.hasInputApplication()){
                if (Eagle.findSettingValue(Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                    node.inputApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getName(), Eagle.Category.UnknownApplication, node.getKey(), readonly));
                    errorsWarnings.errors.push("Created new embedded input application (" + node.inputApplication().getName() + ") for node (" + node.getName() + ", " + node.getKey() + "). Application category is " + node.inputApplication().getCategory() + " and may require user intervention.");
                } else {
                    errorsWarnings.errors.push("Cannot add input port to construct that doesn't support input ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name", port.getName() );
                    return;
                }
            }
            node.inputApplication().addPort(port, true);
            port.setNodeKey(node.inputApplication().getKey());
            errorsWarnings.warnings.push("Moved input port (" + port.getName() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + ", " + node.getKey() + ") to an embedded input application (" + node.inputApplication().getName() + ", " + node.inputApplication().getKey() + ")");
        } else {
            // determine whether we should check (and possibly add) an output or exit application, depending on the type of this node
            if (node.canHaveOutputApplication() && !node.canHaveExitApplication()){
                if (!node.hasOutputApplication()){
                    if (Eagle.findSettingValue(Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                        node.outputApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getName(), Eagle.Category.UnknownApplication, node.getKey(), readonly));
                        errorsWarnings.errors.push("Created new embedded output application (" + node.outputApplication().getName() + ") for node (" + node.getName() + ", " + node.getKey() + "). Application category is " + node.outputApplication().getCategory() + " and may require user intervention.");
                    } else {
                        errorsWarnings.errors.push("Cannot add output port to construct that doesn't support output ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name", port.getName() );
                        return;
                    }
                }
                node.outputApplication().addPort(port, false);
                port.setNodeKey(node.outputApplication().getKey());
                errorsWarnings.warnings.push("Moved output port (" + port.getName() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + ", " + node.getKey() + ") to an embedded output application (" + node.outputApplication().getName() + ", " + node.outputApplication().getKey() + ")");
            }
            if (!node.canHaveOutputApplication() && node.canHaveExitApplication()){
                if (!node.hasExitApplication()){
                    if (Eagle.findSettingValue(Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                        node.exitApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getName(), Eagle.Category.UnknownApplication, node.getKey(), readonly));
                    } else {
                        errorsWarnings.errors.push("Cannot add output port to construct that doesn't support output ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name", port.getName() );
                        return;
                    }
                }
                node.exitApplication().addPort(port, false);
                port.setNodeKey(node.exitApplication().getKey());
                errorsWarnings.warnings.push("Moved output port (" + port.getName() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + "," + node.getKey() + ") to an embedded exit application (" + node.exitApplication().getName() + ", " + node.exitApplication().getKey() + ")");
            }

            if (!node.canHaveOutputApplication() && !node.canHaveExitApplication()){
                // if possible, add port to output side of input application
                if (node.canHaveInputApplication()){
                    if (!node.hasInputApplication()){
                        if (Eagle.findSettingValue(Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                            node.inputApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getName(), Eagle.Category.UnknownApplication, node.getKey(), readonly));
                        } else {
                            errorsWarnings.errors.push("Cannot add input port to construct that doesn't support input ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name", port.getName() );
                            return;
                        }
                    }
                    node.inputApplication().addPort(port, false);
                    port.setNodeKey(node.inputApplication().getKey());
                    errorsWarnings.warnings.push("Moved output port (" + port.getName() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + "," + node.getKey() + ") to output of the embedded input application");
                } else {
                    errorsWarnings.errors.push("Can't add port to embedded application. Node can't have output OR exit application.");
                }
            }
        }
    }

    static toOJSJson = (node : Node) : object => {
        const result : any = {};
        const useNewCategories : boolean = Eagle.findSettingValue(Utils.TRANSLATE_WITH_NEW_CATEGORIES);

        result.category = useNewCategories ? GraphUpdater.translateNewCategory(node.category()) : node.category();
        result.isData = node.isData();
        result.isGroup = node.isGroup();
        result.canHaveInputs = node.canHaveInputs();
        result.canHaveOutputs = node.canHaveOutputs();
        result.color = node.color();
        result.drawOrderHint = node.drawOrderHint();

        result.key = node.key();
        result.text = node.name();
        result.description = node.description();
        result.x = node.x;
        result.y = node.y;
        result.width = node.width;
        result.height = node.height;
        result.collapsed = node.collapsed();
        result.flipPorts = node.flipPorts();
        result.streaming = node.streaming();
        result.precious = node.precious();
        result.subject = node.subject();
        result.expanded = node.expanded();
        result.readonly = node.readonly();
        result.git_url = node.gitUrl();
        result.sha = node.gitHash();

        if (node.parentKey() !== null){
            result.group = node.parentKey();
        }

        if (node.embedKey() !== null){
            result.embedKey = node.embedKey();
        }

        // add input ports
        result.inputPorts = [];
        if (node.hasInputApplication()){
            Node.copyPorts(node.inputApplication().inputPorts(), result.inputPorts);
        } else {
            Node.copyPorts(node.inputPorts(), result.inputPorts);
        }

        // add output ports
        result.outputPorts = [];
        if (node.hasOutputApplication()){
            // add outputApp output ports here
            Node.copyPorts(node.outputApplication().outputPorts(), result.outputPorts);
        }
        // add exitApp output ports here
        if (node.hasExitApplication()){
            Node.copyPorts(node.exitApplication().outputPorts(), result.outputPorts);
        }
        if (!node.hasOutputApplication() && !node.hasExitApplication()){
            Node.copyPorts(node.outputPorts(), result.outputPorts);
        }

        // add input ports from the inputApplication
        // ! should be inputApp output ports - i think !
        result.inputLocalPorts = [];
        if (node.hasInputApplication()){
            for (const outputPort of node.inputApplication().outputPorts()){
                result.inputLocalPorts.push(Port.toOJSJson(outputPort));
            }
        }

        // add input ports from the outputApplication
        // ! should be outputApp input ports - i think !
        // ! AND       exitApp input ports - i think !
        result.outputLocalPorts = [];
        if (node.hasOutputApplication()){
            for (const inputPort of node.outputApplication().inputPorts()){
                result.outputLocalPorts.push(Port.toOJSJson(inputPort));
            }
        }
        if (node.hasExitApplication()){
            for (const inputPort of node.exitApplication().inputPorts()){
                result.outputLocalPorts.push(Port.toOJSJson(inputPort));
            }
        }

        // add fields
        result.fields = [];
        for (const field of node.fields()){
            result.fields.push(Field.toOJSJson(field));
        }

        // add applicationParams
        result.applicationParams = [];
        for (const param of node.applicationParams()){
            result.applicationParams.push(Field.toOJSJson(param));
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

        // add fields from exitApplication
        result.exitAppFields = [];
        if (node.hasExitApplication()){
            for (const field of node.exitApplication().fields()){
                result.exitAppFields.push(Field.toOJSJson(field));
            }
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationName = node.inputApplication().name();
            result.inputApplicationType = node.inputApplication().category();
            result.inputApplicationKey  = node.inputApplication().key();
        } else {
            result.inputApplicationName = "";
            result.inputApplicationType = Eagle.Category.None;
            result.inputApplicationKey  = null;
        }
        if (node.hasOutputApplication()){
            result.outputApplicationName = node.outputApplication().name();
            result.outputApplicationType = node.outputApplication().category();
            result.outputApplicationKey  = node.outputApplication().key();
        } else {
            result.outputApplicationName = "";
            result.outputApplicationType = Eagle.Category.None;
            result.outputApplicationKey  = null;
        }
        if (node.hasExitApplication()){
            result.exitApplicationName = node.exitApplication().name();
            result.exitApplicationType = node.exitApplication().category();
            result.exitApplicationKey  = node.exitApplication().key();
        } else {
            result.exitApplicationName = "";
            result.exitApplicationType = Eagle.Category.None;
            result.exitApplicationKey  = null;
        }

        return result;
    }

    static toAppRefJson = (node : Node) : object => {
        const result : any = {};
        const useNewCategories : boolean = Eagle.findSettingValue(Utils.TRANSLATE_WITH_NEW_CATEGORIES);

        result.category = useNewCategories ? GraphUpdater.translateNewCategory(node.category()) : node.category();
        result.isData = node.isData();
        result.isGroup = node.isGroup();

        if (node.parentKey() !== null){
            result.group = node.parentKey();
        }

        result.canHaveInputs = node.canHaveInputs();
        result.canHaveOutputs = node.canHaveOutputs();
        result.color = node.color();
        result.drawOrderHint = node.drawOrderHint();

        result.key = node.key();
        result.text = node.name();
        result.description = node.description();
        result.x = node.x;
        result.y = node.y;
        result.width = node.width;
        result.height = node.height;
        result.collapsed = node.collapsed();
        result.flipPorts = node.flipPorts();
        result.streaming = node.streaming();
        result.precious = node.precious();
        result.subject = node.subject();
        result.expanded = node.expanded();
        result.readonly = node.readonly();
        result.git_url = node.gitUrl();
        result.sha = node.gitHash();

        result.parentKey = node.parentKey();
        result.embedKey = node.embedKey();

        // add input ports
        result.inputPorts = [];
        Node.copyPorts(node.inputPorts(), result.inputPorts);

        // add output ports
        result.outputPorts = [];
        Node.copyPorts(node.outputPorts(), result.outputPorts);

        // add fields
        result.fields = [];
        for (const field of node.fields()){
            result.fields.push(Field.toOJSJson(field));
        }

        // add applicationParams
        result.applicationParams = [];
        for (const param of node.applicationParams()){
            result.applicationParams.push(Field.toOJSJson(param));
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationRef = "not set";
        }
        if (node.hasOutputApplication()){
            result.outputApplicationRef = "not set";
        }
        if (node.hasExitApplication()){
            result.exitApplicationRef = "not set";
        }

        return result;
    }

    static fromAppRefJson = (nodeData : any, errors: Eagle.ErrorsWarnings) : Node => {
        const node = new Node(nodeData.key, nodeData.text, nodeData.description, nodeData.category, nodeData.readonly);

        node.color(nodeData.color);
        node.drawOrderHint(nodeData.drawOrderHint);
        node.x = nodeData.x;
        node.y = nodeData.y;
        node.width = nodeData.width;
        node.height = nodeData.height;
        node.collapsed(nodeData.collapsed);
        node.flipPorts(nodeData.flipPorts);
        node.streaming(nodeData.streaming);
        node.precious(nodeData.precious);
        node.subject(nodeData.subject);
        node.expanded(nodeData.expanded);
        node.readonly(nodeData.readonly);
        node.gitUrl(nodeData.git_url);
        node.gitHash(nodeData.sha);
        node.parentKey(nodeData.parentKey);
        node.embedKey(nodeData.embedKey);

        node.inputPorts([]);
        for (const inputPort of nodeData.inputPorts){
            node.addPort(Port.fromOJSJson(inputPort), true);
        }

        node.outputPorts([]);
        for (const outputPort of nodeData.outputPorts){
            node.addPort(Port.fromOJSJson(outputPort), false);
        }

        node.fields([]);
        for (const field of nodeData.fields){
            node.addField(Field.fromOJSJson(field));
        }

        node.applicationParams([]);
        for (const param of nodeData.applicationParams){
            node.addApplicationParam(Field.fromOJSJson(param));
        }

        return node;
    }

    // display/visualisation data
    static toV3NodeJson = (node : Node, index : number) : object => {
        const result : any = {};

        result.componentKey = index.toString();

        result.color = node.color();
        result.drawOrderHint = node.drawOrderHint();

        result.x = node.x;
        result.y = node.y;
        result.width = node.width;
        result.height = node.height;
        result.collapsed = node.collapsed();
        result.flipPorts = node.flipPorts();

        result.expanded = node.expanded();
        result.readonly = node.readonly();
        result.gitUrl = node.gitUrl();
        result.gitHash = node.gitHash();

        return result;
    }

    static fromV3NodeJson = (nodeData : any, key: string, errorsWarnings: Eagle.ErrorsWarnings) : Node => {
        const result = new Node(parseInt(key, 10), "", "", Eagle.Category.Unknown, nodeData.readonly);

        result.color(nodeData.color);
        result.drawOrderHint(nodeData.drawOrderHint);

        result.x = nodeData.x;
        result.y = nodeData.y;
        result.width = nodeData.width;
        result.height = nodeData.height;
        result.collapsed(nodeData.collapsed);
        result.flipPorts(nodeData.flipPorts);

        result.expanded(nodeData.expanded);
        result.readonly(nodeData.readonly);
        result.gitUrl(nodeData.gitUrl);
        result.gitHash(nodeData.gitHash);

        return result;
    }

    // graph data
    // "name" and "description" are considered part of the structure of the graph, it would be hard to add them to the display part (parameters would have to be treated the same way)
    static toV3ComponentJson = (node : Node) : object => {
        const result : any = {};
        const useNewCategories : boolean = Eagle.findSettingValue(Utils.TRANSLATE_WITH_NEW_CATEGORIES);

        result.category = useNewCategories ? GraphUpdater.translateNewCategory(node.category()) : node.category();
        result.isData = node.isData();
        result.isGroup = node.isGroup();

        result.name = node.name();
        result.description = node.description();

        result.streaming = node.streaming();
        result.precious = node.precious();
        result.subject = node.subject(); // TODO: not sure if this should be here or in Node JSON


        result.parentKey = node.parentKey();
        result.embedKey = node.embedKey();

        result.inputApplicationKey = -1;
        result.outputApplicationKey = -1;
        result.exitApplicationKey = -1;

        // add input ports
        result.inputPorts = {};
        for (const inputPort of node.inputPorts()){
            result.inputPorts[inputPort.getId()] = Port.toV3Json(inputPort);
        }

        // add output ports
        result.outputPorts = {};
        for (const outputPort of node.outputPorts()){
            result.outputPorts[outputPort.getId()] = Port.toV3Json(outputPort);
        }

        // add component parameters
        result.componentParameters = {};
        for (let i = 0 ; i < node.fields().length ; i++){
            const field = node.fields()[i];
            result.componentParameters[i] = Field.toV3Json(field);
        }

        // add application parameters
        result.applicationParameters = {};
        for (let i = 0 ; i < node.applicationParams().length ; i++){
            const field = node.applicationParams()[i];
            result.applicationParameters[i] = Field.toV3Json(field);
        }

        return result;
    }

    static fromV3ComponentJson = (nodeData: any, node: Node, errors: Eagle.ErrorsWarnings): void => {
        node.category(nodeData.category);
        node.name(nodeData.name);
        node.description(nodeData.description);

        node.streaming(nodeData.streaming);
        node.precious(nodeData.precious);
        node.subject(nodeData.subject);

        node.parentKey(nodeData.parentKey);
        node.embedKey(nodeData.embedKey);
    }

    static createEmbeddedApplicationNode = (key: number, name : string, category: Eagle.Category, embedKey: number, readonly: boolean) : Node => {
        console.assert(Eagle.getCategoryData(category).isApplication);

        const node = new Node(key, name, "", category, readonly);
        node.setEmbedKey(embedKey);
        return node;
    }
}
