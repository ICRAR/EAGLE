import { Eagle } from './Eagle';
import { KeyboardShortcut } from './KeyboardShortcut';
import { Setting } from './Setting';
import { Node } from './Node';

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
        const selectedObjects = Eagle.getInstance().selectedObjects();

        if(selectedObjects.length > 0){
            return selectedObjects.some(obj => obj instanceof Node && (obj as Node).isConstruct());
        }

        return false;
    }
    
    static childOfConstructIsSelected():boolean {
        // Check if at least one child of a construct is selected, but no construct without parent
        const selectedObjects = Eagle.getInstance().getOutermostSelectedNodes();

        if(selectedObjects.length > 0){
            return selectedObjects.some(obj => obj instanceof Node && (obj as Node).hasParent());
        }

        return false;
    }

    static multiSelectionNoConstructRelatives():boolean {
        //check if more than one object is selected and no node is selected that is a construct or has a parent
        const selectedObjects = Eagle.getInstance().selectedObjects();

        if(selectedObjects.length > 1){
            return selectedObjects.every(obj => { if(obj instanceof Node){ return (!(obj as Node).isConstruct() && !(obj as Node).hasParent()); }else { return true; } });
        }

        return false;
    }

    static getStatusEntries() : StatusEntry[] {
        return [
            //nothing is selected
            new StatusEntry('[Middle Mouse]',' pan canvas.', Eagle.getInstance().selectedObjects().length === 0),
            new StatusEntry('[Right Click]',' on empty canvas to add nodes.', Eagle.getInstance().selectedObjects().length === 0),
            new StatusEntry(KeyboardShortcut.idToKeysText('quick_action', true),' search and run functions.', Eagle.getInstance().selectedObjects().length === 0),
            new StatusEntry(KeyboardShortcut.idToKeysText('open_graph_configurations_table', true), ' display all graph configs.',  Eagle.getInstance().selectedObjects().length === 0),
            //a graph is created or loaded
            new StatusEntry(KeyboardShortcut.idToKeysText('open_graph_attributes_configuration_table', true),' display active graph config.', Eagle.getInstance().logicalGraph().fileInfo().name != "" && Eagle.getInstance().selectedObjects().length === 0),
            //No Graph loaded or created
            new StatusEntry(KeyboardShortcut.idToKeysText('new_graph', true),' new graph.', Eagle.getInstance().logicalGraph().fileInfo().name === ""),
            //something is selected
            new StatusEntry(KeyboardShortcut.idToKeysText('duplicate_selection', true),' duplicate selection.', Eagle.getInstance().selectedObjects().length > 0),
            new StatusEntry(KeyboardShortcut.idToKeysText('delete_selection', true),' delete selection.', Eagle.getInstance().selectedObjects().length > 0),
            //a node is selected
            new StatusEntry('[Right Click]',' on Objects in the graph for more options.', Eagle.getInstance().selectedNode() != null),
            new StatusEntry(KeyboardShortcut.idToKeysText('open_parameter_table', true),' open fields table.', Eagle.getInstance().selectedNode() != null && Setting.findValueAsBoolean(Setting.ALLOW_GRAPH_EDITING)),
            //more than one thing is selected
            new StatusEntry(KeyboardShortcut.idToKeysText('create_construct_from_selection', true),' Construct from selection.', Eagle.getInstance().selectedObjects().length >1),
            new StatusEntry('[Shift + Alt + Click]',' toggle selection of object', Eagle.getInstance().selectedObjects().length >1),
            //construct is selected
            new StatusEntry('[Double Click] or [Alt + Click]',' Select specific object.', this.constructIsSelected()),
            //at least one child of a construct, but no construct without parent is selected
            new StatusEntry('[Ctrl + Drag]',' move selection without resizing constructs.', this.childOfConstructIsSelected()),
            //multi selection but no construct selected
            new StatusEntry('[Shift + Drag]',' Box select objects.', this.multiSelectionNoConstructRelatives()),
            new StatusEntry('[Shift + Ctrl + Drag]',' Box deselect objects.', this.multiSelectionNoConstructRelatives()),
            //always
        ];
    }
}