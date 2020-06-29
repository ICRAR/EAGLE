import * as ko from "knockout";

import {RepositoryFolder} from './RepositoryFolder';
import {RepositoryFile} from './RepositoryFile';
import {Eagle} from './Eagle';
import {Utils} from './Utils';

export class Repository {
    _id : number
    name : string
    service : Eagle.RepositoryService
    isBuiltIn : boolean
    isFetching: ko.Observable<boolean>
    fetched : ko.Observable<boolean>
    expanded : ko.Observable<boolean>
    files : ko.ObservableArray<RepositoryFile>
    folders : ko.ObservableArray<RepositoryFolder>

    constructor(name : string, service : Eagle.RepositoryService, isBuiltIn : boolean){
        this._id = Math.floor(Math.random() * 1000000000000);
        this.name = name;
        this.service = service;
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

    public static fileSortFunc = (a: string, b: string) : number => {
        var aType : Eagle.FileType = Utils.getFileTypeFromFileName(a);
        var bType : Eagle.FileType = Utils.getFileTypeFromFileName(b);

        if (aType !== bType){
            return aType - bType;
        }
        return aType > bType ? -1 : 1;
    }
}
