import {Eagle} from './Eagle';
import {Category} from './Category';
import {Utils} from './Utils';
import {Errors} from './Errors';
import { Setting } from './Setting';
import { ParameterTable } from './ParameterTable';

let currentEvent:any  = null // this is used for keybord shortcut functions that need the event object to function

export class KeyboardShortcut {
    key: string;
    name: string;
    keys: string[];
    eventType: string;
    modifier: KeyboardShortcut.Modifier;
    display: (eagle: Eagle) => boolean;
    canRun: (eagle: Eagle) => boolean;
    run: (eagle: Eagle) => void;

    constructor(key: string, name: string, keys : string[], eventType: string, modifier: KeyboardShortcut.Modifier, display: (eagle: Eagle) => boolean, canRun: (eagle: Eagle) => boolean, run: (eagle: Eagle) => void){
        this.key = key;
        this.name = name;
        this.keys = keys;
        this.eventType = eventType;
        this.modifier = modifier;
        this.display = display;
        this.canRun = canRun;
        this.run = run;
    }

    static nodeIsSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedNode() !== null;
    }

    static changeShortcutKey = (eagle : Eagle, key:string, newShortcutKey:string, newModifier:KeyboardShortcut.Modifier) : void => {
        for (const shortcut of Eagle.shortcuts){
            if (shortcut.key === key){
                shortcut.keys = [newShortcutKey]
                shortcut.modifier = newModifier
            }
        }
    } 

    static commentNodeIsSelected = (eagle: Eagle) : boolean => {
        const selectedNode = eagle.selectedNode();
        return selectedNode !== null && selectedNode.getCategory() === Category.Comment;
    }

    static edgeIsSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedEdge() !== null;
    }

    static somethingIsSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedObjects().length > 0;
    }

    static true = (eagle: Eagle) : boolean => {
        return true;
    }

    static false = (eagle: Eagle) : boolean => {
        return false;
    }

    static allowPaletteEditing = (eagle: Eagle) : boolean => {
        return Setting.findValue(Setting.ALLOW_PALETTE_EDITING);
    }

    static allowGraphEditing = (eagle: Eagle) : boolean => {
        return Setting.findValue(Setting.ALLOW_GRAPH_EDITING);
    }

    static showTableModal = (eagle: Eagle) : boolean => {
        return eagle.showTableModal()
    }

    static graphNotEmpty = (eagle: Eagle) : boolean => {
        if (eagle.logicalGraph() === null){
            return false;
        }

        return eagle.logicalGraph().getNumNodes() > 0;
    }

    static processKey = (e:KeyboardEvent) => {

        // skip all repeat events, just process the initial keyup or keydown
        if (e.repeat){
            return;
        }

        // get reference to eagle
        const eagle = (<any>window).eagle;

        // loop through all the keyboard shortcuts here
        for (const shortcut of Eagle.shortcuts){
            // check that the event is of the correct type
            if (e.type !== shortcut.eventType){
                continue;
            }

            switch(shortcut.modifier){
                
                case KeyboardShortcut.Modifier.None:
                    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Alt:
                    //alt seems useless as is because mac uses that key to type special characters("alt + i" cannot be used as a shortcut because the event key passed would be "ˆ")
                    if (!e.altKey || e.shiftKey || e.metaKey || e.ctrlKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Ctrl:
                    if (!e.ctrlKey || e.metaKey || e.altKey || e.shiftKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Meta:
                    if (!e.metaKey || e.altKey || e.shiftKey || e.ctrlKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Shift:
                    if (!e.shiftKey || e.altKey || e.metaKey || e.ctrlKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.MetaShift:
                    if (!e.shiftKey || !e.metaKey || e.ctrlKey || e.altKey){
                        continue;
                    }
                    break;
            }
            for (const key of shortcut.keys){
                if (key.toLowerCase() === e.key.toLowerCase()){

                    //we are filtering out all shortcuts that should nt run if an input or text field is selected
                    if($("input,textarea").is(":focus") && shortcut.modifier != KeyboardShortcut.Modifier.Input){
                        break
                    }

                    if (shortcut.canRun(eagle)){
                        currentEvent = e
                        shortcut.run(eagle);
                        if($('#shortcutsModal').hasClass('show')){
                            $('#shortcutsModal').modal('hide')
                        }
                        e.preventDefault();
                    } else {
                        Utils.showNotification("Warning", "Shortcut (" + shortcut.name + ") not available in current state.", "warning");
                    }
                }
            }
        }
    }

    static getShortcuts = () : KeyboardShortcut[] => {
        return [
            new KeyboardShortcut("new_graph", "New Graph", ["n"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.newLogicalGraph();}),
            new KeyboardShortcut("new_palette", "New palette", ["n"], "keydown", KeyboardShortcut.Modifier.Shift,KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.newPalette();}),
            new KeyboardShortcut("open_graph_from_repo", "Open graph from repo", ["g"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().mode(Eagle.RightWindowMode.Repository);eagle.rightWindow().shown(true);}),
            new KeyboardShortcut("open_graph_from_local_disk", "Open graph from local disk", ["g"], "keydown", KeyboardShortcut.Modifier.Shift,  KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.getGraphFileToLoad();}),
            new KeyboardShortcut("open_palette_from_repo", "Open palette from repo", ["p"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowPaletteEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.rightWindow().mode(Eagle.RightWindowMode.Repository);eagle.rightWindow().shown(true);}),
            new KeyboardShortcut("open_palette_from_local_disk", "Open palette from local disk", ["p"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.allowPaletteEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.getPaletteFileToLoad();}),
            new KeyboardShortcut("add_graph_nodes_to_palette", "Add graph nodes to palette", ["a"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowPaletteEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.addGraphNodesToPalette();}),
            new KeyboardShortcut("insert_graph_from_local_disk", "Insert graph from local disk", ["i"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.getGraphFileToInsert();}),
            new KeyboardShortcut("save_graph", "Save Graph", ["s"], "keydown", KeyboardShortcut.Modifier.None,KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.graphNotEmpty && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.saveGraph();}),
            new KeyboardShortcut("save_as_graph", "Save Graph As", ["s"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.graphNotEmpty && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.saveGraphAs()}),
            new KeyboardShortcut("deploy_translator", "Generate PGT Using Default Algorithm", ["d"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.deployDefaultTranslationAlgorithm(); }),
            new KeyboardShortcut("delete_selection", "Delete Selection", ["Backspace", "Delete"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.deleteSelection('',false, true);}),
            new KeyboardShortcut("delete_selection_except_children", "Delete Without Children", ["Backspace", "Delete"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.deleteSelection('',false, false);}),
            new KeyboardShortcut("duplicate_selection", "Duplicate Selection", ["d"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.duplicateSelection('normal');}),
            new KeyboardShortcut("create_subgraph_from_selection", "Create subgraph from selection", ["["], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.createSubgraphFromSelection();}),
            new KeyboardShortcut("create_construct_from_selection", "Create construct from selection", ["]"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.createConstructFromSelection();}),
            new KeyboardShortcut("change_selected_node_parent", "Change Selected Node Parent", ["u"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.nodeIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.changeNodeParent();}),
            new KeyboardShortcut("change_selected_node_subject", "Change Selected Node Subject", ["u"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.commentNodeIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.changeNodeSubject();}),
            new KeyboardShortcut("add_edge","Add Edge", ["e"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.addEdgeToLogicalGraph();}),
            new KeyboardShortcut("modify_selected_edge","Modify Selected Edge", ["m"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.edgeIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.editSelectedEdge();}),
            new KeyboardShortcut("center_graph", "Center graph", ["c"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.centerGraph();}),
            // NB: we need two entries for zoom_in here, the first handles '+' without shift (as found on the numpad), the second handles '+' with shift (as found sharing the '=' key)
            new KeyboardShortcut("zoom_in", "Zoom In", ["+"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.zoomIn();}),
            new KeyboardShortcut("zoom_in", "Zoom In", ["+"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.zoomIn();}),
            new KeyboardShortcut("zoom_out", "Zoom Out", ["-"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.zoomOut();}),
            new KeyboardShortcut("toggle_left_window", "Toggle left window", ["l"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowPaletteEditing, function(){return Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.leftWindow().toggleShown();}),
            new KeyboardShortcut("toggle_right_window", "Toggle right window", ["r"], "keydown", KeyboardShortcut.Modifier.None,KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().toggleShown();}),
            new KeyboardShortcut("toggle_both_window", "Toggle both windows", ["b"], "keydown", KeyboardShortcut.Modifier.None,function(){return Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, function(){return Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.toggleWindows();}),
            new KeyboardShortcut("open_settings", "Open setting", ["o"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.smartToggleModal('settingsModal');}),
            new KeyboardShortcut("open_help", "Open help", ["h"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.onlineDocs();}),
            new KeyboardShortcut("open_keyboard_shortcut_modal", "Open Keyboard Shortcut Modal", ["k"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.smartToggleModal('shortcutsModal')}),
            new KeyboardShortcut("open_component_parameter_table_modal", "Open Parameter Table Modal", ["t"], "keydown", KeyboardShortcut.Modifier.None, function(){return !Setting.findValue(Setting.STUDENT_SETTINGS_MODE)}, function(){return !Setting.findValue(Setting.STUDENT_SETTINGS_MODE)}, (eagle): void => {eagle.openParamsTableModal('inspectorTableModal','normal');}),
            new KeyboardShortcut("open_key_parameter_table_modal", "Open Key Parameter Table Modal", ["t"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.openParamsTableModal('keyParametersTableModal','normal');}),
            new KeyboardShortcut("undo", "Undo", ["z"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.undo().prevSnapshot(eagle)}),
            new KeyboardShortcut("redo", "Redo", ["z"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.undo().nextSnapshot(eagle)}),
            new KeyboardShortcut("check_graph", "Check Graph", ["!"], "keydown", KeyboardShortcut.Modifier.Shift,  KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.graphNotEmpty && Setting.findValue(Setting.ALLOW_GRAPH_EDITING) }, (eagle): void => {eagle.showGraphErrors();}),
            new KeyboardShortcut("open_repository", "Open Repository", ["1"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.rightWindow().shown(true).mode(Eagle.RightWindowMode.Repository)}),
            new KeyboardShortcut("open_translation", "Open Translation", ["4"], "keydown", KeyboardShortcut.Modifier.None, function(){return Setting.findValue(Setting.USER_TRANSLATOR_MODE) != Setting.TranslatorMode.Minimal}, function(){return Setting.findValue(Setting.USER_TRANSLATOR_MODE) != Setting.TranslatorMode.Minimal}, (eagle): void => { eagle.rightWindow().shown(true).mode(Eagle.RightWindowMode.TranslationMenu)}),
            new KeyboardShortcut("open_inspector", "Open Inspector", ["3"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.somethingIsSelected, (eagle): void => { eagle.rightWindow().shown(true).mode(Eagle.RightWindowMode.Inspector)}),
            new KeyboardShortcut("open_hierarchy", "Open Hierarchy", ["2"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.rightWindow().shown(true).mode(Eagle.RightWindowMode.Hierarchy)}),
            new KeyboardShortcut("toggle_show_data_nodes", "Toggle Show Data Nodes", ["j"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.toggleShowDataNodes(); }),
            new KeyboardShortcut("toggle_snap_to_grid", "Toggle Snap-to-Grid", ["y"], "keydown", KeyboardShortcut.Modifier.None,KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.toggleSnapToGrid(); }),
            new KeyboardShortcut("check_for_component_updates", "Check for Component Updates", ["q"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.graphNotEmpty && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => { eagle.checkForComponentUpdates(); }),
            new KeyboardShortcut("copy_from_graph_without_children", "Copy from graph without children", ["c"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.copySelectionToClipboard(false); }),
            new KeyboardShortcut("copy_from_graph", "Copy from graph", ["c"], "keydown", KeyboardShortcut.Modifier.Ctrl, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.copySelectionToClipboard(true); }),
            new KeyboardShortcut("paste_to_graph", "Paste to graph", ["v"], "keydown", KeyboardShortcut.Modifier.Ctrl, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.pasteFromClipboard(); }),
            new KeyboardShortcut("select_all_in_graph", "Select all in graph", ["a"], "keydown", KeyboardShortcut.Modifier.Ctrl, KeyboardShortcut.true, KeyboardShortcut.graphNotEmpty, (eagle): void => { eagle.selectAllInGraph(); }),
            new KeyboardShortcut("select_none_in_graph", "Select none in graph", ["Escape"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, KeyboardShortcut.somethingIsSelected, (eagle): void => { eagle.selectNoneInGraph(); }),
            new KeyboardShortcut("fix_all", "Fix all errors in graph", ["f"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { Errors.fixAll(); }),
            new KeyboardShortcut("table_move_down", "Table move down one cell", ["Enter"], "keydown", KeyboardShortcut.Modifier.Input, KeyboardShortcut.false, KeyboardShortcut.showTableModal, (eagle): void => { ParameterTable.tableEnterShortcut(currentEvent);}),
        ];
    }
}

export namespace KeyboardShortcut{
    export enum Modifier {
        Alt = "Alt",
        Ctrl = "Ctrl",
        Meta = "Meta",
        Shift = "Shift",
        None = "none",
        MetaShift = "Meta + Shift",
        Input = "Input" //special case for shortcuts in the table modal that allow the user to move from cell to cell
    }
}
