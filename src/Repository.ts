import * as ko from "knockout";

import {RepositoryFolder} from './RepositoryFolder';
import {RepositoryFile} from './RepositoryFile';
import {Eagle} from './Eagle';
import {Utils} from './Utils';

export class Repository {
    _id : number
    name : string
    service : Eagle.RepositoryService
    branch : string
    isBuiltIn : boolean
    isFetching: ko.Observable<boolean>
    fetched : ko.Observable<boolean>
    expanded : ko.Observable<boolean>
    files : ko.ObservableArray<RepositoryFile>
    folders : ko.ObservableArray<RepositoryFolder>

    // NOTE: I think we should be able to use the Eagle.RepositoryService.Unknown enum here, but it causes a javascript error. Not sure why.
    static DUMMY = new Repository(<Eagle.RepositoryService>"Unknown", "", "", false);

    constructor(service : Eagle.RepositoryService, name : string, branch : string, isBuiltIn : boolean){
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
        return this.name.replace('/', '_');
    }, this);

    clear = () : void => {
        this.files.removeAll();
        this.folders.removeAll();
    }

    getNameAndBranch = () : string => {
        return this.name + " (" + this.branch + ")";
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

    public static fileSortFunc = (a: string, b: string) : number => {
        var aType : Eagle.FileType = Utils.getFileTypeFromFileName(a);
        var bType : Eagle.FileType = Utils.getFileTypeFromFileName(b);

        if (aType !== bType){
            return aType - bType;
        }
        return aType > bType ? -1 : 1;
    }
}
