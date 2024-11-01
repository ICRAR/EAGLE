import * as ko from "knockout";

import { Eagle } from './Eagle';
import { GitHub } from './GitHub';
import { GitLab } from "./GitLab";
import { Repositories } from "./Repositories";
import { RepositoryFolder } from './RepositoryFolder';
import { RepositoryFile } from './RepositoryFile';
import { Utils } from './Utils';

export class Repository {
    _id : number
    name : string
    service : Repository.Service
    branch : string
    isBuiltIn : boolean
    isFetching: ko.Observable<boolean>
    fetched : ko.Observable<boolean>
    expanded : ko.Observable<boolean>
    files : ko.ObservableArray<RepositoryFile>
    folders : ko.ObservableArray<RepositoryFolder>
    handle : FileSystemDirectoryHandle

    // NOTE: I think we should be able to use the Repository.Service.Unknown enum here, but it causes a javascript error. Not sure why.
    static readonly DUMMY = new Repository(<Repository.Service>"Unknown", "", "", false);

    constructor(service : Repository.Service, name : string, branch : string, isBuiltIn : boolean){
        this._id = Math.floor(Math.random() * 1000000000000);
        this.name = name;
        this.service = service;
        this.branch = branch;
        this.isBuiltIn = isBuiltIn;
        this.isFetching = ko.observable(false);
        this.fetched = ko.observable(false);
        this.expanded = ko.observable(false);
        this.files = ko.observableArray();
        this.folders = ko.observableArray();
        this.handle = null;
    }

    htmlId : ko.PureComputed<string> = ko.pureComputed(()=>{
        return this.name.replace('/', '_') + '_' + this.branch;
    }, this);

    htmlName: ko.PureComputed<string> = ko.pureComputed(() => {
        switch (this.service){
            case Repository.Service.LocalDirectory:
                return this.name;
            default:
                return this.name + ' (' + this.branch + ')';
        }
    }, this);

    clear = () : void => {
        this.files.removeAll();
        this.folders.removeAll();
    }

    getNameAndBranch = () : string => {
        return this.name + " (" + this.branch + ")";
    }

    select = () : void => {
        console.log("select(" + this.name + ")");

        // if we have already fetched data for this repo, just expand or collapse the list as appropriate
        // otherwise fetch the data
        if (this.fetched()){
            this.expanded(!this.expanded());
        } else {
            switch(this.service){
                case Repository.Service.GitHub:
                    GitHub.loadRepoContent(this);
                    break;
                case Repository.Service.GitLab:
                    GitLab.loadRepoContent(this);
                    break;
                case Repository.Service.LocalDirectory:
                    Repository.loadLocalRepository(this);
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + this.service + ")");
            }
        }
    }

    refresh = () : void => {
        switch(this.service){
            case Repository.Service.GitHub:
                GitHub.loadRepoContent(this);
                break;
            case Repository.Service.GitLab:
                GitLab.loadRepoContent(this);
                break;
            case Repository.Service.LocalDirectory:
                Repository.loadLocalRepository(this);
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
        }
    }

    // find a single file within the repo, based on the path and filename
    findFile = (path: string, filename: string): RepositoryFile => {
        const pathParts: string[] = path.split('/');
        let pointer: Repository | RepositoryFolder = this;

        // traverse down the folder structure
        for (const pathPart of pathParts){
            for (const folder of pointer.folders()){
                if (folder.name === pathPart){
                    pointer = folder;
                    break;
                }
            }
        }

        // find the file here
        for (const file of pointer.files()){
            if (file.name === filename){
                return file;
            }
        }

        return null;
    }

    deleteFile = (file: RepositoryFile) : void => {
        let pointer: Repository | RepositoryFolder = this;
        let lastPointer: Repository | RepositoryFolder = null;
        const fileIsInTopLevelOfRepo: boolean = file.path === "";

        if (!fileIsInTopLevelOfRepo){
            // traverse down the folder structure
            const pathParts: string[] = file.path.split('/');
            for (const pathPart of pathParts){
                for (const folder of pointer.folders()){
                    if (folder.name === pathPart){
                        lastPointer = pointer;
                        pointer = folder;
                        break;
                    }
                }
            }
        }

        // remove the file here
        for (let i = 0 ; i < pointer.files().length; i++){
            if (pointer.files()[i]._id === file._id){
                pointer.files.splice(i, 1);
                break;
            }
        }

        // check if we removed the last file in the folder
        // if so, the remove the folder too
        if (!fileIsInTopLevelOfRepo){
            if (pointer.files().length === 0){
                for (let i = 0; i < lastPointer.folders().length ; i++){
                    if (lastPointer.folders()[i].name === pointer.name){
                        lastPointer.folders.splice(i, 1);
                    }
                }
            }
        }
    }

    getDirectoryHandleFromPath = async (path: string): Promise<FileSystemDirectoryHandle> => {
        const pathParts: string[] = path.split('/');
        let pointer: Repository | RepositoryFolder = this;

        // traverse down the folder structure
        for (const pathPart of pathParts){
            let found: boolean = false;

            for (const folder of pointer.folders()){
                if (folder.name === pathPart){
                    pointer = folder;
                    found = true;
                    break;
                }
            }

            // if this step in the path hierarchy was not found, create a new FileSystemDirectoryHandle here
            if (!found){
                const handle: FileSystemDirectoryHandle = await pointer.handle.getDirectoryHandle(pathPart, {create: true});

                // store the handle in an orphaned RepositoryFolder
                pointer = new RepositoryFolder(pathPart);
                pointer.handle = handle;
            }
        }

        return pointer.handle;
    }

    // sorting order
    // 1. alphabetically by service
    // 2. alphabetically by name
    // 3. alphabetically by branch (master always first)
    public static repositoriesSortFunc(a : Repository, b : Repository) : number {
        if (a.service < b.service)
            return -1;

        if (a.service > b.service)
            return 1;

        if (a.name < b.name)
            return -1;

        if (a.name > b.name)
            return 1;

        if (a.branch === "master")
            return -1;

        if (a.branch < b.branch)
            return -1;

        if (a.branch > b.branch)
            return 1;

        return 0;
    }

    public static fileSortFunc(fileNameA: string, fileNameB: string) : number {
        const aType : Eagle.FileType = Utils.getFileTypeFromFileName(fileNameA);
        const bType : Eagle.FileType = Utils.getFileTypeFromFileName(fileNameB);

        if (aType !== bType){
            const aTypeNum : number = Utils.getFileTypeNum(aType);
            const bTypeNum : number = Utils.getFileTypeNum(bType);

            return aTypeNum > bTypeNum ? 1 : -1;
        }

        return fileNameA.toLowerCase() > fileNameB.toLowerCase() ? 1 : -1;
    }

    // > 0	sort a after b, e.g. [b, a]
    public static localDirectoryEntriesSortFunc(a: [string, FileSystemHandle], b: [string, FileSystemHandle]): number{
        const fileNameA: string = a[0];
        const handleA: FileSystemHandle = a[1];
        const fileNameB: string = b[0];
        const handleB: FileSystemHandle = b[1];

        if (handleA.kind === 'directory' && handleB.kind === 'directory'){
            return fileNameA.toLowerCase() > fileNameB.toLowerCase() ? 1 : -1;
        }
        if (handleA.kind === 'directory' && handleB.kind === 'file'){
            return -1;
        }
        if (handleA.kind === 'file' && handleB.kind === 'directory'){
            return 1;
        }

        // otherwise both files
        return Repository.fileSortFunc(fileNameA, fileNameB);
    }

    public static async loadLocalRepository(repository: Repository): Promise<void> {
        // flag the repository as being fetched
        repository.isFetching(true);

        // delete current file list for this repository
        repository.files.removeAll();
        repository.folders.removeAll();

        // parse the folder
        Repository._parseFolder(repository, repository, [], repository.handle);
        
        // flag the repository as fetched and expand by default
        repository.isFetching(false);
        repository.fetched(true);
        repository.expanded(true);
    }

    static async _parseFolder(repository: Repository, parent: Repository | RepositoryFolder, pathParts: string[], dirHandle: FileSystemDirectoryHandle){
        // first copy the entries to a temp directory, for sorting
        const entries: [string, FileSystemHandle][] = [];
        for await (const entry of dirHandle.entries()){
            if (entry[1].kind !== 'directory' || Utils.verifyFolderName(entry[0])){
                entries.push(entry);
            }
        }

        // sort
        entries.sort(this.localDirectoryEntriesSortFunc)


        // add files and folders to repository data structure
        for (const [name, handle] of entries) {
            // add files to repo
            if (handle.kind === 'file'){
                // if file is not a .graph, .palette, or .json, just ignore it!
                if (Utils.verifyFileExtension(name)){
                    const newFile = new RepositoryFile(repository, pathParts.join('/'), name);
                    newFile.handle = handle as FileSystemFileHandle;
                    parent.files.push(newFile);
                }
            }

            // add folders to repo
            if (handle.kind === 'directory'){
                const newFolder: RepositoryFolder = new RepositoryFolder(name);
                newFolder.handle = handle as FileSystemDirectoryHandle;
                await Repository._parseFolder(repository, newFolder, pathParts.concat([name]), handle as FileSystemDirectoryHandle);
                parent.folders.push(newFolder);
            }
        }
    }

    // load a file from a "LocalDirectory"-type repository
    static async loadLocalDirectoryFile(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, callback: (error : string, data : string) => void ): Promise<void> {
        // find the repository
        const localDirectory: Repository = Repositories.get(repositoryService, repositoryName, repositoryBranch);

        // check we found it
        if (localDirectory === null){
            callback("Can't find Repository. Service: " + repositoryService + " Name: " + repositoryName + " Branch: " + repositoryBranch, null);
            return;
        }

        // find the file in the repository
        const repositoryFile: RepositoryFile = localDirectory.findFile(filePath, fileName)

        // abort if file not found
        if (repositoryFile === null){
            callback("Can't find file in directory: " + filePath + " " + fileName, null);
            return;
        }
        
        // get the fileHandle from the file
        const fileHandle: FileSystemFileHandle = repositoryFile.handle;

        // abort if file doesn't have a fileHandle
        if (fileHandle === null){
            callback("No handle attached to RepositoryFile: " + filePath + " " + fileName, null);
            return;
        }

        // open file
        const file: File = await fileHandle.getFile();
        const fileData = await file.text();

        callback(null, fileData);
    }

    // save a file to a "LocalDirectory"-type repository
    static async saveLocalDirectoryFile(repositoryService : Repository.Service, repositoryName : string, filePath : string, fileName : string, contents: string, callback: (error : string) => void ): Promise<void> {
        // find the repository
        const localDirectory: Repository = Repositories.get(repositoryService, repositoryName, "");

        // check we found it
        if (localDirectory === null){
            callback("Can't find Repository. Service: " + repositoryService + " Name: " + repositoryName);
            return;
        }

        // get (or create) a FileSystemDirectoryHandle for the directory containing the file
        const pathDirectoryHandle: FileSystemDirectoryHandle = await localDirectory.getDirectoryHandleFromPath(filePath);

        // create a fileHandle for the new file
        const fileHandle: FileSystemFileHandle = await pathDirectoryHandle.getFileHandle(fileName, {create: true});

        // create a FileSystemWritableFileStream to write to
        const writable = await fileHandle.createWritable();

        // write the contents of the file to the stream
        await writable.write(contents);

        // Close the file and write the contents to disk
        await writable.close();

        callback(null);
    }
}

export namespace Repository {
    export enum Service {
        GitHub = "GitHub",
        GitLab = "GitLab",
        File = "File",
        Url = "Url",
        LocalDirectory = "LocalDirectory",
        Unknown = "Unknown"
    }
}