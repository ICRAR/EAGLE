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

import { CategoryName, CategoryType } from './Category';
import { CategoryData } from "./CategoryData";
import { ComponentUpdater } from './ComponentUpdater';
import { DataType, FieldName } from './Daliuge';
import { DockerHubBrowser } from "./DockerHubBrowser";
import { EagleFileType } from "./EagleEnums";
import type { EagleAddNodeMode } from "./EagleEnums";
export { EagleAddNodeMode, EagleFileType } from "./EagleEnums";
import { EagleConfig } from "./EagleConfig";
import { EditorOperations } from "./EditorOperations";
import { Edge } from './Edge';
import { Errors, type ErrorsWarnings, type Issue, Mode } from './Errors';
import type { Field } from './Field';
import type { FileInfo } from './FileInfo';
import { FileLocation } from "./FileLocation";
import { FileLoader, FileSaver } from "./FileIO";
import { GraphLoader } from "./GraphLoader";
import type { GraphConfig } from "./GraphConfig";
import { GraphRenderer } from "./GraphRenderer";
import { Hierarchy } from './Hierarchy';
import type { KeyboardShortcut } from './KeyboardShortcut';
import { LogicalGraph } from './LogicalGraph';
import { Modals } from "./Modals";
import { Node } from './Node';
import { Palette } from './Palette';
import { ParameterTable } from './ParameterTable';
import { Repositories } from './Repositories';
import { RepositoryService } from './Repository';
import type { Repository } from './Repository';
import type { RepositoryFile } from './RepositoryFile';
import { RightClick } from "./RightClick";
import { SchemaVersion, Setting, type SettingsGroup } from './Setting';
import { SideWindow } from './SideWindow';
import { Translator } from './Translator';
import type { Tutorial} from './Tutorial';
import { tutorialArray } from './Tutorial';
import { Undo } from './Undo';
import { UiModeSystem } from './UiModes';
import type { JsonObject } from './JsonLoadTypes';
import { Utils } from './Utils';
import { versions } from "./Versions";
import { Visual, type VisualType } from "./Visual";

export enum EagleLeftWindowMode {
    None = "None",
    Palettes = "Palettes"
}

export enum EagleRightWindowMode {
    None = "None",
    Repository = "Repository",
    TranslationMenu = "TranslationMenu",
    Hierarchy = "Hierarchy"
}

export enum EagleBottomWindowMode {
    None = "None",
    NodeParameterTable = "NodeParameterTable",
    GraphConfigsTable = "GraphConfigsTable",
    ConfigParameterTable = "ConfigParameterTable",
    EagleErrors = "EagleErrors"
}

export enum EagleDirection {
    Up = "Up",
    Down = "Down",
    Left = "Left",
    Right = "Right"
}


export class Eagle {
    static _instance : Eagle;

    palettes : ko.ObservableArray<Palette>;
    logicalGraph : ko.Observable<LogicalGraph>;
    tutorial : ko.Observable<Tutorial>;

    eagleIsReady : ko.Observable<boolean>;

    leftWindow : ko.Observable<SideWindow>;
    rightWindow : ko.Observable<SideWindow>;
    bottomWindow : ko.Observable<SideWindow>;

    selectedObjects : ko.ObservableArray<Node|Edge|Visual>;
    static selectedLocation : ko.Observable<EagleFileType>;
    currentField :ko.Observable<Field | null>;

    static selectedRightClickObject : ko.Observable<Node|Edge|Visual|null>;
    static selectedRightClickLocation : ko.Observable<EagleFileType>;
    static selectedRightClickPosition : {x: number, y: number} = {x:0, y:0}

    repositories: ko.Observable<Repositories>;
    translator : ko.Observable<Translator>;
    undo : ko.Observable<Undo>;

    // file loading/saving, see FileIO.ts (thin forwarders on Eagle keep the UI bindings working)
    fileIO : FileLoader;
    fileSaver : FileSaver;

    // interactive graph editing operations
    editorOperations: EditorOperations;

    // graph/palette/config loading, see GraphLoader.ts
    graphLoader : GraphLoader;

    globalOffsetX : ko.Observable<number>;
    globalOffsetY : ko.Observable<number>;
    globalScale : ko.Observable<number>;

    dockerHubBrowser : ko.Observable<DockerHubBrowser>;

    errorsMode : ko.Observable<Mode>;
    graphWarnings : ko.ObservableArray<Issue>;
    graphErrors : ko.ObservableArray<Issue>;
    loadingWarnings : ko.ObservableArray<Issue>;
    loadingErrors : ko.ObservableArray<Issue>;
    currentFileInfo : ko.Observable<FileInfo | null>;
    currentFileInfoTitle : ko.Observable<string>;

    snapToGrid : ko.Observable<boolean>;
    dropdownMenuHoverTimeout : number | undefined = undefined;

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
    static nodeDragPaletteIndex : number | null;
    static nodeDragComponentId : NodeId | null;
    static shortcutModalCooldown : number;

    constructor(){
        Eagle._instance = this;
        Eagle.settings = Setting.getSettings();
        UiModeSystem.initialise()

        this.palettes = ko.observableArray();
        this.logicalGraph = ko.observable(new LogicalGraph());
        this.eagleIsReady = ko.observable(false);

        this.leftWindow = ko.observable(new SideWindow(Utils.getLeftWindowWidth()));
        this.rightWindow = ko.observable(new SideWindow(Utils.getRightWindowWidth()));
        this.bottomWindow = ko.observable(new SideWindow(Utils.getBottomWindowHeight()));

        this.selectedObjects = ko.observableArray<Node | Edge>([]).extend({ deferred: true });
        Eagle.selectedLocation = ko.observable<EagleFileType>(EagleFileType.Unknown);
        this.currentField = ko.observable(null);

        Eagle.selectedRightClickObject = ko.observable(null);
        Eagle.selectedRightClickLocation = ko.observable<EagleFileType>(EagleFileType.Unknown);

        this.repositories = ko.observable(new Repositories());
        this.translator = ko.observable(new Translator());
        this.undo = ko.observable(new Undo());

        this.graphLoader = new GraphLoader(this);
        this.editorOperations = new EditorOperations(this, {
            selectedLocation: Eagle.selectedLocation,
            selectedRightClickLocation: Eagle.selectedRightClickLocation,
            selectedRightClickObject: Eagle.selectedRightClickObject,
            getSelectedRightClickPosition: () => Eagle.selectedRightClickPosition,
            getNodeDropLocation: () => Eagle.nodeDropLocation,
            setNodeDropLocation: (position) => { Eagle.nodeDropLocation = position; },
            getNodeDragInfo: () => ({paletteIndex: Eagle.nodeDragPaletteIndex, componentId: Eagle.nodeDragComponentId})
        });
        this.fileIO = new FileLoader(this);
        this.fileSaver = new FileSaver(this);
        
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

        this.errorsMode = ko.observable<Mode>(Mode.Loading);
        this.graphWarnings = ko.observableArray<Issue>([]);
        this.graphErrors = ko.observableArray<Issue>([]);
        this.loadingWarnings = ko.observableArray<Issue>([]);
        this.loadingErrors = ko.observableArray<Issue>([]);

        this.currentFileInfo = ko.observable(null);
        this.currentFileInfoTitle = ko.observable("");

        this.snapToGrid = ko.observable(false);
        this.dropdownMenuHoverTimeout = undefined;

        this.selectedObjects.subscribe(function(){
            // abort if logicalGraph is null
            const lg = this.logicalGraph();
            if (lg === null){
                return;
            }

            //TODO check if the selectedObjects array has changed, if not, abort
            GraphRenderer.nodeData = GraphRenderer.depthFirstTraversalOfNodes(lg);
            Hierarchy.updateDisplay()
            Hierarchy.scrollToNode()
        }, this)
    }

    static getInstance() : Eagle {
        return Eagle._instance;
    }

    /**
     * Centralized confirmation for saving in legacy OJS format.
     * Returns true if the save should proceed, false if the user cancels.
     */
    static async confirmOjsSave(version: SchemaVersion): Promise<boolean> {
        if (version !== SchemaVersion.OJS) {
            return true;
        }
        if (!Setting.findValue<boolean>(Setting.CONFIRM_OJS_FORMAT, true)) {
            return true;
        }
        return Utils.requestUserConfirm(
            "Older Format Warning",
            "You are saving in the older OJS format. The newer V4 format is recommended. Continue saving in OJS format?",
            "Continue",
            "Cancel",
            Setting.find(Setting.CONFIRM_OJS_FORMAT)
        );
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

    static selectedNodePalette() : Palette | null {
        const eagle : Eagle = Eagle.getInstance();
        const selectedNode = eagle.selectedNode();

        if (selectedNode === null){
            return null;
        }

        for (const palette of eagle.palettes()){
            for (const node of palette.getNodes()){
                if (Node.match(node, selectedNode)){
                    return palette;
                }
            }
        }

        return null;
    }

    types : ko.PureComputed<string[]> = ko.pureComputed(() => {
        // add all the built-in types
        const result: string[] = [
            DataType.Boolean,
            DataType.Float,
            DataType.Integer,
            DataType.Json,
            DataType.Object,
            DataType.Python,
            DataType.Select,
            DataType.String
        ];

        // add additional custom types
        switch (Eagle.selectedLocation()){
            case EagleFileType.Palette:
                const selectedNode = this.selectedNode();    

                // build a list from the selected component in the palettes
                if(selectedNode !== null){

                    for (const field of selectedNode.getFields()) {
                        Utils.addTypeIfUnique(result, field.getType());
                    }
                }else{
                    console.warn('selected node is null when selecting palette component')
                }
                break;
            case EagleFileType.Graph:
            default:
                // build a list from all nodes in the current logical graph
                for (const node of this.logicalGraph().getNodes()){
                    for (const field of node.getFields()) {
                        Utils.addTypeIfUnique(result, field.getType());
                    }

                    const inputApplication = node.getInputApplication();
                    const outputApplication = node.getOutputApplication();

                    // also check for fields that belong to the inputApplication
                    if (inputApplication !== null){
                        for (const field of inputApplication.getFields()){
                            Utils.addTypeIfUnique(result, field.getType());
                        }
                    }

                    // also check for fields that belong to the outputApplication
                    if (outputApplication !== null){
                        for (const field of outputApplication.getFields()){
                            Utils.addTypeIfUnique(result, field.getType());
                        }
                    }
                }
                break;
        }
        

        return result;
    }, this);

    toggleSnapToGrid = () : void => {
        this.snapToGrid(!this.snapToGrid());

        // store in settings
        Setting.setValue(Setting.SNAP_TO_GRID, this.snapToGrid());
    }

    deployDefaultTranslationAlgorithm = async () => {
        const translatorAlgorithmDefault = Setting.findValue<string>(Setting.TRANSLATOR_ALGORITHM_DEFAULT, Translator.DEFAULT_TRANSLATION_ALGORITHM);
        const defaultTranslatorAlgorithmMethod : string = Utils.getUIValue('#'+ translatorAlgorithmDefault + ' .generatePgt', 'val', Translator.DEFAULT_TRANSLATION_ALGORITHM);
        try {
            await this.translator().genPGT(defaultTranslatorAlgorithmMethod, false);
        } catch (error){
            console.error("deployDefaultTranslationAlgorithm()", error);
            Utils.showNotification("Error", Errors.UnknownToError(error), "danger");
        }
    }

    deployTranslationAlgorithm = async (algorithm: string, test: boolean) => {
        try {
            await this.translator().genPGT(algorithm, test);
        } catch (error){
            console.error("deployDefaultTranslationAlgorithm()", error);
            Utils.showNotification("Error", Errors.UnknownToError(error), "danger");
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
        return algorithmName === Setting.findValue<string>(Setting.TRANSLATOR_ALGORITHM_DEFAULT, Translator.DEFAULT_TRANSLATION_ALGORITHM);
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
        const activeGraphConfig = this.logicalGraph().getActiveGraphConfig();

        if (typeof activeGraphConfig === 'undefined'){
            return "";
        }

        return  "<strong>Config:</strong> " + Utils.markdown2html(activeGraphConfig.fileInfo().name);
    }, this);

    // TODO: move to SideWindow.ts?
    toggleWindows = () : void  => {
        const leftWindowVisible : boolean = Setting.findValue<boolean>(Setting.LEFT_WINDOW_VISIBLE, false);
        const rightWindowVisible : boolean = Setting.findValue<boolean>(Setting.RIGHT_WINDOW_VISIBLE, false);
        const bottomWindowVisible : boolean = Setting.findValue<boolean>(Setting.BOTTOM_WINDOW_VISIBLE, false);

        const setOpen : boolean = !leftWindowVisible || !rightWindowVisible || !bottomWindowVisible;

        // don't allow open if palette and graph editing are disabled
        const allowPaletteEditing: boolean = Setting.findValue<boolean>(Setting.ALLOW_PALETTE_EDITING, false);
        const allowGraphEditing: boolean = Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false);
        const editingAllowed: boolean = allowPaletteEditing || allowGraphEditing;
        if (setOpen && !editingAllowed){
            Utils.notifyUserOfEditingIssue(EagleFileType.Unknown, "Toggle Windows");
            return;
        }

        SideWindow.setShown('left', setOpen);
        SideWindow.setShown('right', setOpen);
        SideWindow.setShown('bottom', setOpen);
    }

    emptySearchBar = (target: ko.Observable, _data: string, event : Event) => {
        target("")
        if (event.target === null){
            console.warn("emptySearchBar: event.target is null");
            return;
        }
        $(event.target).parent().hide()
    }

    setSearchBarClearBtnState = (_data: string, event: Event) => {
        if (event.target === null){
            console.warn("setSearchBarClearBtnState: event.target is null");
            return;
        }

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
        // if there are no nodes in the logical graph, abort
        if (this.logicalGraph().getNumNodes() === 0){
            return;
        }

        // iterate over all nodes in graph and record minimum and maximum extents in X and Y
        let minX : number = Number.MAX_VALUE;
        let minY : number = Number.MAX_VALUE;
        let maxX : number = -Number.MAX_VALUE;
        let maxY : number = -Number.MAX_VALUE;
        for (const node of this.logicalGraph().getNodes()){
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

        //if the visuals in the graph are not hidden we will take them into account
        if(!Setting.findValue<boolean>(Setting.HIDE_VISUALS, false)){
            for (const visual of this.logicalGraph().getVisuals()){
                if (visual.getPosition().x - visual.getWidth() < minX){
                    minX = visual.getPosition().x - visual.getWidth();
                }
                if (visual.getPosition().y - visual.getHeight() < minY){
                    minY = visual.getPosition().y - visual.getHeight();
                }
                if (visual.getPosition().x + visual.getWidth() > maxX){
                    maxX = visual.getPosition().x + visual.getWidth();
                }
                if (visual.getPosition().y + visual.getHeight() > maxY){
                    maxY = visual.getPosition().y + visual.getHeight();
                }
            }
        }

        // determine the centroid of the graph
        const centroidX = minX + ((maxX - minX) / 2);
        const centroidY = minY + ((maxY - minY) / 2);
        
        //because the saved bottom window height is a percentage, its easier to grab the height using jquery than to convert the percentage into pixels
        let bottomWindow = 0

        if(Setting.findValue<boolean>(Setting.BOTTOM_WINDOW_VISIBLE, false)){
            bottomWindow = Utils.getUIValue('#bottomWindow', 'height', 0);
        }

        // get width and height of the logical graph parent container
        const logicalGraphParentWidth = Utils.getUIValue('#logicalGraphParent', 'width', 0);
        const logicalGraphParentHeight = Utils.getUIValue('#logicalGraphParent', 'height', 0);

        //calculating scale multipliers needed for each, height and width in order to fit the graph
        const containerHeight = logicalGraphParentHeight - bottomWindow
        const graphHeight = maxY-minY+200
        const graphYScale = containerHeight/graphHeight
        

        //we are taking into account the current widths of the left and right windows
        const leftWindow = Utils.getLeftWindowWidth()
        const rightWindow = Utils.getRightWindowWidth()

        const containerWidth = logicalGraphParentWidth - leftWindow - rightWindow
        const graphWidth = maxX-minX+200
        const graphXScale = containerWidth/graphWidth

        // reset scale to center the graph correctly
        this.globalScale(1)

        //determine center of the display area
        const displayCenterX : number = (containerWidth / this.globalScale() / 2);
        const displayCenterY : number = (containerHeight / this.globalScale() / 2);

        // translate display to center the graph centroid
        this.globalOffsetX(Math.round(displayCenterX - centroidX + leftWindow));
        this.globalOffsetY(Math.round(displayCenterY - centroidY));

        //taking note of the screen center in graph space before zooming
        const midPointX = GraphRenderer.GRAPH_TO_SCREEN_POSITION_X(centroidX)

        const xpb = centroidX
        const ypb = displayCenterY/this.globalScale() - this.globalOffsetY(); 

        //applying the correct zoom
        if(graphYScale>graphXScale){
            this.globalScale(graphXScale);
        }else if(graphYScale<graphXScale){
            this.globalScale(graphYScale)
        }else{
            this.globalScale(1)
        }
        
        //checking the screen center in graph space after zoom
        const xpa = GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(midPointX)
        const ypa = displayCenterY/this.globalScale() - this.globalOffsetY();

        //checking how far the center has moved
        const moveX = xpa-xpb
        const moveY = ypa-ypb

        //correcting for the movement
        this.globalOffsetX(this.globalOffsetX()+moveX)
        this.globalOffsetY(this.globalOffsetY()+moveY)
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
            Eagle.selectedLocation(EagleFileType.Unknown);
        }, EagleConfig.STANDARD_UI_SHORT_TIMEOUT);
    }

    // if selectedObjects contains nothing but one node, return the node, else null
    selectedNode : ko.PureComputed<Node | null> = ko.pureComputed(() : Node | null => {
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

    // if selectedObjects contains nothing but one node, return the node, else null
    selectedVisual : ko.PureComputed<Visual> = ko.pureComputed(() : Visual => {
        if (this.selectedObjects().length !== 1){
            return null;
        }

        const object = this.selectedObjects()[0];

        if (object instanceof Visual){
            return object;
        } else {
            return null;
        }
    }, this);


    // if selectedObjects contains nothing but one edge, return the edge, else null
    selectedEdge : ko.PureComputed<Edge | null> = ko.pureComputed(() : Edge | null => {
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
        const serviceIsGit: boolean = [RepositoryService.GitHub, RepositoryService.GitLab].includes(this.logicalGraph().fileInfo().location.repositoryService());

        if(!serviceIsGit){
            return 'dodgerblue'
        }else if(Setting.findValue<boolean>(Setting.TEST_TRANSLATE_MODE, false)){
            return 'orange'
        }else if (this.logicalGraph().fileInfo().modified){
            return 'red'
        }else{
            return 'green'
        }
    }, this);

    setSelection = (selection : Node | Edge | Visual | null, selectedLocation: EagleFileType) : void => {
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

            //trigger redraw of parameter table
            if(selection instanceof Node){
                ParameterTable.updateContent(selection);
            }
        }
    }

    editSelection = (selection : Node | Edge | Visual, selectedLocation: EagleFileType) : void => {
        this.editorOperations.editSelection(selection, selectedLocation);
    }

    getInspectorCollapseState : ko.PureComputed<boolean> = ko.pureComputed(() => {
        //the addition and removal of the class is for a temporary transition effect
        //when this function gets recalculated, the collapsed state of the inspector has changed and we need to do a transition
        $('#inspector').addClass('inspectorTransition')
        setTimeout(function(){
            $('#inspector').removeClass('inspectorTransition')
        }, EagleConfig.STANDARD_UI_SHORT_TIMEOUT)
        
        return Setting.findValue<boolean>(Setting.INSPECTOR_COLLAPSED_STATE, false)
    }, this);

    toggleInspectorCollapsedState = () : void => {
        Setting.toggle(Setting.INSPECTOR_COLLAPSED_STATE);
    };

    getGraphModifiedDateText = () : string => {
        return this.logicalGraph().fileInfo().lastModifiedDatetimeText().split(',')[0]
    }

    changeRightWindowMode(requestedMode:EagleRightWindowMode) : void {
        Setting.setValue(Setting.RIGHT_WINDOW_MODE, requestedMode)
        
        SideWindow.setShown('right', true)

        const rightWindowMode = Setting.findValue<EagleRightWindowMode>(Setting.RIGHT_WINDOW_MODE, EagleRightWindowMode.None);

        //trigger a re-render of the hierarchy
        if (rightWindowMode === EagleRightWindowMode.Hierarchy){
            window.setTimeout(function(){
                Hierarchy.updateDisplay()
            }, EagleConfig.STANDARD_UI_SHORT_TIMEOUT)
        }
    }

    objectIsSelected = (object: Node | Edge | Visual): boolean => {
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

        if (object instanceof Visual){
            for (const o of this.selectedObjects()){
                if (o instanceof Visual && o.getId() === object.getId()){
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

    // the local file loading methods have moved to FileIO.ts (FileLoader).
    // these thin forwarders keep the existing UI bindings (knockout data-bind,
    // keyboard shortcuts, right-click menus) working.
    loadLocalGraphFile = async () : Promise<void> => this.fileIO.loadLocalGraphFile()

    loadDroppedFile = async (file: File) : Promise<void> => this.fileIO.loadDroppedFile(file)

    insertLocalGraphFile = async () : Promise<void> => this.fileIO.insertLocalGraphFile()

    loadLocalPaletteFile = async () : Promise<void> => this.fileIO.loadLocalPaletteFile()

    loadLocalGraphConfigFile = async () : Promise<void> => this.fileIO.loadLocalGraphConfigFile()

    getGraphFileToLoad = () : void => this.fileIO.getGraphFileToLoad()

    getGraphFileToInsert = () : void => this.fileIO.getGraphFileToInsert()

    getPaletteFileToLoad = () : void => this.fileIO.getPaletteFileToLoad()

    getGraphConfigFileToLoad = () : void => this.fileIO.getGraphConfigFileToLoad()

    // the save/commit methods have moved to FileIO.ts (FileSaver).
    // these thin forwarders keep the existing UI bindings (knockout data-bind,
    // keyboard shortcuts, right-click menus) working.
    saveGraph = async () : Promise<void> => this.fileSaver.saveGraph()

    saveGraphAs = async () : Promise<void> => this.fileSaver.saveGraphAs()

    saveGraphConfigAs = async (graphConfig: GraphConfig) : Promise<void> => this.fileSaver.saveGraphConfigAs(graphConfig)

    saveActiveGraphConfig = async () : Promise<void> => this.fileSaver.saveActiveGraphConfig()

    saveFileToLocal = async (fileType : EagleFileType, graphConfig: GraphConfig | null = null) : Promise<void> => this.fileSaver.saveFileToLocal(fileType, graphConfig)

    saveAsFileToLocal = async (fileType: EagleFileType, graphConfig: GraphConfig | null = null): Promise<void> => this.fileSaver.saveAsFileToLocal(fileType, graphConfig)

    saveFileToRemote = async (file: RepositoryFile, fileInfo: ko.Observable<FileInfo>, jsonString : string): Promise<void> => this.fileSaver.saveFileToRemote(file, fileInfo, jsonString)

    saveFilesToRemote = async (repository: Repository, jsonString : string): Promise<void> => this.fileSaver.saveFilesToRemote(repository, jsonString)

    commitToGitAs = async (fileType : EagleFileType, graphConfig: GraphConfig | null = null) : Promise<void> => this.fileSaver.commitToGitAs(fileType, graphConfig)

    commitToGit = async (fileType : EagleFileType) : Promise<void> => this.fileSaver.commitToGit(fileType)

    saveDiagramToGit = (file: RepositoryFile, fileInfo: ko.Observable<FileInfo>, commitMessage : string, obj: LogicalGraph | Palette | GraphConfig) : Promise<void> => this.fileSaver.saveDiagramToGit(file, fileInfo, commitMessage, obj)

    savePaletteToDisk = async (palette : Palette, fileName: string) : Promise<void> => this.fileSaver.savePaletteToDisk(palette, fileName)

    saveGraphToDisk = async (graph : LogicalGraph, fileName: string): Promise<void> => this.fileSaver.saveGraphToDisk(graph, fileName)

    savePaletteToGit = async (palette: Palette): Promise<void> => this.fileSaver.savePaletteToGit(palette)

    // the graph/palette/config creation and loading methods have moved to GraphLoader.ts.
    // these thin forwarders keep the existing UI bindings (knockout data-bind,
    // keyboard shortcuts, right-click menus) working.
    insertGraph = async (nodes: Node[], edges: Edge[], parentNode: Node | null, errorsWarnings: ErrorsWarnings) : Promise<void> => this.graphLoader.insertGraph(nodes, edges, parentNode, errorsWarnings)

    newLogicalGraph = async (): Promise<void> => this.graphLoader.newLogicalGraph()

    newLogicalGraphFromJson = async (): Promise<void> => this.graphLoader.newLogicalGraphFromJson()

    insertGraphFromJson = async (): Promise<void> => this.graphLoader.insertGraphFromJson()

    loadFileFromUrl = async (fileType: EagleFileType): Promise<void> => this.graphLoader.loadFileFromUrl(fileType)

    displayObjectAsJson = (fileType: EagleFileType, object: LogicalGraph | Palette | GraphConfig) : void => this.graphLoader.displayObjectAsJson(fileType, object)

    displayNodeAsJson = (node: Node) : void => this.graphLoader.displayNodeAsJson(node)

    newPalette = async (): Promise<void> => this.graphLoader.newPalette()

    newPaletteFromJson = async (): Promise<void> => this.graphLoader.newPaletteFromJson()

    reloadPalette = async (palette: Palette, index: number): Promise<void> => this.graphLoader.reloadPalette(palette, index)

    newConfig = (): void => this.graphLoader.newConfig()

    duplicateGraphConfig = (config: GraphConfig): void => this.graphLoader.duplicateGraphConfig(config)

    loadDefaultPalettes = async (): Promise<void> => this.graphLoader.loadDefaultPalettes()

    loadPalettes = async (paletteList: {name:string, filename:string, readonly:boolean, expanded:boolean}[]): Promise<{palettes: Palette[], errorsWarnings: ErrorsWarnings}> => this.graphLoader.loadPalettes(paletteList)

    openRemoteFile = async (file: RepositoryFile, replaceActiveGraph: boolean = false): Promise<void> => this.graphLoader.openRemoteFile(file, replaceActiveGraph)

    insertRemoteFile = async (file: RepositoryFile): Promise<void> => this.graphLoader.insertRemoteFile(file)

    deleteRemoteFile = async (file: RepositoryFile): Promise<void> => this.graphLoader.deleteRemoteFile(file)

    closePalette = async (palette: Palette): Promise<void> => this.graphLoader.closePalette(palette)

    selectAllInPalette = (palette: Palette): void => this.graphLoader.selectAllInPalette(palette)

    // these NOTEs: public (not private) because they are called from FileIO.ts
    _loadGraphJSON = async (data: string, fileFullPath: string, loadFunc: (lg: LogicalGraph, errorsWarnings: ErrorsWarnings) => void | Promise<void>): Promise<boolean> => this.graphLoader._loadGraphJSON(data, fileFullPath, loadFunc)

    _loadGraphWithChoice = async (data: string, file: RepositoryFile): Promise<void> => this.graphLoader._loadGraphWithChoice(data, file)

    _loadGraphConfig = async (dataObject: JsonObject, file: RepositoryFile): Promise<void> => this.graphLoader._loadGraphConfig(dataObject, file)

    _loadPaletteJSON = (data: string, fileFullPath: string): void => this.graphLoader._loadPaletteJSON(data, fileFullPath)

    getOutermostSelectedNodes = () : Node[] => {
        const outermostNodes : Node[] = []
        const selectedNodes = this.selectedObjects()

        selectedNodes.forEach((object) => {
            if (!(object instanceof Node)){
                return
            }

            if(object.getParent() !== null){
                let thisParentIsSelected = true
                let thisObject = object
                while (thisParentIsSelected){
                    const thisParent = thisObject.getParent();
                    if(thisParent != null){
                        thisParentIsSelected = this.objectIsSelectedById(thisParent.getId())
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


    createSubgraphFromSelection = () : void => {
        this.editorOperations.createSubgraphFromSelection();
    }

    checkErrorModalShowError = (data:any) :void =>{
        data.show()
    }

    createConstructFromSelection = async () => {
        await this.editorOperations.createConstructFromSelection();
    }

    triggerShortcut = (shortcut: (eagle: Eagle) => void) :void => {
        const eagle: Eagle = Eagle.getInstance();
        $('#shortcutsModal').modal("hide");
        shortcut(eagle);
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
        Setting.setValue(Setting.CONFIRM_OJS_FORMAT, true)
        Utils.showNotification("Success", "Confirmation message pop ups re-enabled", "success");
    }

    
    validateGraph = (): void => {
        // get logical graph
        const lg: LogicalGraph = Eagle.getInstance().logicalGraph();

        // get schema version
        const version: SchemaVersion = Setting.findValue<SchemaVersion>(Setting.DALIUGE_SCHEMA_VERSION, SchemaVersion.Unknown);

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
        const validatorResult : {valid: boolean, errors: string} = Utils._validateJSON(jsonObject, version, EagleFileType.Graph);
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
        eagle.setSelection(null,EagleFileType.Graph)

        // get reference to the body element
        const bodyElement = document.querySelector('body');

        // abort if the body element is not found
        if (!bodyElement) {
            Utils.showNotification("Error", "Unable to access body element for screenshot.", "danger");
            return;
        }

        // temporarily disabling the cursor so it doesn't appear in the screenshot
        bodyElement.style.cursor = 'none';
        
        try {        
            const width = stream.getVideoTracks()[0].getSettings().width
            const height = stream.getVideoTracks()[0].getSettings().height
            
            // abort if width or height is undefined
            if (width === undefined || height === undefined) {
                Utils.showNotification("Error", "Unable to determine screen width and height for screenshot.", "danger");
                return;
            }

            const video = document.createElement("video")
            video.srcObject = stream
            video.autoplay = true
        
            await new Promise((resolve, reject) => {
                video.onloadeddata = resolve
                video.onerror = reject
            })

            setTimeout(() => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext('2d');

                // abort if ctx is null
                if (ctx === null) {
                    Utils.showNotification("Error", "Unable to get canvas context for screenshot.", "danger");
                    return;
                }

                canvas.width = width
                canvas.height = height

                //cropping the ui, so the screenshot only includes the graph
                
                const realWidth = window.innerWidth
                const divisor = realWidth/width
                const lx = (eagle.leftWindow().size()+50)/divisor
                const rx = (eagle.rightWindow().size()+50)/divisor
                const ly = 90/divisor
                canvas.width=width-rx-lx//trimming the right window
                ctx.translate(-lx,-ly)
                ctx.drawImage(video, 0, 0)
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
                bodyElement.style.cursor = 'auto';
            }, EagleConfig.STANDARD_UI_LONG_TIMEOUT);
        } finally {
            setTimeout(() => {
            stream.getTracks().forEach((track) => track.stop())
            }, EagleConfig.STANDARD_UI_LONG_TIMEOUT);
        }
    }

    toggleEdgeClosesLoop = () : void => {
        const selectedEdge = this.selectedEdge();

        if (selectedEdge === null){
            Utils.showNotification("Error", "No edge selected", "danger");
            return;
        }

        selectedEdge.toggleClosesLoop();

        // get nodes from edge
        const sourceNode = selectedEdge.getSrcNode();
        const destNode = selectedEdge.getDestNode();

        sourceNode.setGroupEnd(selectedEdge.isClosesLoop());
        destNode.setGroupStart(selectedEdge.isClosesLoop());
        this.checkEagle();

        const groupStartValue = destNode.findFieldByDisplayText(FieldName.GROUP_START)?.getValue();
        const groupEndValue = sourceNode.findFieldByDisplayText(FieldName.GROUP_END)?.getValue();
        Utils.showNotification(
            "Toggle edge closes loop",
            "Node " + sourceNode.getName() + " component parameter '" + FieldName.GROUP_END + "' set to " + groupEndValue + ". Node " + destNode.getName() + " component parameter '" + FieldName.GROUP_START + "' set to " + groupStartValue + ".", "success"
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

    statusBarScroll = (_data:any, e:any) : void => {
        e.preventDefault();
        const leftPos = Utils.getUIValue('#statusBar', 'scrollLeft', 0);
        $('#statusBar').scrollLeft(leftPos + e.originalEvent.deltaY)
    }

    smartToggleModal = (modal:string) : void => {
        //used for keyboard shortcuts, preventing opening several modals at once
        if($('.modal.show').length>0){
            if($('.modal.show').attr('id')===modal){
                $('#'+modal).modal('hide')
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
        await this.editorOperations.duplicateSelection(mode);
    }

    // TODO: currently only works when copying from the LG, doesn't work when copying from a palette!
    copySelectionToClipboard = (copyChildren: boolean) : void => {
        this.editorOperations.copySelectionToClipboard(copyChildren);
    }

    _removeAlreadySelectedEmbeddedNodes = (nodes: Node[]) : Node[] => {
        return this.editorOperations._removeAlreadySelectedEmbeddedNodes(nodes);
    }

    _addNodeAndChildren = (node: Node, output: Node[]) : void => {
        this.editorOperations._addNodeAndChildren(node, output);
    }

    _addUniqueNode = (nodes: Node[], newNode: Node): void => {
        this.editorOperations._addUniqueNode(nodes, newNode);
    }

    _addUniqueEdge = (edges: Edge[], newEdge: Edge): void => {
        this.editorOperations._addUniqueEdge(edges, newEdge);
    }

    pasteFromClipboard = async () => {
        await this.editorOperations.pasteFromClipboard();
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
        Eagle.selectedLocation(EagleFileType.Graph);
    }

    selectNoObjectsInGraph = () : void => {
        this.selectedObjects([]);
    }

    // TODO: this function shares some code with addGraphNodesToPalette(), we should try to factor out the common stuff at some stage
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
            userString = userString + "." + Utils.getDiagramExtension(EagleFileType.Palette);
        }

        // get reference to palette (based on userString)
        const destinationPalette = this.findPalette(userString, true);

        // check that a palette was found
        if (typeof destinationPalette === "undefined"){
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

            const inputApplication = node.getInputApplication();
            const outputApplication = node.getOutputApplication();

            // check if clone has embedded applications, if so, add them to destination palette and remove
            if (inputApplication !== null){
                destinationPalette.addNode(inputApplication, true);
                nodes[destinationPalette.getNumNodes() - 1].setEmbed(embedNode);
            }
            if (outputApplication !== null){
                destinationPalette.addNode(outputApplication, true);
                nodes[destinationPalette.getNumNodes() - 1].setEmbed(embedNode);
            }

            // mark the palette as modified
            destinationPalette.fileInfo().modified = true;
        }

        // check EAGLE
        this.checkEagle();
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
        let data: (Node | Edge | Visual)[] = [];
        let location: EagleFileType = EagleFileType.Unknown;

        GraphRenderer.clearPortPeek()

        if (rightClick){
            const selectedRightClickObject = Eagle.selectedRightClickObject();
            if(selectedRightClickObject === null){
                console.error("deleteSelection(): right click object is null");
                return;
            }
            data.push(selectedRightClickObject)
            location = Eagle.selectedRightClickLocation();
        }else{
            data = this.selectedObjects()
            location = Eagle.selectedLocation();
        }

        // check that graph editing is allowed
        if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Delete Selection");
            return;
        }

        // if no objects selected, warn user
        if (data.length === 0){
            Utils.showNotification("Warning", "Unable to delete selection: Nothing selected", "warning");
            return;
        }

        // skip confirmation if setting dictates
        if (!Setting.findValue<boolean>(Setting.CONFIRM_DELETE_OBJECTS, true) || suppressUserConfirmationRequest){
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

    private _deleteSelection = (deleteChildren: boolean, data: (Node | Edge | Visual)[], location: EagleFileType) : void => {
        switch(location){
            case EagleFileType.Graph:
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

                for (const object of data){

                    //remove visual link if there is a visual linked to this object
                    for(const visual of this.logicalGraph().getVisuals()){
                        if (visual.getTarget() === object){
                            visual.setTarget(null)
                            continue
                        }
                    }

                    // delete the nodes
                    if (object instanceof Node){
                        this.logicalGraph().removeNode(object);
                    }

                    // delete the visuals
                    if (object instanceof Visual){
                        this.logicalGraph().removeVisualById(object.getId());
                    }
                }

                // flag LG has changed
                this.logicalGraph().fileInfo().modified = true;

                this.checkEagle();
                this.undo().pushSnapshot(this, "Delete Selection");
                break;

            case EagleFileType.Palette:

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
                    const nodeParent = node.getParent();

                    if (nodeParent !== null && nodeParent.getId() === object.getId()){
                        node.setParent(object.getParent());
                    }
                }
            }
        }
    }

    addNodeToLogicalGraphAndConnect = async (newNodeId: NodeId) => {
        return this.editorOperations.addNodeToLogicalGraphAndConnect(newNodeId);
    }

    addNodeToLogicalGraph = (node: Node | undefined, nodeId: NodeId | null, mode: EagleAddNodeMode): Promise<Node[]> => {
        return this.editorOperations.addNodeToLogicalGraph(node, nodeId, mode);
    }

    // TODO: how much is this different to addNodesToPalette? can we merge them?
    addGraphNodesToPalette = async () => {
        // check that palette editing is permitted
        if (!Setting.findValue<boolean>(Setting.ALLOW_PALETTE_EDITING, false)){
            Utils.notifyUserOfEditingIssue(EagleFileType.Palette, "Add Graph Nodes to Palette");
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
            userString = userString + "." + Utils.getDiagramExtension(EagleFileType.Palette);
        }

        // get reference to palette (based on userString)
        const destinationPalette = this.findPalette(userString, true);

        // check that a palette was found
        if (typeof destinationPalette === "undefined"){
            Utils.showUserMessage("Error", "Unable to find selected palette!");
            return;
        }

        // copy nodes to palette
        for (const node of this.logicalGraph().getNodes()){
            const inputApplication = node.getInputApplication();
            const outputApplication = node.getOutputApplication();

            // check if clone has embedded applications, if so, add them to destination palette and remove
            if (inputApplication !== null){
                destinationPalette.addNode(inputApplication, false);
            }
            if (outputApplication){
                destinationPalette.addNode(outputApplication, false);
            }

            destinationPalette.addNode(node, false);
        }

        // mark the palette as modified
        destinationPalette.fileInfo().modified = true;

        // check EAGLE
        this.checkEagle();
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

    findPalette = (name: string, createIfNotFound: boolean) : Palette | undefined => {
        let p: Palette | undefined = undefined;

        // look for palette in open palettes
        for (const palette of this.palettes()){
            if (palette.fileInfo().name === name){
                p = palette;
                break;
            }
        }

        // if user asked for a new palette, create one
        if (createIfNotFound && p === undefined){
            p = new Palette();
            p.fileInfo().name = name;
            p.fileInfo().readonly = false;
            this.palettes.unshift(p);
        }

        return p;
    }

    addVisualToLogicalGraph = async (type: VisualType, mode: EagleAddNodeMode) : Promise<Visual> => {
        return this.editorOperations.addVisualToLogicalGraph(type, mode);
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
        const imageField  = selectedNode.findFieldByDisplayText(FieldName.IMAGE);
        const tagField    = selectedNode.findFieldByDisplayText(FieldName.TAG);
        const digestField = selectedNode.findFieldByDisplayText(FieldName.DIGEST);
        let image: string = "";
        let tag: string = "";

        // set values for the fields
        if (typeof imageField !== 'undefined'){
            image = imageField.getValue() || "";
        }
        if (typeof tagField !== 'undefined'){
            tag = tagField.getValue() || "";
        }

        Modals.showBrowseDockerHub(image, tag, (completed: boolean) => {
            if (!completed){
                return;
            }

            const imageName = this.dockerHubBrowser().selectedImage();
            const tag = this.dockerHubBrowser().selectedTag();
            const digest = this.dockerHubBrowser().digest();

            // set values for the fields
            if (typeof imageField !== 'undefined'){
                imageField.setValue(imageName);
            }
            if (typeof tagField !== 'undefined'){
                tagField.setValue(tag);
            }
            if (typeof digestField !== 'undefined'){
                digestField.setValue(digest);
            }

            Utils.showNotification("EAGLE", "Image, tag and digest set from Docker Hub", "success");
        });
    }

    tableDropdownClick = (newType: DataType, field: Field) : void => {
        this.editorOperations.tableDropdownClick(newType, field);
    }

    graphEditComment = (object:Node | Edge): void => {
        this.setSelection(object, EagleFileType.Graph)
        
        setTimeout(() => {
            if (object instanceof Node){
                this.editNodeComment()
            }else {
                this.editEdgeComment()
            }
        }, EagleConfig.STANDARD_UI_SHORT_TIMEOUT);
    };

    changeNodeParent = async () => {
        // build list of node name + ids (exclude self)
        const selectedNode = this.selectedNode();

        if (selectedNode === null){
            Utils.showNotification("Unable to Change Node Parent", "Attempt to change parent node when no node selected", "warning");
            return;
        }

        // check that graph editing is allowed
        if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Change Node Parent")
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

            const selectedNodeParent = selectedNode.getParent();
            // if the selected node has no parent, then we can't preselect anything
            if (selectedNodeParent === null){
                continue;
            }

            // if this node is already the parent, note its index, so that we can preselect this parent node in the modal dialog
            if (node.getId() === selectedNodeParent.getId()){
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
        const newParent = this.logicalGraph().getNodeById(newParentId);

        // abort if specified new parent can not be found in the graph
        if (typeof newParent === 'undefined'){
            Utils.showNotification("Warning", "Can't find user-specified parent within the graph", "warning", false);
            return;
        }

        // set the parent
        selectedNode.setParent(newParent);

        // refresh the display
        this.checkEagle();
        this.undo().pushSnapshot(this, "Change Node Parent");
        this.logicalGraph().fileInfo().modified = true;
        this.selectedObjects.valueHasMutated();
        this.logicalGraph.valueHasMutated();
    }

    nodeDropLogicalGraph = (_eagle : Eagle, event: JQuery.TriggeredEvent) : void => {
        this.editorOperations.nodeDropLogicalGraph(_eagle, event);
    }

    nodeDropPalette = (_eagle: Eagle, event: JQuery.TriggeredEvent) : void => {
        this.editorOperations.nodeDropPalette(_eagle, event);
    }

    paletteComponentClick = (node: Node, event: JQuery.TriggeredEvent) : void => {
        this.editorOperations.paletteComponentClick(node, event);
    }

    selectInputApplicationNode = () : void => {
        const selectedNode = this.selectedNode();
        if (selectedNode === null){
            Utils.showNotification("No node selected", "Please select a node before trying to select its input application", "warning");
            return;
        }
        this.setSelection(selectedNode.getInputApplication(), EagleFileType.Graph);
    }

    selectOutputApplicationNode = () : void => {
        const selectedNode = this.selectedNode();
        if (selectedNode === null){
            Utils.showNotification("No node selected", "Please select a node before trying to select its output application", "warning");
            return;
        }
        this.setSelection(selectedNode.getOutputApplication(), EagleFileType.Graph);
    }

    editField = async (field: Field): Promise<void> => {
        await this.editorOperations.editField(field);
    };

    getNewNodePosition = (radius: number) : {x:number, y:number, extended:boolean} => {
        return this.editorOperations.getNewNodePosition(radius);
    }

    copyGraphUrl = (): void => {
        // get reference to the LG fileInfo object
        const fileInfo: FileInfo = this.logicalGraph().fileInfo();

        // if we don't know where this file came from then we can't build a URL
        // for example, if the graph was loaded from local disk, then we can't build a URL for others to reach it
        if (fileInfo.location.repositoryService() === RepositoryService.Unknown || fileInfo.location.repositoryService() === RepositoryService.File){
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

    checkEagle = (): void => {
        Utils.checkEagle(this);//validate the graph
        const graphErrors = Utils.updateGraphErrorsWarnings() //gather all the errors from all of the components
        
        this.graphWarnings(graphErrors.warnings);
        this.graphErrors(graphErrors.errors);
    };

    showEagleErrors = (): void => {
        //recheck the graph for errors, this is because we cannot rely on the fact that the graph has been checked.
        //this is to ensure that when the user requests to see the graph errors, the information is up to date
        this.checkEagle();

        if (this.graphWarnings().length > 0 || this.graphErrors().length > 0){

            // switch to graph errors mode
            this.errorsMode(Mode.Graph);

            //switch bottom window mode
            Setting.setValue(Setting.BOTTOM_WINDOW_MODE, EagleBottomWindowMode.EagleErrors);

            //show bottom window
            SideWindow.setShown('bottom',true)
        } else {
            Utils.showNotification("Check Graph", "Graph OK", "success");
        }
    }

    addEdge = async (srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean, forceAutoRename: boolean = false): Promise<Edge> => {
        return this.editorOperations.addEdge(srcNode, srcPort, destNode, destPort, loopAware, closesLoop, forceAutoRename);
    }

    addVisual = async (visual: Visual): Promise<Visual> => {
        return this.editorOperations.addVisual(visual);
    }

    editShortDescription = async(fileInfo: FileInfo): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue<boolean>(Setting.MARKDOWN_EDITING_ENABLED, false);

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
        this.checkEagle();
        this.undo().pushSnapshot(this, `Edit ${fileInfo.type} short description`);
    }

    editDetailedDescription = async(fileInfo: FileInfo): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue<boolean>(Setting.MARKDOWN_EDITING_ENABLED, false);

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
        this.checkEagle();
        this.undo().pushSnapshot(this, `Edit ${fileInfo.type} detailed description`);
    }

    editNodeDescription = async (node?: Node): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue<boolean>(Setting.MARKDOWN_EDITING_ENABLED, false);
        const targetNode = node || this.selectedNode();

        // abort if no node is selected AND no node was passed in
        if (targetNode === null) {
            console.warn("No node selected");
            return;
        }

        let nodeDescription: string;
        try {
            nodeDescription = await Utils.requestUserMarkdown(targetNode.getDisplayName() + " - Description", targetNode.getDescription(), markdownEditingEnabled);
        } catch (error) {
            console.error(error);
            return;
        }

        targetNode.setDescription(nodeDescription);
    }

    editNodeComment = async (node? : Node): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue<boolean>(Setting.MARKDOWN_EDITING_ENABLED, false);
        const targetNode = node || this.selectedNode();

        // abort if no node is selected
        if (targetNode === null || !(targetNode instanceof Node)) {
            console.warn("No node selected");
            return;
        }

        let nodeComment: string;
        try {
            nodeComment = await Utils.requestUserMarkdown(targetNode.getDisplayName() + " - Comment", targetNode?.getComment(), markdownEditingEnabled);
        } catch (error) {
            console.error(error);
            return;
        }

        targetNode.setComment(nodeComment);
    }

    editEdgeComment = async (): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue<boolean>(Setting.MARKDOWN_EDITING_ENABLED, false);
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

    editTextVisualContent = async (visual ?: Visual): Promise<void> => {
        const markdownEditingEnabled: boolean = Setting.findValue<boolean>(Setting.MARKDOWN_EDITING_ENABLED, false);
        const thisVisual : Visual = visual || this.selectedVisual();

        // abort if no node is selected
        if (thisVisual === null) {
            console.warn("No node selected");
            return;
        }

        let visualContent: string;
        try {
            visualContent = await Utils.requestUserMarkdown("Text Visual - Content", thisVisual?.getContent(), markdownEditingEnabled);
        } catch (error) {
            console.error(error);
            return;
        }

        thisVisual.setContent(visualContent);
    }

    getEligibleNodeCategories : ko.PureComputed<CategoryName[]> = ko.pureComputed(() => {
        let category : CategoryName = CategoryName.Unknown;
        let categoryType: CategoryType = CategoryType.Unknown;

        const selectedNode = this.selectedNode();

        if (selectedNode !== null){
            category = selectedNode.getCategory();
            categoryType = selectedNode.getCategoryType();
        }

        // if selectedNode categoryType is Unknown, return list of all categories
        if (category === CategoryName.Unknown || !Utils.isKnownCategory(category) || categoryType === CategoryType.Unknown || !Utils.isKnownCategoryType(categoryType)){
            return Utils.buildComponentList((_cData: CategoryData) => { return true; });
        }

        // if selectedNode is set, return a list of categories within the same category type
        return Utils.getCategoriesWithInputsAndOutputs(categoryType);
    }, this)

    inspectorChangeNodeCategoryRequest = async (event: Event): Promise<void> => {
        const confirmNodeCategoryChanges = Setting.findValue<boolean>(Setting.CONFIRM_NODE_CATEGORY_CHANGES, false);
        const keepOldFields = Setting.findValue<boolean>(Setting.KEEP_OLD_FIELDS_DURING_CATEGORY_CHANGE, false);

        // request confirmation from user
        // old request if 'confirm' setting is true AND we're not going to keep the old fields
        if (confirmNodeCategoryChanges && !keepOldFields){
            const confirmed = await Utils.requestUserConfirm("Change Category?", 'Changing a nodes category could destroy some data (parameters, ports, etc) that are not appropriate for a node with the selected category', "Yes", "No", Setting.find(Setting.CONFIRM_NODE_CATEGORY_CHANGES));
            if (confirmed){
                this.inspectorChangeNodeCategory(event)
            } else {
                const selectedNode = this.selectedNode();
                if (selectedNode === null){
                    console.error("No selected node to reset category selection for");
                    return;
                }
                // reset the category selection in the inspector to match the node's actual category
                $('#objectInspectorCategorySelect').val(selectedNode.getCategory());
            }
        }else{
            this.inspectorChangeNodeCategory(event)
        }
    }

    inspectorChangeNodeCategory = (event: Event) : void => {
        if (event.target === null){
            console.error("No event target for inspectorChangeNodeCategory");
            return;
        }

        const newNodeCategory: CategoryName = $(event.target).val() as CategoryName;
        const newNodeCategoryType: CategoryType = CategoryData.getCategoryInfo(newNodeCategory).categoryType;
        const oldNode = this.selectedNode();

        // abort if no node selected
        if (oldNode === null){
            console.error("No selected node to change category for");
            return;
        }

        // try to find new node category in palettes
        let oldCategoryTemplate = Utils.getPaletteComponentByName(oldNode.getCategory(), true);
        const newCategoryTemplate = Utils.getPaletteComponentByName(newNodeCategory, true);

        // check that new category prototype was found, if not, skip transform node
        if (typeof newCategoryTemplate === "undefined"){
            Utils.showNotification(newNodeCategory + " prototype not found in palettes", "Can't intelligently transform old node into new node, will just set new category.", "warning");
        } else {
            // check that old category prototype was found, if not, use 'Unknown' as a placeholder for transform node
            if (typeof oldCategoryTemplate === "undefined"){
                console.warn("Prototype for old category (" + oldNode.getCategory() + ") could not be found in palettes. Using existing node as template to transform into new node.");
                oldCategoryTemplate = oldNode;
            }

            // consult user setting - whether they want to remove old fields
            const keepOldFields: boolean = Setting.findValue<boolean>(Setting.KEEP_OLD_FIELDS_DURING_CATEGORY_CHANGE, false);

            Utils.transformNodeFromTemplates(oldNode, oldCategoryTemplate, newCategoryTemplate, keepOldFields);
        }

        oldNode.setCategory(newNodeCategory);
        oldNode.setCategoryType(newNodeCategoryType);

        this.flagActiveFileModified();
        this.checkEagle();
        this.undo().pushSnapshot(this, "Edit Node Category");
        this.logicalGraph().fileInfo().modified = true;
        this.logicalGraph.valueHasMutated();

        // refresh the ParameterTable, since fields may have been added/removed
        ParameterTable.updateContent(this.selectedNode());
    }
    
    // NOTE: clones the node internally
    // NOTE: does not add the node's input or output applications to the logical graph
    addNode = async (node : Node, x: number, y: number): Promise<Node> => {
        return this.editorOperations.addNode(node, x, y);
    }

    checkForComponentUpdates = () => {
        // check if any nodes to update
        if (this.logicalGraph().getNumNodes() === 0){
            Utils.showNotification("Error", "Graph contains no components to update", "danger");
            return;
        }

        // check if graph editing is allowed
        if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Check for Component Updates");
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
        this.checkEagle();
        this.undo().pushSnapshot(this, "Check for Component Updates");
    }

    updateSelection = (): void => {
        // check if graph editing is allowed
        if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Update Selection");
            return;
        }

        // update
        const updatedNodes: Node[] = [];
        const errorsWarnings: ErrorsWarnings = {errors: [], warnings: []};
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
        this.checkEagle();
        const updatedNodeNames = updatedNodes.map(n => n.getName()).join(", ");
        this.undo().pushSnapshot(this, "Update Component(s): " + updatedNodeNames);
    }

    fixSelection = (): void => {
        // check if graph editing is allowed
        if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Fix Selection");
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
            for (const {issue} of node.getIssues()){
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
                for (const {issue} of field.getIssues()){
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
        this.checkEagle();
        const updatedNodeNames = updatedNodes.map(n => n.getName()).join(", ");
        this.undo().pushSnapshot(this, "Fix Component(s): " + updatedNodeNames);
    }

    findPaletteContainingNode = (nodeId: NodeId): Palette | undefined => {
        for (const palette of this.palettes()){
            for (const node of palette.getNodes()){
                if (node.getId() === nodeId){
                    return palette;
                }
            }
        }

        return undefined;
    }

    toggleAllPalettes = (): void => {
        // first check the state of the palette accordion items
        let anyExpanded: boolean = false;
        for (let i = 0 ; i < this.palettes().length; i++){
            const element = document.querySelector('#collapse'+i);
            if (element === null){
                console.error("Palette accordion element not found: #collapse" + i);
                continue;
            }

            if ($(element).hasClass('show')){
                anyExpanded = true;
                break;
            }
        }

        for (let i = 0 ; i < this.palettes().length; i++){
            const element = document.querySelector('#collapse'+i);
            if (element === null){
                console.error("Palette accordion element not found: #collapse" + i);
                continue;
            }

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

    slowScroll = (_data:any, event: JQuery.TriggeredEvent) : void => {
        const target = event.currentTarget;//gets the element that has the event binding
        const scrollTop = $(target).scrollTop();

        if (scrollTop === undefined) {
            console.error("Unable to get scrollTop for slowScroll");
            return;
        }

        $(target).scrollTop(scrollTop + (event.originalEvent as WheelEvent).deltaY * 0.5);
    }

}

// TODO: ready is deprecated here, use something else
$( document ).ready(function() {
    // jquery event listeners start here

    $('body').on('mouseout','.dropdown-area',function(event){
        const targetElement = event.currentTarget
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

    // Track the modal focus listener so it is attached only while a modal is open.
    // Capture phase is required because graph/node handlers may stop propagation.
    let modalFocusListenerAttached = false;
    const modalFocusStateHandler = (event: MouseEvent): void => {
        const modal = $('.modal.show').first();
        if (modal.length === 0) {
            return;
        }

        const target = $(event.target as Element);
        if (target.closest('.modal-content').length > 0) {
            modal.removeClass('modal-focus-away');
        } else {
            modal.addClass('modal-focus-away');
        }
    };

    const attachModalFocusListener = (): void => {
        if (!modalFocusListenerAttached) {
            document.addEventListener('mousedown', modalFocusStateHandler, true);
            modalFocusListenerAttached = true;
        }
    };

    const detachModalFocusListener = (): void => {
        if (modalFocusListenerAttached) {
            document.removeEventListener('mousedown', modalFocusStateHandler, true);
            modalFocusListenerAttached = false;
        }
    };

    // Added to prevent console warnings caused by focused elements in a modal being hidden.
    $('.modal').on('hide.bs.modal',function(){
        if (document.activeElement) {
            $(document.activeElement).blur();
        }
    })

    $('.modal').on('hidden.bs.modal', function () {
        const modal = $(this);
        const dialog = modal.find('.modal-dialog') as JQuery<HTMLElement>;

        //destroy any previous draggable instance on the modal dialog
        dialog.draggable('destroy');
        modal.find('.modal-header').off('mousedown.modalDrag');

        //reset modal dialog position and styles
        dialog.css({"left":"0px", "top":"0px"})
        modal.find("#editFieldModal textarea").attr('style','')
        modal.find("#issuesDisplayAccordion").parent().parent().attr('style','')
        //reset parameter table selection
        ParameterTable.resetSelection()

        //remove the listener for modal focus state
        $('.modal').removeClass('modal-focus-away')

        //reset the modal dialog pointer events so that the modal can be closed when clicked outside
        modal.css({"pointerEvents":"auto"})
        modal.find('.modal-content').css({"pointerEvents":"auto"})    

        // Keep the listener alive if another modal is taking over during this transition.
        if ($('.modal.show').length === 0) {
            detachModalFocusListener();
        }
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

        // attach the modal focus listener when the modal is shown
        attachModalFocusListener();
        modal.removeClass('modal-focus-away');

        // modal draggable
        (modal.find('.modal-dialog') as JQuery<HTMLElement>).draggable({
            handle: '.modal-header'
        });

        //this is a system that allows graph interaction with a modal open, it triggers when the user clicks and drags the modal header
        $(event.target).find('.modal-header').on('mousedown.modalDrag', function(){
            modal.removeClass('modal-focus-away')
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

        // abort if e.target is null
        if (e.target === null){
            console.error("No event target for translationDefault click");
            return;
        }

        // toggle method on
        const element = $(e.target)
        if(element.val() === "true"){
            element.val('false')
        }else{
            element.val('true')
        }

        //saving the new translation default into the settings system
        const translationId = element.closest('.accordion-item').attr('id')
        if (typeof translationId !== 'undefined'){
            Setting.setValue(Setting.TRANSLATOR_ALGORITHM_DEFAULT, translationId);
        }
        
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
        const target = e.target as HTMLElement;
        if (target === null){
            console.error("No event target for hierarchyEdgeExtra click");
            return;
        }
        const selectedEdgeId: EdgeId = $(target).attr("id") as EdgeId;

        const eagle: Eagle = Eagle.getInstance();
        const selectEdge = eagle.logicalGraph().getEdgeById(selectedEdgeId);

        if(typeof selectEdge === 'undefined'){
            console.log("no edge found")
            return
        }
        if(!e.shiftKey){
            eagle.setSelection(selectEdge, EagleFileType.Graph);
        }else{
            eagle.editSelection(selectEdge, EagleFileType.Graph);
        }
    })

    $(".hierarchy").on("click", function(){
        const eagle: Eagle = Eagle.getInstance();
        eagle.selectedObjects([]);
    })   

});
