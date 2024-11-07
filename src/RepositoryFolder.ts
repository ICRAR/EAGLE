import * as ko from "knockout";

import {RepositoryFile} from './RepositoryFile';

export class RepositoryFolder {
    name : string
    expanded : ko.Observable<boolean>
    folders : ko.ObservableArray<RepositoryFolder>
    files : ko.ObservableArray<RepositoryFile>
    handle: FileSystemDirectoryHandle

    constructor(name : string){
        this.name = name;
        this.expanded = ko.observable(false);
        this.folders = ko.observableArray([]);
        this.files = ko.observableArray([]);
        this.handle = null;
    }

    htmlId : ko.PureComputed<string> = ko.pureComputed(() => {
        return "folder_" + this.name.replace('.', '_');
    }, this);
}
