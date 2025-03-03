import * as ko from "knockout";

import {Eagle} from './Eagle';
import {GitHub} from './GitHub';
import {GitLab} from './GitLab';
import {Palette} from './Palette';
import {Repository} from './Repository';
import {RepositoryFolder} from './RepositoryFolder';
import {RepositoryFile} from './RepositoryFile';
import {Setting} from './Setting';
import {Utils} from './Utils';

export class Repositories {

    // TODO: make this private?
    static repositories : ko.ObservableArray<Repository>;

    constructor(){
        Repositories.repositories = ko.observableArray();
    }

    static selectFolder(folder : RepositoryFolder) : void {
        // toggle expanded state
        folder.expanded(!folder.expanded());
    }

    static async selectFile(file : RepositoryFile): Promise<void> {
        const eagle: Eagle = Eagle.getInstance();

        if(file.type === Eagle.FileType.Graph || file.type === Eagle.FileType.JSON){
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
        }

        // if the file is modified, get the user to confirm they want to overwrite changes
        const confirmDiscardChanges: Setting = Setting.find(Setting.CONFIRM_DISCARD_CHANGES);
        if (isModified && confirmDiscardChanges.value()){
            try {
                await Utils.requestUserConfirm("Discard changes?", "Opening a new file will discard changes. Continue?", "OK", "Cancel", confirmDiscardChanges);
            } catch (error) {
                console.error(error);
                return;
            }

            eagle.openRemoteFile(file);
        } else {
            eagle.openRemoteFile(file);
        }
    }

    static listCustomRepositories(service: Repository.Service): Repository[] {
        const customRepositories: Repository[] = [];
        const prefix: string = service.toLowerCase();

        // search for custom repositories, and add them into the list.
        for (let i = 0; i < localStorage.length; i++) {
            const key : string = localStorage.key(i);
            const value : string = localStorage.getItem(key);
            const keyExtension : string = key.substring(key.lastIndexOf('.') + 1);

            // handle legacy repositories where the branch is not specified (assume master)
            if (keyExtension === prefix + "_repository"){
                customRepositories.push(new Repository(service, value, "master", false));
            }

            // handle the current method of storing repositories where both the service and branch are specified
            if (keyExtension === prefix + "_repository_and_branch") {
                const repositoryName = value.split("|")[0];
                const repositoryBranch = value.split("|")[1];
                customRepositories.push(new Repository(service, repositoryName, repositoryBranch, false));
            }
        }

        return customRepositories;
    }

    // use a custom modal to ask user for repository service and url at the same time
    addCustomRepository = async () => {
        let customRepository: Repository;
        try {
            customRepository = await Utils.requestUserAddCustomRepository();
        } catch (error) {
            console.error(error);
            return;
        }

        if (customRepository.name.trim() == ""){
            Utils.showUserMessage("Error", "Repository name is empty!");
            return;
        }

        if (customRepository.branch.trim() == ""){
            Utils.showUserMessage("Error", "Repository branch is empty! If you wish to use the master branch, please enter 'master'.");
            return;
        }

        this._addCustomRepository(customRepository.service, customRepository.name, customRepository.branch);
    };

    _addCustomRepository = async (repositoryService: Repository.Service, repositoryName: string, repositoryBranch: string) => {
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
            await GitHub.refresh();
        }
        if (repositoryService === Repository.Service.GitLab){
            await GitLab.refresh();
        }
    }

    removeCustomRepository = async (repository : Repository): Promise<void> => {
        const confirmRemoveRepositories: Setting = Setting.find(Setting.CONFIRM_REMOVE_REPOSITORIES);

        // if settings dictates that we don't confirm with user, remove immediately
        if (!confirmRemoveRepositories.value()){
            this._removeCustomRepository(repository);
            return;
        }

        // otherwise, check with user
        try {
            await Utils.requestUserConfirm("Remove Custom Repository", "Remove this repository from the list?", "OK", "Cancel", confirmRemoveRepositories);
        } catch (error) {
            console.error(error);
            return;
        }

        this._removeCustomRepository(repository);
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
                GitHub.refresh();
                break;
            case Repository.Service.GitLab:
                localStorage.removeItem(repository.name + ".gitlab_repository");
                localStorage.removeItem(repository.name + "|" + repository.branch + ".gitlab_repository_and_branch");
                GitLab.refresh();
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
        console.warn("Repositories.get() could not find " + service + " repository with the name " + name + " and branch " + branch);
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