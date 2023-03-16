import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {Errors} from './Errors';

export class FileInfo {
    private _name : ko.Observable<string>;
    private _shortDescription : ko.Observable<string>;
    private _detailedDescription : ko.Observable<string>;

    private _path : ko.Observable<string>;
    private _type : ko.Observable<Eagle.FileType>;
    private _repositoryService : ko.Observable<Eagle.RepositoryService>;
    private _repositoryBranch : ko.Observable<string>;
    private _repositoryName : ko.Observable<string>;
    private _modified : ko.Observable<boolean>;
    private _eagleVersion : ko.Observable<string>;
    private _eagleCommitHash : ko.Observable<string>;
    private _schemaVersion : ko.Observable<Eagle.DALiuGESchemaVersion>;
    private _readonly : ko.Observable<boolean>;
    private _builtIn : ko.Observable<boolean>;

    private _repositoryUrl : ko.Observable<string>;
    private _commitHash : ko.Observable<string>;
    private _downloadUrl : ko.Observable<string>;
    private _signature : ko.Observable<string>;

    private _lastModifiedName : ko.Observable<string>;
    private _lastModifiedEmail : ko.Observable<string>;
    private _lastModifiedDatetime : ko.Observable<number>;

    private _numLGNodes : ko.Observable<number>;  // NOTE: this is only updated prior to saving to disk, during editing it could be incorrect

    constructor(){
        this._name = ko.observable("");
        this._shortDescription = ko.observable("");
        this._detailedDescription = ko.observable("");

        this._path = ko.observable("");
        this._type = ko.observable(Eagle.FileType.Unknown);
        this._repositoryService = ko.observable(Eagle.RepositoryService.Unknown);
        this._repositoryBranch = ko.observable("");
        this._repositoryName = ko.observable("");
        this._modified = ko.observable(false);
        this._eagleVersion = ko.observable("");
        this._eagleCommitHash = ko.observable("");
        this._schemaVersion = ko.observable(Eagle.DALiuGESchemaVersion.Unknown);
        this._readonly = ko.observable(true);
        this._builtIn = ko.observable(false); // NOTE: not written to/read from JSON

        this._repositoryUrl = ko.observable("");
        this._commitHash = ko.observable("");
        this._downloadUrl = ko.observable("");
        this._signature = ko.observable("");

        this._lastModifiedName = ko.observable("");
        this._lastModifiedEmail = ko.observable("");
        this._lastModifiedDatetime = ko.observable(0);

        this._numLGNodes = ko.observable(0);
    }

    get name() : string{
        return this._name();
    }

    set name(name : string){
        this._name(name);
    }

    get shortDescription() : string{
        return this._shortDescription();
    }

    set shortDescription(shortDescription : string){
        this._shortDescription(shortDescription);
    }

    get detailedDescription() : string{
        return this._detailedDescription();
    }

    set detailedDescription(detailedDescription : string){
        this._detailedDescription(detailedDescription);
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

    get builtIn() : boolean{
        return this._builtIn();
    }

    set builtIn(builtIn : boolean){
        this._builtIn(builtIn);
    }

    get repositoryUrl() : string {
        return this._repositoryUrl();
    }

    set repositoryUrl(repositoryUrl : string){
        this._repositoryUrl(repositoryUrl);
    }

    get commitHash() : string{
        return this._commitHash();
    }

    set commitHash(commitHash : string){
        this._commitHash(commitHash);
    }

    get downloadUrl() : string {
        return this._downloadUrl();
    }

    set downloadUrl(downloadUrl : string){
        this._downloadUrl(downloadUrl);
    }

    get signature() : string{
        return this._signature();
    }

    set signature(signature : string){
        this._signature(signature);
    }

    get lastModifiedName() : string{
        return this._lastModifiedName();
    }

    set lastModifiedName(name : string){
        this._lastModifiedName(name);
    }

    get lastModifiedEmail() : string{
        return this._lastModifiedEmail();
    }

    set lastModifiedEmail(email : string){
        this._lastModifiedEmail(email);
    }

    get lastModifiedDatetime() : number{
        return this._lastModifiedDatetime();
    }

    set lastModifiedDatetime(datetime : number){
        this._lastModifiedDatetime(datetime);
    }

    get numLGNodes() : number{
        return this._numLGNodes();
    }

    set numLGNodes(numNodes : number){
        this._numLGNodes(numNodes);
    }

    clear = () : void => {
        this._name("");
        this._shortDescription("");
        this._detailedDescription("");

        this._path("");
        this._type(Eagle.FileType.Unknown);
        this._repositoryService(Eagle.RepositoryService.Unknown);
        this._repositoryBranch("");
        this._repositoryName("");
        this._modified(false);
        this._eagleVersion("");
        this._eagleCommitHash("");
        this._schemaVersion(Eagle.DALiuGESchemaVersion.Unknown);
        this._readonly(true);
        this._builtIn(true);

        this._repositoryUrl("");
        this._commitHash("");
        this._downloadUrl("");
        this._signature("");

        this._lastModifiedName("");
        this._lastModifiedEmail("");
        this._lastModifiedDatetime(0);

        this._numLGNodes(0);
    }

    clone = () : FileInfo => {
        const result : FileInfo = new FileInfo();

        result.name = this._name();
        result.shortDescription = this._shortDescription();
        result.detailedDescription = this._detailedDescription();

        result.path = this._path();
        result.type = this._type();
        result.repositoryService = this._repositoryService();
        result.repositoryBranch = this._repositoryBranch();
        result.repositoryName = this._repositoryName();
        result.modified = this._modified();
        result.eagleVersion = this._eagleVersion();
        result.eagleCommitHash = this._eagleCommitHash();
        result.schemaVersion = this._schemaVersion();
        result.readonly = this._readonly();
        result.builtIn = this._builtIn();

        result.repositoryUrl = this._repositoryUrl();
        result.commitHash = this._commitHash();
        result.downloadUrl = this._downloadUrl();
        result.signature = this._signature();

        result.lastModifiedName = this._lastModifiedName();
        result.lastModifiedEmail = this._lastModifiedEmail();
        result.lastModifiedDatetime = this._lastModifiedDatetime();

        result.numLGNodes = this._numLGNodes();

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
        this._path("");

        this._repositoryUrl("");
        this._commitHash("");
        this._downloadUrl("");

        this._lastModifiedName("");
        this._lastModifiedEmail("");
        this._lastModifiedDatetime(0);
    }

    updateEagleInfo = () : void => {
        this.eagleVersion = (<any>window).version;
        this.eagleCommitHash = (<any>window).commit_hash;
    }

    nameAndModifiedIndicator : ko.PureComputed<string> = ko.pureComputed(() => {
        return this._name() + (this._modified() ? "*" : "");
    }, this);

    getSummaryHTML = (title : string) : string => {
        let text
        if (this._repositoryService() === Eagle.RepositoryService.Unknown){
            text = "- Location -</br>Url:&nbsp;" + this._repositoryUrl() + "</br>Hash:&nbsp;" + this._commitHash();
        } else {
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
        s += " Short Description:" + this._shortDescription();
        s += " Detailed Description:" + this._detailedDescription();

        s += " Path:" + this._path();
        s += " Type:" + this._type();
        s += " Repository Service:" + this._repositoryService();
        s += " Repository Name:" + this._repositoryName();
        s += " Repository Branch:" + this._repositoryBranch();
        s += " Modified:" + this._modified();
        s += " EAGLE Version:" + this._eagleVersion();
        s += " EAGLE Commit Hash:" + this._eagleCommitHash();
        s += " Schema Version:" + this._schemaVersion();
        s += " readonly:" + this._readonly();
        s += " builtIn:" + this._builtIn();

        s += " Repository URL:" + this._repositoryUrl();
        s += " Commit Hash:" + this._commitHash();
        s += " Download URL:" + this._downloadUrl();
        s += " signature:" + this._signature();

        s += " Last Modified Name:" + this._lastModifiedName();
        s += " Last Modified Email:" + this._lastModifiedEmail();
        s += " Last Modified Date:" + this._lastModifiedDatetime();

        s += " Num LG Nodes:" + this._numLGNodes();

        return s;
    }

    static toOJSJson = (fileInfo : FileInfo) : object => {
        return {
            // name and path variables are written together into fullPath
            filePath: fileInfo.fullPath(),
            fileType: fileInfo.type,

            shortDescription: fileInfo.shortDescription,
            detailedDescription: fileInfo.detailedDescription,

            repoService: fileInfo.repositoryService,
            repoBranch: fileInfo.repositoryBranch,
            repo: fileInfo.repositoryName,
            
            eagleVersion: fileInfo.eagleVersion,
            eagleCommitHash: fileInfo.eagleCommitHash,
            schemaVersion: fileInfo.schemaVersion,
            readonly: fileInfo.readonly,

            repositoryUrl: fileInfo.repositoryUrl,
            commitHash: fileInfo.commitHash,
            downloadUrl: fileInfo.downloadUrl,
            signature: fileInfo.signature,

            lastModifiedName: fileInfo.lastModifiedName,
            lastModifiedEmail: fileInfo.lastModifiedEmail,
            lastModifiedDatetime: fileInfo.lastModifiedDatetime,

            numLGNodes: fileInfo.numLGNodes,
        };
    }

    // TODO: use errors array if attributes cannot be found
    static fromOJSJson = (modelData : any, errorsWarnings: Errors.ErrorsWarnings) : FileInfo => {
        const result : FileInfo = new FileInfo();

        result.path = Utils.getFilePathFromFullPath(modelData.filePath);
        result.name = Utils.getFileNameFromFullPath(modelData.filePath);
        result.type = Utils.translateStringToFileType(modelData.fileType);

        result.shortDescription = modelData.shortDescription == undefined ? "" : modelData.shortDescription;
        result.detailedDescription = modelData.detailedDescription == undefined ? "" : modelData.detailedDescription;

        result.repositoryService = modelData.repoService == undefined ? Eagle.RepositoryService.Unknown : modelData.repoService;
        result.repositoryBranch = modelData.repoBranch == undefined ? "" : modelData.repoBranch;
        result.repositoryName = modelData.repo == undefined ? "" : modelData.repo;

        result.eagleVersion = modelData.eagleVersion == undefined ? "" : modelData.eagleVersion;
        result.eagleCommitHash = modelData.eagleCommitHash == undefined ? "" : modelData.eagleCommitHash;
        result.schemaVersion = modelData.schemaVersion == undefined ? "" : modelData.schemaVersion;

        result.readonly = modelData.readonly == undefined ? true : modelData.readonly;

        result.repositoryUrl = modelData.repositoryUrl == undefined ? "" : modelData.repositoryUrl;
        result.commitHash = modelData.commitHash == undefined ? "" : modelData.commitHash;
        result.downloadUrl = modelData.downloadUrl == undefined ? "" : modelData.downloadUrl;
        result.signature = modelData.signature == undefined ? "" : modelData.signature;

        result.lastModifiedName = modelData.lastModifiedName == undefined ? "" : modelData.lastModifiedName;
        result.lastModifiedEmail = modelData.lastModifiedEmail == undefined ? "" : modelData.lastModifiedEmail;
        result.lastModifiedDatetime = modelData.lastModifiedDatetime == undefined ? 0 : modelData.lastModifiedDatetime;

        // check that lastModifiedDatetime is a Number, if not correct
        if (typeof result.lastModifiedDatetime !== 'number'){
            result.lastModifiedDatetime = 0;
            errorsWarnings.errors.push(Errors.Message("Last Modified Datetime contains string instead of number, resetting to default (0). Please save this graph to update lastModifiedDatetime to a correct value."));
        }

        result.numLGNodes = modelData.numLGNodes == undefined ? 0 : modelData.numLGNodes;

        return result;
    }
}
