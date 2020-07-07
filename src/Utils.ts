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

import {Config} from './Config';

import {Eagle} from './Eagle';
import {Palette} from './Palette';
import {LogicalGraph} from './LogicalGraph';
import {Node} from './Node';

export class Utils {
    // Allowed file extenstions.
    static readonly FILE_EXTENSIONS : string[] = [
        "json",
        "diagram",
        "graph",
        "palette",
        "xml"
    ];

    static readonly GITHUB_ACCESS_TOKEN_KEY: string = "GitHubAccessToken";
    static readonly GITLAB_ACCESS_TOKEN_KEY: string = "GitLabAccessToken";
    static readonly TRANSLATOR_URL_KEY : string = "TranslatorURL";
    static readonly RIGHT_WINDOW_WIDTH_KEY : string = "RightWindowWidth";
    static readonly LEFT_WINDOW_WIDTH_KEY : string = "LeftWindowWidth";

    static translatorURL : string;

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

    static newKey(nodes : Node[]) : number {
        for (var i = -1 ; ; i--){
            var nodeIndex = -1;
            for (var j = 0 ; j < nodes.length ; j++){
                if (nodes[j].getKey() === i){
                    nodeIndex = j;
                    break;
                }
            }

            if (nodeIndex === -1){
                return i;
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
        if (fileType === "xml")
            return Eagle.FileType.XMLPalette;
        if (fileType === "json")
            return Eagle.FileType.JSON;

        //console.warn("Unknown file type (", fileType, ") can't be translated!");
        return Eagle.FileType.Unknown;
    }

    static translateFileTypeToString(fileType : Eagle.FileType){
        if (fileType === Eagle.FileType.Graph)
            return "graph";
        if (fileType === Eagle.FileType.Palette)
            return "palette";
        if (fileType === Eagle.FileType.TemplatePalette)
            return "templatePalette";
        if (fileType === Eagle.FileType.XMLPalette)
            return "xml";
        if (fileType === Eagle.FileType.JSON)
            return "json";

        //console.warn("Unknown file type (", fileType, ") can't be translated!");
        return "";
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
                callback(error, null);
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

            // disable the custom text input unless the last option in the select is chosen
            $('#choiceModalString').prop('disabled', choice !== choices.length);
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
            var callback : (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, filePath : string, fileName : string, commitMessage : string) => void = $('#gitCommitModal').data('callback');
            var completed : boolean = $('#gitCommitModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, Eagle.RepositoryService.Unknown, "", "", "", "");
                return;
            }

            // check selected option in select tag
            var repositoryService : Eagle.RepositoryService = <Eagle.RepositoryService>$('#gitCommitModalRepositoryServiceSelect').val();
            var repositories : string[] = $('#gitCommitModal').data('repositories');
            var repositoryNameChoice : number = parseInt(<string>$('#gitCommitModalRepositoryNameSelect').val(), 10);
            var repositoryName : string = repositories[repositoryNameChoice];
            var filePath : string = <string>$('#gitCommitModalFilePathInput').val();
            var fileName : string = <string>$('#gitCommitModalFileNameInput').val();
            var commitMessage : string = <string>$('#gitCommitModalCommitMessageInput').val();

            callback(true, repositoryService, repositoryName, filePath, fileName, commitMessage);
        });
        $('#gitCommitModalRepositoryServiceSelect').on('change', function(){
            var repositoryService : Eagle.RepositoryService = <Eagle.RepositoryService>$('#gitCommitModalRepositoryServiceSelect').val();
            var repositories = eagle.getRepositoryList(repositoryService);
            $('#gitCommitModal').data('repositories', repositories);
            Utils.updateGitCommitRepositoriesList(repositories);
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

            var callback : (completed : boolean, repositoryService : string, repositoryName : string) => void = $('#gitCustomRepositoryModal').data('callback');
            var completed : boolean = $('#gitCustomRepositoryModal').data('completed');
            console.log("completed", completed);

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, "", "");
                return;
            }

            // check selected option in select tag
            var repositoryService : string = <string>$('#gitCustomRepositoryModalRepositoryServiceSelect').val();
            var repositoryName : string = <string>$('#gitCustomRepositoryModalRepositoryNameInput').val();

            callback(true, repositoryService, repositoryName);
        });
    }

    static showUserMessage (title : string, message : string) {
        console.log("showUserMessage()", title, message);

        $('#messageModalTitle').text(title);
        $('#messageModalMessage').html(message);
        $('#messageModal').modal();
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

    static requestUserGitCommit(service : Eagle.RepositoryService, repositories: string[], filePath: string, fileName: string, callback : (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, filePath : string, fileName : string, commitMessage : string) => void ){
        console.log("requestUserGitCommit()");

        $('#gitCommitModal').data('completed', false);
        $('#gitCommitModal').data('callback', callback);
        $('#gitCommitModal').data('repositories', repositories);
        $('#gitCommitModal').modal();

        // remove existing options from the repository service select tag
        $('#gitCommitModalRepositoryServiceSelect').empty();

        // add options to the repository service select tag
        $('#gitCommitModalRepositoryServiceSelect').append($('<option>', {
            value: Eagle.RepositoryService.GitHub,
            text: Eagle.RepositoryService.GitHub,
            selected: service === Eagle.RepositoryService.GitHub
        }));
        $('#gitCommitModalRepositoryServiceSelect').append($('<option>', {
            value: Eagle.RepositoryService.GitLab,
            text: Eagle.RepositoryService.GitLab,
            selected: service === Eagle.RepositoryService.GitLab
        }));

        Utils.updateGitCommitRepositoriesList(repositories);

        // pre-selected the currently selected index
        //$('#gitCommitModalRepositorySelect').val(selectedChoiceIndex);

        $('#gitCommitModalFilePathInput').val(filePath);
        $('#gitCommitModalFileNameInput').val(fileName);


    }

    static requestUserAddCustomRepository(callback : (completed : boolean, repositoryService : string, repositoryName : string) => void){
        console.log("requestUserAddCustomRepository()");

        $('#gitCustomRepositoryModalRepositoryNameInput').val("");

        $('#gitCustomRepositoryModal').data('completed', false);
        $('#gitCustomRepositoryModal').data('callback', callback);
        $('#gitCustomRepositoryModal').modal();
    }

    static updateGitCommitRepositoriesList(repositories : string[]){
        // remove existing options from the repository name select tag
        $('#gitCommitModalRepositoryNameSelect').empty();

        // add options to the repository name select tag
        for (var i = 0 ; i < repositories.length ; i++){
            $('#gitCommitModalRepositoryNameSelect').append($('<option>', {
                value: i,
                text: repositories[i]
            }));
        }
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
                var portName = node.getInputPorts()[j].getName();
                if (portName !== Config.eventPortName) {
                    allPortNames.push(portName);
                }
            }

            // add input local port names into the list
            for (var j = 0; j < node.getInputLocalPorts().length; j++) {
                var portName = node.getInputLocalPorts()[j].getName();
                if (portName !== Config.eventPortName) {
                    allPortNames.push(portName);
                }
            }

            // add output port names into the list
            for (var j = 0; j < node.getOutputPorts().length; j++) {
                var portName = node.getOutputPorts()[j].getName();
                if (portName !== Config.eventPortName) {
                    allPortNames.push(portName);
                }
            }

            // add output local port names into the list
            for (var j = 0; j < node.getOutputLocalPorts().length; j++) {
                var portName = node.getOutputLocalPorts()[j].getName();
                if (portName !== Config.eventPortName) {
                    allPortNames.push(portName);
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

        return uniqueFieldNames;
    }

    static isKnownCategory(category : string) : boolean {
        return category === Eagle.Category.BashShellApp ||
        category === Eagle.Category.Comment ||
        category === Eagle.Category.Component ||
        category === Eagle.Category.Description ||
        category === Eagle.Category.Docker ||
        category === Eagle.Category.DynlibApp ||
        category === Eagle.Category.End ||
        category === Eagle.Category.ExclusiveForceNode ||
        category === Eagle.Category.File ||
        category === Eagle.Category.Gather ||
        category === Eagle.Category.GroupBy ||
        category === Eagle.Category.Loop ||
        category === Eagle.Category.Memory ||
        category === Eagle.Category.MKN ||
        category === Eagle.Category.MPI ||
        category === Eagle.Category.NGAS ||
        category === Eagle.Category.None ||
        category === Eagle.Category.PythonApp ||
        category === Eagle.Category.S3 ||
        category === Eagle.Category.Scatter ||
        category === Eagle.Category.Service ||
        category === Eagle.Category.Start ||
        category === Eagle.Category.Unknown;
    }

    static getColorForNode(category : Eagle.Category) : string {
        switch (category){
            case Eagle.Category.Start:
                return "#229954";
            case Eagle.Category.End:
                return "#CB4335";
            case Eagle.Category.Comment:
                return "#799938";
            case Eagle.Category.Description:
                return "#9B3065";
            case Eagle.Category.Component:
                return "#3498DB";
            case Eagle.Category.PythonApp:
                return "#3498DB";
            case Eagle.Category.BashShellApp:
                return "#1C2833";
            case Eagle.Category.DynlibApp:
                return "#3470AA";
            case Eagle.Category.MPI:
                return "#1E90FF";
            case Eagle.Category.Docker:
                return "#331C54";
            case Eagle.Category.GroupBy:
                return "#7F8C8D";
            case Eagle.Category.Scatter:
                return "#DDAD00";
            case Eagle.Category.Gather:
                return "#D35400";
            case Eagle.Category.MKN:
                return "#D32000";
            case Eagle.Category.Loop:
                return "#512E5F";
            case Eagle.Category.Memory:
                return "#394BB2";
            case Eagle.Category.File:
                return "#394BB2";
            case Eagle.Category.S3:
                return "#394BB2";
            case Eagle.Category.NGAS:
                return "#394BB2";
            case Eagle.Category.Service:
                return "#EB1672";
            case Eagle.Category.ExclusiveForceNode:
                return "#000000";
            case Eagle.Category.Unknown:
                return "#FF66CC";
            default:
                console.warn("No color for node with category", category);
                return "";
        }
    }

    static getCanHaveInputsForCategory(category : Eagle.Category) : boolean {
        switch (category){
            case Eagle.Category.BashShellApp:
            case Eagle.Category.Component:
            case Eagle.Category.Docker:
            case Eagle.Category.DynlibApp:
            case Eagle.Category.End:
            case Eagle.Category.File:
            case Eagle.Category.Gather:
            case Eagle.Category.GroupBy:
            case Eagle.Category.Loop:
            case Eagle.Category.Memory:
            case Eagle.Category.MKN:
            case Eagle.Category.MPI:
            case Eagle.Category.NGAS:
            case Eagle.Category.S3:
            case Eagle.Category.Scatter:
                return true;
            default:
                return false;
        }
    }

    static getCanHaveOutputsForCategory(category : Eagle.Category) : boolean {
        switch (category){
            case Eagle.Category.BashShellApp:
            case Eagle.Category.Component:
            case Eagle.Category.Docker:
            case Eagle.Category.DynlibApp:
            case Eagle.Category.File:
            case Eagle.Category.Gather:
            case Eagle.Category.GroupBy:
            case Eagle.Category.Loop:
            case Eagle.Category.Memory:
            case Eagle.Category.MKN:
            case Eagle.Category.MPI:
            case Eagle.Category.NGAS:
            case Eagle.Category.S3:
            case Eagle.Category.Scatter:
            case Eagle.Category.Start:
                return true;
            default:
                return false;
        }
    }

    /**
     * Fetch the URL of the graph translator from the server. Also check localStorage to see if the default location has been overwritten.
     */
    static fetchTranslatorURL() : void {
        // try localStorage first
        Utils.translatorURL = localStorage.getItem(this.TRANSLATOR_URL_KEY);

        // if found, return
        if (Utils.translatorURL !== null){
            return;
        }

        // otherwise, request the url from the server
        Utils.httpPostJSON("/getTranslatorUrl", null, function(error : string, data: string){
            if (error != null){
                console.error(error);
                return;
            }
            Utils.translatorURL = data;
        });
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
}
