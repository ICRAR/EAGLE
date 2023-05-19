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

import { Category } from './Category';
import { Daliuge } from './Daliuge';
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

    static OLD_ATTRIBUTES : {text:string, name:string, description:string}[] = [
        {
            text:"Data Volume",
            name:"data_volume",
            description:""
        },
        {
            text:"Number of Splits",
            name:"num_of_splits",
            description:""
        },
        {
            text:"Scatter Axis",
            name:"scatter_axis",
            description:""
        },
        {
            text:"Execution Time",
            name:"execution_time",
            description:""
        },
        {
            text:"Number of Inputs",
            name:"num_of_inputs",
            description:""
        },
        {
            text:"Gather Axis",
            name:"gather_axis",
            description:""
        },
        {
            text:"Group Start",
            name:"group_start",
            description:""
        },
        {
            text:"Group End",
            name:"group_end",
            description:""
        },
        {
            text:"Number of Iterations",
            name:"num_of_iter",
            description:""
        },
        {
            text:"Number of CPUs",
            name:"num_cpus",
            description:""
        },
        {
            text:"Library Path",
            name:"libpath",
            description:""
        },
        {
            text:"Number of Procs",
            name:"num_of_procs",
            description:""
        },
        {
            text:"Number of copies",
            name:"num_of_copies",
            description:""
        },
        {
            text:"Arg 01",
            name:"Arg01",
            description:""
        },
        {
            text:"Arg 02",
            name:"Arg02",
            description:""
        },
        {
            text:"Arg 03",
            name:"Arg03",
            description:""
        },
        {
            text:"Arg 04",
            name:"Arg04",
            description:""
        },
        {
            text:"Arg 05",
            name:"Arg05",
            description:""
        },
        {
            text:"Arg 06",
            name:"Arg06",
            description:""
        },
        {
            text:"Arg 07",
            name:"Arg07",
            description:""
        },
        {
            text:"Arg 08",
            name:"Arg08",
            description:""
        },
        {
            text:"Arg 09",
            name:"Arg09",
            description:""
        },
        {
            text:"Arg 10",
            name:"Arg10",
            description:""
        }
    ];

    static translateOldCategory(category : string) : Category {
        if (typeof category === "undefined"){
            return Category.Unknown;
        }

        if (category === "SplitData"){
            return Category.Scatter;
        }

        if (category === "DataGather"){
            return Category.Gather;
        }

        if (category === "Component"){
            return Category.PythonApp;
        }

        if (category === "ngas"){
            return Category.NGAS;
        }

        if (category === "s3"){
            return Category.S3;
        }

        if (category === "mpi"){
            return Category.Mpi;
        }

        if (category === "docker"){
            return Category.Docker;
        }

        if (category === "memory"){
            return Category.Memory;
        }

        if (category === "file"){
            return Category.File;
        }

        if (category === "Data"){
            return Category.File;
        }

        return <Category>category;
    }

    static translateNewCategory(category : string) : string {
        if (category === Category.PythonApp){
            console.warn("Translated category from", category, "to Component");
            return "Component";
        }

        return category;
    }

    // NOTE: for use in translation of OJS object to internal graph representation
    static findIndexOfNodeDataArrayWithKey(nodeDataArray : any[], key: number) : number {
        for (let i = 0 ; i < nodeDataArray.length ; i++){
            if (nodeDataArray[i].key === key){
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

    static generateLogicalGraphsTable = () : any[] => {
        // check that all repos have been fetched
        for (const repo of Repositories.repositories()){
            if (!repo.fetched()){
                console.warn("Unfetched " + repo.service + " repo:" + repo.getNameAndBranch());
            }
        }

        const tableData : any[] = [];

        // add logical graph nodes to table
        for (const repo of Repositories.repositories()){
            // skip unfetched repos
            if (!repo.fetched()){
                continue;
            }

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
                        "schemaVersion":"",
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
                        "numCheckErrors":"",
                        "loadSaveSame":true
                    });
                }
            }
        }

        return tableData;
    }
    
        
    static logicalGraphsTableToCSV = (table: any[]) : string => {
        let result: string = "";

        // abort if table has zero rows
        if (typeof table === 'undefined' || table === null || table.length === 0){
            console.warn("No data in table");
            return "";
        }

        // add heading row
        result += Object.keys(table[0]).join(',') + "\n";

        // add data rows
        for (const row of table){
            result += Object.values(row).join(',') + "\n";
        }

        return result;
    }

    // recursive traversal through the folder structure to find all graph files
    private static _addGraphs = (repository: Repository, folder: RepositoryFolder, path: string, data: any[]) : void => {
        for (const subfolder of folder.folders()){
            this._addGraphs(repository, subfolder, path + "/" + subfolder.name, data);
        }

        for (const file of folder.files()){
            if (file.name.endsWith(".graph")){
                data.push({
                    "service": repository.service,
                    "name":repository.name,
                    "branch":repository.branch,
                    "folder":path,
                    "file":file.name,
                    "schemaVersion":"",
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
                    "numCheckErrors":"",
                    "loadSaveSame":true
                });
            }
        }
    }

    attemptLoadLogicalGraphTable = async(data: any[]) : Promise<void> => {
        const eagle: Eagle = Eagle.getInstance();

        for (const row of data){
            // determine the correct function to load the file
            let openRemoteFileFunc: any;
            if (row.service === Eagle.RepositoryService.GitHub){
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
                        let dataObject;

                        // attempt to parse the JSON
                        try {
                            dataObject = JSON.parse(data);
                        }
                        catch(err){
                            Utils.showUserMessage("Error parsing file JSON", err.message);
                            return;
                        }

                        // determine file schema
                        const schemaVersion: Daliuge.SchemaVersion = Utils.determineSchemaVersion(dataObject);
                        let lg: LogicalGraph = null;

                        switch (schemaVersion){
                            case Daliuge.SchemaVersion.AppRef:
                                lg = LogicalGraph.fromAppRefJson(dataObject, file, errorsWarnings);
                                break;
                            default:
                                lg = LogicalGraph.fromOJSJson(dataObject, file, errorsWarnings);
                                break;
                        }

                        // record number of errors
                        row.numLoadWarnings = errorsWarnings.warnings.length;
                        row.numLoadErrors = errorsWarnings.errors.length;

                        // use git-related info within file
                        row.schemaVersion = lg.fileInfo().schemaVersion;
                        row.eagleVersion = lg.fileInfo().eagleVersion;
                        row.lastModifiedBy = lg.fileInfo().lastModifiedName;
                        row.repositoryUrl = lg.fileInfo().repositoryUrl;
                        row.commitHash = lg.fileInfo().commitHash;
                        row.downloadUrl = lg.fileInfo().downloadUrl;
                        row.signature = lg.fileInfo().signature;

                        // convert date from timestamp to date string
                        const date = new Date(lg.fileInfo().lastModifiedDatetime * 1000);
                        row.lastModified = date.toLocaleDateString() + " " + date.toLocaleTimeString()

                        // check the graph once loaded
                        const results: Errors.ErrorsWarnings = Utils.checkGraph(eagle);
                        row.numCheckWarnings = results.warnings.length;
                        row.numCheckErrors = results.errors.length;

                        // write the logical graph back to JSON
                        let outputJSON: object = null;
                        switch (lg.fileInfo().schemaVersion){
                            case Daliuge.SchemaVersion.AppRef:
                                outputJSON = LogicalGraph.toAppRefJson(lg, false);
                                break;
                            default:
                                //outputJSON = LogicalGraph.toOJSJson(lg);
                                outputJSON = LogicalGraph.toOJSJson(lg, false);
                                break;
                        }

                        // check that it matches the input
                        const diff0 = Utils.compareObj(dataObject, outputJSON);
                        const diff1 = Utils.compareObj(outputJSON, dataObject);

                        console.log("lg", lg.fileInfo().getText(), "inputJSON", dataObject, "outputJSON", outputJSON, "diff0", diff0, "diff1", diff1);
                        row.loadSaveSame = Utils.isEmpty(diff0) && Utils.isEmpty(diff1);

                    }

                    resolve();
                });
            });
        }
    }

    test = async() => {
        // builds a table with one row for each graph in all repositories that are open (have had contents fetched)
        const table = GraphUpdater.generateLogicalGraphsTable();

        // instruct the GraphUpdater object to fetch (and test) all graphs in the table, and to fill the table columns with the results
        await this.attemptLoadLogicalGraphTable(table);

        // print the table to the console
        console.table(table);

        const tableCsv = GraphUpdater.logicalGraphsTableToCSV(table);
        console.log(tableCsv);
    }
}
