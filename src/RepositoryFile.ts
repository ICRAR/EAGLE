import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Repository} from './Repository';

export class RepositoryFile {
    _id : number
    repository: Repository
    name : string
    path : string
    type : Eagle.FileType;
    isFetching: ko.Observable<boolean>

    constructor(repository : Repository, path : string, name : string){
        this._id = Math.floor(Math.random() * 1000000000000);
        this.repository = repository;
        this.name = name;
        this.path = path;
        this.isFetching = ko.observable(false);
        this.type = Eagle.FileType.Unknown;
    }

    htmlId : ko.PureComputed<string> = ko.pureComputed(() => {
        return "id_" + this.name.replace('.', '_');
    }, this);
}
