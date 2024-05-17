import * as ko from "knockout";

import { Repository } from "./Repository";

export class PaletteInfo {
    repositoryService : Repository.Service;
    repositoryName : string;
    repositoryBranch : string;
    name : string
    path : string
    isFetching: ko.Observable<boolean>
    isSelected: ko.Observable<boolean>

    constructor(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, name : string, path : string){
        this.repositoryService = repositoryService;
        this.repositoryName = repositoryName;
        this.repositoryBranch = repositoryBranch;
        this.name = name;
        this.path = path;
        this.isFetching = ko.observable(false);
        this.isSelected = ko.observable(false);
    }

    fullPath = () : string => {
        if (this.path === ""){
            return this.name;
        } else {
            return this.path + '/' + this.name;
        }
    }
}
