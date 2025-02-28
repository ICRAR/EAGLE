import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Repository } from './Repository';
import { Utils } from './Utils';

export class RepositoryFile {
    _id : RepositoryFileId
    repository: Repository
    name : string
    path : string
    type : Eagle.FileType;
    isFetching: ko.Observable<boolean>;

    constructor(repository : Repository, path : string, name : string){
        this._id = Utils.generateRepositoryFileId();
        this.repository = repository;
        this.name = name;
        this.path = path;
        this.isFetching = ko.observable(false);
        this.type = Utils.getFileTypeFromFileName(this.name);
    }

    getIconUrl : ko.PureComputed<string> = ko.pureComputed(() : string => {

        switch (this.type){
            case Eagle.FileType.Graph:
                return "device_hub";
            case Eagle.FileType.Palette:
                return "palette";
            case Eagle.FileType.JSON:
                return "language";
            default:
                return this.type;
        }
    }, this);

    htmlId : ko.PureComputed<string> = ko.pureComputed(() => {
        return "id_" + this.name.replace('.', '_');
    }, this);
}
