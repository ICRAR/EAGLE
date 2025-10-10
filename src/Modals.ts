import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { Edge } from './Edge';
import { Field } from './Field';
import { LogicalGraph } from './LogicalGraph';
import { Repositories } from './Repositories';
import { Repository } from './Repository';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { TutorialSystem } from './Tutorial';
import { UiModeSystem } from './UiModes';
import { Utils } from './Utils';

declare const CodeMirror: any;

export class Modals {

    static init(eagle : Eagle) : void {
        // #inputModal - requestUserInput()
        $('#inputModal .modal-footer button.affirmativeBtn').on('click', function(){
            $('#inputModal').data('completed', true);
        });
        $('#inputModal').on('hidden.bs.modal', function(){
            const returnType = $('#inputModal').data('returnType');
            const completed: boolean = $('#inputModal').data('completed');
            const input: string = $('#inputModalInput').val().toString();

            switch (returnType){
                case "string": {
                    const stringCallback : (completed : boolean, userString : string) => void = $('#inputModal').data('callback');
                    if (stringCallback){
                        stringCallback(completed, input);
                    } else {
                        console.error("No 'stringCallback' data attribute found on modal");
                    }
                    break;
                }
                case "number": {
                    const numberCallback : (completed : boolean, userNumber : number) => void = $('#inputModal').data('callback');
                    if (numberCallback){
                        numberCallback(completed, parseInt(input, 10));
                    } else {
                        console.error("No 'numberCallback' data attribute found on modal");
                    }
                    break;
                }
                default:
                    console.error("Unknown return type (" + returnType + ") for inputModal!");
            }

            // remove data stored on modal
            $('#inputModal').removeData(['callback', 'completed', 'returnType']);
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
        $('#inputTextModal .modal-footer button.affirmativeBtn').on('click', function(){
            $('#inputTextModal').data('completed', true);
        });
        $('#inputTextModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, userString : string) => void = $('#inputTextModal').data('callback');

            if (!callback){
                console.log("No callback called when #inputTextModal hidden");
            } else {
                const completed: boolean = $('#inputTextModal').data('completed');
                const input: string = $('#inputTextModalInput').val().toString();
                callback(completed, input);
            }

            // remove data stored on the modal
            $('#inputTextModal').removeData(['callback', 'completed']);
        });
        $('#inputTextModal').on('shown.bs.modal', function(){
            $('#inputTextModalInput').trigger("focus");
        });

        // #inputCodeModal - requestUserCode()
        {
            // get html element to use as the editor
            const element = document.querySelector("#inputCodeModalEditor");

            // create the editor
            const myCodeMirror = CodeMirror(element, {
                value: "",
                mode:  "python",
                lineNumbers: true,
                tabSize: 4
            });

            // add reference to the editor to a data attribute on the modal
            $('#inputCodeModal').data('editor', myCodeMirror);
        }

        $('#inputCodeModal .modal-footer button.affirmativeBtn').on('click', function(){
            $('#inputCodeModal').data('completed', true);
        });
        $('#inputCodeModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, userString : string) => void = $('#inputCodeModal').data('callback');

            if (!callback){
                console.log("No callback called when #inputCodeModal hidden");
            } else {
                // get content of code editor - and return via callback
                const editor = $('#inputCodeModal').data('editor');
                const completed: boolean = $('#inputCodeModal').data('completed');
                const content: string = editor.getValue();
                callback(completed, content);
            }

            // remove data stored on the modal
            $('#inputCodeModal').removeData(['callback', 'completed']);
        });

        $('#inputCodeModal').on('shown.bs.modal', function(){
            const editor = $('#inputCodeModal').data('editor');
            editor.refresh();
        });

        // #inputMarkdownModal - requestUserMarkdown()
        {
            // get html element to use as the editor
            const element = document.querySelector("#inputMarkdownModalEditor");

            // create the editor
            const myCodeMirror = CodeMirror(element, {
                value: "",
                mode:  "markdown",
                lineNumbers: true,
                lineWrapping: true,
                tabSize: 4
            });

            // add reference to the editor to a data attribute on the modal
            $('#inputMarkdownModal').data('editor', myCodeMirror);

            // watch for changes in the editor and reflect them in the display
            myCodeMirror.on('change', (editorInstance: any, changeObj: any) => {
                const value = editorInstance.getValue();
                Modals.setMarkdownContent(value);
            });
        }

        $('#inputMarkdownModal .modal-footer button.affirmativeBtn').on('click', function(){
            $('#inputMarkdownModal').data('completed', true);
        });
        $('#inputMarkdownModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, userString : string) => void = $('#inputMarkdownModal').data('callback');

            if (!callback){
                console.log("No callback called when #inputMarkdownModal hidden");
            } else {
                // get content of code editor - and return via callback
                const editor = $('#inputMarkdownModal').data('editor');
                const completed: boolean = $('#inputMarkdownModal').data('completed');
                const content: string = editor.getValue();
                callback(completed, content);
            }

            // remove data stored on the modal
            $('#inputMarkdownModal').removeData(['callback', 'completed']);
        });

        $('#inputMarkdownModal').on('shown.bs.modal', function(){
            const editor = $('#inputMarkdownModal').data('editor');
            if (editor){
                editor.refresh();
            } else {
                console.error("No 'editor' data attribute found on modal");
            }
        });

        // #choiceModal - requestUserChoice()
        $('#choiceModal .modal-footer button.affirmativeBtn').on('click', function(){
            $('#choiceModal').data('completed', true);
        });
        $('#choiceModal').on('shown.bs.modal', function(){
            $('#choiceModalAffirmativeButton').trigger("focus");
        });
        $('#choiceModal').on('hidden.bs.modal', function(){
            const callback : (completed : boolean, choice : string) => void = $('#choiceModal').data('callback');
            if (!callback){
                console.error("No 'callback' data attribute found on modal");
            } else {
                const completed: boolean = $('#choiceModal').data('completed');
                
                // check if the modal was completed (user clicked OK), if not, return false
                if (!completed){
                    callback(false, "");
                } else {
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
                }
            }

            // remove data stored on the modal
            $('#choiceModal').removeData(['callback', 'completed', 'choices']);
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
                console.warn('Invalid selection value (', choice, '), resetting to 0');
            }

            // check selected option in select tag
            const choices : string[] = $('#choiceModal').data('choices');

            // hide the custom text input unless the last option in the select is chosen
            $('#choiceModalStringRow').toggle(choice === choices.length);
        })

        // #confirmModal - requestUserConfirm()
        $('#confirmModalAffirmativeButton').on('click', function(){
            $('#confirmModal').data('completed', true);
            $('#confirmModal').data('confirmed', true);
        });
        $('#confirmModalNegativeButton').on('click', function(){
            $('#confirmModal').data('completed', true);
            $('#confirmModal').data('confirmed', false);
        });
        $('#confirmModal').on('shown.bs.modal', function(){
            $('#confirmModalAffirmativeButton').trigger("focus");
        });
        $('#confirmModal').on('hidden.bs.modal', function(){
            const callback : (completed: boolean, confirmed: boolean) => void = $('#confirmModal').data('callback');
            if (!callback){
                console.error("No 'callback' data attribute found on modal");
            } else {
                const completed: boolean = $('#confirmModal').data('completed');
                const confirmed: boolean = $('#confirmModal').data('confirmed');

                callback(completed, confirmed);
            }

            // remove data stored on the modal
            $('#confirmModal').removeData(['callback', 'completed', 'confirmed']);
        });

        // #optionsModal - requestUserOptions()
        $('#optionsModalOption0').on('click', function(){
            const callback : (selectedOptionIndex: number) => void = $('#optionsModal').data('callback');
            if (callback){
                callback(0);
            } else {
                console.error("No 'callback' data attribute found on modal");
            }

            // remove data stored on the modal
            $('#optionsModal').removeData('callback');
        });
        $('#optionsModalOption1').on('click', function(){
            const callback : (selectedOptionIndex: number) => void = $('#optionsModal').data('callback');
            if (callback){
                callback(1);
            } else {
                console.error("No 'callback' data attribute found on modal");
            }

            // remove data stored on the modal
            $('#optionsModal').removeData('callback');
        });
        $('#optionsModalOption2').on('click', function(){
            const callback : (selectedOptionIndex: number) => void = $('#optionsModal').data('callback');
            if (callback){
                callback(2);
            } else {
                console.error("No 'callback' data attribute found on modal");
            }

            // remove data stored on the modal
            $('#optionsModal').removeData('callback');
        });
        $('#optionsModal').on('shown.bs.modal', function(){
            $('#optionsModalOption0').trigger("focus");
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

            if (!callback){
                console.error("No 'callback' data attribute found on modal");
            } else {
                // check if the modal was completed (user clicked OK), if not, return false
                const completed : boolean = $('#gitCommitModal').data('completed');
                if (!completed){
                    callback(false, Repository.Service.Unknown, "", "", "", "", "");
                } else {
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
                    const fileType : Eagle.FileType = $('#gitCommitModal').data('fileType');
                    if ((fileType === Eagle.FileType.Graph && !fileName.endsWith('.graph')) ||
                        (fileType === Eagle.FileType.Palette && !fileName.endsWith('.palette'))) {
                        fileName += fileType === Eagle.FileType.Graph ? '.graph' : '.palette';
                    }

                    callback(true, repositoryService, repositoryName, repositoryBranch, filePath, fileName, commitMessage);
                }
            }

            $('#gitCommitModal').removeData(['callback', 'completed', 'fileType', 'repositories']);
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

            if (!callback){
                console.error("No 'callback' data attribute found on modal");
            } else {
                // check if the modal was completed (user clicked OK), if not, return false
                const completed : boolean = $('#gitCustomRepositoryModal').data('completed');
                if (!completed){
                    callback(false, "", "", "");
                } else {

                    // check selected option in select tag
                    const repositoryService : string = $('#gitCustomRepositoryModalRepositoryServiceSelect').val().toString();
                    const repositoryName : string = $('#gitCustomRepositoryModalRepositoryNameInput').val().toString();
                    const repositoryBranch : string = $('#gitCustomRepositoryModalRepositoryBranchInput').val().toString();

                    callback(true, repositoryService, repositoryName, repositoryBranch);
                }
            }

            $('#gitCustomRepositoryModal').removeData(['callback', 'completed']);
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
            
            if (!callback){
                console.error("No 'callback' data attribute found on modal");
            } else {
                // check if the modal was completed (user clicked OK), if not, return false
                const completed : boolean = $('#editFieldModal').data('completed');
                if (!completed){
                    callback(false, null);
                } else {
                    callback(true, eagle.currentField());
                }
            }

            $('#editFieldModal').removeData(['callback', 'completed']);
        });

        // #messageModal - showUserMessage()
        $('#messageModal').on('shown.bs.modal', function(){
            $('#messageModal .modal-footer button').trigger("focus");
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

            if (!callback){
                console.error("No 'callback' data attribute found on modal");
            } else {
                const completed : boolean = $('#browseDockerHubModal').data('completed');
                callback(completed);
            }

            // remove data stored on the modal
            $('#browseDockerHubModal').removeData(['callback', 'completed']);
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
            (fileType === Eagle.FileType.Palette && inputElement.val().toString().endsWith(".palette")) ||
            (fileType === Eagle.FileType.GraphConfig && inputElement.val().toString().endsWith(".graphConfig"));

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
        $('#editFieldModalValueInputNumber').removeAttr('min').removeAttr('step').removeAttr('onfocus').removeAttr( 'onkeydown').removeAttr( 'oninput')

        //toggle on the correct value input fields depending on type
        $('#editFieldModalValueInputText').toggle(dataType !== Daliuge.DataType.Boolean && dataType !== Daliuge.DataType.Select && dataType !== Daliuge.DataType.Float && dataType !== Daliuge.DataType.Integer);
        $('#editFieldModalValueInputNumber').toggle(dataType === Daliuge.DataType.Float || dataType === Daliuge.DataType.Integer);
        $('#editFieldModalValueInputCheckbox').parent().toggle(dataType === Daliuge.DataType.Boolean);
        $('#editFieldModalValueInputSelect').toggle(dataType === Daliuge.DataType.Select);

        //setting up number value input specific things that are different for integers of floats 
        if(dataType === Daliuge.DataType.Integer){
            $('#editFieldModalValueInputNumber').attr('min',"0").attr('step',"1").attr('onfocus',"this.previousValue = this.value").attr( 'onkeydown', "this.previousValue = this.value").attr( 'oninput',"validity.valid || (value = this.previousValue)")
        }else if (dataType === Daliuge.DataType.Float){
            $('#editFieldModalValueInputNumber').addClass('inputNoArrows')
        }
    }

    static toggleMarkdownEditMode(enabled: boolean){
        // if no param specified, toggle the current state
        if (typeof enabled === 'undefined'){
            const isVisible = $('#inputMarkdownModalEditorSection').is(":visible");
            enabled = !isVisible;
        }

        $('#inputMarkdownModalEditorSection').toggle(enabled);
        $('#editMarkdownSwitchCheck').prop('checked', enabled);
        if (enabled){
            $('#inputMarkdownModalDisplaySection').addClass('col-6');
            $('#inputMarkdownModalDisplaySection').removeClass('col-12');
        } else {
            $('#inputMarkdownModalDisplaySection').removeClass('col-6');
            $('#inputMarkdownModalDisplaySection').addClass('col-12');
        }

        // make sure the editor is refreshed
        const editor = $('#inputMarkdownModal').data('editor');
        editor.refresh();

        // update setting
        Setting.setValue(Setting.MARKDOWN_EDITING_ENABLED, enabled);
    }

    static setMarkdownContent(value: string){
        const html = Utils.markdown2html(value);
        $('#inputMarkdownModalDisplay').html(html);
    }
}
