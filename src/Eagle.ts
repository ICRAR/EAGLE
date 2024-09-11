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

"use strict";

import * as ko from "knockout";

import { Category } from './Category';
import { ComponentUpdater } from './ComponentUpdater';
import { Daliuge } from './Daliuge';
import { DockerHubBrowser } from "./DockerHubBrowser";
import { EagleConfig } from "./EagleConfig";
import { Edge } from './Edge';
import { Errors } from './Errors';
import { ExplorePalettes } from './ExplorePalettes';
import { Field } from './Field';
import { FileInfo } from './FileInfo';
import { GitHub } from './GitHub';
import { GitLab } from './GitLab';
import { GraphRenderer } from "./GraphRenderer";
import { Hierarchy } from './Hierarchy';
import { KeyboardShortcut } from './KeyboardShortcut';
import { StatusEntry } from './StatusEntry';
import { LogicalGraph } from './LogicalGraph';
import { Modals } from "./Modals";
import { Node } from './Node';
import { Palette } from './Palette';
import { ParameterTable } from './ParameterTable';
import { Repositories } from './Repositories';
import { Repository } from './Repository';
import { RepositoryFile } from './RepositoryFile';
import { RightClick } from "./RightClick";
import { Setting, SettingsGroup } from './Setting';
import { SideWindow } from './SideWindow';
import { Translator } from './Translator';
import { Tutorial, tutorialArray } from './Tutorial';
import { Undo } from './Undo';
import { UiModeSystem } from './UiModes';
import { Utils } from './Utils';
import { GraphUpdater } from "./GraphUpdater";


export class Eagle {
    static _instance : Eagle;

    palettes : ko.ObservableArray<Palette>;
    logicalGraph : ko.Observable<LogicalGraph>;
    tutorial : ko.Observable<Tutorial>;

    eagleIsReady : ko.Observable<boolean>;

    leftWindow : ko.Observable<SideWindow>;
    rightWindow : ko.Observable<SideWindow>;

    selectedObjects : ko.ObservableArray<Node|Edge>;
    static selectedLocation : ko.Observable<Eagle.FileType>;
    currentField :ko.Observable<Field>;

    static selectedRightClickObject : ko.Observable<any>;
    static selectedRightClickLocation : ko.Observable<Eagle.FileType>;
    static selectedRightClickPosition : {x: number, y: number} = {x:0, y:0}

    repositories: ko.Observable<Repositories>;
    translator : ko.Observable<Translator>;
    undo : ko.Observable<Undo>;
    parameterTable : ko.Observable<ParameterTable>;

    globalOffsetX : ko.Observable<number>;
    globalOffsetY : ko.Observable<number>;
    globalScale : ko.Observable<number>;

    quickActionSearchTerm : ko.Observable<string>;
    quickActionOpen : ko.Observable<boolean>;

    rendererFrameDisplay : ko.Observable<string>;
    rendererFrameMax : number;
    rendererFrameCountRender : number;
    rendererFrameCountTick : number;

    explorePalettes : ko.Observable<ExplorePalettes>;
    dockerHubBrowser : ko.Observable<DockerHubBrowser>;

    // TODO: move these to GraphRenderer.ts
    isDragging : ko.Observable<boolean>;
    draggingNode : ko.Observable<Node>;
    draggingPaletteNode : boolean;

    errorsMode : ko.Observable<Errors.Mode>;
    graphWarnings : ko.ObservableArray<Errors.Issue>;
    graphErrors : ko.ObservableArray<Errors.Issue>;
    loadingWarnings : ko.ObservableArray<Errors.Issue>;
    loadingErrors : ko.ObservableArray<Errors.Issue>;
    tableModalType : ko.Observable<string>;
    showTableModal : ko.Observable<boolean>;
    currentFileInfo : ko.Observable<FileInfo>;
    currentFileInfoTitle : ko.Observable<string>;
    hierarchyMode : ko.Observable<boolean>; //we need this to be able to keep the right window in the hierarchy tab if the user is actively using it, but otherwise always switch the right window to the inspector.

    showDataNodes : ko.Observable<boolean>;
    snapToGrid : ko.Observable<boolean>;

    static paletteComponentSearchString : ko.Observable<string>;
    static componentParamsSearchString : ko.Observable<string>;
    static applicationArgsSearchString : ko.Observable<string>;
    static constructParamsSearchString : ko.Observable<string>;
    static tableSearchString : ko.Observable<string>;

    static settings : SettingsGroup[];
    static shortcuts : KeyboardShortcut[];
    static tutorials : Tutorial[];

    static dragStartX : number;
    static lastClickTime : number = 0;

    static nodeDropLocation : {x: number, y: number} = {x:0, y:0}; // if this remains x=0,y=0, the button has been pressed and the getNodePosition function will be used to determine a location on the canvas. if not x:0, y:0, it has been over written by the nodeDrop function as the node has been dragged into the canvas. The node will then be placed into the canvas using these co-ordinates.
    static nodeDragPaletteIndex : number;
    static nodeDragComponentIndex : number;
    static shortcutModalCooldown : number;

    constructor(){
        Eagle._instance = this;
        Eagle.settings = Setting.getSettings();
        UiModeSystem.initialise()
        Eagle.shortcuts = KeyboardShortcut.getShortcuts();

        this.palettes = ko.observableArray();
        this.logicalGraph = ko.observable(null);
        this.eagleIsReady = ko.observable(false);

        this.leftWindow = ko.observable(new SideWindow(Eagle.LeftWindowMode.Palettes, Utils.getLeftWindowWidth(), false));
        this.rightWindow = ko.observable(new SideWindow(Eagle.RightWindowMode.Repository, Utils.getRightWindowWidth(), true));

        this.selectedObjects = ko.observableArray([]).extend({ deferred: true });
        Eagle.selectedLocation = ko.observable(Eagle.FileType.Unknown);
        this.currentField = ko.observable(null);

        Eagle.selectedRightClickObject = ko.observable();
        Eagle.selectedRightClickLocation = ko.observable(Eagle.FileType.Unknown);

        this.repositories = ko.observable(new Repositories());
        this.translator = ko.observable(new Translator());
        this.undo = ko.observable(new Undo());
        this.parameterTable = ko.observable(new ParameterTable());
        
        //load parameter table visibility from local storage
        ParameterTable.getActiveColumnVisibility().loadFromLocalStorage()

        Eagle.componentParamsSearchString = ko.observable("");
        Eagle.paletteComponentSearchString = ko.observable("");
        Eagle.applicationArgsSearchString = ko.observable("");
        Eagle.constructParamsSearchString = ko.observable("");
        Eagle.tableSearchString = ko.observable("");

        Eagle.tutorials = tutorialArray
        this.tutorial = ko.observable(Eagle.tutorials[0]);

        Eagle.nodeDragPaletteIndex = null;
        Eagle.nodeDragComponentIndex = null;

        this.globalOffsetX = ko.observable(0);
        this.globalOffsetY = ko.observable(0);
        this.globalScale = ko.observable(1.0);

        this.quickActionSearchTerm = ko.observable('')
        this.quickActionOpen = ko.observable(false)

        this.rendererFrameDisplay = ko.observable("");
        this.rendererFrameMax = 0;
        this.rendererFrameCountRender = 0;
        this.rendererFrameCountTick = 0;

        this.explorePalettes = ko.observable(new ExplorePalettes());
        this.dockerHubBrowser = ko.observable(new DockerHubBrowser());

        this.isDragging = ko.observable(false);
        this.draggingNode = ko.observable(null);
        this.draggingPaletteNode = false;
        this.errorsMode = ko.observable(Errors.Mode.Loading);
        this.graphWarnings = ko.observableArray([]);
        this.graphErrors = ko.observableArray([]);
        this.loadingWarnings = ko.observableArray([]);
        this.loadingErrors = ko.observableArray([]);

        this.tableModalType = ko.observable('')
        this.showTableModal = ko.observable(false)
        this.currentFileInfo = ko.observable(null);
        this.currentFileInfoTitle = ko.observable("");
        this.hierarchyMode = ko.observable(false)

        this.showDataNodes = ko.observable(true);
        this.snapToGrid = ko.observable(false);

        this.selectedObjects.subscribe(function(){
            //TODO check if the selectedObjects array has changed, if not, abort
            GraphRenderer.nodeData = GraphRenderer.depthFirstTraversalOfNodes(this.logicalGraph(), this.showDataNodes());
            Hierarchy.updateDisplay()
            if(this.selectedObjects().length === 0){
                this.tableModalType('keyParametersTableModal')
                //changing right window shortcuts depending on if right window tabs are visible or not 
                KeyboardShortcut.changeShortcutKey(this,'open_translation','3',KeyboardShortcut.Modifier.None)
                KeyboardShortcut.changeShortcutKey(this,'open_hierarchy','2',KeyboardShortcut.Modifier.None)
                KeyboardShortcut.changeShortcutKey(this,'open_inspector','4',KeyboardShortcut.Modifier.None)
            }else{
                KeyboardShortcut.changeShortcutKey(this,'open_hierarchy','3',KeyboardShortcut.Modifier.None)
                KeyboardShortcut.changeShortcutKey(this,'open_translation','4',KeyboardShortcut.Modifier.None)
                KeyboardShortcut.changeShortcutKey(this,'open_inspector','2',KeyboardShortcut.Modifier.None)
            }

            Hierarchy.scrollToNode()
        }, this)

        this.rightWindow().mode.subscribe(function(newValue){
            if (newValue === Eagle.RightWindowMode.Hierarchy){
                window.setTimeout(function(){
                    Hierarchy.updateDisplay()
                }, 100)
            }
        }, this)
    }

    static getInstance() : Eagle {
        return Eagle._instance;
    }

    areAnyFilesModified = () : boolean => {
        // check the logical graph
        if (this.logicalGraph().fileInfo().modified){
            return true;
        }

        // check all the open palettes
        for (const palette of this.palettes()){
            if (palette.fileInfo().modified){
                return true;
            }
        }
        return false;
    }

    static selectedNodePalette() : Palette {
        const eagle : Eagle = Eagle.getInstance();

        for (const palette of eagle.palettes()){
            for (const node of palette.getNodes()){
                if (Node.match(node, eagle.selectedNode())){
                    return palette;
                }
            }
        }

        return null;
    }

    showPerformanceDisplay : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return Setting.findValue(Setting.ENABLE_PERFORMANCE_DISPLAY);
    }, this);

    types : ko.PureComputed<string[]> = ko.pureComputed(() => {
        // add all the built-in types
        const result: string[] = [
            Daliuge.DataType.Boolean,
            Daliuge.DataType.Float,
            Daliuge.DataType.Integer,
            Daliuge.DataType.Json,
            Daliuge.DataType.Object,
            Daliuge.DataType.Password,
            Daliuge.DataType.Python,
            Daliuge.DataType.Select,
            Daliuge.DataType.String
        ];

        // add additional custom types
        switch (Eagle.selectedLocation()){
            case Eagle.FileType.Palette:
                // build a list from the selected component in the palettes
                if(this.selectedNode() !== null){

                    for (const field of this.selectedNode().getFields()) {
                        Utils.addTypeIfUnique(result, field.getType());
                    }
                }else{
                    console.warn('selected node is null when selecting palette component')
                }
                break;
            case Eagle.FileType.Graph:
            default:
                // build a list from all nodes in the current logical graph
                for (const node of this.logicalGraph().getNodes()){
                    for (const field of node.getFields()) {
                        Utils.addTypeIfUnique(result, field.getType());
                    }

                    // also check for fields that belong to the inputApplication
                    if (node.hasInputApplication()){
                        for (const field of node.getInputApplication().getFields()){
                            Utils.addTypeIfUnique(result, field.getType());
                        }
                    }

                    // also check for fields that belong to the outputApplication
                    if (node.hasOutputApplication()){
                        for (const field of node.getOutputApplication().getFields()){
                            Utils.addTypeIfUnique(result, field.getType());
                        }
                    }
                }
                break;
        }
        

        return result;
    }, this);

    toggleShowDataNodes = () : void => {
        // when we switch show/hide data nodes, some of the selected objects may become invisible,
        // and some of the selected objects may have not existed in the first place,
        // so it seems easier to just empty the selection
        this.selectedObjects([]);

        this.showDataNodes(!this.showDataNodes());
    }

    toggleSnapToGrid = () : void => {
        this.snapToGrid(!this.snapToGrid());

        // store in settings
        Setting.setValue(Setting.SNAP_TO_GRID, this.snapToGrid());
    }

    deployDefaultTranslationAlgorithm = () : void => {
        const defaultTranslatorAlgorithmMethod : string = $('#'+Setting.findValue(Setting.TRANSLATOR_ALGORITHM_DEFAULT)+ ' .generatePgt').val().toString()
        this.translator().genPGT(defaultTranslatorAlgorithmMethod, false, Daliuge.SchemaVersion.Unknown)
    }

    // TODO: remove?
    flagActiveFileModified = () : void => {
        if (this.logicalGraph()){
            this.logicalGraph().fileInfo().modified = true;
        }
    }

    getTabTitle : ko.PureComputed<string> = ko.pureComputed(() => {
        // Adding a star symbol in front of the title if file is modified.
        let mod = '';

        if (this.logicalGraph() === null){
            return "";
        }

        const fileInfo : FileInfo = this.logicalGraph().fileInfo();

        if (fileInfo === null){
            return "";
        }

        if (fileInfo.modified){
            mod = '*';
        }

        // Display file name in tab title if non-empty
        const fileName = fileInfo.name;

        if (fileName === ""){
            return "EAGLE";
        } else {
            return mod + "EAGLE: " + fileName;
        }
    }, this);

    // generate a list of Application nodes within the open palettes
    getApplications = () : Node[] => {
        const list: Node[] = [];

        for (const palette of this.palettes()){
            for (const node of palette.getNodes()){
                if (node.isApplication()){
                    list.push(node);
                }
            }
        }

        return list;
    }

    isTranslationDefault = (algorithmName:string) : boolean => {
        return algorithmName === Setting.findValue(Setting.TRANSLATOR_ALGORITHM_DEFAULT)
    }

    getKeyAttributeDisplay = (isKeyAttribute : boolean) : string => {
        if(!isKeyAttribute){
            return '<i class="material-icons">favorite_border</i>'
        }else{
            return '<i class="material-icons">favorite</i>'
        }
    }

    repositoryFileName : ko.PureComputed<string> = ko.pureComputed(() => {
        if (this.logicalGraph() === null){
            return "";
        }

        const fileInfo : FileInfo = this.logicalGraph().fileInfo();

        // if no FileInfo is available, return empty string
        if (fileInfo === null){
            return "";
        }

        return fileInfo.getText();
    }, this);

    toggleWindows = () : void  => {
        this.rightWindow().toggleShown()
        this.leftWindow().toggleShown()
    }

    emptySearchBar = (target : ko.Observable,data:string, event : Event) => {
        target("")
        $(event.target).parent().hide()
    }

    setSearchBarClearBtnState = (data:string, event : Event) => {
        if($(event.target).val() === ""){
            $(event.target).parent().find('a').hide()
        }else{
            $(event.target).parent().find('a').show()
        }
    }

    zoomIn = () : void => {
        // changed the equations to make the speed a curve and prevent the graph from inverting
        this.globalScale(Math.abs(this.globalScale() + this.globalScale()*0.2));
    }

    zoomOut = () : void => {
        this.globalScale(Math.abs(this.globalScale() - this.globalScale()*0.2));
    }

    zoomToFit = () : void => {
        console.error("Not implemented!");
    }

    getEagleIsReady = () : string => {
        if(this.eagleIsReady()){
            return 'visible'
        }else{
            return 'hidden'
        }
    }

    toggleGrid = () : void => {
        console.error("Not implemented!");
    }

    getGraphTextScale = () : number => {
        const scale = 1/this.globalScale()

        if(scale<0.7){
            return 0.6
        }else if(scale>1.3){
            return 1.3
        }else{
            return scale
        }
    }

    centerGraph = () : void => {
        const that = this

        // if there are no nodes in the logical graph, abort
        if (that.logicalGraph().getNumNodes() === 0){
            return;
        }

        // iterate over all nodes in graph and record minimum and maximum extents in X and Y
        let minX : number = Number.MAX_VALUE;
        let minY : number = Number.MAX_VALUE;
        let maxX : number = -Number.MAX_VALUE;
        let maxY : number = -Number.MAX_VALUE;
        for (const node of that.logicalGraph().getNodes()){
            if (node.getPosition().x - node.getRadius() < minX){
                minX = node.getPosition().x - node.getRadius();
            }
            if (node.getPosition().y - node.getRadius() < minY){
                minY = node.getPosition().y - node.getRadius();
            }
            if (node.getPosition().x + node.getRadius() > maxX){
                maxX = node.getPosition().x + node.getRadius();
            }
            if (node.getPosition().y + node.getRadius() > maxY){
                maxY = node.getPosition().y + node.getRadius();
            }
        }
        // determine the centroid of the graph
        const centroidX = minX + ((maxX - minX) / 2);
        const centroidY = minY + ((maxY - minY) / 2);
        

        //calculating scale multipliers needed for each, height and width in order to fit the graph
        const containerHeight = $('#logicalGraphParent').height()
        const graphHeight = maxY-minY+200
        const graphYScale = containerHeight/graphHeight
        

        //we are taking into account the current widths of the left and right windows
        let leftWindow = 0
        if(that.leftWindow().shown()){
            leftWindow = that.leftWindow().width()
        }
        
        let rightWindow = 0
        if(that.rightWindow().shown()){
            rightWindow = that.rightWindow().width()
        }

        const containerWidth = $('#logicalGraphParent').width() - leftWindow - rightWindow
        const graphWidth = maxX-minX+200
        const graphXScale = containerWidth/graphWidth

        // reset scale to center the graph correctly
        that.globalScale(1)

        //determine center of the display area
        const displayCenterX : number = (containerWidth / that.globalScale() / 2);
        const displayCenterY : number = $('#logicalGraphParent').height() / that.globalScale() / 2;

        // translate display to center the graph centroid
        that.globalOffsetX(Math.round(displayCenterX - centroidX + leftWindow));
        that.globalOffsetY(Math.round(displayCenterY - centroidY));

        //taking note of the screen center in graph space before zooming
        const midPointX = $('#logicalGraphParent').width()/2
        const midPointY = ($('#logicalGraphParent').height())/2
        const xpb = midPointX/that.globalScale() - that.globalOffsetX();
        const ypb = (midPointY)/that.globalScale() - that.globalOffsetY();

        //applying the correct zoom
        if(graphYScale>graphXScale){
            that.globalScale(graphXScale);
        }else if(graphYScale<graphXScale){
            that.globalScale(graphYScale)
        }else{
            that.globalScale(1)
        }
        
        //checking the screen center in graph space after zoom
        const xpa = midPointX/that.globalScale() - that.globalOffsetX();
        const ypa = (midPointY)/that.globalScale() - that.globalOffsetY();

        //checking how far the center has moved
        const moveX = xpa-xpb
        const moveY = ypa-ypb

        //correcting for the movement
        that.globalOffsetX(that.globalOffsetX()+moveX)
        that.globalOffsetY(that.globalOffsetY()+moveY)
    }

    getSelectedText = () : string => {
        let nodeCount = 0
        let edgeCount = 0
        this.selectedObjects().forEach(function(element){
            if(element instanceof Node){
                nodeCount++
            }else if (element instanceof Edge){
                edgeCount++
            }
        })

        const text =  nodeCount + " nodes and " + edgeCount + " edges."

        return text
    }

    getTotalText = () : string => {
        const nodeCount = this.logicalGraph().getNodes().length
        const edgeCount = this.logicalGraph().getEdges().length
        const text =  nodeCount + " nodes and " + edgeCount + " edges."

        return text
    }

    getNumSelectedNodes = () : number => {
        let nodeCount = 0
        this.selectedObjects().forEach(function(element){
            if(element instanceof Node){
                nodeCount++
            }
        })
        return nodeCount
    }

    getNumSelectedEdges = () : number => {
        let edgeCount = 0
        this.selectedObjects().forEach(function(element){
            if(element instanceof Edge){
                edgeCount++
            }
        })
        return edgeCount
    }

    /**
     * This function is repeatedly called throughout the EAGLE operation.
     * It resets al fields in the editor menu.
     */
    resetEditor = () : void => {
        this.selectedObjects([]);
        Eagle.selectedLocation(Eagle.FileType.Unknown);

        // Show the last open repository.
        if(this.rightWindow().mode() === Eagle.RightWindowMode.Inspector){
            this.rightWindow().mode(Eagle.RightWindowMode.Repository);
        }
    }

    // if selectedObjects contains nothing but one node, return the node, else null
    selectedNode : ko.PureComputed<Node> = ko.pureComputed(() : Node => {
        if (this.selectedObjects().length !== 1){
            return null;
        }

        const object = this.selectedObjects()[0];

        if (object instanceof Node){
            return object;
        } else {
            return null;
        }
    }, this);

    // if selectedObjects contains nothing but one edge, return the edge, else null
    selectedEdge : ko.PureComputed<Edge> = ko.pureComputed(() : Edge => {
        if (this.selectedObjects().length !== 1){
            return null;
        }

        const object = this.selectedObjects()[0];

        if (object instanceof Edge){
            return object;
        } else {
            return null;
        }
    }, this);

    setSelection = (rightWindowMode : Eagle.RightWindowMode, selection : Node | Edge, selectedLocation: Eagle.FileType) : void => {
        Eagle.selectedLocation(selectedLocation);
        GraphRenderer.clearPortPeek()

        if (selection === null){
            this.selectedObjects([]);
            this.rightWindow().mode(rightWindowMode);
        } else {
            this.selectedObjects([selection]);

            //show the title of the port on either side of the edge we are selecting
            if(selection instanceof Edge){
                GraphRenderer.setPortPeekForEdge(selection,true)
            }

            //special case if we are selecting multiple things in a palette
            if(selectedLocation === Eagle.FileType.Palette){
                this.hierarchyMode(false)
                this.rightWindow().mode(Eagle.RightWindowMode.Inspector) 
                return
            }
            
            //if the set selection request came from a hierarchy node, the we set the hierarchy mode to true
            if(rightWindowMode === Eagle.RightWindowMode.Hierarchy){
                this.hierarchyMode(true)
            }
            
            //if we have not specifically asked for hierarchy mode, by either interacting with the hierarchy or selected the tab, then we always swap to the inspector.
            if(!this.hierarchyMode()){
                this.rightWindow().mode(Eagle.RightWindowMode.Inspector)
            }else{
                this.rightWindow().mode(Eagle.RightWindowMode.Hierarchy)
            }
        }
    }

    editSelection = (rightWindowMode : Eagle.RightWindowMode, selection : Node | Edge, selectedLocation: Eagle.FileType) : void => {
        // check that location is the same, otherwise default back to set
        if (selectedLocation !== Eagle.selectedLocation() && this.selectedObjects().length > 0){
            Utils.showNotification("Selection Error", "Can't add object from " + selectedLocation + " to existing selected objects in " + Eagle.selectedLocation(), "warning");
            return;
        } else {
            Eagle.selectedLocation(selectedLocation);
        }

        // check if object is already selected
        let alreadySelected = false;
        let index = -1;
        for (let i = 0 ; i < this.selectedObjects().length ; i++){
            if (selection === this.selectedObjects()[i]){
                alreadySelected = true;
                index = i;
                break;
            }
        }

        // add or remove the new selection from the list of selected objects as appropriate
        if (alreadySelected){
            // remove
            this.selectedObjects.splice(index,1);

        } else {
            // add
            this.selectedObjects.push(selection);
        }

        if( selection instanceof Edge){
            GraphRenderer.setPortPeekForEdge(selection,!alreadySelected)
        }

        //special case if we are selecting multiple things in a palette
        if(selectedLocation === Eagle.FileType.Palette){
            this.hierarchyMode(false)
            this.rightWindow().mode(Eagle.RightWindowMode.Inspector) 
            return
        }

        if(rightWindowMode === Eagle.RightWindowMode.Hierarchy){
            this.hierarchyMode(true)
        }
        this.rightWindow().mode(Eagle.RightWindowMode.Hierarchy)
    }

    getObjectInspectorVisibility : ko.PureComputed<boolean> = ko.pureComputed(() => {
        const eagle = Eagle.getInstance()
        return eagle.selectedNode() !== null || eagle.selectedEdge() !== null || eagle.selectedObjects().length > 1
    }, this);

    getInspectorCollapseBtnState : ko.PureComputed<boolean> = ko.pureComputed(() => {
        $('#inspector').addClass('inspectorTransition')
        setTimeout(function(){
            $('#inspector').removeClass('inspectorTransition')
        },100)

        if(this.getObjectInspectorVisibility()){
            if(Setting.findValue(Setting.OBJECT_INSPECTOR_COLLAPSED_STATE)){
                return true
            }else{
                return false
            }
        }else{
            if(Setting.findValue(Setting.GRAPH_INSPECTOR_COLLAPSED_STATE)){
                return true
            }else{
                return false
            }
        }
    }, this);

    getGraphModifiedDateText = () : string => {
        return this.logicalGraph().fileInfo().lastModifiedDatetimeText().split(',')[0]
    }

    changeRightWindowMode(requestedMode:Eagle.RightWindowMode) : void {
        this.rightWindow().mode(requestedMode)
        this.rightWindow().shown(true); 

        //if we are intentionally switching to the hierary, then we do not want the right window mode to switch to the inspector when we change node selection.
        if(requestedMode===Eagle.RightWindowMode.Hierarchy){
            this.hierarchyMode(true)
        }else {
            this.hierarchyMode(false)
        }
    }

    objectIsSelected = (object: Node | Edge): boolean => {
        if (object instanceof Node){
            for (const o of this.selectedObjects()){
                if (o instanceof Node && o.getId() === object.getId()){
                    return true;
                }
            }

            return false;
        }

        if (object instanceof Edge){
            for (const o of this.selectedObjects()){
                if (o instanceof Edge && o.getId() === object.getId()){
                    return true;
                }
            }

            return false;
        }

        console.error("Checking if object of unknown type is selected", object);
        return false;
    }

    // NOTE: we use this to check objects that are not ACTUALLY Node or Edge instances
    //       the objects are actually knockout viewModels derived from Node or Edge
    objectIsSelectedById = (id: string): boolean => {
        for (const o of this.selectedObjects()){
            if (o instanceof Node && o.getId() === id){
                return true;
            }

            if (o instanceof Edge && o.getId() === id){
                return true;
            }
        }

        return false;
    }

    getOutermostSelectedNodes = () : Node[] => {
        const outermostNodes : Node[] = []
        const selectedNodes = this.selectedObjects()
        const eagle = this

        selectedNodes.forEach(function(object){
            if (!(object instanceof Node)){
                return
            }

            if(object.getParentId() !== null){
                let thisParentIsSelected = true
                let thisObject = object
                while (thisParentIsSelected){
                    const thisParent: Node = eagle.logicalGraph().findNodeByIdQuiet(thisObject.getParentId());
                    if(thisParent != null){
                        thisParentIsSelected = eagle.objectIsSelectedById(thisParent.getId())
                        if(thisParentIsSelected){
                            thisObject = thisParent
                        }else{
                            let alreadyAdded = false
                            for(const x of outermostNodes){
                                if(x===thisObject){
                                    alreadyAdded= true
                                    break
                                }
                            }
                            if(!alreadyAdded){
                                outermostNodes.push(thisObject)
                            }
                        }
                    }else{
                        outermostNodes.push(thisObject)
                        break
                    }
                }
            }else{
                outermostNodes.push(object)
            }
        })
        return outermostNodes
    }

    /**
     * Uploads a file from a local file location.
     */
    loadLocalGraphFile = () : void => {
        const graphFileToLoadInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("graphFileToLoad");
        const fileFullPath : string = graphFileToLoadInputElement.value;
        const eagle: Eagle = this;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // get reference to file from the html element
        const file = graphFileToLoadInputElement.files[0];

        // read the file
        if (file) {
            const reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = function (evt) {
                const data: string = evt.target.result.toString();

                eagle._loadGraphJSON(data, fileFullPath, (lg: LogicalGraph) : void => {
                    eagle.logicalGraph(lg);
    
                    // center graph
                    GraphRenderer.translateLegacyGraph()
    
                    //needed when centering after init of a graph. we need to wait for all the constructs to finish resizing themselves
                    setTimeout(function(){
                        eagle.centerGraph()
                    },50);
    
                    // update the activeFileInfo with details of the repository the file was loaded from
                    if (fileFullPath !== ""){
                        eagle.updateLogicalGraphFileInfo(Repository.Service.File, "", "", Utils.getFilePathFromFullPath(fileFullPath), Utils.getFileNameFromFullPath(fileFullPath));
                    }
    
                    // check graph
                    eagle.checkGraph();
                    eagle.undo().clear();
                    eagle.undo().pushSnapshot(eagle, "Loaded " + fileFullPath);
                });
            }
            reader.onerror = function (evt) {
                console.error("error reading file", evt);
            }
        }

        // reset file selection element
        graphFileToLoadInputElement.value = "";
    }

    /**
     * Uploads a file from a local file location. File will be "insert"ed into the current graph
     */
    insertLocalGraphFile = () : void => {
        const graphFileToInsertInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("graphFileToInsert");
        const fileFullPath : string = graphFileToInsertInputElement.value;
        const errorsWarnings : Errors.ErrorsWarnings = {"errors":[], "warnings":[]};
        const eagle: Eagle = this;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // get reference to file from the html element
        const file = graphFileToInsertInputElement.files[0];

        // read the file
        if (file) {
            const reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = function (evt) {
                const data: string = evt.target.result.toString();

                eagle._loadGraphJSON(data, fileFullPath, (lg: LogicalGraph) : void => {
                    const parentNode: Node = new Node(lg.fileInfo().name, lg.fileInfo().getText(), Category.SubGraph);
    
                    eagle.insertGraph(lg.getNodes(), lg.getEdges(), parentNode, errorsWarnings);
    
                    // TODO: handle errors and warnings
    
                    eagle.checkGraph();
                    eagle.undo().pushSnapshot(eagle, "Insert Logical Graph");
                    eagle.logicalGraph.valueHasMutated();
                });
            }
            reader.onerror = function (evt) {
                console.error("error reading file", evt);
            }
        }

        // reset file selection element
        graphFileToInsertInputElement.value = "";
    }

    private _handleLoadingErrors = (errorsWarnings: Errors.ErrorsWarnings, fileName: string, service: Repository.Service) : void => {
        const showErrors: boolean = Setting.findValue(Setting.SHOW_FILE_LOADING_ERRORS);
        this.hideEagleIsLoading()
        // show errors (if found)
        if (Errors.hasErrors(errorsWarnings) || Errors.hasWarnings(errorsWarnings)){
            if (showErrors){

                // add warnings/errors to the arrays
                this.loadingErrors(errorsWarnings.errors);
                this.loadingWarnings(errorsWarnings.warnings);

                this.errorsMode(Errors.Mode.Loading);
                Utils.showErrorsModal("Loading File");
            }
        } else {
            Utils.showNotification("Success", fileName + " has been loaded from " + service + ".", "success");
        }
    }

    private _loadGraphJSON = (data: string, fileFullPath: string, loadFunc: (lg: LogicalGraph) => void) : void => {
        let dataObject;

        // attempt to parse the JSON
        try {
            dataObject = JSON.parse(data);
        }
        catch(err){
            Utils.showUserMessage("Error parsing file JSON", err.message);
            return;
        }

        const fileType : Eagle.FileType = Utils.determineFileType(dataObject);

        // Only load graph files.
        if (fileType !== Eagle.FileType.Graph) {
            Utils.showUserMessage("Error", "This is not a graph file!");
            return;
        }

        // attempt to determine schema version from FileInfo
        const schemaVersion: Daliuge.SchemaVersion = Utils.determineSchemaVersion(dataObject);

        const errorsWarnings: Errors.ErrorsWarnings = {errors: [], warnings: []};
        const dummyFile: RepositoryFile = new RepositoryFile(Repository.DUMMY, "", fileFullPath);

        // check if we need to update the graph from keys to ids
        if (GraphUpdater.usesNodeKeys(dataObject)){
            GraphUpdater.updateKeysToIds(dataObject);
        }

        // use the correct parsing function based on schema version
        switch (schemaVersion){
            case Daliuge.SchemaVersion.OJS:
            case Daliuge.SchemaVersion.Unknown:
                loadFunc(LogicalGraph.fromOJSJson(dataObject, dummyFile, errorsWarnings));
                break;
        }

        this._handleLoadingErrors(errorsWarnings, Utils.getFileNameFromFullPath(fileFullPath), Repository.Service.File);
    }

    createSubgraphFromSelection = () : void => {
        const eagle = Eagle.getInstance()
        if(eagle.selectedObjects().length === 0){
            Utils.showNotification('Error','At least one node must be selected!', 'warning')
            return
        }

        // create new subgraph
        const parentNode: Node = new Node("Subgraph", "", Category.SubGraph);

        // add the parent node to the logical graph
        this.logicalGraph().addNodeComplete(parentNode);

        // switch items in selection to be children of subgraph
        for (const node of this.selectedObjects()){
            if (!(node instanceof Node)){
                continue;
            }

            // if already parented to a node in this selection, skip
            const parentKey = node.getParentId();
            if (parentKey !== null){
                const parent = this.logicalGraph().findNodeById(parentKey);
                if (this.objectIsSelected(parent)){
                    continue;
                }
            }

            // update selection
            node.setParentId(parentNode.getId());
        }

        // shrink/expand subgraph node to fit children
        this.logicalGraph().shrinkNode(parentNode);

        // flag graph as changed
        this.flagActiveFileModified();
        this.checkGraph();
        this.undo().pushSnapshot(this, "Create Subgraph from Selection");
        this.logicalGraph.valueHasMutated();
    }

    checkErrorModalShowError = (data:any) :void =>{
        data.show()
        this.rightWindow().shown(true).mode(Eagle.RightWindowMode.Inspector)
    }

    createConstructFromSelection = () : void => {
        console.log("createConstructFromSelection()");
        const eagle = Eagle.getInstance()
        if(eagle.selectedObjects().length === 0){
            Utils.showNotification('Error','At least one node must be selected', 'warning')
            return
        }

        const constructs : string[] = Utils.buildComponentList((cData: Category.CategoryData) => {
            return cData.categoryType === Category.Type.Construct;
        });

        // ask the user what type of construct to use
        Utils.requestUserChoice("Choose Construct", "Please choose a construct type to contain the selection", constructs, 0, false, "", (completed: boolean, userChoiceIndex: number, userCustomString: string) => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            const userChoice: string = constructs[userChoiceIndex];

            // create new subgraph
            const parentNode: Node = new Node(userChoice, "", userChoice as Category);

            // add the parent node to the logical graph
            this.logicalGraph().addNodeComplete(parentNode);

            // switch items in selection to be children of subgraph
            for (const node of this.selectedObjects()){
                if (!(node instanceof Node)){
                    continue;
                }

                node.setParentId(parentNode.getId());
            }

            // shrink/expand subgraph node to fit children
            this.logicalGraph().shrinkNode(parentNode);

            // flag graph as changed
            this.flagActiveFileModified();
            this.checkGraph();
            this.undo().pushSnapshot(this, "Add Selection to Construct");
            this.logicalGraph.valueHasMutated();
        });
    }

    // NOTE: parentNode would be null if we are duplicating a selection of objects
    insertGraph = (nodes: Node[], edges: Edge[], parentNode: Node, errorsWarnings: Errors.ErrorsWarnings) : void => {
        const DUPLICATE_OFFSET: number = 20; // amount (in x and y) by which duplicated nodes will be positioned away from the originals

        // create map of inserted graph keys to final graph nodes, and of inserted port ids to final graph ports
        const nodeMap: Map<NodeId, Node> = new Map();
        const portMap: Map<FieldId, Field> = new Map();
        let parentNodePosition;

        // add the parent node to the logical graph
        if (parentNode !== null){
            this.logicalGraph().addNodeComplete(parentNode);

            // we need to know the required width for the new parentNode, which will be a bounding box for all nodes in nodes[]
            const bbSize = LogicalGraph.normaliseNodes(nodes);

            // find a suitable position for the parent node
            parentNodePosition = this.getNewNodePosition(bbSize);

            // set attributes of parentNode
            parentNode.setPosition(parentNodePosition.x+(bbSize/2), parentNodePosition.y+(bbSize/2));
            parentNode.setRadius(bbSize);
            parentNode.setCollapsed(true);
        } else {
            parentNodePosition = {x: DUPLICATE_OFFSET, y: DUPLICATE_OFFSET};
        }

        // insert nodes from lg into the existing logicalGraph
        for (const node of nodes){
            this.addNode(node, parentNodePosition.x + node.getPosition().x, parentNodePosition.y + node.getPosition().y, (insertedNode: Node) => {
                // save mapping for node itself
                nodeMap.set(node.getId(), insertedNode);

                // if insertedNode has no parent, make it a parent of the parent node
                if (insertedNode.getParentId() === null && parentNode !== null){
                    insertedNode.setParentId(parentNode.getId());
                }
                
                // copy embedded input application
                if (node.hasInputApplication()){
                    const oldInputApplication : Node = node.getInputApplication();
                    const newInputApplication : Node = insertedNode.getInputApplication();
                   
                    nodeMap.set(oldInputApplication.getId(), newInputApplication);

                    // save mapping for input ports
                    for (let j = 0 ; j < oldInputApplication.getInputPorts().length; j++ ){
                        portMap.set(oldInputApplication.getInputPorts()[j].getId(), newInputApplication.getInputPorts()[j]);
                        
                    }

                    // save mapping for output ports
                    for (let j = 0 ; j < oldInputApplication.getOutputPorts().length; j++){
                        portMap.set(oldInputApplication.getOutputPorts()[j].getId(), newInputApplication.getOutputPorts()[j]);
                    }
                }

                // copy embedded output application
                if (node.hasOutputApplication()){
                    const oldOutputApplication : Node = node.getOutputApplication();
                    const newOutputApplication : Node = insertedNode.getOutputApplication();
                    
                    nodeMap.set(oldOutputApplication.getId(), newOutputApplication);
                    
                    // save mapping for input ports
                    for (let j = 0 ; j < oldOutputApplication.getInputPorts().length; j++){
                        portMap.set(oldOutputApplication.getInputPorts()[j].getId(), newOutputApplication.getInputPorts()[j]);
                    }

                    // save mapping for output ports
                    for (let j = 0 ; j < oldOutputApplication.getOutputPorts().length; j++){
                        portMap.set(oldOutputApplication.getOutputPorts()[j].getId(), newOutputApplication.getOutputPorts()[j]);
                    }
                }

                // save mapping for input ports
                for (let j = 0 ; j < node.getInputPorts().length; j++){
                    portMap.set(node.getInputPorts()[j].getId(), insertedNode.getInputPorts()[j]);
                }

                // save mapping for output ports
                for (let j = 0 ; j < node.getOutputPorts().length; j++){
                    portMap.set(node.getOutputPorts()[j].getId(), insertedNode.getOutputPorts()[j]);
                }
            });
        }

        // update some other details of the nodes are updated correctly
        for (const node of nodes){
            const insertedNode: Node = nodeMap.get(node.getId());

            // if original node has a parent, set the parent of the inserted node to the inserted parent
            if (node.getParentId() !== null){
                // check if parent of original node was also mapped to a new node
                const insertedParent: Node = nodeMap.get(node.getParentId());

                // make sure parent is set correctly
                // if no mapping is available for the parent, then set parent to the new parentNode, or if no parentNode exists, just set parent to null
                // if a mapping is available, then use the mapped node as the parent for the new node
                if (typeof insertedParent === 'undefined'){
                    if (parentNode === null){
                        insertedNode.setParentId(null);
                    } else {
                        insertedNode.setParentId(parentNode.getId());
                    }
                } else {
                    insertedNode.setParentId(insertedParent.getId());
                }
            }

            if (node.getSubjectId() !== null){
                const subjectNode = this.logicalGraph().findNodeById(node.getSubjectId());
                const insertedSubject: Node = nodeMap.get(node.getSubjectId());

                if (typeof insertedSubject === 'undefined'){
                    if (subjectNode === null){
                        insertedNode.setSubjectId(null);
                    } else {
                        insertedNode.setSubjectId(subjectNode.getId());
                    }
                } else {
                    insertedNode.setSubjectId(insertedSubject.getId());
                }
            }
        }

        // insert edges from lg into the existing logicalGraph
        for (const edge of edges){
            const srcNode = nodeMap.get(edge.getSrcNodeId());
            const destNode = nodeMap.get(edge.getDestNodeId());

            if (typeof srcNode === "undefined" || typeof destNode === "undefined"){
                errorsWarnings.warnings.push(Errors.Message("Unable to insert edge " + edge.getId() + " source node or destination node could not be found."));
                continue;
            }

            // TODO: maybe use addEdgeComplete? otherwise check portName = "" is OK
            this.addEdge(srcNode, portMap.get(edge.getSrcPortId()), destNode, portMap.get(edge.getDestPortId()), edge.isLoopAware(), edge.isClosesLoop(),  null);
        }

        //used if we cant find space on the canvas, we then extend the search area for space and center the graph after adding to bring new nodes into view
        if(parentNodePosition.extended){
            setTimeout(function(){
                Eagle.getInstance().centerGraph()
            },100)
        }
    }

    triggerShortcut = (shortcut: (eagle: Eagle) => void) :void => {
        const eagle: Eagle = Eagle.getInstance();
        $('#shortcutsModal').modal("hide");
        shortcut(eagle);
    }

    /**
     * Loads a custom palette from a file.
     */
    loadLocalPaletteFile = () : void => {
        const paletteFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("paletteFileToLoad");
        const fileFullPath : string = paletteFileInputElement.value;
        const eagle: Eagle = this;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // get a reference to the file in the html element
        const file = paletteFileInputElement.files[0];
        
        // read the file
        if (file) {
            const reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = function (evt) {
                const data: string = evt.target.result.toString();

                eagle._loadPaletteJSON(data, fileFullPath);

                eagle.palettes()[0].fileInfo().repositoryService = Repository.Service.File;
                eagle.palettes()[0].fileInfo.valueHasMutated();
            }
            reader.onerror = function (evt) {
                console.error("error reading file", evt);
            }
        }
        
        // reset file selection element
        paletteFileInputElement.value = "";
    }

    private _loadPaletteJSON = (data: string, fileFullPath: string) => {
        let dataObject;

        // attempt to parse the JSON
        try {
            dataObject = JSON.parse(data);
        }
        catch(err){
            Utils.showUserMessage("Error parsing file JSON", err.message);
            return;
        }

        // determine file type
        const loadedFileType : Eagle.FileType = Utils.determineFileType(dataObject);

        // abort if not palette
        if (loadedFileType !== Eagle.FileType.Palette){
            Utils.showUserMessage("Error", "This is not a palette file! Looks like a " + loadedFileType);
            return;
        }

        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};
        const p : Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", Utils.getFileNameFromFullPath(fileFullPath)), errorsWarnings);

        // show errors (if found)
        this._handleLoadingErrors(errorsWarnings, Utils.getFileNameFromFullPath(fileFullPath), Repository.Service.File);

        // sort the palette
        p.sort();

        // add new palette to the START of the palettes array
        this.palettes.unshift(p);

        // show the left window
        this.leftWindow().shown(true);

        Utils.showNotification("Success", Utils.getFileNameFromFullPath(fileFullPath) + " has been loaded.", "success");
    }

    /**
     * The following two functions allows the file selectors to be hidden and let tags 'click' them
     */
     getGraphFileToLoad = () : void => {
         document.getElementById("graphFileToLoad").click();
         this.resetEditor()
     }

     getGraphFileToInsert = () : void => {
         document.getElementById("graphFileToInsert").click();
     }

    getPaletteFileToLoad = () : void => {
        document.getElementById("paletteFileToLoad").click();
    }

    /**
     * Creates a new logical graph for editing.
     */
    newLogicalGraph = () : void => {
        this.newDiagram(Eagle.FileType.Graph, (name: string) => {
            this.logicalGraph(new LogicalGraph());
            this.logicalGraph().fileInfo().name = name;
            this.checkGraph();
            this.undo().clear();
            this.undo().pushSnapshot(this, "New Logical Graph");
            this.logicalGraph.valueHasMutated();
            Utils.showNotification("New Graph Created",name, "success");
        });
        this.resetEditor()
    }

    /**
     * Presents the user with a textarea in which to paste JSON. Reads the JSON and parses it into a logical graph for editing.
     */
    newLogicalGraphFromJson = () : void => {
        Utils.requestUserText("New Logical Graph from JSON", "Enter the JSON below", "", (completed : boolean, userText : string) : void => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            this._loadGraphJSON(userText, "", (lg: LogicalGraph) : void => {
                this.logicalGraph(lg);
            });
        });
        this.resetEditor()
    }

    addToGraphFromJson = () : void => {
        Utils.requestUserText("Add to Graph from JSON", "Enter the JSON below", "", (completed : boolean, userText : string) : void => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            let clipboard = null;
            try {
                clipboard = JSON.parse(userText);
            } catch(e) {
                Utils.showNotification(e.name, e.message, "danger");
                return;
            }

            const nodes : Node[] = [];
            const edges : Edge[] = [];
            const errorsWarnings : Errors.ErrorsWarnings = {"errors": [], "warnings": []};

            for (const n of clipboard.nodes){
                const node = Node.fromOJSJson(n, null, false);

                nodes.push(node);
            }

            for (const e of clipboard.edges){
                const edge = Edge.fromOJSJson(e, null);

                edges.push(edge);
            }

            this.insertGraph(nodes, edges, null, errorsWarnings);

            // display notification to user
            Utils.showNotification("Added to Graph from JSON", "Added " + clipboard.nodes.length + " nodes and " + clipboard.edges.length + " edges.", "info");
            // TODO: show errors

            // ensure changes are reflected in display
            this.checkGraph();
            this.undo().pushSnapshot(this, "Added from JSON");
            this.logicalGraph.valueHasMutated();
        });
    }

    displayLogicalGraphAsJson = () : void => {
        const cloneLG: LogicalGraph = this.logicalGraph().clone();

        // zero-out some info that isn't useful for comparison
        cloneLG.fileInfo().repositoryUrl = "";
        cloneLG.fileInfo().commitHash = "";
        cloneLG.fileInfo().downloadUrl = "";
        cloneLG.fileInfo().signature = "";
        cloneLG.fileInfo().lastModifiedName = "";
        cloneLG.fileInfo().lastModifiedEmail = "";
        cloneLG.fileInfo().lastModifiedDatetime = 0;

        const jsonString: string = LogicalGraph.toOJSJsonString(cloneLG, false);

        Utils.requestUserText("Export Graph to JSON", "", jsonString, null);
    }


    /**
     * Creates a new palette for editing.
     */
    newPalette = () : void => {
        this.newDiagram(Eagle.FileType.Palette, (name : string) => {
            const p: Palette = new Palette();
            p.fileInfo().name = name;

            // mark the palette as modified and readwrite
            p.fileInfo().modified = true;
            p.fileInfo().readonly = false;

            // add to palettes
            this.palettes.unshift(p);
        });
    }

    /**
     * Presents the user with a textarea in which to paste JSON. Reads the JSON and parses it into a palette.
     */
    newPaletteFromJson = () : void => {
        Utils.requestUserText("New Palette from JSON", "Enter the JSON below", "", (completed : boolean, userText : string) : void => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            this._loadPaletteJSON(userText, "");
        });
    }

    /**
     * Reloads a previously loaded palette.
     */
     reloadPalette = (palette: Palette, index: number) : void => {
         const fileInfo : FileInfo = palette.fileInfo();
         // remove palette
         this.closePalette(palette);

         switch (fileInfo.repositoryService){
             case Repository.Service.File:
                // load palette
                this.getPaletteFileToLoad();
                break;
            case Repository.Service.GitLab:
            case Repository.Service.GitHub:
                Repositories.selectFile(new RepositoryFile(new Repository(fileInfo.repositoryService, fileInfo.repositoryName, fileInfo.repositoryBranch, false), fileInfo.path, fileInfo.name));
                break;
            case Repository.Service.Url:
                this.loadPalettes([
                    {name:palette.fileInfo().name, filename:palette.fileInfo().downloadUrl, readonly:palette.fileInfo().readonly}
                ], (errorsWarnings: Errors.ErrorsWarnings, palettes: Palette[]):void => {
                    for (const palette of palettes){
                        if (palette !== null){
                            this.palettes.splice(index, 0, palette);
                        }
                    }
                });
                break;
            default:
                // can't be fetched
                break;
         }
    }

    /**
     * Create a new diagram (graph or palette).
     */
    newDiagram = (fileType : Eagle.FileType, callbackAction : (name : string) => void ) : void => {
        const defaultName: string = Utils.generateGraphName();

        Utils.requestUserString("New " + fileType, "Enter " + fileType + " name", defaultName, false, (completed : boolean, userString : string) : void => {
            if (!completed)
            {   // Cancelling action.
                return;
            }
            if (userString === ""){
            Utils.showNotification("Invalid graph name", "Please enter a name for the new graph", "danger");
                return;
            }

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(userString)) {
                userString = userString + "." + Utils.getDiagramExtension(fileType);
            }

            // Callback.
            callbackAction(userString);
        });
    }

    saveGraph = () : void => {
        if (this.logicalGraph().fileInfo().repositoryService === Repository.Service.File){
            this.saveFileToLocal(Eagle.FileType.Graph);
        } else {
            this.commitToGit(Eagle.FileType.Graph);
        }
    }

    saveGraphAs = () : void => {
        const isLocalFile = this.logicalGraph().fileInfo().repositoryService === Repository.Service.File;

        Utils.requestUserChoice("Save Graph As", "Please choose where to save the graph", ["Local File", "Remote Git Repository"], isLocalFile?0:1, false, "", (completed: boolean, userChoiceIndex: number) => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            if (userChoiceIndex === 0){
                this.saveFileToLocal(Eagle.FileType.Graph);
            } else {
                this.commitToGitAs(Eagle.FileType.Graph);
            }
        });
    }

    /**
     * Saves the file to a local download folder.
     */
    saveFileToLocal = async (fileType : Eagle.FileType) : Promise<void> => {
        switch (fileType){
            case Eagle.FileType.Graph:
                this.saveGraphToDisk(this.logicalGraph());
                break;
            case Eagle.FileType.Palette: {
                // build a list of palette names
                const paletteNames: string[] = this.buildReadablePaletteNamesList();

                // ask user to select the palette
                const paletteName = await Utils.userChoosePalette(paletteNames);

                // get reference to palette (based on paletteName)
                const destinationPalette = this.findPalette(paletteName, false);

                // check that a palette was found
                if (destinationPalette === null){
                    return;
                }

                this.savePaletteToDisk(destinationPalette);
                break;
            }
            default:
                Utils.showUserMessage("Not implemented", "Not sure which fileType right one to save locally :" + fileType);
                break;
        }
    }

    /**
     * Saves a file to the remote server repository.
     */
    saveFileToRemote = (repository : Repository, filePath : string, fileName : string, fileType : Eagle.FileType, fileInfo: ko.Observable<FileInfo>, jsonString : string) : void => {
        console.log("saveFileToRemote() repository.name", repository.name, "repository.service", repository.service);

        let url : string;

        switch (repository.service){
            case Repository.Service.GitHub:
                url = '/saveFileToRemoteGithub';
                break;
            case Repository.Service.GitLab:
                url = '/saveFileToRemoteGitlab';
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service : " + repository.service);
                return;
        }


        Utils.httpPostJSONString(url, jsonString, (error : string, data: string) : void => {
            if (error !== null){
                Utils.showUserMessage("Error", data + "<br/><br/>These error messages provided by " + repository.service + " are not very helpful. Please contact EAGLE admin to help with further investigation.");
                console.error("Error: " + JSON.stringify(error, null, 2) + " Data: " + data);
                return;
            }

            // Load the file list again.
            if (repository.service === Repository.Service.GitHub){
                GitHub.loadRepoContent(repository);
            }
            if (repository.service === Repository.Service.GitLab){
                GitLab.loadRepoContent(repository);
            }

            // show repo in the right window
            this.rightWindow().mode(Eagle.RightWindowMode.Repository);

            // Show success message
            if (repository.service === Repository.Service.GitHub){
                Utils.showNotification("Success", "The file has been saved to GitHub repository.", "success");
            }
            if (repository.service === Repository.Service.GitLab){
                Utils.showNotification("Success", "The file has been saved to GitLab repository.", "success");
            }

            // Mark file as non-modified.
            fileInfo().modified = false;

            fileInfo().repositoryService = repository.service;
            fileInfo().repositoryName = repository.name;
            fileInfo().repositoryBranch = repository.branch;
            fileInfo().path = filePath;
            fileInfo().type = fileType;

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(fileName)) {
                fileName = fileName + "." + Utils.getDiagramExtension(fileType);
            }

            // Change the title name.
            fileInfo().name = fileName;

            // set the EAGLE version etc according to this running version
            fileInfo().updateEagleInfo();

            // flag fileInfo object as modified
            fileInfo.valueHasMutated();
        });
    }

    /**
     * Performs a Git commit of a graph/palette. Asks user for a file name before saving.
     */
    commitToGitAs = async (fileType : Eagle.FileType) : Promise<void> => {
        console.log("commitToGitAs()");

        let fileInfo : ko.Observable<FileInfo>;
        let obj : LogicalGraph | Palette;

        // determine which object of the given filetype we are committing
        switch (fileType){
            case Eagle.FileType.Graph:
                fileInfo = this.logicalGraph().fileInfo;
                obj = this.logicalGraph();
                break;
            case Eagle.FileType.Palette: {
                const paletteNames: string[] = this.buildReadablePaletteNamesList();
                const paletteName = await Utils.userChoosePalette(paletteNames);
                const palette = this.findPalette(paletteName, false);
                if (palette === null){
                    return;
                }
                fileInfo = palette.fileInfo;
                obj = palette;
                break;
            }
            default:
                Utils.showUserMessage("Not implemented", "Not sure which fileType right one to commit :" + fileType);
                break;
        }


        // create default repository to supply to modal so that the modal is populated with useful defaults
        let defaultRepository: Repository;

        if (this.logicalGraph()){
            // if the repository service is unknown (or file), probably because the graph hasn't been saved before, then
            // just use any existing repo
            if (fileInfo().repositoryService === Repository.Service.Unknown || fileInfo().repositoryService === Repository.Service.File){
                const gitHubRepoList : Repository[] = Repositories.getList(Repository.Service.GitHub);
                const gitLabRepoList : Repository[] = Repositories.getList(Repository.Service.GitLab);

                // use first gitlab repo as second preference
                if (gitLabRepoList.length > 0){
                    defaultRepository = new Repository(Repository.Service.GitLab, gitLabRepoList[0].name, gitLabRepoList[0].branch, false);
                }

                // overwrite with first github repo as first preference
                if (gitHubRepoList.length > 0){
                    defaultRepository = new Repository(Repository.Service.GitHub, gitHubRepoList[0].name, gitHubRepoList[0].branch, false);
                }

                if (gitHubRepoList.length === 0 && gitLabRepoList.length === 0){
                    defaultRepository = new Repository(Repository.Service.GitHub, "", "", false);
                }
            } else {
                defaultRepository = new Repository(fileInfo().repositoryService, fileInfo().repositoryName, fileInfo().repositoryBranch, false);
            }
        }

        Utils.requestUserGitCommit(defaultRepository, Repositories.getList(defaultRepository.service), fileInfo().path, fileInfo().name, fileType, (completed : boolean, repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            const repository : Repository = Repositories.get(repositoryService, repositoryName, repositoryBranch);

            this._commit(repository, fileType, filePath, fileName, fileInfo, commitMessage, obj);
        });
    };

    /**
     * Performs a Git commit of a graph/palette.
     */
    commitToGit = async (fileType : Eagle.FileType) : Promise<void> => {
        let fileInfo : ko.Observable<FileInfo>;
        let obj : LogicalGraph | Palette;

        // determine which object of the given filetype we are committing
        switch (fileType){
            case Eagle.FileType.Graph:
                fileInfo = this.logicalGraph().fileInfo;
                obj = this.logicalGraph();
                break;
            case Eagle.FileType.Palette: {
                // build a list of palettes, as user to choose the one to save, abort if no palette is chosen
                const paletteNames: string[] = this.buildReadablePaletteNamesList();
                const paletteName = await Utils.userChoosePalette(paletteNames);
                const palette = this.findPalette(paletteName, false);
                if (palette === null){
                    return;
                }

                fileInfo = palette.fileInfo;
                obj = palette;
                break;
            }
            default:
                Utils.showUserMessage("Not implemented", "Not sure which fileType right one to commit :" + fileType);
                break;
        }

        console.log("fileInfo().repositoryService", fileInfo().repositoryService);
        console.log("fileInfo().repositoryName", fileInfo().repositoryName);

        // if there is no git repository or filename defined for this file. Please use 'save as' instead!
        if (
            fileInfo().repositoryService === Repository.Service.Unknown ||
            fileInfo().repositoryService === Repository.Service.File ||
            fileInfo().repositoryService === Repository.Service.Url ||
            fileInfo().repositoryName === null
        ) {
            this.commitToGitAs(fileType);
            return;
        }

        // check that filetype is appropriate for a file with this extension
        if (fileInfo().name === "") {
            if (fileType == Eagle.FileType.Graph) {
                Utils.showUserMessage('Error', 'Graph is not chosen! Open existing or create a new graph.');
            } else if (fileType == Eagle.FileType.Palette) {
                Utils.showUserMessage('Error', 'Palette is not chosen! Open existing or create a new palette.');
            }
            return;
        }

        // request commit message from the user, abort if none entered
        const commitMessage = await Utils.userEnterCommitMessage("Enter a commit message for this " + fileType);
        if (commitMessage === null){
            return;
        }

        // set the EAGLE version etc according to this running version
        fileInfo().updateEagleInfo();

        const repository = Repositories.get(fileInfo().repositoryService, fileInfo().repositoryName, fileInfo().repositoryBranch);

        this._commit(repository, fileType, fileInfo().path, fileInfo().name, fileInfo, commitMessage, obj);
    };

    _commit = (repository: Repository, fileType: Eagle.FileType, filePath: string, fileName: string, fileInfo: ko.Observable<FileInfo>, commitMessage: string, obj: LogicalGraph | Palette) : void => {
        // check that repository was found, if not try "save as"!
        if (repository === null){
            this.commitToGitAs(fileType);
            return;
        }

        this.saveDiagramToGit(repository, fileType, filePath, fileName, fileInfo, commitMessage, obj);
    }

    /**
     * Saves a graph/palette file to the GitHub repository.
     */
    saveDiagramToGit = (repository : Repository, fileType : Eagle.FileType, filePath : string, fileName : string, fileInfo: ko.Observable<FileInfo>, commitMessage : string, obj: LogicalGraph | Palette) : void => {
        console.log("saveDiagramToGit() repositoryName", repository.name, "filePath", filePath, "fileName", fileName, "commitMessage", commitMessage);

        if (fileType === Eagle.FileType.Graph){
            // clone the logical graph
            const lg_clone : LogicalGraph = (<LogicalGraph> obj).clone();
            lg_clone.fileInfo().updateEagleInfo();

            const jsonString: string = LogicalGraph.toOJSJsonString(lg_clone, false);

            this._saveDiagramToGit(repository, fileType, filePath, fileName, fileInfo, commitMessage, jsonString);
        } else {
            // clone the palette
            const p_clone : Palette = (<Palette> obj).clone();
            p_clone.fileInfo().updateEagleInfo();
            const jsonString: string = Palette.toOJSJsonString(p_clone);

            this._saveDiagramToGit(repository, fileType, filePath, fileName, fileInfo, commitMessage, jsonString);
        }
    }

    _saveDiagramToGit = (repository : Repository, fileType : Eagle.FileType, filePath : string, fileName : string, fileInfo: ko.Observable<FileInfo>, commitMessage : string, jsonString: string) : void => {
        // generate filename
        const fullFileName : string = Utils.joinPath(filePath, fileName);

        // get access token for this type of repository
        let token : string;

        switch (repository.service){
            case Repository.Service.GitHub:
                token = Setting.findValue(Setting.GITHUB_ACCESS_TOKEN_KEY);
                break;
            case Repository.Service.GitLab:
                token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
                return;
        }

        // check that access token is defined
        if (token === null || token === "") {
            Utils.showUserMessage("Error", "The GitHub access token is not set! To save files on GitHub, set the access token.");
            return;
        }

        // validate json
        Utils.validateJSON(jsonString, fileType);

        const commitJsonString: string = Utils.createCommitJsonString(jsonString, repository, token, fullFileName, commitMessage);
        this.saveFileToRemote(repository, filePath, fileName, fileType, fileInfo, commitJsonString);
    }

    loadDefaultPalettes = () : void => {
        this.loadPalettes([
            {name:Palette.BUILTIN_PALETTE_NAME, filename:Daliuge.PALETTE_URL, readonly:true},
            {name:Palette.DYNAMIC_PALETTE_NAME, filename:Daliuge.TEMPLATE_URL, readonly:true}
        ], (errorsWarnings: Errors.ErrorsWarnings, palettes: Palette[]):void => {
            const showErrors: boolean = Setting.findValue(Setting.SHOW_FILE_LOADING_ERRORS);

            // display of errors if setting is true
            if (showErrors && (Errors.hasErrors(errorsWarnings) || Errors.hasWarnings(errorsWarnings))){
                // add warnings/errors to the arrays
                this.loadingErrors(errorsWarnings.errors);
                this.loadingWarnings(errorsWarnings.warnings);

                this.errorsMode(Errors.Mode.Loading);
                Utils.showErrorsModal("Loading File");
            }

            for (const palette of palettes){
                if (palette !== null){
                    this.palettes.push(palette);
                }
            }
            this.leftWindow().shown(true);
        });
    }

    loadPalettes = (paletteList: {name:string, filename:string, readonly:boolean}[], callback: (errorsWarnings: Errors.ErrorsWarnings, data: Palette[]) => void ) : void => {
        const results: Palette[] = [];
        const complete: boolean[] = [];
        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};

        // define a function to check if all requests are now complete, if so we can call the callback
        function _checkAllPalettesComplete() : void {
            let allComplete = true;
            for (const requestComplete of complete){
                if (!requestComplete){
                    allComplete = false;
                }
            }
            if (allComplete){
                callback(errorsWarnings, results);
            }
        }

        // start trying to load the palettes
        for (let i = 0 ; i < paletteList.length ; i++){
            results.push(null);
            complete.push(false);
            const index = i;
            const data = {url: paletteList[i].filename};

            Utils.httpPostJSONWithErrorHandler("/openRemoteUrlFile", data,
                (data: string) => {
                    // palette fetched successfully
                    complete[index] = true;

                    const palette: Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", paletteList[index].name), errorsWarnings);
                    Utils.preparePalette(palette, paletteList[index]);

                    // add to results
                    results[index] = palette;

                    // save to localStorage
                    localStorage.setItem(paletteList[index].filename, data);
                    
                    _checkAllPalettesComplete();
                },
                (error: string) => {
                    // an error occurred when fetching the palette
                    complete[index] = true;

                    errorsWarnings.errors.push(Errors.Message(error));

                    // try to load palette from localStorage
                    const paletteData = localStorage.getItem(paletteList[i].filename);

                    if (paletteData === null){
                        console.warn("Unable to fetch palette '" + paletteList[i].name + "'. Palette also unavailable from localStorage.");
                    } else {
                        console.warn("Unable to fetch palette '" + paletteList[i].name + "'. Palette loaded from localStorage.");

                        const palette: Palette = Palette.fromOJSJson(paletteData, new RepositoryFile(Repository.DUMMY, "", paletteList[i].name), errorsWarnings);
                        Utils.preparePalette(palette, paletteList[i]);

                        results[index] = palette;
                    }

                    _checkAllPalettesComplete();
                }
            );
        }
    }

    openRemoteFile = (file : RepositoryFile) : void => {
        // flag file as being fetched
        file.isFetching(true);

        // check the service required to fetch the file
        let openRemoteFileFunc;
        switch (file.repository.service){
            case Repository.Service.GitHub:
                openRemoteFileFunc = GitHub.openRemoteFile;
                break;
            case Repository.Service.GitLab:
                openRemoteFileFunc = GitLab.openRemoteFile;
                break;
            case Repository.Service.Url:
                openRemoteFileFunc = Utils.openRemoteFileFromUrl;
                break;
            default:
                console.warn("Unsure how to fetch file with unknown service ", file.repository.service);
                break;
        }

        // load file from github or gitlab
        openRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name, (error : string, data : string) : void => {
            // flag fetching as complete
            file.isFetching(false);

            // display error if one occurred
            if (error != null){
                Utils.showUserMessage("Error", error);
                this.hideEagleIsLoading()
                return;
            }

            // determine file extension
            const fileExtension = Utils.getFileExtension(file.name);
            let fileTypeLoaded: Eagle.FileType = Eagle.FileType.Unknown;
            let dataObject: any = null;

            if (fileExtension !== "md"){
                // attempt to parse the JSON
                try {
                    dataObject = JSON.parse(data);
                }
                catch(err){
                    Utils.showUserMessage("Error parsing file JSON", err.message);
                    return;
                }

                fileTypeLoaded = Utils.determineFileType(dataObject);
            } else {
                fileTypeLoaded = Eagle.FileType.Markdown;
            }        

            switch (fileTypeLoaded){
                case Eagle.FileType.Graph: {
                    // attempt to determine schema version from FileInfo
                    const eagleVersion: string = Utils.determineEagleVersion(dataObject);

                    // check if we need to update the graph from keys to ids
                    if (GraphUpdater.usesNodeKeys(dataObject)){
                        GraphUpdater.updateKeysToIds(dataObject);
                    }

                    // warn user if file newer than EAGLE
                    if (Utils.newerEagleVersion(eagleVersion, (<any>window).version)){
                        Utils.requestUserConfirm("Newer EAGLE Version", "File " + file.name + " was written with EAGLE version " + eagleVersion + ", whereas the current EAGLE version is " + (<any>window).version + ". Do you wish to load the file anyway?", "Yes", "No", null, (confirmed : boolean) : void => {
                            if (confirmed){
                                this._loadGraph(dataObject, file);
                            }
                        });
                    } else {
                        this._loadGraph(dataObject, file);
                    }
                    break;
                }
                case Eagle.FileType.Palette:
                    this._remotePaletteLoaded(file, data);
                    break;

                case Eagle.FileType.Markdown:
                    Utils.showUserMessage(file.name, Utils.markdown2html(data));
                    break;

                default:
                    // Show error message
                    Utils.showUserMessage("Error", "The file type is neither graph nor palette!");
            }
        this.resetEditor()
        });
    };

    _loadGraph = (dataObject: any, file: RepositoryFile) : void => {
        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};
        const eagle = this

        // load graph
        this.logicalGraph(LogicalGraph.fromOJSJson(dataObject, file, errorsWarnings));

        // show errors/warnings
        this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);

        // center graph
        GraphRenderer.translateLegacyGraph()

        //needed when centering after init of a graph. we need to wait for all the constructs to finish resizing themselves
        setTimeout(function(){
            eagle.centerGraph()
        },50)

        // check graph
        this.checkGraph();
        this.undo().clear();
        this.undo().pushSnapshot(this, "Loaded " + file.name);

        // if the fileType is the same as the current mode, update the activeFileInfo with details of the repository the file was loaded from
        this.updateLogicalGraphFileInfo(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
    }

    insertRemoteFile = (file : RepositoryFile) : void => {
        // flag file as being fetched
        file.isFetching(true);

        // check the service required to fetch the file
        let insertRemoteFileFunc;
        switch (file.repository.service){
            case Repository.Service.GitHub:
                insertRemoteFileFunc = GitHub.openRemoteFile;
                break;
            case Repository.Service.GitLab:
                insertRemoteFileFunc = GitLab.openRemoteFile;
                break;
            default:
                console.warn("Unsure how to fetch file with unknown service ", file.repository.service);
                break;
        }

        // load file from github or gitlab
        insertRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name, (error : string, data : string) : void => {
            // flag fetching as complete
            file.isFetching(false);

            // display error if one occurred
            if (error != null){
                Utils.showUserMessage("Error", "Failed to load a file!");
                console.error(error);
                return;
            }

            // attempt to parse the JSON
            let dataObject;
            try {
                dataObject = JSON.parse(data);
            }
            catch(err){
                Utils.showUserMessage("Error parsing file JSON", err.message);
                return;
            }

            const fileTypeLoaded: Eagle.FileType = Utils.determineFileType(dataObject);

            // only do this for graphs at the moment
            if (fileTypeLoaded !== Eagle.FileType.Graph){
                Utils.showUserMessage("Error", "Unable to insert non-graph!");
                console.error("Unable to insert non-graph!");
                return;
            }

            // attempt to determine schema version from FileInfo
            const schemaVersion: Daliuge.SchemaVersion = Utils.determineSchemaVersion(dataObject);

            // check if we need to update the graph from keys to ids
            if (GraphUpdater.usesNodeKeys(dataObject)){
                GraphUpdater.updateKeysToIds(dataObject);
            }

            const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};

            // use the correct parsing function based on schema version
            let lg: LogicalGraph;
            switch (schemaVersion){
                case Daliuge.SchemaVersion.OJS:
                case Daliuge.SchemaVersion.Unknown:
                    lg = LogicalGraph.fromOJSJson(dataObject, file, errorsWarnings);
                    break;
            }

            // create parent node
            const parentNode: Node = new Node(lg.fileInfo().name, lg.fileInfo().getText(), Category.SubGraph);

            // perform insert
            this.insertGraph(lg.getNodes(), lg.getEdges(), parentNode, errorsWarnings);

            // trigger re-render
            this.logicalGraph.valueHasMutated();
            this.undo().pushSnapshot(this, "Inserted " + file.name);
            this.checkGraph();

            // show errors/warnings
            this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);
        });
    };

    private _remotePaletteLoaded = (file : RepositoryFile, data : string) : void => {
        // load the remote palette into EAGLE's palettes object.

        // check palette is not already loaded
        const alreadyLoadedPalette : Palette = this.findPaletteByFile(file);

        // if dictated by settings, reload the palette immediately
        if (alreadyLoadedPalette !== null && Setting.findValue(Setting.CONFIRM_RELOAD_PALETTES)){
            Utils.requestUserConfirm("Reload Palette?", "This palette (" + file.name + ") is already loaded, do you wish to load it again?", "Yes", "No", Setting.find(Setting.CONFIRM_RELOAD_PALETTES), (confirmed : boolean) : void => {
                if (confirmed){
                    this._reloadPalette(file, data, alreadyLoadedPalette);
                }
            });
        } else {
            this._reloadPalette(file, data, alreadyLoadedPalette);
        }
    }

    private _reloadPalette = (file : RepositoryFile, data : string, palette : Palette) : void => {
        // close the existing version of the open palette
        if (palette !== null){
            this.closePalette(palette);
        }

        // load the new palette
        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};
        const newPalette = Palette.fromOJSJson(data, file, errorsWarnings);

        // sort items in palette
        newPalette.sort();

        // add to list of palettes
        this.palettes.unshift(newPalette);

        // show errors/warnings
        this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);

        this.leftWindow().shown(true);
    }

    private updateLogicalGraphFileInfo = (repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, path : string, name : string) : void => {
        // update the activeFileInfo with details of the repository the file was loaded from
        this.logicalGraph().fileInfo().repositoryName = repositoryName;
        this.logicalGraph().fileInfo().repositoryBranch = repositoryBranch;
        this.logicalGraph().fileInfo().repositoryService = repositoryService;
        this.logicalGraph().fileInfo().path = path;
        this.logicalGraph().fileInfo().name = name;

        // communicate to knockout that the value of the fileInfo has been modified (so it can update UI)
        this.logicalGraph().fileInfo.valueHasMutated();

    }

    findPaletteByFile = (file : RepositoryFile) : Palette => {
        for (const palette of this.palettes()){
            if (palette.fileInfo().name === file.name){
                return palette;
            }
        }

        return null;
    }

    closePaletteMenus=() : void => {
        $("#paletteList .dropdown-toggle").removeClass("show")
        $("#paletteList .dropdown-menu").removeClass("show")
    }

    closePalette = (palette : Palette) : void => {
        for (let i = 0 ; i < this.palettes().length ; i++){
            const p = this.palettes()[i];

            if (p.fileInfo().name === palette.fileInfo().name){

                // check if the palette is modified, and if so, ask the user to confirm they wish to close
                if (p.fileInfo().modified && Setting.findValue(Setting.CONFIRM_DISCARD_CHANGES)){
                    Utils.requestUserConfirm("Close Modified Palette", "Are you sure you wish to close this modified palette?", "Close", "Cancel", null, (confirmed : boolean) : void => {
                        if (confirmed){
                            this.palettes.splice(i, 1);
                        }
                    });
                } else {
                    this.palettes.splice(i, 1);
                }

                break;
            }
        }
        this.resetEditor()
    }

    getParentNameAndId = (parentId: NodeId) : string => {
        if(parentId === null){
            return ""
        }

        // TODO: temporary fix while we get lots of warnings about missing nodes
        const parentNode = this.logicalGraph().findNodeByIdQuiet(parentId);

        if (parentNode === null){
            return ""
        }

        const parentText = parentNode.getName() + ' | Id: ' + parentId;

        return parentText
    }

    resetActionConfirmations = () : void => {
        Setting.setValue(Setting.CONFIRM_DELETE_OBJECTS,true)
        Setting.setValue(Setting.CONFIRM_DISCARD_CHANGES,true)
        Setting.setValue(Setting.CONFIRM_NODE_CATEGORY_CHANGES,true)
        Setting.setValue(Setting.CONFIRM_RELOAD_PALETTES,true)
        Setting.setValue(Setting.CONFIRM_REMOVE_REPOSITORIES,true)
        Utils.showNotification("Success", "Confirmation message pop ups re-enabled", "success");
    }

    // toggles the default palettes on or off
    // if currently shown, just remove them from the palettes list
    // if currently not shown, fetch them from the remove source and add to palettes list
    toggleDefaultPalettes = () : void => {
        const allowGraphEditing: boolean = Setting.find(Setting.ALLOW_GRAPH_EDITING).value() as boolean;
        const allowPaletteEditing: boolean = Setting.find(Setting.ALLOW_PALETTE_EDITING).value() as boolean;
        const openDefaultPalette: boolean = Setting.find(Setting.OPEN_DEFAULT_PALETTE).value() as boolean;

        // if:
        // - user is loading palettes
        // - allow palette editing is off
        // - allow graph editing is off
        // then the palettes tab is invisible anyway, and the user will not see the palettes loaded, so notify them of this corner case
        if (openDefaultPalette && !allowGraphEditing && !allowPaletteEditing){
            Utils.showNotification("Palettes Disabled", "Palettes are not visible in the current UI mode", "warning");
        }

        const eagle: Eagle = Eagle.getInstance();

        const builtinPalette: Palette = this.findPalette(Palette.BUILTIN_PALETTE_NAME, false);
        const dynamicPalette: Palette = this.findPalette(Palette.DYNAMIC_PALETTE_NAME, false);

        // always close the palettes
        if (builtinPalette !== null){
            eagle.closePalette(builtinPalette);
        }
        if (dynamicPalette !== null){
            eagle.closePalette(dynamicPalette);
        }
        
        // reload them if applicable
        if (openDefaultPalette){
            eagle.loadDefaultPalettes();
        }

        // show/hide the left window
        this.leftWindow().shown(openDefaultPalette);
    }

    // TODO: shares some code with saveFileToLocal(), we should try to factor out the common stuff at some stage
    savePaletteToDisk = (palette : Palette) : void => {
        console.log("savePaletteToDisk()", palette.fileInfo().name, palette.fileInfo().type);

        let fileName = palette.fileInfo().name;

        // Adding file extension to the title if it does not have it.
        if (!Utils.verifyFileExtension(fileName)) {
            fileName = fileName + "." + Utils.getDiagramExtension(Eagle.FileType.Palette);
        }

        // clone the palette and remove github info ready for local save
        const p_clone : Palette = palette.clone();
        p_clone.fileInfo().removeGitInfo();
        p_clone.fileInfo().updateEagleInfo();
        const jsonString: string = Palette.toOJSJsonString(p_clone);

        // validate json
        Utils.validateJSON(jsonString, Eagle.FileType.Palette);

        Utils.httpPostJSONString('/saveFileToLocal', jsonString, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            Utils.downloadFile(error, data, fileName);

            // since changes are now stored locally, the file will have become out of sync with the GitHub repository, so the association should be broken
            // clear the modified flag
            palette.fileInfo().modified = false;
            palette.fileInfo().repositoryService = Repository.Service.Unknown;
            palette.fileInfo().repositoryName = "";
            palette.fileInfo().repositoryUrl = "";
            palette.fileInfo().commitHash = "";
            palette.fileInfo().downloadUrl = "";
            palette.fileInfo.valueHasMutated();
        });
    }

    /**
     * Saves the file to a local download folder.
     */
    saveGraphToDisk = (graph : LogicalGraph) : void => {
        console.log("saveGraphToDisk()", graph.fileInfo().name, graph.fileInfo().type);

        // check that the fileType has been set for the logicalGraph
        if (graph.fileInfo().type !== Eagle.FileType.Graph){
            Utils.showUserMessage("Error", "Graph fileType not set correctly. Could not save file.");
            return;
        }

        // generate filename if necessary
        if (graph.fileInfo().name === "") {
            // abort and notify user
            Utils.showNotification("Unable to save Graph with no name", "Please name the graph before saving", "danger");
            return;
        }

        // clone the logical graph and remove github info ready for local save
        const lg_clone : LogicalGraph = this.logicalGraph().clone();
        lg_clone.fileInfo().removeGitInfo();
        lg_clone.fileInfo().updateEagleInfo();
        const jsonString : string = LogicalGraph.toOJSJsonString(lg_clone, false);

        // validate json
        Utils.validateJSON(jsonString, Eagle.FileType.Graph);

        Utils.httpPostJSONString('/saveFileToLocal', jsonString, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            Utils.downloadFile(error, data, graph.fileInfo().name);

            // since changes are now stored locally, the file will have become out of sync with the GitHub repository, so the association should be broken
            // clear the modified flag
            graph.fileInfo().modified = false;
            graph.fileInfo().repositoryService = Repository.Service.File;
            graph.fileInfo().repositoryName = "";
            graph.fileInfo().repositoryUrl = "";
            graph.fileInfo().commitHash = "";
            graph.fileInfo().downloadUrl = "";
            graph.fileInfo.valueHasMutated();
        });
    }

    savePaletteToGit = (palette: Palette): void => {
        console.log("savePaletteToGit()", palette.fileInfo().name, palette.fileInfo().type);

        const defaultRepository: Repository = new Repository(palette.fileInfo().repositoryService, palette.fileInfo().repositoryName, palette.fileInfo().repositoryBranch, false);

        Utils.requestUserGitCommit(defaultRepository, Repositories.getList(Repository.Service.GitHub),  palette.fileInfo().path, palette.fileInfo().name, Eagle.FileType.Palette, (completed : boolean, repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            const repository : Repository = Repositories.get(repositoryService, repositoryName, repositoryBranch);
            if (repository === null){
                console.log("Abort commit");
                return;
            }

            // get access token for this type of repository
            let token : string;

            switch (repositoryService){
                case Repository.Service.GitHub:
                    token = Setting.findValue(Setting.GITHUB_ACCESS_TOKEN_KEY);
                    break;
                case Repository.Service.GitLab:
                    token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
                    return;
            }

            // check that access token is defined
            if (token === null || token === "") {
                Utils.showUserMessage("Error", "The GitHub access token is not set! To save files on GitHub, set the access token.");
                return;
            }

            const fullFileName : string = Utils.joinPath(filePath, fileName);

            // clone the palette
            const p_clone : Palette = palette.clone();
            p_clone.fileInfo().updateEagleInfo();
            const jsonString: string = Palette.toOJSJsonString(p_clone);

            const commitJsonString: string = Utils.createCommitJsonString(jsonString, repository, token, fullFileName, commitMessage);

            this.saveFileToRemote(repository, filePath, fileName, Eagle.FileType.Palette, palette.fileInfo, commitJsonString);
        });
    }

    setTranslatorUrl = () : void => {
        const translatorURLSetting : Setting = Setting.find(Setting.TRANSLATOR_URL);

        Utils.requestUserString("Translator Url", "Enter the Translator Url", translatorURLSetting.value(), false, (completed : boolean, userString : string) : void => {
            // abort if user cancelled the action
            if (!completed)
                return;

            translatorURLSetting.value(userString);
        });
    };

    translatorAlgorithmVisible = ( currentAlg:string) : boolean => {
        const normalTranslatorMode :boolean = Setting.findValue(Setting.USER_TRANSLATOR_MODE) === Setting.TranslatorMode.Normal;
        if(!normalTranslatorMode){
            return true
        }
        if(currentAlg === Setting.findValue(Setting.TRANSLATOR_ALGORITHM_DEFAULT)){
            return true
        }
    
        return false
    }
    
    saveGraphScreenshot = async () : Promise<void> =>  {
        const eagle = Eagle.getInstance()

        const mediaDevices = navigator.mediaDevices as any; //workaround to prevent a Typescript issue with giving getDisplayMedia funciton an option
        const stream:MediaStream = await mediaDevices.getDisplayMedia({preferCurrentTab: true,selfBrowserSurface: 'include'});

        //prepare the graph for a screenshot
        eagle.centerGraph()
        eagle.setSelection(Eagle.RightWindowMode.Hierarchy,null,Eagle.FileType.Graph)
        document.querySelector('body').style.cursor = 'none';//temporarily disabling the cursor so it doesnt appear in the screenshot
        
        try {        
            const width = stream.getVideoTracks()[0].getSettings().width
            const height = stream.getVideoTracks()[0].getSettings().height
            
            const video = document.createElement("video")
            video.srcObject = stream
            video.autoplay = true
        
            await new Promise((resolve, reject) => {
                video.onloadeddata = resolve
                video.onerror = reject
            })

            setTimeout(() => {
                const canvas = document.createElement("canvas")
                canvas.width = width
                canvas.height = height

                //cropping the ui, so the screenshot only includes the graph
                const ctx = canvas.getContext('2d');
                const realwidth = window.innerWidth
                const divisor = realwidth/width

                const lx = (eagle.leftWindow().width()+50)/divisor
                const rx = (eagle.rightWindow().width()+50)/divisor
                const ly = 90/divisor
                canvas.width=width-rx-lx//trimming the right window
                ctx.translate(-lx,-ly)

                canvas.getContext("2d").drawImage(video, 0, 0)
                const png = canvas.toDataURL()

                // Element that will be used for downloading.
                const a : HTMLAnchorElement = document.createElement("a");
                a.style.display = "none";
                a.href = png;
                const name = eagle.logicalGraph().fileInfo().name.split(".")[0]
                a.download = name + ".png";

                // Add to document, begin download and remove from document.
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(a.href);
                document.body.removeChild(a);
                document.querySelector('body').style.cursor = 'auto';
            }, 400);
        } finally {
            setTimeout(() => {
            stream.getTracks().forEach((track) => track.stop())
            }, 500);
        }
    }

    toggleCollapseAllGroups = () : void => {
        // first work out whether we should be collapsing or expanding
        let numCollapsed: number = 0;
        let numExpanded: number = 0;
        for (const node of this.logicalGraph().getNodes()){
            if (node.isGroup()){
                if (node.isCollapsed()){
                    numCollapsed += 1;
                } else {
                    numExpanded += 1;
                }
            }
        }
        const collapse: boolean = numExpanded > numCollapsed;

        // now loop through and collapse or expand all group nodes
        for (const node of this.logicalGraph().getNodes()){
            if (node.isGroup()){
                node.setCollapsed(collapse);
            }
        }

        // trigger re-render
        this.logicalGraph.valueHasMutated();
    }

    toggleCollapseAllNodes = () : void => {
        // first work out whether we should be collapsing or expanding
        let numCollapsed: number = 0;
        let numExpanded: number = 0;
        for (const node of this.logicalGraph().getNodes()){
            if (!node.isGroup() && !node.isData()){
                if (node.isCollapsed()){
                    numCollapsed += 1;
                } else {
                    numExpanded += 1;
                }
            }
        }
        const collapse: boolean = numExpanded > numCollapsed;

        // now loop through and collapse or expand all group nodes
        for (const node of this.logicalGraph().getNodes()){
            if (node.isData()){
                node.setCollapsed(true);
            }

            if (!node.isGroup() && !node.isData()){
                node.setCollapsed(collapse);
            }
        }

        // trigger re-render
        this.logicalGraph.valueHasMutated();
    }

    toggleEdgeClosesLoop = () : void => {
        this.selectedEdge().toggleClosesLoop();

        // get nodes from edge
        const sourceNode = this.logicalGraph().findNodeById(this.selectedEdge().getSrcNodeId());
        const destNode = this.logicalGraph().findNodeById(this.selectedEdge().getDestNodeId());

        sourceNode.setGroupEnd(this.selectedEdge().isClosesLoop());
        destNode.setGroupStart(this.selectedEdge().isClosesLoop());

        this.checkGraph();

        const groupStartValue = destNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_START).getValue();
        const groupEndValue = sourceNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_END).getValue();
        Utils.showNotification(
            "Toggle edge closes loop",
            "Node " + sourceNode.getName() + " component parameter '" + Daliuge.FieldName.GROUP_END + "' set to " + groupEndValue + ". Node " + destNode.getName() + " component parameter '" + Daliuge.FieldName.GROUP_START + "' set to " + groupStartValue + ".", "success"
        );

        this.selectedObjects.valueHasMutated();
        this.logicalGraph.valueHasMutated();
    }

    showAbout = () : void => {
        $('#aboutModal').modal('show');
    }

    onlineDocs = () : void => {
        console.log("online help");

        // open in new tab:
        window.open(
          'https://eagle-dlg.readthedocs.io/',
          '_blank'
        );
    }

    readme = () : void => {
        console.log("readme");

        // open in new tab:
        window.open(
          'https://github.com/ICRAR/EAGLE/blob/master/README.md',
          '_blank'
        );
    }

    submitIssue = () : void => {
        console.log("submitIssue");

        // automatically add the EAGLE version and commit hash to the body of the new issue
        let bodyText: string = "\n\nVersion: "+(<any>window).version+"\nCommit Hash: "+(<any>window).commit_hash;

        // url encode the body text
        bodyText = encodeURI(bodyText);

        // open in new tab
        window.open("https://github.com/ICRAR/EAGLE/issues/new?body="+bodyText, "_blank");
    }

    // TODO: move to Setting.ts?
    openSettings = () : void => {
        //if no tab is selected yet, default to the first tab
        if(!$(".settingCategoryActive").length){
            $(".settingsModalButton").first().trigger("click")
        }
        Utils.showSettingsModal();
    }

    closeSettings = () : void => {
        Utils.hideSettingsModal();
    }

    closeErrorsModal = () : void => {
        Utils.closeErrorsModal();
    }

    smartToggleModal = (modal:string) : void => {
        //used for keyboard shortcuts, preventing opening several modals at once
        if($('.modal.show').length>0){
            if($('.modal.show').attr('id')===modal){
                $('#'+modal).modal('hide')
            }else{
                return
            }
        }else{
            if(modal === 'settingsModal'){
                if(!$(".settingCategoryActive").length){
                    $(".settingsModalButton").first().trigger("click")
                }
            }
            $('#'+modal).modal('show')
        }
    }

    showEagleIsLoading = () : void => {
        $('#loadingContainer').show()
    }

    hideEagleIsLoading = () : void => {
        $('#loadingContainer').hide()
    }

    openParamsTableModal = (mode:string,selectType:string) : void => {
        this.showEagleIsLoading()
        const eagle = this
        setTimeout(function(){
            if($('.modal.show').length>0){
                if($('.modal.show').attr('id')==='parameterTableModal'){
                    $('#parameterTableModal').modal('hide')
                    eagle.showTableModal(false)
                }else{
                    return
                }
            }
            if(selectType === 'rightClick'){
                eagle.setSelection(Eagle.RightWindowMode.Inspector, Eagle.selectedRightClickObject(), Eagle.selectedRightClickLocation())

                RightClick.closeCustomContextMenu(true);

                setTimeout(function() {
                    Utils.showOpenParamsTableModal(mode);
                }, 30);
            }else{
                if (mode==='inspectorTableModal' && !eagle.selectedNode()){
                    eagle.hideEagleIsLoading()
                    Utils.showNotification("Error", "No Node Is Selected", "warning");
                }else{
                    Utils.showOpenParamsTableModal(mode);
                }
            }
            eagle.showTableModal(true)

        },5)
    }

    openParamsTableModalAndSelectField = (node:Node, field:Field) : void => {
        const eagle = Eagle.getInstance()

        eagle.setSelection(Eagle.RightWindowMode.None, node,Eagle.FileType.Graph)
        eagle.openParamsTableModal('inspectorTableModal','normal')
        setTimeout(function(){
            $('#tableRow_'+field.getId()).addClass('highlighted')
        },200)
    }

    getCurrentParamReadonly = (field: Field) : boolean => {
        // check that we actually found the right field, otherwise abort
        if (field === null){
            console.warn("Supplied field is null");
            return false;
        }

        if(Eagle.selectedLocation() === Eagle.FileType.Palette){
            if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                return false;
            }else{
                return field.isReadonly();
            }
        }else{
            if(Setting.findValue(Setting.ALLOW_COMPONENT_EDITING)){
                return false;
            }else{
                return field.isReadonly();
            }
        }
    }

    getCurrentParamValueReadonly = (field: Field) : boolean => {
        // check that we actually found the right field, otherwise abort
        if (field === null){
            console.warn("Supplied field is null");
            return true;
        }

        if(Eagle.selectedLocation() === Eagle.FileType.Palette && Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
            return false;
        }
        
        if (Eagle.selectedLocation() != Eagle.FileType.Palette && Setting.findValue(Setting.ALLOW_COMPONENT_EDITING)){
            return false;
        }
        
        if(Setting.findValue(Setting.VALUE_EDITING_PERMS) === Setting.valueEditingPerms.ReadOnly){
            return false;
        }
        if(Setting.findValue(Setting.VALUE_EDITING_PERMS) === Setting.valueEditingPerms.Normal){
            return field.isReadonly();
        }
        if(Setting.findValue(Setting.VALUE_EDITING_PERMS) === Setting.valueEditingPerms.KeyOnly){
            return !field.isKeyAttribute() || field.isReadonly();
        }
        
        console.warn("something in value readonly permissions has one wrong!");
        return true
    }

    // TODO: move to Setting.ts?
    toggleSettingsTab = (btn:any, target:any) :void => {
        //deselect and deactivate current tab content and buttons
        $(".settingsModalButton").removeClass("settingCategoryBtnActive");
        $(".settingsModalCategoryWrapper").removeClass("settingCategoryActive");

        //activate selected tab content and button
        $("#"+btn).addClass("settingCategoryBtnActive");
        $("#"+target).addClass("settingCategoryActive");
    }

    // TODO: move to KeyboardShortcut.ts?
    openShortcuts = () : void => {
        if(!Eagle.shortcutModalCooldown || Date.now() >= (Eagle.shortcutModalCooldown + 500)){
            Eagle.shortcutModalCooldown = Date.now()
            Utils.showShortcutsModal();
        }
    }

    closeShortcuts = () : void => {
        Utils.closeShortcutsModal();
    }

    // TODO: move to Setting.ts?
    //copies currently set settings in case the user wishes to cancel changes in the setting modal
    copyCurrentSettings = () : void => {
        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                setting.copyCurrentSettings();
            }
        }
    }

    // TODO: move to Setting.ts?
    //returns settings values to the previously copied settings, canceling the settings editing
    cancelSettingChanges = () : void => {
        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                setting.cancelChanges();
            }
        }
    }

    addEdgeToLogicalGraph = () : void => {
        // check that graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.showNotification("Unable to Add Edge", "Graph Editing is disabled", "danger");
            return;
        }

        // check that there is at least one node in the graph, otherwise it is difficult to create an edge
        if (this.logicalGraph().getNumNodes() === 0){
            Utils.showNotification("Unable to Add Edge", "Can't add an edge to a graph with zero nodes.", "danger");
            return;
        }

        // if input edge is null, then we are creating a new edge here, so initialise it with some default values
        const newEdge = new Edge(this.logicalGraph().getNodes()[0].getId(), null, this.logicalGraph().getNodes()[0].getId(), null, false, false, false);

        // display edge editing modal UI
        Utils.requestUserEditEdge(newEdge, this.logicalGraph(), (completed: boolean, edge: Edge) => {
            if (!completed){
                console.log("User aborted addEdgeToLogicalGraph()");
                return;
            }

            // validate edge
            const isValid: Errors.Validity = Edge.isValid(this, false, edge.getId(), edge.getSrcNodeId(), edge.getSrcPortId(), edge.getDestNodeId(), edge.getDestPortId(), edge.isLoopAware(), edge.isClosesLoop(), false, true, null);
            if (isValid === Errors.Validity.Impossible || isValid === Errors.Validity.Error || isValid === Errors.Validity.Unknown){
                Utils.showUserMessage("Error", "Invalid edge");
                return;
            }

            const srcNode: Node = this.logicalGraph().findNodeById(edge.getSrcNodeId());
            const srcPort: Field = srcNode.findFieldById(edge.getSrcPortId());
            const destNode: Node = this.logicalGraph().findNodeById(edge.getDestNodeId());
            const destPort: Field = destNode.findFieldById(edge.getDestPortId());

            // new edges might require creation of new nodes, don't use addEdgeComplete() here!
            this.addEdge(srcNode, srcPort, destNode, destPort, edge.isLoopAware(), edge.isClosesLoop(), () => {
                this.checkGraph();
                this.undo().pushSnapshot(this, "Add edge");
                // trigger the diagram to re-draw with the modified edge
                this.logicalGraph.valueHasMutated();
            });
        });
    }

    editSelectedEdge = () : void => {
        const selectedEdge: Edge = this.selectedEdge();

        if (selectedEdge === null){
            Utils.showNotification("Unable to edit selected edge:", "No edge selected", "warning");
            return;
        }

        // check that graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.showNotification("Unable to Edit Edge", "Graph Editing is disabled", "danger");
            return;
        }

        // clone selected edge so that no changes to the original can be made by the user request modal
        const clone: Edge = selectedEdge.clone();

        Utils.requestUserEditEdge(clone, this.logicalGraph(), (completed: boolean, edge: Edge) => {
            if (!completed){
                console.log("User aborted editSelectedEdge()");
                return;
            }

            // validate edge
            const isValid: Errors.Validity = Edge.isValid(this, false, edge.getId(), edge.getSrcNodeId(), edge.getSrcPortId(), edge.getDestNodeId(), edge.getDestPortId(), edge.isLoopAware(), edge.isClosesLoop(), false, true, null);
            if (isValid === Errors.Validity.Impossible || isValid === Errors.Validity.Error || isValid === Errors.Validity.Unknown){
                Utils.showUserMessage("Error", "Invalid edge");
                return;
            }

            const srcNode: Node = this.logicalGraph().findNodeById(edge.getSrcNodeId());
            const srcPort: Field = srcNode.findFieldById(edge.getSrcPortId());
            const destNode: Node = this.logicalGraph().findNodeById(edge.getDestNodeId());
            const destPort: Field = destNode.findFieldById(edge.getDestPortId());

            // new edges might require creation of new nodes, we delete the existing edge and then create a new one using the full new edge pathway
            this.logicalGraph().removeEdgeById(selectedEdge.getId());
            this.addEdge(srcNode, srcPort, destNode, destPort, edge.isLoopAware(), edge.isClosesLoop(), () => {
                this.checkGraph();
                this.undo().pushSnapshot(this, "Edit edge");
                // trigger the diagram to re-draw with the modified edge
                this.logicalGraph.valueHasMutated();
            });
        });
    }

    duplicateSelection = (mode:string) : void => {
        // console.log("duplicateSelection()", this.selectedObjects().length, "objects");

        if(this.selectedObjects().length === 0){
            Utils.showNotification('Unable to duplicate selection','No nodes are selected','warning')
            return
        }
        
        let location: string;
        let incomingNodes = []; // TODO: declare type

        if(mode === 'normal'){
            location = Eagle.selectedLocation()
            incomingNodes = this.selectedObjects()
        }else{
            location = Eagle.selectedRightClickLocation()
            incomingNodes.push(Eagle.selectedRightClickObject())
        }

        switch(location){
            case Eagle.FileType.Graph:
                {
                    // check that graph editing is allowed
                    if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
                        Utils.showNotification("Unable to Duplicate Selection", "Graph Editing is disabled", "danger");
                        return;
                    }

                    const nodes : Node[] = [];
                    const edges : Edge[] = [];
                    const errorsWarnings : Errors.ErrorsWarnings = {"errors":[], "warnings":[]};

                    // split objects into nodes and edges
                    for (const object of incomingNodes){
                        if (object instanceof Node){
                            nodes.push(object);
                        }

                        if (object instanceof Edge){
                            edges.push(object);
                        }
                    }

                    this.insertGraph(nodes, edges, null, errorsWarnings);
                    this.checkGraph();
                    this.undo().pushSnapshot(this, "Duplicate selection");
                    this.logicalGraph.valueHasMutated();
                }
                break;
            case Eagle.FileType.Palette:
                {
                    // check that palette editing is allowed
                    if (!Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                        Utils.showNotification("Unable to Duplicate Selection", "Palette Editing is disabled", "danger");
                        return;
                    }

                    const nodes: Node[] = [];

                    for (const object of incomingNodes){
                        if (object instanceof Node){
                            nodes.push(object);
                        }
                    }

                    this.addNodesToPalette(nodes);
                }
                break;
            default:
                console.error("Unknown selectedLocation", Eagle.selectedLocation());
                break;
        }
    }

    // TODO: currently only works when copying from the LG, doesn't work when copying from a palette!
    copySelectionToClipboard = (copyChildren: boolean) : void => {
        console.log("copySelectionToClipboard()");

        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // add all items in selection to the set of objects to copy
        // if copyChildren is true, add children of selected items too
        for (const object of this.selectedObjects()){
            if (object instanceof Node){
                if (copyChildren){
                    this._addNodeAndChildren(this.logicalGraph().getNodes(), object, nodes);
                } else {
                    this._addUniqueNode(nodes, object);
                }
            }

            if (object instanceof Edge){
                edges.push(object);
            }
        }

        // if copyChildren, add all edges adjacent to the nodes in the list objects
        if (copyChildren){
            for (const edge of this.logicalGraph().getEdges()){
                for (const node of nodes){
                    if (node.getId() === edge.getSrcNodeId() || node.getId() === edge.getDestNodeId()){
                        this._addUniqueEdge(edges, edge);
                    }
                }
            }
        }

        // TODO: serialise nodes and edges
        const serialisedNodes = [];
        for (const node of nodes){
            serialisedNodes.push(Node.toOJSGraphJson(node));
        }
        const serialisedEdges = [];
        for (const edge of edges){
            serialisedEdges.push(Edge.toOJSJson(edge));
        }

        const clipboard = {
            nodes: serialisedNodes,
            edges: serialisedEdges
        };
        
        // write to clipboard
        navigator.clipboard.writeText(JSON.stringify(clipboard)).then(
            () => {
                // success
                Utils.showNotification("Copied to clipboard", "Copied " + clipboard.nodes.length + " nodes and " + clipboard.edges.length + " edges.", "info");
            },
            () => {
                // error
                Utils.showNotification("Unable to copy to clipboard", "Your browser does not allow access to the clipboard for security reasons", "danger");
            }
        );
    }

    // NOTE: support func for copySelectionToKeyboard() above
    _addNodeAndChildren = (nodes: Node[], node: Node, output:Node[]) : void => {
        this._addUniqueNode(output, node);

        for (const n of nodes){
            if (n.getParentId() === node.getId()){
                this._addNodeAndChildren(nodes, n, output);
            }
        }
    }

    // NOTE: support func for copySelectionToKeyboard() above
    // only add the new node to the nodes list if it is not already present
    _addUniqueNode = (nodes: Node[], newNode: Node): void => {
        for (const node of nodes){
            if (node.getId() === newNode.getId()){
                return;
            }
        }

        nodes.push(newNode);
    }

    // NOTE: support func for copySelectionToKeyboard() above
    // only add the new edge to the edges list if it is not already present
    _addUniqueEdge = (edges: Edge[], newEdge: Edge): void => {
        for (const edge of edges){
            if (edge.getId() === newEdge.getId()){
                return;
            }
        }

        edges.push(newEdge);
    }

    pasteFromClipboard = async () => {
        console.log("pasteFromClipboard()");

        // check that graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.showNotification("Unable to Paste from Clipboard", "Graph Editing is disabled", "danger");
            return;
        }

        // check if browser supports reading text from clipboard, if not, explain to user
        if (typeof navigator.clipboard.readText === "undefined"){
            Utils.showNotification("Unable to paste data", "Your browser does not allow access to the clipboard for security reasons. Workaround this issue using the 'Graph > New > Add to Graph from JSON' menu item and pasting your clipboard manually", "danger");
            return;
        }

        let clipboard = null;

        try {
            clipboard = JSON.parse(await navigator.clipboard.readText());
        } catch(e) {
            Utils.showNotification("Unable to paste data", e.name + ": " + e.message, "danger");
            return;
        }

        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};
        const nodes : Node[] = [];
        const edges : Edge[] = [];

        for (const n of clipboard.nodes){
            const node = Node.fromOJSJson(n, errorsWarnings, false);

            nodes.push(node);
        }

        for (const e of clipboard.edges){
            const edge = Edge.fromOJSJson(e, errorsWarnings);

            edges.push(edge);
        }

        this.insertGraph(nodes, edges, null, errorsWarnings);

        // display notification to user
        if (!Errors.hasErrors(errorsWarnings) && !Errors.hasWarnings(errorsWarnings)){
            Utils.showNotification("Pasted from clipboard", "Pasted " + clipboard.nodes.length + " nodes and " + clipboard.edges.length + " edges.", "info");
        }

        // ensure changes are reflected in display
        this.checkGraph();
        this.undo().pushSnapshot(this, "Paste from Clipboard");
        this.logicalGraph.valueHasMutated();
    }

    selectAllInGraph = () : void => {
        const newSelection : (Node | Edge)[] = [];

        // add nodes
        for (const node of this.logicalGraph().getNodes()){
            newSelection.push(node);
        }

        // add edges
        for (const edge of this.logicalGraph().getEdges()){
            newSelection.push(edge);
        }

        // set selection
        this.selectedObjects(newSelection);
        Eagle.selectedLocation(Eagle.FileType.Graph);
    }

    selectNoneInGraph = () : void => {
        console.log("selectNoneInGraph()");

        this.selectedObjects([]);
    }

    addNodesToPalette = (nodes: Node[]) : void => {
        console.log("addNodesToPalette()");

        // build a list of palette names
        const paletteNames: string[] = this.buildWritablePaletteNamesList();

        // ask user to select the destination node
        Utils.requestUserChoice("Destination Palette", "Please select the palette to which you'd like to add the node(s)", paletteNames, 0, true, "New Palette Name", (completed : boolean, userChoiceIndex: number, userCustomChoice : string) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // if user made custom choice
            let userString: string = "";
            if (userChoiceIndex === paletteNames.length){
                userString = userCustomChoice;
            } else {
                userString = paletteNames[userChoiceIndex];
            }

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(userString)) {
                userString = userString + "." + Utils.getDiagramExtension(Eagle.FileType.Palette);
            }

            // get reference to palette (based on userString)
            const destinationPalette = this.findPalette(userString, true);

            // check that a palette was found
            if (destinationPalette === null){
                Utils.showUserMessage("Error", "Unable to find selected palette!");
                return;
            }

            for (const node of nodes){
                // skip non-node objects
                if (!(node instanceof Node)){
                    console.warn("addNodesToPalette(): skipped a non-node object");
                    continue;
                }

                // add clone to palette
                destinationPalette.addNode(node, true);

                // get key of just-added node
                const id: NodeId = destinationPalette.getNodes()[destinationPalette.getNodes().length - 1].getId();

                // check if clone has embedded applications, if so, add them to destination palette and remove
                if (node.hasInputApplication()){
                    destinationPalette.addNode(node.getInputApplication(), true);
                    destinationPalette.getNodes()[destinationPalette.getNodes().length - 1].setEmbedId(id);
                }
                if (node.hasOutputApplication()){
                    destinationPalette.addNode(node.getOutputApplication(), true);
                    destinationPalette.getNodes()[destinationPalette.getNodes().length - 1].setEmbedId(id);
                }

                // mark the palette as modified
                destinationPalette.fileInfo().modified = true;
                destinationPalette.sort();
            }
        });
    }

    // TODO: mode enum?
    addSelectedNodesToPalette = (mode:string) : void => {
        const nodes = []

        if(mode === 'normal'){
            for(const object of this.selectedObjects()){
                if ((object instanceof Node)){
                    nodes.push(object)
                }
            }
        }else{
            if ((Eagle.selectedRightClickObject() instanceof Node)){
                nodes.push(Eagle.selectedRightClickObject())
            }
        }

        if (nodes.length === 0){
            console.error("Attempt to add selected node to palette when no node selected");
            return;
        }

        this.addNodesToPalette(nodes);
    }

    deleteSelection = (rightClick: boolean, suppressUserConfirmationRequest: boolean, deleteChildren: boolean) : void => {
        let data: (Node | Edge)[] = [];
        let location: Eagle.FileType = Eagle.FileType.Unknown;

        GraphRenderer.clearPortPeek()

        // if no objects selected, warn user
        if (rightClick){
            data.push(Eagle.selectedRightClickObject())
            location = Eagle.selectedRightClickLocation();
        }else{
            data = this.selectedObjects()
            location = Eagle.selectedLocation();
        }

        // check that graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.showNotification("Unable to Delete Selection", "Graph Editing is disabled", "danger");
            return;
        }

        if (data.length === 0){
            console.warn("Unable to delete selection: Nothing selected");
            Utils.showNotification("Warning", "Unable to delete selection: Nothing selected", "warning");
            return;
        }

        // if in "hide data nodes" mode, then recommend the user delete edges in "show data nodes" mode instead
        if (!this.showDataNodes()){
            console.warn("Unable to delete selection: Editor is in 'hide data nodes' mode, and the current selection may be ambiguous. Please use 'show data nodes' mode before deleting.");
            Utils.showNotification("Warning", "Unable to delete selection: Editor is in 'hide data nodes' mode, and the current selection may be ambiguous. Please use 'show data nodes' mode before deleting.", "warning");
            return;
        }

        // skip confirmation if setting dictates
        if (!Setting.find(Setting.CONFIRM_DELETE_OBJECTS).value() || suppressUserConfirmationRequest){
            this._deleteSelection(deleteChildren, data, location);
            
            // if we're NOT in rightClick mode, empty the selected objects, should have all been deleted
            if(!rightClick){
                this.selectedObjects([]);
            }

            return;
        }

        // determine number of nodes and edges in current selection
        let numNodes: number = 0;
        let numEdges: number = 0;
        for (const object of data){
            if (object instanceof Node){
                numNodes += 1;
            }

            if (object instanceof Edge){
                numEdges += 1;
            }
        }

        // determine number of child nodes that would be deleted
        const childNodes: Node[] = [];
        const childEdges: Edge[] = [];

        // find child nodes
        for (const object of data){
            if (object instanceof Node){
                // find children of this node
                const children = this._findChildren(object);

                for (const child of children){
                    // check each child is not already in selectedObjects
                    if (this.objectIsSelected(child)){
                        continue;
                    }

                    // check each child is not already in childNodes
                    let found: boolean = false;
                    for (const cn of childNodes){
                        if (cn.getId() === child.getId()){
                            found = true;
                            break;
                        }
                    }

                    // add to childNodes
                    if (!found){
                        childNodes.push(child);
                    }
                }
            }
        }

        // find child edges
        for (const edge of this.logicalGraph().getEdges()){
            for (const node of childNodes){
                if (edge.getSrcNodeId() === node.getId() || edge.getDestNodeId() === node.getId()){
                    // check if edge is already in selectedObjects
                    if (this.objectIsSelected(edge)){
                        continue;
                    }

                    // check if edge is already in the childEdges list
                    let found = false;
                    for (const e of childEdges){
                        if (e.getId() === edge.getId()){
                            found = true;
                            break;
                        }
                    }

                    // push edge into childEdges (if not already in there)
                    if (!found){
                        childEdges.push(edge);
                    }
                }
            }
        }

        // build the confirmation message based on the current situation
        let confirmMessage: string = "Are you sure you wish to delete " + numEdges + " edge(s) and " + numNodes + " node(s)";

        // if no children exist, don't bother asking the user about them
        if (childNodes.length === 0 && childEdges.length === 0){
            confirmMessage += "?";
        } else {
            // if children will be deleted, let user know how many
            if (deleteChildren){
                confirmMessage += " (and their " + childNodes.length + " child node and " + childEdges.length + " child edges)?";
            } else {
                confirmMessage += "? All children will be preserved.";
            }
        }

        // request confirmation from user
        Utils.requestUserConfirm("Delete?", confirmMessage, "Yes", "No", Setting.find(Setting.CONFIRM_DELETE_OBJECTS), (confirmed : boolean) : void => {
            if (!confirmed){
                console.log("User aborted deleteSelection()");
                return;
            }

            this._deleteSelection(deleteChildren, data, location);

            // if we're NOT in rightClick mode, empty the selected objects, should have all been deleted
            if(!rightClick){
                this.selectedObjects([]);
            }
        });
    }

    private _findChildren = (parent : Node) : Node[] => {
        const children: Node[] = [];

        for(const node of this.logicalGraph().getNodes()){
            if (node.getParentId() === parent.getId()){
                children.push(node);
                children.push(...this._findChildren(node));
            }
        }

        return children;
    }

    private _deleteSelection = (deleteChildren: boolean, data: (Node | Edge)[], location: Eagle.FileType) : void => {
        switch(location){
            case Eagle.FileType.Graph:
                // if not deleting children, move them to different parents first
                if (!deleteChildren){
                    this._moveChildrenOfSelection();
                }

                // delete the selection
                for (const object of data){
                    if (object instanceof Node){
                        this.logicalGraph().removeNode(object);
                    }

                    if (object instanceof Edge){
                        this.logicalGraph().removeEdgeById(object.getId());
                    }
                }

                // flag LG has changed
                this.logicalGraph().fileInfo().modified = true;

                this.checkGraph();
                this.undo().pushSnapshot(this, "Delete Selection");
                break;

            case Eagle.FileType.Palette:

                for (const object of data){
                    if (object instanceof Node){
                        for (const palette of this.palettes()){
                            palette.removeNodeById(object.getId());

                            // TODO: only flag palette has changed if a node was removed
                            palette.fileInfo().modified = true;
                        }
                    }

                    // NOTE: do nothing with edges! shouldn't be any in palettes
                }
                break;

            default:
                console.warn("deleteSelection from unknown location", location);
                break;
        }    
    }

    // used before deleting a selection, if we wish to preserve the children of the selection
    private _moveChildrenOfSelection = () : void => {
        for (const object of this.selectedObjects()){
            if (object instanceof Node){
                for (const node of this.logicalGraph().getNodes()){
                    if (node.getParentId() === object.getId()){
                        node.setParentId(object.getParentId());
                    }
                }
            }
        }
    }

    addNodeToLogicalGraphAndConnect = (newNodeId: NodeId) : void => {
        this.addNodeToLogicalGraph(null, newNodeId, Eagle.AddNodeMode.ContextMenu, (node: Node)=>{
            const realSourceNode: Node = RightClick.edgeDropSrcNode;
            const realSourcePort: Field = RightClick.edgeDropSrcPort;
            const realDestNode: Node = node;
            let realDestPort = node.findPortByMatchingType(realSourcePort.getType(), !RightClick.edgeDropSrcIsInput);

            // if no dest port was found, just use first input port on dest node
            if (realDestPort === null){
                realDestPort = node.findPortOfAnyType(true);
            }

            // create edge (in correct direction)
            if (!RightClick.edgeDropSrcIsInput){
                this.addEdge(realSourceNode, realSourcePort, realDestNode, realDestPort, false, false, (edge: Edge) => {
                    this.checkGraph();
                    this.undo().pushSnapshot(this, "Add edge " + edge.getId());
                    this.logicalGraph.valueHasMutated();
                });

                // if the new node is a Data node, name the new node according to source port
                const newName = realSourcePort.getDisplayText();
                if (node.isData()){
                    node.setName(newName);
                }
                realDestPort.setDisplayText(newName);
            } else {
                this.addEdge(realDestNode, realDestPort, realSourceNode, realSourcePort, false, false, (edge: Edge) => {
                    this.checkGraph();
                    this.undo().pushSnapshot(this, "Add edge " + edge.getId());
                    this.logicalGraph.valueHasMutated();
                });

                // if the new node is a Data node, name the new node according to destination port
                const newName = realDestPort.getDisplayText();
                if (node.isData()){
                    node.setName(newName);
                }
                realSourcePort.setDisplayText(newName);
            }
        });
    }

    addNodeToLogicalGraph = (node: Node, nodeId: NodeId, mode: Eagle.AddNodeMode, callback: (node: Node) => void) : void => {
        let pos : {x:number, y:number};
        pos = {x:0,y:0}
        let searchAreaExtended = false; //used if we cant find space on the canvas, we then extend the search area for space and center the graph after adding to bring new nodes into view
        
        // check that graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.showNotification("Unable to Add Component", "Graph Editing is disabled", "danger");
            if (callback !== null) callback(null);
            return;
        }

        if(mode === Eagle.AddNodeMode.ContextMenu){
            // we addNodeToLogicalGraph is called from the ContextMenu, we expect node to be null. The node is specified by the nodeId instead
            console.assert(node === null);

            // try to find the node (by nodeId) in the palettes
            node = Utils.getPaletteComponentById(nodeId);

            // if node not found yet, try find in the graph
            if (node === null){
                node = this.logicalGraph().findNodeById(nodeId);
            }

            // use the position where the right click occurred
            pos = Eagle.selectedRightClickPosition;

            RightClick.closeCustomContextMenu(true);
        }

        // if node is a construct, set width and height a little larger
        if (node.isGroup()){
            node.setRadius(EagleConfig.MINIMUM_CONSTRUCT_RADIUS);
        }

        //if pos is 0 0 then we are not using drop location nor right click location. so we try to determine a logical place to put it
        if(pos.x === 0 && pos.y === 0){
            // get new position for node
            if (Eagle.nodeDropLocation.x === 0 && Eagle.nodeDropLocation.y === 0){
                const result = this.getNewNodePosition(node.getRadius());
                searchAreaExtended = result.extended
                pos = {x:result.x,y:result.y}
            } else {
                pos = Eagle.nodeDropLocation;
            }
        }

        this.addNode(node, pos.x, pos.y, (newNode: Node) => {
            // make sure the new node is selected
            this.setSelection(Eagle.RightWindowMode.Inspector, newNode, Eagle.FileType.Graph);

            // expand the new node, so the user can start connecting it to other nodes
            newNode.setCollapsed(false);

            // set parent (if the node was dropped on something)
            const parent : Node = this.logicalGraph().checkForNodeAt(newNode.getPosition().x, newNode.getPosition().y, newNode.getRadius(), true);

            // if a parent was found, update
            if (parent !== null && newNode.getParentId() !== parent.getId() && newNode.getId() !== parent.getId()){
                newNode.setParentId(parent.getId());
            }

            // if no parent found, update
            if (parent === null && newNode.getParentId() !== null){
                newNode.setParentId(null);
            }

            // determine whether we should also generate an object data drop along with this node
            const generateObjectDataDrop: boolean = Daliuge.isPythonInitialiser(newNode);

            // optionally generate a new PythonObject node
            if (generateObjectDataDrop){
                // determine a name for the new node
                let poName: string = Daliuge.FieldName.SELF; // use this as a fall-back default

                // use the dataType of the self field
                const selfField = newNode.getFieldByDisplayText(Daliuge.FieldName.SELF);
                if (selfField !== null){
                    poName = selfField.getType();
                }

                // get name of the "base" class from the PythonMemberFunction node,
                const baseNameField = newNode.getFieldByDisplayText(Daliuge.FieldName.BASE_NAME);
                if (baseNameField !== null){
                    poName = baseNameField.getValue();
                }

                // create node
                const poNode: Node = new Node(poName, "Instance of " + poName, Category.PythonObject);

                // add node to LogicalGraph
                const OBJECT_OFFSET_X = 100;
                const OBJECT_OFFSET_Y = 100;
                this.addNode(poNode, pos.x + OBJECT_OFFSET_X, pos.y + OBJECT_OFFSET_Y, (pythonObjectNode: Node) => {
                    // set parent to same as PythonMemberFunction
                    pythonObjectNode.setParentId(newNode.getParentId());

                    // copy all fields from a "PythonObject" node in the palette
                    Utils.copyFieldsFromPrototype(pythonObjectNode, Palette.BUILTIN_PALETTE_NAME, Category.PythonObject);

                    // find the "object" port on the PythonMemberFunction
                    let sourcePort: Field = newNode.findPortByDisplayText(Daliuge.FieldName.SELF, false, false);

                    // make sure we can find a port on the PythonMemberFunction
                    if (sourcePort === null){
                        sourcePort = Daliuge.selfField.clone();
                        sourcePort.setId(Utils.generateFieldId());
                        newNode.addField(sourcePort);
                        Utils.showNotification("Component Warning", "The PythonMemberFunction does not have a '" + Daliuge.FieldName.SELF + "' port. Added this port to enable connection.", "warning");
                    }

                    // create a new input/output "object" port on the PythonObject
                    const inputOutputPort = new Field(Utils.generateFieldId(), Daliuge.FieldName.SELF, "", "", "", true, sourcePort.getType(), false, null, false, Daliuge.FieldType.ComponentParameter, Daliuge.FieldUsage.InputOutput, false);
                    pythonObjectNode.addField(inputOutputPort);

                    // add edge to Logical Graph (connecting the PythonMemberFunction and the automatically-generated PythonObject)
                    this.addEdge(newNode, sourcePort, pythonObjectNode, inputOutputPort, false, false, null);
                });
            }

            this.checkGraph();
            this.undo().pushSnapshot(this, "Add node " + newNode.getName());
            this.logicalGraph.valueHasMutated();

            if (callback !== null){
                callback(newNode);
            }
        });
        
        if(searchAreaExtended){
            setTimeout(function(){
                Eagle.getInstance().centerGraph()
            },100)
        }
    }

    addGraphNodesToPalette = () : void => {
        //check if there are any nodes in the graph
        if  (this.logicalGraph().getNodes().length === 0){
            Utils.showNotification("Unable to add nodes to palette", "No nodes found in graph", "danger");
            return
        }

        // build a list of palette names
        const paletteNames: string[] = this.buildWritablePaletteNamesList();

        // ask user to select the destination node
        Utils.requestUserChoice("Destination Palette", "Please select the palette to which you'd like to add the nodes", paletteNames, 0, true, "New Palette Name", (completed : boolean, userChoiceIndex: number, userCustomChoice : string) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // if user made custom choice
            let userString: string = "";
            if (userChoiceIndex === paletteNames.length){
                userString = userCustomChoice;
            } else {
                userString = paletteNames[userChoiceIndex];
            }

            // if the userString is empty, then abort, we should not allow empty palette names
            if (userString === ""){
                Utils.showNotification("Invalid palette name", "Please enter a name for the new palette", "danger");
                return;
            }

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(userString)) {
                userString = userString + "." + Utils.getDiagramExtension(Eagle.FileType.Palette);
            }

            // get reference to palette (based on userString)
            const destinationPalette = this.findPalette(userString, true);

            // check that a palette was found
            if (destinationPalette === null){
                Utils.showUserMessage("Error", "Unable to find selected palette!");
                return;
            }

            // copy nodes to palette
            for (const node of this.logicalGraph().getNodes()){
                // check if clone has embedded applications, if so, add them to destination palette and remove
                if (node.hasInputApplication()){
                    destinationPalette.addNode(node.getInputApplication(), false);
                }
                if (node.hasOutputApplication()){
                    destinationPalette.addNode(node.getOutputApplication(), false);
                }

                destinationPalette.addNode(node, false);
            }

            // mark the palette as modified
            destinationPalette.fileInfo().modified = true;
        });
    }

    private buildWritablePaletteNamesList = () : string[] => {
        const paletteNames : string[] = [];
        for (const palette of this.palettes()){
            // skip the dynamically generated palette that contains all nodes
            if (palette.fileInfo().name === Palette.DYNAMIC_PALETTE_NAME){
                continue;
            }
            // skip the built-in palette
            if (palette.fileInfo().name === Palette.BUILTIN_PALETTE_NAME){
                continue;
            }
            // skip read-only palettes as well
            if (palette.fileInfo().readonly){
                continue;
            }

            paletteNames.push(palette.fileInfo().name);
        }

        return paletteNames;
    }

    private buildReadablePaletteNamesList = () : string[] => {
        const paletteNames : string[] = [];
        for (const palette of this.palettes()){
            paletteNames.push(palette.fileInfo().name);
        }

        return paletteNames;
    }

    findPalette = (name: string, createIfNotFound: boolean) : Palette => {
        let p: Palette = null;

        // look for palette in open palettes
        for (const palette of this.palettes()){
            if (palette.fileInfo().name === name){
                p = palette;
                break;
            }
        }

        // if user asked for a new palette, create one
        if (createIfNotFound && p === null){
            p = new Palette();
            p.fileInfo().name = name;
            p.fileInfo().readonly = false;
            this.palettes.unshift(p);
        }

        return p;
    }

    fetchDockerHTML = () : void => {
        // get reference to the selectedNode
        const selectedNode = this.selectedNode();

        // abort if no node selected
        if (selectedNode === null){
            Utils.showNotification("EAGLE", "Please select a node before running the Docker Hub Browser", "danger");
            return;
        }

        // get imageName, tag, digest values in currently selected node
        const imageField:  Field = selectedNode.getFieldByDisplayText(Daliuge.FieldName.IMAGE);
        const tagField:    Field = selectedNode.getFieldByDisplayText(Daliuge.FieldName.TAG);
        const digestField: Field = selectedNode.getFieldByDisplayText(Daliuge.FieldName.DIGEST);
        let image, tag, digest: string = "";

        // set values for the fields
        if (imageField !== null){
            image = imageField.getValue();
        }
        if (tagField !== null){
            tag = tagField.getValue();
        }
        if (digestField !== null){
            digest = digestField.getValue();
        }

        Modals.showBrowseDockerHub(image, tag, (completed: boolean) => {
            if (!completed){
                return;
            }

            const imageName = this.dockerHubBrowser().selectedImage();
            const tag = this.dockerHubBrowser().selectedTag();
            const digest = this.dockerHubBrowser().digest();

            // set values for the fields
            if (imageField !== null){
                imageField.setValue(imageName);
            }
            if (tagField !== null){
                tagField.setValue(tag);
            }
            if (digestField !== null){
                digestField.setValue(digest);
            }

            Utils.showNotification("EAGLE", "Image, tag and digest set from Docker Hub", "success");
        });
    }

    showExplorePalettes = () : void => {
        Utils.showPalettesModal(this);
    }

    // TODO: can probably combine addFieldHTML, addApplicationArgHTML, addConstructParameterHTML, addInputPortHTML, addOutputPortHTML
    //       they are all basically the same
    // TODO: the #nodeInspectorAddFieldDiv, #nodeInspectorAddApplicationParamDiv, #nodeInspectorAddConstructParameterDiv, #nodeInspectorAddInputPortDiv, #nodeInspectorAddOutputPortDiv
    //       element are all basically the same too (I think)

    // Adds an field to the selected node via HTML
    addFieldHTML = () : void => {
        const node: Node = this.selectedNode();

        if (node === null){
            console.error("Attempt to add field when no node selected");
            return;
        }

        this.editField(node, Eagle.ModalType.Add, Daliuge.FieldType.ComponentParameter, Daliuge.FieldUsage.NoPort, null);
        $("#editFieldModal").addClass("forceHide");
        $("#editFieldModal").removeClass("fade");
        $(".modal-backdrop").addClass("forceHide");
        $("#nodeInspectorAddFieldDiv").show();
    }

    // Adds an application param to the selected node via HTML
    addApplicationArgHTML = () : void => {
        const node: Node = this.selectedNode();

        if (node === null){
            console.error("Attempt to add application param when no node selected");
            return;
        }

        this.editField(node, Eagle.ModalType.Add, Daliuge.FieldType.ApplicationArgument, Daliuge.FieldUsage.NoPort, null);
        $("#editFieldModal").addClass("forceHide");
        $("#editFieldModal").removeClass("fade");
        $(".modal-backdrop").addClass("forceHide");
        $("#nodeInspectorAddApplicationParamDiv").show();
    }

    // Adds an construct parameter to the selected node via HTML
    addConstructParameterHTML = () : void => {
        const node: Node = this.selectedNode();

        if (node === null){
            console.error("Attempt to add construct parameter when no node selected");
            return;
        }

        this.editField(node, Eagle.ModalType.Add, Daliuge.FieldType.ConstructParameter, Daliuge.FieldUsage.NoPort, null);
        $("#editFieldModal").addClass("forceHide");
        $("#editFieldModal").removeClass("fade");
        $(".modal-backdrop").addClass("forceHide");
        $("#nodeInspectorAddConstructParameterDiv").show();
    }

    // Adds an output port to the selected node via HTML
    addInputPortHTML = () : void => {
        const node: Node = this.selectedNode();

        if (node === null){
            console.error("Attempt to add input port when no node selected");
            return;
        }

        this.editField(node, Eagle.ModalType.Add, Daliuge.FieldType.ApplicationArgument, Daliuge.FieldUsage.InputPort, null);
        $("#editFieldModal").addClass("forceHide");
        $("#editFieldModal").removeClass("fade");
        $(".modal-backdrop").addClass("forceHide");
    }

    // Adds an output port to the selected node via HTML
    addOutputPortHTML = () : void => {
        const node: Node = this.selectedNode();

        if (node === null){
            console.error("Attempt to add output port when no node selected");
            return;
        }

        this.editField(node, Eagle.ModalType.Add, Daliuge.FieldType.ApplicationArgument, Daliuge.FieldUsage.OutputPort, null);
        $("#editFieldModal").addClass("forceHide");
        $("#editFieldModal").removeClass("fade");
        $(".modal-backdrop").addClass("forceHide");
        $("#nodeInspectorAddOutputPortDiv").show();
    }

    getInspectorHeadingTooltip = (title:string, category:any, description:any) : string => {
        const tooltipText = "<h5>"+title+":</h5>"+category+"<br>"+description;
        return tooltipText;
    }

    // hide the drop down menu that appears when the user is adding a new field
    hideDropDown = (divID:string) : void => {
        if (divID === "nodeInspectorAddFieldDiv"){
            //hides the dropdown node inspector elements when stopping hovering over the element
            if(!$("#editFieldModal").hasClass("nodeSelected")){
                $("#editFieldModal").modal('hide');
                $("#editFieldModal").addClass("fade");
            }
        }

        $("#editFieldModal").removeClass("nodeSelected");
        $("#"+divID).hide();
    }

    addEmptyTableRow = () : void => {
        let fieldIndex:number

        if(ParameterTable.hasSelection()){
            // A cell in the table is selected well insert new row instead of adding at the end
            fieldIndex = ParameterTable.selectionParentIndex() + 1
            this.selectedNode().addEmptyField(fieldIndex)
        }else{
            this.selectedNode().addEmptyField(-1)

            //getting the length of the array to use as an index to select the last row in the table
            fieldIndex = this.selectedNode().getFields().length-1;
        }

        //a timeout was necessary to wait for the element to be added before counting how many there are
        setTimeout(function() {
            //handling selecting and highlighting the newly created row
            const clickTarget = $($("#paramsTableWrapper tbody").children()[fieldIndex]).find('.selectionTargets')[0]

            clickTarget.click() //simply clicking the element is best as it also lets knockout handle all of the selection and observable update processes
            clickTarget.focus() // used to focus the field allowing the user to immediately start typing
            $(clickTarget).trigger("select")

            //scroll to new row
            $("#parameterTableModal .modal-body").animate({
                scrollTop: (fieldIndex*30)
            }, 1000);
        }, 100);
    }

    // TODO: this is a bit difficult to understand, it seems like it is piggy-backing
    // an old UI that is no longer used, perhaps we should just call Eagle.editField(..., 'Add', ...)
    nodeInspectorDropdownClick = (val:number, divID:string) : void => {
        const selectSectionID : string = "fieldModalSelect";
        const modalID : string = "editFieldModal";
        const submitBtnID: string = "editFieldModalAffirmativeButton";

        // val -1 is an empty option, so just close the dropdown
        if (val===-1){
            this.hideDropDown(divID);
            return;
        }

        if (val===0){
            //select custom field externally and open custom properties menu
            $("#"+divID).hide();
            $("#"+selectSectionID).val(val).trigger('change');
            $("#"+modalID).addClass("nodeSelected");

            // triggers the 'add application argument' modal to show
            $("#"+modalID).removeClass("forceHide");

            // triggers the modal 'lightbox' to show
            $(".modal-backdrop").removeClass("forceHide");
        }else{
            console.log('bop',this.selectedNode().getFields()[val].getDisplayText())
            this.currentField(this.selectedNode().getFields()[val])
            $("#"+selectSectionID).val(val).trigger('change');
            $("#"+modalID).addClass("nodeSelected");
            $("#"+modalID).removeClass("forceHide");   
            $(".modal-backdrop").removeClass("forceHide");
            $("#"+submitBtnID).trigger("click")
            this.hideDropDown(divID)
        }
    }

    editFieldDropdownClick = (newType: string, oldType: string) : void => {
        // check if the types already match, therefore nothing to do
        if (Utils.dataTypePrefix(oldType) === newType){
            return;
        }

        // NOTE: this changes the value (using val()), then triggers a change event, so that validation can be done
        $('#editFieldModalTypeInput').val(newType).trigger("change");
    }

    tableDropdownClick = (newType:string, field: Field) : void => {
        // if the field contains no options, then it's value will be immediately set to undefined
        // therefore, we add at least one option, so the value remains well defined
        if (newType === Daliuge.DataType.Select){
            if (field.getOptions().length === 0){
                field.addOption(field.getValue());
                field.addOption(field.getDefaultValue());
            }
        }

        // update the type of the field
        field.setType(newType);

    }

    changeNodeParent = () : void => {
        // build list of node name + ids (exclude self)
        const selectedNode: Node = this.selectedNode();

        if (selectedNode === null){
            Utils.showNotification("Unable to Change Node Parent", "Attempt to change parent node when no node selected", "warning");
            return;
        }

        // check that graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.showNotification("Unable to Change Node Parent", "Graph Editing is disabled", "danger");
            return;
        }

        const nodeList : string[] = [];
        let selectedChoiceIndex = 0;

        //this is needed for the selected choice index as the index of the function will not work because many entries a skipped, the selected choice index was generally higher than the amount of legitimate choices available
        let validChoiceIndex = 0

        // build list of nodes that are candidates to be the parent
        for (const node of this.logicalGraph().getNodes()){
            // a node can't be its own parent
            if (node.getId() === selectedNode.getId()){
                continue;
            }

            // only group (construct) nodes can be parents
            if (!node.isGroup()){
                continue;
            }

            // this index only counts up if the above doesn't filter out the choice
            validChoiceIndex++

            // if this node is already the parent, note its index, so that we can preselect this parent node in the modal dialog
            if (node.getId() === selectedNode.getParentId()){
                selectedChoiceIndex = validChoiceIndex;
            }

            nodeList.push(node.getName() + " : " + node.getId());
        }

        // add "None" to the list of possible parents
        nodeList.unshift("None : 0");

        // ask user to choose a parent
        Utils.requestUserChoice("Node Parent Id", "Select a parent node", nodeList, selectedChoiceIndex, false, "", (completed : boolean, userChoiceIndex: number) => {
            if (!completed)
                return;

            const choice: string = nodeList[userChoiceIndex];

            // change the parent
            const newParentId: NodeId = choice.substring(choice.lastIndexOf(" ") + 1).toString() as NodeId

            // key '0' is a special case
            if (newParentId === null){
                selectedNode.setParentId(null);
            } else {
                selectedNode.setParentId(newParentId);
            }

            // refresh the display
            this.checkGraph();
            this.undo().pushSnapshot(this, "Change Node Parent");
            this.selectedObjects.valueHasMutated();
            this.logicalGraph.valueHasMutated();
        });
    }

    changeNodeSubject = () : void => {
        // build list of node name + ids (exclude self)
        const selectedNode: Node = this.selectedNode();

        if (selectedNode === null){
            Utils.showNotification('Unable to change node subject','No node selected!','warning')
            return;
        }

        const nodeList : string[] = [];
        let selectedChoiceIndex = 0;

        // build list of nodes that are candidates to be the subject
        for (let i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            const node : Node = this.logicalGraph().getNodes()[i];

            // if this node is already the subject, note its index, so that we can preselect this subject node in the modal dialog
            if (node.getId() === selectedNode.getSubjectId()){
                selectedChoiceIndex = i;
            }

            // comment and description nodes can't be the subject of comment nodes
            if (node.getCategory() === Category.Comment || node.getCategory() === Category.Description){
                continue;
            }

            nodeList.push(node.getName() + " : " + node.getId());
        }

        // ask user for parent
        Utils.requestUserChoice("Node Subject Id", "Select a subject node", nodeList, selectedChoiceIndex, false, "", (completed : boolean, userChoiceIndex: number) => {
            if (!completed)
                return;

            const choice = nodeList[userChoiceIndex];

            // change the subject
            const newSubjectId: NodeId = choice.substring(choice.lastIndexOf(" ") + 1) as NodeId;
            selectedNode.setSubjectId(newSubjectId);

            // refresh the display
            this.checkGraph();
            this.undo().pushSnapshot(this, "Change Node Subject");
            this.selectedObjects.valueHasMutated();
            this.logicalGraph.valueHasMutated();
        });
    }

    removeFieldFromNodeById = (node : Node, id: string) : void => {
        console.log("removeFieldFromNodeById(): node", node.getName(), "id", id);

        if (node === null){
            console.warn("Could not remove port from null node");
            return;
        }

        // remove port
        node.removeFieldById(id);

        // remove any edges connected to that port
        const edges : Edge[] = this.logicalGraph().getEdges();

        for (let i = edges.length - 1; i >= 0; i--){
            if (edges[i].getSrcPortId() === id || edges[i].getDestPortId() === id){
                console.log("Remove incident edge", edges[i].getSrcPortId(), "->", edges[i].getDestPortId());
                edges.splice(i, 1);
            }
        }

        this.checkGraph();
        this.undo().pushSnapshot(this, "Remove port from node");
        this.flagActiveFileModified();
        this.selectedObjects.valueHasMutated();
    }

    nodeDropLogicalGraph = (eagle : Eagle, event: JQuery.TriggeredEvent) : void => {
        const e: DragEvent = event.originalEvent as DragEvent;

        // keep track of the drop location
        Eagle.nodeDropLocation = {x:GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(e.pageX),y:GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(e.pageY)}

        // determine dropped node
        const sourceComponents : Node[] = [];

        if(Eagle.nodeDragPaletteIndex === null || Eagle.nodeDragComponentIndex === null){
            return;
        }

        // if some node in the graph is selected, ignore it and used the node that was dragged from the palette
        if (Eagle.selectedLocation() === Eagle.FileType.Graph || Eagle.selectedLocation() === Eagle.FileType.Unknown){
            const component = this.palettes()[Eagle.nodeDragPaletteIndex].getNodes()[Eagle.nodeDragComponentIndex];
            sourceComponents.push(component);
        }

        // if a node or nodes in the palette are selected, then assume those are being moved to the destination
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            for (const object of this.selectedObjects()){
                if (object instanceof Node){
                    sourceComponents.push(object);
                }
            }
        }

        // add each of the nodes we are moving
        for (const sourceComponent of sourceComponents){
            this.addNodeToLogicalGraph(sourceComponent, null, Eagle.AddNodeMode.Default, null);

            // to avoid placing all the selected nodes on top of each other at the same spot, we increment the nodeDropLocation after each node
            Eagle.nodeDropLocation.x += 20;
            Eagle.nodeDropLocation.y += 20;
        }

        // then reset the nodeDropLocation after all have been placed
        Eagle.nodeDropLocation = {x:0, y:0};
    }

    nodeDropPalette = (eagle: Eagle, event: JQuery.TriggeredEvent) : void => {
        const sourceComponents : Node[] = [];
        const e: DragEvent = event.originalEvent as DragEvent;

        if(Eagle.nodeDragPaletteIndex === null || Eagle.nodeDragComponentIndex === null){
            return;
        }

        // if some node in the graph is selected, ignore it and used the node that was dragged from the palette
        if (Eagle.selectedLocation() === Eagle.FileType.Graph || Eagle.selectedLocation() === Eagle.FileType.Unknown){
            const component = this.palettes()[Eagle.nodeDragPaletteIndex].getNodes()[Eagle.nodeDragComponentIndex];
            sourceComponents.push(component);
        }

        // if a node or nodes in the palette are selected, then assume those are being moved to the destination
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            for (const object of this.selectedObjects()){
                if (object instanceof Node){
                    sourceComponents.push(object);
                }
            }
        }

        // determine destination palette
        const destinationPaletteIndex : number = parseInt((e.currentTarget as HTMLElement).getAttribute('data-palette-index'), 10);
        const destinationPalette: Palette = this.palettes()[destinationPaletteIndex];

        const allowReadonlyPaletteEditing = Setting.findValue(Setting.ALLOW_READONLY_PALETTE_EDITING);

        // check user can write to destination palette
        if (destinationPalette.fileInfo().readonly && !allowReadonlyPaletteEditing){
            Utils.showUserMessage("Error", "Unable to copy component(s) to readonly palette.");
            return;
        }

        // copy all nodes that we are moving
        for (const sourceComponent of sourceComponents){
            // check that the destination palette does not already contain this exact node
            if (destinationPalette.findNodeById(sourceComponent.getId()) !== null){
                Utils.showUserMessage("Error", "Palette already contains an identical component.");
                return;
            }

            // add to destination palette
            destinationPalette.addNode(sourceComponent, true);
            destinationPalette.fileInfo().modified = true;
            destinationPalette.sort();
        }
    }

    paletteComponentClick = (node: Node, event: JQuery.TriggeredEvent) : void => {
        const e: PointerEvent = event.originalEvent as PointerEvent;
        
        if (e && e.shiftKey)
            this.editSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Palette);
        else
            this.setSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Palette);
    }

    selectInputApplicationNode = () : void => {
        this.setSelection(Eagle.RightWindowMode.Inspector, this.selectedNode().getInputApplication(), Eagle.FileType.Graph);
    }

    selectOutputApplicationNode = () : void => {
        this.setSelection(Eagle.RightWindowMode.Inspector, this.selectedNode().getOutputApplication(), Eagle.FileType.Graph);
    }

    // TODO: looks like the node argument is not used here (or maybe just not used in the 'edit' half of the func)?
    editField = (node:Node, modalType: Eagle.ModalType, parameterType: Daliuge.FieldType, usage: Daliuge.FieldUsage, id: string) : void => {
        // get field names list from the logical graph
        const allFields: Field[] = Utils.getUniqueFieldsOfType(this.logicalGraph(), parameterType);
        const allFieldNames: string[] = [];

        // once done, sort fields and then collect names into the allFieldNames list
        allFields.sort(Field.sortFunc);
        for (const field of allFields){
            allFieldNames.push(field.getDisplayText() + " (" + field.getType() + ")");
        }

        // if we are summoning this editField modal from the params table, close the params table
        if (modalType === Eagle.ModalType.Field){
            $('#parameterTableModal').modal("hide");
        }

        //if creating a new field
        if (modalType === Eagle.ModalType.Add) {
            $("#editFieldModalTitle").html(this.selectedNode().getName() + " - " + Field.getHtmlTitleText(parameterType, usage));

            // show hide part of the UI appropriate for adding
            $("#addParameterWrapper").show();

            // create a field variable to serve as temporary field when "editing" the information. If the add field modal is completed the actual field component parameter is created.
            const field: Field = new Field(Utils.generateFieldId(), "", "", "", "", false, Daliuge.DataType.Integer, false, [], false, Daliuge.FieldType.ComponentParameter, Daliuge.FieldUsage.NoPort, false);

            Utils.requestUserEditField(this, Eagle.ModalType.Add, parameterType, usage, field, allFieldNames, (completed : boolean, newField: Field) => {
                // abort if the user aborted
                if (!completed){
                    return;
                }

                // check selected option in select tag
                const choice : number = parseInt(<string>$('#fieldModalSelect').val(), 10);

                // abort if -1 selected
                if (choice === -1){
                    return;
                }
                console.log('choice: ', choice)
                // hide the custom text input unless the first option in the select is chosen
                if (choice === 0){
                    newField.setParameterType(parameterType);

                    //create field from user input in modal
                    node.addField(newField);

                } else {
                    console.log('field: ',this.currentField().getDisplayText())
                    const clone : Field = this.currentField().clone();
                    clone.setId(Utils.generateFieldId());
                    clone.setParameterType(parameterType);
                    node.addField(clone);
                }

                this.checkGraph();
                this.undo().pushSnapshot(this, "Add field");
            });

        } else {
            //if editing an existing field
            const field: Field = this.selectedNode().findFieldById(id);
            $("#editFieldModalTitle").html(this.selectedNode().getName() + " - " + field.getDisplayText() + " : " + Field.getHtmlTitleText(parameterType, usage));

            // check that we found a field
            if (field === null || typeof field === 'undefined'){
                console.error("Could not find the field to edit. parameterType", parameterType, "id", id);
                return;
            }

            $("#addParameterWrapper").hide();

            Utils.requestUserEditField(this, Eagle.ModalType.Edit, parameterType, usage, field, allFieldNames, (completed : boolean, newField: Field) => {
                // abort if the user aborted
                if (!completed){
                    return;
                }

                // update field data (keep existing nodeKey and id)
                field.copyWithIds(newField, field.getNodeId(), field.getId());

                this.checkGraph();
                this.undo().pushSnapshot(this, "Edit Field");

                // if we summoned this editField modal from the params table, now that we are done, re-open the params table
                if (modalType === Eagle.ModalType.Field){
                    $('#parameterTableModal').modal("show");
                }
            });
        }
    };

    duplicateParameter = (index:number) : void => {
        let fieldIndex:number //variable holds the index of which row to highlight after creation

        const copiedField = this.selectedNode().getFields()[index].clone()
        copiedField.setId(Utils.generateFieldId())
        copiedField.setDisplayText(copiedField.getDisplayText()+' copy')
        if(ParameterTable.hasSelection()){
            //if a cell in the table is selected in this case the new node will be placed below the currently selected node
            fieldIndex = ParameterTable.selectionParentIndex() + 1
            this.selectedNode().addFieldByIndex(copiedField,fieldIndex)
        }else{
            //if no call in the table is selected, in this case the new node is 
            this.selectedNode().addField(copiedField)
            fieldIndex = this.selectedNode().getFields().length -1
        }

        setTimeout(function() {
            //handling selecting and highlighting the newly created node
            const clickTarget = $($("#paramsTableWrapper tbody").children()[fieldIndex]).find('.selectionTargets')[0]
            clickTarget.click() //simply clicking the element is best as it also lets knockout handle all of the selection and observable update process
            clickTarget.focus() //used to focus the field allowing the user to immediately start typing 
            $(clickTarget).trigger("select")

            $("#parameterTableModal .modal-body").animate({
                scrollTop: (fieldIndex*30)
            }, 1000);
        }, 100);
    }

    showFieldValuePicker = (fieldIndex : number, input : boolean) : void => {
        const selectedNode = this.selectedNode();

        if (selectedNode === null){
            console.error("Attempt to show field picker when no node selected");
            return;
        }

        const selectedNodeId: NodeId = selectedNode.getId();

        console.log("ShowFieldValuePicker() node:", selectedNode.getName(), "fieldIndex:", fieldIndex, "input", input);

        // build list of nodes that are attached to this node
        const nodes : string[] = [];
        for (const edge of this.logicalGraph().getEdges()){
            // add output nodes to the list
            if (edge.getSrcNodeId() === selectedNodeId){
                const destNode : Node = this.logicalGraph().findNodeById(edge.getDestNodeId());
                const s : string = "output:" + destNode.getName() + ":" + destNode.getId();
                nodes.push(s);
            }

            // add input nodes to the list
            if (edge.getDestNodeId() === selectedNodeId){
                const srcNode : Node = this.logicalGraph().findNodeById(edge.getSrcNodeId());
                const s : string = "input:" + srcNode.getName() + ":" + srcNode.getId();
                nodes.push(s);
            }
        }

        // ask the user to choose a node
        Utils.requestUserChoice("Select node", "Choose the input or output node to connect to this parameter", nodes, 0, false, "", (completed : boolean, userChoiceIndex: number) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // split the user string into input/output, name, key
            const isInput : boolean = nodes[userChoiceIndex].split(":")[0] === "input";
            const key : string = nodes[userChoiceIndex].split(":")[2];

            let newValue : string;
            if (isInput){
                newValue = "%i[" + key + "]";
            } else {
                newValue = "%o[" + key + "]";
            }

            // update the correct field
            selectedNode.getFields()[fieldIndex].setValue(newValue);
        });
    }

    private setNodeApplication = (title: string, message: string, callback:(node:Node) => void) : void => {
        const applications: Node[] = this.getApplications();
        const applicationNames: string[] = [];
        for (const application of applications){
            applicationNames.push(application.getName())
        }

        // add "None" to the application list
        applicationNames.push(Node.NO_APP_STRING);

        Utils.requestUserChoice(title, message, applicationNames, 0, false, "", (completed : boolean, userChoiceIndex: number) => {
            if (!completed){
                return;
            }

            // abort if the user picked "None"
            if (userChoiceIndex === applicationNames.length - 1){
                console.log("User selected no application");
                callback(null);
                return;
            }

            const application : Node = applications[userChoiceIndex];

            // duplicate the input application
            const newNode: Node = Utils.duplicateNode(application);

            callback(newNode);
        });
    }

    getNewNodePosition = (radius: number) : {x:number, y:number, extended:boolean} => {
        const MARGIN = 100; // buffer to keep new nodes away from the maxX and maxY sides of the LG display area
        const navBarHeight = 84
        let suitablePositionFound = false;
        let numIterations = 0;
        let increaseSearchArea = false
        const MAX_ITERATIONS = 150;
        let x;
        let y;
        
        while (!suitablePositionFound && numIterations <= MAX_ITERATIONS){
            // get visible screen size
            let minX = this.leftWindow().shown() ? this.leftWindow().width()+MARGIN: 0+MARGIN;
            let maxX = this.rightWindow().shown() ? $('#logicalGraphParent').width() - this.rightWindow().width() - MARGIN : $('#logicalGraphParent').width() - MARGIN;
            let minY = 0 + navBarHeight + MARGIN;
            let maxY = $('#logicalGraphParent').height() - MARGIN + navBarHeight;
            if(increaseSearchArea){
                minX = minX - 300
                maxX = maxX + 300
                minY = minY - 300
                maxY = maxY + 300
            }

            // choose random position within minimums and maximums determined above
            const randomX = Math.floor(Math.random() * (maxX - minX + 1) + minX);
            const randomY = Math.floor(Math.random() * (maxY - minY + 1) + minY);

            x = randomX;
            y = randomY;

            // translate the chosen randomised position into graph co-ordinates
            x = GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(x)
            y = GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(y)

            // check position is suitable, doesn't collide with any existing nodes
            const collision = this.logicalGraph().checkForNodeAt(x, y, radius, false);
            suitablePositionFound = collision === null;

            numIterations += 1;
            if(numIterations>80){
                increaseSearchArea = true;
            }
        }

        // if we tried to find a suitable position 100 times, just print a console message
        if (numIterations > MAX_ITERATIONS){
            console.warn("Tried to find suitable position for new node", numIterations, "times and failed, using the last try by default.");
        }

        return {x:x, y:y, extended:increaseSearchArea};
    }

    copyGraphUrl = (): void => {
        // get reference to the LG fileInfo object
        const fileInfo: FileInfo = this.logicalGraph().fileInfo();

        // if we don't know where this file came from then we can't build a URL
        // for example, if the graph was loaded from local disk, then we can't build a URL for others to reach it
        if (fileInfo.repositoryService === Repository.Service.Unknown || fileInfo.repositoryService === Repository.Service.File){
            Utils.showNotification("Graph URL", "Source of graph is a local file or unknown, unable to create URL for graph.", "danger");
            return;
        }

        // build graph url
        let graph_url = window.location.origin;

        graph_url += "/?service=" + fileInfo.repositoryService;
        graph_url += "&repository=" + fileInfo.repositoryName;
        graph_url += "&branch=" + fileInfo.repositoryBranch;
        graph_url += "&path=" + encodeURI(fileInfo.path);
        graph_url += "&filename=" + encodeURI(fileInfo.name);

        // copy to clipboard
        navigator.clipboard.writeText(graph_url);

        // notification
        Utils.showNotification("Graph URL", "Copied to clipboard", "success");
    }

    checkGraph = (): void => {
        Utils.checkGraph(this);//validate the graph
        const graphErrors = Utils.gatherGraphErrors() //gather all the errors from all of the components
        
        this.graphWarnings(graphErrors.warnings);
        this.graphErrors(graphErrors.errors);
    };

    showGraphErrors = (): void => {
        if (this.graphWarnings().length > 0 || this.graphErrors().length > 0){

            // switch to graph errors mode
            this.errorsMode(Errors.Mode.Graph);

            // show graph modal
            this.smartToggleModal('issuesModal')
        } else {
            Utils.showNotification("Check Graph", "Graph OK", "success");
        }
    }

    addEdge = (srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean, callback: (edge: Edge) => void) : void => {
        // check that none of the supplied nodes and ports are null
        if (srcNode === null){
            console.warn("addEdge(): srcNode is null");
            if (callback !== null) callback(null);
            return;
        }
        if (srcPort === null){
            console.warn("addEdge(): srcPort is null");
            if (callback !== null) callback(null);
            return;
        }
        if (destNode === null){
            console.warn("addEdge(): destNode is null");
            if (callback !== null) callback(null);
            return;
        }
        if (destPort === null){
            console.warn("addEdge(): destPort is null");
            if (callback !== null) callback(null);
            return;
        }

        // check that graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.showNotification("Unable to Add Edge", "Graph Editing is disabled", "danger");
            if (callback !== null) callback(null);
            return;
        }

        const edgeConnectsTwoApplications : boolean =
            (srcNode.isApplication() || srcNode.isGroup()) &&
            (destNode.isApplication() || destNode.isGroup());

        const twoEventPorts : boolean = srcPort.getIsEvent() && destPort.getIsEvent();

        // if edge DOES NOT connect two applications, process normally
        if (!edgeConnectsTwoApplications || twoEventPorts){
            const edge : Edge = new Edge(srcNode.getId(), srcPort.getId(), destNode.getId(), destPort.getId(), loopAware, closesLoop, false);
            this.logicalGraph().addEdgeComplete(edge);
            setTimeout(() => {
                this.setSelection(Eagle.RightWindowMode.Hierarchy, edge,Eagle.FileType.Graph)
            }, 30);
            if (callback !== null) callback(edge);
            return;
        }

        // by default, use the positions of the nodes themselves to calculate position of new node
        let srcNodePosition = srcNode.getPosition();
        let destNodePosition = destNode.getPosition();

        // if source or destination node is an embedded application, use position of parent construct node
        if (srcNode.isEmbedded()){
            srcNodePosition = this.logicalGraph().findNodeById(srcNode.getEmbedId()).getPosition();
        }
        if (destNode.isEmbedded()){
            destNodePosition = this.logicalGraph().findNodeById(destNode.getEmbedId()).getPosition();
        }

        // count number of edges between source and destination
        const PORT_HEIGHT : number = 24;
        const numIncidentEdges = this.logicalGraph().countEdgesIncidentOnNode(srcNode);

        // calculate a position for a new data component, halfway between the srcPort and destPort
        const dataComponentPosition = {
            x: (srcNodePosition.x + destNodePosition.x) / 2.0,
            y: (srcNodePosition.y + (numIncidentEdges * PORT_HEIGHT) + destNodePosition.y + (numIncidentEdges * PORT_HEIGHT)) / 2.0
        };

        const memoryComponent = Utils.getPaletteComponentByName(Category.Memory);

        // if node not found, exit
        if (memoryComponent === null) {
            return;
        }

        // Add a duplicate of the memory component to the graph
        const newNode : Node = this.logicalGraph().addDataComponentToGraph(Utils.duplicateNode(memoryComponent), dataComponentPosition);

        // set name of new node (use user-facing name)
        newNode.setName(srcPort.getDisplayText());

        // remove existing ports from the memory node
        newNode.removeAllInputPorts();
        newNode.removeAllOutputPorts();

        // add InputOutput port for dataType
        const newInputOutputPort = new Field(Utils.generateFieldId(), srcPort.getDisplayText(), "", "", "", false, srcPort.getType(), false, [], false, Daliuge.FieldType.ApplicationArgument, Daliuge.FieldUsage.InputOutput, false);
        newNode.addField(newInputOutputPort);

        // set the parent of the new node
        // by default, set parent to parent of dest node,
        newNode.setParentId(destNode.getParentId());

        // if source node is a child of dest node, make the new node a child too
        if (srcNode.getParentId() === destNode.getId()){
            newNode.setParentId(destNode.getId());
        }

         // if dest node is a child of source node, make the new node a child too
        if (destNode.getParentId() === srcNode.getId()){
            newNode.setParentId(srcNode.getId());
        }

        // create TWO edges, one from src to data component, one from data component to dest
        const firstEdge : Edge = new Edge(srcNode.getId(), srcPort.getId(), newNode.getId(), newInputOutputPort.getId(), loopAware, closesLoop, false);
        const secondEdge : Edge = new Edge(newNode.getId(), newInputOutputPort.getId(), destNode.getId(), destPort.getId(), loopAware, closesLoop, false);

        this.logicalGraph().addEdgeComplete(firstEdge);
        this.logicalGraph().addEdgeComplete(secondEdge);

        // reply with one of the edges
        if (callback !== null) callback(firstEdge);
    }

    editNodeDescription = () : void => {
        console.log("editNodeDescription()");

        Utils.requestUserText("Node Description", "Please edit the description for the node", this.selectedNode().getDescription(), (completed, userText) => {
            if (!completed){
                return;
            }

            this.selectedNode().setDescription(userText);
        })
    }

    getEligibleNodeCategories : ko.PureComputed<Category[]> = ko.pureComputed(() => {
        // if selectedNode is not set, return the list of all categories, even though it won't be rendered (I guess)
        if (this.selectedNode() === null){
            return Utils.getCategoriesWithInputsAndOutputs(Category.Type.Unknown, 0, 0);
        }

        // if selectedNode is set, return a list of categories within the same category type
        const categoryType: Category.Type = this.selectedNode().getCategoryType();
        
        return Utils.getCategoriesWithInputsAndOutputs(categoryType, this.selectedNode().getInputPorts().length, this.selectedNode().getOutputPorts().length);
    }, this)

    inspectorChangeNodeCategoryRequest = (event: Event) : void => {

        if (Setting.findValue(Setting.CONFIRM_NODE_CATEGORY_CHANGES)){

            // request confirmation from user
            Utils.requestUserConfirm("Change Category?", 'Changing a nodes category could destroy some data (parameters, ports, etc) that are not appropriate for a node with the selected category', "Yes", "No", Setting.find(Setting.CONFIRM_NODE_CATEGORY_CHANGES), (confirmed : boolean) : void => {
                if (!confirmed){
                    //we need to reset the input select to the previous value
                    $(event.target).val(this.selectedNode().getCategory())
                    return;
                }
                this.inspectorChangeNodeCategory(event)
            });
        }else{
            this.inspectorChangeNodeCategory(event)
        }
    }

    inspectorChangeNodeCategory = (event: Event) : void => {
        const newNodeCategory: Category = $(event.target).val() as Category
        const oldNode = this.selectedNode();

        // get a reference to the builtin palette
        const builtinPalette: Palette = this.findPalette(Palette.BUILTIN_PALETTE_NAME, false);
        if (builtinPalette === null){
            console.warn("Could not find builtin palette", Palette.BUILTIN_PALETTE_NAME);
            return;
        }

        // find node with new type in builtinPalette
        const oldCategoryPrototype: Node = builtinPalette.findNodeByNameAndCategory(oldNode.getCategory());
        const newCategoryPrototype: Node = builtinPalette.findNodeByNameAndCategory(newNodeCategory);

        // check that prototypes were found for old category and new category
        if (oldCategoryPrototype === null || newCategoryPrototype === null){
            console.warn("Prototypes for old and new categories could not be found in palettes", oldCategoryPrototype, newCategoryPrototype);
            return;
        }

        // delete non-ports from the old node (loop backwards since we are deleting from the array as we loop)
        for (let i = oldNode.getFields().length - 1 ; i >= 0; i--){
            const field: Field = oldNode.getFields()[i];

            if (field.isInputPort() || field.isOutputPort()){
                continue;
            }

            oldNode.removeFieldById(field.getId());
        }

        // copy non-ports from new category to old node
        for (const field of newCategoryPrototype.getFields()){
            if (field.isInputPort() || field.isOutputPort()){
                continue;
            }

            // try to find field in old node that matches by displayText AND parameterType
            let destField = oldNode.findFieldByDisplayText(field.getDisplayText(), field.getParameterType());

            // if dest field could not be found, then go ahead and add a NEW field to the dest node
            if (destField === null){
                destField = field.clone();
                oldNode.addField(destField);
            }
           
            // copy everything about the field from the src (palette), except maintain the existing id and nodeKey
            destField.copyWithIds(field, destField.getNodeId(), destField.getId());
        }

        // copy name and description from new category to old node, if old node values are defaults
        if (oldNode.getName() === oldCategoryPrototype.getName()){
            oldNode.setName(newCategoryPrototype.getName());

        }
        if (oldNode.getDescription() === oldCategoryPrototype.getDescription()){
            oldNode.setDescription(newCategoryPrototype.getDescription());
        }

        this.selectedNode().setCategory(newNodeCategory);

        this.flagActiveFileModified();
        this.checkGraph();
        this.undo().pushSnapshot(this, "Edit Node Category");
        this.logicalGraph.valueHasMutated();
    }
    
    // NOTE: clones the node internally
    addNode = (node : Node, x: number, y: number, callback : (node: Node) => void) : void => {
        // copy node
        const newNode : Node = Utils.duplicateNode(node);
        newNode.setPosition(x, y);
        this.logicalGraph().addNodeComplete(newNode);

        // flag that the logical graph has been modified
        this.logicalGraph().fileInfo().modified = true;
        this.logicalGraph().fileInfo.valueHasMutated();

        // check if node was added to an empty graph, if so prompt user to specify graph name
        if (this.logicalGraph().fileInfo().name === ""){
            this.newDiagram(Eagle.FileType.Graph, (name: string) => {
                this.logicalGraph().fileInfo().name = name;
                this.checkGraph();
                this.undo().pushSnapshot(this, "Named Logical Graph");
                this.logicalGraph.valueHasMutated();
                Utils.showNotification("Graph named", name, "success");
            });
        }

        if (callback !== null) callback(newNode);
    }

    checkForComponentUpdates = () : void => {
        console.log("checkForComponentUpdates()");

        ComponentUpdater.update(this.palettes(), this.logicalGraph(), function(errorsWarnings:Errors.ErrorsWarnings, updatedNodes:Node[]){
            console.log("callback", errorsWarnings, updatedNodes);

            // report missing palettes to the user
            if (errorsWarnings.errors.length > 0){
                const errorStrings = [];
                for (const error of errorsWarnings.errors){
                    errorStrings.push(error.message);
                }

                Utils.showNotification("Error", errorStrings.join("\n"), "danger");
            } else {
                const nodeNames = [];
                for (const node of updatedNodes){
                    nodeNames.push(node.getName());
                }

                Utils.showNotification("Success", "Successfully updated " + updatedNodes.length + " component(s): " + nodeNames.join(", "), "success");
            }
        });
    }

    findPaletteContainingNode = (nodeId: string): Palette => {
        for (const palette of this.palettes()){
            for (const node of palette.getNodes()){
                if (node.getId() === nodeId){
                    return palette;
                }
            }
        }

        return null;
    }
}

export namespace Eagle
{
    export enum LeftWindowMode {
        None = "None",
        Palettes = "Palettes"
    }

    export enum RightWindowMode {
        None = "None",
        Repository = "Repository",
        Inspector = "Inspector",
        TranslationMenu = "TranslationMenu",
        Hierarchy = "Hierarchy"
    }

    export enum AddNodeMode {
        ContextMenu = "ContextMenu",
        Default = "Default"
    }

    export enum FileType {
        Graph = "Graph",
        Palette = "Palette",
        JSON = "JSON",
        Markdown = "Markdown",
        Unknown = "Unknown"
    }

    export enum ModalType {
        Add = "Add",
        Edit = "Edit",
        Field = "Field"
    }

    export enum Direction {
        Up = "Up",
        Down = "Down",
        Left = "Left",
        Right = "Right"
    }
}

// TODO: ready is deprecated here, use something else
$( document ).ready(function() {
    // jquery event listeners start here

    //hides the dropdown navbar elements when stopping hovering over the element
    $(".dropdown-menu").on("mouseleave", function(){
        $(".dropdown-toggle").removeClass("show")
        $(".dropdown-menu").removeClass("show")
    })

    $('.modal').on('hidden.bs.modal', function () {
        $('.modal-dialog').css({"left":"0px", "top":"0px"})
        $("#editFieldModal textarea").attr('style','')
        $("#issuesModalAccordion").parent().parent().attr('style','')

        //reset parameter table selection
        ParameterTable.resetSelection()
    }); 

    $('.modal').on('shown.bs.modal',function(){
        // modal draggable
        // the any type is required so we don't have an error when building. at runtime on eagle this actually functions without it.
        (<any>$('.modal-dialog')).draggable({
            handle: ".modal-header"
        });
    })

    $(".translationDefault").on("click",function(event: JQuery.TriggeredEvent){
        const e: MouseEvent = event.originalEvent as MouseEvent;

        // sets all other translation methods to false
        $('.translationDefault').each(function(){
            if($(this).is(':checked')){
                $(this).prop('checked', false).trigger("change");
                $(this).val('false')
            }
        })

        //toggle method on
        const element = $(e.target)
        if(element.val() === "true"){
            element.val('false')
        }else{
            element.val('true')
        }

        //saving the new translation default into the settings system
        const translationId = element.closest('.accordion-item').attr('id')
        Setting.find(Setting.TRANSLATOR_ALGORITHM_DEFAULT).setValue(translationId)
        
        $(this).prop('checked',true).trigger("change");
    })

    //increased click bubble for edit modal flag booleans
    $(".componentCheckbox").on("click", function(event: JQuery.TriggeredEvent){
        $(event.target).find("input").trigger("click")
    })

    //removes focus from input and textareas when clicking the canvas
    $("#logicalGraphParent").on("mousedown", function(){
        $("input").trigger("blur");
        $("textarea").trigger("blur");

        //back up method of hiding the right click context menu in case it get stuck open
        RightClick.closeCustomContextMenu(true);
    });

    $(".tableParameter").on("click", function(){
        console.log(this)
    })

    //expand palettes when using searchbar and return to prior collapsed state on completion.
    $("#paletteList .componentSearchBar").on("keyup",function(){
        if ($("#paletteList .componentSearchBar").val() !== ""){
            $("#paletteList .accordion-button.collapsed").addClass("wasCollapsed")
            $("#paletteList .accordion-button.collapsed").trigger("click")
        }else{
            $("#paletteList .accordion-button.wasCollapsed").trigger("click")
            $("#paletteList .accordion-button.wasCollapsed").removeClass("wasCollapsed")
        }
    })

    $(document).on('click', '.hierarchyEdgeExtra', function(event: JQuery.TriggeredEvent){
        const e: MouseEvent = event.originalEvent as MouseEvent;
        const eagle: Eagle = Eagle.getInstance();
        const selectedEdgeId: EdgeId = $(e.target).attr("id") as EdgeId;
        const selectEdge = eagle.logicalGraph().findEdgeById(selectedEdgeId);

        if(!selectEdge){
            console.log("no edge found")
            return
        }
        if(!e.shiftKey){
            eagle.setSelection(Eagle.RightWindowMode.Inspector, selectEdge, Eagle.FileType.Graph);
        }else{
            eagle.editSelection(Eagle.RightWindowMode.Inspector, selectEdge, Eagle.FileType.Graph);
        }
    })

    $(".hierarchy").on("click", function(){
        const eagle: Eagle = Eagle.getInstance();
        eagle.selectedObjects([]);
    })   

});
