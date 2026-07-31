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
import { Utils } from './Utils';
import { EagleStorage } from './EagleStorage';

export class GitLab {    
    static async loadRepoList(): Promise<Repository[]> {
        const repositories: Repository[] = [];

        // find and add custom gitlab repositories from browser storage
        const customRepositories = await EagleStorage.listCustomRepositories(Repository.Service.GitLab);
        repositories.push(...customRepositories);

        // fetch additional gitlab repositories from the server
        try {
            const data = await Utils.httpGetJSON("/getGitLabRepositoryList", {}) as {repository: string, branch: string}[];

            // add the repositories from the POST response
            for (const d of data){
                repositories.push(new Repository(Repository.Service.GitLab, d.repository, d.branch, true));
            }
        } catch (error) {
            console.error(error);
        }

        return repositories;
    }

    /**
     * Shows the remote files
     */
    static async loadRepoContent(repository : Repository, path: string): Promise<void> {
        const token = Utils.getServiceToken(Repository.Service.GitLab);

        // get location
        const location: Repository | RepositoryFolder | null = repository.findPath(path);

        if (location === null) {
            throw new Error("Location not found for path: " + path);
        }

        // flag the location as being fetched
        location.isFetching(true);

        // Add parameters in json data.
        const jsonData = {
            repository: repository.name,
            branch: repository.branch,
            token: token,
            path: path
        };

        let responseData: unknown;
        try {
            responseData = await Utils.httpPostJSON('/getGitLabFilesAll', jsonData);
        } catch (error) {
            console.error(error);
            Utils.showUserMessage("Error", "Unable to fetch files for this repository. A server error occurred. " + error);
            throw error;
        } finally {
            location.isFetching(false);
        }

        const response = typeof responseData === "object" && responseData !== null
            ? responseData as Record<string, unknown>
            : {};

        // check for errors that were handled correctly and passed to the client to display
        const responseError = typeof response.error === "string" ? response.error : undefined;
        if (typeof responseError !== "undefined"){
            console.log("error", responseError);
            Utils.showUserMessage("Error", responseError);
            throw new Error(responseError);
        }

        const filesByPathRaw = response.files;
        if (typeof filesByPathRaw !== "object" || filesByPathRaw === null){
            throw new Error("GitLab response does not contain a valid files object");
        }

        const filesByPath = filesByPathRaw as Record<string, unknown>;
        const rootFilesRaw = filesByPath[""];
        const fileNames: string[] = Array.isArray(rootFilesRaw)
            ? rootFilesRaw.filter((entry): entry is string => typeof entry === "string")
            : [];

        // flag as fetched and expand by default
        location.fetched(true);
        location.expanded(true);

        // delete current file list for this repository
        location.files.removeAll();
        location.folders.removeAll();

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
        for (const folderPath in filesByPath){
            // skip the root directory
            if (folderPath === ""){
                continue;
            }

            const folderName : string = folderPath.substring(folderPath.lastIndexOf('/') + 1);
            location.folders.push(new RepositoryFolder(folderName, repository, folderPath));
        }
    }

    private static parseFolder = (repository : Repository, path : string, data : Record<string, unknown>) : RepositoryFolder => {
        const folderName : string = path.substring(path.lastIndexOf('/') + 1);
        const folder = new RepositoryFolder(folderName, repository, path);

        const rootFilesRaw = data[""];
        const fileNames: string[] = Array.isArray(rootFilesRaw)
            ? rootFilesRaw.filter((entry): entry is string => typeof entry === "string")
            : [];

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
            if (subdir === "") { continue; }

            const subdirData = data[subdir];
            if (typeof subdirData === "object" && subdirData !== null){
                folder.folders.push(GitLab.parseFolder(repository, subdir, subdirData as Record<string, unknown>));
            }
        }

        return folder;
    }

    /**
     * Gets the specified remote file from the server
     * @param filePath File path.
     */
    static async openRemoteFile(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string): Promise<string> {
        const token = Utils.getServiceToken(Repository.Service.GitLab);

        const fullFileName : string = Utils.joinPath(filePath, fileName);

        // Add parameters in json data.
        const jsonData = {
            repositoryName: repositoryName,
            repositoryBranch: repositoryBranch,
            repositoryService: repositoryService,
            token: token,
            filename: fullFileName
        };

        const dataRaw = await Utils.httpPostJSON('/openRemoteGitlabFile', jsonData);
        const data = typeof dataRaw === "object"
            ? dataRaw as Record<string, unknown>
            : {};

        // warn if credentials were ignored (bad token, fell back to anonymous access)
        if (data.credentialsIgnored === true){
            Utils.showNotification(
                "GitLab Access Token",
                "The GitLab access token is invalid and was ignored while loading " + repositoryName + " / " + repositoryBranch + " / " + fullFileName + ". The file was loaded from a public repository.",
                "warning"
            );
        }

        const content = data.data;
        if (typeof content !== "string"){
            throw new Error("Invalid GitLab file response payload");
        }

        return content;
    }

    static async deleteRemoteFile(repositoryService : Repository.Service, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string): Promise<unknown> {
        const token = Utils.getServiceToken(Repository.Service.GitLab);

        if (token === "") {
            Utils.showUserMessage("Access Token", "The GitLab access token is not set! To open GitLab repositories, set the token via settings.");
            return undefined;
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

        return Utils.httpPostJSON('/deleteRemoteGitlabFile', jsonData);
    }
}
