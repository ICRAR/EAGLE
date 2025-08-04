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

import { Eagle } from './Eagle';
import { Errors } from './Errors';
import { GitHub } from './GitHub';
import { GitLab } from './GitLab';
import { LogicalGraph } from './LogicalGraph';
import { Repositories } from './Repositories';
import { Repository } from './Repository';
import { RepositoryFolder } from './RepositoryFolder';
import { RepositoryFile } from './RepositoryFile';
import { Utils } from './Utils';

export class GraphUpdater {

    // NOTE: for use in translation of OJS object to internal graph representation
    static findIndexOfNodeDataArrayWithId(nodeDataArray: any[], id: NodeId) : number {
        for (let i = 0 ; i < nodeDataArray.length ; i++){
            if (nodeDataArray[i].id === id){
                return i;
            }
        }

        return -1;
    }

    // extra functionality to check if any x,y coords of nodes are negative, if so, move them all into the +x/+y quadrant
    static correctOJSNegativePositions(graph : LogicalGraph) : boolean {
        // check if any nodes are negative
        let anyNegative : boolean = false;
        for (const node of graph.getNodes()){
            if (node.getPosition().x < 0 || node.getPosition().y < 0){
                anyNegative = true;
                break;
            }
        }

        // abort if not all negative
        if (!anyNegative){
            return false;
        }

        // find the most negative position
        let maxX = 0;
        let maxY = 0;
        for (const node of graph.getNodes()){
            if (node.getPosition().x < maxX){
                maxX = node.getPosition().x;
            }
            if (node.getPosition().y < maxY){
                maxY = node.getPosition().y;
            }
        }

        // move all nodes by -maxX, -maxY
        for (const node of graph.getNodes()){
            const newX : number = node.getPosition().x - maxX;
            const newY : number = node.getPosition().y - maxY;
            node.setPosition(newX, newY);
        }

        return true;
    }

    static usesNodeKeys(graphObject: any): boolean {
        for (const node of graphObject["nodeDataArray"]){
            if (typeof node.key !== 'undefined'){
                return true;
            }
        }

        return false;
    }

    // Takes a graph that is using keys and updates it to use ids only
    // - edges .from and .to attributes refer to keys, so we change to ids
    static updateKeysToIds(graphObject: any): void {
        console.log("GraphUpdater.updateKeysToIds()");
        const keyToId: Map<number, string> = new Map<number, string>();

        // build keyToId map from nodes
        for (const node of graphObject["nodeDataArray"]){
            const newId = Utils.generateNodeId();

            keyToId.set(node.key, newId);
            node.id = newId;
            delete node.key; // remove key attribute

            // input app
            if (node.inputApplicationKey !== null){
                const inputAppId = Utils.generateNodeId();
                keyToId.set(node.inputApplicationKey, inputAppId);
                node.inputApplicationId = inputAppId;
            }
            // output app
            if (node.outputApplicationKey !== null){
                const outputAppId = Utils.generateNodeId();
                keyToId.set(node.outputApplicationKey, outputAppId);
                node.inputApplicationId = outputAppId;
            }
        }

        // use map to update parentKeys
        for (const node of graphObject["nodeDataArray"]){
            if (typeof node.group !== "undefined"){
                node.parentId = keyToId.get(node.group);
            } else {
                node.parentId = null;
            }
            delete node.group; // remove group attribute
        }

        // use map to update subject
        for (const node of graphObject["nodeDataArray"]){
            if (typeof node.subject !== "undefined" && node.subject !== null){
                node.subject = keyToId.get(node.subject);
            } else {
                node.subjectId = null;
            }
        }

        // use map to update edges
        for (const edge of graphObject["linkDataArray"]){
            if (!keyToId.has(edge.from)){
                console.warn("GraphUpdater.updateKeysToIds() : Can't find Id for from key", edge.from, edge);
            }
            if (!keyToId.has(edge.to)){
                console.warn("GraphUpdater.updateKeysToIds() : Can't find Id for to key", edge.to, edge);
            }

            edge.from = keyToId.get(edge.from);
            edge.to = keyToId.get(edge.to);
        }
    }

    static generateLogicalGraphsTable() : any[] {
        // check that all repos have been fetched
        let foundNotFetched = false;
        for (const repo of Repositories.repositories()){
            if (!repo.fetched()){
                foundNotFetched = true;
                console.warn("Not fetched repo:" + repo.getNameAndBranch());
            }
        }
        if (foundNotFetched){
            return [];
        }

        const tableData : any[] = [];

        // add logical graph nodes to table
        for (const repo of Repositories.repositories()){
            for (const folder of repo.folders()){
                GraphUpdater._addGraphs(repo, folder, folder.name, tableData);
            }

            for (const file of repo.files()){
                if (file.name.endsWith(".graph")){
                    tableData.push({
                        "service":repo.service,
                        "name":repo.name,
                        "branch":repo.branch,
                        "folder":"",
                        "file":file.name,
                        "eagleVersion":"",
                        "repositoryUrl":"",
                        "commitHash":"",
                        "downloadUrl":"",
                        "signature":"",
                        "lastModified":"",
                        "lastModifiedBy":"",
                        "numLoadWarnings":"",
                        "numLoadErrors":"",
                        "numCheckWarnings":"",
                        "numCheckErrors":""
                    });
                }
            }
        }

        return tableData;
    }
    
    // recursive traversal through the folder structure to find all graph files
    private static _addGraphs = (repository: Repository, folder: RepositoryFolder, path: string, data: any[]) : void => {
        for (const subfolder of folder.folders()){
            GraphUpdater._addGraphs(repository, subfolder, path + "/" + subfolder.name, data);
        }

        for (const file of folder.files()){
            if (file.name.endsWith(".graph")){
                data.push({
                    "service": repository.service,
                    "name":repository.name,
                    "branch":repository.branch,
                    "folder":path,
                    "file":file.name,
                    "eagleVersion":"",
                    "repositoryUrl":"",
                    "commitHash":"",
                    "downloadUrl":"",
                    "signature":"",
                    "lastModified":"",
                    "lastModifiedBy":"",
                    "numLoadWarnings":"",
                    "numLoadErrors":"",
                    "numCheckWarnings":"",
                    "numCheckErrors":""
                });
            }
        }
    }
    
    attemptLoadLogicalGraphTable = async(data: any[]) : Promise<void> => {
        const eagle: Eagle = Eagle.getInstance();

        for (const row of data){
            // determine the correct function to load the file
            let openRemoteFileFunc: any;
            if (row.service === Repository.Service.GitHub){
                openRemoteFileFunc = GitHub.openRemoteFile;
            } else {
                openRemoteFileFunc = GitLab.openRemoteFile;
            }

            // try to load the file
            await new Promise<void>((resolve, reject) => {
                openRemoteFileFunc(row.service, row.name, row.branch, row.folder, row.file, (error: string, data: string) => {
                    // if file fetched successfully
                    if (error === null){
                        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};
                        const file: RepositoryFile = new RepositoryFile(row.service, row.folder, row.file);
                        const lg: LogicalGraph = LogicalGraph.fromOJSJson(JSON.parse(data), file, errorsWarnings);

                        // record number of errors
                        row.numLoadWarnings = errorsWarnings.warnings.length;
                        row.numLoadErrors = errorsWarnings.errors.length;

                        // use git-related info within file
                        row.generatorVersion = lg.fileInfo().generatorVersion;
                        row.lastModifiedBy = lg.fileInfo().lastModifiedName;
                        row.repositoryUrl = lg.fileInfo().repositoryUrl;
                        row.commitHash = lg.fileInfo().commitHash;
                        row.downloadUrl = lg.fileInfo().downloadUrl;
                        row.signature = lg.fileInfo().signature;

                        // convert date from timestamp to date string
                        const date = new Date(lg.fileInfo().lastModifiedDatetime * 1000);
                        row.lastModified = date.toLocaleDateString() + " " + date.toLocaleTimeString()

                        // check the graph once loaded
                        Utils.checkGraph(eagle);
                        const results: Errors.ErrorsWarnings = Utils.gatherGraphErrors();
                        row.numCheckWarnings = results.warnings.length;
                        row.numCheckErrors = results.errors.length;
                    }

                    resolve();
                });
            });
        }
    }
}
