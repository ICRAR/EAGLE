import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { Edge } from './Edge';
import { Field } from './Field';
import { LogicalGraph } from './LogicalGraph';
import { ParameterTable } from './ParameterTable';
import { Repositories } from './Repositories';
import { Repository } from './Repository';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { SideWindow } from './SideWindow';
import { TutorialSystem } from './Tutorial';
import { UiModeSystem } from './UiModes';
import { Utils } from './Utils';

export class Modals {

    static init(eagle : Eagle) : void {
        // #inputModal - requestUserInput()
        $('#inputModal .modal-footer button').on('click', function(){
            $('#inputModal').data('completed', true);
        });
        $('#inputModal').on('hidden.bs.modal', function(){
            const returnType = $('#inputModal').data('returnType');

            switch (returnType){
                case "string": {
                    const stringCallback : (completed : boolean, userString : string) => void = $('#inputModal').data('callback');
                    stringCallback($('#inputModal').data('completed'), $('#inputModalInput').val().toString());
                    break;
                }
                case "number": {
                    const numberCallback : (completed : boolean, userNumber : number) => void = $('#inputModal').data('callback');
                    numberCallback($('#inputModal').data('completed'), parseInt($('#inputModalInput').val().toString(), 10));
                    break;
                }
                default:
                    console.error("Unknown return type for inputModal!");
            }
        });
        $('#inputModal').on('shown.bs.modal', function(){
            $('#inputModalInput').trigger("focus");
        });
        $('#inputModalInput').on('keypress', function(e){
            if(TutorialSystem.activeTut === null){
                if (e.key === "Enter"){
                    $('#inputModal').data('completed', true);
                    $('#inputModal').modal('hide');
                }
            }
        });

        // #inputTextModal - requestUserText()
        $('#inputTextModal .modal-footer button').on('click', function(){
            $('#inputTextModal').data('completed', true);
        });
        $('#inputTextModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, userString : string) => void = $('#inputTextModal').data('callback');

            if (callback === null){
                console.log("No callback called when #inputTextModal hidden");
                return;
            }

            callback($('#inputTextModal').data('completed'), $('#inputTextModalInput').val().toString());
        });
        $('#inputTextModal').on('shown.bs.modal', function(){
            $('#inputTextModalInput').trigger("focus");
        });
        $('#inputTextModalInput').on('keypress', function(e){
            if(TutorialSystem.activeTut === null){
                if (e.key === "Enter"){
                    $('#inputTextModal').data('completed', true);
                    $('#inputTextModal').modal('hide');
                }
            }
        });

        // #choiceModal - requestUserChoice()
        $('#choiceModal .modal-footer button').on('click', function(){
            $('#choiceModal').data('completed', true);
        });
        $('#choiceModal').on('shown.bs.modal', function(){
            $('#choiceModalAffirmativeButton').trigger("focus");
        });
        $('#choiceModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, choice : string) => void = $('#choiceModal').data('callback');
            const completed : boolean = $('#choiceModal').data('completed');
            
            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, "");
                return;
            }

            // check selected option in select tag
            const choices : string[] = $('#choiceModal').data('choices');
            const choiceIndex : number = parseInt($('#choiceModalSelect').val().toString(), 10);
            const choice = $('#choiceModalSelect option:selected').text();
            const customChoice = $('#choiceModalString').val().toString();

            // if the last item in the select was selected, then return the custom value,
            // otherwise return the selected choice
            if (choiceIndex === choices.length){
                callback(true, customChoice);
            } else {
                callback(true, choice);
            }
        });
        $('#choiceModalString').on('keypress', function(e){
            if(TutorialSystem.activeTut === null){
                if (e.key === "Enter"){
                    $('#choiceModal').data('completed', true);
                    $('#choiceModal').modal('hide');
                }
            }
        });

        $('#choiceModalSelect').on('change', function(){
            const choice : number = parseInt($('#choiceModalSelect').val().toString(), 10);

            //checking if the value of the select element is valid
            if(!$('#choiceModalSelect').val() || choice > $('#choiceModalSelect option').length){
                $('#choiceModalSelect').val(0)
                console.warn('Invalid selection value (', choice, '), resetting to 0')
            }

            // check selected option in select tag
            const choices : string[] = $('#choiceModal').data('choices');

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
            $('#confirmModalAffirmativeButton').trigger("focus");
        });

        // #gitCommitModal - requestUserGitCommit()
        $('#gitCommitModalAffirmativeButton').on('click', function(){
            $('#gitCommitModal').data('completed', true);
        });
        $('#gitCommitModalNegativeButton').on('click', function(){
            $('#gitCommitModal').data('completed', false);
        });
        $('#gitCommitModal').on('shown.bs.modal', function(){
            $('#gitCommitModalAffirmativeButton').trigger("focus");
        });
        $('#gitCommitModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) => void = $('#gitCommitModal').data('callback');
            const completed : boolean = $('#gitCommitModal').data('completed');
            const fileType : Eagle.FileType = $('#gitCommitModal').data('fileType');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, Repository.Service.Unknown, "", "", "", "", "");
                return;
            }

            // check selected option in select tag
            const repositoryService : Repository.Service = <Repository.Service>$('#gitCommitModalRepositoryServiceSelect').val();
            const repositories : Repository[] = $('#gitCommitModal').data('repositories');
            const repositoryNameChoice : number = parseInt($('#gitCommitModalRepositoryNameSelect').val().toString(), 10);

            // split repository text (with form: "name (branch)") into name and branch strings
            const repositoryName : string = repositories[repositoryNameChoice].name;
            const repositoryBranch : string = repositories[repositoryNameChoice].branch;

            const filePath : string = $('#gitCommitModalFilePathInput').val().toString();
            let fileName : string = $('#gitCommitModalFileNameInput').val().toString();
            const commitMessage : string = $('#gitCommitModalCommitMessageInput').val().toString();

            // ensure that the graph filename ends with ".graph" or ".palette" as appropriate
            if ((fileType === Eagle.FileType.Graph && !fileName.endsWith('.graph')) ||
                (fileType === Eagle.FileType.Palette && !fileName.endsWith('.palette'))) {
                fileName += fileType === Eagle.FileType.Graph ? '.graph' : '.palette';
            }

            callback(true, repositoryService, repositoryName, repositoryBranch, filePath, fileName, commitMessage);
        });
        $('#gitCommitModalRepositoryServiceSelect').on('change', function(){
            const repositoryService : Repository.Service = <Repository.Service>$('#gitCommitModalRepositoryServiceSelect').val();
            const repositories: Repository[] = Repositories.getList(repositoryService);
            $('#gitCommitModal').data('repositories', repositories);
            Utils.updateGitCommitRepositoriesList(repositories, null);
        });

        // #gitCustomRepositoryModal - requestUserAddCustomRepository()
        $('#gitCustomRepositoryModalRepositoryNameInput, #gitCustomRepositoryModalRepositoryBranchInput').on('keyup', function(){
            // show/hide OK button
            $('#gitCustomRepositoryModalAffirmativeButton').prop('disabled', !Utils.validateCustomRepository());
        });

        $('#gitCustomRepositoryModalAffirmativeButton').on('click', function(){
            $('#gitCustomRepositoryModal').data('completed', true);
        });
        $('#gitCustomRepositoryModalNegativeButton').on('click', function(){
            $('#gitCustomRepositoryModal').data('completed', false);
        });
        $('#gitCustomRepositoryModal').on('shown.bs.modal', function(){
            $('#gitCustomRepositoryModalRepositoryNameInput').removeClass('is-invalid');
            $('#gitCustomRepositoryModalRepositoryBranchInput').removeClass('is-invalid');

            $('#gitCustomRepositoryModalAffirmativeButton').prop('disabled', true);
            $('#gitCustomRepositoryModalAffirmativeButton').trigger("focus");
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
            const repositoryService : string = $('#gitCustomRepositoryModalRepositoryServiceSelect').val().toString();
            const repositoryName : string = $('#gitCustomRepositoryModalRepositoryNameInput').val().toString();
            const repositoryBranch : string = $('#gitCustomRepositoryModalRepositoryBranchInput').val().toString();

            callback(true, repositoryService, repositoryName, repositoryBranch);
        });

        // #settingsModal - showSettingsModal()
        $('#settingsModal').on('shown.bs.modal', function(){
            $('#settingsModal').data('completed', false);
            Setting.copy();
            if(TutorialSystem.activeTut===null){
                $('#settingsModalAffirmativeButton').trigger("focus");
            }
        });

        $("#settingsModalAffirmativeButton").on('click', function(){
            $('#settingsModal').data('completed', true);
            UiModeSystem.saveToLocalStorage()
        })

        $('#settingsModal').on('hidden.bs.modal', function () {
            const completed : boolean = $('#settingsModal').data('completed');
            if(!completed){
                Setting.cancelChanges();
            }

            eagle.setSelection(null,Eagle.FileType.Graph)
        })

        $('#settingsModal').on("keydown", function (event: JQuery.TriggeredEvent) {
            if (event.key === "Enter") {
                // if pressing enter in the setting modal save settings
                if(TutorialSystem.activeTut===null){
                    event.preventDefault()
                    $("#settingsModalAffirmativeButton").trigger("focus").trigger("click");
                }
                
            // pressing escape cancels setting changes
            }else if(event.key === "Escape"){
                $("#settingsModalNegativeButton").trigger("focus").trigger("click");
            }
        });

        $('#editFieldModal').on('shown.bs.modal', function(){
            $('#editFieldModalAffirmativeButton').trigger("focus");
        });

        $('#editFieldModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, field: Field) => void = $('#editFieldModal').data('callback');
            const completed : boolean = $('#editFieldModal').data('completed');

            // check if the modal was completed (user clicked OK), if not, return false
            if (!completed){
                callback(false, null);
                return;
            }

            callback(true, eagle.currentField())
        });

        // #editEdgeModal - requestUserEditEdge()
        $('#editEdgeModalAffirmativeButton').on('click', function(){
            $('#editEdgeModal').data('completed', true);
        });
        $('#editEdgeModalNegativeButton').on('click', function(){
            $('#editEdgeModal').data('completed', false);
        });
        $('#editEdgeModal').on('shown.bs.modal', function(){
            $('#editEdgeModalAffirmativeButton').trigger("focus");
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
            // TODO: validate ids
            const srcNodeId: NodeId = $('#editEdgeModalSrcNodeIdSelect').val().toString() as NodeId;
            const srcPortId: FieldId = $('#editEdgeModalSrcPortIdSelect').val().toString() as FieldId;
            const destNodeId: NodeId = $('#editEdgeModalDestNodeIdSelect').val().toString() as NodeId;
            const destPortId: FieldId = $('#editEdgeModalDestPortIdSelect').val().toString() as FieldId;
            const loopAware: boolean = $('#editEdgeModalLoopAwareCheckbox').prop('checked');
            const closesLoop: boolean = $('#editEdgeModalClosesLoopCheckbox').prop('checked');

            const newEdge = new Edge(srcNodeId, srcPortId, destNodeId, destPortId, loopAware, closesLoop, false);

            callback(true, newEdge);
        });
        $('#editEdgeModalSrcNodeIdSelect').on('change', function(){
            const edge: Edge = $('#editEdgeModal').data('edge');
            const logicalGraph: LogicalGraph = $('#editEdgeModal').data('logicalGraph');

            const srcNodeId: NodeId = $('#editEdgeModalSrcNodeIdSelect').val().toString() as NodeId;
            edge.setSrcNodeId(srcNodeId);

            Utils.updateEditEdgeModal(edge, logicalGraph);
        });
        $('#editEdgeModalDestNodeIdSelect').on('change', function(){
            const edge: Edge = $('#editEdgeModal').data('edge');
            const logicalGraph: LogicalGraph = $('#editEdgeModal').data('logicalGraph');

            const destNodeId: NodeId = $('#editEdgeModalDestNodeIdSelect').val().toString() as NodeId;
            edge.setDestNodeId(destNodeId);

            Utils.updateEditEdgeModal(edge, logicalGraph);
        });

        // #messageModal - showUserMessage()
        $('#messageModal').on('shown.bs.modal', function(){
            $('#messageModal .modal-footer button').trigger("focus");
        });

        $('#explorePalettesModal').on('shown.bs.modal', function(){
            $('#explorePalettesModal .modal-footer button').trigger("focus");
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

            // check if currentProjectIndex is -1, if so, no individual files were selected, so we can do nothing
            if (eagle.explorePalettes().currentProjectIndex() === -1){
                return;
            }

            // otherwise, check the current project, and load all selected palettes
            for (const ep of eagle.explorePalettes().getProject().palettes()){
                if (ep.isSelected()){
                    eagle.openRemoteFile(new RepositoryFile(new Repository(ep.repositoryService, ep.repositoryName, ep.repositoryBranch, false), ep.path, ep.name));
                }
            }
        });

        $('.parameterTable').on('hidden.bs.modal', function(){
            eagle.checkGraph();
        });

        $('.eagleTableDisplay').on('shown.bs.modal', function(){
            eagle.hideEagleIsLoading()
            Eagle.tableSearchString('')
            $('.parameterTable .componentSearchBar').val('').trigger("focus").trigger("select")
        });

        // #browseDockerHubModal - Modals.showBrowseDockerHub()
        $('#browseDockerHubModalAffirmativeButton').on('click', function(){
            $('#browseDockerHubModal').data('completed', true);
        });
        $('#browseDockerHubModalNegativeButton').on('click', function(){
            $('#browseDockerHubModal').data('completed', false);
        });
        $('#browseDockerHubModal').on('shown.bs.modal', function(){
            $('#browseDockerHubModalAffirmativeButton').trigger("focus");
        });
        $('#browseDockerHubModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean) => void = $('#browseDockerHubModal').data('callback');
            const completed : boolean = $('#browseDockerHubModal').data('completed');

            callback(completed);
        });
        $('#browseDockerHubModalString').on('keypress', function(e){
            if(TutorialSystem.activeTut === null){
                if (e.key === "Escape"){
                    $('#browseDockerHubModal').data('completed', true); 
                    $('#browseDockerHubModal').modal('hide');
                }
            }
        });
    }

    static validateFieldModalValueInputText(data: Field, event: Event): void {
        const type: string = data.getType()
        const value: any = $(event.target).val();
        const realType: string = Utils.translateStringToDataType(Utils.dataTypePrefix(type));

        // only validate Json fields
        if (realType !== Daliuge.DataType.Json){
            $(event.target).removeClass('is-valid');
            $(event.target).removeClass('is-invalid');
            return;
        }

        const isValid = Utils.validateField(realType, value);

        Modals._setValidClasses($(event.target), isValid);
    }

    static validateCommitModalFileNameInputText(): void {
        const inputElement = $("#gitCommitModalFileNameInput");
        const fileTypeData = $('#gitCommitModal').data('fileType');
        const fileType: Eagle.FileType = fileTypeData ? fileTypeData : Eagle.FileType.Unknown;
        
        const isValid = (fileType === Eagle.FileType.Unknown) ||
            (fileType === Eagle.FileType.Graph && inputElement.val().toString().endsWith(".graph")) ||
            (fileType === Eagle.FileType.Palette && inputElement.val().toString().endsWith(".palette"));

        Modals._setValidClasses(inputElement, isValid);
    }

    static showBrowseDockerHub(image: string, tag: string, callback : (completed : boolean) => void ) : void {
        const dockerHubBrowser = Eagle.getInstance().dockerHubBrowser();

        // check if supplied values are usable, populate the UI,
        if (image !== ""){
            const username: string = image.split('/')[0];
            dockerHubBrowser.populate(username, image, tag);
        }
        else // otherwise, a fetch is required
        {
            Eagle.getInstance().dockerHubBrowser().fetchImages(null, null);
        }

        // store data about the callback, result on the modal HTML element
        // so that the info is available to event handlers
        $('#browseDockerHubModal').data('completed', false);
        $('#browseDockerHubModal').data('callback', callback);

        // trigger the change event, so that the event handler runs and disables the custom text entry field if appropriate
        $('#browseDockerHubModalSelect').trigger('change');

        $('#browseDockerHubModal').modal("toggle");
    }

    static _setValidClasses(target: JQuery<EventTarget>, isValid: boolean){
        if (isValid){
            target.addClass('is-valid');
            target.removeClass('is-invalid');
        } else {
            target.removeClass('is-valid');
            target.addClass('is-invalid');
        }
    }

    static _updateFieldModalDataType(dataType: string){

        //reset value fields dataType specific attributes
        $('#editFieldModalValueInputNumber').removeClass('inputNoArrows')
        $('#editFieldModalDefaultValueInputNumber').removeClass('inputNoArrows')
        $('#editFieldModalValueInputNumber').removeAttr('min').removeAttr('step').removeAttr('onfocus').removeAttr( 'onkeydown').removeAttr( 'oninput')
        $('#editFieldModalDefaultValueInputNumber').removeAttr('min').removeAttr('step').removeAttr('onfocus').removeAttr( 'onkeydown').removeAttr( 'oninput')
        

        //toggle on the correct value input fields depending on type
        $('#editFieldModalValueInputText').toggle(dataType !== Daliuge.DataType.Boolean && dataType !== Daliuge.DataType.Select && dataType !== Daliuge.DataType.Float && dataType !== Daliuge.DataType.Integer);
        $('#editFieldModalValueInputNumber').toggle(dataType === Daliuge.DataType.Float || dataType === Daliuge.DataType.Integer);
        $('#editFieldModalValueInputCheckbox').parent().toggle(dataType === Daliuge.DataType.Boolean);
        $('#editFieldModalValueInputSelect').toggle(dataType === Daliuge.DataType.Select);

        $('#editFieldModalDefaultValueInputText').toggle(dataType !== Daliuge.DataType.Boolean && dataType !== Daliuge.DataType.Select && dataType !== Daliuge.DataType.Float && dataType !== Daliuge.DataType.Integer);
        $('#editFieldModalDefaultValueInputNumber').toggle(dataType === Daliuge.DataType.Float || dataType === Daliuge.DataType.Integer);
        $('#editFieldModalDefaultValueInputCheckbox').parent().toggle(dataType === Daliuge.DataType.Boolean);
        $('#editFieldModalDefaultValueInputSelect').toggle(dataType === Daliuge.DataType.Select);

        //setting up number value input specific things that are different for integers of floats 
        if(dataType === Daliuge.DataType.Integer){
            $('#editFieldModalValueInputNumber').attr('min',"0").attr('step',"1").attr('onfocus',"this.previousValue = this.value").attr( 'onkeydown', "this.previousValue = this.value").attr( 'oninput',"validity.valid || (value = this.previousValue)")
            $('#editFieldModalDefaultValueInputNumber').attr('min',"0").attr('step',"1").attr('onfocus',"this.previousValue = this.value").attr( 'onkeydown', "this.previousValue = this.value").attr( 'oninput',"validity.valid || (value = this.previousValue)")

        }else if (dataType === Daliuge.DataType.Float){
            $('#editFieldModalValueInputNumber').addClass('inputNoArrows')
            $('#editFieldModalDefaultValueInputNumber').addClass('inputNoArrows')
        }
    }
}
