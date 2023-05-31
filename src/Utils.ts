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

import * as Ajv from "ajv";
import * as Showdown from "showdown";
import * as ko from "knockout";

import {Category} from './Category';
import {CategoryData} from "./CategoryData";
import {Config} from './Config';
import {Daliuge} from './Daliuge';
import {Eagle} from './Eagle';
import {Edge} from './Edge';
import {Errors} from './Errors';
import {Field} from './Field';
import {KeyboardShortcut} from './KeyboardShortcut';
import {LogicalGraph} from './LogicalGraph';
import {Node} from './Node';
import {Palette} from './Palette';
import {PaletteInfo} from './PaletteInfo';
import {Repository} from './Repository';
import {Setting} from './Setting';
import {FileInfo} from "./FileInfo";
import { UiModeSystem } from "./UiModes";

export class Utils {
    // Allowed file extenstions.
    static readonly FILE_EXTENSIONS : string[] = [
        "json",
        "diagram",
        "graph",
        "palette",
        "md" // for markdown e.g. README.md
    ];

    static ojsGraphSchema : object = {};
    static v3GraphSchema : object = {};
    static appRefGraphSchema : object = {};

    /**
     * Generates a UUID.
     * See https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
     * NOTE: we use the (slightly) less random version that doesn't require the
     *       crypto.getRandomValues() call that is not available in NodeJS
     */

    static uuidv4() : string {
        if (typeof crypto.randomUUID !== "undefined"){
            return crypto.randomUUID();
        }

        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static padStart(input: number, length: number): string {
        let result: string = input.toString();

        while (result.length < length){
            result = "0" + result;
        }

        return result;
    }

    static generateDateTimeString(): string {
        const now = new Date();

        // NOTE: JavaScript months are 0-based
        return now.getFullYear() + "-" + Utils.padStart(now.getMonth() + 1, 2) + "-" + Utils.padStart(now.getDate(), 2) + "-" + Utils.padStart(now.getHours(), 2) + "-" + Utils.padStart(now.getMinutes(), 2) + "-" + Utils.padStart(now.getSeconds(), 2);
    }

    static findNewKey(usedKeys : number[]): number {
        for (let i = -1 ; ; i--){
            let found = false;

            for (const usedKey of usedKeys){
                if (i === usedKey){
                    found = true;
                    break;
                }
            }

            if (!found){
                return i;
            }
        }
    }

    static getUsedKeys(nodes : Node[]) : number[] {
        // build a list of used keys
        const usedKeys: number[] = [];

        for (const node of nodes){
            usedKeys.push(node.getKey())

            // if this node has inputApp, add the inputApp key
            if (node.hasInputApplication()){
                usedKeys.push(node.getInputApplication().getKey());
            }

            // if this node has outputApp, add the outputApp key
            if (node.hasOutputApplication()){
                usedKeys.push(node.getOutputApplication().getKey());
            }
        }

        return usedKeys;
    }

    static getUsedKeysFromNodeData(nodeData : any[]) : number[] {
        // build a list of used keys
        const usedKeys: number[] = [];

        for (const node of nodeData){
            usedKeys.push(node.key);
        }

        return usedKeys;
    }

    static newKey(nodes: Node[]): number {
        const usedKeys = Utils.getUsedKeys(nodes);
        return Utils.findNewKey(usedKeys);
    }

    static setEmbeddedApplicationNodeKeys(lg: LogicalGraph): void {
        const nodes: Node[] = lg.getNodes();
        const usedKeys: number[] = Utils.getUsedKeys(nodes);

        // loop through nodes, look for embedded nodes with null key, create new key, add to usedKeys
        for (const node of nodes){
            usedKeys.push(node.getKey())

            // if this node has inputApp, add the inputApp key
            if (node.hasInputApplication()){
                if (node.getInputApplication().getKey() === null){
                    const newKey = Utils.findNewKey(usedKeys);
                    node.getInputApplication().setKey(newKey);
                    usedKeys.push(newKey);
                }
            }

            // if this node has outputApp, add the outputApp key
            if (node.hasOutputApplication()){
                if (node.getOutputApplication().getKey() === null){
                    const newKey = Utils.findNewKey(usedKeys);
                    node.getOutputApplication().setKey(newKey);
                    usedKeys.push(newKey);
                }
            }
        }
    }

    // extracts a file name from the full path.
    static getFileNameFromFullPath(fullPath : string) : string {
        if (typeof fullPath === 'undefined'){return "";}
        return fullPath.replace(/^.*[\\\/]/, '');
    }

    // extracts a file path (not including the file name) from the full path.
    static getFilePathFromFullPath(fullPath : string) : string {
        if (typeof fullPath === 'undefined'){return "";}
        return fullPath.substring(0, fullPath.lastIndexOf('/'));
    }

    static getFileTypeFromFileName(fileName : string) : Eagle.FileType {
        return Utils.translateStringToFileType(Utils.getFileExtension(fileName));
    }

    // NOTE: used for sorting files by filetype
    static getFileTypeNum(fileType: Eagle.FileType) : number {
        switch (fileType){
            case Eagle.FileType.Graph:
                return 0;
            case Eagle.FileType.Palette:
                return 1;
            case Eagle.FileType.JSON:
                return 2;
            case Eagle.FileType.Markdown:
                return 3;
            case Eagle.FileType.Unknown:
                return 4;
        }
    }

    /**
     * Returns the file extension.
     * @param path File name.
     */
    static getFileExtension(path : string) : string {
        const basename = path.split(/[\\/]/).pop(),  // extract file name from full path ...
                                                   // (supports `\\` and `/` separators)
        pos = basename.lastIndexOf(".");           // get last position of `.`

        if (basename === "" || pos < 1)            // if file name is empty or ...
            return "";                             //  `.` not found (-1) or comes first (0)

        return basename.slice(pos + 1);            // extract extension ignoring `.`
    }

    /**
     * Verifies the file extension.
     * @param filename File name.
     */
    static verifyFileExtension(filename : string) : boolean {
        const fileExtension = Utils.getFileExtension(filename);

        // Check if the extenstion is in the list of allowed extensions.
        if ($.inArray(fileExtension, Utils.FILE_EXTENSIONS) != -1) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Returns an appropriate diagram file extension.
     */
    static getDiagramExtension(fileType : Eagle.FileType) : string {
        if (fileType == Eagle.FileType.Graph) {
            return "graph";
        } else if (fileType == Eagle.FileType.Palette) {
            return "palette";
        } else {
            console.error("Utils.getDiagramExtension() : Unknown file type! (" + fileType + ")");
            return "";
        }
    }

    static translateStringToFileType(fileType : string) : Eagle.FileType {
        // check input parameter is a string
        if (typeof fileType !== 'string'){
            return Eagle.FileType.Unknown;
        }

        if (fileType.toLowerCase() === "graph")
            return Eagle.FileType.Graph;
        if (fileType.toLowerCase() === "palette")
            return Eagle.FileType.Palette;
        if (fileType.toLowerCase() === "json")
            return Eagle.FileType.JSON;

        return Eagle.FileType.Unknown;
    }

    static dataTypePrefix(dataType: string): string {
        if (typeof dataType === 'undefined'){
            return Daliuge.DataType.Unknown;
        }

        return dataType.split(".")[0];
    }

    static translateStringToDataType(dataType: string): string {
        for (const dt of Utils.enumKeys(Daliuge.DataType)){
            if (dt.toLowerCase() === dataType.toLowerCase()){
                return dt;
            }
        }
        
        console.warn("Unknown DataType", dataType);
        return Daliuge.DataType.Unknown;
    }

    static translateStringToParameterType(parameterType: string): Daliuge.FieldType {
        for (const pt of Object.values(Daliuge.FieldType)){
            if (pt.toLowerCase() === parameterType.toLowerCase()){
                return pt;
            }
        }

        console.warn("Unknown ParameterType", parameterType);
        return Daliuge.FieldType.Unknown;
    }

    static translateStringToParameterUsage(parameterUsage: string): Daliuge.FieldUsage {
        for (const pu of Object.values(Daliuge.FieldUsage)){
            if (pu.toLowerCase() === parameterUsage.toLowerCase()){
                return pu;
            }
        }

        console.warn("Unknown ParameterUsage", parameterUsage);
        return Daliuge.FieldUsage.NoPort;
    }
    
    static httpGet(url : string, callback : (error : string, data : string) => void) : void {
        $.ajax({
            url: url,
            success: function (data : string) {
                callback(null, data);
            },
            error: function(xhr, status, error : string){
                callback(error, null);
            }
        });
    }

    static httpGetJSON(url : string, json : object, callback : (error : string, data : string) => void) : void {
        // console.log("httpGetJSON() : ", url);
        $.ajax({
            url : url,
            type : 'GET',
            data : JSON.stringify(json),
            contentType : 'application/json',
            success : function(data : string) {
                callback(null, data);
            },
            error: function(xhr, status, error : string) {
                callback(error, null);
            }
        });
    }

    static httpPost(url : string, data : string, callback : (error : string | null, data : string) => void) : void {
        $.ajax({
            url : url,
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType
            success : function(data : string) {
                callback(null, data);
            },
            error: function(xhr, status, error : string) {
                callback(error, null);
            }
        });
    }

    static httpPostJSON(url : string, json : object, callback : (error : string, data : string) => void) : void {
        // console.log("httpPostJSON() : ", url);
        $.ajax({
            url : url,
            type : 'POST',
            data : JSON.stringify(json),
            contentType : 'application/json',
            success : function(data : string) {
                callback(null, data);
            },
            error: function(xhr, status, error : string) {
                if (typeof xhr.responseJSON === 'undefined'){
                    callback(error, null);
                } else {
                    callback(xhr.responseJSON.error, null);
                }
            }
        });
    }

    static httpPostJSONString(url : string, jsonString : string, callback : (error : string, data : string) => void) : void {
        // console.log("httpPostJSONString() : ", url);
        $.ajax({
            url : url,
            type : 'POST',
            data : jsonString,
            contentType : 'application/json',
            success : function(data : string) {
                callback(null, data);
            },
            error: function(xhr, status, error : string) {
                if (typeof xhr.responseJSON === 'undefined'){
                    callback(error, null);
                } else {
                    callback(xhr.responseJSON.error, null);
                }
            }
        });
    }

    static httpPostForm(url : string, formData : FormData, callback : (error : string, data : string) => void) : void {
        // console.log("httpPostForm() : ", url);

        $.ajax({
            url : url,
            type : 'POST',
            data : formData,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType
            success : function(data : string) {
                callback(null, data);
            },
            error: function(xhr, status, error : string){
                callback(error + " " + xhr.responseText, null);
            }
        });
    }

    static fieldTextToFieldName(text : string) : string {
        return text.toLowerCase().replace(' ', '_');
    }

    // build full file path from path and filename
    static joinPath (path : string, fileName : string) : string {
        let fullFileName : string = fileName;

        if (path !== ""){
            fullFileName = path + '/' + fileName;
        }

        return fullFileName;
    }

    static showUserMessage (title : string, message : string) : void {
        // console.log("showUserMessage()", title, message);

        $('#messageModalTitle').text(title);
        $('#messageModalMessage').html(message);
        $('#messageModal').modal("toggle");

        // debug
        if (title === "Error"){
            Utils.addToHTMLElementLog(title + ":" + message);
        }
    }

    static showErrorsModal(title: string){
        const errors: Errors.Issue[] = Errors.getErrors();
        const warnings: Errors.Issue[] = Errors.getWarnings();

        console.log("showErrorsModal() errors:", errors.length, "warnings:", warnings.length);

        $('#errorsModalTitle').text(title);

        // hide whole errors or warnings sections if none are found
        $('#errorsModalErrorsAccordionItem').toggle(errors.length > 0);
        $('#errorsModalWarningsAccordionItem').toggle(warnings.length > 0);

        $('#errorsModal').modal("toggle");
    }

    static showNotification(title : string, message : string, type : "success" | "info" | "warning" | "danger") : void {
        $.notify({
            title:title + ":",
            message:message
        }, {
            type: type,
            placement:{
                from:"bottom",
                align:"center"
            },
            offset:{
                x:0,
                y:64
            } /*,
            delay:0 */
        });
    }

    static addToHTMLElementLog(message: string) : void {
        $('#htmlElementLog').text($('#htmlElementLog').text() + message + "\n");
    }

    static requestUserString(title : string, message : string, defaultString: string, isPassword: boolean, callback : (completed : boolean, userString : string) => void ) : void {
        // console.log("requestUserString()", title, message);

        $('#inputModalTitle').text(title);
        $('#inputModalMessage').html(message);
        $('#inputModalInput').attr('type', isPassword ? 'password' : 'text');

        $('#inputModalInput').val(defaultString);

        // store data about the choices, callback, result on the modal HTML element
        // so that the info is available to event handlers
        $('#inputModal').data('completed', false);
        $('#inputModal').data('callback', callback);
        $('#inputModal').data('returnType', "string");

        $('#inputModal').modal("toggle");
    }

    static requestUserText(title : string, message : string, defaultText: string, callback : (completed : boolean, userText : string) => void) : void {
        // console.log("requestUserText()", title, message);

        $('#inputTextModalTitle').text(title);
        $('#inputTextModalMessage').html(message);

        $('#inputTextModalInput').val(defaultText);

        // store the callback, result on the modal HTML element
        // so that the info is available to event handlers
        $('#inputTextModal').data('completed', false);
        $('#inputTextModal').data('callback', callback);

        $('#inputTextModal').modal("toggle");
    }

    static requestUserNumber(title : string, message : string, defaultNumber: number, callback : (completed : boolean, userNumber : number) => void ) : void {
        // console.log("requestUserNumber()", title, message);

        $('#inputModalTitle').text(title);
        $('#inputModalMessage').html(message);
        $('#inputModalInput').val(defaultNumber);

        // store data about the choices, callback, result on the modal HTML element
        // so that the info is available to event handlers
        $('#inputModal').data('completed', false);
        $('#inputModal').data('callback', callback);
        $('#inputModal').data('returnType', "number");

        $('#inputModal').modal("toggle");
    }

    static requestUserChoice(title : string, message : string, choices : string[], selectedChoiceIndex : number, allowCustomChoice : boolean, customChoiceText : string, callback : (completed : boolean, userChoiceIndex : number, userCustomString : string) => void ) : void {
        // console.log("requestUserChoice()", title, message, choices, selectedChoiceIndex, allowCustomChoice, customChoiceText);

        $('#choiceModalTitle').text(title);
        $('#choiceModalMessage').html(message);
        $('#choiceModalCustomChoiceText').text(customChoiceText);
        $('#choiceModalString').val("");

        // remove existing options from the select tag
        $('#choiceModalSelect').empty();

        // add options to the modal select tag
        for (let i = 0 ; i < choices.length ; i++){
            $('#choiceModalSelect').append($('<option>', {
                value: i,
                text: choices[i]
            }));
        }

        // pre-selected the currently selected index
        $('#choiceModalSelect').val(selectedChoiceIndex);

        // add the custom choice select option
        if (allowCustomChoice){
            $('#choiceModalSelect').append($('<option>', {
                value: choices.length,
                text: "Custom (enter below)"
            }));
        }

        // if no choices were supplied, hide the select
        $('#choiceModalStringRow').toggle(allowCustomChoice);

        // store data about the choices, callback, result on the modal HTML element
        // so that the info is available to event handlers
        $('#choiceModal').data('completed', false);
        $('#choiceModal').data('callback', callback);
        $('#choiceModal').data('choices', choices);

        // trigger the change event, so that the event handler runs and disables the custom text entry field if appropriate
        $('#choiceModalSelect').trigger('change');

        $('#choiceModal').modal("toggle");
    }

    static requestUserConfirm(title : string, message : string, affirmativeAnswer : string, negativeAnswer : string, callback : (confirmed : boolean) => void ) : void {
        // console.log("requestUserConfirm()", title, message, affirmativeAnswer, negativeAnswer);

        $('#confirmModalTitle').text(title);
        $('#confirmModalMessage').html(message);
        $('#confirmModalAffirmativeAnswer').text(affirmativeAnswer);
        $('#confirmModalNegativeAnswer').text(negativeAnswer);

        $('#confirmModal').data('callback', callback);

        $('#confirmModal').modal("toggle");
    }

    static requestUserGitCommit(defaultRepository : Repository, repositories: Repository[], filePath: string, fileName: string, callback : (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) => void ) : void {
        // console.log("requestUserGitCommit()");

        $('#gitCommitModal').data('completed', false);
        $('#gitCommitModal').data('callback', callback);
        $('#gitCommitModal').data('repositories', repositories);
        $('#gitCommitModal').modal("toggle");

        //
        let defaultRepositoryService: Eagle.RepositoryService = Eagle.RepositoryService.Unknown;
        if (defaultRepository !== null){
            defaultRepositoryService = defaultRepository.service;
        }

        // remove existing options from the repository service select tag
        $('#gitCommitModalRepositoryServiceSelect').empty();

        // add options to the repository service select tag
        $('#gitCommitModalRepositoryServiceSelect').append($('<option>', {
            value: Eagle.RepositoryService.GitHub,
            text: Eagle.RepositoryService.GitHub,
            selected: defaultRepositoryService === Eagle.RepositoryService.GitHub
        }));
        $('#gitCommitModalRepositoryServiceSelect').append($('<option>', {
            value: Eagle.RepositoryService.GitLab,
            text: Eagle.RepositoryService.GitLab,
            selected: defaultRepositoryService === Eagle.RepositoryService.GitLab
        }));

        Utils.updateGitCommitRepositoriesList(repositories, defaultRepository);

        $('#gitCommitModalFilePathInput').val(filePath);
        $('#gitCommitModalFileNameInput').val(fileName);
    }

    static requestUserEditField(eagle: Eagle, modalType: Eagle.ModalType, parameterType: Daliuge.FieldType, parameterUsage: Daliuge.FieldUsage, field: Field, choices: string[], callback: (completed: boolean, field: Field) => void) : void {

        eagle.currentField(field)

        $('#editFieldModal').data('completed', false);
        $('#editFieldModal').data('callback', callback);
        $('#editFieldModal').data('choices', choices);
        $('#editFieldModal').modal("toggle");

    }

    static requestUserAddCustomRepository(callback : (completed : boolean, repositoryService : string, repositoryName : string, repositoryBranch : string) => void) : void {

        $('#gitCustomRepositoryModalRepositoryNameInput').val("");
        $('#gitCustomRepositoryModalRepositoryBranchInput').val("");

        $('#gitCustomRepositoryModal').data('completed', false);
        $('#gitCustomRepositoryModal').data('callback', callback);
        $('#gitCustomRepositoryModal').modal("toggle");
    }

    static validateCustomRepository() : boolean {
        const repositoryService : string = <string>$('#gitCustomRepositoryModalRepositoryServiceSelect').val();
        const repositoryName : string = <string>$('#gitCustomRepositoryModalRepositoryNameInput').val();
        const repositoryBranch : string = <string>$('#gitCustomRepositoryModalRepositoryBranchInput').val();

        $('#gitCustomRepositoryModalRepositoryNameInput').removeClass('is-invalid');
        $('#gitCustomRepositoryModalRepositoryBranchInput').removeClass('is-invalid');

        // check service
        if (repositoryService.trim() !== Eagle.RepositoryService.GitHub && repositoryService.trim() !== Eagle.RepositoryService.GitLab){
            return false;
        }

        // check if name is empty
        if (repositoryName.trim() == ""){
            $('#gitCustomRepositoryModalRepositoryNameInput').addClass('is-invalid');
            return false;
        }

        // check if name starts with http:// or https://, or ends with .git
        if (repositoryName.startsWith('http://') || repositoryName.startsWith('https://') || repositoryName.endsWith('.git')){
            $('#gitCustomRepositoryModalRepositoryNameInput').addClass('is-invalid');
            return false;
        }

        // check if branch is empty
        if (repositoryBranch.trim() == ""){
            $('#gitCustomRepositoryModalRepositoryBranchInput').addClass('is-invalid');
            return false;
        }

        return true;
    }

    static updateGitCommitRepositoriesList(repositories: Repository[], defaultRepository: Repository) : void {
        // remove existing options from the repository name select tag
        $('#gitCommitModalRepositoryNameSelect').empty();

        // add options to the repository name select tag
        for (let i = 0 ; i < repositories.length ; i++){
            // check if this repository matches the given default repository
            let isDefault: boolean = false;
            if (defaultRepository !== null){
                isDefault = (repositories[i].name === defaultRepository.name) && (repositories[i].branch === defaultRepository.branch) && (repositories[i].service === defaultRepository.service);
            }

            $('#gitCommitModalRepositoryNameSelect').append($('<option>', {
                value: i,
                text: repositories[i].getNameAndBranch(),
                selected: isDefault
            }));
        }
    }

    static showSettingsModal() : void {
        $('#settingsModal').modal("show");
    }

    static hideSettingsModal() : void {
        $('#settingsModal').modal("hide");
    }

    static showOpenParamsTableModal(mode:string) : void {
        const eagle: Eagle = Eagle.getInstance();
        eagle.tableModalType(mode)
        $('#parameterTableModal').modal("show");
    }

    static showShortcutsModal() : void {
        $('#shortcutsModal').modal("show");
    }

    static closeShortcutsModal() : void {
        $('#shortcutsModal').modal("hide");
    }

    static closeErrorsModal() : void {
        $('#errorsModal').modal("hide");
    }

    static showPalettesModal(eagle: Eagle) : void {
        const token = Setting.findValue(Setting.GITHUB_ACCESS_TOKEN_KEY);

        if (token === null || token === "") {
            Utils.showUserMessage("Access Token", "The GitHub access token is not set! To access GitHub repository, set the token via settings.");
            return;
        }

        // add parameters in json data
        const jsonData = {
            repository: Setting.findValue(Setting.EXPLORE_PALETTES_REPOSITORY),
            branch: "master",
            token: token,
        };

        // empty the list of palettes prior to (re)fetch
        eagle.explorePalettes().clear();

        $('#explorePalettesModal').modal("toggle");

        Utils.httpPostJSON('/getExplorePalettes', jsonData, function(error:string, data:any){

            if (error !== null){
                // NOTE: if we immediately get an error, the explore palettes modal may still be transitioning to visible,
                //       so we wait here for a second before hiding the modal and displaying an error
                setTimeout(function(){
                    $('#explorePalettesModal').modal("toggle");
                    Utils.showUserMessage("Error", "Unable to fetch list of palettes");
                }, 1000);

                return;
            }

            const explorePalettes: PaletteInfo[] = [];
            for (const palette of data){
                explorePalettes.push(new PaletteInfo(Eagle.RepositoryService.GitHub, jsonData.repository, jsonData.branch, palette.name, palette.path));
            }

            // process files into a more complex structure
            eagle.explorePalettes().initialise(explorePalettes);
        });
    }

    static showModelDataModal = (title: string, fileInfo: FileInfo) : void => {
        const eagle = Eagle.getInstance();
        eagle.currentFileInfoTitle(title);
        eagle.currentFileInfo(fileInfo);

        $('#modelDataModal').modal("toggle");
    }

    static requestUserEditEdge(edge: Edge, logicalGraph: LogicalGraph, callback: (completed: boolean, edge: Edge) => void) : void {
        Utils.updateEditEdgeModal(edge, logicalGraph);

        $('#editEdgeModal').data('completed', false);
        $('#editEdgeModal').data('callback', callback);

        $('#editEdgeModal').data('edge', edge);
        $('#editEdgeModal').data('logicalGraph', logicalGraph);

        $('#editEdgeModal').modal("toggle");
    }

    static updateEditEdgeModal(edge: Edge, logicalGraph: LogicalGraph): void {
        let srcNode: Node = null;
        let destNode: Node = null;

        // TODO: make local copy of edge, so that original is not changed! original might come from inside the active graph

        // populate UI with current edge data
        // add src node keys
        $('#editEdgeModalSrcNodeKeySelect').empty();
        for (const node of logicalGraph.getNodes()){
            // if node itself can have output ports, add the node to the list
            if (node.canHaveOutputs()){
                $('#editEdgeModalSrcNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getSrcNodeKey() === node.getKey()
                }));
            }

            // add input application node, if present
            if (node.hasInputApplication()){
                const inputApp = node.getInputApplication();

                $('#editEdgeModalSrcNodeKeySelect').append($('<option>', {
                    value: inputApp.getKey(),
                    text: inputApp.getName(),
                    selected: edge.getSrcNodeKey() === inputApp.getKey()
                }));
            }

            // add output application node, if present
            if (node.hasOutputApplication()){
                const outputApp = node.getOutputApplication();

                $('#editEdgeModalSrcNodeKeySelect').append($('<option>', {
                    value: outputApp.getKey(),
                    text: outputApp.getName(),
                    selected: edge.getSrcNodeKey() === outputApp.getKey()
                }));
            }
        }

        // make sure srcNode reflects what is actually selected in the UI
        const srcNodeKey : number = parseInt(<string>$('#editEdgeModalSrcNodeKeySelect').val(), 10);

        if (isNaN(srcNodeKey)){
            srcNode = null;
        } else {
            srcNode = logicalGraph.findNodeByKey(srcNodeKey);
        }

        // check that source node was found, if not, disable SrcPortIdSelect?
        $('#editEdgeModalSrcPortIdSelect').empty();
        if (srcNode === null){
            $('#editEdgeModalSrcPortIdSelect').attr('disabled', 'true');
        } else {
            // add src port ids
            for (const port of srcNode.getOutputPorts()){
                $('#editEdgeModalSrcPortIdSelect').append($('<option>', {
                    value: port.getId(),
                    text: port.getDisplayText(),
                    selected: edge.getSrcPortId() === port.getId()
                }));
            }
        }

        // add dest node keys
        $('#editEdgeModalDestNodeKeySelect').empty();
        for (const node of logicalGraph.getNodes()){
            if (node.canHaveInputs()){
                $('#editEdgeModalDestNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getDestNodeKey() === node.getKey()
                }));
            }

            // input application node, if present
            if (node.hasInputApplication()){
                const inputApp = node.getInputApplication();

                $('#editEdgeModalDestNodeKeySelect').append($('<option>', {
                    value: inputApp.getKey(),
                    text: inputApp.getName(),
                    selected: edge.getDestNodeKey() === inputApp.getKey()
                }));
            }

            // output application node, if present
            if (node.hasOutputApplication()){
                const outputApp = node.getOutputApplication();

                $('#editEdgeModalDestNodeKeySelect').append($('<option>', {
                    value: outputApp.getKey(),
                    text: outputApp.getName(),
                    selected: edge.getDestNodeKey() === outputApp.getKey()
                }));
            }
        }

        // make sure srcNode reflects what is actually selected in the UI
        const destNodeKey : number = parseInt(<string>$('#editEdgeModalDestNodeKeySelect').val(), 10);

        if (isNaN(destNodeKey)){
            destNode = null;
        } else {
            destNode = logicalGraph.findNodeByKey(destNodeKey);
        }

        // check that dest node was found, if not, disable DestPortIdSelect?
        $('#editEdgeModalDestPortIdSelect').empty();
        if (destNode === null){
            $('#editEdgeModalDestPortIdSelect').attr('disabled', 'true');
        } else {
            // add dest port ids
            for (const port of destNode.getInputPorts()){
                $('#editEdgeModalDestPortIdSelect').append($('<option>', {
                    value: port.getId(),
                    text: port.getDisplayText(),
                    selected: edge.getDestPortId() === port.getId()
                }));
            }
        }

        $('#editEdgeModalDataTypeInput').val(edge.getDataType());
    }

    /**
     * Returns a list of unique port names (except event ports)
     */
    static getUniquePortsList = (palettes : Palette[], graph: LogicalGraph) : Field[] => {
        const uniquePorts : Field[] = [];

        // build a list from all palettes
        for (const palette of palettes){
            for (const node of palette.getNodes()){
                // add input port names into the list
                for (const port of node.getInputPorts()) {
                    if (!port.getIsEvent()){
                        Utils._addFieldIfUnique(uniquePorts, port.clone());
                    }
                }

                // add output port names into the list
                for (const port of node.getOutputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addFieldIfUnique(uniquePorts, port.clone());
                    }
                }
            }
        }

        // build a list from all nodes
        for (const node of graph.getNodes()) {
            // add input port names into the list
            for (const port of node.getInputPorts()) {
                if (!port.getIsEvent()){
                    Utils._addFieldIfUnique(uniquePorts, port.clone());
                }
            }

            // add output port names into the list
            for (const port of node.getOutputPorts()) {
                if (!port.getIsEvent()) {
                    Utils._addFieldIfUnique(uniquePorts, port.clone());
                }
            }

            // add input application input and output ports
            if (node.hasInputApplication()){
                // input ports
                for (const port of node.getInputApplication().getInputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addFieldIfUnique(uniquePorts, port.clone());
                    }
                }

                // output ports
                for (const port of node.getInputApplication().getOutputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addFieldIfUnique(uniquePorts, port.clone());
                    }
                }
            }

            // add output application input and output ports
            if (node.hasOutputApplication()){
                // input ports
                for (const port of node.getOutputApplication().getInputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addFieldIfUnique(uniquePorts, port.clone());
                    }
                }

                // output ports
                for (const port of node.getOutputApplication().getOutputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addFieldIfUnique(uniquePorts, port.clone());
                    }
                }
            }
        }

        return uniquePorts;
    }

    static getDataComponentsWithPortTypeList(palettes: Palette[], ineligibleCategories: Category[]) : Node[] {
        // console.log("getDataComponentsWithPortTypeList", ineligibleCategories);

        const result: Node[] = [];

        // add all data components (except ineligible)
        for (const palette of palettes){
            for (const node of palette.getNodes()){
                // skip nodes that are not data components
                if (!node.isData()){
                    continue;
                }

                // skip nodes whose category in in the ineligible categories list
                let ineligible = false;
                for (const ic of ineligibleCategories){
                    if (node.getCategory() === ic){
                        ineligible = true;
                        break;
                    }
                }
                if (ineligible){
                    continue;
                }

                result.push(node);
            }
        }

        return result;
    }

    static getComponentsWithInputsAndOutputs(palettes: Palette[], categoryType: Category.Type, numRequiredInputs: number, numRequiredOutputs: number) : Node[] {
        // console.log("getDataComponentsWithInputsAndOutputs");

        const result: Node[] = [];

        // add all data components (except ineligible)
        for (const palette of palettes){
            for (const node of palette.getNodes()){
                // skip nodes that are not data components
                if (categoryType === Category.Type.Data && !node.isData()){
                    continue;
                }

                // skip nodes that are not application components
                if (categoryType === Category.Type.Application && !node.isApplication()){
                    continue;
                }

                // skip nodes that are not construct components
                if (categoryType === Category.Type.Construct && !node.isConstruct()){
                    continue;
                }

                // if input ports required, skip nodes with too few
                if (numRequiredInputs > node.maxInputs()){
                    continue;
                }

                // if output ports required, skip nodes with too few
                if (numRequiredOutputs > node.maxOutputs()){
                    continue;
                }

                result.push(node);
            }
        }

        return result;
    }

    static getCategoriesWithInputsAndOutputs(categoryType: Category.Type, numRequiredInputs: number, numRequiredOutputs: number) : Category[] {
        const result: Category[] = [];

        for (const [categoryName, categoryData] of Object.entries(CategoryData.cData)){

            if (categoryData.categoryType !== categoryType){
                continue;
            }

            // if input ports required, skip nodes with too few
            if (numRequiredInputs > categoryData.maxInputs){
                continue;
            }

            // if output ports required, skip nodes with too few
            if (numRequiredOutputs > categoryData.maxOutputs){
                continue;
            }

            result.push(categoryName as Category);
        }

        return result;
    }

    static getDataComponentMemory(palettes: Palette[]) : Node {
        // add all data components (except ineligible)
        for (const palette of palettes){
            for (const node of palette.getNodes()){
                // skip nodes that are not data components
                if (node.getName() === Category.Memory){
                    return node;
                }
            }
        }

        return null;
    }

    static getComponentsWithMatchingPort(palettes: Palette[], input: boolean, type: string, dataEligible: boolean) : Node[] {
        const result: Node[] = [];

        // add all data components (except ineligible)
        for (const palette of palettes){
            for (const node of palette.getNodes()){
                // skip data nodes if not eligible
                if (!dataEligible && node.getCategoryType() === Category.Type.Data){
                    continue;
                }

                let hasInputOfType: boolean = false;

                const ports: Field[] = input ? node.getInputPorts() : node.getOutputPorts();

                for (const port of ports){
                    if (Utils.typesMatch(port.getType(), type)){
                        hasInputOfType = true;
                    }
                }

                if (hasInputOfType){
                    result.push(node);
                }
            }
        }

        return result;
    }

    static addTypeIfUnique = (types: string[], newType: string) : void => {
        for (const t of types){
            if (t === newType){
                return;
            }
        }
        types.push(newType);
    }

    /**
     * Returns a list of all fields in the given palette or logical graph, of a particular type
     */
    static getUniqueFields = (diagram : Palette | LogicalGraph) : Field[] => {
        const uniqueFields : Field[] = [];

        // build a list from all nodes, add fields into the list
        for (const node of diagram.getNodes()) {
            for (const field of node.getFields()) {
                Utils._addFieldIfUnique(uniqueFields, field.clone());
            }
        }

        return uniqueFields;
    }

    /**
     * Returns a list of all fields in the given palette or logical graph, of a particular type
     */
    static getUniqueFieldsOfType = (diagram : Palette | LogicalGraph, parameterType: Daliuge.FieldType) : Field[] => {
        const uniqueFields : Field[] = [];

        // build a list from all nodes, add fields into the list
        for (const node of diagram.getNodes()) {
            for (const field of node.getFields()) {
                if (field.getParameterType() !== parameterType){
                    continue;
                }
                Utils._addFieldIfUnique(uniqueFields, field.clone());
            }
        }

        return uniqueFields;
    }

    private static _addFieldIfUnique = (fields : Field[], field: Field) : void => {
        // check if the new field matches an existing field (by name and type), if so, abort
        for (const f of fields){
            if (f.getDisplayText() === field.getDisplayText() && f.getType() === field.getType()){
                return;
            }
        }

        // otherwise add the field
        fields.push(field);
    }

    static isKnownCategory(category : string) : boolean {
        return typeof CategoryData.cData[category] !== 'undefined';
    }

    static getColorForNode(category : Category) : string {
        return CategoryData.getCategoryData(category).color;
    }

    static saveAsPNG(selector: string, filename: string) : void {
        // fetch svg CSS and place inline within serialized SVG
        $.get("/static/svg.css")
        .done(function(response){

            const svgElement : Element = document.querySelector(selector);
            let svgString : string = new XMLSerializer().serializeToString(svgElement);

            // create svgString with injected CSS stylesheet
            const CSS_ELEMENT = '<style type="text/css" ><![CDATA[' + response + ']]></style>';
            //console.log("CSS_ELEMENT", CSS_ELEMENT);
            svgString = svgString.substring(0, svgString.indexOf(">") + 1) + CSS_ELEMENT + svgString.substring(svgString.indexOf(">") + 1);
            //console.log("svgString", svgString);

            const canvas : HTMLCanvasElement = document.createElement("canvas");
            canvas.setAttribute("width", svgElement.clientWidth.toString());
            canvas.setAttribute("height", svgElement.clientHeight.toString());
            const ctx = canvas.getContext("2d");

            const img = new Image();
            const svg = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
            const url = window.URL.createObjectURL(svg);
            img.onload = function() {
                ctx.drawImage(img, 0, 0);
                const png = canvas.toDataURL("image/png");

                // Element that will be used for downloading.
                const a : HTMLAnchorElement = document.createElement("a");
                a.style.display = "none";
                a.href = png;
                a.download = filename + ".png";

                // Add to document, begin download and remove from document.
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(a.href);
                document.body.removeChild(a);
            };
            img.src = url;
        });
    }

    static getRightWindowWidth() : number {
        return Setting.findValue(Setting.RIGHT_WINDOW_WIDTH_KEY)
    }

    static setRightWindowWidth(width : number) : void {
        Setting.find(Setting.RIGHT_WINDOW_WIDTH_KEY).setValue(width)
        UiModeSystem.saveToLocalStorage()
    }

    static getLeftWindowWidth() : number {
        return Setting.findValue(Setting.LEFT_WINDOW_WIDTH_KEY)
    }

    static setLeftWindowWidth(width : number) : void {
        Setting.find(Setting.LEFT_WINDOW_WIDTH_KEY).setValue(width)
        UiModeSystem.saveToLocalStorage()
    }

    static getLocalStorageKey(repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string) : string {
        switch (repositoryService){
            case Eagle.RepositoryService.GitHub:
                return repositoryName + "|" + repositoryBranch + ".github_repository_and_branch";
            case Eagle.RepositoryService.GitLab:
                return repositoryName + "|" + repositoryBranch + ".gitlab_repository_and_branch";
            default:
                return null;
        }
    }

    static getLocalStorageValue(repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string) : string {
        return repositoryName+"|"+repositoryBranch;
    }

    static buildComponentList(filter: (cData: CategoryData) => boolean) : Category[] {
        const result : Category[] = [];

        for (const category in CategoryData.cData){
            const cData = CategoryData.getCategoryData(<Category>category);
            if (filter(cData)){
                result.push(<Category>category);
            }
        }

        return result;
    }

    static giveNodePortsNewIds(node: Node) : void {
        // set new ids for any ports in this node
        for (const port of node.getInputPorts()){
            port.setId(Utils.uuidv4());
        }
        for (const port of node.getOutputPorts()){
            port.setId(Utils.uuidv4());
        }
    }

    static determineFileType(data: any): Eagle.FileType {
        if (typeof data.modelData !== 'undefined'){
            if (typeof data.modelData.fileType !== 'undefined'){
                return Utils.translateStringToFileType(data.modelData.fileType);
            }
        }

        if (typeof data.DALiuGEGraph !== 'undefined'){
            return Eagle.FileType.Graph;
        }

        return Eagle.FileType.Unknown;
    }

    static determineSchemaVersion(data: any): Daliuge.SchemaVersion {
        // appref
        if (typeof data.modelData !== 'undefined'){
            if (typeof data.modelData.schemaVersion !== 'undefined'){
                if (data.modelData.schemaVersion === Daliuge.SchemaVersion.OJS){
                    return Daliuge.SchemaVersion.OJS;
                }
                return data.modelData.schemaVersion;
            }
        }

        return Daliuge.SchemaVersion.Unknown;
    }

    static portsMatch(port0: Field, port1: Field){
        return Utils.typesMatch(port0.getType(), port1.getType());
    }

    static typesMatch(type0: string, type1: string){
        // check for undefined
        if (typeof type0 === "undefined" || typeof type1 === "undefined"){
            console.warn("typesMatch(): matching value undefined (type0:", type0, "type1:", type1, ")");
            return false;
        }

        // match if either type is "Object"
        if (type0 === "Object" || type1 === "Object"){
            return true;
        }

        // match if one type is an extension of the other
        if (type0.startsWith(type1) || type1.startsWith(type0)){
            return true;
        }

        return type0 === type1;
    }

    static checkPalette(palette: Palette): Errors.ErrorsWarnings {
        const eagle: Eagle = Eagle.getInstance();
        const errorsWarnings: Errors.ErrorsWarnings = {warnings: [], errors: []};

        // check for duplicate keys
        const keys: number[] = [];

        for (const node of palette.getNodes()){
            // check existing keys
            if (keys.indexOf(node.getKey()) !== -1){
                errorsWarnings.errors.push(Errors.Message("Key " + node.getKey() + " used by multiple components in palette."));
            } else {
                keys.push(node.getKey());
            }
        }

        // check all nodes are valid
        for (const node of palette.getNodes()){
            Node.isValid(eagle, node, Eagle.selectedLocation(), false, false, errorsWarnings);
        }

        return errorsWarnings;
    }

    static checkGraph(eagle: Eagle): Errors.ErrorsWarnings {
        const errorsWarnings: Errors.ErrorsWarnings = {warnings: [], errors: []};

        const graph: LogicalGraph = eagle.logicalGraph();

        // check all nodes are valid
        for (const node of graph.getNodes()){
            Node.isValid(eagle, node, Eagle.selectedLocation(), false, false, errorsWarnings);
        }

        // check all edges are valid
        for (const edge of graph.getEdges()){
            Edge.isValid(eagle, edge.getId(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), edge.isLoopAware(), edge.isClosesLoop(), false, false, errorsWarnings);
        }

        return errorsWarnings;
    }

    static validateJSON(json : object, version : Daliuge.SchemaVersion, fileType : Eagle.FileType) : {valid: boolean, errors: string} {
        // console.log("validateJSON(): version:", version, " fileType:", fileType);

        const ajv = new Ajv();
        let valid : boolean;

        switch(version){
            case Daliuge.SchemaVersion.OJS:
                switch(fileType){
                    case Eagle.FileType.Graph:
                    case Eagle.FileType.Palette:
                        valid = ajv.validate(Utils.ojsGraphSchema, json) as boolean;
                        break;
                    default:
                        console.warn("Unknown fileType:", fileType, "version:", version, "Unable to validate JSON");
                        valid = true;
                        break;
                }
                break;
            default:
                console.warn("Unknown format for validation");
                valid = true;
                break;
        }

        return {valid: valid, errors: ajv.errorsText(ajv.errors)};
    }

    static isAlpha(ch: string){
        return /^[A-Z]$/i.test(ch);
    }

    static isNumeric(ch: string){
        return /^[0-9]$/i.test(ch);
    }

    static validateField(type: string, value: string) : boolean {
        let valid: boolean = true;

        // make sure JSON fields are parse-able
        if (type === Daliuge.DataType.Json){
            try {
                JSON.parse(value);
            } catch(e) {
                valid = false;
            }
        }

        return valid;
    }

    static validateType(type: string) : boolean {
        const typePrefix = Utils.dataTypePrefix(type);

        for (const dt of Utils.enumKeys(Daliuge.DataType)){
            if (dt === typePrefix){
                return true;
            }
        }

        return false;
    }

    static downloadFile(error : string, data : string, fileName : string) : void {
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
    }

    // https://noonat.github.io/intersect/#aabb-vs-aabb
    static nodesOverlap(n0x: number, n0y: number, n0width: number, n0height: number, n1x: number, n1y: number, n1width: number, n1height: number) : boolean {
        const n0pos = {x:n0x + n0width/2, y:n0y + n0height/2};
        const n1pos = {x:n1x + n1width/2, y:n1y + n1height/2};
        const n0half = {x:n0width/2, y:n0height/2};
        const n1half = {x:n1width/2, y:n1height/2};

        //console.log("compare", n0x, n0y, n0width, n0height, n1x, n1y, n1width, n1height);

        const dx = n0pos.x - n1pos.x;
        const px = (n0half.x + n1half.x) - Math.abs(dx);
        if (px <= 0) {
            //console.log("compare OK");
            return false;
        }

        const dy = n0pos.y - n1pos.y;
        const py = (n0half.y + n1half.y) - Math.abs(dy);
        if (py <= 0) {
            //console.log("compare OK");
            return false;
        }

        //console.log("compares HIT");

        return true;
    }

    static table2CSV(table: any[]) : string {
        let s = "";

        // if table empty, return
        if (table.length === 0){
            return s;
        }

        // write the header row
        s += Object.keys(table[0]).join(",") + "\n";

        for (const row of table){
            s += Object.values(row).join(",") + "\n";
        }
        return s;
    }

    // https://stackoverflow.com/questions/5254838/calculating-distance-between-a-point-and-a-rectangular-box-nearest-point
    static positionToNodeDistance(positionX: number, positionY: number, node: Node): number {
        const rectMinX = node.getPosition().x;
        const rectMaxX = node.getPosition().x + node.getWidth();
        const rectMinY = node.getPosition().y;
        const rectMaxY = node.getPosition().y + node.getHeight();

        const dx = Math.max(rectMinX - positionX, 0, positionX - rectMaxX);
        const dy = Math.max(rectMinY - positionY, 0, positionY - rectMaxY);
        return Math.sqrt(dx*dx + dy*dy);
    }


    static async userChoosePalette(paletteNames : string[]) : Promise<string> {
        return new Promise<string>((resolve, reject) => {

            // ask user to select the destination node
            Utils.requestUserChoice("Choose Palette", "Please select the palette you'd like to save", paletteNames, 0, false, "", (completed : boolean, userChoiceIndex: number, userCustomChoice : string) => {
                // reject if the user aborted
                if (!completed){
                    resolve(null);
                }

                // resolve with chosen palette name
                resolve(paletteNames[userChoiceIndex]);
            });
        });
    }

    static async userEnterCommitMessage(modalMessage: string) : Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // request commit message from the user
            Utils.requestUserString("Commit Message", modalMessage, "", false, (completed : boolean, userString : string) : void => {
                if (!completed){
                    resolve(null);
                }

                resolve(userString);
            });
        });
    }

    static getShortcutDisplay = () : {description:string, shortcut : string,function:string}[] => {
        const displayShorcuts : {description:string, shortcut : string, function : any} []=[];
        const eagle = (<any>window).eagle;

        for (const object of Eagle.shortcuts){
            // skip if shortcut should not be displayed
            if (!object.display(eagle)){
                continue;
            }

            const shortcut = Utils.getKeyboardShortcutTextByKey(object.key, false);
            displayShorcuts.push({description: object.name, shortcut: shortcut,function:object.run});
        }

        return displayShorcuts;
    }

    static getKeyboardShortcutTextByKey = (key: string, addBrackets: boolean) : string => {
        for (const shortcut of Eagle.shortcuts){
            if (shortcut.key === key){
                const ks = [];
                for (const k of shortcut.keys){
                    if (shortcut.modifier === KeyboardShortcut.Modifier.None){
                        //some processing of the return
                        //if the return should have brackets they are added here
                        //the first letter of the string returned is also capitalised
                        if (addBrackets){
                            ks.push("["+k.charAt(0).toUpperCase() + k.slice(1)+"]");
                        } else {
                            ks.push(k.charAt(0).toUpperCase() + k.slice(1));
                        }
                    } else {
                        if (addBrackets){
                            ks.push("["+shortcut.modifier + " + " + k.charAt(0).toUpperCase() + k.slice(1)+"]");
                        } else {
                            ks.push(shortcut.modifier + " + " + k.charAt(0).toUpperCase() + k.slice(1));
                        }
                    }
                }
                return ks.join(",");
            }
        }

        console.warn("Could not find keyboard shortcut text for key", key);
        return "";
    }

    static markdown2html(markdown: string) : string {
        // check that input is not undefined
        if (typeof markdown === "undefined" || markdown === null){
            console.warn("Could not convert markdown to html! Input:", markdown);
            return "";
        }

        const converter = new Showdown.Converter();
        converter.setOption('tables', true);
        let html = converter.makeHtml(markdown);

        // check that the returned html is not null
        if (html === null){
            console.warn("Could not convert markdown to html! Input:", markdown);
            return "";
        }

        // add some bootstrap CSS to the converted html
        html = html.replaceAll("<table>", "<table class='table'>");

        return html;
    }

    static asBool(value: string) : boolean {
        if(value === undefined){
            return false
        }
        return value.toLowerCase() === "true";
    }

    static fixEdgeType(eagle: Eagle, edgeId: string, newType: string) : void {
        const edge = eagle.logicalGraph().findEdgeById(edgeId);

        if (edge === null){
            return;
        }

        edge.setDataType(newType);
    }

    static fixDeleteEdge(eagle: Eagle, edgeId: string): void {
        eagle.logicalGraph().removeEdgeById(edgeId);
    }

    static fixPortType(eagle: Eagle, sourcePort: Field, destinationPort: Field): void {
        destinationPort.setType(sourcePort.getType());
    }

    static fixNodeAddField(eagle: Eagle, node: Node, field: Field){
        node.addField(field);
    }

    static fixNodeFieldIds(eagle: Eagle, nodeKey: number){
        const node: Node = eagle.logicalGraph().findNodeByKey(nodeKey);

        if (node === null){
            return;
        }

        for (const field of node.getFields()){
            if (field.getId() === ""){
                field.setId(Utils.uuidv4());
            }
        }
    }

    static fixNodeCategory(eagle: Eagle, node: Node, category: Category){
        node.setCategory(category);
    }

    // NOTE: merges field1 into field0
    static fixNodeMergeFieldsByIndex(eagle: Eagle, node: Node, field0Index: number, field1Index: number){
        //console.log("fixNodeMergeFieldsByIndex()", node.getName(), field0Index, field1Index);

        // abort if one or more of the fields is not found
        const field0 = node.getFields()[field0Index];
        const field1 = node.getFields()[field1Index];
        //console.log("field0", field0, field0 ? field0.getId() : "", field0 ? field0.getUsage() : "", "field1", field1, field1 ? field1.getId() : "", field1 ? field1.getUsage() : "");
        if (typeof field0 === "undefined" || typeof field1 === "undefined"){
            return;
        }

        const usage0 = field0.getUsage();
        const usage1 = field1.getUsage();
        const newUsage = this._mergeUsage(usage0, usage1);
        //console.log("usage0", usage0, "usage1", usage1, "newUsage", newUsage);

        // remove field1
        node.removeFieldByIndex(field1Index);

        // update usage of remaining field (field0)
        field0.setUsage(newUsage);

        // update all edges to use new field
        this._mergeEdges(eagle, field1.getId(), field0.getId());
    }

    // NOTE: merges field1 into field0
    static fixNodeMergeFields(eagle: Eagle, node: Node, field0: Field, field1: Field){
        //console.log("fixNodeMergeFieldsById()", node.getName(), field0.getDisplayText(), field1.getDisplayText());

        // abort if one or more of the fields is not found
        const f0 = node.findFieldById(field0.getId());
        const f1 = node.findFieldById(field1.getId());
        //console.log("f0", f0, f0 ? f0.getId() : "", f0 ? f0.getUsage() : "", "f1", f1, f1 ? f1.getId() : "", f1 ? f1.getUsage() : "");
        if (f0 === null || f1 === null){
            return;
        }

        const usage0 = field0.getUsage();
        const usage1 = field1.getUsage();
        const newUsage = this._mergeUsage(usage0, usage1);
        //console.log("usage0", usage0, "usage1", usage1, "newUsage", newUsage);

        // remove field1
        node.removeFieldById(field1.getId());

        // update usage of remaining field (field0)
        field0.setUsage(newUsage);

        // update all edges to use new field
        this._mergeEdges(eagle, field1.getId(), field0.getId());
    }

    static _mergeUsage(usage0: Daliuge.FieldUsage, usage1: Daliuge.FieldUsage) : Daliuge.FieldUsage {
        let result: Daliuge.FieldUsage = usage0;

        // decide if we need to merge an input port and output port
        if (usage0 !== usage1 && (usage0 === Daliuge.FieldUsage.InputPort || usage0 === Daliuge.FieldUsage.OutputPort) && (usage1 === Daliuge.FieldUsage.InputPort || usage1 === Daliuge.FieldUsage.OutputPort)){
            result = Daliuge.FieldUsage.InputOutput;
        }

        // if one field is a NoPort?
        if (usage0 === Daliuge.FieldUsage.NoPort){
            result = usage1;
        }
        if (usage1 === Daliuge.FieldUsage.NoPort){
            result = usage0;
        }

        return result;
    }

    static _mergeEdges(eagle: Eagle, oldFieldId: string, newFieldId: string){
        // update all edges to use new field
        for (const edge of eagle.logicalGraph().getEdges()){
            // update src port
            if (edge.getSrcPortId() === oldFieldId){
                edge.setSrcPortId(newFieldId);
            }

            // update dest port
            if (edge.getDestPortId() === oldFieldId){
                edge.setDestPortId(newFieldId);
            }
        }
    }

    static fixFieldId(eagle: Eagle, field: Field){
        field.setId(Utils.uuidv4());
    }

    static fixFieldValue(eagle: Eagle, node: Node, exampleField: Field, value: string){
        let field : Field = node.getFieldByDisplayText(exampleField.getDisplayText());

        // if a field was not found, clone one from the example and add to node
        if (field === null){
            field = exampleField.clone();
            field.setId(Utils.uuidv4());
            node.addField(field);
        }

        field.setValue(value);
    }

    static fixFieldDefaultValue(eagle: Eagle, field: Field){
        // depends on the type
        switch(field.getType()){
            case Daliuge.DataType.Boolean:
            field.setDefaultValue("false");
            break;
            case Daliuge.DataType.Integer:
            case Daliuge.DataType.Float:
            field.setDefaultValue("0");
            break;
            case Daliuge.DataType.Json:
            case Daliuge.DataType.Python:
            field.setDefaultValue("{}");
            break;
            default:
            console.warn("No specific way to fix default value for field of this type:", field.getType());
            field.setDefaultValue("");
            break;
        }
    }

    static fixFieldType(eagle: Eagle, field: Field){
        if (field.getType() === Daliuge.DataType.Unknown){
            field.setType(Daliuge.DataType.Object);
            return;
        }

        // fix for redundant 'Complex' type
        if (field.getType() === 'Complex'){
            field.setType(Daliuge.DataType.Object);
            return;
        }

        field.setType(Daliuge.DataType.Object + "." + field.getType());
    }

    static fixMoveEdgeToEmbeddedApplication(eagle: Eagle, edgeId: string){
        const edge = eagle.logicalGraph().findEdgeById(edgeId);
        const srcNode = eagle.logicalGraph().findNodeByKey(edge.getSrcNodeKey());
        const destNode = eagle.logicalGraph().findNodeByKey(edge.getDestNodeKey());

        // if the SOURCE node is a construct, find the port within the embedded apps, and modify the edge with a new source node
        if (srcNode.getCategoryType() === Category.Type.Construct){
            const embeddedApplicationKeyAndPort = srcNode.findPortInApplicationsById(edge.getSrcPortId());

            if (embeddedApplicationKeyAndPort.key !== null){
                edge.setSrcNodeKey(embeddedApplicationKeyAndPort.key);
            }
        }

        // if the DESTINATION node is a construct, find the port within the embedded apps, and modify the edge with a new destination node
        if (destNode.getCategoryType() === Category.Type.Construct){
            const embeddedApplicationKeyAndPort = destNode.findPortInApplicationsById(edge.getDestPortId());

            if (embeddedApplicationKeyAndPort.key !== null){
                edge.setDestNodeKey(embeddedApplicationKeyAndPort.key);
            }
        }
    }

    static fixFieldParameterType(eagle: Eagle, field: Field, newType: Daliuge.FieldType){
        field.setParameterType(newType);
    }

    static callFixFunc(eagle: Eagle, fixFunc: () => void){
        fixFunc();
        Utils.postFixFunc(eagle);
    }

    static postFixFunc(eagle: Eagle){
        eagle.selectedObjects.valueHasMutated();
        eagle.logicalGraph().fileInfo().modified = true;

        eagle.checkGraph();
        eagle.undo().pushSnapshot(eagle, "Fix");
    }

    static showEdge(eagle: Eagle, edgeId: string): void {
        // close errors modal if visible
        $('#errorsModal').modal("hide");

        eagle.setSelection(Eagle.RightWindowMode.Inspector, eagle.logicalGraph().findEdgeById(edgeId), Eagle.FileType.Graph);
    }

    static showNode(eagle: Eagle, nodeKey: number): void {
        // close errors modal if visible
        $('#errorsModal').modal("hide");

        eagle.setSelection(Eagle.RightWindowMode.Inspector, eagle.logicalGraph().findNodeByKey(nodeKey), Eagle.FileType.Graph);
    }

    // only update result if it is worse that current result
    static worstEdgeError(errorsWarnings: Errors.ErrorsWarnings) : Eagle.LinkValid {
        if (errorsWarnings === null){
            console.warn("errorsWarnings is null");
            return Eagle.LinkValid.Valid;
        }

        if (errorsWarnings.warnings.length === 0 && errorsWarnings.errors.length === 0){
            return Eagle.LinkValid.Valid;
        }

        if (errorsWarnings.errors.length !== 0){
            return Eagle.LinkValid.Invalid;
        }

        return Eagle.LinkValid.Warning;
    }

    static printCategories = () : void => {
        const tableData : any[] = [];

        for (const category in CategoryData.cData){
            const cData = CategoryData.getCategoryData(<Category>category);

            tableData.push({
                category: <Category>category,
                categoryType: cData.categoryType,
            });
        }

        console.table(tableData);
    }

    static printLogicalGraphNodesTable = () : void => {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();

        // add logical graph nodes to table
        for (const node of eagle.logicalGraph().getNodes()){
            tableData.push({
                "name":node.getName(),
                "key":node.getKey(),
                "id":node.getId(),
                "parentKey":node.getParentKey(),
                "category":node.getCategory(),
                "categoryType":node.getCategoryType(),
                "expanded":node.getExpanded(),
                "x":node.getPosition().x,
                "y":node.getPosition().y,
                "realX":node.getRealPosition().x,
                "realY":node.getRealPosition().y,
                "width":node.getWidth(),
                "height":node.getHeight(),
                "inputAppKey":node.getInputApplication() === null ? null : node.getInputApplication().getKey(),
                "inputAppCategory":node.getInputApplication() === null ? null : node.getInputApplication().getCategory(),
                "inputAppEmbedKey":node.getInputApplication() === null ? null : node.getInputApplication().getEmbedKey(),
                "outputAppKey":node.getOutputApplication() === null ? null : node.getOutputApplication().getKey(),
                "outputAppCategory":node.getOutputApplication() === null ? null : node.getOutputApplication().getCategory(),
                "outputAppEmbedKey":node.getOutputApplication() === null ? null : node.getOutputApplication().getEmbedKey()
            });
        }

        console.table(tableData);
    }

    static printLogicalGraphEdgesTable = () : void => {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();

        // add logical graph nodes to table
        for (const edge of eagle.logicalGraph().getEdges()){
            tableData.push({
                "_id":edge.getId(),
                "sourceNodeKey":edge.getSrcNodeKey(),
                "sourcePortId":edge.getSrcPortId(),
                "destNodeKey":edge.getDestNodeKey(),
                "destPortId":edge.getDestPortId(),
                "dataType":edge.getDataType(),
                "loopAware":edge.isLoopAware(),
                "isSelectionRelative":edge.getSelectionRelative()
            });
        }

        console.table(tableData);
    }

    static printPalettesTable = () : void => {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();

        // add logical graph nodes to table
        for (const palette of eagle.palettes()){
            for (const node of palette.getNodes()){
                tableData.push({
                    "palette":palette.fileInfo().name,
                    "name":node.getName(),
                    "key":node.getKey(),
                    "id":node.getId(),
                    "embedKey":node.getEmbedKey(),
                    "category":node.getCategory(),
                    "categoryType":node.getCategoryType(),
                    "numFields":node.getNumFields(),
                    "repositoryUrl":node.getRepositoryUrl(),
                    "commitHash":node.getCommitHash(),
                    "paletteDownloadUrl":node.getPaletteDownloadUrl(),
                    "dataHash":node.getDataHash()
                });
            }
        }

        console.table(tableData);
    }

    static printNodeFieldsTable = (nodeIndex: number) : void => {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();

        // check that node at nodeIndex exists
        if (nodeIndex >= eagle.logicalGraph().getNumNodes()){
            console.warn("Unable to print node fields table, node", nodeIndex, "does not exist.");
            return;
        }

        // add logical graph nodes to table
        for (const field of eagle.logicalGraph().getNodes()[nodeIndex].getFields()){
            tableData.push({
                "id":field.getId(),
                "displayText":field.getDisplayText(),
                "nodeKey":field.getNodeKey(),
                "type":field.getType(),
                "parameterType":field.getParameterType(),
                "usage":field.getUsage(),
                "isEvent":field.getIsEvent(),
                "value":field.getValue(),
                "defaultValue": field.getDefaultValue(),
                "readonly":field.isReadonly()
            });
        }

        console.table(tableData);
    }

    static copyInputTextModalInput = (): void => {
        navigator.clipboard.writeText($('#inputTextModalInput').val().toString());
    }

    static getReadOnlyText = () : string => {
        if (Eagle.selectedLocation() === Eagle.FileType.Graph || Eagle.selectedLocation() === Eagle.FileType.Unknown){
            return "Read Only - Turn on 'Expert Mode' and 'Allow Component Editing' in the settings to unlock"
        }

        // if a node or nodes in the palette are selected, then assume those are being moved to the destination
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            return "Read Only - Turn on 'Expert Mode' and 'Allow Palette Editing' in the settings to unlock"
        }

        return ''
    }

    static isTypeNode = (object : any) : boolean => {
        return (object instanceof Node);
    }

    static loadSchemas = () : void => {
        Utils.httpGet(Daliuge.GRAPH_SCHEMA_URL, (error : string, data : string) => {
            if (error !== null){
                console.error(error);
                return;
            }

            Utils.ojsGraphSchema = JSON.parse(data);

            // NOTE: we don't have a schema for the V3 or appRef versions
            Utils.v3GraphSchema = JSON.parse(data);
            Utils.appRefGraphSchema = JSON.parse(data);
        });
    }

    static snapToGrid = (coord: number, offset: number) : number => {
        const gridSize = Setting.findValue(Setting.SNAP_TO_GRID_SIZE);
        return (gridSize * Math.round((coord + offset)/gridSize)) - offset;
    }
    
    static enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
        return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
    }

    static createCommitJsonString = (jsonString: string, repository: Repository, token: string, fullFileName: string, commitMessage: string): string => {
        // NOTE: we need to build the JSON manually here, since we want to enforce a particular ordering of attributes within the jsonData attribute (modelData first)
        let result = "";

        result += "{\n";
        result += '"jsonData": ' + jsonString + ",";
        result += '"repositoryBranch": "' + repository.branch + '",';
        result += '"repositoryName": "' + repository.name + '",';
        result += '"repositoryService": "' + repository.service + '",';
        result += '"token": "' + token + '",';
        result += '"filename": "' + fullFileName + '",';
        result += '"commitMessage": "' + commitMessage + '"';
        result += "}\n";

        return result;
    }

    static openRemoteFileFromUrl(repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, callback: (error : string, data : string) => void ) : void {
        Utils.httpGet(fileName, callback);
    }
}
