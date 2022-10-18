import * as ko from "knockout";

import {Eagle} from './Eagle';
import {LogicalGraph} from './LogicalGraph';
import {Palette} from './Palette';
import {Node} from './Node';
import {Utils} from './Utils';
import {Errors} from './Errors';
import { Field } from "./Field";

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
        for (let i = 0 ; i < graph.getNodes().length ; i++){
            const node: Node = graph.getNodes()[i];
            let newVersion : Node = null;

            for (const palette of palettes){
                for (const paletteNode of palette.getNodes()){
                    if (node.getRepositoryUrl() === paletteNode.getRepositoryUrl() && node.getName() === paletteNode.getName() && node.getRepositoryUrl() !== ""){
                        newVersion = paletteNode;
                    }
                }
            }

            if (newVersion === null){
                console.log("No match for node", node.getName());
                errorsWarnings.errors.push(Errors.Message("Could not find appropriate palette for node " + node.getName() + " from repository " + node.getRepositoryUrl()));
                continue;
            }

            console.log("Found match for node", node.getName(), node.getRepositoryUrl(), "match", newVersion.getName(), newVersion.getRepositoryUrl());


            ComponentUpdater._replaceNode(graph.getNodes()[i], newVersion);

        }

        // report missing palettes to the user
        if (errorsWarnings.errors.length > 0){
            //Utils.showErrorsModal("Updating Components", errorsWarnings.errors, errorsWarnings.warnings);
        } else {
            Utils.showNotification("Success", "Components updated successfully", "success");
        }

    }

    // NOTE: the replacement here is "additive", any fields missing from the old node will be added, but extra fields in the old node will not removed
    static _replaceNode(dest:Node, src:Node){
        console.log("dest fields", dest.getFields().length, "src fields", src.getFields().length);

        for (let i = 0 ; i < src.getFields().length ; i++){
            const srcField = src.getFields()[i];
            console.log(i, srcField.getIdText(), srcField.getFieldType());

            // try to find a field with the same name in the destination
            let destField = dest.findPortById(srcField.getId());

            if (destField === null){
                destField = srcField.clone();
                dest.addField(destField);
            }
           
            ComponentUpdater._replaceField(destField, srcField);
        }
    }

    static _replaceField(dest:Field, src:Field){
        console.log("_replaceField()", dest.getIdText(), src.getIdText());
    }
}
