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
    private key : number;
    private name : string;
    private description : string;
    private x : number;
    private y : number;
    private width : number;
    private height : number;
    private color : string;
    private drawOrderHint : number; // a secondary sorting hint when ordering the nodes for drawing
                                    // (primary method is using parent-child relationships)
                                    // a node with greater drawOrderHint is always in front of an element with a lower drawOrderHint

    private parentKey : number | null;
    private embedKey : number | null;
    private collapsed : boolean;
    private streaming : boolean;
    private showPorts : boolean;
    private flipPorts : boolean;

    private inputApplication : ko.Observable<Node>;
    private outputApplication : ko.Observable<Node>;
    private exitApplication : ko.Observable<Node>;

    private inputPorts : ko.ObservableArray<Port>;
    private outputPorts : ko.ObservableArray<Port>;

    private fields : ko.ObservableArray<Field>;

    private category : Eagle.Category;
    private categoryType : Eagle.CategoryType;

    private subject : number | null; // the key of another node that is the subject of this node. used by comment nodes only.

    private expanded : ko.Observable<boolean>; // true, if the node has been expanded in the hierarchy tab in EAGLE
    private selected : ko.Observable<boolean>; // true, if the node has been selected in EAGLE

    private readonly : boolean;

    // TODO: we'll need more variables here, one for every collapsable section of the node inspector
    //       I don't really like this aspect of the branch. perhaps we can store all these in one dictionary
    //       if we could use the section-name strings as the keys to the dictionary, we could also remove lots of switch statements throughout the code

    public static readonly DEFAULT_WIDTH : number = 200;
    public static readonly DEFAULT_HEIGHT : number = 200;
    public static readonly MINIMUM_WIDTH : number = 200;
    public static readonly MINIMUM_HEIGHT : number = 100;
    public static readonly DEFAULT_COLOR : string = "ffffff";

    public static readonly COLLAPSED_WIDTH : number = 128;
    public static readonly COLLAPSED_HEIGHT : number = 128;
    public static readonly DATA_COMPONENT_WIDTH : number = 48;
    public static readonly DATA_COMPONENT_HEIGHT : number = 48;

    public static readonly NO_APP_STRING : string = "<no app>";

    constructor(key : number, name : string, description : string, category : Eagle.Category, categoryType : Eagle.CategoryType, readonly: boolean){
        this.key = key;
        this.name = name;
        this.description = description;
        this.x = 0;
        this.y = 0;
        this.width = Node.DEFAULT_WIDTH;
        this.height = Node.DEFAULT_HEIGHT;
        this.color = Utils.getColorForNode(category);
        this.drawOrderHint = 0;

        this.parentKey = null;
        this.embedKey = null;
        this.collapsed = false;
        this.streaming = false;
        this.showPorts = false;
        this.flipPorts = false;

        this.inputApplication = ko.observable(null);
        this.outputApplication = ko.observable(null);
        this.exitApplication = ko.observable(null);

        this.inputPorts = ko.observableArray([]);
        this.outputPorts = ko.observableArray([]);

        this.fields = ko.observableArray([]);

        this.category = category;
        this.categoryType = categoryType;

        this.subject = null;

        this.expanded = ko.observable(false);
        this.selected = ko.observable(false);

        this.readonly = readonly;
    }

    getKey = () : number => {
        return this.key;
    }

    setKey = (key : number) : void => {
        this.key = key;

        // go through all ports on this node, and make sure their nodeKeys are all updated
        for (let i = 0; i < this.inputPorts().length ; i++){
            this.inputPorts()[i].setNodeKey(key);
        }
        for (let i = 0; i < this.outputPorts().length ; i++){
            this.outputPorts()[i].setNodeKey(key);
        }
    }

    getName = () : string => {
        return this.name;
    }

    setName = (name : string) : void => {
        this.name = name;
    }

    getNameNumLines = (width: number) : number => {
        return Math.ceil(this.name.length / (width / 8));
    }

    getDisplayName = () : string => {
        if (this.name === 'Enter label' || this.name == ''){
            return this.category;
        } else {
            return this.name;
        }
    }

    getDescription = () : string => {
        return this.description;
    }

    setDescription = (description : string) : void => {
        this.description = description;
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
        return this.color;
    }

    setColor = (color: string) : void => {
        this.color = color;
    }

    getDrawOrderHint = () : number => {
        return this.drawOrderHint;
    }

    // move node towards the front
    incrementDrawOrderHint = () : void => {
        this.drawOrderHint += 1;
    }

    // move node towards the back
    decrementDrawOrderHint = () : void => {
        this.drawOrderHint -= 1;
    }

    setDrawOrderHint = (drawOrderHint : number) : void => {
        this.drawOrderHint = drawOrderHint;
    }

    getParentKey = () : number => {
        return this.parentKey;
    }

    setParentKey = (key : number) : void => {
        // check that we are not making this node its own parent
        if (key === this.key){
            console.warn("Setting node as its own parent!");
            return;
        }

        this.parentKey = key;
    }

    getEmbedKey = () : number => {
        return this.embedKey;
    }

    setEmbedKey = (key : number) : void => {
        this.embedKey = key;
    }

    isEmbedded = () : boolean => {
        return this.embedKey !== null;
    }

    isCollapsed = () : boolean => {
        return this.collapsed;
    }

    setCollapsed = (value : boolean) : void => {
        this.collapsed = value;
    }

    isStreaming = () : boolean => {
        return this.streaming;
    }

    setStreaming = (value : boolean) : void => {
        this.streaming = value;
    }

    toggleStreaming = () : void => {
        this.streaming = !this.streaming;
    }

    isShowPorts = () : boolean => {
        return this.showPorts;
    }

    setShowPorts = (value : boolean) : void => {
        this.showPorts = value;
    }

    toggleShowPorts = () : void => {
        this.showPorts = !this.showPorts;
    }

    isFlipPorts = () : boolean => {
        return this.flipPorts;
    }

    setFlipPorts = (value : boolean) : void => {
        this.flipPorts = value;
    }

    toggleFlipPorts = () : void => {
        this.flipPorts = !this.flipPorts;
    }

    isReadonly = (): boolean => {
        return this.readonly;
    }

    isLocked = (): boolean => {
        const allowComponentEditing : boolean = Eagle.findSettingValue(Utils.ALLOW_COMPONENT_EDITING);
        return this.readonly && !allowComponentEditing;
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
            for (let i = 0; i < this.inputApplication().outputPorts().length ; i++){
                if (this.inputApplication().outputPorts()[i].getId() === id){
                    return true;
                }
            }
        }
        // check input ports of outputApplication, if one exists
        if (this.hasOutputApplication()){
            for (let i = 0; i < this.outputApplication().inputPorts().length ; i++){
                if (this.outputApplication().inputPorts()[i].getId() === id){
                    return true;
                }
            }
        }
        // check input ports of exitApplication, if one exists
        if (this.hasExitApplication()){
            for (let i = 0; i < this.exitApplication().inputPorts().length ; i++){
                if (this.exitApplication().inputPorts()[i].getId() === id){
                    return true;
                }
            }
        }

        return false;
    }

    getFieldByName = (name : string) : Field | null => {
        for (let i = 0 ; i < this.fields().length ; i++){
            if (this.fields()[i].getName() === name){
                return this.fields()[i];
            }
        }

        return null;
    }

    getFields = () : Field[] => {
        return this.fields();
    }

    getNumFields = () : number => {
        return this.fields().length;
    }

    getCategory = () : Eagle.Category => {
        return this.category;
    }

    getCategoryType = () : Eagle.CategoryType => {
        return this.categoryType;
    }

    isData = () : boolean => {
        return Eagle.getCategoryData(this.category).isData;
    }

    isGroup = () : boolean => {
        return Eagle.getCategoryData(this.category).isGroup;
    }

    isScatter = () : boolean => {
        return this.category === Eagle.Category.Scatter;
    }

    isGather = () : boolean => {
        return this.category === Eagle.Category.Gather;
    }

    isMKN = () : boolean => {
        return this.category === Eagle.Category.MKN;
    }

    isLoop = () : boolean => {
        return this.category === Eagle.Category.Loop;
    }

    isBranch = () : boolean => {
        return this.category === Eagle.Category.Branch;
    }

    isResizable = () : boolean => {
        return Eagle.getCategoryData(this.category).isResizable;
    }

    canHaveInputs = () : boolean => {
        return Eagle.getCategoryData(this.category).maxInputs > 0;
    }

    canHaveOutputs = () : boolean => {
        return Eagle.getCategoryData(this.category).maxOutputs > 0;
    }

    canHaveInputApplication = () : boolean => {
        return Eagle.getCategoryData(this.category).canHaveInputApplication;
    }

    canHaveOutputApplication = () : boolean => {
        return Eagle.getCategoryData(this.category).canHaveOutputApplication;
    }

    canHaveExitApplication = () : boolean => {
        return Eagle.getCategoryData(this.category).canHaveExitApplication;
    }

    canHaveParameters = () : boolean => {
        return Eagle.getCategoryData(this.category).canHaveParameters;
    }

    getFieldReadonly = (index: number) : boolean => {
        console.assert(index < this.fields().length);

        const field: Field = this.fields()[index];

        // modify using settings and node readonly
        const allowParam : boolean = Eagle.findSettingValue(Utils.ALLOW_READONLY_PARAMETER_EDITING);
        const result = field.isReadonly() && this.readonly && !allowParam;

        //console.log("getFieldReadonly()", index, "field.readonly", field.isReadonly(), "node.readonly", this.readonly, "allowParam", allowParam, "result", result);

        return result;
    }

    getHelpHTML = () : string => {

        // handle error if name is undefined
        if (typeof this.name === 'undefined'){
            return "<p><h5>Undefined</h5></p>";
        }

        // check if name and category are the same (or similar except for capitalisation and whitespace)
        // if so, only use the name, the category is redundant
        if (this.getName().split(" ").join("").toLowerCase() === this.getCategory().toLowerCase()){
            return "<p><h5>" + this.getName() + "</h5></p><p>" + this.getDescription() +  "</p>";
        } else {
            return "<p><h5>" + this.getCategory() + " : " + this.getName() + "</h5></p><p>" + this.getDescription() +  "</p>";
        }
    }

    getSubjectKey = () : number => {
        return this.subject;
    }

    setSubjectKey = (key : number) : void => {
        this.subject = key;
    }

    setSelected = (selected : boolean) : void => {
        this.selected(selected);
    }

    getSelected = () : boolean => {
        return this.selected();
    }

    setInputApplication = (inputApplication : Node) : void => {
        this.inputApplication(inputApplication);

        if (inputApplication !== null){
            inputApplication.setEmbedKey(this.getKey());
            console.assert(inputApplication.getCategoryType() === Eagle.CategoryType.Application);
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
            console.assert(outputApplication.getCategoryType() === Eagle.CategoryType.Application);
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
            console.assert(exitApplication.getCategoryType() === Eagle.CategoryType.Application);
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
        this.key = 0;
        this.name = "";
        this.description = "";
        this.x = 0;
        this.y = 0;
        this.width = Node.DEFAULT_WIDTH;
        this.height = Node.DEFAULT_HEIGHT;
        this.color = Node.DEFAULT_COLOR;
        this.drawOrderHint = 0;

        this.parentKey = null;
        this.embedKey = null;
        this.collapsed = false;
        this.streaming = false;

        this.inputApplication = null;
        this.outputApplication = null;
        this.exitApplication = null;

        this.inputPorts([]);
        this.outputPorts([]);

        this.fields([]);

        this.category = Eagle.Category.Unknown;
        this.categoryType = Eagle.CategoryType.Unknown;

        this.subject = null;

        this.expanded(false);
        this.selected(false);
        this.readonly = true;
    }

    getDisplayWidth = () : number => {
        if (this.isGroup() && this.isCollapsed()){
            return Node.COLLAPSED_WIDTH;
        }

        if (!this.isGroup() && this.isCollapsed()){
            return this.width;
        }

        if (this.getCategoryType() === Eagle.CategoryType.Data && !this.isShowPorts()){
            return Node.DATA_COMPONENT_WIDTH;
        }

        return this.width;
    }

    getDisplayHeight = () : number => {
        if (this.isResizable()){
            if (this.isCollapsed()){
                return Node.COLLAPSED_HEIGHT;
            } else {
                return this.height;
            }
        }

        if (!this.isGroup() && this.isCollapsed()){
            return 32;
        }

        if (this.getCategoryType() === Eagle.CategoryType.Data && !this.isShowPorts()){
            return Node.DATA_COMPONENT_HEIGHT;
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

    addPort = (port : Port, input : boolean) : void => {
        port.setNodeKey(this.key);

        if (input){
            this.inputPorts.push(port);
        } else {
            this.outputPorts.push(port);
        }
    }

    findPortById = (portId : string) : Port => {
        // check input ports
        for (let i = 0; i < this.inputPorts().length; i++){
            const port = this.inputPorts()[i];
            if (port.getId() === portId){
                return port;
            }
        }

        // check output ports
        for (let i = 0; i < this.outputPorts().length; i++){
            const port = this.outputPorts()[i];
            if (port.getId() === portId){
                return port;
            }
        }

        console.warn("Could not find port by Id (" + portId + ") on node " + this.getKey());
        return null;
    }

    findPortInApplicationsById = (portId : string) : {key: number, port: Port} => {
        // if node has an inputApplication, check those ports too
        if (this.hasInputApplication()){
            for (let i = 0; i < this.inputApplication().inputPorts().length; i++){
                const port = this.inputApplication().inputPorts()[i];
                if (port.getId() === portId){
                    return {key: this.inputApplication().getKey(), port: port};
                }
            }
            for (let i = 0; i < this.inputApplication().outputPorts().length; i++){
                const port = this.inputApplication().outputPorts()[i];
                if (port.getId() === portId){
                    return {key: this.inputApplication().getKey(), port: port};
                }
            }
        }

        // if node has an outputApplication, check those ports too
        if (this.hasOutputApplication()){
            for (let i = 0; i < this.outputApplication().inputPorts().length; i++){
                const port = this.outputApplication().inputPorts()[i];
                if (port.getId() === portId){
                    return {key: this.outputApplication().getKey(), port: port};
                }
            }
            for (let i = 0; i < this.outputApplication().outputPorts().length; i++){
                const port = this.outputApplication().outputPorts()[i];
                if (port.getId() === portId){
                    return {key: this.outputApplication().getKey(), port: port};
                }
            }
        }

        // if node has an exitApplication, check those ports too
        if (this.hasExitApplication()){
            for (let i = 0; i < this.exitApplication().inputPorts().length; i++){
                const port = this.exitApplication().inputPorts()[i];
                if (port.getId() === portId){
                    return {key: this.exitApplication().getKey(), port: port};
                }
            }
            for (let i = 0; i < this.exitApplication().outputPorts().length; i++){
                const port = this.exitApplication().outputPorts()[i];
                if (port.getId() === portId){
                    return {key: this.exitApplication().getKey(), port: port};
                }
            }
        }

        console.warn("Could not find port by Id (" + portId + ") on node " + this.getKey());
        return {key: null, port: null};
    }

    // TODO: I have a feeling this should not be necessary. Especially the 'inputLocal' and 'outputLocal' stuff
    findPortTypeById = (portId : string) : string => {
        // check input ports
        for (let i = 0; i < this.inputPorts().length; i++){
            const port = this.inputPorts()[i];
            //console.log("compare node", this.getKey(), "i ports", port.getId(), portId, port.getId() === portId);
            if (port.getId() === portId){
                return "input";
            }
        }

        // check output ports
        for (let i = 0; i < this.outputPorts().length; i++){
            const port = this.outputPorts()[i];
            //console.log("compare node", this.getKey(), "o ports", port.getId(), portId, port.getId() === portId);
            if (port.getId() === portId){
                return "output";
            }
        }

        // if node has an inputApplication, check those ports too
        if (this.hasInputApplication()){
            for (let i = 0; i < this.inputApplication().inputPorts().length; i++){
                const port = this.inputApplication().inputPorts()[i];
                if (port.getId() === portId){
                    return "input";
                }
            }
            for (let i = 0; i < this.inputApplication().outputPorts().length; i++){
                const port = this.inputApplication().outputPorts()[i];
                if (port.getId() === portId){
                    return "inputLocal";
                }
            }
        }

        // if node has an outputApplication, check those ports too
        if (this.hasOutputApplication()){
            for (let i = 0; i < this.outputApplication().inputPorts().length; i++){
                const port = this.outputApplication().inputPorts()[i];
                if (port.getId() === portId){
                    return "outputLocal";
                }
            }
            for (let i = 0; i < this.outputApplication().outputPorts().length; i++){
                const port = this.outputApplication().outputPorts()[i];
                if (port.getId() === portId){
                    return "output";
                }
            }
        }

        // if node has an exitApplication, check those ports too
        if (this.hasExitApplication()){
            for (let i = 0; i < this.exitApplication().inputPorts().length; i++){
                const port = this.exitApplication().inputPorts()[i];
                if (port.getId() === portId){
                    return "outputLocal";
                }
            }
            for (let i = 0; i < this.exitApplication().outputPorts().length; i++){
                const port = this.exitApplication().outputPorts()[i];
                if (port.getId() === portId){
                    return "output";
                }
            }
        }

        console.warn("Could not find port TYPE by Id (" + portId + ") on node " + this.getKey());
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
            for (let i = 0; i < this.inputPorts().length; i++){
                const port = this.inputPorts()[i];
                if (port.getName() === name){
                    return port;
                }
            }
        } else {
            // check output ports
            for (let i = 0; i < this.outputPorts().length; i++){
                const port = this.outputPorts()[i];
                if (port.getName() === name){
                    return port;
                }
            }
        }
        return null;
    }

    hasPortWithName = (name : string, input : boolean, local : boolean) : boolean => {
        return this.findPortByName(name, input, local) !== null;
    }

    hasFieldWithName = (name : string) : boolean => {
        for (let i = 0 ; i < this.fields().length ; i++){
            if (this.fields()[i].getName() === name){
                return true;
            }
        }
        return false;
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
        //console.log("AddField()", field.getText(), field.getName(), field.getValue());
        this.fields.push(field);
    }

    addFieldAtPosition = (field : Field, i : number) : void => {
        this.fields.splice(i, 0, field);
    }

    removeFieldByIndex = (index : number) : void => {
        this.fields.splice(index, 1);
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

    clone = () : Node => {
        const result : Node = new Node(this.key, this.name, this.description, this.category, this.categoryType, this.readonly);

        result.x = this.x;
        result.y = this.y;
        result.width = this.width;
        result.height = this.height;
        result.color = this.color;
        result.drawOrderHint = this.drawOrderHint;

        result.parentKey = this.parentKey;
        result.embedKey = this.embedKey;

        result.collapsed = this.collapsed;
        result.streaming = this.streaming;
        result.showPorts = this.showPorts;
        result.flipPorts = this.flipPorts;

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
        for (let i = 0; i < this.inputPorts().length; i++){
            result.addPort(this.inputPorts()[i].clone(), true);
        }
        for (let i = 0; i < this.outputPorts().length; i++){
            result.addPort(this.outputPorts()[i].clone(), false);
        }

        // clone fields
        for (let i = 0; i < this.fields().length; i++){
            result.fields.push(this.fields()[i].clone());
        }

        result.expanded(this.expanded());
        result.selected(this.selected());

        return result;
    }

    // find the right icon for this node
    getIcon = () : string => {
        return Eagle.getCategoryData(this.category).icon;
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
            this.addField(new Field("", "", "", "", false, Eagle.DataType.Unknown));
        }

        this.fields()[0].setValue(e.value);
    }

    findPortIsInputById = (portId: string) : boolean => {
        // find the port within the node
        for (let i = 0 ; i < this.inputPorts().length ; i++){
            const port : Port = this.inputPorts()[i];
            if (port.getId() === portId){
                return true;
            }
        }

        for (let i = 0 ; i < this.outputPorts().length ; i++){
            const port : Port = this.outputPorts()[i];
            if (port.getId() === portId){
                return false;
            }
        }

        // check input application ports
        if (this.hasInputApplication()){
            for (let i = 0 ; i < this.inputApplication().inputPorts().length ; i++){
                const port : Port = this.inputApplication().inputPorts()[i];
                if (port.getId() === portId){
                    return false;
                }
            }

            for (let i = 0 ; i < this.inputApplication().outputPorts().length ; i++){
                const port : Port = this.inputApplication().outputPorts()[i];
                if (port.getId() === portId){
                    return true;
                }
            }
        }

        // TODO: check output application ports

        // TODO: check exit application ports

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

    static fromOJSJson = (nodeData : any, errors: string[], generateKeyFunc: () => number) : Node => {
        let name = "";
        if (typeof nodeData.text !== 'undefined'){
            name = nodeData.text;
        } else {
            console.warn("Node", nodeData.key, "has undefined text", nodeData, "!");
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
        let categoryType: Eagle.CategoryType = GraphUpdater.translateOldCategoryType(nodeData.categoryType, category);

        // if category is not known, then add error
        if (!Utils.isKnownCategory(category)){
            errors.push("Node with key " + nodeData.key + " has unknown category: " + category);
            category = Eagle.Category.Unknown;
            categoryType = Eagle.CategoryType.Unknown;
        }

        const node : Node = new Node(nodeData.key, name, "", category, categoryType, readonly);

        // set position
        node.setPosition(x, y);

        // get description (if exists)
        if (typeof nodeData.description !== 'undefined'){
            node.description = nodeData.description;
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

        // showPorts
        if (typeof nodeData.showPorts !== 'undefined'){
            node.showPorts = nodeData.showPorts;
        }

        // flipPorts
        if (typeof nodeData.flipPorts !== 'undefined'){
            node.flipPorts = nodeData.flipPorts;
        }

        // NOTE: skip the 'selected' boolean on the input data, don't remember the user's selection

        // expanded
        if (typeof nodeData.expanded !== 'undefined'){
            node.expanded(nodeData.expanded);
        }

        // color
        if (typeof nodeData.color !== 'undefined'){
            node.color = nodeData.color;
        } else {
            node.color = Utils.getColorForNode(category);
        }

        // drawOrderHint
        if (typeof nodeData.drawOrderHint !== 'undefined'){
            node.drawOrderHint = nodeData.drawOrderHint;
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
                console.error("attempt to add inputApplication to unsuitable node:", category);
            } else {
                node.inputApplication(Node.createEmbeddedApplicationNode(inputApplicationKey, nodeData.inputAppName, nodeData.inputApplicationType, node.getKey(), readonly));
            }
        }

        if (nodeData.inputApplicationName !== undefined && nodeData.inputApplicationType !== Eagle.Category.None){
            if (!Eagle.getCategoryData(category).canHaveInputApplication){
                console.error("attempt to add inputApplication to unsuitable node:", category);
            } else {
                node.inputApplication(Node.createEmbeddedApplicationNode(inputApplicationKey, nodeData.inputApplicationName, nodeData.inputApplicationType, node.getKey(), readonly));
            }
        }

        if (nodeData.outputAppName !== undefined && nodeData.outputAppName !== ""){
            if (!Eagle.getCategoryData(category).canHaveOutputApplication){
                console.error("attempt to add outputApplication to unsuitable node:", category);
            } else {
                node.outputApplication(Node.createEmbeddedApplicationNode(outputApplicationKey, nodeData.outputAppName, nodeData.outputApplicationType, node.getKey(), readonly));
            }
        }

        if (nodeData.outputApplicationName !== undefined && nodeData.outputApplicationType !== Eagle.Category.None){
            if (!Eagle.getCategoryData(category).canHaveOutputApplication){
                console.error("attempt to add outputApplication to unsuitable node:", category);
            } else {
                node.outputApplication(Node.createEmbeddedApplicationNode(outputApplicationKey, nodeData.outputApplicationName, nodeData.outputApplicationType, node.getKey(), readonly));
            }
        }

        if (nodeData.exitAppName !== undefined && nodeData.exitAppName !== ""){
            if (!Eagle.getCategoryData(category).canHaveExitApplication){
                console.error("attempt to add exitApplication to unsuitable node:", category);
            } else {
                node.exitApplication(Node.createEmbeddedApplicationNode(exitApplicationKey, nodeData.exitAppName, nodeData.exitApplicationType, node.getKey(), readonly));
            }
        }

        if (nodeData.exitApplicationName !== undefined && nodeData.exitApplicationType !== Eagle.Category.None){
            if (!Eagle.getCategoryData(category).canHaveExitApplication){
                console.error("attempt to add exitApplication to unsuitable node:", category);
            } else {
                node.exitApplication(Node.createEmbeddedApplicationNode(exitApplicationKey, nodeData.exitApplicationName, nodeData.exitApplicationType, node.getKey(), readonly));
            }
        }

        // set parentKey if a group is defined
        if (typeof nodeData.group !== 'undefined'){
            node.parentKey = nodeData.group;
        }

        // set embedKey if defined
        if (typeof nodeData.embedKey !== 'undefined'){
            node.embedKey = nodeData.embedKey;
        }

        // debug hack for *really* old nodes that just use 'application' to specify the inputApplication
        if (nodeData.application !== undefined && nodeData.application !== ""){
            console.warn("only found old application type, not new input application type and output application type", categoryType, category);

            if (!Eagle.getCategoryData(category).canHaveInputApplication){
                console.error("attempt to add inputApplication to unsuitable node:", category);
            } else {
                node.inputApplication(Node.createEmbeddedApplicationNode(null, nodeData.application, category, node.getKey(), readonly));
            }
        }

        // read the 'real' input and output apps, correctly specified as nested nodes
        if (typeof nodeData.inputApplication !== 'undefined' && nodeData.inputApplication !== null){
            if (!Eagle.getCategoryData(category).canHaveInputApplication){
                console.error("attempt to add inputApplication to unsuitable node:", category);
            } else {
                node.inputApplication(Node.fromOJSJson(nodeData.inputApplication, errors, generateKeyFunc));
                node.inputApplication().setEmbedKey(node.getKey());
            }
        }
        if (typeof nodeData.outputApplication !== 'undefined' && nodeData.outputApplication !== null){
            if (!Eagle.getCategoryData(category).canHaveOutputApplication){
                console.error("attempt to add outputApplication to unsuitable node:", category);
            } else {
                node.outputApplication(Node.fromOJSJson(nodeData.outputApplication, errors, generateKeyFunc));
                node.outputApplication().setEmbedKey(node.getKey());
            }
        }
        if (typeof nodeData.exitApplication !== 'undefined' && nodeData.exitApplication !== null){
            if (!Eagle.getCategoryData(category).canHaveExitApplication){
                console.error("attempt to add inputApplication to unsuitable node:", category);
            } else {
                node.exitApplication(Node.fromOJSJson(nodeData.exitApplication, errors, generateKeyFunc));
                node.exitApplication().setEmbedKey(node.getKey());
            }
        }

        // collapsed
        if (typeof nodeData.collapsed !== 'undefined'){
            node.collapsed = nodeData.collapsed;
        } else {
            node.collapsed = false;
        }

        // streaming
        if (typeof nodeData.streaming !== 'undefined'){
            node.streaming = nodeData.streaming;
        } else {
            node.streaming = false;
        }

        // subject (for comment nodes)
        if (typeof nodeData.subject !== 'undefined'){
            node.subject = nodeData.subject;
        } else {
            node.subject = null;
        }

        // add input ports
        if (typeof nodeData.inputPorts !== 'undefined'){
            for (let j = 0 ; j < nodeData.inputPorts.length; j++){
                const port = Port.fromOJSJson(nodeData.inputPorts[j]);

                if (node.canHaveInputs()){
                    node.addPort(port, true);
                } else {
                    Node.addPortToEmbeddedApplication(node, port, true, errors, nodeData.readonly, generateKeyFunc);
                }
            }
        }

        // add output ports
        if (typeof nodeData.outputPorts !== 'undefined'){
            for (let j = 0 ; j < nodeData.outputPorts.length; j++){
                const port = Port.fromOJSJson(nodeData.outputPorts[j]);

                if (node.canHaveOutputs()){
                    node.addPort(port, false);
                } else {
                    Node.addPortToEmbeddedApplication(node, port, false, errors, nodeData.readonly, generateKeyFunc);
                }
            }
        }

        // add input local ports
        if (typeof nodeData.inputLocalPorts !== 'undefined'){
            for (let j = 0 ; j < nodeData.inputLocalPorts.length; j++){
                const portData = nodeData.inputLocalPorts[j];
                if (node.hasInputApplication()){
                    const port = Port.fromOJSJson(portData);
                    //console.log("read inputLocalPort to inputApp outputPort");
                    node.inputApplication().addPort(port, false); // I or O?
                } else {
                    console.warn("Can't add inputLocal port", portData.IdText, "to node", node.getName());
                    errors.push("Can't add inputLocal port " + portData.IdText + " to node " + node.getName());
                }
            }
        }

        // add output local ports
        if (typeof nodeData.outputLocalPorts !== 'undefined'){
            for (let j = 0 ; j < nodeData.outputLocalPorts.length; j++){
                const portData = nodeData.outputLocalPorts[j];
                const port = Port.fromOJSJson(portData);
                if (node.hasOutputApplication()){
                    //console.log("read outputLocalPort to outputApp inputPort");
                    node.outputApplication().addPort(port, true); // I or O?
                }

                if (node.hasExitApplication()){
                    //console.log("read outputLocalPort to exitApp inputPort");
                    node.exitApplication().addPort(port, true); // I or O?
                }

                if (!node.hasOutputApplication() && !node.hasExitApplication()){
                    console.warn("Can't add outputLocal port", portData.IdText, "to node", node.getName());
                    errors.push("Can't add outputLocal port " + portData.IdText + " to node " + node.getName());
                }
            }
        }

        // add fields
        if (typeof nodeData.fields !== 'undefined'){
            for (let j = 0 ; j < nodeData.fields.length ; j++){
                const fieldData = nodeData.fields[j];
                const fieldDescription : string = fieldData.description === undefined ? "" : fieldData.description;
                const fieldReadonly : boolean = fieldData.readonly === undefined ? false : fieldData.readonly;
                const fieldType : Eagle.DataType = fieldData.type === undefined ? Eagle.DataType.Unknown : fieldData.type;
                node.addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription, fieldReadonly, fieldType));
            }
        }

        // add inputAppFields
        if (typeof nodeData.inputAppFields !== 'undefined'){
            for (let j = 0 ; j < nodeData.inputAppFields.length ; j++){
                const fieldData = nodeData.inputAppFields[j];
                const fieldDescription : string = fieldData.description === undefined ? "" : fieldData.description;
                const fieldReadonly : boolean = fieldData.readonly === undefined ? false : fieldData.readonly;
                const fieldType : Eagle.DataType = fieldData.type === undefined ? Eagle.DataType.Unknown : fieldData.type;
                node.inputApplication().addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription, fieldReadonly, fieldType));
            }
        }

        // add outputAppFields
        if (typeof nodeData.outputAppFields !== 'undefined'){
            for (let j = 0 ; j < nodeData.outputAppFields.length ; j++){
                const fieldData = nodeData.outputAppFields[j];
                const fieldDescription : string = fieldData.description === undefined ? "" : fieldData.description;
                const fieldReadonly : boolean = fieldData.readonly === undefined ? false : fieldData.readonly;
                const fieldType : Eagle.DataType = fieldData.type === undefined ? Eagle.DataType.Unknown : fieldData.type;
                node.outputApplication().addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription, fieldReadonly, fieldType));
            }
        }

        // add exitAppFields
        if (typeof nodeData.exitAppFields !== 'undefined'){
            for (let j = 0 ; j < nodeData.exitAppFields.length ; j++){
                const fieldData = nodeData.exitAppFields[j];
                const fieldDescription : string = fieldData.description === undefined ? "" : fieldData.description;
                const fieldReadonly : boolean = fieldData.readonly === undefined ? false : fieldData.readonly;
                const fieldType : Eagle.DataType = fieldData.type === undefined ? Eagle.DataType.Unknown : fieldData.type;
                node.exitApplication().addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription, fieldReadonly, fieldType));
            }
        }

        return node;
    }

    private static copyPorts(src: Port[], dest: {}[]):void{
        for (let i = 0 ; i < src.length; i++){
            dest.push(Port.toOJSJson(src[i]));
        }
    }

    private static addPortToEmbeddedApplication(node: Node, port: Port, input: boolean, errors: string[], readonly: boolean, generateKeyFunc: () => number){
        // check that the node already has an appropriate embedded application, otherwise create it
        if (input){
            if (!node.hasInputApplication()){
                if (Eagle.findSettingValue(Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                    node.inputApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getName(), Eagle.Category.None, node.getKey(), readonly));
                    errors.push("Created new embedded input application (" + node.inputApplication().getName() + ") for node (" + node.getName() + ", " + node.getKey() + "). Application category is " + node.inputApplication().getCategory() + " and may require user intervention.");
                } else {
                    errors.push("Cannot add input port to construct that doesn't support input ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name", port.getName() );
                    return;
                }
            }
            node.inputApplication().addPort(port, true);
            port.setNodeKey(node.inputApplication().getKey());
            errors.push("Moved input port (" + port.getName() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + ", " + node.getKey() + ") to an embedded input application (" + node.inputApplication().getKey() + ")");
        } else {
            // determine whether we should check (and possibly add) an output or exit application, depending on the type of this node
            if (node.canHaveOutputApplication() && !node.canHaveExitApplication()){
                if (!node.hasOutputApplication()){
                    if (Eagle.findSettingValue(Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                        node.outputApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getName(), Eagle.Category.None, node.getKey(), readonly));
                        errors.push("Created new embedded output application (" + node.outputApplication().getName() + ") for node (" + node.getName() + ", " + node.getKey() + "). Application category is " + node.outputApplication().getCategory() + " and may require user intervention.");
                    } else {
                        errors.push("Cannot add output port to construct that doesn't support output ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name", port.getName() );
                        return;
                    }
                }
                node.outputApplication().addPort(port, false);
                port.setNodeKey(node.outputApplication().getKey());
                errors.push("Moved output port (" + port.getName() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + ", " + node.getKey() + ") to an embedded output application (" + node.outputApplication().getKey() + ")");
            }
            if (!node.canHaveOutputApplication() && node.canHaveExitApplication()){
                if (!node.hasExitApplication()){
                    if (Eagle.findSettingValue(Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                        node.exitApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getName(), Eagle.Category.None, node.getKey(), readonly));
                    } else {
                        errors.push("Cannot add output port to construct that doesn't support output ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name", port.getName() );
                        return;
                    }
                }
                node.exitApplication().addPort(port, false);
                port.setNodeKey(node.exitApplication().getKey());
                errors.push("Moved output port (" + port.getName() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + "," + node.getKey() + ") to an embedded exit application");
            }

            if (!node.canHaveOutputApplication() && !node.canHaveExitApplication()){
                // if possible, add port to output side of input application
                if (node.canHaveInputApplication()){
                    if (!node.hasInputApplication()){
                        if (Eagle.findSettingValue(Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS)){
                            node.inputApplication(Node.createEmbeddedApplicationNode(generateKeyFunc(), port.getName(), Eagle.Category.None, node.getKey(), readonly));
                        } else {
                            errors.push("Cannot add input port to construct that doesn't support input ports (name:" + node.getName() + " category:" + node.getCategory() + ") port name", port.getName() );
                            return;
                        }
                    }
                    node.inputApplication().addPort(port, false);
                    port.setNodeKey(node.inputApplication().getKey());
                    errors.push("Moved output port (" + port.getName() + "," + port.getId().substring(0,4) + ") on construct node (" + node.getName() + "," + node.getKey() + ") to output of the embedded input application");
                } else {
                    errors.push("Can't add port to embedded application. Node can't have output OR exit application.");
                }
            }
        }
    }

    static toOJSJson = (node : Node) : object => {
        const result : any = {};
        const useNewCategories : boolean = Eagle.findSettingValue(Utils.TRANSLATE_WITH_NEW_CATEGORIES);

        result.category = useNewCategories ? GraphUpdater.translateNewCategory(node.category) : node.category;
        result.categoryType = node.categoryType;
        result.isData = node.isData();
        result.isGroup = node.isGroup();
        result.canHaveInputs = node.canHaveInputs();
        result.canHaveOutputs = node.canHaveOutputs();
        result.color = node.color;
        result.drawOrderHint = node.drawOrderHint;

        result.key = node.key;
        result.text = node.name;
        result.description = node.description;
        result.x = node.x;
        result.y = node.y;
        result.width = node.width;
        result.height = node.height;
        result.collapsed = node.collapsed;
        result.showPorts = node.showPorts;
        result.flipPorts = node.flipPorts;
        result.streaming = node.streaming;
        result.subject = node.subject;
        result.selected = node.selected();
        result.expanded = node.expanded();
        result.readonly = node.readonly;

        if (node.parentKey !== null){
            result.group = node.parentKey;
        }

        if (node.embedKey !== null){
            result.embedKey = node.embedKey;
        }

        // add input ports
        result.inputPorts = [];
        if (node.hasInputApplication()){
            //console.log("copy", node.inputApplication().inputPorts.length, "inputApp inputPorts to result inputPorts")
            Node.copyPorts(node.inputApplication().inputPorts(), result.inputPorts);
        } else {
            //console.log("copy", node.inputPorts.length, "inputPorts to result inputPorts")
            Node.copyPorts(node.inputPorts(), result.inputPorts);
        }

        // add output ports
        result.outputPorts = [];
        if (node.hasOutputApplication()){
            // add outputApp output ports here
            //console.log("copy", node.outputApplication().outputPorts.length, "outputApp outputPorts to result outputPorts")
            Node.copyPorts(node.outputApplication().outputPorts(), result.outputPorts);
        }
        if (node.hasExitApplication()){
            // add exitApp output ports here
            //console.log("copy", node.exitApplication().outputPorts.length, "exitApp outputPorts to result outputPorts")
            Node.copyPorts(node.exitApplication().outputPorts(), result.outputPorts);
        }
        if (!node.hasOutputApplication() && !node.hasExitApplication()){
            //console.log("copy", node.outputPorts.length, "outputPorts to result outputPorts")
            Node.copyPorts(node.outputPorts(), result.outputPorts);
        }

        // add input ports from the inputApplication
        // ! should be inputApp output ports - i think !
        result.inputLocalPorts = [];
        if (node.hasInputApplication()){
            for (let i = 0 ; i < node.inputApplication().outputPorts().length ; i++){
                const port = node.inputApplication().outputPorts()[i];

                result.inputLocalPorts.push(Port.toOJSJson(port));
                //console.log("copy inputApp outputPort to result inputLocalPorts");
            }
        }

        // add input ports from the outputApplication
        // ! should be outputApp input ports - i think !
        // ! AND       exitApp input ports - i think !
        result.outputLocalPorts = [];
        if (node.hasOutputApplication()){
            for (let i = 0 ; i < node.outputApplication().inputPorts().length ; i++){
                const port = node.outputApplication().inputPorts()[i];

                result.outputLocalPorts.push(Port.toOJSJson(port));
                //console.log("copy outputApp inputPort to result outputLocalPorts");
            }
        }
        if (node.hasExitApplication()){
            for (let i = 0 ; i < node.exitApplication().inputPorts().length ; i++){
                const port = node.exitApplication().inputPorts()[i];

                result.outputLocalPorts.push(Port.toOJSJson(port));
                //console.log("copy exitApp inputPort to result outputLocalPorts");
            }
        }

        // add fields
        result.fields = [];
        for (let i = 0 ; i < node.fields().length ; i++){
            const field = node.fields()[i];
            result.fields.push(Field.toOJSJson(field));
        }

        // add fields from inputApplication
        result.inputAppFields = [];
        if (node.hasInputApplication()){
            for (let i = 0 ; i < node.inputApplication().fields().length ; i++){
                const field = node.inputApplication().fields()[i];
                result.inputAppFields.push(Field.toOJSJson(field));
            }
        }

        // add fields from outputApplication
        result.outputAppFields = [];
        if (node.hasOutputApplication()){
            for (let i = 0 ; i < node.outputApplication().fields().length ; i++){
                const field = node.outputApplication().fields()[i];
                result.outputAppFields.push(Field.toOJSJson(field));
            }
        }

        // add fields from exitApplication
        result.exitAppFields = [];
        if (node.hasExitApplication()){
            for (let i = 0 ; i < node.exitApplication().fields().length ; i++){
                const field = node.exitApplication().fields()[i];
                result.exitAppFields.push(Field.toOJSJson(field));
            }
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationName = node.inputApplication().name;
            result.inputApplicationType = node.inputApplication().category;
            result.inputApplicationKey  = node.inputApplication().key;
        } else {
            result.inputApplicationName = "";
            result.inputApplicationType = Eagle.Category.None;
            result.inputApplicationKey  = null;
        }
        if (node.hasOutputApplication()){
            result.outputApplicationName = node.outputApplication().name;
            result.outputApplicationType = node.outputApplication().category;
            result.outputApplicationKey  = node.outputApplication().key;
        } else {
            result.outputApplicationName = "";
            result.outputApplicationType = Eagle.Category.None;
            result.outputApplicationKey  = null;
        }
        if (node.hasExitApplication()){
            result.exitApplicationName = node.exitApplication().name;
            result.exitApplicationType = node.exitApplication().category;
            result.exitApplicationKey  = node.exitApplication().key;
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

        result.category = useNewCategories ? GraphUpdater.translateNewCategory(node.category) : node.category;
        result.categoryType = node.categoryType;
        result.isData = node.isData();
        result.isGroup = node.isGroup();
        result.canHaveInputs = node.canHaveInputs();
        result.canHaveOutputs = node.canHaveOutputs();
        result.color = node.color;
        result.drawOrderHint = node.drawOrderHint;

        result.key = node.key;
        result.text = node.name;
        result.description = node.description;
        result.x = node.x;
        result.y = node.y;
        result.width = node.width;
        result.height = node.height;
        result.collapsed = node.collapsed;
        result.showPorts = node.showPorts;
        result.flipPorts = node.flipPorts;
        result.streaming = node.streaming;
        result.subject = node.subject;
        result.selected = node.selected();
        result.expanded = node.expanded();
        result.readonly = node.readonly;

        result.parentKey = node.parentKey;
        result.embedKey = node.embedKey;

        // add input ports
        result.inputPorts = [];
        Node.copyPorts(node.inputPorts(), result.inputPorts);

        // add output ports
        result.outputPorts = [];
        Node.copyPorts(node.outputPorts(), result.outputPorts);

        // add fields
        result.fields = [];
        for (let i = 0 ; i < node.fields().length ; i++){
            const field = node.fields()[i];
            result.fields.push(Field.toOJSJson(field));
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

    static fromAppRefJson = (nodeData : any, errors: string[]) : Node => {
        const node = new Node(nodeData.key, nodeData.text, nodeData.description, nodeData.category, nodeData.categoryType, nodeData.readonly);

        node.color = nodeData.color;
        node.drawOrderHint = nodeData.drawOrderHint;
        node.x = nodeData.x;
        node.y = nodeData.y;
        node.width = nodeData.width;
        node.height = nodeData.height;
        node.collapsed = nodeData.collapsed;
        node.showPorts = nodeData.showPorts;
        node.flipPorts = nodeData.flipPorts;
        node.streaming = nodeData.streaming;
        node.subject = nodeData.subject;
        node.selected(nodeData.selected);
        node.expanded(nodeData.expanded);
        node.parentKey = nodeData.parentKey;
        node.embedKey = nodeData.embedKey;

        node.inputPorts([]);
        for (let i = 0 ; i < nodeData.inputPorts.length ; i++){
            node.addPort(Port.fromOJSJson(nodeData.inputPorts[i]), true);
        }

        node.outputPorts([]);
        for (let i = 0 ; i < nodeData.outputPorts.length ; i++){
            node.addPort(Port.fromOJSJson(nodeData.outputPorts[i]), false);
        }

        node.fields([]);
        for (let i = 0 ; i < nodeData.fields.length ; i++){
            node.addField(Field.fromOJSJson(nodeData.fields[i]));
        }

        return node;
    }

    // display/visualisation data
    static toV3NodeJson = (node : Node, index : number) : object => {
        const result : any = {};

        result.componentKey = index.toString();

        result.color = node.color;
        result.drawOrderHint = node.drawOrderHint;

        result.x = node.x;
        result.y = node.y;
        result.width = node.width;
        result.height = node.height;
        result.collapsed = node.collapsed;
        result.showPorts = node.showPorts;
        result.flipPorts = node.flipPorts;

        result.selected = node.selected();
        result.expanded = node.expanded();
        result.readonly = node.readonly;

        return result;
    }

    static fromV3NodeJson = (nodeData : any, key: string, errors: string[]) : Node => {
        const result = new Node(parseInt(key, 10), "", "", Eagle.Category.Unknown, Eagle.CategoryType.Unknown, nodeData.readonly);

        result.color = nodeData.color;
        result.drawOrderHint = nodeData.drawOrderHint;

        result.x = nodeData.x;
        result.y = nodeData.y;
        result.width = nodeData.width;
        result.height = nodeData.height;
        result.collapsed = nodeData.collapsed;
        result.showPorts = nodeData.showPorts;
        result.flipPorts = nodeData.flipPorts;

        result.selected(nodeData.selected);
        result.expanded(nodeData.expanded);

        return result;
    }

    // graph data
    // "name" and "description" are considered part of the structure of the graph, it would be hard to add them to the display part (parameters would have to be treated the same way)
    static toV3ComponentJson = (node : Node) : object => {
        const result : any = {};
        const useNewCategories : boolean = Eagle.findSettingValue(Utils.TRANSLATE_WITH_NEW_CATEGORIES);

        result.category = useNewCategories ? GraphUpdater.translateNewCategory(node.category) : node.category;
        result.categoryType = node.categoryType;
        result.isData = node.isData();
        result.isGroup = node.isGroup();

        result.name = node.name;
        result.description = node.description;

        result.streaming = node.streaming;
        result.subject = node.subject; // TODO: not sure if this should be here or in Node JSON


        result.parentKey = node.parentKey;
        result.embedKey = node.embedKey;

        result.inputApplicationKey = -1;
        result.outputApplicationKey = -1;
        result.exitApplicationKey = -1;

        // add input ports
        result.inputPorts = {};
        for (let i = 0 ; i < node.inputPorts().length; i++){
            const port = node.inputPorts()[i];
            result.inputPorts[port.getId()] = Port.toV3Json(port);
        }

        // add output ports
        result.outputPorts = {};
        for (let i = 0 ; i < node.outputPorts().length; i++){
            const port = node.outputPorts()[i];
            result.outputPorts[port.getId()] = Port.toV3Json(port);
        }

        // add parameters
        result.parameters = {};
        for (let i = 0 ; i < node.fields().length ; i++){
            const field = node.fields()[i];
            result.parameters[i] = Field.toV3Json(field);
        }

        return result;
    }

    static fromV3ComponentJson = (nodeData: any, node: Node, errors: string[]): void => {
        node.category = nodeData.category;
        node.categoryType = nodeData.categoryType;
        node.name = nodeData.name;
        node.description = nodeData.description;

        node.streaming = nodeData.streaming;
        node.subject = nodeData.subject;

        node.parentKey = nodeData.parentKey;
        node.embedKey = nodeData.embedKey;
    }

    static createEmbeddedApplicationNode = (key: number, name : string, category: Eagle.Category, embedKey: number, readonly: boolean) : Node => {
        //console.log("createEmbeddedApplicationNode(", key, name, category, embedKey, readonly, ")");
        const node = new Node(key, name, "", category, Eagle.CategoryType.Application, readonly);
        node.setEmbedKey(embedKey);
        return node;
    }
}
