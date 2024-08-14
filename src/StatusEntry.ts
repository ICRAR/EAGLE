import { Eagle } from './Eagle';
import * as ko from "knockout";
import { Setting } from './Setting';


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
            new StatusEntry('',' search and run functions.','[ ` ]', Eagle.getInstance().selectedObjects().length === 0),
            new StatusEntry('Click ',' on a node in the graph to select it.','', Eagle.getInstance().selectedObjects().length === 0),
            //a graph is created or loaded
            new StatusEntry('',' access graph config.','[ shift + T ]', Eagle.getInstance().logicalGraph().fileInfo().name != ""),
            //No Graph loaded or created
            new StatusEntry('',' new graph.','[ N ]', Eagle.getInstance().logicalGraph().fileInfo().name === ""),
            //something is selected
            new StatusEntry('Right Click ',' on Objects in the graph to see more options.','', Eagle.getInstance().selectedObjects().length > 0),
            //node is selected
            new StatusEntry('',' delete selected node.','[ Del ]', Eagle.getInstance().selectedNode() != null),
            new StatusEntry('',' open fields table.','[ T ]', Eagle.getInstance().selectedNode() != null && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)),
            //edge is selected
            new StatusEntry('',' delete selected edge.','[ Del ]', Eagle.getInstance().selectedEdge() != null),
            //more than one thing is selected
            new StatusEntry('',' delete selected objects.','[ Del ]', Eagle.getInstance().selectedObjects().length >1),
        ];
    }
}