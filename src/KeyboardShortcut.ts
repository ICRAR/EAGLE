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
import { SideWindow } from './SideWindow';

export class Key {
    key: string;
    modifier: KeyboardShortcut.Modifier;

    constructor(key: string, modifier: KeyboardShortcut.Modifier = KeyboardShortcut.Modifier.None){
        this.key = key;
        this.modifier = modifier;
    }
}

export class KeyboardShortcut {
    id: string;
    name: string;
    keys: Key[];
    eventType: string;
    warnWhenCantRun: boolean; // warn the user (via notification) if the canRun function returns false
    inputOK: boolean;         // if true, this shortcut can run when an input element is focussed
    tags: string[];           // tags or key words that are associated with the function to help searchability
    
    quickActionDisplay: (eagle: Eagle) => boolean;   // determine if this shortcut should be shown in the quick actions list, given the current state of EAGLE
    shortcutListDisplay: (eagle: Eagle) => boolean; // determine if this shortcut should be shown in the shortcut list, given the current state of EAGLE
    canRun: (eagle: Eagle) => boolean;
    run: (eagle: Eagle, event: KeyboardEvent) => void;

    constructor(id: string, name: string, keys: Key[], eventType: string, warnWhenCantRun: boolean, inputOK: boolean, tags: string[], quickActionDisplay: (eagle: Eagle) => boolean, shortcutListDisplay: (eagle: Eagle) => boolean, canRun: (eagle: Eagle) => boolean, run: (eagle: Eagle, event: KeyboardEvent) => void){
        this.id = id;
        this.name = name;
        this.keys = keys;
        this.eventType = eventType;
        this.warnWhenCantRun = warnWhenCantRun;
        this.inputOK = inputOK;
        this.tags = tags;

        this.quickActionDisplay = quickActionDisplay;
        this.shortcutListDisplay = shortcutListDisplay;
        this.canRun = canRun;
        this.run = run;
    }

    getText(addBrackets: boolean): string {
        const texts: string[] = [];
        const platform = KeyboardShortcut.detectPlatform();

        for (const key of this.keys){
            // skip key if its not OK for this platform
            if (!KeyboardShortcut.modifierOKForPlatform(key.modifier, platform)){
                continue;
            }

            // add actual key (capitalized)
            let result = key.key.charAt(0).toUpperCase() + key.key.slice(1);

            // prepend modifier if required
            if (key.modifier !== KeyboardShortcut.Modifier.None){
                result = key.modifier + "+" + result;
            }

            texts.push(result);
        }

        // if there are no key texts produced, then it doesn't make sense to return "[]",
        // just return an empty string
        if (texts.length === 0){
            return "";
        }

        // surround with brackets if required
        if (addBrackets){
            return "[ " + texts.join(', ') + " ]";       
        } else {
            return texts.join(', ');
        }
    }

    static nodeIsSelected(eagle: Eagle) : boolean {
        return eagle.selectedNode() !== null;
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

    static quickActionsClosed(eagle: Eagle): boolean {
        return !eagle.quickActionOpen();
    }

    static notInStudentMode(eagle: Eagle): boolean {
        return !Setting.findValue(Setting.STUDENT_SETTINGS_MODE);
    }

    static QUICK_ACTION(id: string, name: string, tags: string[], run: (eagle: Eagle, event: KeyboardEvent) => void): KeyboardShortcut {
        return new KeyboardShortcut(id, name, [], "keydown", true, false, tags, KeyboardShortcut.true, KeyboardShortcut.false, KeyboardShortcut.true, run);
    }

    static QUICK_ACTION_DOCS(id: string, name: string, tags: string[], url: string): KeyboardShortcut {
        return new KeyboardShortcut(id, name, [], "keydown", true, false, tags, KeyboardShortcut.true, KeyboardShortcut.false, KeyboardShortcut.true, (eagle): void => {QuickActions.quickOpenDocsLink(url);});
    }

    static processKey(e: KeyboardEvent) : void {
        // skip all non-KeyboardEvent, otherwise we can't guarantee the Event has a '.key' attribute
        if (!(e instanceof KeyboardEvent)){
            return;
        }

        // skip all repeat events, just process the initial keyup or keydown
        if (e.repeat){
            return;
        }

        //console.log("event", e, "key", e.key, "code", e.code, "which", e.which, "meta", e.metaKey, "shift", e.shiftKey, "ctrl", e.ctrlKey, "alt", e.altKey);

        // get reference to eagle
        const eagle: Eagle = Eagle.getInstance();

        // detect platform
        const platform = KeyboardShortcut.detectPlatform();

        // is a input or textarea in focus
        const inputElementInFocus = $("input,textarea").is(":focus");

        // loop through all the keyboard shortcuts here
        for (const shortcut of Eagle.shortcuts){
            // check that the event is of the correct type
            if (e.type !== shortcut.eventType){
                continue;
            }

            // if an input element is focussed, check that it's OK to run this shortcut
            if (inputElementInFocus && !shortcut.inputOK){
                continue;
            }

            for (const key of shortcut.keys){
                // abort if key does not match
                if (key.key.toLowerCase() !== e.key.toLowerCase()){
                    continue;
                }

                // skip key if its not OK for this platform
                if (!KeyboardShortcut.modifierOKForPlatform(key.modifier, platform)){
                    continue;
                }

                // abort if modifier keys are not being held
                switch(key.modifier){
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

                // abort if we can't run the shortcut in the current EAGLE state
                if (!shortcut.canRun(eagle)){
                    if (shortcut.warnWhenCantRun){
                        Utils.showNotification("Warning", "Shortcut (" + shortcut.name + ") not available in current state.", "warning");
                    }
                    continue;
                }

                // otherwise, run the shortcut
                shortcut.run(eagle, e);

                // hide the shortcuts modal
                if($('#shortcutsModal').hasClass('show')){
                    $('#shortcutsModal').modal('hide')
                }
                
                e.preventDefault();

                return;
            }
        }
    }

    static getShortcuts() : KeyboardShortcut[] {
        return [
            new KeyboardShortcut("new_graph", "New Graph", [new Key("n")], "keydown", true, false, ['create','canvas'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.newLogicalGraph();}),
            new KeyboardShortcut("new_palette", "New palette", [new Key("n", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['create','palettes','pallette'], KeyboardShortcut.true,KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.newPalette();}),
            new KeyboardShortcut("new_config", "New config", [new Key("n", KeyboardShortcut.Modifier.Alt)], "keydown", true, false, ['create','configs','config'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.newConfig();}),
            new KeyboardShortcut("open_graph_from_repo", "Open graph from repo", [new Key("g")], "keydown", true, false, ['git','repository','github','gitlab','load','canvas'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.changeRightWindowMode(Eagle.RightWindowMode.Repository); SideWindow.setShown('right',true);}),
            new KeyboardShortcut("open_graph_from_local_disk", "Open graph from local disk", [new Key("g", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['upload','load','canvas'], KeyboardShortcut.true,  KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.getGraphFileToLoad();}),
            new KeyboardShortcut("open_palette_from_repo", "Open palette from repo", [new Key("p")], "keydown", true, false, ['git','repository','github','gitlab','load','template'], KeyboardShortcut.true, KeyboardShortcut.allowPaletteEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.changeRightWindowMode(Eagle.RightWindowMode.Repository);SideWindow.setShown('right',true);}),
            new KeyboardShortcut("open_palette_from_local_disk", "Open palette from local disk", [new Key("p", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['template', 'upload'], KeyboardShortcut.true, KeyboardShortcut.allowPaletteEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.getPaletteFileToLoad();}),
            new KeyboardShortcut("add_graph_nodes_to_palette", "Add graph nodes to palette", [new Key("a")], "keydown", true, false, ['template','canvas'], KeyboardShortcut.true, KeyboardShortcut.allowPaletteEditing, KeyboardShortcut.allowPaletteEditing, (eagle): void => {eagle.addGraphNodesToPalette();}),
            new KeyboardShortcut("insert_graph_from_local_disk", "Insert graph from local disk", [new Key("i")], "keydown", true, false, ['canvas','subGraph','upload'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.getGraphFileToInsert();}),
            new KeyboardShortcut("save_graph", "Save Graph", [new Key("s")], "keydown", true, false, ['canvas','commit','github','repository','gitlab'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.saveGraph();}),
            new KeyboardShortcut("save_as_graph", "Save Graph As", [new Key("s", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['download','canvas','save as '], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.saveGraphAs()}),
            new KeyboardShortcut("deploy_translator", "Generate PGT Using Default Algorithm", [new Key("d", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['deploy','translate','translator'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.deployDefaultTranslationAlgorithm(); }),
            new KeyboardShortcut("delete_selection", "Delete Selection", [new Key("Delete"), new Key("Backspace")], "keydown", true, false, ['remove'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.deleteSelection(false, false, true);}),
            new KeyboardShortcut("delete_selection_except_children", "Delete Without Children", [new Key("Backspace", KeyboardShortcut.Modifier.Shift), new Key("Delete", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['remove'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.deleteSelection(false, false, false);}),
            new KeyboardShortcut("duplicate_selection", "Duplicate Selection", [new Key("d")], "keydown", true, false, ['copy'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.duplicateSelection('normal');}),
            new KeyboardShortcut("create_subgraph_from_selection", "Create subgraph from selection", [new Key("[")], "keydown", true, false, ['group'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.createSubgraphFromSelection();}),
            new KeyboardShortcut("create_construct_from_selection", "Create construct from selection", [new Key("]")], "keydown", true, false, ['group'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.somethingIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.createConstructFromSelection();}),
            new KeyboardShortcut("change_selected_node_parent", "Change Selected Node Parent", [new Key("u")], "keydown", true, false, [''], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.nodeIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.changeNodeParent();}),
            new KeyboardShortcut("change_selected_node_subject", "Change Selected Node Subject", [new Key("u", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['comment'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.commentNodeIsSelected && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.changeNodeSubject();}),
            new KeyboardShortcut("add_edge","Add Edge", [new Key("e")], "keydown", true, false, ['create'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.addEdgeToLogicalGraph();}),
            new KeyboardShortcut("modify_selected_edge","Modify Selected Edge", [new Key("m")], "keydown", true, false, ['edit'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.editSelectedEdge();}),
            new KeyboardShortcut("center_graph", "Center graph", [new Key("c")], "keydown", true, false, ['canvas','reset','controls'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.centerGraph();}),
            new KeyboardShortcut("center_construct_around_children", "Center Construct Around Children", [new Key("c", KeyboardShortcut.Modifier.Alt)], "keydown", true, false, ['construct','center','fit'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {GraphRenderer.centerConstruct(eagle.selectedNode(),eagle.logicalGraph().getNodes())}),
            new KeyboardShortcut("toggle_left_window", "Toggle left window", [new Key("ArrowLeft")], "keydown", true, false, ['close','open'], KeyboardShortcut.true, KeyboardShortcut.allowPaletteEditing, function(){return Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {SideWindow.toggleShown('left')}),
            new KeyboardShortcut("toggle_right_window", "Toggle right window", [new Key("ArrowRight")], "keydown", true, false, ['close','open'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {SideWindow.toggleShown('right')}),
            new KeyboardShortcut("toggle_bottom_window", "Toggle bottom window", [new Key("ArrowDown")], "keydown", true, false, ['close','open'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {SideWindow.toggleShown('bottom')}),
            new KeyboardShortcut("toggle_all_window", "Toggle all windows", [new Key("ArrowUp")], "keydown", true, false, ['close','open'], KeyboardShortcut.true, function(){return Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, function(){return Setting.findValue(Setting.ALLOW_PALETTE_EDITING) || Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => {eagle.toggleWindows();}),
            new KeyboardShortcut("open_settings", "Open setting", [new Key("o")], "keydown", true, false, ['menu','options'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.smartToggleModal('settingsModal');}),
            new KeyboardShortcut("open_help", "Open Online Documentation", [new Key("h")], "keydown", true, false, ['read me','guide','documentation'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.onlineDocs();}),
            new KeyboardShortcut("open_keyboard_shortcut_modal", "Open Keyboard Shortcut Modal", [new Key("k")], "keydown", true, false, ['shortcuts'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.smartToggleModal('shortcutsModal')}),
            new KeyboardShortcut("open_parameter_table", "Open Parameter Table Modal", [new Key("t")], "keydown", true, false, ['fields','field','node','table'], KeyboardShortcut.true, KeyboardShortcut.notInStudentMode, KeyboardShortcut.notInStudentMode, (eagle): void => {ParameterTable.toggleTable(Eagle.BottomWindowMode.NodeParameterTable, ParameterTable.SelectType.Normal);}),
            new KeyboardShortcut("open_graph_attributes_configuration_table", "Open Graph Attributes Configuration Table Modal", [new Key("t", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['fields','field','node','graph','table','favourites'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {ParameterTable.toggleTable(Eagle.BottomWindowMode.ConfigParameterTable, ParameterTable.SelectType.Normal);}),
            new KeyboardShortcut("undo", "Undo", [new Key("z")], "keydown", true, false, ['back','history'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.undo().prevSnapshot(eagle)}),
            new KeyboardShortcut("redo", "Redo", [new Key("z", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['forward','history'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {eagle.undo().nextSnapshot(eagle)}),
            new KeyboardShortcut("check_graph", "Check Graph", [new Key("!", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, ['error','errors','fix'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => {eagle.showGraphErrors();}),
            new KeyboardShortcut("open_repository", "Open Repository", [new Key("1")], "keydown", true, false, ['tab','tabs','window','menu','right'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.changeRightWindowMode(Eagle.RightWindowMode.Repository)}),
            new KeyboardShortcut("open_translation", "Open Translation", [new Key("3")], "keydown", true, false, ['tab','tabs','window','menu','right'], KeyboardShortcut.true, function(){return Setting.findValue(Setting.USER_TRANSLATOR_MODE) != Setting.TranslatorMode.Minimal}, function(){return Setting.findValue(Setting.USER_TRANSLATOR_MODE) != Setting.TranslatorMode.Minimal}, (eagle): void => { eagle.changeRightWindowMode(Eagle.RightWindowMode.TranslationMenu)}),
            new KeyboardShortcut("open_hierarchy", "Open Hierarchy", [new Key("2")], "keydown", true, false, ['tab','tabs','window','menu','right'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => { eagle.changeRightWindowMode(Eagle.RightWindowMode.Hierarchy)}),
            new KeyboardShortcut("check_for_component_updates", "Check for Component Updates", [new Key("q")], "keydown", true, false, ['nodes'], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, function(){return KeyboardShortcut.graphNotEmpty && Setting.findValue(Setting.ALLOW_GRAPH_EDITING)}, (eagle): void => { eagle.checkForComponentUpdates(); }),
            new KeyboardShortcut("copy_from_graph_without_children", "Copy from graph without children", [new Key("c", KeyboardShortcut.Modifier.Shift)], "keydown", true, false, [''], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.copySelectionToClipboard(false); }),
            new KeyboardShortcut("copy_from_graph", "Copy from graph", [new Key("c", KeyboardShortcut.Modifier.Ctrl)], "keydown", true, false, [''], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.copySelectionToClipboard(true); }),
            new KeyboardShortcut("paste_to_graph", "Paste to graph", [new Key("v", KeyboardShortcut.Modifier.Ctrl)], "keydown", true, false, [''], KeyboardShortcut.true,  KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { eagle.pasteFromClipboard(); }),
            new KeyboardShortcut("select_all_in_graph", "Select all in graph", [new Key("a", KeyboardShortcut.Modifier.Ctrl)], "keydown", true, false, [''], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.graphNotEmpty, (eagle): void => { eagle.selectAllInGraph(); }),
            new KeyboardShortcut("select_none_in_graph", "Select none in graph", [new Key("Escape")], "keydown", true, false, ['deselect'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.somethingIsSelected, (eagle): void => { eagle.selectNoneInGraph(); }),
            new KeyboardShortcut("fix_all", "Fix all errors in graph", [new Key("f")], "keydown", true, false, [''], KeyboardShortcut.true, KeyboardShortcut.allowGraphEditing, KeyboardShortcut.allowGraphEditing, (eagle): void => { Errors.fixAll(); }),
            new KeyboardShortcut("open_graph_configurations_table", "Open Graph Configurations Table Modal", [new Key("t", KeyboardShortcut.Modifier.Alt), new Key("t", KeyboardShortcut.Modifier.Ctrl)], "keydown", true, false, ['config','graph','table'], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.true, (eagle): void => {GraphConfigurationsTable.toggleTable();}),

            new KeyboardShortcut("quick_action", "Quick Action", [new Key("`"), new Key("\\")], "keydown", true, false, [''], KeyboardShortcut.true, KeyboardShortcut.true, KeyboardShortcut.quickActionsClosed, (eagle): void => { QuickActions.initiateQuickAction();}),
            // shortcuts for use while an input element in focused (inputOK: true)
         ];
    }

    static getQuickActions() : KeyboardShortcut[] {
        return [
            KeyboardShortcut.QUICK_ACTION("quickIntroTut", "Start UI Quick Intro Tutorial", ['ui','interface'], (eagle): void => {TutorialSystem.initiateTutorial('Quick Start');}),
            KeyboardShortcut.QUICK_ACTION("graphBuildingTut", "Start Graph Building Tutorial", [], (eagle): void => {TutorialSystem.initiateTutorial('Graph Building');}),
            KeyboardShortcut.QUICK_ACTION("graphConfigTut", "Start Graph Configuration Tutorial", [], (eagle): void => {TutorialSystem.initiateTutorial('Graph Configurations');}),
            KeyboardShortcut.QUICK_ACTION("savePaletteLocally", "Save Palette Locally", [], (eagle): void => {eagle.saveFileToLocal(Eagle.FileType.Palette);}),
            KeyboardShortcut.QUICK_ACTION("createNewPaletteFromJson", "Create New Palette From Json", [], (eagle): void => {eagle.newPaletteFromJson();}),
            KeyboardShortcut.QUICK_ACTION("savePaletteAs", "Save Palette To Git", ['save as '], (eagle): void => {eagle.commitToGitAs(Eagle.FileType.Palette);}),
            KeyboardShortcut.QUICK_ACTION("loadFromRepository", "Load From Repository", [], (eagle): void => {SideWindow.setShown('right',true);eagle.changeRightWindowMode(Eagle.RightWindowMode.Repository);}),
            KeyboardShortcut.QUICK_ACTION("createNewGraphFromJson", "Create New Graph From Json", [], (eagle): void => {eagle.newLogicalGraphFromJson();}),
            KeyboardShortcut.QUICK_ACTION("addToGraphFromJson", "Add To Graph From Json", [], (eagle): void => {eagle.addToGraphFromJson();}),
            KeyboardShortcut.QUICK_ACTION("displayGraphAsJson", "Display Graph As Json", [], (eagle): void => {eagle.displayObjectAsJson(Eagle.FileType.Graph);}),
            KeyboardShortcut.QUICK_ACTION("aboutEagle", "About Eagle", [], (eagle): void => {eagle.showAbout();}),
            KeyboardShortcut.QUICK_ACTION("gitHubReadme", "GitHub ReadMe", [], (eagle): void => {eagle.readme();}),
            KeyboardShortcut.QUICK_ACTION("submitIssue", "Submit GitHub Issue", [], (eagle): void => {eagle.submitIssue();}),
            KeyboardShortcut.QUICK_ACTION("graphInfo", "Show Graph Info", [], (eagle): void => {Utils.showModelDataModal('Graph Info', eagle.logicalGraph().fileInfo());}),
            KeyboardShortcut.QUICK_ACTION("copyGraphUrl", "Copy Graph Url", [], (eagle): void => {eagle.copyGraphUrl();}),
            KeyboardShortcut.QUICK_ACTION("addSelectedNodeToPalette", "Add Selected Nodes To Palette", [], (eagle): void => {eagle.addSelectedNodesToPalette('normal');}),
            KeyboardShortcut.QUICK_ACTION("screenshotGraph", "Save Graph as PNG (Screenshot)", ['print','printScreen','screen','save','png'], (eagle): void => {eagle.saveGraphScreenshot();}),

            //docs
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_load_a_palette", "Loading a Palette", ['documentation','help'], 'https://eagle-dlg.readthedocs.io/en/master/quickStart2.html#loading-a-palette'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_creating_a_graph", "Creating a Graph", ['documentation','help'], 'https://eagle-dlg.readthedocs.io/en/master/quickStart2.html#creating-a-new-graph'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_saving_graph_to_github", "Saving a Graph To Github", ['documentation','help'], 'https://eagle-dlg.readthedocs.io/en/master/quickStart2.html#saving-a-graph-to-github'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_ui_modes", "UI Modes", ['documentation','help','settings'], 'https://eagle-dlg.readthedocs.io/en/master/settings.html#ui-modes'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_settings", "Settings", ['documentation','help','settings'], 'https://eagle-dlg.readthedocs.io/en/master/settings.html#'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_quickStart", "Quick Start", ['documentation','help','set up'], 'https://eagle-dlg.readthedocs.io/en/master/quickStart2.html'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_helloWorldExample", "Hello World Example", ['documentation','help','tutorial'], 'https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_graphCreation", "Graph Creation", ['documentation','help','tutorial'], 'https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#graph-creation'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_savingGraphToGitHub", "Saving a Graph To Github", ['documentation','help','tutorial'], 'https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#saving-a-graph-to-github'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_translatingAGraph", "Translating a Graph", ['documentation','help','tutorial'],'https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#translating-a-graph'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_executingAGraph", "Executing a Graph",  ['documentation','help','tutorial'], 'https://eagle-dlg.readthedocs.io/en/master/helloWorld.html#executing-a-graph'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_components", "Components", ['documentation','help'], 'https://eagle-dlg.readthedocs.io/en/master/components.html'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_dockerComponents", "Creating Docker Components", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/components.html#creating-components-for-docker-images'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_notesOnDockerImages", "Notes On Docker Images", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/components.html#important-notes-on-docker-images'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_linkingComponentsWithEdges", "Linking Components With Edges", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/components.html#linking-components-with-edges'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_environmentVariables", "Environment Variables", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/components.html#environment-variables'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_palettes", "Palettes", ['documentation','help'], 'https://eagle-dlg.readthedocs.io/en/master/palettes.html'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_creatingPalettesAutomaticallyFromSourceCode", "Creating Palettes Automatically From Source Code", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/palettes.html#creating-palettes-automatically-from-source-code'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_creatingPalettesWithinEagle", "Creating Palettes From Within Eagle", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/palettes.html#creating-palettes-automatically-from-source-code'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_templatesAndGraphs", "Templates And Graphs", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/graphs.html'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_logicalGraphTemplate", "Logical Graph Template", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/graphs.html#logical-graph-template'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_logicalGraph", "Logical Graph", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/graphs.html#logical-graph'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_physicalGraphTemplate", "Physical Graph Template", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/graphs.html#physical-graph-template'),
            KeyboardShortcut.QUICK_ACTION_DOCS("docs_physicalGraph", "Physical Graph", ['documentation','help','components'], 'https://eagle-dlg.readthedocs.io/en/master/graphs.html#physical-graph'),
        ];
    }

    static findById(id: string) : KeyboardShortcut {
        for (const shortcut of Eagle.shortcuts){
            if (shortcut.id === id){
                return shortcut;
            }
        }
        console.warn("Could not find keyboard shortcut with id", id);
        return null;
    }

    static idToName(id: string): string {
        const ks = KeyboardShortcut.findById(id);
        return ks ? ks.name : "";
    }

    // TODO: maybe idToShortcut is a better name?
    static idToText(id: string, addBrackets: boolean): string {
        const ks = KeyboardShortcut.findById(id);
        return ks ? ks.getText(addBrackets) : "";
    }

    static idToRun(id: string): (eagle: Eagle, event: KeyboardEvent) => void {
        const ks = KeyboardShortcut.findById(id);
        return ks ? ks.run : undefined;
    }

    static detectPlatform(): KeyboardShortcut.Platform {
        // if a browser has no support for navigator.userAgentData.platform use platform as fallback
        let userAgent = (<any>navigator)?.userAgentData?.platform?.toLowerCase();
        if (typeof userAgent === "undefined"){
            userAgent = navigator.platform.toLowerCase();
        }

        if (userAgent.includes('win')) {
            return KeyboardShortcut.Platform.Windows;
        } else if (userAgent.includes('mac')) {
            return KeyboardShortcut.Platform.Mac;
        } else if (userAgent.includes('linux')) {
            return KeyboardShortcut.Platform.Linux;
        }
        return KeyboardShortcut.Platform.Unknown;
    }

    static modifierOKForPlatform(modifier: KeyboardShortcut.Modifier, platform: KeyboardShortcut.Platform): boolean {
        // TODO: anything we should do for Linux?

        if (modifier === KeyboardShortcut.Modifier.Ctrl && platform === KeyboardShortcut.Platform.Windows){
            return false;
        }
        if (modifier === KeyboardShortcut.Modifier.Alt && platform === KeyboardShortcut.Platform.Mac){
            return false;
        }

        return true;
    }
}

export namespace KeyboardShortcut{
    export enum Modifier {
        Alt = "Alt",
        Ctrl = "Ctrl",
        Meta = "Meta",
        Shift = "Shift",
        None = "None",
        MetaShift = "Meta + Shift",
    }

    export enum Platform {
        All = "All",
        Linux = "Linux",
        Mac = "Mac",
        Windows = "Windows",
        Unknown = "Unknown"
    }
}
