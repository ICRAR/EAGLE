import * as ko from "knockout";

import {Eagle} from './Eagle';
import {LogicalGraph} from './LogicalGraph';
import {Palette} from './Palette';
import {Utils} from './Utils';
import {Errors} from './Errors';

export class ComponentUpdater {

    static update(palettes: Palette[], graph: LogicalGraph, callback : (error : string, data : string) => void) : void {
        // check if any nodes to update
        if (graph.getNodes().length === 0){
            Utils.showNotification("Component Update", "Graph contains no components to update", "info");
            return;
        }

        const errorsWarnings: Errors.ErrorsWarnings = {errors: [], warnings: []};

        // debug
        const tableData: any[] = [];
        for (const node of graph.getNodes()){
            tableData.push({
                name:node.getName(),
                repositoryUrl:node.getRepositoryUrl(),
                commitHash:node.getCommitHash(),
                paletteDownloadUrl:node.getPaletteDownloadUrl(),
                dataHash:node.getDataHash()
            });
        }
        console.table(tableData);

        // make sure we have a palette available for each component in the graph
        for (const node of graph.getNodes()){
            const repositoryUrl = node.getRepositoryUrl();

            let found = false;
            for (const palette of palettes){
                if (palette.fileInfo().repositoryUrl === repositoryUrl){
                    found = true;
                    break;
                }
            }

            if (!found){
                console.log("error for node", node.getName());
                errorsWarnings.errors.push(Errors.Message("Could not find appropriate palette for node " + node.getName() + " from repository " + node.getRepositoryUrl()));
            }
        }

        // report missing palettes to the user
        if (errorsWarnings.errors.length > 0){
            Utils.showErrorsModal("Updating Components", errorsWarnings.errors, errorsWarnings.warnings);
        } else {
            Utils.showNotification("Success", "Components updated successfully", "success");
        }

    }
}
