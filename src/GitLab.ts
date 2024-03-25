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
import {Repositories} from './Repositories';
import {Repository} from './Repository';
import {RepositoryFolder} from './RepositoryFolder';
import {RepositoryFile} from './RepositoryFile';
import {Setting} from './Setting';
import {Utils} from './Utils';

export class GitLab {
    /**
     * Loads the GitLab repository list.
     */
    // TODO: should callback with the list of repositories
    static loadRepoList() : void {
        Utils.httpGetJSON("/getGitLabRepositoryList", null, function(error : string, data: any){
            if (error != null){
                console.error(error);
                return;
            }

            // remove all GitLab repos from the list of repositories
            for (let i = Repositories.repositories().length - 1 ; i >= 0 ; i--){
                if (Repositories.repositories()[i].service === Eagle.RepositoryService.GitLab)
                    Repositories.repositories.splice(i, 1);
            }

            // add the repositories from the POST response
            for (const d of data){
                Repositories.repositories.push(new Repository(Eagle.RepositoryService.GitLab, d.repository, d.branch, true));
            }

            // search for custom repositories, and add them into the list.
            for (let i = 0; i < localStorage.length; i++) {
                const key : string = localStorage.key(i);
                const value : string = localStorage.getItem(key);
                const keyExtension : string = key.substring(key.lastIndexOf('.') + 1);

                // handle legacy repositories where the branch is not specified (assume master)
                if (keyExtension === "gitlab_repository"){
                    Repositories.repositories.push(new Repository(Eagle.RepositoryService.GitLab, value, "master", false));
                }

                // handle the current method of storing repositories where both the service and branch are specified
                if (keyExtension === "gitlab_repository_and_branch") {
                    const repositoryName = value.split("|")[0];
                    const repositoryBranch = value.split("|")[1];
                    Repositories.repositories.push(new Repository(Eagle.RepositoryService.GitLab, repositoryName, repositoryBranch, false));
                }
            }

            // sort the repository list
            Repositories.sort();
        });
    }

    /**
     * Shows the remote files
     */
    static loadRepoContent(repository : Repository) : void {
        const token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);

        if (token === null || token === "") {
            Utils.showUserMessage("Access Token", "The GitLab access token is not set! To access GitLab repository, set the token via settings.");
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

        Utils.httpPostJSON('/getGitLabFilesAll', jsonData, function(error:string, data:any){
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

            console.log("/getGitLabFiles reply", data, typeof data);

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
    static openRemoteFile(file: RepositoryFile, callback: (error : string, data : string) => void ) : void {
        const token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);

        if (token === null || token === "") {
            Utils.showUserMessage("Access Token", "The GitLab access token is not set! To open GitLab repositories, set the token via settings.");
            return;
        }

        const fullFileName : string = Utils.joinPath(file.path, file.name);

        // Add parameters in json data.
        const jsonData = {
            repositoryName: file.repository.name,
            repositoryBranch: file.repository.branch,
            repositoryService: file.repository.service,
            token: token,
            filename: fullFileName
        };

        Utils.httpPostJSON('/openRemoteGitlabFile', jsonData, callback);
    }
}
