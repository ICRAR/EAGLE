/*
#
#    ICRAR - International Centre for Radio Astronomy Research
#    (c) UWA - The University of Western Australia, 2016
#    Copyright by UWA (in the framework of the ICRAR)
#    All rights reserved
#
#    This library is free software; you can redistribute it and/or
#    modify it under the terms of the GNU Lesser General Public
#    License as published by the Free Software Foundation; either
#    version 2.1 of the License, or (at your option) any later version.
#
#    This library is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#    Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public
#    License along with this library; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston,
#    MA 02111-1307  USA
#
*/

import { Repositories } from './Repositories';
import { Repository } from './Repository';
import { RepositoryFolder } from './RepositoryFolder';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { Utils } from './Utils';

export class GitLab {
    /**
     * Loads the GitLab repository list.
     */
    static async refresh() {
        // fetch repositories from server
        const repositories: Repository[] = await GitLab.loadRepoList();

        // remove all GitLab repos from the list of repositories
        for (let i = Repositories.repositories().length - 1 ; i >= 0 ; i--){
            if (Repositories.repositories()[i].service === Repository.Service.GitLab){
                Repositories.repositories.splice(i, 1);
            }
        }

        // add new repositories
        Repositories.repositories.push(...repositories);

        // sort the repository list
        Repositories.sort();
    }
    
    static async loadRepoList(): Promise<Repository[]> {
        return new Promise(async(resolve) => {
            const repositories: Repository[] = [];

            // find and add custom gitlab repositories from browser storage
            const customRepositories = Repositories.listCustomRepositories(Repository.Service.GitLab);
            repositories.push(...customRepositories);

            // fetch additional gitlab repositories from the server
            Utils.httpGetJSON("/getGitLabRepositoryList", null, function(error : string, data: any){
                if (error != null){
                    console.error(error);
                    resolve(repositories);
                    return;
                }

                // add the repositories from the POST response
                for (const d of data){
                    repositories.push(new Repository(Repository.Service.GitLab, d.repository, d.branch, true));
                }

                resolve(repositories);
            });
        });
    }

    /**
     * Shows the remote files
     */
    static async loadRepoContent(repository : Repository): Promise<void> {
        return new Promise(async(resolve, reject) => {
            const token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);

            if (token === null || token === "") {
                Utils.showUserMessage("Access Token", "The GitLab access token is not set! To access GitLab repository, set the token via settings.");
                reject("The GitLab access token is not set! To access GitLab repository, set the token via settings.");
            }

            // flag the repository as being fetched
            repository.isFetching(true);

            // Add parameters in json data.
            const jsonData = {
                repository: repository.name,
                branch: repository.branch,
                token: token,
            };

            Utils.httpPostJSON('/getGitLabFilesAll', jsonData, function(error:string, data:any){
                repository.isFetching(false);

                // check for unhandled errors
                if (error !== null){
                    console.error(error, data);
                    Utils.showUserMessage("Error", "Unable to fetch files for this repository. A server error occurred. " + error);
                    reject(error);
                    return;
                }

                // check for errors that were handled correctly and passed to the client to display
                if (typeof data.error !== 'undefined'){
                    console.log("error", data.error);
                    Utils.showUserMessage("Error", data.error);
                    reject(error);
                    return;
                }

                // flag the repository as fetched and expand by default
                repository.fetched(true);
                repository.expanded(true);

                // delete current file list for this repository
                repository.files.removeAll();
                repository.folders.removeAll();

                const fileNames : string[] = data[""];

                // sort the fileNames
                fileNames.sort(Repository.fileSortFunc);

                // add files to repo
                for (const fileName of fileNames){
                    // if file is not a .graph, .palette, or .json, just ignore it!
                    if (Utils.verifyFileExtension(fileName)){
                        repository.files.push(new RepositoryFile(repository, "", fileName));
                    }
                }

                // add folders to repo
                for (const path in data){
                    // skip the root directory
                    if (path === "")
                        continue;

                    repository.folders.push(GitLab.parseFolder(repository, path, data[path]));
                }

                resolve();
            });
        });
    }

    private static parseFolder = (repository : Repository, path : string, data : any) : RepositoryFolder => {
        const folderName : string = path.substring(path.lastIndexOf('/') + 1);
        const folder = new RepositoryFolder(folderName);

        const fileNames : string[] = data[""];

        // sort the fileNames
        fileNames.sort(Repository.fileSortFunc);

        // add files to repo
        for (const fileName of fileNames){
            // if file is not a .graph, .palette, or .json, just ignore it!
            if (Utils.verifyFileExtension(fileName)){
                folder.files.push(new RepositoryFile(repository, path, fileName));
            }
        }

        // add folders to repo
        for (const subdir in data){
            // skip the root directory
            if (subdir === "")
                continue;

            folder.folders.push(GitLab.parseFolder(repository, subdir, data[subdir]));
        }

        return folder;
    }

    /**
     * Gets the specified remote file from the server
     * @param filePath File path.
     */
    //, callback: (error : string, data : string) => void ) : void {
    static async openRemoteFile(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string): Promise<string> {
        return new Promise(async(resolve, reject) => {
            const token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);

            if (token === null || token === "") {
                reject("The GitLab access token is not set! To open GitLab repositories, set the token via settings.");
                return;
            }

            const fullFileName : string = Utils.joinPath(filePath, fileName);

            // Add parameters in json data.
            const jsonData = {
                repositoryName: repositoryName,
                repositoryBranch: repositoryBranch,
                repositoryService: repositoryService,
                token: token,
                filename: fullFileName
            };

            Utils.httpPostJSON('/openRemoteGitlabFile', jsonData, (error: string, data: string) => {
                if (error !== null){
                    reject(error);
                    return;
                }
                resolve(data);
            });
        });
    }

    static deleteRemoteFile(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, callback: (error : string) => void ) : void {
        const token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);

        if (token === null || token === "") {
            Utils.showUserMessage("Access Token", "The GitLab access token is not set! To open GitLab repositories, set the token via settings.");
            return;
        }

        const fullFileName : string = Utils.joinPath(filePath, fileName);

        // Add parameters in json data.
        const jsonData = {
            repositoryName: repositoryName,
            repositoryBranch: repositoryBranch,
            repositoryService: repositoryService,
            token: token,
            filename: fullFileName
        };

        Utils.httpPostJSON('/deleteRemoteGitlabFile', jsonData, callback);
    }
}
