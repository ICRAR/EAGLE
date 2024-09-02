import { Eagle } from './Eagle';
import { Setting } from './Setting';
import { Utils } from './Utils';

export class StatusEntry {
    action:string;
    message:string;
    visibility:boolean;

    constructor(action:string,message:string,visibility:boolean){
        this.action = action; //write an action of get a shortcut
        this.message = message;
        this.visibility = visibility;
    }

    static constructIsSelected():boolean {
        const selectedNode = Eagle.getInstance().selectedNode();

        if(selectedNode != null){
            return selectedNode.isConstruct();
        }

        return false;
    }

    static getStatusEntries() : StatusEntry[] {
        return [
            //nothing is selected
            new StatusEntry('Right Click ',' on the empty canvas to add nodes.', Eagle.getInstance().selectedObjects().length === 0),
            new StatusEntry(Utils.getKeyboardShortcutTextByKey('quick_action', true),' search and run functions.', Eagle.getInstance().selectedObjects().length === 0),
            //a graph is created or loaded
            new StatusEntry(Utils.getKeyboardShortcutTextByKey('open_parameter_table_modal', true),' access graph config.', Eagle.getInstance().logicalGraph().fileInfo().name != "" && Eagle.getInstance().selectedObjects().length === 0),
            //No Graph loaded or created
            new StatusEntry(Utils.getKeyboardShortcutTextByKey('new_graph', true),' new graph.', Eagle.getInstance().logicalGraph().fileInfo().name === ""),
            //something is selected
            new StatusEntry('Right Click ',' on Objects in the graph to see more options.', Eagle.getInstance().selectedObjects().length > 0),
            new StatusEntry(Utils.getKeyboardShortcutTextByKey('duplicate_selection', true),' duplicate selected objects.', Eagle.getInstance().selectedObjects().length > 0),
            new StatusEntry(Utils.getKeyboardShortcutTextByKey('delete_selection', true),' delete selected objects.', Eagle.getInstance().selectedObjects().length > 0),
            //node is selected
            new StatusEntry(Utils.getKeyboardShortcutTextByKey('open_parameter_table_modal', true),' open fields table.', Eagle.getInstance().selectedNode() != null && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)),
            //more than one thing is selected
            new StatusEntry('Shift + Drag',' Box select multiple objects.', Eagle.getInstance().selectedObjects().length >1),
            new StatusEntry('Shift + Ctrl + Drag',' Box deselect multiple objects.', Eagle.getInstance().selectedObjects().length >1),
            //construct is selected
            new StatusEntry('Alt + click',' Select a construct and its children.', this.constructIsSelected()),

        ];
    }
}