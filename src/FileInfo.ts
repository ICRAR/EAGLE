import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {GraphUpdater} from './GraphUpdater';

export class FileInfo {
    name : string;
    path : string;
    type : Eagle.FileType;
    gitUrl : string;
    repositoryService : Eagle.RepositoryService;
    repositoryBranch : string;
    repositoryName : string;
    sha : string;
    modified : boolean;

    constructor(){
        this.name = "";
        this.path = "";
        this.type = Eagle.FileType.Unknown;
        this.gitUrl = "";
        this.repositoryService = Eagle.RepositoryService.Unknown;
        this.repositoryBranch = "";
        this.repositoryName = "";
        this.sha = "";
        this.modified = false;
    }

    clear = () : void => {
        this.name = "";
        this.path = "";
        this.type = Eagle.FileType.Unknown;
        this.gitUrl = "";
        this.repositoryService = Eagle.RepositoryService.Unknown;
        this.repositoryBranch = "";
        this.repositoryName = "";
        this.sha = "";
        this.modified = false;
    }

    clone = () : FileInfo => {
        var result : FileInfo = new FileInfo();

        result.name = this.name;
        result.path = this.path;
        result.type = this.type;
        result.gitUrl = this.gitUrl;
        result.repositoryService = this.repositoryService;
        result.repositoryBranch = this.repositoryBranch;
        result.repositoryName = this.repositoryName;
        result.sha = this.sha;
        result.modified = this.modified;

        return result;
    }

    fullPath = () : string => {
        if (this.path === ""){
            return this.name;
        } else {
            return this.path + "/" + this.name;
        }
    }

    removeGitInfo = () : void => {
        this.repositoryService = Eagle.RepositoryService.Unknown;
        this.repositoryBranch = "";
        this.repositoryName = "";
        this.gitUrl = "";
        this.sha = "";
        this.path = "";
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
