import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {GraphUpdater} from './GraphUpdater';

export class FileInfo {
    name : string;
    path : string;
    type : Eagle.FileType;
    gitUrl : string;
    repositoryService : Eagle.RepositoryService;
    repositoryName : string;
    sha : string;
    modified : boolean;

    constructor(){
        this.name = "";
        this.path = "";
        this.type = Eagle.FileType.Unknown;
        this.gitUrl = "";
        this.repositoryService = Eagle.RepositoryService.Unknown;
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
        this.repositoryName = "";
        this.gitUrl = "";
        this.sha = "";
        this.path = "";
    }

    static toOJSJson = (fileInfo : FileInfo) : object => {
        return {
            fileType: Utils.translateFileTypeToString(fileInfo.type),
            repoService: fileInfo.repositoryService,
            repo: fileInfo.repositoryName,
            filePath: fileInfo.fullPath(),
            sha: fileInfo.sha,
            git_url: fileInfo.gitUrl
        };
    }

    static fromOJSJson = (modelData : any) : FileInfo => {
        var result : FileInfo = new FileInfo();

        result.path = GraphUpdater.getFilePathFromFullPath(modelData.filePath);
        result.name = GraphUpdater.getFileNameFromFullPath(modelData.filePath);
        result.type = Utils.translateStringToFileType(modelData.fileType);
        result.gitUrl = modelData.git_url;

        // NOTE: if the incoming data (modelData) does not indicate the service, assume it is GitHub
        result.repositoryService = modelData.repoService == undefined ? Eagle.RepositoryService.GitHub : modelData.repoService;
        result.repositoryName = modelData.repo;
        result.sha = modelData.sha;

        return result;
    }
}
