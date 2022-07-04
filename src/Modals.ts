import {Eagle} from './Eagle';
import * as ko from "knockout";
import {Edge} from './Edge';
import {Field} from './Field';
import {LogicalGraph} from './LogicalGraph';
import {Repository} from './Repository';
import {RepositoryFile} from './RepositoryFile';
import {Utils} from './Utils';
import {PaletteInfo} from './PaletteInfo';

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
            callback($('#inputTextModal').data('completed'), $('#inputTextModalInput').val().toString());
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
            if (e.which === 13){
                $('#choiceModal').data('completed', true);
                $('#choiceModal').modal('hide');
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
            const repositories: Repository[] = eagle.getRepositoryList(repositoryService);
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
            $('#settingsModalAffirmativeButton').focus();
        });

        // $("#settingsModalNegativeButton").on('click', function(){
        //     eagle.cancelSettingChanges()
        // })

        $("#settingsModalAffirmativeButton").on('click', function(){
            $('#settingsModal').data('completed', true);
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
                event.preventDefault()
                $("#settingsModalAffirmativeButton").focus().click();
                //pressing excape cancels setting changes
            }else if(event.key === "Escape"){
                $("#settingsModalNegativeButton").focus().click();
            }
        });

        // #editFieldModal - requestUserEditField()
        $('#editFieldModalAffirmativeButton').on('click', function(){
            $('#editFieldModal').data('completed', true);
        });
        $('#editFieldModalResetToDefaultButton').on('click', function(){
            const valueText : string = $('#editFieldModalValueInputText').val().toString();
            const valueCheckbox : boolean = $('#editFieldModalValueInputCheckbox').prop('checked');
            const defaultValueText : string = $('#editFieldModalDefaultValueInputText').val().toString();
            const defaultValueCheckbox : boolean = $('#editFieldModalDefaultValueInputCheckbox').prop('checked');
            const type: string = $('#editFieldModalTypeInput').val().toString();
            const fieldType: string = $('#editFieldModalFieldTypeSelect').val().toString();

            // translate type
            const realType: string = Utils.translateStringToDataType(type);

            if (realType === Eagle.DataType_Boolean){
                $('#editFieldModalValueInputCheckbox').prop('checked', defaultValueCheckbox);
            } else {
                $('#editFieldModalValueInputText').val(defaultValueText);
            }
        });

        $('#editFieldModal').on('shown.bs.modal', function(){
            $('#editFieldModalAffirmativeButton').focus();
        });
        $('#fieldModalSelect').on('change', function(){
            // check selected option in select tag
            const choices : string[] = $('#editFieldModal').data('choices');
            const choice : number = parseInt($('#fieldModalSelect').val().toString(), 10);

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
            //const id : string = $('#editFieldModalIdInput').val().toString();
            const id : string = "";
            const idText : string = $('#editFieldModalIdTextInput').val().toString();
            const displayText : string = $('#editFieldModalDisplayTextInput').val().toString();

            // only one of these three ui elements contains the "real" value,
            // but we get all three and then choose correctly based on field type
            const valueText : string = $('#editFieldModalValueInputText').val().toString();
            const valueCheckbox : boolean = $('#editFieldModalValueInputCheckbox').prop('checked');
            let valueSelect : string = "";
            if ($('#editFieldModalValueInputSelect').val()){
                valueSelect = $('#editFieldModalValueInputSelect').val().toString();
            }

            // only one of these three ui elements contains the "real" default value,
            // but we get all three and then choose correctly based on field type
            const defaultValueText : string = $('#editFieldModalDefaultValueInputText').val().toString();
            const defaultValueCheckbox : boolean = $('#editFieldModalDefaultValueInputCheckbox').prop('checked');
            let defaultValueSelect : string = "";
            if ($('#editFieldModalDefaultValueInputSelect').val()){
                defaultValueSelect = $('#editFieldModalDefaultValueInputSelect').val().toString();
            }

            const description: string = $('#editFieldModalDescriptionInput').val().toString();
            const type: string = $('#editFieldModalTypeInput').val().toString();
            let fieldType: string = "";
            if ($('#editFieldModalFieldTypeSelect').val()){
                fieldType = $('#editFieldModalFieldTypeSelect').val().toString();
            }

            // NOTE: currently no way to edit options in the "select"-type fields
            const options: string[] = [];

            const precious: boolean = $('#editFieldModalPreciousInputCheckbox').prop('checked');
            const readonly: boolean = $('#editFieldModalAccessInputCheckbox').prop('checked');
            const positional: boolean = $('#editFieldModalPositionalInputCheckbox').prop('checked');

            // translate type
            const realType: string = Utils.translateStringToDataType(Utils.dataTypePrefix(type));
            const realFieldType: Eagle.FieldType = Utils.translateStringToFieldType(fieldType);
            let newField;

            switch(realType){
                case Eagle.DataType_Boolean:
                    newField = new Field(id, displayText, idText, valueCheckbox.toString(), defaultValueCheckbox.toString(), description, readonly, type, precious, options, positional, realFieldType);
                    break;
                case Eagle.DataType_Select:
                    newField = new Field(id, displayText, idText, valueSelect, defaultValueSelect, description, readonly, type, precious, options, positional, realFieldType);
                    break;
                default:
                    newField = new Field(id, displayText, idText, valueText, defaultValueText, description, readonly, type, precious, options, positional, realFieldType);
                    break;
            }

            callback(true, newField);
        });

        $('#editFieldModal').on('show.bs.modal', function(){
            const type: string = $('#editFieldModalTypeInput').val().toString();
            const realType = Utils.translateStringToDataType(type);

            Modals._updateFieldModalDataType(realType);
        });
        $('#editFieldModalTypeInput').on('change', function(){
            // show the correct entry field based on the field type
            const type: string = $('#editFieldModalTypeInput').val().toString();
            const realType = Utils.translateStringToDataType(type);

            Modals._updateFieldModalDataType(realType);

            // re-validate, given the new type
            Modals._validateFieldModalValueInputText();
        });
        // add some validation of the idText
        $('#editFieldModalIdTextInput').on('keyup', function(){
            Modals._validateFieldModalIdText();
        });

        // add some validation to the value entry field
        $('#editFieldModalValueInputText').on('keyup', function(){
            Modals._validateFieldModalValueInputText();
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

            const newEdge = new Edge(srcNodeKey, srcPortId, destNodeKey, destPortId, dataType, loopAware, closesLoop);

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

            for (const ep of eagle.explorePalettes().getProject().palettes()){
                if (ep.isSelected()){
                    eagle.openRemoteFile(new RepositoryFile(new Repository(ep.repositoryService, ep.repositoryName, ep.repositoryBranch, false), ep.path, ep.name));
                }
            }

            /*
            // loop through the explorePalettes, find any selected and load them
            for (const project of eagle.explorePalettes().projects()){
                for (const pi of project.palettes()){
                    if (pi.isSelected()){
                        eagle.openRemoteFile(new RepositoryFile(new Repository(pi.repositoryService, pi.repositoryName, pi.repositoryBranch, false), pi.path, pi.name));
                        pi.isSelected(false);
                    }
                }
            }
            */
        });
    }

    static _validateFieldModalIdText(){
        const idText: string = $('#editFieldModalIdTextInput').val().toString();
        const isValid = Utils.validateIdText(idText);

        Modals._setValidClasses('#editFieldModalIdTextInput', isValid);
    }

    static _validateFieldModalValueInputText(){
        const type: string = $('#editFieldModalTypeInput').val().toString();
        const value: string = $('#editFieldModalValueInputText').val().toString();
        const realType: string = Utils.translateStringToDataType(type);

        // only validate Json fields
        if (realType !== Eagle.DataType_Json){
            $('#editFieldModalValueInputText').removeClass('is-valid');
            $('#editFieldModalValueInputText').removeClass('is-invalid');
            return;
        }

        const isValid = Utils.validateField(realType, value);

        Modals._setValidClasses('#editFieldModalValueInputText', isValid);
    }

    static _setValidClasses(id: string, isValid: boolean){
        if (isValid){
            $(id).addClass('is-valid');
            $(id).removeClass('is-invalid');
        } else {
            $(id).removeClass('is-valid');
            $(id).addClass('is-invalid');
        }
    }

    static _updateFieldModalDataType(dataType: string){
        if (dataType === Eagle.DataType_Boolean){
            $("#editFieldModalDefaultValue").hide();
        } else {
            $("#editFieldModalDefaultValue").show();
        }

        $('#editFieldModalValueInputText').toggle(dataType !== Eagle.DataType_Boolean && dataType !== Eagle.DataType_Select);
        $('#editFieldModalValueInputCheckbox').parent().toggle(dataType === Eagle.DataType_Boolean);
        $('#editFieldModalValueInputSelect').toggle(dataType === Eagle.DataType_Select);

        $('#editFieldModalDefaultValueInputText').toggle(dataType !== Eagle.DataType_Boolean && dataType !== Eagle.DataType_Select);
        $('#editFieldModalDefaultValueInputCheckbox').toggle(dataType === Eagle.DataType_Boolean);
        $('#editFieldModalDefaultValueInputSelect').toggle(dataType === Eagle.DataType_Select);

        // handle float and integer
        // NOTE: changes here are disabled, since it is a textarea instead of an input
        /*
        if (dataType === Eagle.DataType_Float || dataType === Eagle.DataType_Integer){
            $('#editFieldModalDefaultValueInputText').attr("type", "number");
            $('#editFieldModalValueInputText').attr("type", "number");
        } else {
            $('#editFieldModalDefaultValueInputText').attr("type", "text");
            $('#editFieldModalValueInputText').attr("type", "text");
        }
        */
    }
}
