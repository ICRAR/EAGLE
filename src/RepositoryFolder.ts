import * as ko from "knockout";

import { Repository } from "./Repository";
import { RepositoryFile } from './RepositoryFile';

export class RepositoryFolder {
    name : string
    expanded : ko.Observable<boolean>
    isFetching: ko.Observable<boolean>
    fetched : ko.Observable<boolean>
    folders : ko.ObservableArray<RepositoryFolder>
    files : ko.ObservableArray<RepositoryFile>
    repository : Repository;
    path: string;

    constructor(name : string, repository: Repository, path: string){
        this.name = name;
        this.expanded = ko.observable(false);
        this.isFetching = ko.observable(false);
        this.fetched = ko.observable(false);
        this.folders = ko.observableArray([]);
        this.files = ko.observableArray([]);
        this.repository = repository;
        this.path = path;
    }

    htmlId : ko.PureComputed<string> = ko.pureComputed(() => {
        return "folder_" + this.name.replace('.', '_');
    }, this);

    select = async () : Promise<void> => {
        // if we have already fetched data for this folder, just expand or collapse the list as appropriate
        // otherwise fetch the data
        if (this.fetched()){
            this.expanded(!this.expanded());
        } else {
            return Repository.fetch(this.repository, this.path);
        }
    }

    refresh = async () : Promise<void> => {
        return Repository.fetch(this.repository, this.path);
    }
}
