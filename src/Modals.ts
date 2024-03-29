import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { Edge } from './Edge';
import { Field } from './Field';
import { LogicalGraph } from './LogicalGraph';
import { Repositories } from './Repositories';
import { Repository } from './Repository';
import { RepositoryFile } from './RepositoryFile';
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
                case "string":
                    const stringCallback : (completed : boolean, userString : string) => void = $('#inputModal').data('callback');
                    stringCallback($('#inputModal').data('completed'), $('#inputModalInput').val().toString());
                    break;
                case "number":
                    const numberCallback : (completed : boolean, userNumber : number) => void = $('#inputModal').data('callback');
                    numberCallback($('#inputModal').data('completed'), parseInt($('#inputModalInput').val().toString(), 10));
                    break;
                default:
                    console.error("Unknown return type for inputModal!");
            }
        });
        $('#inputModal').on('shown.bs.modal', function(){
            $('#inputModalInput').focus();
        });
        $('#inputModalInput').on('keypress', function(e){
            if(TutorialSystem.activeTut === null){
                if (e.which === 13){
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
            $('#inputTextModalInput').focus();
        });
        $('#inputTextModalInput').on('keypress', function(e){
            if(TutorialSystem.activeTut === null){
                if (e.which === 13){
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
            const choice : number = parseInt($('#choiceModalSelect').val().toString(), 10);

            // if the last item in the select was selected, then return the custom value,
            // otherwise return the selected choice
            if (choice === choices.length){
                callback(true, choices.length, $('#choiceModalString').val().toString());
            }
            else {
                callback(true, choice, choices[choice]);
            }
        });
        $('#choiceModalString').on('keypress', function(e){
            if(TutorialSystem.activeTut === null){
                if (e.which === 13){
                    $('#choiceModal').data('completed', true);
                    $('#choiceModal').modal('hide');
                }
            }
        });

        $('#choiceModalSelect').on('change', function(){
            // check selected option in select tag
            const choices : string[] = $('#choiceModal').data('choices');
            const choice : number = parseInt($('#choiceModalSelect').val().toString(), 10);

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
            const repositoryNameChoice : number = parseInt($('#gitCommitModalRepositoryNameSelect').val().toString(), 10);

            // split repository text (with form: "name (branch)") into name and branch strings
            const repositoryName : string = repositories[repositoryNameChoice].name;
            const repositoryBranch : string = repositories[repositoryNameChoice].branch;

            const filePath : string = $('#gitCommitModalFilePathInput').val().toString();
            const fileName : string = $('#gitCommitModalFileNameInput').val().toString();
            const commitMessage : string = $('#gitCommitModalCommitMessageInput').val().toString();

            callback(true, repositoryService, repositoryName, repositoryBranch, filePath, fileName, commitMessage);
        });
        $('#gitCommitModalRepositoryServiceSelect').on('change', function(){
            const repositoryService : Eagle.RepositoryService = <Eagle.RepositoryService>$('#gitCommitModalRepositoryServiceSelect').val();
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
            const repositoryService : string = $('#gitCustomRepositoryModalRepositoryServiceSelect').val().toString();
            const repositoryName : string = $('#gitCustomRepositoryModalRepositoryNameInput').val().toString();
            const repositoryBranch : string = $('#gitCustomRepositoryModalRepositoryBranchInput').val().toString();

            callback(true, repositoryService, repositoryName, repositoryBranch);
        });

        // #settingsModal - showSettingsModal()
        $('#settingsModal').on('shown.bs.modal', function(){
            $('#settingsModal').data('completed', false);
            eagle.copyCurrentSettings()
            if(TutorialSystem.activeTut===null){
                $('#settingsModalAffirmativeButton').focus();
            }
        });

        $("#settingsModalAffirmativeButton").on('click', function(){
            $('#settingsModal').data('completed', true);
            UiModeSystem.saveToLocalStorage()
        })

        $('#settingsModal').on('hidden.bs.modal', function () {
            const completed : boolean = $('#settingsModal').data('completed');
            if(!completed){
                eagle.cancelSettingChanges()
            }
        })

        $('#settingsModal').on("keydown", function (event) {
            if (event.key === "Enter") {
                // if pressing enter in the setting modal save settings
                if(TutorialSystem.activeTut===null){
                    event.preventDefault()
                    $("#settingsModalAffirmativeButton").focus().click();
                }
                
                //pressing excape cancels setting changes
            }else if(event.key === "Escape"){
                $("#settingsModalNegativeButton").focus().click();
            }
        });

        $('#editFieldModal').on('shown.bs.modal', function(){
            $('#editFieldModalAffirmativeButton').focus();
        });

        $('#editFieldModal').on('hidden.bs.modal', function(){
            eagle.openParamsTableModal('inspectorTableModal','normal')
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
            const srcNodeKey : number = parseInt($('#editEdgeModalSrcNodeKeySelect').val().toString(), 10);
            const srcPortId : string = $('#editEdgeModalSrcPortIdSelect').val().toString();
            const destNodeKey : number = parseInt($('#editEdgeModalDestNodeKeySelect').val().toString(), 10);
            const destPortId: string = $('#editEdgeModalDestPortIdSelect').val().toString();
            const dataType: string = $('#editEdgeModalDataTypeInput').val().toString();
            const loopAware: boolean = $('#editEdgeModalLoopAwareCheckbox').prop('checked');
            const closesLoop: boolean = $('#editEdgeModalClosesLoopCheckbox').prop('checked');

            const newEdge = new Edge(srcNodeKey, srcPortId, destNodeKey, destPortId, dataType, loopAware, closesLoop, false);

            callback(true, newEdge);
        });
        $('#editEdgeModalSrcNodeKeySelect').on('change', function(){
            const edge: Edge = $('#editEdgeModal').data('edge');
            const logicalGraph: LogicalGraph = $('#editEdgeModal').data('logicalGraph');

            const srcNodeKey : number = parseInt($('#editEdgeModalSrcNodeKeySelect').val().toString(), 10);
            edge.setSrcNodeKey(srcNodeKey);

            Utils.updateEditEdgeModal(edge, logicalGraph);
        });
        $('#editEdgeModalDestNodeKeySelect').on('change', function(){
            const edge: Edge = $('#editEdgeModal').data('edge');
            const logicalGraph: LogicalGraph = $('#editEdgeModal').data('logicalGraph');

            const destNodeKey : number = parseInt($('#editEdgeModalDestNodeKeySelect').val().toString(), 10);
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

        $('#parameterTableModal').on('hidden.bs.modal', function(){
            eagle.showTableModal(false)
            eagle.checkGraph();
        });

        $('#parameterTableModal').on('shown.bs.modal', function(){        
            $('#parameterTableModal .componentSearchBar').focus()
            $('#parameterTableModal .componentSearchBar').select()
        });
    }

    static validateFieldModalValueInputText(data:Field, event:any){
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

    static _setValidClasses(target: any, isValid: boolean){
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
