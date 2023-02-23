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

    refreshRepositoryList = () : void => {
        console.log("refreshRepositoryList()");

        GitHub.loadRepoList();
        GitLab.loadRepoList();
    };

    static selectFolder = (folder : RepositoryFolder) : void => {
        console.log("selectFolder()", folder.name);

        // toggle expanded state
        folder.expanded(!folder.expanded());
    }

    static selectFile = (file : RepositoryFile) : void => {
        console.log("selectFile() service:", file.repository.service, "repo:", file.repository.name, "branch:", file.repository.branch, "path:", file.path, "file:", file.name, "type:", file.type);
        const eagle: Eagle = Eagle.getInstance();

        // check if the current file has been modified
        let isModified = false;
        switch (file.type){
            case Eagle.FileType.Graph:
                isModified = eagle.logicalGraph().fileInfo().modified;
                break;
            case Eagle.FileType.Palette:
                const palette: Palette = eagle.findPalette(file.name, false);
                isModified = palette !== null && palette.fileInfo().modified;
                break;
            case Eagle.FileType.JSON:
                isModified = eagle.logicalGraph().fileInfo().modified;
                break;
        }

        // if the file is modified, get the user to confirm they want to overwrite changes
        if (isModified && Setting.findValue(Setting.CONFIRM_DISCARD_CHANGES)){
            Utils.requestUserConfirm("Discard changes?", "Opening a new file will discard changes. Continue?", "OK", "Cancel", (confirmed : boolean) : void => {
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
        Utils.requestUserAddCustomRepository((completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string) : void => {
            console.log("requestUserAddCustomRepository callback", completed, repositoryService, repositoryName);

            if (!completed){
                console.log("No repo entered");
                return;
            }

            if (repositoryName.trim() == ""){
                Utils.showUserMessage("Error", "Repository name is empty!");
                return;
            }

            if (repositoryBranch.trim() == ""){
                Utils.showUserMessage("Error", "Repository branch is empty! If you wish to use the master branch, please enter 'master'.");
                return;
            }

            // debug
            console.log("User entered new repo name:", repositoryService, repositoryName, repositoryBranch);

            // add extension to userString to indicate repository service
            const localStorageKey : string = Utils.getLocalStorageKey(repositoryService, repositoryName, repositoryBranch);
            if (localStorageKey === null){
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repositoryService + ")");
                return;
            }

            // Adding the repo name into the local browser storage.
            localStorage.setItem(localStorageKey, Utils.getLocalStorageValue(repositoryService, repositoryName, repositoryBranch));

            // Reload the repository lists
            if (repositoryService === Eagle.RepositoryService.GitHub)
                GitHub.loadRepoList();
            if (repositoryService === Eagle.RepositoryService.GitLab)
                GitLab.loadRepoList();
        });
    };

    removeCustomRepository = (repository : Repository) : void => {
        // if settings dictates that we don't confirm with user, remove immediately
        if (!Setting.findValue(Setting.CONFIRM_REMOVE_REPOSITORES)){
            this._removeCustomRepository(repository);
            return;
        }

        // otherwise, check with user
        Utils.requestUserConfirm("Remove Custom Repository", "Remove this repository from the list?", "OK", "Cancel", (confirmed : boolean) =>{
            if (!confirmed){
                console.log("User aborted removeCustomRepository()");
                return;
            }

            this._removeCustomRepository(repository);
        });
    };

    private _removeCustomRepository = (repository : Repository) : void => {

        // abort if the repository is one of those that is builtin to the app
        if (repository.isBuiltIn){
            console.warn("User attempted to remove a builtin repository from the list");
            return;
        }

        // remove from localStorage
        switch(repository.service){
            case Eagle.RepositoryService.GitHub:
                localStorage.removeItem(repository.name + ".repository");
                localStorage.removeItem(repository.name + ".github_repository");
                localStorage.removeItem(repository.name + "|" + repository.branch + ".github_repository_and_branch");
                GitHub.loadRepoList();
                break;
            case Eagle.RepositoryService.GitLab:
                localStorage.removeItem(repository.name + ".gitlab_repository");
                localStorage.removeItem(repository.name + "|" + repository.branch + ".gitlab_repository_and_branch");
                GitLab.loadRepoList();
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repository.service + ")");
                return;
        }
    }

    // TODO: the name seems weird here, does it need to be 
    static sort = () : void => {
        Repositories.repositories().sort(Repository.repositoriesSortFunc);
    }

    static getList = (service : Eagle.RepositoryService) : Repository[] => {
        const list : Repository[] = [];

        for (const repository of Repositories.repositories()){
            if (repository.service === service){
                list.push(repository);
            }
        }

        return list;
    };

    static get = (service : Eagle.RepositoryService, name : string, branch : string) : Repository | null => {
        console.log("getRepository()", service, name, branch);

        for (const repository of Repositories.repositories()){
            if (repository.service === service && repository.name === name && repository.branch === branch){
                return repository;
            }
        }
        console.warn("getRepositoryByName() could not find " + service + " repository with the name " + name + " and branch " + branch);
        return null;
    };

    static fetchAll = () : void => {
        for (const repository of Repositories.repositories()){
            if (!repository.fetched()){
                repository.select();
            }
        }
    }
}