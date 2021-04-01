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
import {SideWindow} from './SideWindow';

export class Eagle {
    // palette editor mode
    editorPalette : ko.Observable<Palette>;
    templatePalette : ko.Observable<Palette>;

    // graph editor mode
    palettes : ko.ObservableArray<Palette>;
    logicalGraph : ko.Observable<LogicalGraph>;

    userMode : ko.Observable<Eagle.UserMode>;
    repositories : ko.ObservableArray<Repository>;

    leftWindow : ko.Observable<SideWindow>;
    rightWindow : ko.Observable<SideWindow>;

    selectedNode : ko.Observable<Node>;
    selectedEdge : ko.Observable<Edge>;

    translator : ko.Observable<Translator>;

    globalOffsetX : number = 0;
    globalOffsetY : number = 0;
    globalScale : number = 1.0;


    static settings : ko.ObservableArray<Setting>;

    static dataNodes : Node[] = [];
    static dataCategories : Eagle.Category[] = [];
    static applicationNodes : Node[] = [];
    static applicationCategories : Eagle.Category[] = [];

    static dragStartX : number;

    static selectedNodeKey : number;

    static nodeDropped : Element;
    static nodeDropLocation = {x:0, y:0}; // if this remains x=0,y=0, the button has been pressed and the getNodePosition function will be used to determine a location on the canvas. if not x:0, y:0, it has been over written by the nodeDrop function as the node has been dragged into the canvas. The node will then be placed into the canvas using these co-ordinates.

    constructor(){
        this.editorPalette = ko.observable(null);
        this.palettes = ko.observableArray();
        this.templatePalette = ko.observable(null);
        this.logicalGraph = ko.observable(null);

        this.userMode = ko.observable(Eagle.UserMode.LogicalGraphEditor);
        this.repositories = ko.observableArray();

        this.leftWindow = ko.observable(new SideWindow(Eagle.LeftWindowMode.Palettes, Utils.getLeftWindowWidth(), false));
        this.rightWindow = ko.observable(new SideWindow(Eagle.RightWindowMode.Repository, Utils.getRightWindowWidth(), true));

        this.selectedNode = ko.observable(null);
        this.selectedEdge = ko.observable(null);

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
        Eagle.settings.push(new Setting("Enable Palette Editor Mode", "Enable the palette editor mode in EAGLE.", Setting.Type.Boolean, Utils.ENABLE_PALETTE_EDITOR_MODE, false));
        Eagle.settings.push(new Setting("Translate with New Categories", "Replace the old categories with new names when exporting. For example, replace 'Component' with 'PythonApp' category.", Setting.Type.Boolean, Utils.TRANSLATE_WITH_NEW_CATEGORIES, false));
        Eagle.settings.push(new Setting("Allow Readonly Parameter Editing", "Allow the user to edit values of readonly parameters in components.", Setting.Type.Boolean, Utils.ALLOW_READONLY_PARAMETER_EDITING, false));
        Eagle.settings.push(new Setting("Translator URL", "The URL of the translator server", Setting.Type.String, Utils.TRANSLATOR_URL, "http://localhost:8084/gen_pgt"));
        Eagle.settings.push(new Setting("Open Default Palette on Startup", "Open a default palette on startup. The palette contains an example of all known node categories", Setting.Type.Boolean, Utils.OPEN_DEFAULT_PALETTE, true));
        Eagle.settings.push(new Setting("GitHub Access Token", "A users access token for GitHub repositories.", Setting.Type.Password, Utils.GITHUB_ACCESS_TOKEN_KEY, ""));
        Eagle.settings.push(new Setting("GitLab Access Token", "A users access token for GitLab repositories.", Setting.Type.Password, Utils.GITLAB_ACCESS_TOKEN_KEY, ""));
        Eagle.settings.push(new Setting("Create Applications for Construct Ports", "When loading old graph files with ports on construct nodes, move the port to an embedded application", Setting.Type.Boolean, Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS, true));
        Eagle.settings.push(new Setting("Disable JSON Validation", "Allow EAGLE to load/save/send-to-translator graphs and palettes that would normally fail validation against schema.", Setting.Type.Boolean, Utils.DISABLE_JSON_VALIDATION, false));
        Eagle.settings.push(new Setting("Allow Edge Editing", "Allow the user to edit edge attributes.", Setting.Type.Boolean, Utils.ALLOW_EDGE_EDITING, false));

        // HACK - subscribe to the be notified of changes to the templatePalette
        // when the templatePalette changes, we need to enable the tooltips
        this.templatePalette.subscribe(this.updateTooltips);
        this.editorPalette.subscribe(this.updateTooltips);
        this.palettes.subscribe(this.updateTooltips);
        this.selectedNode.subscribe(this.updateTooltips);
    }

    areAnyFilesModified = () : boolean => {
        // check the logical graph
        if (this.logicalGraph().fileInfo().modified){
            return true;
        }

        // check the editor palette
        if (this.editorPalette().fileInfo().modified){
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

    isPaletteEditorModeEnabled = () : boolean => {
        return Eagle.findSetting(Utils.ENABLE_PALETTE_EDITOR_MODE).value();
    }

    activeFileInfo = () : FileInfo => {
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            if (this.logicalGraph()){
                return this.logicalGraph().fileInfo();
            }
        } else {
            if (this.editorPalette()){
                return this.editorPalette().fileInfo();
            }
        }

        return null;
    }

    flagActiveFileModified = () : void => {
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            if (this.logicalGraph()){
                this.logicalGraph().fileInfo().modified = true;
                this.logicalGraph().fileInfo.valueHasMutated();
            }
        } else {
            if (this.editorPalette()){
                this.editorPalette().fileInfo().modified = true;
                this.editorPalette().fileInfo.valueHasMutated();
            }
        }
    }

    getTabTitle : ko.PureComputed<string> = ko.pureComputed(() => {
        // Adding a star symbol in front of the title if file is modified.
        var mod = '';

        var fileInfo : FileInfo = this.activeFileInfo();

        if (fileInfo && fileInfo.modified){
            mod = '*';
        }

        // Display file name in tab title if non-empty
        var fileName = this.repositoryFileName();

        if (fileName === ""){
            return "EAGLE";
        } else {
            return mod + "EAGLE: " + this.repositoryFileName();
        }
    }, this);

    // generate a list of Application nodes within the open palettes
    getApplicationList = () : string[] => {
        var list : string[] = [];

        for (var i = 0 ; i < this.palettes().length ; i++){
            var palette : Palette = this.palettes()[i];

            for (var j = 0 ; j < palette.getNodes().length; j++){
                var node : Node = palette.getNodes()[j];

                if (node.getCategoryType() === Eagle.CategoryType.Application){
                    list.push(palette.fileInfo().name + ":" + node.getName());
                }
            }
        }

        return list;
    }

    getApplication = (paletteName : string, nodeName : string) : Node => {
        for (var i = 0 ; i < this.palettes().length ; i++){
            var palette : Palette = this.palettes()[i];

            if (palette.fileInfo().name !== paletteName){
                continue;
            }

            for (var j = 0 ; j < palette.getNodes().length; j++){
                var node : Node = palette.getNodes()[j];

                if (node.getName() === nodeName){
                    return node;
                }
            }
        }

        return null;
    }

    repositoryFileName : ko.PureComputed<string> = ko.pureComputed(() => {
        var fileInfo : FileInfo = this.activeFileInfo();

        // if no FileInfo is available, return empty string
        if (fileInfo === null){
            return "";
        }

        return fileInfo.getText();
    }, this);

    getRepositoryList = (service : Eagle.RepositoryService) : Repository[] => {
        var list : Repository[] = [];

        for (var i = 0 ; i < this.repositories().length ; i++){
            if (this.repositories()[i].service === service){
                list.push(this.repositories()[i]);
            }
        }

        return list;
    };

    getRepository = (service : Eagle.RepositoryService, name : string, branch : string) : Repository | null => {
        console.log("getRepository()", service, name, branch);

        for (var i = 0 ; i < this.repositories().length ; i++){
            if (this.repositories()[i].service === service && this.repositories()[i].name === name && this.repositories()[i].branch === branch){
                return this.repositories()[i];
            }
        }
        console.warn("getRepositoryByName() could not find " + service + " repository with the name " + name + " and branch " + branch);
        return null;
    };

    setUserMode = (userMode : Eagle.UserMode) : void => {
        var prevUserMode = this.userMode();

        // check if mode even changed
        if (prevUserMode === userMode){
            return;
        }

        this._setUserMode(userMode);
    }

    private _setUserMode = (userMode : Eagle.UserMode) : void => {
        this.selectedEdge(null);
        this.selectedNode(null);

        switch(userMode){
            case Eagle.UserMode.PaletteEditor:
                this.setPaletteEditorMode();
                return;
            case Eagle.UserMode.LogicalGraphEditor:
                this.setGraphEditorMode();
                return;
        }
    }

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
        var minX : number = Number.MAX_VALUE;
        var minY : number = Number.MAX_VALUE;
        var maxX : number = -Number.MAX_VALUE;
        var maxY : number = -Number.MAX_VALUE;
        for (var i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            var node : Node = this.logicalGraph().getNodes()[i];

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
        var centroidX = minX + ((maxX - minX) / 2);
        var centroidY = minY + ((maxY - minY) / 2);

        // reset scale
        this.globalScale = 1.0;

        //determine center of the display area
        var displayCenterX : number = $('#logicalGraphParent').width() / this.globalScale / 2;
        var displayCenterY : number = $('#logicalGraphParent').height() / this.globalScale / 2;

        // translate display to center the graph centroid
        this.globalOffsetX = displayCenterX - centroidX;
        this.globalOffsetY = displayCenterY - centroidY;

        // trigger render
        this.flagActiveDiagramHasMutated();
    }

    setPaletteEditorMode = () => {
        this.userMode(Eagle.UserMode.PaletteEditor);

        this.leftWindow().mode(Eagle.LeftWindowMode.TemplatePalette);
        this.leftWindow().shown(true);

        // set the right window mode to show repository
        this.rightWindow().mode(Eagle.RightWindowMode.Repository);
    }

    setGraphEditorMode = () : void => {
        this.userMode(Eagle.UserMode.LogicalGraphEditor);

        // close left window if no nodes in palette
        if (this.palettes().length === 0){
            this.leftWindow().shown(false);
        }
        this.leftWindow().mode(Eagle.LeftWindowMode.Palettes);
    }

    /**
     * This function is repeatedly called throughout the EAGLE operation.
     * It resets al fields in the editor menu.
     */
    resetEditor = () : void => {
        this.selectedNode(null);
        this.selectedEdge(null);

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

    setSelection = (rightWindowMode : Eagle.RightWindowMode, selection : Node | Edge) : void => {
        //console.log("eagle.setSelection()", Utils.translateRightWindowModeToString(rightWindowMode), selection);

        switch (rightWindowMode){
            case Eagle.RightWindowMode.Hierarchy:
            case Eagle.RightWindowMode.NodeInspector:
                // abort if already selected
                if (this.selectedNode() === selection){
                    return;
                }

                // de-select all the nodes and then select this node
                for (var i = 0 ; i < this.logicalGraph().getNodes().length; i++){
                    this.logicalGraph().getNodes()[i].setSelected(false);
                    this.logicalGraph().getNodes()[i].setShowPorts(false);
                }

                // abort if new selection is null
                if (selection === null){
                    Eagle.selectedNodeKey = undefined;
                    this.selectedNode(null);
                    this.selectedEdge(null);
                    this.flagActiveDiagramHasMutated();
                    return;
                }

                (<Node>selection).setSelected(true);
                (<Node>selection).setShowPorts(true);

                Eagle.selectedNodeKey = (<Node>selection).getKey();
                this.selectedNode(<Node>selection);
                this.selectedEdge(null);

                // expand this node's parents, all the way to the root of the hierarchy
                var n : Node = <Node>selection;
                while(true){
                    var parentKey : number = n.getParentKey();

                    if (parentKey === null){
                        break;
                    }

                    var parentNode : Node = this.logicalGraph().findNodeByKey(parentKey);

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
    genPGT = (algorithmIndex : number) : void => {
        if (this.logicalGraph().getNumNodes() === 0) {
            Utils.showUserMessage("Error", "Unable to translate. Logical graph has no nodes!");
            return;
        }

        if (this.logicalGraph().fileInfo().name === ""){
            Utils.showUserMessage("Error", "Unable to translate. Logical graph does not have a name! Please save the graph first.");
            return;
        }

        var translatorURL : string = Eagle.findSetting(Utils.TRANSLATOR_URL).value();

        // ask user to specify graph format to be sent to translator
        Utils.requestUserChoice("Translation format", "Please select the format for the graph that will be sent to the translator", [Eagle.DALiuGESchemaVersion.OJS, Eagle.DALiuGESchemaVersion.AppRef], 0, false, "", (completed: boolean, userString: string) => {
            if (!completed){
                console.log("User aborted translation.");
                return;
            }

            console.log("Eagle.getPGT() : algorithm index:", algorithmIndex, "algorithm name:", Config.translationAlgorithms[algorithmIndex], "translator URL", translatorURL);

            // get json for logical graph
            let json;
            switch (userString){
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
                let isValid : boolean = Utils.validateJSON(json, <Eagle.DALiuGESchemaVersion>userString, Eagle.FileType.Graph);
                if (!isValid){
                    console.error("JSON Invalid, saving anyway");
                    Utils.showUserMessage("Error", "JSON Invalid, saving anyway");
                    //return;
                }
            }

            this.translator().submit(translatorURL, {
                algo: Config.translationAlgorithms[algorithmIndex],
                lg_name: this.logicalGraph().fileInfo().name,
                json_data: JSON.stringify(json)
            });

            console.log("json data");
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
        var uploadedGraphFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedGraphFile");
        var fileFullPath : string = uploadedGraphFileInputElement.value;
        var showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        if (!Utils.verifyFileExtension(fileFullPath)) {
            Utils.showUserMessage("Wrong file extension!", "Filename: " + fileFullPath);
            return;
        }

        // Gets the file from formdata.
        var formData = new FormData();
        formData.append('file', uploadedGraphFileInputElement.files[0]);
        uploadedGraphFileInputElement.value = "";

        Utils.httpPostForm('/uploadFile', formData, (error : string, data : string) : void => {
            if (error !== null){
                console.error(error);
                return;
            }

            // attempt to parse the JSON
            try {
                var dataObject = JSON.parse(data);
            }
            catch(err){
                Utils.showUserMessage("Error parsing file JSON", err.message);
                return;
            }

            var fileType : Eagle.FileType = Utils.determineFileType(dataObject);

            // Only load graph files.
            if (fileType == Eagle.FileType.Graph) {
                // attempt to determine schema version from FileInfo
                let schemaVersion: Eagle.DALiuGESchemaVersion = Utils.determineSchemaVersion(dataObject);
                //console.log("!!!!! Determined Schema Version", schemaVersion);

                let errors: string[] = [];
                let dummyFile: RepositoryFile = new RepositoryFile(Repository.DUMMY, "", fileFullPath);

                // use the correct parsing function based on schema version
                switch (schemaVersion){
                    case Eagle.DALiuGESchemaVersion.AppRef:
                        this.logicalGraph(LogicalGraph.fromAppRefJson(dataObject, dummyFile, errors));
                        break;
                    case Eagle.DALiuGESchemaVersion.V3:
                        Utils.showUserMessage("Unsupported feature", "Loading files using the V3 schema is not supported.");
                        this.logicalGraph(LogicalGraph.fromV3Json(dataObject, dummyFile, errors));
                        break;
                    case Eagle.DALiuGESchemaVersion.OJS:
                    case Eagle.DALiuGESchemaVersion.Unknown:
                        this.logicalGraph(LogicalGraph.fromOJSJson(dataObject, dummyFile, errors));
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
            } else {
                Utils.showUserMessage("Error", "This is not a graph file!");
            }

            // update the activeFileInfo with details of the repository the file was loaded from
            this.updateActiveFileInfo(fileType, Eagle.RepositoryService.Unknown, "", "", Utils.getFilePathFromFullPath(fileFullPath), Utils.getFileNameFromFullPath(fileFullPath));
        });
    }

    /**
     * Loads a custom palette from a file.
     */
    uploadPaletteFile = () : void => {
        var uploadedPaletteFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedPaletteFile");
        var fileFullPath : string = uploadedPaletteFileInputElement.value;
        var showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        if (!Utils.verifyFileExtension(fileFullPath)) {
            Utils.showUserMessage("Wrong file extension!", "Filename: " + fileFullPath);
            return;
        }

        // Get and load the specified configuration file.
        var formData = new FormData();
        formData.append('file', uploadedPaletteFileInputElement.files[0]);
        uploadedPaletteFileInputElement.value = "";

        Utils.httpPostForm('/uploadFile', formData, (error : string, data : string) : void => {
            if (error !== null){
                console.error(error);
                return;
            }

            // determine file type
            var fileType : Eagle.FileType = Utils.getFileTypeFromFileName(fileFullPath);

            // abort if not palette
            if (fileType !== Eagle.FileType.Palette){
                Utils.showUserMessage("Error", "This is not a palette file! Looks like a " + Utils.translateFileTypeToString(fileType));
                return;
            }

            // attempt to parse the JSON
            try {
                JSON.parse(data);
            }
            catch(err){
                Utils.showUserMessage("Error parsing file JSON", err.message);
                return;
            }

            let errors: string[] = [];
            var p : Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", Utils.getFileNameFromFullPath(fileFullPath)), errors);

            // show errors (if found)
            if (errors.length > 0 && showErrors){
                Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
            }

            if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
                this.palettes.push(p);
            } else {
                this.editorPalette(p);
            }

            // show the left window
            this.leftWindow().shown(true);

            Utils.showNotification("Success", Utils.getFileNameFromFullPath(fileFullPath) + " has been loaded.", "success");

            // if in palette editor mode, update the activeFileInfo with details of the repository the file was loaded from
            if (this.userMode() === Eagle.UserMode.PaletteEditor){
                this.updateActiveFileInfo(fileType, Eagle.RepositoryService.Unknown, "", "", Utils.getFilePathFromFullPath(fileFullPath), Utils.getFileNameFromFullPath(fileFullPath));
            }
        });
    }

    /**
     * The following two functions allows the file selectors to be hidden and let tags 'click' them
     */
    getGraphFileToLoad = () : void => {
        document.getElementById("uploadedGraphFile").click();
    }

    getPaletteFileToLoad = () : void => {
        document.getElementById("uploadedPaletteFile").click();
    }

    /**
     * Creates a new logical graph for editing.
     */
    newLogicalGraph = () => {
        console.log("newLogicalGraph()");
        this.newDiagram(Eagle.FileType.Graph, (name: string) => {
            this.logicalGraph(new LogicalGraph());
            this.logicalGraph().fileInfo().name = name;
            var node : Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), "Description", "", Eagle.Category.Description, Eagle.CategoryType.Other, false);
            let pos = this.getNewNodePosition();
            node.setColor(Utils.getColorForNode(Eagle.Category.Description));
            this.logicalGraph().addNode(node, pos.x, pos.y, null);
            this.logicalGraph.valueHasMutated();
        });
    }

    /**
     * Creates a new palette for editing.
     */
    newPalette = () => {
        console.log("newPalette()");
        this.newDiagram(Eagle.FileType.Palette, (name : string) => {
            this.editorPalette(new Palette());
            this.editorPalette().fileInfo().name = name;

            var startNode : Node = new Node(Utils.newKey(this.editorPalette().getNodes()), "Start", "", Eagle.Category.Start, Eagle.CategoryType.Control, false);
            startNode.setColor(Utils.getColorForNode(Eagle.Category.Start));
            this.editorPalette().addNode(startNode);

            var endNode : Node = new Node(Utils.newKey(this.editorPalette().getNodes()), "End", "", Eagle.Category.End, Eagle.CategoryType.Control, false);
            endNode.setColor(Utils.getColorForNode(Eagle.Category.End));
            this.editorPalette().addNode(endNode);

            var commentNode : Node = new Node(Utils.newKey(this.editorPalette().getNodes()), "Comment", "", Eagle.Category.Comment, Eagle.CategoryType.Other, false);
            commentNode.setColor(Utils.getColorForNode(Eagle.Category.Comment));
            this.editorPalette().addNode(commentNode);

            var descriptionNode : Node = new Node(Utils.newKey(this.editorPalette().getNodes()), "Description", "", Eagle.Category.Description, Eagle.CategoryType.Other, false);
            descriptionNode.setColor(Utils.getColorForNode(Eagle.Category.Description));
            this.editorPalette().addNode(descriptionNode);

            this.editorPalette.valueHasMutated();
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
    saveFileToLocal = (fileType : Eagle.FileType) => {
        // check that the fileType has been set for the logicalGraph
        if (typeof this.logicalGraph().fileInfo().type === 'undefined'){
            Utils.showUserMessage("Error", "Graph fileType has not been set. Could not save file.");
            return;
        }

        var fileName = this.activeFileInfo().name;
        if (fileName === "") {
            fileName = "Diagram-" + Utils.generateDateTimeString() + "." + Utils.getDiagramExtension(fileType);
            this.activeFileInfo().name = fileName;
        }

        var json : object;
        if (fileType === Eagle.FileType.Graph){
            // clone the logical graph and remove github info ready for local save
            var lg_clone : LogicalGraph = this.logicalGraph().clone();
            lg_clone.fileInfo().removeGitInfo();
            lg_clone.fileInfo().updateEagleInfo();
            json = LogicalGraph.toOJSJson(lg_clone);
        } else {
            // clone the palette and remove github info ready for local save
            var p_clone : Palette = this.editorPalette().clone();
            p_clone.fileInfo().removeGitInfo();
            p_clone.fileInfo().updateEagleInfo();
            json = Palette.toOJSJson(p_clone);
        }

        // validate json
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
            let isValid : boolean = Utils.validateJSON(json, Eagle.DALiuGESchemaVersion.OJS, fileType);
            if (!isValid){
                console.error("JSON Invalid, saving anyway");
                Utils.showUserMessage("Error", "JSON Invalid, saving anyway");
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
            var blob = new Blob([data]);
            var link = document.createElement('a');
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
                this.editorPalette().fileInfo().modified = false;
                this.editorPalette().fileInfo().repositoryService = Eagle.RepositoryService.Unknown;
                this.editorPalette().fileInfo().repositoryName = "";
                this.editorPalette().fileInfo().gitUrl = "";
                this.editorPalette().fileInfo().sha = "";
                this.editorPalette().fileInfo.valueHasMutated();
            }
        });
    }

    /**
     * Saves a file to the remote server repository.
     */
    saveFileToRemote = (repository : Repository, json : object) => {
        console.log("saveFileToRemote() repository.name", repository.name, "repository.service", repository.service);

        var url : string;

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
                Utils.showUserMessage("Error", data);
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

        // create default repository to supply to modal so that the modal is populated with useful defaults
        let defaultRepository: Repository;
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            if (this.logicalGraph()){
                defaultRepository = new Repository(this.logicalGraph().fileInfo().repositoryService, this.logicalGraph().fileInfo().repositoryName, this.logicalGraph().fileInfo().repositoryBranch, false);
            }
        } else {
            if (this.editorPalette()){
                defaultRepository = new Repository(this.editorPalette().fileInfo().repositoryService, this.editorPalette().fileInfo().repositoryName, this.editorPalette().fileInfo().repositoryBranch, false);
            }
        }

        Utils.requestUserGitCommit(defaultRepository, this.getRepositoryList(Eagle.RepositoryService.GitHub),  this.activeFileInfo().path, this.activeFileInfo().name, (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            var repository : Repository = this.getRepository(repositoryService, repositoryName, repositoryBranch);
            if (repository === null){
                console.log("Abort commit");
                return;
            }

            // check which fileInfo object to use, based on the current editor mode
            var activeFileInfo : ko.Observable<FileInfo>;
            if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
                if (this.logicalGraph()){
                    activeFileInfo = this.logicalGraph().fileInfo;
                }
            } else {
                if (this.editorPalette()){
                    activeFileInfo = this.editorPalette().fileInfo;
                }
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
    commitToGit = (fileType : Eagle.FileType) => {
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
        var modalMessage = "";
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
            let repository = this.getRepository(this.activeFileInfo().repositoryService, this.activeFileInfo().repositoryName, this.activeFileInfo().repositoryBranch);

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

        // get access token for this type of repository
        var token : string;

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

        var fullFileName : string = Utils.joinPath(filePath, fileName);

        var json : object;
        if (fileType === Eagle.FileType.Graph){
            json = LogicalGraph.toOJSJson(this.logicalGraph());
        } else {
            json = Palette.toOJSJson(this.editorPalette());
        }

        // validate json
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
            let isValid : boolean = Utils.validateJSON(json, Eagle.DALiuGESchemaVersion.OJS, fileType);
            if (!isValid){
                console.error("JSON Invalid, saving anyway");
                Utils.showUserMessage("Error", "JSON Invalid, saving anyway");
                //return;
            }
        }

        var jsonData : object = {
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

        var fileName : string = this.activeFileInfo().name;

        // set the EAGLE version etc according to this running version
        this.logicalGraph().fileInfo().updateEagleInfo();

        var json = LogicalGraph.toV3Json(this.logicalGraph());

        // validate json
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
            let isValid : boolean = Utils.validateJSON(json, Eagle.DALiuGESchemaVersion.V3, Eagle.FileType.Graph);
            if (!isValid){
                console.error("JSON Invalid, saving anyway");
                Utils.showUserMessage("Error", "JSON Invalid, saving anyway");
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
            var blob = new Blob([data]);
            var link = document.createElement('a');
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
        var fileName : string = this.activeFileInfo().name;

        // set the EAGLE version etc according to this running version
        this.logicalGraph().fileInfo().updateEagleInfo();

        var json = LogicalGraph.toAppRefJson(this.logicalGraph());

        Utils.httpPostJSON('/saveFileToLocal', json, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            // NOTE: this stuff is a hacky way of saving a file locally
            var blob = new Blob([data]);
            var link = document.createElement('a');
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
    loadTemplatePalette = () => {
        console.log("loadTemplatePalette()");

        Utils.httpGet("./static/" + Config.templatePaletteFileName, (error : string, data : string) => {
            if (error !== null){
                console.error(error);
                return;
            }

            var fileType: Eagle.FileType = Utils.translateStringToFileType((<any>data).modelData.fileType);
            var showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

            if (fileType == Eagle.FileType.TemplatePalette) {
                let errors: string[] = [];
                this.templatePalette(Palette.fromOJSJson(JSON.stringify(data), new RepositoryFile(Repository.DUMMY, "", Config.templatePaletteFileName), errors));

                // TODO: show errors (if required)
                if (errors.length > 0 && showErrors){
                    Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
                }
            } else {
                Utils.showUserMessage("Error", "File type is not a template palette!");
                return;
            }

            // Extracting data from the palette template.
            Eagle.dataNodes = Utils.buildNodeList(this.templatePalette(), Eagle.CategoryType.Data);
            Eagle.dataCategories = Utils.buildCategoryList(this.templatePalette(), Eagle.CategoryType.Data);
            Eagle.applicationNodes = Utils.buildNodeList(this.templatePalette(), Eagle.CategoryType.Application);
            Eagle.applicationCategories = Utils.buildCategoryList(this.templatePalette(), Eagle.CategoryType.Application);

            if (Eagle.findSettingValue(Utils.OPEN_DEFAULT_PALETTE)){
                console.log("Generate default palette");
                let errors: string[] = [];
                let palette = Palette.fromOJSJson(JSON.stringify(data), new RepositoryFile(Repository.DUMMY, "", ""), errors);
                if (errors.length > 0){
                    console.warn(errors.length, "errors during loading default palette", errors);
                }

                palette.fileInfo().clear();
                palette.fileInfo().name = Palette.DYNAMIC_PALETTE_NAME;
                palette.fileInfo().readonly = false;
                this.palettes.push(palette);
                this.leftWindow().shown(true);
            }
        });
    }

    /**
     * Loads builtin palette from the server.
     */
    loadBuiltinPalette = () => {
        console.log("loadBuiltinPalette()");

        Utils.httpGet("./static/" + Config.builtinPaletteFileName, (error : string, data : string) => {
            if (error !== null){
                console.error(error);
                return;
            }

            var showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();
            let errors: string[] = [];

            let builtinPalette = Palette.fromOJSJson(JSON.stringify(data), new RepositoryFile(Repository.DUMMY, "", Config.builtinPaletteFileName), errors);
            if (errors.length > 0 && showErrors){
                Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
            }

            builtinPalette.fileInfo().clear();
            builtinPalette.fileInfo().name = Palette.BUILTIN_PALETTE_NAME;
            this.palettes.push(builtinPalette);
        });
    }

    loadSchemas = () => {
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
        var isModified = false;
        switch (file.type){
            case Eagle.FileType.Graph:
                isModified = this.logicalGraph().fileInfo().modified;
                break;
            case Eagle.FileType.Palette:
                isModified = this.editorPalette().fileInfo().modified;
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
            var localStorageKey : string = Utils.getLocalStorageKey(repositoryService, repositoryName, repositoryBranch);
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
        var openRemoteFileFunc;
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
            var fileTypeLoaded : Eagle.FileType = Eagle.FileType.Unknown;

            // flag fetching as complete
            file.isFetching(false);

            // display error if one occurred
            if (error != null){
                Utils.showUserMessage("Error", "Failed to load a file!");
                console.error(error);
                return;
            }

            // if setting dictates, show errors during loading
            var showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

            if (file.type === Eagle.FileType.Graph) {
                if (this.userMode() === Eagle.UserMode.PaletteEditor) {
                    Utils.showUserMessage("Error", "Graphs cannot be opened in the palette editor mode!");
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

                // attempt to determine schema version from FileInfo
                let schemaVersion: Eagle.DALiuGESchemaVersion = Utils.determineSchemaVersion(dataObject);
                //console.log("!!!!! Determined Schema Version", schemaVersion);

                let errors: string[] = [];

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

                fileTypeLoaded = Eagle.FileType.Graph;

            } else if (file.type === Eagle.FileType.Palette) {
                fileTypeLoaded = Eagle.FileType.Palette;
                this._remotePaletteLoaded(file, data);

            } else if (file.type === Eagle.FileType.JSON) {
                if (this.userMode() === Eagle.UserMode.LogicalGraphEditor) {
                    // attempt to parse the JSON
                    let dataObject;
                    try {
                        dataObject = JSON.parse(data);
                    }
                    catch(err){
                        Utils.showUserMessage("Error parsing file JSON", err.message);
                        return;
                    }

                    //Utils.showUserMessage("Warning", "Opening JSON file as graph, make sure this is correct.");
                    let errors: string[] = [];
                    this.logicalGraph(LogicalGraph.fromOJSJson(dataObject, file, errors));

                    if (errors.length > 0){
                        if (showErrors){
                            Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
                        }
                    } else {
                        Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
                    }

                    fileTypeLoaded = Eagle.FileType.Graph;
                } else {
                    fileTypeLoaded = Eagle.FileType.Palette;
                    this._remotePaletteLoaded(file, data);
                }

            } else {
                // Show error message
                Utils.showUserMessage("Error", "The file type is neither graph nor palette!");
            }

            // if the fileType is the same as the current mode, update the activeFileInfo with details of the repository the file was loaded from
            if ((this.userMode() === Eagle.UserMode.LogicalGraphEditor && fileTypeLoaded === Eagle.FileType.Graph) || (this.userMode() === Eagle.UserMode.PaletteEditor && fileTypeLoaded === Eagle.FileType.Palette)){
                this.updateActiveFileInfo(fileTypeLoaded, file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
            }
        });
    };

    private _remotePaletteLoaded = (file : RepositoryFile, data : string) : void => {
        // if EAGLE is in palette editor mode, load the remote palette into EAGLE's editorPalette object.
        // if EAGLE is in graph editor mode, load the remote palette into EAGLE's palettes object.

        if (this.userMode() === Eagle.UserMode.PaletteEditor){
            let errors: string[] = [];
            this.editorPalette(Palette.fromOJSJson(data, file, errors));
            this.leftWindow().shown(true);
            Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
        } else {
            // check palette is not already loaded
            var alreadyLoadedPalette : Palette = this.findPaletteByFile(file);

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
    }

    private _reloadPalette = (file : RepositoryFile, data : string, palette : Palette) : void => {
        // close the existing version of the open palette
        if (palette !== null){
            this.closePalette(palette);
        }

        // load the new palette
        let errors: string[] = [];
        this.palettes.push(Palette.fromOJSJson(data, file, errors));

        if (errors.length > 0){
            // TODO: do stuff with the errors
        } else {
            this.leftWindow().shown(true);
            Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
        }
    }

    private updateActiveFileInfo = (fileType : Eagle.FileType, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, path : string, name : string) : void => {
        console.log("updateActiveFileInfo(): fileType:", Utils.translateFileTypeToString(fileType), "repositoryService:", repositoryService, "repositoryName:", repositoryName, "repositoryBranch:", repositoryBranch, "path:", path, "name:", name);

        // update the activeFileInfo with details of the repository the file was loaded from
        this.activeFileInfo().repositoryName = repositoryName;
        this.activeFileInfo().repositoryBranch = repositoryBranch;
        this.activeFileInfo().repositoryService = repositoryService;
        this.activeFileInfo().path = path;
        this.activeFileInfo().name = name;

        // communicate tp knockout that the value of the fileInfo has been modified (so it can update UI)
        if (fileType === Eagle.FileType.Graph){
            this.logicalGraph().fileInfo.valueHasMutated();
        } else if (fileType === Eagle.FileType.Palette){
            this.editorPalette().fileInfo.valueHasMutated();
        }
    }

    findPaletteByFile = (file : RepositoryFile) : Palette => {
        for (var i = 0 ; i < this.palettes().length ; i++){
            var p : Palette = this.palettes()[i];

            if (p.fileInfo().name === file.name){
                return p;
            }
        }

        return null;
    }

    closePalette = (palette : Palette) : void => {
        for (var i = 0 ; i < this.palettes().length ; i++){
            var p = this.palettes()[i];

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

        let fileName = palette.fileInfo().name;
        let json : object;

        // clone the palette and remove github info ready for local save
        let p_clone : Palette = palette.clone();
        p_clone.fileInfo().removeGitInfo();
        p_clone.fileInfo().updateEagleInfo();
        json = Palette.toOJSJson(p_clone);

        Utils.httpPostJSON('/saveFileToLocal', json, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            // NOTE: this stuff is a hacky way of saving a file locally
            var blob = new Blob([data]);
            var link = document.createElement('a');
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

        let defaultRepository: Repository = new Repository(palette.fileInfo().repositoryService, palette.fileInfo().repositoryName, palette.fileInfo().repositoryBranch, false);

        Utils.requestUserGitCommit(defaultRepository, this.getRepositoryList(Eagle.RepositoryService.GitHub),  palette.fileInfo().path, palette.fileInfo().name, (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            var repository : Repository = this.getRepository(repositoryService, repositoryName, repositoryBranch);
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

            var fullFileName : string = Utils.joinPath(filePath, fileName);

            var json : object;
            json = Palette.toOJSJson(palette);

            var jsonData : object = {
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
        var translatorURLSetting : Setting = Eagle.findSetting(Utils.TRANSLATOR_URL);

        Utils.requestUserString("Translator Url", "Enter the Translator Url", translatorURLSetting.value(), false, (completed : boolean, userString : string) : void => {
            // abort if user cancelled the action
            if (!completed)
                return;

            translatorURLSetting.value(userString);
        });
    };

    saveAsPNG = () : void => {
        if (this.userMode() === Eagle.UserMode.PaletteEditor){
            Utils.saveAsPNG('#paletteD3Div svg', this.editorPalette().fileInfo().name);
        } else {
            Utils.saveAsPNG('#logicalGraphD3Div svg', this.logicalGraph().fileInfo().name);
        }
    };

    toggleCollapseAllGroups = () : void => {
        console.log("toggleCollapseAllGroups");

        // first work out whether we should be collapsing or expanding
        let numCollapsed: number = 0;
        let numExpanded: number = 0;
        for (let i = 0 ; i < this.logicalGraph().getNodes().length ; i++){
            let node: Node = this.logicalGraph().getNodes()[i];

            if (node.isGroup()){
                if (node.isCollapsed()){
                    numCollapsed += 1;
                } else {
                    numExpanded += 1;
                }
            }
        }
        let collapse: boolean = numExpanded > numCollapsed;

        // now loop through and collapse or expand all group nodes
        for (let i = 0 ; i < this.logicalGraph().getNodes().length ; i++){
            let node: Node = this.logicalGraph().getNodes()[i];

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
            let node: Node = this.logicalGraph().getNodes()[i];

            if (!node.isGroup()){
                if (node.isCollapsed()){
                    numCollapsed += 1;
                } else {
                    numExpanded += 1;
                }
            }
        }
        let collapse: boolean = numExpanded > numCollapsed;

        // now loop through and collapse or expand all group nodes
        for (let i = 0 ; i < this.logicalGraph().getNodes().length ; i++){
            let node: Node = this.logicalGraph().getNodes()[i];

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
          '/static/docs/build/html/index.html',
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

    private static findSetting = (key : string) : Setting => {
        // check if Eagle constructor has not been run (usually the case when this module is being used from a tools script)
        if (typeof Eagle.settings === 'undefined'){
            return null;
        }

        for (var i = 0 ; i < Eagle.settings().length ; i++){
            var s = Eagle.settings()[i];

            if (s.getKey() === key){
                return s;
            }
        }
        return null;
    }

    static findSettingValue = (key : string) : any => {
        let setting = Eagle.findSetting(key);

        if (setting === null){
            console.warn("No setting", key);
            return null;
        }

        return setting.value();
    }

    getSettings = () : Setting[] => {
        return Eagle.settings();
    }

    resetSettingsDefaults = () : void => {
        for (var i = 0 ; i < Eagle.settings().length ; i++){
            Eagle.settings()[i].resetDefault();
        }
    }

    fileIsVisible = (file : RepositoryFile) : boolean => {
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            return file.type === Eagle.FileType.Graph || file.type === Eagle.FileType.Palette || file.type === Eagle.FileType.JSON;
        }
        if (this.userMode() === Eagle.UserMode.PaletteEditor){
            return file.type === Eagle.FileType.Palette || file.type === Eagle.FileType.JSON;
        }
        return false;
    };

    flagActiveDiagramHasMutated = () => {
        // flag diagram as mutated
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            this.logicalGraph.valueHasMutated();
        } else {
            this.editorPalette.valueHasMutated();
        }
    }

    addEdgeToLogicalGraph = () => {
        // check that there is at least one node in the graph, otherwise it is difficult to create an edge
        if (this.logicalGraph().getNumNodes() === 0){
            Utils.showUserMessage("Error", "Can't add an edge to a graph with zero nodes.");
            return;
        }

        // if input edge is null, then we are creating a new edge here, so initialise it with some default values
        let edge = new Edge(this.logicalGraph().getNodes()[0].getKey(), "", this.logicalGraph().getNodes()[0].getKey(), "", "");

        // display edge editing modal UI
        Utils.requestUserEditEdge(edge, this.logicalGraph(), (completed: boolean, edge: Edge) => {
            if (!completed){
                console.log("User aborted addEdgeToLogicalGraph()");
                return;
            }

            // validate edge
            let isValid: Eagle.LinkValid = Edge.isValid(this.logicalGraph(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), false, true);
            if (isValid === Eagle.LinkValid.Invalid || isValid === Eagle.LinkValid.Unknown){
                Utils.showUserMessage("Error", "Invalid edge");
                return;
            }

            // new edges might require creation of new nodes, don't use addEdgeComplete() here!
            this.logicalGraph().addEdge(edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), (edge: Edge) => {
                // trigger the diagram to re-draw with the modified edge
                this.flagActiveDiagramHasMutated();
            });
        });
    }

    editSelectedEdge = () => {
        if (this.selectedEdge() === null){
            console.log("Unable to edit selected edge: No edge selected");
            return;
        }

        // clone selected edge so that no changes to the original can be made by the user request modal
        let clone: Edge = this.selectedEdge().clone();

        Utils.requestUserEditEdge(clone, this.logicalGraph(), (completed: boolean, edge: Edge) => {
            if (!completed){
                console.log("User aborted editSelectedEdge()");
                return;
            }

            // validate edge
            let isValid: Eagle.LinkValid = Edge.isValid(this.logicalGraph(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), false, true);
            if (isValid === Eagle.LinkValid.Invalid || isValid === Eagle.LinkValid.Unknown){
                Utils.showUserMessage("Error", "Invalid edge");
                return;
            }

            // new edges might require creation of new nodes, we delete the existing edge and then create a new one using the full new edge pathway
            this.deleteSelectedEdge(true);
            this.logicalGraph().addEdge(edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), (edge: Edge) => {
                // trigger the diagram to re-draw with the modified edge
                this.flagActiveDiagramHasMutated();
            });
        });
    }

    deleteSelectedEdge = (suppressUserConfirmationRequest: boolean) => {
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
        var srcNodeName : string = this.logicalGraph().findNodeByKey(this.selectedEdge().getSrcNodeKey()).getName();
        var destNodeName : string = this.logicalGraph().findNodeByKey(this.selectedEdge().getDestNodeKey()).getName();

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
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            this.addNodeToLogicalGraph(this.selectedNode());
        } else {
            this.addNodeToEditorPalette(this.selectedNode());
        }
    }

    addSelectedNodeToPalette = () : void => {
        console.log("addSelectedNodeToPalette()");

        // build a list of palette names
        let paletteNames: string[] = this.buildPaletteNamesList();

        // ask user to select the destination node
        Utils.requestUserChoice("Destination Palette", "Please select the palette to which you'd like to add the node", paletteNames, 0, true, "New Palette Name", (completed : boolean, userString : string) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(userString)) {
                userString = userString + "." + Utils.getDiagramExtension(Eagle.FileType.Palette);
            }

            // get reference to palette (based on userString)
            let destinationPalette = this.findPalette(userString);

            // check that a palette was found
            if (destinationPalette === null){
                Utils.showUserMessage("Error", "Unable to find selected palette!");
                return;
            }

            // clone node
            let clone : Node = this.selectedNode().clone();

            // check if clone has embedded applications, if so, add them to destination palette and remove
            if (clone.hasInputApplication()){
                let inputClone = clone.getInputApplication().clone();
                clone.setInputApplication(null);
                Utils.addOrUpdateNodeInPalette(destinationPalette, inputClone);
            }
            if (clone.hasOutputApplication()){
                let outputClone = clone.getOutputApplication().clone();
                clone.setOutputApplication(null);
                Utils.addOrUpdateNodeInPalette(destinationPalette, outputClone);
            }
            if (clone.hasExitApplication()){
                let exitClone = clone.getExitApplication().clone();
                clone.setExitApplication(null);
                Utils.addOrUpdateNodeInPalette(destinationPalette, exitClone);
            }

            // add clone to palette
            Utils.addOrUpdateNodeInPalette(destinationPalette, clone);

            // mark the palette as modified
            destinationPalette.fileInfo().modified = true;

            // update tooltips
            this.updateTooltips();
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
        // delete the node
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            this.logicalGraph().removeNodeByKey(this.selectedNode().getKey());
            this.logicalGraph().fileInfo().modified = true;
        } else {
            this.editorPalette().removeNodeByKey(this.selectedNode().getKey());
            this.editorPalette().fileInfo().modified = true;
        }

        // no node left to be selected
        this.selectedNode(null);
        this.rightWindow().mode(Eagle.RightWindowMode.Repository);

        // flag the diagram as mutated so that the graph renderer will update
        this.flagActiveDiagramHasMutated();
    }

    addNodeToLogicalGraph = (node : Node) : void => {
        //console.log("addNodeToLogicalGraph()", node.getName(), node.getCategory(), node.getInputPorts().length, node.getOutputPorts().length, node.getFields().length);
        let pos = {x:0, y:0};

        // get new position for node
        if (Eagle.nodeDropLocation.x == 0 && Eagle.nodeDropLocation.y == 0){
            pos = this.getNewNodePosition();
        }else if (Eagle.nodeDropLocation){
            pos = Eagle.nodeDropLocation;
        }else{
            //if this is fired something has gone terribly wrong
            pos = {x:0, y:0};
            Utils.showNotification("Error", "Unexpected error occurred", "warning");
        }

        this.logicalGraph().addNode(node, pos.x, pos.y, (newNode: Node) => {
            this.logicalGraph.valueHasMutated();

            // make sure the new node is selected
            this.setSelection(Eagle.RightWindowMode.NodeInspector, newNode);
            Eagle.nodeDropLocation = {x:0, y:0};
        });
    }

    addNodeToEditorPalette = (node : Node) : void => {
        console.log("addNodeToEditorPalette()", node);

        // copy node
        var newNode : Node = node.clone();

        // assign the new node an appropriate key (one not already in use)
        newNode.setKey(Utils.newKey(this.editorPalette().getNodes()));

        //console.log("newNode", newNode);

        this.editorPalette().addNode(newNode);
        this.editorPalette.valueHasMutated();
    }

    addGraphNodesToPalette = () : void => {
        console.log("addGraphNodesToPalette()");

        // build a list of palette names
        let paletteNames: string[] = this.buildPaletteNamesList();

        // ask user to select the destination node
        Utils.requestUserChoice("Destination Palette", "Please select the palette to which you'd like to add the nodes", paletteNames, 0, true, "New Palette Name", (completed : boolean, userString : string) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(userString)) {
                userString = userString + "." + Utils.getDiagramExtension(Eagle.FileType.Palette);
            }

            // get reference to palette (based on userString)
            let destinationPalette = this.findPalette(userString);

            // check that a palette was found
            if (destinationPalette === null){
                Utils.showUserMessage("Error", "Unable to find selected palette!");
                return;
            }

            // copy nodes to palette
            for (let i = 0 ; i < this.logicalGraph().getNodes().length ; i++){
                let clone : Node = this.logicalGraph().getNodes()[i].clone();

                // check if clone has embedded applications, if so, add them to destination palette and remove
                if (clone.hasInputApplication()){
                    let inputClone = clone.getInputApplication().clone();
                    clone.setInputApplication(null);
                    Utils.addOrUpdateNodeInPalette(destinationPalette, inputClone);
                }
                if (clone.hasOutputApplication()){
                    let outputClone = clone.getOutputApplication().clone();
                    clone.setOutputApplication(null);
                    Utils.addOrUpdateNodeInPalette(destinationPalette, outputClone);
                }
                if (clone.hasExitApplication()){
                    let exitClone = clone.getExitApplication().clone();
                    clone.setExitApplication(null);
                    Utils.addOrUpdateNodeInPalette(destinationPalette, exitClone);
                }

                Utils.addOrUpdateNodeInPalette(destinationPalette, clone);
            }

            // mark the palette as modified
            destinationPalette.fileInfo().modified = true;

            // update tooltips
            this.updateTooltips();
        });
    }

    private buildPaletteNamesList = () : string[] => {
        let paletteNames : string[] = [];
        for (let i = 0 ; i < this.palettes().length; i++){
            // skip the dynamically generated palette that contains all nodes
            if (this.palettes()[i].fileInfo().name === Palette.DYNAMIC_PALETTE_NAME){
                continue;
            }
            // skip the built-in palette
            if (this.palettes()[i].fileInfo().name === Palette.BUILTIN_PALETTE_NAME){
                continue;
            }

            paletteNames.push(this.palettes()[i].fileInfo().name);
        }

        return paletteNames;
    }

    private findPalette = (name: string) : Palette => {
        let p: Palette = null;

        // look for palette in open palettes
        for (let i = 0 ; i < this.palettes().length ; i++){
            if (this.palettes()[i].fileInfo().name === name){
                p = this.palettes()[i];
                break;
            }
        }

        // if user asked for a new palette, create one
        if (p === null){
            p = new Palette();
            p.fileInfo().name = name;
            this.palettes.push(p);
        }

        return p;
    }

    /**
     * Adds an input port to the selected node via HTML.
     */
    addInputPortHTML = () : void => {
        var node: Node = <Node>this.getSelection();

        // check whether node already has maximum number of ports
        let maxPorts: number = Eagle.getCategoryData(node.getCategory()).maxInputs;
        console.log("maxPorts", maxPorts, "currentPorts", node.getInputPorts().length);
        if (node.getInputPorts().length >= maxPorts ){
            Utils.showUserMessage("Error", "This node may not contain more input ports. Maximum is " + maxPorts + " for " + node.getCategory() + " nodes.");
            return;
        }

        this.selectPortName(<Node>node, true);
    }

    /**
     * Adds an output port to the selected node via HTML arguments.
     */
    addOutputPortHTML = () : void => {
        var node: Node = <Node>this.getSelection();

        // check whether node already has maximum number of ports
        let maxPorts: number = Eagle.getCategoryData(node.getCategory()).maxOutputs;
        //console.log("maxPorts", maxPorts, "currentPorts", node.getOutputPorts().length);
        if (node.getOutputPorts().length >= maxPorts ){
            Utils.showUserMessage("Error", "This node may not contain more output ports. Maximum is " + maxPorts + " for " + node.getCategory() + " nodes.");
            return;
        }

        this.selectPortName(<Node>node, false);
    }

    /**
     * Adds an field to the selected node via HTML.
     */
    addFieldHTML = () : void => {
        var node = this.getSelection();
        this.selectFieldName(<Node>node);
    }

    /**
     * Shows a list of input/output port names for selection.
     */
    selectPortName = (node : Node, isInputPort : boolean) => {
        var uniquePortNames : string[];

        // if in palette editor mode, get port names list from the palette,
        // if in logical graph editor mode, get port names list from the logical graph
        if (this.userMode() === Eagle.UserMode.PaletteEditor){
            uniquePortNames = Utils.getPortNameList(this.editorPalette());
        } else {
            uniquePortNames = Utils.getPortNameList(this.logicalGraph());
        }

        var titlePrefix : string = isInputPort ? "Input " : "Output ";
        Utils.requestUserChoice(titlePrefix + "Port Name", "Please select a port name", uniquePortNames, 0, true, "Custom Port Name", (completed : boolean, userString : string) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // add port with the chosen name
            node.addPort(new Port(Utils.uuidv4(), userString, false, Eagle.DataType.Unknown), isInputPort);

            // flag active diagram as mutated
            this.flagActiveDiagramHasMutated();
            this.flagActiveFileModified();
            this.selectedNode.valueHasMutated();
        });
    }

    selectFieldName = (node: Node) => {
        var uniqueFieldNames : string[];

        // if in palette editor mode, get field names list from the palette,
        // if in logical graph editor mode, get field names list from the logical graph
        if (this.userMode() === Eagle.UserMode.PaletteEditor){
            uniqueFieldNames = Utils.getFieldTextList(this.editorPalette());
        } else {
            uniqueFieldNames = Utils.getFieldTextList(this.logicalGraph());
        }

        Utils.requestUserChoice("Add Parameter", "Please select a parameter name, or create a custom name", uniqueFieldNames, 0, true, "Custom Parameter Name", (completed : boolean, userString : string) => {
            if (!completed){
                return;
            }

            // produce a name for this field
            var fieldName = Utils.fieldTextToFieldName(userString);

            // add the field
            node.addField(new Field(userString, fieldName, "", "", false, Eagle.DataType.Unknown));

            // flag active diagram as mutated
            this.flagActiveDiagramHasMutated();
            this.flagActiveFileModified();
            this.selectedNode.valueHasMutated();
        });
    }

    changeNodeParent = () => {
        // build list of node name + ids (exclude self)
        var nodeList : string[] = [];
        var selectedChoiceIndex = 0;

        // build list of nodes that are candidates to be the parent
        for (var i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            var node : Node = this.logicalGraph().getNodes()[i];

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
        Utils.requestUserChoice("Node Parent Id", "Select a parent node", nodeList, selectedChoiceIndex, false, "", (completed : boolean, userString : string) => {
            if (!completed)
                return;

            // change the parent
            var newParentKey : number = parseInt(userString.substring(userString.lastIndexOf(" ") + 1), 10);

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

    changeNodeSubject = () => {
        // build list of node name + ids (exclude self)
        var nodeList : string[] = [];
        var selectedChoiceIndex = 0;

        // build list of nodes that are candidates to be the subject
        for (var i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            var node : Node = this.logicalGraph().getNodes()[i];

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
        Utils.requestUserChoice("Node Subject Id", "Select a subject node", nodeList, selectedChoiceIndex, false, "", (completed : boolean, userString : string) => {
            if (!completed)
                return;

            // change the subject
            var newSubjectKey : number = parseInt(userString.substring(userString.lastIndexOf(" ") + 1), 10);
            this.selectedNode().setSubjectKey(newSubjectKey);
            this.selectedNode.valueHasMutated();
            this.flagActiveDiagramHasMutated();
        });
    }

    selectEdge = (nodeKey : number, portId : string) : void => {
        for (var i = 0 ; i < this.logicalGraph().getEdges().length; i++){
            var edge : Edge = this.logicalGraph().getEdges()[i];

            if (edge.getSrcNodeKey() === nodeKey && edge.getSrcPortId() === portId ||
                edge.getDestNodeKey() === nodeKey && edge.getDestPortId() === portId){
                this.selectedEdge(edge);
                this.selectedNode(null);
                this.setSelection(Eagle.RightWindowMode.EdgeInspector, edge);
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
        var portId;
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
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            var edges : Edge[] = this.logicalGraph().getEdges();

            for (var i = edges.length - 1; i >= 0; i--){
                if (edges[i].getSrcPortId() === portId || edges[i].getDestPortId() === portId){
                    console.log("Remove incident edge", edges[i].getSrcPortId(), "->", edges[i].getDestPortId());
                    edges.splice(i, 1);
                }
            }
        }
    }

    //dragdrop

    nodeDragStart = (eagle : Eagle, e : JQueryEventObject) => {
        //specifies where the node can be dropped
        Eagle.nodeDropped = e.target;
        $(".leftWindow").addClass("noDropTarget");
        $(".rightWindow").addClass("noDropTarget");
        $(".navbar").addClass("noDropTarget");

        //grabs and sets the node's icon and sets it as drag image.
        var drag = Eagle.nodeDropped.getElementsByClassName('input-group-prepend')[0] as HTMLElement;
        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(drag, 0, 0);
        return true;
    }


    nodeDragEnd = (e : JQueryEventObject) => {
        $(".leftWindow").removeClass("noDropTarget");
        $(".rightWindow").removeClass("noDropTarget");
        $(".navbar").removeClass("noDropTarget");
        return true;
    }

    nodeDragOver = (e : JQueryEventObject) => {
        return false;
    }

    nodeDrop = (eagle : Eagle,e : JQueryEventObject) => {
        Eagle.nodeDropLocation = this.getNodeDropLocation(e);
        let nodeButton = Eagle.nodeDropped.getElementsByTagName('button')[0] as HTMLElement;
         nodeButton.click();
    }

    getNodeDropLocation = (e : JQueryEventObject)  : {x:number, y:number}=> {
        let x = e.clientX;
        let y = e.clientY;
        return {x:x, y:y};
    };

    rightWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) => {
        var img : HTMLImageElement = document.createElement("img");

        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(img, 0, 0);
        Eagle.dragStartX = e.clientX;
        this.leftWindow().adjusting(false);
        this.rightWindow().adjusting(true);

        return true;
    }

    //workaround to aviod left or right window adjusting on any and all drag events
    rightWindowAdjustEnd = (eagle : Eagle, e : JQueryEventObject) => {
        this.leftWindow().adjusting(false);
        this.rightWindow().adjusting(false);

        return true;
    }

    sideWindowAdjust = (eagle : Eagle, e : JQueryEventObject) => {
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

        var dragDiff : number = e.clientX - Eagle.dragStartX;
        var newWidth : number;

        if (this.leftWindow().adjusting()){
            newWidth = this.leftWindow().width() + dragDiff;
            this.leftWindow().width(newWidth);
            Utils.setLeftWindowWidth(newWidth);
        } else if(this.rightWindow().adjusting()) {
            newWidth = this.rightWindow().width() - dragDiff;
            this.rightWindow().width(newWidth);
            Utils.setRightWindowWidth(newWidth);
        }

        Eagle.dragStartX = e.clientX;

        return true;
    }

    spinCollapseIcon = (item:any, e:JQueryEventObject) => {
        //this function handels only the visible ui element that indicates the state of the collapsable object.
        //the collapse functyion itself is handled by bootstrap.
        //getting event target for collapse action.
        var collapseTarget = $(e.currentTarget) as JQuery<HTMLElement>;
        collapseTarget = collapseTarget.find('i').first();
        //getting current state of collapsable object.
        var triggerClass = collapseTarget.hasClass("translationToggle");
        var toggleState : boolean
        
        if (triggerClass){
            //this is for setting toggle icons in the translation menu, as the collapse functions differently and the content is nested differently.
            //the class "closedIcon" turns the collapse arrow icon by 270 degrees and is being toggled depending on the current state of the collapse.
            $(".translationToggle").addClass("closedIcon")
            var toggleState = collapseTarget.parent().parent().parent().children(".collapse").hasClass('show');
        }else{
            //This is for collapse icon on the node palettes and in the node settings menu.
            var toggleState = collapseTarget.parent().parent().children(".collapse").hasClass('show');
        }

        if(toggleState){
            collapseTarget.addClass("closedIcon");
        }else{
            collapseTarget.removeClass("closedIcon");
        }
    }

    leftWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) => {
        var img : HTMLImageElement = document.createElement("img");
        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(img, 0, 0);

        Eagle.dragStartX = e.clientX;
        this.leftWindow().adjusting(true);
        this.rightWindow().adjusting(false);

        return true;
    }

    //workaround to aviod left or right window adjusting on any and all drag events
    leftWindowAdjustEnd = (eagle : Eagle, e : JQueryEventObject) => {
        this.leftWindow().adjusting(false);
        this.rightWindow().adjusting(false);

        return true;
    }

    // NOTE: enabling the tooltips must be delayed slightly to make sure the html has been generated (hence the setTimeout)
    // NOTE: now needs a timeout longer that 1ms! UGLY HACK TODO
    updateTooltips = () : void => {
        var eagle : Eagle = this;

        setTimeout(function(){
            // destroy orphaned tooltips
            $('.tooltip[role="tooltip"]').remove();

            $('[data-toggle="tooltip"]').tooltip({
                boundary: 'window',
                trigger : 'hover'
            });

            // update title on all left window template palette buttons
            $('.leftWindowDisplay.templatePalette .input-group').each(function(index: number, element: HTMLElement){
                $(element).attr('data-original-title', eagle.templatePalette().getNodes()[index].getHelpHTML());
            });

            // update title on all left window palette buttons
            $('.leftWindowDisplay .palette').each(function(i: number, iElement: HTMLElement){
                $(iElement).find('.input-group').each(function(j: number, jElement: HTMLElement){
                    $(jElement).attr('data-original-title', eagle.palettes()[i].getNodes()[j].getHelpHTML());
                });
            });

            // update title on all right window component buttons
            if (eagle.selectedNode() !== null && eagle.selectedNode().getInputApplication() !== null)
                $('.rightWindowDisplay .input-application inspector-component .input-group-prepend').attr('data-original-title', eagle.selectedNode().getInputApplication().getHelpHTML());
            if (eagle.selectedNode() !== null && eagle.selectedNode().getOutputApplication() !== null)
                $('.rightWindowDisplay .output-application inspector-component .input-group-prepend').attr('data-original-title', eagle.selectedNode().getOutputApplication().getHelpHTML());
            if (eagle.selectedNode() !== null && eagle.selectedNode().getExitApplication() !== null)
                $('.rightWindowDisplay .exit-application inspector-component .input-group-prepend').attr('data-original-title', eagle.selectedNode().getExitApplication().getHelpHTML());
        }, 150);
    }

    selectedEdgeValid = () : Eagle.LinkValid => {
        console.log("selectedEdgeValid()");
        return Edge.isValid(this.logicalGraph(), this.selectedEdge().getSrcNodeKey(), this.selectedEdge().getSrcPortId(), this.selectedEdge().getDestNodeKey(), this.selectedEdge().getDestPortId(), false, true);
    }

    printLogicalGraphNodesTable = () : void => {
        var tableData : any[] = [];

        // add logical graph nodes to table
        for (var i = 0; i < this.logicalGraph().getNodes().length; i++){
            var node : Node = this.logicalGraph().getNodes()[i];

            tableData.push({
                "name":node.getName(),
                "key":node.getKey(),
                "categoryType":node.getCategoryType(),
                "category":node.getCategory(),
                "expanded":node.getExpanded(),
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
        var tableData : any[] = [];

        // add logical graph nodes to table
        for (var i = 0; i < this.logicalGraph().getEdges().length; i++){
            var edge : Edge = this.logicalGraph().getEdges()[i];

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

    printEditorPaletteTable = () : void => {
        var tableData : any[] = [];

        // add logical graph nodes to table
        for (var i = 0; i < this.editorPalette().getNodes().length; i++){
            var node : Node = this.editorPalette().getNodes()[i];

            tableData.push({"name":node.getName(), "key":node.getKey(), "categoryType":node.getCategoryType(), "category":node.getCategory()});
        }

        console.table(tableData);
    }

    // NOTE: input type here is NOT a Node, it is a Node ViewModel as defined in components.ts
    selectNodeInHierarchy = (nodeViewModel : any) : void => {
        var node : Node = this.logicalGraph().findNodeByKey(nodeViewModel.key);
        node.toggleExpanded();

        // de-select all nodes, then select this node
        // TODO: we now have multiple loops here (findNodeByKey(), setSelected, etc), they could be consolidated into one loop
        for (var i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            this.logicalGraph().getNodes()[i].setSelected(false);
        }
        node.setSelected(true);

        this.setSelection(Eagle.RightWindowMode.Hierarchy, node);

        this.flagActiveDiagramHasMutated();
    }

    selectInputApplicationNode = (nodeViewModel : any) : void => {
        console.log("selectInputApplicationNode()", nodeViewModel);

        this.selectedNode(this.selectedNode().getInputApplication());
    }

    selectOutputApplicationNode = (nodeViewModel : any) : void => {
        console.log("selectOutputApplicationNode()", nodeViewModel);

        this.selectedNode(this.selectedNode().getOutputApplication());
    }

    selectExitApplicationNode = (nodeViewModel : any) : void => {
        console.log("selectExitApplicationNode()", nodeViewModel);

        this.selectedNode(this.selectedNode().getExitApplication());
    }

    editField = (fieldIndex: number, input: boolean): void => {
        console.log("editField() node:", this.selectedNode().getName(), "fieldIndex:", fieldIndex, "input", input);

        // get a reference to the field we are editing
        let field: Field = this.selectedNode().getFields()[fieldIndex];

        Utils.requestUserEditField(field, (completed : boolean, newField: Field) => {
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

    allowEdgeEditing = (): boolean => {
        return Eagle.findSettingValue(Utils.ALLOW_EDGE_EDITING);
    }

    showFieldValuePicker = (fieldIndex : number, input : boolean) : void => {
        console.log("ShowFieldValuePicker() node:", this.selectedNode().getName(), "fieldIndex:", fieldIndex, "input", input);

        // get the key for the currently selected node
        var selectedNodeKey : number = this.selectedNode().getKey();

        // build list of nodes that are attached to this node
        var nodes : string[] = [];
        for (let i = 0 ; i < this.logicalGraph().getEdges().length ; i++){
            var edge : Edge = this.logicalGraph().getEdges()[i];

            // add output nodes to the list
            if (edge.getSrcNodeKey() === selectedNodeKey){
                var destNode : Node = this.logicalGraph().findNodeByKey(edge.getDestNodeKey());
                var s : string = "output:" + destNode.getName() + ":" + destNode.getKey();
                nodes.push(s);
            }

            // add input nodes to the list
            if (edge.getDestNodeKey() === selectedNodeKey){
                var srcNode : Node = this.logicalGraph().findNodeByKey(edge.getSrcNodeKey());
                var s : string = "input:" + srcNode.getName() + ":" + srcNode.getKey();
                nodes.push(s);
            }
        }

        // ask the user to choose a node
        Utils.requestUserChoice("Select node", "Choose the input or output node to connect to this parameter", nodes, 0, false, "", (completed : boolean, userString : string) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // split the user string into input/output, name, key
            var isInput : boolean = userString.split(":")[0] === "input";
            var key : string = userString.split(":")[2];

            var newValue : string;
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
        var x = this.selectedNode();
        this.selectedNode(null);
        var that = this;
        setTimeout(function(){
            that.selectedNode(x);
        }, 1);
    }

    private setNodeApplication = (title: string, message: string, callback:(node:Node) => void) : void => {
        console.log("setNodeApplication()");

        var applicationList : string[] = this.getApplicationList();

        // add "None" to the application list
        applicationList.push(Node.NO_APP_STRING);

        Utils.requestUserChoice(title, message, applicationList, 0, false, "", (completed : boolean, userString : string) => {
            if (!completed){
                return;
            }

            console.log("userString:" + userString);

            // abort if the user picked "None"
            if (userString === Node.NO_APP_STRING){
                console.log("User selected no application");
                callback(null);
                this.updateTooltips();
                return;
            }

            var paletteName = userString.split(":")[0];
            var nodeName    = userString.split(":")[1];

            console.log("Find application", paletteName, nodeName);

            var application : Node = this.getApplication(paletteName, nodeName);

            // clone the input application to make a local copy
            // TODO: at the moment, this clone just 'exists' nowhere in particular, but it should be added to the components dict in JSON V3
            let clone : Node = application.clone();
            let newKey : number = Utils.newKey(this.logicalGraph().getNodes());
            clone.setKey(newKey);

            // set nodeKey on clone's ports to match the clone
            for (let i = 0 ; i < clone.getInputPorts().length ; i++){
                let port = clone.getInputPorts()[i];
                port.setNodeKey(newKey);
            }
            for (let i = 0 ; i < clone.getOutputPorts().length ; i++){
                let port = clone.getOutputPorts()[i];
                port.setNodeKey(newKey);
            }

            callback(clone);
            this.updateTooltips();
        });
    }

    setNodeInputApplication = () : void => {
        console.log("setNodeInputApplication()");

        this.setNodeApplication("Input Application", "Choose an input application", this.selectedNode().setInputApplication);
    }

    setNodeOutputApplication = () : void => {
        console.log("setNodeOutputApplication()");

        this.setNodeApplication("Output Application", "Choose an output application", this.selectedNode().setOutputApplication);
    }

    setNodeExitApplication = () : void => {
        console.log("setNodeExitApplication()");

        this.setNodeApplication("Exit Application", "Choose an exit application", this.selectedNode().setExitApplication);
    }

    getNewNodePosition = () : {x:number, y:number} => {
        // get screen size
        let width = $('#logicalGraphD3Div').width();
        let height = $('#logicalGraphD3Div').height();

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
        if (service === Eagle.RepositoryService.Unknown || repository === "" || branch === "" || path === "" || filename === ""){
            console.log("No auto load");
            return;
        }

        // load
        this.selectFile(new RepositoryFile(new Repository(service, repository, branch, false), path, filename));
    }

    copyGraphUrl = (): void => {
        // get reference to the LG fileInfo object
        let fileInfo: FileInfo = this.logicalGraph().fileInfo();

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

    static getCategoryData = (category : Eagle.Category) : Eagle.CategoryData => {
        let c = Eagle.cData[category];

        if (typeof c === 'undefined'){
            console.error("Could not fetch category data for category", category);
            return {
                isData: false,
                isGroup: false,
                isResizable: false,
                maxInputs: 0,
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
        Start              : {isData: false, isGroup: false, isResizable: false, maxInputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "play_arrow", color: "#229954"},
        End                : {isData: false, isGroup: false, isResizable: false, maxInputs: 1, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "stop", color: "#CB4335"},
        Comment            : {isData: false, isGroup: false, isResizable: true, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: false, icon: "comment", color: "#799938"},
        Description        : {isData: false, isGroup: false, isResizable: true, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: false, icon: "note", color: "#9B3065"},
        Scatter            : {isData: false, isGroup: true, isResizable: true, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "call_split", color: "#DDAD00"},
        Gather             : {isData: false, isGroup: true, isResizable: true, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "call_merge", color: "#D35400"},
        MKN                : {isData: false, isGroup: true, isResizable: true, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: true, canHaveExitApplication: false, canHaveParameters: true, icon: "waves", color: "#D32000"},
        GroupBy            : {isData: false, isGroup: true, isResizable: true, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: true, canHaveExitApplication: false, canHaveParameters: true, icon: "group_work", color: "#7F8C8D"},
        Loop               : {isData: false, isGroup: true, isResizable: true, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveExitApplication: true, canHaveParameters: true, icon: "loop", color: "#512E5F"},

        PythonApp          : {isData: false, isGroup: false, isResizable: false, maxInputs: Number.MAX_SAFE_INTEGER, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "extension", color: "#3498DB"},
        BashShellApp       : {isData: false, isGroup: false, isResizable: false, maxInputs: Number.MAX_SAFE_INTEGER, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "attach_money", color: "#1C2833"},
        DynlibApp          : {isData: false, isGroup: false, isResizable: false, maxInputs: Number.MAX_SAFE_INTEGER, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "menu_book", color: "#3470AA"},
        Mpi                : {isData: false, isGroup: false, isResizable: false, maxInputs: Number.MAX_SAFE_INTEGER, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "apps", color: "#1E90FF"},
        Docker             : {isData: false, isGroup: false, isResizable: false, maxInputs: Number.MAX_SAFE_INTEGER, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "computer", color: "#331C54"},

        NGAS               : {isData: true, isGroup: false, isResizable: false, maxInputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "storage", color: "#394BB2"},
        S3                 : {isData: true, isGroup: false, isResizable: false, maxInputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "cloud_queue", color: "#394BB2"},
        Memory             : {isData: true, isGroup: false, isResizable: false, maxInputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "memory", color: "#394BB2"},
        File               : {isData: true, isGroup: false, isResizable: false, maxInputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "description", color: "#394BB2"},
        Plasma             : {isData: true, isGroup: false, isResizable: false, maxInputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "star", color: "#394BB2"},

        Service            : {isData: false, isGroup: false, isResizable: false, maxInputs: Number.MAX_SAFE_INTEGER, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "build", color: "#EB1672"},
        ExclusiveForceNode : {isData: false, isGroup: true, isResizable: true, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: false, icon: "picture_in_picture", color: "#000000"},

        Variables          : {isData: false, isGroup: false, isResizable: false, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "tune", color: "#C10000"},
        Branch             : {isData: false, isGroup: false, isResizable: false, maxInputs: Number.MAX_SAFE_INTEGER, maxOutputs: 2, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "share", color: "#00BDA1"},

        Unknown            : {isData: false, isGroup: false, isResizable: false, maxInputs: Number.MAX_SAFE_INTEGER, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: true, icon: "device_unknown", color: "#FF66CC"},
        None               : {isData: false, isGroup: false, isResizable: false, maxInputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveExitApplication: false, canHaveParameters: false, icon: "block", color: "#FF66CC"}
    };
}

export namespace Eagle
{
    export enum UserMode {
        PaletteEditor,
        LogicalGraphEditor
    }

    export enum LeftWindowMode {
        None,
        Palettes,
        TemplatePalette
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
        TemplatePalette,
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

    export type CategoryData = {isData: boolean, isGroup:boolean, isResizable:boolean, maxInputs: number, maxOutputs: number, canHaveInputApplication: boolean, canHaveOutputApplication: boolean, canHaveExitApplication: boolean, canHaveParameters: boolean, icon: string, color: string};
}
