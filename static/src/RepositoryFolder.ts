import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {Repository} from './Repository';
import {RepositoryFile} from './RepositoryFile';

export class RepositoryFolder {
    name : string
    expanded : ko.Observable<boolean>
    folders : ko.ObservableArray<RepositoryFolder>
    files : ko.ObservableArray<RepositoryFile>

    constructor(name : string){
        this.name = name;
        this.expanded = ko.observable(false);
        this.folders = ko.observableArray([]);
        this.files = ko.observableArray([]);
    }

    htmlId : ko.PureComputed<string> = ko.pureComputed(() => {
        return "folder_" + this.name.replace('.', '_');
    }, this);
}
