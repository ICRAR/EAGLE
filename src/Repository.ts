import * as ko from "knockout";

import {RepositoryFolder} from './RepositoryFolder';
import {RepositoryFile} from './RepositoryFile';
import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {GitHub} from './GitHub';
import {GitLab} from "./GitLab";

export class Repository {
    _id : number
    name : string
    service : Repository.Service
    branch : string
    isBuiltIn : boolean
    isFetching: ko.Observable<boolean>
    fetched : ko.Observable<boolean>
    expanded : ko.Observable<boolean>
    files : ko.ObservableArray<RepositoryFile>
    folders : ko.ObservableArray<RepositoryFolder>

    // NOTE: I think we should be able to use the Repository.Service.Unknown enum here, but it causes a javascript error. Not sure why.
    static readonly DUMMY = new Repository(<Repository.Service>"Unknown", "", "", false);

    constructor(service : Repository.Service, name : string, branch : string, isBuiltIn : boolean){
        this._id = Math.floor(Math.random() * 1000000000000);
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

    select = () : void => {
        console.log("select(" + this.name + ")");

        // if we have already fetched data for this repo, just expand or collapse the list as appropriate
        // otherwise fetch the data
        if (this.fetched()){
            this.expanded(!this.expanded());
        } else {
            switch(this.service){
                case Repository.Service.GitHub:
                    GitHub.loadRepoContent(this);
                    break;
                case Repository.Service.GitLab:
                    GitLab.loadRepoContent(this);
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + this.service + ")");
            }
        }
    }

    refresh = () : void => {
        switch(this.service){
            case Repository.Service.GitHub:
                GitHub.loadRepoContent(this);
                break;
            case Repository.Service.GitLab:
                GitLab.loadRepoContent(this);
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
        }
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