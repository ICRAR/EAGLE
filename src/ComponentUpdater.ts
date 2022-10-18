import {LogicalGraph} from './LogicalGraph';
import {Palette} from './Palette';
import {Node} from './Node';
import {Utils} from './Utils';
import {Errors} from './Errors';

export class ComponentUpdater {

    static update(palettes: Palette[], graph: LogicalGraph, callback : (errorsWarnings : Errors.ErrorsWarnings, updatedNodes : Node[]) => void) : void {
        const errorsWarnings: Errors.ErrorsWarnings = {errors: [], warnings: []};
        const updatedNodes: Node[] = [];

        // check if any nodes to update
        if (graph.getNodes().length === 0){
            // TODO: don't showNotification here! instead add a warning to the errorsWarnings and callback()
            errorsWarnings.errors.push(Errors.Message("Graph contains no components to update"));
            callback(errorsWarnings, updatedNodes);
            return;
        }

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
                errorsWarnings.warnings.push(Errors.Message("Could not find appropriate palette for node " + node.getName() + " from repository " + node.getRepositoryUrl()));
                continue;
            }

            ComponentUpdater._replaceNode(graph.getNodes()[i], newVersion);
            updatedNodes.push(graph.getNodes()[i]);
        }

        callback(errorsWarnings, updatedNodes);
    }

    // NOTE: the replacement here is "additive", any fields missing from the old node will be added, but extra fields in the old node will not removed
    static _replaceNode(dest:Node, src:Node){
        for (let i = 0 ; i < src.getFields().length ; i++){
            const srcField = src.getFields()[i];

            // try to find a field with the same name in the destination
            let destField = dest.findPortById(srcField.getId());

            // if dest field not found, try to find something that matches by idText AND fieldType
            if (destField === null){
                destField = dest.findFieldByIdText(srcField.getIdText(), srcField.getFieldType());
            }

            // if dest field could not be found, then go ahead and add a NEW field to the dest node
            if (destField === null){
                destField = srcField.clone();
                dest.addField(destField);
            }
           
            // NOTE: we could just use a copy() function here if we had one
            destField.copyWithKeyAndId(srcField, srcField.getNodeKey(), srcField.getId());
        }
    }
}
