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

import { Category } from './Category';
import { CategoryData } from "./CategoryData";
import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { Edge } from './Edge';
import { Errors } from './Errors';
import { Field } from './Field';
import { FileInfo } from "./FileInfo";
import { GraphConfig } from "./GraphConfig";
import { KeyboardShortcut } from './KeyboardShortcut';
import { LogicalGraph } from './LogicalGraph';
import { Modals } from "./Modals";
import { Node } from './Node';
import { Palette } from './Palette';
import { PaletteInfo } from './PaletteInfo';
import { Repository, RepositoryCommit } from './Repository';
import { Setting } from './Setting';
import { UiModeSystem } from "./UiModes";
import { ParameterTable } from "./ParameterTable";
import { GraphConfigurationsTable } from "./GraphConfigurationsTable";
import { GraphRenderer } from "./GraphRenderer";

export class Utils {
    // Allowed file extensions
    static readonly FILE_EXTENSIONS : string[] = [
        "json",
        "diagram",
        "graph",
        "palette",
        "cfg", // for graph config files
        "md", // for markdown e.g. README.md
        "daliuge", "dlg" // for logical graphs templates containing graph configurations
    ];

    static ojsGraphSchema : object = {};
    static ojsPaletteSchema : object = {};
    static v4GraphSchema : object = {};
    static v4PaletteSchema : object = {};

    static generateNodeId(): NodeId {
        return Utils._uuidv4() as NodeId;
    }

    static generateFieldId(): FieldId {
        return Utils._uuidv4() as FieldId;
    }

    static generateEdgeId(): EdgeId {
        return Utils._uuidv4() as EdgeId;
    }

    static generateGraphConfigId(): GraphConfig.Id {
        return Utils._uuidv4() as GraphConfig.Id;
    }

    static generateRepositoryId(): RepositoryId {
        return Utils._uuidv4() as RepositoryId;
    }

    static generateRepositoryFileId(): RepositoryFileId {
        return Utils._uuidv4() as RepositoryFileId;
    }

    /**
     * Generates a UUID.
     * See https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
     * NOTE: we use the (slightly) less random version that doesn't require the
     *       crypto.getRandomValues() call that is not available in NodeJS
     */

    static _uuidv4() : string {
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

    static generateName(fileType: Eagle.FileType): string {
        return fileType.toString() + "-" + Utils.generateDateTimeString() + "." + Utils.getDiagramExtension(fileType);
    }

    // TODO: check if this is even necessary. it may only have been necessary when we were setting keys (not ids), check now!
    static setEmbeddedApplicationNodeIds(lg: LogicalGraph): void {
        // loop through nodes, look for embedded nodes with null id, create new id
        for (const node of lg.getNodes()){

            // if this node has inputApp, set the inputApp id
            if (node.hasInputApplication()){
                if (node.getInputApplication().getId() === null){
                    node.getInputApplication().setId(Utils.generateNodeId());
                }
            }

            // if this node has outputApp, set the outputApp id
            if (node.hasOutputApplication()){
                if (node.getOutputApplication().getId() === null){
                    node.getOutputApplication().setId(Utils.generateNodeId());
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
            case Eagle.FileType.Palette:
                return 0;
            case Eagle.FileType.Graph:
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
     * Create a new diagram (graph, palette, config).
     */
    static async requestDiagramFilename(fileType : Eagle.FileType): Promise<string> {
        return new Promise(async(resolve, reject) => {
            const defaultName: string = Utils.generateName(fileType);

            let userString;
            try {
                userString = await Utils.requestUserString("New " + fileType, "Enter " + fileType + " name", defaultName, false);
            } catch(error) {
                reject(error);
                return;
            }

            if (userString === ""){
                reject( "Specified name is not valid for new " + fileType);
                return;
            }

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(userString)) {
                userString = userString + "." + Utils.getDiagramExtension(fileType);
            }

            resolve(userString);
        });
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

        // Check if the extension is in the list of allowed extensions
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
            console.warn("Can't determine file type, not a string");
            return Eagle.FileType.Unknown;
        }

        if (fileType.toLowerCase() === "graph"){
            return Eagle.FileType.Graph;
        }
        if (fileType.toLowerCase() === "palette"){
            return Eagle.FileType.Palette;
        }
        if (fileType.toLowerCase() === "json"){
            return Eagle.FileType.JSON;
        }

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
    
    static async httpGet(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url
            })
            .fail((xhr, textStatus) => {
                reject(Utils.parseAjaxError(xhr, textStatus));
            })
            .done((data) => {
                resolve(data);
            });
        });
    }

    static async httpGetJSON(url: string, json: object): Promise<object> {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'GET',
                data: JSON.stringify(json),
                contentType: 'application/json'
            })
            .fail((xhr, textStatus) => {
                reject(Utils.parseAjaxError(xhr, textStatus));
            })
            .done((data) => {
                resolve(data);
            });
        });
    }

    static async httpPost(url : string, data : string): Promise<string> {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'POST',
                data: data,
                processData: false,  // tell jQuery not to process the data
                contentType: false   // tell jQuery not to set contentType
            })
            .fail((xhr, textStatus) => {
                reject(Utils.parseAjaxError(xhr, textStatus));
            })
            .done((data) => {
                resolve(data);
            });
        });
    }

    static async httpPostJSON(url : string, json : object): Promise<string> {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'POST',
                data: JSON.stringify(json),
                contentType: 'application/json'
            })
            .fail((xhr, textStatus) => {
                reject(Utils.parseAjaxError(xhr, textStatus));
            })
            .done((data) => {
                resolve(data);
            });
        });
    }

    static async httpPostJSONString(url : string, jsonString : string): Promise<string> {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'POST',
                data: jsonString,
                contentType: 'application/json'
            })
            .fail((xhr, textStatus) => {
                reject(Utils.parseAjaxError(xhr, textStatus));
            })
            .done((data) => {
                resolve(data);
            });
        });
    }

    static async httpPostForm(url : string, formData : FormData): Promise<string> {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'POST',
                data: formData,
                processData: false,  // tell jQuery not to process the data
                contentType: false   // tell jQuery not to set contentType
            })
            .fail((xhr, textStatus) => {
                reject(Utils.parseAjaxError(xhr, textStatus));
            })
            .done((data) => {
                resolve(data);
            });
        });
    }

    // https://stackoverflow.com/questions/6792878/jquery-ajax-error-function
    static parseAjaxError(xhr: JQuery.jqXHR, textStatus: JQuery.Ajax.ErrorTextStatus): string {
        if (xhr.status === 0) {
            return "Unable to connect to server.";
        } else if (xhr.status === 404) {
            return "Requested page not found. [404]";
        } else if (xhr.status === 500) {
            return "Internal Server Error [500].";
        } else if (textStatus === "parsererror") {
            return "Requested JSON parse failed.";
        } else if (textStatus === "timeout") {
            return "Time out error.";
        } else if (textStatus === "abort") {
            return "Ajax request aborted.";
        } else {
            return "Uncaught Error. " + xhr.responseText;
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
        $('#messageModalTitle').text(title);
        $('#messageModalMessage').html(message);
        $('#messageModal').modal("toggle");
    }

    static showErrorsModal(title: string){
        const errors: Errors.Issue[] = Errors.getErrors();
        const warnings: Errors.Issue[] = Errors.getWarnings();

        console.log("showErrorsModal() errors:", errors.length, "warnings:", warnings.length);

        $('#issuesDisplayTitle').text(title);

        // hide whole errors or warnings sections if none are found
        $('#issuesDisplayErrorsAccordionItem').toggle(errors.length > 0);
        $('#issuesDisplayWarningsAccordionItem').toggle(warnings.length > 0);

        $('#issuesDisplay').modal("show");
    }

    /**
     * Show a temporary notification message to the user at the bottom of the graph display area
     * @param title The title of the notification
     * @param message The body of the notification
     * @param type The type of the notification. This changes the color of the notification
     * @param developer If true, this notification is intended for developers-only. Regular users are unlikely to be able to do anything useful with the information. Users enable/disable display of developer-only notifications via a setting on the Developer tab of the Settings modal.
     */
    static showNotification(title : string, message : string, type : "success" | "info" | "warning" | "danger", developer: boolean = false) : void {
        // display in console
        switch(type){
            case "danger":
                console.error(title, message);
                break;
            case "warning":
                console.warn(title, message);
                break;
        }

        // if this is a message intended for developers, check whether display of those messages is enabled
        if (developer && !Setting.findValue(Setting.SHOW_DEVELOPER_NOTIFICATIONS)){
            return;
        }

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

    static notifyUserOfEditingIssue(fileType: Eagle.FileType, action: string){
        const uiMode = UiModeSystem.getActiveUiMode().getName();
        let message: string;

        if (fileType === Eagle.FileType.Unknown){
            message = "Action is not permitted in the current UI mode (" + uiMode + ")";
        } else {
            message = fileType + " editing is not permitted in the current UI mode (" + uiMode + ")";
        }
        Utils.showNotification(action, message, "warning");
    }

    static requestUserString(title : string, message : string, defaultString: string, isPassword: boolean): Promise<string> {
        return new Promise(async(resolve, reject) => {
            $('#inputModalTitle').text(title);
            $('#inputModalMessage').html(message);
            $('#inputModalInput').attr('type', isPassword ? 'password' : 'text');

            $('#inputModalInput').val(defaultString);

            // store data about the choices, callback, result on the modal HTML element
            // so that the info is available to event handlers
            $('#inputModal').data('completed', false);
            $('#inputModal').data('callback', (completed : boolean, userString : string): void => {
                if (!completed){
                    reject("Utils.requestUserString() aborted by user");
                } else {
                    resolve(userString);
                }
            });
            $('#inputModal').data('returnType', "string");

            $('#inputModal').modal("toggle");
        });
    }

    static requestUserText(title : string, message : string, defaultText: string, readonly: boolean = false) : Promise<string> {
        return new Promise(async(resolve, reject) => {
            $('#inputTextModalTitle').text(title);
            $('#inputTextModalMessage').html(message);

            $('#inputTextModalInput').val(defaultText);
            $('#inputTextModalInput').prop('readonly', readonly);

            // store the callback, result on the modal HTML element
            // so that the info is available to event handlers
            $('#inputTextModal').data('completed', false);
            $('#inputTextModal').data('callback', (completed : boolean, userText : string) => {
                if (!completed){
                    reject("Utils.requestUserText() aborted by user");
                } else {
                    resolve(userText);
                }
            });

            $('#inputTextModal').modal("toggle");
        });
    }

    static requestUserCode(language: "json"|"python"|"text", title: string, defaultText: string, readonly: boolean = false): Promise<string> {
        return new Promise(async(resolve, reject) => {
            // set title
            $('#inputCodeModalTitle').text(title);

            // get language configuration
            let mode;
            switch(language){
                case "json":
                    mode = "javascript";
                    break;
                case "python":
                    mode = "python"
                    break;
                case "text":
                    mode = "null"
                    break;
                default:
                    console.warn("requestUserCode(): Unsupported language:", language);
                    mode = "null"
                    break;
            }

            const editor = $('#inputCodeModal').data('editor');
            editor.setOption('readOnly', readonly);
            editor.setOption('mode', mode);
            editor.setValue(defaultText);

            // store the callback, result on the modal HTML element
            // so that the info is available to event handlers
            $('#inputCodeModal').data('completed', false);
            $('#inputCodeModal').data('callback', (completed : boolean, userText : string) => {
                if (!completed){
                    reject("Utils.requestUserCode() aborted by user");
                } else {
                    resolve(userText);
                }
            });

            $('#inputCodeModal').modal("toggle");
        })
    }

    static requestUserMarkdown(title: string, defaultText: string, editMode: boolean = false): Promise<string> {
        return new Promise(async(resolve, reject) => {
            $('#inputMarkdownModalTitle').text(title);

            // show or hide sections based on editMode
            Modals.toggleMarkdownEditMode(editMode);

            // initialise editor
            const editor = $('#inputMarkdownModal').data('editor');
            editor.setOption('readOnly', false);
            editor.setOption('mode', "markdown");
            editor.setValue(defaultText);
            Modals.setMarkdownContent(defaultText);

            // store the callback, result on the modal HTML element
            // so that the info is available to event handlers
            $('#inputMarkdownModal').data('completed', false);
            $('#inputMarkdownModal').data('callback', (completed : boolean, userMarkdown : string) => {
                if (!completed){
                    reject("Utils.requestUserMarkdown() aborted by user");
                } else {
                    resolve(userMarkdown);
                }
            });

            $('#inputMarkdownModal').modal("toggle");
        });
    }

    static requestUserNumber(title : string, message : string, defaultNumber: number) : Promise<number> {
        return new Promise(async(resolve, reject) => {
            $('#inputModalTitle').text(title);
            $('#inputModalMessage').html(message);
            $('#inputModalInput').val(defaultNumber);

            // store data about the choices, callback, result on the modal HTML element
            // so that the info is available to event handlers
            $('#inputModal').data('completed', false);
            $('#inputModal').data('callback', (completed : boolean, userNumber : number) => {
                if (!completed){
                    reject("Utils.requestUserNumber() aborted by user");
                } else {
                    resolve(userNumber);
                }
            });
            $('#inputModal').data('returnType', "number");

            $('#inputModal').modal("toggle");
        });
    }

    // , callback : (completed : boolean, userChoiceIndex : number, userCustomString : string) => void
    static async requestUserChoice(title : string, message : string, choices : string[], selectedChoiceIndex : number, allowCustomChoice : boolean, customChoiceText : string): Promise<string> {
        return new Promise(async(resolve, reject) => {
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
            $('#choiceModal').data('callback', function(completed: boolean, choice: string): void {
                if (completed){
                    resolve(choice);
                } else {
                    reject("Utils.requestUserChoice() aborted by user");
                }
            });
            $('#choiceModal').data('choices', choices);

            // trigger the change event, so that the event handler runs and disables the custom text entry field if appropriate
            $('#choiceModalSelect').trigger('change');
            $('#choiceModal').modal("toggle");
            $('#choiceModalSelect').click()
        });
    }

    static async requestUserConfirm(title : string, message : string, affirmativeAnswer : string, negativeAnswer : string, confirmSetting: Setting): Promise<void> {
        return new Promise(async(resolve, reject) => {
            $('#confirmModalTitle').text(title);
            $('#confirmModalMessage').html(message);
            $('#confirmModalAffirmativeAnswer').text(affirmativeAnswer);
            $('#confirmModalNegativeAnswer').text(negativeAnswer);

            $('#confirmModalDontShowAgain button').off()
            if(confirmSetting === null){
                $('#confirmModalDontShowAgain').hide()
            }else{
                $('#confirmModalDontShowAgain').show()
                $('#confirmModalDontShowAgain button').text('check_box_outline_blank')
                $('#confirmModalDontShowAgain button').on('click', function(){
                    confirmSetting.toggle();
                    if($('#confirmModalDontShowAgain button').text() === 'check_box_outline_blank'){
                        $('#confirmModalDontShowAgain button').text('check_box')
                    }else{
                        $('#confirmModalDontShowAgain button').text('check_box_outline_blank')
                    }
                })
            }

            $('#confirmModal').data('callback', function(completed: boolean){
                if (completed){
                    resolve();
                } else {
                    reject("Utils.requestUserConfirm() aborted by user");
                }
            });

            $('#confirmModal').modal("toggle");
        });
    }

    // , callback : (completed : boolean, repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) => void ) : void {
    static async requestUserGitCommit(defaultRepository : Repository, repositories: Repository[], filePath: string, fileName: string, fileType: Eagle.FileType): Promise<RepositoryCommit> {
        return new Promise(async(resolve, reject) => {
            $('#gitCommitModal').data('completed', false);
            $('#gitCommitModal').data('fileType', fileType);
            $('#gitCommitModal').data('callback', function(completed : boolean, repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string): void {
                if (completed){
                    resolve(new RepositoryCommit(repositoryService, repositoryName, repositoryBranch, filePath, fileName, commitMessage));
                } else {
                    reject("Utils.requestUserGitCommit() aborted by user");
                }
            });
            $('#gitCommitModal').data('repositories', repositories);
            $('#gitCommitModal').modal("toggle");

            //
            let defaultRepositoryService: Repository.Service = Repository.Service.Unknown;
            if (defaultRepository !== null){
                defaultRepositoryService = defaultRepository.service;
            }

            // remove existing options from the repository service select tag
            $('#gitCommitModalRepositoryServiceSelect').empty();

            // add options to the repository service select tag
            $('#gitCommitModalRepositoryServiceSelect').append($('<option>', {
                value: Repository.Service.GitHub,
                text: Repository.Service.GitHub,
                selected: defaultRepositoryService === Repository.Service.GitHub
            }));
            $('#gitCommitModalRepositoryServiceSelect').append($('<option>', {
                value: Repository.Service.GitLab,
                text: Repository.Service.GitLab,
                selected: defaultRepositoryService === Repository.Service.GitLab
            }));

            Utils.updateGitCommitRepositoriesList(repositories, defaultRepository);

            $('#gitCommitModalFilePathInput').val(filePath);
            $('#gitCommitModalFileNameInput').val(fileName);

            // validate fileName input
            Modals.validateCommitModalFileNameInputText();
        });
    }

    static requestUserEditField(eagle: Eagle, field: Field, title: string, choices: string[]): Promise<Field> {
        return new Promise(async(resolve, reject) => {
            // set the currently edited field
            eagle.currentField(field);

            $('#editFieldModal').data('completed', false);
            $('#editFieldModal').data('callback', (completed: boolean, field: Field): void => {
                resolve(field);
            });
            $("#editFieldModalTitle").html(title);
            $('#editFieldModal').data('choices', choices);
            $('#editFieldModal').modal("toggle");
        });
    }

    static requestUserAddCustomRepository(): Promise<Repository> {
        return new Promise(async(resolve, reject) => {
            $('#gitCustomRepositoryModalRepositoryNameInput').val("");
            $('#gitCustomRepositoryModalRepositoryBranchInput').val("");

            $('#gitCustomRepositoryModal').data('completed', false);
            $('#gitCustomRepositoryModal').data('callback', (completed : boolean, repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string) => {
                if (!completed){
                    reject("Utils.requestUserAddCustomRepository aborted by user");
                } else {
                    resolve(new Repository(repositoryService, repositoryName, repositoryBranch, false));
                }
            });
            $('#gitCustomRepositoryModal').modal("toggle");
        });
    }

    static validateCustomRepository() : boolean {
        const repositoryService : string = <string>$('#gitCustomRepositoryModalRepositoryServiceSelect').val();
        const repositoryName : string = <string>$('#gitCustomRepositoryModalRepositoryNameInput').val();
        const repositoryBranch : string = <string>$('#gitCustomRepositoryModalRepositoryBranchInput').val();

        $('#gitCustomRepositoryModalRepositoryNameInput').removeClass('is-invalid');
        $('#gitCustomRepositoryModalRepositoryBranchInput').removeClass('is-invalid');

        // check service
        if (repositoryService.trim() !== Repository.Service.GitHub && repositoryService.trim() !== Repository.Service.GitLab){
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
        // if no tab is selected yet, default to the first tab
        if(!$(".settingCategoryActive").length){
            $(".settingsModalButton").first().trigger("click")
        }

        $('#settingsModal').modal("show");
    }

    static hideSettingsModal() : void {
        $('#settingsModal').modal("hide");
    }

    static showShortcutsModal() : void {
        if(!Eagle.shortcutModalCooldown || Date.now() >= (Eagle.shortcutModalCooldown + 500)){
            Eagle.shortcutModalCooldown = Date.now()
            $('#shortcutsModal').modal("show");
        }
    }

    static hideShortcutsModal() : void {
        $('#shortcutsModal').modal("hide");
    }

    static closeErrorsModal() : void {
        $('#issuesDisplay').modal("hide");
    }

    static preparePalette(palette: Palette, paletteListItem: {name:string, filename:string, readonly:boolean, expanded: boolean}) : void {
        palette.fileInfo().name = paletteListItem.name;
        palette.fileInfo().readonly = paletteListItem.readonly;
        palette.fileInfo().builtIn = true;
        palette.fileInfo().downloadUrl = paletteListItem.filename;
        palette.fileInfo().type = Eagle.FileType.Palette;
        palette.fileInfo().repositoryService = Repository.Service.Url;

        palette.expanded(paletteListItem.expanded);
    }

    static async showPalettesModal(eagle: Eagle): Promise<void> {
        const token = Setting.findValue(Setting.GITHUB_ACCESS_TOKEN_KEY);

        if (token === null || token === "") {
            Utils.showUserMessage("Access Token", "The GitHub access token is not set! To access GitHub repository, set the token via settings.");
            return;
        }

        // add parameters in json data
        const jsonData = {
            service: Setting.findValue(Setting.EXPLORE_PALETTES_SERVICE),
            repository: Setting.findValue(Setting.EXPLORE_PALETTES_REPOSITORY),
            branch: Setting.findValue(Setting.EXPLORE_PALETTES_BRANCH),
            token: token,
        };

        // empty the list of palettes prior to (re)fetch
        eagle.explorePalettes().clear();

        $('#explorePalettesModal').modal("toggle");

        let data: any;
        try {
            data = await Utils.httpPostJSON('/getExplorePalettes', jsonData);
        } catch (error) {
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
            explorePalettes.push(new PaletteInfo(jsonData.service, jsonData.repository, jsonData.branch, palette.name, palette.path));
        }

        // process files into a more complex structure
        eagle.explorePalettes().initialise(explorePalettes);
    }

    static showModelDataModal(title: string, fileInfo: FileInfo) : void {
        const eagle = Eagle.getInstance();
        eagle.currentFileInfoTitle(title);
        eagle.currentFileInfo(fileInfo);

        $('#modelDataModal').modal("toggle");
    }

    static hideModelDataModal(){
        $('#modelDataModal').modal("hide");
    }

    static requestUserEditEdge(edge: Edge, logicalGraph: LogicalGraph): Promise<Edge> {
        return new Promise(async(resolve, reject) => {
            Utils.updateEditEdgeModal(edge, logicalGraph);

            $('#editEdgeModal').data('completed', false);
            $('#editEdgeModal').data('callback', (completed: boolean, edge: Edge): void => {
                if (!completed){
                    reject("Utils.requestUserEditEdge() aborted by user");
                } else {
                    resolve(edge);
                }
            });

            $('#editEdgeModal').data('edge', edge);
            $('#editEdgeModal').data('logicalGraph', logicalGraph);

            $('#editEdgeModal').modal("toggle");
        });
    }

    static updateEditEdgeModal(edge: Edge, logicalGraph: LogicalGraph): void {
        let srcNode: Node = undefined;
        let destNode: Node = undefined;

        // TODO: make local copy of edge, so that original is not changed! original might come from inside the active graph

        // populate UI with current edge data
        // add src node keys
        $('#editEdgeModalSrcNodeIdSelect').empty();
        for (const node of logicalGraph.getNodes()){
            // if node itself can have output ports, add the node to the list
            if (node.canHaveOutputs()){
                $('#editEdgeModalSrcNodeIdSelect').append($('<option>', {
                    value: node.getId(),
                    text: node.getName(),
                    selected: edge.getSrcNode().getId() === node.getId()
                }));
            }

            // add input application node, if present
            if (node.hasInputApplication()){
                const inputApp = node.getInputApplication();

                $('#editEdgeModalSrcNodeIdSelect').append($('<option>', {
                    value: inputApp.getId(),
                    text: inputApp.getName(),
                    selected: edge.getSrcNode().getId() === inputApp.getId()
                }));
            }

            // add output application node, if present
            if (node.hasOutputApplication()){
                const outputApp = node.getOutputApplication();

                $('#editEdgeModalSrcNodeIdSelect').append($('<option>', {
                    value: outputApp.getId(),
                    text: outputApp.getName(),
                    selected: edge.getSrcNode().getId() === outputApp.getId()
                }));
            }
        }

        // make sure srcNode reflects what is actually selected in the UI
        // TODO: validate id
        const srcNodeId: NodeId = $('#editEdgeModalSrcNodeIdSelect').val().toString() as NodeId;

        if (srcNodeId !== null){
            srcNode = logicalGraph.getNodeById(srcNodeId);
        }

        // check that source node was found, if not, disable SrcPortIdSelect?
        $('#editEdgeModalSrcPortIdSelect').empty();
        if (typeof srcNode === 'undefined'){
            $('#editEdgeModalSrcPortIdSelect').attr('disabled', 'true');
        } else {
            // add src port ids
            for (const port of srcNode.getOutputPorts()){
                $('#editEdgeModalSrcPortIdSelect').append($('<option>', {
                    value: port.getId(),
                    text: port.getDisplayText(),
                    selected: edge.getSrcPort().getId() === port.getId()
                }));
            }
        }

        // add dest node keys
        $('#editEdgeModalDestNodeIdSelect').empty();
        for (const node of logicalGraph.getNodes()){
            if (node.canHaveInputs()){
                $('#editEdgeModalDestNodeIdSelect').append($('<option>', {
                    value: node.getId(),
                    text: node.getName(),
                    selected: edge.getDestNode().getId() === node.getId()
                }));
            }

            // input application node, if present
            if (node.hasInputApplication()){
                const inputApp = node.getInputApplication();

                $('#editEdgeModalDestNodeIdSelect').append($('<option>', {
                    value: inputApp.getId(),
                    text: inputApp.getName(),
                    selected: edge.getDestNode().getId() === inputApp.getId()
                }));
            }

            // output application node, if present
            if (node.hasOutputApplication()){
                const outputApp = node.getOutputApplication();

                $('#editEdgeModalDestNodeIdSelect').append($('<option>', {
                    value: outputApp.getId(),
                    text: outputApp.getName(),
                    selected: edge.getDestNode().getId() === outputApp.getId()
                }));
            }
        }

        // make sure srcNode reflects what is actually selected in the UI
        const destNodeId: NodeId = $('#editEdgeModalDestNodeIdSelect').val().toString() as NodeId;

        if (destNodeId !== null){
            destNode = logicalGraph.getNodeById(destNodeId);
        }

        // check that dest node was found, if not, disable DestPortIdSelect?
        $('#editEdgeModalDestPortIdSelect').empty();
        if (typeof destNode === 'undefined'){
            $('#editEdgeModalDestPortIdSelect').attr('disabled', 'true');
        } else {
            // add dest port ids
            for (const port of destNode.getInputPorts()){
                $('#editEdgeModalDestPortIdSelect').append($('<option>', {
                    value: port.getId(),
                    text: port.getDisplayText(),
                    selected: edge.getDestPort().getId() === port.getId()
                }));
            }
        }

        // update the loopAware and closesLoop checkboxes
        $('#editEdgeModalLoopAwareCheckbox').prop('checked', edge.isLoopAware());
        $('#editEdgeModalClosesLoopCheckbox').prop('checked', edge.isClosesLoop());
    }

    /**
     * Returns a list of unique port names (except event ports)
     */
    static getUniquePortsList(palettes : Palette[], graph: LogicalGraph) : Field[] {
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

    static getCategoriesWithInputsAndOutputs(categoryType: Category.Type) : Category[] {
        const eagle = Eagle.getInstance();

        // get a reference to the builtin palette
        const builtinPalette: Palette = eagle.findPalette(Palette.BUILTIN_PALETTE_NAME, false);
        if (builtinPalette === null){
            // if no built-in palette is found, then build a list from the EAGLE categoryData
            console.warn("Could not find builtin palette", Palette.BUILTIN_PALETTE_NAME);
            return Utils.buildComponentList((cData: Category.CategoryData) => {return cData.categoryType === categoryType});
        }

        const matchingNodes = builtinPalette.getNodesByCategoryType(categoryType)
        const matchingCategories : Category[] = []

        matchingNodes.forEach(function(node){
            for(const x of matchingCategories){
                if(node.getCategory() === x){
                    continue
                }
            }
            matchingCategories.push(node.getCategory())
        })

        return matchingCategories;
    }

    static getPaletteComponentByName(name: string) : Node {
        const eagle: Eagle = Eagle.getInstance();

        // add all data components (except ineligible)
        for (const palette of eagle.palettes()){
            for (const node of palette.getNodes()){
                // skip nodes that are not data components
                if (node.getName() === name){
                    return node;
                }
            }
        }

        return undefined;
    }

    static getPaletteComponentById(id: string) : Node | undefined {
        const eagle: Eagle = Eagle.getInstance();

        // add all data components (except ineligible)
        for (const palette of eagle.palettes()){
            for (const node of palette.getNodes()){
                // skip nodes that are not data components
                if (node.getId() === id){
                    return node;
                }
            }
        }

        return undefined;
    }

    static getComponentsWithMatchingPort(nodes:Node[], input: boolean, type: string) : Node[] {
        const result: Node[] = [];

        // no destination, ask user to choose a new node
        const isData: boolean = GraphRenderer.portDragSourceNode().getCategoryType() === Category.Type.Data;

        for (const node of nodes){
            // skip data nodes if not eligible
            if (isData && node.getCategoryType() === Category.Type.Data){
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

        return result
    }

    static addTypeIfUnique(types: string[], newType: string) : void {
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
    static getUniqueFields(diagram : Palette | LogicalGraph) : Field[] {
        const uniqueFields : Field[] = [];

        // build a list from all nodes, add fields into the list
        for (const node of diagram.getNodes()) {
            for (const field of node.getFields().values()) {
                Utils._addFieldIfUnique(uniqueFields, field.clone());
            }
        }

        return uniqueFields;
    }

    /**
     * Returns a list of all fields in the given palette or logical graph, of a particular type
     */
    static getUniqueFieldsOfType(diagram : Palette | LogicalGraph, parameterType: Daliuge.FieldType) : Field[] {
        const uniqueFields : Field[] = [];

        // build a list from all nodes, add fields into the list
        for (const node of diagram.getNodes()) {
            for (const field of node.getFields().values()) {
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

    static getRightWindowWidth() : number {
        if(Eagle.getInstance().eagleIsReady() && !Setting.findValue(Setting.RIGHT_WINDOW_VISIBLE)){
            return 0
        }
        return Setting.findValue(Setting.RIGHT_WINDOW_WIDTH)
    }

    static setRightWindowWidth(width : number) : void {
        Setting.find(Setting.RIGHT_WINDOW_WIDTH).setValue(width)
        UiModeSystem.saveToLocalStorage()
    }

    static getLeftWindowWidth() : number {
        const leftWindowDisabled = !Setting.findValue(Setting.ALLOW_GRAPH_EDITING) && !Setting.findValue(Setting.ALLOW_PALETTE_EDITING)

        if(Eagle.getInstance().eagleIsReady() && !Setting.findValue(Setting.LEFT_WINDOW_VISIBLE) || leftWindowDisabled){
            return 0
        }
        return Setting.findValue(Setting.LEFT_WINDOW_WIDTH)
    }

    static setLeftWindowWidth(width : number) : void {
        Setting.find(Setting.LEFT_WINDOW_WIDTH).setValue(width)
        UiModeSystem.saveToLocalStorage()
    }

    static calculateBottomWindowHeight() : number {
        //this function exists to prevent the bottom window height value from exceeding its max height value. 
        //if eagle isnt ready or the window is hidden just return 0
        //TODO This function is only needed for the transition perdiod from pixels to vh. We can get rid of this in the future.
        if(!Eagle.getInstance().eagleIsReady()){
            return 0
        }

        //if the bottom window height set is too large, just return the max allowed height
        if(Setting.findValue(Setting.BOTTOM_WINDOW_HEIGHT)>80){
            return 80
        }

        //else return the actual height
        return Setting.findValue(Setting.BOTTOM_WINDOW_HEIGHT)
    }

    static getBottomWindowHeight() : number {
        if(Eagle.getInstance().eagleIsReady() && !Setting.findValue(Setting.BOTTOM_WINDOW_VISIBLE)){
            return 0
        }
        return Setting.findValue(Setting.BOTTOM_WINDOW_HEIGHT)
    }

    static setBottomWindowHeight(height : number) : void {
        Setting.find(Setting.BOTTOM_WINDOW_HEIGHT).setValue(height)
        UiModeSystem.saveToLocalStorage()
    }

    static getInspectorOffset() : number {
        const offset = 10
        const statusBarAndOffsetHeightVH = ((($('#statusBar').height() + offset) / window.innerHeight)*100)
        return this.getBottomWindowHeight() + statusBarAndOffsetHeightVH
    }

    static getLocalStorageKey(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string) : string {
        switch (repositoryService){
            case Repository.Service.GitHub:
                return repositoryName + "|" + repositoryBranch + ".github_repository_and_branch";
            case Repository.Service.GitLab:
                return repositoryName + "|" + repositoryBranch + ".gitlab_repository_and_branch";
            default:
                return null;
        }
    }

    static getLocalStorageValue(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string) : string {
        return repositoryName+"|"+repositoryBranch;
    }

    static buildComponentList(filter: (cData: Category.CategoryData) => boolean) : Category[] {
        const result : Category[] = [];

        for (const category in CategoryData.cData){
            const cData = CategoryData.getCategoryData(<Category>category);
            if (filter(cData)){
                result.push(<Category>category);
            }
        }

        return result;
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

        console.warn("Can't determine filetype");
        return Eagle.FileType.Unknown;
    }

    static determineEagleVersion(data: any): string {
        if (typeof data.modelData !== 'undefined'){
            if (typeof data.modelData.eagleVersion !== 'undefined'){
                return data.modelData.eagleVersion;
            }
        }

        return "v-1.-1.-1";
    }

    // return true iff version0 is newer than version1
    static newerEagleVersion(version0: string, version1: string){
        if (version0 === "Unknown" || version1 === "Unknown"){
            return false;
        }

        const v0 = version0.split('v')[1].split('.').map(Number);
        const v1 = version1.split('v')[1].split('.').map(Number);

        return (
            v0[0] > v1[0] ||
            ((v0[0] === v1[0]) && (v0[1] > v1[1])) ||
            ((v0[0] === v1[0]) && (v0[1] === v1[1]) && (v0[2] > v1[2]))
        )
    }

    static determineSchemaVersion(data: any): Setting.SchemaVersion {
        if (typeof data.modelData !== 'undefined'){
            if (typeof data.modelData.schemaVersion !== 'undefined'){
                return data.modelData.schemaVersion;
            }
        }

        return Setting.SchemaVersion.Unknown;
    }

    static portsMatch(port0: Field, port1: Field){
        return Utils.typesMatch(port0.getType(), port1.getType());
    }

    static typesMatch(type0: string, type1: string){
        // check for undefined
        if (typeof type0 === "undefined" || typeof type1 === "undefined"){
            //console.warn("typesMatch(): matching value undefined (type0:", type0, "type1:", type1, ")");
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
        const errorsWarnings: Errors.ErrorsWarnings = {warnings: [], errors: []};
        const paletteIssues : {issue:Errors.Issue, validity:Errors.Validity}[]=[]
        // check for duplicate keys
        const keys: NodeId[] = [];

        for (const node of palette.getNodes()){
            // check existing keys
            if (keys.indexOf(node.getId()) !== -1){
                errorsWarnings.errors.push(
                    Errors.ShowFix(
                        "Node (" + node.getName() + ") within palette (" + palette.fileInfo().name + ") has id already used by at least one other component.",
                        function(){Utils.showNode(Eagle.getInstance(), Eagle.FileType.Palette, node)},
                        function(){Utils.generateNewNodeId(palette, node)},
                        "Generate new id for " + node.getName()
                    )
                );
            } else {
                keys.push(node.getId());
            }
        }

        // check all nodes are valid
        for (const node of palette.getNodes()){
            Node.isValid(node, Eagle.FileType.Palette);
            paletteIssues.push(...node.getIssues())
            // errorsWarnings.errors.push(...nodeErrorsWarnings.errors)
            // errorsWarnings.warnings.push(...nodeErrorsWarnings.warnings)
        }

        for(const error of paletteIssues){
            if(error.validity === Errors.Validity.Error){
                errorsWarnings.errors.push(error.issue)
            }else{
                errorsWarnings.warnings.push(error.issue)
            }
        }

        return errorsWarnings;
    }

    static checkGraph(eagle: Eagle): void {
        const graph: LogicalGraph = eagle.logicalGraph();

        LogicalGraph.isValid();

        // check all nodes are valid
        for (const node of graph.getNodes()){
            Node.isValid(node, Eagle.FileType.Graph);
        }

        // check all edges are valid
        for (const edge of graph.getEdges().values()){
            Edge.isValid(eagle, false, edge.getId(), edge.getSrcNode().getId(), edge.getSrcPort().getId(), edge.getDestNode().getId(), edge.getDestPort().getId(), edge.isLoopAware(), edge.isClosesLoop(), false, false, {warnings: [], errors: []});
        }
    }

    static gatherGraphErrors(): Errors.ErrorsWarnings {
        const eagle = Eagle.getInstance()
        const errorsWarnings: Errors.ErrorsWarnings = {warnings: [], errors: []};
        const graphIssues : {issue:Errors.Issue, validity:Errors.Validity}[] = []
        const graph : LogicalGraph = eagle.logicalGraph()

        //gather all the errors
        //from nodes
        for(const node of graph.getNodes()){
            graphIssues.push(...node.getIssues())
            
            //from fields
            for(const field of node.getFields().values()){
                graphIssues.push(...field.getIssues())
            }

            //embedded input applications and their fields
            if(node.hasInputApplication()){
                graphIssues.push(...node.getInputApplication().getIssues().values())
                
                for(const field of node.getInputApplication().getFields().values()){
                    graphIssues.push(...field.getIssues())
                }
            }

            //embedded output applications and their fields
            if(node.hasOutputApplication()){
                graphIssues.push(...node.getOutputApplication().getIssues().values())
                
                for( const field of node.getOutputApplication().getFields().values()){
                    graphIssues.push(...field.getIssues())
                }
            }
        }

        // from edges
        for (const edge of graph.getEdges().values()){
            graphIssues.push(...edge.getIssues())
        }

        //from logical graph
        graphIssues.push(...graph.getIssues())

        //sort all issues into warnings or errors
        for(const error of graphIssues){
            if(error.validity === Errors.Validity.Error || error.validity === Errors.Validity.Impossible || error.validity === Errors.Validity.Unknown){
                errorsWarnings.errors.push(error.issue)
            }else{
                errorsWarnings.warnings.push(error.issue)
            }
        }

        return errorsWarnings;
    }

    // validate json
    static validateJSON(jsonString: string, fileType: Eagle.FileType, version: Setting.SchemaVersion){
        // if validation disabled, just return true
        if (Setting.findValue(Setting.DISABLE_JSON_VALIDATION)){
            return;
        }

        const jsonObject = JSON.parse(jsonString);
        const validatorResult : {valid: boolean, errors: string} = Utils._validateJSON(jsonObject, version, fileType);
        if (!validatorResult.valid){
            Utils.showNotification("Error",  "JSON Output failed validation against internal JSON schema, saving anyway" + "<br/>" + validatorResult.errors, "danger", true);
        }
    }

    static _validateJSON(json: any, version: Setting.SchemaVersion, fileType: Eagle.FileType) : {valid: boolean, errors: string} {
        const ajv = new Ajv();
        let valid : boolean;

        switch(version){
            case Setting.SchemaVersion.OJS:
                switch(fileType){
                    case Eagle.FileType.Graph:
                        valid = ajv.validate(Utils.ojsGraphSchema, json) as boolean;
                        break;
                    case Eagle.FileType.Palette:
                        valid = ajv.validate(Utils.ojsPaletteSchema, json) as boolean;
                        break;
                    default:
                        console.warn("Unknown fileType:", fileType, "version:", version, "Unable to validate JSON");
                        valid = true;
                        break;
                }
                break;
            case Setting.SchemaVersion.V4:
                switch(fileType){
                    case Eagle.FileType.Graph:
                        valid = ajv.validate(Utils.v4GraphSchema, json) as boolean;
                        break;
                    case Eagle.FileType.Palette:
                        valid = ajv.validate(Utils.v4PaletteSchema, json) as boolean;
                        break;
                    default:
                        console.warn("Unknown fileType:", fileType, "version:", version, "Unable to validate JSON");
                        valid = true;
                        break;
                }
                break;
            default:
                console.warn("Unknown format for validation (" + version + ")");
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
        if (typeof(type) === "undefined"){
            return false;
        }

        if (type.trim() === ""){
            return false;
        }

        return true;
    }

    static async downloadFile(data : string, fileName : string) : Promise<void> {
        return new Promise(async(resolve) => {
            // NOTE: this stuff is a hacky way of saving a file locally
            const blob = new Blob([data]);
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            link.onclick = function(){
                document.body.removeChild(link);
                resolve();
            };
            document.body.appendChild(link);
            link.click();
        });
    }


    static nodesOverlap(n0x: number, n0y: number, n0radius: number, n1x: number, n1y: number, n1radius: number) : boolean {
        const dx = n0x - n1x;
        const dy = n0y - n1y;
        const distance = Math.sqrt(dx*dx + dy*dy);

        return distance <= (n0radius + n1radius);
    }

    static nodeCentroidOverlaps(constructX: number, constructY: number, constructRadius: number, nodeX: number, nodeY: number) : boolean {
        const dx = constructX - nodeX;
        const dy = constructY - nodeY;
        const distance = Math.sqrt(dx*dx + dy*dy);
        return distance <= constructRadius;
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

    static positionToNodeDistance(positionX: number, positionY: number, node: Node): number {
        // first determine the distance between the position and node center
        const dx = node.getPosition().x - positionX;
        const dy = node.getPosition().y - positionY;
        let distance = Math.sqrt(dx*dx + dy*dy);

        // then subtract the radius, limit to zero
        distance = Math.max(distance - node.getRadius(), 0);
        return distance;
    }

    static async userChoosePalette(paletteNames : string[]) : Promise<string> {
        return new Promise<string>(async (resolve, reject) => {

            // ask user to select a palette
            let userChoice: string;
            try {
                userChoice = await Utils.requestUserChoice("Choose Palette", "Please select the palette you'd like to save", paletteNames, 0, false, "");
            } catch (error) {
                reject(error);
                return;
            }

            // resolve with chosen palette name
            resolve(userChoice);
        });
    }

    static async userEnterCommitMessage(modalMessage: string) : Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // request commit message from the user
            let userString;
            try {
                userString = Utils.requestUserString("Saving to git", modalMessage, "", false);
            } catch (error){
                reject(error);
                return;
            }
            resolve(userString);
        });
    }

    // TODO: could we return a list of KeyboardShortcut here?
    static getShortcutDisplay() : {description: string, shortcut: string, function: (eagle: Eagle, event: KeyboardEvent) => void}[] {
        const displayShortcuts : {description: string, shortcut: string, function: (eagle: Eagle, event: KeyboardEvent) => void} []=[];

        for (const object of KeyboardShortcut.shortcuts){
            // skip if shortcut has no keys
            if (object.keys.length === 0){
                continue;
            }

            const shortcut: string = KeyboardShortcut.idToKeysText(object.id, false);
            displayShortcuts.push({
                description: object.text,
                shortcut: shortcut,
                function: object.run
            });
        }

        return displayShortcuts;
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

    static fixDeleteEdge(eagle: Eagle, edgeId: EdgeId): void {
        eagle.logicalGraph().removeEdgeById(edgeId);
    }

    static fixDisableEdgeLoopAware(eagle: Eagle, edgeId: EdgeId): void {
        eagle.logicalGraph().getEdges().get(edgeId)?.setLoopAware(false);
    }

    static fixPortType(eagle: Eagle, sourcePort: Field, destinationPort: Field): void {
        destinationPort.setType(sourcePort.getType());
    }

    static fixNodeAddField(eagle: Eagle, node: Node, field: Field){
        node.addField(field);
    }

    // TODO: pass a node instead of id?
    static fixNodeFieldIds(eagle: Eagle, nodeId: NodeId){
        const node: Node = eagle.logicalGraph().getNodeById(nodeId);

        if (typeof node === 'undefined'){
            return;
        }

        for (const [id, field] of node.getFields()){
            if (field.getId() === null){
                node.getFields().delete(id);
                field.setId(Utils.generateFieldId());
                node.getFields().set(field.getId(), field);
            }
        }
    }

    static fixNodeCategory(eagle: Eagle, node: Node, category: Category, categoryType: Category.Type){
        node.setCategory(category);
        node.setCategoryType(categoryType);
    }

    // NOTE: merges field1 into field0
    static fixNodeMergeFields(eagle: Eagle, node: Node, field0: Field, field1: Field){
        // abort if one or more of the fields is not found
        const f0 = node.getFields().get(field0.getId());
        const f1 = node.getFields().get(field1.getId());

        if (typeof f0 === 'undefined' || typeof f1 === 'undefined'){
            console.warn("fixNodeMergeFields(): Aborted, could not find one or more specified field(s).");
            return;
        }

        const usage0 = field0.getUsage();
        const usage1 = field1.getUsage();
        const newUsage = Utils._mergeUsage(usage0, usage1);

        // remove field1
        node.removeFieldById(field1.getId());

        // update usage of remaining field (field0)
        field0.setUsage(newUsage);

        // update all edges to use new field
        Utils._mergeEdges(eagle, field1.getId(), field0.getId());
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

    static _mergeEdges(eagle: Eagle, oldFieldId: FieldId, newFieldId: FieldId){
        // update all edges to use new field
        for (const [edgeId, edge] of eagle.logicalGraph().getEdges()){
            // update src port
            if (edge.getSrcPort().getId() === oldFieldId){
                edge.getSrcPort().setId(newFieldId);
            }

            // update dest port
            if (edge.getDestPort().getId() === oldFieldId){
                edge.getDestPort().setId(newFieldId);
            }
        }
    }

    static fixFieldId(eagle: Eagle, field: Field){
        field.setId(Utils.generateFieldId());
    }

    static fixFieldValue(eagle: Eagle, node: Node, exampleField: Field, value: string){
        let field : Field = node.getFieldByDisplayText(exampleField.getDisplayText());

        // if a field was not found, clone one from the example and add to node
        if (field === null){
            field = exampleField
                .clone()
                .setId(Utils.generateFieldId());
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
            field.setDefaultValue("");
            break;
        }
    }

    static fixFieldType(eagle: Eagle, field: Field){
        // fix for undefined value
        if (field.getType() === undefined){
            field.setType(Daliuge.DataType.Object);
        }
        
        // fix for 'Unknown' type
        if (field.getType() === Daliuge.DataType.Unknown){
            field.setType(Daliuge.DataType.Object);
            return;
        }

        // fix for redundant 'Complex' type
        if (field.getType().toString() === 'Complex'){
            field.setType(Daliuge.DataType.Object);
            return;
        }

        // abort if this fix has already been done by some other method
        if (field.getType() === Daliuge.DataType.Object){
            return;
        }

        field.setType((Daliuge.DataType.Object + "." + field.getType()) as Daliuge.DataType);
    }

    static fixFieldNodeId(eagle: Eagle, node: Node, field: Field){
        field.setNode(node);
    }

    static fixFieldUsage(eagle: Eagle, field: Field, usage: Daliuge.FieldUsage){
        switch(field.getUsage()){
            case Daliuge.FieldUsage.NoPort:
                field.setUsage(usage);
                break;
            case Daliuge.FieldUsage.InputPort:
                if (usage === Daliuge.FieldUsage.OutputPort){
                    field.setUsage(Daliuge.FieldUsage.InputOutput);
                }
                break;
            case Daliuge.FieldUsage.OutputPort:
                if (usage === Daliuge.FieldUsage.InputPort){
                    field.setUsage(Daliuge.FieldUsage.InputOutput);
                }
                break;
        }
    }

    static addSourcePortToSourceNode(eagle: Eagle, edge: Edge){
        const srcNode = edge.getSrcNode();
        const destPort = edge.getDestPort();

        // abort fix if source port exists on source node
        if (srcNode.getFields().has(edge.getSrcPort().getId())){
            return;
        }

        // determine a sensible type for the new source port
        const srcPortType = destPort.getType() === undefined ? Daliuge.DataType.Object : destPort.getType();

        // create new source port
        const srcPort = new Field(edge.getSrcPort().getId(), destPort.getDisplayText(), "", "", "", false, srcPortType, false, [], false, Daliuge.FieldType.Application, Daliuge.FieldUsage.OutputPort);

        // add port to source node
        srcNode.addField(srcPort);
    }

    static addDestinationPortToDestinationNode(eagle: Eagle, edge: Edge){
        const destNode = edge.getDestNode();
        const srcPort = edge.getSrcPort();

        // abort fix if destination port exists on destination node
        if (destNode.getFields().has(edge.getDestPort().getId())){
            return;
        }

        // determine a sensible type for the new destination port
        const destPortType = srcPort.getType() === undefined ? Daliuge.DataType.Object : srcPort.getType();

        // create new destination port
        const destPort = new Field(edge.getDestPort().getId(), srcPort.getDisplayText(), "", "", "", false, destPortType, false, [], false, Daliuge.FieldType.Application, Daliuge.FieldUsage.OutputPort);

        // add port to destination node
        destNode.addField(destPort);
    }

    static fixMoveEdgeToEmbeddedApplication(eagle: Eagle, edge: Edge){
        const srcNode = edge.getSrcNode();
        const destNode = edge.getDestNode();

        // if the SOURCE node is a construct, find the port within the embedded apps, and modify the edge with a new source node
        if (srcNode.getCategoryType() === Category.Type.Construct){
            const embeddedApplicationKeyAndPort = srcNode.findPortInApplicationsById(edge.getSrcPort().getId());

            if (embeddedApplicationKeyAndPort.node !== null){
                edge.setSrcNode(embeddedApplicationKeyAndPort.node);
            }
        }

        // if the DESTINATION node is a construct, find the port within the embedded apps, and modify the edge with a new destination node
        if (destNode.getCategoryType() === Category.Type.Construct){
            const embeddedApplicationKeyAndPort = destNode.findPortInApplicationsById(edge.getDestPort().getId());

            if (embeddedApplicationKeyAndPort.node !== null){
                edge.setDestNode(embeddedApplicationKeyAndPort.node);
            }
        }
    }

    static fixFieldParameterType(eagle: Eagle, node: Node, field: Field, newType: Daliuge.FieldType){
        if (newType === Daliuge.FieldType.Unknown){
            node.removeFieldById(field.getId());
            return;
        }

        field.setParameterType(newType);
    }

    static fixAppToAppEdge(eagle: Eagle, edge: Edge){
        const srcNode: Node = edge.getSrcNode();
        const destNode: Node = edge.getDestNode();
        const srcPort: Field = edge.getSrcPort();
        const destPort: Field = edge.getDestPort();

        eagle.logicalGraph().removeEdgeById(edge.getId());
        eagle.addEdge(srcNode, srcPort, destNode, destPort, edge.isLoopAware(), edge.isClosesLoop())
    }

    static addMissingRequiredField(eagle: Eagle, node: Node, requiredField: Field){
        // if requiredField is "dropclass", and node already contains an "appclass" field, then just rename it
        if (requiredField.getDisplayText() === Daliuge.FieldName.DROP_CLASS){
            const appClassField = node.getFieldByDisplayText("appclass");

            if (appClassField !== null){
                appClassField.setDisplayText(Daliuge.FieldName.DROP_CLASS);

                return;
            }
        }

        // get max number of input and output ports allowed for this node
        const categoryData: Category.CategoryData = CategoryData.getCategoryData(node.getCategory());

        // the new (or existing) field that will be used for the required field
        let field: Field;

        // if adding a field would exceed the maximum allowed fields, then replace an existing field
        if (requiredField.isInputPort() && node.getInputPorts().length >= categoryData.maxInputs ||
            requiredField.isOutputPort() && node.getOutputPorts().length >= categoryData.maxOutputs){
            // check if the node has a dummy field (we'll replace that)
            const dummyField = Utils.findDummyField(node, requiredField.isInputPort());
            if (dummyField){
                field = dummyField;
                field.copyWithIds(requiredField, field.getNode(), field.getId());
            }
        }

        // otherwise, if not found, just add a clone of the required field
        if (!field){
            field = requiredField
                .clone()
                .setId(Utils.generateFieldId());
            node.addField(field);
        }

        // try to set a reasonable default value for some known fields
        switch(field.getDisplayText()){
            case Daliuge.FieldName.DROP_CLASS:

                // look up component in palette
                const paletteComponent: Node = Utils.getPaletteComponentByName(node.getCategory());

                if (paletteComponent !== null){
                    const dropClassField: Field = paletteComponent.findFieldByDisplayText(Daliuge.FieldName.DROP_CLASS, field.getParameterType());

                    field.setValue(dropClassField.getDefaultValue());
                    field.setDefaultValue(dropClassField.getDefaultValue());
                }

                break;
        }
    }

    static findDummyField(node: Node, isInput: boolean): Field {
        const dummyFieldNames = ["dummy", "dummy0", "dummy1"];

        for (const dummyFieldName of dummyFieldNames){
            const field = node.findPortByDisplayText(dummyFieldName, isInput, false);
            if (field){
                return field;
            }
        }

        return null;
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

    static newFieldId(eagle: Eagle, node: Node, field: Field): void {
        const oldId = field.getId();
        const newId: FieldId = Utils.generateFieldId();
    
        // loop over all edges
        for (const [edgeId, edge] of eagle.logicalGraph().getEdges()){
            // update the src port id, if required
            if (edge.getSrcNode().getId() === node.getId() && edge.getSrcPort().getId() === oldId){
                edge.getSrcPort().setId(newId);
            }
            // update the dest port id, if required
            if (edge.getDestNode().getId() === node.getId() && edge.getDestPort().getId() === oldId){
                edge.getDestPort().setId(newId);
            }
        }

        // update the field
        field.setId(newId);
    }
    
    static showEdge(eagle: Eagle, edge: Edge): void {
        // close errors modal if visible
        $('#issuesDisplay').modal("hide");

        eagle.setSelection(edge, Eagle.FileType.Graph);
    }

    static showNode(eagle: Eagle, location: Eagle.FileType, node: Node): void {
        // close errors modal if visible
        $('#issuesDisplay').modal("hide");

        // check that we found the node
        if (node === null){
            console.warn("Could not show node with id", node.getId());
            return;
        }
        
        eagle.setSelection(node, location);
    }

    static showField(eagle: Eagle, location: Eagle.FileType, node: Node, field: Field) :void {
        this.showNode(eagle, location, node)

        // TODO: can we remove this timeout now, since the eagle.setSelection() is done immediately (within showNode())
        setTimeout(function(){
            ParameterTable.openTableAndSelectField(node, field)
        }, 100);
    }

    static showGraphConfig(eagle: Eagle, graphConfigId: GraphConfig.Id){
        // open the graph configs table
        GraphConfigurationsTable.openTable();

        const graphConfig: GraphConfig = eagle.logicalGraph().getGraphConfigById(graphConfigId);

        // highlight the name of the graph config
        setTimeout(() => {
            $('#tableRow_' + graphConfig.getName()).focus().select()
        }, 100);
    }

    // TODO: move to Palette.ts and LogicalGraph.ts, needs all three lines
    static generateNewNodeId(object: Palette | LogicalGraph, node: Node){
        //object.getNodes().delete(node.getId());
        node.setId(Utils.generateNodeId());
        //object.getNodes().set(node.getId(), node);
    }

    // only update result if it is worse that current result
    static worstEdgeError(errorsWarnings: Errors.ErrorsWarnings) : Errors.Validity {
        if (errorsWarnings === null){
            console.warn("errorsWarnings is null");
            return Errors.Validity.Valid;
        }

        if (errorsWarnings.warnings.length === 0 && errorsWarnings.errors.length === 0){
            return Errors.Validity.Valid;
        }

        if (errorsWarnings.errors.length !== 0){
            return Errors.Validity.Error;
        }

        return Errors.Validity.Warning;
    }

    static printCategories() : void {
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

    static printLogicalGraphNodesTable() : void {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();

        const nodesList :Node[] = []

        for (const node of eagle.logicalGraph().getNodes()){
            nodesList.push(node)
            if(node.hasInputApplication()){
                nodesList.push(node.getInputApplication())
            }
            if(node.hasOutputApplication()){
                nodesList.push(node.getOutputApplication())
            }
        }

        // add logical graph nodes to table
        for (const node of nodesList){
            tableData.push({
                "name":node.getName(),
                "id":node.getId(),
                "parent":node.getParent() === null ? null : node.getParent().getId(),
                "embed":node.getEmbed() === null ? null : node.getEmbed().getId(),
                "category":node.getCategory(),
                "categoryType":node.getCategoryType(),
                "expanded":node.getExpanded(),
                "peek":node.isPeek(),
                "x":node.getPosition().x,
                "y":node.getPosition().y,
                "radius":node.getRadius(),
                "inputAppId":node.getInputApplication() === null ? null : node.getInputApplication().getId(),
                "inputAppCategory":node.getInputApplication() === null ? null : node.getInputApplication().getCategory(),
                "inputAppEmbedId":node.getInputApplication() === null ? null : node.getInputApplication().getEmbed().getId(),
                "outputAppId":node.getOutputApplication() === null ? null : node.getOutputApplication().getId(),
                "outputAppCategory":node.getOutputApplication() === null ? null : node.getOutputApplication().getCategory(),
                "outputAppEmbedId":node.getOutputApplication() === null ? null : node.getOutputApplication().getEmbed().getId()
            });
        }

        console.table(tableData);
    }

    static printLogicalGraphEdgesTable() : void {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();

        // add logical graph nodes to table
        for (const [id, edge] of eagle.logicalGraph().getEdges()){
            const sourceNode: Node = edge.getSrcNode();
            const sourcePort: Field = edge.getSrcPort();
            const destNode: Node = edge.getDestNode();
            const destPort: Field = edge.getDestPort();

            tableData.push({
                "key": id,
                "id": edge.getId(),
                "sourceNode": sourceNode.getName(),
                "sourceNodeId": sourceNode.getId(),
                "sourcePort": sourcePort.getDisplayText(),
                "sourcePortId": sourcePort.getId(),
                "destNode": destNode.getName(),
                "destNodeId": destNode.getId(),
                "destPort": destPort.getDisplayText(),
                "destPortId": destPort.getId(),
                "loopAware": edge.isLoopAware(),
                "isSelectionRelative": edge.getSelectionRelative()
            });
        }

        console.table(tableData);
    }

    static printPalettesTable() : void {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();

        // add logical graph nodes to table
        for (const palette of eagle.palettes()){
            for (const node of palette.getNodes()){
                tableData.push({
                    "id":node.getId(),
                    "palette":palette.fileInfo().name,
                    "name":node.getName(),
                    "embedId":node.getEmbed().getId(),
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

    static printNodeFieldsTable(nodeId: NodeId) : void {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();

        // check that node at nodeIndex exists
        if (!eagle.logicalGraph().hasNode(nodeId)){
            console.warn("Unable to print node fields table, node", nodeId, "does not exist.");
            return;
        }

        // add logical graph nodes to table
        for (const [fieldId, field] of eagle.logicalGraph().getNodeById(nodeId).getFields()){
            tableData.push({
                "key":fieldId,
                "id":field.getId(),
                "displayText":field.getDisplayText(),
                "nodeId":field.getNode().getId(),
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

    static printGraphConfigurationTable() : void {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();
        const activeConfig: GraphConfig = eagle.logicalGraph().getActiveGraphConfig();

        // add logical graph nodes to table
        for (const node of activeConfig.getNodes()){
            const graphNode: Node = eagle.logicalGraph().getNodeById(node.getId());

            if (typeof graphNode === 'undefined'){
                // TODO: what to do here? blank row, console warning?
                continue;
            }

            for (const field of node.getFields()){
                const graphField: Field = graphNode.getFields().get(field.getId());

                if (typeof graphField === 'undefined'){
                    // TODO: what to do here? blank row, console warning?
                    continue;
                }

                tableData.push({
                    "nodeName": graphNode.getName(),
                    "nodeId": node.getId(),
                    "fieldName": graphField.getDisplayText(),
                    "fieldId": field.getId(),
                    "value": field.getValue(),
                    "comment": field.getComment()
                });
            }
        }

        console.table(tableData);
    }

    static getRmodeTooltip() : string {
        let html = '**General**: Sets the standard for provenance tracking throughout graph translation and execution. Used to determine scientifically (high-level) changes to workflow behaviour. Signature files are stored alongside log files. Refer to the documentation for further explanation.<br>'
        html += '**Documentation link** <a href="https://daliuge.readthedocs.io/en/latest/architecture/reproducibility/reproducibility.html" target="_blank">daliuge.readthedocs</a><br>'
        html += '**NOTHING**: No provenance data is tracked at any stage.<br>'
        html += '**ALL**: Data for all subsequent levels is generated and stored together.<br>'
        html += '**RERUN**: Stores general about all logical graph components<br>'
        html += '**REPEAT**: Stores specific information about logical and physical graph components<br>'
        html += '**RECOMPUTE**: Stores maximum information about logical and physical graph components and at runtime.<br>'
        html += '**REPRODUCE**: Stores information about terminal data drops at logical, physical and runtime layers.<br>'
        html += '**REPLICATE SCI**: Essentially RERUN + REPRODUCE<br>'
        html += '**REPLICATE COMP**: Essentially RECOMPUTE + REPRODUCE<br>'
        html += '**REPLICATE TOTALLY**: Essentially REPEAT + REPRODUCE<br>'

        return html
    }

    static getTranslateBtnColorTooltip() : string {
        let html = '**Reproducibility Status**<br><br>'
        html += '**Green:** Graph is saved and ready for translation.<br>'
        html += '**Red:** Graph is not saved, Save before translation.<br>'
        html += '**Orange:** In test translation mode, do not use for workflow execution.<br>'
        html += "**Blue:** Graph is not stored in a git repository, it is the user's responsibility to keep a copy if full workflow reproducibility is required."

        return html
    }


    static copyInputTextModalInput(): void {
        navigator.clipboard.writeText($('#inputTextModalInput').val().toString());
    }

    static copyInputCodeModalInput(): void {
        const editor = $('#inputCodeModal').data('editor');
        if (editor){
            const content: string = editor.getValue();
            navigator.clipboard.writeText(content);
        } else {
            console.error("No 'editor' data attribute found on modal");
        }
    }

    static copyInputMarkdownModalInput(): void {
        const editor = $('#inputMarkdownModal').data('editor');
        if (editor){
            const content: string = editor.getValue();
            navigator.clipboard.writeText(content);
        } else {
            console.error("No 'editor' data attribute found on modal");
        }
    }

    static getReadOnlyText() : string {
        if (Eagle.selectedLocation() === Eagle.FileType.Graph || Eagle.selectedLocation() === Eagle.FileType.Unknown){
            return "Read Only - Turn on 'Expert Mode' and 'Allow Component Editing' in the settings to unlock"
        }

        // if a node or nodes in the palette are selected, then assume those are being moved to the destination
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            return "Read Only - Turn on 'Expert Mode' and 'Allow Palette Editing' in the settings to unlock"
        }

        return ''
    }

    static isTypeNode(object : any) : boolean {
        return (object instanceof Node);
    }

    static async loadSchemas(){
        function _setOJSSchemas(schema: object) : void {
            Utils.ojsGraphSchema = schema;
            Utils.ojsPaletteSchema = schema;

            // HACK: we modify the palette schema from the graph schema!
            for (const notRequired of ["isGroup", "color", "drawOrderHint", "x", "y", "subject"]){
                (<any>Utils.ojsPaletteSchema).properties.nodeDataArray.items.required.splice((<any>Utils.ojsPaletteSchema).properties.nodeDataArray.items.required.indexOf(notRequired), 1);
            }
        }

        function _setV4Schemas(schema: object) : void {
            Utils.v4GraphSchema = schema;
            Utils.v4PaletteSchema = schema;

            // TODO: hack to introduce difference between palette and graph schemas
        }

        async function _fetchSchema(url: string, localStorageKey: string, setFunc: (schema: object) => void){
            let data;
            let dataObject;

            try {
                data = await Utils.httpGet(url);
                dataObject = JSON.parse(data);
            } catch (error) {
                const schemaData = localStorage.getItem(localStorageKey);

                if (schemaData === null){
                    console.warn("Unable to fetch graph schema (" + url + "). Error:" + error + ". Schema also unavailable from localStorage (" + localStorageKey + ").");
                } else {
                    console.warn("Unable to fetch graph schema (" + url + "). Error:" + error + ". Schema loaded from localStorage (" + localStorageKey + ").");
                    setFunc(JSON.parse(schemaData));
                }
            }

            // if schema was fetched successfully, use setFunc to store within Utils module, and update localStorage
            if (typeof dataObject !== 'undefined'){
                setFunc(dataObject);

                // write to localStorage
                localStorage.setItem(localStorageKey, data);
            }
        }

        // try to fetch the schema
        _fetchSchema(Daliuge.OJS_GRAPH_SCHEMA_URL, 'ojsGraphSchema', _setOJSSchemas);
        _fetchSchema(Daliuge.V4_GRAPH_SCHEMA_URL, 'v4GraphSchema', _setV4Schemas);
    }

    static snapToGrid(coord: number, offset: number) : number {
        const gridSize = Setting.findValue(Setting.SNAP_TO_GRID_SIZE);
        return (gridSize * Math.round((coord + offset)/gridSize)) - offset;
    }
    
    static enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
        return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
    }

    static createCommitJsonString(jsonString: string, repository: Repository, token: string, fullFileName: string, commitMessage: string): string {
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

    static async openRemoteFileFromUrl(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string): Promise<string> {
        return new Promise(async(resolve, reject) => {
            let data;
            try {
                data = await Utils.httpGet(fileName);
            } catch (error) {
                reject(error);
                return;
            }

            resolve(data);
        });
    }

    static copyFieldsFromPrototype(node: Node, paletteName: string, category: Category) : void {
        const eagle: Eagle = Eagle.getInstance();

        // get a reference to the builtin palette
        const palette: Palette = eagle.findPalette(paletteName, false);
        if (palette === null){
            console.warn("Could not find palette", paletteName);
            return;
        }

        // find node with new type in builtinPalette
        const newCategoryPrototype: Node = palette.findNodeByNameAndCategory(category);

        // check that category was found
        if (newCategoryPrototype === null){
            console.warn("Prototypes for new category could not be found in palettes", category);
            return;
        }

        // copy fields from new category to old node
        for (const field of newCategoryPrototype.getFields().values()){
            if (field.isInputPort() || field.isOutputPort()){
                continue;
            }

            // try to find field in old node that matches by displayText AND parameterType
            let destField = node.findFieldByDisplayText(field.getDisplayText(), field.getParameterType());

            // if dest field could not be found, then go ahead and add a NEW field to the dest node
            if (destField === null){
                destField = field.clone();
                node.addField(destField);
            }

            // copy everything about the field from the src (palette), except maintain the existing id and nodeKey
            destField.copyWithIds(field, destField.getNode(), destField.getId());
        }
    }

    static duplicateNode(node: Node): Node {
        const newNodeId = Utils.generateNodeId();
        const newInputAppId: NodeId = Utils.generateNodeId();
        const newOutputAppId: NodeId = Utils.generateNodeId();

        // set appropriate key for node (one that is not already in use)
        // NOTE: we remove the fields here, and re-add them one-by-one, this seems easier than changing both the key and value in the fields map
        const newNode = node
            .clone()
            .setId(newNodeId)
            .setEmbed(null)
            .removeAllFields();

        // TODO: this is wrong here!, the field ids within the fields don't match the keys in the fields map!
        // set new ids for any fields in this node
        for (const field of node.getFields().values()){
            const clonedField = field
                .clone()
                .setId(Utils.generateFieldId())
                .setNode(newNode);
            newNode.addField(clonedField);
        }

        // set new ids for embedded applications within node, and new ids for ports within those embedded nodes
        if (node.hasInputApplication()){
            const clone : Node = node.getInputApplication().clone();
            
            if(clone.getFields() != null){
                // set new ids for any fields in this node
                for (const field of clone.getFields().values()){
                    field.setId(Utils.generateFieldId()).setNode(clone);
                }
            }
            newNode.setInputApplication(clone)

            // use new ids for input application
            newNode.getInputApplication().setId(newInputAppId);
            newNode.getInputApplication().setEmbed(newNode);
        }
        if (node.hasOutputApplication()){
            const clone : Node = node.getOutputApplication().clone();
            
            if(clone.getFields() != null){
                // set new ids for any fields in this node
                for (const field of clone.getFields().values()){
                    field.setId(Utils.generateFieldId()).setNode(clone);
                }
            }
            newNode.setOutputApplication(clone)

            // use new ids for output application
            newNode.getOutputApplication().setId(newOutputAppId);
            newNode.getOutputApplication().setEmbed(newNode);
        }

        return newNode;
    }

    static generateGraphConfigName(config:GraphConfig): string {
        if (config.getName() === ""){
            return "Default Configuration";
        } else {
            return config.getName() + " (Copy)";
        }
    }

    static transformNodeFromTemplates(node: Node, sourceTemplate: Node, destinationTemplate: Node, keepOldFields: boolean = false): void {
        if (!keepOldFields){
            // delete non-ports from the node
            for (const [id, field] of node.getFields()){
                if (field.isInputPort() || field.isOutputPort()){
                    continue;
                }

                node.removeFieldById(id);
            }
        }

        // copy non-ports from new template to node
        for (const field of destinationTemplate.getFields().values()){
            if (field.isInputPort() || field.isOutputPort()){
                continue;
            }

            // try to find field in node that matches by displayText AND parameterType
            let destField = node.findFieldByDisplayText(field.getDisplayText(), field.getParameterType());

            // if dest field could not be found, then go ahead and add a NEW field to the node
            if (destField === null){
                destField = field.clone();
                node.addField(destField);
            }

            // copy everything about the field from the src (palette), except maintain the existing id and nodeKey
            destField.copyWithIds(field, destField.getNode(), destField.getId());
        }

        // copy name and description from new template to node, if node values are defaults
        if (node.getName() === sourceTemplate.getName()){
            node.setName(destinationTemplate.getName());
        }

        if (node.getDescription() === sourceTemplate.getDescription()){
            node.setDescription(destinationTemplate.getDescription());
        }

        // set some other rendering attributes of the node, to ensure they match the destinationTemplate
        node.setCategoryType(destinationTemplate.getCategoryType());
        node.setRadius(destinationTemplate.getRadius());
        node.setColor(destinationTemplate.getColor());
    }

    static findOldRepositoriesInLocalStorage(): Repository[] {
        const customRepositories: Repository[] = [];

        // search for custom repositories, and add them into the list.
        for (let i = 0; i < localStorage.length; i++) {
            const key : string = localStorage.key(i);
            const value : string = localStorage.getItem(key);
            const keyExtension : string = key.substring(key.lastIndexOf('.') + 1);

            // handle legacy repositories where the branch is not specified (assume master)
            if (keyExtension === "github_repository"){
                customRepositories.push(new Repository(Repository.Service.GitHub, value, "master", false));
            }
            if (keyExtension === "gitlab_repository"){
                customRepositories.push(new Repository(Repository.Service.GitLab, value, "master", false));
            }

            // handle the current method of storing repositories where both the service and branch are specified
            if (keyExtension === "github_repository_and_branch") {
                const repositoryName = value.split("|")[0];
                const repositoryBranch = value.split("|")[1];
                customRepositories.push(new Repository(Repository.Service.GitHub, repositoryName, repositoryBranch, false));
            }
            if (keyExtension === "gitlab_repository_and_branch") {
                const repositoryName = value.split("|")[0];
                const repositoryBranch = value.split("|")[1];
                customRepositories.push(new Repository(Repository.Service.GitLab, repositoryName, repositoryBranch, false));
            }
        }

        return customRepositories;
    }
}
