import { Eagle } from './Eagle';
import { Errors } from './Errors';
import { LogicalGraph } from './LogicalGraph';
import { Node } from './Node';
import { Palette } from './Palette';

export class ComponentUpdater {

    static updateLogicalGraph(palettes: Palette[], graph: LogicalGraph): {updatedNodes: Node[], errorsWarnings: Errors.ErrorsWarnings} {
        const errorsWarnings: Errors.ErrorsWarnings = {errors: [], warnings: []};
        const updatedNodes: Node[] = [];

        // make sure we have a palette available for each component in the graph
        for (const node of graph.getNodes()){
            const updatedNode = ComponentUpdater.updateNode(palettes, node, errorsWarnings);
            if (updatedNode !== null) {
                updatedNodes.push(updatedNode);
            }
        }

        return {updatedNodes: updatedNodes, errorsWarnings: errorsWarnings};
    }

    static updateNode(palettes: Palette[], node: Node, errorsWarnings: Errors.ErrorsWarnings): Node | null {
        let newVersion : Node = null;

            for (const palette of palettes){
                for (const paletteNode of palette.getNodes()){
                    if (Node.requiresUpdate(node, paletteNode)){
                        newVersion = paletteNode;
                    }
                }
            }

            if (newVersion === null){
                console.log("No match for node", node.getName());
                errorsWarnings.warnings.push(Errors.Message("Could not find appropriate palette for node " + node.getName() + " from repository " + node.getRepositoryUrl()));
                return null;
            }

            // update the node with a new definition
            ComponentUpdater._replaceNode(node, newVersion);
            return node;
    }

    // NOTE: the replacement here is "additive", any fields missing from the old node will be added, but extra fields in the old node will not removed
    static _replaceNode(dest:Node, src:Node){
        for (const srcField of src.getFields()){
            // try to find a field with the same name in the destination
            let destField = dest.findFieldById(srcField.getId());

            // if dest field not found, try to find something that matches by displayText AND fieldType
            if (destField === null){
                destField = dest.findFieldByDisplayText(srcField.getDisplayText(), srcField.getParameterType());
            }

            // if dest field could not be found, then go ahead and add a NEW field to the dest node
            if (destField === null){
                destField = srcField.clone();
                dest.addField(destField);
            }
           
            // copy everything about the field from the src (palette), except maintain the existing id and nodeKey
            destField.copyWithIds(srcField, destField.getNodeId(), destField.getId());
        }

        // update commit hash of destination node
        dest.setCommitHash(src.getCommitHash());
    }
}
