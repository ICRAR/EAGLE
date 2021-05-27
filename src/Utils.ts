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

import {Config} from './Config';

import {Eagle} from './Eagle';
import {Palette} from './Palette';
import {LogicalGraph} from './LogicalGraph';
import {Node} from './Node';
import {Edge} from './Edge';
import {Port} from './Port';
import {Field} from './Field';
import {Repository} from './Repository';

export class Utils {
    // Allowed file extenstions.
    static readonly FILE_EXTENSIONS : string[] = [
        "json",
        "diagram",
        "graph",
        "palette"
    ];

    static readonly GITHUB_ACCESS_TOKEN_KEY: string = "GitHubAccessToken";
    static readonly GITLAB_ACCESS_TOKEN_KEY: string = "GitLabAccessToken";
    static readonly RIGHT_WINDOW_WIDTH_KEY : string = "RightWindowWidth";
    static readonly LEFT_WINDOW_WIDTH_KEY : string = "LeftWindowWidth";

    static readonly CONFIRM_DISCARD_CHANGES : string = "ConfirmDiscardChanges";
    static readonly CONFIRM_REMOVE_REPOSITORES : string = "ConfirmRemoveRepositories";
    static readonly CONFIRM_RELOAD_PALETTES : string = "ConfirmReloadPalettes";
    static readonly CONFIRM_DELETE_NODES : string = "ConfirmDeleteNodes";
    static readonly CONFIRM_DELETE_EDGES : string = "ConfirmDeleteEdges";

    static readonly SHOW_FILE_LOADING_ERRORS : string = "ShowFileLoadingErrors";

    static readonly ALLOW_INVALID_EDGES : string = "AllowInvalidEdges";
    static readonly ALLOW_COMPONENT_EDITING : string = "AllowComponentEditing";
    static readonly ALLOW_READONLY_PARAMETER_EDITING : string = "AllowReadonlyParameterEditing";
    static readonly ALLOW_EDGE_EDITING : string = "AllowEdgeEditing";

    static readonly ENABLE_PALETTE_EDITOR_MODE : string = "EnablePaletteEditorMode";

    static readonly TRANSLATOR_URL : string = "TranslatorURL";

    static readonly TRANSLATE_WITH_NEW_CATEGORIES: string = "TranslateWithNewCategories"; // temp fix for incompatibility with the DaLiuGE translator

    static readonly OPEN_DEFAULT_PALETTE: string = "OpenDefaultPalette";
    static readonly CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS: string = "CreateApplicationsForConstructPorts";
    static readonly DISABLE_JSON_VALIDATION: string = "DisableJsonValidation";

    static readonly DOCKER_HUB_USERNAME: string = "DockerHubUserName";
    static readonly SPAWN_TRANSLATION_TAB: string = "SpawnTranslationTab";

    static ojsGraphSchema : object = {};
    static ojsPaletteSchema : object = {};
    static v3GraphSchema : object = {};
    static appRefGraphSchema : object = {};

    /**
     * Generates a UUID.
     * See https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
     * NOTE: we use the (slightly) less random version that doesn't require the
     *       crypto.getRandomValues() call that is not available in NodeJS
     */

    static uuidv4() : string {
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
            //console.log("newKey, searching for ", i, "amongst", usedKeys.length, "keys");
            let found = false;

            for (let j = 0 ; j < usedKeys.length ; j++){
                // debug
                //console.log("findNewKey, checking key", j, "key is", usedKeys[j]);

                if (i === usedKeys[j]){
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

        for (let i = 0 ; i < nodes.length ; i++){
            usedKeys.push(nodes[i].getKey())

            // if this node has inputApp, add the inputApp key
            if (nodes[i].hasInputApplication()){
                usedKeys.push(nodes[i].getInputApplication().getKey());
            }

            // if this node has outputApp, add the outputApp key
            if (nodes[i].hasOutputApplication()){
                usedKeys.push(nodes[i].getOutputApplication().getKey());
            }

            // if this node has exitApp, add the exitApp key
            if (nodes[i].hasExitApplication()){
                usedKeys.push(nodes[i].getExitApplication().getKey());
            }
        }

        return usedKeys;
    }

    static getUsedKeysFromNodeData(nodeData : any[]) : number[] {
        // build a list of used keys
        const usedKeys: number[] = [];

        //console.log("nodeData.length", nodeData.length);
        for (let i = 0 ; i < nodeData.length ; i++){
            //console.log(i, nodeData[i].key);
            usedKeys.push(nodeData[i].key);
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
        for (let i = 0 ; i < nodes.length ; i++){
            usedKeys.push(nodes[i].getKey())

            // if this node has inputApp, add the inputApp key
            if (nodes[i].hasInputApplication()){
                if (nodes[i].getInputApplication().getKey() === null){
                    const newKey = Utils.findNewKey(usedKeys);
                    nodes[i].getInputApplication().setKey(newKey);
                    usedKeys.push(newKey);
                    console.warn("setEmbeddedApplicationNodeKeys(): set node", nodes[i].getKey(), "input app key", newKey);
                }
            }

            // if this node has outputApp, add the outputApp key
            if (nodes[i].hasOutputApplication()){
                if (nodes[i].getOutputApplication().getKey() === null){
                    const newKey = Utils.findNewKey(usedKeys);
                    nodes[i].getOutputApplication().setKey(newKey);
                    usedKeys.push(newKey);
                    console.warn("setEmbeddedApplicationNodeKeys(): set node", nodes[i].getKey(), "output app key", newKey);
                }
            }

            // if this node has exitApp, add the exitApp key
            if (nodes[i].hasExitApplication()){
                if (nodes[i].getExitApplication().getKey() === null){
                    const newKey = Utils.findNewKey(usedKeys);
                    nodes[i].getExitApplication().setKey(newKey);
                    usedKeys.push(newKey);
                    console.warn("setEmbeddedApplicationNodeKeys(): set node", nodes[i].getKey(), "exit app key", newKey);
                }
            }
        }
    }

    // extracts a file name from the full path.
    static getFileNameFromFullPath(fullPath : string) : string {
        if (typeof fullPath === 'undefined'){return "";}
        const fileName = fullPath.replace(/^.*[\\\/]/, '');
        return fileName;
    }

    // extracts a file path (not including the file name) from the full path.
    static getFilePathFromFullPath(fullPath : string) : string {
        if (typeof fullPath === 'undefined'){return "";}
        return fullPath.substring(0, fullPath.lastIndexOf('/'));
    }

    static getFileTypeFromFileName(fileName : string) : Eagle.FileType {
        return Utils.translateStringToFileType(Utils.getFileExtension(fileName));
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
        if (fileType === "graph")
            return Eagle.FileType.Graph;
        if (fileType === "palette")
            return Eagle.FileType.Palette;
        if (fileType === "json")
            return Eagle.FileType.JSON;

        //console.warn("Unknown file type (", fileType, ") can't be translated!");
        return Eagle.FileType.Unknown;
    }

    static translateFileTypeToString(fileType : Eagle.FileType) : string {
        if (fileType === Eagle.FileType.Graph)
            return "graph";
        if (fileType === Eagle.FileType.Palette)
            return "palette";
        if (fileType === Eagle.FileType.JSON)
            return "json";

        //console.warn("Unknown file type (", fileType, ") can't be translated!");
        return "";
    }

    static translateRightWindowModeToString(rightWindowMode: Eagle.RightWindowMode): string {
        switch(rightWindowMode){
            case Eagle.RightWindowMode.EdgeInspector:
                return "EdgeInspector";
            case Eagle.RightWindowMode.Hierarchy:
                return "Hierarchy";
            case Eagle.RightWindowMode.NodeInspector:
                return "NodeInspector";
            case Eagle.RightWindowMode.Repository:
                return "Repository";
            case Eagle.RightWindowMode.TranslationMenu:
                return "TranslationMenu";
            case Eagle.RightWindowMode.None:
                return "None";
            default:
                console.warn("Unknown rightWindowMode", rightWindowMode);
                return "";
        }
    }

    static translateStringToDataType(dataType: string): Eagle.DataType {
        if (dataType === "Boolean"){
            return Eagle.DataType.Boolean;
        }
        if (dataType === "Float"){
            return Eagle.DataType.Float;
        }
        if (dataType === "Integer"){
            return Eagle.DataType.Integer;
        }
        if (dataType === "String"){
            return Eagle.DataType.String;
        }
        if (dataType === "Complex"){
            return Eagle.DataType.Complex;
        }

        console.warn("Unknown DataType", dataType);
        return Eagle.DataType.Unknown;
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
        console.log("httpGetJSON() : ", url);
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
        console.log("httpPostJSON() : ", url);
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
                    callback(error, xhr.responseJSON.error);
                }
            }
        });
    }

    static httpPostForm(url : string, formData : FormData, callback : (error : string, data : string) => void) : void {
        console.log("httpPostForm() : ", url);

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
                //console.log("xhr", xhr, "status", status, "error", error);
                callback(error + " " + xhr.responseText, null);
            }
        });
    }

    /**
     * Returns true if the node parameter is an (Arg01...Arg10)-argument.
     */
    static isParameterArgument(parameterName : string) : boolean {
        // Regular expression for Arg01...Arg10 parameters.
        const re : RegExp = /Arg\d\d$/;
        return re.test(parameterName);
    }

    static showParameter(name : string, value: string) : boolean {
        if (Utils.isParameterArgument(name)){
            // return true if we find a '='
            return value.indexOf('=') !== -1;
        } else {
            return true;
        }
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

    static initModals(eagle : Eagle) : void {
        // #inputModal - requestUserInput()
        $('#inputModal .modal-footer button').on('click', function(){
            $('#inputModal').data('completed', true);
        });
        $('#inputModal').on('hidden.bs.modal', function(){
            const returnType = $('#inputModal').data('returnType');

            switch (returnType){
                case "string":
                    const stringCallback : (completed : boolean, userString : string) => void = $('#inputModal').data('callback');
                    stringCallback($('#inputModal').data('completed'), <string>$('#inputModalInput').val());
                    break;
                case "number":
                    const numberCallback : (completed : boolean, userNumber : number) => void = $('#inputModal').data('callback');
                    numberCallback($('#inputModal').data('completed'), parseInt(<string>$('#inputModalInput').val(), 10));
                    break;
                default:
                    console.error("Unknown return type for inputModal!");
            }
        });
        $('#inputModal').on('shown.bs.modal', function(){
            $('#inputModalInput').focus();
        });
        $('#inputModalInput').on('keypress', function(e){
            if (e.which === 13){
                $('#inputModal').data('completed', true);
                $('#inputModal').modal('hide');
            }
        });

        // #inputTextModal - requestUserText()
        $('#inputTextModal .modal-footer button').on('click', function(){
            $('#inputTextModal').data('completed', true);
        });
        $('#inputTextModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, userString : string) => void = $('#inputTextModal').data('callback');
            callback($('#inputTextModal').data('completed'), <string>$('#inputTextModalInput').val());
        });
        $('#inputTextModal').on('shown.bs.modal', function(){
            $('#inputTextModalInput').focus();
        });
        $('#inputTextModalInput').on('keypress', function(e){
            if (e.which === 13){
                $('#inputTextModal').data('completed', true);
                $('#inputTextModal').modal('hide');
            }
        });

        // #choiceModal - requestUserChoice()
        $('#choiceModal .modal-footer button').on('click', function(){
            $('#choiceModal').data('completed', true);
        });
        $('#choiceModal').on('shown.bs.modal', function(){
            $('#choiceModalAffirmativeButton').focus();
        });
        $('#choiceModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, userChoiceIndex : number, userCustomChoice : string) => void = $('#choiceModal').data('callback');
            const completed : boolean = $('#choiceModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, -1, "");
                return;
            }

            // check selected option in select tag
            const choices : string[] = $('#choiceModal').data('choices');
            const choice : number = parseInt(<string>$('#choiceModalSelect').val(), 10);

            // if the last item in the select was selected, then return the custom value,
            // otherwise return the selected choice
            if (choice === choices.length){
                callback(true, choices.length, <string>$('#choiceModalString').val());
            }
            else {
                callback(true, choice, choices[choice]);
            }
        });
        $('#choiceModalString').on('keypress', function(e){
            if (e.which === 13){
                $('#choiceModal').data('completed', true);
                $('#choiceModal').modal('hide');
            }
        });

        $('#choiceModalSelect').on('change', function(){
            // check selected option in select tag
            const choices : string[] = $('#choiceModal').data('choices');
            const choice : number = parseInt(<string>$('#choiceModalSelect').val(), 10);

            // hide the custom text input unless the last option in the select is chosen
            $('#choiceModalStringRow').toggle(choice === choices.length);
        })

        // #confirmModal - requestUserConfirm()
        $('#confirmModalAffirmativeButton').on('click', function(){
            const callback : (confirmed : boolean) => void = $('#confirmModal').data('callback');
            callback(true);
        });
        $('#confirmModalNegativeButton').on('click', function(){
            const callback : (confirmed : boolean) => void = $('#confirmModal').data('callback');
            callback(false);
        });
        $('#confirmModal').on('shown.bs.modal', function(){
            $('#confirmModalAffirmativeButton').focus();
        });

        // #gitCommitModal - requestUserGitCommit()
        $('#gitCommitModalAffirmativeButton').on('click', function(){
            $('#gitCommitModal').data('completed', true);
        });
        $('#gitCommitModalNegativeButton').on('click', function(){
            $('#gitCommitModal').data('completed', false);
        });
        $('#gitCommitModal').on('shown.bs.modal', function(){
            $('#gitCommitModalAffirmativeButton').focus();
        });
        $('#gitCommitModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) => void = $('#gitCommitModal').data('callback');
            const completed : boolean = $('#gitCommitModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, Eagle.RepositoryService.Unknown, "", "", "", "", "");
                return;
            }

            // check selected option in select tag
            const repositoryService : Eagle.RepositoryService = <Eagle.RepositoryService>$('#gitCommitModalRepositoryServiceSelect').val();
            const repositories : Repository[] = $('#gitCommitModal').data('repositories');
            const repositoryNameChoice : number = parseInt(<string>$('#gitCommitModalRepositoryNameSelect').val(), 10);

            // split repository text (with form: "name (branch)") into name and branch strings
            const repositoryName : string = repositories[repositoryNameChoice].name;
            const repositoryBranch : string = repositories[repositoryNameChoice].branch;

            const filePath : string = <string>$('#gitCommitModalFilePathInput').val();
            const fileName : string = <string>$('#gitCommitModalFileNameInput').val();
            const commitMessage : string = <string>$('#gitCommitModalCommitMessageInput').val();

            callback(true, repositoryService, repositoryName, repositoryBranch, filePath, fileName, commitMessage);
        });
        $('#gitCommitModalRepositoryServiceSelect').on('change', function(){
            const repositoryService : Eagle.RepositoryService = <Eagle.RepositoryService>$('#gitCommitModalRepositoryServiceSelect').val();
            const repositories: Repository[] = eagle.getRepositoryList(repositoryService);
            $('#gitCommitModal').data('repositories', repositories);
            Utils.updateGitCommitRepositoriesList(repositories, null);
        });

        // #gitCustomRepositoryModal - requestUserAddCustomRepository()
        $('#gitCustomRepositoryModalAffirmativeButton').on('click', function(){
            $('#gitCustomRepositoryModal').data('completed', true);
        });
        $('#gitCustomRepositoryModalNegativeButton').on('click', function(){
            $('#gitCustomRepositoryModal').data('completed', false);
        });
        $('#gitCustomRepositoryModal').on('shown.bs.modal', function(){
            $('#gitCustomRepositoryModalAffirmativeButton').focus();
        });
        $('#gitCustomRepositoryModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, repositoryService : string, repositoryName : string, repositoryBranch : string) => void = $('#gitCustomRepositoryModal').data('callback');
            const completed : boolean = $('#gitCustomRepositoryModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, "", "", "");
                return;
            }

            // check selected option in select tag
            const repositoryService : string = <string>$('#gitCustomRepositoryModalRepositoryServiceSelect').val();
            const repositoryName : string = <string>$('#gitCustomRepositoryModalRepositoryNameInput').val();
            const repositoryBranch : string = <string>$('#gitCustomRepositoryModalRepositoryBranchInput').val();

            callback(true, repositoryService, repositoryName, repositoryBranch);
        });

        // #settingsModal - showSettingsModal()
        $('#settingsModal').on('shown.bs.modal', function(){
            $('#settingsModalAffirmativeButton').focus();
        });

        // #editFieldModal - requestUserEditField()
        $('#editFieldModalAffirmativeButton').on('click', function(){
            $('#editFieldModal').data('completed', true);
        });
        $('#editFieldModalNegativeButton').on('click', function(){
            $('#editFieldModal').data('completed', false);
        });
        $('#editFieldModal').on('shown.bs.modal', function(){
            $('#editFieldModalAffirmativeButton').focus();
        });
        $('#fieldModalSelect').on('change', function(){
            // check selected option in select tag
            const choices : string[] = $('#editFieldModal').data('choices');
            const choice : number = parseInt(<string>$('#fieldModalSelect').val(), 10);

            // hide the custom text input unless the last option in the select is chosen
            if (choice === choices.length){
                $('#customParameterOptionsWrapper').slideDown();
            } else {
                $('#customParameterOptionsWrapper').slideUp();
            }
        });
        $('#editFieldModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, field: Field) => void = $('#editFieldModal').data('callback');
            const completed : boolean = $('#editFieldModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, null);
                return;
            }

            // extract field data from HTML elements
            const text : string = <string>$('#editFieldModalTextInput').val();
            const name : string = <string>$('#editFieldModalNameInput').val();
            const value : string = <string>$('#editFieldModalValueInput').val();
            const description: string = <string>$('#editFieldModalDescriptionInput').val();
            const access: string = <string>$('#editFieldModalAccessSelect').val();
            const type: string = <string>$('#editFieldModalTypeSelect').val();

            // translate access and type
            const readonly: boolean = access === 'readonly';
            const realType: Eagle.DataType = Utils.translateStringToDataType(type);

            const newField = new Field(text, name, value, description, readonly, realType);

            callback(true, newField);
        });

        $('#editFieldModal').on('show.bs.modal', Utils.validateFieldValue);
        $('#editFieldModalValueInput').on('keyup', Utils.validateFieldValue);
        $('#editFieldModalTypeSelect').on('change', Utils.validateFieldValue);

        // #editPortModal - requestUserEditPort()
        $('#editPortModalAffirmativeButton').on('click', function(){
            $('#editPortModal').data('completed', true);
        });
        $('#editPortModalNegativeButton').on('click', function(){
            $('#editPortModal').data('completed', false);
        });
        $('#editPortModal').on('shown.bs.modal', function(){
            $('#editPortModalAffirmativeButton').focus();
        });
        $('#portModalSelect').on('change', function(){
            // check selected option in select tag
            const choices : string[] = $('#editPortModal').data('choices');
            const choice : number = parseInt(<string>$('#portModalSelect').val(), 10);

            // hide the custom text input unless the last option in the select is chosen
            if (choice === choices.length){
                $('#customPortOptionsWrapper').slideDown();
            } else {
                $('#customPortOptionsWrapper').slideUp();
            }
        });
        $('#editPortModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, port: Port) => void = $('#editPortModal').data('callback');
            const completed : boolean = $('#editPortModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, null);
                return;
            }

            // extract field data from HTML elements
            // NOTE: the id of this temporary port will not be used by the receiver, so we use a dummy id
            const id = "dummy-id";
            const name : string = <string>$('#editPortModalNameInput').val();
            const type: string = <string>$('#editPortModalTypeSelect').val();

            // translate access and type
            const realType: Eagle.DataType = Utils.translateStringToDataType(type);

            const newPort = new Port(id, name, false, realType);

            callback(true, newPort);
        });

        // #editEdgeModal - requestUserEditEdge()
        $('#editEdgeModalAffirmativeButton').on('click', function(){
            $('#editEdgeModal').data('completed', true);
        });
        $('#editEdgeModalNegativeButton').on('click', function(){
            $('#editEdgeModal').data('completed', false);
        });
        $('#editEdgeModal').on('shown.bs.modal', function(){
            $('#editEdgeModalAffirmativeButton').focus();
        });
        $('#editEdgeModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, edge: Edge) => void = $('#editEdgeModal').data('callback');
            const completed : boolean = $('#editEdgeModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, null);
                return;
            }

            // extract field data from HTML elements
            const srcNodeKey : number = parseInt(<string>$('#editEdgeModalSrcNodeKeySelect').val(), 10);
            const srcPortId : string = <string>$('#editEdgeModalSrcPortIdSelect').val();
            const destNodeKey : number = parseInt(<string>$('#editEdgeModalDestNodeKeySelect').val(), 10);
            const destPortId: string = <string>$('#editEdgeModalDestPortIdSelect').val();
            const dataType: string = <string>$('#editEdgeModalDataTypeInput').val();
            //console.log("srcNodeKey", srcNodeKey, "srcPortId", srcPortId, "destNodeKey", destNodeKey, "destPortId", destPortId, "dataType", dataType);

            const newEdge = new Edge(srcNodeKey, srcPortId, destNodeKey, destPortId, dataType);

            callback(true, newEdge);
        });
        $('#editEdgeModalSrcNodeKeySelect').on('change', function(){
            const edge: Edge = $('#editEdgeModal').data('edge');
            const logicalGraph: LogicalGraph = $('#editEdgeModal').data('logicalGraph');

            const srcNodeKey : number = parseInt(<string>$('#editEdgeModalSrcNodeKeySelect').val(), 10);
            edge.setSrcNodeKey(srcNodeKey);

            Utils.updateEditEdgeModal(edge, logicalGraph);
        });
        $('#editEdgeModalDestNodeKeySelect').on('change', function(){
            const edge: Edge = $('#editEdgeModal').data('edge');
            const logicalGraph: LogicalGraph = $('#editEdgeModal').data('logicalGraph');

            const destNodeKey : number = parseInt(<string>$('#editEdgeModalDestNodeKeySelect').val(), 10);
            edge.setDestNodeKey(destNodeKey);

            Utils.updateEditEdgeModal(edge, logicalGraph);
        });

        // #messageModal - showUserMessage()
        $('#messageModal').on('shown.bs.modal', function(){
            $('#messageModal .modal-footer button').focus();
        });
    }

    static showUserMessage (title : string, message : string) : void {
        console.log("showUserMessage()", title, message);

        $('#messageModalTitle').text(title);
        $('#messageModalMessage').html(message);
        $('#messageModal').modal();

        // debug
        if (title === "Error"){
            Utils.addToHTMLElementLog(title + ":" + message);
        }
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
        console.log("requestUserString()", title, message);

        $('#inputModalTitle').text(title);
        $('#inputModalMessage').html(message);
        $('#inputModalInput').attr('type', isPassword ? 'password' : 'text');

        $('#inputModalInput').val(defaultString);

        // store data about the choices, callback, result on the modal HTML element
        // so that the info is available to event handlers
        $('#inputModal').data('completed', false);
        $('#inputModal').data('callback', callback);
        $('#inputModal').data('returnType', "string");

        $('#inputModal').modal();
    }

    static requestUserText(title : string, message : string, defaultText: string, callback : (completed : boolean, userText : string) => void) : void {
        console.log("requestUserText()", title, message);

        $('#inputTextModalTitle').text(title);
        $('#inputTextModalMessage').html(message);

        $('#inputTextModalInput').val(defaultText);

        // store the callback, result on the modal HTML element
        // so that the info is available to event handlers
        $('#inputTextModal').data('completed', false);
        $('#inputTextModal').data('callback', callback);

        $('#inputTextModal').modal();
    }

    static requestUserNumber(title : string, message : string, defaultNumber: number, callback : (completed : boolean, userNumber : number) => void ) : void {
        console.log("requestUserNumber()", title, message);

        $('#inputModalTitle').text(title);
        $('#inputModalMessage').html(message);
        $('#inputModalInput').val(defaultNumber);

        // store data about the choices, callback, result on the modal HTML element
        // so that the info is available to event handlers
        $('#inputModal').data('completed', false);
        $('#inputModal').data('callback', callback);
        $('#inputModal').data('returnType', "number");

        $('#inputModal').modal();
    }

    static requestUserChoice(title : string, message : string, choices : string[], selectedChoiceIndex : number, allowCustomChoice : boolean, customChoiceText : string, callback : (completed : boolean, userChoiceIndex : number, userCustomString : string) => void ) : void {
        console.log("requestUserChoice()", title, message, choices, selectedChoiceIndex, allowCustomChoice, customChoiceText);

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

        $('#choiceModal').modal();
    }

    static requestUserConfirm(title : string, message : string, affirmativeAnswer : string, negativeAnswer : string, callback : (confirmed : boolean) => void ) : void {
        console.log("requestUserConfirm()", title, message, affirmativeAnswer, negativeAnswer);

        $('#confirmModalTitle').text(title);
        $('#confirmModalMessage').html(message);
        $('#confirmModalAffirmativeAnswer').text(affirmativeAnswer);
        $('#confirmModalNegativeAnswer').text(negativeAnswer);

        $('#confirmModal').data('callback', callback);

        $('#confirmModal').modal();
    }

    static requestUserGitCommit(defaultRepository : Repository, repositories: Repository[], filePath: string, fileName: string, callback : (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) => void ) : void {
        console.log("requestUserGitCommit()");

        $('#gitCommitModal').data('completed', false);
        $('#gitCommitModal').data('callback', callback);
        $('#gitCommitModal').data('repositories', repositories);
        $('#gitCommitModal').modal();

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

        // pre-selected the currently selected index
        //$('#gitCommitModalRepositorySelect').val(selectedChoiceIndex);

        $('#gitCommitModalFilePathInput').val(filePath);
        $('#gitCommitModalFileNameInput').val(fileName);
    }

    static requestUserEditField(modalType: Eagle.ModalType, field: Field, choices: string[], callback: (completed: boolean, field: Field) => void) : void {
        console.log("requestUserEditField()");

        if (modalType === Eagle.ModalType.Add){
            // remove existing options from the select tag
            $('#fieldModalSelect').empty();

            // add empty choice
            $('#fieldModalSelect').append($('<option>', {
                value: -1,
                text: ""
            }));

            // add options to the modal select tag
            for (let i = 0 ; i < choices.length ; i++){
                $('#fieldModalSelect').append($('<option>', {
                    value: i,
                    text: choices[i]
                }));
            }

            // add custom choice
            $('#fieldModalSelect').append($('<option>', {
                value: choices.length,
                text: "Custom (enter below)"
            }));
        }
        // populate UI with current field data
        $('#editFieldModalTextInput').val(field.getText());
        $('#editFieldModalNameInput').val(field.getName());
        $('#editFieldModalValueInput').val(field.getValue());
        $('#editFieldModalDescriptionInput').val(field.getDescription());
        $('#editFieldModalAccessSelect').empty();

        // add options to the access select tag
        $('#editFieldModalAccessSelect').append($('<option>', {
            value: "readonly",
            text: "readonly",
            selected: field.isReadonly()
        }));
        $('#editFieldModalAccessSelect').append($('<option>', {
            value: "readwrite",
            text: "readwrite",
            selected: !field.isReadonly()
        }));

        $('#editFieldModalTypeSelect').empty();
        // TODO: we should iterate through the values in the Eagle.DataType enum, rather than hard-code each type
        $('#editFieldModalTypeSelect').append($('<option>', {
            value: "Integer",
            text: "Integer",
            selected: field.getType() === Eagle.DataType.Integer
        }));
        $('#editFieldModalTypeSelect').append($('<option>', {
            value: "Float",
            text: "Float",
            selected: field.getType() === Eagle.DataType.Float
        }));
        $('#editFieldModalTypeSelect').append($('<option>', {
            value: "String",
            text: "String",
            selected: field.getType() === Eagle.DataType.String
        }));
        $('#editFieldModalTypeSelect').append($('<option>', {
            value: "Boolean",
            text: "Boolean",
            selected: field.getType() === Eagle.DataType.Boolean
        }));
        $('#editFieldModalTypeSelect').append($('<option>', {
            value: "Complex",
            text: "Complex",
            selected: field.getType() === Eagle.DataType.Complex
        }));
        $('#editFieldModalTypeSelect').append($('<option>', {
            value: "Unknown",
            text: "Unknown",
            selected: field.getType() === Eagle.DataType.Unknown
        }));

        $('#editFieldModal').data('completed', false);
        $('#editFieldModal').data('callback', callback);
        $('#editFieldModal').data('choices', choices);
        $('#editFieldModal').modal();
    }

    static requestUserEditPort(modalType: Eagle.ModalType, port: Port, choices: string[], callback: (completed: boolean, port: Port) => void) : void {
        if (modalType === Eagle.ModalType.Add){
            // remove existing options from the select tag
            $('#portModalSelect').empty();

            // add empty choice
            $('#portModalSelect').append($('<option>', {
                value: -1,
                text: ""
            }));

            // add options to the modal select tag
            for (let i = 0 ; i < choices.length ; i++){
                $('#portModalSelect').append($('<option>', {
                    value: i,
                    text: choices[i]
                }));
            }

            // add custom choice
            $('#portModalSelect').append($('<option>', {
                value: choices.length,
                text: "Custom (enter below)"
            }));
        }

        // populate UI with current port data
        $('#editPortModalNameInput').val(port.getName());

        $('#editPortModalTypeSelect').empty();
        // TODO: we should iterate through the values in the Eagle.DataType enum, rather than hard-code each type
        $('#editPortModalTypeSelect').append($('<option>', {
            value: "Integer",
            text: "Integer",
            selected: port.getType() === Eagle.DataType.Integer
        }));
        $('#editPortModalTypeSelect').append($('<option>', {
            value: "Float",
            text: "Float",
            selected: port.getType() === Eagle.DataType.Float
        }));
        $('#editPortModalTypeSelect').append($('<option>', {
            value: "String",
            text: "String",
            selected: port.getType() === Eagle.DataType.String
        }));
        $('#editPortModalTypeSelect').append($('<option>', {
            value: "Boolean",
            text: "Boolean",
            selected: port.getType() === Eagle.DataType.Boolean
        }));
        $('#editPortModalTypeSelect').append($('<option>', {
            value: "Complex",
            text: "Complex",
            selected: port.getType() === Eagle.DataType.Complex
        }));
        $('#editPortModalTypeSelect').append($('<option>', {
            value: "Unknown",
            text: "Unknown",
            selected: port.getType() === Eagle.DataType.Unknown
        }));

        $('#editPortModal').data('completed', false);
        $('#editPortModal').data('callback', callback);
        $('#editPortModal').data('choices', choices);
        $('#editPortModal').modal();
    }

    static requestUserAddCustomRepository(callback : (completed : boolean, repositoryService : string, repositoryName : string, repositoryBranch : string) => void) : void {
        console.log("requestUserAddCustomRepository()");

        $('#gitCustomRepositoryModalRepositoryNameInput').val("");
        $('#gitCustomRepositoryModalRepositoryBranchInput').val("");

        $('#gitCustomRepositoryModal').data('completed', false);
        $('#gitCustomRepositoryModal').data('callback', callback);
        $('#gitCustomRepositoryModal').modal();
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
        $('#settingsModal').modal();
    }

    static requestUserEditEdge(edge: Edge, logicalGraph: LogicalGraph, callback: (completed: boolean, edge: Edge) => void) : void {
        //console.log("requestUserEditEdge()");

        Utils.updateEditEdgeModal(edge, logicalGraph);

        $('#editEdgeModal').data('completed', false);
        $('#editEdgeModal').data('callback', callback);

        $('#editEdgeModal').data('edge', edge);
        $('#editEdgeModal').data('logicalGraph', logicalGraph);

        $('#editEdgeModal').modal();
    }

    static updateEditEdgeModal(edge: Edge, logicalGraph: LogicalGraph): void {
        let srcNode: Node = null;
        let destNode: Node = null;

        // TODO: make local copy of edge, so that original is not changed! original might come from inside the active graph

        // populate UI with current edge data
        // add src node keys
        $('#editEdgeModalSrcNodeKeySelect').empty();
        for (let i = 0 ; i < logicalGraph.getNodes().length; i++){
            let node = logicalGraph.getNodes()[i];

            // if node itself can have output ports, add the node to the list
            if (node.canHaveOutputs()){
                //console.log("add node", node.getKey(), "selected", edge.getSrcNodeKey() === node.getKey());
                $('#editEdgeModalSrcNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getSrcNodeKey() === node.getKey()
                }));

                if (node.getKey() === edge.getSrcNodeKey()){
                    srcNode = node;
                }
            }

            // add input application node, if present
            if (node.hasInputApplication()){
                node = node.getInputApplication();

                //console.log("add input app node", node.getKey(), "selected", edge.getSrcNodeKey() === node.getKey());
                $('#editEdgeModalSrcNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getSrcNodeKey() === node.getKey()
                }));

                if (node.getKey() === edge.getSrcNodeKey()){
                    srcNode = node;
                }
            }

            // add output application node, if present
            if (node.hasOutputApplication()){
                node = node.getOutputApplication();

                //console.log("add output app node", node.getKey(), "selected", edge.getSrcNodeKey() === node.getKey());
                $('#editEdgeModalSrcNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getSrcNodeKey() === node.getKey()
                }));

                if (node.getKey() === edge.getSrcNodeKey()){
                    srcNode = node;
                }
            }

            // add exit applicaiton node, if present
            if (node.hasExitApplication()){
                node = node.getExitApplication();

                //console.log("add exit app node", node.getKey(), "selected", edge.getSrcNodeKey() === node.getKey());
                $('#editEdgeModalSrcNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getSrcNodeKey() === node.getKey()
                }));

                if (node.getKey() === edge.getSrcNodeKey()){
                    srcNode = node;
                }
            }
        }

        // make sure srcNode reflects what is actually selected in the UI
        const srcNodeKey : number = parseInt(<string>$('#editEdgeModalSrcNodeKeySelect').val(), 10);
        //console.log("srcNodeKey", srcNodeKey);
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
            for (let i = 0 ; i < srcNode.getOutputPorts().length; i++){
                const port: Port = srcNode.getOutputPorts()[i];
                //console.log("add source (" + srcNode.getName() + ") output port", port.getName(), "selected", edge.getSrcPortId() === port.getId());
                $('#editEdgeModalSrcPortIdSelect').append($('<option>', {
                    value: port.getId(),
                    text: port.getName(),
                    selected: edge.getSrcPortId() === port.getId()
                }));
            }
        }

        // add dest node keys
        $('#editEdgeModalDestNodeKeySelect').empty();
        for (let i = 0 ; i < logicalGraph.getNodes().length; i++){
            let node = logicalGraph.getNodes()[i];

            if (node.canHaveInputs()){
                //console.log("add node", node.getKey(), "selected", edge.getDestNodeKey() === node.getKey());
                $('#editEdgeModalDestNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getDestNodeKey() === node.getKey()
                }));

                if (node.getKey() === edge.getDestNodeKey()){
                    destNode = node;
                }
            }

            // input application node, if present
            if (node.hasInputApplication()){
                node = node.getInputApplication();

                //console.log("add input app node", node.getKey(), "selected", edge.getDestNodeKey() === node.getKey());
                $('#editEdgeModalDestNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getDestNodeKey() === node.getKey()
                }));

                if (node.getKey() === edge.getDestNodeKey()){
                    destNode = node;
                }
            }

            // output application node, if present
            if (node.hasOutputApplication()){
                node = node.getOutputApplication();

                //console.log("add output app node", node.getKey(), "selected", edge.getDestNodeKey() === node.getKey());
                $('#editEdgeModalDestNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getDestNodeKey() === node.getKey()
                }));

                if (node.getKey() === edge.getDestNodeKey()){
                    destNode = node;
                }
            }

            // exit application node, if present
            if (node.hasExitApplication()){
                node = node.getExitApplication();

                //console.log("add exit app node", node.getKey(), "selected", edge.getDestNodeKey() === node.getKey());
                $('#editEdgeModalDestNodeKeySelect').append($('<option>', {
                    value: node.getKey(),
                    text: node.getName(),
                    selected: edge.getDestNodeKey() === node.getKey()
                }));

                if (node.getKey() === edge.getDestNodeKey()){
                    destNode = node;
                }
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
            for (let i = 0 ; i < destNode.getInputPorts().length; i++){
                const port: Port = destNode.getInputPorts()[i];
                //console.log("add dest (" + destNode.getName() + ") input port", port.getName(), "selected", edge.getDestPortId() === port.getId());
                $('#editEdgeModalDestPortIdSelect').append($('<option>', {
                    value: port.getId(),
                    text: port.getName(),
                    selected: edge.getDestPortId() === port.getId()
                }));
            }
        }

        $('#editEdgeModalDataTypeInput').val(edge.getDataType());
    }

    /**
     * Returns a list of unique port names (except event ports)
     */
    static getAllPorts = (diagram : Palette | LogicalGraph) : Port[] => {
        const allPorts : Port[] = [];

        // build a list from all nodes
        for (let i = 0; i < diagram.getNodes().length; i++) {
            const node : Node = diagram.getNodes()[i];

            // add input port names into the list
            for (let j = 0; j < node.getInputPorts().length; j++) {
                const port : Port = node.getInputPorts()[j];
                if (!port.isEvent()){
                    allPorts.push(port);
                }
            }

            // add output port names into the list
            for (let j = 0; j < node.getOutputPorts().length; j++) {
                const port : Port = node.getOutputPorts()[j];
                if (!port.isEvent()) {
                    allPorts.push(port);
                }
            }

            // add input application input and output ports
            if (node.hasInputApplication()){
                // input ports
                for (let j = 0; j < node.getInputApplication().getInputPorts().length; j++) {
                    const port : Port = node.getInputApplication().getInputPorts()[j];
                    if (!port.isEvent()) {
                        allPorts.push(port);
                    }
                }

                // output ports
                for (let j = 0; j < node.getInputApplication().getOutputPorts().length; j++) {
                    const port : Port = node.getInputApplication().getOutputPorts()[j];
                    if (!port.isEvent()) {
                        allPorts.push(port);
                    }
                }
            }

            // add output application input and output ports
            if (node.hasOutputApplication()){
                // input ports
                for (let j = 0; j < node.getOutputApplication().getInputPorts().length; j++) {
                    const port : Port = node.getOutputApplication().getInputPorts()[j];
                    if (!port.isEvent()) {
                        allPorts.push(port);
                    }
                }

                // output ports
                for (let j = 0; j < node.getOutputApplication().getOutputPorts().length; j++) {
                    const port : Port = node.getOutputApplication().getOutputPorts()[j];
                    if (!port.isEvent()) {
                        allPorts.push(port);
                    }
                }
            }

            // add exit application input and output ports
            if (node.hasExitApplication()){
                // input ports
                for (let j = 0; j < node.getExitApplication().getInputPorts().length; j++) {
                    const port : Port = node.getExitApplication().getInputPorts()[j];
                    if (!port.isEvent()) {
                        allPorts.push(port);
                    }
                }

                // output ports
                for (let j = 0; j < node.getExitApplication().getOutputPorts().length; j++) {
                    const port : Port = node.getExitApplication().getOutputPorts()[j];
                    if (!port.isEvent()) {
                        allPorts.push(port);
                    }
                }
            }
        }

        return allPorts;
    }

    /**
     * Returns a list of all fields in the given palette or logical graph
     */
    static getAllFields = (diagram : Palette | LogicalGraph) : Field[] => {
        const allFields : Field[] = [];

        // build a list from all nodes
        for (let i = 0; i < diagram.getNodes().length; i++) {
            const node : Node = diagram.getNodes()[i];

            // add fields into the list
            for (let j = 0; j < node.getFields().length; j++) {
                const field : Field = node.getFields()[j];
                allFields.push(field.clone());
            }
        }

        return allFields;
    }

    static isKnownCategory(category : string) : boolean {
        return typeof Eagle.cData[category] !== 'undefined';
    }

    static getColorForNode(category : Eagle.Category) : string {
        return Eagle.getCategoryData(category).color;
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

            const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.createElement("canvas");
            //console.log("svgElement", svgElement.clientWidth.toString(), svgElement.clientHeight.toString());
            canvas.setAttribute("width", svgElement.clientWidth.toString());
            canvas.setAttribute("height", svgElement.clientHeight.toString());
            const ctx = canvas.getContext("2d");

            const img = new Image();
            const svg = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
            const url = window.URL.createObjectURL(svg);
            img.onload = function() {
                ctx.drawImage(img, 0, 0);
                const png = canvas.toDataURL("image/png");
                //document.querySelector('#png-container').innerHTML = '<img src="'+png+'"/>';

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
        // try localStorage first
        const local : string = localStorage.getItem(this.RIGHT_WINDOW_WIDTH_KEY);

        // if found, return
        if (local !== null){
            return parseInt(local, 10);
        } else {
            return Config.defaultRightWindowWidth;
        }
    }

    static setRightWindowWidth(width : number) : void {
        localStorage.setItem(this.RIGHT_WINDOW_WIDTH_KEY, width.toString());
    }

    static getLeftWindowWidth() : number {
        // try localStorage first
        const local : string = localStorage.getItem(this.LEFT_WINDOW_WIDTH_KEY);

        // if found, return
        if (local !== null){
            return parseInt(local, 10);
        } else {
            return Config.defaultLeftWindowWidth;
        }
    }

    static setLeftWindowWidth(width : number) : void {
        localStorage.setItem(this.LEFT_WINDOW_WIDTH_KEY, width.toString());
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

    static buildNodeList(palette : Palette, categoryType : Eagle.CategoryType) : Node[] {
        const result : Node[] = [];

        // Searching for the node.
        for (let i = 0; i < palette.getNodes().length; i++) {
            const node : Node = palette.getNodes()[i];
            if (node.getCategoryType() === categoryType) {
                result.push(node);
            }
        }

        return result;
    }

    static buildCategoryList (palette : Palette, categoryType : Eagle.CategoryType) : Eagle.Category[] {
        const result : Eagle.Category[] = [];

        // Searching for the node.
        for (let i = 0; i < palette.getNodes().length; i++) {
            const node : Node = palette.getNodes()[i];
            if (node.getCategoryType() === categoryType) {
                result.push(node.getCategory());
            }
        }

        // debug until PythonApp is used everywhere
        if (categoryType === Eagle.CategoryType.Application){
            result.push(Eagle.Category.Component);
        }

        return result;
    }

    // check if a node already exists in a palette, if so replace the node with the new one
    // otherwise, add the node to the end of the palette
    static addOrUpdateNodeInPalette(palette: Palette, node: Node) : void {
        // try to find a matching node that already exists in the palette
        // TODO: at the moment, we only match by name and category, but we should match by ID (once the ID is unique)
        for (let i = 0 ; i < palette.getNodes().length; i++){
            const paletteNode = palette.getNodes()[i];

            if (paletteNode.getName() === node.getName() && paletteNode.getCategory() === node.getCategory()){
                palette.getNodes()[i] = node;
                //console.log("Replace node", node.getName(), "in destination palette", palette.fileInfo().name);
                return;
            }
        }

        //console.log("Copy node", node.getName(), "to destination palette", palette.fileInfo().name, "now contains", palette.getNodes().length);
        palette.addNode(node);
    }

    static giveNodePortsNewIds(node: Node) : void {
        // set new ids for any ports in this node
        for (let i = 0 ; i < node.getInputPorts().length ; i++){
            node.getInputPorts()[i].setId(Utils.uuidv4());
        }
        for (let i = 0 ; i < node.getOutputPorts().length ; i++){
            node.getOutputPorts()[i].setId(Utils.uuidv4());
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

    static determineSchemaVersion(data: any): Eagle.DALiuGESchemaVersion {
        // v3
        if (typeof data.DALiuGEGraph !== 'undefined'){
            if (typeof data.DALiuGEGraph.schemaVersion !== 'undefined'){
                return Eagle.DALiuGESchemaVersion.V3;
            }
        }

        // appref
        if (typeof data.modelData !== 'undefined'){
            if (typeof data.modelData.schemaVersion !== 'undefined'){
                if (data.modelData.schemaVersion === Eagle.DALiuGESchemaVersion.AppRef){
                    return Eagle.DALiuGESchemaVersion.AppRef;
                }
                if (data.modelData.schemaVersion === Eagle.DALiuGESchemaVersion.OJS){
                    return Eagle.DALiuGESchemaVersion.OJS;
                }
            }
        }

        return Eagle.DALiuGESchemaVersion.Unknown;
    }

    static checkGraph(graph: LogicalGraph): string[] {
        const results: string[] = [];

        // check that all port dataTypes have been defined
        for (let i = 0 ; i < graph.getNodes().length; i++){
            const node: Node = graph.getNodes()[i];

            for (let j = 0 ; j < node.getInputPorts().length ; j++){
                const port: Port = node.getInputPorts()[j];

                if (port.getType() === Eagle.DataType.Unknown){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has input port " + port.getName() + " with dataType: " + port.getType());
                }
            }
            for (let j = 0 ; j < node.getOutputPorts().length ; j++){
                const port: Port = node.getOutputPorts()[j];

                if (port.getType() === Eagle.DataType.Unknown){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has output port " + port.getName() + " with dataType: " + port.getType());
                }
            }
        }

        // check that all nodes have correct numbers of inputs and outputs
        for (let i = 0 ; i < graph.getNodes().length; i++){
            const node: Node = graph.getNodes()[i];
            const cData: Eagle.CategoryData = Eagle.getCategoryData(node.getCategory());
            const minInputs  = cData.minInputs;
            const maxInputs  = cData.maxInputs;
            const minOutputs = cData.minOutputs;
            const maxOutputs = cData.maxOutputs;

            if (node.getInputPorts().length < minInputs){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has too few input ports. Should have " + minInputs);
            }
            if (node.getInputPorts().length > maxInputs){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has too many input ports. Should have " + maxInputs);
            }
            if (node.getOutputPorts().length < minOutputs){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has too few output ports. Should have " + minOutputs);
            }
            if (node.getOutputPorts().length > maxOutputs){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has too many output ports. Should have " + maxOutputs);
            }
        }

        for (let i = 0 ; i < graph.getEdges().length; i++){
            const edge: Edge = graph.getEdges()[i];
            const linkValid : Eagle.LinkValid = Edge.isValid(graph, edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), false, false);

            if (linkValid === Eagle.LinkValid.Invalid){
                results.push("Edge " + i + " (" + edge.getId() + ") is invalid.");
            }
        }

        return results;
    }

    static validateJSON(json : object, version : Eagle.DALiuGESchemaVersion, fileType : Eagle.FileType) : {valid: boolean, errors: string} {
        console.log("validateJSON(): version:", version, "fileType:", Utils.translateFileTypeToString(fileType));

        const ajv = new Ajv();
        let valid : boolean;

        switch(version){
            case Eagle.DALiuGESchemaVersion.OJS:
                switch(fileType){
                    case Eagle.FileType.Graph:
                        valid = ajv.validate(Utils.ojsGraphSchema, json) as boolean;
                        break;
                    case Eagle.FileType.Palette:
                        valid = ajv.validate(Utils.ojsPaletteSchema, json) as boolean;
                        break;
                    default:
                        console.log("Unknown fileType:", fileType, "version:", version, "Unable to validate JSON");
                        valid = true;
                        break;
                }
                break;
            case Eagle.DALiuGESchemaVersion.V3:
                switch(fileType){
                    case Eagle.FileType.Graph:
                        valid = ajv.validate(Utils.v3GraphSchema, json) as boolean;
                        break;
                    default:
                        console.log("Unknown fileType:", fileType, "version:", version, "Unable to validate JSON");
                        valid = true;
                        break;
                }
                break;
            case Eagle.DALiuGESchemaVersion.AppRef:
                switch(fileType){
                    case Eagle.FileType.Graph:
                        // TODO: enable validation once a schema is ready
                        //valid = ajv.validate(Utils.appRefGraphSchema, json) as boolean;
                        console.warn("No AppRef schema, abort validation.");
                        valid = true;
                        break;
                    default:
                        console.log("Unknown fileType:", fileType, "version:", version, "Unable to validate JSON");
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

    static validateFieldValue() : void {
        const value : string = <string>$('#editFieldModalValueInput').val();
        const type: string = <string>$('#editFieldModalTypeSelect').val();
        const realType: Eagle.DataType = Utils.translateStringToDataType(type);

        let isValid: boolean = true;

        switch (realType){
            case Eagle.DataType.Boolean:
                isValid = value.toLowerCase() === "true" || value.toLowerCase() === "false";
                break;
            case Eagle.DataType.Float:
                isValid = value.match(/^-?\d*(\.\d+)?$/) && !isNaN(parseFloat(value));
                break;
            case Eagle.DataType.Integer:
                isValid = value.match(/^-?\d*$/) && true;
                break;
            default:
                isValid = true;
        }

        if (isValid){
            $('#editFieldModalValueInput').addClass('is-valid');
            $('#editFieldModalValueInput').removeClass('is-invalid');
            $('#editFieldModalValueFeedback').text('');
        } else {
            $('#editFieldModalValueInput').removeClass('is-valid');
            $('#editFieldModalValueInput').addClass('is-invalid');
            $('#editFieldModalValueFeedback').text('Invalid value for ' + type + ' type.');
        }
    }
}
