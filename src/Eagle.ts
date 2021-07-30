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
import * as ij from "intro.js";

import {Utils} from './Utils';
import {Config} from './Config';
import {GitHub} from './GitHub';
import {GitLab} from './GitLab';
import {Repository} from './Repository';
import {RepositoryFolder} from './RepositoryFolder';
import {RepositoryFile} from './RepositoryFile';
import {Translator} from './Translator';

import {LogicalGraph} from './LogicalGraph';
import {Palette} from './Palette';
import {Node} from './Node';
import {Port} from './Port';
import {Edge} from './Edge';
import {Field} from './Field';
import {FileInfo} from './FileInfo';
import {Setting} from './Setting';
import {KeyboardShortcut} from './KeyboardShortcut';
import {SideWindow} from './SideWindow';
import {InspectorState} from './InspectorState';
import {PaletteInfo} from './PaletteInfo';

export class Eagle {
    palettes : ko.ObservableArray<Palette>;
    logicalGraph : ko.Observable<LogicalGraph>;

    repositories : ko.ObservableArray<Repository>;

    leftWindow : ko.Observable<SideWindow>;
    rightWindow : ko.Observable<SideWindow>;

    selectedNode : ko.Observable<Node>;
    selectedEdge : ko.Observable<Edge>;
    selectedLocation : ko.Observable<Eagle.FileType>;

    translator : ko.Observable<Translator>;

    globalOffsetX : number;
    globalOffsetY : number;
    globalScale : number;

    inspectorState : ko.Observable<InspectorState>;

    rendererFrameDisplay : ko.Observable<string>;
    rendererFrameMax : ko.Observable<number>;

    explorePalettes : ko.ObservableArray<PaletteInfo>;

    static settings : ko.ObservableArray<Setting>;
    static shortcuts : ko.ObservableArray<KeyboardShortcut>;

    static dataNodes : Node[] = [];
    static dataCategories : Eagle.Category[] = [];
    static applicationNodes : Node[] = [];
    static applicationCategories : Eagle.Category[] = [];

    static dragStartX : number;

    static selectedNodeKey : number;

    static nodeDropLocation : {x: number, y: number} = {x:0, y:0}; // if this remains x=0,y=0, the button has been pressed and the getNodePosition function will be used to determine a location on the canvas. if not x:0, y:0, it has been over written by the nodeDrop function as the node has been dragged into the canvas. The node will then be placed into the canvas using these co-ordinates.
    static nodeDragPaletteIndex : number;
    static nodeDragComponentIndex : number;

    constructor(){
        this.palettes = ko.observableArray();
        this.logicalGraph = ko.observable(null);

        this.repositories = ko.observableArray();

        this.leftWindow = ko.observable(new SideWindow(Eagle.LeftWindowMode.Palettes, Utils.getLeftWindowWidth(), false));
        this.rightWindow = ko.observable(new SideWindow(Eagle.RightWindowMode.Repository, Utils.getRightWindowWidth(), true));

        this.selectedNode = ko.observable(null);
        this.selectedEdge = ko.observable(null);
        this.selectedLocation = ko.observable(Eagle.FileType.Unknown);

        this.translator = ko.observable(new Translator());

        Eagle.settings = ko.observableArray();
        Eagle.settings.push(new Setting("Confirm Discard Changes", "Prompt user to confirm that unsaved changes to the current file should be discarded when opening a new file, or when navigating away from EAGLE.", Setting.Type.Boolean, Utils.CONFIRM_DISCARD_CHANGES, true));
        Eagle.settings.push(new Setting("Confirm Remove Repositories", "Prompt user to confirm removing a repository from the list of known repositories.", Setting.Type.Boolean, Utils.CONFIRM_REMOVE_REPOSITORES, true));
        Eagle.settings.push(new Setting("Confirm Reload Palettes", "Prompt user to confirm when loading a palette that is already loaded.", Setting.Type.Boolean, Utils.CONFIRM_RELOAD_PALETTES, true));
        Eagle.settings.push(new Setting("Confirm Delete Nodes", "Prompt user to confirm when deleting a node from a graph.", Setting.Type.Boolean, Utils.CONFIRM_DELETE_NODES, true));
        Eagle.settings.push(new Setting("Confirm Delete Edges", "Prompt user to confirm when deleting an edge from a graph.", Setting.Type.Boolean, Utils.CONFIRM_DELETE_EDGES, true));
        Eagle.settings.push(new Setting("Show File Loading Warnings", "Display list of issues with files encountered during loading.", Setting.Type.Boolean, Utils.SHOW_FILE_LOADING_ERRORS, false));
        Eagle.settings.push(new Setting("Allow Invalid edges", "Allow the user to create edges even if they would normally be determined invalid.", Setting.Type.Boolean, Utils.ALLOW_INVALID_EDGES, false));
        Eagle.settings.push(new Setting("Allow Component Editing", "Allow the user to add/remove ports and parameters from components.", Setting.Type.Boolean, Utils.ALLOW_COMPONENT_EDITING, false));
        Eagle.settings.push(new Setting("Allow Palette Editing", "Allow the user to edit palettes.", Setting.Type.Boolean, Utils.ALLOW_PALETTE_EDITING, false));
        Eagle.settings.push(new Setting("Translate with New Categories", "Replace the old categories with new names when exporting. For example, replace 'Component' with 'PythonApp' category.", Setting.Type.Boolean, Utils.TRANSLATE_WITH_NEW_CATEGORIES, false));
        Eagle.settings.push(new Setting("Allow Readonly Parameter Editing", "Allow the user to edit values of readonly parameters in components.", Setting.Type.Boolean, Utils.ALLOW_READONLY_PARAMETER_EDITING, false));
        Eagle.settings.push(new Setting("Translator URL", "The URL of the translator server", Setting.Type.String, Utils.TRANSLATOR_URL, "http://localhost:8084/gen_pgt"));
        Eagle.settings.push(new Setting("Open Default Palette on Startup", "Open a default palette on startup. The palette contains an example of all known node categories", Setting.Type.Boolean, Utils.OPEN_DEFAULT_PALETTE, true));
        Eagle.settings.push(new Setting("GitHub Access Token", "A users access token for GitHub repositories.", Setting.Type.Password, Utils.GITHUB_ACCESS_TOKEN_KEY, ""));
        Eagle.settings.push(new Setting("GitLab Access Token", "A users access token for GitLab repositories.", Setting.Type.Password, Utils.GITLAB_ACCESS_TOKEN_KEY, ""));
        Eagle.settings.push(new Setting("Create Applications for Construct Ports", "When loading old graph files with ports on construct nodes, move the port to an embedded application", Setting.Type.Boolean, Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS, true));
        Eagle.settings.push(new Setting("Disable JSON Validation", "Allow EAGLE to load/save/send-to-translator graphs and palettes that would normally fail validation against schema.", Setting.Type.Boolean, Utils.DISABLE_JSON_VALIDATION, false));
        Eagle.settings.push(new Setting("Allow Edge Editing", "Allow the user to edit edge attributes.", Setting.Type.Boolean, Utils.ALLOW_EDGE_EDITING, false));
        Eagle.settings.push(new Setting("Docker Hub Username", "The username to use when retrieving data on images stored on Docker Hub", Setting.Type.String, Utils.DOCKER_HUB_USERNAME, "icrar"));
        Eagle.settings.push(new Setting("Spawn Translation Tab", "When translating a graph, display the output of the translator in a new tab", Setting.Type.Boolean, Utils.SPAWN_TRANSLATION_TAB, true));
        Eagle.settings.push(new Setting("Enable Performance Display", "Display the frame time of the graph renderer", Setting.Type.Boolean, Utils.ENABLE_PERFORMANCE_DISPLAY, false));

        Eagle.shortcuts = ko.observableArray();
        Eagle.shortcuts.push(new KeyboardShortcut("Add Edge", ["e"], KeyboardShortcut.true, (eagle): void => {eagle.addEdgeToLogicalGraph();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Modify Selected Edge", ["m"], KeyboardShortcut.edgeIsSelected, (eagle): void => {eagle.editSelectedEdge();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Delete Selected Edge", ["Backspace", "Delete"], KeyboardShortcut.edgeIsSelected, (eagle): void => {eagle.deleteSelectedEdge(false);}));
        Eagle.shortcuts.push(new KeyboardShortcut("Delete Selected Node", ["Backspace", "Delete"], KeyboardShortcut.nodeIsSelected, (eagle): void => {eagle.deleteSelectedNode();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Duplicate Selected Node", ["d"], KeyboardShortcut.nodeIsSelected, (eagle): void => {eagle.duplicateSelectedNode();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Change Selected Node Parent", ["h"], KeyboardShortcut.nodeIsSelected, (eagle): void => {eagle.changeNodeParent();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Change Selected Node Subject", ["s"], KeyboardShortcut.commentNodeIsSelected, (eagle): void => {eagle.changeNodeSubject();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Toggle left window", ["1"], KeyboardShortcut.true, (eagle): void => {eagle.leftWindow().toggleShown();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Toggle right window", ["2"], KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().toggleShown();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Center graph", ["c"], KeyboardShortcut.true, (eagle): void => {eagle.centerGraph();}));
        Eagle.shortcuts.push(new KeyboardShortcut("New palette", ["n"], KeyboardShortcut.true, (eagle): void => {eagle.newPalette();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Open palette from local disk", ["p"], KeyboardShortcut.true, (eagle): void => {eagle.getPaletteFileToLoad();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Open graph from local disk", ["g"], KeyboardShortcut.true, (eagle): void => {eagle.getGraphFileToLoad();}));
        Eagle.shortcuts.push(new KeyboardShortcut("Insert graph from local disk", ["i"], KeyboardShortcut.true, (eagle): void => {eagle.getGraphFileToInsert();}));



        this.selectedNode.subscribe(this.updateInspectorTooltips);

        this.globalOffsetX = 0;
        this.globalOffsetY = 0;
        this.globalScale = 1.0;

        this.inspectorState = ko.observable(new InspectorState());

        this.rendererFrameDisplay = ko.observable("");
        this.rendererFrameMax = ko.observable(0);

        this.explorePalettes = ko.observableArray([]);
    }

    areAnyFilesModified = () : boolean => {
        // check the logical graph
        if (this.logicalGraph().fileInfo().modified){
            return true;
        }

        // check all the open palettes
        for (let i = 0 ; i < this.palettes().length ; i++){
            if (this.palettes()[i].fileInfo().modified){
                return true;
            }
        }

        return false;
    }

    allowPaletteEditing = () : boolean => {
        return Eagle.findSetting(Utils.ALLOW_PALETTE_EDITING).value();
    }

    activeFileInfo = () : FileInfo => {
        if (this.logicalGraph()){
            return this.logicalGraph().fileInfo();
        }

        return null;
    }

    flagActiveFileModified = () : void => {
        if (this.logicalGraph()){
            this.logicalGraph().fileInfo().modified = true;
            this.logicalGraph().fileInfo.valueHasMutated();
        }
    }

    getTabTitle : ko.PureComputed<string> = ko.pureComputed(() => {
        // Adding a star symbol in front of the title if file is modified.
        let mod = '';

        const fileInfo : FileInfo = this.activeFileInfo();

        if (fileInfo && fileInfo.modified){
            mod = '*';
        }

        // Display file name in tab title if non-empty
        const fileName = this.repositoryFileName();

        if (fileName === ""){
            return "EAGLE";
        } else {
            return mod + "EAGLE: " + this.repositoryFileName();
        }
    }, this);

    // generate a list of Application nodes within the open palettes
    getApplications = () : Node[] => {
        const list: Node[] = [];

        for (let i = 0 ; i < this.palettes().length ; i++){
            const palette : Palette = this.palettes()[i];

            for (let j = 0 ; j < palette.getNodes().length; j++){
                const node : Node = palette.getNodes()[j];

                if (node.getCategoryType() === Eagle.CategoryType.Application){
                    list.push(node);
                }
            }
        }

        return list;
    }

    repositoryFileName : ko.PureComputed<string> = ko.pureComputed(() => {
        const fileInfo : FileInfo = this.activeFileInfo();

        // if no FileInfo is available, return empty string
        if (fileInfo === null){
            return "";
        }

        return fileInfo.getText();
    }, this);

    getRepositoryList = (service : Eagle.RepositoryService) : Repository[] => {
        const list : Repository[] = [];

        for (let i = 0 ; i < this.repositories().length ; i++){
            if (this.repositories()[i].service === service){
                list.push(this.repositories()[i]);
            }
        }

        return list;
    };

    getRepository = (service : Eagle.RepositoryService, name : string, branch : string) : Repository | null => {
        console.log("getRepository()", service, name, branch);

        for (let i = 0 ; i < this.repositories().length ; i++){
            if (this.repositories()[i].service === service && this.repositories()[i].name === name && this.repositories()[i].branch === branch){
                return this.repositories()[i];
            }
        }
        console.warn("getRepositoryByName() could not find " + service + " repository with the name " + name + " and branch " + branch);
        return null;
    };

    zoomIn = () : void => {
        console.error("Not implemented!");
    }

    zoomOut = () : void => {
        console.error("Not implemented!");
    }

    zoomToFit = () : void => {
        console.error("Not implemented!");
    }

    toggleGrid = () : void => {
        console.error("Not implemented!");
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
        for (let i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            const node : Node = this.logicalGraph().getNodes()[i];

            if (node.getPosition().x < minX){
                minX = node.getPosition().x;
            }
            if (node.getPosition().y < minY){
                minY = node.getPosition().y;
            }
            if (node.getPosition().x + node.getWidth() > maxX){
                maxX = node.getPosition().x + node.getWidth();
            }
            if (node.getPosition().y + node.getHeight() > maxY){
                maxY = node.getPosition().y + node.getHeight();
            }
        }

        // determine the centroid of the graph
        const centroidX = minX + ((maxX - minX) / 2);
        const centroidY = minY + ((maxY - minY) / 2);

        // reset scale
        this.globalScale = 1.0;

        //determine center of the display area
        const displayCenterX : number = $('#logicalGraphParent').width() / this.globalScale / 2;
        const displayCenterY : number = $('#logicalGraphParent').height() / this.globalScale / 2;

        // translate display to center the graph centroid
        this.globalOffsetX = displayCenterX - centroidX;
        this.globalOffsetY = displayCenterY - centroidY;

        // trigger render
        this.flagActiveDiagramHasMutated();
    }

    /**
     * This function is repeatedly called throughout the EAGLE operation.
     * It resets al fields in the editor menu.
     */
    resetEditor = () : void => {
        this.selectedNode(null);
        this.selectedEdge(null);
        this.selectedLocation(Eagle.FileType.Unknown);

        // Show the last open repository.
        this.rightWindow().mode(Eagle.RightWindowMode.Repository);
    }

    getSelection = () : Node | Edge | null => {
        if (this.selectedNode() !== null){
            return this.selectedNode();
        }
        if (this.selectedEdge() !== null){
            return this.selectedEdge();
        }
        return null;
    }

    setSelection = (rightWindowMode : Eagle.RightWindowMode, selection : Node | Edge, selectionLocation: Eagle.FileType) : void => {
        //console.log("eagle.setSelection()", Utils.translateRightWindowModeToString(rightWindowMode), selection, selectionLocation);

        switch (rightWindowMode){
            case Eagle.RightWindowMode.Hierarchy:
            case Eagle.RightWindowMode.NodeInspector:
                // abort if already selected
                if (this.selectedNode() === selection && this.selectedLocation() === selectionLocation){
                    this.rightWindow().mode(rightWindowMode);
                    return;
                }

                // de-select all the nodes in the logical graph
                for (let i = 0 ; i < this.logicalGraph().getNodes().length; i++){
                    this.logicalGraph().getNodes()[i].setSelected(false);
                    this.logicalGraph().getNodes()[i].setShowPorts(false);
                }

                // de-select all the nodes in the palettes
                for (let i = 0 ; i < this.palettes.length; i++){
                    const palette = this.palettes()[i];

                    for (let j = 0 ; j < palette.getNodes().length; j++){
                        palette.getNodes()[j].setSelected(false);
                        palette.getNodes()[j].setShowPorts(false);
                    }
                }

                // abort if new selection is null
                if (selection === null){
                    Eagle.selectedNodeKey = undefined;
                    this.selectedNode(null);
                    this.selectedEdge(null);
                    this.selectedLocation(Eagle.FileType.Unknown);
                    this.flagActiveDiagramHasMutated();
                    return;
                }

                (<Node>selection).setSelected(true);
                (<Node>selection).setShowPorts(true);

                Eagle.selectedNodeKey = (<Node>selection).getKey();
                this.selectedNode(<Node>selection);
                this.selectedEdge(null);
                this.selectedLocation(selectionLocation);

                // update the display of all the sections of the node inspector (collapse/expand as appropriate)
                this.inspectorState().updateAllInspectorSections();

                // expand this node's parents, all the way to the root of the hierarchy
                let n : Node = <Node>selection;
                while(true){
                    const parentKey : number = n.getParentKey();

                    if (parentKey === null){
                        break;
                    }

                    const parentNode : Node = this.logicalGraph().findNodeByKey(parentKey);

                    if (parentNode === null){
                        break;
                    }

                    //console.log("expand node", parentNode.getKey(), parentNode.getName());
                    parentNode.setExpanded(true);
                    n = parentNode;
                }

                break;
            case Eagle.RightWindowMode.EdgeInspector:
                Eagle.selectedNodeKey = null;
                this.selectedNode(null);
                this.selectedEdge(<Edge>selection);
                this.selectedLocation(selectionLocation);
                break;
            default:
                console.warn("RightWindowMode " + rightWindowMode + " not handled in setSelection()");
                break;
        }

        // switch to the correct right window mode
        if (rightWindowMode === Eagle.RightWindowMode.EdgeInspector || rightWindowMode === Eagle.RightWindowMode.NodeInspector){
            this.rightWindow().mode(rightWindowMode);
        }
    }

    //----------------- Physical Graph Generation --------------------------------
    /**
     * Generate Physical Graph Template.
     * @param algorithmIndex Algorithm number.
     */
    genPGT = (algorithmIndex : number, testingMode: boolean) : void => {
        if (this.logicalGraph().getNumNodes() === 0) {
            Utils.showUserMessage("Error", "Unable to translate. Logical graph has no nodes!");
            return;
        }

        if (this.logicalGraph().fileInfo().name === ""){
            Utils.showUserMessage("Error", "Unable to translate. Logical graph does not have a name! Please save the graph first.");
            return;
        }

        const translatorURL : string = Eagle.findSetting(Utils.TRANSLATOR_URL).value();
        const schemas: Eagle.DALiuGESchemaVersion[] = [Eagle.DALiuGESchemaVersion.OJS, Eagle.DALiuGESchemaVersion.AppRef];

        console.log("Eagle.getPGT() : algorithm index:", algorithmIndex, "algorithm name:", Config.translationAlgorithms[algorithmIndex], "translator URL", translatorURL);

        // ask user to specify graph format to be sent to translator
        Utils.requestUserChoice("Translation format", "Please select the format for the graph that will be sent to the translator", schemas, 0, false, "", (completed: boolean, userChoiceIndex: number) => {
            if (!completed){
                console.log("User aborted translation.");
                return;
            }

            // get json for logical graph
            let json;
            switch (schemas[userChoiceIndex]){
                case Eagle.DALiuGESchemaVersion.OJS:
                    json = LogicalGraph.toOJSJson(this.logicalGraph());
                    break;
                case Eagle.DALiuGESchemaVersion.AppRef:
                    json = LogicalGraph.toAppRefJson(this.logicalGraph());
                    break;
                default:
                    console.error("Unsupported graph format for translator!");
                    return;
            }

            // validate json
            if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
                const validatorResult : {valid: boolean, errors: string} = Utils.validateJSON(json, schemas[userChoiceIndex], Eagle.FileType.Graph);
                if (!validatorResult.valid){
                    const message = "JSON Output failed validation against internal JSON schema, saving anyway";
                    console.error(message, validatorResult.errors);
                    Utils.showUserMessage("Error", message + "<br/>" + validatorResult.errors);
                    //return;
                }
            }

            const translatorData = {
                algo: Config.translationAlgorithms[algorithmIndex],
                lg_name: this.logicalGraph().fileInfo().name,
                json_data: JSON.stringify(json),
                test: testingMode.toString()
            };

            this.translator().submit(translatorURL, translatorData);

            // mostly for debugging purposes
            console.log("translator data");
            console.log("---------");
            console.log(translatorData);
            console.log("---------");
            console.log(json);
            console.log("---------");
        });
    }

    /**
     * Uploads a file from a local file location.
     * @param e The event to be handled.
     */
    uploadGraphFile = () : void => {
        const uploadedGraphFileToLoadInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedGraphFileToLoad");
        const fileFullPath : string = uploadedGraphFileToLoadInputElement.value;
        const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // Gets the file from formdata.
        const formData = new FormData();
        formData.append('file', uploadedGraphFileToLoadInputElement.files[0]);
        uploadedGraphFileToLoadInputElement.value = "";

        Utils.httpPostForm('/uploadFile', formData, (error : string, data : string) : void => {
            if (error !== null){
                console.error(error);
                return;
            }

            this._loadGraphJSON(data, showErrors, fileFullPath, (lg: LogicalGraph) : void => {
                this.logicalGraph(lg);

                // update the activeFileInfo with details of the repository the file was loaded from
                if (fileFullPath !== ""){
                    this.updateActiveFileInfo(Eagle.RepositoryService.Unknown, "", "", Utils.getFilePathFromFullPath(fileFullPath), Utils.getFileNameFromFullPath(fileFullPath));
                }
            });
        });
    }

    /**
     * Uploads a file from a local file location. File will be "insert"ed into the current graph
     * @param e The event to be handled.
     */
    insertGraphFile = () : void => {
        const uploadedGraphFileToInsertInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedGraphFileToInsert");
        const fileFullPath : string = uploadedGraphFileToInsertInputElement.value;
        const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // Gets the file from formdata.
        const formData = new FormData();
        formData.append('file', uploadedGraphFileToInsertInputElement.files[0]);
        uploadedGraphFileToInsertInputElement.value = "";

        Utils.httpPostForm('/uploadFile', formData, (error : string, data : string) : void => {
            if (error !== null){
                console.error(error);
                return;
            }

            this._loadGraphJSON(data, showErrors, fileFullPath, (lg: LogicalGraph) : void => {
                this.insertGraph(lg);

                this.flagActiveDiagramHasMutated();
            });
        });
    }

    private _loadGraphJSON = (data: string, showErrors: boolean, fileFullPath: string, loadFunc: (lg: LogicalGraph) => void) : void => {
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
        const schemaVersion: Eagle.DALiuGESchemaVersion = Utils.determineSchemaVersion(dataObject);

        const errors: string[] = [];
        const dummyFile: RepositoryFile = new RepositoryFile(Repository.DUMMY, "", fileFullPath);

        // use the correct parsing function based on schema version
        switch (schemaVersion){
            case Eagle.DALiuGESchemaVersion.AppRef:
                loadFunc(LogicalGraph.fromAppRefJson(dataObject, dummyFile, errors));
                break;
            case Eagle.DALiuGESchemaVersion.V3:
                Utils.showUserMessage("Unsupported feature", "Loading files using the V3 schema is not supported.");
                loadFunc(LogicalGraph.fromV3Json(dataObject, dummyFile, errors));
                break;
            case Eagle.DALiuGESchemaVersion.OJS:
            case Eagle.DALiuGESchemaVersion.Unknown:
                loadFunc(LogicalGraph.fromOJSJson(dataObject, dummyFile, errors));
                break;
        }

        // show errors (if found)
        if (errors.length > 0){
            if (showErrors){
                Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
            }
        } else {
            Utils.showNotification("Success", Utils.getFileNameFromFullPath(fileFullPath) + " has been loaded.", "success");
        }
    }

    insertGraph = (lg: LogicalGraph) : void => {
        // create map of inserted graph keys to final graph keys
        const keyMap: Map<number, number> = new Map();
        const portMap: Map<string, string> = new Map();
        const parentNode: Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), lg.fileInfo().name, lg.fileInfo().getText(), Eagle.Category.SubGraph, Eagle.CategoryType.Group, false);
        const parentNodePosition = this.getNewNodePosition();

        // add the parent node to the logical graph
        this.logicalGraph().addNodeComplete(parentNode);

        // insert nodes from lg into the existing logicalGraph
        for (let i = 0 ; i < lg.getNodes().length; i++){
            const node: Node = lg.getNodes()[i];

            this.logicalGraph().addNode(node.clone(), parentNodePosition.x + node.getPosition().x, parentNodePosition.y + node.getPosition().y, (insertedNode: Node) => {
                // save mapping for node itself
                keyMap.set(node.getKey(), insertedNode.getKey());

                // if insertedNode has no parent, make it a parent of the parent node
                if (insertedNode.getParentKey() === null){
                    insertedNode.setParentKey(parentNode.getKey());
                }

                // copy embedded input application
                if (node.hasInputApplication()){
                    const inputApplication : Node = node.getInputApplication();
                    const clone : Node = inputApplication.clone();
                    const newKey : number = Utils.newKey(this.logicalGraph().getNodes());
                    clone.setKey(newKey);
                    keyMap.set(inputApplication.getKey(), newKey);

                    insertedNode.setInputApplication(clone);

                    // loop through ports, adding them to the port map
                    for (let j = 0 ; j < inputApplication.getInputPorts().length; j++){
                        portMap.set(inputApplication.getInputPorts()[j].getId(), inputApplication.getInputPorts()[j].getId());
                    }

                    for (let j = 0 ; j < inputApplication.getOutputPorts().length; j++){
                        portMap.set(inputApplication.getOutputPorts()[j].getId(), inputApplication.getOutputPorts()[j].getId());
                    }
                }

                // copy embedded output application
                if (node.hasOutputApplication()){
                    const outputApplication : Node = node.getOutputApplication();
                    const clone : Node = outputApplication.clone();
                    const newKey : number = Utils.newKey(this.logicalGraph().getNodes());
                    clone.setKey(newKey);
                    keyMap.set(outputApplication.getKey(), newKey);

                    insertedNode.setOutputApplication(clone);

                    // loop through ports, adding them to the port map
                    for (let j = 0 ; j < outputApplication.getInputPorts().length; j++){
                        portMap.set(outputApplication.getInputPorts()[j].getId(), outputApplication.getInputPorts()[j].getId());
                    }

                    for (let j = 0 ; j < outputApplication.getOutputPorts().length; j++){
                        portMap.set(outputApplication.getOutputPorts()[j].getId(), outputApplication.getOutputPorts()[j].getId());
                    }
                }

                // save mapping for input ports
                for (let j = 0 ; j < node.getInputPorts().length; j++){
                    portMap.set(node.getInputPorts()[j].getId(), insertedNode.getInputPorts()[j].getId());
                }

                // save mapping for output ports
                for (let j = 0 ; j < node.getOutputPorts().length; j++){
                    portMap.set(node.getOutputPorts()[j].getId(), insertedNode.getOutputPorts()[j].getId());
                }
            });
        }

        // update some other details of the nodes are updated correctly
        for (let i = 0 ; i < lg.getNodes().length ; i++){
            const node: Node = lg.getNodes()[i];
            const insertedNodeKey: number = keyMap.get(node.getKey());
            const insertedNode: Node = this.logicalGraph().findNodeByKey(insertedNodeKey);

            // if original node had no parent, skip
            if (node.getParentKey() === null){
                continue;
            }

            // make sure parent is set correctly
            insertedNode.setParentKey(keyMap.get(node.getParentKey()));
        }

        // insert edges from lg into the existing logicalGraph
        for (let i = 0 ; i < lg.getEdges().length; i++){
            const edge: Edge = lg.getEdges()[i];
            this.logicalGraph().addEdge(keyMap.get(edge.getSrcNodeKey()), portMap.get(edge.getSrcPortId()), keyMap.get(edge.getDestNodeKey()), portMap.get(edge.getDestPortId()), edge.getDataType(), edge.isLoopAware(), null);
        }

        // resize the parent node so that it fits all its children, and collapse it by default
        this.logicalGraph().shrinkNode(parentNode);
        parentNode.setCollapsed(true);
    }

    /**
     * Loads a custom palette from a file.
     */
    uploadPaletteFile = () : void => {
        const uploadedPaletteFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedPaletteFileToLoad");
        const fileFullPath : string = uploadedPaletteFileInputElement.value;
        const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // Get and load the specified configuration file.
        const formData = new FormData();
        formData.append('file', uploadedPaletteFileInputElement.files[0]);
        uploadedPaletteFileInputElement.value = "";

        Utils.httpPostForm('/uploadFile', formData, (error : string, data : string) : void => {
            if (error !== null){
                console.error(error);
                return;
            }

            this._loadPaletteJSON(data, showErrors, fileFullPath);
        });
    }

    private _loadPaletteJSON = (data: string, showErrors: boolean, fileFullPath: string) => {
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
            Utils.showUserMessage("Error", "This is not a palette file! Looks like a " + Utils.translateFileTypeToString(loadedFileType));
            return;
        }

        const errors: string[] = [];
        const p : Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", Utils.getFileNameFromFullPath(fileFullPath)), errors);

        // show errors (if found)
        if (errors.length > 0 && showErrors){
            Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
        }

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
         document.getElementById("uploadedGraphFileToLoad").click();
     }

     getGraphFileToInsert = () : void => {
         document.getElementById("uploadedGraphFileToInsert").click();
     }

    getPaletteFileToLoad = () : void => {
        document.getElementById("uploadedPaletteFileToLoad").click();
    }

    /**
     * Creates a new logical graph for editing.
     */
    newLogicalGraph = () : void => {
        this.newDiagram(Eagle.FileType.Graph, (name: string) => {
            this.logicalGraph(new LogicalGraph());
            this.logicalGraph().fileInfo().name = name;
            const node : Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), "Description", "", Eagle.Category.Description, Eagle.CategoryType.Other, false);
            const pos = this.getNewNodePosition();
            node.setColor(Utils.getColorForNode(Eagle.Category.Description));
            this.logicalGraph().addNode(node, pos.x, pos.y, null);
            this.logicalGraph.valueHasMutated();
        });
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

            const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

            this._loadGraphJSON(userText, showErrors, "", (lg: LogicalGraph) : void => {
                this.logicalGraph(lg);
            });
        });
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

            // NOTE: we can construct all these new nodes with key=0, since they will be assigned correct keys when added to the palette
            const startNode : Node = new Node(0, "Start", "", Eagle.Category.Start, Eagle.CategoryType.Control, false);
            startNode.setColor(Utils.getColorForNode(Eagle.Category.Start));
            p.addNode(startNode, true);

            const endNode : Node = new Node(0, "End", "", Eagle.Category.End, Eagle.CategoryType.Control, false);
            endNode.setColor(Utils.getColorForNode(Eagle.Category.End));
            p.addNode(endNode, true);

            const commentNode : Node = new Node(0, "Comment", "", Eagle.Category.Comment, Eagle.CategoryType.Other, false);
            commentNode.setColor(Utils.getColorForNode(Eagle.Category.Comment));
            p.addNode(commentNode, true);

            const descriptionNode : Node = new Node(0, "Description", "", Eagle.Category.Description, Eagle.CategoryType.Other, false);
            descriptionNode.setColor(Utils.getColorForNode(Eagle.Category.Description));
            p.addNode(descriptionNode, true);

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

            const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

            this._loadPaletteJSON(userText, showErrors, "");
        });
    }

    /**
     * Create a new diagram (graph or palette).
     */
    newDiagram = (fileType : Eagle.FileType, callbackAction : (name : string) => void ) : void => {
        console.log("newDiagram()", fileType);
        Utils.requestUserString("New " + Utils.translateFileTypeToString(fileType), "Enter " + Utils.translateFileTypeToString(fileType) + " name", "", false, (completed : boolean, userString : string) : void => {
            if (!completed)
            {   // Cancelling action.
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

    /**
     * Saves the file to a local download folder.
     */
    saveFileToLocal = (fileType : Eagle.FileType) : void => {
        // TODO: missing code here
        if (fileType !== Eagle.FileType.Graph){
            Utils.showUserMessage("Not implemented", "Not sure which palette is the right one to commit to git");
            return;
        }

        // check that the fileType has been set for the logicalGraph
        if (typeof this.logicalGraph().fileInfo().type === 'undefined'){
            Utils.showUserMessage("Error", "Graph fileType has not been set. Could not save file.");
            return;
        }

        let fileName = this.activeFileInfo().name;
        if (fileName === "") {
            fileName = "Diagram-" + Utils.generateDateTimeString() + "." + Utils.getDiagramExtension(fileType);
            this.activeFileInfo().name = fileName;
        }

        let json : object;
        if (fileType === Eagle.FileType.Graph){
            // clone the logical graph and remove github info ready for local save
            const lg_clone : LogicalGraph = this.logicalGraph().clone();
            lg_clone.fileInfo().removeGitInfo();
            lg_clone.fileInfo().updateEagleInfo();
            json = LogicalGraph.toOJSJson(lg_clone);
        } else {
            // clone the palette and remove github info ready for local save

            /*
            const p_clone : Palette = this.editorPalette().clone();
            p_clone.fileInfo().removeGitInfo();
            p_clone.fileInfo().updateEagleInfo();
            json = Palette.toOJSJson(p_clone);
            */
        }

        // validate json
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
            const validatorResult : {valid: boolean, errors: string} = Utils.validateJSON(json, Eagle.DALiuGESchemaVersion.OJS, fileType);
            if (!validatorResult.valid){
                const message = "JSON Output failed validation against internal JSON schema, saving anyway";
                console.error(message, validatorResult.errors);
                Utils.showUserMessage("Error", message + "<br/>" + validatorResult.errors);
                //return;
            }
        }

        Utils.httpPostJSON('/saveFileToLocal', json, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            // NOTE: this stuff is a hacky way of saving a file locally
            const blob = new Blob([data]);
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();

            // since changes are now stored locally, the file will have become out of sync with the GitHub repository, so the association should be broken
            // clear the modified flag
            if (fileType === Eagle.FileType.Graph){
                this.logicalGraph().fileInfo().modified = false;
                this.logicalGraph().fileInfo().repositoryService = Eagle.RepositoryService.Unknown;
                this.logicalGraph().fileInfo().repositoryName = "";
                this.logicalGraph().fileInfo().gitUrl = "";
                this.logicalGraph().fileInfo().sha = "";
                this.logicalGraph().fileInfo.valueHasMutated();
            } else {
                /*
                this.editorPalette().fileInfo().modified = false;
                this.editorPalette().fileInfo().repositoryService = Eagle.RepositoryService.Unknown;
                this.editorPalette().fileInfo().repositoryName = "";
                this.editorPalette().fileInfo().gitUrl = "";
                this.editorPalette().fileInfo().sha = "";
                this.editorPalette().fileInfo.valueHasMutated();
                */
                console.warn("Missing code here");
            }
        });
    }

    /**
     * Saves a file to the remote server repository.
     */
    saveFileToRemote = (repository : Repository, json : object) : void => {
        console.log("saveFileToRemote() repository.name", repository.name, "repository.service", repository.service);

        let url : string;

        switch (repository.service){
            case Eagle.RepositoryService.GitHub:
                url = '/saveFileToRemoteGithub';
                break;
            case Eagle.RepositoryService.GitLab:
                url = '/saveFileToRemoteGitlab';
                break;
            default:
                url = '';
                Utils.showUserMessage("Error", "Unknown repository service : " + repository.service);
                return;
        }


        Utils.httpPostJSON(url, json, (error : string, data: string) : void => {
            if (error !== null){
                Utils.showUserMessage("Error", data + "<br/><br/>These error messages provided by " + repository.service + " are not very helpful. Please contact EAGLE admin to help with further investigation.");
                console.error("Error: " + JSON.stringify(error, null, 2) + " Data: " + data);
                return;
            }

            // Load the file list again.
            if (repository.service === Eagle.RepositoryService.GitHub){
                GitHub.loadRepoContent(repository);
            }
            if (repository.service === Eagle.RepositoryService.GitLab){
                GitLab.loadRepoContent(repository);
            }

            // show repo in the right window
            this.rightWindow().mode(Eagle.RightWindowMode.Repository);
            // Mark file as non-modified.
            this.activeFileInfo().modified = false;

            // Show success message
            if (repository.service === Eagle.RepositoryService.GitHub){
                Utils.showNotification("Success", "The file has been saved to GitHub repository.", "success");
            }
            if (repository.service === Eagle.RepositoryService.GitLab){
                Utils.showNotification("Success", "The file has been saved to GitLab repository.", "success");
            }
        });
    }

    /**
     * Performs a Git commit of a graph/palette. Asks user for a file name before saving.
     */
    commitToGitAs = (fileType : Eagle.FileType) : void => {
        console.log("commitToGitAs()");

        // TODO: missing code here
        if (fileType !== Eagle.FileType.Graph){
            Utils.showUserMessage("Not implemented", "Not sure which palette is the right one to commit to git");
            return;
        }

        // create default repository to supply to modal so that the modal is populated with useful defaults
        let defaultRepository: Repository;
        if (fileType === Eagle.FileType.Graph){
            if (this.logicalGraph()){
                defaultRepository = new Repository(this.logicalGraph().fileInfo().repositoryService, this.logicalGraph().fileInfo().repositoryName, this.logicalGraph().fileInfo().repositoryBranch, false);
            }
        } else {
            /*
            if (this.editorPalette()){
                defaultRepository = new Repository(this.editorPalette().fileInfo().repositoryService, this.editorPalette().fileInfo().repositoryName, this.editorPalette().fileInfo().repositoryBranch, false);
            }
            */
        }

        Utils.requestUserGitCommit(defaultRepository, this.getRepositoryList(Eagle.RepositoryService.GitHub),  this.activeFileInfo().path, this.activeFileInfo().name, (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            const repository : Repository = this.getRepository(repositoryService, repositoryName, repositoryBranch);
            if (repository === null){
                console.log("Abort commit");
                return;
            }

            // check which fileInfo object to use, based on the current editor mode
            let activeFileInfo : ko.Observable<FileInfo>;
            if (fileType === Eagle.FileType.Graph){
                if (this.logicalGraph()){
                    activeFileInfo = this.logicalGraph().fileInfo;
                }
            } else {
                /*
                if (this.editorPalette()){
                    activeFileInfo = this.editorPalette().fileInfo;
                }
                */
            }

            activeFileInfo().repositoryService = repositoryService;
            activeFileInfo().repositoryName = repositoryName;
            activeFileInfo().repositoryBranch = repositoryBranch;
            activeFileInfo().path = filePath;
            activeFileInfo().type = fileType;

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(fileName)) {
                fileName = fileName + "." + Utils.getDiagramExtension(fileType);
            }

            // Change the title name.
            activeFileInfo().name = fileName;

            // set the EAGLE version etc according to this running version
            activeFileInfo().updateEagleInfo();

            // flag fileInfo object as modified
            activeFileInfo.valueHasMutated();

            this.saveDiagramToGit(repository, fileType, filePath, fileName, commitMessage);
        });
    };

    /**
     * Performs a Git commit of a graph/palette.
     */
    commitToGit = (fileType : Eagle.FileType) : void => {
        if (this.activeFileInfo().repositoryService === Eagle.RepositoryService.Unknown || this.activeFileInfo().repositoryName === null) {
            Utils.showUserMessage("Error", "There is no repository selected. Please use 'save as' instead!");
            console.log("No repository selected!");
            return;
        }

        // check that filetype is appropriate for a file with this extension
        if (this.activeFileInfo().name === "") {
            if (fileType == Eagle.FileType.Graph) {
                Utils.showUserMessage('Error', 'Graph is not chosen! Open existing or create a new graph.');
            } else if (fileType == Eagle.FileType.Palette) {
                Utils.showUserMessage('Error', 'Palette is not chosen! Open existing or create a new palette.');
            }
            return;
        }

        // prepare the text to display in the modal
        let modalMessage = "";
        if (fileType === Eagle.FileType.Graph){
            modalMessage = "Enter a commit message for this graph";
        } else {
            modalMessage = "Enter a commit message for this palette";
        }

        // request commit message from the user
        Utils.requestUserString("Commit Message", modalMessage, "", false, (completed : boolean, userString : string) : void => {
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // set the EAGLE version etc according to this running version
            this.activeFileInfo().updateEagleInfo();

            // get the repository for this file
            const repository = this.getRepository(this.activeFileInfo().repositoryService, this.activeFileInfo().repositoryName, this.activeFileInfo().repositoryBranch);

            // check that repository was found
            if (repository === null){
                Utils.showUserMessage("Error", "Unable to get find correct repository from the information from the active file.<br/>Service:" + this.activeFileInfo().repositoryService + "<br/>Name:" + this.activeFileInfo().repositoryName + "<br/>Branch:" + this.activeFileInfo().repositoryBranch);
                return;
            }

            this.saveDiagramToGit(repository, fileType, this.activeFileInfo().path, this.activeFileInfo().name, userString);
        });
    };

    /**
     * Saves a graph/palette file to the GitHub repository.
     */
    saveDiagramToGit = (repository : Repository, fileType : Eagle.FileType, filePath : string, fileName : string, commitMessage : string) : void => {
        console.log("saveDiagramToGit() repositoryName", repository.name, "filePath", filePath, "fileName", fileName, "commitMessage", commitMessage);

        // TODO: missing code here
        if (fileType !== Eagle.FileType.Graph){
            Utils.showUserMessage("Not implemented", "Not sure which palette is the right one to commit to git");
            return;
        }

        // get access token for this type of repository
        let token : string;

        switch (repository.service){
            case Eagle.RepositoryService.GitHub:
                token = Eagle.findSettingValue(Utils.GITHUB_ACCESS_TOKEN_KEY);
                break;
            case Eagle.RepositoryService.GitLab:
                token = Eagle.findSettingValue(Utils.GITLAB_ACCESS_TOKEN_KEY);
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
                return;
        }

        // check that access token is defined
        if (token === null) {
            Utils.showUserMessage("Error", "The GitHub access token is not set! To save files on GitHub, set the access token.");
            return;
        }

        const fullFileName : string = Utils.joinPath(filePath, fileName);

        let json : object;
        if (fileType === Eagle.FileType.Graph){
            json = LogicalGraph.toOJSJson(this.logicalGraph());
        } else {
            /*
            json = Palette.toOJSJson(this.editorPalette());
            */
        }

        // validate json
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
            const validatorResult : {valid: boolean, errors: string} = Utils.validateJSON(json, Eagle.DALiuGESchemaVersion.OJS, fileType);
            if (!validatorResult.valid){
                const message = "JSON Output failed validation against internal JSON schema, saving anyway";
                console.error(message, validatorResult.errors);
                Utils.showUserMessage("Error", message + "<br/>" + validatorResult.errors);
                //return;
            }
        }

        const jsonData : object = {
            jsonData: json,
            repositoryBranch: repository.branch,
            repositoryName: repository.name,
            repositoryService: repository.service,
            token: token,
            filename: fullFileName,
            commitMessage: commitMessage
        };

        this.saveFileToRemote(repository, jsonData);
    }

    /**
     * Export file to V3 Json
     */
    exportV3Json = () : void => {
        Utils.showUserMessage("Unsupported feature", "Saving files using the V3 schema is not supported.");

        const fileName : string = this.activeFileInfo().name;

        // set the EAGLE version etc according to this running version
        this.logicalGraph().fileInfo().updateEagleInfo();

        const json = LogicalGraph.toV3Json(this.logicalGraph());

        // validate json
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
            const validatorResult : {valid: boolean, errors: string} = Utils.validateJSON(json, Eagle.DALiuGESchemaVersion.V3, Eagle.FileType.Graph);
            if (!validatorResult.valid){
                const message = "JSON Output failed validation against internal JSON schema, saving anyway";
                console.error(message, validatorResult.errors);
                Utils.showUserMessage("Error", message + "<br/>" + validatorResult.errors);
                //return;
            }
        }

        Utils.httpPostJSON('/saveFileToLocal', json, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            // NOTE: this stuff is a hacky way of saving a file locally
            const blob = new Blob([data]);
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
        });
    }


    /**
     * Export file to AppRef Json
     * This is an experimental new JSON format that moves embedded application
     * nodes out of constructs to the end of the node array, and then refers to
     * them by ID and key within the node
     */
    exportAppRefJson = () : void => {
        const fileName : string = this.activeFileInfo().name;

        // set the EAGLE version etc according to this running version
        this.logicalGraph().fileInfo().updateEagleInfo();

        const json = LogicalGraph.toAppRefJson(this.logicalGraph());

        Utils.httpPostJSON('/saveFileToLocal', json, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            // NOTE: this stuff is a hacky way of saving a file locally
            const blob = new Blob([data]);
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
        });
    }

    /**
     * Loads template palette from the server.
     */
    // TODO: data is not a string here, it is already an object
    loadTemplatePalette = () : void => {
        console.log("loadTemplatePalette()");

        Utils.httpGet("./static/" + Config.templatePaletteFileName, (error : string, data : string) => {
            if (error !== null){
                console.error(error);
                return;
            }

            const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

            const errors: string[] = [];
            const templatePalette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", Config.templatePaletteFileName), errors);

            // show errors (if required)
            if (errors.length > 0 && showErrors){
                Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
            }

            // Extracting data from the palette template.
            Eagle.dataNodes = Utils.buildNodeList(templatePalette, Eagle.CategoryType.Data);
            Eagle.dataCategories = Utils.buildCategoryList(templatePalette, Eagle.CategoryType.Data);
            Eagle.applicationNodes = Utils.buildNodeList(templatePalette, Eagle.CategoryType.Application);
            Eagle.applicationCategories = Utils.buildCategoryList(templatePalette, Eagle.CategoryType.Application);
        });
    }

    loadPalettes = (paletteList: {name:string, filename:string, readonly:boolean}[], callback: (data: Palette[]) => void ) : void => {
        const results: Palette[] = [];
        const complete: boolean[] = [];
        const errors: string[] = [];

        for (let i = 0 ; i < paletteList.length ; i++){
            results.push(null);
            complete.push(false);
            const index = i;

            Utils.httpGet(paletteList[i].filename, (error: string, data: string) => {
                complete[index] = true;

                if  (error !== null){
                    console.error(error);
                    errors.push(error);
                } else {
                    const palette: Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", paletteList[index].name), errors);
                    palette.fileInfo().clear();
                    palette.fileInfo().name = paletteList[index].name;
                    palette.fileInfo().readonly = paletteList[index].readonly;
                    results[index] = palette;
                }

                // check if all requests are now complete, then we can call the callback
                let allComplete = true;
                for (let j = 0 ; j < complete.length ; j++){
                    if (!complete[j]){
                        allComplete = false;
                    }
                }
                if (allComplete){
                    callback(results);
                }

            });
        }
    }

    loadSchemas = () : void => {
        console.log("loadSchemas()");

        Utils.httpGet("./static/" + Config.graphSchemaFileName, (error : string, data : string) => {
            if (error !== null){
                console.error(error);
                return;
            }

            Utils.ojsGraphSchema = JSON.parse(data);

            // NOTE: in the short-term we'll just use the graph schema for palettes
            //       both file formats are base on the OJS format, so they are similar
            Utils.ojsPaletteSchema = JSON.parse(data);

            // NOTE: we don't have a schema for the V3 or appRef versions
            Utils.v3GraphSchema = JSON.parse(data);
            Utils.appRefGraphSchema = JSON.parse(data);
        });
    }

    refreshRepositoryList = () : void => {
        console.log("refreshRepositoryList()");

        GitHub.loadRepoList(this);
        GitLab.loadRepoList(this);
    };

    static reloadTooltips = () : void => {
        // destroy orphaned tooltips and initializing tooltip on document ready.
        $('.tooltip[role="tooltip"]').remove();

        $('[data-toggle="tooltip"]').tooltip({
            boundary: 'window',
            trigger : 'hover',
            delay: { "show": 800, "hide": 100 }
        });
    }

    // TODO: move to Repository class?
    selectRepository = (repository : Repository) : void => {
        console.log("selectRepository(" + repository.name + ")");

        // if we have already fetched data for this repo, just expand or collapse the list as appropriate
        // otherwise fetch the data
        if (repository.fetched()){
            repository.expanded(!repository.expanded());
        } else {
            switch(repository.service){
                case Eagle.RepositoryService.GitHub:
                    GitHub.loadRepoContent(repository);
                    break;
                case Eagle.RepositoryService.GitLab:
                    GitLab.loadRepoContent(repository);
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repository.service + ")");
            }
        }
    };

    selectFolder = (folder : RepositoryFolder) : void => {
        console.log("selectFolder()", folder.name);

        // toggle expanded state
        folder.expanded(!folder.expanded());
    }

    selectFile = (file : RepositoryFile) : void => {
        console.log("selectFile() repo:", file.repository.name, "branch:", file.repository.branch, "path:", file.path, "file:", file.name, "type:", file.type);

        // check if the current file has been modified
        let isModified = false;
        switch (file.type){
            case Eagle.FileType.Graph:
                isModified = this.logicalGraph().fileInfo().modified;
                break;
            case Eagle.FileType.Palette:
                const palette: Palette = this.findPalette(file.name, false);
                isModified = palette !== null && palette.fileInfo().modified;
                break;
            case Eagle.FileType.JSON:
                isModified = this.activeFileInfo().modified;
                break;
        }

        // if the file is modified, get the user to confirm they want to overwrite changes
        if (isModified && Eagle.findSetting(Utils.CONFIRM_DISCARD_CHANGES).value()){
            Utils.requestUserConfirm("Discard changes?", "Opening a new file will discard changes. Continue?", "OK", "Cancel", (confirmed : boolean) : void => {
                if (!confirmed){
                    console.log("selectFile() cancelled");
                    return;
                }

                this.openRemoteFile(file);
            });
        } else {
            this.openRemoteFile(file);
        }
    }

    insertFile = (file : RepositoryFile) : void => {
        console.log("insertFile() repo:", file.repository.name, "branch:", file.repository.branch, "path:", file.path, "file:", file.name, "type:", file.type);

        this.insertRemoteFile(file);
    }

    refreshRepository = (repository : Repository) : void => {
        switch(repository.service){
            case Eagle.RepositoryService.GitHub:
                GitHub.loadRepoContent(repository);
                break;
            case Eagle.RepositoryService.GitLab:
                GitLab.loadRepoContent(repository);
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
        }
    }

    // TODO: update with custom modal to ask user for repository service and url at the same time
    addCustomRepository = () : void => {
        Utils.requestUserAddCustomRepository((completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string) : void => {
            console.log("requestUserAddCustomRepository callback", completed, repositoryService, repositoryName);

            if (!completed){
                console.log("No repo entered");
                return;
            }

            if (repositoryName.trim() == ""){
                Utils.showUserMessage("Error", "Repository name is empty!");
                return;
            }

            if (repositoryBranch.trim() == ""){
                Utils.showUserMessage("Error", "Repository branch is empty! If you wish to use the master branch, please enter 'master'.");
                return;
            }

            // debug
            console.log("User entered new repo name:", repositoryService, repositoryName, repositoryBranch);

            // add extension to userString to indicate repository service
            const localStorageKey : string = Utils.getLocalStorageKey(repositoryService, repositoryName, repositoryBranch);
            if (localStorageKey === null){
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repositoryService + ")");
                return;
            }

            // Adding the repo name into the local browser storage.
            localStorage.setItem(localStorageKey, Utils.getLocalStorageValue(repositoryService, repositoryName, repositoryBranch));

            // Reload the repository lists
            if (repositoryService === Eagle.RepositoryService.GitHub)
                GitHub.loadRepoList(this);
            if (repositoryService === Eagle.RepositoryService.GitLab)
                GitLab.loadRepoList(this);
        });
    };

    removeCustomRepository = (repository : Repository) : void => {
        // if settings dictates that we don't confirm with user, remove immediately
        if (!Eagle.findSetting(Utils.CONFIRM_REMOVE_REPOSITORES).value()){
            this._removeCustomRepository(repository);
            return;
        }

        // otherwise, check with user
        Utils.requestUserConfirm("Remove Custom Repository", "Remove this repository from the list?", "OK", "Cancel", (confirmed : boolean) =>{
            if (!confirmed){
                console.log("User aborted removeCustomRepository()");
                return;
            }

            this._removeCustomRepository(repository);
        });
    };

    private _removeCustomRepository = (repository : Repository) : void => {
        // abort if the repository is one of those that is builtin to the app
        if (repository.isBuiltIn){
            console.warn("User attempted to remove a builtin repository from the list");
            return;
        }

        // remove from localStorage
        switch(repository.service){
            case Eagle.RepositoryService.GitHub:
                localStorage.removeItem(repository.name + ".repository");
                localStorage.removeItem(repository.name + ".github_repository");
                localStorage.removeItem(repository.name + "|" + repository.branch + ".github_repository_and_branch");
                GitHub.loadRepoList(this);
                break;
            case Eagle.RepositoryService.GitLab:
                localStorage.removeItem(repository.name + ".gitlab_repository");
                localStorage.removeItem(repository.name + "|" + repository.branch + ".gitlab_repository_and_branch");
                GitLab.loadRepoList(this);
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repository.service + ")");
                return;
        }
    }

    sortRepositories = () : void => {
        this.repositories.sort(Repository.repositoriesSortFunc);
    }

    openRemoteFile = (file : RepositoryFile) : void => {
        // flag file as being fetched
        file.isFetching(true);

        // check the service required to fetch the file
        let openRemoteFileFunc;
        switch (file.repository.service){
            case Eagle.RepositoryService.GitHub:
                openRemoteFileFunc = GitHub.openRemoteFile;
                break;
            case Eagle.RepositoryService.GitLab:
                openRemoteFileFunc = GitLab.openRemoteFile;
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
                Utils.showUserMessage("Error", "Failed to load a file!");
                console.error(error);
                return;
            }

            // if setting dictates, show errors during loading
            const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();


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

            switch (fileTypeLoaded){
                case Eagle.FileType.Graph:
                    // attempt to determine schema version from FileInfo
                    const schemaVersion: Eagle.DALiuGESchemaVersion = Utils.determineSchemaVersion(dataObject);
                    //console.log("!!!!! Determined Schema Version", schemaVersion);

                    const errors: string[] = [];

                    // use the correct parsing function based on schema version
                    switch (schemaVersion){
                        case Eagle.DALiuGESchemaVersion.AppRef:
                            this.logicalGraph(LogicalGraph.fromAppRefJson(dataObject, file, errors));
                            break;
                        case Eagle.DALiuGESchemaVersion.V3:
                            Utils.showUserMessage("Unsupported feature", "Loading files using the V3 schema is not supported.");
                            this.logicalGraph(LogicalGraph.fromV3Json(dataObject, file, errors));
                            break;
                        case Eagle.DALiuGESchemaVersion.OJS:
                        case Eagle.DALiuGESchemaVersion.Unknown:
                            this.logicalGraph(LogicalGraph.fromOJSJson(dataObject, file, errors));
                            break;
                    }

                    if (errors.length > 0){
                        if (showErrors){
                            Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
                        }
                    } else {
                        Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
                    }

                    // if the fileType is the same as the current mode, update the activeFileInfo with details of the repository the file was loaded from
                    this.updateActiveFileInfo(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
                    break;

                case Eagle.FileType.Palette:
                    this._remotePaletteLoaded(file, data);
                    break;

                default:
                    // Show error message
                    Utils.showUserMessage("Error", "The file type is neither graph nor palette!");
            }
        });
    };

    insertRemoteFile = (file : RepositoryFile) : void => {
        // flag file as being fetched
        file.isFetching(true);

        // check the service required to fetch the file
        let insertRemoteFileFunc;
        switch (file.repository.service){
            case Eagle.RepositoryService.GitHub:
                insertRemoteFileFunc = GitHub.openRemoteFile;
                break;
            case Eagle.RepositoryService.GitLab:
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

            // if setting dictates, show errors during loading
            const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

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
            const schemaVersion: Eagle.DALiuGESchemaVersion = Utils.determineSchemaVersion(dataObject);
            //console.log("!!!!! Determined Schema Version", schemaVersion);

            const errors: string[] = [];

            // use the correct parsing function based on schema version
            switch (schemaVersion){
                case Eagle.DALiuGESchemaVersion.AppRef:
                    this.insertGraph(LogicalGraph.fromAppRefJson(dataObject, file, errors));
                    this.flagActiveDiagramHasMutated();
                    break;
                case Eagle.DALiuGESchemaVersion.V3:
                    Utils.showUserMessage("Unsupported feature", "Loading files using the V3 schema is not supported.");
                    this.insertGraph(LogicalGraph.fromV3Json(dataObject, file, errors));
                    this.flagActiveDiagramHasMutated();
                    break;
                case Eagle.DALiuGESchemaVersion.OJS:
                case Eagle.DALiuGESchemaVersion.Unknown:
                    this.insertGraph(LogicalGraph.fromOJSJson(dataObject, file, errors));
                    this.flagActiveDiagramHasMutated();
                    break;
            }

            if (errors.length > 0){
                if (showErrors){
                    Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
                }
            } else {
                Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
            }
        });
    };

    private _remotePaletteLoaded = (file : RepositoryFile, data : string) : void => {
        // load the remote palette into EAGLE's palettes object.

        // check palette is not already loaded
        const alreadyLoadedPalette : Palette = this.findPaletteByFile(file);

        // if dictated by settings, reload the palette immediately
        if (alreadyLoadedPalette !== null && Eagle.findSetting(Utils.CONFIRM_RELOAD_PALETTES).value()){
            Utils.requestUserConfirm("Reload Palette?", "This palette is already loaded, do you wish to load it again?", "Yes", "No", (confirmed : boolean) : void => {
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
        const errors: string[] = [];
        this.palettes.unshift(Palette.fromOJSJson(data, file, errors));

        if (errors.length > 0){
            // TODO: do stuff with the errors
        }

        this.leftWindow().shown(true);
        Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");

        // HACK to update the tooltips once the new palette has been rendered
        setTimeout(Eagle.reloadTooltips, 100);
    }

    private updateActiveFileInfo = (repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, path : string, name : string) : void => {
        console.log("updateActiveFileInfo(): repositoryService:", repositoryService, "repositoryName:", repositoryName, "repositoryBranch:", repositoryBranch, "path:", path, "name:", name);

        // update the activeFileInfo with details of the repository the file was loaded from
        this.activeFileInfo().repositoryName = repositoryName;
        this.activeFileInfo().repositoryBranch = repositoryBranch;
        this.activeFileInfo().repositoryService = repositoryService;
        this.activeFileInfo().path = path;
        this.activeFileInfo().name = name;

        // communicate to knockout that the value of the fileInfo has been modified (so it can update UI)
        this.logicalGraph().fileInfo.valueHasMutated();

    }

    findPaletteByFile = (file : RepositoryFile) : Palette => {
        for (let i = 0 ; i < this.palettes().length ; i++){
            const p : Palette = this.palettes()[i];

            if (p.fileInfo().name === file.name){
                return p;
            }
        }

        return null;
    }

    closePalette = (palette : Palette) : void => {
        for (let i = 0 ; i < this.palettes().length ; i++){
            const p = this.palettes()[i];

            if (p.fileInfo().name === palette.fileInfo().name){

                // check if the palette is modified, and if so, ask the user to confirm they wish to close
                if (p.fileInfo().modified){
                    Utils.requestUserConfirm("Close Modified Palette", "Are you sure you wish to close this modified palette?", "Close", "Cancel", (confirmed : boolean) : void => {
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
    }

    // TODO: shares some code with saveFileToLocal(), we should try to factor out the common stuff at some stage
    savePaletteToDisk = (palette : Palette) : void => {
        console.log("savePaletteToDisk()", palette.fileInfo().name);

        const fileName = palette.fileInfo().name;

        // clone the palette and remove github info ready for local save
        const p_clone : Palette = palette.clone();
        p_clone.fileInfo().removeGitInfo();
        p_clone.fileInfo().updateEagleInfo();
        const json = Palette.toOJSJson(p_clone);

        Utils.httpPostJSON('/saveFileToLocal', json, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            // NOTE: this stuff is a hacky way of saving a file locally
            const blob = new Blob([data]);
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();

            // since changes are now stored locally, the file will have become out of sync with the GitHub repository, so the association should be broken
            // clear the modified flag
            palette.fileInfo().modified = false;
            palette.fileInfo().repositoryService = Eagle.RepositoryService.Unknown;
            palette.fileInfo().repositoryName = "";
            palette.fileInfo().gitUrl = "";
            palette.fileInfo().sha = "";
            palette.fileInfo.valueHasMutated();
        });
    }

    // TODO: shares some code with savePaletteToGit(), we should try to factor out the common stuff at some stage
    savePaletteToGit = (palette: Palette): void => {
        console.log("savePaletteToGit()", palette.fileInfo().name);

        const defaultRepository: Repository = new Repository(palette.fileInfo().repositoryService, palette.fileInfo().repositoryName, palette.fileInfo().repositoryBranch, false);

        Utils.requestUserGitCommit(defaultRepository, this.getRepositoryList(Eagle.RepositoryService.GitHub),  palette.fileInfo().path, palette.fileInfo().name, (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            const repository : Repository = this.getRepository(repositoryService, repositoryName, repositoryBranch);
            if (repository === null){
                console.log("Abort commit");
                return;
            }

            // update the fileInfo of the palette
            palette.fileInfo().modified = false;
            palette.fileInfo().repositoryService = repositoryService;
            palette.fileInfo().repositoryName = repositoryName;
            palette.fileInfo().repositoryBranch = repositoryBranch;
            palette.fileInfo().path = filePath;
            palette.fileInfo().type = Eagle.FileType.Palette;
            palette.fileInfo().name = fileName;

            // set the EAGLE version etc according to this running version
            palette.fileInfo().updateEagleInfo();

            // flag fileInfo object as modified
            palette.fileInfo.valueHasMutated();

            // get access token for this type of repository
            let token : string;

            switch (repositoryService){
                case Eagle.RepositoryService.GitHub:
                    token = Eagle.findSettingValue(Utils.GITHUB_ACCESS_TOKEN_KEY);
                    break;
                case Eagle.RepositoryService.GitLab:
                    token = Eagle.findSettingValue(Utils.GITLAB_ACCESS_TOKEN_KEY);
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
                    return;
            }

            // check that access token is defined
            if (token === null) {
                Utils.showUserMessage("Error", "The GitHub access token is not set! To save files on GitHub, set the access token.");
                return;
            }

            const fullFileName : string = Utils.joinPath(filePath, fileName);

            const json = Palette.toOJSJson(palette);

            const jsonData : object = {
                jsonData: json,
                repositoryBranch: repository.branch,
                repositoryName: repository.name,
                repositoryService: repository.service,
                token: token,
                filename: fullFileName,
                commitMessage: commitMessage
            };

            this.saveFileToRemote(repository, jsonData);
        });
    }

    setTranslatorUrl = () : void => {
        const translatorURLSetting : Setting = Eagle.findSetting(Utils.TRANSLATOR_URL);

        Utils.requestUserString("Translator Url", "Enter the Translator Url", translatorURLSetting.value(), false, (completed : boolean, userString : string) : void => {
            // abort if user cancelled the action
            if (!completed)
                return;

            translatorURLSetting.value(userString);
        });
    };

    saveAsPNG = () : void => {
        Utils.saveAsPNG('#logicalGraphD3Div svg', this.logicalGraph().fileInfo().name);
    };

    toggleCollapseAllGroups = () : void => {
        console.log("toggleCollapseAllGroups");

        // first work out whether we should be collapsing or expanding
        let numCollapsed: number = 0;
        let numExpanded: number = 0;
        for (let i = 0 ; i < this.logicalGraph().getNodes().length ; i++){
            const node: Node = this.logicalGraph().getNodes()[i];

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
        for (let i = 0 ; i < this.logicalGraph().getNodes().length ; i++){
            const node: Node = this.logicalGraph().getNodes()[i];

            if (node.isGroup()){
                node.setCollapsed(collapse);
            }
        }

        this.flagActiveDiagramHasMutated();
    }

    toggleCollapseAllNodes = () : void => {
        console.log("toggleCollapseAllNodes");

        // first work out whether we should be collapsing or expanding
        let numCollapsed: number = 0;
        let numExpanded: number = 0;
        for (let i = 0 ; i < this.logicalGraph().getNodes().length ; i++){
            const node: Node = this.logicalGraph().getNodes()[i];

            if (!node.isGroup()){
                if (node.isCollapsed()){
                    numCollapsed += 1;
                } else {
                    numExpanded += 1;
                }
            }
        }
        const collapse: boolean = numExpanded > numCollapsed;

        // now loop through and collapse or expand all group nodes
        for (let i = 0 ; i < this.logicalGraph().getNodes().length ; i++){
            const node: Node = this.logicalGraph().getNodes()[i];

            if (!node.isGroup()){
                node.setCollapsed(collapse);
            }
        }

        this.flagActiveDiagramHasMutated();
    }

    showAbout = () : void => {
        $('#aboutModal').modal('show');
    }

    runTutorial = (name : string) : void => {
        console.log("runTutorial(" + name + ")");

        // start the tutorial
        ij(name).setOption("showStepNumbers", false).setOption("skipLabel", "Exit").start();
    }

    onlineHelp = () : void => {
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

    openSettings = () : void => {
        Utils.showSettingsModal();
    }

    openShortcuts = () : void => {
        Utils.showShortcutsModal();
    }

    private static findSetting = (key : string) : Setting => {
        // check if Eagle constructor has not been run (usually the case when this module is being used from a tools script)
        if (typeof Eagle.settings === 'undefined'){
            return null;
        }

        for (let i = 0 ; i < Eagle.settings().length ; i++){
            const s = Eagle.settings()[i];

            if (s.getKey() === key){
                return s;
            }
        }
        return null;
    }

    static findSettingValue = (key : string) : any => {
        const setting = Eagle.findSetting(key);

        if (setting === null){
            console.warn("No setting", key);
            return null;
        }

        return setting.value();
    }

    getSettings = () : Setting[] => {
        return Eagle.settings();
    }

    getShortcuts = () : KeyboardShortcut[] => {
        return Eagle.shortcuts();
    }

    resetSettingsDefaults = () : void => {
        for (let i = 0 ; i < Eagle.settings().length ; i++){
            Eagle.settings()[i].resetDefault();
        }
    }

    /* TODO: remove this */
    flagActiveDiagramHasMutated = () : void => {
        // flag diagram as mutated
        this.logicalGraph.valueHasMutated();
    }

    addEdgeToLogicalGraph = () : void => {
        // check that there is at least one node in the graph, otherwise it is difficult to create an edge
        if (this.logicalGraph().getNumNodes() === 0){
            Utils.showUserMessage("Error", "Can't add an edge to a graph with zero nodes.");
            return;
        }

        // if input edge is null, then we are creating a new edge here, so initialise it with some default values
        const edge = new Edge(this.logicalGraph().getNodes()[0].getKey(), "", this.logicalGraph().getNodes()[0].getKey(), "", "", false);

        // display edge editing modal UI
        Utils.requestUserEditEdge(edge, this.logicalGraph(), (completed: boolean, edge: Edge) => {
            if (!completed){
                console.log("User aborted addEdgeToLogicalGraph()");
                return;
            }

            // validate edge
            const isValid: Eagle.LinkValid = Edge.isValid(this.logicalGraph(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.isLoopAware(), false, true);
            if (isValid === Eagle.LinkValid.Invalid || isValid === Eagle.LinkValid.Unknown){
                Utils.showUserMessage("Error", "Invalid edge");
                return;
            }

            // new edges might require creation of new nodes, don't use addEdgeComplete() here!
            this.logicalGraph().addEdge(edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), edge.isLoopAware(), () => {
                // trigger the diagram to re-draw with the modified edge
                this.flagActiveDiagramHasMutated();
            });
        });
    }

    editSelectedEdge = () : void => {
        if (this.selectedEdge() === null){
            console.log("Unable to edit selected edge: No edge selected");
            return;
        }

        // clone selected edge so that no changes to the original can be made by the user request modal
        const clone: Edge = this.selectedEdge().clone();

        Utils.requestUserEditEdge(clone, this.logicalGraph(), (completed: boolean, edge: Edge) => {
            if (!completed){
                console.log("User aborted editSelectedEdge()");
                return;
            }

            // validate edge
            const isValid: Eagle.LinkValid = Edge.isValid(this.logicalGraph(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.isLoopAware(), false, true);
            if (isValid === Eagle.LinkValid.Invalid || isValid === Eagle.LinkValid.Unknown){
                Utils.showUserMessage("Error", "Invalid edge");
                return;
            }

            // new edges might require creation of new nodes, we delete the existing edge and then create a new one using the full new edge pathway
            this.deleteSelectedEdge(true);
            this.logicalGraph().addEdge(edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), edge.isLoopAware(), () => {
                // trigger the diagram to re-draw with the modified edge
                this.flagActiveDiagramHasMutated();
            });
        });
    }

    deleteSelectedEdge = (suppressUserConfirmationRequest: boolean) : void => {
        if (this.selectedEdge() === null){
            console.log("Unable to delete selected edge: No edge selected");
            return;
        }

        // skip confirmation if setting dictates
        if (!Eagle.findSetting(Utils.CONFIRM_DELETE_EDGES).value() || suppressUserConfirmationRequest){
            this._deleteSelectedEdge();
            return;
        }

        // build a user-readable name for this node
        const srcNodeName : string = this.logicalGraph().findNodeByKey(this.selectedEdge().getSrcNodeKey()).getName();
        const destNodeName : string = this.logicalGraph().findNodeByKey(this.selectedEdge().getDestNodeKey()).getName();

        // request confirmation from user
        Utils.requestUserConfirm("Delete edge from " + srcNodeName + " to " + destNodeName + "?", "Are you sure you wish to delete this edge?", "Yes", "No", (confirmed : boolean) : void => {
            if (!confirmed){
                console.log("User aborted deleteSelectedEdge()");
                return;
            }

            this._deleteSelectedEdge();
        });
    }

    private _deleteSelectedEdge = () : void => {
        // remove the edge
        this.logicalGraph().removeEdgeById(this.selectedEdge().getId());
        this.logicalGraph().fileInfo().modified = true;

        // no edge left to be selected
        this.selectedEdge(null);
        this.rightWindow().mode(Eagle.RightWindowMode.Repository);

        // flag the diagram as mutated so that the graph renderer will update
        this.flagActiveDiagramHasMutated();
    }

    duplicateSelectedNode = () : void => {
        if (this.selectedNode() === null){
            console.log("Unable to duplicate selected node: No node selected");
            return;
        }

        // duplicate the node
        if (this.selectedLocation() === Eagle.FileType.Graph){
            this.addNodeToLogicalGraph(this.selectedNode());
        }

        if (this.selectedLocation() === Eagle.FileType.Palette){
            this.addSelectedNodeToPalette();
        }
    }

    addSelectedNodeToPalette = () : void => {
        console.log("addSelectedNodeToPalette()");

        // build a list of palette names
        const paletteNames: string[] = this.buildWritablePaletteNamesList();

        // ask user to select the destination node
        Utils.requestUserChoice("Destination Palette", "Please select the palette to which you'd like to add the node", paletteNames, 0, true, "New Palette Name", (completed : boolean, userChoiceIndex: number, userCustomChoice : string) => {
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

            // check if clone has embedded applications, if so, add them to destination palette and remove
            if (this.selectedNode().hasInputApplication()){
                destinationPalette.addNode(this.selectedNode().getInputApplication(), true);
            }
            if (this.selectedNode().hasOutputApplication()){
                destinationPalette.addNode(this.selectedNode().getOutputApplication(), true);
            }
            if (this.selectedNode().hasExitApplication()){
                destinationPalette.addNode(this.selectedNode().getExitApplication(), true);
            }

            // add clone to palette
            destinationPalette.addNode(this.selectedNode(), true);

            // mark the palette as modified
            destinationPalette.fileInfo().modified = true;
        });
    }

    deleteSelectedNode = () : void => {
        if (this.selectedNode() === null){
            console.log("Unable to delete selected node: No node selected");
            return;
        }

        // skip confirmation if setting dictates
        if (!Eagle.findSetting(Utils.CONFIRM_DELETE_NODES).value()){
            this._deleteSelectedNode();
            return;
        }

        // request confirmation from user
        Utils.requestUserConfirm("Delete node: " + this.selectedNode().getName() + "?", "Are you sure you wish to delete this node (and its children)?", "Yes", "No", (confirmed : boolean) : void => {
            if (!confirmed){
                console.log("User aborted deleteSelectedNode()");
                return;
            }

            this._deleteSelectedNode();
        });
    }

    private _deleteSelectedNode = () : void => {
        let found: boolean = false;
        let error: string = "Unknown error";

        if (this.selectedLocation() === Eagle.FileType.Graph){
            // delete the node from the logical graph
            this.logicalGraph().removeNodeByKey(this.selectedNode().getKey());
            this.logicalGraph().fileInfo().modified = true;
            found = true;
        }

        if (this.selectedLocation() === Eagle.FileType.Palette){
            // delete the node from a palette
            for (let i = 0 ; i < this.palettes().length; i++){
                const palette = this.palettes()[i];

                for (let j = 0 ; j < palette.getNodes().length; j++){
                    const node = palette.getNodes()[j];

                    if (node === this.selectedNode()){
                        // check if palette is readonly
                        if (palette.fileInfo().readonly){
                            error = "Palette is readonly";
                        } else {
                            if (node.isReadonly()){
                                error = "Node is readonly";
                            } else {
                                found = true;
                                // TODO: this could be faster if we write a removeNodeAtIndex() or similar
                                palette.removeNodeByKey(node.getKey());
                                palette.fileInfo().modified = true;
                            }
                        }
                    }
                }
            }
        }

        if (found){
            // no node left to be selected
            this.selectedNode(null);
            this.rightWindow().mode(Eagle.RightWindowMode.Repository);

            // flag the diagram as mutated so that the graph renderer will update
            this.flagActiveDiagramHasMutated();
        } else {
            Utils.showUserMessage("Error", error);
        }
    }

    addNodeToLogicalGraph = (node : Node) : void => {
        //console.log("addNodeToLogicalGraph()", node.getName(), node.getCategory(), node.getInputPorts().length, node.getOutputPorts().length, node.getFields().length);
        let pos = {x:0, y:0};

        // get new position for node
        if (Eagle.nodeDropLocation.x === 0 && Eagle.nodeDropLocation.y === 0){
            pos = this.getNewNodePosition();
        } else if (Eagle.nodeDropLocation){
            pos = Eagle.nodeDropLocation;
        } else {
            //if this is fired something has gone terribly wrong
            pos = {x:0, y:0};
            Utils.showNotification("Error", "Unexpected error occurred", "warning");
        }

        this.logicalGraph().addNode(node, pos.x, pos.y, (newNode: Node) => {
            // make sure the new node is selected
            this.setSelection(Eagle.RightWindowMode.NodeInspector, newNode, Eagle.FileType.Graph);
            Eagle.nodeDropLocation = {x:0, y:0};

            this.logicalGraph.valueHasMutated();
        });
    }

    addGraphNodesToPalette = () : void => {
        //console.log("addGraphNodesToPalette()");

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
            for (let i = 0 ; i < this.logicalGraph().getNodes().length ; i++){
                const node : Node = this.logicalGraph().getNodes()[i];

                // check if clone has embedded applications, if so, add them to destination palette and remove
                if (node.hasInputApplication()){
                    destinationPalette.addNode(node.getInputApplication(), false);
                }
                if (node.hasOutputApplication()){
                    destinationPalette.addNode(node.getOutputApplication(), false);
                }
                if (node.hasExitApplication()){
                    destinationPalette.addNode(node.getExitApplication(), false);
                }

                destinationPalette.addNode(node, false);
            }

            // mark the palette as modified
            destinationPalette.fileInfo().modified = true;
        });
    }

    private buildWritablePaletteNamesList = () : string[] => {
        const paletteNames : string[] = [];
        for (let i = 0 ; i < this.palettes().length; i++){
            // skip the dynamically generated palette that contains all nodes
            if (this.palettes()[i].fileInfo().name === Palette.DYNAMIC_PALETTE_NAME){
                continue;
            }
            // skip the built-in palette
            if (this.palettes()[i].fileInfo().name === Palette.BUILTIN_PALETTE_NAME){
                continue;
            }
            // skip read-only palettes as well
            if (this.palettes()[i].fileInfo().readonly){
                continue;
            }

            paletteNames.push(this.palettes()[i].fileInfo().name);
        }

        return paletteNames;
    }

    private findPalette = (name: string, createIfNotFound: boolean) : Palette => {
        let p: Palette = null;

        // look for palette in open palettes
        for (let i = 0 ; i < this.palettes().length ; i++){
            if (this.palettes()[i].fileInfo().name === name){
                p = this.palettes()[i];
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
        Utils.showNotification("EAGLE", "Fetching data from Docker Hub", "info");

        const that = this;
        const username = Eagle.findSettingValue(Utils.DOCKER_HUB_USERNAME);

        // request eagle server to fetch a list of docker hub images
        Utils.httpPostJSON("/getDockerImages", {username:username}, function(error : string, data: any){
            if (error != null){
                console.error(error);
                return;
            }

            // build list of image strings
            const images: string[] = [];
            for (let i = 0 ; i < data.results.length ; i++){
                images.push(data.results[i].user + "/" + data.results[i].name);
            }

            // present list of image names to user
            Utils.requestUserChoice("Docker Hub", "Choose an image", images, -1, false, "", function(completed: boolean, userChoiceIndex: number){
                if (!completed){
                    return;
                }

                const imageName: string = images[userChoiceIndex];

                Utils.showNotification("EAGLE", "Fetching data for " + imageName + " from Docker Hub", "info");

                // request eagle server to fetch a list of tags for the given docker image
                Utils.httpPostJSON("/getDockerImageTags", {imagename:imageName}, function(error: string, data: any){
                    if (error != null){
                        console.error(error);
                        return;
                    }

                    const tags: string[] = [];
                    for (let i = 0 ; i < data.results.length; i++){
                        tags.push(data.results[i].name);
                    }

                    // present list of tags to user
                    Utils.requestUserChoice("Docker Hub", "Choose a tag for image " + imageName, tags, -1, false, "", function(completed: boolean, userChoiceIndex: number){
                        if (!completed){
                            return;
                        }

                        const tag = data.results[userChoiceIndex].name;
                        const digest = data.results[userChoiceIndex].images[0].digest;

                        // get references to image, tag and digest fields in this component
                        const imageField: Field = that.selectedNode().getFieldByName("image");
                        const tagField: Field = that.selectedNode().getFieldByName("tag");
                        const digestField: Field = that.selectedNode().getFieldByName("digest");

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
                    });
                });
            });
        });
    }

    showExplorePalettes = () : void => {
        Utils.showPalettesModal(this);
    }

    /**
     * Adds an input port to the selected node via HTML.
     */
    addInputPortHTML = () : void => {
        const node: Node = <Node>this.getSelection();

        // check whether node already has maximum number of ports
        const maxPorts: number = Eagle.getCategoryData(node.getCategory()).maxInputs;

        if (node.getInputPorts().length >= maxPorts ){
            Utils.showUserMessage("Error", "This node may not contain more input ports. Maximum is " + maxPorts + " for " + node.getCategory() + " nodes.");
            return;
        }

        this.editPort(<Node>node, Eagle.ModalType.Add, null, true);
    }

    /**
     * Adds an output port to the selected node via HTML arguments.
     */
    addOutputPortHTML = () : void => {
        const node: Node = <Node>this.getSelection();

        // check whether node already has maximum number of ports
        const maxPorts: number = Eagle.getCategoryData(node.getCategory()).maxOutputs;

        if (node.getOutputPorts().length >= maxPorts ){
            Utils.showUserMessage("Error", "This node may not contain more output ports. Maximum is " + maxPorts + " for " + node.getCategory() + " nodes.");
            return;
        }

        this.editPort(<Node>node, Eagle.ModalType.Add, null, false);
    }

    /**
     * Adds an field to the selected node via HTML.
     */
    addFieldHTML = () : void => {
        const node = this.getSelection();
        this.editField(<Node>node, Eagle.ModalType.Add, null);
    }

    changeNodeParent = () : void => {
        // build list of node name + ids (exclude self)
        const nodeList : string[] = [];
        let selectedChoiceIndex = 0;

        // build list of nodes that are candidates to be the parent
        for (let i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            const node : Node = this.logicalGraph().getNodes()[i];

            // if this node is already the parent, note its index, so that we can preselect this parent node in the modal dialog
            if (node.getKey() === this.selectedNode().getParentKey()){
                selectedChoiceIndex = i;
            }

            // a node can't be its own parent
            if (node.getKey() === this.selectedNode().getKey()){
                continue;
            }

            // only group (construct) nodes can be parents
            if (!node.isGroup()){
                continue;
            }

            nodeList.push(node.getName() + " : " + node.getKey());
        }

        // add "None" to the list of possible parents
        nodeList.push("None : 0");

        // ask user to choose a parent
        Utils.requestUserChoice("Node Parent Id", "Select a parent node", nodeList, selectedChoiceIndex, false, "", (completed : boolean, userChoiceIndex: number) => {
            if (!completed)
                return;

            const choice: string = nodeList[userChoiceIndex];

            // change the parent
            const newParentKey : number = parseInt(choice.substring(choice.lastIndexOf(" ") + 1), 10);

            // key '0' is a special case
            if (newParentKey === 0){
                this.selectedNode().setParentKey(null);
            } else {
                this.selectedNode().setParentKey(newParentKey);
            }

            // refresh the display
            this.selectedNode.valueHasMutated();
            this.flagActiveDiagramHasMutated();
        });
    }

    changeNodeSubject = () : void => {
        // build list of node name + ids (exclude self)
        const nodeList : string[] = [];
        let selectedChoiceIndex = 0;

        // build list of nodes that are candidates to be the subject
        for (let i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            const node : Node = this.logicalGraph().getNodes()[i];

            // if this node is already the subject, note its index, so that we can preselect this subject node in the modal dialog
            if (node.getKey() === this.selectedNode().getSubjectKey()){
                selectedChoiceIndex = i;
            }

            // comment and description nodes can't be the subject of comment nodes
            if (node.getCategory() === Eagle.Category.Comment || node.getCategory() === Eagle.Category.Description){
                continue;
            }

            nodeList.push(node.getName() + " : " + node.getKey());
        }

        // ask user for parent
        Utils.requestUserChoice("Node Subject Id", "Select a subject node", nodeList, selectedChoiceIndex, false, "", (completed : boolean, userChoiceIndex: number) => {
            if (!completed)
                return;

            const choice = nodeList[userChoiceIndex];

            // change the subject
            const newSubjectKey : number = parseInt(choice.substring(choice.lastIndexOf(" ") + 1), 10);
            this.selectedNode().setSubjectKey(newSubjectKey);
            this.selectedNode.valueHasMutated();
            this.flagActiveDiagramHasMutated();
        });
    }

    selectEdge = (nodeKey : number, portId : string) : void => {
        for (let i = 0 ; i < this.logicalGraph().getEdges().length; i++){
            const edge : Edge = this.logicalGraph().getEdges()[i];

            if (edge.getSrcNodeKey() === nodeKey && edge.getSrcPortId() === portId ||
                edge.getDestNodeKey() === nodeKey && edge.getDestPortId() === portId){
                this.selectedEdge(edge);
                this.selectedNode(null);
                this.setSelection(Eagle.RightWindowMode.EdgeInspector, edge, Eagle.FileType.Graph);
                return;
            }
        }
    }

    removePortFromNodeByIndex = (node : Node, index : number, input : boolean) : void => {
        console.log("removePortFromNodeByIndex(): node", node.getName(), "index", index, "input", input);

        if (node === null){
            console.warn("Could not remove port from null node");
            return;
        }

        // remember port id
        let portId;
        if (input){
            portId = node.getInputPorts()[index].getId();
        } else {
            portId = node.getOutputPorts()[index].getId();
        }

        console.log("Found portId to remove:", portId);

        // remove port
        if (input){
            node.getInputPorts().splice(index, 1);
        } else {
            node.getOutputPorts().splice(index, 1);
        }

        // remove any edges connected to that port
        const edges : Edge[] = this.logicalGraph().getEdges();

        for (let i = edges.length - 1; i >= 0; i--){
            if (edges[i].getSrcPortId() === portId || edges[i].getDestPortId() === portId){
                console.log("Remove incident edge", edges[i].getSrcPortId(), "->", edges[i].getDestPortId());
                edges.splice(i, 1);
            }
        }
    }

    // dragdrop
    nodeDragStart = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        // retrieve data about the node being dragged
        // NOTE: I found that using $(e.target).data('palette-index'), using JQuery, sometimes retrieved a cached copy of the attribute value, which broke this functionality
        //       Using the native javascript works better, it always fetches the current value of the attribute
        Eagle.nodeDragPaletteIndex = parseInt(e.target.getAttribute('data-palette-index'), 10);
        Eagle.nodeDragComponentIndex = parseInt(e.target.getAttribute('data-component-index'), 10);

        // discourage the rightWindow and navbar as drop targets
        $(".rightWindow").addClass("noDropTarget");
        $(".navbar").addClass("noDropTarget");

        // grab and set the node's icon and sets it as drag image.
        const drag = e.target.getElementsByClassName('input-group-prepend')[0] as HTMLElement;
        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(drag, 0, 0);

        return true;
    }

    nodeDragEnd = () : boolean => {
        $(".rightWindow").removeClass("noDropTarget");
        $(".navbar").removeClass("noDropTarget");
        return true;
    }

    nodeDragOver = () : boolean => {
        return false;
    }

    nodeDropLogicalGraph = (eagle : Eagle, e : JQueryEventObject) : void => {
        // keep track of the drop location
        Eagle.nodeDropLocation = this.getNodeDropLocation(e);

        // determine dropped node
        const sourceComponent : Node = this.palettes()[Eagle.nodeDragPaletteIndex].getNodes()[Eagle.nodeDragComponentIndex];

        this.addNodeToLogicalGraph(sourceComponent);
    }

    nodeDropPalette = (eagle: Eagle, e: JQueryEventObject) : void => {
        // determine dropped node
        const sourceComponent : Node = this.palettes()[Eagle.nodeDragPaletteIndex].getNodes()[Eagle.nodeDragComponentIndex];

        // TODO: determine destination palette
        const destinationPaletteIndex : number = parseInt($(e.currentTarget).find('palette-component').find('.col')[0].getAttribute('data-palette-index'), 10);
        const destinationPalette: Palette = this.palettes()[destinationPaletteIndex];

        // check user can write to destination palette
        if (destinationPalette.fileInfo().readonly){
            Utils.showUserMessage("Error", "Unable to copy component to readonly palette.");
            return;
        }

        // add to destination palette
        destinationPalette.addNode(sourceComponent, true);
    }

    getNodeDropLocation = (e : JQueryEventObject)  : {x:number, y:number} => {
        let x = e.clientX;
        let y = e.clientY;

        // clientX and clientY is the position relative to the document,
        // which doesn't take the space occupied by the navbar into account,
        // so here we get the "offset" of the svg rect.background
        // and subtract from clientX/clientY
        const offset = $(e.currentTarget).offset();
        x = x - offset.left;
        y = y - offset.top;

        return {x:x, y:y};
    };

    rightWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        const img : HTMLImageElement = document.createElement("img");

        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(img, 0, 0);
        Eagle.dragStartX = e.clientX;
        this.leftWindow().adjusting(false);
        this.rightWindow().adjusting(true);

        return true;
    }

    //workaround to aviod left or right window adjusting on any and all drag events
    rightWindowAdjustEnd = () : boolean => {
        this.leftWindow().adjusting(false);
        this.rightWindow().adjusting(false);

        return true;
    }

    sideWindowAdjust = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        // workaround to avoid final dragEvent at 0,0!
        if (e.clientX === 0){
            return true;
        }

        if (isNaN(this.leftWindow().width())){
            console.warn("Had to reset left window width from invalid state (NaN)!");
            this.leftWindow().width(Config.defaultLeftWindowWidth);
        }
        if (isNaN(this.rightWindow().width())){
            console.warn("Had to reset right window width from invalid state (NaN)!");
            this.rightWindow().width(Config.defaultRightWindowWidth);
        }

        const dragDiff : number = e.clientX - Eagle.dragStartX;
        let newWidth : number;

        if (this.leftWindow().adjusting()){
            newWidth = this.leftWindow().width() + dragDiff;
            if(newWidth <= Config.defaultLeftWindowWidth){
                this.leftWindow().width(Config.defaultLeftWindowWidth);
                Utils.setLeftWindowWidth(Config.defaultLeftWindowWidth);
            }else{
                this.leftWindow().width(newWidth);
                Utils.setLeftWindowWidth(newWidth);
            }
        } else if(this.rightWindow().adjusting()) {
            newWidth = this.rightWindow().width() - dragDiff;
            if(newWidth <= Config.defaultRightWindowWidth){
                this.rightWindow().width(Config.defaultRightWindowWidth);
                Utils.setRightWindowWidth(Config.defaultRightWindowWidth);
            }else{
                this.rightWindow().width(newWidth);
                Utils.setRightWindowWidth(newWidth);
            }
        }

        Eagle.dragStartX = e.clientX;

        return true;
    }

    spinCollapseIcon = (item: any, e: JQueryEventObject) : void => {
        // this function handles only the visible ui element that indicates the state of the collapsable object.
        // the collapse function itself is handled by bootstrap.

        // getting event target for collapse action.
        const target: JQuery<Element> = $(e.currentTarget);
        const icon: JQuery<Element> = target.find('i').first();

        // getting current state of collapsable object.
        const isTranslationToggle = icon.hasClass("translationToggle");
        let toggleState : boolean;

        // abort if the element is already collapsing
        if (isTranslationToggle){
            if (icon.parent().parent().parent().children(":not(.card-header)").hasClass("collapsing")){
                return;
            }
        } else {
            if (icon.parent().parent().children(":not(.card-header)").hasClass("collapsing")){
                return;
            }
        }

        if (isTranslationToggle){
            //this is for setting toggle icons in the translation menu, as the collapse functions differently and the content is nested differently.
            //the class "closedIcon" turns the collapse arrow icon by 270 degrees and is being toggled depending on the current state of the collapse.
            $(".translationToggle").addClass("closedIcon");
            toggleState = icon.parent().parent().parent().children(".collapse").hasClass('show');
        } else {
            toggleState = icon.parent().parent().children(".collapse").hasClass('show');
        }

        // TODO: can't we change this to a knockout "css" data-bind?
        if (toggleState){
            icon.addClass("closedIcon");
        } else {
            icon.removeClass("closedIcon");
        }
    }

    leftWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        const img : HTMLImageElement = document.createElement("img");
        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(img, 0, 0);

        Eagle.dragStartX = e.clientX;
        this.leftWindow().adjusting(true);
        this.rightWindow().adjusting(false);

        return true;
    }

    //workaround to aviod left or right window adjusting on any and all drag events
    leftWindowAdjustEnd = () : boolean => {
        this.leftWindow().adjusting(false);
        this.rightWindow().adjusting(false);

        return true;
    }

    // NOTE: enabling the tooltips must be delayed slightly to make sure the html has been generated (hence the setTimeout)
    // NOTE: now needs a timeout longer that 1ms! UGLY HACK TODO
    updateInspectorTooltips = () : void => {
        const eagle : Eagle = this;

        setTimeout(function(){
            // destroy orphaned tooltips
            Eagle.reloadTooltips();

            // update title on all right window component buttons
            if (eagle.selectedNode() !== null && eagle.selectedNode().getInputApplication() !== null)
                $('.rightWindowDisplay .input-application inspector-component .input-group-prepend').attr('data-original-title', eagle.selectedNode().getInputApplication().getHelpHTML());
            if (eagle.selectedNode() !== null && eagle.selectedNode().getOutputApplication() !== null)
                $('.rightWindowDisplay .output-application inspector-component .input-group-prepend').attr('data-original-title', eagle.selectedNode().getOutputApplication().getHelpHTML());
            if (eagle.selectedNode() !== null && eagle.selectedNode().getExitApplication() !== null)
                $('.rightWindowDisplay .exit-application inspector-component .input-group-prepend').attr('data-original-title', eagle.selectedNode().getExitApplication().getHelpHTML());
        }, 150);
    }

    updatePaletteComponentTooltip = (nodes: any) : void => {
        const node = $(nodes[1]);

        node.tooltip({
            boundary: 'window',
            trigger : 'hover',
            delay: { "show": 800, "hide": 100 }
        });
    }

    selectedEdgeValid = () : Eagle.LinkValid => {
        console.log("selectedEdgeValid()");
        return Edge.isValid(this.logicalGraph(), this.selectedEdge().getSrcNodeKey(), this.selectedEdge().getSrcPortId(), this.selectedEdge().getDestNodeKey(), this.selectedEdge().getDestPortId(), this.selectedEdge().isLoopAware(), false, true);
    }

    printLogicalGraphNodesTable = () : void => {
        const tableData : any[] = [];

        // add logical graph nodes to table
        for (let i = 0; i < this.logicalGraph().getNodes().length; i++){
            const node : Node = this.logicalGraph().getNodes()[i];

            tableData.push({
                "name":node.getName(),
                "key":node.getKey(),
                "parentKey":node.getParentKey(),
                "categoryType":node.getCategoryType(),
                "category":node.getCategory(),
                "expanded":node.getExpanded(),
                "x":node.getPosition().x,
                "y":node.getPosition().y,
                "width":node.getWidth(),
                "height":node.getHeight(),
                "inputAppKey":node.getInputApplication() === null ? null : node.getInputApplication().getKey(),
                "inputAppCategory":node.getInputApplication() === null ? null : node.getInputApplication().getCategory(),
                "inputAppEmbedKey":node.getInputApplication() === null ? null : node.getInputApplication().getEmbedKey(),
                "outputAppKey":node.getOutputApplication() === null ? null : node.getOutputApplication().getKey(),
                "outputAppCategory":node.getOutputApplication() === null ? null : node.getOutputApplication().getCategory(),
                "outputAppEmbedKey":node.getOutputApplication() === null ? null : node.getOutputApplication().getEmbedKey(),
                "exitAppKey":node.getExitApplication() === null ? null : node.getExitApplication().getKey(),
                "exitAppCategory":node.getExitApplication() === null ? null : node.getExitApplication().getCategory(),
                "exitAppEmbedKey":node.getExitApplication() === null ? null : node.getExitApplication().getEmbedKey()
            });
        }

        console.table(tableData);
    }

    printLogicalGraphEdgesTable = () : void => {
        const tableData : any[] = [];

        // add logical graph nodes to table
        for (let i = 0; i < this.logicalGraph().getEdges().length; i++){
            const edge : Edge = this.logicalGraph().getEdges()[i];

            tableData.push({
                "_id":edge.getId(),
                "sourceNodeKey":edge.getSrcNodeKey(),
                "sourcePortId":edge.getSrcPortId(),
                "destNodeKey":edge.getDestNodeKey(),
                "destPortId":edge.getDestPortId(),
                "dataType":edge.getDataType(),
                "loopAware":edge.isLoopAware()
            });
        }

        console.table(tableData);
    }

    printPalettesTable = () : void => {
        const tableData : any[] = [];

        // add logical graph nodes to table
        for (let i = 0; i < this.palettes().length; i++){
            for (let j = 0; j < this.palettes()[i].getNodes().length; j++){
                const node : Node = this.palettes()[i].getNodes()[j];

                tableData.push({"palette":this.palettes()[i].fileInfo().name, "name":node.getName(), "key":node.getKey(), "categoryType":node.getCategoryType(), "category":node.getCategory()});
            }
        }

        console.table(tableData);
    }

    // NOTE: input type here is NOT a Node, it is a Node ViewModel as defined in components.ts
    selectNodeInHierarchy = (nodeViewModel : any) : void => {
        const node : Node = this.logicalGraph().findNodeByKey(nodeViewModel.key());
        if (node === null){
            console.warn("Unable to find node in hierarchy!");
            return;
        }

        node.toggleExpanded();

        // de-select all nodes, then select this node
        // TODO: we now have multiple loops here (findNodeByKey(), setSelected, etc), they could be consolidated into one loop
        for (let i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            this.logicalGraph().getNodes()[i].setSelected(false);
        }
        node.setSelected(true);

        this.setSelection(Eagle.RightWindowMode.Hierarchy, node, Eagle.FileType.Graph);

        this.flagActiveDiagramHasMutated();
    }

    selectInputApplicationNode = () : void => {
        this.setSelection(Eagle.RightWindowMode.NodeInspector, this.selectedNode().getInputApplication(), Eagle.FileType.Graph);
    }

    selectOutputApplicationNode = () : void => {
        this.setSelection(Eagle.RightWindowMode.NodeInspector, this.selectedNode().getOutputApplication(), Eagle.FileType.Graph);
    }

    selectExitApplicationNode = () : void => {
        this.setSelection(Eagle.RightWindowMode.NodeInspector, this.selectedNode().getExitApplication(), Eagle.FileType.Graph);
    }

    editField = (node:Node, modalType: Eagle.ModalType, fieldIndex: number) : void => {
        // get field names list from the logical graph
        const allFields: Field[] = Utils.getUniqueFieldsList(this.logicalGraph());
        allFields.sort(Field.sortFunc);

        const allFieldNames: string[] = [];
        for (let i = 0 ; i < allFields.length ; i++){
            allFieldNames.push(allFields[i].getName() + " (" + allFields[i].getType() + ")");
        }

        //if creating a new field component parameter
        if (modalType === Eagle.ModalType.Add) {
            $("#editFieldModalTitle").html("Add Parameter")
            $("#addParameterWrapper").show();
            $("#customParameterOptionsWrapper").hide();

            // create a field variable to serve as temporary field when "editing" the information. If the add field modal is completed the actual field component parameter is created.
            const field: Field = new Field("", "", "", "", false, Eagle.DataType.Integer);

            Utils.requestUserEditField(Eagle.ModalType.Add, field, allFieldNames, (completed : boolean, newField: Field) => {
                // abort if the user aborted
                if (!completed){
                    return;
                }

                // check selected option in select tag
                const choices : string[] = $('#editFieldModal').data('choices');
                const choice : number = parseInt(<string>$('#fieldModalSelect').val(), 10);

                // abort if -1 selected
                if (choice === -1){
                    return;
                }

                // hide the custom text input unless the last option in the select is chosen
                if (choice === choices.length){
                   //create field from user input in modal
                   node.addField(newField);
                } else {
                   const clone : Field = allFields[choice].clone();
                   node.addField(clone);
                }
            });

        } else {
            //if editing an existing field
            const field: Field = this.selectedNode().getFields()[fieldIndex];
            $("#editFieldModalTitle").html("Edit Parameter");
            $("#addParameterWrapper").hide();
            $("#customParameterOptionsWrapper").show();

            Utils.requestUserEditField(Eagle.ModalType.Edit, field, allFieldNames, (completed : boolean, newField: Field) => {
                // abort if the user aborted
                if (!completed){
                    return;
                }

                // update field data
                field.setText(newField.getText());
                field.setName(newField.getName());
                field.setValue(newField.getValue());
                field.setDescription(newField.getDescription());
                field.setReadonly(newField.isReadonly());
                field.setType(newField.getType());
            });
        }
    };

    editPort = (node:Node, modalType: Eagle.ModalType, portIndex: number, input: boolean) : void => {
        const allPorts: Port[] = Utils.getUniquePortsList(this.logicalGraph());
        allPorts.sort(Port.sortFunc);

        const allPortNames: string[] = [];
        // get list of port names from list of ports
        for (let i = 0 ; i < allPorts.length ; i++){
            allPortNames.push(allPorts[i].getName() + " (" + allPorts[i].getType() + ")");
        }

        if (modalType === Eagle.ModalType.Add){
            $("#editPortModalTitle").html("Add Port")
            $("#addPortWrapper").show();
            $("#customPortOptionsWrapper").hide();

            // create a field variable to serve as temporary field when "editing" the information. If the add field modal is completed the actual field component parameter is created.
            const port: Port = new Port("", "", false, Eagle.DataType.String);

            Utils.requestUserEditPort(Eagle.ModalType.Add, port, allPortNames, (completed : boolean, newPort: Port) => {
                // abort if the user aborted
                if (!completed){
                    return;
                }

                // check selected option in select tag
               const choices : string[] = $('#editPortModal').data('choices');
               const choice : number = parseInt(<string>$('#portModalSelect').val(), 10);

               // abort if -1 selected
               if (choice === -1){
                   return;
               }

               // hide the custom text input unless the last option in the select is chosen
               if (choice === choices.length){
                   newPort.setId(Utils.uuidv4());
                   node.addPort(newPort, input);
               } else {
                   const clone : Port = allPorts[choice].clone();
                   clone.setId(Utils.uuidv4());
                   node.addPort(clone, input);
               }

               this.updateInspectorTooltips();
            });
        } else {
            $("#editPortModalTitle").html("Edit Port");
            $("#addPortWrapper").hide();
            $("#customPortOptionsWrapper").show();

            // get a reference to the port we are editing
            let port: Port;
            if (input){
                port = this.selectedNode().getInputPorts()[portIndex];
            } else {
                port = this.selectedNode().getOutputPorts()[portIndex];
            }

            Utils.requestUserEditPort(Eagle.ModalType.Edit, port, allPortNames, (completed : boolean, newPort: Port) => {
                // abort if the user aborted
                if (!completed){
                    return;
                }

                // update port data (except nodeKey and id, those don't change)
                const nodeKey = port.getNodeKey();
                const portId = port.getId();
                port.copyWithKeyAndId(newPort, nodeKey, portId);

                this.updateInspectorTooltips();
            });
        }
    }

    allowEdgeEditing = (): boolean => {
        return Eagle.findSettingValue(Utils.ALLOW_EDGE_EDITING);
    }

    showFieldValuePicker = (fieldIndex : number, input : boolean) : void => {
        console.log("ShowFieldValuePicker() node:", this.selectedNode().getName(), "fieldIndex:", fieldIndex, "input", input);

        // get the key for the currently selected node
        const selectedNodeKey : number = this.selectedNode().getKey();

        // build list of nodes that are attached to this node
        const nodes : string[] = [];
        for (let i = 0 ; i < this.logicalGraph().getEdges().length ; i++){
            const edge : Edge = this.logicalGraph().getEdges()[i];

            // add output nodes to the list
            if (edge.getSrcNodeKey() === selectedNodeKey){
                const destNode : Node = this.logicalGraph().findNodeByKey(edge.getDestNodeKey());
                const s : string = "output:" + destNode.getName() + ":" + destNode.getKey();
                nodes.push(s);
            }

            // add input nodes to the list
            if (edge.getDestNodeKey() === selectedNodeKey){
                const srcNode : Node = this.logicalGraph().findNodeByKey(edge.getSrcNodeKey());
                const s : string = "input:" + srcNode.getName() + ":" + srcNode.getKey();
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
            this.selectedNode().getFields()[fieldIndex].setValue(newValue);

            this.hackNodeUpdate();
        });
    }

    hackNodeUpdate = () : void => {
        // HACK to make sure that new value is shown in the UI
        const x = this.selectedNode();
        this.selectedNode(null);
        const that = this;
        setTimeout(function(){
            that.selectedNode(x);
        }, 1);
    }

    private setNodeApplication = (title: string, message: string, callback:(node:Node) => void) : void => {
        console.log("setNodeApplication()");

        const applications: Node[] = this.getApplications();
        const applicationNames: string[] = [];
        for (let i = 0 ; i < applications.length ; i++){
            applicationNames.push(applications[i].getName())
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
                this.updateInspectorTooltips();
                return;
            }

            const application : Node = applications[userChoiceIndex];

            // clone the input application to make a local copy
            // TODO: at the moment, this clone just 'exists' nowhere in particular, but it should be added to the components dict in JSON V3
            const clone : Node = application.clone();
            clone.setReadonly(false);
            const newKey : number = Utils.newKey(this.logicalGraph().getNodes());
            clone.setKey(newKey);

            callback(clone);
            this.updateInspectorTooltips();
        });
    }

    setNodeInputApplication = () : void => {
        console.log("setNodeInputApplication()");

        if (this.selectedLocation() === Eagle.FileType.Palette){
            Utils.showUserMessage("Error", "Unable to add embedded applications to components within palettes. If you wish to add an embedded application, please add it to an instance of this component within a graph.");
            return;
        }

        this.setNodeApplication("Input Application", "Choose an input application", (node: Node) => {
            // remove all edges incident on the old input application
            const oldApp: Node = this.selectedNode().getInputApplication();

            if (oldApp !== null){
                this.logicalGraph().removeEdgesByKey(oldApp.getKey());
            }

            this.selectedNode().setInputApplication(node);
        });
    }

    setNodeOutputApplication = () : void => {
        console.log("setNodeOutputApplication()");

        if (this.selectedLocation() === Eagle.FileType.Palette){
            Utils.showUserMessage("Error", "Unable to add embedded applications to components within palettes. If you wish to add an embedded application, please add it to an instance of this component within a graph.");
            return;
        }

        this.setNodeApplication("Output Application", "Choose an output application", (node: Node) => {
            // remove all edges incident on the old output application
            const oldApp: Node = this.selectedNode().getOutputApplication();

            if (oldApp !== null){
                this.logicalGraph().removeEdgesByKey(oldApp.getKey());
            }

            this.selectedNode().setOutputApplication(node);
        });
    }

    setNodeExitApplication = () : void => {
        console.log("setNodeExitApplication()");

        if (this.selectedLocation() === Eagle.FileType.Palette){
            Utils.showUserMessage("Error", "Unable to add embedded applications to components within palettes. If you wish to add an embedded application, please add it to an instance of this component within a graph.");
            return;
        }

        this.setNodeApplication("Exit Application", "Choose an exit application", (node: Node) => {
            // remove all edges incident on the old exit application
            const oldApp: Node = this.selectedNode().getExitApplication();

            if (oldApp !== null){
                this.logicalGraph().removeEdgesByKey(oldApp.getKey());
            }

            this.selectedNode().setExitApplication(node);
        });
    }

    getNewNodePosition = () : {x:number, y:number} => {
        // get screen size
        const width = $('#logicalGraphD3Div').width();
        const height = $('#logicalGraphD3Div').height();

        let x = width / 2;
        let y = height / 2;

        // choose random position centered around the 0, min -200, max 200
        x += Math.floor(Math.random() * (201)) - 100;
        y += Math.floor(Math.random() * (201)) - 100;

        // modify random positions using current translation of viewport
        x -= this.globalOffsetX;
        y -= this.globalOffsetY;

        x /= this.globalScale;
        y /= this.globalScale;

        //console.log("setNewNodePosition() x:", x, "y:", y);
        return {x:x, y:y};
    }

    autoLoad = (service: Eagle.RepositoryService, repository: string, branch: string, path: string, filename: string): void => {
        console.log("autoLoadUrl()", service, repository, branch, path, filename);

        // skip empty string urls
        if (service === Eagle.RepositoryService.Unknown || repository === "" || branch === "" || filename === ""){
            console.log("No auto load");
            return;
        }

        // load
        this.selectFile(new RepositoryFile(new Repository(service, repository, branch, false), path, filename));
    }

    copyGraphUrl = (): void => {
        // get reference to the LG fileInfo object
        const fileInfo: FileInfo = this.logicalGraph().fileInfo();

        // if we don't know where this file came from then we can't build a URL
        // for example, if the graph was loaded from local disk, then we can't build a URL for others to reach it
        if (fileInfo.repositoryService === Eagle.RepositoryService.Unknown){
            Utils.showNotification("Graph URL", "Source of graph is unknown or not publicly accessible, unable to create URL for graph.", "danger");
            return;
        }

        // build graph url
        let graph_url = window.location.origin;

        graph_url += "/?service=" + fileInfo.repositoryService;
        graph_url += "&repository=" + fileInfo.repositoryName;
        graph_url += "&branch=" + fileInfo.repositoryBranch;
        graph_url += "&path=" + fileInfo.path;
        graph_url += "&filename=" + fileInfo.name;

        // copy to cliboard
        navigator.clipboard.writeText(graph_url);

        // notification
        Utils.showNotification("Graph URL", "Copied to clipboard", "success");
    }

    checkGraph = (): void => {
        const results: string[] = Utils.checkGraph(this.logicalGraph());

        if (results.length > 0){
            Utils.showUserMessage("Check graph", results.join('<br/>'))
        } else {
            Utils.showNotification("Check Graph", "Graph OK", "success");
        }
    }

    showPerformanceDisplay : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return Eagle.findSetting(Utils.ENABLE_PERFORMANCE_DISPLAY).value();
    }, this);

    static getCategoryData = (category : Eagle.Category) : Eagle.CategoryData => {
        const c = Eagle.cData[category];

        if (typeof c === 'undefined'){
            console.error("Could not fetch category data for category", category);
            return {
                isData: false,
                isGroup: false,
                isResizable: false,
                minInputs: 0,
                maxInputs: 0,
                minOutputs: 0,
                maxOutputs: 0,
                canHaveInputApplication: false,
                canHaveOutputApplication: false,
                canHaveExitApplication: false,
                canHaveParameters: false,
                icon: "error",
                color: "pink"
            };
        }

        return c;
    }

    static readonly cData : {[category:string] : Eagle.CategoryData} = {
        Start              : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "play_arrow", color: "#229954"},
        End                : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "stop", color: "#CB4335"},
        Comment            : {isData: false, isGroup: false, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 1, maxOutputs: 1, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: false, icon: "comment", color: "#799938"},
        Description        : {isData: false, isGroup: false, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: false, icon: "note", color: "#9B3065"},
        Scatter            : {isData: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 1, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "call_split", color: "#DDAD00"},
        Gather             : {isData: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 1, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "call_merge", color: "#D35400"},
        MKN                : {isData: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 1, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: true, canHaveExitApplication: false, canHaveParameters: true, icon: "waves", color: "#D32000"},
        GroupBy            : {isData: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 1, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: true, canHaveExitApplication: false, canHaveParameters: true, icon: "group_work", color: "#7F8C8D"},
        Loop               : {isData: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 1, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveExitApplication: true, canHaveParameters: true, icon: "loop", color: "#512E5F"},

        PythonApp          : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "extension", color: "#3498DB"},
        BashShellApp       : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "attach_money", color: "#1C2833"},
        DynlibApp          : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "menu_book", color: "#3470AA"},
        Mpi                : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "apps", color: "#1E90FF"},
        Docker             : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "computer", color: "#331C54"},
        Singularity        : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "looks_5", color: "#5B09D2"},

        NGAS               : {isData: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "storage", color: "#394BB2"},
        S3                 : {isData: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "cloud_queue", color: "#394BB2"},
        Memory             : {isData: true, isGroup: false, isResizable: false, minInputs: 1, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "memory", color: "#394BB2"},
        File               : {isData: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "description", color: "#394BB2"},
        Plasma             : {isData: true, isGroup: false, isResizable: false, minInputs: 1, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "star", color: "#394BB2"},

        Service            : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "build", color: "#EB1672"},
        ExclusiveForceNode : {isData: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: false, icon: "picture_in_picture", color: "#000000"},

        Variables          : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "tune", color: "#C10000"},
        Branch             : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 2, maxOutputs: 2, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "share", color: "#00BDA1"},

        SubGraph           : {isData: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: false, icon: "stars", color: "#00750E"},

        Unknown            : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "device_unknown", color: "#FF66CC"},
        None               : {isData: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: false, icon: "block", color: "#FF66CC"}
    };
}

export namespace Eagle
{
    export enum LeftWindowMode {
        None,
        Palettes
    }

    export enum RightWindowMode {
        None,
        Repository,
        NodeInspector,
        EdgeInspector,
        TranslationMenu,
        Hierarchy
    }

    export enum FileType {
        Graph,
        Palette,
        JSON,
        Unknown
    }

    export enum DALiuGEFileType {
        LogicalGraph = "LogicalGraph",
        LogicalGraphTemplate = "LogicalGraphTemplate",
        PhysicalGraph = "PhysicalGraph",
        PhysicalGraphTemplate = "PhysicalGraphTemplate",
        Unknown = "Unknown"
    }

    export enum DALiuGESchemaVersion {
        Unknown = "Unknown",
        OJS = "OJS",
        V3 = "V3",
        AppRef = "AppRef"
    }

    export enum LinkValid {
        Unknown,
        Invalid,
        Warning,
        Valid
    }

    export enum DataType {
        Unknown = "Unknown",
        String = "String",
        Integer = "Integer",
        Float = "Float",
        Complex = "Complex",
        Boolean = "Boolean"
    }

    export enum ModalType {
        Add = "Add",
        Edit = "Edit"
    }

    export enum RepositoryService {
        GitHub = "GitHub",
        GitLab = "GitLab",
        Unknown = "Unknown"
    }

    export enum Category {
        Start = "Start",
        End = "End",
        Comment = "Comment",
        Description = "Description",
        Scatter = "Scatter",
        Gather = "Gather",
        MKN = "MKN",
        GroupBy = "GroupBy",
        Loop = "Loop",

        PythonApp = "PythonApp",
        BashShellApp = "BashShellApp",
        DynlibApp = "DynlibApp",
        MPI = "Mpi",
        Docker = "Docker",

        NGAS = "NGAS",
        S3 = "S3",
        Memory = "Memory",
        File = "File",
        Plasma = "Plasma",

        Service = "Service",
        ExclusiveForceNode = "ExclusiveForceNode",

        Variables = "Variables",
        Branch = "Branch",

        SubGraph = "SubGraph",

        Unknown = "Unknown",
        None = "None",

        Component = "Component" // legacy only
    }

    export enum CategoryType {
        Control = "Control",
        Application = "Application",
        Group = "Group",
        Data = "Data",
        Other = "Other",
        Unknown = "Unknown"
    }

    export enum Direction {
        Up = "Up",
        Down = "Down",
        Left = "Left",
        Right = "Right"
    }

    export type CategoryData = {isData: boolean, isGroup:boolean, isResizable:boolean, minInputs: number, maxInputs: number, minOutputs: number, maxOutputs: number, canHaveInputApplication: boolean, canHaveOutputApplication: boolean, canHaveExitApplication: boolean, canHaveParameters: boolean, icon: string, color: string};
}


$( document ).ready(function() {
    // jquery starts here

    //hides the dropdown navbar elements when stopping hovering over the element
    $(".dropdown-menu").mouseleave(function(){
      $(".dropdown-menu").dropdown('hide')
    })
});
