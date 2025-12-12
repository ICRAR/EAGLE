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
import { EagleConfig } from "./EagleConfig";
import { Edge } from './Edge';
import { Errors } from './Errors';
import { Field } from './Field';
import { FileInfo } from "./FileInfo";
import { FileLocation } from "./FileLocation";
import { GraphConfig } from "./GraphConfig";
import { GraphConfigurationsTable } from "./GraphConfigurationsTable";
import { GraphRenderer } from "./GraphRenderer";
import { KeyboardShortcut } from './KeyboardShortcut';
import { LogicalGraph } from './LogicalGraph';
import { Modals } from "./Modals";
import { Node } from './Node';
import { Palette } from './Palette';
import { ParameterTable } from "./ParameterTable";
import { Repository, RepositoryCommit } from './Repository';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { UiModeSystem } from "./UiModes";


export class Utils {
    // Allowed file extensions
    static readonly FILE_EXTENSIONS : string[] = [
        "json",
        "diagram",
        "graph",
        "palette",
        "graphConfig", // for graph config files
        "md", // for markdown e.g. README.md
        "daliuge", "dlg" // for logical graphs templates containing graph configurations
    ];

    static ojsGraphSchema : object = {};
    static ojsPaletteSchema : object = {};
    static ojsGraphConfigSchema : object = {};
    static v4GraphSchema : object = {};
    static v4PaletteSchema : object = {};
    static v4GraphConfigSchema : object = {};

    static generateNodeId(): NodeId {
        return Utils._uuidv4() as NodeId;
    }

    static generateFieldId(): FieldId {
        return Utils._uuidv4() as FieldId;
    }

    static generateEdgeId(): EdgeId {
        return Utils._uuidv4() as EdgeId;
    }

    static generateGraphConfigId(): GraphConfigId {
        return Utils._uuidv4() as GraphConfigId;
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

    static generateFilenameForGraphConfig(logicalGraph: LogicalGraph, graphConfig: GraphConfig): string {
        let graphName = logicalGraph.fileInfo().name;
        let configName = graphConfig.fileInfo().name;
        const extension = Utils.getDiagramExtension(Eagle.FileType.GraphConfig);

        // if graphName ends with ".graph", remove that
        if (graphName.endsWith(".graph")){
            graphName = graphName.substring(0, graphName.length - 6);
        }

        // if configName ends with ".graphConfig", remove that
        if (configName.endsWith(".graphConfig")){
            configName = configName.substring(0, configName.length - 12);
        }

        return `${graphName}-${configName}.${extension}`;
    }

    // TODO: check if this is even necessary. it may only have been necessary when we were setting keys (not ids)
    static setEmbeddedApplicationNodeIds(lg: LogicalGraph): void {
        // loop through nodes, look for embedded nodes with null id, create new id
        for (const node of lg.getNodes()){

            const inputApplication = node.getInputApplication();
            const outputApplication = node.getOutputApplication();

            // if this node has inputApp, set the inputApp id
            if (inputApplication !== null){
                if (inputApplication.getId() === null){
                    inputApplication.setId(Utils.generateNodeId());
                }
            }

            // if this node has outputApp, set the outputApp id
            if (outputApplication !== null){
                if (outputApplication.getId() === null){
                    outputApplication.setId(Utils.generateNodeId());
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
        return Object.values(Eagle.FileType).indexOf(fileType);
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
        const basename = path.split(/[\\/]/).pop();  // extract file name from full path ...
                                                     // (supports `\\` and `/` separators)

        if (typeof basename === 'undefined'){
            return "";
        }

        const pos = basename.lastIndexOf(".");           // get last position of `.`

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
        } else if (fileType == Eagle.FileType.GraphConfig) {
            return "graphConfig";
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
        if (fileType.toLowerCase() === "graphconfig"){
            return Eagle.FileType.GraphConfig;
        }
        if (fileType.toLowerCase() === "palette"){
            return Eagle.FileType.Palette;
        }
        if (fileType.toLowerCase() === "json"){
            return Eagle.FileType.JSON;
        }
        const markdownExtensions = ["md", "markdown", "mdown"];
        if (markdownExtensions.includes(fileType.toLowerCase())){
            return Eagle.FileType.Markdown;
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
            // first make sure the jsonString is parsable as JSON
            try {
                JSON.parse(jsonString);
            } catch (e) {
                reject("Attempting to send an invalid JSON string");
                return;
            }

            // send the JSON string
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
        $('#messageModal').modal("show");
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

            const callback: Modals.UserStringCallback = (completed : boolean, userString : string) => {
                if (!completed){
                    reject("Utils.requestUserString() aborted by user");
                } else {
                    resolve(userString);
                }
            };
            $('#inputModal').data('callback', callback);
            $('#inputModal').data('returnType', "string");

            $('#inputModal').modal("show");
        });
    }

    static requestUserText(title : string, message : string, defaultText: string | null, readonly: boolean = false) : Promise<string> {
        return new Promise(async(resolve, reject) => {
            $('#inputTextModalTitle').text(title);
            $('#inputTextModalMessage').html(message);

            $('#inputTextModalInput').val(defaultText ? defaultText : '');
            $('#inputTextModalInput').prop('readonly', readonly);

            // store the callback, result on the modal HTML element
            // so that the info is available to event handlers
            $('#inputTextModal').data('completed', false);

            const callback: Modals.UserTextCallback = (completed : boolean, userText : string) => {
                if (!completed){
                    reject("Utils.requestUserText() aborted by user");
                } else {
                    resolve(userText);
                }
            };
            $('#inputTextModal').data('callback', callback);
            $('#inputTextModal').modal("show");
        });
    }

    static requestUserCode(language: "json"|"python"|"text", title: string, defaultText: string | null, readonly: boolean = false): Promise<string> {
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
            editor.setValue(defaultText ? defaultText : '');

            // store the callback, result on the modal HTML element
            // so that the info is available to event handlers
            $('#inputCodeModal').data('completed', false);

            const callback: Modals.UserTextCallback = (completed : boolean, userText : string) => {
                if (!completed){
                    reject("Utils.requestUserCode() aborted by user");
                } else {
                    resolve(userText);
                }
            };
            $('#inputCodeModal').data('callback', callback);

            $('#inputCodeModal').modal("show");
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

            const callback: Modals.UserMarkdownCallback = (completed : boolean, userMarkdown : string) => {
                if (!completed){
                    reject("Utils.requestUserMarkdown() aborted by user");
                } else {
                    resolve(userMarkdown);
                }
            };
            $('#inputMarkdownModal').data('callback', callback);

            $('#inputMarkdownModal').modal("show");
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

            const callback: Modals.UserNumberCallback = (completed : boolean, userNumber : number) => {
                if (!completed){
                    reject("Utils.requestUserNumber() aborted by user");
                } else {
                    resolve(userNumber);
                }
            }
            $('#inputModal').data('callback', callback);
            $('#inputModal').data('returnType', "number");

            $('#inputModal').modal("show");
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

            const callback: Modals.UserChoiceCallback = (completed: boolean, choice: string): void =>{
                if (completed){
                    resolve(choice);
                } else {
                    reject("Utils.requestUserChoice() aborted by user");
                }
            };
            $('#choiceModal').data('callback', callback);
            $('#choiceModal').data('choices', choices);

            // trigger the change event, so that the event handler runs and disables the custom text entry field if appropriate
            $('#choiceModalSelect').trigger('change');
            $('#choiceModal').modal("show");
            $('#choiceModalSelect').click()
        });
    }

    static async requestUserConfirm(title : string, message : string, affirmativeAnswer : string, negativeAnswer : string, confirmSetting: Setting | undefined): Promise<boolean> {
        return new Promise(async(resolve, reject) => {
            $('#confirmModalTitle').text(title);
            $('#confirmModalMessage').html(message);
            $('#confirmModalAffirmativeAnswer').text(affirmativeAnswer);
            $('#confirmModalNegativeAnswer').text(negativeAnswer);

            $('#confirmModalDontShowAgain button').off()
            if(typeof confirmSetting === 'undefined'){
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

            const callback: Modals.UserConfirmCallback = (completed: boolean, confirmed: boolean) => {
                resolve(completed && confirmed);
            };
            $('#confirmModal').data('callback', callback);

            $('#confirmModal').modal("show");
        });
    }

    static async requestUserOptions(title: string, message: string, option0: string, option1: string, option2: string, defaultOptionIndex: number): Promise<string> {
        return new Promise(async(resolve, reject) => {
            $('#optionsModalTitle').text(title);
            $('#optionsModalMessage').html(message);
            $('#optionsModalOption0').text(option0);
            $('#optionsModalOption1').text(option1);
            $('#optionsModalOption2').text(option2);

            $('#optionsModalOption0').toggleClass('btn-primary', defaultOptionIndex === 0);
            $('#optionsModalOption0').toggleClass('btn-secondary', defaultOptionIndex !== 0);
            $('#optionsModalOption1').toggleClass('btn-primary', defaultOptionIndex === 1);
            $('#optionsModalOption1').toggleClass('btn-secondary', defaultOptionIndex !== 1);
            $('#optionsModalOption2').toggleClass('btn-primary', defaultOptionIndex === 2);
            $('#optionsModalOption2').toggleClass('btn-secondary', defaultOptionIndex !== 2);

            const callback: Modals.UserOptionsCallback = (selectedOptionIndex: number) => {
                const selectedOption = [option0, option1, option2][selectedOptionIndex];
                resolve(selectedOption);
            };
            $('#optionsModal').data('callback', callback);

            $('#optionsModal').modal("show");
        });
    }

    // , callback : (completed : boolean, repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) => void ) : void {
    static async requestUserGitCommit(defaultRepository : Repository, repositories: Repository[], filePath: string, fileName: string, fileType: Eagle.FileType): Promise<RepositoryCommit> {
        return new Promise(async(resolve, reject) => {
            $('#gitCommitModal').data('completed', false);
            $('#gitCommitModal').data('fileType', fileType);

            const callback: Modals.GitCommitCallback = function(completed: boolean, location: FileLocation, commitMessage: string): void {
                if (completed){
                    resolve(new RepositoryCommit(location, commitMessage));
                } else {
                    reject("Utils.requestUserGitCommit() aborted by user");
                }
            };

            $('#gitCommitModal').data('callback', callback);
            $('#gitCommitModal').data('repositories', repositories);
            $('#gitCommitModal').modal("show");

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

            const callback: Modals.UserFieldCallback = function(field: Field): void {
                resolve(field);
            }
            $('#editFieldModal').data('callback', callback);
            $("#editFieldModalTitle").html(title);
            $('#editFieldModal').data('choices', choices);
            $('#editFieldModal').modal("show");
        });
    }

    static requestUserAddCustomRepository(): Promise<Repository> {
        return new Promise(async(resolve, reject) => {
            $('#gitCustomRepositoryModalRepositoryNameInput').val("");
            $('#gitCustomRepositoryModalRepositoryBranchInput').val("");

            $('#gitCustomRepositoryModal').data('completed', false);

            const callback: Modals.GitCustomRepositoryCallback = function(completed: boolean, repositoryService: Repository.Service, repositoryName: string, repositoryBranch: string): void {
                if (!completed){
                    reject("Utils.requestUserAddCustomRepository aborted by user");
                } else {
                    resolve(new Repository(repositoryService, repositoryName, repositoryBranch, false));
                }
            };

            $('#gitCustomRepositoryModal').data('callback', callback);
            $('#gitCustomRepositoryModal').modal("show");
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

    static updateGitCommitRepositoriesList(repositories: Repository[], defaultRepository: Repository | null) : void {
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
        palette.fileInfo().location.downloadUrl(paletteListItem.filename);
        palette.fileInfo().type = Eagle.FileType.Palette;

        palette.expanded(paletteListItem.expanded);
    }

    static showModelDataModal(title: string, fileInfo: FileInfo) : void {
        const eagle = Eagle.getInstance();
        eagle.currentFileInfoTitle(title);
        eagle.currentFileInfo(fileInfo);

        $('#modelDataModal').modal("show");
    }

    static hideModelDataModal(){
        $('#modelDataModal').modal("hide");
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

            const inputApplication = node.getInputApplication();
            const outputApplication = node.getOutputApplication();

            // add input application input and output ports
            if (inputApplication !== null){
                // input ports
                for (const port of inputApplication.getInputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addFieldIfUnique(uniquePorts, port.clone());
                    }
                }

                // output ports
                for (const port of inputApplication.getOutputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addFieldIfUnique(uniquePorts, port.clone());
                    }
                }
            }

            // add output application input and output ports
            if (outputApplication !== null){
                // input ports
                for (const port of outputApplication.getInputPorts()) {
                    if (!port.getIsEvent()) {
                        Utils._addFieldIfUnique(uniquePorts, port.clone());
                    }
                }

                // output ports
                for (const port of outputApplication.getOutputPorts()) {
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
        const builtinPalette = eagle.findPalette(Palette.BUILTIN_PALETTE_NAME, false);
        if (typeof builtinPalette === "undefined"){
            // if no built-in palette is found, then build a list from the EAGLE categoryData
            console.warn("Could not find builtin palette", Palette.BUILTIN_PALETTE_NAME);
            return Utils.buildComponentList((cData: Category.CategoryData) => {return cData.categoryType === categoryType});
        }

        const matchingNodes = builtinPalette.getNodesByCategoryType(categoryType)
        const matchingCategories : Category[] = []

        for (const node of matchingNodes){
            // skip nodes whose category is already in the list
            if (matchingCategories.includes(node.getCategory())){
                continue;
            }
            matchingCategories.push(node.getCategory())
        }

        return matchingCategories;
    }

    static getPaletteComponentByName(name: string, useCaseInsensitiveMatch: boolean = false) : Node | undefined {
        const eagle: Eagle = Eagle.getInstance();

        if (name === null || typeof name === 'undefined' || name.trim() === ""){
            return undefined;
        }

        // add all data components (except ineligible)
        for (const palette of eagle.palettes()){
            for (const node of palette.getNodes()){
                // skip nodes that are not data components
                if (node.getName() === name || (useCaseInsensitiveMatch && node.getName().toLowerCase() === name.toLowerCase())){
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

        const portDragSourceNode = GraphRenderer.portDragSourceNode();

        if (portDragSourceNode === null){
            console.warn("getComponentsWithMatchingPort(): port drag source node is null");
            return result;
        }

        // no destination, ask user to choose a new node
        const isData: boolean = portDragSourceNode.getCategoryType() === Category.Type.Data;

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
            for (const field of node.getFields()) {
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

    // return undefined if no update required, null if no direct update available (but should update), or the new category if a direct update is available
    static getLegacyCategoryUpdate(node: Node): Category | undefined {
        // first check for the special case of PythonApp, which should be upgraded to either a DALiuGEApp or a PyFuncApp, depending on the dropclass field value
        if (node.getCategory() === Category.PythonApp){
            const dropClassField = node.findFieldByDisplayText(Daliuge.FieldName.DROP_CLASS);

            // by default, update PythonApp to a DALiuGEApp, unless dropclass field value indicates it is a PyFuncApp
            if (dropClassField && dropClassField.getValue() === Daliuge.DEFAULT_PYFUNCAPP_DROPCLASS_VALUE){
                return Category.PyFuncApp;
            } else {
                return Category.DALiuGEApp;
            }
        }

        // otherwise, check the standard legacy categories map
        const newCategory: Category | undefined = CategoryData.LEGACY_CATEGORIES_UPGRADES.get(node.getCategory());
        return newCategory;
    }

    static isKnownCategory(category : string) : boolean {
        return typeof CategoryData.cData[category] !== 'undefined';
    }

    static isKnownCategoryType(categoryType : string) : boolean {
        return Object.values(Category.Type).includes(categoryType as Category.Type);
    }

    static isValidCategoryAndType(category: string, categoryType: string) : boolean {
        return this.isKnownCategory(category) &&
            this.isKnownCategoryType(categoryType) &&
            ![Category.Unknown, Category.UnknownApplication].map(x => x as string).includes(category) &&
            ![Category.Type.Unknown].map(x => x as string).includes(categoryType);
    }

    static getColorForNode(node: Node) : string {
        return CategoryData.getCategoryData(node.getCategory()).color;
    }

    static getRadiusForNode(node: Node) : number {
        if(node.isData() || node.isGlobal()){
            return EagleConfig.DATA_NODE_RADIUS;
        }else if (node.isBranch()){
            return EagleConfig.BRANCH_NODE_RADIUS;
        }else if (node.isConstruct()){
            return EagleConfig.NORMAL_NODE_RADIUS;
        }else if (node.isConstruct()){
            return EagleConfig.MINIMUM_CONSTRUCT_RADIUS;
        }else if (node.isComment()){
            return EagleConfig.COMMENT_NODE_WIDTH;
        }else{
            return EagleConfig.NORMAL_NODE_RADIUS;
        }
    }

    static getRightWindowWidth() : number {
        if(Eagle.getInstance().eagleIsReady() && !Setting.findValue(Setting.RIGHT_WINDOW_VISIBLE)){
            return 0
        }

        const rightWindowWidth = Setting.findValue(Setting.RIGHT_WINDOW_WIDTH) as number;

        if (typeof rightWindowWidth === 'undefined'){
            return 0;
        }

        return rightWindowWidth;
    }

    static setRightWindowWidth(width : number) : void {
        Setting.setValue(Setting.RIGHT_WINDOW_WIDTH, width);
        UiModeSystem.saveToLocalStorage()
    }

    static getLeftWindowWidth() : number {
        const leftWindowDisabled = !Setting.findValue(Setting.ALLOW_GRAPH_EDITING) && !Setting.findValue(Setting.ALLOW_PALETTE_EDITING)

        if(Eagle.getInstance().eagleIsReady() && !Setting.findValue(Setting.LEFT_WINDOW_VISIBLE) || leftWindowDisabled){
            return 0
        }

        const leftWindowWidth = Setting.findValue(Setting.LEFT_WINDOW_WIDTH) as number;

        if (typeof leftWindowWidth === 'undefined'){
            return 0;
        }

        return leftWindowWidth
    }

    static setLeftWindowWidth(width : number) : void {
        Setting.setValue(Setting.LEFT_WINDOW_WIDTH, width);
        UiModeSystem.saveToLocalStorage()
    }

    static calculateBottomWindowHeight() : number {
        //this function exists to prevent the bottom window height value from exceeding its max height value. 
        //if eagle isn't ready or the window is hidden just return 0
        //TODO This function is only needed for the transition period from pixels to vh. We can get rid of this in the future.
        if(!Eagle.getInstance().eagleIsReady()){
            return 0
        }

        const bottomWindowHeight = Setting.findValue(Setting.BOTTOM_WINDOW_HEIGHT) as number;

        if (typeof bottomWindowHeight === 'undefined'){
            return 0;
        }

        //if the bottom window height set is too large, just return the max allowed height
        if(bottomWindowHeight > 80){
            return 80
        }

        //else return the actual height
        return bottomWindowHeight;
    }

    static getBottomWindowHeight() : number {
        if(Eagle.getInstance().eagleIsReady() && !Setting.findValue(Setting.BOTTOM_WINDOW_VISIBLE)){
            return 0
        }

        const bottomWindowHeight = Setting.findValue(Setting.BOTTOM_WINDOW_HEIGHT) as number;

        if (typeof bottomWindowHeight === 'undefined'){
            return 0;
        }

        return bottomWindowHeight;
    }

    // TODO: I don't think this is needed, since Setting.setValue() will already save to local storage
    static setBottomWindowHeight(height : number) : void {
        Setting.setValue(Setting.BOTTOM_WINDOW_HEIGHT, height);
        UiModeSystem.saveToLocalStorage()
    }

    static getInspectorOffset() : number {
        const offset = 10
        let statusBarElementHeight: number = 0;
        const statusBarElement = $('#statusBar')
        
        if (statusBarElement.length) {
            const height = statusBarElement.height();
            if (typeof height === 'number') {
                statusBarElementHeight = height;
            }
        }

        const statusBarAndOffsetHeightVH = ((statusBarElementHeight + offset) / window.innerHeight)*100
        return this.getBottomWindowHeight() + statusBarAndOffsetHeightVH
    }

    static getLocalStorageKey(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string) : string | null{
        switch (repositoryService){
            case Repository.Service.GitHub:
                return repositoryName + "|" + repositoryBranch + ".github_repository_and_branch";
            case Repository.Service.GitLab:
                return repositoryName + "|" + repositoryBranch + ".gitlab_repository_and_branch";
            default:
                console.warn("Utils.getLocalStorageKey(): unknown repository service:", repositoryService);
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
            // find type of OJS files
            if (typeof data.modelData.fileType !== 'undefined'){
                return Utils.translateStringToFileType(data.modelData.fileType);
            }

            // find type of V4 files
            if (typeof data.modelData.type !== 'undefined'){
                return Utils.translateStringToFileType(data.modelData.type);
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
                // check whether the value of data.modelData.schemaVersion is a valid SchemaVersion enum value
                if (Object.values(Setting.SchemaVersion).includes(data.modelData.schemaVersion)){
                    return data.modelData.schemaVersion;
                } else {
                    console.warn("Unknown schema version:", data.modelData.schemaVersion);
                    return Setting.SchemaVersion.Unknown;
                }
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
        for (const edge of graph.getEdges()){
            if (typeof edge === 'undefined'){
                console.error("edge in edge list is undefined!");
                continue;
            }

            if (typeof edge.getSrcNode() === 'undefined'){
                console.error("edge (" + edge.getId() + ") getSrcNode() is undefined!");
                continue;
            }

            if (typeof edge.getSrcPort() === 'undefined'){
                console.error("edge (" + edge.getId() + ") getSrcPort() is undefined!");
                continue;
            }

            if (typeof edge.getDestNode() === 'undefined'){
                console.error("edge (" + edge.getId() + ") getDestNode() is undefined!");
                continue;
            }

            if (typeof edge.getDestPort() === 'undefined'){
                console.error("edge (" + edge.getId() + ") getDestPort() is undefined!");
                continue;
            }

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
        for (const node of graph.getNodes()){
            graphIssues.push(...node.getIssues())
            
            //from fields
            for (const field of node.getFields()){
                graphIssues.push(...field.getIssues())
            }

            const inputApplication = node.getInputApplication();
            const outputApplication = node.getOutputApplication();

            //embedded input applications and their fields
            if (inputApplication !== null){
                graphIssues.push(...inputApplication.getIssues().values())

                for (const field of inputApplication.getFields()){
                    graphIssues.push(...field.getIssues())
                }
            }

            //embedded output applications and their fields
            if (outputApplication !== null){
                graphIssues.push(...outputApplication.getIssues().values())

                for (const field of outputApplication.getFields()){
                    graphIssues.push(...field.getIssues())
                }
            }
        }

        // from edges
        for (const edge of graph.getEdges()){
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
                    case Eagle.FileType.GraphConfig:
                        valid = ajv.validate(Utils.ojsGraphConfigSchema, json) as boolean;
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
                    case Eagle.FileType.GraphConfig:
                        valid = ajv.validate(Utils.v4GraphConfigSchema, json) as boolean;
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

    static asBool(value: string | undefined | null) : boolean {
        if(value === undefined || value === null){
            return false
        }
        return value.toLowerCase() === "true";
    }

    static fixDeleteEdge(eagle: Eagle, edgeId: EdgeId): void {
        eagle.logicalGraph().removeEdgeById(edgeId);
    }

    static fixDisableEdgeLoopAware(eagle: Eagle, edgeId: EdgeId): void {
        eagle.logicalGraph().getEdgeById(edgeId)?.setLoopAware(false);
    }

    static fixPortType(eagle: Eagle, sourcePort: Field, destinationPort: Field): void {
        destinationPort.setType(sourcePort.getType());
    }

    static fixNodeAddField(eagle: Eagle, node: Node, field: Field){
        node.addField(field);
    }

    static fixNodeCategory(eagle: Eagle, node: Node, category: Category, categoryType: Category.Type){
        node.setCategory(category);
        node.setCategoryType(categoryType);
        node.setRadius(Utils.getRadiusForNode(node));
        node.setColor(Utils.getColorForNode(node));
    }

    // NOTE: merges field1 into field0
    static fixNodeMergeFields(eagle: Eagle, node: Node, fieldId0: FieldId, fieldId1: FieldId){
        if (fieldId0 === fieldId1){
            console.warn("fixNodeMergeFields(): Aborted, field ids are the same.");
            return;
        }

        const field0 = node.getFieldById(fieldId0);
        const field1 = node.getFieldById(fieldId1);

        // abort if either field not found
        if (typeof field0 === 'undefined'){
            console.warn("fixNodeMergeFields(): Aborted, field0 not found:", fieldId0);
            return;
        }
        if (typeof field1 === 'undefined'){
            console.warn("fixNodeMergeFields(): Aborted, field1 not found:", fieldId1);
            return;
        }

        // abort if fields are the same
        if (field0.getId() === field1.getId()){
            console.warn("fixNodeMergeFields(): Aborted, fields are the same.");
            return;
        }

        const usage0 = field0.getUsage();
        const usage1 = field1.getUsage();
        const newUsage = Utils._mergeUsage(usage0, usage1);

        // add all field1 edge to the field0 edges
        for (const edge of field1.getEdges()){
            field0.addEdge(edge);
        }

        // remove field1
        node.removeFieldById(field1.getId());

        // update usage of remaining field (field0)
        field0.setUsage(newUsage);

        // update all edges to use new field
        Utils._mergeEdges(eagle, field1, field0);

        // force re-draw of node
        node.redraw()
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

    static _mergeEdges(eagle: Eagle, oldField: Field, newField: Field){
        // update all edges to use new field
        for (const edge of eagle.logicalGraph().getEdges()){
            // update src port
            if (edge.getSrcPort().getId() === oldField.getId()){
                edge.setSrcPort(newField);
            }

            // update dest port
            if (edge.getDestPort().getId() === oldField.getId()){
                edge.setDestPort(newField);
            }
        }
    }

    static fixFieldId(eagle: Eagle, field: Field){
        field.setId(Utils.generateFieldId());
    }

    static fixFieldValue(eagle: Eagle, node: Node, exampleField: Field, value: string){
        let field = node.findFieldByDisplayText(exampleField.getDisplayText());

        // if a field was not found, clone one from the example and add to node
        if (typeof field === 'undefined'){
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

    static fixFieldEdges(eagle: Eagle, field: Field){
        // clear all edges from field
        field.clearEdges();

        // re-add all edges that reference this field
        for (const edge of eagle.logicalGraph().getEdges()){
            if (edge.getSrcPort().getId() === field.getId() || edge.getDestPort().getId() === field.getId()){
                field.addEdge(edge);
            }
        }
    }

    static addSourcePortToSourceNode(eagle: Eagle, edge: Edge | undefined){
        if (typeof edge === 'undefined'){
            console.warn("fixAddSourcePortToSourceNode(): edge is undefined");
            return;
        }
        const srcNode = edge.getSrcNode();
        const destPort = edge.getDestPort();

        // abort fix if source port exists on source node
        if (srcNode.hasField(edge.getSrcPort().getId())){
            return;
        }

        // determine a sensible type for the new source port
        const srcPortType = destPort.getType() === undefined ? Daliuge.DataType.Object : destPort.getType();

        // create new source port
        const srcPort = new Field(srcNode, edge.getSrcPort().getId(), destPort.getDisplayText(), "", "", "", false, srcPortType, false, [], false, Daliuge.FieldType.Application, Daliuge.FieldUsage.OutputPort);

        // add port to source node
        srcNode.addField(srcPort);
    }

    static addDestinationPortToDestinationNode(eagle: Eagle, edge: Edge | undefined){
        if (typeof edge === 'undefined'){
            console.warn("fixAddDestinationPortToDestinationNode(): edge is undefined");
            return;
        }
        const destNode = edge.getDestNode();
        const srcPort = edge.getSrcPort();

        // abort fix if destination port exists on destination node
        if (destNode.hasField(edge.getDestPort().getId())){
            return;
        }

        // determine a sensible type for the new destination port
        const destPortType = srcPort.getType() === undefined ? Daliuge.DataType.Object : srcPort.getType();

        // create new destination port
        const destPort = new Field(destNode, edge.getDestPort().getId(), srcPort.getDisplayText(), "", "", "", false, destPortType, false, [], false, Daliuge.FieldType.Application, Daliuge.FieldUsage.OutputPort);

        // add port to destination node
        destNode.addField(destPort);
    }

    static fixMoveEdgeToEmbeddedApplication(eagle: Eagle, edge: Edge | undefined){
        if (typeof edge === 'undefined'){
            console.warn("fixMoveEdgeToEmbeddedApplication(): edge is undefined");
            return;
        }
        const srcNode = edge.getSrcNode();
        const destNode = edge.getDestNode();

        // if the SOURCE node is a construct, find the port within the embedded apps, and modify the edge with a new source node
        if (srcNode.getCategoryType() === Category.Type.Construct){
            const embeddedApplicationKeyAndPort = srcNode.findPortInApplicationsById(edge.getSrcPort().getId());

            if (typeof embeddedApplicationKeyAndPort.node !== 'undefined'){
                edge.setSrcNode(embeddedApplicationKeyAndPort.node);
            }
        }

        // if the DESTINATION node is a construct, find the port within the embedded apps, and modify the edge with a new destination node
        if (destNode.getCategoryType() === Category.Type.Construct){
            const embeddedApplicationKeyAndPort = destNode.findPortInApplicationsById(edge.getDestPort().getId());

            if (typeof embeddedApplicationKeyAndPort.node !== 'undefined'){
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

    static fixAppToAppEdge(eagle: Eagle, edge: Edge | undefined){
        if (typeof edge === 'undefined'){
            console.warn("fixAppToAppEdge(): edge is undefined");
            return;
        }

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
            const appClassField = node.findFieldByDisplayText("appclass");

            if (typeof appClassField !== 'undefined'){
                appClassField.setDisplayText(Daliuge.FieldName.DROP_CLASS);
                return;
            }
        }

        // create the new field that will be used for the required field
        const field: Field = requiredField
                .clone()
                .setId(Utils.generateFieldId());
        node.addField(field);

        // try to set a reasonable default value for some known fields
        switch(field.getDisplayText()){
            case Daliuge.FieldName.DROP_CLASS:

                // look up component in palette
                const paletteComponent = Utils.getPaletteComponentByName(node.getCategory());

                if (typeof paletteComponent !== 'undefined'){
                    const dropClassField = paletteComponent.findFieldByDisplayText(Daliuge.FieldName.DROP_CLASS);
                    if (typeof dropClassField === 'undefined'){
                        console.warn("Could not find dropclass field in palette component:", paletteComponent.getName());
                        break;
                    }

                    field.setValue(dropClassField.getDefaultValue());
                    field.setDefaultValue(dropClassField.getDefaultValue());
                }

                break;
        }
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

    static newNodeId(graph: LogicalGraph, nodeId: NodeId){
        graph.updateNodeId(nodeId, Utils.generateNodeId());
    }

    static newEdgeId(graph: LogicalGraph, edgeId: EdgeId){
        const newEdgeId = Utils.generateEdgeId();

        // loop through all fields and update any edges that reference this edge id
        for (const node of graph.getNodes()){
            for (const field of node.getFields()){
                for (const edge of field.getEdges()){
                    if (edge.getId() === edgeId){
                        field.updateEdgeId(edgeId, newEdgeId);
                    }
                }
            }
        }

        graph.updateEdgeId(edgeId, newEdgeId);
    }

    static newFieldId(eagle: Eagle, node: Node, field: Field): void {
        const oldId = field.getId();
        const newId: FieldId = Utils.generateFieldId();
    
        // loop over all edges
        for (const edge of eagle.logicalGraph().getEdges()){
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
        node.updateFieldId(oldId, newId);
    }
    
    static newGraphConfigId(graph: LogicalGraph, graphConfigId: GraphConfigId): void {
        graph.updateGraphConfigId(graphConfigId, Utils.generateGraphConfigId());
    }

    static showEdge(eagle: Eagle, edge: Edge | undefined): void {
        // close errors modal if visible
        $('#issuesDisplay').modal("hide");

        if (typeof edge !== 'undefined'){
            eagle.setSelection(edge, Eagle.FileType.Graph);
        }
    }

    static showNode(eagle: Eagle, location: Eagle.FileType, node: Node): void {
        // close errors modal if visible
        $('#issuesDisplay').modal("hide");

        // check that we found the node
        if (node === null){
            console.warn("Could not show null node");
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

    static showGraphConfig(eagle: Eagle, graphConfigId: GraphConfigId){
        // open the graph configs table
        GraphConfigurationsTable.openTable();

        const graphConfig = eagle.logicalGraph().getGraphConfigById(graphConfigId);

        if (typeof graphConfig === 'undefined'){
            console.warn("Could not find graph config with id:", graphConfigId);
            return;
        }

        // highlight the name of the graph config
        setTimeout(() => {
            $('#tableRow_' + graphConfig.fileInfo().name).focus().select()
        }, 100);
    }

    static generateNewNodeId(object: Palette | LogicalGraph, node: Node){
        object.removeNode(node);
        node.setId(Utils.generateNodeId());

        if (object instanceof Palette){
            object.addNode(node, true);
        }
        if (object instanceof LogicalGraph){
            object.addNodeComplete(node);
        }
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
        }

        // add logical graph nodes to table
        for (const node of nodesList){
            const children: NodeId[] = Array.from(node.getChildren()).map(function(node:Node){return node.getId()});
            let numFieldIssues = 0;
            for (const field of node.getFields()){
                numFieldIssues += field.getIssues().length;
            }

            const parent = node.getParent();
            const embed = node.getEmbed();
            const inputApplication = node.getInputApplication();
            const outputApplication = node.getOutputApplication();
            const inputApplicationEmbed = inputApplication === null ? null : inputApplication.getEmbed();
            const outputApplicationEmbed = outputApplication === null ? null : outputApplication.getEmbed();

            tableData.push({
                "name":node.getName(),
                "id":node.getId(),
                "parent":parent === null ? null : parent.getId(),
                "embed":embed === null ? null : embed.getId(),
                "comment":node.getComment(),
                "children":children.toString(),
                "category":node.getCategory(),
                "categoryType":node.getCategoryType(),
                "expanded":node.getExpanded(),
                "peek":node.isPeek(),
                "x":node.getPosition().x,
                "y":node.getPosition().y,
                "radius":node.getRadius(),
                "inputAppId":inputApplication === null ? null : inputApplication.getId(),
                "inputAppCategory":inputApplication === null ? null : inputApplication.getCategory(),
                "inputAppEmbedId":inputApplicationEmbed === null ? null : inputApplicationEmbed.getId(),
                "outputAppId":outputApplication === null ? null : outputApplication.getId(),
                "outputAppCategory":outputApplication === null ? null : outputApplication.getCategory(),
                "outputAppEmbedId":outputApplicationEmbed === null ? null : outputApplicationEmbed.getId(),
                "nodeIssues": node.getIssues().length,
                "fieldIssues": numFieldIssues
            });
        }

        console.table(tableData);
    }

    static printLogicalGraphEdgesTable() : void {
        const tableData : any[] = [];
        const eagle : Eagle = Eagle.getInstance();

        // add logical graph nodes to table
        for (const edge of eagle.logicalGraph().getEdges()){
            const sourceNode: Node = edge.getSrcNode();
            const sourcePort: Field = edge.getSrcPort();
            const destNode: Node = edge.getDestNode();
            const destPort: Field = edge.getDestPort();

            tableData.push({
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
                const embed = node.getEmbed();

                tableData.push({
                    "id":node.getId(),
                    "palette":palette.fileInfo().name,
                    "name":node.getName(),
                    "embedId":embed === null ? null : embed.getId(),
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

        const node = eagle.logicalGraph().getNodeById(nodeId);

        // check that node at nodeIndex exists
        if (typeof node === 'undefined'){
            console.warn("Unable to print node fields table, node", nodeId, "does not exist.");
            return;
        }

        // add logical graph nodes to table
        for (const field of node.getFields()){
            tableData.push({
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
        const activeConfig = eagle.logicalGraph().getActiveGraphConfig();

        if (typeof activeConfig === 'undefined'){
            console.warn("No active graph configuration to print.");
            return;
        }

        // add logical graph nodes to table
        for (const graphConfigNode of activeConfig.getNodes()){
            const graphNode = eagle.logicalGraph().getNodeById(graphConfigNode.getNode().getId());

            if (typeof graphNode === 'undefined'){
                // TODO: what to do here? blank row, console warning?
                continue;
            }

            for (const graphConfigField of graphConfigNode.getFields()){
                const graphField = graphNode.getFieldById(graphConfigField.getField().getId());

                if (typeof graphField === 'undefined'){
                    // TODO: what to do here? blank row, console warning?
                    continue;
                }

                tableData.push({
                    "nodeName": graphNode.getName(),
                    "nodeId": graphConfigNode.getNode().getId(),
                    "fieldName": graphField.getDisplayText(),
                    "fieldId": graphConfigField.getField().getId(),
                    "value": graphConfigField.getValue(),
                    "comment": graphConfigField.getComment()
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
        const input = $('#inputTextModalInput');

        if (typeof input === 'undefined'){
            console.error("No input element found in modal");
            return;
        }

        const inputValue = input.val();
        if (typeof inputValue === 'undefined'){
            console.error("No value found in modal input element");
            return;
        }

        navigator.clipboard.writeText(inputValue.toString());
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
        const  _setOJSSchemas = function(schema: object) : void {
            Utils.ojsGraphSchema = schema;
            Utils.ojsPaletteSchema = schema;

            // HACK: we modify the palette schema from the graph schema!
            for (const notRequired of ["isGroup", "color", "drawOrderHint", "x", "y", "subject"]){
                (<any>Utils.ojsPaletteSchema).properties.nodeDataArray.items.required.splice((<any>Utils.ojsPaletteSchema).properties.nodeDataArray.items.required.indexOf(notRequired), 1);
            }
        }

        const _setV4Schemas = function(schema: object) : void {
            Utils.v4GraphSchema = schema;
            Utils.v4PaletteSchema = schema;

            // TODO: hack to introduce difference between palette and graph schemas

            // TODO: use the 'graphConfig' part of the schema for graphConfigs
            //Utils.v4GraphConfigSchema = (<any>schema).properties.graphConfigurations.patternProperties["[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"];
            Utils.v4GraphConfigSchema = {};
        }

        const _fetchSchema = async function(url: string, localStorageKey: string, setFunc: (schema: object) => void){
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
                localStorage.setItem(localStorageKey, JSON.stringify(dataObject));
            }
        }

        // try to fetch the schema
        _fetchSchema(Daliuge.OJS_GRAPH_SCHEMA_URL, 'ojsGraphSchema', _setOJSSchemas);
        _fetchSchema(Daliuge.V4_GRAPH_SCHEMA_URL, 'v4GraphSchema', _setV4Schemas);
    }

    static snapToGrid(coord: number, offset: number) : number {
        const gridSizeSetting = Setting.find(Setting.SNAP_TO_GRID_SIZE);
        const gridSize : number = gridSizeSetting ? gridSizeSetting.value() as number : 10;

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
        const palette = eagle.findPalette(paletteName, false);
        if (typeof palette === "undefined"){
            console.warn("Could not find palette", paletteName);
            return;
        }

        // find node with new type in builtinPalette
        const newCategoryPrototype = palette.findNodeByNameAndCategory(category);

        // check that category was found
        if (typeof newCategoryPrototype === 'undefined'){
            console.warn("Prototypes for new category could not be found in palettes", category);
            return;
        }

        // copy fields from new category to old node
        for (const field of newCategoryPrototype.getFields()){
            if (field.isInputPort() || field.isOutputPort()){
                continue;
            }

            // try to find field in old node that matches by displayText
            let destField = node.findFieldByDisplayText(field.getDisplayText());

            // if dest field could not be found, then go ahead and add a NEW field to the dest node
            if (typeof destField === 'undefined'){
                destField = field.clone();
                node.addField(destField);
            }

            // copy everything about the field from the src (palette), except maintain the existing id and nodeKey
            destField.copyWithIds(field, destField.getNode(), destField.getId());
        }
    }

    // duplicate a node, and all its fields
    // NOTE: if the node has an input or output application, those will NOT be duplicated!
    static duplicateNode(node: Node): Node {
        const newNodeId = Utils.generateNodeId();

        // set appropriate key for node (one that is not already in use)
        // NOTE: we remove the fields here, and re-add them one-by-one, this seems easier than changing both the key and value in the fields map
        const newNode = node
            .clone()
            .setId(newNodeId)
            .setEmbed(null)
            .setInputApplication(null)
            .setOutputApplication(null)
            .setParent(null)
            .removeAllFields();

        // set new ids for any fields in this node
        for (const field of node.getFields()){
            const clonedField = field
                .clone()
                .setId(Utils.generateFieldId())
                .setNode(newNode);
            newNode.addField(clonedField);
        }

        return newNode;
    }

    static generateGraphConfigName(config:GraphConfig): string {
        if (config.fileInfo().name === ""){
            return "Default Configuration";
        } else {
            return config.fileInfo().name + " (Copy)";
        }
    }

    static transformNodeFromTemplates(node: Node, sourceTemplate: Node, destinationTemplate: Node, keepOldFields: boolean = false): void {
        if (!keepOldFields){
            // delete non-ports from the node
            for (const field of node.getFields()){
                if (field.isInputPort() || field.isOutputPort()){
                    continue;
                }

                node.removeFieldById(field.getId());
            }
        }

        // copy non-ports from new template to node
        for (const field of destinationTemplate.getFields()){
            if (field.isInputPort() || field.isOutputPort()){
                continue;
            }

            // try to find field in node that matches by displayText
            let destField = node.findFieldByDisplayText(field.getDisplayText());

            // if dest field could not be found, then go ahead and add a NEW field to the node
            if (typeof destField === "undefined"){
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
            const key : string | null = localStorage.key(i);
            if (key === null) {
                continue;
            }

            const keyExtension : string = key.substring(key.lastIndexOf('.') + 1);

            const value : string | null = localStorage.getItem(key);
            if (value === null) {
                continue;
            }

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

    // https://stackoverflow.com/questions/6832596/how-can-i-compare-software-version-number-using-javascript-only-numbers
    static compareVersions(version1: string, version2: string): number {
        return version1.localeCompare(version2, undefined, { numeric: true, sensitivity: 'base' });
    }
    
    static updateFileInfo = (fileInfo: ko.Observable<FileInfo>, repositoryFile: RepositoryFile) : void => {
        fileInfo().location.repositoryName(repositoryFile.repository.name);
        fileInfo().location.repositoryBranch(repositoryFile.repository.branch);
        fileInfo().location.repositoryService(repositoryFile.repository.service);
        fileInfo().location.repositoryPath(repositoryFile.path);
        fileInfo().location.repositoryFileName(repositoryFile.name);
        fileInfo().type = repositoryFile.type;
        fileInfo().name = repositoryFile.name;

        // set url
        if (repositoryFile.repository.service === Repository.Service.Url){
            fileInfo().location.downloadUrl(repositoryFile.name);
        }

        // communicate to knockout that the value of the fileInfo has been modified (so it can update UI)
        fileInfo.valueHasMutated();
    }

    // check if graph is named, if not, prompt user to specify graph name
    static async checkGraphIsNamed(logicalGraph: LogicalGraph){
        return new Promise<string>(async (resolve, reject) => {
            if (logicalGraph.fileInfo().name === ""){
                let filename: string;
                try {
                    filename = await Utils.requestDiagramFilename(Eagle.FileType.Graph);
                } catch (error){
                    console.warn(error);
                    reject("User cancelled filename input");
                    return;
                }

                const eagle: Eagle = Eagle.getInstance();
                logicalGraph.fileInfo().name = filename;
                logicalGraph.fileInfo().location.repositoryFileName(filename);
                eagle.checkGraph();
                eagle.undo().pushSnapshot(eagle, "Named Logical Graph");
                eagle.logicalGraph.valueHasMutated();
                resolve(filename);
                return;
            }
            resolve(logicalGraph.fileInfo().name);
        });
    }

    // a wait/delay for a given number of milliseconds (used for debugging)
    static delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // sanitize a string to be used as a filename
    static sanitizeFileName = (name: string): string => {
        // Replace invalid filename characters with underscores
        // This regex covers most OS restrictions (Windows, macOS, Linux)
        return name.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
    }

    static getUIValue(selector: string, defaultValue: string): string {
        const value = $(selector).val();
        return value ? value.toString() : defaultValue;
    }
}
