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
import * as bootstrap from 'bootstrap';

import { Category } from './Category';
import { CategoryData } from "./CategoryData";
import { ComponentUpdater } from './ComponentUpdater';
import { Daliuge } from './Daliuge';
import { DockerHubBrowser } from "./DockerHubBrowser";
import { EagleConfig } from "./EagleConfig";
import { Edge } from './Edge';
import { Errors } from './Errors';
import { Field } from './Field';
import { FileInfo } from './FileInfo';
import { FileLocation } from "./FileLocation";
import { GitHub } from './GitHub';
import { GitLab } from './GitLab';
import { GraphConfig } from "./GraphConfig";
import { GraphRenderer } from "./GraphRenderer";
import { Hierarchy } from './Hierarchy';
import { KeyboardShortcut } from './KeyboardShortcut';
import { LogicalGraph } from './LogicalGraph';
import { Modals } from "./Modals";
import { Node } from './Node';
import { Palette } from './Palette';
import { ParameterTable } from './ParameterTable';
import { Repositories } from './Repositories';
import { Repository, RepositoryCommit } from './Repository';
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
import { versions } from "./Versions";


export class Eagle {
    static _instance : Eagle;

    palettes : ko.ObservableArray<Palette>;
    logicalGraph : ko.Observable<LogicalGraph>;
    tutorial : ko.Observable<Tutorial>;

    eagleIsReady : ko.Observable<boolean>;

    leftWindow : ko.Observable<SideWindow>;
    rightWindow : ko.Observable<SideWindow>;
    bottomWindow : ko.Observable<SideWindow>;

    selectedObjects : ko.ObservableArray<Node|Edge>;
    static selectedLocation : ko.Observable<Eagle.FileType>;
    currentField :ko.Observable<Field>;

    static selectedRightClickObject : ko.Observable<Node|Edge>;
    static selectedRightClickLocation : ko.Observable<Eagle.FileType>;
    static selectedRightClickPosition : {x: number, y: number} = {x:0, y:0}

    repositories: ko.Observable<Repositories>;
    translator : ko.Observable<Translator>;
    undo : ko.Observable<Undo>;

    globalOffsetX : ko.Observable<number>;
    globalOffsetY : ko.Observable<number>;
    globalScale : ko.Observable<number>;

    dockerHubBrowser : ko.Observable<DockerHubBrowser>;

    errorsMode : ko.Observable<Errors.Mode>;
    graphWarnings : ko.ObservableArray<Errors.Issue>;
    graphErrors : ko.ObservableArray<Errors.Issue>;
    loadingWarnings : ko.ObservableArray<Errors.Issue>;
    loadingErrors : ko.ObservableArray<Errors.Issue>;
    currentFileInfo : ko.Observable<FileInfo>;
    currentFileInfoTitle : ko.Observable<string>;

    showDataNodes : ko.Observable<boolean>;
    snapToGrid : ko.Observable<boolean>;
    dropdownMenuHoverTimeout : number = 0;

    static paletteComponentSearchString : ko.Observable<string>;
    static componentParamsSearchString : ko.Observable<string>;
    static applicationArgsSearchString : ko.Observable<string>;
    static constructParamsSearchString : ko.Observable<string>;
    static tableSearchString : ko.Observable<string>;

    static settings : SettingsGroup[];
    static shortcuts : KeyboardShortcut[];
    static tutorials : Tutorial[];

    static lastClickTime : number = 0;

    static nodeDropLocation : {x: number, y: number} = {x:0, y:0}; // if this remains x=0,y=0, the button has been pressed and the getNodePosition function will be used to determine a location on the canvas. if not x:0, y:0, it has been over written by the nodeDrop function as the node has been dragged into the canvas. The node will then be placed into the canvas using these co-ordinates.
    static nodeDragPaletteIndex : number;
    static nodeDragComponentId : NodeId;
    static shortcutModalCooldown : number;

    constructor(){
        Eagle._instance = this;
        Eagle.settings = Setting.getSettings();
        UiModeSystem.initialise()

        this.palettes = ko.observableArray();
        this.logicalGraph = ko.observable(null);
        this.eagleIsReady = ko.observable(false);

        this.leftWindow = ko.observable(new SideWindow(Utils.getLeftWindowWidth()));
        this.rightWindow = ko.observable(new SideWindow(Utils.getRightWindowWidth()));
        this.bottomWindow = ko.observable(new SideWindow(Utils.getBottomWindowHeight()));

        this.selectedObjects = ko.observableArray([]).extend({ deferred: true });
        Eagle.selectedLocation = ko.observable(Eagle.FileType.Unknown);
        this.currentField = ko.observable(null);

        Eagle.selectedRightClickObject = ko.observable();
        Eagle.selectedRightClickLocation = ko.observable(Eagle.FileType.Unknown);

        this.repositories = ko.observable(new Repositories());
        this.translator = ko.observable(new Translator());
        this.undo = ko.observable(new Undo());
        
        //load parameter table visibility from local storage
        ParameterTable.init();
        ParameterTable.getActiveColumnVisibility().loadFromLocalStorage()

        Eagle.componentParamsSearchString = ko.observable("");
        Eagle.paletteComponentSearchString = ko.observable("");
        Eagle.applicationArgsSearchString = ko.observable("");
        Eagle.constructParamsSearchString = ko.observable("");
        Eagle.tableSearchString = ko.observable("");

        Eagle.tutorials = tutorialArray
        this.tutorial = ko.observable(Eagle.tutorials[0]);

        Eagle.nodeDragPaletteIndex = null;
        Eagle.nodeDragComponentId = null;

        this.globalOffsetX = ko.observable(0);
        this.globalOffsetY = ko.observable(0);
        this.globalScale = ko.observable(1.0);

        this.dockerHubBrowser = ko.observable(new DockerHubBrowser());

        this.errorsMode = ko.observable(Errors.Mode.Loading);
        this.graphWarnings = ko.observableArray([]);
        this.graphErrors = ko.observableArray([]);
        this.loadingWarnings = ko.observableArray([]);
        this.loadingErrors = ko.observableArray([]);

        this.currentFileInfo = ko.observable(null);
        this.currentFileInfoTitle = ko.observable("");

        this.showDataNodes = ko.observable(true);
        this.snapToGrid = ko.observable(false);
        this.dropdownMenuHoverTimeout = null;

        this.selectedObjects.subscribe(function(){
            //TODO check if the selectedObjects array has changed, if not, abort
            GraphRenderer.nodeData = GraphRenderer.depthFirstTraversalOfNodes(this.logicalGraph(), this.showDataNodes());
            Hierarchy.updateDisplay()
            Hierarchy.scrollToNode()
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

    types : ko.PureComputed<string[]> = ko.pureComputed(() => {
        // add all the built-in types
        const result: string[] = [
            Daliuge.DataType.Boolean,
            Daliuge.DataType.Float,
            Daliuge.DataType.Integer,
            Daliuge.DataType.Json,
            Daliuge.DataType.Object,
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

    // TODO: not used, remove?
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

    deployDefaultTranslationAlgorithm = async () => {
        const defaultTranslatorAlgorithmMethod : string = $('#'+Setting.findValue(Setting.TRANSLATOR_ALGORITHM_DEFAULT)+ ' .generatePgt').val().toString()
        try {
            await this.translator().genPGT(defaultTranslatorAlgorithmMethod, false);
        } catch (error){
            console.error("deployDefaultTranslationAlgorithm()", error);
            Utils.showNotification("Error", error, "danger");
        }
    }

    deployTranslationAlgorithm = async (algorithm: string, test: boolean) => {
        try {
            await this.translator().genPGT(algorithm, test);
        } catch (error){
            console.error("deployDefaultTranslationAlgorithm()", error);
            Utils.showNotification("Error", error, "danger");
        }
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

    repositoryFileName : ko.PureComputed<string> = ko.pureComputed(() => {
        if (this.logicalGraph() === null){
            return "";
        }

        const fileInfo : FileInfo = this.logicalGraph().fileInfo();

        // if no FileInfo is available, return empty string
        if (fileInfo === null){
            return "";
        }

        return fileInfo.location.getHtml();
    }, this);

    activeConfigHtml : ko.PureComputed<string> = ko.pureComputed(() => {
        if (typeof this.logicalGraph().getActiveGraphConfig() === 'undefined'){
            return "";
        }

        return  "<strong>Config:</strong> " + this.logicalGraph().getActiveGraphConfig().fileInfo().name;
    }, this);

    // TODO: move to SideWindow.ts?
    toggleWindows = () : void  => {
        const setOpen = !Setting.findValue(Setting.LEFT_WINDOW_VISIBLE) || !Setting.findValue(Setting.RIGHT_WINDOW_VISIBLE) || !Setting.findValue(Setting.BOTTOM_WINDOW_VISIBLE)

        // don't allow open if palette and graph editing are disabled
        const editingAllowed: boolean = Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING);
        if (setOpen && !editingAllowed){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Unknown, "Toggle Windows");
            return;
        }

        SideWindow.setShown('left', setOpen);
        SideWindow.setShown('right', setOpen);
        SideWindow.setShown('bottom', setOpen);
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
        
        //because the saved bottom window height is a percentage, its easier to grab the height using jquery than to convert the percentage into pixels
        let bottomWindow = 0

        if(Setting.findValue(Setting.BOTTOM_WINDOW_VISIBLE)){
            bottomWindow = $('#bottomWindow').height()
        }

        //calculating scale multipliers needed for each, height and width in order to fit the graph
        const containerHeight = $('#logicalGraphParent').height() - bottomWindow
        const graphHeight = maxY-minY+200
        const graphYScale = containerHeight/graphHeight
        

        //we are taking into account the current widths of the left and right windows
        const leftWindow = Utils.getLeftWindowWidth()
        const rightWindow = Utils.getRightWindowWidth()

        const containerWidth = $('#logicalGraphParent').width() - leftWindow - rightWindow
        const graphWidth = maxX-minX+200
        const graphXScale = containerWidth/graphWidth

        // reset scale to center the graph correctly
        that.globalScale(1)

        //determine center of the display area
        const displayCenterX : number = (containerWidth / that.globalScale() / 2);
        const displayCenterY : number = (containerHeight / that.globalScale() / 2);

        // translate display to center the graph centroid
        that.globalOffsetX(Math.round(displayCenterX - centroidX + leftWindow));
        that.globalOffsetY(Math.round(displayCenterY - centroidY));

        //taking note of the screen center in graph space before zooming
        const midPointX = GraphRenderer.GRAPH_TO_SCREEN_POSITION_X(centroidX)

        const xpb = centroidX
        const ypb = displayCenterY/that.globalScale() - that.globalOffsetY(); 

        //applying the correct zoom
        if(graphYScale>graphXScale){
            that.globalScale(graphXScale);
        }else if(graphYScale<graphXScale){
            that.globalScale(graphYScale)
        }else{
            that.globalScale(1)
        }
        
        //checking the screen center in graph space after zoom
        const xpa = GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(midPointX)
        const ypa = displayCenterY/that.globalScale() - that.globalOffsetY();

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
        const nodeCount = this.logicalGraph().getNumNodes()
        const edgeCount = this.logicalGraph().getNumEdges()
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
     * It resets all fields in the editor menu.
     */
    resetEditor = () : void => {
        setTimeout(() => {
            this.selectedObjects([]);
            Eagle.selectedLocation(Eagle.FileType.Unknown);
        }, 100);
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

    
    getTranslatorColor : ko.PureComputed<string> = ko.pureComputed(() : string => {
        // check if current graph comes from a supported git service
        const serviceIsGit: boolean = [Repository.Service.GitHub, Repository.Service.GitLab].includes(this.logicalGraph().fileInfo().location.repositoryService());

        if(!serviceIsGit){
            return 'dodgerblue'
        }else if(Setting.findValue(Setting.TEST_TRANSLATE_MODE)){
            return 'orange'
        }else if (this.logicalGraph().fileInfo().modified){
            return 'red'
        }else{
            return 'green'
        }
    }, this);

    setSelection = (selection : Node | Edge, selectedLocation: Eagle.FileType) : void => {
        Eagle.selectedLocation(selectedLocation);
        GraphRenderer.clearPortPeek()

        if (selection === null){
            this.selectedObjects([]);
        } else {
            this.selectedObjects([selection]);

            //show the title of the port on either side of the edge we are selecting
            if(selection instanceof Edge){
                GraphRenderer.setPortPeekForEdge(selection,true)
            }

            if(selection instanceof Node){
                ParameterTable.updateContent(selection);
            }
        }
    }

    editSelection = (selection : Node | Edge, selectedLocation: Eagle.FileType) : void => {
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
    }

    getInspectorCollapseState : ko.PureComputed<boolean> = ko.pureComputed(() => {
        //the addition and removal of the class is for a temporary transition effect
        //when this function gets recalculated, the collapsed state of the inspector has changed and we need to do a transition
        $('#inspector').addClass('inspectorTransition')
        setTimeout(function(){
            $('#inspector').removeClass('inspectorTransition')
        },100)
        
        return Setting.findValue(Setting.INSPECTOR_COLLAPSED_STATE)
    }, this);

    toggleInspectorCollapsedState = () : void => {
        Setting.find(Setting.INSPECTOR_COLLAPSED_STATE).toggle()
    };

    getGraphModifiedDateText = () : string => {
        return this.logicalGraph().fileInfo().lastModifiedDatetimeText().split(',')[0]
    }

    changeRightWindowMode(requestedMode:Eagle.RightWindowMode) : void {
        Setting.setValue(Setting.RIGHT_WINDOW_MODE, requestedMode)
        
        SideWindow.setShown('right', true)

        //trigger a re-render of the hierarchy
        if (Setting.findValue(Setting.RIGHT_WINDOW_MODE) === Eagle.RightWindowMode.Hierarchy){
            window.setTimeout(function(){
                Hierarchy.updateDisplay()
            }, 100)
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

            if(object.getParent() !== null){
                let thisParentIsSelected = true
                let thisObject = object
                while (thisParentIsSelected){
                    const thisParent: Node = thisObject.getParent();
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

                    eagle._postLoadGraph(new RepositoryFile(new Repository(Repository.Service.File, "", "", false), Utils.getFilePathFromFullPath(fileFullPath), Utils.getFileNameFromFullPath(fileFullPath)));
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
                    const parentNode: Node = new Node(lg.fileInfo().name, lg.fileInfo().location.getText(), "", Category.SubGraph);
    
                    eagle.insertGraph(Array.from(lg.getNodes()), Array.from(lg.getEdges()), parentNode, errorsWarnings);
    
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
            } else {
                Utils.showNotification("Error", "Errors occurred while loading " + fileName + " from " + service + ".", "danger");
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
        const schemaVersion: Setting.SchemaVersion = Utils.determineSchemaVersion(dataObject);

        const errorsWarnings: Errors.ErrorsWarnings = {errors: [], warnings: []};

        // use the correct parsing function based on schema version
        switch (schemaVersion){
            case Setting.SchemaVersion.OJS:
            case Setting.SchemaVersion.Unknown:
                // check if we need to update the graph from keys to ids
                if (GraphUpdater.usesNodeKeys(dataObject)){
                    GraphUpdater.updateKeysToIds(dataObject);
                }

                loadFunc(LogicalGraph.fromOJSJson(dataObject, "", errorsWarnings));
                break;
            case Setting.SchemaVersion.V4:
                loadFunc(LogicalGraph.fromV4Json(dataObject, "", errorsWarnings));
                break;
            default:
                errorsWarnings.errors.push(Errors.Message("Unknown schemaVersion: " + schemaVersion));
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

        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Create Subgraph From Selection");
            return;
        }

        // create new subgraph
        // look for similarly named node in palettes first, clone it
        // if not found in palettes, create a basic node from just the category
        let parentNode: Node;
        const paletteComponent = Utils.getPaletteComponentByName(Category.SubGraph);
        if (typeof paletteComponent !== 'undefined'){
            parentNode = paletteComponent.clone();
        } else {
            parentNode = new Node(Category.SubGraph, "", "", Category.SubGraph);
        }

        // add the parent node to the logical graph
        this.logicalGraph().addNodeComplete(parentNode);

        // switch items in selection to be children of subgraph
        for (const node of this.selectedObjects()){
            if (!(node instanceof Node)){
                continue;
            }

            // if already parented to a node in this selection, skip
            if (node.getParent() !== null && this.objectIsSelected(node.getParent())){
                continue;
            }

            // update selection
            node.setParent(parentNode);
        }
        
        // center parent around children
        GraphRenderer.centerConstruct(parentNode, Array.from(eagle.logicalGraph().getNodes()))

        // flag graph as changed
        this.flagActiveFileModified();
        this.checkGraph();
        this.undo().pushSnapshot(this, "Create Subgraph from Selection");
        this.logicalGraph.valueHasMutated();
    }

    checkErrorModalShowError = (data:any) :void =>{
        data.show()
    }

    createConstructFromSelection = async () => {
        const eagle = Eagle.getInstance()
        if(eagle.selectedObjects().length === 0){
            Utils.showNotification('Error','At least one node must be selected', 'warning')
            return
        }

        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Create Construct From Selection");
            return;
        }

        const constructs : string[] = Utils.buildComponentList((cData: Category.CategoryData) => {
            return cData.categoryType === Category.Type.Construct;
        });

        // ask the user what type of construct to use
        const userChoice: string = await Utils.requestUserChoice("Choose Construct", "Please choose a construct type to contain the selection", constructs, 0, false, "");

        // create instance of construct chosen by user
        // look for similarly named node in palettes first, clone it
        // if not found in palettes, create a basic node from just the category
        let parentNode: Node;
        const paletteComponent = Utils.getPaletteComponentByName(userChoice);
        if (typeof paletteComponent !== 'undefined'){
            parentNode = paletteComponent.clone();
        } else {
            parentNode = new Node(userChoice, "", "", userChoice as Category);
        }

        // add the parent node to the logical graph
        this.logicalGraph().addNodeComplete(parentNode);

        // switch items in selection to be children of subgraph
        for (const node of this.selectedObjects()){
            if (!(node instanceof Node)){
                continue;
            }

            node.setParent(parentNode);
        }

        // center parent around children
        GraphRenderer.centerConstruct(parentNode, Array.from(eagle.logicalGraph().getNodes()))

        // flag graph as changed
        this.flagActiveFileModified();
        this.checkGraph();
        this.undo().pushSnapshot(this, "Add Selection to Construct");
        this.logicalGraph.valueHasMutated();
    }

    // NOTE: parentNode would be null if we are duplicating a selection of objects
    insertGraph = async (nodes: Node[], edges: Edge[], parentNode: Node, errorsWarnings: Errors.ErrorsWarnings) => {
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
        } else {
            parentNodePosition = {x: DUPLICATE_OFFSET, y: DUPLICATE_OFFSET};
        }

        // insert nodes from lg into the existing logicalGraph
        for (const node of nodes){
            const insertedNode: Node = await this.addNode(node, parentNodePosition.x + node.getPosition().x, parentNodePosition.y + node.getPosition().y); // NOTE: addNode does not add embedded apps

            // save mapping for node itself
            nodeMap.set(node.getId(), insertedNode);

            // if insertedNode has no parent, make it a parent of the parent node
            if (insertedNode.getParent() === null && parentNode !== null){
                insertedNode.setParent(parentNode);
            }

            // save mapping for input ports
            for (let j = 0 ; j < node.getInputPorts().length; j++){
                portMap.set(node.getInputPorts()[j].getId(), insertedNode.getInputPorts()[j]);
            }

            // save mapping for output ports
            for (let j = 0 ; j < node.getOutputPorts().length; j++){
                portMap.set(node.getOutputPorts()[j].getId(), insertedNode.getOutputPorts()[j]);
            }

            // clear edge lists within fields of inserted node
            for (const field of insertedNode.getFields()){
                field.clearEdges();
            }
        }

        // copy embedded applications
        for (const node of nodes){
            const insertedNode: Node = nodeMap.get(node.getId());

            // copy embedded input application
            if (node.hasInputApplication()){
                const oldInputApplication : Node = node.getInputApplication();
                const newInputApplication : Node = nodeMap.get(oldInputApplication.getId());

                if (typeof newInputApplication === "undefined"){
                    console.error("Error: could not find mapping for input application " + oldInputApplication.getName() + " " + oldInputApplication.getId());
                    continue;
                }

                insertedNode.setInputApplication(newInputApplication);
                
                nodeMap.set(oldInputApplication.getId(), newInputApplication);

                // save mapping for input ports
                for (let j = 0 ; j < oldInputApplication.getInputPorts().length; j++ ){
                    portMap.set(oldInputApplication.getInputPorts()[j].getId(), newInputApplication.getInputPorts()[j]);
                    
                }

                // save mapping for output ports
                for (let j = 0 ; j < oldInputApplication.getOutputPorts().length; j++){
                    portMap.set(oldInputApplication.getOutputPorts()[j].getId(), newInputApplication.getOutputPorts()[j]);
                }

                // clear edge lists within fields of the old input application
                for (const field of oldInputApplication.getFields()){
                    field.clearEdges();
                }
            }

            // copy embedded output application
            if (node.hasOutputApplication()){
                const oldOutputApplication : Node = node.getOutputApplication();
                const newOutputApplication : Node = nodeMap.get(oldOutputApplication.getId());

                if (typeof newOutputApplication === "undefined"){
                    console.error("Error: could not find mapping for output application " + oldOutputApplication.getName() + " " + oldOutputApplication.getId());
                    continue;
                }

                insertedNode.setOutputApplication(newOutputApplication);
                
                nodeMap.set(oldOutputApplication.getId(), newOutputApplication);
                
                // save mapping for input ports
                for (let j = 0 ; j < oldOutputApplication.getInputPorts().length; j++){
                    portMap.set(oldOutputApplication.getInputPorts()[j].getId(), newOutputApplication.getInputPorts()[j]);
                }

                // save mapping for output ports
                for (let j = 0 ; j < oldOutputApplication.getOutputPorts().length; j++){
                    portMap.set(oldOutputApplication.getOutputPorts()[j].getId(), newOutputApplication.getOutputPorts()[j]);
                }

                // clear edge lists within fields of the old output application
                for (const field of oldOutputApplication.getFields()){
                    field.clearEdges();
                }
            }
        }

        // update some other details of the nodes are updated correctly
        for (const node of nodes){
            const insertedNode: Node = nodeMap.get(node.getId());

            // if original node has a parent, set the parent of the inserted node to the inserted parent
            if (node.getParent() !== null){
                // check if parent of original node was also mapped to a new node
                const insertedParent: Node = nodeMap.get(node.getParent().getId());

                // make sure parent is set correctly
                // if no mapping is available for the parent, then set parent to the new parentNode, or if no parentNode exists, just set parent to null
                // if a mapping is available, then use the mapped node as the parent for the new node
                if (typeof insertedParent === 'undefined'){
                    if (parentNode === null){
                        insertedNode.setParent(null);
                    } else {
                        insertedNode.setParent(parentNode);
                    }
                } else {
                    insertedNode.setParent(insertedParent);
                }
            }
        }

        // insert edges from lg into the existing logicalGraph
        for (const edge of edges){
            const srcNode = nodeMap.get(edge.getSrcNode().getId());
            const destNode = nodeMap.get(edge.getDestNode().getId());
            const srcPort = portMap.get(edge.getSrcPort().getId());
            const destPort = portMap.get(edge.getDestPort().getId());
            const loopAware = edge.isLoopAware();
            const closesLoop = edge.isClosesLoop();

            if (typeof srcNode === "undefined" || typeof destNode === "undefined"){
                errorsWarnings.warnings.push(Errors.Message("Unable to insert edge " + edge.getId() + " source node or destination node could not be found."));
                continue;
            }

            // add new edge
            const newEdge : Edge = new Edge('', srcNode, srcPort, destNode, destPort, loopAware, closesLoop, false);
            this.logicalGraph().addEdgeComplete(newEdge);
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

                eagle.palettes()[0].fileInfo().location.repositoryService(Repository.Service.File);
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

        // load the palette, handle errors and add palettes list
        this._reloadPalette(new RepositoryFile(Repository.dummy(), "", Utils.getFileNameFromFullPath(fileFullPath)), data, null);
    }

    /**
     * Loads a custom graph config from a file.
     */
    loadLocalGraphConfigFile = () : void => {
        const graphConfigFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("graphConfigFileToLoad");
        const fileFullPath : string = graphConfigFileInputElement.value;
        const eagle: Eagle = this;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // get a reference to the file in the html element
        const file = graphConfigFileInputElement.files[0];
        
        // read the file
        if (file) {
            const reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = function (evt) {
                const data: string = evt.target.result.toString();
                let dataObject;

                try {
                    dataObject = JSON.parse(data);
                }
                catch(err){
                    Utils.showUserMessage("Error parsing file JSON", err.message);
                    return;
                }

                eagle._loadGraphConfig(dataObject, new RepositoryFile(Repository.dummy(), "", Utils.getFileNameFromFullPath(fileFullPath)));
            }
            reader.onerror = function (evt) {
                console.error("error reading file", evt);
            }
        }
        
        // reset file selection element
        graphConfigFileInputElement.value = "";
    }

    /**
     * The following two functions allows the file selectors to be hidden and let tags 'click' them
     */
    getGraphFileToLoad = () : void => {
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Load Graph");
            return;
        }

        document.getElementById("graphFileToLoad").click();
        this.resetEditor()
    }

    getGraphFileToInsert = () : void => {
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Insert Graph");
            return;
        }

        document.getElementById("graphFileToInsert").click();
    }

    getPaletteFileToLoad = () : void => {
        if (!Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Palette, "Load Palette");
            return;
        }

        document.getElementById("paletteFileToLoad").click();
    }

    getGraphConfigFileToLoad = () : void => {
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Load Graph Config");
            return;
        }

        document.getElementById("graphConfigFileToLoad").click();
    }

    /**
     * Creates a new logical graph for editing.
     */
    newLogicalGraph = async(): Promise<void> => {
        // check that graph editing is permitted
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "New Logical Graph");
            return;
        }

        let filename: string;
        try {
            filename = await Utils.requestDiagramFilename(Eagle.FileType.Graph);
        } catch (error) {
            Utils.showNotification("Error", error, "danger");
            return;
        }

        this.logicalGraph(new LogicalGraph());
        this.logicalGraph().fileInfo().name = filename;
        this.logicalGraph().fileInfo().location.repositoryFileName(filename);
        this.checkGraph();
        this.undo().clear();
        this.undo().pushSnapshot(this, "New Logical Graph");
        this.logicalGraph.valueHasMutated();
        Utils.showNotification("New Graph Created", filename, "success");

        this.resetEditor()
    }

    /**
     * Presents the user with a textarea in which to paste JSON. Reads the JSON and parses it into a logical graph for editing.
     */
    newLogicalGraphFromJson = async (): Promise<void> => {
        // check that graph editing is permitted
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "New Logical Graph From JSON")
            return;
        }

        let userCode: string;
        try{
            userCode = await Utils.requestUserCode("json", "New Logical Graph from JSON", "");
        } catch (error){
            console.error(error);
            return;
        }

        this._loadGraphJSON(userCode, "", (lg: LogicalGraph) : void => {
            this.logicalGraph(lg);
        });

        this.resetEditor()
    }

    insertGraphFromJson = async (): Promise<void> => {
        // check that graph editing is permitted
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Insert Graph from JSON");
            return;
        }

        let userCode: string;
        try {
            userCode = await Utils.requestUserCode("json", "Insert Graph from JSON", "");
        } catch (error) {
            console.error(error);
            return;
        }

        // parse JSON
        const dataObject = JSON.parse(userCode);

        // read as LogicalGraph
        const errorsWarnings: Errors.ErrorsWarnings = {errors: [], warnings: []};
        const lg: LogicalGraph = LogicalGraph.fromOJSJson(dataObject, null, errorsWarnings);

        // insert
        const nodes = Array.from(lg.getNodes());
        const edges = Array.from(lg.getEdges());
        await this.insertGraph(nodes, edges, null, errorsWarnings);

        // display notification to user
        Utils.showNotification("Inserted Graph from JSON", "Inserted " + nodes.length + " nodes and " + edges.length + " edges.", "info");
    }

    addToGraphFromJson = async (): Promise<void> => {
        // check that graph editing is permitted
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Add to Graph from JSON");
            return;
        }

        let userText: string;
        try {
            userText = await Utils.requestUserText("Add to Graph from JSON", "Enter the JSON below", "");
        } catch (error) {
            console.error(error);
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
            const edge = Edge.fromOJSJson(e, nodes, null);

            edges.push(edge);
        }

        await this.insertGraph(nodes, edges, null, errorsWarnings);

        // display notification to user
        Utils.showNotification("Added to Graph from JSON", "Added " + clipboard.nodes.length + " nodes and " + clipboard.edges.length + " edges.", "info");
        // TODO: show errors

        // ensure changes are reflected in display
        this.checkGraph();
        this.undo().pushSnapshot(this, "Added from JSON");
        this.logicalGraph.valueHasMutated();
    }

    loadFileFromUrl = async(fileType: Eagle.FileType): Promise<void> => {
        let url: string;
        try {
            url = await Utils.requestUserString("Url", "Enter Url of " + fileType + " to load", "", false);
        } catch(error){
            console.error(error);
            return;
        }

        try {
            Repositories.selectFile(new RepositoryFile(new Repository(Repository.Service.Url, "", "", false), "", url));
        } catch(error){
            console.error(error);
            return;
        }
    }

    displayObjectAsJson = (fileType: Eagle.FileType, object: LogicalGraph | Palette | GraphConfig) : void => {
        let jsonString: string;
        const version: Setting.SchemaVersion = Setting.findValue(Setting.DALIUGE_SCHEMA_VERSION);
        
        switch(fileType){
            case Eagle.FileType.Graph:
                jsonString = LogicalGraph.toJsonString(object as LogicalGraph, false, version);
                break;
            case Eagle.FileType.Palette:
                jsonString = Palette.toJsonString(object as Palette, version);
                break;
            case Eagle.FileType.GraphConfig:
                jsonString = GraphConfig.toJsonString(object as GraphConfig);
                break;
            default:
                console.error("displayObjectAsJson(): Un-handled fileType", fileType);
                return;
        }

        Utils.requestUserCode("json", "Display " + fileType + " as JSON", jsonString, true);
    }

    displayNodeAsJson = (node: Node) : void => {
        let jsonString: string;
        const version: Setting.SchemaVersion = Setting.findValue(Setting.DALIUGE_SCHEMA_VERSION);

        switch(version){
            case Setting.SchemaVersion.OJS:
                jsonString = JSON.stringify(Node.toOJSGraphJson(node), null, EagleConfig.JSON_INDENT);
                break;
            case Setting.SchemaVersion.V4:
                jsonString = JSON.stringify(Node.toV4GraphJson(node), null, EagleConfig.JSON_INDENT);
                break;
            default:
                console.error("Unsupported graph format! (" + version + ")");
                jsonString = "";
                break;
        }

        Utils.requestUserCode("json", "Display Node as JSON", jsonString, true);
    }

    /**
     * Creates a new palette for editing.
     */
    newPalette = async () : Promise<void> => {
        // check that palette editing is permitted
        if (!Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Palette, "New Palette");
            return;
        }

        let filename: string;
        try {
            filename = await Utils.requestDiagramFilename(Eagle.FileType.Palette);
        } catch (error){
            console.warn(error);
            return;
        }
        const p: Palette = new Palette();
        p.fileInfo().name = filename;
        p.fileInfo().location.repositoryFileName(filename);

        // mark the palette as modified and readwrite
        p.fileInfo().modified = true;
        p.fileInfo().readonly = false;

        // add to palettes
        this.palettes.unshift(p);

        Utils.showNotification("New Palette Created", filename, "success");
    }

    /**
     * Presents the user with a textarea in which to paste JSON. Reads the JSON and parses it into a palette.
     */
    newPaletteFromJson = async (): Promise<void> => {
        // check that palette editing is permitted
        if (!Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Palette, "New Palette from JSON");
            return;
        }

        let userText: string;
        try {
            userText = await Utils.requestUserText("New Palette from JSON", "Enter the JSON below", "");
        } catch (error) {
            console.error(error);
            return;
        }

        this._loadPaletteJSON(userText, "");
    }

    /**
     * Reloads a previously loaded palette.
     */
     reloadPalette = async (palette: Palette, index: number): Promise<void> => {
         const fileInfo : FileInfo = palette.fileInfo();
         // remove palette
         this.closePalette(palette);

         switch (fileInfo.location.repositoryService()){
             case Repository.Service.File:
                // load palette
                this.getPaletteFileToLoad();
                break;
            case Repository.Service.GitLab:
            case Repository.Service.GitHub:
                Repositories.selectFile(new RepositoryFile(new Repository(fileInfo.location.repositoryService(), fileInfo.location.repositoryName(), fileInfo.location.repositoryBranch(), false), fileInfo.location.repositoryPath(), fileInfo.location.repositoryFileName()));
                break;
            case Repository.Service.Url:
                const {palettes, errorsWarnings} = await this.loadPalettes([
                    {name:palette.fileInfo().name, filename:palette.fileInfo().location.downloadUrl(), readonly:palette.fileInfo().readonly, expanded: true}
                ]);

                for (const palette of palettes){
                    if (palette !== null){
                        this.palettes.splice(index, 0, palette);
                    }
                }
                break;
            default:
                // can't be fetched
                break;
         }
    }

    /**
     * Creates a new graph configuration
     */

    newConfig = () : void => {
        // check that editing graphs is permitted
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "New Config");
            return;
        }

        const c: GraphConfig = new GraphConfig();
        c.fileInfo().name = 'newConfig';
        c.fileInfo().type = Eagle.FileType.GraphConfig;
        c.fileInfo().schemaVersion = Setting.SchemaVersion.V4;
        c.fileInfo().readonly = false;

        // adding a new graph config to the array
        this.logicalGraph().addGraphConfig(c)
    }

    duplicateGraphConfig = (config: GraphConfig): void => {
        const newConfigName = Utils.generateGraphConfigName(config);
        const clone = config
            .clone()
            .setId(Utils.generateGraphConfigId());
        clone.fileInfo().name = newConfigName;

        // add duplicate to LG
        this.logicalGraph().addGraphConfig(clone);
    }

    saveGraph = async () : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            const eagle: Eagle = Eagle.getInstance();

            switch (eagle.logicalGraph().fileInfo().location.repositoryService()){
                case Repository.Service.File:
                    try {
                        await eagle.saveFileToLocal(Eagle.FileType.Graph);
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    break;
                case Repository.Service.GitHub:
                case Repository.Service.GitLab:
                    try {
                        await this.commitToGit(Eagle.FileType.Graph);
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    break;
                default:
                    try {
                        await this.saveGraphAs();
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    break;
            }

            resolve();
        });
    }

    saveGraphAs = async () : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            const isLocalFile = this.logicalGraph().fileInfo().location.repositoryService() === Repository.Service.File;

            const userChoice: string = await Utils.requestUserChoice("Save Graph As", "Please choose where to save the graph", ["Local File", "Remote Git Repository"], isLocalFile?0:1, false, "");

            if (userChoice === null){
                return;
            }

            const fileType = this.logicalGraph().fileInfo().type;

            if (userChoice === "Local File"){
                try {
                    this.saveAsFileToLocal(fileType);
                } catch (error) {
                    reject(error);
                    return;
                }
            } else {
                try {
                    this.commitToGitAs(fileType);
                } catch(error) {
                    reject(error);
                    return;
                }
            }

            resolve();
        });
    }

    saveGraphConfigAs = async (graphConfig: GraphConfig) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            try {
                // Robust null/invalid check
                if (!graphConfig || typeof graphConfig !== "object" || Object.keys(graphConfig).length === 0) {
                    Utils.showNotification("Invalid Graph Config", "The graph configuration is missing or invalid. Please check your input and try again.", "danger");
                    reject(new Error("GraphConfig is null or invalid"));
                    return;
                }

                // check whether the GraphConfig has the same modelData location as the LogicalGraph
                const configMatch = FileLocation.match(graphConfig.fileInfo().graphLocation, this.logicalGraph().fileInfo().location);
                if (!configMatch) {
                    Utils.showNotification("Invalid Graph Config", "The graph configuration's parent location does not match the current graph's location. Try fixing graph errors " + KeyboardShortcut.idToKeysText('fix_all', true) + " before saving.", "danger");
                    reject(new Error("GraphConfig location mismatch"));
                    return;
                }

                const isLocalFile = this.logicalGraph().fileInfo().location.repositoryService() === Repository.Service.File;

                const userChoice: string = await Utils.requestUserChoice("Save Graph Configuration As", "Please choose where to save the graph configuration", ["Local File", "Remote Git Repository"], isLocalFile?0:1, false, "");

                if (userChoice === null){
                    Utils.showNotification("Save Cancelled", "No save location was selected.", "danger");
                    reject(new Error("User cancelled save"));
                    return;
                }

                if (userChoice === "Local File"){
                    try {
                        this.saveAsFileToLocal(Eagle.FileType.GraphConfig, graphConfig);
                        resolve();
                    } catch (error) {
                        Utils.showNotification("Save Failed", "Failed to save graph config locally: " + error.message, "danger");
                        reject(error);
                        return;
                    }
                } else {
                    try {
                        this.commitToGitAs(Eagle.FileType.GraphConfig, graphConfig);
                        resolve();
                    } catch(error) {
                        Utils.showNotification("Save Failed", "Failed to save graph config to remote repository: " + error.message, "danger");
                        reject(error);
                        return;
                    }
                }
            } catch (err) {
                Utils.showNotification("Unexpected Error", "An unexpected error occurred: " + err.message, "danger");
                reject(err);
            }
        });
    }

    saveActiveGraphConfig = async (): Promise<void> => {
        const activeGraphConfig = this.logicalGraph().getActiveGraphConfig();

        if (typeof activeGraphConfig === "undefined") {
            Utils.showNotification("Error", "No active graph config", "danger");
            return;
        }

        await this.saveGraphConfigAs(activeGraphConfig);
    }

    /**
     * Saves the file to a local download folder.
     */
    saveFileToLocal = async (fileType : Eagle.FileType, graphConfig: GraphConfig | null = null) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            switch (fileType){
                case Eagle.FileType.Graph:
                    try {
                        await this.saveGraphToDisk(this.logicalGraph(), this.logicalGraph().fileInfo().name);
                    } catch(error) {
                        reject(error);
                        return;
                    }
                    break;
                case Eagle.FileType.GraphConfig:
                    try {
                        await this.saveGraphConfigToDisk(graphConfig, graphConfig.fileInfo().name);
                    } catch(error) {
                        reject(error);
                        return;
                    }
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

                    try {
                        await this.savePaletteToDisk(destinationPalette, destinationPalette.fileInfo().name);
                    } catch (error){
                        reject(error);
                        return;
                    }
                    break;
                }
                default:
                    Utils.showUserMessage("Not implemented", "Not sure which fileType is the right one to save locally :" + fileType);
                    break;
            }
            resolve();
        });
    }

    saveAsFileToLocal = async (fileType: Eagle.FileType, graphConfig: GraphConfig | null = null): Promise<void> => {
        return new Promise(async(resolve, reject) => {
            switch (fileType){
                case Eagle.FileType.Graph:
                    try {
                        await this.saveAsFileToDisk(this.logicalGraph());
                    } catch (error){
                        reject(error);
                        return;
                    }
                    break;
                case Eagle.FileType.GraphConfig:
                    try {
                        await this.saveAsFileToDisk(graphConfig);
                    } catch(error) {
                        reject(error);
                        return;
                    }
                    break;
                case Eagle.FileType.Palette: {
                    // build a list of palette names
                    const paletteNames: string[] = this.buildReadablePaletteNamesList();

                    // ask user to select the palette
                    const paletteName: string = await Utils.userChoosePalette(paletteNames);

                    // get reference to palette (based on paletteName)
                    const destinationPalette = this.findPalette(paletteName, false);

                    // check that a palette was found
                    if (destinationPalette === null){
                        return;
                    }

                    try {
                        await this.saveAsFileToDisk(destinationPalette);
                    } catch (error){
                        reject(error);
                        return;
                    }
                    break;
                }
                default:
                    Utils.showUserMessage("Not implemented", "Not sure which fileType is the right one to save locally :" + fileType);
                    break;
            }

            resolve();
        });
    }

    /**
     * Saves a file to the remote server repository.
     */
    saveFileToRemote = async (file: RepositoryFile, fileInfo: ko.Observable<FileInfo>, jsonString : string): Promise<void> => {
        return new Promise(async(resolve, reject) => {
            let url : string;

            switch (file.repository.service){
                case Repository.Service.GitHub:
                    url = '/saveFileToRemoteGithub';
                    break;
                case Repository.Service.GitLab:
                    url = '/saveFileToRemoteGitlab';
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service : " + file.repository.service);
                    return;
            }

            let data: any;
            try {
                data = await Utils.httpPostJSONString(url, jsonString);
            } catch (error){
                Utils.showUserMessage("Error", data + "<br/><br/>These error messages provided by " + file.repository.service + " are not very helpful. Please contact EAGLE admin to help with further investigation.");
                console.error("Error: " + JSON.stringify(error, null, EagleConfig.JSON_INDENT) + " Data: " + data);
                reject(error);
                return;
            }

            // we have to refresh this whole path, since any part of it might be new
            try {
                await file.repository.refreshPath(file.path);
            } catch (error){
                console.log("error during refreshPath", error);
            }

            // show repo in the right window
            this.changeRightWindowMode(Eagle.RightWindowMode.Repository);

            // Show success message
            if (file.repository.service === Repository.Service.GitHub){
                Utils.showNotification("Success", "The file has been saved to GitHub repository.", "success");
            }
            if (file.repository.service === Repository.Service.GitLab){
                Utils.showNotification("Success", "The file has been saved to GitLab repository.", "success");
            }

            // Mark file as non-modified.
            fileInfo().modified = false;

            Utils.updateFileInfo(fileInfo, file);

            resolve();
        });
    }

    /**
     * Performs a Git commit of a graph/palette. Asks user for a file name before saving.
     */
    commitToGitAs = async (fileType : Eagle.FileType, graphConfig: GraphConfig | null = null) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            let fileInfo : ko.Observable<FileInfo>;
            let obj : LogicalGraph | Palette | GraphConfig;

            // determine which object of the given filetype we are committing
            switch (fileType){
                case Eagle.FileType.Graph:
                    fileInfo = this.logicalGraph().fileInfo;
                    obj = this.logicalGraph();
                    break;
                case Eagle.FileType.GraphConfig:
                    fileInfo = graphConfig.fileInfo;
                    obj = graphConfig;
                    break;
                case Eagle.FileType.Palette: {
                    const paletteNames: string[] = this.buildReadablePaletteNamesList();
                    const paletteName = await Utils.userChoosePalette(paletteNames);
                    const palette = this.findPalette(paletteName, false);
                    if (palette === null){
                        reject("Chosen palette not found in open palettes");
                        return;
                    }
                    fileInfo = palette.fileInfo;
                    obj = palette;
                    break;
                }
                default:
                    Utils.showUserMessage("Not implemented", "Not sure which fileType to commit :" + fileType);
                    reject("Not sure which fileType to commit:" + fileType);
                    return;
            }


            // create default repository to supply to modal so that the modal is populated with useful defaults
            let defaultRepository: Repository;

            if (this.logicalGraph()){
                // if the repository service is unknown (or file), probably because the graph hasn't been saved before, then
                // just use any existing repo
                if (fileInfo().location.repositoryService() === Repository.Service.Unknown || fileInfo().location.repositoryService() === Repository.Service.File){
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
                    defaultRepository = new Repository(fileInfo().location.repositoryService(), fileInfo().location.repositoryName(), fileInfo().location.repositoryBranch(), false);
                }
            }

            // determine a default filename
            let defaultFilename: string = fileInfo().location.repositoryFileName();
            if (fileType === Eagle.FileType.GraphConfig){
                defaultFilename = Utils.generateFilenameForGraphConfig(this.logicalGraph(), graphConfig);
            }

            let commit: RepositoryCommit;
            try {
                commit = await Utils.requestUserGitCommit(defaultRepository, Repositories.getList(defaultRepository.service), fileInfo().location.repositoryPath(), defaultFilename, fileType);
            } catch (error){
                reject(error);
                return;
            }

            // check repository name
            const repository : Repository = Repositories.get(commit.location.repositoryService(), commit.location.repositoryName(), commit.location.repositoryBranch());

            // TODO: a bit of a kludge here to have to create a new RepositoryFile object just to pass to _commit()
            const file: RepositoryFile = new RepositoryFile(repository, commit.location.repositoryPath(), commit.location.repositoryFileName());
            file.type = fileType;
            this._commit(file, fileInfo, commit.message, obj);

            resolve();
        });
    }

    /**
     * Performs a Git commit of a graph/palette.
     */
    commitToGit = async (fileType : Eagle.FileType) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
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
                    Utils.showUserMessage("Not implemented", "Not sure which fileType is the right one to commit :" + fileType);
                    break;
            }

            console.log("fileInfo().repositoryService", fileInfo().location.repositoryService());
            console.log("fileInfo().repositoryName", fileInfo().location.repositoryName());

            // if there is no git repository or filename defined for this file. Please use 'save as' instead!
            if (
                [Repository.Service.Unknown, Repository.Service.File, Repository.Service.Url].includes(fileInfo().location.repositoryService()) || fileInfo().location.repositoryName() === null
            ) {
                await this.commitToGitAs(fileType);
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

            const repository = Repositories.getByLocation(fileInfo().location);

            try {
                // TODO: a bit of a kludge here to have to create a new RepositoryFile object just to pass to _commit()
                const file: RepositoryFile = new RepositoryFile(repository, fileInfo().location.repositoryPath(), fileInfo().location.repositoryFileName());
                file.type = fileType;
                await this._commit(file, fileInfo, commitMessage, obj);
            } catch (error) {
                reject(error);
                return;
            }

            resolve();
        });
    }

    _commit = async (file: RepositoryFile, fileInfo: ko.Observable<FileInfo>, commitMessage: string, obj: LogicalGraph | Palette | GraphConfig) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            // check that repository was found, if not try "save as"!
            if (file.repository === null){
                try {
                    await this.commitToGitAs(file.type);
                } catch (error){
                    reject(error);
                    return;
                }
                resolve();
                return;
            }

            try {
                await this.saveDiagramToGit(file, fileInfo, commitMessage, obj);
            } catch (error) {
                reject(error);
                return;
            }
            resolve();
        });
    }

    /**
     * Saves a graph/palette file to the GitHub repository.
     */
    saveDiagramToGit = (file: RepositoryFile, fileInfo: ko.Observable<FileInfo>, commitMessage : string, obj: LogicalGraph | Palette | GraphConfig) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            console.log("saveDiagramToGit() repositoryName", file.repository.name, "fileType", file.type, "filePath", file.path, "fileName", file.name, "commitMessage", commitMessage);

            const clone: LogicalGraph | Palette | GraphConfig = obj.clone();
            clone.fileInfo().updateEagleInfo();

            const version: Setting.SchemaVersion = Setting.findValue(Setting.DALIUGE_SCHEMA_VERSION);

            let jsonString: string = "";
            switch (file.type){
                case Eagle.FileType.Graph:
                    jsonString = LogicalGraph.toJsonString(<LogicalGraph>clone, false, version);
                    break;
                case Eagle.FileType.GraphConfig:
                    jsonString = GraphConfig.toJsonString(<GraphConfig>clone);
                    break;
                case Eagle.FileType.Palette:
                    jsonString = Palette.toJsonString(<Palette>clone, version);
                    break;
            }

            try {
                await this._saveDiagramToGit(file, fileInfo, commitMessage, jsonString, version);
            } catch (error){
                reject(error);
                return;
            }

            resolve();
        });
    }

    _saveDiagramToGit = async (file: RepositoryFile, fileInfo: ko.Observable<FileInfo>, commitMessage : string, jsonString: string, version: Setting.SchemaVersion) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            // generate filename
            const fullFileName : string = Utils.joinPath(file.path, file.name);

            // get access token for this type of repository
            let token : string;

            switch (file.repository.service){
                case Repository.Service.GitHub:
                    token = Setting.findValue(Setting.GITHUB_ACCESS_TOKEN_KEY);
                    break;
                case Repository.Service.GitLab:
                    token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);
                    break;
                default:
                    reject("Unknown repository service. Not GitHub or GitLab!");
                    return;
            }

            // check that access token is defined
            if (token === null || token === "") {
                reject("The GitHub access token is not set! To save files on GitHub, set the access token.");
                return;
            }

            // validate json
            Utils.validateJSON(jsonString, file.type, version);

            const commitJsonString: string = Utils.createCommitJsonString(jsonString, file.repository, token, fullFileName, commitMessage);

            try {
                await this.saveFileToRemote(file, fileInfo, commitJsonString);
            } catch (error){
                reject(error);
                return;
            }

            resolve();
        });
    }

    loadDefaultPalettes = async (): Promise<void> => {
        // get collapsed/expanded state of palettes from html local storage
        let templatePaletteExpanded: boolean = Setting.findValue(Setting.OPEN_TEMPLATE_PALETTE);
        let builtinPaletteExpanded: boolean = Setting.findValue(Setting.OPEN_BUILTIN_PALETTE);
        templatePaletteExpanded = templatePaletteExpanded === null ? false : templatePaletteExpanded;
        builtinPaletteExpanded = builtinPaletteExpanded === null ? false : builtinPaletteExpanded;

        const {palettes, errorsWarnings} = await this.loadPalettes([
            {name:Palette.TEMPLATE_PALETTE_NAME, filename:Daliuge.TEMPLATE_URL, readonly:true, expanded: templatePaletteExpanded},
            {name:Palette.BUILTIN_PALETTE_NAME, filename:Daliuge.PALETTE_URL, readonly:true, expanded: builtinPaletteExpanded}
        ]);
        
        const showErrors: boolean = Setting.findValue(Setting.SHOW_FILE_LOADING_ERRORS);

        // display of errors if setting is true
        if (showErrors && (Errors.hasErrors(errorsWarnings) || Errors.hasWarnings(errorsWarnings))){
            // add warnings/errors to the arrays
            this.loadingErrors(errorsWarnings.errors);
            this.loadingWarnings(errorsWarnings.warnings);

            this.errorsMode(Errors.Mode.Loading);
            Utils.showErrorsModal("Loading File");
        }
    }

    loadPalettes = async (paletteList: {name:string, filename:string, readonly:boolean, expanded:boolean}[]): Promise<{palettes: Palette[], errorsWarnings: Errors.ErrorsWarnings}> => {
        return new Promise(async(resolve, reject) => {
            const destinationPalettes: Palette[] = [];
            const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};

            // define a function to check if all requests are now complete, if so we can return the list of palettes
            function _checkAllPalettesComplete() : void {
                let allComplete = true;

                for (const palette of destinationPalettes){
                    if (palette.isFetching()){
                        allComplete = false;
                    }
                }
                if (allComplete){
                    resolve({palettes: destinationPalettes, errorsWarnings: errorsWarnings});
                }
            }

            // initialise the state
            for (let i = 0 ; i < paletteList.length ; i++){
                // create placeholder palette to show in the UI while the palette is being fetched
                const palette = new Palette();
                palette.isFetching(true);
                palette.fileInfo().name = paletteList[i].name;
                palette.expanded(false);

                // keep reference to the placeholder palette so that it can be replaced when the palette is loaded
                destinationPalettes.push(palette);
                this.palettes.unshift(palette);
            }

            // start trying to load the palettes
            for (let i = 0 ; i < paletteList.length ; i++){
                const index = i;
                const postData = {url: paletteList[i].filename};

                let data: any;
                try {
                    data = await Utils.httpPostJSON("/openRemoteUrlFile", postData);
                } catch (error){
                    // an error occurred when fetching the palette
                    errorsWarnings.errors.push(Errors.Message(error));

                    // try to load palette from localStorage
                    const paletteData = localStorage.getItem(paletteList[i].filename);

                    if (paletteData === null){
                        console.warn("Unable to fetch palette '" + paletteList[i].name + "'. Palette also unavailable from localStorage.");
                    } else {
                        console.warn("Unable to fetch palette '" + paletteList[i].name + "'. Palette loaded from localStorage.");

                        // attempt to determine schema version from FileInfo
                        const schemaVersion: Setting.SchemaVersion = Utils.determineSchemaVersion(paletteData);
                        let palette: Palette;
                        const file = new RepositoryFile(new Repository(Repository.Service.Url, "", "", false), "", paletteList[i].name);
                        file.type = Eagle.FileType.Palette;
                        switch (schemaVersion){
                            case Setting.SchemaVersion.OJS:
                            case Setting.SchemaVersion.Unknown:
                                palette = Palette.fromOJSJson(paletteData, file, errorsWarnings);
                                break;
                            case Setting.SchemaVersion.V4:
                                palette = Palette.fromV4Json(paletteData, file, errorsWarnings);
                                break;
                        }
                        
                        Utils.preparePalette(palette, paletteList[i]);

                        destinationPalettes[index].copy(palette);
                    }

                    _checkAllPalettesComplete();
                    return;
                } finally {
                    destinationPalettes[index].isFetching(false);
                    destinationPalettes[index].expanded(paletteList[index].expanded);
                }

                // palette fetched successfully
                const repositoryFile = new RepositoryFile(new Repository(Repository.Service.Url, "", "", false), "", paletteList[i].name);
                const palette: Palette = Palette.fromOJSJson(data, repositoryFile, errorsWarnings);
                Utils.preparePalette(palette, paletteList[index]);

                // copy loaded palette into the destination palette that is already in the list of palettes
                destinationPalettes[index].copy(palette);

                // save to localStorage
                localStorage.setItem(paletteList[index].filename, data);

                _checkAllPalettesComplete();
            }
        });
    }

    openRemoteFile = async (file : RepositoryFile): Promise<void> => {
        // flag file as being fetched
        file.isFetching(true);

        // check palette is not already loaded
        const alreadyLoadedPalette : Palette = this.findPaletteByFile(file);
        if (alreadyLoadedPalette !== null){
            this.closePalette(alreadyLoadedPalette);
        }

        // if this is a palette, create the destination palette and add to list of palettes so that it shows in the UI
        let destinationPalette: Palette = null;
        if (file.type === Eagle.FileType.Palette){
            destinationPalette = new Palette();
            destinationPalette.isFetching(true);
            destinationPalette.fileInfo().name = file.name;
            destinationPalette.expanded(false);
            this.palettes.unshift(destinationPalette);
        }

        // check the service required to fetch the file
        let openRemoteFileFunc: (repositoryService: Repository.Service, repositoryName: string, repositoryBranch: string, filePath: string, fileName: string) => Promise<string>;
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
        let data: string;
        try {
            data = await openRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
        } catch (error){
            Utils.showUserMessage("Error", "Unable to open remote file: " + error);
            this.hideEagleIsLoading()
            return;
        } finally {
            // flag fetching as complete
            file.isFetching(false);
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
                    const confirmed = await Utils.requestUserConfirm("Newer EAGLE Version", "File " + file.name + " was written with EAGLE version " + eagleVersion + ", whereas the current EAGLE version is " + (<any>window).version + ". Do you wish to load the file anyway?", "Yes", "No", null);
                    if (confirmed){
                        this._loadGraph(data, file);
                    }
                } else {
                    this._loadGraph(data, file);
                }
                break;
            }
            case Eagle.FileType.Palette:
                this._remotePaletteLoaded(file, data, destinationPalette);
                break;

            case Eagle.FileType.GraphConfig:
                this._loadGraphConfig(dataObject, file);
                break;

            case Eagle.FileType.Markdown:
                Utils.showUserMessage(file.name, Utils.markdown2html(data));
                break;

            default:
                // Show error message
                Utils.showUserMessage("Error", "The file type is unknown!");
        }
        this.resetEditor();
    };

    _loadGraph = (data: string, file: RepositoryFile) : void => {
        // load graph
        this._loadGraphJSON(data, file.path, (lg: LogicalGraph) => {
            this.logicalGraph(lg);
        });

        this._postLoadGraph(file);
    }

    _postLoadGraph = (file: RepositoryFile) : void => {
        //needed when centering after init of a graph. we need to wait for all the constructs to finish resizing themselves
        setTimeout(function(){
            Eagle.getInstance().centerGraph()
        },50)

        // check graph
        this.checkGraph();
        this.undo().clear();
        this.undo().pushSnapshot(this, "Loaded " + file.name);

        // if the fileType is the same as the current mode, update the activeFileInfo with details of the repository the file was loaded from
        Utils.updateFileInfo(this.logicalGraph().fileInfo, file);
    }

    _loadGraphConfig = async (dataObject: any, file: RepositoryFile): Promise<void> => {
        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};

        const graphConfig = GraphConfig.fromJson(dataObject, this.logicalGraph(), errorsWarnings);

        // abort if graphConfig does not belong to this graph
        const configMatch = FileLocation.match(graphConfig.fileInfo().graphLocation, this.logicalGraph().fileInfo().location);
        if (!configMatch) {
            // first determine how many fields within the config can be found in the current graph
            let foundCount = 0;

            for (const gcNode of graphConfig.getNodes()) {
                for (const gcField of gcNode.getFields()) {
                    const lgNode = gcNode.getNode();
                    const lgField = gcField.getField();

                    // skip if no node found
                    if (lgNode === null) {
                        continue;
                    }

                    // skip if no field found
                    if (lgField === null) {
                        continue;
                    }

                    foundCount++;
                }
            }

            let locationTableHtml = "<table class='eagleTableWrapper'><tr><th></th><th>GraphConfig Parent Location</th><th>Current Graph Location</th></tr>";
            locationTableHtml += "<tr><td>Repository Service</td><td>" + graphConfig.fileInfo().graphLocation.repositoryService() + "</td><td>" + this.logicalGraph().fileInfo().location.repositoryService() + "</td></tr>";
            locationTableHtml += "<tr><td>Repository Name</td><td>" + graphConfig.fileInfo().graphLocation.repositoryName() + "</td><td>" + this.logicalGraph().fileInfo().location.repositoryName() + "</td></tr>";
            locationTableHtml += "<tr><td>Repository Branch</td><td>" + graphConfig.fileInfo().graphLocation.repositoryBranch() + "</td><td>" + this.logicalGraph().fileInfo().location.repositoryBranch() + "</td></tr>";
            locationTableHtml += "<tr><td>Repository Path</td><td>" + graphConfig.fileInfo().graphLocation.repositoryPath() + "</td><td>" + this.logicalGraph().fileInfo().location.repositoryPath() + "</td></tr>";
            locationTableHtml += "<tr><td>Repository FileName</td><td>" + graphConfig.fileInfo().graphLocation.repositoryFileName() + "</td><td>" + this.logicalGraph().fileInfo().location.repositoryFileName() + "</td></tr>";
            locationTableHtml += "<tr><td>Commit Hash</td><td>" + graphConfig.fileInfo().graphLocation.commitHash() + "</td><td>" + this.logicalGraph().fileInfo().location.commitHash() + "</td></tr>";
            locationTableHtml += "<tr><td>Download Url</td><td>" + graphConfig.fileInfo().graphLocation.downloadUrl() + "</td><td>" + this.logicalGraph().fileInfo().location.downloadUrl() + "</td></tr>";

            locationTableHtml += "<tr><td>Matching Fields</td><td colspan='2'>" + foundCount + "/" + graphConfig.numFields() + "</td></tr>";
            locationTableHtml += "</table>";

            try {
                await Utils.requestUserConfirm("Error", "Graph config does not belong to this graph! Do you wish to load it anyway?" + locationTableHtml, "Yes", "No", null);
            } catch (error){
                console.error(error);
                return;
            }
        }

        // check if graphConfig already exists in this graph
        const configAlreadyExists: boolean = this.logicalGraph().getGraphConfigById(graphConfig.getId()) !== undefined;

        if (configAlreadyExists){
            const userOption = await Utils.requestUserOptions("Graph Config Already Exists", "A graph config with the same id already exists in this graph. Do you wish to overwrite it, or load the new one with a different name?", "Overwrite", "Load as Separate Config", "Cancel", 0);

            if (userOption === "Overwrite"){
                this.logicalGraph().addGraphConfig(graphConfig);
            } else if (userOption === "Load as Separate Config"){
                graphConfig.fileInfo().name = graphConfig.fileInfo().name + " (copy)";
                graphConfig.setId(Utils.generateGraphConfigId());
                this.logicalGraph().addGraphConfig(graphConfig);
            } else {
                // do nothing
            }
        } else {
            this.logicalGraph().addGraphConfig(graphConfig);
        }

        // show errors/warnings
        this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);
    }

    insertRemoteFile = async (file : RepositoryFile): Promise<void> => {
        // flag file as being fetched
        file.isFetching(true);

        // check the service required to fetch the file
        let insertRemoteFileFunc: (repositoryService: Repository.Service, repositoryName: string, repositoryBranch: string, filePath: string, fileName: string) => Promise<string>;
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
        let data: string;
        try {
            data = await insertRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
        } catch (error) {
            Utils.showUserMessage("Error", "Failed to load a file!");
            console.error(error);
            return;
        } finally {
            // flag fetching as complete
            file.isFetching(false);
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
        const schemaVersion: Setting.SchemaVersion = Utils.determineSchemaVersion(dataObject);

        // check if we need to update the graph from keys to ids
        if (GraphUpdater.usesNodeKeys(dataObject)){
            GraphUpdater.updateKeysToIds(dataObject);
        }

        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};

        // use the correct parsing function based on schema version
        let lg: LogicalGraph;
        switch (schemaVersion){
            case Setting.SchemaVersion.OJS:
            case Setting.SchemaVersion.Unknown:
                lg = LogicalGraph.fromOJSJson(dataObject, file.name, errorsWarnings);
                break;
            case Setting.SchemaVersion.V4:
                lg = LogicalGraph.fromV4Json(dataObject, file.name, errorsWarnings);
                break;
            default:
                errorsWarnings.errors.push(Errors.Message("Unknown schemaVersion: " + schemaVersion));
                return;
        }

        // check that graph has been named, if not, name the graph before inserting
        await Utils.checkGraphIsNamed(this.logicalGraph());

        // create parent node
        const parentNode: Node = new Node(lg.fileInfo().name, lg.fileInfo().location.getText(), "", Category.SubGraph);

        // perform insert
        await this.insertGraph(Array.from(lg.getNodes()), Array.from(lg.getEdges()), parentNode, errorsWarnings);

        // trigger re-render
        this.logicalGraph.valueHasMutated();
        this.undo().pushSnapshot(this, "Inserted " + file.name);
        this.checkGraph();

        // show errors/warnings
        this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);
    };

    deleteRemoteFile = async (file : RepositoryFile): Promise<void> => {
        // request confirmation from user
        const confirmed = await Utils.requestUserConfirm("Delete?", "Are you sure you wish to delete '" + file.name + "' from this repository?", "Yes", "No", Setting.find(Setting.CONFIRM_DELETE_FILES));
        if (confirmed){
            this._deleteRemoteFile(file);
        }
    }

    private _deleteRemoteFile = async (file: RepositoryFile): Promise<void> => {
        // check the service required to delete the file
        let deleteRemoteFileFunc;

        switch (file.repository.service){
            case Repository.Service.GitHub:
                deleteRemoteFileFunc = GitHub.deleteRemoteFile;
                break;
            case Repository.Service.GitLab:
                deleteRemoteFileFunc = GitLab.deleteRemoteFile;
                break;
            default:
                console.warn("Unsure how to delete file with unknown service ", file.repository.service);
                break;
        }

        // run the delete file function
        try {
            await deleteRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
        } catch (error) {
            // display error if one occurred
            if (error != null){
                Utils.showNotification("Error deleting file", error, "danger");
                return;
            }
        }

        Utils.showNotification("Success", "File deleted", "success");

        file.repository.deleteFile(file);
    }

    private _remotePaletteLoaded = async (file : RepositoryFile, data : string, destinationPalette: Palette): Promise<void> => {
        this._reloadPalette(file, data, destinationPalette);
    }

    private _reloadPalette = (file : RepositoryFile, data : string, palette : Palette) : void => {
        // close the existing version of the open palette
        if (palette !== null && !palette.isFetching()){
            this.closePalette(palette);
        }

        // determine schema version from FileInfo
        const schemaVersion: Setting.SchemaVersion = Utils.determineSchemaVersion(JSON.parse(data));

        // load the new palette
        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};
        let newPalette: Palette;
        switch (schemaVersion){
            case Setting.SchemaVersion.OJS:
            case Setting.SchemaVersion.Unknown:
                newPalette = Palette.fromOJSJson(data, file, errorsWarnings);
                break;
            case Setting.SchemaVersion.V4:
                newPalette = Palette.fromV4Json(data, file, errorsWarnings);
                break;
            default:
                errorsWarnings.errors.push(Errors.Message("Unknown schemaVersion: " + schemaVersion));
                return;
        }

        if (file.repository.service === Repository.Service.Url){
            newPalette.fileInfo().location.repositoryService(Repository.Service.Url);
            newPalette.fileInfo().location.downloadUrl(file.name);
            newPalette.fileInfo.valueHasMutated();
        }

        // all new (or reloaded) palettes should have 'expanded' flag set to true
        newPalette.expanded(true);

        // copy content of fetched palette into the destination palette that is already in the list of palettes
        palette.copy(newPalette);

        // show errors/warnings
        this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);
    }

    findPaletteByFile = (file : RepositoryFile) : Palette => {
        for (const palette of this.palettes()){
            if (palette.fileInfo().name === file.name){
                return palette;
            }
        }

        return null;
    }

    closePalette = async (palette : Palette): Promise<void> => {
        for (let i = 0 ; i < this.palettes().length ; i++){
            const p = this.palettes()[i];

            // TODO: can we use a palette id here, to be sure the correct palette is closed?
            if (p.fileInfo().name === palette.fileInfo().name){

                // check if the palette is modified, and if so, ask the user to confirm they wish to close
                if (p.fileInfo().modified && Setting.findValue(Setting.CONFIRM_DISCARD_CHANGES)){
                    const confirmed = await Utils.requestUserConfirm("Close Modified Palette", "Are you sure you wish to close this modified palette?", "Close", "Cancel", null);
                    if (confirmed){
                        this.palettes.splice(i, 1);
                    }
                } else {
                    this.palettes.splice(i, 1);
                }

                break;
            }
        }
        this.resetEditor()
    }

    selectAllInPalette = (palette: Palette): void => {
        this.selectedObjects([]);
        for (const node of palette.getNodes()){
            this.editSelection(node, Eagle.FileType.Palette);
        }

        Utils.showNotification("Select All", "All components in '" + palette.fileInfo().name + "' palette selected", "info", false);
    }

    getParentNameAndId = (parentId: NodeId) : string => {
        if(parentId === null){
            return ""
        }

        // TODO: temporary fix while we get lots of warnings about missing nodes
        const parentNode = this.logicalGraph().getNodeById(parentId);

        if (typeof parentNode === 'undefined'){
            return ""
        }

        const parentText = parentNode.getName() + ' | Id: ' + parentId;

        return parentText
    }

    resetActionConfirmations = () : void => {
        Setting.setValue(Setting.CONFIRM_DELETE_FILES, true)
        Setting.setValue(Setting.CONFIRM_DELETE_OBJECTS,true)
        Setting.setValue(Setting.CONFIRM_DISCARD_CHANGES,true)
        Setting.setValue(Setting.CONFIRM_NODE_CATEGORY_CHANGES,true)
        Setting.setValue(Setting.CONFIRM_REMOVE_REPOSITORIES,true)
        Utils.showNotification("Success", "Confirmation message pop ups re-enabled", "success");
    }

    // TODO: shares some code with saveFileToLocal(), we should try to factor out the common stuff at some stage
    savePaletteToDisk = async (palette : Palette, fileName: string) : Promise<void> => {
        return new Promise(async (resolve, reject) => {
            // generate a fileName, if the supplied filename is null or empty
            if (fileName === null || fileName === ""){
                const rawName = palette.fileInfo().name;
                const sanitizedName = Utils.sanitizeFileName(rawName);
                fileName = sanitizedName.length > 0 ? sanitizedName : "palette";
            }

            // clone the palette and remove github info ready for local save
            const p_clone : Palette = palette.clone();
            p_clone.fileInfo().removeGitInfo();
            p_clone.fileInfo().updateEagleInfo();

            // get version
            const version: Setting.SchemaVersion = Setting.findValue(Setting.DALIUGE_SCHEMA_VERSION);

            // convert to json
            const jsonString: string = Palette.toJsonString(p_clone, version);

            // validate json
            Utils.validateJSON(jsonString, Eagle.FileType.Palette, version);

            let data: any;
            try {
                data = await Utils.httpPostJSONString('/saveFileToLocal', jsonString);
            } catch (error){
                Utils.showUserMessage("Error", "Error saving the file! " + error);
                console.error(error);
                reject(error);
                return;
            }

            Utils.downloadFile(data, fileName);

            // since changes are now stored locally, the file will have become out of sync with the GitHub repository, so the association should be broken
            // clear the modified flag
            palette.fileInfo().modified = false;
            palette.fileInfo().location.repositoryService(Repository.Service.File);
            palette.fileInfo().location.repositoryName("");
            palette.fileInfo().repositoryUrl = "";
            palette.fileInfo().location.commitHash("");
            palette.fileInfo().location.downloadUrl("");
            palette.fileInfo.valueHasMutated();

            resolve();
        });
    }

    /**
     * Saves the file to a local download folder.
     */
    saveGraphToDisk = async (graph : LogicalGraph, fileName: string): Promise<void> => {
        return new Promise(async(resolve, reject) => {
            console.log("saveGraphToDisk()", fileName);

            // check that the fileType has been set for the logicalGraph
            if (graph.fileInfo().type !== Eagle.FileType.Graph){
                Utils.showUserMessage("Error", "Graph fileType not set correctly. Could not save file.");
                return;
            }

            // abort if graph empty
            if (graph.getNumNodes() === 0){
                Utils.showNotification("Error", "Can't save an empty graph", "danger");
                return;
            }

            // clone the logical graph and remove github info ready for local save
            const lg_clone : LogicalGraph = this.logicalGraph().clone();
            lg_clone.fileInfo().removeGitInfo();
            lg_clone.fileInfo().updateEagleInfo();

            // get version
            const version: Setting.SchemaVersion = Setting.findValue(Setting.DALIUGE_SCHEMA_VERSION);

            // convert to json
            const jsonString: string = LogicalGraph.toJsonString(lg_clone, false, version);

            // validate json
            Utils.validateJSON(jsonString, Eagle.FileType.Graph, version);

            let data: any;
            try {
                data = await Utils.httpPostJSONString('/saveFileToLocal', jsonString);
            } catch (error){
                Utils.showUserMessage("Error", "Error saving the file! " + error);
                return;
            }

            try {
                await Utils.downloadFile(data, fileName);
            } catch (error){
                reject(error);
                return;
            }

            // since changes are now stored locally, the file will have become out of sync with the GitHub repository, so the association should be broken
            // clear the modified flag
            graph.fileInfo().modified = false;
            graph.fileInfo().location.repositoryService(Repository.Service.File);
            graph.fileInfo().location.repositoryName("");
            graph.fileInfo().repositoryUrl = "";
            graph.fileInfo().location.commitHash("");
            graph.fileInfo().location.downloadUrl("");
            graph.fileInfo.valueHasMutated();

            resolve();
        });
    }

    saveGraphConfigToDisk = async (graphConfig: GraphConfig, fileName: string): Promise<void> => {
        return new Promise(async(resolve, reject) => {
            console.log("saveGraphConfigToDisk()", fileName);

            // get version
            const version: Setting.SchemaVersion = Setting.findValue(Setting.DALIUGE_SCHEMA_VERSION);

            // convert to json
            const jsonString: string = GraphConfig.toJsonString(graphConfig);

            // validate json
            Utils.validateJSON(jsonString, Eagle.FileType.GraphConfig, version);

            try {
                await Utils.downloadFile(jsonString, fileName);
            } catch (error) {
                reject(error);
                return;
            }
            resolve();
        });
    }

    saveAsFileToDisk = async (file: LogicalGraph | Palette | GraphConfig): Promise<void> => {
        // get extension for fileType
        const extension: string = Utils.getDiagramExtension(file.fileInfo().type);

        let defaultFilename = file.fileInfo().name;

        // if the file is a GraphConfig, then prepend the parent graph name to the default filename
        if (file.fileInfo().type === Eagle.FileType.GraphConfig){
            defaultFilename = Utils.generateFilenameForGraphConfig(this.logicalGraph(), file as GraphConfig);
        }

        // check whether existing name ends with the file extension
        if (!defaultFilename.endsWith("." + extension)) {
            defaultFilename += "." + extension;
        }

        let userString: string;
        try {
            userString = await Utils.requestUserString("Save As", "Please enter a filename for the " + file.fileInfo().type, defaultFilename, false);
        } catch (error) {
            console.error(error);
            return;
        }

        // abort if user entered empty string
        if (userString === "") {
            // abort and notify user
            Utils.showNotification("Unable to save file with no name", "Please name the file before saving", "danger");
            return;
        }

        switch(file.fileInfo().type){
            case Eagle.FileType.Graph:
                this.saveGraphToDisk(file as LogicalGraph, userString);
                break;
            case Eagle.FileType.GraphConfig:
                this.saveGraphConfigToDisk(file as GraphConfig, userString);
                break;
            case Eagle.FileType.Palette:
                this.savePaletteToDisk(file as Palette, userString);
                break;
            default:
                console.warn("saveAsFileToDisk(): fileType", file.fileInfo().type, "not implemented, aborting.");
                Utils.showUserMessage("Error", "Unable to save file: file type '" + file.fileInfo().type + "' is not supported.");
        }
    }

    savePaletteToGit = async (palette: Palette): Promise<void> => {
        console.log("savePaletteToGit()", palette.fileInfo().name, palette.fileInfo().type);

        const defaultRepository: Repository = new Repository(palette.fileInfo().location.repositoryService(), palette.fileInfo().location.repositoryName(), palette.fileInfo().location.repositoryBranch(), false);

        let commit: RepositoryCommit;
        try {
            commit = await Utils.requestUserGitCommit(defaultRepository, Repositories.getList(Repository.Service.GitHub),  palette.fileInfo().location.repositoryPath(), palette.fileInfo().name, Eagle.FileType.Palette);
        } catch (error) {
            console.error(error);
            return;
        }

        // check repository name
        const repository : Repository = Repositories.get(commit.location.repositoryService(), commit.location.repositoryName(), commit.location.repositoryBranch());
        if (repository === null){
            console.log("Abort commit");
            return;
        }

        // get access token for this type of repository
        let token : string;

        switch (commit.location.repositoryService()){
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

        // clone the palette
        const p_clone : Palette = palette.clone();
        p_clone.fileInfo().updateEagleInfo();

        // get version
        const version: Setting.SchemaVersion = Setting.findValue(Setting.DALIUGE_SCHEMA_VERSION);

        // convert to json
        const jsonString: string = Palette.toJsonString(p_clone, version);

        const commitJsonString: string = Utils.createCommitJsonString(jsonString, repository, token, commit.location.fullPath(), commit.message);

        try {
            // TODO: a bit of a kludge here to have to create a new RepositoryFile object just to pass to _commit()
            const file: RepositoryFile = new RepositoryFile(repository, commit.location.repositoryPath(), commit.location.repositoryFileName());
            file.type = Eagle.FileType.Palette;
            await this.saveFileToRemote(file, palette.fileInfo, commitJsonString);
        } catch (error){
            console.log(error);
        }
    }
    
    validateGraph = (): void => {
        // get logical graph
        const lg: LogicalGraph = Eagle.getInstance().logicalGraph();

        // get schema version
        const version: Setting.SchemaVersion = Setting.findValue(Setting.DALIUGE_SCHEMA_VERSION);

        // get json for logical graph
        const jsonString: string = LogicalGraph.toJsonString(lg, true, version);

        // parse output JSON
        let jsonObject;
        try {
            jsonObject = JSON.parse(jsonString);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            Utils.showNotification("Error", "Could not parse JSON Output before validation: " + errorMessage, "danger");
            return;
        }

        // validate object
        const validatorResult : {valid: boolean, errors: string} = Utils._validateJSON(jsonObject, version, Eagle.FileType.Graph);
        if (validatorResult.valid){
            Utils.showNotification("Success",  "JSON Output valid against internal JSON schema (" + version + ")", "success");
        } else {
            Utils.showNotification("Error",  "JSON Output failed validation against internal JSON schema (" + version + "): " + validatorResult.errors, "danger");
        }
    }

    saveGraphScreenshot = async () : Promise<void> =>  {
        const eagle = Eagle.getInstance()

        if (eagle.logicalGraph().getNumNodes() === 0){
            Utils.showNotification("Screenshot", "Can't take a screenshot of an empty graph", "warning");
            return;
        }

        const mediaDevices = navigator.mediaDevices as any; //workaround to prevent a Typescript issue with giving getDisplayMedia function an option
        const stream:MediaStream = await mediaDevices.getDisplayMedia({preferCurrentTab: true,selfBrowserSurface: 'include'});

        //prepare the graph for a screenshot
        eagle.centerGraph()
        eagle.setSelection(null,Eagle.FileType.Graph)
        document.querySelector('body').style.cursor = 'none';//temporarily disabling the cursor so it doesn't appear in the screenshot
        
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
                const realWidth = window.innerWidth
                const divisor = realWidth/width

                const lx = (eagle.leftWindow().size()+50)/divisor
                const rx = (eagle.rightWindow().size()+50)/divisor
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

    toggleEdgeClosesLoop = () : void => {
        this.selectedEdge().toggleClosesLoop();

        // get nodes from edge
        const sourceNode = this.selectedEdge().getSrcNode();
        const destNode = this.selectedEdge().getDestNode();

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

    showWhatsNew = () : void => {
        $('#whatsNewModal').modal('show');
    }

    onlineDocs = () : void => {
        // open in new tab:
        window.open(
          'https://eagle-dlg.readthedocs.io/',
          '_blank'
        );
    }

    readme = () : void => {
        // open in new tab:
        window.open(
          'https://github.com/ICRAR/EAGLE/blob/master/README.md',
          '_blank'
        );
    }

    submitIssue = () : void => {
        // automatically add the EAGLE version and commit hash to the body of the new issue
        let bodyText: string = "\n\nVersion: "+(<any>window).version+"\nCommit Hash: "+(<any>window).commit_hash;

        // url encode the body text
        bodyText = encodeURI(bodyText);

        // open in new tab
        window.open("https://github.com/ICRAR/EAGLE/issues/new?body="+bodyText, "_blank");
    }

    statusBarScroll = (data:any,e:any) : void => {
        e.preventDefault();
        const leftPos = $('#statusBar').scrollLeft();
        $('#statusBar').scrollLeft(leftPos + e.originalEvent.deltaY)
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

    duplicateSelection = async (mode: "normal"|"contextMenuRequest") => {
        if(mode === 'normal' && this.selectedObjects().length === 0){
            Utils.showNotification('Unable to duplicate selection','No nodes are selected','warning')
            return
        }
        
        let location: string;
        let incomingNodes: (Node | Edge)[] = [];

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
                        Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Duplicate Selection");
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

                    // remove embedded nodes that are already selected
                    // this is to prevent copying the same embedded node multiple times
                    const nodesToDuplicate: Node[] = this._removeAlreadySelectedEmbeddedNodes(nodes);

                    // duplicate nodes and edges
                    await this.insertGraph(nodesToDuplicate, edges, null, errorsWarnings);

                    // re-check graph, set undo snapshot and trigger re-render
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
                    this._addNodeAndChildren(object, nodes);
                } else {
                    this._addUniqueNode(nodes, object);
                }
            }

            if (object instanceof Edge){
                edges.push(object);
            }
        }

        // remove any embedded nodes that are already selected
        // this is to prevent copying the same embedded node multiple times
        const nodesToCopy: Node[] = this._removeAlreadySelectedEmbeddedNodes(nodes);

        // if copyChildren, add all edges adjacent to the nodes in the list objects
        if (copyChildren){
            for (const edge of this.logicalGraph().getEdges()){
                for (const node of nodes){
                    if (node.getId() === edge.getSrcNode().getId() || node.getId() === edge.getDestNode().getId()){
                        this._addUniqueEdge(edges, edge);
                    }
                }
            }
        }

        // TODO: serialise nodes and edges
        const serialisedNodes = [];
        for (const node of nodesToCopy){
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
        navigator.clipboard.writeText(JSON.stringify(clipboard, null, EagleConfig.JSON_INDENT)).then(
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

    // given a list of nodes, remove any embedded nodes that are already selected
    _removeAlreadySelectedEmbeddedNodes = (nodes: Node[]) : Node[] => {
        const newNodes: Node[] = [];
        for (const node of nodes){
            if (node.isEmbedded() && this.objectIsSelected(node.getEmbed())){
                continue; // skip this node, as it is already selected
            }
            newNodes.push(node);
        }
        return newNodes;
    }

    // NOTE: support func for copySelectionToKeyboard() above
    // TODO: move to LogicalGraph.ts?
    _addNodeAndChildren = (node: Node, output: Node[]) : void => {
        this._addUniqueNode(output, node);

        for (const child of node.getChildren()){
            this._addNodeAndChildren(child, output);
        }
    }

    // NOTE: support func for copySelectionToKeyboard() above
    // TODO: move to LogicalGraph.ts?
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
    // TODO: move to LogicalGraph.ts?
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
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Paste from Clipboard");
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
            const edge = Edge.fromOJSJson(e, nodes, errorsWarnings);

            edges.push(edge);
        }

        // set parent links
        for (const n of clipboard.nodes){
            const nodeId = Node.determineNodeId(n);
            const parentId = Node.determineNodeParentId(n);

            const node = nodes.find((n) => n.getId() === nodeId);
            const parentNode = nodes.find((n) => n.getId() === parentId);

            if (node === undefined){
                console.warn("pasteFromClipboard(): node with id", nodeId, "not found in clipboard nodes");
                continue;
            }

            if (parentNode !== undefined){
                node.setParent(parentNode);
            }
        }

        await this.insertGraph(nodes, edges, null, errorsWarnings);

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
        let numNodes = 0;
        let numEdges = 0;

        // add nodes
        for (const node of this.logicalGraph().getNodes()){
            newSelection.push(node);
            numNodes += 1;
        }

        // add edges
        for (const edge of this.logicalGraph().getEdges()){
            newSelection.push(edge);
            numEdges += 1;
        }

        // notify
        Utils.showNotification("Select All in Graph", numNodes + " node(s) and " + numEdges + " edge(s) selected", "info");

        // set selection
        this.selectedObjects(newSelection);
        Eagle.selectedLocation(Eagle.FileType.Graph);
    }

    selectNoneInGraph = () : void => {
        console.log("selectNoneInGraph()");

        this.selectedObjects([]);
    }

    addNodesToPalette = async (nodes: Node[]) => {
        console.log("addNodesToPalette()");

        // build a list of palette names
        const paletteNames: string[] = this.buildWritablePaletteNamesList();

        // ask user to select the destination node
        const userChoice = await Utils.requestUserChoice("Destination Palette", "Please select the palette to which you'd like to add the node(s)", paletteNames, 0, true, "New Palette Name");

        if (userChoice === null){
            return;
        }

        // if user made custom choice
        let userString: string = userChoice;

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
            // TODO: do we need to lookup embedNode here? Is it just node? check this!
            const nodes: Node[] = Array.from(destinationPalette.getNodes());
            const embedNode: Node = nodes[destinationPalette.getNumNodes() - 1];

            // check if clone has embedded applications, if so, add them to destination palette and remove
            if (node.hasInputApplication()){
                destinationPalette.addNode(node.getInputApplication(), true);
                nodes[destinationPalette.getNumNodes() - 1].setEmbed(embedNode);
            }
            if (node.hasOutputApplication()){
                destinationPalette.addNode(node.getOutputApplication(), true);
                nodes[destinationPalette.getNumNodes() - 1].setEmbed(embedNode);
            }

            // mark the palette as modified
            destinationPalette.fileInfo().modified = true;
        }
    }

    addSelectedNodesToPalette = (mode: "normal"|"contextMenuRequest") : void => {
        const nodes: Node[] = []

        if(mode === 'normal'){
            for(const object of this.selectedObjects()){
                if ((object instanceof Node)){
                    nodes.push(object)
                }
            }
        }else{
            const rightClickObject = Eagle.selectedRightClickObject();

            // if right click object is a node, add it to the nodes list
            if (rightClickObject instanceof Node){
                nodes.push(rightClickObject);
            }
        }

        if (nodes.length === 0){
            console.error("Attempt to add selected node to palette when no node selected");
            return;
        }

        this.addNodesToPalette(nodes);
    }

    deleteSelection = async (rightClick: boolean, suppressUserConfirmationRequest: boolean, deleteChildren: boolean): Promise<void> => {
        let data: (Node | Edge)[] = [];
        let location: Eagle.FileType = Eagle.FileType.Unknown;

        GraphRenderer.clearPortPeek()

        if (rightClick){
            data.push(Eagle.selectedRightClickObject())
            location = Eagle.selectedRightClickLocation();
        }else{
            data = this.selectedObjects()
            location = Eagle.selectedLocation();
        }

        // check that graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Delete Selection");
            return;
        }

        // if no objects selected, warn user
        if (data.length === 0){
            Utils.showNotification("Warning", "Unable to delete selection: Nothing selected", "warning");
            return;
        }

        // if in "hide data nodes" mode, then recommend the user delete edges in "show data nodes" mode instead
        if (!this.showDataNodes()){
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
                for (const child of object.getChildren()){
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
        // TODO: re-write once we have node.children
        for (const edge of this.logicalGraph().getEdges()){
            for (const node of childNodes){
                if (edge.getSrcNode().getId() === node.getId() || edge.getDestNode().getId() === node.getId()){
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
        const confirmed = await Utils.requestUserConfirm("Delete?", confirmMessage, "Yes", "No", Setting.find(Setting.CONFIRM_DELETE_OBJECTS));
        if (confirmed){
            this._deleteSelection(deleteChildren, data, location);
        }

        // if we're NOT in rightClick mode, empty the selected objects, should have all been deleted
        if(!rightClick){
            this.selectedObjects([]);
        }
    }

    private _deleteSelection = (deleteChildren: boolean, data: (Node | Edge)[], location: Eagle.FileType) : void => {
        switch(location){
            case Eagle.FileType.Graph:
                // if not deleting children, move them to different parents first
                if (!deleteChildren){
                    this._moveChildrenOfSelection();
                }

                // NOTE: when deleting the selection, deleting a node will also delete adjacent edges, so the edge will be deleted automatically
                //       meaning when we come to delete the edge, it will already be missing
                //       so we should delete all the edges first, so that we don't get an error when trying to delete an edge that is already gone        
                
                // delete the edges
                for (const object of data){
                    if (object instanceof Edge){
                        this.logicalGraph().removeEdgeById(object.getId());
                    }
                }

                // delete the nodes
                for (const object of data){
                    if (object instanceof Node){
                        this.logicalGraph().removeNode(object);
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
                    if (node.getParent() !== null && node.getParent().getId() === object.getId()){
                        node.setParent(object.getParent());
                    }
                }
            }
        }
    }

    addNodeToLogicalGraphAndConnect = async (newNodeId: NodeId) => {
        const nodes: Node[] = await this.addNodeToLogicalGraph(null, newNodeId, Eagle.AddNodeMode.ContextMenu);

        const realSourceNode: Node = RightClick.edgeDropSrcNode;
        const realSourcePort: Field = RightClick.edgeDropSrcPort;
        const realDestNode: Node = nodes[0];
        let realDestPort = realDestNode.findPortByMatchingType(realSourcePort.getType(), !RightClick.edgeDropSrcIsInput);

        // if no dest port was found, just use first input port on dest node
        if (realDestPort === null){
            realDestPort = realDestNode.findPortOfAnyType(true);
        }

        // create edge (in correct direction)
        let edge: Edge;
        if (!RightClick.edgeDropSrcIsInput){
            edge = await this.addEdge(realSourceNode, realSourcePort, realDestNode, realDestPort, false, false, true);
        } else {
            edge = await this.addEdge(realDestNode, realDestPort, realSourceNode, realSourcePort, false, false, true);

        }

        // check, undo, modified etc
        this.checkGraph();
        this.undo().pushSnapshot(this, "Add edge " + edge.getId());
        this.logicalGraph().fileInfo().modified = true;
        this.logicalGraph.valueHasMutated();
    }

    addNodeToLogicalGraph = (node: Node, nodeId: NodeId, mode: Eagle.AddNodeMode): Promise<Node[]> => {
        return new Promise(async(resolve, reject) => {
            const result: Node[] = [];
            let pos : {x:number, y:number};
            pos = {x:0,y:0}
            let searchAreaExtended = false; //used if we cant find space on the canvas, we then extend the search area for space and center the graph after adding to bring new nodes into view

            // check that graph editing is allowed
            if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
                reject("Unable to Add Component. Graph Editing is disabled");
                return;
            }

            if(mode === Eagle.AddNodeMode.ContextMenu){
                // we addNodeToLogicalGraph is called from the ContextMenu, we expect node to be null. The node is specified by the nodeId instead
                console.assert(node === null);

                // try to find the node (by nodeId) in the palettes
                node = Utils.getPaletteComponentById(nodeId);

                // if node not found yet, try find in the graph
                if (typeof node === 'undefined'){
                    node = this.logicalGraph().getNodeById(nodeId);

                    // abort if node is still undefined
                    if (typeof node === 'undefined'){
                        // if we still can't find the node, reject with an error
                        reject(new Error("Unable to find node with specified id (" + nodeId + ") in palette(s) or graph."));
                        return;
                    }
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

            // check for parent before adding the node
            const parent : Node = this.logicalGraph().checkForNodeAt(pos.x, pos.y, EagleConfig.MINIMUM_CONSTRUCT_RADIUS, true);

            // add the node
            const newNode: Node = await this.addNode(node, pos.x, pos.y);
            result.push(newNode);

            // set parent (if the node was dropped on something)
            newNode.setParent(parent);

            // if the node is a construct, add the input and output applications, if they exist
            if (node.isGroup()){
                // check if the node has an input application, if so, add it
                if (node.hasInputApplication()){
                    // add the input application to the logical graph
                    const inputApp: Node = await this.addNode(node.getInputApplication(), 0, 0);
                    newNode.setInputApplication(inputApp);
                    result.push(inputApp);
                }
                // check if the node has an output application, if so, add it
                if (node.hasOutputApplication()){
                    // add the input application to the logical graph
                    const outputApp: Node = await this.addNode(node.getOutputApplication(), 0, 0);
                    newNode.setInputApplication(outputApp);
                    result.push(outputApp);
                }
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
                const poNode: Node = new Node(poName, "Instance of " + poName, "", Category.PythonObject);

                // add node to LogicalGraph
                const OBJECT_OFFSET_X = 100;
                const OBJECT_OFFSET_Y = 100;
                const pythonObjectNode: Node = await this.addNode(poNode, pos.x + OBJECT_OFFSET_X, pos.y + OBJECT_OFFSET_Y);
                // set parent to same as PythonMemberFunction
                pythonObjectNode.setParent(newNode);

                // add the PythonObject node to the result
                result.push(pythonObjectNode);

                // copy all fields from a "PythonObject" node in the palette
                Utils.copyFieldsFromPrototype(pythonObjectNode, Palette.BUILTIN_PALETTE_NAME, Category.PythonObject);

                // find the "object" port on the PythonMemberFunction
                let sourcePort: Field = newNode.findPortByDisplayText(Daliuge.FieldName.SELF, false, false);

                // make sure we can find a port on the PythonMemberFunction
                if (sourcePort === null){
                    sourcePort = Daliuge.selfField.clone().setId(Utils.generateFieldId());
                    newNode.addField(sourcePort);
                    Utils.showNotification("Component Warning", "The PythonMemberFunction does not have a '" + Daliuge.FieldName.SELF + "' port. Added this port to enable connection.", "warning");
                }

                // create a new input/output "object" port on the PythonObject
                const inputOutputPort: Field = Daliuge.selfField.clone().setId(Utils.generateFieldId()).setType(sourcePort.getType());
                pythonObjectNode.addField(inputOutputPort);

                // add edge to Logical Graph (connecting the PythonMemberFunction and the automatically-generated PythonObject)
                this.addEdge(newNode, sourcePort, pythonObjectNode, inputOutputPort, false, false, true);
            }

            // select the new node
            this.setSelection(newNode, Eagle.FileType.Graph);

            this.checkGraph();
            this.undo().pushSnapshot(this, "Add node " + newNode.getName());
            this.logicalGraph.valueHasMutated();

            resolve(result);

            if(searchAreaExtended){
                setTimeout(function(){
                    Eagle.getInstance().centerGraph()
                },100)
            }
        });
    }

    addGraphNodesToPalette = async () => {
        // check that palette editing is permitted
        if (!Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Palette, "Add Graph Nodes to Palette");
            return;
        }

        //check if there are any nodes in the graph
        if  (this.logicalGraph().getNumNodes() === 0){
            Utils.showNotification("Unable to add nodes to palette", "No nodes found in graph", "danger");
            return
        }

        // build a list of palette names
        const paletteNames: string[] = this.buildWritablePaletteNamesList();

        // ask user to select the destination node
        const userChoice = await Utils.requestUserChoice("Destination Palette", "Please select the palette to which you'd like to add the nodes", paletteNames, 0, true, "New Palette Name");
        // abort if the user aborted
        if (userChoice === null){
            return;
        }

        let userString: string = userChoice;

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
    }

    private buildWritablePaletteNamesList = () : string[] => {
        const paletteNames : string[] = [];
        for (const palette of this.palettes()){
            // skip the template palette that contains all nodes
            if (palette.fileInfo().name === Palette.TEMPLATE_PALETTE_NAME){
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

    tableDropdownClick = (newType: Daliuge.DataType, field: Field) : void => {
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

        // re-check the graph
        this.checkGraph();
    }

    graphEditComment = (object:Node | Edge): void => {
        this.setSelection(object, Eagle.FileType.Graph)
        
        setTimeout(() => {
            if (object instanceof Node){
                this.editNodeComment()
            }else {
                this.editEdgeComment()
            }
        }, 100);
    };

    changeNodeParent = async () => {
        // build list of node name + ids (exclude self)
        const selectedNode: Node = this.selectedNode();

        if (selectedNode === null){
            Utils.showNotification("Unable to Change Node Parent", "Attempt to change parent node when no node selected", "warning");
            return;
        }

        // check that graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Change Node Parent")
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
            if (node.getId() === selectedNode.getParent().getId()){
                selectedChoiceIndex = validChoiceIndex;
            }

            nodeList.push(node.getName() + " : " + node.getId());
        }

        // add "None" to the list of possible parents
        nodeList.unshift("None : 0");

        // ask user to choose a parent
        const userChoice: string = await Utils.requestUserChoice("Node Parent Id", "Select a parent node", nodeList, selectedChoiceIndex, false, "");
        
        if (userChoice === null){
            return;
        }

        const choice: string = userChoice;

        // change the parent
        // key '0' is a special case
        const newParentId: NodeId = choice.substring(choice.lastIndexOf(" ") + 1).toString() as NodeId
        const newParent: Node = this.logicalGraph().getNodeById(newParentId);

        // abort if specified new parent can not be found in the graph
        if (typeof newParent === 'undefined'){
            Utils.showNotification("Warning", "Can't find user-specified parent within the graph", "warning", false);
            return;
        }

        // set the parent
        selectedNode.setParent(newParent);

        // refresh the display
        this.checkGraph();
        this.undo().pushSnapshot(this, "Change Node Parent");
        this.logicalGraph().fileInfo().modified = true;
        this.selectedObjects.valueHasMutated();
        this.logicalGraph.valueHasMutated();
    }

    nodeDropLogicalGraph = (eagle : Eagle, event: JQuery.TriggeredEvent) : void => {
        const e: DragEvent = event.originalEvent as DragEvent;

        // keep track of the drop location
        Eagle.nodeDropLocation = {x:GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(e.pageX),y:GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(e.pageY)}

        // determine dropped node
        const sourceComponents : Node[] = [];

        if(Eagle.nodeDragPaletteIndex === null || Eagle.nodeDragComponentId === null){
            return;
        }

        // if some node in the graph is selected, ignore it and used the node that was dragged from the palette
        if (Eagle.selectedLocation() === Eagle.FileType.Graph || Eagle.selectedLocation() === Eagle.FileType.Unknown){
            const component: Node = this.palettes()[Eagle.nodeDragPaletteIndex].getNodeById(Eagle.nodeDragComponentId);
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
            this.addNodeToLogicalGraph(sourceComponent, null, Eagle.AddNodeMode.Default);

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

        if(Eagle.nodeDragPaletteIndex === null || Eagle.nodeDragComponentId === null){
            return;
        }

        // if some node in the graph is selected, ignore it and used the node that was dragged from the palette
        if (Eagle.selectedLocation() === Eagle.FileType.Graph || Eagle.selectedLocation() === Eagle.FileType.Unknown){
            const component: Node = this.palettes()[Eagle.nodeDragPaletteIndex].getNodeById(Eagle.nodeDragComponentId);
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
        }
    }

    paletteComponentClick = (node: Node, event: JQuery.TriggeredEvent) : void => {
        const e: PointerEvent = event.originalEvent as PointerEvent;
        
        if (e && e.shiftKey){
            this.editSelection(node, Eagle.FileType.Palette);
        }else{
            this.setSelection(node, Eagle.FileType.Palette);
        }
    }

    selectInputApplicationNode = () : void => {
        this.setSelection(this.selectedNode().getInputApplication(), Eagle.FileType.Graph);
    }

    selectOutputApplicationNode = () : void => {
        this.setSelection(this.selectedNode().getOutputApplication(), Eagle.FileType.Graph);
    }

    editField = async (field: Field): Promise<void> => {
        // check that field exists
        if (field === null || typeof field === 'undefined'){
            console.error("No field to edit");
            return;
        }

        // get field names list from the logical graph
        const allFields: Field[] = Utils.getUniqueFieldsOfType(this.logicalGraph(), field.getParameterType());
        const allFieldNames: string[] = [];

        // once done, sort fields and then collect names into the allFieldNames list
        allFields.sort(Field.sortFunc);
        for (const field of allFields){
            allFieldNames.push(field.getDisplayText() + " (" + field.getType() + ")");
        }

        // build modal header text
        const title = this.selectedNode().getName() + " - " + field.getDisplayText() + " : " + Field.getHtmlTitleText(field.getParameterType(), field.getUsage());

        try {
            await Utils.requestUserEditField(this, field, title, allFieldNames);
        } catch (error){
            console.error(error);
            return;
        }

        this.checkGraph();
        this.undo().pushSnapshot(this, "Edit Field");

        // now that we are done, re-open the params table
        Utils.showField(this, Eagle.selectedLocation(), field.getNode(), field);
    };

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
            let minX = Setting.findValue(Setting.LEFT_WINDOW_VISIBLE) ? this.leftWindow().size()+MARGIN: 0+MARGIN;
            let maxX = Setting.findValue(Setting.RIGHT_WINDOW_VISIBLE) ? $('#logicalGraphParent').width() - this.rightWindow().size() - MARGIN : $('#logicalGraphParent').width() - MARGIN;
            let minY = 0 + navBarHeight + MARGIN;
            //using jquery here to get the bottom window height because it is internally saved in VH (percentage screen height). Doing it this way means we don't have to convert it to pixels
            let maxY = $('#logicalGraphParent').height() - MARGIN + navBarHeight

            if(Setting.findValue(Setting.BOTTOM_WINDOW_VISIBLE)){
                maxY = $('#logicalGraphParent').height() - $('#bottomWindow').height() - MARGIN + navBarHeight;
            }

            if(increaseSearchArea){
                minX = minX - 300
                maxX = maxX + 300
                minY = minY - 300
                maxY = maxY + 300
            }

            let randomX
            let randomY

            if (this.logicalGraph().getNumNodes() === 0){
                //if there are no nodes in the graph we will put the new node to the left of the center of the canvas
                randomX = minX + (maxX - minX)/4
                randomY = minY + (maxY - minY)/2
            }else{
                // choose random position within minimums and maximums determined above
                randomX = Math.floor(Math.random() * (maxX - minX + 1) + minX);
                randomY = Math.floor(Math.random() * (maxY - minY + 1) + minY);
            }

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
        if (fileInfo.location.repositoryService() === Repository.Service.Unknown || fileInfo.location.repositoryService() === Repository.Service.File){
            Utils.showNotification("Graph URL", "Source of graph is a local file or unknown, unable to create URL for graph.", "danger");
            return;
        }

        // build graph url
        const graph_url: string = FileLocation.generateUrl(fileInfo.location);
 
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
        //recheck the graph for errors, this is because we cannot rely on the fact that the graph has been checked.
        //this is to ensure that when the user requests to see the graph errors, the information is up to date
        this.checkGraph();

        if (this.graphWarnings().length > 0 || this.graphErrors().length > 0){

            // switch to graph errors mode
            this.errorsMode(Errors.Mode.Graph);

            //switch bottom window mode
            Setting.find(Setting.BOTTOM_WINDOW_MODE).setValue(Eagle.BottomWindowMode.GraphErrors)
            //show bottom window
            SideWindow.setShown('bottom',true)
        } else {
            Utils.showNotification("Check Graph", "Graph OK", "success");
        }
    }

    addEdge = async (srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean, forceAutoRename: boolean = false): Promise<Edge> => {
        return new Promise(async(resolve, reject) => {
            // check that none of the supplied nodes and ports are null
            if (srcNode === null){
                reject("addEdge(): srcNode is null");
                return;
            }
            if (srcPort === null){
                reject("addEdge(): srcPort is null");
                return;
            }
            if (destNode === null){
                reject("addEdge(): destNode is null");
                return;
            }
            if (destPort === null){
                reject("addEdge(): destPort is null");
                return;
            }

            // check that graph editing is allowed
            if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
                reject("Unable to Add Edge: Graph Editing is disabled");
                return;
            }

            const edgeConnectsTwoApplications : boolean =
                (srcNode.isApplication() || srcNode.isGroup()) &&
                (destNode.isApplication() || destNode.isGroup());

            const twoEventPorts : boolean = srcPort.getIsEvent() && destPort.getIsEvent();

            // consult the DEFAULT_DATA_NODE setting to determine which category of intermediate data node to use
            let intermediaryComponent = Utils.getPaletteComponentByName(Setting.findValue(Setting.DEFAULT_DATA_NODE));

            // if intermediaryComponent is undefined (not found), then choose something guaranteed to be available
            // if intermediaryComponent is defined (found), then duplicate the node so that we don't modify the original in the palette
            if (typeof intermediaryComponent === 'undefined'){
                intermediaryComponent = new Node("Data", "Data Component", "", Category.Data);
            } else {
                intermediaryComponent = Utils.duplicateNode(intermediaryComponent);
            }

            // if edge DOES NOT connect two applications, process normally
            // if edge connects two event ports, process normally
            // if the definition of the intermediaryComponent cannot be found, process normally
            if (!edgeConnectsTwoApplications || twoEventPorts || (edgeConnectsTwoApplications && intermediaryComponent === null)){
                const edge : Edge = new Edge('', srcNode, srcPort, destNode, destPort, loopAware, closesLoop, false);
                this.logicalGraph().addEdgeComplete(edge);

                // re-name node and port according to the port name of the Application node
                //force auto rename use used when we are adding in a new node. When dragging an edge to empty space or connecting two application nodes.
                if (!Setting.findValue(Setting.DISABLE_RENAME_ON_EDGE_CONNECT) || forceAutoRename){
                    if (srcNode.isApplication()){
                        const newName = srcPort.getDisplayText();
                        const newDescription = srcPort.getDescription();
                        destNode.setName(newName);
                        destPort.setDisplayText(newName);
                        destPort.setDescription(newDescription);
                    } else {
                        const newName = destPort.getDisplayText();
                        const newDescription = destPort.getDescription();
                        srcNode.setName(newName);
                        srcPort.setDisplayText(newName);
                        srcPort.setDescription(newDescription);
                    }
                }

                setTimeout(() => {
                    this.setSelection(edge,Eagle.FileType.Graph)
                }, 30);
                resolve(edge);
                return;
            }

            // by default, use the positions of the nodes themselves to calculate position of new node
            let srcNodePosition = srcNode.getPosition();
            let destNodePosition = destNode.getPosition();

            // if source or destination node is an embedded application, use position of parent construct node
            if (srcNode.isEmbedded()){
                srcNodePosition = srcNode.getEmbed().getPosition();
            }
            if (destNode.isEmbedded()){
                destNodePosition = destNode.getEmbed().getPosition();
            }

            // count number of edges between source and destination
            const PORT_HEIGHT : number = 24;
            const numIncidentEdges = this.logicalGraph().countEdgesIncidentOnNode(srcNode);

            // calculate a position for a new data component, halfway between the srcPort and destPort
            const dataComponentPosition = {
                x: (srcNodePosition.x + destNodePosition.x) / 2.0,
                y: (srcNodePosition.y + (numIncidentEdges * PORT_HEIGHT) + destNodePosition.y + (numIncidentEdges * PORT_HEIGHT)) / 2.0
            };

            // Add the intermediary component to the graph
            const newNode : Node = this.logicalGraph().addDataComponentToGraph(intermediaryComponent, dataComponentPosition);

            // set name of new node (use user-facing name)
            newNode.setName(srcPort.getDisplayText());

            // remove existing ports from the memory node
            newNode.removeAllInputPorts();
            newNode.removeAllOutputPorts();

            // add InputOutput port for dataType
            const newInputOutputPort = new Field(Utils.generateFieldId(), srcPort.getDisplayText(), "", "", srcPort.getDescription(), false, srcPort.getType(), false, [], false, Daliuge.FieldType.Application, Daliuge.FieldUsage.InputOutput);
            newNode.addField(newInputOutputPort);

            // set the parent of the new node
            // by default, set parent to parent of dest node,
            newNode.setParent(destNode.getParent());

            // if source node is a child of dest node, make the new node a child too
            if (srcNode.getParent() !== null && srcNode.getParent().getId() === destNode.getId()){
                newNode.setParent(destNode);
            }

            // if dest node is a child of source node, make the new node a child too
            if (destNode.getParent() !== null && destNode.getParent().getId() === srcNode.getId()){
                newNode.setParent(srcNode);
            }

            // create TWO edges, one from src to data component, one from data component to dest
            const firstEdge : Edge = new Edge('', srcNode, srcPort, newNode, newInputOutputPort, loopAware, closesLoop, false);
            const secondEdge : Edge = new Edge('', newNode, newInputOutputPort, destNode, destPort, loopAware, closesLoop, false);

            this.logicalGraph().addEdgeComplete(firstEdge);
            this.logicalGraph().addEdgeComplete(secondEdge);

            // reply with one of the edges
            resolve(firstEdge);
        });
    }

    editShortDescription = async(fileInfo: FileInfo): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue(Setting.MARKDOWN_EDITING_ENABLED);

        let description: string;
        try {
            description = await Utils.requestUserMarkdown(fileInfo.type + " Short Description", fileInfo.shortDescription, markdownEditingEnabled);
        } catch (error) {
            console.error(error);
            return;
        }

        fileInfo.shortDescription = description;
        fileInfo.modified = true;

        // check graph (hopefully the 'missing short description' warning will go away)
        this.checkGraph();
    }

    editDetailedDescription = async(fileInfo: FileInfo): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue(Setting.MARKDOWN_EDITING_ENABLED);

        let description: string;
        try {
            description = await Utils.requestUserMarkdown(fileInfo.type + " Detailed Description", fileInfo.detailedDescription, markdownEditingEnabled);
        } catch (error) {
            console.error(error);
            return;
        }

        fileInfo.detailedDescription = description;
        fileInfo.modified = true;

        // check graph (hopefully the 'missing detailed description' warning will go away)
        this.checkGraph();
    }

    editNodeDescription = async (node?: Node): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue(Setting.MARKDOWN_EDITING_ENABLED);
        const targetNode = node || this.selectedNode();
        let nodeDescription: string;
        try {
            nodeDescription = await Utils.requestUserMarkdown(targetNode.getDisplayName() + " - Description", targetNode.getDescription(), markdownEditingEnabled);
        } catch (error) {
            console.error(error);
            return;
        }

        targetNode.setDescription(nodeDescription);
    }

    editNodeComment = async (): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue(Setting.MARKDOWN_EDITING_ENABLED);
        const node = this.selectedNode()

        // abort if no node is selected
        if (node === null) {
            console.warn("No node selected");
            return;
        }

        let nodeComment: string;
        try {
            nodeComment = await Utils.requestUserMarkdown(node.getDisplayName() + " - Comment", node?.getComment(), markdownEditingEnabled);
        } catch (error) {
            console.error(error);
            return;
        }

        node.setComment(nodeComment);
    }

    editEdgeComment = async (): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue(Setting.MARKDOWN_EDITING_ENABLED);
        const edge = this.selectedEdge()

        // abort if no edge is selected
        if (edge === null) {
            console.warn("No edge selected");
            return;
        }

        let edgeComment: string;
        try {
            edgeComment = await Utils.requestUserMarkdown("Edge Comment", edge?.getComment(), markdownEditingEnabled);
        } catch (error) {
            console.error(error);
            return;
        }

        edge.setComment(edgeComment);
    }

    getEligibleNodeCategories : ko.PureComputed<Category[]> = ko.pureComputed(() => {
        let categoryType: Category.Type = Category.Type.Unknown;

        if (this.selectedNode() !== null){
            categoryType = this.selectedNode().getCategoryType();
        }

        // if selectedNode categoryType is Unknown, return list of all categories
        if (categoryType === Category.Type.Unknown){
            return Utils.buildComponentList((cData: CategoryData) => {return true});
        }

        // if selectedNode is set, return a list of categories within the same category type
        return Utils.getCategoriesWithInputsAndOutputs(categoryType);
    }, this)

    inspectorChangeNodeCategoryRequest = async (event: Event): Promise<void> => {
        const confirmNodeCategoryChanges = Setting.findValue(Setting.CONFIRM_NODE_CATEGORY_CHANGES);
        const keepOldFields = Setting.findValue(Setting.KEEP_OLD_FIELDS_DURING_CATEGORY_CHANGE);

        // request confirmation from user
        // old request if 'confirm' setting is true AND we're not going to keep the old fields
        if (confirmNodeCategoryChanges && !keepOldFields){
            const confirmed = await Utils.requestUserConfirm("Change Category?", 'Changing a nodes category could destroy some data (parameters, ports, etc) that are not appropriate for a node with the selected category', "Yes", "No", Setting.find(Setting.CONFIRM_NODE_CATEGORY_CHANGES));
            if (confirmed){
                this.inspectorChangeNodeCategory(event)
            }
        }else{
            this.inspectorChangeNodeCategory(event)
        }
    }

    inspectorChangeNodeCategory = (event: Event) : void => {
        const newNodeCategory: Category = $(event.target).val() as Category
        const oldNode = this.selectedNode();

        // get a reference to the builtin palette
        const builtinPalette: Palette = this.findPalette(Palette.BUILTIN_PALETTE_NAME, false);

        // if no built-in palette can be found, then we can't use an example node from the built-in palette as a basis for the category change
        // instead, we just blindly change the category. It is the best we can do
        if (builtinPalette === null){
            Utils.showNotification(Palette.BUILTIN_PALETTE_NAME + " palette not found", "Unable to transform node according to a template. Instead just changing category.", "warning");
        } else {
            // find node with new type in builtinPalette
            let oldCategoryTemplate: Node = builtinPalette.findNodeByNameAndCategory(oldNode.getCategory());
            const newCategoryTemplate: Node = builtinPalette.findNodeByNameAndCategory(newNodeCategory);

            // check that new category prototype was found, if not, skip transform node
            if (newCategoryTemplate === null){
                console.warn("Prototype for new category (" + newNodeCategory + ") could not be found in palettes. Can't intelligently transform old node into new node, will just set new category.");
                return;
            } else {
                // check that old category prototype was found, if not, use 'Unknown' as a placeholder for transform node
                if (oldCategoryTemplate === null){
                    console.warn("Prototype for old category (" + oldNode.getCategory() + ") could not be found in palettes. Using existing node as template to transform into new node.");
                    oldCategoryTemplate = oldNode;
                }

                // consult user setting - whether they want to remove old fields
                const keepOldFields: boolean = Setting.findValue(Setting.KEEP_OLD_FIELDS_DURING_CATEGORY_CHANGE);

                Utils.transformNodeFromTemplates(oldNode, oldCategoryTemplate, newCategoryTemplate, keepOldFields);
            }
        }

        oldNode.setCategory(newNodeCategory);

        this.flagActiveFileModified();
        this.checkGraph();
        this.undo().pushSnapshot(this, "Edit Node Category");
        this.logicalGraph().fileInfo().modified = true;
        this.logicalGraph.valueHasMutated();

        // refresh the ParameterTable, since fields may have been added/removed
        ParameterTable.updateContent(this.selectedNode());
    }
    
    // NOTE: clones the node internally
    // NOTE: does not add the node's input or output applications to the logical graph
    addNode = async (node : Node, x: number, y: number): Promise<Node> => {
        // copy node
        const newNode: Node = Utils.duplicateNode(node);

        // check if node will be added to an empty graph, if so prompt user to specify graph name
        // TODO: replace with Utils.checkGraphIsNamed(), or move outside, to where addNode() is called from
        if (this.logicalGraph().fileInfo().name === ""){
            let filename: string;
            try {
                filename = await Utils.requestDiagramFilename(Eagle.FileType.Graph);
            } catch (error){
                console.warn(error);
                return newNode;
            }
            this.logicalGraph().fileInfo().name = filename;
            this.logicalGraph().fileInfo().location.repositoryFileName(filename);
            this.checkGraph();
            this.undo().pushSnapshot(this, "Specify Logical Graph name");
            this.logicalGraph.valueHasMutated();
            Utils.showNotification("Graph named", filename, "success");
        }

        newNode.setPosition(x, y);
        this.logicalGraph().addNodeComplete(newNode);

        // flag that the logical graph has been modified
        this.logicalGraph().fileInfo().modified = true;
        this.logicalGraph().fileInfo.valueHasMutated();

        return newNode;
    }

    checkForComponentUpdates = () => {
        // check if any nodes to update
        if (this.logicalGraph().getNumNodes() === 0){
            Utils.showNotification("Error", "Graph contains no components to update", "danger");
            return;
        }

        // check if graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Check for Component Updates");
            return;
        }

        const {updatedNodes, errorsWarnings} = ComponentUpdater.updateLogicalGraph(this.palettes(), this.logicalGraph());

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

        // make undo snapshot, recheck graph, mark as modified etc
        this.logicalGraph.valueHasMutated();
        this.logicalGraph().fileInfo().modified = true;
        this.logicalGraph().fileInfo.valueHasMutated();
        this.checkGraph();
        this.undo().pushSnapshot(this, "Check for Component Updates");
    }

    updateSelection = (): void => {
        // check if graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Update Selection");
            return;
        }

        // update
        const updatedNodes: Node[] = [];
        const errorsWarnings: Errors.ErrorsWarnings = {errors: [], warnings: []};
        let numSelectedNodes: number = 0;

        // make sure we have a palette available for each selected component
        for (const node of Eagle.getInstance().selectedObjects()){
            if (!(node instanceof Node)) {
                continue; // skip non-node objects
            }

            numSelectedNodes++;

            const updatedNode = ComponentUpdater.updateNode(this.palettes(), node, errorsWarnings);
            if (updatedNode !== null) {
                updatedNodes.push(updatedNode);
            }
        }

        // check if any errors were reported
        if (errorsWarnings.errors.length > 0){
            const errorStrings = [];
            for (const error of errorsWarnings.errors){
                errorStrings.push(error.message);
            }
            Utils.showNotification("Error", errorStrings.join("\n"), "danger");
            return;
        }

        // notify user of success
        if (updatedNodes.length === 0){
            Utils.showNotification("Info", "No components were updated", "info");
            return;
        }
        Utils.showNotification("Success", "Successfully updated " + updatedNodes.length + " of " + numSelectedNodes + " component(s)", "success");

        // make undo snapshot, recheck graph, mark as modified etc
        this.logicalGraph.valueHasMutated();
        this.logicalGraph().fileInfo().modified = true;
        this.logicalGraph().fileInfo.valueHasMutated();
        this.checkGraph();
        const updatedNodeNames = updatedNodes.map(n => n.getName()).join(", ");
        this.undo().pushSnapshot(this, "Update Component(s): " + updatedNodeNames);
    }

    fixSelection = (): void => {
        // check if graph editing is allowed
        if (!Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Graph, "Fix Selection");
            return;
        }

        const updatedNodes: Node[] = [];
        let numSelectedNodes: number = 0;

        for (const object of Eagle.getInstance().selectedObjects()){
            let updated: boolean = false;

            // skip non-node objects
            if (!(object instanceof Node)) {
                continue;
            }

            numSelectedNodes++;
            const node: Node = object as Node;

            // fix node issues
            for (const {issue, validity} of node.getIssues()){
                if (issue.fix !== null){
                    try {
                        issue.fix();
                        updated = true;
                    } catch (error) {
                        console.error("Error fixing node issue:", error);
                    }
                }
            }

            // fix field issues
            for (const field of node.getFields()) {
                for (const {issue, validity} of field.getIssues()){
                    if (issue.fix !== null){
                        issue.fix();
                        updated = true;
                    }
                }
            }

            if (updated) {
                updatedNodes.push(node);
            }
        }

        // notify user of success
        if (updatedNodes.length === 0){
            Utils.showNotification("Info", "No components were fixed", "info");
            return;
        }
        Utils.showNotification("Success", "Successfully fixed " + updatedNodes.length + " of " + numSelectedNodes + " component(s)", "success");

        // make undo snapshot, recheck graph, mark as modified etc
        this.logicalGraph.valueHasMutated();
        this.logicalGraph().fileInfo().modified = true;
        this.logicalGraph().fileInfo.valueHasMutated();
        this.checkGraph();
        const updatedNodeNames = updatedNodes.map(n => n.getName()).join(", ");
        this.undo().pushSnapshot(this, "Fix Component(s): " + updatedNodeNames);
    }

    findPaletteContainingNode = (nodeId: NodeId): Palette => {
        for (const palette of this.palettes()){
            for (const node of palette.getNodes()){
                if (node.getId() === nodeId){
                    return palette;
                }
            }
        }

        return null;
    }

    toggleAllPalettes = (): void => {
        // first check the state of the palette accordion items
        let anyExpanded: boolean = false;
        for (let i = 0 ; i < this.palettes().length; i++){
            const element = document.querySelector('#collapse'+i);
            if ($(element).hasClass('show')){
                anyExpanded = true;
                break;
            }
        }

        for (let i = 0 ; i < this.palettes().length; i++){
            const element = document.querySelector('#collapse'+i);
            if (anyExpanded){
                bootstrap.Collapse.getOrCreateInstance(element).hide();
            } else {
                bootstrap.Collapse.getOrCreateInstance(element).show();
            }
        }
    }

    getLatestVersion = () : any => {
        return versions[0]
    }

    getVersionHistory = () : any => {
        return versions.slice(1);
    }

    formatVersionTitle = (tag: string, date: Date) : string => { 
        return tag + " (" + date.toISOString().split("T")[0] + ")";
    }

    versionShowMoreToggle = () : void => {
        //toggle display of the full version history
        $("#whatsNewModal .versionHistory").toggle()

        //change the text of the toggle button
        if($('#whatsNewModal #whatsNewShowMore').html() === 'Show More'){
            $('#whatsNewModal #whatsNewShowMore').html('Show Less')
        }else{
            $('#whatsNewModal #whatsNewShowMore').html('Show More')
        }
    }

    slowScroll = (data:any, event: JQuery.TriggeredEvent) : void => {
        const target = event.currentTarget;//gets the element that has the event binding

        $(target).scrollTop($(target).scrollTop() + (event.originalEvent as WheelEvent).deltaY * 0.5);
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
        TranslationMenu = "TranslationMenu",
        Hierarchy = "Hierarchy"
    }

    export enum BottomWindowMode {
        None = "None",
        NodeParameterTable = "NodeParameterTable",
        GraphConfigsTable = "GraphConfigsTable",
        ConfigParameterTable = "ConfigParameterTable",
        GraphErrors = "GraphErrors"
    }

    export enum AddNodeMode {
        ContextMenu = "ContextMenu",
        Default = "Default"
    }

    export enum FileType {
        Graph = "Graph",
        GraphConfig = "GraphConfig",
        Palette = "Palette",
        JSON = "JSON",
        Markdown = "Markdown",
        Unknown = "Unknown"
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

    $('body').on('mouseout','.dropdown-area',function(){
        const targetElement = this
        //we are using a timeout stored in a global variable so we have only one timeout that resets when another mouseout is called.
        //if we don't do this we end up with several timeouts conflicting.
        clearTimeout(Eagle.getInstance().dropdownMenuHoverTimeout)

        Eagle.getInstance().dropdownMenuHoverTimeout = setTimeout(function() {
            if($(".dropdown-menu:hover").length === 0){
                $(targetElement).removeClass("show")
                $(targetElement).parent().find('.dropdown-control').removeClass('show')
            }
        }, EagleConfig.DROPDOWN_DISMISS_DELAY);
    })

    //added to prevent console warnings caused by focused elements in a modal being hidden 
    $('.modal').on('hide.bs.modal',function(){
        if (document.activeElement) {
            $(document.activeElement).blur();
        }
    })

    $('.modal').on('hidden.bs.modal', function () {
        $('.modal-dialog').css({"left":"0px", "top":"0px"})
        $("#editFieldModal textarea").attr('style','')
        $("#issuesDisplayAccordion").parent().parent().attr('style','')
        //reset parameter table selection
        ParameterTable.resetSelection()

        //reset the modal dialog pointer events so that the modal can be closed when clicked outside
        $('.modal').css({"pointerEvents":"auto"})
        $('.modal .modal-content').css({"pointerEvents":"auto"})
    });  

    $('.modal').on('show.bs.modal',function(){
        //this event is called when a modal is requested to open
        
        //when a modal is shown, we need to hide any other modals that are currently open
        if($('.modal.show').length >0){
            $('.modal.show').modal('hide');
        }
    })

    $('.modal').on('shown.bs.modal',function(event:JQuery.TriggeredEvent){
        //this event is called when a modal is done opening
        const modal = $(this);

        // modal draggable
        // the any type is required so we don't have an error when building. at runtime on eagle this actually functions without it.
        (<any>$('.modal-dialog')).draggable({
            handle: ".modal-header"
        });

        //this is a system that allows graph interaction with a modal open, it triggers when the user clicks and drags the modal header
        $(event.target).find('.modal-header').on('mousedown', function(){
            modal.css({"pointerEvents":"none"})
            modal.find('.modal-content').css({"pointerEvents":"all"})
            $('.modal-backdrop').remove()
        })

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

    $(document).on('click', '.hierarchyEdgeExtra', function(event: JQuery.TriggeredEvent){
        const e: MouseEvent = event.originalEvent as MouseEvent;
        const eagle: Eagle = Eagle.getInstance();
        const selectedEdgeId: EdgeId = $(e.target).attr("id") as EdgeId;
        const selectEdge = eagle.logicalGraph().getEdgeById(selectedEdgeId);

        if(typeof selectEdge === 'undefined'){
            console.log("no edge found")
            return
        }
        if(!e.shiftKey){
            eagle.setSelection(selectEdge, Eagle.FileType.Graph);
        }else{
            eagle.editSelection(selectEdge, Eagle.FileType.Graph);
        }
    })

    $(".hierarchy").on("click", function(){
        const eagle: Eagle = Eagle.getInstance();
        eagle.selectedObjects([]);
    })   

});
