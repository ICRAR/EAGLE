import * as ko from "knockout";

import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { GitHub } from './GitHub';
import { GitLab } from './GitLab';
import { Palette } from './Palette';
import { Repository } from './Repository';
import { RepositoryFolder } from './RepositoryFolder';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { Utils } from './Utils';

export class Repositories {

    // TODO: make this private?
    static repositories : ko.ObservableArray<Repository>;

    constructor(){
        Repositories.repositories = ko.observableArray();
    }

    refreshRepositoryList = () : void => {
        GitHub.loadRepoList();
        GitLab.loadRepoList();
    };

    static selectFolder(folder : RepositoryFolder) : void {
        // toggle expanded state
        folder.expanded(!folder.expanded());
    }

    static selectFile(file : RepositoryFile) : void {
        const eagle: Eagle = Eagle.getInstance();

        if(file.type === Eagle.FileType.Graph || file.type === Eagle.FileType.JSON || file.type === Eagle.FileType.Daliuge){
            eagle.showEagleIsLoading()
        }

        // check if the current file has been modified
        let isModified = false;
        switch (file.type){
            case Eagle.FileType.Graph:
                isModified = eagle.logicalGraph().fileInfo().modified;
                break;
            case Eagle.FileType.Palette: {
                const palette: Palette = eagle.findPalette(file.name, false);
                isModified = palette !== null && palette.fileInfo().modified;
                break;
            }
            case Eagle.FileType.JSON:
                isModified = eagle.logicalGraph().fileInfo().modified;
                break;
            case Eagle.FileType.Daliuge:
                isModified = eagle.logicalGraph().fileInfo().modified;
                break;
        }

        // if the file is modified, get the user to confirm they want to overwrite changes
        const confirmDiscardChanges: Setting = Setting.find(Setting.CONFIRM_DISCARD_CHANGES);
        if (isModified && confirmDiscardChanges.value()){
            Utils.requestUserConfirm("Discard changes?", "Opening a new file will discard changes. Continue?", "OK", "Cancel", confirmDiscardChanges, (confirmed : boolean) : void => {
                if (!confirmed){
                    console.log("selectFile() cancelled");
                    return;
                }

                eagle.openRemoteFile(file);
            });
        } else {
            eagle.openRemoteFile(file);
        }
    }

    // use a custom modal to ask user for repository service and url at the same time
    addCustomRepository = () : void => {
        Utils.requestUserAddCustomRepository((completed : boolean, repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string) : void => {
            console.log("requestUserAddCustomRepository callback", completed, repositoryService, repositoryName);

            if (!completed){
                console.log("No repo entered");
                return;
            }

            if (repositoryService === Repository.Service.GitHub || repositoryService === Repository.Service.GitLab){
                if (repositoryName.trim() == ""){
                    Utils.showUserMessage("Error", "Repository name is empty!");
                    return;
                }

                if (repositoryBranch.trim() == ""){
                    Utils.showUserMessage("Error", "Repository branch is empty! If you wish to use the master branch, please enter 'master'.");
                    return;
                }
            }

            // add extension to userString to indicate repository service
            const localStorageKey : string = Utils.getLocalStorageKey(repositoryService, repositoryName, repositoryBranch);
            if (localStorageKey === null){
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repositoryService + ")");
                return;
            }

            // Adding the repo name into the local browser storage.
            localStorage.setItem(localStorageKey, Utils.getLocalStorageValue(repositoryService, repositoryName, repositoryBranch));

            // Reload the repository lists
            if (repositoryService === Repository.Service.GitHub){
                GitHub.loadRepoList();
            }
            if (repositoryService === Repository.Service.GitLab){
                GitLab.loadRepoList();
            }
            if (repositoryService === Repository.Service.LocalDirectory){
                // fetch FileSystemDirectoryHandle from a data attribute on the 'custom repository' modal
                const dirHandle: FileSystemDirectoryHandle = $('#gitCustomRepositoryModal').data('dirHandle');

                // create a new Repository and add the dirHandle
                const newRepo = new Repository(Repository.Service.LocalDirectory, dirHandle.name, "", false);
                newRepo.dirHandle = dirHandle;
    
                // add new Repository to the repositories list
                Repositories.repositories.push(newRepo);
            }
        });
    };

    removeCustomRepository = (repository : Repository) : void => {
        const confirmRemoveRepositories: Setting = Setting.find(Setting.CONFIRM_REMOVE_REPOSITORIES);

        // if settings dictates that we don't confirm with user, remove immediately
        if (!confirmRemoveRepositories.value()){
            this._removeCustomRepository(repository);
            return;
        }

        // otherwise, check with user
        Utils.requestUserConfirm("Remove Custom Repository", "Remove this repository from the list?", "OK", "Cancel", confirmRemoveRepositories, (confirmed : boolean) =>{
            if (!confirmed){
                console.log("User aborted removeCustomRepository()");
                return;
            }

            this._removeCustomRepository(repository);
        });
    };

    addLocalDirectory = async () => {
        console.log("addLocalDirectory()");
        let dirHandle: FileSystemDirectoryHandle;

        try {
            dirHandle = await (<any>window).showDirectoryPicker({
                id: EagleConfig.DIRECTORY_PICKER_ID,
                mode: "readwrite"
            });
        } catch (err) {
            console.error(err.name, err.message);
            return;
        }

        console.log("dirHandle", dirHandle);

        $('#gitCustomRepositoryModal').data('dirHandle', dirHandle);
        $('#gitCustomRepositoryModalDirectoryNameInput').val(dirHandle.name).trigger('change');
    };

    private _removeCustomRepository = (repository : Repository) : void => {

        // abort if the repository is one of those that is builtin to the app
        if (repository.isBuiltIn){
            console.warn("User attempted to remove a builtin repository from the list");
            return;
        }

        // remove from localStorage
        switch(repository.service){
            case Repository.Service.GitHub:
                localStorage.removeItem(repository.name + ".repository");
                localStorage.removeItem(repository.name + ".github_repository");
                localStorage.removeItem(repository.name + "|" + repository.branch + ".github_repository_and_branch");
                GitHub.loadRepoList();
                break;
            case Repository.Service.GitLab:
                localStorage.removeItem(repository.name + ".gitlab_repository");
                localStorage.removeItem(repository.name + "|" + repository.branch + ".gitlab_repository_and_branch");
                GitLab.loadRepoList();
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repository.service + ")");
                return;
        }
    }

    static sort() : void {
        Repositories.repositories.sort(Repository.repositoriesSortFunc);
    }

    static getList(service : Repository.Service) : Repository[]{
        const list : Repository[] = [];

        for (const repository of Repositories.repositories()){
            if (repository.service === service){
                list.push(repository);
            }
        }

        return list;
    }

    static get(service : Repository.Service, name : string, branch : string) : Repository | null {
        for (const repository of Repositories.repositories()){
            if (repository.service === service && repository.name === name && repository.branch === branch){
                return repository;
            }
        }
        console.warn("getRepositoryByName() could not find " + service + " repository with the name " + name + " and branch " + branch);
        return null;
    }

    static fetchAll() : void {
        for (const repository of Repositories.repositories()){
            if (!repository.fetched()){
                repository.select();
            }
        }
    }
}