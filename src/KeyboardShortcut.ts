import { Category } from './Category';
import { Eagle } from './Eagle';
import { Errors } from './Errors';
import { ParameterTable } from './ParameterTable';
import { QuickActions } from './QuickActions';
import { Setting } from './Setting';
import { TutorialSystem } from './Tutorial';
import { Utils } from './Utils';
import { GraphRenderer } from './GraphRenderer';
import { GraphConfigurationsTable } from './GraphConfigurationsTable';


let currentEvent:any  = null // this is used for keyboard shortcut functions that need the event object to function

export class KeyboardShortcut {
    key: string;
    name: string;
    keys: string[];
    eventType: string;
    modifier: KeyboardShortcut.Modifier;
    quickAction: (eagle: Eagle) => boolean; //is this function shown in the quick actions menu
    quickActionTags: string[]; //tags or key words that are associated with the function to help searchability
    display: (eagle: Eagle) => boolean;
    canRun: (eagle: Eagle) => boolean;
    run: (eagle: Eagle) => void;

    constructor(key: string, name: string, keys : string[], eventType: string, modifier: KeyboardShortcut.Modifier, quickAction: (eagle: Eagle) => boolean, quickActionTags : string[], display: (eagle: Eagle) => boolean, canRun: (eagle: Eagle) => boolean, run: (eagle: Eagle) => void){
        this.key = key;
        this.name = name;
        this.keys = keys;
        this.eventType = eventType;
        this.modifier = modifier;
        this.quickAction = quickAction;
        this.quickActionTags = quickActionTags;
        this.display = display;
        this.canRun = canRun;
        this.run = run;
    }

    static nodeIsSelected(eagle: Eagle) : boolean {
        return eagle.selectedNode() !== null;
    }

    static changeShortcutKey(eagle : Eagle, key:string, newShortcutKey:string, newModifier:KeyboardShortcut.Modifier) : void {
        for (const shortcut of Eagle.shortcuts){
            if (shortcut.key === key){
                shortcut.keys = [newShortcutKey]
                shortcut.modifier = newModifier
            }
        }
    } 

    static commentNodeIsSelected(eagle: Eagle) : boolean {
        const selectedNode = eagle.selectedNode();
        return selectedNode !== null && selectedNode.getCategory() === Category.Comment;
    }

    static edgeIsSelected(eagle: Eagle) : boolean {
        return eagle.selectedEdge() !== null;
    }

    static somethingIsSelected(eagle: Eagle) : boolean {
        return eagle.selectedObjects().length > 0;
    }

    static true(eagle: Eagle) : boolean {
        return true;
    }

    static false(eagle: Eagle) : boolean {
        return false;
    }

    static allowPaletteEditing(eagle: Eagle) : boolean {
        return Setting.findValue(Setting.ALLOW_PALETTE_EDITING);
    }

    static allowGraphEditing(eagle: Eagle) : boolean {
        return Setting.findValue(Setting.ALLOW_GRAPH_EDITING);
    }

    static graphNotEmpty(eagle: Eagle) : boolean {
        if (eagle.logicalGraph() === null){
            return false;
        }

        return eagle.logicalGraph().getNumNodes() > 0;
    }

    static processKey(e:KeyboardEvent) : void {
        // skip all non-KeyboardEvent, otherwise we can't guarantee the Event has a '.key' attribute
        if (!(e instanceof KeyboardEvent)){
            return;
        }

        // skip all repeat events, just process the initial keyup or keydown
        if (e.repeat){
            return;
        }

        //console.log("event", e.key, "meta", e.metaKey, "shift", e.shiftKey, "ctrl", e.ctrlKey, "alt", e.altKey);

        // get reference to eagle
        const eagle: Eagle = Eagle.getInstance();

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
                    //we are also filtering out the shortcuts that should run when the quick action system is being used
                    if($("input,textarea").is(":focus") && shortcut.modifier != KeyboardShortcut.Modifier.Input && shortcut.modifier != KeyboardShortcut.Modifier.quickAction){
                        break
                    }
                    if(eagle.quickActionOpen() && shortcut.modifier != KeyboardShortcut.Modifier.quickAction){
                        return;
                    }

                    if (shortcut.canRun(eagle)){
                        currentEvent = e
                        shortcut.run(eagle);
                        if($('#shortcutsModal').hasClass('show')){
                            $('#shortcutsModal').modal('hide')
                        }
                        e.preventDefault();
                    } else {
                        //making exclusions for the warning, there arent my shortcuts we want to exclude, so this is fine
                        if(shortcut.key != 'select_none_in_graph' && shortcut.key != 'table_move_down'){
                            Utils.showNotification("Warning", "Shortcut (" + shortcut.name + ") not available in current state.", "warning");
                        }
                    }
                }
            }
        }
    }

    static getShortcuts() : KeyboardShortcut[] {
        return [
            new KeyboardShortcut("quick_action", "Quick Action", ["`"], "keydown", KeyboardShortcut.Modifier.quickAction, KeyboardShortcut.true, [''], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { QuickActions.initiateQuickAction();}),
            new KeyboardShortcut("new_graph", "New Graph", ["n"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['create','canvas'], KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.newLogicalGraph();}),
            new KeyboardShortcut("new_palette", "New palette", ["n"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['create','palettes','pallette'],KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.newPalette();}),
            new KeyboardShortcut("new_config", "New config", ["n"], "keydown", KeyboardShortcut.Modifier.Ctrl, KeyboardShortcut.true, ['create','configs','config'],KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.newConfig();}),
            new KeyboardShortcut("open_graph_from_repo", "Open graph from repo", ["g"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['git','repository','github','gitlab','load','canvas'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().mode(Eagle.RightWindowMode.Repository);eagle.rightWindow().shown(true);}),
            new KeyboardShortcut("open_graph_from_local_disk", "Open graph from local disk", ["g"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['upload','load','canvas'],  KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.getGraphFileToLoad();}),
            new KeyboardShortcut("open_palette_from_repo", "Open palette from repo", ["p"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['git','repository','github','gitlab','load','template'], KeyboardShortcut.allowPaletteEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.rightWindow().mode(Eagle.RightWindowMode.Repository);eagle.rightWindow().shown(true);}),
            new KeyboardShortcut("open_palette_from_local_disk", "Open palette from local disk", ["p"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['template', 'upload'], KeyboardShortcut.allowPaletteEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.getPaletteFileToLoad();}),
            new KeyboardShortcut("add_graph_nodes_to_palette", "Add graph nodes to palette", ["a"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['template','canvas'], KeyboardShortcut.allowPaletteEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.addGraphNodesToPalette();}),
            new KeyboardShortcut("insert_graph_from_local_disk", "Insert graph from local disk", ["i"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['canvas','subGraph','upload'], KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.getGraphFileToInsert();}),
            new KeyboardShortcut("save_graph", "Save Graph", ["s"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['canvas','commit','github','repository','gitlab'],KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.graphNotEmpty && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.saveGraph();}),
            new KeyboardShortcut("save_as_graph", "Save Graph As", ["s"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['download','canvas'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.graphNotEmpty && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.saveGraphAs()}),
            new KeyboardShortcut("deploy_translator", "Generate PGT Using Default Algorithm", ["d"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['deploy','translate','translator'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.deployDefaultTranslationAlgorithm(); }),
            new KeyboardShortcut("delete_selection", "Delete Selection", ["Delete","Backspace"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['remove'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.deleteSelection(false, false, true);}),
            new KeyboardShortcut("delete_selection_except_children", "Delete Without Children", ["Backspace", "Delete"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['remove'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.deleteSelection(false, false, false);}),
            new KeyboardShortcut("duplicate_selection", "Duplicate Selection", ["d"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['copy'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.duplicateSelection('normal');}),
            new KeyboardShortcut("create_subgraph_from_selection", "Create subgraph from selection", ["["], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['group'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.createSubgraphFromSelection();}),
            new KeyboardShortcut("create_construct_from_selection", "Create construct from selection", ["]"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['group'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.createConstructFromSelection();}),
            new KeyboardShortcut("change_selected_node_parent", "Change Selected Node Parent", ["u"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [''], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.nodeIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.changeNodeParent();}),
            new KeyboardShortcut("change_selected_node_subject", "Change Selected Node Subject", ["u"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['comment'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.commentNodeIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.changeNodeSubject();}),
            new KeyboardShortcut("add_edge","Add Edge", ["e"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['create'], KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.addEdgeToLogicalGraph();}),
            new KeyboardShortcut("modify_selected_edge","Modify Selected Edge", ["m"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['edit'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.edgeIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.editSelectedEdge();}),
            new KeyboardShortcut("center_graph", "Center graph", ["c"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['canvas','reset','controls'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.centerGraph();}),
            new KeyboardShortcut("center_construct_around_children", "Center Construct Around Children", ["c"], "keydown", KeyboardShortcut.Modifier.Alt, KeyboardShortcut.true, ['construct','center','fit'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {GraphRenderer.centerConstruct(eagle.selectedNode(),eagle.logicalGraph().getNodes())}),
            new KeyboardShortcut("toggle_left_window", "Toggle left window", ["l"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['close','open'], KeyboardShortcut.allowPaletteEditing, function(){return Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.leftWindow().toggleShown();}),
            new KeyboardShortcut("toggle_right_window", "Toggle right window", ["r"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['close','open'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().toggleShown();}),
            new KeyboardShortcut("toggle_both_window", "Toggle both windows", ["b"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['close','open'], function(){return Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, function(){return Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.toggleWindows();}),
            new KeyboardShortcut("open_settings", "Open setting", ["o"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['menu','options'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.smartToggleModal('settingsModal');}),
            new KeyboardShortcut("open_help", "Open Online Documentation", ["h"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['read me','guide','documentation'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.onlineDocs();}),
            new KeyboardShortcut("open_keyboard_shortcut_modal", "Open Keyboard Shortcut Modal", ["k"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['shortcuts'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.smartToggleModal('shortcutsModal')}),
            new KeyboardShortcut("open_parameter_table_modal", "Open Parameter Table Modal", ["t"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['fields','field','node','table'], function(){return !Setting.findValue(Setting.STUDENT_SETTINGS_MODE)}, function(){return !Setting.findValue(Setting.STUDENT_SETTINGS_MODE)}, (eagle): void => {ParameterTable.openModal(ParameterTable.Mode.NodeFields, ParameterTable.SelectType.Normal);}),
            new KeyboardShortcut("open_graph_configuration_table_modal", "Open Graph Configuration Table Modal", ["t"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['fields','field','node','graph','table','favourites'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {ParameterTable.openModal(ParameterTable.Mode.GraphConfig, ParameterTable.SelectType.Normal);}),
            new KeyboardShortcut("undo", "Undo", ["z"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['back','history'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.undo().prevSnapshot(eagle)}),
            new KeyboardShortcut("redo", "Redo", ["z"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['forward','history'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.undo().nextSnapshot(eagle)}),
            new KeyboardShortcut("check_graph", "Check Graph", ["!"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, ['error','errors','fix'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.graphNotEmpty && Setting.findValue(Setting.ALLOW_GRAPH_EDITING) }, (eagle): void => {eagle.showGraphErrors();}),
            new KeyboardShortcut("open_repository", "Open Repository", ["1"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['tab','tabs','window','menu','right'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.changeRightWindowMode(Eagle.RightWindowMode.Repository)}),
            new KeyboardShortcut("open_translation", "Open Translation", ["3"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['tab','tabs','window','menu','right'], function(){return Setting.findValue(Setting.USER_TRANSLATOR_MODE) != Setting.TranslatorMode.Minimal}, function(){return Setting.findValue(Setting.USER_TRANSLATOR_MODE) != Setting.TranslatorMode.Minimal}, (eagle): void => { eagle.changeRightWindowMode(Eagle.RightWindowMode.TranslationMenu)}),
            new KeyboardShortcut("open_hierarchy", "Open Hierarchy", ["2"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['tab','tabs','window','menu','right'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.changeRightWindowMode(Eagle.RightWindowMode.Hierarchy)}),
            new KeyboardShortcut("check_for_component_updates", "Check for Component Updates", ["q"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['nodes'], KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.graphNotEmpty && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => { eagle.checkForComponentUpdates(); }),
            new KeyboardShortcut("copy_from_graph_without_children", "Copy from graph without children", ["c"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.true, [''], KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.copySelectionToClipboard(false); }),
            new KeyboardShortcut("copy_from_graph", "Copy from graph", ["c"], "keydown", KeyboardShortcut.Modifier.Ctrl, KeyboardShortcut.true, [''], KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.copySelectionToClipboard(true); }),
            new KeyboardShortcut("paste_to_graph", "Paste to graph", ["v"], "keydown", KeyboardShortcut.Modifier.Ctrl, KeyboardShortcut.true, [''], KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.pasteFromClipboard(); }),
            new KeyboardShortcut("select_all_in_graph", "Select all in graph", ["a"], "keydown", KeyboardShortcut.Modifier.Ctrl, KeyboardShortcut.true, [''], KeyboardShortcut.true, KeyboardShortcut.graphNotEmpty, (eagle): void => { eagle.selectAllInGraph(); }),
            new KeyboardShortcut("select_none_in_graph", "Select none in graph", ["Escape"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['deselect'], KeyboardShortcut.true, KeyboardShortcut.somethingIsSelected, (eagle): void => { eagle.selectNoneInGraph(); }),
            new KeyboardShortcut("fix_all", "Fix all errors in graph", ["f"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [''], KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { Errors.fixAll(); }),
            new KeyboardShortcut("table_move_down", "Table move down one cell", ["Enter"], "keydown", KeyboardShortcut.Modifier.Input, KeyboardShortcut.true, ['controls'], KeyboardShortcut.false, ParameterTable.showTableModal, (eagle): void => { ParameterTable.tableEnterShortcut(currentEvent);}),

            new KeyboardShortcut("open_graph_configurations_table_modal", "Open Graph Configurations Table Modal", ["t"], "keydown", KeyboardShortcut.Modifier.Ctrl, KeyboardShortcut.true, ['config','graph','table'], KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {GraphConfigurationsTable.openModal();}),
        ];
    }

    static getQuickActions() : KeyboardShortcut[] {
        return [
            new KeyboardShortcut("collapse_all_nodes", "Collapse All Nodes", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['hide','show','expand'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.toggleCollapseAllNodes();}),
            new KeyboardShortcut("quickIntroTut", "Start UI Quick Intro Tutorial", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['ui','interface'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {TutorialSystem.initiateTutorial('Quick Start');}),
            new KeyboardShortcut("graphBuildingTut", "Start Graph Building Tutorial", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {TutorialSystem.initiateTutorial('Graph Building');}),
            new KeyboardShortcut("savePaletteLocally", "Save Palette Locally", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.saveFileToLocal(Eagle.FileType.Palette);}),
            new KeyboardShortcut("createNewPaletteFromJson", "Create New Palette From Json", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.newPaletteFromJson();}),
            new KeyboardShortcut("savePaletteAs", "Save Palette To Git", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.commitToGitAs(Eagle.FileType.Palette);}),
            new KeyboardShortcut("loadFromRepository", "Load From Repository", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().shown(true).mode(Eagle.RightWindowMode.Repository);}),
            new KeyboardShortcut("createNewGraphFromJson", "Create New Graph From Json", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.newLogicalGraphFromJson();}),
            new KeyboardShortcut("addToGraphFromJson", "Add To Graph From Json", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.addToGraphFromJson();}),
            new KeyboardShortcut("displayGraphAsJson", "Display Graph As Json", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.displayObjectAsJson(Eagle.FileType.Graph);}),
            new KeyboardShortcut("aboutEagle", "About Eagle", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.showAbout();}),
            new KeyboardShortcut("gitHubReadme", "GitHub ReadMe", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.readme();}),
            new KeyboardShortcut("submitIssue", "Submit GitHub Issue", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.submitIssue();}),
            new KeyboardShortcut("graphInfo", "Show Graph Info", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {Utils.showModelDataModal('Graph Info', eagle.logicalGraph().fileInfo());}),
            new KeyboardShortcut("copyGraphUrl", "Copy Graph Url", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.copyGraphUrl();}),
            new KeyboardShortcut("toggleCollapseAllGroups", "Toggle Collapse All Groups", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['expand','hide','show'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.toggleCollapseAllGroups();}),
            new KeyboardShortcut("addSelectedNodeToPalette", "Add Selected Nodes To Palette", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.addSelectedNodesToPalette('normal');}),
            new KeyboardShortcut("screenshotGraph", "Save Graph as PNG (Screenshot)", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['print','printScreen','screen','save','png'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.saveGraphScreenshot();}),

            // graph configs
            new KeyboardShortcut("createNewConfig", "Create New Config", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.newConfig();}),
            /*
            new KeyboardShortcut("saveConfig", "Save Config To Git", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.commitToGit(Eagle.FileType.GraphConfig);}),
            new KeyboardShortcut("saveConfigAs", "Save Config To Git As", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.commitToGitAs(Eagle.FileType.GraphConfig);}),
            new KeyboardShortcut("saveConfigLocally", "Save Config Locally", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.saveFileToLocal(Eagle.FileType.GraphConfig);}),
            new KeyboardShortcut("loadConfigLocally", "Load Config Locally", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, [], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {eagle.getConfigFileToLoad();}),
            */

            //docs
            new KeyboardShortcut("docs_load_a_palette", "Loading a Palette", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/quickStart2.html#loading-a-palette');}),
            new KeyboardShortcut("docs_creating_a_graph", "Creating a Graph", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/quickStart2.html#creating-a-new-graph');}),
            new KeyboardShortcut("docs_saving_graph_to_github", "Saving a Graph To Github", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/quickStart2.html#saving-a-graph-to-github');}),
            new KeyboardShortcut("docs_ui_modes", "UI Modes", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','settings'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/settings.html#ui-modes');}),
            new KeyboardShortcut("docs_settings", "Settings", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','settings'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/settings.html#');}),
            new KeyboardShortcut("docs_quickStart", "Quick Start", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','set up'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/quickStart2.html');}),
            new KeyboardShortcut("docs_helloWorldExample", "Hello World Example", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','tutorial'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#');}),
            new KeyboardShortcut("docs_graphCreation", "Graph Creation", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','tutorial'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#graph-creation');}),
            new KeyboardShortcut("docs_savingGraphToGitHub", "Saving a Graph To Github", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','tutorial'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#saving-a-graph-to-github');}),
            new KeyboardShortcut("docs_translatingAGraph", "Translating a Graph", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','tutorial'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#translating-a-graph');}),
            new KeyboardShortcut("docs_executingAGraph", "Executing a Graph", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','tutorial'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#executing-a-graph');}),
            new KeyboardShortcut("docs_components", "Components", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/components.html');}),
            new KeyboardShortcut("docs_dockerComponents", "Creating Docker Components", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/components.html#creating-components-for-docker-images');}),
            new KeyboardShortcut("docs_notesOnDockerImages", "Notes On Docker Images", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/components.html#important-notes-on-docker-images');}),
            new KeyboardShortcut("docs_linkingComponentsWithEdges", "Linking Components With Edges", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/components.html#linking-components-with-edges');}),
            new KeyboardShortcut("docs_environmentVariables", "Environment Variables", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/components.html#environment-variables');}),
            new KeyboardShortcut("docs_palettes", "Palettes", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/palettes.html');}),
            new KeyboardShortcut("docs_creatingPalettesAutomaticallyFromSourceCode", "Creating Palettes Automatically From Source Code", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/palettes.html#creating-palettes-automatically-from-source-code');}),
            new KeyboardShortcut("docs_creatingPalettesWithinEagle", "Creating Palettes From Within Eagle", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/palettes.html#creating-palettes-automatically-from-source-code');}),
            new KeyboardShortcut("docs_templatesAndGraphs", "Templates And Graphs", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/graphs.html');}),
            new KeyboardShortcut("docs_logicalGraphTemplate", "Logical Graph Template", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/graphs.html#logical-graph-template');}),
            new KeyboardShortcut("docs_logicalGraph", "Logical Graph", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/graphs.html#logical-graph');}),
            new KeyboardShortcut("docs_physicalGraphTemplate", "Physical Graph Template", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/graphs.html#physical-graph-template');}),
            new KeyboardShortcut("docs_physicalGraph", "Physical Graph", [""], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.true, ['documentation','help','components'], KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink('https://eagle-dlg.readthedocs.io/en/master/graphs.html#physical-graph');}),
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
        Input = "Input", //special case for shortcuts in the table modal that allow the user to move from cell to cell
        quickAction = "quickAction" // determines when a shortcut should be usable when the quick actions system is active
    }
}
