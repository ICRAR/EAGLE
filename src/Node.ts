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

    private inputApplication : ko.Observable<Node>;
    private outputApplication : ko.Observable<Node>;
    private exitApplication : ko.Observable<Node>;

    private inputPorts : Port[];
    private outputPorts : Port[];

    private fields : Field[];

    private category : Eagle.Category;
    private categoryType : Eagle.CategoryType;

    private subject : number | null; // the key of another node that is the subject of this node. used by comment nodes only.

    private expanded : ko.Observable<boolean>; // true, if the node has been expanded in the hierarchy tab in EAGLE
    private selected : ko.Observable<boolean>; // true, if the node has been selected in EAGLE

    public static readonly DEFAULT_WIDTH : number = 200;
    public static readonly DEFAULT_HEIGHT : number = 200;
    public static readonly DEFAULT_COLOR : string = "ffffff";
    public static readonly DEFAULT_POSITION_X : number = 300;
    public static readonly DEFAULT_POSITION_Y : number = 100;

    public static readonly COLLAPSED_WIDTH : number = 128;
    public static readonly COLLAPSED_HEIGHT : number = 128;
    public static readonly DATA_COMPONENT_WIDTH : number = 48;
    public static readonly DATA_COMPONENT_HEIGHT : number = 48;

    public static readonly NO_APP_STRING : string = "<no app>";

    constructor(key : number, name : string, description : string, category : Eagle.Category, categoryType : Eagle.CategoryType, x : number, y : number){
        this.key = key;
        this.name = name;
        this.description = description;
        this.x = x;
        this.y = y;
        this.width = Node.DEFAULT_WIDTH;
        this.height = Node.DEFAULT_HEIGHT;
        this.color = Utils.getColorForNode(category);
        this.drawOrderHint = 0;

        this.parentKey = null;
        this.embedKey = null;
        this.collapsed = false;
        this.streaming = false;
        this.showPorts = false;

        this.inputApplication = ko.observable(null);
        this.outputApplication = ko.observable(null);
        this.exitApplication = ko.observable(null);

        this.inputPorts = [];
        this.outputPorts = [];

        this.fields = [];

        this.category = category;
        this.categoryType = categoryType;

        this.subject = null;

        this.expanded = ko.observable(false);
        this.selected = ko.observable(false);
    }

    getKey = () : number => {
        return this.key;
    }

    setKey = (key : number) => {
        this.key = key;

        // go through all ports on this node, and make sure their nodeKeys are all updated
        for (var i = 0; i < this.inputPorts.length ; i++){
            this.inputPorts[i].setNodeKey(key);
        }
        for (var i = 0; i < this.outputPorts.length ; i++){
            this.outputPorts[i].setNodeKey(key);
        }
    }

    getName = () : string => {
        return this.name;
    }

    setName = (name : string) : void => {
        this.name = name;
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

    getInputPorts = () : Port[] => {
        return this.inputPorts;
    }

    getOutputPorts = () : Port[] => {
        return this.outputPorts;
    }

    getInputApplicationInputPorts = () : Port[] => {
        if (this.inputApplication() === null){
            return [];
        }

        return this.inputApplication().inputPorts;
    }

    getInputApplicationOutputPorts = () : Port[] => {
        if (this.inputApplication() === null){
            return [];
        }

        return this.inputApplication().outputPorts;
    }

    getOutputApplicationInputPorts = () : Port[] => {
        if (this.outputApplication() === null){
            return [];
        }

        return this.outputApplication().inputPorts;
    }

    getOutputApplicationOutputPorts = () : Port[] => {
        if (this.outputApplication() === null){
            return [];
        }

        return this.outputApplication().outputPorts;
    }

    getExitApplicationInputPorts = () : Port[] => {
        if (this.exitApplication() === null){
            return [];
        }

        return this.exitApplication().inputPorts;
    }

    getExitApplicationOutputPorts = () : Port[] => {
        if (this.exitApplication() === null){
            return [];
        }

        return this.exitApplication().outputPorts;
    }

    hasLocalPortWithId = (id : string) : boolean => {
        // check output ports of input application, if one exists
        if (this.hasInputApplication()){
            for (var i = 0; i < this.inputApplication().outputPorts.length ; i++){
                if (this.inputApplication().outputPorts[i].getId() === id){
                    return true;
                }
            }
        }
        // check input ports of outputApplication, if one exists
        if (this.hasOutputApplication()){
            for (var i = 0; i < this.outputApplication().inputPorts.length ; i++){
                if (this.outputApplication().inputPorts[i].getId() === id){
                    return true;
                }
            }
        }
        // check input ports of exitApplication, if one exists
        if (this.hasExitApplication()){
            for (var i = 0; i < this.exitApplication().inputPorts.length ; i++){
                if (this.exitApplication().inputPorts[i].getId() === id){
                    return true;
                }
            }
        }

        return false;
    }

    getFieldByName = (name : string) : Field | null => {
        for (var i = 0 ; i < this.fields.length ; i++){
            if (this.fields[i].getName() === name){
                return this.fields[i];
            }
        }

        return null;
    }

    getFields = () : Field[] => {
        return this.fields;
    }

    getNumFields = () : number => {
        return this.fields.length;
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

    isResizable = () : boolean => {
        return this.isGroup() ||
               this.category === Eagle.Category.Comment ||
               this.category === Eagle.Category.Description;
    }

    canHaveInputs = () : boolean => {
        return Eagle.getCategoryData(this.category).canHaveInputs;
    }

    canHaveOutputs = () : boolean => {
        return Eagle.getCategoryData(this.category).canHaveOutputs;
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

    setSubjectKey = (key : number) => {
        this.subject = key;
    }

    setSelected = (selected : boolean) => {
        this.selected(selected);
    }

    getSelected = () : boolean => {
        return this.selected();
    }

    setInputApplication = (inputApplication : Node) : void => {
        this.inputApplication(inputApplication);
        inputApplication.setEmbedKey(this.getKey());

        if (inputApplication !== null){
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
        outputApplication.setEmbedKey(this.getKey());

        if (outputApplication !== null){
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
        exitApplication.setEmbedKey(this.getKey());

        if (exitApplication !== null){
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
        this.x = Node.DEFAULT_POSITION_X;
        this.y = Node.DEFAULT_POSITION_Y;
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

        this.inputPorts = [];
        this.outputPorts = [];

        this.fields = [];

        this.category = Eagle.Category.Unknown;
        this.categoryType = Eagle.CategoryType.Unknown;

        this.subject = null;

        this.expanded(false);
        this.selected(false);
    }

    getDisplayWidth = () : number => {
        if (this.isCollapsed()){
            return Node.COLLAPSED_WIDTH;
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

        if (this.getCategoryType() === Eagle.CategoryType.Data && !this.isShowPorts()){
            return Node.DATA_COMPONENT_HEIGHT;
        }

        var leftHeight = (
            this.getInputPorts().length +
            this.getInputApplicationInputPorts().length +
            this.getInputApplicationOutputPorts().length +
            2) * 24;
        var rightHeight = (
            this.getOutputPorts().length +
            this.getOutputApplicationInputPorts().length +
            this.getOutputApplicationOutputPorts().length +
            this.getExitApplicationInputPorts().length +
            this.getExitApplicationOutputPorts().length +
            2) * 24;

        return Math.max(leftHeight, rightHeight);
    }

    // TODO: if node is a scatter, gather or mkn, we should not be able to add nodes. The nodes must come from the input and output applications.
    addPort = (port : Port, input : boolean) : void => {
        if (this.isScatter() || this.isGather() || this.isMKN()){
            console.error("Adding a port to a construct (name:", this.getName(), "category:", this.getCategory() + ") port name", port.getName() );
        }

        port.setNodeKey(this.key);

        if (input){
            this.inputPorts.push(port);
        } else {
            this.outputPorts.push(port);
        }
    }

    findPortById = (portId : string) : Port => {
        // check input ports
        for (var i = 0; i < this.inputPorts.length; i++){
            var port = this.inputPorts[i];
            if (port.getId() === portId){
                return port;
            }
        }

        // check output ports
        for (var i = 0; i < this.outputPorts.length; i++){
            var port = this.outputPorts[i];
            if (port.getId() === portId){
                return port;
            }
        }

        // if node has an inputApplication, check those ports too
        if (this.hasInputApplication()){
            for (var i = 0; i < this.inputApplication().inputPorts.length; i++){
                var port = this.inputApplication().inputPorts[i];
                if (port.getId() === portId){
                    return port;
                }
            }
            for (var i = 0; i < this.inputApplication().outputPorts.length; i++){
                var port = this.inputApplication().outputPorts[i];
                if (port.getId() === portId){
                    return port;
                }
            }
        }

        // if node has an outputApplication, check those ports too
        if (this.hasOutputApplication()){
            for (var i = 0; i < this.outputApplication().inputPorts.length; i++){
                var port = this.outputApplication().inputPorts[i];
                if (port.getId() === portId){
                    return port;
                }
            }
            for (var i = 0; i < this.outputApplication().outputPorts.length; i++){
                var port = this.outputApplication().outputPorts[i];
                if (port.getId() === portId){
                    return port;
                }
            }
        }

        // if node has an exitApplication, check those ports too
        if (this.hasExitApplication()){
            for (var i = 0; i < this.exitApplication().inputPorts.length; i++){
                var port = this.exitApplication().inputPorts[i];
                if (port.getId() === portId){
                    return port;
                }
            }
            for (var i = 0; i < this.exitApplication().outputPorts.length; i++){
                var port = this.exitApplication().outputPorts[i];
                if (port.getId() === portId){
                    return port;
                }
            }
        }

        console.warn("Could not find port by Id (" + portId + ") on node " + this.getKey());
        return null;
    }

    findPortTypeById = (portId : string) : string => {
        // check input ports
        for (var i = 0; i < this.inputPorts.length; i++){
            var port = this.inputPorts[i];
            if (port.getId() === portId){
                return "input";
            }
        }

        // check output ports
        for (var i = 0; i < this.outputPorts.length; i++){
            var port = this.outputPorts[i];
            if (port.getId() === portId){
                return "output";
            }
        }

        // if node has an inputApplication, check those ports too
        if (this.hasInputApplication()){
            for (var i = 0; i < this.inputApplication().inputPorts.length; i++){
                var port = this.inputApplication().inputPorts[i];
                if (port.getId() === portId){
                    return "input";
                }
            }
            for (var i = 0; i < this.inputApplication().outputPorts.length; i++){
                var port = this.inputApplication().outputPorts[i];
                if (port.getId() === portId){
                    return "inputLocal";
                }
            }
        }

        // if node has an outputApplication, check those ports too
        if (this.hasOutputApplication()){
            for (var i = 0; i < this.outputApplication().inputPorts.length; i++){
                var port = this.outputApplication().inputPorts[i];
                if (port.getId() === portId){
                    return "outputLocal";
                }
            }
            for (var i = 0; i < this.outputApplication().outputPorts.length; i++){
                var port = this.outputApplication().outputPorts[i];
                if (port.getId() === portId){
                    return "output";
                }
            }
        }

        // if node has an exitApplication, check those ports too
        if (this.hasExitApplication()){
            for (var i = 0; i < this.exitApplication().inputPorts.length; i++){
                var port = this.exitApplication().inputPorts[i];
                if (port.getId() === portId){
                    return "outputLocal";
                }
            }
            for (var i = 0; i < this.exitApplication().outputPorts.length; i++){
                var port = this.exitApplication().outputPorts[i];
                if (port.getId() === portId){
                    return "output";
                }
            }
        }

        console.warn("Could not find port TYPE by Id (" + portId + ") on node " + this.getKey());
        return "";
    }

    findPortByName = (name : string, input : boolean, local : boolean) : Port => {
        console.assert(!local);

        if (input){
            // check input ports
            for (var i = 0; i < this.inputPorts.length; i++){
                var port = this.inputPorts[i];
                if (port.getName() === name){
                    return port;
                }
            }
        } else {
            // check output ports
            for (var i = 0; i < this.outputPorts.length; i++){
                var port = this.outputPorts[i];
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

    hasFieldWithName = (name : string) => {
        for (var i = 0 ; i < this.fields.length ; i++){
            if (this.fields[i].getName() === name){
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
        this.fields = [];
    }

    removeAllNonArgFields = () : Field[] => {
        var result : Field[] = [];

        for (var i = this.fields.length - 1 ; i >= 0 ; i--){
            var field : Field = this.fields[i];
            if (!Utils.isParameterArgument(field.getName())){
                result.push(this.fields.splice(i, 1)[0]);
            }
        }

        return result;
    }

    clone = () : Node => {
        var result : Node = new Node(this.key, this.name, this.description, this.category, this.categoryType, this.x, this.y);

        result.width = this.width;
        result.height = this.height;
        result.color = this.color;
        result.drawOrderHint = this.drawOrderHint;

        result.parentKey = this.parentKey;
        result.embedKey = this.embedKey;

        result.collapsed = this.collapsed;
        result.streaming = this.streaming;
        result.showPorts = this.showPorts;

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
        for (var i = 0; i < this.inputPorts.length; i++){
            result.addPort(this.inputPorts[i].clone(), true);
        }
        for (var i = 0; i < this.outputPorts.length; i++){
            result.addPort(this.outputPorts[i].clone(), false);
        }

        // clone fields
        for (var i = 0; i < this.fields.length; i++){
            result.fields.push(this.fields[i].clone());
        }

        result.expanded(this.expanded());
        result.selected(this.selected());

        return result;
    }

    // find the right icon for this node
    getIcon = () : string => {
        switch(this.category){
            case Eagle.Category.Start:
                return "play_arrow";
            case Eagle.Category.End:
                return "stop";
            case Eagle.Category.Comment:
                return "comment";
            case Eagle.Category.Description:
                return "note";
            case Eagle.Category.Scatter:
                return "call_split";
            case Eagle.Category.GroupBy:
                return "group_work";
            case Eagle.Category.Gather:
                return "call_merge";
            case Eagle.Category.PythonApp:
                return "extension";
            case Eagle.Category.File:
                return "description";
            case Eagle.Category.Memory:
                return "memory";
            case Eagle.Category.Docker:
                return "computer";
            case Eagle.Category.BashShellApp:
                return "arrow_forward_ios";
            case Eagle.Category.Loop:
                return "loop";
            case Eagle.Category.MKN:
                return "waves";
            case Eagle.Category.MPI:
                return "apps";
            case Eagle.Category.DynlibApp:
                return "menu_book";
            case Eagle.Category.Service:
                return "build";
            case Eagle.Category.ExclusiveForceNode:
                return "picture_in_picture";
            case Eagle.Category.Variables:
                return "tune";
            case Eagle.Category.Branch:
                return "share";
            default:
                console.warn("No icon for node with category", this.category);
                return "warning";
        }
    }

    getInputMultiplicity = () : number => {
        if (this.isMKN()){
            var m : Field = this.getFieldByName("m");

            if (m === null){
                console.warn("Unable to determine input multiplicity of MKN, no 'm' field. Using default value (1).");
                return 1;
            }

            return parseInt(m.getValue(), 10);
        }

        if (this.isGather()){
            var numInputs : Field = this.getFieldByName("num_of_inputs");

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
            var n : Field = this.getFieldByName("n");

            if (n === null){
                console.warn("Unable to determine output multiplicity of MKN, no 'n' field. Using default value (1).");
                return 1;
            }

            return parseInt(n.getValue(), 10);
        }

        if (this.isScatter()){
            var numCopies : Field = this.getFieldByName("num_of_copies");

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
            var k : Field = this.getFieldByName("k");

            if (k === null){
                console.warn("Unable to determine local multiplicity of MKN, no 'k' field. Using default value (1).");
                return 1;
            }

            return parseInt(k.getValue(), 10);
        }

        if (this.isScatter()){
            var numCopies = this.getFieldByName("num_of_copies");

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
        if (this.fields.length === 0){
            return "";
        }

        return this.fields[0].getValue();
    }

    customDataChanged = (eagle : Eagle, event : JQueryEventObject) : void => {
        var e : HTMLTextAreaElement = <HTMLTextAreaElement> event.originalEvent.target;

        console.log("customDataChanged()", e.value);

        // if no fields exist, create at least one, to store the custom data
        if (this.fields.length === 0){
            this.addField(new Field("", "", "", "", false, Eagle.FieldDataType.Unknown));
        }

        this.fields[0].setValue(e.value);

        eagle.flagActiveDiagramHasMutated();
    }

    findPortIsInputById = (portId: string) : boolean => {
        // find the port within the node
        for (var i = 0 ; i < this.inputPorts.length ; i++){
            var port : Port = this.inputPorts[i];
            if (port.getId() === portId){
                return true;
            }
        }

        for (var i = 0 ; i < this.outputPorts.length ; i++){
            var port : Port = this.outputPorts[i];
            if (port.getId() === portId){
                return false;
            }
        }

        // check input application ports
        if (this.hasInputApplication()){
            for (var i = 0 ; i < this.inputApplication().inputPorts.length ; i++){
                var port : Port = this.inputApplication().inputPorts[i];
                if (port.getId() === portId){
                    return false;
                }
            }

            for (var i = 0 ; i < this.inputApplication().outputPorts.length ; i++){
                var port : Port = this.inputApplication().outputPorts[i];
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

    static fromOJSJson = (nodeData : any) : Node => {
        var x = Node.DEFAULT_POSITION_X;
        var y = Node.DEFAULT_POSITION_Y;
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
        var category : string = GraphUpdater.translateOldCategory(nodeData.category);
        var categoryType : string = GraphUpdater.translateOldCategoryType(nodeData.categoryType, category);

        var node : Node = new Node(nodeData.key, nodeData.text, "", category, categoryType, x, y);

        // get description (if exists)
        if (typeof nodeData.description !== 'undefined'){
            node.description = nodeData.description;
        }

        // get size (if exists)
        var width = Node.DEFAULT_WIDTH;
        var height = Node.DEFAULT_HEIGHT;
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

        // selected
        if (typeof nodeData.selected !== 'undefined'){
            node.selected(nodeData.selected);
        }

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

        // debug
        //console.log("inputAppName", nodeData.inputAppName, "inputApplicationName", nodeData.inputApplicationName);
        //console.log("outputAppName", nodeData.outputAppName, "outputApplicationName", nodeData.outputApplicationName);
        //console.log("exitAppName", nodeData.exitAppName, "exitApplicationName", nodeData.exitApplicationName);

        // these next six if statements are covering old versions of nodes, that
        // specified input and output applications using name strings rather than nested nodes.
        // NOTE: the key for the new nodes are not set correctly, they will have to be overwritten later
        if (nodeData.inputAppName !== undefined && nodeData.inputAppName !== ""){
            node.inputApplication(Node.createEmbeddedApplicationNode(nodeData.inputAppName, nodeData.inputApplicationType, node.getKey()));
        }

        if (nodeData.inputApplicationName !== undefined && nodeData.inputApplicationName !== ""){
            node.inputApplication(Node.createEmbeddedApplicationNode(nodeData.inputApplicationName, nodeData.inputApplicationType, node.getKey()));
        }

        if (nodeData.outputAppName !== undefined && nodeData.outputAppName !== ""){
            node.outputApplication(Node.createEmbeddedApplicationNode(nodeData.outputAppName, nodeData.outputApplicationType, node.getKey()));
        }

        if (nodeData.outputApplicationName !== undefined && nodeData.outputApplicationName !== ""){
            node.outputApplication(Node.createEmbeddedApplicationNode(nodeData.outputApplicationName, nodeData.outputApplicationType, node.getKey()));
        }

        if (nodeData.exitAppName !== undefined && nodeData.exitAppName !== ""){
            node.exitApplication(Node.createEmbeddedApplicationNode(nodeData.exitAppName, nodeData.exitApplicationType, node.getKey()));
        }

        if (nodeData.exitApplicationName !== undefined && nodeData.exitApplicationName !== ""){
            node.exitApplication(Node.createEmbeddedApplicationNode(nodeData.exitApplicationName, nodeData.exitApplicationType, node.getKey()));
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
            node.inputApplication(Node.createEmbeddedApplicationNode(nodeData.application, category, node.getKey()));
        }

        // read the 'real' input and output apps, correctly specified as nested nodes
        if (typeof nodeData.inputApplication !== 'undefined' && nodeData.inputApplication !== null){
            node.inputApplication(Node.fromOJSJson(nodeData.inputApplication));
            node.inputApplication().setEmbedKey(node.getKey());
        }
        if (typeof nodeData.outputApplication !== 'undefined' && nodeData.outputApplication !== null){
            node.outputApplication(Node.fromOJSJson(nodeData.outputApplication));
            node.outputApplication().setEmbedKey(node.getKey());
        }
        if (typeof nodeData.exitApplication !== 'undefined' && nodeData.exitApplication !== null){
            node.exitApplication(Node.fromOJSJson(nodeData.exitApplication));
            node.exitApplication().setEmbedKey(node.getKey());
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
                let portData = nodeData.inputPorts[j];
                let port = new Port(portData.Id, portData.IdText, false);

                if (node.hasInputApplication()){
                    console.log("read inputPort to inputApp inputPort");
                    node.inputApplication().addPort(port, true);
                    port.setNodeKey(node.getKey());
                } else {
                    console.log("read inputPort to inputPort");
                    node.addPort(port, true);
                }
            }
        }

        // add output ports
        if (typeof nodeData.outputPorts !== 'undefined'){
            for (let j = 0 ; j < nodeData.outputPorts.length; j++){
                let portData = nodeData.outputPorts[j];
                let port = new Port(portData.Id, portData.IdText, false);

                if (node.hasOutputApplication()){
                    console.log("read outputPort to outputApp outputPort");
                    node.outputApplication().addPort(port, false);
                    port.setNodeKey(node.getKey());
                }
                if (node.hasExitApplication()){
                    console.log("read outputPort to exitApp outputPort");
                    node.exitApplication().addPort(port, false);
                    port.setNodeKey(node.getKey());
                }
                if (!node.hasOutputApplication() && !node.hasInputApplication()){
                    console.log("read outputPort to outputPort");
                    node.addPort(port, false);
                }
            }
        }

        // add input local ports
        if (typeof nodeData.inputLocalPorts !== 'undefined'){
            for (var j = 0 ; j < nodeData.inputLocalPorts.length; j++){
                var portData = nodeData.inputLocalPorts[j];
                if (node.hasInputApplication()){
                    let p = new Port(portData.Id, portData.IdText, false);
                    console.log("read inputLocalPort to inputApp outputPort");
                    node.inputApplication().addPort(p, false); // I or O?
                    p.setNodeKey(node.getKey());
                } else {
                    console.warn("Can't add inputLocal port", portData.IdText, "to node", node.getName());
                }
            }
        }

        // add output local ports
        if (typeof nodeData.outputLocalPorts !== 'undefined'){
            for (var j = 0 ; j < nodeData.outputLocalPorts.length; j++){
                var portData = nodeData.outputLocalPorts[j];
                if (node.hasOutputApplication()){
                    let p = new Port(portData.Id, portData.IdText, false);
                    console.log("read outputLocalPort to outputApp inputPort");
                    node.outputApplication().addPort(p, true); // I or O?
                    p.setNodeKey(node.getKey());
                }

                if (node.hasExitApplication()){
                    let p = new Port(portData.Id, portData.IdText, false);
                    console.log("read outputLocalPort to exitApp inputPort");
                    node.exitApplication().addPort(p, true); // I or O?
                    p.setNodeKey(node.getKey());
                }

                if (!node.hasOutputApplication() && !node.hasExitApplication()){
                    console.warn("Can't add outputLocal port", portData.IdText, "to node", node.getName());
                }
            }
        }

        // add fields
        if (typeof nodeData.fields !== 'undefined'){
            for (var j = 0 ; j < nodeData.fields.length ; j++){
                var fieldData = nodeData.fields[j];
                var fieldDescription : string = fieldData.description === undefined ? "" : fieldData.description;
                var fieldReadonly : boolean = fieldData.readonly === undefined ? false : fieldData.readonly;
                var fieldType : Eagle.FieldDataType = fieldData.type === undefined ? Eagle.FieldDataType.Unknown : fieldData.type;
                node.addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription, fieldReadonly, fieldType));
            }
        }

        // add inputAppFields
        if (typeof nodeData.inputAppFields !== 'undefined'){
            for (var j = 0 ; j < nodeData.inputAppFields.length ; j++){
                var fieldData = nodeData.inputAppFields[j];
                var fieldDescription : string = fieldData.description === undefined ? "" : fieldData.description;
                var fieldReadonly : boolean = fieldData.readonly === undefined ? false : fieldData.readonly;
                var fieldType : Eagle.FieldDataType = fieldData.type === undefined ? Eagle.FieldDataType.Unknown : fieldData.type;
                node.inputApplication().addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription, fieldReadonly, fieldType));
            }
        }

        // add outputAppFields
        if (typeof nodeData.outputAppFields !== 'undefined'){
            for (var j = 0 ; j < nodeData.outputAppFields.length ; j++){
                var fieldData = nodeData.outputAppFields[j];
                var fieldDescription : string = fieldData.description === undefined ? "" : fieldData.description;
                var fieldReadonly : boolean = fieldData.readonly === undefined ? false : fieldData.readonly;
                var fieldType : Eagle.FieldDataType = fieldData.type === undefined ? Eagle.FieldDataType.Unknown : fieldData.type;
                node.outputApplication().addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription, fieldReadonly, fieldType));
            }
        }

        // add exitAppFields
        if (typeof nodeData.exitAppFields !== 'undefined'){
            for (var j = 0 ; j < nodeData.exitAppFields.length ; j++){
                var fieldData = nodeData.exitAppFields[j];
                var fieldDescription : string = fieldData.description === undefined ? "" : fieldData.description;
                var fieldReadonly : boolean = fieldData.readonly === undefined ? false : fieldData.readonly;
                var fieldType : Eagle.FieldDataType = fieldData.type === undefined ? Eagle.FieldDataType.Unknown : fieldData.type;
                node.exitApplication().addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription, fieldReadonly, fieldType));
            }
        }

        return node;
    }

    private static copyPorts(src: Port[], dest: {}[]):void{
        for (var i = 0 ; i < src.length; i++){
            dest.push(Port.toOJSJson(src[i]));
        }
    }

    static toOJSJson = (node : Node) : object => {
        var result : any = {};

        let useNewCategories : boolean = Eagle.findSettingValue(Utils.TRANSLATE_WITH_NEW_CATEGORIES);

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
        result.streaming = node.streaming;
        result.subject = node.subject;
        result.selected = node.selected();
        result.expanded = node.expanded();

        if (node.parentKey !== null){
            result.group = node.parentKey;
        }

        if (node.embedKey !== null){
            result.embedKey = node.embedKey;
        }

        // add input ports
        result.inputPorts = [];
        if (node.hasInputApplication()){
            console.log("copy", node.inputApplication().inputPorts.length, "inputApp inputPorts to result inputPorts")
            Node.copyPorts(node.inputApplication().inputPorts, result.inputPorts);
        } else {
            console.log("copy", node.inputPorts.length, "inputPorts to result inputPorts")
            Node.copyPorts(node.inputPorts, result.inputPorts);
        }

        // add output ports
        result.outputPorts = [];
        if (node.hasOutputApplication()){
            // add outputApp output ports here
            console.log("copy", node.outputApplication().outputPorts.length, "outputApp outputPorts to result outputPorts")
            Node.copyPorts(node.outputApplication().outputPorts, result.outputPorts);
        }
        if (node.hasExitApplication()){
            // add exitApp output ports here
            console.log("copy", node.exitApplication().outputPorts.length, "exitApp outputPorts to result outputPorts")
            Node.copyPorts(node.exitApplication().outputPorts, result.outputPorts);
        }
        if (!node.hasOutputApplication() && !node.hasExitApplication()){
            console.log("copy", node.outputPorts.length, "outputPorts to result outputPorts")
            Node.copyPorts(node.outputPorts, result.outputPorts);
        }

        // add input ports from the inputApplication
        // ! should be inputApp output ports - i think !
        result.inputLocalPorts = [];
        if (node.hasInputApplication()){
            for (var i = 0 ; i < node.inputApplication().outputPorts.length ; i++){
                var port = node.inputApplication().outputPorts[i];

                result.inputLocalPorts.push(Port.toOJSJson(port));
                console.log("copy inputApp outputPort to result inputLocalPorts");
            }
        }

        // add input ports from the outputApplication
        // ! should be outputApp input ports - i think !
        // ! AND       exitApp input ports - i think !
        result.outputLocalPorts = [];
        if (node.hasOutputApplication()){
            for (var i = 0 ; i < node.outputApplication().inputPorts.length ; i++){
                var port = node.outputApplication().inputPorts[i];

                result.outputLocalPorts.push(Port.toOJSJson(port));
                console.log("copy outputApp inputPort to result outputLocalPorts");
            }
        }
        if (node.hasExitApplication()){
            for (var i = 0 ; i < node.exitApplication().inputPorts.length ; i++){
                var port = node.exitApplication().inputPorts[i];

                result.outputLocalPorts.push(Port.toOJSJson(port));
                console.log("copy exitApp inputPort to result outputLocalPorts");
            }
        }

        // add fields
        result.fields = [];
        for (var i = 0 ; i < node.fields.length ; i++){
            let field = node.fields[i];
            result.fields.push(Field.toOJSJson(field));
        }

        // add fields from inputApplication
        result.inputAppFields = [];
        if (node.hasInputApplication()){
            for (var i = 0 ; i < node.inputApplication().fields.length ; i++){
                let field = node.inputApplication().fields[i];
                result.inputAppFields.push(Field.toOJSJson(field));
            }
        }

        // add fields from outputApplication
        result.outputAppFields = [];
        if (node.hasOutputApplication()){
            for (var i = 0 ; i < node.outputApplication().fields.length ; i++){
                let field = node.outputApplication().fields[i];
                result.outputAppFields.push(Field.toOJSJson(field));
            }
        }

        // add fields from exitApplication
        result.exitAppFields = [];
        if (node.hasExitApplication()){
            for (var i = 0 ; i < node.exitApplication().fields.length ; i++){
                let field = node.exitApplication().fields[i];
                result.exitAppFields.push(Field.toOJSJson(field));
            }
        }

        // write application names and types
        if (node.hasInputApplication()){
            result.inputApplicationName = node.inputApplication().name;
            result.inputApplicationType = node.inputApplication().category;
        } else {
            result.inputApplicationName = "";
            result.inputApplicationType = Eagle.Category.None;
        }
        if (node.hasOutputApplication()){
            result.outputApplicationName = node.outputApplication().name;
            result.outputApplicationType = node.outputApplication().category;
        } else {
            result.outputApplicationName = "";
            result.outputApplicationType = Eagle.Category.None;
        }
        if (node.hasExitApplication()){
            result.exitApplicationName = node.exitApplication().name;
            result.exitApplicationType = node.exitApplication().category;
        } else {
            result.exitApplicationName = "";
            result.exitApplicationType = Eagle.Category.None;
        }

        return result;
    }

    // display/visualisation data
    static toV3NodeJson = (node : Node, index : number) : object => {
        var result : any = {};

        result.componentKey = index.toString();

        result.color = node.color;
        result.drawOrderHint = node.drawOrderHint;

        result.x = node.x;
        result.y = node.y;
        result.width = node.width;
        result.height = node.height;
        result.collapsed = node.collapsed;
        result.showPorts = node.showPorts;

        result.selected = node.selected();
        result.expanded = node.expanded();

        return result;
    }

    // graph data
    // "name" and "description" are considered part of the structure of the graph, it would be hard to add them to the display part (parameters would have to be treated the same way)
    static toV3ComponentJson = (node : Node) : object => {
        let result : any = {};

        let useNewCategories : boolean = Eagle.findSettingValue(Utils.TRANSLATE_WITH_NEW_CATEGORIES);

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
        for (let i = 0 ; i < node.inputPorts.length; i++){
            let port = node.inputPorts[i];
            result.inputPorts[port.getId()] = Port.toV3Json(port);
        }

        // add output ports
        result.outputPorts = {};
        for (let i = 0 ; i < node.outputPorts.length; i++){
            let port = node.outputPorts[i];
            result.outputPorts[port.getId()] = Port.toV3Json(port);
        }

        // add parameters
        result.parameters = {};
        for (let i = 0 ; i < node.fields.length ; i++){
            let field = node.fields[i];
            result.parameters[i] = Field.toV3Json(field);
        }

        return result;
    }

    static createEmbeddedApplicationNode = (name : string, category: Eagle.Category, embedKey: number) : Node => {
        console.log("createEmbeddedApplicationNode(", name, category, ")");
        let n = new Node(null, name, "", category, Eagle.CategoryType.Application, Node.DEFAULT_POSITION_X, Node.DEFAULT_POSITION_Y);
        n.setEmbedKey(embedKey);
        return n;
    }
}
