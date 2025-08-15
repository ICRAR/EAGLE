import * as ko from "knockout";

import { Eagle } from './Eagle';
import { EagleStorage } from "./EagleStorage";
import { Palette } from './Palette';
import { Repository } from './Repository';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { Utils } from './Utils';

export class Repositories {

    // TODO: make this private?
    static repositories : ko.ObservableArray<Repository>;

    constructor(){
        Repositories.repositories = ko.observableArray();
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
                eagle.hideEagleIsLoading();
                return;
            }

            eagle.openRemoteFile(file);
        } else {
            eagle.openRemoteFile(file);
        }
    }
    
    static translateStringToService(service: string): Repository.Service {
        for (const s in Repository.Service){
            if (s.toLowerCase() === service.toLowerCase()){
                return s as Repository.Service;
            }
        }

        return Repository.Service.Unknown;
    }

    static generateUrl(repository: Repository): string {
        let url = window.location.origin;

        url += "/?service=" + repository.service;
        url += "&repository=" + repository.name;
        url += "&branch=" + repository.branch;

        return url;
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
            console.log("Error", "Repository name is empty!");
            return;
        }

        if (customRepository.branch.trim() == ""){
            Utils.showUserMessage("Error", "Repository branch is empty! If you wish to use the master branch, please enter 'master'.");
            return;
        }

        this._addCustomRepository(customRepository.service, customRepository.name, customRepository.branch);
    };

    _addCustomRepository = async (repositoryService: Repository.Service, repositoryName: string, repositoryBranch: string) => {
        // create repo
        const newRepo = new Repository(repositoryService, repositoryName, repositoryBranch, false);

        // add to IndexedDB
        EagleStorage.addCustomRepository(newRepo);

        // add to Repositories, and re-sort the repository list
        Repositories.repositories.push(newRepo);
        Repositories.sort();
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

    copyRepository = async (repository: Repository): Promise<void> => {
        console.log("copyRepository()", repository.getNameAndBranch());

        // build url
        const url: string = Repositories.generateUrl(repository);

        try {
            // copy to clipboard
            await navigator.clipboard.writeText(url);

            // notification
            Utils.showNotification("Repository URL", "Copied to clipboard", "success");
        } catch (error) {
            Utils.showNotification("Repository URL", "Failed to copy to clipboard", "danger");
            console.error("Failed to copy repository URL:", error);
        }
    }

    private _removeCustomRepository = (repository : Repository) : void => {

        // abort if the repository is one of those that is builtin to the app
        if (repository.isBuiltIn){
            console.warn("User attempted to remove a builtin repository from the list");
            return;
        }

        // remove from IndexedDB
        EagleStorage.removeCustomRepository(repository);

        // remove from Repositories.repositories
        for (let i = Repositories.repositories().length - 1 ; i >= 0 ; i--){
            if (Repositories.repositories()[i]._id === repository._id){
                Repositories.repositories.splice(i, 1);
            }
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