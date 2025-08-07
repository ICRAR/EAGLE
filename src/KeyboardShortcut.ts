import { Eagle } from './Eagle';
import { Errors } from './Errors';
import { ParameterTable } from './ParameterTable';
import { QuickActions } from './QuickActions';
import { TutorialSystem } from './Tutorial';
import { Utils } from './Utils';
import { GraphRenderer } from './GraphRenderer';
import { GraphConfigurationsTable } from './GraphConfigurationsTable';
import { SideWindow } from './SideWindow';

enum Modifier {
    Alt = "Alt",
    Ctrl = "Ctrl",
    Meta = "Meta",
    Shift = "Shift",
    None = "None",
    MetaShift = "Meta + Shift",
}

class Key {
    key: string;
    modifier: Modifier;

    constructor(key: string, modifier: Modifier = Modifier.None){
        this.key = key;
        this.modifier = modifier;
    }
}

export class KeyboardShortcut {
    id: string;
    text: string;
    keys: Key[];
    eventType: string;
    tags: string[];           // tags or key words that are associated with the function to help searchability
    icon: string;
    run: (eagle: Eagle, event: KeyboardEvent) => void;

    constructor(options: KeyboardShortcut.Options){
        this.id = options.id;
        this.text = options.text;
        this.run = options.run;

        if ("keys" in options){
            this.keys = options.keys;
            this.eventType = "keydown";
        } else {
            this.keys = [];
            this.eventType = "";
        }
        if ("tags" in options){
            this.tags = options.tags;
        } else {
            this.tags = [];
        }
        if ("icon" in options){
            this.icon = options.icon;
        } else {
            this.icon = "build";
        }
    }

    getKeysText(addBrackets: boolean): string {
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
            if (key.modifier !== Modifier.None){
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
            return "[ " + texts.join(' or ') + " ]";       
        } else {
            return texts.join(' or ');
        }
    }

    static QUICK_ACTION_DOCS(id: string, text: string, tags: string[], url: string): KeyboardShortcut {
        return new KeyboardShortcut({
            id: id,
            text: text,
            tags: tags,
            icon: "book",
            run: (eagle): void => {QuickActions.quickOpenDocsLink(url);}
        });
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
        const editorModalOpen = $("#inputCodeModal").hasClass("show");

        // loop through all the keyboard shortcuts here
        for (const shortcut of KeyboardShortcut.shortcuts){
            // check that the event is of the correct type
            if (e.type !== shortcut.eventType){
                continue;
            }

            // if an input element is focussed, check that it's OK to run this shortcut
            if (inputElementInFocus || editorModalOpen){
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
                    case Modifier.None:
                        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey){
                            continue;
                        }
                        break;
                    case Modifier.Alt:
                        //alt seems useless as is because mac uses that key to type special characters("alt + i" cannot be used as a shortcut because the event key passed would be "ˆ")
                        if (!e.altKey || e.shiftKey || e.metaKey || e.ctrlKey){
                            continue;
                        }
                        break;
                    case Modifier.Ctrl:
                        if (!e.ctrlKey || e.metaKey || e.altKey || e.shiftKey){
                            continue;
                        }
                        break;
                    case Modifier.Meta:
                        if (!e.metaKey || e.altKey || e.shiftKey || e.ctrlKey){
                            continue;
                        }
                        break;
                    case Modifier.Shift:
                        if (!e.shiftKey || e.altKey || e.metaKey || e.ctrlKey){
                            continue;
                        }
                        break;
                    case Modifier.MetaShift:
                        if (!e.shiftKey || !e.metaKey || e.ctrlKey || e.altKey){
                            continue;
                        }
                        break;
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

    // TODO: check all tags, remove words that appear in the name, since I think they are already part of the search?
    // TODO: could this be a [id: string]: KeyboardShortcut (dictionary)?
    static shortcuts: KeyboardShortcut[] = [
        // new
        new KeyboardShortcut({
            id: "new_graph",
            text: "New Graph",
            keys: [new Key("n")],
            tags: ['create','canvas'],
            run: (eagle): void => {eagle.newLogicalGraph();}
        }),
        new KeyboardShortcut({
            id: "new_palette",
            text: "New palette",
            keys: [new Key("n", Modifier.Shift)],
            tags: ['create'],
            run: (eagle): void => {eagle.newPalette();}
        }),
        new KeyboardShortcut({
            id: "new_config",
            text: "New config",
            keys: [new Key("n", Modifier.Alt), new Key("n", Modifier.Ctrl)],
            tags: ['create'],
            run: (eagle): void => {eagle.newConfig();}
        }),
        // json
        new KeyboardShortcut({
            id: "add_to_graph_from_json",
            text: "Add To Graph From Json",
            run: (eagle): void => {eagle.addToGraphFromJson();}
        }),
        new KeyboardShortcut({
            id: "create_new_graph_from_json",
            text: "Create New Graph From Json",
            run: (eagle): void => {eagle.newLogicalGraphFromJson();}
        }),
        new KeyboardShortcut({
            id: "create_new_palette_from_json",
            text: "Create New Palette From Json",
            run: (eagle): void => {eagle.newPaletteFromJson();}
        }),
        new KeyboardShortcut({
            id: "display_graph_as_json",
            text: "Display Graph As Json",
            run: (eagle): void => {eagle.displayObjectAsJson(Eagle.FileType.Graph, eagle.logicalGraph());}
        }),
        // load/save
        // TODO: this one (open_graph_from_repo) does almost nothing! we should have a real modal
        new KeyboardShortcut({
            id: "open_graph_from_repo",
            text: "Open Graph From Repo",
            keys: [new Key("g")],
            tags: ['git','repository','github','gitlab','load','canvas'],
            run: (eagle): void => {eagle.changeRightWindowMode(Eagle.RightWindowMode.Repository); SideWindow.setShown('right',true);}
        }),
        new KeyboardShortcut({
            id: "open_graph_from_local_disk",
            text: "Open Graph From Local Disk",
            keys: [new Key("g", Modifier.Shift)],
            tags: ['upload','load','canvas'],
            run: (eagle): void => {eagle.getGraphFileToLoad();}
        }),
        new KeyboardShortcut({
            id: "open_palette_from_repo",
            text: "Open Palette From Repo",
            keys: [new Key("p")],
            tags: ['git','repository','github','gitlab','load','template'],
            run: (eagle): void => {eagle.changeRightWindowMode(Eagle.RightWindowMode.Repository);SideWindow.setShown('right',true);}
        }),
        new KeyboardShortcut({
            id: "open_palette_from_local_disk",
            text: "Open Palette From Local Disk",
            keys: [new Key("p", Modifier.Shift)],
            tags: ['template', 'upload'],
            run: (eagle): void => {eagle.getPaletteFileToLoad();}
        }),

        new KeyboardShortcut({
            id: "save_graph_to_repo",
            text: "Save Graph To Repo",
            tags: ['git'],
            run: (eagle): void => {eagle.commitToGit(Eagle.FileType.Graph);}
        }),
        new KeyboardShortcut({
            id: "save_graph_to_repo_as",
            text: "Save Graph To Repo As",
            tags: ['git'],
            run: (eagle): void => {eagle.commitToGitAs(Eagle.FileType.Graph);}
        }),
        new KeyboardShortcut({
            id: "save_palette_to_repo",
            text: "Save Palette To Repo",
            tags: ['git'],
            run: (eagle): void => {eagle.commitToGit(Eagle.FileType.Palette);}
        }),
        new KeyboardShortcut({
            id: "save_palette_to_repo_as",
            text: "Save Palette To Repo As",
            tags: ['git'],
            run: (eagle): void => {eagle.commitToGitAs(Eagle.FileType.Palette);}
        }),
        new KeyboardShortcut({
            id: "save_graph_to_local_disk",
            text: "Save Graph To Local Disk",
            run: (eagle): void => {eagle.saveFileToLocal(Eagle.FileType.Graph);}
        }),
        new KeyboardShortcut({
            id: "save_graph_to_local_disk_as",
            text: "Save Graph To Local Disk As",
            run: (eagle): void => {eagle.saveAsFileToLocal(Eagle.FileType.Graph);}
        }),
        new KeyboardShortcut({
            id: "save_palette_to_local_disk",
            text: "Save Palette To Local Disk",
            run: (eagle): void => {eagle.saveFileToLocal(Eagle.FileType.Palette);}
        }),
        new KeyboardShortcut({
            id: "save_palette_to_local_disk_as",
            text: "Save Palette To Local Disk As",
            run: (eagle): void => {eagle.saveAsFileToLocal(Eagle.FileType.Palette);}
        }),

        // these are "smart saves", that use the current graph location (local or git), to save again in the same place
        new KeyboardShortcut({
            id: "save_graph",
            text: "Save Graph",
            keys: [new Key("s")],
            tags: ['canvas','commit','github','repository','gitlab'],
            run: (eagle): void => {eagle.saveGraph();}
        }),
        new KeyboardShortcut({
            id: "save_as_graph",
            text: "Save Graph As",
            keys: [new Key("s", Modifier.Shift)],
            tags: ['download','canvas'],
            run: (eagle): void => {eagle.saveGraphAs()}
        }),
        // TODO: two for palettes

        // misc
        new KeyboardShortcut({
            id: "add_graph_nodes_to_palette",
            text: "Add Graph Nodes To Palette",
            keys: [new Key("a")],
            tags: ['template','canvas'],
            run: (eagle): void => {eagle.addGraphNodesToPalette();}
        }),
        new KeyboardShortcut({
            id: "add_selected_nodes_to_palette",
            text: "Add Selected Nodes To Palette",
            run: (eagle): void => {eagle.addSelectedNodesToPalette('normal');}
        }),
        new KeyboardShortcut({
            id: "toggle_inspector",
            text: "Toggle Inspector",
            keys: [new Key("i")],
            tags: ['information'],
            run: (eagle): void => {eagle.toggleInspectorCollapsedState();}
        }),
        new KeyboardShortcut({
            id: "insert_graph_from_local_disk",
            text: "Insert graph from local disk",
            keys: [new Key("i", Modifier.Shift)],
            tags: ['canvas','subGraph','upload'],
            run: (eagle): void => {eagle.getGraphFileToInsert();}
        }),
        new KeyboardShortcut({
            id: "deploy_translator",
            text: "Generate PGT Using Default Algorithm",
            keys: [new Key("d", Modifier.Shift)],
            tags: ['deploy','translate','translator'],
            run: (eagle): void => {eagle.deployDefaultTranslationAlgorithm();}
        }),
        new KeyboardShortcut({
            id: "delete_selection",
            text: "Delete Selection",
            keys: [new Key("Delete"), new Key("Backspace")],
            tags: ['remove'],
            run: (eagle): void => {eagle.deleteSelection(false, false, true);}
        }),
        new KeyboardShortcut({
            id: "delete_selection_except_children",
            text: "Delete Without Children",
            keys: [new Key("Backspace", Modifier.Shift), new Key("Delete", Modifier.Shift)],
            tags: ['remove'],
            run: (eagle): void => {eagle.deleteSelection(false, false, false);}
        }),
        new KeyboardShortcut({
            id: "duplicate_selection",
            text: "Duplicate Selection",
            keys: [new Key("d")],
            tags: ['copy'],
            run: (eagle): void => {eagle.duplicateSelection('normal');}
        }),
        new KeyboardShortcut({
            id: "create_subgraph_from_selection",
            text: "Create subgraph from selection",
            keys: [new Key("[")],
            tags: ['group'],
            run: (eagle): void => {eagle.createSubgraphFromSelection();}
        }),
        new KeyboardShortcut({
            id: "create_construct_from_selection",
            text: "Create construct from selection",
            keys: [new Key("]")],
            tags: ['group'],
            run: (eagle): void => {eagle.createConstructFromSelection();}
        }),
        new KeyboardShortcut({
            id: "change_selected_node_parent",
            text: "Change Selected Node Parent",
            keys: [new Key("u")],
            run: (eagle): void => {eagle.changeNodeParent();}
        }),
        new KeyboardShortcut({
            id: "connect_comment_node",
            text: "Connect comment node",
            keys: [new Key("u", Modifier.Shift)],
            tags: ['comment'],
            run: (eagle): void => {eagle.changeNodeSubject();}
        }),
        new KeyboardShortcut({
            id: "center_graph",
            text: "Center Graph",
            keys: [new Key("c")],
            tags: ['canvas','reset','controls'],
            icon: "filter_center_focus",
            run: (eagle): void => {eagle.centerGraph();}
        }),
        new KeyboardShortcut({
            id: "center_construct_around_children",
            text: "Center Construct Around Children",
            keys: [new Key("c", Modifier.Shift)],
            tags: ['fit'],
            run: (eagle): void => {GraphRenderer.centerConstruct(eagle.selectedNode(),eagle.logicalGraph().getNodes())}
        }),
        new KeyboardShortcut({
            id: "check_for_component_updates",
            text: "Check for Component Updates",
            keys: [new Key("q")],
            tags: ['nodes'],
            run: (eagle): void => { eagle.checkForComponentUpdates();}
        }),
        new KeyboardShortcut({
            id: "screenshot_graph",
            text: "Save Graph as PNG (Screenshot)",
            tags: ['print','printScreen','screen'],
            icon: "photo_camera",
            run: (eagle): void => {eagle.saveGraphScreenshot();}
        }),
        new KeyboardShortcut({
            id: "show_graph_info",
            text: "Show Graph Info",
            icon: "info",
            run: (eagle): void => {Utils.showModelDataModal('Graph Info', eagle.logicalGraph().fileInfo());}
        }),
        new KeyboardShortcut({
            id: "copy_graph_url",
            text: "Copy Graph Url",
            icon: "content_copy",
            run: (eagle): void => {eagle.copyGraphUrl();}
        }),
        new KeyboardShortcut({
            id: "toggle_all_palettes",
            text: "Toggle All Palettes",
            tags: ['open','close','collapse','expand'],
            run: (eagle):void => {eagle.toggleAllPalettes();}
        }),

        // window management
        new KeyboardShortcut({
            id: "toggle_left_window",
            text: "Toggle left window",
            keys: [new Key("ArrowLeft")],
            tags: ['close','open'],
            run:  (eagle): void => {SideWindow.toggleShown('left');}
        }),
        new KeyboardShortcut({
            id: "toggle_right_window",
            text: "Toggle right window",
            keys: [new Key("ArrowRight")],
            tags: ['close','open'],
            run: (eagle): void => {SideWindow.toggleShown('right')}
        }),
        new KeyboardShortcut({
            id: "toggle_bottom_window",
            text: "Toggle bottom window",
            keys: [new Key("ArrowDown")],
            tags: ['close','open'],
            run: (eagle): void => {SideWindow.toggleShown('bottom')}
        }),
        new KeyboardShortcut({
            id: "toggle_all_window",
            text: "Toggle all windows",
            keys: [new Key("ArrowUp")],
            tags: ['close','open'],
            run: (eagle): void => {eagle.toggleWindows();}
        }),
        new KeyboardShortcut({
            id: "open_keyboard_shortcut_modal",
            text: "Open Keyboard Shortcut Modal",
            keys: [new Key("k")],
            tags: ['shortcuts'],
            run: (eagle): void => {eagle.smartToggleModal('shortcutsModal')}
        }),
        new KeyboardShortcut({
            id: "open_parameter_table",
            text: "Open Parameter Table",
            keys: [new Key("t")],
            tags: ['fields','field','node'],
            run: (eagle): void => {ParameterTable.toggleTable(Eagle.BottomWindowMode.NodeParameterTable, ParameterTable.SelectType.Normal);}
        }),
        new KeyboardShortcut({
            id: "open_graph_attributes_configuration_table",
            text: "Open Graph Attributes Configuration Table",
            keys: [new Key("t", Modifier.Shift)],
            tags: ['fields','field','node','favourites','favorites'],
            run: (eagle): void => {ParameterTable.toggleTable(Eagle.BottomWindowMode.ConfigParameterTable, ParameterTable.SelectType.Normal);}
        }),
        new KeyboardShortcut({
            id: "open_graph_configurations_table",
            text: "Open Graph Configurations Table",
            keys: [new Key("t", Modifier.Alt), new Key("t", Modifier.Ctrl)],
            run: (eagle): void => {GraphConfigurationsTable.toggleTable();}
        }),
        new KeyboardShortcut({
            id: "open_repository_tab",
            text: "Open Repository",
            keys: [new Key("1")],
            tags: ['tab','tabs','window','menu','right'],
            run: (eagle): void => {eagle.changeRightWindowMode(Eagle.RightWindowMode.Repository)}
        }),
        new KeyboardShortcut({
            id: "open_translation_tab",
            text: "Open Translation",
            keys: [new Key("3")],
            tags: ['tab','tabs','window','menu','right'],
            run: (eagle): void => {eagle.changeRightWindowMode(Eagle.RightWindowMode.TranslationMenu)}
        }),
        new KeyboardShortcut({
            id: "open_hierarchy_tab",
            text: "Open Hierarchy",
            keys: [new Key("2")],
            tags: ['tab','tabs','window','menu','right'],
            run: (eagle): void => {eagle.changeRightWindowMode(Eagle.RightWindowMode.Hierarchy)}
        }),

        // undo/redo
        new KeyboardShortcut({
            id: "undo",
            text: "Undo",
            keys: [new Key("z")],
            tags: ['back','history'],
            run: (eagle): void => {eagle.undo().prevSnapshot(eagle)}
        }),
        new KeyboardShortcut({
            id: "redo",
            text: "Redo",
            keys: [new Key("z", Modifier.Shift)],
            tags: ['forward','history'],
            run: (eagle): void => {eagle.undo().nextSnapshot(eagle)}
        }),

        // copy/paste
        new KeyboardShortcut({
            id: "copy_from_graph_without_children",
            text: "Copy from graph without children",
            keys: [new Key("c", Modifier.Shift)],
            run: (eagle): void => {eagle.copySelectionToClipboard(false);}
        }),
        new KeyboardShortcut({
            id: "copy_from_graph",
            text: "Copy from graph",
            keys: [new Key("c", Modifier.Ctrl), new Key("c", Modifier.Alt)],
            run: (eagle): void => {eagle.copySelectionToClipboard(true);}
        }),
        new KeyboardShortcut({
            id: "paste_to_graph",
            text: "Paste to graph",
            keys: [new Key("v", Modifier.Ctrl), new Key("v", Modifier.Alt)],
            run: (eagle): void => {eagle.pasteFromClipboard();}
        }),

        // selection
        new KeyboardShortcut({
            id: "select_all_in_graph",
            text: "Select all in graph",
            keys: [new Key("a", Modifier.Ctrl),new Key("a", Modifier.Alt)],
            run: (eagle): void => { eagle.selectAllInGraph();}
        }),
        new KeyboardShortcut({
            id: "select_none_in_graph",
            text: "Select none in graph",
            keys: [new Key("Escape")],
            tags: ['deselect'],
            run: (eagle): void => { eagle.selectNoneInGraph();}
        }),

        // checking and fixing
        new KeyboardShortcut({
            id: "check_graph",
            text: "Check Graph",
            keys: [new Key("!", Modifier.Shift)],
            tags: ['error','errors','fix'],
            run: (eagle): void => {eagle.showGraphErrors();}
        }),
        new KeyboardShortcut({
            id: "fix_all",
            text: "Fix all errors in graph",
            keys: [new Key("f")],
            run: (eagle): void => { Errors.fixAll(); }
        }),
        new KeyboardShortcut({
            id: "quick_action",
            text: "Quick Action",
            keys: [new Key("`"), new Key("\\")],
            run: (eagle): void => {QuickActions.initiateQuickAction();}
        }),

        // help menu
        new KeyboardShortcut({
            id: "open_help",
            text: "Open Online Documentation",
            keys: [new Key("h")],
            tags: ['read','me','guide','help'],
            run: (eagle): void => {eagle.onlineDocs();}
        }),
        new KeyboardShortcut({
            id: "show_about_eagle",
            text: "About Eagle",
            run: (eagle): void => {eagle.showAbout();}
        }),
        new KeyboardShortcut({
            id: "show_github_readme",
            text: "Show GitHub ReadMe",
            run: (eagle): void => {eagle.readme();}
        }),
        new KeyboardShortcut({
            id: "submit_issue",
            text: "Submit GitHub Issue",
            tags: ['bug','report'],
            run: (eagle): void => {eagle.submitIssue();}
        }),
        new KeyboardShortcut({
            id: "open_keyboard_shortcuts",
            text: "Open Keyboard Shortcut",
            run: (eagle): void => {Utils.showShortcutsModal();}
        }),
        new KeyboardShortcut({
            id: "show_online_docs",
            text: "Show Online Documentation",
            tags: ['docs'],
            icon: "book",
            run: (eagle): void => {eagle.onlineDocs();}
        }),
        new KeyboardShortcut({
            id: "show_settings",
            text: "Open setting",
            keys: [new Key("o")],
            tags: ['menu','options'],
            icon: "settings",
            run: (eagle): void => {eagle.smartToggleModal('settingsModal');}
        }),

        // tutorials
        new KeyboardShortcut({
            id: "quick_intro_tutorial",
            text: "Start UI Quick Intro Tutorial",
            tags: ['ui','interface'],
            icon: 'question_mark',
            run: (eagle): void => {TutorialSystem.initiateTutorial('Quick Start');}
        }),
        new KeyboardShortcut({
            id: "graph_building_tutorial",
            text: "Start Graph Building Tutorial",
            icon: 'question_mark',
            run: (eagle): void => {TutorialSystem.initiateTutorial('Graph Building');}
        }),
        new KeyboardShortcut({
            id: "graph_config_tutorial",
            text: "Start Graph Configuration Tutorial",
            icon: 'question_mark',
            run: (eagle): void => {TutorialSystem.initiateTutorial('Graph Configurations');}
        }),
    ];

    static quickActions: KeyboardShortcut[] = [
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

    static findById(id: string) : KeyboardShortcut {
        for (const shortcut of KeyboardShortcut.shortcuts){
            if (shortcut.id === id){
                return shortcut;
            }
        }
        console.warn("Could not find keyboard shortcut with id", id);
        return null;
    }

    static idToText(id: string): string {
        const ks = KeyboardShortcut.findById(id);
        return ks ? ks.text : "";
    }

    static idToKeysText(id: string, addBrackets: boolean): string {
        const ks = KeyboardShortcut.findById(id);
        return ks ? ks.getKeysText(addBrackets) : "";
    }

    static idToFullText(id: string){
        const ks = KeyboardShortcut.findById(id);
        return ks ? ks.text + ' ' + ks.getKeysText(true) : "";
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

    static modifierOKForPlatform(modifier: Modifier, platform: KeyboardShortcut.Platform): boolean {
        // TODO: anything we should do for Linux?

        if (modifier === Modifier.Ctrl && platform === KeyboardShortcut.Platform.Windows){
            return false;
        }
        if (modifier === Modifier.Alt && platform === KeyboardShortcut.Platform.Mac){
            return false;
        }

        return true;
    }
}

export namespace KeyboardShortcut{
    export enum Platform {
        All = "All",
        Linux = "Linux",
        Mac = "Mac",
        Windows = "Windows",
        Unknown = "Unknown"
    }

    export interface Options {
        id: string,
        text: string,
        keys?: Key[],
        tags?: string[],
        icon?: string,
        run: (eagle: Eagle, event: KeyboardEvent) => void
    }
}
