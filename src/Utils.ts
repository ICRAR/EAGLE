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
import * as ko from "knockout";

import {Config} from './Config';

import {Eagle} from './Eagle';
import {Palette} from './Palette';
import {LogicalGraph} from './LogicalGraph';
import {Node} from './Node';
import {Edge} from './Edge';
import {Port} from './Port';
import {Field} from './Field';
import {Repository} from './Repository';
import {RepositoryFile} from './RepositoryFile';
import {PaletteInfo} from './PaletteInfo';

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
    static readonly CONFIRM_DELETE_OBJECTS : string = "ConfirmDeleteObjects";

    static readonly SHOW_FILE_LOADING_ERRORS : string = "ShowFileLoadingErrors";

    static readonly ALLOW_INVALID_EDGES : string = "AllowInvalidEdges";
    static readonly ALLOW_COMPONENT_EDITING : string = "AllowComponentEditing";
    static readonly ALLOW_READONLY_PARAMETER_EDITING : string = "AllowReadonlyParameterEditing";
    static readonly ALLOW_EDGE_EDITING : string = "AllowEdgeEditing";

    static readonly ALLOW_PALETTE_EDITING : string = "AllowPaletteEditing";
    static readonly DISPLAY_NODE_KEYS : string = "DisplayNodeKeys"

    static readonly TRANSLATOR_URL : string = "TranslatorURL";

    static readonly TRANSLATE_WITH_NEW_CATEGORIES: string = "TranslateWithNewCategories"; // temp fix for incompatibility with the DaLiuGE translator

    static readonly OPEN_DEFAULT_PALETTE: string = "OpenDefaultPalette";
    static readonly CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS: string = "CreateApplicationsForConstructPorts";
    static readonly DISABLE_JSON_VALIDATION: string = "DisableJsonValidation";

    static readonly DOCKER_HUB_USERNAME: string = "DockerHubUserName";
    static readonly SPAWN_TRANSLATION_TAB: string = "SpawnTranslationTab";
    static readonly ENABLE_PERFORMANCE_DISPLAY: string = "EnablePerformanceDisplay";
    static readonly USE_SIMPLIFIED_TRANSLATOR_OPTIONS: string = "UseSimplifiedTranslatorOptions";

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

            // if this node has exitApp, add the exitApp key
            if (node.hasExitApplication()){
                usedKeys.push(node.getExitApplication().getKey());
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
                    console.warn("setEmbeddedApplicationNodeKeys(): set node", node.getKey(), "input app key", newKey);
                }
            }

            // if this node has outputApp, add the outputApp key
            if (node.hasOutputApplication()){
                if (node.getOutputApplication().getKey() === null){
                    const newKey = Utils.findNewKey(usedKeys);
                    node.getOutputApplication().setKey(newKey);
                    usedKeys.push(newKey);
                    console.warn("setEmbeddedApplicationNodeKeys(): set node", node.getKey(), "output app key", newKey);
                }
            }

            // if this node has exitApp, add the exitApp key
            if (node.hasExitApplication()){
                if (node.getExitApplication().getKey() === null){
                    const newKey = Utils.findNewKey(usedKeys);
                    node.getExitApplication().setKey(newKey);
                    usedKeys.push(newKey);
                    console.warn("setEmbeddedApplicationNodeKeys(): set node", node.getKey(), "exit app key", newKey);
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

    static getFileTypeNum(fileType: Eagle.FileType) : number {
        switch (fileType){
            case Eagle.FileType.Graph:
                return 0;
            case Eagle.FileType.Palette:
                return 1;
            case Eagle.FileType.JSON:
                return 2;
            case Eagle.FileType.Unknown:
                return 3;
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
        if (fileType.toLowerCase() === "graph")
            return Eagle.FileType.Graph;
        if (fileType.toLowerCase() === "palette")
            return Eagle.FileType.Palette;
        if (fileType.toLowerCase() === "json")
            return Eagle.FileType.JSON;

        return Eagle.FileType.Unknown;
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
        if (dataType === "Unknown"){
            return Eagle.DataType.Unknown;
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
            const valueText : string = <string>$('#editFieldModalValueInputText').val();
            const valueCheckbox : boolean = $('#editFieldModalValueInputCheckbox').prop('checked');
            const description: string = <string>$('#editFieldModalDescriptionInput').val();
            const access: string = <string>$('#editFieldModalAccessSelect').val();
            const type: string = <string>$('#editFieldModalTypeSelect').val();

            // translate access and type
            const readonly: boolean = access === 'readonly';
            const realType: Eagle.DataType = Utils.translateStringToDataType(type);
            let newField;

            if (realType === Eagle.DataType.Boolean){
                newField = new Field(text, name, valueCheckbox.toString(), description, readonly, realType);
            } else {
                newField = new Field(text, name, valueText, description, readonly, realType);
            }

            callback(true, newField);
        });

        $('#editFieldModal').on('show.bs.modal', Utils.validateFieldValue);
        $('#editFieldModalValueInputText').on('keyup', Utils.validateFieldValue);
        $('#editFieldModalTypeSelect').on('change', function(){
            Utils.validateFieldValue();

            // show the correct entry field based on the field type
            const value = $('#editFieldModalTypeSelect').val();
            console.log("editFieldModalTypeSelect change", value);
            $('#editFieldModalValueInputText').toggle(value !== Eagle.DataType.Boolean);
            $('#editFieldModalValueInputCheckbox').toggle(value === Eagle.DataType.Boolean);
        });

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
            const name: string = <string>$('#editPortModalNameInput').val();
            const type: string = <string>$('#editPortModalTypeInput').val();

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
            const loopAware: boolean = $('#editEdgeModalValueInputCheckbox').prop('checked');
            //console.log("srcNodeKey", srcNodeKey, "srcPortId", srcPortId, "destNodeKey", destNodeKey, "destPortId", destPortId, "dataType", dataType);

            const newEdge = new Edge(srcNodeKey, srcPortId, destNodeKey, destPortId, dataType, loopAware);

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

        $('#explorePalettesModal').on('shown.bs.modal', function(){
            $('#explorePalettesModal .modal-footer button').focus();
        });
        $('#explorePalettesModalAffirmativeButton').on('click', function(){
            $('#explorePalettesModal').data('completed', true);
        });
        $('#explorePalettesModal').on('hidden.bs.modal', function(){
            const completed : boolean = $('#explorePalettesModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                return;
            }

            // loop through the explorePalettes, find any selected and load them
            for (const ep of eagle.explorePalettes()){
                if (ep.isSelected()){
                    eagle.openRemoteFile(new RepositoryFile(new Repository(ep.repositoryService, ep.repositoryName, ep.repositoryBranch, false), ep.path, ep.name));
                }
            }

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

    static requestUserEditField(eagle: Eagle, modalType: Eagle.ModalType, field: Field, choices: string[], callback: (completed: boolean, field: Field) => void) : void {
        console.log("requestUserEditField()");

        if (modalType === Eagle.ModalType.Add){
            // remove existing options from the select tag
            $('#fieldModalSelect').empty();
            $("#nodeInspectorDropDownKO").empty();

            // add empty choice
            $('#fieldModalSelect').append($('<option>', {
                value: -1,
                text: ""
            }));
            $("#nodeInspectorDropDownKO").append($('<a>', {
                href: "#",
                class: "nodeInspectorDropdownOption",
                "data-bind":"click:function(){nodeInspectorDropdownClick(-1, "+choices.length+",'nodeInspectorAddFieldDiv')}",
                value: -1,
                text: ""
            }));

            // add options to the modal select tag
            for (let i = 0 ; i < choices.length ; i++){
                $('#fieldModalSelect').append($('<option>', {
                    value: i,
                    text: choices[i]
                }));
                $("#nodeInspectorDropDownKO").append($('<a>', {
                    href: "#",
                    class: "nodeInspectorDropdownOption",
                    "data-bind":"click:function(){nodeInspectorDropdownClick("+i+", "+choices.length+",'nodeInspectorAddFieldDiv')}",
                    value: i,
                    text: choices[i]
                }));
            }

            // add custom choice
            $('#fieldModalSelect').append($('<option>', {
                value: choices.length,
                text: "Custom (enter below)"
            }));
            $("#nodeInspectorDropDownKO").append($('<a>', {
                href: "#",
                class: "nodeInspectorDropdownOption",
                "data-bind":"click:function(){nodeInspectorDropdownClick("+choices.length+", "+choices.length+",'nodeInspectorAddFieldDiv')}",
                value: choices.length,
                text: "Custom"
            }));
            //applying knockout bindings for the new buttonsgenerated above
            ko.cleanNode(document.getElementById("nodeInspectorDropDownKO"));
            ko.applyBindings(eagle, document.getElementById("nodeInspectorDropDownKO"));

        }

        // populate UI with current field data
        $('#editFieldModalTextInput').val(field.getText());
        $('#editFieldModalNameInput').val(field.getName());
        $('#editFieldModalValueInputText').val(field.getValue());
        $('#editFieldModalValueInputCheckbox').attr('checked', Field.string2Type(field.getValue(), Eagle.DataType.Boolean));
        $('#editFieldModalDescriptionInput').val(field.getDescription());
        $('#editFieldModalAccessSelect').empty();

        // show the correct entry field based on the field type
        $('#editFieldModalValueInputText').toggle(field.getType() !== Eagle.DataType.Boolean);
        $('#editFieldModalValueInputCheckbox').toggle(field.getType() === Eagle.DataType.Boolean);

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

    static requestUserEditPort(eagle:Eagle, modalType: Eagle.ModalType, port: Port, choices: string[], callback: (completed: boolean, port: Port) => void) : void {
        if (modalType === Eagle.ModalType.Add){
            // remove existing options from the select tag
            $('#portModalSelect').empty();
            $('#nodeInspectorInputPortDropDownKO').empty();
            $('#nodeInspectorOutputPortDropDownKO').empty();


            // add empty choice
            $('#portModalSelect').append($('<option>', {
                value: -1,
                text: ""
            }));
            $('#nodeInspectorInputPortDropDownKO').append($('<a>', {
                href: "#",
                class: "nodeInspectorDropdownOption",
                "data-bind":"click:function(){nodeInspectorDropdownClick(-1, "+choices.length+",'nodeInspectorAddInputPortDiv')}",
                value: -1,
                text: ""
            }));
            $('#nodeInspectorOutputPortDropDownKO').append($('<a>', {
                href: "#",
                class: "nodeInspectorDropdownOption",
                "data-bind":"click:function(){nodeInspectorDropdownClick(-1, "+choices.length+",'nodeInspectorAddOutputPortDiv')}",
                value: -1,
                text: ""
            }));


            // add options to the modal select tag
            for (let i = 0 ; i < choices.length ; i++){
                $('#portModalSelect').append($('<option>', {
                    value: i,
                    text: choices[i]
                }));
                $('#nodeInspectorInputPortDropDownKO').append($('<a>', {
                    href: "#",
                    class: "nodeInspectorDropdownOption",
                    "data-bind":"click:function(){nodeInspectorDropdownClick("+i+", "+choices.length+",'nodeInspectorAddInputPortDiv')}",
                    value: i,
                    text: choices[i]
                }));
                $('#nodeInspectorOutputPortDropDownKO').append($('<a>', {
                    href: "#",
                    class: "nodeInspectorDropdownOption",
                    "data-bind":"click:function(){nodeInspectorDropdownClick("+i+", "+choices.length+",'nodeInspectorAddOutputPortDiv')}",
                    value: i,
                    text: choices[i]
                }));
            }

            // add custom choice
            $('#portModalSelect').append($('<option>', {
                value: choices.length,
                text: "Custom"
            }));
            $('#nodeInspectorInputPortDropDownKO').append($('<a>', {
                href: "#",
                class: "nodeInspectorDropdownOption",
                "data-bind":"click:function(){nodeInspectorDropdownClick("+choices.length+", "+choices.length+",'nodeInspectorAddInputPortDiv')}",
                value: choices.length,
                text: "Custom"
            }));
            $('#nodeInspectorOutputPortDropDownKO').append($('<a>', {
                href: "#",
                class: "nodeInspectorDropdownOption",
                "data-bind":"click:function(){nodeInspectorDropdownClick("+choices.length+", "+choices.length+",'nodeInspectorAddOutputPortDiv')}",
                value: choices.length,
                text: "Custom"
            }));

            //applying knockout bindings for the new buttonsgenerated above
            ko.cleanNode(document.getElementById("nodeInspectorInputPortDropDownKO"));
            ko.applyBindings(eagle, document.getElementById("nodeInspectorInputPortDropDownKO"));
            ko.cleanNode(document.getElementById("nodeInspectorOutputPortDropDownKO"));
            ko.applyBindings(eagle, document.getElementById("nodeInspectorOutputPortDropDownKO"));
        }

        // populate UI with current port data
        $('#editPortModalNameInput').val(port.getName());
        $('#editPortModalTypeInput').val(port.getType());

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

    static showShortcutsModal() : void {
        $('#shortcutsModal').modal();
    }

    static showPalettesModal(eagle: Eagle) : void {
        const token = Eagle.findSettingValue(Utils.GITHUB_ACCESS_TOKEN_KEY);

        if (token === null) {
            Utils.showUserMessage("Access Token", "The GitHub access token is not set! To access GitHub repository, set the token via settings.");
            return;
        }

        // Add parameters in json data.
        // TODO: make repository and branch settings, or at least config options
        const jsonData = {
            repository: Config.DEFAULT_PALETTE_REPOSITORY,
            branch: "master",
            token: token,
        };

        // empty the list of palettes prior to (re)fetch
        eagle.explorePalettes([]);

        $('#explorePalettesModal').modal();

        Utils.httpPostJSON('/getExplorePalettes', jsonData, function(error:string, data:any){
            console.log("error", error, "data", data);

            const explorePalettes: PaletteInfo[] = [];
            for (const palette of data){
                explorePalettes.push(new PaletteInfo(Eagle.RepositoryService.GitHub, jsonData.repository, jsonData.branch, palette.name, palette.path));
            }

            eagle.explorePalettes(explorePalettes);
        });
    }

    static requestUserEditEdge(edge: Edge, logicalGraph: LogicalGraph, callback: (completed: boolean, edge: Edge) => void) : void {
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

            // add exit applicaiton node, if present
            if (node.hasExitApplication()){
                const exitApp = node.getExitApplication();

                $('#editEdgeModalSrcNodeKeySelect').append($('<option>', {
                    value: exitApp.getKey(),
                    text: exitApp.getName(),
                    selected: edge.getSrcNodeKey() === exitApp.getKey()
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
                    text: port.getName(),
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

            // exit application node, if present
            if (node.hasExitApplication()){
                const exitApp = node.getExitApplication();

                $('#editEdgeModalDestNodeKeySelect').append($('<option>', {
                    value: exitApp.getKey(),
                    text: exitApp.getName(),
                    selected: edge.getDestNodeKey() === exitApp.getKey()
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
    static getUniquePortsList = (diagram : Palette | LogicalGraph) : Port[] => {
        const uniquePorts : Port[] = [];

        // build a list from all nodes
        for (const node of diagram.getNodes()) {
            // add input port names into the list
            for (const port of node.getInputPorts()) {
                if (!port.isEvent()){
                    Utils._addPortIfUnique(uniquePorts, port.clone());
                }
            }

            // add output port names into the list
            for (const port of node.getOutputPorts()) {
                if (!port.isEvent()) {
                    Utils._addPortIfUnique(uniquePorts, port.clone());
                }
            }

            // add input application input and output ports
            if (node.hasInputApplication()){
                // input ports
                for (const port of node.getInputApplication().getInputPorts()) {
                    if (!port.isEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }

                // output ports
                for (const port of node.getInputApplication().getOutputPorts()) {
                    if (!port.isEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }
            }

            // add output application input and output ports
            if (node.hasOutputApplication()){
                // input ports
                for (const port of node.getOutputApplication().getInputPorts()) {
                    if (!port.isEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }

                // output ports
                for (const port of node.getOutputApplication().getOutputPorts()) {
                    if (!port.isEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }
            }

            // add exit application input and output ports
            if (node.hasExitApplication()){
                // input ports
                for (const port of node.getExitApplication().getInputPorts()) {
                    if (!port.isEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }

                // output ports
                for (const port of node.getExitApplication().getOutputPorts()) {
                    if (!port.isEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }
            }
        }

        return uniquePorts;
    }

    private static _addPortIfUnique = (ports : Port[], port: Port) : void => {

        // check if the new port matches an existing port (by name and type), if so, abort
        for (const p of ports){
            if (p.getName() === port.getName() && p.getType() === port.getType()){
                return;
            }
        }

        // otherwise add the port
        ports.push(port);
    }

    /**
     * Returns a list of all fields in the given palette or logical graph
     */
    static getUniqueFieldsList = (diagram : Palette | LogicalGraph) : Field[] => {
        const uniqueFields : Field[] = [];

        // build a list from all nodes, add fields into the list
        for (const node of diagram.getNodes()) {
            for (const field of node.getFields()) {
                Utils._addFieldIfUnique(uniqueFields, field.clone());
            }
        }

        return uniqueFields;
    }

    private static _addFieldIfUnique = (fields : Field[], field: Field) : void => {
        // check if the new field matches an existing field (by name and type), if so, abort
        for (const f of fields){
            if (f.getName() === field.getName() && f.getType() === field.getType()){
                return;
            }
        }

        // otherwise add the field
        fields.push(field);
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

    static buildComponentList(filter: (cData: Eagle.CategoryData) => boolean) : Eagle.Category[] {
        const result : Eagle.Category[] = [];

        for (const category in Eagle.cData){
            const cData = Eagle.getCategoryData(<Eagle.Category>category);
            if (filter(cData)){
                result.push(<Eagle.Category>category);
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

    static checkPalette(palette: Palette): string[] {
        const results: string[] = [];

        // check for duplicate keys
        const keys: number[] = [];

        for (const node of palette.getNodes()){
            // check existing keys
            if (keys.indexOf(node.getKey()) !== -1){
                results.push("Key " + node.getKey() + " used by multiple components in palette.");
            } else {
                keys.push(node.getKey());
            }
        }

        return results;
    }

    static checkGraph(graph: LogicalGraph): string[] {
        const results: string[] = [];

        // check that all port dataTypes have been defined
        for (const node of graph.getNodes()){
            for (const port of node.getInputPorts()){
                if (port.getType() === ""){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has input port (" + port.getName() + ") whose type is not specified");
                }
            }
            for (const port of node.getOutputPorts()){
                if (port.getType() === ""){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has output port (" + port.getName() + ") whose type is not specified");
                }
            }

            for (const port of node.getInputApplicationInputPorts()){
                if (port.getType() === ""){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has input application (" + node.getInputApplication().getName() + ") with input port (" + port.getName() + ") whose type is not specified");
                }
            }

            for (const port of node.getInputApplicationOutputPorts()){
                if (port.getType() === ""){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has input application (" + node.getInputApplication().getName() + ") with output port (" + port.getName() + ") whose type is not specified");
                }
            }

            for (const port of node.getOutputApplicationInputPorts()){
                if (port.getType() === ""){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has output application (" + node.getOutputApplication().getName() + ") with input port (" + port.getName() + ") whose type is not specified");
                }
            }

            for (const port of node.getOutputApplicationOutputPorts()){
                if (port.getType() === ""){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has output application (" + node.getOutputApplication().getName() + ") with output port (" + port.getName() + ") whose type is not specified");
                }
            }

            for (const port of node.getExitApplicationInputPorts()){
                if (port.getType() === ""){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has exit application (" + node.getExitApplication().getName() + ") with input port (" + port.getName() + ") whose type is not specified");
                }
            }

            for (const port of node.getExitApplicationOutputPorts()){
                if (port.getType() === ""){
                    results.push("Node " + node.getKey() + " (" + node.getName() + ") has exit application (" + node.getExitApplication().getName() + ") with output port (" + port.getName() + ") whose type is not specified");
                }
            }
        }

        // check that all nodes have correct numbers of inputs and outputs
        for (const node of graph.getNodes()){
            const cData: Eagle.CategoryData = Eagle.getCategoryData(node.getCategory());
            const minInputs  = cData.minInputs;
            const maxInputs  = cData.maxInputs;
            const minOutputs = cData.minOutputs;
            const maxOutputs = cData.maxOutputs;

            if (node.getInputPorts().length < minInputs){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has too few input ports. Should have at least " + minInputs);
            }
            if (node.getInputPorts().length > maxInputs){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has too many input ports. Should have at most " + maxInputs);
            }
            if (node.getOutputPorts().length < minOutputs){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has too few output ports. Should have at least " + minOutputs);
            }
            if (node.getOutputPorts().length > maxOutputs){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has too many output ports. Should have at most " + maxOutputs);
            }

            // check that all nodes should have at least one connected edge, otherwise what purpose do they serve?
            let isConnected: boolean = false;
            for (const edge of graph.getEdges()){
                if (edge.getSrcNodeKey() === node.getKey() || edge.getDestNodeKey() === node.getKey()){
                    isConnected = true;
                    break;
                }
            }
            // NOTE: if more types than just Description are exempted from this test, consider adding a "canBeDisconnected" attribute to CategoryData
            if (!isConnected && node.getCategory() !== Eagle.Category.Description){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has no connected edges. It should be connected to the graph in some way");
            }

            // check embedded application categories are not 'None'
            if (node.hasInputApplication() && node.getInputApplication().getCategory() === Eagle.Category.None){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has input application with category 'None'.");
            }
            if (node.hasOutputApplication() && node.getOutputApplication().getCategory() === Eagle.Category.None){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has output application with category 'None'.");
            }
            if (node.hasExitApplication() && node.getExitApplication().getCategory() === Eagle.Category.None){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") has exit application with category 'None'.");
            }

            // check that Service nodes have inputApplications with no output ports!
            if (node.getCategory() === Eagle.Category.Service && node.hasInputApplication() && node.getInputApplication().getOutputPorts().length > 0){
                results.push("Node " + node.getKey() + " (" + node.getName() + ") is a Service node, but has an input application with at least one output.");
            }
        }

        for (const edge of graph.getEdges()){
            const linkValid : Eagle.LinkValid = Edge.isValid(graph, edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.isLoopAware(), false, false);

            if (linkValid === Eagle.LinkValid.Invalid){
                results.push("Edge (" + edge.getId() + ") is invalid.");
            }
        }

        return results;
    }

    static validateJSON(json : object, version : Eagle.DALiuGESchemaVersion, fileType : Eagle.FileType) : {valid: boolean, errors: string} {
        console.log("validateJSON(): version:", version, "fileType:", fileType);

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
        const valueText : string = <string>$('#editFieldModalValueInputText').val();

        const type: string = <string>$('#editFieldModalTypeSelect').val();
        const realType: Eagle.DataType = Utils.translateStringToDataType(type);

        let isValid: boolean = true;

        switch (realType){
            case Eagle.DataType.Float:
                isValid = valueText.match(/^-?\d*(\.\d+)?$/) && !isNaN(parseFloat(valueText));
                break;
            case Eagle.DataType.Integer:
                isValid = valueText.match(/^-?\d*$/) && true;
                break;
        }

        if (isValid){
            $('#editFieldModalValueInputText').addClass('is-valid');
            $('#editFieldModalValueInputText').removeClass('is-invalid');
            $('#editFieldModalValueFeedback').text('');
        } else {
            $('#editFieldModalValueInputText').removeClass('is-valid');
            $('#editFieldModalValueInputText').addClass('is-invalid');
            $('#editFieldModalValueFeedback').text('Invalid value for ' + type + ' type.');
        }
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
}
