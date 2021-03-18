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

    static readonly ENABLE_PALETTE_EDITOR_MODE : string = "EnablePaletteEditorMode";

    static readonly TRANSLATOR_URL : string = "TranslatorURL";

    static readonly TRANSLATE_WITH_NEW_CATEGORIES: string = "TranslateWithNewCategories"; // temp fix for incompatibility with the DaLiuGE translator

    static readonly OPEN_DEFAULT_PALETTE: string = "OpenDefaultPalette";
    static readonly CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS: string = "CreateApplicationsForConstructPorts";
    static readonly DISABLE_JSON_VALIDATION: string = "DisableJsonValidation";

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
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
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
        let now = new Date();

        // NOTE: JavaScript months are 0-based
        return now.getFullYear() + "-" + Utils.padStart(now.getMonth() + 1, 2) + "-" + Utils.padStart(now.getDate(), 2) + "-" + Utils.padStart(now.getHours(), 2) + "-" + Utils.padStart(now.getMinutes(), 2) + "-" + Utils.padStart(now.getSeconds(), 2);
    }

    static findNewKey(usedKeys : number[]): number {
        for (var i = -1 ; ; i--){
            //console.log("newKey, searching for ", i, "amongst", usedKeys.length, "keys");
            let found = false;

            for (var j = 0 ; j < usedKeys.length ; j++){
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
        let usedKeys: number[] = [];

        for (var i = 0 ; i < nodes.length ; i++){
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

    static newKey(nodes: Node[]): number {
        let usedKeys = Utils.getUsedKeys(nodes);
        return Utils.findNewKey(usedKeys);
    }

    static setEmbeddedApplicationNodeKeys(lg: LogicalGraph): void {
        let nodes: Node[] = lg.getNodes();
        let usedKeys: number[] = Utils.getUsedKeys(nodes);

        // loop through nodes, look for embedded nodes with null key, create new key, add to usedKeys
        for (var i = 0 ; i < nodes.length ; i++){
            usedKeys.push(nodes[i].getKey())

            // if this node has inputApp, add the inputApp key
            if (nodes[i].hasInputApplication()){
                if (nodes[i].getInputApplication().getKey() === null){
                    let newKey = Utils.findNewKey(usedKeys);
                    nodes[i].getInputApplication().setKey(newKey);
                    usedKeys.push(newKey);
                    console.warn("setEmbeddedApplicationNodeKeys(): set node", nodes[i].getKey(), "input app key", newKey);
                }
            }

            // if this node has outputApp, add the outputApp key
            if (nodes[i].hasOutputApplication()){
                if (nodes[i].getOutputApplication().getKey() === null){
                    let newKey = Utils.findNewKey(usedKeys);
                    nodes[i].getOutputApplication().setKey(newKey);
                    usedKeys.push(newKey);
                    console.warn("setEmbeddedApplicationNodeKeys(): set node", nodes[i].getKey(), "output app key", newKey);
                }
            }

            // if this node has exitApp, add the exitApp key
            if (nodes[i].hasExitApplication()){
                if (nodes[i].getExitApplication().getKey() === null){
                    let newKey = Utils.findNewKey(usedKeys);
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
        var fileName = fullPath.replace(/^.*[\\\/]/, '');
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
        var basename = path.split(/[\\/]/).pop(),  // extract file name from full path ...
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
        var fileExtension = Utils.getFileExtension(filename);

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
        if (fileType === "templatePalette")
            return Eagle.FileType.TemplatePalette;
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
        if (fileType === Eagle.FileType.TemplatePalette)
            return "templatePalette";
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

        console.warn("Unknown DataType", dataType);
        return Eagle.DataType.Unknown;
    }

    static httpGet(url : string, callback : (error : string, data : string) => void){
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

    static httpGetJSON(url : string, json : object, callback : (error : string, data : string) => void){
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

    static httpPost(url : string, data : string, callback : (error : string | null, data : string) => void){
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

    static httpPostJSON(url : string, json : object, callback : (error : string, data : string) => void){
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

    static httpPostForm(url : string, formData : FormData, callback : (error : string, data : string) => void){
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
        var re : RegExp = /Arg\d\d$/;
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
        var fullFileName : string = fileName;

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
            var returnType = $('#inputModal').data('returnType');

            switch (returnType){
                case "string":
                    var stringCallback : (completed : boolean, userString : string) => void = $('#inputModal').data('callback');
                    stringCallback($('#inputModal').data('completed'), <string>$('#inputModalInput').val());
                    break;
                case "number":
                    var numberCallback : (completed : boolean, userNumber : number) => void = $('#inputModal').data('callback');
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

        // #choiceModal - requestUserChoice()
        $('#choiceModal .modal-footer button').on('click', function(){
            $('#choiceModal').data('completed', true);
        });
        $('#choiceModal').on('shown.bs.modal', function(){
            $('#choiceModalAffirmativeButton').focus();
        });
        $('#choiceModal').on('hidden.bs.modal', function(){
            var callback : (completed : boolean, userString : string) => void = $('#choiceModal').data('callback');
            var completed : boolean = $('#choiceModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, "");
                return;
            }

            // check selected option in select tag
            var choices : string[] = $('#choiceModal').data('choices');
            var choice : number = parseInt(<string>$('#choiceModalSelect').val(), 10);

            // if the last item in the select was selected, then return the custom value,
            // otherwise return the selected choice
            if (choice === choices.length){
                callback(true, <string>$('#choiceModalString').val());
            }
            else {
                callback(true, choices[choice]);
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
            var choices : string[] = $('#choiceModal').data('choices');
            var choice : number = parseInt(<string>$('#choiceModalSelect').val(), 10);

            // hide the custom text input unless the last option in the select is chosen
            $('#choiceModalStringRow').toggle(choice === choices.length);
        })

        // #confirmModal - requestUserConfirm()
        $('#confirmModalAffirmativeButton').on('click', function(){
            var callback : (confirmed : boolean) => void = $('#confirmModal').data('callback');
            callback(true);
        });
        $('#confirmModalNegativeButton').on('click', function(){
            var callback : (confirmed : boolean) => void = $('#confirmModal').data('callback');
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
            var callback : (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) => void = $('#gitCommitModal').data('callback');
            var completed : boolean = $('#gitCommitModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, Eagle.RepositoryService.Unknown, "", "", "", "", "");
                return;
            }

            // check selected option in select tag
            var repositoryService : Eagle.RepositoryService = <Eagle.RepositoryService>$('#gitCommitModalRepositoryServiceSelect').val();
            var repositories : Repository[] = $('#gitCommitModal').data('repositories');
            var repositoryNameChoice : number = parseInt(<string>$('#gitCommitModalRepositoryNameSelect').val(), 10);

            // split repository text (with form: "name (branch)") into name and branch strings
            var repositoryName : string = repositories[repositoryNameChoice].name;
            var repositoryBranch : string = repositories[repositoryNameChoice].branch;

            var filePath : string = <string>$('#gitCommitModalFilePathInput').val();
            var fileName : string = <string>$('#gitCommitModalFileNameInput').val();
            var commitMessage : string = <string>$('#gitCommitModalCommitMessageInput').val();

            callback(true, repositoryService, repositoryName, repositoryBranch, filePath, fileName, commitMessage);
        });
        $('#gitCommitModalRepositoryServiceSelect').on('change', function(){
            var repositoryService : Eagle.RepositoryService = <Eagle.RepositoryService>$('#gitCommitModalRepositoryServiceSelect').val();
            var repositories: Repository[] = eagle.getRepositoryList(repositoryService);
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
            console.log("addCustomRepo hidden");

            var callback : (completed : boolean, repositoryService : string, repositoryName : string, repositoryBranch : string) => void = $('#gitCustomRepositoryModal').data('callback');
            var completed : boolean = $('#gitCustomRepositoryModal').data('completed');
            console.log("completed", completed);

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, "", "", "");
                return;
            }

            // check selected option in select tag
            var repositoryService : string = <string>$('#gitCustomRepositoryModalRepositoryServiceSelect').val();
            var repositoryName : string = <string>$('#gitCustomRepositoryModalRepositoryNameInput').val();
            var repositoryBranch : string = <string>$('#gitCustomRepositoryModalRepositoryBranchInput').val();

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
        $('#editFieldModal').on('hidden.bs.modal', function(){
            console.log("editFieldModal hidden");

            var callback : (completed : boolean, field: Field) => void = $('#editFieldModal').data('callback');
            var completed : boolean = $('#editFieldModal').data('completed');
            console.log("completed", completed);

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, null);
                return;
            }

            // extract field data from HTML elements
            let text : string = <string>$('#editFieldModalTextInput').val();
            let name : string = <string>$('#editFieldModalNameInput').val();
            let value : string = <string>$('#editFieldModalValueInput').val();
            let description: string = <string>$('#editFieldModalDescriptionInput').val();
            let access: string = <string>$('#editFieldModalAccessSelect').val();
            let type: string = <string>$('#editFieldModalTypeSelect').val();

            // translate access and type
            let readonly: boolean = access === 'readonly';
            let realType: Eagle.DataType = Utils.translateStringToDataType(type);

            let newField = new Field(text, name, value, description, readonly, realType);

            callback(true, newField);
        });
    }

    static showUserMessage (title : string, message : string) {
        console.log("showUserMessage()", title, message);

        $('#messageModalTitle').text(title);
        $('#messageModalMessage').html(message);
        $('#messageModal').modal();


        // debug
        if (title === "Error"){
            Utils.addToHTMLElementLog(title + ":" + message);
        }
    }

    static showNotification(title : string, message : string, type : "success" | "info" | "warning" | "danger"){
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

    static addToHTMLElementLog(message: string){
        $('#htmlElementLog').text($('#htmlElementLog').text() + message + "\n");
    }

    static requestUserString(title : string, message : string, defaultString: string, isPassword: boolean, callback : (completed : boolean, userString : string) => void ) {
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

    static requestUserNumber(title : string, message : string, defaultNumber: number, callback : (completed : boolean, userNumber : number) => void ) {
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

    static requestUserChoice(title : string, message : string, choices : string[], selectedChoiceIndex : number, allowCustomChoice : boolean, customChoiceText : string, callback : (completed : boolean, userString : string) => void ){
        console.log("requestUserChoice()", title, message, choices, selectedChoiceIndex, allowCustomChoice, customChoiceText);

        $('#choiceModalTitle').text(title);
        $('#choiceModalMessage').html(message);
        $('#choiceModalCustomChoiceText').text(customChoiceText);
        $('#choiceModalString').val("");

        // remove existing options from the select tag
        $('#choiceModalSelect').empty();

        // add options to the modal select tag
        for (var i = 0 ; i < choices.length ; i++){
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

    static requestUserConfirm(title : string, message : string, affirmativeAnswer : string, negativeAnswer : string, callback : (confirmed : boolean) => void ){
        console.log("requestUserConfirm()", title, message, affirmativeAnswer, negativeAnswer);

        $('#confirmModalTitle').text(title);
        $('#confirmModalMessage').html(message);
        $('#confirmModalAffirmativeAnswer').text(affirmativeAnswer);
        $('#confirmModalNegativeAnswer').text(negativeAnswer);

        $('#confirmModal').data('callback', callback);

        $('#confirmModal').modal();
    }

    static requestUserGitCommit(defaultRepository : Repository, repositories: Repository[], filePath: string, fileName: string, callback : (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) => void ){
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

    static requestUserEditField(field: Field, callback: (completed: boolean, field: Field) => void){
        console.log("requestUserEditField()");

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
        $('#editFieldModal').modal();
    }

    static requestUserAddCustomRepository(callback : (completed : boolean, repositoryService : string, repositoryName : string, repositoryBranch : string) => void){
        console.log("requestUserAddCustomRepository()");

        $('#gitCustomRepositoryModalRepositoryNameInput').val("");
        $('#gitCustomRepositoryModalRepositoryBranchInput').val("");

        $('#gitCustomRepositoryModal').data('completed', false);
        $('#gitCustomRepositoryModal').data('callback', callback);
        $('#gitCustomRepositoryModal').modal();
    }

    static updateGitCommitRepositoriesList(repositories: Repository[], defaultRepository: Repository){
        // remove existing options from the repository name select tag
        $('#gitCommitModalRepositoryNameSelect').empty();

        // add options to the repository name select tag
        for (var i = 0 ; i < repositories.length ; i++){
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

    static showSettingsModal(){
        $('#settingsModal').modal();
    }

    /**
     * Returns a list of unique port names (except event ports)
     */
    static getPortNameList = (diagram : Palette | LogicalGraph) : string[] => {
        var allPortNames : string[] = [];

        // build a list from all nodes
        for (var i = 0; i < diagram.getNodes().length; i++) {
            var node : Node = diagram.getNodes()[i];

            // add input port names into the list
            for (var j = 0; j < node.getInputPorts().length; j++) {
                let port : Port = node.getInputPorts()[j];
                if (!port.isEvent()){
                    allPortNames.push(port.getName());
                }
            }

            // add output port names into the list
            for (var j = 0; j < node.getOutputPorts().length; j++) {
                let port : Port = node.getOutputPorts()[j];
                if (!port.isEvent()) {
                    allPortNames.push(port.getName());
                }
            }

            // add input application input and output ports
            if (node.hasInputApplication()){
                // input ports
                for (var j = 0; j < node.getInputApplication().getInputPorts().length; j++) {
                    let port : Port = node.getInputApplication().getInputPorts()[j];
                    if (!port.isEvent()) {
                        allPortNames.push(port.getName());
                    }
                }

                // output ports
                for (var j = 0; j < node.getInputApplication().getOutputPorts().length; j++) {
                    let port : Port = node.getInputApplication().getOutputPorts()[j];
                    if (!port.isEvent()) {
                        allPortNames.push(port.getName());
                    }
                }
            }

            // add output application input and output ports
            if (node.hasOutputApplication()){
                // input ports
                for (var j = 0; j < node.getOutputApplication().getInputPorts().length; j++) {
                    let port : Port = node.getOutputApplication().getInputPorts()[j];
                    if (!port.isEvent()) {
                        allPortNames.push(port.getName());
                    }
                }

                // output ports
                for (var j = 0; j < node.getOutputApplication().getOutputPorts().length; j++) {
                    let port : Port = node.getOutputApplication().getOutputPorts()[j];
                    if (!port.isEvent()) {
                        allPortNames.push(port.getName());
                    }
                }
            }

            // add exit application input and output ports
            if (node.hasExitApplication()){
                // input ports
                for (var j = 0; j < node.getExitApplication().getInputPorts().length; j++) {
                    let port : Port = node.getExitApplication().getInputPorts()[j];
                    if (!port.isEvent()) {
                        allPortNames.push(port.getName());
                    }
                }

                // output ports
                for (var j = 0; j < node.getExitApplication().getOutputPorts().length; j++) {
                    let port : Port = node.getExitApplication().getOutputPorts()[j];
                    if (!port.isEvent()) {
                        allPortNames.push(port.getName());
                    }
                }
            }
        }

        // remove duplicates from the list
        var uniquePortNames : string[] = allPortNames.filter(function(elem, index, self) {
            return index === self.indexOf(elem);
        });

        return uniquePortNames;
    }

    /**
     * Returns a list of unique field names
     */
    static getFieldTextList = (diagram : Palette | LogicalGraph) : string[] => {
        var allFieldTexts : string[] = [];

        // build a list from all nodes
        for (var i = 0; i < diagram.getNodes().length; i++) {
            var node : Node = diagram.getNodes()[i];

            // add fields into the list
            for (var j = 0; j < node.getFields().length; j++) {
                var fieldName = node.getFields()[j].getName();
                allFieldTexts.push(fieldName);
            }
        }

        // remove duplicates from the list
        var uniqueFieldNames : string[] = allFieldTexts.filter(function(elem, index, self) {
            return index === self.indexOf(elem);
        });

        console.log("uniqueFieldNames:", uniqueFieldNames);

        return uniqueFieldNames;
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

            var svgElement : Element = document.querySelector(selector);
            var svgString : string = new XMLSerializer().serializeToString(svgElement);

            // create svgString with injected CSS stylesheet
            var CSS_ELEMENT = '<style type="text/css" ><![CDATA[' + response + ']]></style>';
            //console.log("CSS_ELEMENT", CSS_ELEMENT);
            svgString = svgString.substring(0, svgString.indexOf(">") + 1) + CSS_ELEMENT + svgString.substring(svgString.indexOf(">") + 1);
            //console.log("svgString", svgString);

            var canvas : HTMLCanvasElement = <HTMLCanvasElement> document.createElement("canvas");
            //console.log("svgElement", svgElement.clientWidth.toString(), svgElement.clientHeight.toString());
            canvas.setAttribute("width", svgElement.clientWidth.toString());
            canvas.setAttribute("height", svgElement.clientHeight.toString());
            var ctx = canvas.getContext("2d");

            var img = new Image();
            var svg = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
            var url = window.URL.createObjectURL(svg);
            img.onload = function() {
                ctx.drawImage(img, 0, 0);
                var png = canvas.toDataURL("image/png");
                //document.querySelector('#png-container').innerHTML = '<img src="'+png+'"/>';

                // Element that will be used for downloading.
                var a : HTMLAnchorElement = document.createElement("a");
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
        var local : string = localStorage.getItem(this.RIGHT_WINDOW_WIDTH_KEY);

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
        var local : string = localStorage.getItem(this.LEFT_WINDOW_WIDTH_KEY);

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
        var result : Node[] = [];

        // Searching for the node.
        for (var i = 0; i < palette.getNodes().length; i++) {
            var node : Node = palette.getNodes()[i];
            if (node.getCategoryType() === categoryType) {
                result.push(node);
            }
        }

        return result;
    }

    static buildCategoryList (palette : Palette, categoryType : Eagle.CategoryType) : Eagle.Category[] {
        var result : Eagle.Category[] = [];

        // Searching for the node.
        for (var i = 0; i < palette.getNodes().length; i++) {
            var node : Node = palette.getNodes()[i];
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
    static addOrUpdateNodeInPalette(palette: Palette, node: Node): void {
        // try to find a matching node that already exists in the palette
        // TODO: at the moment, we only match by name and category, but we should match by ID (once the ID is unique)
        for (let i = 0 ; i < palette.getNodes().length; i++){
            let paletteNode = palette.getNodes()[i];

            if (paletteNode.getName() === node.getName() && paletteNode.getCategory() === node.getCategory()){
                palette.getNodes()[i] = node;
                //console.log("Replace node", node.getName(), "in destination palette", palette.fileInfo().name);
                return;
            }
        }

        //console.log("Copy node", node.getName(), "to destination palette", palette.fileInfo().name, "now contains", palette.getNodes().length);
        palette.addNode(node);
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

    static validateJSON(json : object, version : Eagle.DALiuGESchemaVersion, fileType : Eagle.FileType) : boolean {
        console.log("validateJSON(): version:", version, "fileType:", Utils.translateFileTypeToString(fileType));

        var ajv = new Ajv();
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

        return valid;
    }
}
