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
import { Id } from './Id';
import { LogicalGraph } from './LogicalGraph';
import { Repositories } from './Repositories';
import { Repository } from './Repository';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { Utils } from './Utils';

import * as ko from 'knockout';

export class GraphUpdaterFile {
    data: string; // the file data as a string, used for pushing to destination repository
    update: ko.Observable<boolean>; // whether the user has selected to update this graph or not
    push: ko.Observable<boolean>; // whether the user has selected to push this graph to the destination repository or not
    file: ko.Observable<RepositoryFile>;
    state: ko.Observable<GraphUpdater.FileStatus>;
    numNodes: ko.Observable<number>;
    numEdges: ko.Observable<number>;
    preFixNumErrors: ko.Observable<number>;
    preFixNumWarnings: ko.Observable<number>;
    postFixNumErrors: ko.Observable<number>;
    postFixNumWarnings: ko.Observable<number>;
    updatedFileUrl: ko.Observable<string>;
    updatedPathAndName: ko.Observable<string>;

    constructor(file: RepositoryFile){
        this.data = "";
        this.update = ko.observable(true);
        this.push = ko.observable(true);
        this.file = ko.observable(file);
        this.state = ko.observable(GraphUpdater.FileStatus.No);
        this.numNodes = ko.observable(0);
        this.numEdges = ko.observable(0);
        this.preFixNumErrors = ko.observable(0);
        this.preFixNumWarnings = ko.observable(0);
        this.postFixNumErrors = ko.observable(0);
        this.postFixNumWarnings = ko.observable(0);
        this.updatedFileUrl = ko.observable(null);
        this.updatedPathAndName = ko.observable(null);
    }
}

export class GraphUpdater {
    static state: ko.Observable<GraphUpdater.Status>;

    static autoFix: ko.Observable<boolean> = ko.observable(false);

    static sourceRepository: Repository = null;
    static destinationRepository: Repository = null;
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
            const newId = Id.generateNodeId();

            keyToId.set(node.key, newId);
            node.id = newId;
            delete node.key; // remove key attribute

            // input app
            if (node.inputApplicationKey !== null){
                const inputAppId = Id.generateNodeId();
                keyToId.set(node.inputApplicationKey, inputAppId);
                node.inputApplicationId = inputAppId;
            }
            // output app
            if (node.outputApplicationKey !== null){
                const outputAppId = Id.generateNodeId();
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
    
    private static collapseToggleInitialised = false;

    static initCollapseToggle(): void {
        if (GraphUpdater.collapseToggleInitialised) return;
        const stepsEl = document.getElementById('graphUpdaterSteps');
        const toggleEl = document.getElementById('graphUpdaterStepsToggle');
        if (stepsEl && toggleEl) {
            stepsEl.addEventListener('show.bs.collapse', () => { toggleEl.textContent = 'Less info...'; });
            stepsEl.addEventListener('hide.bs.collapse', () => { toggleEl.textContent = 'More info...'; });
            GraphUpdater.collapseToggleInitialised = true;
        }
    }

    static async showModal(): Promise<void> {
        GraphUpdater.initCollapseToggle();
        GraphUpdater.state(GraphUpdater.Status.Start);

        // add list of repositories to source select
        const srcRepoSelect = $('#graphUpdaterModalSourceRepositorySelect');
        srcRepoSelect.empty();
        for (let i = 0 ; i < Repositories.repositories().length; i++){
            const repo = Repositories.repositories()[i];
            const option = $('<option></option>').attr("value", i).text(repo.getNameAndBranch());
            srcRepoSelect.append(option);
        }

        // add custom option and list of repositories to destination select
        const destRepoSelect = $('#graphUpdaterModalDestinationRepositorySelect');
        destRepoSelect.empty();
        // Add custom option as default
        const customOptionValue = "-1";
        const customOption = $('<option></option>')
            .attr("value", customOptionValue)
            .text("Auto-generate new branch on source repository")
            .prop("selected", true);
        destRepoSelect.append(customOption);
        for (let i = 0 ; i < Repositories.repositories().length; i++){
            const repo = Repositories.repositories()[i];
            const option = $('<option></option>').attr("value", i).text(repo.getNameAndBranch());
            destRepoSelect.append(option);
        }

        // Set the custom option as selected by default
        destRepoSelect.val(customOptionValue);

        $('#graphUpdaterModal').modal("toggle");
    }

    static async hideModal(): Promise<void> {
        $('#graphUpdaterModal').modal("hide");
    }

    static onSourceRepositoryChange(): void {
        // reset the updatedLogicalGraphs array and the hasFetched/hasUpdated observables
        this.updatedLogicalGraphs.removeAll();
        this.state(GraphUpdater.Status.Start);
    }

    static onDestinationRepositoryChange(): void {
        this.state(GraphUpdater.Status.Updated);
    }

    static async fetchLogicalGraphs(): Promise<void> {
        console.log("GraphUpdater.fetchLogicalGraphs()");
        this.state(GraphUpdater.Status.Fetching);

        // get source repository
        const srcRepoIndex = parseInt($('#graphUpdaterModalSourceRepositorySelect').val() as string);
        const srcRepo = Repositories.repositories()[srcRepoIndex];
        if (srcRepo === null){
            Utils.showNotification("Error", "Source repository not found", "danger");
            this.state(GraphUpdater.Status.Start);
            return;
        }

        // set the source repository
        this.sourceRepository = srcRepo;

        // empty array to hold graph files found in source repository
        this.updatedLogicalGraphs.removeAll();

        // fetch/expand and find all graphs in source repository as files become available
        await this.sourceRepository.expandAllAndFindGraphs(async (graphFile) => {
            this.updatedLogicalGraphs.push(new GraphUpdaterFile(graphFile));
            ko.tasks.runEarly();
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        });

        this.state(GraphUpdater.Status.Fetched);
        console.log("GraphUpdater.fetchLogicalGraphs() - completed. Found " + this.updatedLogicalGraphs().length + " graph(s) in source repository.");
    }

    static async update(): Promise<void> {
        console.log("GraphUpdater.update()");

        this.state(GraphUpdater.Status.Updating);

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
                this.state(GraphUpdater.Status.Start);
                return;
        }

        // loop through each graph, load it, and save it to an array
        for (const graphFile of this.updatedLogicalGraphs()){
            // abort if user has not selected to update this graph
            if (!graphFile.update()){
                graphFile.state(GraphUpdater.FileStatus.Skipped);
                continue;
            }

            graphFile.state(GraphUpdater.FileStatus.Updating);

            // fetch the file data
            let fileData: string;
            try {
                fileData = await openRemoteFileFunc(graphFile.file().repository.service, graphFile.file().repository.name, graphFile.file().repository.branch, graphFile.file().path, graphFile.file().name);
            } catch (error) {
                console.error("Error fetching remote file:", graphFile.file().name, "Error:", error);
                graphFile.state(GraphUpdater.FileStatus.Error);
                graphFile.push(false); // uncheck the push checkbox for this graph since there was an error updating it
                continue;
            }

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
                graphFile.push(false); // uncheck the push checkbox for this graph since there was an error updating it
                continue;
            }

            // run pre-fix validation
            LogicalGraph.isValid(lg, null);
            graphFile.preFixNumErrors(lg.getIssues().filter(i => i.validity === Errors.Validity.Error).length);
            graphFile.preFixNumWarnings(lg.getIssues().filter(i => i.validity === Errors.Validity.Warning).length);

            // if GraphUpdater.autoFix is enabled, attempt to fix any errors in the graph
            if (GraphUpdater.autoFix()){
                // fixAll errors/warnings in the graph
                LogicalGraph.fixAll(lg);

                // run post-fix validation
                LogicalGraph.isValid(lg, null);
                graphFile.postFixNumErrors(lg.getIssues().filter(i => i.validity === Errors.Validity.Error).length);
                graphFile.postFixNumWarnings(lg.getIssues().filter(i => i.validity === Errors.Validity.Warning).length);
            }

            // update graph information
            graphFile.numNodes(lg.getNumNodes());
            graphFile.numEdges(lg.getNumEdges());

            // save to v4 string
            graphFile.data = LogicalGraph.toV4JsonString(lg, false);

            graphFile.state(GraphUpdater.FileStatus.Success);
        }

        GraphUpdater.state(GraphUpdater.Status.Updated);
    }

    static async push(): Promise<void> {
        // get destination repository or handle custom option
        const destRepoValue = $('#graphUpdaterModalDestinationRepositorySelect').val() as string;

        // check if the user selected the custom option to auto-generate a new branch on the source repository
        if (destRepoValue === "-1") {
            GraphUpdater.state(GraphUpdater.Status.AutoGeneratingBranch);

            // generate a new branch name
            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            const branchDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
            const branchTime = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const newBranchName = `graph-updates-${branchDate}-${branchTime}`;
            
            // find the user's token for the source repository service
            let token: string;
            switch (this.sourceRepository.service){
                case Repository.Service.GitHub:
                    token = Setting.findValue(Setting.GITHUB_ACCESS_TOKEN_KEY, "");
                    break;
                case Repository.Service.GitLab:
                    token = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY, "");
                    break;
                default:
                    Utils.showNotification("Error", "Unsupported repository service: " + this.sourceRepository.service, "danger");
                    GraphUpdater.state(GraphUpdater.Status.Updated);
                    return;
            }

            // call eagleServer to create branch
            try {
                const responseStr = await Utils.httpPostJSON("/createBranch", {
                    service: this.sourceRepository.service,
                    repository: this.sourceRepository.name,
                    sourceBranch: this.sourceRepository.branch,
                    newBranch: newBranchName,
                    token: token
                });
                let response;
                try {
                    response = typeof responseStr === "string" ? JSON.parse(responseStr) : responseStr;
                } catch (e) {
                    response = responseStr;
                }
                if (response.error) {
                    Utils.showNotification("Error", response.error, "danger");
                    GraphUpdater.state(GraphUpdater.Status.Updated);
                    return;
                }

                // add new repo to the repository list
                this.destinationRepository = await Repositories._addCustomRepository(this.sourceRepository.service, this.sourceRepository.name, newBranchName);                
                GraphUpdater.state(GraphUpdater.Status.AutoGeneratedBranch);
            } catch (error) {
                Utils.showNotification("Error", `Failed to create branch: ${error}`, "danger");
                GraphUpdater.state(GraphUpdater.Status.Updated);
            }
        } else {
            const destRepoIndex = parseInt(destRepoValue);
            this.destinationRepository =Repositories.repositories()[destRepoIndex];
        }

        // check that we have a valid destination repository at this point
        if (this.destinationRepository === null){
            Utils.showNotification("Error", "Destination repository not found", "danger");
            return;
        }

        // get the users github/gitlab token from the settings
        let repoToken: string;
        switch (this.destinationRepository.service){
            case Repository.Service.GitHub:
                repoToken = Setting.findValue(Setting.GITHUB_ACCESS_TOKEN_KEY, "");
                break;
            case Repository.Service.GitLab:
                repoToken = Setting.findValue(Setting.GITLAB_ACCESS_TOKEN_KEY, "");
                break;
            default:
                Utils.showNotification("Error", "Unsupported repository service: " + this.destinationRepository.service, "danger");
                return;
        }

        // set state to pushing
        GraphUpdater.state(GraphUpdater.Status.Pushing);

        // use generic commit message
        const commitMessage = "Updated graphs from " + this.sourceRepository.getNameAndBranch();

        const files = [];
        for (const graphFile of GraphUpdater.updatedLogicalGraphs()){
            // skip any files that the user has not selected to push to the destination repository
            if (!graphFile.push()){
                continue;
            }

            // skip any files that were not successfully updated
            if (graphFile.state() !== GraphUpdater.FileStatus.Success){
                continue;
            }

            files.push({
                "path": graphFile.file().pathAndName(),
                "jsonData": graphFile.data
            });

            // update the updatedFileUrl and updatedPathAndName observables for display in the UI after push is complete
            const newPathAndName = graphFile.file().pathAndName();
            graphFile.updatedPathAndName(newPathAndName);
            const newUrl = Utils.buildUrl(this.destinationRepository.service, this.destinationRepository.name, this.destinationRepository.branch, graphFile.file().path, graphFile.file().name);
            graphFile.updatedFileUrl(newUrl);
        }

        // build the commit JSON string
        const commitJson = {
            "repositoryName": this.destinationRepository.name,
            "repositoryBranch": this.destinationRepository.branch,
            "token": repoToken,
            "files": files,
            "commitMessage": commitMessage
        };
        
        const eagle: Eagle = Eagle.getInstance();

        // write all the files to the destination repository
        try {
           await eagle.saveFilesToRemote(this.destinationRepository, JSON.stringify(commitJson));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorJSON = JSON.parse(errorMessage);

            Utils.showUserMessage("Error", errorJSON.error + "<br/><br/>NOTE: These error messages provided by " + this.destinationRepository.service + " are not very helpful. Please contact EAGLE admin to help with further investigation.");
            console.error("Error: " + errorJSON.error);
            return errorJSON.error;
        }

        GraphUpdater.state(GraphUpdater.Status.Pushed);
    }

    static numberOfFilesToUpdate : ko.PureComputed<number> = ko.pureComputed(() => {
        let count = 0;
        for (const graphFile of GraphUpdater.updatedLogicalGraphs()){
            if (graphFile.update()){
                count++;
            }
        }
        return count;
    }, this);

    static numberOfFilesToPush : ko.PureComputed<number> = ko.pureComputed(() => {
        let count = 0;
        for (const graphFile of GraphUpdater.updatedLogicalGraphs()){
            if (graphFile.push() && graphFile.state() === GraphUpdater.FileStatus.Success){
                count++;
            }
        }
        return count;
    }, this);

    static isFetching: ko.PureComputed<boolean> = ko.pureComputed(() => GraphUpdater.state() === GraphUpdater.Status.Fetching);
    static isUpdating: ko.PureComputed<boolean> = ko.pureComputed(() => GraphUpdater.state() === GraphUpdater.Status.Updating);
    static isUpdated: ko.PureComputed<boolean> = ko.pureComputed(() => GraphUpdater.state() === GraphUpdater.Status.Updated);
    static isAutoGeneratingBranch: ko.PureComputed<boolean> = ko.pureComputed(() => GraphUpdater.state() === GraphUpdater.Status.AutoGeneratingBranch);
    static isPushing: ko.PureComputed<boolean> = ko.pureComputed(() => GraphUpdater.state() === GraphUpdater.Status.Pushing);

    static hasFetched: ko.PureComputed<boolean> = ko.pureComputed(() => {
        return [GraphUpdater.Status.Fetched, GraphUpdater.Status.Updating, GraphUpdater.Status.Updated, GraphUpdater.Status.AutoGeneratingBranch, GraphUpdater.Status.AutoGeneratedBranch, GraphUpdater.Status.Pushing, GraphUpdater.Status.Pushed].includes(GraphUpdater.state());
    });
    static hasUpdated: ko.PureComputed<boolean> = ko.pureComputed(() => {
        return [GraphUpdater.Status.Updated, GraphUpdater.Status.AutoGeneratingBranch, GraphUpdater.Status.AutoGeneratedBranch, GraphUpdater.Status.Pushing, GraphUpdater.Status.Pushed].includes(GraphUpdater.state());
    });
    static hasAutoGeneratedBranch: ko.PureComputed<boolean> = ko.pureComputed(() => {
        return [GraphUpdater.Status.AutoGeneratedBranch, GraphUpdater.Status.Pushing, GraphUpdater.Status.Pushed].includes(GraphUpdater.state());
    });
    static hasPushed: ko.PureComputed<boolean> = ko.pureComputed(() => {
        return [GraphUpdater.Status.Pushed].includes(GraphUpdater.state());
    });

}

export namespace GraphUpdater {
    export enum FileStatus {
        No = "No",
        Skipped = "Skipped",
        Updating = "Updating",
        Error = "Error",
        Success = "Success"
    }

    export enum Status {
        Start = "Start",
        Fetching = "Fetching",
        Fetched = "Fetched",
        Updating = "Updating",
        Updated = "Updated",
        AutoGeneratingBranch = "AutoGeneratingBranch",
        AutoGeneratedBranch = "AutoGeneratedBranch",
        Pushing = "Pushing",
        Pushed = "Pushed"
    }
}

GraphUpdater.state = ko.observable(GraphUpdater.Status.Start);