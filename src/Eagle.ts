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

export class Eagle {
    // palette editor mode
    editorPalette : ko.Observable<Palette>;
    templatePalette : ko.Observable<Palette>;

    // graph editor mode
    palettes : ko.ObservableArray<Palette>;
    logicalGraph : ko.Observable<LogicalGraph>;

    userMode : ko.Observable<Eagle.UserMode>;
    repositories : ko.ObservableArray<Repository>;
    leftWindowShown : ko.Observable<boolean>;
    leftWindowMode : ko.Observable<Eagle.LeftWindowMode>;
    rightWindowShown : ko.Observable<boolean>;
    rightWindowMode : ko.Observable<Eagle.RightWindowMode>;

    selectedNode : ko.Observable<Node>;
    selectedEdge : ko.Observable<Edge>;

    translator : ko.Observable<Translator>;

    rightWindowWidth : ko.Observable<number>;
    leftWindowWidth : ko.Observable<number>;

    globalOffsetX : number = 0;
    globalOffsetY : number = 0;
    globalScale : number = 1.0;

    static dataNodes : Node[] = [];
    static dataCategories : Eagle.Category[] = [];
    static applicationNodes : Node[] = [];
    static applicationCategories : Eagle.Category[] = [];

    static dragStartX : number;
    static adjustingLeftWindow : boolean; // true if adjusting left window, false if adjusting right window

    static selectedNodeKey : number;

    constructor(){
        this.editorPalette = ko.observable(null);
        this.palettes = ko.observableArray();
        this.templatePalette = ko.observable(null);
        this.logicalGraph = ko.observable(null);

        this.userMode = ko.observable(Eagle.UserMode.LogicalGraphEditor);
        this.repositories = ko.observableArray();
        this.leftWindowShown = ko.observable(false);
        this.leftWindowMode = ko.observable(Eagle.LeftWindowMode.Palettes);
        this.rightWindowShown = ko.observable(true);
        this.rightWindowMode = ko.observable(Eagle.RightWindowMode.Repository);

        this.selectedNode = ko.observable(null);
        this.selectedEdge = ko.observable(null);

        this.translator = ko.observable(new Translator());

        this.rightWindowWidth = ko.observable(Utils.getRightWindowWidth());
        this.leftWindowWidth = ko.observable(Utils.getLeftWindowWidth());

        // HACK - subscribe to the be notified of changes to the templatePalette
        // when the templatePalette changes, we need to enable the tooltips
        this.templatePalette.subscribe(this.updateTooltips);
        this.editorPalette.subscribe(this.updateTooltips);
        this.palettes.subscribe(this.updateTooltips);
        this.selectedNode.subscribe(this.updateTooltips);
    }

    isPaletteEditorModeEnabled = () : boolean => {
        return Config.enablePaletteEditorMode;
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

        // TODO: move to a function on the FileInfo class
        if (fileInfo.repositoryName !== ""){
            if (fileInfo.path === ""){
                return fileInfo.repositoryService + ": " + fileInfo.repositoryName + " (" + fileInfo.repositoryBranch + "): " + fileInfo.name;
            } else {
                return fileInfo.repositoryService + ": " + fileInfo.repositoryName + " (" + fileInfo.repositoryBranch + "): " + fileInfo.path + "/" + fileInfo.name;
            }
        } else {
            return fileInfo.name;
        }
    }, this);

    getRepositoryList = (service : Eagle.RepositoryService) : string[] => {
        var list : string[] = [];

        for (var i = 0 ; i < this.repositories().length ; i++){
            if (this.repositories()[i].service === service){
                list.push(this.repositories()[i].name + " (" + this.repositories()[i].branch + ")");
            }
        }

        return list;
    };

    getRepository = (service : Eagle.RepositoryService, name : string, branch : string) : Repository | null => {
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

        this.leftWindowMode(Eagle.LeftWindowMode.TemplatePalette);
        this.leftWindowShown(true);

        // set the right window mode to show repository
        this.rightWindowMode(Eagle.RightWindowMode.Repository);
    }

    setGraphEditorMode = () : void => {
        this.userMode(Eagle.UserMode.LogicalGraphEditor);

        // close left window if no nodes in palette
        if (this.palettes().length === 0){
            this.leftWindowShown(false);
        }
        this.leftWindowMode(Eagle.LeftWindowMode.Palettes);
    }

    /**
     * This function is repeatedly called throughout the EAGLE operation.
     * It resets al fields in the editor menu.
     */
    resetEditor = () : void => {
        this.selectedNode(null);
        this.selectedEdge(null);

        // Show the last open repository.
        this.rightWindowMode(Eagle.RightWindowMode.Repository);
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
        switch (rightWindowMode){
            case Eagle.RightWindowMode.Hierarchy:
            case Eagle.RightWindowMode.NodeInspector:
                // de-select all the nodes and then select this node
                for (var i = 0 ; i < this.logicalGraph().getNodes().length; i++){
                    this.logicalGraph().getNodes()[i].setSelected(false);
                    this.logicalGraph().getNodes()[i].setShowPorts(false);
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
            this.rightWindowMode(rightWindowMode);
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

        console.log("Eagle.getPGT() : algorithm index:", algorithmIndex, "algorithm name:", Config.translationAlgorithms[algorithmIndex]);

        this.translator().submit({
            algo: Config.translationAlgorithms[algorithmIndex],
            lg_name: this.logicalGraph().fileInfo().name,
            json_data: JSON.stringify(LogicalGraph.toOJSJson(this.logicalGraph()))
        });

        console.log("json data");
        console.log("---------");
        console.log(LogicalGraph.toOJSJson(this.logicalGraph()));
        console.log("---------");
    }

    /**
     * Uploads a file from a local file location.
     * @param e The event to be handled.
     */
    uploadGraphFile = () : void => {
        var uploadedGraphFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedGraphFile");
        var fileFullPath : string = uploadedGraphFileInputElement.value;

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

            // check that file contains a "modelData" attribute
            if (typeof dataObject.modelData === 'undefined'){
                Utils.showUserMessage("Missing 'modelData' section", "You'll need to add this section manually. More details at: https://jira.icrar.uwa.edu.au/projects/EAGLE/issues/EAGLE-65");
                return;
            }

            var fileType : Eagle.FileType = Utils.translateStringToFileType(dataObject.modelData.fileType);

            // Only load graph files.
            if (fileType == Eagle.FileType.Graph) {
                this.logicalGraph(LogicalGraph.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", fileFullPath)));
                Utils.showNotification("Success", Utils.getFileNameFromFullPath(fileFullPath) + " has been loaded.", "success");
            } else {
                Utils.showUserMessage("Error", "This is not a graph file!");
            }

            // update the activeFileInfo with details of the repository the file was loaded from
            this.updateFileInfo(fileType, Eagle.RepositoryService.Unknown, "", "", Utils.getFilePathFromFullPath(fileFullPath), Utils.getFileNameFromFullPath(fileFullPath));
        });
    }

    /**
     * Loads a custom palette from a file.
     */
    uploadPaletteFile = () : void => {
        var uploadedPaletteFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedPaletteFile");
        var fileFullPath : string = uploadedPaletteFileInputElement.value;

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

            var p : Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", fileFullPath));

            if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
                this.palettes.push(p);
            } else {
                this.editorPalette(p);
            }

            // show the left window
            this.leftWindowShown(true);

            Utils.showNotification("Success", Utils.getFileNameFromFullPath(fileFullPath) + " has been loaded.", "success");

            // update the activeFileInfo with details of the repository the file was loaded from
            this.updateFileInfo(fileType, Eagle.RepositoryService.Unknown, "", "", Utils.getFilePathFromFullPath(fileFullPath), Utils.getFileNameFromFullPath(fileFullPath));
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
            var node : Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), "Description", "", Eagle.Category.Description, Eagle.CategoryType.Other, Node.DEFAULT_POSITION_X, Node.DEFAULT_POSITION_Y);
            node.setColor(Utils.getColorForNode(Eagle.Category.Description));
            this.logicalGraph().addNode(node, null);
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

            var startNode : Node = new Node(Utils.newKey(this.editorPalette().getNodes()), "Start", "", Eagle.Category.Start, Eagle.CategoryType.Control, Node.DEFAULT_POSITION_X, Node.DEFAULT_POSITION_Y);
            startNode.setColor(Utils.getColorForNode(Eagle.Category.Start));
            this.editorPalette().addNode(startNode);

            var endNode : Node = new Node(Utils.newKey(this.editorPalette().getNodes()), "End", "", Eagle.Category.End, Eagle.CategoryType.Control, Node.DEFAULT_POSITION_X, Node.DEFAULT_POSITION_Y);
            endNode.setColor(Utils.getColorForNode(Eagle.Category.End));
            this.editorPalette().addNode(endNode);

            var commentNode : Node = new Node(Utils.newKey(this.editorPalette().getNodes()), "Comment", "", Eagle.Category.Comment, Eagle.CategoryType.Other, Node.DEFAULT_POSITION_X, Node.DEFAULT_POSITION_Y);
            commentNode.setColor(Utils.getColorForNode(Eagle.Category.Comment));
            this.editorPalette().addNode(commentNode);

            var descriptionNode : Node = new Node(Utils.newKey(this.editorPalette().getNodes()), "Description", "", Eagle.Category.Description, Eagle.CategoryType.Other, Node.DEFAULT_POSITION_X, Node.DEFAULT_POSITION_Y);
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
        if (fileName == "") {
            fileName = "Diagram" + "." + Utils.getDiagramExtension(fileType);
        }

        var json : object;
        if (fileType === Eagle.FileType.Graph){
            // clone the logical graph and remove github info ready for local save
            var lg_clone : LogicalGraph = this.logicalGraph().clone();
            lg_clone.fileInfo().removeGitInfo();
            json = LogicalGraph.toOJSJson(lg_clone);
        } else {
            // clone the palette and remove github info ready for local save
            var p_clone : Palette = this.editorPalette().clone();
            p_clone.fileInfo().removeGitInfo();
            json = Palette.toOJSJson(p_clone);
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

        // DEBUG:
        console.log("url", url);

        Utils.httpPostJSON(url, json, (error : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Failed to save a file! Make sure you have write permission in the selected repository : " + repository.name);
                console.error("Error: " + JSON.stringify(error, null, 2));
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
            this.rightWindowMode(Eagle.RightWindowMode.Repository);
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

        Utils.requestUserGitCommit(Eagle.RepositoryService.GitHub, this.getRepositoryList(Eagle.RepositoryService.GitHub),  this.activeFileInfo().path, this.activeFileInfo().name, (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
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

            this.activeFileInfo().repositoryService = repositoryService;
            this.activeFileInfo().repositoryName = repositoryName;
            this.activeFileInfo().repositoryBranch = repositoryBranch;

            // check filePath
            this.activeFileInfo().path = filePath;

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(fileName)) {
                fileName = fileName + "." + Utils.getDiagramExtension(fileType);
            }

            // Change the title name.
            this.activeFileInfo().name = fileName;

            // Set correct diagram type.
            this.activeFileInfo().type = fileType;

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

            this.saveDiagramToGit(this.getRepository(this.activeFileInfo().repositoryService, this.activeFileInfo().repositoryName, this.activeFileInfo().repositoryBranch), fileType, this.activeFileInfo().path, this.activeFileInfo().name, userString);
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
                token = GitHub.getAccessToken();
                break;
            case Eagle.RepositoryService.GitLab:
                token = GitLab.getAccessToken();
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
                return;
        }

        // check that access token is defined
        if (token == undefined) {
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

            var fileType : Eagle.FileType = Utils.translateStringToFileType((<any>data).modelData.fileType);

            if (fileType == Eagle.FileType.TemplatePalette) {
                this.templatePalette(Palette.fromOJSJson(JSON.stringify(data), new RepositoryFile(Repository.DUMMY, "", Config.templatePaletteFileName)));
            } else {
                Utils.showUserMessage("Error", "File type is not a template palette!");
            }

            // Adding event ports.
            this.templatePalette().addEventPorts();
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
        if (isModified){
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
        Utils.requestUserAddCustomRepository((completed : boolean, repositoryService : string, repositoryName : string, repositoryBranch : string) : void => {
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
        Utils.requestUserConfirm("Remove Custom Repository", "Remove this repository from the list?", "OK", "Cancel", (confirmed : boolean) =>{
            if (confirmed){
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
                        localStorage.removeItem(repository.name + "|" + repository.branch + ".github_repository_and_branch");
                        GitLab.loadRepoList(this);
                        break;
                    default:
                        Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repository.service + ")");
                        return;
                }
            }
        });
    };

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

            // flag fetching as incomplete
            file.isFetching(false);

            // display error if one occurred
            if (error != null){
                Utils.showUserMessage("Error", "Failed to load a file!");
                console.error(error);
                return;
            }

            //console.log("file", file, "file.fileType", file.type);

            if (file.type === Eagle.FileType.Graph) {
                if (this.userMode() === Eagle.UserMode.PaletteEditor) {
                    Utils.showUserMessage("Error", "Graphs cannot be opened in the palette editor mode!");
                    return;
                }

                this.logicalGraph(LogicalGraph.fromOJSJson(data, file));
                fileTypeLoaded = Eagle.FileType.Graph;
                Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");

            } else if (file.type === Eagle.FileType.Palette) {
                fileTypeLoaded = Eagle.FileType.Palette;
                this._remotePaletteLoaded(file, data);

            } else if (file.type === Eagle.FileType.JSON) {
                if (this.userMode() === Eagle.UserMode.LogicalGraphEditor) {
                    //Utils.showUserMessage("Warning", "Opening JSON file as graph, make sure this is correct.");
                    this.logicalGraph(LogicalGraph.fromOJSJson(data, file));
                    fileTypeLoaded = Eagle.FileType.Graph;
                    Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
                } else {
                    fileTypeLoaded = Eagle.FileType.Palette;
                    this._remotePaletteLoaded(file, data);
                }

            } else {
                // Show error message
                Utils.showUserMessage("Error", "The file type is neither graph nor palette!");
            }

            //.update the activeFileInfo with details of the repository the file was loaded from
            if (fileTypeLoaded === Eagle.FileType.Graph){
                this.updateFileInfo(fileTypeLoaded, file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
            }
        });
    };

    private _remotePaletteLoaded = (file : RepositoryFile, data : string) : void => {
        // if EAGLE is in palette editor mode, load the remote palette into EAGLE's editorPalette object.
        // if EAGLE is in graph editor mode, load the remote palette into EAGLE's palettes object.

        if (this.userMode() === Eagle.UserMode.PaletteEditor){
            this.editorPalette(Palette.fromOJSJson(data, file));
            this.leftWindowShown(true);
            Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
        } else {
            // check palette is not already loaded
            var alreadyLoadedPalette : Palette = this.findPaletteByFile(file);

            if (alreadyLoadedPalette !== null){
                Utils.requestUserConfirm("Reload Palette?", "This palette is already loaded, do you wish to load it again?", "Yes", "No", (confirmed : boolean) : void => {
                    if (confirmed){
                        // close the existing version of the open palette
                        this.closePalette(alreadyLoadedPalette);

                        // load the new palette
                        this.palettes.push(Palette.fromOJSJson(data, file));
                        this.leftWindowShown(true);
                        Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
                    }
                });
            } else {
                this.palettes.push(Palette.fromOJSJson(data, file));
                this.leftWindowShown(true);
                Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
            }
        }
    }

    private updateFileInfo = (fileType : Eagle.FileType, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, path : string, name : string) : void => {
        //.update the activeFileInfo with details of the repository the file was loaded from
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
                this.palettes.splice(i, 1);
                break;
            }
        }
    }

    setGitHubAccessToken = () : void => {
        var currentToken = localStorage.getItem(Utils.GITHUB_ACCESS_TOKEN_KEY);
        if (currentToken === null) {
            currentToken = "";
        }

        Utils.requestUserString("GitHub Access Token", "Enter the GitHub Access Token<br /><span style='color:grey;font-style:italic;'>Required permissions are: read:public_key, read:user, repo</span>", currentToken, true, (completed : boolean, userString : string) : void => {
            // abort if user cancelled the action
            if (!completed)
                return;

            // Set the new token value.
            localStorage.setItem(Utils.GITHUB_ACCESS_TOKEN_KEY, userString);

            // Reload the repository list.
            this.refreshRepositoryList();
        });
    };

    setGitLabAccessToken = () : void => {
        var currentToken = localStorage.getItem(Utils.GITLAB_ACCESS_TOKEN_KEY);
        if (currentToken === null) {
            currentToken = "";
        }

        Utils.requestUserString("GitLab Access Token", "Enter the GitLab Access Token<br /><span style='color:grey;font-style:italic;'>Required permissions are: </span>", currentToken, true, (completed : boolean, userString : string) : void => {
            // abort if user cancelled the action
            if (!completed)
                return;

            // Set the new token value.
            localStorage.setItem(Utils.GITLAB_ACCESS_TOKEN_KEY, userString);

            // Reload the repository list.
            this.refreshRepositoryList();
        });
    };

    setTranslatorUrl = () : void => {
        Utils.requestUserString("Translator Url", "Enter the Translator Url", Utils.translatorURL, false, (completed : boolean, userString : string) : void => {
            // abort if user cancelled the action
            if (!completed)
                return;

            Utils.translatorURL = userString;
            localStorage.setItem(Utils.TRANSLATOR_URL_KEY, userString);
        });
    };

    saveAsPNG = () : void => {
        if (this.userMode() === Eagle.UserMode.PaletteEditor){
            Utils.saveAsPNG('#paletteD3Div svg', this.editorPalette().fileInfo().name);
        } else {
            Utils.saveAsPNG('#logicalGraphD3Div svg', this.logicalGraph().fileInfo().name);
        }
    };

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

    fileIsVisible = (file : RepositoryFile) : boolean => {
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            return file.type === Eagle.FileType.Graph || file.type === Eagle.FileType.Palette || file.type === Eagle.FileType.JSON;
        }
        if (this.userMode() === Eagle.UserMode.PaletteEditor){
            return file.type === Eagle.FileType.Palette || file.type === Eagle.FileType.JSON;
        }
        return false;
    };

    nodeHasDataComponentParams = () : boolean => {
        if (this.selectedNode() === null)
            return false;

        if (this.selectedNode().getCategory() === Eagle.Category.Description)
            return false;

        if (this.selectedNode().getCategory() === Eagle.Category.Comment)
            return false;

        if (this.selectedNode().getNumFields() === 0)
            return false;

        var countNonEmptyFields = 0;
        for (var i = 0 ; i < this.selectedNode().getNumFields(); i++){
            var value = this.selectedNode().getFields()[i].getValue();

            if (value === null){
                continue;
            }

            if (value.toString().trim() === ''){
                continue;
            }

            countNonEmptyFields++;
        }

        return countNonEmptyFields > 0;
    };

    flagActiveDiagramHasMutated = () => {
        // remember the currently selected objects
        var sn = this.getSelection();
        var rwm = this.rightWindowMode();

        // flag diagram as mutated
        if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
            this.logicalGraph.valueHasMutated();
        } else {
            this.editorPalette.valueHasMutated();
        }

        // reselect object
        this.setSelection(rwm, sn);
    }

    deleteSelectedEdge = () => {
        if (this.selectedEdge() === null){
            console.log("Unable to delete selected edge: No edge selected");
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

            // remove the edge
            this.logicalGraph().removeEdgeById(this.selectedEdge().getId());

            // no edge left to be selected
            this.selectedEdge(null);
            this.rightWindowMode(Eagle.RightWindowMode.Repository);

            // flag the diagram as mutated so that the graph renderer will update
            this.flagActiveDiagramHasMutated();
        });
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

    deleteSelectedNode = () : void => {
        if (this.selectedNode() === null){
            console.log("Unable to delete selected node: No node selected");
            return;
        }

        // request confirmation from user
        Utils.requestUserConfirm("Delete node: " + this.selectedNode().getName() + "?", "Are you sure you wish to delete this node (and its children)?", "Yes", "No", (confirmed : boolean) : void => {
            if (!confirmed){
                console.log("User aborted deleteSelectedNode()");
                return;
            }

            // delete the node
            if (this.userMode() === Eagle.UserMode.LogicalGraphEditor){
                this.logicalGraph().removeNodeByKey(this.selectedNode().getKey());
            } else {
                this.editorPalette().removeNodeByKey(this.selectedNode().getKey());
            }

            // no node left to be selected
            this.selectedNode(null);
            this.rightWindowMode(Eagle.RightWindowMode.Repository);

            // flag the diagram as mutated so that the graph renderer will update
            this.flagActiveDiagramHasMutated();
        });
    }

    addNodeToLogicalGraph = (node : Node) : void => {
        console.log("addNodeToLogicalGraph()", node);

        this.logicalGraph().addNode(node, (newNode: Node) => {
            this.logicalGraph.valueHasMutated();

            // make sure the new node is selected
            this.setSelection(Eagle.RightWindowMode.NodeInspector, newNode);
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

    toggleLeftWindow = () : void => {
        this.leftWindowShown(!this.leftWindowShown());
    }

    toggleRightWindow = () : void => {
        this.rightWindowShown(!this.rightWindowShown());
    }

    // TODO: not sure about this
    selectionReadOnly : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return false;
    }, this);

    /**
     * Adds an input port to the selected node via HTML.
     */
    addInputPortHTML = () : void => {
        var node = this.getSelection();
        this.selectPortName(<Node>node, true, false);
    }

    /**
     * Adds an output port to the selected node via HTML arguments.
     */
    addOutputPortHTML = () : void => {
        var node = this.getSelection();
        this.selectPortName(<Node>node, false, false);
    }

    /**
     * Adds an input local port to the selected node via HTML.
     */
    addInputLocalPortHTML = () : void => {
        var node = this.getSelection();
        this.selectPortName(<Node>node, true, true);
    }

    /**
     * Adds an output local port to the selected node via HTML arguments.
     */
    addOutputLocalPortHTML = () : void => {
        var node = this.getSelection();
        this.selectPortName(<Node>node, false, true);
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
    selectPortName = (node : Node, isInputPort : boolean, isLocalPort : boolean) => {
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

            // abort if the name chosen is the name reserved for event ports
            /*
            if (userString === Config.eventPortName) {
                Utils.showUserMessage("Error", "The port name '" + Config.eventPortName + "' is reserved for event type ports!");
                return;
            }
            */

            // add port with the chosen name
            node.addPort(new Port(Utils.uuidv4(), userString), isInputPort, isLocalPort);

            // flag active diagram as mutated
            this.flagActiveDiagramHasMutated();
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
            node.addField(new Field(userString, fieldName, "", ""));

            // flag active diagram as mutated
            this.flagActiveDiagramHasMutated();
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

    removePortFromNodeByIndex = (nodeKey : number, index : number, input : boolean, local : boolean) : void => {
        console.log("removePortFromNodeByIndex(): nodeKey", nodeKey, "index", index, "input", input, "local", local);

        // find node using nodeKey
        var node : Node;

        if (this.userMode() === Eagle.UserMode.PaletteEditor){
            node = this.editorPalette().findNodeByKey(nodeKey);
        } else {
            node = this.logicalGraph().findNodeByKey(nodeKey);
        }

        if (node === null){
            console.warn("Could not remove port from unknown node (" + nodeKey + ")");
            return;
        }

        // remember port id
        var portId;
        if (input){
            if (local){
                portId = node.getInputLocalPorts()[index].getId();
            } else {
                portId = node.getInputPorts()[index].getId();
            }
        } else {
            if (local){
                portId = node.getOutputLocalPorts()[index].getId();
            } else {
                portId = node.getOutputPorts()[index].getId();
            }
        }

        console.log("Found portId to remove:", portId);

        // remove port
        if (input){
            if (local){
                node.getInputLocalPorts().splice(index, 1);
            } else {
                node.getInputPorts().splice(index, 1);
            }
        } else {
            if (local){
                node.getOutputLocalPorts().splice(index, 1);
            } else {
                node.getOutputPorts().splice(index, 1);
            }
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

    rightWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) => {
        var img : HTMLImageElement = document.createElement("img");
        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(img, 0, 0);

        Eagle.dragStartX = e.clientX;
        Eagle.adjustingLeftWindow = false;

        return true;
    }

    sideWindowAdjust = (eagle : Eagle, e : JQueryEventObject) => {
        // workaround to avoid final dragEvent at 0,0!
        if (e.clientX === 0){
            return true;
        }

        if (isNaN(this.leftWindowWidth())){
            console.warn("Had to reset left window width from invalid state (NaN)!");
            this.leftWindowWidth(Config.defaultLeftWindowWidth);
        }
        if (isNaN(this.rightWindowWidth())){
            console.warn("Had to reset right window width from invalid state (NaN)!");
            this.rightWindowWidth(Config.defaultRightWindowWidth);
        }

        var dragDiff : number = e.clientX - Eagle.dragStartX;
        var newWidth : number;

        if (Eagle.adjustingLeftWindow){
            newWidth = this.leftWindowWidth() + dragDiff;
            this.leftWindowWidth(newWidth);
            Utils.setLeftWindowWidth(newWidth);
        } else {
            newWidth = this.rightWindowWidth() - dragDiff;
            this.rightWindowWidth(newWidth);
            Utils.setRightWindowWidth(newWidth);
        }

        Eagle.dragStartX = e.clientX;

        return true;
    }

    leftWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) => {
        var img : HTMLImageElement = document.createElement("img");
        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(img, 0, 0);

        Eagle.dragStartX = e.clientX;
        Eagle.adjustingLeftWindow = true;

        return true;
    }

    // NOTE: enabling the tooltips must be delayed slightly to make sure the html has been generated (hence the setTimeout)
    updateTooltips = () : void => {
        var eagle : Eagle = this;

        setTimeout(function(){
            $('[data-toggle="tooltip"]').tooltip({
                boundary: 'window',
                trigger : 'hover'
            });

            // update title on all left window template palette buttons
            $('.leftWindowDisplay.templatePalette .input-group-prepend').each(function(index: number, element: HTMLElement){
                $(element).attr('data-original-title', eagle.templatePalette().getNthNonDataNode(index).getHelpHTML());
            });

            // update title on all left window palette buttons
            $('.leftWindowDisplay .palette').each(function(i: number, iElement: HTMLElement){
                $(iElement).find('.input-group-prepend').each(function(j: number, jElement: HTMLElement){
                    $(jElement).attr('data-original-title', eagle.palettes()[i].getNthNonDataNode(j).getHelpHTML());
                });
            });
        }, 1);
    }

    selectedEdgeValid = () : Eagle.LinkValid => {
        console.log("selectedEdgeValid()");
        return Edge.isValid(this.logicalGraph(), this.selectedEdge().getSrcNodeKey(), this.selectedEdge().getSrcPortId(), this.selectedEdge().getDestNodeKey(), this.selectedEdge().getDestPortId());
    }

    printLogicalGraphTable = () : void => {
        var tableData : any[] = [];

        // add logical graph nodes to table
        for (var i = 0; i < this.logicalGraph().getNodes().length; i++){
            var node : Node = this.logicalGraph().getNodes()[i];

            tableData.push({"name":node.getName(), "key":node.getKey(), "categoryType":node.getCategoryType(), "category":node.getCategory(), "expanded":node.getExpanded()});
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
        console.log("selectNodeInHierarchy()", nodeViewModel);

        var node : Node = this.logicalGraph().findNodeByKey(nodeViewModel.key);
        node.toggleExpanded();

        // de-select all nodes, then select this node
        // TODO: we now have multiple loops here (findNodeByKey(), setSelected, etc), they could be consolidated into one loop
        for (var i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            this.logicalGraph().getNodes()[i].setSelected(false);
        }
        node.setSelected(true);

        this.setSelection(Eagle.RightWindowMode.Hierarchy, node);

        console.log("Node", node.getName(), "selected", "(expanded:" + node.getExpanded() + ")");

        //this.flagActiveDiagramHasMutated();
    }

    setNodeInputApplication = () : void => {
        console.log("setNodeInputApplication()");

        var applicationList : string[] = this.getApplicationList();

        Utils.requestUserChoice("Input Application", "Choose an input application", applicationList, 0, false, "", (completed : boolean, userString : string) => {
            if (!completed){
                return;
            }

            console.log("Input Application:" + userString);

            var paletteName = userString.split(":")[0];
            var nodeName    = userString.split(":")[1];

            console.log("Find application", paletteName, nodeName);

            var inputApplication : Node = this.getApplication(paletteName, nodeName);
            this.selectedNode().setInputApplication(inputApplication);
        });
    }

    setNodeOutputApplication = () : void => {
        console.log("setNodeOutputApplication()");
    }

    setNodeExitApplication = () : void => {
        console.log("setNodeExitApplication()");
    }
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

    export enum LinkValid {
        Unknown,
        Invalid,
        Warning,
        Valid
    }

    export enum FieldType {
        Field,
        AppField
    }

    export type RepositoryService = string;
    export namespace RepositoryService {
        export var GitHub : RepositoryService = "GitHub";
        export var GitLab : RepositoryService = "GitLab";
        export var Unknown : RepositoryService = "Unknown";
    }

    export type Category = string;
    export namespace Category {
        export var Start : Category = "Start";
        export var End : Category = "End";
        export var Comment : Category = "Comment";
        export var Description : Category = "Description";
        export var Scatter : Category = "Scatter";
        export var Gather : Category = "Gather";
        export var MKN : Category = "MKN";
        export var GroupBy : Category = "GroupBy";
        export var Loop : Category = "Loop";

        export var PythonApp : Category = "PythonApp";
        export var BashShellApp : Category = "BashShellApp";
        export var DynlibApp : Category = "DynlibApp";

        export var NGAS : Category = "NGAS";
        export var S3 : Category = "S3";
        export var MPI : Category = "Mpi";
        export var Docker : Category = "Docker";
        export var Memory : Category = "Memory";
        export var File : Category = "File";

        export var Service : Category = "Service";
        export var ExclusiveForceNode : Category = "ExclusiveForceNode";

        export var Variables : Category = "Variables";
        export var Branch : Category = "Branch";

        export var Unknown : Category = "Unknown";
        export var None : Category = "None";
    }

    export type CategoryType = string;
    export namespace CategoryType {
        export var Control : CategoryType = "Control";
        export var Application : CategoryType = "Application";
        export var Group : CategoryType = "Group";
        export var Data : CategoryType = "Data";
        export var Other : CategoryType = "Other";
        export var Unknown : CategoryType = "Unknown";
    }
}
