import { Eagle } from './Eagle';
import * as ko from "knockout";
import { Setting } from './Setting';
import { Utils } from './Utils';

export class StatusEntry {
    action:string;
    message:string;
    shortcut:string;
    visibility:ko.Observable<boolean>;

    constructor(action:string,message:string,shortcut:string,visibility:boolean){
        this.action = action
        this.message = message
        this.shortcut = shortcut
        this.visibility = ko.observable(visibility)
    }

    static getStatusEntries() : StatusEntry[] {
        return [
            //nothing is selected
            new StatusEntry('Right Click ',' on the empty canvas to add nodes.','', Eagle.getInstance().selectedObjects().length === 0),
            new StatusEntry('',' search and run functions.',Utils.getKeyboardShortcutTextByKey('quick_action', true), Eagle.getInstance().selectedObjects().length === 0),
            new StatusEntry('Click ',' on a node in the graph to select it.','', Eagle.getInstance().selectedObjects().length === 0),
            //a graph is created or loaded
            new StatusEntry('',' access graph config.',Utils.getKeyboardShortcutTextByKey('open_key_parameter_table_modal', true), Eagle.getInstance().logicalGraph().fileInfo().name != "" && Eagle.getInstance().selectedObjects().length === 0),
            //No Graph loaded or created
            new StatusEntry('',' new graph.',Utils.getKeyboardShortcutTextByKey('new_graph', true), Eagle.getInstance().logicalGraph().fileInfo().name === ""),
            //something is selected
            new StatusEntry('Right Click ',' on Objects in the graph to see more options.','', Eagle.getInstance().selectedObjects().length > 0),
            //node is selected
            new StatusEntry('',' delete selected node.',Utils.getKeyboardShortcutTextByKey('delete_selection', true), Eagle.getInstance().selectedNode() != null),
            new StatusEntry('',' open fields table.',Utils.getKeyboardShortcutTextByKey('open_component_parameter_table_modal', true), Eagle.getInstance().selectedNode() != null && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)),
            //edge is selected
            new StatusEntry('',' delete selected edge.',Utils.getKeyboardShortcutTextByKey('delete_selection', true), Eagle.getInstance().selectedEdge() != null),
            //more than one thing is selected
            new StatusEntry('',' delete selected objects.',Utils.getKeyboardShortcutTextByKey('delete_selection', true), Eagle.getInstance().selectedObjects().length >1),
        ];
    }
}