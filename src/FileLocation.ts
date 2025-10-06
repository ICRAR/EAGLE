import * as ko from "knockout";

import { Errors } from "./Errors";
import { Repository } from "./Repository";

export class FileLocation {
    repositoryService: ko.Observable<Repository.Service>;
    repositoryBranch: ko.Observable<string>;
    repositoryName: ko.Observable<string>;
    repositoryPath: ko.Observable<string>;
    repositoryFileName: ko.Observable<string>;
    commitHash: ko.Observable<string>;
    downloadUrl: ko.Observable<string>;

    constructor(){
        this.repositoryService = ko.observable(Repository.Service.Unknown);
        this.repositoryBranch = ko.observable("");
        this.repositoryName = ko.observable("");
        this.repositoryPath = ko.observable("");
        this.repositoryFileName = ko.observable("");
        this.commitHash = ko.observable("");
        this.downloadUrl = ko.observable("");
    }

    clear = () : void => {
        this.repositoryService(Repository.Service.Unknown);
        this.repositoryBranch("");
        this.repositoryName("");
        this.repositoryPath("");
        this.repositoryFileName("");
        this.commitHash("");
        this.downloadUrl("");
    }

    clone = () : FileLocation => {
        const result : FileLocation = new FileLocation();

        result.repositoryService(this.repositoryService());
        result.repositoryBranch(this.repositoryBranch());
        result.repositoryName(this.repositoryName());
        result.repositoryPath(this.repositoryPath());
        result.repositoryFileName(this.repositoryFileName());
        result.commitHash(this.commitHash());
        result.downloadUrl(this.downloadUrl());

        return result;
    }

    fullPath = () : string => {
        if (this.repositoryPath() === ""){
            return this.repositoryFileName();
        } else {
            return this.repositoryPath() + "/" + this.repositoryFileName();
        }
    }

    getText = () : string => {
        if (this.repositoryName() !== ""){
            if (this.repositoryPath() === ""){
                return this.repositoryService() + ": " + this.repositoryName() + " (" + this.repositoryBranch() + "): " + this.repositoryFileName();
            } else {
                return this.repositoryService() + ": " + this.repositoryName() + " (" + this.repositoryBranch() + "): " + this.repositoryPath() + "/" + this.repositoryFileName();
            }
        } else {
            if (this.repositoryFileName() === ""){
                return this.repositoryService();
            } else {
                return this.repositoryFileName();
            }
        }
    }

    getHtml = () : string => {
        if (this.repositoryName() !== ""){
            if (this.repositoryPath() === ""){
                return "<strong>" + this.repositoryService() + "</strong>: " + this.repositoryName() + " (" + this.repositoryBranch() + "): " + this.repositoryFileName();
            } else {
                return "<strong>" + this.repositoryService() + "</strong>: " + this.repositoryName() + " (" + this.repositoryBranch() + "): " + this.repositoryPath() + "/" + this.repositoryFileName();
            }
        } else {
            return this.repositoryFileName();
        }
    }

    static toJson(fileLocation: FileLocation) : object {
        return {
            repositoryService: fileLocation.repositoryService(),
            repositoryBranch: fileLocation.repositoryBranch(),
            repositoryName: fileLocation.repositoryName(),
            repositoryPath: fileLocation.repositoryPath(),
            repositoryFileName: fileLocation.repositoryFileName(),
            commitHash: fileLocation.commitHash(),
            downloadUrl: fileLocation.downloadUrl()
        };
    }

    static fromJson(data: any, errorsWarnings: Errors.ErrorsWarnings): FileLocation {
        const result: FileLocation = new FileLocation();

        result.repositoryService(data.repositoryService ?? Repository.Service.Unknown);
        result.repositoryBranch(data.repositoryBranch ?? "");
        result.repositoryName(data.repositoryName ?? "");
        result.repositoryPath(data.repositoryPath ?? "");
        result.repositoryFileName(data.repositoryFileName ?? "");
        result.commitHash(data.commitHash ?? "");
        result.downloadUrl(data.downloadUrl ?? "");

        return result;
    }

    static generateUrl(fileLocation: FileLocation): string {
        let url = window.location.origin;

        url += "/?service=" + fileLocation.repositoryService();

        if (fileLocation.repositoryService() === Repository.Service.Url){
            url += "&url=" + fileLocation.downloadUrl();
        } else {
            url += "&repository=" + fileLocation.repositoryName();
            url += "&branch=" + fileLocation.repositoryBranch();
            url += "&path=" + encodeURI(fileLocation.repositoryPath());
            url += "&filename=" + encodeURI(fileLocation.repositoryFileName());
        }

        return url;
    }

    static match(fl0: FileLocation, fl1: FileLocation): boolean {
        return (fl0.repositoryService() === fl1.repositoryService()) &&
               (fl0.repositoryBranch() === fl1.repositoryBranch()) &&
               (fl0.repositoryName() === fl1.repositoryName()) &&
               (fl0.repositoryPath() === fl1.repositoryPath()) &&
               (fl0.repositoryFileName() === fl1.repositoryFileName()) &&
               (fl0.commitHash() === fl1.commitHash()) &&
               (fl0.downloadUrl() === fl1.downloadUrl());
    }
}