import * as ko from "knockout";

import {Eagle} from './Eagle';

export class PaletteInfo {
    repositoryService : Eagle.RepositoryService;
    repositoryName : string;
    repositoryBranch : string;
    name : string
    path : string
    isFetching: ko.Observable<boolean>
    isSelected: ko.Observable<boolean>

    constructor(repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, name : string, path : string){
        this.repositoryService = repositoryService;
        this.repositoryName = repositoryName;
        this.repositoryBranch = repositoryBranch;
        this.name = name;
        this.path = path;
        this.isFetching = ko.observable(false);
        this.isSelected = ko.observable(false);
    }
}
