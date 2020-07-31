import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';
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
        this.type = Utils.getFileTypeFromFileName(name);
    }

    getIconUrl : ko.PureComputed<string> = ko.pureComputed(() => {
        switch (this.type){
            case Eagle.FileType.Graph:
                return "device_hub";
            case Eagle.FileType.Palette:
                return "palette";
            case Eagle.FileType.TemplatePalette:
                return "clear";
            case Eagle.FileType.JSON:
                return "language";
            default:
                return "block";
        }
    }, this);

    htmlId : ko.PureComputed<string> = ko.pureComputed(() => {
        return "id_" + this.name.replace('.', '_');
    }, this);
}
