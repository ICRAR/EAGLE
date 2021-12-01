import {Eagle} from './Eagle';
import {Edge} from './Edge';
import {Field} from './Field';
import {LogicalGraph} from './LogicalGraph';
import {Port} from './Port';
import {Repository} from './Repository';
import {RepositoryFile} from './RepositoryFile';
import {Utils} from './Utils';

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
        $('#editFieldModalResetToDefaultButton').on('click', function(){
            const valueText : string = <string>$('#editFieldModalValueInputText').val();
            const valueCheckbox : boolean = $('#editFieldModalValueInputCheckbox').prop('checked');
            const defaultValueText : string = <string>$('#editFieldModalDefaultValueInputText').val();
            const defaultValueCheckbox : boolean = $('#editFieldModalDefaultValueInputCheckbox').prop('checked');
            const type: string = <string>$('#editFieldModalTypeSelect').val();

            // translate type
            const realType: Eagle.DataType = Utils.translateStringToDataType(type);

            if (realType === Eagle.DataType.Boolean){
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
            const defaultValueText : string = <string>$('#editFieldModalDefaultValueInputText').val();
            const defaultValueCheckbox : boolean = $('#editFieldModalDefaultValueInputCheckbox').prop('checked');
            const description: string = <string>$('#editFieldModalDescriptionInput').val();
            const access: string = <string>$('#editFieldModalAccessSelect').val();
            const type: string = <string>$('#editFieldModalTypeSelect').val();
            const precious: boolean = $('#editFieldModalPreciousInputCheckbox').prop('checked');

            // translate access and type
            const readonly: boolean = access === 'readonly';
            const realType: Eagle.DataType = Utils.translateStringToDataType(type);
            let newField;

            if (realType === Eagle.DataType.Boolean){
                newField = new Field(text, name, valueCheckbox.toString(), defaultValueCheckbox.toString(), description, readonly, realType, precious);
            } else {
                newField = new Field(text, name, valueText, defaultValueText, description, readonly, realType, precious);
            }

            callback(true, newField);
        });

        $('#editFieldModal').on('show.bs.modal', function(){
            const value = $('#editFieldModalTypeSelect').val();

            if(value === Eagle.DataType.Float || value === Eagle.DataType.Integer){
                $('#editFieldModalDefaultValueInputText').attr("type", "number")
                $('#editFieldModalValueInputText').attr("type", "number")
            }else{
                $('#editFieldModalDefaultValueInputText').attr("type", "text")
                $('#editFieldModalValueInputText').attr("type", "text")
            }
        });
        $('#editFieldModalTypeSelect').on('change', function(){
            // show the correct entry field based on the field type
            const value = $('#editFieldModalTypeSelect').val();

            $('#editFieldModalValueInputText').toggle(value !== Eagle.DataType.Boolean);
            $('#editFieldModalValueInputCheckbox').toggle(value === Eagle.DataType.Boolean);
            $('#editFieldModalDefaultValueInputText').toggle(value !== Eagle.DataType.Boolean);
            $('#editFieldModalDefaultValueInputCheckbox').toggle(value === Eagle.DataType.Boolean);

            if(value === Eagle.DataType.Float || value === Eagle.DataType.Integer){
                $('#editFieldModalDefaultValueInputText').attr("type", "number")
                $('#editFieldModalValueInputText').attr("type", "number")
            }else{
                $('#editFieldModalDefaultValueInputText').attr("type", "text")
                $('#editFieldModalValueInputText').attr("type", "text")
            }
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
            const text: string = <string>$('#editPortModalTextInput').val();
            const type: string = <string>$('#editPortModalTypeInput').val();
            const description: string = <string>$('#editPortModalDescriptionInput').val();

            const newPort = new Port(id, name, text, false, type, description);

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
}
