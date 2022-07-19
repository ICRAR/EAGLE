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

import {Config} from './Config';

import {Eagle} from './Eagle';
import {Palette} from './Palette';
import {LogicalGraph} from './LogicalGraph';
import {Node} from './Node';
import {Edge} from './Edge';
import {Field} from './Field';
import {Repository} from './Repository';
import {PaletteInfo} from './PaletteInfo';
import {KeyboardShortcut} from './KeyboardShortcut';
import {Errors} from './Errors';

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
    static readonly ALLOW_READONLY_PALETTE_EDITING : string = "AllowReadonlyPaletteEditing";
    static readonly ALLOW_EDGE_EDITING : string = "AllowEdgeEditing";
    static readonly SHOW_DALIUGE_RUNTIME_PARAMETERS : string = "ShowDaliugeRuntimeParameters";

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

    static readonly GRAPH_ZOOM_DIVISOR: string = "GraphZoomDivisor";
    static readonly ENABLE_EXPERT_MODE: string = "EnableExpertMode";

    static readonly SKIP_CLOSE_LOOP_EDGES: string = "SkipCloseLoopEdges";
    static readonly PRINT_UNDO_STATE_TO_JS_CONSOLE: string = "PrintUndoStateToJsConsole";

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
        return dataType.split(".")[0];
    }

    static translateStringToDataType(dataType: string): string {
        for (let dt of Eagle.DataTypes){
            if (dt.toLowerCase() === dataType.toLowerCase()){
                return dt;
            }
        }

        console.warn("Unknown DataType", dataType);
        return Eagle.DataType_Unknown;
    }

    static translateStringToFieldType(fieldType: string): Eagle.FieldType {
        for (let ft of Object.values(Eagle.FieldType)){
            if (ft.toLowerCase() === fieldType.toLowerCase()){
                return ft;
            }
        }

        console.warn("Unknown FieldType", fieldType);
        return Eagle.FieldType.Unknown;
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
                    callback(xhr.responseJSON.error, null);
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

    static showUserMessage (title : string, message : string) : void {
        console.log("showUserMessage()", title, message);

        $('#messageModalTitle').text(title);
        $('#messageModalMessage').html(message);
        $('#messageModal').modal("toggle");

        // debug
        if (title === "Error"){
            Utils.addToHTMLElementLog(title + ":" + message);
        }
    }

    static showErrorsModal(title: string, errors: Errors.Issue[], warnings: Errors.Issue[]){
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

        $('#inputModal').modal("toggle");
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

        $('#inputTextModal').modal("toggle");
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

        $('#inputModal').modal("toggle");
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

        $('#choiceModal').modal("toggle");
    }

    static requestUserConfirm(title : string, message : string, affirmativeAnswer : string, negativeAnswer : string, callback : (confirmed : boolean) => void ) : void {
        console.log("requestUserConfirm()", title, message, affirmativeAnswer, negativeAnswer);

        $('#confirmModalTitle').text(title);
        $('#confirmModalMessage').html(message);
        $('#confirmModalAffirmativeAnswer').text(affirmativeAnswer);
        $('#confirmModalNegativeAnswer').text(negativeAnswer);

        $('#confirmModal').data('callback', callback);

        $('#confirmModal').modal("toggle");
    }

    static requestUserGitCommit(defaultRepository : Repository, repositories: Repository[], filePath: string, fileName: string, callback : (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) => void ) : void {
        console.log("requestUserGitCommit()");

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

        // pre-selected the currently selected index
        //$('#gitCommitModalRepositorySelect').val(selectedChoiceIndex);

        $('#gitCommitModalFilePathInput').val(filePath);
        $('#gitCommitModalFileNameInput').val(fileName);
    }

    static requestUserEditField(eagle: Eagle, modalType: Eagle.ModalType, fieldType: Eagle.FieldType, field: Field, choices: string[], callback: (completed: boolean, field: Field) => void) : void {
        let dropDownKO;
        let divID;

        if (fieldType === Eagle.FieldType.ComponentParameter){
            dropDownKO = $("#nodeInspectorFieldDropDownKO");
            divID = "nodeInspectorAddFieldDiv";
        } else {
            dropDownKO = $("#nodeInspectorApplicationParamDropDownKO")
            divID = "nodeInspectorAddApplicationParamDiv";
        }

        if (modalType === Eagle.ModalType.Add){
            // remove existing options from the select tag
            $('#fieldModalSelect').empty();
            dropDownKO.empty();

            // add empty choice
            $('#fieldModalSelect').append($('<option>', {
                value: -1,
                text: ""
            }));
            dropDownKO.append($('<a>', {
                href: "#",
                class: "nodeInspectorDropdownOption",
                "data-bind":"click:function(){nodeInspectorDropdownClick(-1, "+choices.length+",'" + divID + "')}",
                value: -1,
                text: ""
            }));

            // add options to the modal select tag
            for (let i = 0 ; i < choices.length ; i++){
                $('#fieldModalSelect').append($('<option>', {
                    value: i,
                    text: choices[i]
                }));
                dropDownKO.append($('<a>', {
                    href: "#",
                    class: "nodeInspectorDropdownOption",
                    "data-bind":"click:function(){nodeInspectorDropdownClick("+i+", "+choices.length+",'" + divID + "')}",
                    value: i,
                    text: choices[i]
                }));
            }

            // add custom choice
            $('#fieldModalSelect').append($('<option>', {
                value: choices.length,
                text: "Custom (enter below)"
            }));
            dropDownKO.append($('<a>', {
                href: "#",
                class: "nodeInspectorDropdownOption",
                "data-bind":"click:function(){nodeInspectorDropdownClick("+choices.length+", "+choices.length+",'" + divID + "')}",
                value: choices.length,
                text: "Custom"
            }));

            //applying knockout bindings for the new buttons generated above
            ko.cleanNode(dropDownKO[0]);
            ko.applyBindings(eagle, dropDownKO[0]);

        }

        // populate UI with current field data
        $('#editFieldModalDisplayTextInput').val(field.getDisplayText());
        $('#editFieldModalIdTextInput').val(field.getIdText());
        $('#editFieldModalValueInputText').val(field.getValue());
        $('#editFieldModalValueInputCheckbox').prop('checked', Field.stringAsType(field.getValue(), Eagle.DataType_Boolean));
        $('#editFieldModalValueInputCheckbox').parent().find("span").text(Field.stringAsType(field.getValue(), Eagle.DataType_Boolean));
        $('#editFieldModalValueInputSelect').empty();
        for (let option of field.getOptions()){
            $('#editFieldModalValueInputSelect').append($('<option>', {
                value: option,
                text: option,
                selected: field.getValue() === option
            }));
        }

        $('#editFieldModalDefaultValueInputText').val(field.getDefaultValue());
        $('#editFieldModalDefaultValueInputCheckbox').prop('checked', Field.stringAsType(field.getDefaultValue(), Eagle.DataType_Boolean));
        $('#editFieldModalDefaultValueInputSelect').empty();
        for (let option of field.getOptions()){
            $('#editFieldModalDefaultValueInputSelect').append($('<option>', {
                value: option,
                text: option,
                selected: field.getDefaultValue() === option
            }));
        }

        // set accessibility state checkbox
        $('#editFieldModalAccessInputCheckbox').prop('checked', field.isReadonly());

        // set positional argument checkbox
        $('#editFieldModalPositionalInputCheckbox').prop('checked', field.isPositionalArgument());

        $('#editFieldModalDescriptionInput').val(field.getDescription());
        if(field.getType() === Eagle.DataType_Boolean){
            $("#editFieldModalDefaultValue").hide()
        }else{
            $("#editFieldModalDefaultValue").show()
        }

        // show the correct entry field based on the field type
        /*
        console.log("!debug", field.getType(), field.isType(Eagle.DataType_Boolean), field.isType(Eagle.DataType_Select), "combined", !field.isType(Eagle.DataType_Boolean) && !field.isType(Eagle.DataType_Select));
        $('#editFieldModalValueInputText').toggle(!field.isType(Eagle.DataType_Boolean) && !field.isType(Eagle.DataType_Select));
        $('#editFieldModalValueInputCheckbox').parent().toggle(field.isType(Eagle.DataType_Boolean));
        $('#editFieldModalValueInputSelect').toggle(field.isType(Eagle.DataType_Select));

        $('#editFieldModalDefaultValueInputText').toggle(!field.isType(Eagle.DataType_Boolean) && !field.isType(Eagle.DataType_Select));
        $('#editFieldModalDefaultValueInputCheckbox').toggle(field.isType(Eagle.DataType_Boolean));
        $('#editFieldModalDefaultValueInputSelect').toggle(field.isType(Eagle.DataType_Select));
        */


        $('#editFieldModalTypeInput').val(field.getType());

        // TODO: this looks like Eagle.ts::fillParametersTable(), can we make them common
        const allTypes = Utils.findAllKnownTypes(eagle.palettes(), eagle.logicalGraph());

        // delete all options, then iterate through the values in the Eagle.DataType enum, adding each as an option to the select
        $('#editFieldModalTypeSelect').empty();
        for (let dataType of allTypes){
            const li = $('<li></li>');
            const a = $('<a class="dropdown-item" href="#">' + dataType + '</a>');

            a.attr("href", "javascript:eagle.editFieldDropdownClick('" + dataType + "','" + field.getType() + "');");

            if (Utils.dataTypePrefix(field.getType()) === dataType){
                a.addClass("active");
            }

            // add to the html
            li.append(a);
            $('#editFieldModalTypeSelect').append(li);
        }

        // delete all options, then iterate through the values in the Eagle.FieldType enum, adding each as an option to the select
        $('#editFieldModalFieldTypeSelect').empty();
        for (let ft of [Eagle.FieldType.ComponentParameter, Eagle.FieldType.ApplicationArgument, Eagle.FieldType.InputPort, Eagle.FieldType.OutputPort]){
            $('#editFieldModalFieldTypeSelect').append(
                $('<option>', {
                    value: ft,
                    text: ft,
                    selected: field.getFieldType() === ft
                })
            );
        }
        // hide the fieldType select if the fieldType is ComponentParameter, since that can't be changed
        if (field.getFieldType() === Eagle.FieldType.ComponentParameter){
            $('#editFieldModalFieldTypeSelectRow').hide();
        } else {
            $('#editFieldModalFieldTypeSelectRow').show();
        }


        $('#editFieldModalPreciousInputCheckbox').prop('checked', field.isPrecious());

        $('#editFieldModal').data('completed', false);
        $('#editFieldModal').data('callback', callback);
        $('#editFieldModal').data('choices', choices);
        $('#editFieldModal').modal("toggle");

    }

    static requestUserAddCustomRepository(callback : (completed : boolean, repositoryService : string, repositoryName : string, repositoryBranch : string) => void) : void {
        console.log("requestUserAddCustomRepository()");

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

        // check name
        if (repositoryName.trim() == ""){
            $('#gitCustomRepositoryModalRepositoryNameInput').addClass('is-invalid');
            return false;
        }

        // check branch
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
        $('#settingsModal').modal("toggle");
    }

    static showOpenParamsTableModal() : void {
        $('#parameterTableModal').modal("toggle");
    }


    static showShortcutsModal() : void {
        $('#shortcutsModal').modal("toggle");
    }

    static showPalettesModal(eagle: Eagle) : void {
        const token = Eagle.findSettingValue(Utils.GITHUB_ACCESS_TOKEN_KEY);

        if (token === null || token === "") {
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
                    text: port.getIdText(),
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
                    text: port.getIdText(),
                    selected: edge.getDestPortId() === port.getId()
                }));
            }
        }

        $('#editEdgeModalDataTypeInput').val(edge.getDataType());
    }

    static findAllKnownTypes = (palettes : Palette[], graph: LogicalGraph): string[] => {
        const uniqueTypes : string[] = [];

        // build a list from all palettes
        for (const palette of palettes){
            for (const node of palette.getNodes()){
                for (const field of node.getFields()) {
                    Utils._addTypeIfUnique(uniqueTypes, field.getType());
                }
            }
        }

        // add all types in LG nodes
        for (const node of graph.getNodes()){
            for (const field of node.getFields()) {
                Utils._addTypeIfUnique(uniqueTypes, field.getType());
            }
        }

        return uniqueTypes;
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
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }

                // add output port names into the list
                for (const port of node.getOutputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }
            }
        }

        // build a list from all nodes
        for (const node of graph.getNodes()) {
            // add input port names into the list
            for (const port of node.getInputPorts()) {
                if (!port.getIsEvent()){
                    Utils._addPortIfUnique(uniquePorts, port.clone());
                }
            }

            // add output port names into the list
            for (const port of node.getOutputPorts()) {
                if (!port.getIsEvent()) {
                    Utils._addPortIfUnique(uniquePorts, port.clone());
                }
            }

            // add input application input and output ports
            if (node.hasInputApplication()){
                // input ports
                for (const port of node.getInputApplication().getInputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }

                // output ports
                for (const port of node.getInputApplication().getOutputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }
            }

            // add output application input and output ports
            if (node.hasOutputApplication()){
                // input ports
                for (const port of node.getOutputApplication().getInputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }

                // output ports
                for (const port of node.getOutputApplication().getOutputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addPortIfUnique(uniquePorts, port.clone());
                    }
                }
            }
        }

        return uniquePorts;
    }

    static getDataComponentsWithPortTypeList(palettes: Palette[], ineligibleCategories: Eagle.Category[]) : Node[] {
        console.log("getDataComponentsWithPortTypeList", ineligibleCategories);

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

    static getComponentsWithInputsAndOutputs(palettes: Palette[], categoryType: Eagle.CategoryType, numRequiredInputs: number, numRequiredOutputs: number) : Node[] {
        console.log("getDataComponentsWithInputsAndOutputs");

        const result: Node[] = [];

        // add all data components (except ineligible)
        for (const palette of palettes){
            for (const node of palette.getNodes()){
                // skip nodes that are not data components
                if (categoryType === Eagle.CategoryType.Data && !node.isData()){
                    continue;
                }

                // skip nodes that are not application components
                if (categoryType === Eagle.CategoryType.Application && !node.isApplication()){
                    continue;
                }

                // skip nodes that are not group components
                if (categoryType === Eagle.CategoryType.Group && !node.isGroup()){
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

    static getCategoriesWithInputsAndOutputs(palettes: Palette[], categoryType: Eagle.CategoryType, numRequiredInputs: number, numRequiredOutputs: number) : Eagle.Category[] {
        console.log("getDataComponentsWithInputsAndOutputs");

        const result: Eagle.Category[] = [];

        // loop through all categories
        for (const category in Eagle.cData){
            // get category data
            const categoryData = Eagle.getCategoryData(<Eagle.Category>category);


            if (categoryType === Eagle.CategoryType.Data && !categoryData.isData){
                continue;
            }

            // skip nodes that are not application components
            if (categoryType === Eagle.CategoryType.Application && !categoryData.isApplication){
                continue;
            }

            // skip nodes that are not group components
            if (categoryType === Eagle.CategoryType.Group && !categoryData.isGroup){
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

            result.push(<Eagle.Category>category);
        }

        return result;
    }

    static getDataComponentMemory(palettes: Palette[]) : Node {
        console.log("getDataComponentMemory");

        // add all data components (except ineligible)
        for (const palette of palettes){
            for (const node of palette.getNodes()){
                // skip nodes that are not data components
                if (node.getName() === Eagle.Category.Memory){
                    return node;
                }
            }
        }

        return null;
    }

    private static _addPortIfUnique = (ports : Field[], port: Field) : void => {

        // check if the new port matches an existing port (by name and type), if so, abort
        for (const p of ports){
            if (p.getIdText() === port.getIdText() && p.getType() === port.getType()){
                return;
            }
        }

        // otherwise add the port
        ports.push(port);
    }

    private static _addTypeIfUnique = (types: string[], newType: string) : void => {
        for (const t of types){
            if (t === newType){
                return;
            }
        }
        types.push(newType);
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

    /**
     * Returns a list of all fields in the given palette or logical graph
     */
    static getUniqueapplicationArgsList = (diagram : Palette | LogicalGraph) : Field[] => {
        const uniqueapplicationArgs : Field[] = [];

        // build a list from all nodes, add fields into the list
        for (const node of diagram.getNodes()) {
            for (const param of node.getApplicationArguments()) {
                Utils._addFieldIfUnique(uniqueapplicationArgs, param.clone());
            }
        }

        return uniqueapplicationArgs;
    }

    private static _addFieldIfUnique = (fields : Field[], field: Field) : void => {
        // check if the new field matches an existing field (by name and type), if so, abort
        for (const f of fields){
            if (f.getIdText() === field.getIdText() && f.getType() === field.getType()){
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
        // appref
        if (typeof data.modelData !== 'undefined'){
            if (typeof data.modelData.schemaVersion !== 'undefined'){
                if (data.modelData.schemaVersion === Eagle.DALiuGESchemaVersion.OJS){
                    return Eagle.DALiuGESchemaVersion.OJS;
                }
                return data.modelData.schemaVersion;
            }
        }

        return Eagle.DALiuGESchemaVersion.Unknown;
    }

    static portsMatch(port0: Field, port1: Field){
        return port0.getType() === port1.getType();
    }

    static checkPalette(palette: Palette): Errors.Issue[] {
        const results: Errors.Issue[] = [];

        // check for duplicate keys
        const keys: number[] = [];

        for (const node of palette.getNodes()){
            // check existing keys
            if (keys.indexOf(node.getKey()) !== -1){
                results.push(Errors.NoFix("Key " + node.getKey() + " used by multiple components in palette."));
            } else {
                keys.push(node.getKey());
            }
        }

        return results;
    }

    static checkGraph(eagle: Eagle): Errors.ErrorsWarnings {
        const errorsWarnings: Errors.ErrorsWarnings = {warnings: [], errors: []};

        const graph: LogicalGraph = eagle.logicalGraph();

        // check all nodes are valid
        for (const node of graph.getNodes()){
            Node.isValid(eagle, node, false, false, errorsWarnings);
        }

        // check all edges are valid
        for (const edge of graph.getEdges()){
            Edge.isValid(eagle, edge.getId(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), edge.isLoopAware(), edge.isClosesLoop(), false, false, errorsWarnings);
        }

        return errorsWarnings;
    }

    static validateJSON(json : object, version : Eagle.DALiuGESchemaVersion, fileType : Eagle.FileType) : {valid: boolean, errors: string} {
        console.log("validateJSON(): version:", version, " fileType:", fileType);

        const ajv = new Ajv();
        let valid : boolean;

        switch(version){
            case Eagle.DALiuGESchemaVersion.OJS:
                switch(fileType){
                    case Eagle.FileType.Graph:
                    case Eagle.FileType.Palette:
                        valid = ajv.validate(Utils.ojsGraphSchema, json) as boolean;
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

    static isAlpha(ch: string){
        return /^[A-Z]$/i.test(ch);
    }

    static isNumeric(ch: string){
        return /^[0-9]$/i.test(ch);
    }

    static validateIdText(idText: string) : boolean {
        // must start with a letter of underscore character
        if (idText[0] !== "_" && !Utils.isAlpha(idText[0])){
            return false;
        }

        // can only contain alpha-numeric and underscores
        for (let i = 1 ; i < idText.length ; i++){
            if (!Utils.isAlpha(idText[i]) && !Utils.isNumeric(idText[i]) && idText[i] !== "_"){
                return false;
            }
        }

        return true;
    }

    static validateField(type: string, value: string){
        let valid: boolean = true;

        // make sure JSON fields are parse-able
        if (type === Eagle.DataType_Json){
            try {
                JSON.parse(value);
            } catch(e) {
                valid = false;
            }
        }

        return valid;
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

    static getKeyboardShortcutTextByKey = (key: string, addBrackets: boolean) : string => {
        for (const shortcut of Eagle.shortcuts()){
            if (shortcut.key === key){
                let ks = [];
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
        var converter = new Showdown.Converter();
        return converter.makeHtml(markdown);
    }

    static asBool(value: string) : boolean {
        return value.toLowerCase() === "true";
    }

    static fixEdgeType(eagle: Eagle, edgeId: string, newType: string) : void {
        eagle.logicalGraph().findEdgeById(edgeId).setDataType(newType);
    }

    static fixDeleteEdge(eagle: Eagle, edgeId: string): void {
        eagle.logicalGraph().removeEdgeById(edgeId);
    }

    static fixPortType(eagle: Eagle, sourcePort: Field, destinationPort: Field): void {
        destinationPort.setType(sourcePort.getType());
    }

    static fixNodeFieldIds(eagle: Eagle, nodeKey: number){
        const node: Node = eagle.logicalGraph().findNodeByKey(nodeKey);

        for (const field of node.getFields()){
            if (field.getId() === ""){
                field.setId(Utils.uuidv4());
            }
        }
    }

    static fixNodeCategory(eagle: Eagle, node: Node, category: Eagle.Category){
        node.setCategory(category);
    }

    static fixFieldId(eagle: Eagle, field: Field){
        field.setId(Utils.uuidv4());
    }

    static callFixFunc(eagle: Eagle, fixFunc: () => void){
        console.log("callFixFunc");
        fixFunc();
        Utils.postFixFunc(eagle);
    }

    static postFixFunc(eagle: Eagle){
        eagle.selectedObjects.valueHasMutated();
        eagle.logicalGraph().fileInfo().modified = true;

        eagle.checkGraph();
        eagle.undo().pushSnapshot(eagle, "Fix");
    }

    static visitEdge(eagle: Eagle, edgeId: string): void {
        // close errors modal if visible
        $('#errorsModal').modal("hide");

        eagle.setSelection(Eagle.RightWindowMode.Inspector, eagle.logicalGraph().findEdgeById(edgeId), Eagle.FileType.Graph);
    }

    static visitNode(eagle: Eagle, nodeKey: number): void {
        // close errors modal if visible
        $('#errorsModal').modal("hide");

        eagle.setSelection(Eagle.RightWindowMode.Inspector, eagle.logicalGraph().findNodeByKey(nodeKey), Eagle.FileType.Graph);
    }

    // only update result if it is worse that current result
    static worstEdgeError(errorsWarnings: Errors.ErrorsWarnings) : Eagle.LinkValid {
        if (errorsWarnings.warnings.length === 0 && errorsWarnings.errors.length === 0){
            return Eagle.LinkValid.Valid;
        }

        if (errorsWarnings.errors.length !== 0){
            return Eagle.LinkValid.Invalid;
        }

        return Eagle.LinkValid.Warning;
    }
}
