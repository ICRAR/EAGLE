import * as ko from "knockout";

import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { Errors } from './Errors';
import { FileLocation } from "./FileLocation";
import { Repository } from "./Repository";
import { Setting } from "./Setting";
import { Utils } from './Utils';


export class FileInfo {
    private _name : ko.Observable<string>;
    private _shortDescription : ko.Observable<string>;
    private _detailedDescription : ko.Observable<string>;
    private _type : ko.Observable<Eagle.FileType>;
    private _schemaVersion : ko.Observable<Setting.SchemaVersion>;
    private _readonly : ko.Observable<boolean>;
    private _location : ko.Observable<FileLocation>;

    // process that created the file, for example EAGLE, or dlg_paletteGen
    private _generatorVersion : ko.Observable<string>;
    private _generatorCommitHash : ko.Observable<string>;
    private _generatorName : ko.Observable<string>;

    // palette-only?
    private _repositoryUrl : ko.Observable<string>;

    // graphconfig-only?
    private _graphLocation : ko.Observable<FileLocation>;

    // reproducibility
    private _signature : ko.Observable<string>;

    // authorship
    private _lastModifiedName : ko.Observable<string>;
    private _lastModifiedEmail : ko.Observable<string>;
    private _lastModifiedDatetime : ko.Observable<number>;

    private _numLGNodes : ko.Observable<number>;  // NOTE: this is only updated prior to saving to disk, during editing it could be incorrect

    // run-time only
    private _modified : ko.Observable<boolean>;
    private _builtIn : ko.Observable<boolean>;

    constructor(){
        this._name = ko.observable("");
        this._shortDescription = ko.observable("");
        this._detailedDescription = ko.observable("");
        this._type = ko.observable(Eagle.FileType.Unknown);
        this._schemaVersion = ko.observable(Setting.SchemaVersion.Unknown);
        this._readonly = ko.observable(true);
        this._location = ko.observable(new FileLocation());

        this._generatorVersion = ko.observable("");
        this._generatorCommitHash = ko.observable("");
        this._generatorName = ko.observable("");

        this._repositoryUrl = ko.observable("");

        this._graphLocation = ko.observable(new FileLocation());

        this._signature = ko.observable("");

        this._lastModifiedName = ko.observable("");
        this._lastModifiedEmail = ko.observable("");
        this._lastModifiedDatetime = ko.observable(0);

        this._numLGNodes = ko.observable(0);

        this._modified = ko.observable(false);
        this._builtIn = ko.observable(false);
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

    get type() : Eagle.FileType {
        return this._type();
    }

    set type(type : Eagle.FileType){
        this._type(type);
    }

    get modified() : boolean{
        return this._modified();
    }

    set modified(modified : boolean){
        this._modified(modified);
    }

    get generatorVersion() : string{
        return this._generatorVersion();
    }

    set generatorVersion(version : string){
        this._generatorVersion(version);
    }

    get generatorCommitHash() : string{
        return this._generatorCommitHash();
    }

    set generatorCommitHash(hash : string){
        this._generatorCommitHash(hash);
    }

    get generatorName() : string{
        return this._generatorName();
    }

    set generatorName(hash : string){
        this._generatorName(hash);
    }

    get schemaVersion(): Setting.SchemaVersion{
        return this._schemaVersion();
    }

    set schemaVersion(version: Setting.SchemaVersion){
        this._schemaVersion(version);
    }

    get readonly() : boolean{
        return this._readonly();
    }

    set readonly(readonly : boolean){
        this._readonly(readonly);
    }

    get location() : FileLocation{
        return this._location();
    }

    set location(location : FileLocation){
        this._location(location);
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

    get graphLocation() : FileLocation{
        return this._graphLocation();
    }

    set graphLocation(graphLocation : FileLocation){
        this._graphLocation(graphLocation);
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
        this._type(Eagle.FileType.Unknown);
        this._schemaVersion(Setting.SchemaVersion.Unknown);
        this._readonly(true);
        this._location().clear();

        this._generatorVersion("");
        this._generatorCommitHash("");
        this._generatorName("");

        this._repositoryUrl("");

        this._graphLocation().clear();

        this._signature("");

        this._lastModifiedName("");
        this._lastModifiedEmail("");
        this._lastModifiedDatetime(0);

        this._numLGNodes(0);

        this._modified(false);
        this._builtIn(true);
    }

    clone = () : FileInfo => {
        const result : FileInfo = new FileInfo();

        result.name = this._name();
        result.shortDescription = this._shortDescription();
        result.detailedDescription = this._detailedDescription();
        result.type = this._type();
        result.schemaVersion = this._schemaVersion();
        result.readonly = this._readonly();
        result.location = this._location().clone();

        result.generatorVersion = this._generatorVersion();
        result.generatorCommitHash = this._generatorCommitHash();
        result.generatorName = this._generatorName();

        result.repositoryUrl = this._repositoryUrl();

        result.graphLocation = this._graphLocation();

        result.signature = this._signature();

        result.lastModifiedName = this._lastModifiedName();
        result.lastModifiedEmail = this._lastModifiedEmail();
        result.lastModifiedDatetime = this._lastModifiedDatetime();

        result.numLGNodes = this._numLGNodes();

        result.modified = this._modified();
        result.builtIn = this._builtIn();

        return result;
    }

    removeGitInfo = () : void => {
        this._location().repositoryService(Repository.Service.Unknown);
        this._location().repositoryBranch("");
        this._location().repositoryName("");
        this._location().repositoryPath("");
        this._location().commitHash("");
        this._location().downloadUrl("");

        this._repositoryUrl("");

        this._lastModifiedName("");
        this._lastModifiedEmail("");
        this._lastModifiedDatetime(0);
    }

    updateEagleInfo = () : void => {
        this.generatorVersion = (<any>window).version;
        this.generatorCommitHash = (<any>window).commit_hash;
        this.generatorName = "EAGLE";
    }

    updateGeneratorInfo = (version: string, commitHash: string, name: string) => {
        this.generatorVersion = version;
        this.generatorCommitHash = commitHash;
        this.generatorName = name;
    }

    nameAndModifiedIndicator : ko.PureComputed<string> = ko.pureComputed(() => {
        return this._name() + (this._modified() ? "*" : "");
    }, this);

    lastModifiedDatetimeText : ko.PureComputed<string> = ko.pureComputed(() => {
        return new Date(this._lastModifiedDatetime() * 1000).toLocaleString();
    }, this);


    getSummaryHTML = (title : string) : string => {
        let text
        if (this._location().repositoryService() === Repository.Service.Unknown){
            text = "- Location -</br>Url:&nbsp;" + this._repositoryUrl() + "</br>Hash:&nbsp;" + this._location().commitHash();
        } else {
            text = "<p>" + this._location().repositoryService() + " : " + this._location().repositoryName() + ((this._location().repositoryBranch() == "") ? "" : ("(" + this._location().repositoryBranch() + ")")) + " : " + this._location().repositoryPath() + "/" + this._name() + "</p>";
        }

        return "<p><h5>" + title + "<h5><p><p>" + text + "</p><p>"+this.renderedShortDescription() + "</p><p>" + this.renderedDetailedDescription() + "</p></p>";
    }

    toString = () : string => {
        let s = "";

        s += "Name:" + this._name();
        s += " Short Description:" + this._shortDescription();
        s += " Detailed Description:" + this._detailedDescription();
        s += " Type:" + this._type();
        s += " Schema Version:" + this._schemaVersion();
        s += " readonly:" + this._readonly();
        s += " location:" + this._location().toString();

        s += " Generator Name:" + this._generatorName();
        s += " Generator Version:" + this._generatorVersion();
        s += " Generator Commit Hash:" + this._generatorCommitHash();

        s += " Repository URL:" + this._repositoryUrl();

        s += " Graph Location:" + this._graphLocation().toString();

        s += " signature:" + this._signature();

        s += " Last Modified Name:" + this._lastModifiedName();
        s += " Last Modified Email:" + this._lastModifiedEmail();
        s += " Last Modified Date:" + this._lastModifiedDatetime();

        s += " Num LG Nodes:" + this._numLGNodes();

        s += " Modified:" + this._modified();
        s += " builtIn:" + this._builtIn();

        return s;
    }

    isInitiated = () : boolean => {
        return this._name() != ""
    }

    renderedShortDescription: ko.PureComputed<string> = ko.pureComputed(() => {
        return Utils.markdown2html(this._shortDescription());
    }, this);

    renderedDetailedDescription: ko.PureComputed<string> = ko.pureComputed(() => {
        return Utils.markdown2html(this._detailedDescription());
    }, this);

    getShortDescriptionBtnColor : ko.PureComputed<string> = ko.pureComputed(() => {
        //this excludes graphs that have not been initiated by the user (eagle has an empty graph by default)
        if (this.isInitiated() && this._shortDescription() === ""){
            return EagleConfig.getColor('graphWarning')
        }

        return ""
    }, this);

    getDetailedDescriptionBtnColor : ko.PureComputed<string> = ko.pureComputed(() => {
        //this excludes graphs that have not been initiated by the user (eagle has an empty graph by default)
        if (this.isInitiated() && this._detailedDescription() === ""){
            return EagleConfig.getColor('graphWarning')
        }

        return ""
    }, this);

    getGraphInfoBtnColor : ko.PureComputed<string> = ko.pureComputed(() => {
        //this excludes graphs that have not been initiated by the user (eagle has an empty graph by default)
         if (this.isInitiated() && (this._detailedDescription() === "" || this._shortDescription() === "")){
            return EagleConfig.getColor('graphWarning')
        }

        return ""
    }, this);

    static toOJSJson(fileInfo : FileInfo) : object {
        return {
            // name and path variables are written together into fullPath
            filePath: fileInfo.location.fullPath(),
            fileType: fileInfo.type,

            shortDescription: fileInfo.shortDescription,
            detailedDescription: fileInfo.detailedDescription,

            repoService: fileInfo.location.repositoryService(),
            repoBranch: fileInfo.location.repositoryBranch(),
            repo: fileInfo.location.repositoryName(),

            generatorVersion: fileInfo.generatorVersion,
            generatorCommitHash: fileInfo.generatorCommitHash,
            generatorName: fileInfo.generatorName,
            schemaVersion: fileInfo.schemaVersion,
            readonly: fileInfo.readonly,

            repositoryUrl: fileInfo.repositoryUrl,
            commitHash: fileInfo.location.commitHash(),
            downloadUrl: fileInfo.location.downloadUrl(),
            signature: fileInfo.signature,

            lastModifiedName: fileInfo.lastModifiedName,
            lastModifiedEmail: fileInfo.lastModifiedEmail,
            lastModifiedDatetime: fileInfo.lastModifiedDatetime,

            numLGNodes: fileInfo.numLGNodes,
        };
    }

    static toV4Json(fileInfo : FileInfo) : object {
        return {
            name: fileInfo.name,
            shortDescription: fileInfo.shortDescription,
            detailedDescription: fileInfo.detailedDescription,
            type: fileInfo.type,
            schemaVersion: fileInfo.schemaVersion,
            readonly: fileInfo.readonly,
            location: FileLocation.toJson(fileInfo.location),

            generatorVersion: fileInfo.generatorVersion,
            generatorCommitHash: fileInfo.generatorCommitHash,
            generatorName: fileInfo.generatorName,

            repositoryUrl: fileInfo.repositoryUrl,

            graphLocation: FileLocation.toJson(fileInfo.graphLocation),

            signature: fileInfo.signature,

            lastModifiedName: fileInfo.lastModifiedName,
            lastModifiedEmail: fileInfo.lastModifiedEmail,
            lastModifiedDatetime: fileInfo.lastModifiedDatetime,

            numLGNodes: fileInfo.numLGNodes,
        };
    }

    // TODO: use errors array if attributes cannot be found
    static fromOJSJson(modelData : any, errorsWarnings: Errors.ErrorsWarnings) : FileInfo {
        const result : FileInfo = new FileInfo();

        const fileName = Utils.getFileNameFromFullPath(modelData.filePath);
        const filePath = Utils.getFilePathFromFullPath(modelData.filePath);

        result.name = fileName;
        result.shortDescription = modelData.shortDescription ?? "";
        result.detailedDescription = modelData.detailedDescription ?? "";

        // if shortDescription is not set, and detailed description is set, then use first sentence of detailed as the short
        // NOTE: doesn't actually do any semantic analysis of text, just grabs everything before the first '.' in the detailed description
        if (result.shortDescription === "" && result.detailedDescription !== ""){
            result.shortDescription = result.detailedDescription.split('. ', 1)[0];
        }

        result.type = Utils.translateStringToFileType(modelData.fileType);
        result.schemaVersion = modelData.schemaVersion ?? "";
        result.readonly = modelData.readonly ?? true;

        result.location.repositoryService(modelData.repoService ?? Repository.Service.Unknown);
        result.location.repositoryBranch(modelData.repoBranch ?? "");
        result.location.repositoryName(modelData.repo ?? "");
        result.location.repositoryPath(filePath);
        result.location.repositoryFileName(fileName);
        result.location.commitHash(modelData.commitHash ?? "");
        result.location.downloadUrl(modelData.downloadUrl ?? "");

        // look for deprecated attributes (eagleVersion and eagleCommitHash) too
        result.generatorVersion = modelData.generatorVersion ?? modelData.eagleVersion ?? "";
        result.generatorCommitHash = modelData.generatorCommitHash ?? modelData.eagleCommitHash ?? "";
        result.generatorName = modelData.generatorName ?? "";

        result.repositoryUrl = modelData.repositoryUrl ?? "";

        // NOTE: no info for result.graphLocation

        result.signature = modelData.signature ?? "";

        result.lastModifiedName = modelData.lastModifiedName ?? "";
        result.lastModifiedEmail = modelData.lastModifiedEmail ?? "";
        result.lastModifiedDatetime = modelData.lastModifiedDatetime ?? 0;

        // check that lastModifiedDatetime is a Number, if not correct
        if (typeof result.lastModifiedDatetime !== 'number'){
            result.lastModifiedDatetime = 0;
            errorsWarnings.errors.push(Errors.Message("Last Modified Datetime contains string instead of number, resetting to default (0). Please save this graph to update lastModifiedDatetime to a correct value."));
        }

        result.numLGNodes = modelData.numLGNodes ?? 0;

        return result;
    }

    static fromV4Json(modelData: any, errorsWarnings: Errors.ErrorsWarnings): FileInfo{
        const result: FileInfo = new FileInfo();

        result.name = modelData.name ?? "";
        result.shortDescription = modelData.shortDescription ?? "";
        result.detailedDescription = modelData.detailedDescription ?? "";
        result.type = Utils.translateStringToFileType(modelData.type);
        result.schemaVersion = modelData.schemaVersion ?? "";
        result.readonly = modelData.readonly ?? true;
        result.location = FileLocation.fromJson(modelData.location ?? {}, errorsWarnings);

        result.generatorVersion = modelData.generatorVersion ?? "";
        result.generatorCommitHash = modelData.generatorCommitHash ?? "";
        result.generatorName = modelData.generatorName ?? "";

        result.repositoryUrl = modelData.repositoryUrl ?? "";

        result.graphLocation = FileLocation.fromJson(modelData.graphLocation ?? {}, errorsWarnings);

        result.signature = modelData.signature ?? "";

        result.lastModifiedName = modelData.lastModifiedName ?? "";
        result.lastModifiedEmail = modelData.lastModifiedEmail ?? "";
        result.lastModifiedDatetime = modelData.lastModifiedDatetime ?? 0;

        result.numLGNodes = modelData.numLGNodes ?? 0;

        return result;
    }

    static async editShortDescription(fileInfo: FileInfo){
        const eagle = Eagle.getInstance();

        Utils.hideModelDataModal();
        await eagle.editShortDescription(fileInfo);
        Utils.showModelDataModal(fileInfo.type + ' Info', fileInfo);
    }

    static async editDetailedDescription(fileInfo: FileInfo){
        const eagle = Eagle.getInstance();

        Utils.hideModelDataModal();
        await eagle.editDetailedDescription(fileInfo);
        Utils.showModelDataModal(fileInfo.type + ' Info', fileInfo);
    }
}
