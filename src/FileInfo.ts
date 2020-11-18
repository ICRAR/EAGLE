import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {GraphUpdater} from './GraphUpdater';

export class FileInfo {
    private _name : string;
    private _path : string;
    private _type : Eagle.FileType;
    private _gitUrl : string;
    private _repositoryService : Eagle.RepositoryService;
    private _repositoryBranch : string;
    private _repositoryName : string;
    private _sha : string;
    private _modified : boolean;

    constructor(){
        this._name = "";
        this._path = "";
        this._type = Eagle.FileType.Unknown;
        this._gitUrl = "";
        this._repositoryService = Eagle.RepositoryService.Unknown;
        this._repositoryBranch = "";
        this._repositoryName = "";
        this._sha = "";
        this._modified = false;
    }

    get name() : string{
        return this._name;
    }

    set name(name : string){
        this._name = name;
    }

    get path() : string{
        return this._path;
    }

    set path(path : string){
        this._path = path;
    }

    get type() : Eagle.FileType {
        return this._type;
    }

    set type(type : Eagle.FileType){
        this._type = type;
    }

    get gitUrl() : string {
        return this._gitUrl;
    }

    set gitUrl(gitUrl : string){
        this._gitUrl = gitUrl;
    }

    get repositoryService() : Eagle.RepositoryService {
        return this._repositoryService;
    }

    set repositoryService(repositoryService : Eagle.RepositoryService){
        this._repositoryService = repositoryService;
    }

    get repositoryBranch() : string {
        return this._repositoryBranch;
    }

    set repositoryBranch(repositoryBranch : string){
        this._repositoryBranch = repositoryBranch;
    }

    get repositoryName() : string {
        return this._repositoryName;
    }

    set repositoryName(repositoryName : string){
        this._repositoryName = repositoryName;
    }

    get sha() : string{
        return this._sha;
    }

    set sha(sha : string){
        this._sha = sha;
    }

    get modified() : boolean{
        return this._modified;
    }

    set modified(modified : boolean){
        this._modified = modified;
    }

    clear = () : void => {
        this._name = "";
        this._path = "";
        this._type = Eagle.FileType.Unknown;
        this._gitUrl = "";
        this._repositoryService = Eagle.RepositoryService.Unknown;
        this._repositoryBranch = "";
        this._repositoryName = "";
        this._sha = "";
        this._modified = false;
    }

    clone = () : FileInfo => {
        var result : FileInfo = new FileInfo();

        result.name = this._name;
        result.path = this._path;
        result.type = this._type;
        result.gitUrl = this._gitUrl;
        result.repositoryService = this._repositoryService;
        result.repositoryBranch = this._repositoryBranch;
        result.repositoryName = this._repositoryName;
        result.sha = this._sha;
        result.modified = this._modified;

        return result;
    }

    fullPath = () : string => {
        if (this._path === ""){
            return this._name;
        } else {
            return this._path + "/" + this._name;
        }
    }

    removeGitInfo = () : void => {
        this._repositoryService = Eagle.RepositoryService.Unknown;
        this._repositoryBranch = "";
        this._repositoryName = "";
        this._gitUrl = "";
        this._sha = "";
        this._path = "";
    }

    getSummaryHTML = () : string => {
        return "<p>" + this._repositoryService + " : " + this._repositoryName + ((this._repositoryBranch == "") ? "" : ("(" + this._repositoryBranch + ")")) + " : " + this._path + "/" + this._name + "</p>";
    }

    static toOJSJson = (fileInfo : FileInfo) : object => {
        return {
            fileType: Utils.translateFileTypeToString(fileInfo.type),
            repoService: fileInfo.repositoryService,
            repoBranch: fileInfo.repositoryBranch,
            repo: fileInfo.repositoryName,
            filePath: fileInfo.fullPath(),
            sha: fileInfo.sha,
            git_url: fileInfo.gitUrl
        };
    }

    static fromOJSJson = (modelData : any) : FileInfo => {
        var result : FileInfo = new FileInfo();

        result.path = Utils.getFilePathFromFullPath(modelData.filePath);
        result.name = Utils.getFileNameFromFullPath(modelData.filePath);
        result.type = Utils.translateStringToFileType(modelData.fileType);
        result.gitUrl = modelData.git_url == undefined ? "" : modelData.git_url;

        result.repositoryService = modelData.repoService == undefined ? Eagle.RepositoryService.Unknown : modelData.repoService;
        result.repositoryBranch = modelData.repoBranch == undefined ? "" : modelData.repoBranch;
        result.repositoryName = modelData.repo == undefined ? "" : modelData.repo;
        result.sha = modelData.sha == undefined ? "" : modelData.sha;

        return result;
    }
}
