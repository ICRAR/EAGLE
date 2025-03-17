import * as ko from "knockout";

import { Eagle } from './Eagle';
import { GitHub } from './GitHub';
import { GitLab } from "./GitLab";
import { RepositoryFolder } from './RepositoryFolder';
import { RepositoryFile } from './RepositoryFile';
import { Utils } from './Utils';


export class Repository {
    _id : RepositoryId
    name : string
    service : Repository.Service
    branch : string
    isBuiltIn : boolean
    isFetching: ko.Observable<boolean>
    fetched : ko.Observable<boolean>
    expanded : ko.Observable<boolean>
    files : ko.ObservableArray<RepositoryFile>
    folders : ko.ObservableArray<RepositoryFolder>

    constructor(service : Repository.Service, name : string, branch : string, isBuiltIn : boolean){
        this._id = Utils.generateRepositoryId();
        this.name = name;
        this.service = service;
        this.branch = branch;
        this.isBuiltIn = isBuiltIn;
        this.isFetching = ko.observable(false);
        this.fetched = ko.observable(false);
        this.expanded = ko.observable(false);
        this.files = ko.observableArray();
        this.folders = ko.observableArray();
    }

    htmlId : ko.PureComputed<string> = ko.pureComputed(()=>{
        return this.name.replace('/', '_') + '_' + this.branch;
    }, this);

    clear = () : void => {
        this.files.removeAll();
        this.folders.removeAll();
    }

    getNameAndBranch = () : string => {
        return this.name + " (" + this.branch + ")";
    }

    setId = (id: RepositoryId) : void => {
        this._id = id;
    }

    // TODO: async!
    select = async () : Promise<void> => {
        console.log("select(" + this.name + ")");

        // if we have already fetched data for this repo, just expand or collapse the list as appropriate
        // otherwise fetch the data
        if (this.fetched()){
            this.expanded(!this.expanded());
        } else {
            switch(this.service){
                case Repository.Service.GitHub:
                    return GitHub.loadRepoContent(this, "");
                case Repository.Service.GitLab:
                    return GitLab.loadRepoContent(this, "");
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + this.service + ")");
            }
        }
    }

    refresh = async () : Promise<void> => {
        return new Promise(async(resolve, reject) => {
            switch(this.service){
                case Repository.Service.GitHub:
                    await GitHub.loadRepoContent(this, "");
                    resolve();
                    break;
                case Repository.Service.GitLab:
                    GitLab.loadRepoContent(this, "");
                    resolve();
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
                    reject("Unknown repository service. Not GitHub or GitLab!");
            }
        });
    }

    // browse down into a repository, along the path, and return the RepositoryFolder there
    // or if no path, just return the Repository
    findPath = (path: string): Repository | RepositoryFolder => {
        let pointer: Repository | RepositoryFolder = this;
        const pathParts: string[] = path.split('/');

        for (const pathPart of pathParts){
            for (const folder of pointer.folders()){
                if (folder.name === pathPart){ 
                    pointer = folder;
                }
            }
        }
    
        return pointer;
    }

    // expand all the directories along a given path
    expandPath = (path: string): void => {
        let pointer: Repository | RepositoryFolder = this;
        const pathParts: string[] = path.split('/');

        for (const pathPart of pathParts){
            for (const folder of pointer.folders()){
                if (folder.name === pathPart){ 
                    pointer = folder;
                    folder.expanded(true);
                }
            }
        }
    }

    deleteFile = (file: RepositoryFile) : void => {
        let pointer: Repository | RepositoryFolder = this;
        let lastPointer: Repository | RepositoryFolder = null;
        const fileIsInTopLevelOfRepo: boolean = file.path === "";

        if (!fileIsInTopLevelOfRepo){
            // traverse down the folder structure
            const pathParts: string[] = file.path.split('/');
            for (const pathPart of pathParts){
                for (const folder of pointer.folders()){
                    if (folder.name === pathPart){
                        lastPointer = pointer;
                        pointer = folder;
                    }
                }
            }
        }

        // remove the file here
        for (let i = 0 ; i < pointer.files().length; i++){
            if (pointer.files()[i]._id === file._id){
                pointer.files.splice(i, 1);
                break;
            }
        }

        // check if we removed the last file in the folder
        // if so, the remove the folder too
        if (!fileIsInTopLevelOfRepo){
            if (pointer.files().length === 0){
                for (let i = 0; i < lastPointer.folders().length ; i++){
                    if (lastPointer.folders()[i].name === pointer.name){
                        lastPointer.folders.splice(i, 1);
                    }
                }
            }
        }
    }

    // a dummy repository
    // used by some functions when a repository is not actually required, but a placeholder is required for the input arguments
    public static dummy(){
        return new Repository(Repository.Service.Unknown, "", "", false);
    }

    // sorting order
    // 1. alphabetically by service
    // 2. alphabetically by name
    // 3. alphabetically by branch (master always first)
    public static repositoriesSortFunc(a : Repository, b : Repository) : number {
        if (a.service < b.service)
            return -1;

        if (a.service > b.service)
            return 1;

        if (a.name < b.name)
            return -1;

        if (a.name > b.name)
            return 1;

        if (a.branch === "master")
            return -1;

        if (a.branch < b.branch)
            return -1;

        if (a.branch > b.branch)
            return 1;

        return 0;
    }

    public static fileSortFunc(fileNameA: string, fileNameB: string) : number {
        const aType : Eagle.FileType = Utils.getFileTypeFromFileName(fileNameA);
        const bType : Eagle.FileType = Utils.getFileTypeFromFileName(fileNameB);

        if (aType !== bType){
            const aTypeNum : number = Utils.getFileTypeNum(aType);
            const bTypeNum : number = Utils.getFileTypeNum(bType);

            return aTypeNum > bTypeNum ? 1 : -1;
        }

        return fileNameA.toLowerCase() > fileNameB.toLowerCase() ? 1 : -1;
    }

    public static toJson(repository: Repository) : object {
        const result : any = {};

        result.id = repository._id;
        result.service = repository.service;
        result.name = repository.name;
        result.branch = repository.branch;

        return result;
    }

    public static async fetch(repository: Repository, path: string) : Promise<void> {
        return new Promise(async(resolve, reject) => {
            switch(repository.service){
                case Repository.Service.GitHub:
                    await GitHub.loadRepoContent(repository, path);
                    resolve();
                    break;
                case Repository.Service.GitLab:
                    GitLab.loadRepoContent(repository, path);
                    resolve();
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
                    reject("Unknown repository service. Not GitHub or GitLab!");
            }
        });
    }
}

export namespace Repository {
    export enum Service {
        GitHub = "GitHub",
        GitLab = "GitLab",
        File = "File",
        Url = "Url",
        Unknown = "Unknown"
    }
}

export class RepositoryCommit {
    repositoryService : Repository.Service
    repositoryName : string
    repositoryBranch : string
    filePath : string
    fileName : string
    message : string

    constructor(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath: string, fileName: string, message: string){
        this.repositoryService = repositoryService;
        this.repositoryName = repositoryName;
        this.repositoryBranch = repositoryBranch;
        this.filePath = filePath;
        this.fileName = fileName;
        this.message = message;
    }
}
