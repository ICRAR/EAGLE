import { ActionMessage } from './ActionMessage';
import { LogicalGraph } from './LogicalGraph';
import { Node } from './Node';
import { Palette } from './Palette';


export class ComponentUpdater {

    static nodeMatchesPrototype = (node: Node, prototype: Node) : boolean => {
        return node.getRepositoryUrl() !== "" &&
               prototype.getRepositoryUrl() !== "" &&
               node.getRepositoryUrl() === prototype.getRepositoryUrl() &&
               node.getName() === prototype.getName() &&
               node.getCommitHash() !== prototype.getCommitHash();
    }

    static determineUpdates(palettes: Palette[], graph: LogicalGraph, callback : (errors: ActionMessage[], updates : ActionMessage[]) => void) : void {
        const errors: ActionMessage[] = [];
        const updates: ActionMessage[] = [];

        // check if any nodes to update
        if (graph.getNodes().length === 0){
            // TODO: don't showNotification here! instead add a warning to the errorsWarnings and callback()
            errors.push(ActionMessage.Message(ActionMessage.Level.Error, "Graph contains no components to update"));
            callback(errors, updates);
            return;
        }

        // make sure we have a palette available for each component in the graph
        for (let i = 0 ; i < graph.getNodes().length ; i++){
            const node: Node = graph.getNodes()[i];
            let foundPrototype: boolean = false;

            for (const palette of palettes){
                for (const paletteNode of palette.getNodes()){
                    
                    if (ComponentUpdater.nodeMatchesPrototype(node, paletteNode)){
                        foundPrototype = true;
                        const nodeUpdates : ActionMessage[] = ComponentUpdater.nodeDetermineUpdates(node, paletteNode);
                        updates.push(...nodeUpdates);
                    }
                }
            }

            if (!foundPrototype){
                //console.log("No match for node", node.getName());
                errors.push(ActionMessage.Message(ActionMessage.Level.Warning, "Could not find appropriate palette for node " + node.getName() + " from repository " + node.getRepositoryUrl()));
                continue;
            }

            // update the node with a new definition
            //ComponentUpdater._replaceNode(node, newVersion);
            //updatedNodes.push(node);
        }

        callback(errors, updates);
    }

    // NOTE: the replacement here is "additive", any fields missing from the old node will be added, but extra fields in the old node will not removed
    static nodeDetermineUpdates(dest:Node, src:Node) : ActionMessage[] {
        const updates: ActionMessage[] = [];

        for (let i = 0 ; i < src.getFields().length ; i++){
            const srcField = src.getFields()[i];

            // try to find a field with the same name in the destination
            let destField = dest.findFieldById(srcField.getId());

            // if dest field not found, try to find something that matches by idText AND fieldType
            if (destField === null){
                destField = dest.findFieldByIdText(srcField.getIdText(), srcField.getParameterType());
            }

            // if dest field could not be found, then go ahead and add a NEW field to the dest node
            if (destField === null){
                //destField = srcField.clone();
                //dest.addField(destField);
                updates.push(ActionMessage.Message(ActionMessage.Level.Info, "Add " + srcField.getDisplayText() + " field to component"));
            }
           
            // NOTE: we could just use a copy() function here if we had one
            //destField.copyWithKeyAndId(srcField, srcField.getNodeKey(), srcField.getId());
        }

        return updates;
    }
}
