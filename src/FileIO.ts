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

/**
 * FileIO - file input/output for EAGLE.
 *
 * Extracted from Eagle.ts to keep the main controller small. Contains:
 *
 *  - FileLoader: user-initiated LOCAL file entry points - the <input type=file>
 *    click-throughs, drag-and-drop, and the FileReader plumbing.
 *
 * The parsing/loading pipeline (_loadGraphJSON, _loadPaletteJSON, _loadGraphWithChoice,
 * _loadGraphConfig, insertGraph, ...) now lives on GraphLoader and is reached through
 * the thin forwarders that Eagle keeps on itself. Eagle keeps those forwarders for the
 * public entry points so the existing UI bindings (knockout data-bind attributes,
 * keyboard shortcuts, right-click menus) keep working.
 */

"use strict";

import { EagleFileType, EagleRightWindowMode, Eagle } from "./Eagle";
import type * as ko from "knockout";
import { FileLocation } from "./FileLocation";
import { EagleConfig } from "./EagleConfig";
import { KeyboardShortcut } from "./KeyboardShortcut";
import { CategoryName } from './Category';
import { Errors, type ErrorsWarnings } from './Errors';
import type { FileInfo } from './FileInfo';
import { GraphConfig } from './GraphConfig';
import { LogicalGraph } from './LogicalGraph';
import { Node } from './Node';
import { Palette } from './Palette';
import { Repositories } from './Repositories';
import { Repository, type RepositoryCommit, RepositoryService } from './Repository';
import { RepositoryFile } from './RepositoryFile';
import { Setting, SchemaVersion } from './Setting';
import { Utils } from './Utils';

/**
 * Loads files from local disk: the file-selector <input> elements and drag-and-drop.
 * Delegates the actual parsing/loading to the (still Eagle-resident) loader pipeline.
 */
export class FileLoader {
    private eagle: Eagle;

    constructor(eagle: Eagle) {
        this.eagle = eagle;
    }

    private _isTextFile = async (file: File): Promise<boolean> => {
        try {
            const data = new TextDecoder("utf-8", {fatal: true}).decode(await file.arrayBuffer());
            return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(data);
        } catch (_error) {
            return false;
        }
    }

    private _rejectBinaryFile = (file: File): void => {
        console.warn("Rejected binary upload", file.name);
        Utils.showUserMessage("Error", "The requested file is not a valid text file.");
    }

    /**
     * Uploads a file from a local file location.
     */
    loadLocalGraphFile = async () : Promise<void> => {
        const graphFileToLoadInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("graphFileToLoad");
        const fileFullPath : string = graphFileToLoadInputElement.value;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // abort if input element has no files
        if (!graphFileToLoadInputElement.files){
            console.error("loadLocalGraphFile: no files found in input element");
            return;
        }

        // get reference to file from the html element
        const file = graphFileToLoadInputElement.files[0];

        // read the file
        if (file) {
            if (!await this._isTextFile(file)) {
                this._rejectBinaryFile(file);
                graphFileToLoadInputElement.value = "";
                return;
            }

            const reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = async (evt) => {
                const data: string = evt.target?.result?.toString() ?? "";

                if (!data) {
                    console.error("loadLocalGraphFile: file is empty or could not be read");
                    Utils.showUserMessage("Error", "File is empty or could not be read.");
                    return;
                }

                await this.eagle._loadGraphWithChoice(data, new RepositoryFile(
                    new Repository(RepositoryService.File, "", "", false),
                    Utils.getFilePathFromFullPath(fileFullPath),
                    Utils.getFileNameFromFullPath(fileFullPath)
                ));
            }
            reader.onerror = (evt) => {
                console.error("error reading file", evt);
            }
        }

        // reset file selection element
        graphFileToLoadInputElement.value = "";
    }

    /**
     * Loads a dropped graph, palette, or graph configuration by inspecting its JSON type.
     * The existing type-specific loaders remain responsible for validation and UI updates.
     */
    loadDroppedFile = async (file: File): Promise<void> => {
        if (!await this._isTextFile(file)) {
            this._rejectBinaryFile(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = evt.target?.result?.toString() ?? "";
                if (data === "") {
                    Utils.showUserMessage("Error", "File is empty or could not be read.");
                    return;
                }

                let dataObject: any;
                try {
                    dataObject = JSON.parse(data);
                } catch (err) {
                    Utils.showUserMessage("Error parsing file JSON", Errors.UnknownToError(err));
                    return;
                }

                const fileType = Utils.determineFileType(dataObject);
                const repositoryFile = new RepositoryFile(
                    new Repository(RepositoryService.File, "", "", false),
                    Utils.getFilePathFromFullPath(file.name),
                    Utils.getFileNameFromFullPath(file.name)
                );
                switch (fileType) {
                    case EagleFileType.Graph:
                        await this.eagle._loadGraphWithChoice(data, repositoryFile);
                        break;
                    case EagleFileType.Palette:
                        this.eagle._loadPaletteJSON(data, file.name);
                        break;
                    case EagleFileType.GraphConfig:
                        await this.eagle._loadGraphConfig(
                            dataObject,
                            new RepositoryFile(Repository.placeholder(), "", Utils.getFileNameFromFullPath(file.name))
                        );
                        break;
                    default:
                        Utils.showUserMessage("Error", "Unable to determine the dropped file type.");
                }
            } catch (err) {
                console.error("Error loading dropped file", err);
                Utils.showUserMessage("Error", "Unable to load dropped file: " + Errors.UnknownToError(err));
            }
        };
        reader.onerror = () => {
            Utils.showUserMessage("Error", "File is empty or could not be read.");
        };
        reader.readAsText(file, "UTF-8");
    }

    /**
     * Uploads a file from a local file location. File will be "insert"ed into the current graph
     */
    insertLocalGraphFile = async () : Promise<void> => {
        const graphFileToInsertInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("graphFileToInsert");
        const fileFullPath : string = graphFileToInsertInputElement.value;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // abort if input element has no files
        if (!graphFileToInsertInputElement.files){
            console.error("insertLocalGraphFile: no files found in input element");
            return;
        }

        // get reference to file from the html element
        const file = graphFileToInsertInputElement.files[0];

        // read the file
        if (file) {
            if (!await this._isTextFile(file)) {
                this._rejectBinaryFile(file);
                graphFileToInsertInputElement.value = "";
                return;
            }

            const reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = async (evt) => {
                let data: string = evt.target?.result?.toString();

                if (!data) {
                    console.error("insertLocalGraphFile: file is empty or could not be read");
                    Utils.showUserMessage("Error", "File is empty or could not be read.");
                    data = "";
                }

                await this.eagle._loadGraphJSON(data, fileFullPath, async (lg: LogicalGraph, errorsWarnings: ErrorsWarnings) : Promise<void> => {
                    const parentNode: Node = new Node(lg.fileInfo().name, lg.fileInfo().location.getText(), "", CategoryName.SubGraph);

                    await this.eagle.insertGraph(Array.from(lg.getNodes()), Array.from(lg.getEdges()), parentNode, errorsWarnings);

                    this.eagle.checkEagle();
                    this.eagle.undo().pushSnapshot(this.eagle, "Insert Logical Graph");
                    this.eagle.logicalGraph.valueHasMutated();
                });
            }
            reader.onerror = (evt) => {
                console.error("error reading file", evt);
            }
        }

        // reset file selection element
        graphFileToInsertInputElement.value = "";
    }

    /**
     * Loads a custom palette from a file.
     */
    loadLocalPaletteFile = async () : Promise<void> => {
        const paletteFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("paletteFileToLoad");
        const fileFullPath : string = paletteFileInputElement.value;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // abort if input element has no files
        if (!paletteFileInputElement.files){
            console.error("loadLocalPaletteFile: no files found in input element");
            return;
        }

        // get a reference to the file in the html element
        const file = paletteFileInputElement.files[0];

        // read the file
        if (file) {
            if (!await this._isTextFile(file)) {
                this._rejectBinaryFile(file);
                paletteFileInputElement.value = "";
                return;
            }

            const reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = (evt) => {
                let data: string = evt.target?.result?.toString();

                if (!data) {
                    console.error("loadLocalPaletteFile: file is empty or could not be read");
                    Utils.showUserMessage("Error", "File is empty or could not be read.");
                    data = "";
                }

                this.eagle._loadPaletteJSON(data, fileFullPath);

                // NOTE: _loadPaletteJSON unshifts the new palette, so it is now at the front of the list
                this.eagle.palettes()[0].fileInfo().location.repositoryService(RepositoryService.File);
                this.eagle.palettes()[0].fileInfo.valueHasMutated();
            }
            reader.onerror = (evt) => {
                console.error("error reading file", evt);
            }
        }

        // reset file selection element
        paletteFileInputElement.value = "";
    }

    /**
     * Loads a custom graph config from a file.
     */
    loadLocalGraphConfigFile = async () : Promise<void> => {
        const graphConfigFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("graphConfigFileToLoad");
        const fileFullPath : string = graphConfigFileInputElement.value;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // abort if input element has no files
        if (!graphConfigFileInputElement.files){
            console.error("loadLocalGraphConfigFile: no files found in input element");
            return;
        }

        // get a reference to the file in the html element
        const file = graphConfigFileInputElement.files[0];

        // read the file
        if (file) {
            if (!await this._isTextFile(file)) {
                this._rejectBinaryFile(file);
                graphConfigFileInputElement.value = "";
                return;
            }

            const reader = new FileReader();
            reader.readAsText(file, "UTF-8");
            reader.onload = (evt) => {
                let data: string = evt.target?.result?.toString();

                if (!data) {
                    console.error("loadLocalGraphConfigFile: file is empty or could not be read");
                    Utils.showUserMessage("Error", "File is empty or could not be read.");
                    data = "";
                }

                let dataObject;

                try {
                    dataObject = JSON.parse(data);
                } catch(err){
                    Utils.showUserMessage("Error parsing file JSON", Errors.UnknownToError(err));
                    return;
                }

                void this.eagle._loadGraphConfig(dataObject, new RepositoryFile(Repository.placeholder(), "", Utils.getFileNameFromFullPath(fileFullPath)));
            }
            reader.onerror = (evt) => {
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
        const allowGraphEditing = Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false);

        if (!allowGraphEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Load Graph");
            return;
        }

        const element = document.getElementById("graphFileToLoad");
        if (!element) {
            console.error("Could not find 'graph file to load' element");
            return;
        }
        element.click();
        this.eagle.resetEditor()
    }

    getGraphFileToInsert = () : void => {
        const allowGraphEditing = Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false);

        if (!allowGraphEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Insert Graph");
            return;
        }

        const element = document.getElementById("graphFileToInsert");
        if (!element) {
            console.error("Could not find 'graph file to insert' element");
            return;
        }
        element.click();
    }

    getPaletteFileToLoad = () : void => {
        const allowPaletteEditing = Setting.findValue<boolean>(Setting.ALLOW_PALETTE_EDITING, false);

        if (!allowPaletteEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Palette, "Load Palette");
            return;
        }

        const element = document.getElementById("paletteFileToLoad");
        if (!element) {
            console.error("Could not find 'palette file to load' element");
            return;
        }
        element.click();
    }

    getGraphConfigFileToLoad = () : void => {
        const allowGraphEditing = Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false);

        if (!allowGraphEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Load Graph Config");
            return;
        }

        const element = document.getElementById("graphConfigFileToLoad");
        if (!element) {
            console.error("Could not find 'graph config file to load' element");
            return;
        }
        element.click();
    }
}

/**
 * FileSaver - saves/commits graphs, palettes and graph configs to local disk
 * or a remote git repository. Extracted from Eagle.ts.
 *
 * The save/commit methods are mutually recursive (save<->commit<->toDisk<->toRemote),
 * so they move together as one cohesive class. They reach Eagle-only state (logicalGraph,
 * findPalette, changeRightWindowMode) through the eagle instance.
 */
export class FileSaver {
    private eagle: Eagle;

    constructor(eagle: Eagle) {
        this.eagle = eagle;
    }

    saveGraph = async () : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            switch (this.eagle.logicalGraph().fileInfo().location.repositoryService()){
                case RepositoryService.File:
                    try {
                        await this.saveFileToLocal(EagleFileType.Graph);
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    break;
                case RepositoryService.GitHub:
                case RepositoryService.GitLab:
                    try {
                        await this.commitToGit(EagleFileType.Graph);
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
            const isLocalFile = this.eagle.logicalGraph().fileInfo().location.repositoryService() === RepositoryService.File;

            const userChoice: string = await Utils.requestUserChoice("Save Graph As", "Please choose where to save the graph", ["Local File", "Remote Git Repository"], isLocalFile?0:1, false, "");

            if (userChoice === null){
                return;
            }

            const fileType = this.eagle.logicalGraph().fileInfo().type;

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
                const configMatch = FileLocation.match(graphConfig.fileInfo().graphLocation, this.eagle.logicalGraph().fileInfo().location);
                if (!configMatch) {
                    Utils.showNotification("Invalid Graph Config", "The graph configuration's parent location does not match the current graph's location. Try fixing graph errors " + KeyboardShortcut.idToKeysText('fix_all', true) + " before saving.", "danger");
                    reject(new Error("GraphConfig location mismatch"));
                    return;
                }

                const isLocalFile = this.eagle.logicalGraph().fileInfo().location.repositoryService() === RepositoryService.File;

                const userChoice: string = await Utils.requestUserChoice("Save Graph Configuration As", "Please choose where to save the graph configuration", ["Local File", "Remote Git Repository"], isLocalFile?0:1, false, "");

                if (userChoice === null){
                    Utils.showNotification("Save Cancelled", "No save location was selected.", "danger");
                    reject(new Error("User cancelled save"));
                    return;
                }

                if (userChoice === "Local File"){
                    try {
                        this.saveAsFileToLocal(EagleFileType.GraphConfig, graphConfig);
                        resolve();
                    } catch (error) {
                        Utils.showNotification("Save Failed", "Failed to save graph config locally: " + Errors.UnknownToError(error), "danger");
                        reject(error);
                    }
                } else {
                    try {
                        this.commitToGitAs(EagleFileType.GraphConfig, graphConfig);
                        resolve();
                    } catch(error) {
                        Utils.showNotification("Save Failed", "Failed to save graph config to remote repository: " + Errors.UnknownToError(error), "danger");
                        reject(error);
                    }
                }
            } catch (error) {
                Utils.showNotification("Unexpected Error", "An unexpected error occurred: " + Errors.UnknownToError(error), "danger");
                reject(error);
            }
        });
    }

    saveActiveGraphConfig = async (): Promise<void> => {
        const activeGraphConfig = this.eagle.logicalGraph().getActiveGraphConfig();

        if (typeof activeGraphConfig === "undefined") {
            Utils.showNotification("Error", "No active graph config", "danger");
            return;
        }

        await this.saveGraphConfigAs(activeGraphConfig);
    }

    /**
     * Saves the file to a local download folder.
     */
    saveFileToLocal = async (fileType : EagleFileType, graphConfig: GraphConfig | null = null) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            switch (fileType){
                case EagleFileType.Graph:
                    try {
                        await this.saveGraphToDisk(this.eagle.logicalGraph(), this.eagle.logicalGraph().fileInfo().name);
                    } catch(error) {
                        reject(error);
                        return;
                    }
                    break;
                case EagleFileType.GraphConfig:
                    if (graphConfig === null){
                        Utils.showUserMessage("Error", "No graph config provided to save.");
                        reject(new Error("No graph config provided to save."));
                        return;
                    }

                    try {
                        await this.saveGraphConfigToDisk(graphConfig, graphConfig.fileInfo().name);
                    } catch(error) {
                        reject(error);
                        return;
                    }
                    break;
                case EagleFileType.Palette: {
                    // build a list of palette names
                    const paletteNames: string[] = this.buildReadablePaletteNamesList();

                    // ask user to select the palette
                    const paletteName = await Utils.userChoosePalette(paletteNames);

                    // get reference to palette (based on paletteName)
                    const destinationPalette = this.eagle.findPalette(paletteName, false);

                    // check that a palette was found
                    if (typeof destinationPalette === 'undefined'){
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

    saveAsFileToLocal = async (fileType: EagleFileType, graphConfig: GraphConfig | null = null): Promise<void> => {
        return new Promise(async(resolve, reject) => {
            switch (fileType){
                case EagleFileType.Graph:
                    try {
                        await this.saveAsFileToDisk(this.eagle.logicalGraph());
                    } catch (error){
                        reject(error);
                        return;
                    }
                    break;
                case EagleFileType.GraphConfig:
                    if (graphConfig === null){
                        Utils.showUserMessage("Error", "No graph config provided to save.");
                        reject(new Error("No graph config provided to save."));
                        return;
                    }

                    try {
                        await this.saveAsFileToDisk(graphConfig);
                    } catch(error) {
                        reject(error);
                        return;
                    }
                    break;
                case EagleFileType.Palette: {
                    // build a list of palette names
                    const paletteNames: string[] = this.buildReadablePaletteNamesList();

                    // ask user to select the palette
                    const paletteName: string = await Utils.userChoosePalette(paletteNames);

                    // get reference to palette (based on paletteName)
                    const destinationPalette = this.eagle.findPalette(paletteName, false);

                    // check that a palette was found
                    if (typeof destinationPalette === 'undefined'){
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
                case RepositoryService.GitHub:
                    url = '/saveFileToRemoteGithub';
                    break;
                case RepositoryService.GitLab:
                    url = '/saveFileToRemoteGitlab';
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service : " + file.repository.service);
                    return;
            }

            try {
                await Utils.httpPostJSONString(url, jsonString);
            } catch (error){
                const errorMessage = Errors.UnknownToError(error);

                Utils.showUserMessage("Error", errorMessage + "<br/><br/>NOTE: These error messages provided by " + file.repository.service + " are not very helpful. Please contact EAGLE admin to help with further investigation.", true);
                console.error("Error: " + errorMessage);
                reject(errorMessage);
                return;
            }

            // we have to refresh this whole path, since any part of it might be new
            try {
                await file.repository.refreshPath(file.path);
            } catch (error){
                console.log("error during refreshPath", error);
            }

            // show repo in the right window
            this.eagle.changeRightWindowMode(EagleRightWindowMode.Repository);

            // Show success message
            if (file.repository.service === RepositoryService.GitHub){
                Utils.showNotification("Success", "The file has been saved to GitHub repository.", "success");
            }
            if (file.repository.service === RepositoryService.GitLab){
                Utils.showNotification("Success", "The file has been saved to GitLab repository.", "success");
            }

            // Mark file as non-modified.
            fileInfo().modified = false;

            Utils.updateFileInfo(fileInfo, file);

            resolve();
        });
    }


    /**
     * Saves a file to the remote server repository.
     *
     * Assumes that all files are in the same repository. Even though multiple files can be passed in, only the first file is used to determine
     * the repository service and URL.
     */
    saveFilesToRemote = async (repository: Repository, jsonString : string): Promise<void> => {
        return new Promise(async(resolve, reject) => {
            let url : string;

            switch (repository.service){
                case RepositoryService.GitHub:
                    url = '/saveFilesToRemoteGithub';
                    break;
                case RepositoryService.GitLab:
                    url = '/saveFilesToRemoteGitlab';
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service : " + repository.service);
                    reject("Unknown repository service : " + repository.service);
                    return;
            }

            // POST JSON
            try {
                await Utils.httpPostJSONString(url, jsonString);
            } catch (error){
                Utils.showUserMessage("Error", error + "<br/><br/>These error messages provided by " + repository.service + " are not very helpful. Please contact EAGLE admin to help with further investigation.");
                console.error("Error: " + JSON.stringify(error, null, EagleConfig.JSON_INDENT));
                reject(error);
                return;
            }

            // we have to refresh this whole path, since any part of it might be new
            try {
                await repository.refresh();
            } catch (error){
                console.log("error during refreshPath", error);
            }

            // show repo in the right window
            this.eagle.changeRightWindowMode(EagleRightWindowMode.Repository);

            // Show success message
            if (repository.service === RepositoryService.GitHub){
                Utils.showNotification("Success", "Saved file(s) to GitHub repository.", "success");
            }
            if (repository.service === RepositoryService.GitLab){
                Utils.showNotification("Success", "Saved file(s) to GitLab repository.", "success");
            }

            resolve();
        });
    }

    /**
     * Performs a Git commit of a graph/palette. Asks user for a file name before saving.
     */
    commitToGitAs = async (fileType : EagleFileType, graphConfig: GraphConfig | null = null) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            let fileInfo : ko.Observable<FileInfo>;
            let obj : LogicalGraph | Palette | GraphConfig;

            // determine which object of the given filetype we are committing
            switch (fileType){
                case EagleFileType.Graph:
                    fileInfo = this.eagle.logicalGraph().fileInfo;
                    obj = this.eagle.logicalGraph();
                    break;
                case EagleFileType.GraphConfig:
                    if (graphConfig === null){
                        Utils.showUserMessage("Error", "No graph config provided to commit.");
                        reject("No graph config provided to commit.");
                        return;
                    }

                    fileInfo = graphConfig.fileInfo;
                    obj = graphConfig;
                    break;
                case EagleFileType.Palette: {
                    const paletteNames: string[] = this.buildReadablePaletteNamesList();
                    const paletteName = await Utils.userChoosePalette(paletteNames);
                    const palette = this.eagle.findPalette(paletteName, false);
                    if (typeof palette === 'undefined'){
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
            let defaultRepository: Repository = Repository.placeholder();

            if (this.eagle.logicalGraph()){
                // if the repository service is unknown (or file), probably because the graph hasn't been saved before, then
                // just use any existing repo
                if (fileInfo().location.repositoryService() === RepositoryService.Unknown || fileInfo().location.repositoryService() === RepositoryService.File){
                    const gitHubRepoList : Repository[] = Repositories.getList(RepositoryService.GitHub);
                    const gitLabRepoList : Repository[] = Repositories.getList(RepositoryService.GitLab);

                    // use first gitlab repo as second preference
                    if (gitLabRepoList.length > 0){
                        defaultRepository = new Repository(RepositoryService.GitLab, gitLabRepoList[0].name, gitLabRepoList[0].branch, false);
                    }

                    // overwrite with first github repo as first preference
                    if (gitHubRepoList.length > 0){
                        defaultRepository = new Repository(RepositoryService.GitHub, gitHubRepoList[0].name, gitHubRepoList[0].branch, false);
                    }

                    if (gitHubRepoList.length === 0 && gitLabRepoList.length === 0){
                        defaultRepository = new Repository(RepositoryService.GitHub, "", "", false);
                    }
                } else {
                    defaultRepository = new Repository(fileInfo().location.repositoryService(), fileInfo().location.repositoryName(), fileInfo().location.repositoryBranch(), false);
                }
            }

            // determine a default filename
            let defaultFilename: string = fileInfo().location.repositoryFileName();
            if (fileType === EagleFileType.GraphConfig){
                // abort if graphConfig is null
                if (graphConfig === null){
                    reject("No graph config provided to commit.");
                    return;
                }
                defaultFilename = Utils.generateFilenameForGraphConfig(this.eagle.logicalGraph(), graphConfig);
            }

            let commit: RepositoryCommit;
            try {
                commit = await Utils.requestUserGitCommit(defaultRepository, Repositories.getList(defaultRepository.service), fileInfo().location.repositoryPath(), defaultFilename, fileType);
            } catch (error){
                reject(error);
                return;
            }

            // check repository name
            const repository : Repository | null = Repositories.get(commit.location.repositoryService(), commit.location.repositoryName(), commit.location.repositoryBranch());

            // abort if respository could not be found
            if (repository === null){
                reject("Repository not found: " + commit.location.repositoryName());
                return;
            }

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
    commitToGit = async (fileType : EagleFileType) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            let fileInfo : ko.Observable<FileInfo> | undefined;
            let obj : LogicalGraph | Palette | GraphConfig | undefined;

            // determine which object of the given filetype we are committing
            switch (fileType){
                case EagleFileType.Graph:
                    fileInfo = this.eagle.logicalGraph().fileInfo;
                    obj = this.eagle.logicalGraph();
                    break;
                case EagleFileType.Palette: {
                    // build a list of palettes, as user to choose the one to save, abort if no palette is chosen
                    const paletteNames: string[] = this.buildReadablePaletteNamesList();
                    const paletteName = await Utils.userChoosePalette(paletteNames);
                    const palette = this.eagle.findPalette(paletteName, false);
                    if (typeof palette === 'undefined'){
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

            // abort if a fileInfo could not be found
            if (typeof fileInfo === 'undefined'){
                reject("No fileInfo found for fileType " + fileType);
                return;
            }

            // abort if object could not be found
            if (typeof obj === 'undefined'){
                reject("No object found for fileType " + fileType);
                return;
            }

            console.log("fileInfo().repositoryService", fileInfo().location.repositoryService());
            console.log("fileInfo().repositoryName", fileInfo().location.repositoryName());

            // if there is no git repository or filename defined for this file. Please use 'save as' instead!
            if (
                [RepositoryService.Unknown, RepositoryService.File, RepositoryService.Url].includes(fileInfo().location.repositoryService()) || fileInfo().location.repositoryName() === null
            ) {
                await this.commitToGitAs(fileType);
                return;
            }

            // check that filetype is appropriate for a file with this extension
            if (fileInfo().name === "") {
                if (fileType === EagleFileType.Graph) {
                    Utils.showUserMessage('Error', 'Graph is not chosen! Open existing or create a new graph.');
                } else if (fileType === EagleFileType.Palette) {
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
            // abort if repository could not be found
            if (repository === null){
                reject("Repository not found: " + fileInfo().location.repositoryName());
                return;
            }

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

            // get version (hoisted for OJS format check)
            const version: SchemaVersion = Setting.findValue<SchemaVersion>(Setting.DALIUGE_SCHEMA_VERSION, SchemaVersion.Unknown);

            // warn if saving in older OJS format (not applicable to GraphConfig which has no version-dependent serialization)
            if (file.type !== EagleFileType.GraphConfig) {
                if (!await Eagle.confirmOjsSave(version)) { resolve(); return; }
            }

            const clone: LogicalGraph | Palette | GraphConfig = obj.clone();
            clone.fileInfo().updateEagleInfo();

            let jsonString: string = "";
            switch (file.type){
                case EagleFileType.Graph:
                    jsonString = LogicalGraph.toJsonString(<LogicalGraph>clone, false, version);
                    break;
                case EagleFileType.GraphConfig:
                    jsonString = GraphConfig.toJsonString(<GraphConfig>clone);
                    break;
                case EagleFileType.Palette:
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

    _saveDiagramToGit = async (file: RepositoryFile, fileInfo: ko.Observable<FileInfo>, commitMessage : string, jsonString: string, version: SchemaVersion) : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            // generate filename
            const fullFileName : string = Utils.joinPath(file.path, file.name);

            // get access token for this type of repository
            let token : string;

            try {
                token = Utils.getServiceToken(file.repository.service);
            } catch (error) {
                reject(error);
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

    // TODO: shares some code with saveFileToLocal(), we should try to factor out the common stuff at some stage
    savePaletteToDisk = async (palette : Palette, fileName: string) : Promise<void> => {
        return new Promise(async (resolve, reject) => {
            // generate a fileName, if the supplied filename is null or empty
            if (fileName === null || fileName === ""){
                const rawName = palette.fileInfo().name;
                const sanitizedName = Utils.sanitizeFileName(rawName);
                fileName = sanitizedName.length > 0 ? sanitizedName : "palette";
            }

            // get version (hoisted for OJS format check)
            const version: SchemaVersion = Setting.findValue<SchemaVersion>(Setting.DALIUGE_SCHEMA_VERSION, SchemaVersion.Unknown);

            // warn if saving in older OJS format
            if (!await Eagle.confirmOjsSave(version)) { resolve(); return; }

            // clone the palette and remove github info ready for local save
            const p_clone : Palette = palette.clone();
            p_clone.fileInfo().removeGitInfo();
            p_clone.fileInfo().updateEagleInfo();

            // convert to json
            const jsonString: string = Palette.toJsonString(p_clone, version);

            // validate json
            Utils.validateJSON(jsonString, EagleFileType.Palette, version);

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
            palette.fileInfo().location.repositoryService(RepositoryService.File);
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
            if (graph.fileInfo().type !== EagleFileType.Graph){
                Utils.showUserMessage("Error", "Graph fileType not set correctly. Could not save file.");
                return;
            }

            // abort if graph empty
            if (graph.getNumNodes() === 0){
                Utils.showNotification("Error", "Can't save an empty graph", "danger");
                return;
            }

            // get version (hoisted for OJS format check)
            const version: SchemaVersion = Setting.findValue<SchemaVersion>(Setting.DALIUGE_SCHEMA_VERSION, SchemaVersion.Unknown);

            // warn if saving in older OJS format
            if (!await Eagle.confirmOjsSave(version)) { resolve(); return; }

            // clone the logical graph and remove github info ready for local save
            const lg_clone : LogicalGraph = this.eagle.logicalGraph().clone();
            lg_clone.fileInfo().removeGitInfo();
            lg_clone.fileInfo().updateEagleInfo();

            // convert to json
            const jsonString: string = LogicalGraph.toJsonString(lg_clone, false, version);

            // validate json
            Utils.validateJSON(jsonString, EagleFileType.Graph, version);

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
            graph.fileInfo().location.repositoryService(RepositoryService.File);
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
            const version: SchemaVersion = Setting.findValue<SchemaVersion>(Setting.DALIUGE_SCHEMA_VERSION, SchemaVersion.Unknown);

            // convert to json
            const jsonString: string = GraphConfig.toJsonString(graphConfig);

            // validate json
            Utils.validateJSON(jsonString, EagleFileType.GraphConfig, version);

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
        if (file.fileInfo().type === EagleFileType.GraphConfig){
            defaultFilename = Utils.generateFilenameForGraphConfig(this.eagle.logicalGraph(), file as GraphConfig);
        }

        // check whether existing name ends with the file extension
        if (!defaultFilename.endsWith("." + extension)) {
            defaultFilename += "." + extension;
        }

        let userString: string;
        try {
            userString = await Utils.requestUserString(
                "Save As",
                "Please enter a filename for the " + file.fileInfo().type,
                defaultFilename,
                false,
                Utils.nonEmptyStringValidator("Filename")
            );
        } catch (error) {
            console.error(error);
            return;
        }

        switch(file.fileInfo().type){
            case EagleFileType.Graph:
                this.saveGraphToDisk(file as LogicalGraph, userString);
                break;
            case EagleFileType.GraphConfig:
                this.saveGraphConfigToDisk(file as GraphConfig, userString);
                break;
            case EagleFileType.Palette:
                this.savePaletteToDisk(file as Palette, userString);
                break;
            default:
                console.warn("saveAsFileToDisk(): fileType", file.fileInfo().type, "not implemented, aborting.");
                Utils.showUserMessage("Error", "Unable to save file: file type '" + file.fileInfo().type + "' is not supported.");
        }
    }

    savePaletteToGit = async (palette: Palette): Promise<void> => {
        console.log("savePaletteToGit()", palette.fileInfo().name, palette.fileInfo().type);

        // get version (hoisted for OJS format check)
        const version: SchemaVersion = Setting.findValue<SchemaVersion>(Setting.DALIUGE_SCHEMA_VERSION, SchemaVersion.Unknown);

        // warn if saving in older OJS format
        if (!await Eagle.confirmOjsSave(version)) { return; }

        const defaultRepository: Repository = new Repository(palette.fileInfo().location.repositoryService(), palette.fileInfo().location.repositoryName(), palette.fileInfo().location.repositoryBranch(), false);

        let commit: RepositoryCommit;
        try {
            commit = await Utils.requestUserGitCommit(defaultRepository, Repositories.getList(RepositoryService.GitHub),  palette.fileInfo().location.repositoryPath(), palette.fileInfo().name, EagleFileType.Palette);
        } catch (error) {
            console.error(error);
            return;
        }

        // check repository name
        const repository : Repository | null = Repositories.get(commit.location.repositoryService(), commit.location.repositoryName(), commit.location.repositoryBranch());
        if (repository === null){
            console.log("Abort commit");
            return;
        }

        // get access token for this type of repository
        let token : string;

        try {
            token = Utils.getServiceToken(commit.location.repositoryService());
        } catch (error) {
            Utils.showUserMessage("Error", String(error));
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

        // convert to json
        const jsonString: string = Palette.toJsonString(p_clone, version);

        const commitJsonString: string = Utils.createCommitJsonString(jsonString, repository, token, commit.location.fullPath(), commit.message);

        try {
            // TODO: a bit of a kludge here to have to create a new RepositoryFile object just to pass to _commit()
            const file: RepositoryFile = new RepositoryFile(repository, commit.location.repositoryPath(), commit.location.repositoryFileName());
            file.type = EagleFileType.Palette;
            await this.saveFileToRemote(file, palette.fileInfo, commitJsonString);
        } catch (error){
            console.log(error);
        }
    }

    buildReadablePaletteNamesList = () : string[] => {
        const paletteNames : string[] = [];
        for (const palette of this.eagle.palettes()){
            paletteNames.push(palette.fileInfo().name);
        }

        return paletteNames;
    }
}
