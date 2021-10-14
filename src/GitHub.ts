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

import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {Repository} from './Repository';
import {RepositoryFolder} from './RepositoryFolder';
import {RepositoryFile} from './RepositoryFile';

export class GitHub {
    /**
     * Loads the GitHub repository list.
     */
    static loadRepoList(eagle : Eagle) : void {
        Utils.httpGetJSON("/getGitHubRepositoryList", null, function(error : string, data: any){
            if (error != null){
                console.error(error);
                return;
            }

            // remove all GitHub repos from the list of repositories
            for (let i = eagle.repositories().length - 1 ; i >= 0 ; i--){
                if (eagle.repositories()[i].service === Eagle.RepositoryService.GitHub)
                    eagle.repositories.splice(i, 1);
            }

            // add the repositories from the POST response
            for (const d of data){
                eagle.repositories.push(new Repository(Eagle.RepositoryService.GitHub, d.repository, d.branch, true));
            }

            // search for custom repositories in localStorage, and add them into the list
            for (let i = 0; i < localStorage.length; i++) {
                const key : string = localStorage.key(i);
                const value : string = localStorage.getItem(key);
                const keyExtension : string = key.substring(key.lastIndexOf('.') + 1);

                // handle legacy repositories where the service and branch are not specified (assume github and master)
                if (keyExtension === "repository"){
                    eagle.repositories.push(new Repository(Eagle.RepositoryService.GitHub, value, "master", false));
                }

                // handle legacy repositories where the branch is not specified (assume master)
                if (keyExtension === "github_repository") {
                    eagle.repositories.push(new Repository(Eagle.RepositoryService.GitHub, value, "master", false));
                }

                // handle the current method of storing repositories where both the service and branch are specified
                if (keyExtension === "github_repository_and_branch"){
                    const repositoryName = value.split("|")[0];
                    const repositoryBranch = value.split("|")[1];
                    eagle.repositories.push(new Repository(Eagle.RepositoryService.GitHub, repositoryName, repositoryBranch, false));
                }
            }

            // sort the repository list
            eagle.sortRepositories();
        });
    }

    /**
     * Shows the remote files on the GitHub.
     */
    static loadRepoContent(repository : Repository) : void {
        const token = Eagle.findSettingValue(Utils.GITHUB_ACCESS_TOKEN_KEY);

        if (token === null || token === "") {
            Utils.showUserMessage("Access Token", "The GitHub access token is not set! To access GitHub repository, set the token via settings.");
            return;
        }

        // flag the repository as being fetched
        repository.isFetching(true);

        // Add parameters in json data.
        const jsonData = {
            repository: repository.name,
            branch: repository.branch,
            token: token,
        };

        Utils.httpPostJSON('/getGitHubFilesAll', jsonData, function(error:string, data:any){
            repository.isFetching(false);

            // check for unhandled errors
            if (error != null){
                console.error(error, data);
                Utils.showUserMessage("Error", "Unable to fetch files for this repository. A server error occurred. " + error);
                return;
            }

            // check for errors that were handled correctly and passed to the client to display
            if (typeof data.error !== 'undefined'){
                console.log("error", data.error);
                Utils.showUserMessage("Error", data.error);
                return;
            }

            // flag the repository as fetched and expand by default
            repository.fetched(true);
            repository.expanded(true);

            // delete current file list for this repository
            repository.files.removeAll();
            repository.folders.removeAll();

            console.log("/getGitHubFiles reply", data, typeof data);

            const fileNames : string[] = data[""];

            // debug
            Utils.addToHTMLElementLog("fileNames:" + fileNames);

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

                repository.folders.push(GitHub.parseFolder(repository, path, data[path]));
            }
            Eagle.reloadTooltips();
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
            folder.files.push(new RepositoryFile(repository, path, fileName));
        }

        // add folders to repo
        for (const subdir in data){
            // skip the root directory
            if (subdir === "")
                continue;

            folder.folders.push(GitHub.parseFolder(repository, subdir, data[subdir]));
        }

        return folder;
    }

    /**
     * Gets the specified remote file from the server
     * @param filePath File path.
     */
    static openRemoteFile(repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, callback: (error : string, data : string) => void ) : void {
        const token = Eagle.findSettingValue(Utils.GITHUB_ACCESS_TOKEN_KEY);

        if (token === null || token === "") {
            Utils.showUserMessage("Access Token", "The GitHub access token is not set! To open GitHub repositories, set the token via settings.");
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

        Utils.httpPostJSON('/openRemoteGithubFile', jsonData, callback);
    }
}
