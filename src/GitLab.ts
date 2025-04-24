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

import { Repository } from './Repository';
import { RepositoryFolder } from './RepositoryFolder';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { Utils } from './Utils';
import { EagleStorage } from './EagleStorage';

export class GitLab {    
    static async loadRepoList(): Promise<Repository[]> {
        return new Promise(async(resolve) => {
            const repositories: Repository[] = [];

            // find and add custom gitlab repositories from browser storage
            const customRepositories = await EagleStorage.listCustomRepositories(Repository.Service.GitLab);
            repositories.push(...customRepositories);

            // fetch additional gitlab repositories from the server
            let data;
            try {
                data = await Utils.httpGetJSON("/getGitLabRepositoryList", null) as {repository: string, branch: string}[];
            } catch (error) {
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
    }

    /**
     * Shows the remote files
     */
    static async loadRepoContent(repository : Repository, path: string): Promise<void> {
        return new Promise(async(resolve, reject) => {
            const token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);

            if (token === null || token === "") {
                Utils.showUserMessage("Access Token", "The GitLab access token is not set! To access GitLab repository, set the token via settings.");
                reject("The GitLab access token is not set! To access GitLab repository, set the token via settings.");
                return;
            }

            // get location
            const location: Repository | RepositoryFolder = repository.findPath(path);

            // flag the location as being fetched
            location.isFetching(true);

            // Add parameters in json data.
            const jsonData = {
                repository: repository.name,
                branch: repository.branch,
                token: token,
                path: path
            };

            let data: any;
            try {
                data = await Utils.httpPostJSON('/getGitLabFilesAll', jsonData);
            } catch (error) {
                console.error(error, data);
                Utils.showUserMessage("Error", "Unable to fetch files for this repository. A server error occurred. " + error);
                reject(error);
                return;
            } finally {
                location.isFetching(false);
            }

            // check for errors that were handled correctly and passed to the client to display
            if (typeof data.error !== 'undefined'){
                console.log("error", data.error);
                Utils.showUserMessage("Error", data.error);
                reject(data.error);
                return;
            }

            // flag as fetched and expand by default
            location.fetched(true);
            location.expanded(true);

            // delete current file list for this repository
            location.files.removeAll();
            location.folders.removeAll();

            const fileNames : string[] = data[""];

            // sort the fileNames
            fileNames.sort(Repository.fileSortFunc);

            // add files to repo
            for (const fileName of fileNames){
                // if file is not a .graph, .palette, or .json, just ignore it!
                if (Utils.verifyFileExtension(fileName)){
                    location.files.push(new RepositoryFile(repository, path, fileName));
                }
            }

            // add folders to repo
            for (const path in data){
                // skip the root directory
                if (path === ""){
                    continue;
                }

                const folderName : string = path.substring(path.lastIndexOf('/') + 1);
                location.folders.push(new RepositoryFolder(folderName, repository, path));
            }

            resolve();
        });
    }

    private static parseFolder = (repository : Repository, path : string, data : any) : RepositoryFolder => {
        const folderName : string = path.substring(path.lastIndexOf('/') + 1);
        const folder = new RepositoryFolder(folderName, repository, path);

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

            let data: any;
            try {
                data = await Utils.httpPostJSON('/openRemoteGitlabFile', jsonData);
            } catch (error){
                reject(error);
                return;
            }
            resolve(data);
        });
    }

    static deleteRemoteFile(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string){
        return new Promise(async(resolve, reject) => {
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

            let data: any;
            try {
                data = await Utils.httpPostJSON('/deleteRemoteGitlabFile', jsonData);
            } catch (error) {
                reject(error);
                return;
            }
            resolve(data);
        });
    }
}
