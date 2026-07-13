import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Id } from './Id';
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
        this._id = Id.generateRepositoryFileId();
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
            case Eagle.FileType.GraphConfig:
                return "construction";
            case Eagle.FileType.JSON:
                return "language";
            case Eagle.FileType.Markdown:
                return "markdown";
            case Eagle.FileType.Unknown:
            default:
                return "unknown_document";
        }
    }, this);

    htmlId : ko.PureComputed<string> = ko.pureComputed(() => {
        return "id_" + this.name.replace('.', '_');
    }, this);

    pathAndName : ko.PureComputed<string> = ko.pureComputed(() => {
        if (this.path === ""){
            return this.name;
        }
        return this.path + '/' + this.name;
    }, this);

    getUrl : ko.PureComputed<string> = ko.pureComputed(() => {
        return Utils.buildUrl(this.repository.service, this.repository.name, this.repository.branch, this.path, this.name);
    }, this);

    openInNewTab = (): void => {
        const url = this.getUrl();
        const win = window.open(url, "_blank");
        if (win) {
            win.focus();
        } else {
            alert("Please allow popups for this website");
        }
    }

    copyUrlToClipboard = async (): Promise<void> => {
        const url = this.getUrl();

        try {
            await navigator.clipboard.writeText(url);
            Utils.showNotification("File URL", "Copied to clipboard", "success");
        } catch (error) {
            Utils.showNotification("File URL", "Failed to copy to clipboard", "danger");
            console.error("Failed to copy file URL:", error);
        }
    }
}
