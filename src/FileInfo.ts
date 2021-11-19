import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

export class FileInfo {
    private _name : ko.Observable<string>;
    private _path : ko.Observable<string>;
    private _type : ko.Observable<Eagle.FileType>;
    private _gitUrl : ko.Observable<string>;
    private _repositoryService : ko.Observable<Eagle.RepositoryService>;
    private _repositoryBranch : ko.Observable<string>;
    private _repositoryName : ko.Observable<string>;
    private _sha : ko.Observable<string>;
    private _modified : ko.Observable<boolean>;
    private _eagleVersion : ko.Observable<string>;
    private _eagleCommitHash : ko.Observable<string>;
    private _schemaVersion : ko.Observable<Eagle.DALiuGESchemaVersion>;
    private _readonly : ko.Observable<boolean>;

    constructor(){
        this._name = ko.observable("");
        this._path = ko.observable("");
        this._type = ko.observable(Eagle.FileType.Unknown);
        this._gitUrl = ko.observable("");
        this._repositoryService = ko.observable(Eagle.RepositoryService.Unknown);
        this._repositoryBranch = ko.observable("");
        this._repositoryName = ko.observable("");
        this._sha = ko.observable("");
        this._modified = ko.observable(false);
        this._eagleVersion = ko.observable("");
        this._eagleCommitHash = ko.observable("");
        this._schemaVersion = ko.observable(Eagle.DALiuGESchemaVersion.Unknown);
        this._readonly = ko.observable(true);
    }

    get name() : string{
        return this._name();
    }

    set name(name : string){
        this._name(name);
    }

    get path() : string{
        return this._path();
    }

    set path(path : string){
        this._path(path);
    }

    get type() : Eagle.FileType {
        return this._type();
    }

    set type(type : Eagle.FileType){
        this._type(type);
    }

    get gitUrl() : string {
        return this._gitUrl();
    }

    set gitUrl(gitUrl : string){
        this._gitUrl(gitUrl);
    }

    get repositoryService() : Eagle.RepositoryService {
        return this._repositoryService();
    }

    set repositoryService(repositoryService : Eagle.RepositoryService){
        this._repositoryService(repositoryService);
    }

    get repositoryBranch() : string {
        return this._repositoryBranch();
    }

    set repositoryBranch(repositoryBranch : string){
        this._repositoryBranch(repositoryBranch);
    }

    get repositoryName() : string {
        return this._repositoryName();
    }

    set repositoryName(repositoryName : string){
        this._repositoryName(repositoryName);
    }

    get sha() : string{
        return this._sha();
    }

    set sha(sha : string){
        this._sha(sha);
    }

    get modified() : boolean{
        return this._modified();
    }

    set modified(modified : boolean){
        this._modified(modified);
    }

    get eagleVersion() : string{
        return this._eagleVersion();
    }

    set eagleVersion(version : string){
        this._eagleVersion(version);
    }

    get eagleCommitHash() : string{
        return this._eagleCommitHash();
    }

    set eagleCommitHash(hash : string){
        this._eagleCommitHash(hash);
    }

    get schemaVersion(): Eagle.DALiuGESchemaVersion{
        return this._schemaVersion();
    }

    set schemaVersion(version: Eagle.DALiuGESchemaVersion){
        this._schemaVersion(version);
    }

    get readonly() : boolean{
        return this._readonly();
    }

    set readonly(readonly : boolean){
        this._readonly(readonly);
    }

    clear = () : void => {
        this._name("");
        this._path("");
        this._type(Eagle.FileType.Unknown);
        this._gitUrl("");
        this._repositoryService(Eagle.RepositoryService.Unknown);
        this._repositoryBranch("");
        this._repositoryName("");
        this._sha("");
        this._modified(false);
        this._eagleVersion("");
        this._eagleCommitHash("");
        this._schemaVersion(Eagle.DALiuGESchemaVersion.Unknown);
        this._readonly(true);
    }

    clone = () : FileInfo => {
        const result : FileInfo = new FileInfo();

        result.name = this._name();
        result.path = this._path();
        result.type = this._type();
        result.gitUrl = this._gitUrl();
        result.repositoryService = this._repositoryService();
        result.repositoryBranch = this._repositoryBranch();
        result.repositoryName = this._repositoryName();
        result.sha = this._sha();
        result.modified = this._modified();
        result.eagleVersion = this._eagleVersion();
        result.eagleCommitHash = this._eagleCommitHash();
        result.schemaVersion = this._schemaVersion();
        result.readonly = this._readonly();

        return result;
    }

    fullPath = () : string => {
        if (this._path() === ""){
            return this._name();
        } else {
            return this._path() + "/" + this._name();
        }
    }

    removeGitInfo = () : void => {
        this._repositoryService(Eagle.RepositoryService.Unknown);
        this._repositoryBranch("");
        this._repositoryName("");
        this._gitUrl("");
        this._sha("");
        this._path("");
    }

    updateEagleInfo = () : void => {
        this.eagleVersion = (<any>window).version;
        this.eagleCommitHash = (<any>window).commit_hash;
    }

    nameAndModifiedIndicator : ko.PureComputed<string> = ko.pureComputed(() => {
        return this._name() + (this._modified() ? "*" : "");
    }, this);

    getSummaryHTML = (title : string) : string => {
        var text
        if (this._repositoryService() === Eagle.RepositoryService.Unknown){
            text = "- Location -</br>Url:&nbsp;" + this._gitUrl() + "</br>Hash:&nbsp;" + this._sha();
        }else{
            text = "<p>" + this._repositoryService() + " : " + this._repositoryName() + ((this._repositoryBranch() == "") ? "" : ("(" + this._repositoryBranch() + ")")) + " : " + this._path() + "/" + this._name() + "</p>";   
        }

        
        return "<p><h5>" + title + "<h5><p><p>" + text + "</p>";
    }

    getText = () : string => {
        if (this.repositoryName !== ""){
            if (this.path === ""){
                return this.repositoryService + ": " + this.repositoryName + " (" + this.repositoryBranch + "): " + this.name;
            } else {
                return this.repositoryService + ": " + this.repositoryName + " (" + this.repositoryBranch + "): " + this.path + "/" + this.name;
            }
        } else {
            return this.name;
        }
    }

    toString = () : string => {
        let s = "";

        s += "Name:" + this._name();
        s += " Path:" + this._path();
        s += " Type:" + this._type();
        s += " Git URL:" + this._gitUrl();
        s += " Repository Service:" + this._repositoryService();
        s += " Repository Name:" + this._repositoryName();
        s += " Repository Branch:" + this._repositoryBranch();
        s += " SHA:" + this._sha();
        s += " Modified:" + this._modified();
        s += " EAGLE Version:" + this._eagleVersion();
        s += " EAGLE Commit Hash:" + this._eagleCommitHash();
        s += " Schema Version:" + this._schemaVersion();
        s += " readonly:" + this._readonly();

        return s;
    }

    static toOJSJson = (fileInfo : FileInfo) : object => {
        return {
            fileType: fileInfo.type,
            repoService: fileInfo.repositoryService,
            repoBranch: fileInfo.repositoryBranch,
            repo: fileInfo.repositoryName,
            filePath: fileInfo.fullPath(),
            sha: fileInfo.sha,
            git_url: fileInfo.gitUrl,
            eagleVersion: fileInfo.eagleVersion,
            eagleCommitHash: fileInfo.eagleCommitHash,
            schemaVersion: fileInfo.schemaVersion,
            readonly: fileInfo.readonly
        };
    }

    // TODO: use errors array if attributes cannot be found
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static fromOJSJson = (modelData : any, errors: string[]) : FileInfo => {
        const result : FileInfo = new FileInfo();

        result.path = Utils.getFilePathFromFullPath(modelData.filePath);
        result.name = Utils.getFileNameFromFullPath(modelData.filePath);
        result.type = Utils.translateStringToFileType(modelData.fileType);
        result.gitUrl = modelData.git_url == undefined ? "" : modelData.git_url;

        result.repositoryService = modelData.repoService == undefined ? Eagle.RepositoryService.Unknown : modelData.repoService;
        result.repositoryBranch = modelData.repoBranch == undefined ? "" : modelData.repoBranch;
        result.repositoryName = modelData.repo == undefined ? "" : modelData.repo;
        result.sha = modelData.sha == undefined ? "" : modelData.sha;

        result.eagleVersion = modelData.eagleVersion == undefined ? "" : modelData.eagleVersion;
        result.eagleCommitHash = modelData.eagleCommitHash == undefined ? "" : modelData.eagleCommitHash;
        result.schemaVersion = modelData.schemaVersion == undefined ? "" : modelData.schemaVersion;

        result.readonly = modelData.readonly == undefined ? true : modelData.readonly;

        return result;
    }
}
