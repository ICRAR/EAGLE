import { Eagle } from './Eagle';
import * as ko from "knockout";

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
            // new KeyboardShortcut("collapse_all_nodes", "Collapse All Nodes", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['hide','show','expand'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.toggleCollapseAllNodes();}),
            new StatusEntry("Click",' on a node in the graph to select it.','', Eagle.getInstance().selectedObjects === null ),
            new StatusEntry("Press ` ",' on your keyboard to search and execute functions','', Eagle.getInstance().selectedObjects === null ),
            new StatusEntry("Right Click",' on Objects in the graph to see more options.','', Eagle.getInstance().selectedObjects != null ),
        ];
    }
}