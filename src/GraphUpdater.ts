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
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { Utils } from './Utils';

import * as ko from 'knockout';

export class GraphUpdaterFile {
    data: string; // the file data as a string, used for pushing to destination repository
    file: ko.Observable<RepositoryFile>;
    state: ko.Observable<GraphUpdater.FileStatus>;

    constructor(file: RepositoryFile){
        this.data = "";
        this.file = ko.observable(file);
        this.state = ko.observable(GraphUpdater.FileStatus.No);
    }
}

export class GraphUpdater {
    static isFetching: ko.Observable<boolean> = ko.observable(false);
    static hasFetched: ko.Observable<boolean> = ko.observable(false);
    static isUpdating: ko.Observable<boolean> = ko.observable(false);
    static hasUpdated: ko.Observable<boolean> = ko.observable(false);

    static sourceRepository: Repository = null;
    static updatedLogicalGraphs: ko.ObservableArray<GraphUpdaterFile> = ko.observableArray([]);

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
        // abort if no nodeDataArray
        if (typeof graphObject["nodeDataArray"] === 'undefined'){
            return false;
        }

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
                node.outputApplicationId = outputAppId;
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
    
    static async showModal(): Promise<void> {
        GraphUpdater.setState(false, false, false, false);

        // add list of repositories to source select
        const srcRepoSelect = $('#graphUpdaterModalSourceRepositorySelect');
        srcRepoSelect.empty();
        for (let i = 0 ; i < Repositories.repositories().length; i++){
            const repo = Repositories.repositories()[i];
            const option = $('<option></option>').attr("value", i).text(repo.getNameAndBranch());
            srcRepoSelect.append(option);
        }

        // add list of repositories to destination select
        const destRepoSelect = $('#graphUpdaterModalDestinationRepositorySelect');
        destRepoSelect.empty();
        for (let i = 0 ; i < Repositories.repositories().length; i++){
            const repo = Repositories.repositories()[i];
            const option = $('<option></option>').attr("value", i).text(repo.getNameAndBranch());
            destRepoSelect.append(option);
        }

        $('#graphUpdaterModal').modal("toggle");
    }

    static async hideModal(): Promise<void> {
        $('#graphUpdaterModal').modal("hide");
    }

    static setState(isFetching: boolean, hasFetched: boolean, isUpdating: boolean, hasUpdated: boolean): void {
        this.isFetching(isFetching);
        this.hasFetched(hasFetched);
        this.isUpdating(isUpdating);
        this.hasUpdated(hasUpdated);
    }

    static onSourceRepositoryChange(): void {
        // reset the updatedLogicalGraphs array and the hasFetched/hasUpdated observables
        this.updatedLogicalGraphs.removeAll();
        this.setState(false, false, false, false);
    }

    static async fetchLogicalGraphs(): Promise<void> {
        console.log("GraphUpdater.fetchLogicalGraphs()");
        this.setState(true, false, false, false);

        // get source repository
        const srcRepoIndex = parseInt($('#graphUpdaterModalSourceRepositorySelect').val() as string);
        const srcRepo = Repositories.repositories()[srcRepoIndex];
        if (srcRepo === null){
            Utils.showNotification("Error", "Source repository not found", "danger");
            this.setState(false, false, false, false);
            return;
        }

        // set the source repository
        this.sourceRepository = srcRepo;

        // fetch and expand the source repository if needed
        await this.sourceRepository.expandAll();
        
        // find all graphs in source repository
        const srcGraphs = await this.sourceRepository.findAllGraphs();

        // add all the graphs to the updatedLogicalGraphs array
        this.updatedLogicalGraphs.removeAll();
        for (const graphFile of srcGraphs){
            this.updatedLogicalGraphs.push(new GraphUpdaterFile(graphFile));
        }

        this.setState(false, true, false, false);
    }

    static async update(): Promise<void> {
        console.log("GraphUpdater.update()");

        this.setState(false, true, true, false);

        // determine the correct function to load the file(s), based on the source repository service
        let openRemoteFileFunc: (repositoryService: Repository.Service, repositoryName: string, repositoryBranch: string, filePath: string, fileName: string) => Promise<string>;
        switch (this.sourceRepository.service){
            case Repository.Service.GitHub:
                openRemoteFileFunc = GitHub.openRemoteFile;
                break;
            case Repository.Service.GitLab:
                openRemoteFileFunc = GitLab.openRemoteFile;
                break;
            default:
                Utils.showNotification("Error", "Unsupported repository service: " + this.sourceRepository.service, "danger");
                this.setState(false, false, false, false);
                return;
        }

        // loop through each graph, load it, and save it to an array
        for (const graphFile of this.updatedLogicalGraphs()){
            graphFile.state(GraphUpdater.FileStatus.Updating);

            // fetch the file data
            const fileData: string = await openRemoteFileFunc(graphFile.file().repository.service, graphFile.file().repository.name, graphFile.file().repository.branch, graphFile.file().path, graphFile.file().name);

            // determine if graph is OJS or V4
            const graphObject = JSON.parse(fileData);
            const schemaVersion: Setting.SchemaVersion = Utils.determineSchemaVersion(graphObject);

            // check if we need to update the graph from keys to ids
            if (GraphUpdater.usesNodeKeys(graphObject)){
                GraphUpdater.updateKeysToIds(graphObject);
            }

            // determine correct fromJson function
            let fromJsonFunc: (graphObject: any, fileName: string, errorsWarnings: Errors.ErrorsWarnings) => LogicalGraph;

            switch (schemaVersion){
                case Setting.SchemaVersion.OJS:
                    fromJsonFunc = LogicalGraph.fromOJSJson;
                    break;
                case Setting.SchemaVersion.V4:
                    fromJsonFunc = LogicalGraph.fromV4Json;
                    break;
                default:
                    console.warn("Error: Unsupported graph schema version: " + schemaVersion + " for file: " + graphFile.file().name + ". Defaulting to OJS parser.");
                    fromJsonFunc = LogicalGraph.fromOJSJson;
            }

            // parse file data as LogicalGraph
            let lg: LogicalGraph;
            try {
                lg = fromJsonFunc(graphObject, graphFile.file().name, {"errors":[], "warnings":[]});
            }
            catch (error) {
                if (schemaVersion === Setting.SchemaVersion.Unknown){
                    console.error("Error parsing graph file with unknown schema version, defaulted to OJS parser. File:", graphFile.file().name, "Error:", error);
                } else {
                    console.error("Error parsing graph file:", graphFile.file().name, "Error:", error);
                }
                graphFile.state(GraphUpdater.FileStatus.Error);
                continue;
            }

            // save to v4 string
            graphFile.data = LogicalGraph.toV4JsonString(lg, false);

            graphFile.state(GraphUpdater.FileStatus.Success);
        }

        this.setState(false, true, false, true);
    }

    static async push(): Promise<void> {
        // get destination repository
        const destRepoIndex = parseInt($('#graphUpdaterModalDestinationRepositorySelect').val() as string);
        const destRepo = Repositories.repositories()[destRepoIndex];
        if (destRepo === null){
            Utils.showNotification("Error", "Destination repository not found", "danger");
            return;
        }

        // use generic commit message
        const commitMessage = "Updated graphs from " + GraphUpdater.sourceRepository.getNameAndBranch();

        const files = [];
        for (const graphFile of GraphUpdater.updatedLogicalGraphs()){
            // skip any files that were not successfully updated
            if (graphFile.state() !== GraphUpdater.FileStatus.Success){
                continue;
            }

            files.push({
                "path": graphFile.file().pathAndName(),
                "jsonData": graphFile.data
            });
        }

        // get the users github/gitlab token from the settings
        let repoToken: string;
        switch (destRepo.service){
            case Repository.Service.GitHub:
                repoToken = Setting.findValue(Setting.GITHUB_ACCESS_TOKEN_KEY);
                break;
            case Repository.Service.GitLab:
                repoToken = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY);
                break;
            default:
                Utils.showNotification("Error", "Unsupported repository service: " + destRepo.service, "danger");
                return;
        }

        // build the commit JSON string
        const commitJson = {
            "repositoryName": destRepo.name,
            "repositoryBranch": destRepo.branch,
            "token": repoToken,
            "files": files,
            "commitMessage": commitMessage
        };
        
        const eagle: Eagle = Eagle.getInstance();

        // write all the files to the destination repository
        try {
           await eagle.saveFilesToRemote(destRepo, JSON.stringify(commitJson));
        } catch (error) {
            const errorJSON = JSON.parse(error);

            Utils.showUserMessage("Error", errorJSON.error + "<br/><br/>NOTE: These error messages provided by " + destRepo.service + " are not very helpful. Please contact EAGLE admin to help with further investigation.");
            console.error("Error: " + errorJSON.error);
            return errorJSON.error;
        }

        GraphUpdater.hideModal();
    }
}

export namespace GraphUpdater {
    export enum FileStatus {
        No = "No",
        Updating = "Updating",
        Error = "Error",
        Success = "Success"
    }
}