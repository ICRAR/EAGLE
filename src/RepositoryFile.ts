import * as ko from "knockout";

import { EagleFileType } from './Eagle';
import { Id } from './Id';
import { Repository } from './Repository';
import { Utils } from './Utils';

export class RepositoryFile {
    _id : RepositoryFileId
    repository: Repository
    name : string
    path : string
    type : EagleFileType;
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
            case EagleFileType.Graph:
                return "device_hub";
            case EagleFileType.Palette:
                return "palette";
            case EagleFileType.GraphConfig:
                return "construction";
            case EagleFileType.JSON:
                return "language";
            case EagleFileType.Markdown:
                return "markdown";
            case EagleFileType.Unknown:
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
