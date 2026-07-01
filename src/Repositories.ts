import * as ko from "knockout";

import { Eagle } from './Eagle';
import { EagleStorage } from "./EagleStorage";
import { FileLocation } from "./FileLocation";
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
                const palette = eagle.findPalette(file.name, false);
                isModified = typeof palette !== "undefined" && palette.fileInfo().modified;
                break;
            }
            case Eagle.FileType.JSON:
                isModified = eagle.logicalGraph().fileInfo().modified;
                break;
        }

        // if the file is modified, get the user to confirm they want to overwrite changes
        const confirmDiscardChangesSetting = Setting.find(Setting.CONFIRM_DISCARD_CHANGES);
        const confirmDiscardChanges: boolean = confirmDiscardChangesSetting ? confirmDiscardChangesSetting.value() as boolean : true; // confirm by default if setting is undefined
        if (isModified && confirmDiscardChanges){
            const confirmed = await Utils.requestUserConfirm("Discard changes?", "Opening a new file will discard changes. Continue?", "OK", "Cancel", confirmDiscardChangesSetting);
            if (confirmed){
                eagle.openRemoteFile(file);
            }
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
        return Utils.buildUrl(repository.service, repository.name, repository.branch);
    }

    static validateBranchName(branchName: string): string | null {
        if (branchName.trim() === ""){
            return "Branch name cannot be empty.";
        }

        if (/\s/.test(branchName)){
            return "Branch name cannot contain whitespace.";
        }

        return null;
    }

    static getWebUrl(repository: Repository): string {
        switch (repository.service){
            case Repository.Service.GitHub:
                return "https://github.com/" + encodeURI(repository.name) + "/tree/" + encodeURIComponent(repository.branch);
            case Repository.Service.GitLab:
                return "https://gitlab.com/" + encodeURI(repository.name) + "/-/tree/" + encodeURIComponent(repository.branch);
            default:
                throw new Error("Unsupported repository service: " + repository.service);
        }
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

        Repositories._addCustomRepository(customRepository.service, customRepository.name, customRepository.branch);
    };

    static async _addCustomRepository(repositoryService: Repository.Service, repositoryName: string, repositoryBranch: string): Promise<Repository> {
        // create repo
        const newRepo = new Repository(repositoryService, repositoryName, repositoryBranch, false);

        // add to IndexedDB
        EagleStorage.addCustomRepository(newRepo);

        // add to Repositories, and re-sort the repository list
        Repositories.repositories.push(newRepo);
        Repositories.sort();

        return newRepo;
    }

    removeCustomRepository = async (repository : Repository): Promise<void> => {
        const confirmRemoveRepositories = Setting.find(Setting.CONFIRM_REMOVE_REPOSITORIES);
        const confirmRemoveRepositoriesValue: boolean = confirmRemoveRepositories ? confirmRemoveRepositories.value() as boolean : true; // confirm by default if setting is undefined

        // if settings dictates that we don't confirm with user, remove immediately
        if (!confirmRemoveRepositoriesValue){
            this._removeCustomRepository(repository);
            return;
        }

        // otherwise, check with user
        const confirmed = await Utils.requestUserConfirm("Remove Custom Repository", "Remove this repository from the list?", "OK", "Cancel", confirmRemoveRepositories);
        if (confirmed){
            this._removeCustomRepository(repository);
        }
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

    openRepositoryInBrowser = async (repository: Repository): Promise<void> => {
        const url = Repositories.getWebUrl(repository);
        const win = window.open(url, "_blank");
        if (win) {
            win.focus();
        } else {
            alert("Please allow popups for this website");
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

    createBranch = async (repository: Repository, branchName: string): Promise<Repository> => {
        // find the user's token for the source repository service
        const token = Utils.getServiceToken(repository.service);

        // call eagleServer to create branch
        const responseStr = await Utils.httpPostJSON("/createBranch", {
            service: repository.service,
            repository: repository.name,
            sourceBranch: repository.branch,
            newBranch: branchName,
            token: token
        });
        let response;
        try {
            response = typeof responseStr === "string" ? JSON.parse(responseStr) : responseStr;
        } catch (e) {
            response = responseStr;
        }
        if (response.error) {
            throw new Error(response.error);
        }

        // add new repo to the repository list and return the created instance
        return Repositories._addCustomRepository(repository.service, repository.name, branchName);
    };

    deleteBranch = async (repository: Repository): Promise<void> => {
        // find the user's token for the source repository service
        const token = Utils.getServiceToken(repository.service);

        // call eagleServer to delete branch
        const responseStr = await Utils.httpPostJSON("/deleteBranch", {
            service: repository.service,
            repository: repository.name,
            branchToDelete: repository.branch,
            token: token
        });
        let response;
        try {
            response = typeof responseStr === "string" ? JSON.parse(responseStr) : responseStr;
        } catch (_e) {
            response = responseStr;
        }
        if (response.error) {
            throw new Error(response.error);
        }

        // Remove deleted branch from local repository list and storage.
        this._removeCustomRepository(repository);
    };

    promptCreateBranch = async (repository: Repository): Promise<void> => {
        let branchName: string;
        try {
            branchName = await Utils.requestUserString("Create Branch", "Enter a name for the new branch", "", false, Repositories.validateBranchName);
        } catch {
            return; // user cancelled
        }

        try {
            await this.createBranch(repository, branchName);
            Utils.showNotification("Branch Created", `Successfully created branch '${branchName}'`, "success");
        } catch (error) {
            Utils.showNotification("Error", `Failed to create branch: ${error}`, "danger");
        }
    };

    promptDeleteBranch = async (repository: Repository): Promise<void> => {
        const protectedBranches = ["master", "main"];
        const branchName = repository.branch.trim().toLowerCase();
        if (protectedBranches.includes(branchName)) {
            Utils.showNotification("Delete Branch", `Cannot delete protected branch '${repository.branch}'`, "danger");
            return;
        }

        const confirmed = await Utils.requestUserConfirm(
            "Delete Branch",
            `Delete branch '${repository.branch}' from repository '${repository.name}'?`,
            "Delete",
            "Cancel",
            undefined
        );
        if (!confirmed){
            return;
        }

        try {
            await this.deleteBranch(repository);
            Utils.showNotification("Branch Deleted", `Successfully deleted branch '${repository.branch}'`, "success");
        } catch (error) {
            Utils.showNotification("Error", `Failed to delete branch: ${error}`, "danger");
        }
    };

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

    static getByLocation(fileLocation: FileLocation) : Repository | null {
        return Repositories.get(fileLocation.repositoryService(), fileLocation.repositoryName(), fileLocation.repositoryBranch());
    }

    static fetchAll() : void {
        for (const repository of Repositories.repositories()){
            if (!repository.fetched()){
                repository.select();
            }
        }
    }
}