/*
#
#    ICRAR - International Centre for Radio Astronomy Research
#    (c) UWA - The University of Western Australia, 2016
#    Copyright by UWA (in the framework of the ICRAR)
#    All rights reserved
#
#    This library is free software; you can redistribute it and/or
#    modify it under the terms of the GNU Lesser General Public
#    License as published by the Free Software Foundation; either
#    version 2.1 of the License, or (at your option) any later version.
#
#    This library is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#    Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public
#    License along with this library; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston,
#    MA 02111-1307  USA
#
*/

"use strict";

import * as ko from "knockout";
import * as ij from "intro.js";

import {Utils} from './Utils';
import {GitHub} from './GitHub';
import {GitLab} from './GitLab';
import {Repositories} from './Repositories';
import {Repository} from './Repository';
import {RepositoryFile} from './RepositoryFile';
import {Translator} from './Translator';
import {Category} from './Category';
import {CategoryData} from './CategoryData';

import {LogicalGraph} from './LogicalGraph';
import {Palette} from './Palette';
import {Node} from './Node';
import {Edge} from './Edge';
import {Field} from './Field';
import {FileInfo} from './FileInfo';
import {Setting, SettingsGroup} from './Setting';
import {KeyboardShortcut} from './KeyboardShortcut';
import {SideWindow} from './SideWindow';
import {InspectorState} from './InspectorState';
import {ExplorePalettes} from './ExplorePalettes';
import {Hierarchy} from './Hierarchy';
import {RightClick} from './RightClick';
import {Undo} from './Undo';
import {Errors} from './Errors';
import {ComponentUpdater} from './ComponentUpdater';
import {ParameterTable} from './ParameterTable';

export class Eagle {
    static _instance : Eagle;

    palettes : ko.ObservableArray<Palette>;
    logicalGraph : ko.Observable<LogicalGraph>;

    leftWindow : ko.Observable<SideWindow>;
    rightWindow : ko.Observable<SideWindow>;

    selectedObjects : ko.ObservableArray<Node|Edge>;
    static selectedLocation : ko.Observable<Eagle.FileType>;

    static selectedRightClickObject : ko.Observable<Node|Edge>;

    repositories: ko.Observable<Repositories>;
    translator : ko.Observable<Translator>;
    undo : ko.Observable<Undo>;
    parameterTable : ko.Observable<ParameterTable>;

    globalOffsetX : number;
    globalOffsetY : number;
    globalScale : number;

    inspectorState : ko.Observable<InspectorState>;

    rendererFrameDisplay : ko.Observable<string>;
    rendererFrameMax : number;
    rendererFrameCountRender : number;
    rendererFrameCountTick : number;

    explorePalettes : ko.Observable<ExplorePalettes>;

    errorsMode : ko.Observable<Eagle.ErrorsMode>;
    graphWarnings : ko.ObservableArray<Errors.Issue>;
    graphErrors : ko.ObservableArray<Errors.Issue>;
    loadingWarnings : ko.ObservableArray<Errors.Issue>;
    loadingErrors : ko.ObservableArray<Errors.Issue>;
    tableModalType : ko.Observable<string>;

    showDataNodes : ko.Observable<boolean>;

    static paletteComponentSearchString : ko.Observable<string>;
    static componentParamsSearchString : ko.Observable<string>;
    static applicationArgsSearchString : ko.Observable<string>;
    static tableSearchString : ko.Observable<string>;

    static settings : SettingsGroup[];
    static shortcuts : ko.ObservableArray<KeyboardShortcut>;

    static dragStartX : number;
    static lastClickTime : number = 0;

    static defaultTranslatorAlgorithm : string;
    static defaultTranslatorAlgorithmMethod : any;

    static nodeDropLocation : {x: number, y: number} = {x:0, y:0}; // if this remains x=0,y=0, the button has been pressed and the getNodePosition function will be used to determine a location on the canvas. if not x:0, y:0, it has been over written by the nodeDrop function as the node has been dragged into the canvas. The node will then be placed into the canvas using these co-ordinates.
    static nodeDragPaletteIndex : number;
    static nodeDragComponentIndex : number;
    static shortcutModalCooldown : number;

    constructor(){
        Eagle._instance = this;

        this.palettes = ko.observableArray();
        this.logicalGraph = ko.observable(null);

        this.leftWindow = ko.observable(new SideWindow(Eagle.LeftWindowMode.Palettes, Utils.getLeftWindowWidth(), false));
        this.rightWindow = ko.observable(new SideWindow(Eagle.RightWindowMode.Repository, Utils.getRightWindowWidth(), true));

        this.selectedObjects = ko.observableArray([]).extend({ deferred: true });
        Eagle.selectedLocation = ko.observable(Eagle.FileType.Unknown);

        Eagle.selectedRightClickObject = ko.observable();

        this.repositories = ko.observable(new Repositories());
        this.translator = ko.observable(new Translator());
        this.undo = ko.observable(new Undo());
        this.parameterTable = ko.observable(new ParameterTable());

        Eagle.componentParamsSearchString = ko.observable("");
        Eagle.paletteComponentSearchString = ko.observable("");
        Eagle.applicationArgsSearchString = ko.observable("");
        Eagle.tableSearchString = ko.observable("");

        Eagle.settings = [
            new SettingsGroup(
                "User Options",
                () => {return true;},
                [
                    new Setting("Confirm Discard Changes", "Prompt user to confirm that unsaved changes to the current file should be discarded when opening a new file, or when navigating away from EAGLE.", Setting.Type.Boolean, Utils.CONFIRM_DISCARD_CHANGES, true),
                    new Setting("Confirm Remove Repositories", "Prompt user to confirm removing a repository from the list of known repositories.", Setting.Type.Boolean, Utils.CONFIRM_REMOVE_REPOSITORES, true),
                    new Setting("Confirm Reload Palettes", "Prompt user to confirm when loading a palette that is already loaded.", Setting.Type.Boolean, Utils.CONFIRM_RELOAD_PALETTES, true),
                    new Setting("Open Default Palette on Startup", "Open a default palette on startup. The palette contains an example of all known node categories", Setting.Type.Boolean, Utils.OPEN_DEFAULT_PALETTE, true),
                    new Setting("Confirm Delete", "Prompt user to confirm when deleting node(s) or edge(s) from a graph.", Setting.Type.Boolean, Utils.CONFIRM_DELETE_OBJECTS, true),
                    new Setting("Disable JSON Validation", "Allow EAGLE to load/save/send-to-translator graphs and palettes that would normally fail validation against schema.", Setting.Type.Boolean, Utils.DISABLE_JSON_VALIDATION, false),
                    new Setting("Overwrite Existing Translator Tab", "When translating a graph, overwrite an existing translator tab", Setting.Type.Boolean, Utils.OVERWRITE_TRANSLATION_TAB, true),
                    new Setting("Show File Loading Warnings", "Display list of issues with files encountered during loading.", Setting.Type.Boolean, Utils.SHOW_FILE_LOADING_ERRORS, false),
                    new Setting("UI Mode", "User Interface Mode. Simple Mode removes palettes, uses a single graph repository, simplifies the parameters table. Expert Mode enables the display of additional settings usually reserved for advanced users", Setting.Type.Select, Utils.USER_INTERFACE_MODE, Eagle.UIMode.Default, Object.values(Eagle.UIMode)),
                ]
            ),
            new SettingsGroup(
                "UI Options",
                () => {return !Eagle.isInUIMode(Eagle.UIMode.Minimal);},
                [
                    new Setting("Show DALiuGE runtime parameters", "Show additional component arguments that modify the behaviour of the DALiuGE runtime. For example: Data Volume, Execution Time, Num CPUs, Group Start/End", Setting.Type.Boolean, Utils.SHOW_DALIUGE_RUNTIME_PARAMETERS, true),
                    new Setting("Display Node Keys","Display Node Keys", Setting.Type.Boolean, Utils.DISPLAY_NODE_KEYS, false),
                    new Setting("Hide Palette Tab", "Hide the Palette tab", Setting.Type.Boolean, Utils.HIDE_PALETTE_TAB, false),
                    new Setting("Hide Read Only Parameters", "Hide read only paramters", Setting.Type.Boolean, Utils.HIDE_READONLY_PARAMETERS, false),
                    new Setting("Translator Mode", "Configue the translator mode", Setting.Type.Select, Utils.USER_TRANSLATOR_MODE, Eagle.TranslatorMode.Default, Object.values(Eagle.TranslatorMode)),
                    new Setting("Graph Zoom Divisor", "The number by which zoom inputs are divided before being applied. Larger divisors reduce the amount of zoom.", Setting.Type.Number, Utils.GRAPH_ZOOM_DIVISOR, 1000),

                ]
            ),
            new SettingsGroup(
                "Advanced Editing",
                () => {return Eagle.isInUIMode(Eagle.UIMode.Expert);},
                [
                    new Setting("Allow Invalid edges", "Allow the user to create edges even if they would normally be determined invalid.", Setting.Type.Boolean, Utils.ALLOW_INVALID_EDGES, true),
                    new Setting("Allow Component Editing", "Allow the user to add/remove ports and parameters from components.", Setting.Type.Boolean, Utils.ALLOW_COMPONENT_EDITING, true),
                    new Setting("Allow Palette Editing", "Allow the user to edit palettes.", Setting.Type.Boolean, Utils.ALLOW_PALETTE_EDITING, true),
                    new Setting("Allow Readonly Palette Editing", "Allow the user to modify palettes that would otherwise be readonly.", Setting.Type.Boolean, Utils.ALLOW_READONLY_PALETTE_EDITING, true),
                    new Setting("Allow Edge Editing", "Allow the user to edit edge attributes.", Setting.Type.Boolean, Utils.ALLOW_EDGE_EDITING, true),
                    new Setting("Auto-suggest destination nodes", "If an edge is drawn to empty space, EAGLE will automatically suggest compatible destination nodes.", Setting.Type.Boolean, Utils.AUTO_SUGGEST_DESTINATION_NODES, true)
                ]
            ),
            new SettingsGroup(
                "External Services",
                () => {return true;},
                [
                    new Setting("Translator URL", "The URL of the translator server", Setting.Type.String, Utils.TRANSLATOR_URL, "http://localhost:8084/gen_pgt"),
                    new Setting("GitHub Access Token", "A users access token for GitHub repositories.", Setting.Type.Password, Utils.GITHUB_ACCESS_TOKEN_KEY, ""),
                    new Setting("GitLab Access Token", "A users access token for GitLab repositories.", Setting.Type.Password, Utils.GITLAB_ACCESS_TOKEN_KEY, ""),
                    new Setting("Docker Hub Username", "The username to use when retrieving data on images stored on Docker Hub", Setting.Type.String, Utils.DOCKER_HUB_USERNAME, "icrar")
                ]
            ),
            new SettingsGroup(
                "Developer",
                () => {return Eagle.isInUIMode(Eagle.UIMode.Expert);},
                [
                    new Setting("Enable Performance Display", "Display the frame time of the graph renderer", Setting.Type.Boolean, Utils.ENABLE_PERFORMANCE_DISPLAY, false),
                    new Setting("Translate with New Categories", "Replace the old categories with new names when exporting. For example, replace 'Component' with 'PythonApp' category.", Setting.Type.Boolean, Utils.TRANSLATE_WITH_NEW_CATEGORIES, false),
                    new Setting("Open Translator In Current Tab", "When translating a graph, display the output of the translator in the current tab", Setting.Type.Boolean, Utils.OPEN_TRANSLATOR_IN_CURRENT_TAB, false),
                    new Setting("Create Applications for Construct Ports", "When loading old graph files with ports on construct nodes, move the port to an embedded application", Setting.Type.Boolean, Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS, true),
                    new Setting("Skip 'closes loop' edges in JSON output", "We've recently added edges to the LinkDataArray that 'close' loop constructs and set the 'group_start' and 'group_end' automatically. In the short-term, such edges are not supported by the translator. This setting will keep the new edges during saving/loading, but remove them before sending the graph to the translator.", Setting.Type.Boolean, Utils.SKIP_CLOSE_LOOP_EDGES, true),
                    new Setting("Print Undo state to JS Console", "Prints the state of the undo memory whenever a change occurs. The state is written to the browser's javascript console", Setting.Type.Boolean, Utils.PRINT_UNDO_STATE_TO_JS_CONSOLE, false)
                ]
            )
        ];

        Eagle.shortcuts = ko.observableArray();
        Eagle.shortcuts.push(new KeyboardShortcut("new_graph", "New Graph", ["n"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.newLogicalGraph();}));
        Eagle.shortcuts.push(new KeyboardShortcut("new_palette", "New palette", ["n"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, Eagle.allowPaletteEditing, (eagle): void => {eagle.newPalette();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_graph_from_repo", "Open graph from repo", ["g"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().mode(Eagle.RightWindowMode.Repository);eagle.rightWindow().shown(true);}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_graph_from_local_disk", "Open graph from local disk", ["g"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.getGraphFileToLoad();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_palette_from_repo", "Open palette from repo", ["p"], "keydown", KeyboardShortcut.Modifier.None,KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().mode(Eagle.RightWindowMode.Repository);eagle.rightWindow().shown(true);}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_palette_from_local_disk", "Open palette from local disk", ["p"], "keydown", KeyboardShortcut.Modifier.Shift,KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.getPaletteFileToLoad();}));
        Eagle.shortcuts.push(new KeyboardShortcut("add_graph_nodes_to_palette", "Add graph nodes to palette", ["a"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.addGraphNodesToPalette();}));
        Eagle.shortcuts.push(new KeyboardShortcut("insert_graph_from_local_disk", "Insert graph from local disk", ["i"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.getGraphFileToInsert();}));
        Eagle.shortcuts.push(new KeyboardShortcut("save_graph", "Save Graph", ["s"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.graphNotEmpty, (eagle): void => {eagle.saveGraph();}));
        Eagle.shortcuts.push(new KeyboardShortcut("save_as_graph", "Save Graph As", ["s"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.graphNotEmpty, (eagle): void => {eagle.saveGraphAs()}));
        Eagle.shortcuts.push(new KeyboardShortcut("deploy_translator", "Generate PGT Using Default Algorithm", ["d"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => { eagle.deployDefaultTranslationAlgorithm(); }));
        Eagle.shortcuts.push(new KeyboardShortcut("delete_selection", "Delete Selection", ["Backspace", "Delete"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.somethingIsSelected, (eagle): void => {eagle.deleteSelection('',false, true);}));
        Eagle.shortcuts.push(new KeyboardShortcut("delete_selection_except_children", "Delete Without Children", ["Backspace", "Delete"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.somethingIsSelected, (eagle): void => {eagle.deleteSelection('',false, false);}));
        Eagle.shortcuts.push(new KeyboardShortcut("duplicate_selection", "Duplicate Selection", ["d"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.somethingIsSelected, (eagle): void => {eagle.duplicateSelection();}));
        Eagle.shortcuts.push(new KeyboardShortcut("create_subgraph_from_selection", "Create subgraph from selection", ["["], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.somethingIsSelected, (eagle): void => {eagle.createSubgraphFromSelection();}));
        Eagle.shortcuts.push(new KeyboardShortcut("create_construct_from_selection", "Create construct from selection", ["]"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.somethingIsSelected, (eagle): void => {eagle.createConstructFromSelection();}));
        Eagle.shortcuts.push(new KeyboardShortcut("change_selected_node_parent", "Change Selected Node Parent", ["f"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.nodeIsSelected, (eagle): void => {eagle.changeNodeParent();}));
        Eagle.shortcuts.push(new KeyboardShortcut("change_selected_node_subject", "Change Selected Node Subject", ["f"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.commentNodeIsSelected, (eagle): void => {eagle.changeNodeSubject();}));
        Eagle.shortcuts.push(new KeyboardShortcut("add_edge","Add Edge", ["e"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.addEdgeToLogicalGraph();}));
        Eagle.shortcuts.push(new KeyboardShortcut("modify_selected_edge","Modify Selected Edge", ["m"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.edgeIsSelected, (eagle): void => {eagle.editSelectedEdge();}));
        Eagle.shortcuts.push(new KeyboardShortcut("center_graph", "Center graph", ["c"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.centerGraph();}));
        // NB: we need two entries for zoom_in here, the first handles '+' without shift (as found on the numpad), the second handles '+' with shift (as found sharing the '=' key)
        Eagle.shortcuts.push(new KeyboardShortcut("zoom_in", "Zoom In", ["+"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.zoomIn();}));
        Eagle.shortcuts.push(new KeyboardShortcut("zoom_in", "Zoom In", ["+"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Disabled, KeyboardShortcut.true, (eagle): void => {eagle.zoomIn();}));
        Eagle.shortcuts.push(new KeyboardShortcut("zoom_out", "Zoom Out", ["-"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.zoomOut();}));
        Eagle.shortcuts.push(new KeyboardShortcut("toggle_left_window", "Toggle left window", ["l"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.leftWindow().toggleShown();}));
        Eagle.shortcuts.push(new KeyboardShortcut("toggle_right_window", "Toggle right window", ["r"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().toggleShown();}));
        Eagle.shortcuts.push(new KeyboardShortcut("toggle_both_window", "Toggle both windows", ["b"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.toggleWindows();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_settings", "Open setting", ["o"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.openSettings();}));
        Eagle.shortcuts.push(new KeyboardShortcut("close_settings", "Close setting", ["o"], "keyup", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Disabled, KeyboardShortcut.true, (eagle): void => {eagle.openSettings();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_help", "Open help", ["h"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.onlineDocs();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_keyboard_shortcut_modal", "Open Keyboard Shortcut Modal", ["k"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.openShortcuts();}));
        Eagle.shortcuts.push(new KeyboardShortcut("close_keyboard_shortcut_modal", "Close Keyboard Shortcut Modal", ["k"], "keyup", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Disabled, KeyboardShortcut.true, (eagle): void => {eagle.openShortcuts();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_component_parameter_table_modal", "Open Parameter Table Modal", ["t"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.openParamsTableModal('inspectorTableModal');}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_key_parameter_table_modal", "Open Key Parameter Table Modal", ["t"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.openParamsTableModal('keyParametersTableModal');}));
        Eagle.shortcuts.push(new KeyboardShortcut("undo", "Undo", ["z"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.undo().prevSnapshot(eagle)}));
        Eagle.shortcuts.push(new KeyboardShortcut("redo", "Redo", ["z"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.undo().nextSnapshot(eagle)}));
        Eagle.shortcuts.push(new KeyboardShortcut("check_graph", "Check Graph", ["!"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.graphNotEmpty, (eagle): void => {eagle.showGraphErrors();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_inspector", "Open Inspector", ["i"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.somethingIsSelected, (eagle): void => { this.rightWindow().shown(true).mode(Eagle.RightWindowMode.Inspector)}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_repository", "Open Repository", ["r"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => { this.rightWindow().shown(true).mode(Eagle.RightWindowMode.Repository)}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_translation", "Open Translation", [">"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => { this.rightWindow().shown(true).mode(Eagle.RightWindowMode.TranslationMenu)}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_hierarchy", "Open Hierarchy", ["h"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => { this.rightWindow().shown(true).mode(Eagle.RightWindowMode.Hierarchy)}));
        Eagle.shortcuts.push(new KeyboardShortcut("toggle_show_data_nodes", "Toggle Show Data Nodes", ["j"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => { eagle.toggleShowDataNodes(); }));
        Eagle.shortcuts.push(new KeyboardShortcut("check_for_component_updates", "Check for Component Updates", ["q"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.graphNotEmpty, (eagle): void => { eagle.checkForComponentUpdates(); }));

        this.globalOffsetX = 0;
        this.globalOffsetY = 0;
        this.globalScale = 1.0;

        this.inspectorState = ko.observable(new InspectorState());

        this.rendererFrameDisplay = ko.observable("");
        this.rendererFrameMax = 0;
        this.rendererFrameCountRender = 0;
        this.rendererFrameCountTick = 0;

        this.explorePalettes = ko.observable(new ExplorePalettes());

        this.errorsMode = ko.observable(Eagle.ErrorsMode.Loading);
        this.graphWarnings = ko.observableArray([]);
        this.graphErrors = ko.observableArray([]);
        this.loadingWarnings = ko.observableArray([]);
        this.loadingErrors = ko.observableArray([]);

        this.tableModalType = ko.observable('')

        this.showDataNodes = ko.observable(true);

        this.selectedObjects.subscribe(function(){
            this.logicalGraph.valueHasMutated();
            Hierarchy.updateDisplay()
            if(this.selectedObjects().length === 0){
                this.tableModalType('keyParametersTableModal')
            }
        }, this)

        this.rightWindow().mode.subscribe(function(newValue){
            if (newValue === Eagle.RightWindowMode.Hierarchy){
                window.setTimeout(function(){
                    Hierarchy.updateDisplay()
                }, 500)
            }
        }, this)
    }

    static getInstance = () : Eagle => {
        return Eagle._instance;
    }

    areAnyFilesModified = () : boolean => {
        // check the logical graph
        if (this.logicalGraph().fileInfo().modified){
            return true;
        }

        // check all the open palettes
        for (const palette of this.palettes()){
            if (palette.fileInfo().modified){
                return true;
            }
        }
        return false;
    }

    static allowInvalidEdges = () : boolean => {
        return Eagle.isInUIMode(Eagle.UIMode.Expert) && Setting.findValue(Utils.ALLOW_INVALID_EDGES);
    }

    static allowPaletteEditing = () : boolean => {
        return Eagle.isInUIMode(Eagle.UIMode.Expert) && Setting.findValue(Utils.ALLOW_PALETTE_EDITING);
    }

    static hidePaletteTab = () : boolean => {
        return Eagle.isInUIMode(Eagle.UIMode.Minimal) || Setting.findValue(Utils.HIDE_PALETTE_TAB);
    }

    static hideReadonlyParamters = () : boolean => {
        return Eagle.isInUIMode(Eagle.UIMode.Minimal) || Setting.findValue(Utils.HIDE_READONLY_PARAMETERS);
    }

    static allowReadonlyPaletteEditing = () : boolean => {
        return Eagle.isInUIMode(Eagle.UIMode.Expert) && Setting.findValue(Utils.ALLOW_READONLY_PALETTE_EDITING);
    }

    static allowComponentEditing = () : boolean => {
        return Eagle.isInUIMode(Eagle.UIMode.Expert) && Setting.findValue(Utils.ALLOW_COMPONENT_EDITING);
    }

    static allowEdgeEditing = (): boolean => {
        return Eagle.isInUIMode(Eagle.UIMode.Expert) && Setting.findValue(Utils.ALLOW_EDGE_EDITING);
    }

    static showDaliugeRuntimeParameters = () : boolean => {
        return Eagle.isInUIMode(Eagle.UIMode.Minimal) || Setting.findValue(Utils.SHOW_DALIUGE_RUNTIME_PARAMETERS);
    }

    static translatorUiMode = (mode : Eagle.TranslatorMode) : boolean => {
        return Setting.findValue(Utils.USER_TRANSLATOR_MODE) === mode;
    }

    static isInUIMode = (mode : Eagle.UIMode) : boolean => {
        return Setting.findValue(Utils.USER_INTERFACE_MODE) === mode;
    }

    displayNodeKeys = () :boolean => {
        return Setting.findValue(Utils.DISPLAY_NODE_KEYS);
    }

    showPerformanceDisplay : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return Setting.findValue(Utils.ENABLE_PERFORMANCE_DISPLAY);
    }, this);

    types : ko.PureComputed<string[]> = ko.pureComputed(() => {
        const result: string[] = [];

        switch (Eagle.selectedLocation()){
            case Eagle.FileType.Palette:
                // build a list from the selected component in the palettes
                for (const field of this.selectedNode().getFields()) {
                    Utils.addTypeIfUnique(result, field.getType());
                }
                break;
            case Eagle.FileType.Graph:
            default:
                // build a list from all nodes in the current logical graph
                for (const node of this.logicalGraph().getNodes()){
                    for (const field of node.getFields()) {
                        Utils.addTypeIfUnique(result, field.getType());
                    }
                }
                break;
        }

        return result;
    }, this);

    toggleShowDataNodes = () : void => {
        // when we switch show/hide data nodes, some of the selected objects may become invisible,
        // and some of the selected objects may have not existed in the first place,
        // so it seems easier to just empty the selection
        this.selectedObjects([]);

        this.showDataNodes(!this.showDataNodes());
    }

    deployDefaultTranslationAlgorithm = () : void => {
        this.translator().genPGT(Eagle.defaultTranslatorAlgorithmMethod, false, Eagle.DALiuGESchemaVersion.Unknown)
    }

    // TODO: remove?
    flagActiveFileModified = () : void => {
        if (this.logicalGraph()){
            this.logicalGraph().fileInfo().modified = true;
        }
    }

    getTabTitle : ko.PureComputed<string> = ko.pureComputed(() => {
        // Adding a star symbol in front of the title if file is modified.
        let mod = '';

        if (this.logicalGraph() === null){
            return "";
        }

        const fileInfo : FileInfo = this.logicalGraph().fileInfo();

        if (fileInfo === null){
            return "";
        }

        if (fileInfo.modified){
            mod = '*';
        }

        // Display file name in tab title if non-empty
        const fileName = fileInfo.name;

        if (fileName === ""){
            return "EAGLE";
        } else {
            return mod + "EAGLE: " + fileName;
        }
    }, this);

    // generate a list of Application nodes within the open palettes
    getApplications = () : Node[] => {
        const list: Node[] = [];

        for (const palette of this.palettes()){
            for (const node of palette.getNodes()){
                if (node.isApplication()){
                    list.push(node);
                }
            }
        }

        return list;
    }

    getKeyAttributeDisplay = (isKeyAttribute : boolean) : string => {
        if(!isKeyAttribute){
            return '<i class="material-icons">favorite_border</i>'
        }else{
            return '<i class="material-icons">favorite</i>'
        }
    }

    repositoryFileName : ko.PureComputed<string> = ko.pureComputed(() => {
        if (this.logicalGraph() === null){
            return "";
        }

        const fileInfo : FileInfo = this.logicalGraph().fileInfo();

        // if no FileInfo is available, return empty string
        if (fileInfo === null){
            return "";
        }

        return fileInfo.getText();
    }, this);

    toggleWindows = () : void  => {
        this.rightWindow().toggleShown()
        this.leftWindow().toggleShown()
    }

    emptySearchBar = (target : ko.Observable,data:string, event : Event) => {
        target("")
        $(event.target).parent().hide()
    }

    setSearchBarClearBtnState = (data:string, event : Event) => {
        if($(event.target).val() === ""){
            $(event.target).parent().find('a').hide()
        }else{
            $(event.target).parent().find('a').show()
        }
    }

    zoomIn = () : void => {
        this.globalScale += 0.05;
        this.logicalGraph.valueHasMutated();
    }

    zoomOut = () : void => {
        this.globalScale -= 0.05;
        this.logicalGraph.valueHasMutated();
    }

    zoomToFit = () : void => {
        console.error("Not implemented!");
    }

    toggleGrid = () : void => {
        console.error("Not implemented!");
    }

    centerGraph = () : void => {
        // if there are no nodes in the logical graph, abort
        if (this.logicalGraph().getNumNodes() === 0){
            return;
        }

        // iterate over all nodes in graph and record minimum and maximum extents in X and Y
        let minX : number = Number.MAX_VALUE;
        let minY : number = Number.MAX_VALUE;
        let maxX : number = -Number.MAX_VALUE;
        let maxY : number = -Number.MAX_VALUE;
        for (const node of this.logicalGraph().getNodes()){
            if (node.getPosition().x < minX){
                minX = node.getPosition().x;
            }
            if (node.getPosition().y < minY){
                minY = node.getPosition().y;
            }
            if (node.getPosition().x + node.getWidth() > maxX){
                maxX = node.getPosition().x + node.getWidth();
            }
            if (node.getPosition().y + node.getHeight() > maxY){
                maxY = node.getPosition().y + node.getHeight();
            }
        }

        // determine the centroid of the graph
        const centroidX = minX + ((maxX - minX) / 2);
        const centroidY = minY + ((maxY - minY) / 2);

        // reset scale
        this.globalScale = 1.0;

        //determine center of the display area
        const displayCenterX : number = $('#logicalGraphParent').width() / this.globalScale / 2;
        const displayCenterY : number = $('#logicalGraphParent').height() / this.globalScale / 2;

        // translate display to center the graph centroid
        this.globalOffsetX = displayCenterX - centroidX;
        this.globalOffsetY = displayCenterY - centroidY;

        // trigger render
        this.logicalGraph.valueHasMutated();
    }

    getSelectedText = () : string => {
        let nodeCount = 0
        let edgeCount = 0
        this.selectedObjects().forEach(function(element){
            if(element instanceof Node){
                nodeCount++
            }else if (element instanceof Edge){
                edgeCount++
            }
        })

        const text =  nodeCount + " nodes and " + edgeCount + " edges."

        return text
    }

    getTotalText = () : string => {
        const nodeCount = this.logicalGraph().getNodes().length
        const edgeCount = this.logicalGraph().getEdges().length
        const text =  nodeCount + " nodes and " + edgeCount + " edges."

        return text
    }

    /**
     * This function is repeatedly called throughout the EAGLE operation.
     * It resets al fields in the editor menu.
     */
    resetEditor = () : void => {
        this.selectedObjects([]);
        Eagle.selectedLocation(Eagle.FileType.Unknown);

        // Show the last open repository.
        if(this.rightWindow().mode() === Eagle.RightWindowMode.Inspector){
            this.rightWindow().mode(Eagle.RightWindowMode.Repository);
        }
    }

    // if selectedObjects contains nothing but one node, return the node, else null
    selectedNode : ko.PureComputed<Node> = ko.pureComputed(() : Node => {
        if (this.selectedObjects().length !== 1){
            return null;
        }

        const object = this.selectedObjects()[0];

        if (object instanceof Node){
            return object;
        } else {
            return null;
        }
    }, this);

    // if selectedObjects contains nothing but one edge, return the edge, else null
    selectedEdge : ko.PureComputed<Edge> = ko.pureComputed(() : Edge => {
        if (this.selectedObjects().length !== 1){
            return null;
        }

        const object = this.selectedObjects()[0];

        if (object instanceof Edge){
            return object;
        } else {
            return null;
        }
    }, this);

    setSelection = (rightWindowMode : Eagle.RightWindowMode, selection : Node | Edge, selectedLocation: Eagle.FileType) : void => {
        Eagle.selectedLocation(selectedLocation);
        if (selection === null){
            this.selectedObjects([]);
            this.rightWindow().mode(rightWindowMode);
        } else {
            this.selectedObjects([selection]);
            if(this.rightWindow().mode() !== Eagle.RightWindowMode.Inspector && this.rightWindow().mode() !== Eagle.RightWindowMode.Hierarchy){
                this.rightWindow().mode(Eagle.RightWindowMode.Inspector)
            }
        }

        // update the display of all the sections of the node inspector (collapse/expand as appropriate)
        this.inspectorState().updateAllInspectorSections();
    }

    editSelection = (rightWindowMode : Eagle.RightWindowMode, selection : Node | Edge, selectedLocation: Eagle.FileType) : void => {
        // check that location is the same, otherwise default back to set
        if (selectedLocation !== Eagle.selectedLocation() && this.selectedObjects().length > 0){
            Utils.showNotification("Selection Error", "Can't add object from " + selectedLocation + " to existing selected objects in " + Eagle.selectedLocation(), "warning");
            return;
        } else {
            Eagle.selectedLocation(selectedLocation);
        }

        // check if object is already selected
        let alreadySelected = false;
        let index = -1;
        for (let i = 0 ; i < this.selectedObjects().length ; i++){
            if (selection === this.selectedObjects()[i]){
                alreadySelected = true;
                index = i;
                break;
            }
        }

        // add or remove the new selection from the list of selected objects as appropriate
        if (alreadySelected){
            // remove
            this.selectedObjects.splice(index,1);
        } else {
            // add
            this.selectedObjects.push(selection);
        }

        if(this.rightWindow().mode() !== Eagle.RightWindowMode.Inspector && this.rightWindow().mode() !== Eagle.RightWindowMode.Hierarchy){
            this.rightWindow().mode(Eagle.RightWindowMode.Hierarchy)
        }
    }

    objectIsSelected = (object: Node | Edge): boolean => {
        if (object instanceof Node){
            for (const o of this.selectedObjects()){
                if (o instanceof Node && o.getId() === object.getId()){
                    return true;
                }
            }

            return false;
        }

        if (object instanceof Edge){
            for (const o of this.selectedObjects()){
                if (o instanceof Edge && o.getId() === object.getId()){
                    return true;
                }
            }

            return false;
        }

        console.error("Checking if object of unknown type is selected", object);
        return false;
    }

    // NOTE: we use this to check objects that are not ACTUALLY Node or Edge instances
    //       the objects are actually knockout viewModels derived from Node or Edge
    objectIsSelectedById = (id: string): boolean => {
        for (const o of this.selectedObjects()){
            if (o instanceof Node && o.getId() === id){
                return true;
            }

            if (o instanceof Edge && o.getId() === id){
                return true;
            }
        }

        return false;
    }

    /**
     * Uploads a file from a local file location.
     */
    uploadGraphFile = () : void => {
        const uploadedGraphFileToLoadInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedGraphFileToLoad");
        const fileFullPath : string = uploadedGraphFileToLoadInputElement.value;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // Gets the file from formdata.
        const formData = new FormData();
        formData.append('file', uploadedGraphFileToLoadInputElement.files[0]);
        uploadedGraphFileToLoadInputElement.value = "";

        Utils.httpPostForm('/uploadFile', formData, (error : string, data : string) : void => {
            if (error !== null){
                console.error(error);
                return;
            }

            this._loadGraphJSON(data, fileFullPath, (lg: LogicalGraph) : void => {
                this.logicalGraph(lg);

                // center graph
                this.centerGraph();

                // update the activeFileInfo with details of the repository the file was loaded from
                if (fileFullPath !== ""){
                    this.updateLogicalGraphFileInfo(Eagle.RepositoryService.File, "", "", Utils.getFilePathFromFullPath(fileFullPath), Utils.getFileNameFromFullPath(fileFullPath));
                }

                // check graph
                this.checkGraph();
                this.undo().pushSnapshot(this, "Loaded " + fileFullPath);
            });
        });
    }

    /**
     * Uploads a file from a local file location. File will be "insert"ed into the current graph
     */
    insertGraphFile = () : void => {
        const uploadedGraphFileToInsertInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedGraphFileToInsert");
        const fileFullPath : string = uploadedGraphFileToInsertInputElement.value;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // Gets the file from formdata.
        const formData = new FormData();
        formData.append('file', uploadedGraphFileToInsertInputElement.files[0]);
        uploadedGraphFileToInsertInputElement.value = "";

        Utils.httpPostForm('/uploadFile', formData, (error : string, data : string) : void => {
            if (error !== null){
                console.error(error);
                return;
            }

            this._loadGraphJSON(data, fileFullPath, (lg: LogicalGraph) : void => {
                const parentNode: Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), lg.fileInfo().name, lg.fileInfo().getText(), Category.SubGraph);

                this.insertGraph(lg.getNodes(), lg.getEdges(), parentNode);

                this.checkGraph();
                this.undo().pushSnapshot(this, "Insert Logical Graph");
                this.logicalGraph.valueHasMutated();
            });
        });
    }

    private _handleLoadingErrors = (errorsWarnings: Errors.ErrorsWarnings, fileName: string, service: Eagle.RepositoryService) : void => {
        const showErrors: boolean = Setting.findValue(Utils.SHOW_FILE_LOADING_ERRORS);

        // show errors (if found)
        if (errorsWarnings.errors.length > 0 || errorsWarnings.warnings.length > 0){
            if (showErrors){

                // add warnings/errors to the arrays
                this.loadingErrors(errorsWarnings.errors);
                this.loadingWarnings(errorsWarnings.warnings);

                this.errorsMode(Eagle.ErrorsMode.Loading);
                Utils.showErrorsModal("Loading File");
            }
        } else {
            Utils.showNotification("Success", fileName + " has been loaded from " + service + ".", "success");
        }
    }

    private _loadGraphJSON = (data: string, fileFullPath: string, loadFunc: (lg: LogicalGraph) => void) : void => {
        let dataObject;

        // attempt to parse the JSON
        try {
            dataObject = JSON.parse(data);
        }
        catch(err){
            Utils.showUserMessage("Error parsing file JSON", err.message);
            return;
        }

        const fileType : Eagle.FileType = Utils.determineFileType(dataObject);

        // Only load graph files.
        if (fileType !== Eagle.FileType.Graph) {
            Utils.showUserMessage("Error", "This is not a graph file!");
            return;
        }

        // attempt to determine schema version from FileInfo
        const schemaVersion: Eagle.DALiuGESchemaVersion = Utils.determineSchemaVersion(dataObject);

        const errorsWarnings: Errors.ErrorsWarnings = {errors: [], warnings: []};
        const dummyFile: RepositoryFile = new RepositoryFile(Repository.DUMMY, "", fileFullPath);

        // use the correct parsing function based on schema version
        switch (schemaVersion){
            case Eagle.DALiuGESchemaVersion.OJS:
            case Eagle.DALiuGESchemaVersion.Unknown:
                loadFunc(LogicalGraph.fromOJSJson(dataObject, dummyFile, errorsWarnings));
                break;
        }

        this._handleLoadingErrors(errorsWarnings, Utils.getFileNameFromFullPath(fileFullPath), Eagle.RepositoryService.File);
    }

    createSubgraphFromSelection = () : void => {
        console.log("createSubgraphFromSelection()");

        // create new subgraph
        const parentNode: Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), "Subgraph", "", Category.SubGraph);

        // add the parent node to the logical graph
        this.logicalGraph().addNodeComplete(parentNode);

        // switch items in selection to be children of subgraph
        for (const node of this.selectedObjects()){
            if (!(node instanceof Node)){
                continue;
            }

            // if already parented to a node in this selection, skip
            const parentKey = node.getParentKey();
            if (parentKey !== null){
                const parent = this.logicalGraph().findNodeByKey(parentKey);
                if (this.objectIsSelected(parent)){
                    continue;
                }
            }

            // update selection
            node.setParentKey(parentNode.getKey());
        }

        // shrink/expand subgraph node to fit children
        this.logicalGraph().shrinkNode(parentNode);

        // flag graph as changed
        this.flagActiveFileModified();
        this.checkGraph();
        this.undo().pushSnapshot(this, "Create Subgraph from Selection");
        this.logicalGraph.valueHasMutated();
    }

    checkErrorModalShowError = (data:any) :void =>{
        data.show()
        this.rightWindow().shown(true).mode(Eagle.RightWindowMode.Inspector)
    }

    createConstructFromSelection = () : void => {
        console.log("createConstructFromSelection()");

        const constructs : string[] = Utils.buildComponentList((cData: Category.CategoryData) => {
            return cData.categoryType === Category.Type.Construct;
        });

        // ask the user what type of construct to use
        Utils.requestUserChoice("Choose Construct", "Please choose a construct type to contain the selection", constructs, -1, false, "", (completed: boolean, userChoiceIndex: number, userCustomString: string) => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            const userChoice: string = constructs[userChoiceIndex];

            // create new subgraph
            const parentNode: Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), userChoice, "", <Category>userChoice);

            // add the parent node to the logical graph
            this.logicalGraph().addNodeComplete(parentNode);

            // switch items in selection to be children of subgraph
            for (const node of this.selectedObjects()){
                if (!(node instanceof Node)){
                    continue;
                }

                node.setParentKey(parentNode.getKey());
            }

            // shrink/expand subgraph node to fit children
            this.logicalGraph().shrinkNode(parentNode);

            // flag graph as changed
            this.flagActiveFileModified();
            this.checkGraph();
            this.undo().pushSnapshot(this, "Add Selection to Construct");
            this.logicalGraph.valueHasMutated();
        });
    }

    // NOTE: parentNode would be null if we are duplicating a selection of objects
    insertGraph = (nodes: Node[], edges: Edge[], parentNode: Node) : void => {
        const DUPLICATE_OFFSET: number = 20; // amount (in x and y) by which duplicated nodes will be positioned away from the originals

        // create map of inserted graph keys to final graph nodes, and of inserted port ids to final graph ports
        const keyMap: Map<number, Node> = new Map();
        const portMap: Map<string, Field> = new Map();
        let parentNodePosition;

        // add the parent node to the logical graph
        if (parentNode !== null){
            this.logicalGraph().addNodeComplete(parentNode);

            // we need to know the required width for the new parentNode, which will be a bounding box for all nodes in nodes[]
            const bbSize = LogicalGraph.normaliseNodes(nodes);

            // find a suitable position for the parent node
            parentNodePosition = this.getNewNodePosition(bbSize.x, bbSize.y);

            // set attributes of parentNode
            parentNode.setPosition(parentNodePosition.x, parentNodePosition.y);
            parentNode.setWidth(bbSize.x);
            parentNode.setHeight(bbSize.y);
            parentNode.setCollapsed(true);
        } else {
            parentNodePosition = {x: DUPLICATE_OFFSET, y: DUPLICATE_OFFSET};
        }

        // insert nodes from lg into the existing logicalGraph
        for (const node of nodes){
            this.addNode(node.clone(), parentNodePosition.x + node.getPosition().x, parentNodePosition.y + node.getPosition().y, (insertedNode: Node) => {
                // save mapping for node itself
                keyMap.set(node.getKey(), insertedNode);

                // if insertedNode has no parent, make it a parent of the parent node
                if (insertedNode.getParentKey() === null && parentNode !== null){
                    insertedNode.setParentKey(parentNode.getKey());
                }

                // copy embedded input application
                if (node.hasInputApplication()){
                    const inputApplication : Node = node.getInputApplication();
                    const clone : Node = inputApplication.clone();
                    const newKey : number = Utils.newKey(this.logicalGraph().getNodes());
                    clone.setKey(newKey);
                    keyMap.set(inputApplication.getKey(), clone);

                    insertedNode.setInputApplication(clone);

                    // loop through ports, adding them to the port map
                    for (const inputPort of inputApplication.getInputPorts()){
                        portMap.set(inputPort.getId(), inputPort);
                    }

                    for (const outputPort of inputApplication.getOutputPorts()){
                        portMap.set(outputPort.getId(), outputPort);
                    }
                }

                // copy embedded output application
                if (node.hasOutputApplication()){
                    const outputApplication : Node = node.getOutputApplication();
                    const clone : Node = outputApplication.clone();
                    const newKey : number = Utils.newKey(this.logicalGraph().getNodes());
                    clone.setKey(newKey);
                    keyMap.set(outputApplication.getKey(), clone);

                    insertedNode.setOutputApplication(clone);

                    // loop through ports, adding them to the port map
                    for (const inputPort of outputApplication.getInputPorts()){
                        portMap.set(inputPort.getId(), inputPort);
                    }

                    for (const outputPort of outputApplication.getOutputPorts()){
                        portMap.set(outputPort.getId(), outputPort);
                    }
                }

                // save mapping for input ports
                for (let j = 0 ; j < node.getInputPorts().length; j++){
                    portMap.set(node.getInputPorts()[j].getId(), insertedNode.getInputPorts()[j]);
                }

                // save mapping for output ports
                for (let j = 0 ; j < node.getOutputPorts().length; j++){
                    portMap.set(node.getOutputPorts()[j].getId(), insertedNode.getOutputPorts()[j]);
                }
            });
        }

        // update some other details of the nodes are updated correctly
        for (const node of nodes){
            const insertedNode: Node = keyMap.get(node.getKey());

            // if original node had no parent, skip
            if (node.getParentKey() === null){
                continue;
            }

            // check if parent of original node was also mapped to a new node
            const mappedParent: Node = keyMap.get(node.getParentKey());

            // make sure parent is set correctly
            // if no mapping is available for the parent, then use the original parent as the parent for the new node
            // if a mapping is available, then use the mapped node as the parent for the new node
            if (typeof mappedParent === 'undefined'){
                insertedNode.setParentKey(node.getParentKey());
            } else {
                insertedNode.setParentKey(mappedParent.getKey());
            }
        }

        // insert edges from lg into the existing logicalGraph
        for (const edge of edges){
            // TODO: maybe use addEdgeComplete? otherwise check portName = "" is OK
            this.addEdge(keyMap.get(edge.getSrcNodeKey()), portMap.get(edge.getSrcPortId()), keyMap.get(edge.getDestNodeKey()), portMap.get(edge.getDestPortId()), edge.isLoopAware(), edge.isClosesLoop(),  null);
        }
    }

    /**
     * Loads a custom palette from a file.
     */
    uploadPaletteFile = () : void => {
        const uploadedPaletteFileInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedPaletteFileToLoad");
        const fileFullPath : string = uploadedPaletteFileInputElement.value;

        // abort if value is empty string
        if (fileFullPath === ""){
            return;
        }

        // Get and load the specified configuration file.
        const formData = new FormData();
        formData.append('file', uploadedPaletteFileInputElement.files[0]);
        uploadedPaletteFileInputElement.value = "";

        Utils.httpPostForm('/uploadFile', formData, (error : string, data : string) : void => {
            if (error !== null){
                console.error(error);
                return;
            }

            this._loadPaletteJSON(data, fileFullPath);

            this.palettes()[0].fileInfo().repositoryService = Eagle.RepositoryService.File;
            this.palettes()[0].fileInfo.valueHasMutated();
        });
    }

    private _loadPaletteJSON = (data: string, fileFullPath: string) => {
        let dataObject;

        // attempt to parse the JSON
        try {
            dataObject = JSON.parse(data);
        }
        catch(err){
            Utils.showUserMessage("Error parsing file JSON", err.message);
            return;
        }

        // determine file type
        const loadedFileType : Eagle.FileType = Utils.determineFileType(dataObject);

        // abort if not palette
        if (loadedFileType !== Eagle.FileType.Palette){
            Utils.showUserMessage("Error", "This is not a palette file! Looks like a " + loadedFileType);
            return;
        }

        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};
        const p : Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", Utils.getFileNameFromFullPath(fileFullPath)), errorsWarnings);

        // show errors (if found)
        this._handleLoadingErrors(errorsWarnings, Utils.getFileNameFromFullPath(fileFullPath), Eagle.RepositoryService.File);

        // sort the palette
        p.sort();

        // add new palette to the START of the palettes array
        this.palettes.unshift(p);

        // show the left window
        this.leftWindow().shown(true);

        Utils.showNotification("Success", Utils.getFileNameFromFullPath(fileFullPath) + " has been loaded.", "success");
    }

    /**
     * The following two functions allows the file selectors to be hidden and let tags 'click' them
     */
     getGraphFileToLoad = () : void => {
         document.getElementById("uploadedGraphFileToLoad").click();
         this.resetEditor()
     }

     getGraphFileToInsert = () : void => {
         document.getElementById("uploadedGraphFileToInsert").click();
     }

    getPaletteFileToLoad = () : void => {
        document.getElementById("uploadedPaletteFileToLoad").click();
    }

    /**
     * Creates a new logical graph for editing.
     */
    newLogicalGraph = () : void => {
        this.newDiagram(Eagle.FileType.Graph, (name: string) => {
            this.logicalGraph(new LogicalGraph());
            this.logicalGraph().fileInfo().name = name;
            const node : Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), "Description", "", Category.Description);
            const pos = this.getNewNodePosition(node.getDisplayWidth(), node.getDisplayHeight());
            node.setColor(Utils.getColorForNode(Category.Description));
            this.addNode(node, pos.x, pos.y, null);
            this.checkGraph();
            this.undo().pushSnapshot(this, "New Logical Graph");
            this.logicalGraph.valueHasMutated();
        });
        this.resetEditor()
    }

    /**
     * Presents the user with a textarea in which to paste JSON. Reads the JSON and parses it into a logical graph for editing.
     */
    newLogicalGraphFromJson = () : void => {
        Utils.requestUserText("New Logical Graph from JSON", "Enter the JSON below", "", (completed : boolean, userText : string) : void => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            this._loadGraphJSON(userText, "", (lg: LogicalGraph) : void => {
                this.logicalGraph(lg);
            });
        });
        this.resetEditor()
    }

    displayLogicalGraphAsJson = () : void => {
        const cloneLG: LogicalGraph = this.logicalGraph().clone();

        // zero-out some info that isn't useful for comparison
        cloneLG.fileInfo().repositoryUrl = "";
        cloneLG.fileInfo().commitHash = "";
        cloneLG.fileInfo().downloadUrl = "";
        cloneLG.fileInfo().signature = "";
        cloneLG.fileInfo().lastModifiedName = "";
        cloneLG.fileInfo().lastModifiedEmail = "";
        cloneLG.fileInfo().lastModifiedDatetime = 0;

        const jsonString: string = JSON.stringify(LogicalGraph.toOJSJson(cloneLG, false), null, 4);

        Utils.requestUserText("Export Graph to JSON", "", jsonString, null);
    }


    /**
     * Creates a new palette for editing.
     */
    newPalette = () : void => {
        this.newDiagram(Eagle.FileType.Palette, (name : string) => {
            const p: Palette = new Palette();
            p.fileInfo().name = name;

            // mark the palette as modified and readwrite
            p.fileInfo().modified = true;
            p.fileInfo().readonly = false;

            // add to palettes
            this.palettes.unshift(p);
        });
    }

    /**
     * Presents the user with a textarea in which to paste JSON. Reads the JSON and parses it into a palette.
     */
    newPaletteFromJson = () : void => {
        Utils.requestUserText("New Palette from JSON", "Enter the JSON below", "", (completed : boolean, userText : string) : void => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            this._loadPaletteJSON(userText, "");
        });
    }

    /**
     * Reloads a previously loaded palette.
     */
     reloadPalette = (palette: Palette, index: number) : void => {
         const fileInfo : FileInfo = palette.fileInfo();

         // remove palette
         this.closePalette(palette);

         switch (fileInfo.repositoryService){
             case Eagle.RepositoryService.File:
                // load palette
                this.getPaletteFileToLoad();
                break;
            case Eagle.RepositoryService.GitLab:
            case Eagle.RepositoryService.GitHub:
                Repositories.selectFile(new RepositoryFile(new Repository(fileInfo.repositoryService, fileInfo.repositoryName, fileInfo.repositoryBranch, false), fileInfo.path, fileInfo.name));
                break;
            case Eagle.RepositoryService.Url:
                // TODO: new code
                this.loadPalettes([
                    {name:palette.fileInfo().name, filename:palette.fileInfo().downloadUrl, readonly:palette.fileInfo().readonly}
                ], (palettes: Palette[]):void => {
                    for (const palette of palettes){
                        if (palette !== null){
                            this.palettes.splice(index, 0, palette);
                        }
                    }
                });
                break;
            default:
                // can't be fetched
                break;
         }
    }

    /**
     * Create a new diagram (graph or palette).
     */
    newDiagram = (fileType : Eagle.FileType, callbackAction : (name : string) => void ) : void => {
        console.log("newDiagram()", fileType);
        Utils.requestUserString("New " + fileType, "Enter " + fileType + " name", "", false, (completed : boolean, userString : string) : void => {
            if (!completed)
            {   // Cancelling action.
                return;
            }
            if (userString === ""){
            Utils.showNotification("Input Error", "Enter A Valid Name", "warning");
                return;
            }

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(userString)) {
                userString = userString + "." + Utils.getDiagramExtension(fileType);
            }

            // Callback.
            callbackAction(userString);
        });
    }

    saveGraph = () : void => {
        if (this.logicalGraph().fileInfo().repositoryService === Eagle.RepositoryService.File){
            this.saveFileToLocal(Eagle.FileType.Graph);
        } else {
            this.commitToGit(Eagle.FileType.Graph);
        }
    }

    saveGraphAs = () : void => {
        const isLocalFile = this.logicalGraph().fileInfo().repositoryService === Eagle.RepositoryService.File;

        Utils.requestUserChoice("Save Graph As", "Please choose where to save the graph", ["Local File", "Remote Git Repository"], isLocalFile?0:1, false, "", (completed: boolean, userChoiceIndex: number) => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            if (userChoiceIndex === 0){
                this.saveFileToLocal(Eagle.FileType.Graph);
            } else {
                this.commitToGitAs(Eagle.FileType.Graph);
            }
        });
    }

    /**
     * Saves the file to a local download folder.
     */
    saveFileToLocal = async (fileType : Eagle.FileType) : Promise<void> => {
        switch (fileType){
            case Eagle.FileType.Graph:
                this.saveGraphToDisk(this.logicalGraph());
                break;
            case Eagle.FileType.Palette:
                // build a list of palette names
                const paletteNames: string[] = this.buildReadablePaletteNamesList();

                // ask user to select the palette
                const paletteName = await Utils.userChoosePalette(paletteNames);

                // get reference to palette (based on paletteName)
                const destinationPalette = this.findPalette(paletteName, false);

                // check that a palette was found
                if (destinationPalette === null){
                    return;
                }

                this.savePaletteToDisk(destinationPalette);
                break;
            default:
                Utils.showUserMessage("Not implemented", "Not sure which fileType right one to save locally :" + fileType);
                break;
        }
    }

    /**
     * Saves a file to the remote server repository.
     */
    saveFileToRemote = (repository : Repository, filePath : string, fileName : string, fileType : Eagle.FileType, fileInfo: ko.Observable<FileInfo>, json : object) : void => {
        console.log("saveFileToRemote() repository.name", repository.name, "repository.service", repository.service);

        let url : string;

        switch (repository.service){
            case Eagle.RepositoryService.GitHub:
                url = '/saveFileToRemoteGithub';
                break;
            case Eagle.RepositoryService.GitLab:
                url = '/saveFileToRemoteGitlab';
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service : " + repository.service);
                return;
        }


        Utils.httpPostJSON(url, json, (error : string, data: string) : void => {
            if (error !== null){
                Utils.showUserMessage("Error", data + "<br/><br/>These error messages provided by " + repository.service + " are not very helpful. Please contact EAGLE admin to help with further investigation.");
                console.error("Error: " + JSON.stringify(error, null, 2) + " Data: " + data);
                return;
            }

            // Load the file list again.
            if (repository.service === Eagle.RepositoryService.GitHub){
                GitHub.loadRepoContent(repository);
            }
            if (repository.service === Eagle.RepositoryService.GitLab){
                GitLab.loadRepoContent(repository);
            }

            // show repo in the right window
            this.rightWindow().mode(Eagle.RightWindowMode.Repository);

            // Show success message
            if (repository.service === Eagle.RepositoryService.GitHub){
                Utils.showNotification("Success", "The file has been saved to GitHub repository.", "success");
            }
            if (repository.service === Eagle.RepositoryService.GitLab){
                Utils.showNotification("Success", "The file has been saved to GitLab repository.", "success");
            }

            // Mark file as non-modified.
            fileInfo().modified = false;

            fileInfo().repositoryService = repository.service;
            fileInfo().repositoryName = repository.name;
            fileInfo().repositoryBranch = repository.branch;
            fileInfo().path = filePath;
            fileInfo().type = fileType;

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(fileName)) {
                fileName = fileName + "." + Utils.getDiagramExtension(fileType);
            }

            // Change the title name.
            fileInfo().name = fileName;

            // set the EAGLE version etc according to this running version
            fileInfo().updateEagleInfo();

            // flag fileInfo object as modified
            fileInfo.valueHasMutated();
        });
    }

    /**
     * Performs a Git commit of a graph/palette. Asks user for a file name before saving.
     */
    commitToGitAs = async (fileType : Eagle.FileType) : Promise<void> => {
        console.log("commitToGitAs()");

        let fileInfo : ko.Observable<FileInfo>;
        let obj : LogicalGraph | Palette;

        // determine which object of the given filetype we are committing
        switch (fileType){
            case Eagle.FileType.Graph:
                fileInfo = this.logicalGraph().fileInfo;
                obj = this.logicalGraph();
                break;
            case Eagle.FileType.Palette:
                const paletteNames: string[] = this.buildReadablePaletteNamesList();
                const paletteName = await Utils.userChoosePalette(paletteNames);
                const palette = this.findPalette(paletteName, false);
                if (palette === null){
                    return;
                }
                fileInfo = palette.fileInfo;
                obj = palette;
                break;
            default:
                Utils.showUserMessage("Not implemented", "Not sure which fileType right one to commit :" + fileType);
                break;
        }


        // create default repository to supply to modal so that the modal is populated with useful defaults
        let defaultRepository: Repository;

        if (this.logicalGraph()){
            // if the repository service is unknown (or file), probably because the graph hasn't been saved before, then
            // just use any existing repo
            if (fileInfo().repositoryService === Eagle.RepositoryService.Unknown || fileInfo().repositoryService === Eagle.RepositoryService.File){
                const gitHubRepoList : Repository[] = Repositories.getList(Eagle.RepositoryService.GitHub);
                const gitLabRepoList : Repository[] = Repositories.getList(Eagle.RepositoryService.GitLab);

                // use first gitlab repo as second preference
                if (gitLabRepoList.length > 0){
                    defaultRepository = new Repository(Eagle.RepositoryService.GitLab, gitLabRepoList[0].name, gitLabRepoList[0].branch, false);
                }

                // overwrite with first github repo as first preference
                if (gitHubRepoList.length > 0){
                    defaultRepository = new Repository(Eagle.RepositoryService.GitHub, gitHubRepoList[0].name, gitHubRepoList[0].branch, false);
                }

                if (gitHubRepoList.length === 0 && gitLabRepoList.length === 0){
                    defaultRepository = new Repository(Eagle.RepositoryService.GitHub, "", "", false);
                }
            } else {
                defaultRepository = new Repository(fileInfo().repositoryService, fileInfo().repositoryName, fileInfo().repositoryBranch, false);
            }
        }

        Utils.requestUserGitCommit(defaultRepository, Repositories.getList(defaultRepository.service), fileInfo().path, fileInfo().name, (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            const repository : Repository = Repositories.get(repositoryService, repositoryName, repositoryBranch);

            this._commit(repository, fileType, filePath, fileName, fileInfo, commitMessage, obj);
        });
    };

    /**
     * Performs a Git commit of a graph/palette.
     */
    commitToGit = async (fileType : Eagle.FileType) : Promise<void> => {
        let fileInfo : ko.Observable<FileInfo>;
        let obj : LogicalGraph | Palette;

        // determine which object of the given filetype we are committing
        switch (fileType){
            case Eagle.FileType.Graph:
                fileInfo = this.logicalGraph().fileInfo;
                obj = this.logicalGraph();
                break;
            case Eagle.FileType.Palette:
                // build a list of palettes, as user to choose the one to save, abort if no palette is chosen
                const paletteNames: string[] = this.buildReadablePaletteNamesList();
                const paletteName = await Utils.userChoosePalette(paletteNames);
                const palette = this.findPalette(paletteName, false);
                if (palette === null){
                    return;
                }

                fileInfo = palette.fileInfo;
                obj = palette;
                break;
            default:
                Utils.showUserMessage("Not implemented", "Not sure which fileType right one to commit :" + fileType);
                break;
        }

        console.log("fileInfo().repositoryService", fileInfo().repositoryService);
        console.log("fileInfo().repositoryName", fileInfo().repositoryName);

        // if there is no git repository or filename defined for this file. Please use 'save as' instead!
        if (
            fileInfo().repositoryService === Eagle.RepositoryService.Unknown ||
            fileInfo().repositoryService === Eagle.RepositoryService.File ||
            fileInfo().repositoryService === Eagle.RepositoryService.Url ||
            fileInfo().repositoryName === null
        ) {
            this.commitToGitAs(fileType);
            return;
        }

        // check that filetype is appropriate for a file with this extension
        if (fileInfo().name === "") {
            if (fileType == Eagle.FileType.Graph) {
                Utils.showUserMessage('Error', 'Graph is not chosen! Open existing or create a new graph.');
            } else if (fileType == Eagle.FileType.Palette) {
                Utils.showUserMessage('Error', 'Palette is not chosen! Open existing or create a new palette.');
            }
            return;
        }

        // request commit message from the user, abort if none entered
        const commitMessage = await Utils.userEnterCommitMessage("Enter a commit message for this " + fileType);
        if (commitMessage === null){
            return;
        }

        // set the EAGLE version etc according to this running version
        fileInfo().updateEagleInfo();

        const repository = Repositories.get(fileInfo().repositoryService, fileInfo().repositoryName, fileInfo().repositoryBranch);

        this._commit(repository, fileType, fileInfo().path, fileInfo().name, fileInfo, commitMessage, obj);
    };

    _commit = (repository: Repository, fileType: Eagle.FileType, filePath: string, fileName: string, fileInfo: ko.Observable<FileInfo>, commitMessage: string, obj: LogicalGraph | Palette) : void => {
        // check that repository was found, if not try "save as"!
        if (repository === null){
            this.commitToGitAs(fileType);
            return;
        }

        this.saveDiagramToGit(repository, fileType, filePath, fileName, fileInfo, commitMessage, obj);
    }

    /**
     * Saves a graph/palette file to the GitHub repository.
     */
    saveDiagramToGit = (repository : Repository, fileType : Eagle.FileType, filePath : string, fileName : string, fileInfo: ko.Observable<FileInfo>, commitMessage : string, obj: LogicalGraph | Palette) : void => {
        console.log("saveDiagramToGit() repositoryName", repository.name, "filePath", filePath, "fileName", fileName, "commitMessage", commitMessage);

        if (fileType === Eagle.FileType.Graph){
            // clone the logical graph
            const lg_clone : LogicalGraph = (<LogicalGraph> obj).clone();
            lg_clone.fileInfo().updateEagleInfo();
            const json = LogicalGraph.toOJSJson(lg_clone, false);

            this._saveDiagramToGit(repository, fileType, filePath, fileName, fileInfo, commitMessage, json);
        } else {
            // clone the palette
            const p_clone : Palette = (<Palette> obj).clone();
            p_clone.fileInfo().updateEagleInfo();
            const json = Palette.toOJSJson(p_clone);

            this._saveDiagramToGit(repository, fileType, filePath, fileName, fileInfo, commitMessage, json);
        }
    }

    _saveDiagramToGit = (repository : Repository, fileType : Eagle.FileType, filePath : string, fileName : string, fileInfo: ko.Observable<FileInfo>, commitMessage : string, json: object) : void => {
        // generate filename
        const fullFileName : string = Utils.joinPath(filePath, fileName);

        // get access token for this type of repository
        let token : string;

        switch (repository.service){
            case Eagle.RepositoryService.GitHub:
                token = Setting.findValue(Utils.GITHUB_ACCESS_TOKEN_KEY);
                break;
            case Eagle.RepositoryService.GitLab:
                token = Setting.findValue(Utils.GITLAB_ACCESS_TOKEN_KEY);
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
                return;
        }

        // check that access token is defined
        if (token === null || token === "") {
            Utils.showUserMessage("Error", "The GitHub access token is not set! To save files on GitHub, set the access token.");
            return;
        }

        // validate json
        if (!Setting.findValue(Utils.DISABLE_JSON_VALIDATION)){
            const validatorResult : {valid: boolean, errors: string} = Utils.validateJSON(json, Eagle.DALiuGESchemaVersion.OJS, fileType);
            if (!validatorResult.valid){
                const message = "JSON Output failed validation against internal JSON schema, saving anyway";
                console.error(message, validatorResult.errors);
                Utils.showUserMessage("Error", message + "<br/>" + validatorResult.errors);
                //return;
            }
        }

        const jsonData : object = {
            jsonData: json,
            repositoryBranch: repository.branch,
            repositoryName: repository.name,
            repositoryService: repository.service,
            token: token,
            filename: fullFileName,
            commitMessage: commitMessage
        };

        this.saveFileToRemote(repository, filePath, fileName, fileType, fileInfo, jsonData);
    }

    loadPalettes = (paletteList: {name:string, filename:string, readonly:boolean}[], callback: (data: Palette[]) => void ) : void => {
        const results: Palette[] = [];
        const complete: boolean[] = [];
        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};

        for (let i = 0 ; i < paletteList.length ; i++){
            results.push(null);
            complete.push(false);
            const index = i;
            const data = {url: paletteList[i].filename};

            Utils.httpPostJSON("/openRemoteUrlFile", data, (error: string, data: string) => {
                complete[index] = true;

                if  (error !== null){
                    console.error(error);
                    errorsWarnings.errors.push(Errors.Message(error));
                } else {
                    const palette: Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", paletteList[index].name), errorsWarnings);
                    palette.fileInfo().clear();
                    palette.fileInfo().name = paletteList[index].name;
                    palette.fileInfo().readonly = paletteList[index].readonly;
                    palette.fileInfo().builtIn = true;
                    palette.fileInfo().downloadUrl = paletteList[index].filename;
                    palette.fileInfo().type = Eagle.FileType.Palette;
                    palette.fileInfo().repositoryService = Eagle.RepositoryService.Url;

                    // sort palette and add to results
                    palette.sort();
                    results[index] = palette;
                }

                // check if all requests are now complete, then we can call the callback
                let allComplete = true;
                for (const requestComplete of complete){
                    if (!requestComplete){
                        allComplete = false;
                    }
                }
                if (allComplete){
                    callback(results);
                }
            });
        }
    }

    openRemoteFile = (file : RepositoryFile) : void => {
        // flag file as being fetched
        file.isFetching(true);

        // check the service required to fetch the file
        let openRemoteFileFunc;
        switch (file.repository.service){
            case Eagle.RepositoryService.GitHub:
                openRemoteFileFunc = GitHub.openRemoteFile;
                break;
            case Eagle.RepositoryService.GitLab:
                openRemoteFileFunc = GitLab.openRemoteFile;
                break;
            default:
                console.warn("Unsure how to fetch file with unknown service ", file.repository.service);
                break;
        }

        // load file from github or gitlab
        openRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name, (error : string, data : string) : void => {
            // flag fetching as complete
            file.isFetching(false);

            // display error if one occurred
            if (error != null){
                Utils.showUserMessage("Error", error);
                console.error(error);
                return;
            }

            // attempt to parse the JSON
            let dataObject;
            try {
                dataObject = JSON.parse(data);
            }
            catch(err){
                Utils.showUserMessage("Error parsing file JSON", err.message);
                return;
            }

            const fileTypeLoaded: Eagle.FileType = Utils.determineFileType(dataObject);

            switch (fileTypeLoaded){
                case Eagle.FileType.Graph:
                    // attempt to determine schema version from FileInfo
                    const schemaVersion: Eagle.DALiuGESchemaVersion = Utils.determineSchemaVersion(dataObject);

                    const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};

                    // use the correct parsing function based on schema version
                    switch (schemaVersion){
                        case Eagle.DALiuGESchemaVersion.OJS:
                        case Eagle.DALiuGESchemaVersion.Unknown:
                            this.logicalGraph(LogicalGraph.fromOJSJson(dataObject, file, errorsWarnings));
                            break;
                    }

                    // show errors/warnings
                    this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);

                    // center graph
                    this.centerGraph();

                    // check graph
                    this.checkGraph();
                    this.undo().pushSnapshot(this, "Loaded " + file.name);

                    // if the fileType is the same as the current mode, update the activeFileInfo with details of the repository the file was loaded from
                    this.updateLogicalGraphFileInfo(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
                    break;

                case Eagle.FileType.Palette:
                    this._remotePaletteLoaded(file, data);
                    break;

                default:
                    // Show error message
                    Utils.showUserMessage("Error", "The file type is neither graph nor palette!");
            }
        this.resetEditor()
        });
    };

    insertRemoteFile = (file : RepositoryFile) : void => {
        // flag file as being fetched
        file.isFetching(true);

        // check the service required to fetch the file
        let insertRemoteFileFunc;
        switch (file.repository.service){
            case Eagle.RepositoryService.GitHub:
                insertRemoteFileFunc = GitHub.openRemoteFile;
                break;
            case Eagle.RepositoryService.GitLab:
                insertRemoteFileFunc = GitLab.openRemoteFile;
                break;
            default:
                console.warn("Unsure how to fetch file with unknown service ", file.repository.service);
                break;
        }

        // load file from github or gitlab
        insertRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name, (error : string, data : string) : void => {
            // flag fetching as complete
            file.isFetching(false);

            // display error if one occurred
            if (error != null){
                Utils.showUserMessage("Error", "Failed to load a file!");
                console.error(error);
                return;
            }

            // attempt to parse the JSON
            let dataObject;
            try {
                dataObject = JSON.parse(data);
            }
            catch(err){
                Utils.showUserMessage("Error parsing file JSON", err.message);
                return;
            }

            const fileTypeLoaded: Eagle.FileType = Utils.determineFileType(dataObject);

            // only do this for graphs at the moment
            if (fileTypeLoaded !== Eagle.FileType.Graph){
                Utils.showUserMessage("Error", "Unable to insert non-graph!");
                console.error("Unable to insert non-graph!");
                return;
            }

            // attempt to determine schema version from FileInfo
            const schemaVersion: Eagle.DALiuGESchemaVersion = Utils.determineSchemaVersion(dataObject);

            const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};

            // use the correct parsing function based on schema version
            let lg: LogicalGraph;
            switch (schemaVersion){
                case Eagle.DALiuGESchemaVersion.OJS:
                case Eagle.DALiuGESchemaVersion.Unknown:
                    lg = LogicalGraph.fromOJSJson(dataObject, file, errorsWarnings);
                    break;
            }

            // create parent node
            const parentNode: Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), lg.fileInfo().name, lg.fileInfo().getText(), Category.SubGraph);

            // perform insert
            this.insertGraph(lg.getNodes(), lg.getEdges(), parentNode);

            // trigger re-render
            this.logicalGraph.valueHasMutated();
            this.undo().pushSnapshot(this, "Inserted " + file.name);
            this.checkGraph();

            // show errors/warnings
            this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);
        });
    };

    private _remotePaletteLoaded = (file : RepositoryFile, data : string) : void => {
        // load the remote palette into EAGLE's palettes object.

        // check palette is not already loaded
        const alreadyLoadedPalette : Palette = this.findPaletteByFile(file);

        // if dictated by settings, reload the palette immediately
        if (alreadyLoadedPalette !== null && Setting.findValue(Utils.CONFIRM_RELOAD_PALETTES)){
            Utils.requestUserConfirm("Reload Palette?", "This palette (" + file.name + ") is already loaded, do you wish to load it again?", "Yes", "No", (confirmed : boolean) : void => {
                if (confirmed){
                    this._reloadPalette(file, data, alreadyLoadedPalette);
                }
            });
        } else {
            this._reloadPalette(file, data, alreadyLoadedPalette);
        }
    }

    private _reloadPalette = (file : RepositoryFile, data : string, palette : Palette) : void => {
        // close the existing version of the open palette
        if (palette !== null){
            this.closePalette(palette);
        }

        // load the new palette
        const errorsWarnings: Errors.ErrorsWarnings = {"errors":[], "warnings":[]};
        const newPalette = Palette.fromOJSJson(data, file, errorsWarnings);

        // sort items in palette
        newPalette.sort();

        // add to list of palettes
        this.palettes.unshift(newPalette);

        // show errors/warnings
        this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);

        this.leftWindow().shown(true);
    }

    private updateLogicalGraphFileInfo = (repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, path : string, name : string) : void => {
        console.log("updateLogicalGraphFileInfo(): repositoryService:", repositoryService, "repositoryName:", repositoryName, "repositoryBranch:", repositoryBranch, "path:", path, "name:", name);

        // update the activeFileInfo with details of the repository the file was loaded from
        this.logicalGraph().fileInfo().repositoryName = repositoryName;
        this.logicalGraph().fileInfo().repositoryBranch = repositoryBranch;
        this.logicalGraph().fileInfo().repositoryService = repositoryService;
        this.logicalGraph().fileInfo().path = path;
        this.logicalGraph().fileInfo().name = name;

        // communicate to knockout that the value of the fileInfo has been modified (so it can update UI)
        this.logicalGraph().fileInfo.valueHasMutated();

    }

    findPaletteByFile = (file : RepositoryFile) : Palette => {
        for (const palette of this.palettes()){
            if (palette.fileInfo().name === file.name){
                return palette;
            }
        }

        return null;
    }

    closePaletteMenus=() : void => {
        $("#paletteList .dropdown-toggle").removeClass("show")
        $("#paletteList .dropdown-menu").removeClass("show")
    }

    closePalette = (palette : Palette) : void => {
        for (let i = 0 ; i < this.palettes().length ; i++){
            const p = this.palettes()[i];

            if (p.fileInfo().name === palette.fileInfo().name){

                // check if the palette is modified, and if so, ask the user to confirm they wish to close
                if (p.fileInfo().modified && Setting.findValue(Utils.CONFIRM_DISCARD_CHANGES)){
                    Utils.requestUserConfirm("Close Modified Palette", "Are you sure you wish to close this modified palette?", "Close", "Cancel", (confirmed : boolean) : void => {
                        if (confirmed){
                            this.palettes.splice(i, 1);
                        }
                    });
                } else {
                    this.palettes.splice(i, 1);
                }

                break;
            }
        }
        this.resetEditor()
    }

    getParentNameAndKey = (parentKey:number) : string => {
        if(parentKey === null){
            return ""
        }

        // TODO: temporary fix while we get lots of warnings about missing nodes
        const parentNode = this.logicalGraph().findNodeByKeyQuiet(parentKey);

        if (parentNode === null){
            return ""
        }

        const parentText = parentNode.getName() + ' | Key: ' + parentKey;

        return parentText
    }

    // TODO: shares some code with saveFileToLocal(), we should try to factor out the common stuff at some stage
    savePaletteToDisk = (palette : Palette) : void => {
        console.log("savePaletteToDisk()", palette.fileInfo().name, palette.fileInfo().type);

        let fileName = palette.fileInfo().name;

        // Adding file extension to the title if it does not have it.
        if (!Utils.verifyFileExtension(fileName)) {
            fileName = fileName + "." + Utils.getDiagramExtension(Eagle.FileType.Palette);
        }

        // clone the palette and remove github info ready for local save
        const p_clone : Palette = palette.clone();
        p_clone.fileInfo().removeGitInfo();
        p_clone.fileInfo().updateEagleInfo();
        const json = Palette.toOJSJson(p_clone);

        // validate json
        if (!Setting.findValue(Utils.DISABLE_JSON_VALIDATION)){
            const validatorResult : {valid: boolean, errors: string} = Utils.validateJSON(json, Eagle.DALiuGESchemaVersion.OJS, Eagle.FileType.Palette);
            if (!validatorResult.valid){
                const message = "JSON Output failed validation against internal JSON schema, saving anyway";
                console.error(message, validatorResult.errors);
                Utils.showUserMessage("Error", message + "<br/>" + validatorResult.errors);
                //return;
            }
        }

        Utils.httpPostJSON('/saveFileToLocal', json, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            Utils.downloadFile(error, data, fileName);

            // since changes are now stored locally, the file will have become out of sync with the GitHub repository, so the association should be broken
            // clear the modified flag
            palette.fileInfo().modified = false;
            palette.fileInfo().repositoryService = Eagle.RepositoryService.Unknown;
            palette.fileInfo().repositoryName = "";
            palette.fileInfo().repositoryUrl = "";
            palette.fileInfo().commitHash = "";
            palette.fileInfo().downloadUrl = "";
            palette.fileInfo.valueHasMutated();
        });
    }

    /**
     * Saves the file to a local download folder.
     */
    saveGraphToDisk = (graph : LogicalGraph) : void => {
        console.log("saveGraphToDisk()", graph.fileInfo().name, graph.fileInfo().type);

        // check that the fileType has been set for the logicalGraph
        if (graph.fileInfo().type !== Eagle.FileType.Graph){
            Utils.showUserMessage("Error", "Graph fileType not set correctly. Could not save file.");
            return;
        }

        let fileName = graph.fileInfo().name;

        // generate filename if necessary
        if (fileName === "") {
            fileName = "Diagram-" + Utils.generateDateTimeString() + "." + Utils.getDiagramExtension(Eagle.FileType.Graph);
            graph.fileInfo().name = fileName;
        }

        // clone the logical graph and remove github info ready for local save
        const lg_clone : LogicalGraph = this.logicalGraph().clone();
        lg_clone.fileInfo().removeGitInfo();
        lg_clone.fileInfo().updateEagleInfo();
        const json : object = LogicalGraph.toOJSJson(lg_clone, false);

        // validate json
        if (!Setting.findValue(Utils.DISABLE_JSON_VALIDATION)){
            const validatorResult : {valid: boolean, errors: string} = Utils.validateJSON(json, Eagle.DALiuGESchemaVersion.OJS, Eagle.FileType.Graph);
            if (!validatorResult.valid){
                const message = "JSON Output failed validation against internal JSON schema, saving anyway";
                console.error(message, validatorResult.errors);
                Utils.showUserMessage("Error", message + "<br/>" + validatorResult.errors);
                //return;
            }
        }

        Utils.httpPostJSON('/saveFileToLocal', json, (error : string, data : string) : void => {
            if (error != null){
                Utils.showUserMessage("Error", "Error saving the file!");
                console.error(error);
                return;
            }

            Utils.downloadFile(error, data, fileName);

            // since changes are now stored locally, the file will have become out of sync with the GitHub repository, so the association should be broken
            // clear the modified flag
            graph.fileInfo().modified = false;
            graph.fileInfo().repositoryService = Eagle.RepositoryService.File;
            graph.fileInfo().repositoryName = "";
            graph.fileInfo().repositoryUrl = "";
            graph.fileInfo().commitHash = "";
            graph.fileInfo().downloadUrl = "";
            graph.fileInfo.valueHasMutated();
        });
    }

    savePaletteToGit = (palette: Palette): void => {
        console.log("savePaletteToGit()", palette.fileInfo().name, palette.fileInfo().type);

        const defaultRepository: Repository = new Repository(palette.fileInfo().repositoryService, palette.fileInfo().repositoryName, palette.fileInfo().repositoryBranch, false);

        Utils.requestUserGitCommit(defaultRepository, Repositories.getList(Eagle.RepositoryService.GitHub),  palette.fileInfo().path, palette.fileInfo().name, (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            const repository : Repository = Repositories.get(repositoryService, repositoryName, repositoryBranch);
            if (repository === null){
                console.log("Abort commit");
                return;
            }

            // get access token for this type of repository
            let token : string;

            switch (repositoryService){
                case Eagle.RepositoryService.GitHub:
                    token = Setting.findValue(Utils.GITHUB_ACCESS_TOKEN_KEY);
                    break;
                case Eagle.RepositoryService.GitLab:
                    token = Setting.findValue(Utils.GITLAB_ACCESS_TOKEN_KEY);
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
                    return;
            }

            // check that access token is defined
            if (token === null || token === "") {
                Utils.showUserMessage("Error", "The GitHub access token is not set! To save files on GitHub, set the access token.");
                return;
            }

            const fullFileName : string = Utils.joinPath(filePath, fileName);

            // clone the palette
            const p_clone : Palette = palette.clone();
            p_clone.fileInfo().updateEagleInfo();
            const json = Palette.toOJSJson(p_clone);

            const jsonData : object = {
                jsonData: json,
                repositoryBranch: repository.branch,
                repositoryName: repository.name,
                repositoryService: repository.service,
                token: token,
                filename: fullFileName,
                commitMessage: commitMessage
            };


            this.saveFileToRemote(repository, filePath, fileName, Eagle.FileType.Palette, palette.fileInfo, jsonData);
        });
    }

    setTranslatorUrl = () : void => {
        const translatorURLSetting : Setting = Setting.find(Utils.TRANSLATOR_URL);

        Utils.requestUserString("Translator Url", "Enter the Translator Url", translatorURLSetting.value(), false, (completed : boolean, userString : string) : void => {
            // abort if user cancelled the action
            if (!completed)
                return;

            translatorURLSetting.value(userString);
        });
    };

    getTranslatorDefault = () : any => {
        setTimeout(function(){
            const defaultTranslatorHtml = $(".rightWindowContainer #"+Eagle.defaultTranslatorAlgorithm).clone(true)
            $('.simplifiedTranslator').append(defaultTranslatorHtml)
            return defaultTranslatorHtml
        },10000)
    }

    translatorAlgorithmVisible = ( currentAlg:string) : boolean => {
        const defaultTranslatorMode :any = Eagle.translatorUiMode(Eagle.TranslatorMode.Default)
        if(!defaultTranslatorMode){
            return true
        }

        if(currentAlg === Eagle.defaultTranslatorAlgorithm){
            return true
        }
    
        return false
    }

    saveAsPNG = () : void => {
        Utils.saveAsPNG('#logicalGraphD3Div svg', this.logicalGraph().fileInfo().name);
    };

    toggleCollapseAllGroups = () : void => {
        // first work out whether we should be collapsing or expanding
        let numCollapsed: number = 0;
        let numExpanded: number = 0;
        for (const node of this.logicalGraph().getNodes()){
            if (node.isGroup()){
                if (node.isCollapsed()){
                    numCollapsed += 1;
                } else {
                    numExpanded += 1;
                }
            }
        }
        const collapse: boolean = numExpanded > numCollapsed;

        // now loop through and collapse or expand all group nodes
        for (const node of this.logicalGraph().getNodes()){
            if (node.isGroup()){
                node.setCollapsed(collapse);
            }
        }

        // trigger re-render
        this.logicalGraph.valueHasMutated();
    }

    toggleCollapseAllNodes = () : void => {
        // first work out whether we should be collapsing or expanding
        let numCollapsed: number = 0;
        let numExpanded: number = 0;
        for (const node of this.logicalGraph().getNodes()){
            if (!node.isGroup() && !node.isData()){
                if (node.isCollapsed()){
                    numCollapsed += 1;
                } else {
                    numExpanded += 1;
                }
            }
        }
        const collapse: boolean = numExpanded > numCollapsed;

        // now loop through and collapse or expand all group nodes
        for (const node of this.logicalGraph().getNodes()){
            if (node.isData()){
                node.setCollapsed(true);
            }

            if (!node.isGroup() && !node.isData()){
                node.setCollapsed(collapse);
            }
        }

        // trigger re-render
        this.logicalGraph.valueHasMutated();
    }

    toggleEdgeClosesLoop = () : void => {
        this.selectedEdge().toggleClosesLoop();

        // get nodes from edge
        const sourceNode = this.logicalGraph().findNodeByKey(this.selectedEdge().getSrcNodeKey());
        const destNode = this.logicalGraph().findNodeByKey(this.selectedEdge().getDestNodeKey());

        sourceNode.setGroupEnd(this.selectedEdge().isClosesLoop());
        destNode.setGroupStart(this.selectedEdge().isClosesLoop());

        this.checkGraph();
        Utils.showNotification("Toggle edge closes loop", "Node " + sourceNode.getName() + " component parameter 'group_end' set to " + sourceNode.getFieldByIdText("group_end").getValue() + ". Node " + destNode.getName() + " component parameter 'group_start' set to " + destNode.getFieldByIdText("group_start").getValue() + ".", "success");

        this.selectedObjects.valueHasMutated();
        this.logicalGraph.valueHasMutated();
    }

    showAbout = () : void => {
        $('#aboutModal').modal('show');
    }

    runTutorial = (name : string) : void => {
        console.log("runTutorial(" + name + ")");

        // start the tutorial
        ij(name).setOption("showStepNumbers", false).setOption("skipLabel", "Exit").start();
    }

    onlineDocs = () : void => {
        console.log("online help");

        // open in new tab:
        window.open(
          'https://eagle-dlg.readthedocs.io/',
          '_blank'
        );
    }

    readme = () : void => {
        console.log("readme");

        // open in new tab:
        window.open(
          'https://github.com/ICRAR/EAGLE/blob/master/README.md',
          '_blank'
        );
    }

    submitIssue = () : void => {
        console.log("submitIssue");

        // automatically add the EAGLE version and commit hash to the body of the new issue
        let bodyText: string = "\n\nVersion: "+(<any>window).version+"\nCommit Hash: "+(<any>window).commit_hash;

        // url encode the body text
        bodyText = encodeURI(bodyText);

        // open in new tab
        window.open("https://github.com/ICRAR/EAGLE/issues/new?body="+bodyText, "_blank");
    }

    // TODO: move to Setting.ts?
    openSettings = () : void => {
        //if no tab is selected yet, default to the first tab
        if(!$(".settingCategoryActive").length){
            $(".settingsModalButton").first().click()
        }
        Utils.showSettingsModal();
    }

    openParamsTableModal = (mode:string) : void => {
        if (mode==='inspectorTableModal' && !this.selectedNode()){
            Utils.showNotification("Error", "No Node Is Selected", "warning");
        }else{
            Utils.showOpenParamsTableModal(mode);
        }
    }

    getCurrentParamReadonly = (field:Field) : boolean => {
        // if we want to get readonly-ness the Nth application arg, then the real index
        // into the fields array is probably larger than N, since all four types
        // of fields are stored there

        if(Eagle.selectedLocation() === Eagle.FileType.Palette){
            if(Eagle.allowPaletteEditing()){
                return false;
            }else{
                return field.isReadonly()
            }
        }else{
            if(Eagle.allowComponentEditing()){
                return false;
            }else{
                return field.isReadonly()
            }
        }
    }

    // TODO: move to Setting.ts?
    toggleSettingsTab = (btn:any, target:any) :void => {
        //deselect and deactivate current tab content and buttons
        $(".settingsModalButton").removeClass("settingCategoryBtnActive");
        $(".settingsModalCategoryWrapper").removeClass("settingCategoryActive");

        //activate selected tab content and button
        $("#"+btn).addClass("settingCategoryBtnActive");
        $("#"+target).addClass("settingCategoryActive");
    }

    // TODO: move to KeyboardShortcut.ts?
    openShortcuts = () : void => {
        if(!Eagle.shortcutModalCooldown || Date.now() >= (Eagle.shortcutModalCooldown + 500)){
            Eagle.shortcutModalCooldown = Date.now()
            Utils.showShortcutsModal();
        }
        return
    }

    // TODO: move to Setting.ts?
    //copies currently set settings in case the user wishes to cancel changes in the setting modal
    copyCurrentSettings = () : void => {
        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                setting.copyCurrentSettings();
            }
        }
    }

    // TODO: move to Setting.ts?
    //returns settings values to the previously copied settings, canceling the settings editing
    cancelSettingChanges = () : void => {
        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                setting.cancelChanges();
            }
        }
    }

    addEdgeToLogicalGraph = () : void => {
        // check that there is at least one node in the graph, otherwise it is difficult to create an edge
        if (this.logicalGraph().getNumNodes() === 0){
            Utils.showUserMessage("Error", "Can't add an edge to a graph with zero nodes.");
            return;
        }

        // if input edge is null, then we are creating a new edge here, so initialise it with some default values
        const newEdge = new Edge(this.logicalGraph().getNodes()[0].getKey(), "", this.logicalGraph().getNodes()[0].getKey(), "", "", false, false, false);

        // display edge editing modal UI
        Utils.requestUserEditEdge(newEdge, this.logicalGraph(), (completed: boolean, edge: Edge) => {
            if (!completed){
                console.log("User aborted addEdgeToLogicalGraph()");
                return;
            }

            // validate edge
            const isValid: Eagle.LinkValid = Edge.isValid(this, edge.getId(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), edge.isLoopAware(), edge.isClosesLoop(), false, true, null);
            if (isValid === Eagle.LinkValid.Invalid || isValid === Eagle.LinkValid.Unknown){
                Utils.showUserMessage("Error", "Invalid edge");
                return;
            }

            const srcNode: Node = this.logicalGraph().findNodeByKey(edge.getSrcNodeKey());
            const srcPort: Field = srcNode.findPortById(edge.getSrcPortId());
            const destNode: Node = this.logicalGraph().findNodeByKey(edge.getDestNodeKey());
            const destPort: Field = destNode.findPortById(edge.getDestPortId());

            // new edges might require creation of new nodes, don't use addEdgeComplete() here!
            this.addEdge(srcNode, srcPort, destNode, destPort, edge.isLoopAware(), edge.isClosesLoop(), () => {
                this.checkGraph();
                this.undo().pushSnapshot(this, "Add edge");
                // trigger the diagram to re-draw with the modified edge
                this.logicalGraph.valueHasMutated();
            });
        });
    }

    editSelectedEdge = () : void => {
        const selectedEdge: Edge = this.selectedEdge();

        if (selectedEdge === null){
            console.log("Unable to edit selected edge: No edge selected");
            return;
        }

        // clone selected edge so that no changes to the original can be made by the user request modal
        const clone: Edge = selectedEdge.clone();

        Utils.requestUserEditEdge(clone, this.logicalGraph(), (completed: boolean, edge: Edge) => {
            if (!completed){
                console.log("User aborted editSelectedEdge()");
                return;
            }

            // validate edge
            const isValid: Eagle.LinkValid = Edge.isValid(this, edge.getId(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), edge.isLoopAware(), edge.isClosesLoop(), false, true, null);
            if (isValid === Eagle.LinkValid.Invalid || isValid === Eagle.LinkValid.Unknown){
                Utils.showUserMessage("Error", "Invalid edge");
                return;
            }

            const srcNode: Node = this.logicalGraph().findNodeByKey(edge.getSrcNodeKey());
            const srcPort: Field = srcNode.findPortById(edge.getSrcPortId());
            const destNode: Node = this.logicalGraph().findNodeByKey(edge.getDestNodeKey());
            const destPort: Field = destNode.findPortById(edge.getDestPortId());

            // new edges might require creation of new nodes, we delete the existing edge and then create a new one using the full new edge pathway
            this.logicalGraph().removeEdgeById(edge.getId());
            this.addEdge(srcNode, srcPort, destNode, destPort, edge.isLoopAware(), edge.isClosesLoop(), () => {
                this.checkGraph();
                this.undo().pushSnapshot(this, "Edit edge");
                // trigger the diagram to re-draw with the modified edge
                this.logicalGraph.valueHasMutated();
            });
        });
    }

    duplicateSelection = () : void => {
        console.log("duplicateSelection()", this.selectedObjects().length, "objects");

        switch(Eagle.selectedLocation()){
            case Eagle.FileType.Graph:
                {
                    const nodes : Node[] = [];
                    const edges : Edge[] = [];

                    // split objects into nodes and edges
                    for (const object of this.selectedObjects()){
                        if (object instanceof Node){
                            nodes.push(object);
                        }

                        if (object instanceof Edge){
                            edges.push(object);
                        }
                    }

                    this.insertGraph(nodes, edges, null);
                    this.checkGraph();
                    this.undo().pushSnapshot(this, "Duplicate selection");
                    this.logicalGraph.valueHasMutated();
                }
                break;
            case Eagle.FileType.Palette:
                {
                    const nodes: Node[] = [];

                    for (const object of this.selectedObjects()){
                        if (object instanceof Node){
                            nodes.push(object);
                        }
                    }

                    this.addNodesToPalette(nodes);
                }
                break;
            default:
                console.error("Unknown selectedLocation", Eagle.selectedLocation());
                break;
        }
    }

    addNodesToPalette = (nodes: Node[]) : void => {
        console.log("addNodesToPalette()");

        // build a list of palette names
        const paletteNames: string[] = this.buildWritablePaletteNamesList();

        // ask user to select the destination node
        Utils.requestUserChoice("Destination Palette", "Please select the palette to which you'd like to add the node(s)", paletteNames, 0, true, "New Palette Name", (completed : boolean, userChoiceIndex: number, userCustomChoice : string) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // if user made custom choice
            let userString: string = "";
            if (userChoiceIndex === paletteNames.length){
                userString = userCustomChoice;
            } else {
                userString = paletteNames[userChoiceIndex];
            }

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(userString)) {
                userString = userString + "." + Utils.getDiagramExtension(Eagle.FileType.Palette);
            }

            // get reference to palette (based on userString)
            const destinationPalette = this.findPalette(userString, true);

            // check that a palette was found
            if (destinationPalette === null){
                Utils.showUserMessage("Error", "Unable to find selected palette!");
                return;
            }

            for (const node of nodes){
                // skip non-node objects
                if (!(node instanceof Node)){
                    console.warn("addNodesToPalette(): skipped a non-node object");
                    continue;
                }

                // add clone to palette
                destinationPalette.addNode(node, true);

                // get key of just-added node
                const key: number = destinationPalette.getNodes()[destinationPalette.getNodes().length - 1].getKey();

                // check if clone has embedded applications, if so, add them to destination palette and remove
                if (node.hasInputApplication()){
                    destinationPalette.addNode(node.getInputApplication(), true);
                    destinationPalette.getNodes()[destinationPalette.getNodes().length - 1].setEmbedKey(key);
                }
                if (node.hasOutputApplication()){
                    destinationPalette.addNode(node.getOutputApplication(), true);
                    destinationPalette.getNodes()[destinationPalette.getNodes().length - 1].setEmbedKey(key);
                }

                // mark the palette as modified
                destinationPalette.fileInfo().modified = true;
                destinationPalette.sort();
            }
        });
    }

    addSelectedNodesToPalette = () : void => {
        const nodes = []

        for(const object of this.selectedObjects()){
            if ((object instanceof Node)){
                nodes.push(object)
            }
        }

        if (nodes.length === 0){
            console.error("Attempt to add selected node to palette when no node selected");
            return;
        }

        this.addNodesToPalette(nodes);
    }

    deleteSelection = (data:any, suppressUserConfirmationRequest: boolean, deleteChildren: boolean) : void => {
        // if no objects selected, warn user
        if (data === ''){
            data = this.selectedObjects()
        }
        if (data.length === 0){
            console.warn("Unable to delete selection: Nothing selected");
            Utils.showNotification("Warning", "Unable to delete selection: Nothing selected", "warning");
            return;
        }

        // if in "hide data nodes" mode, then recommend the user delete edges in "show data nodes" mode instead
        if (!this.showDataNodes()){
            console.warn("Unable to delete selection: Editor is in 'hide data nodes' mode, and the current selection may be ambiguous. Please use 'show data nodes' mode before deleting.");
            Utils.showNotification("Warning", "Unable to delete selection: Editor is in 'hide data nodes' mode, and the current selection may be ambiguous. Please use 'show data nodes' mode before deleting.", "warning");
            return;
        }

        // skip confirmation if setting dictates
        if (!Setting.find(Utils.CONFIRM_DELETE_OBJECTS).value() || suppressUserConfirmationRequest){
            this._deleteSelection(deleteChildren,data);
            return;
        }

        // determine number of nodes and edges in current selection
        let numNodes: number = 0;
        let numEdges: number = 0;
        for (const object of data){
            if (object instanceof Node){
                numNodes += 1;
            }

            if (object instanceof Edge){
                numEdges += 1;
            }
        }

        // determine number of child nodes that would be deleted
        const childNodes: Node[] = [];
        const childEdges: Edge[] = [];

        // find child nodes
        for (const object of data){
            if (object instanceof Node){
                childNodes.push(...this._findChildren(object));
            }
        }

        // find child edges
        for (const edge of this.logicalGraph().getEdges()){
            for (const node of childNodes){
                if (edge.getSrcNodeKey() === node.getKey() || edge.getDestNodeKey() === node.getKey()){
                    // check if edge as already in the list
                    let found = false;
                    for (const e of childEdges){
                        if (e.getId() === edge.getId()){
                            found = true;
                            break;
                        }
                    }

                    // push edge into childEdges (if not already in there)
                    if (!found){
                        childEdges.push(edge);
                    }
                }
            }
        }

        // build the confirmation message based on the current situation
        let confirmMessage: string = "Are you sure you wish to delete " + numEdges + " edge(s) and " + numNodes + " node(s)";

        // if no children exist, don't bother asking the user about them
        if (childNodes.length === 0 && childEdges.length === 0){
            confirmMessage += "?";
        } else {
            // if children will be deleted, let user know how many
            if (deleteChildren){
                confirmMessage += " (and their " + childNodes.length + " child node and " + childEdges.length + " child edges)?";
            } else {
                confirmMessage += "? All children will be preserved.";
            }
        }

        // request confirmation from user
        Utils.requestUserConfirm("Delete?", confirmMessage, "Yes", "No", (confirmed : boolean) : void => {
            if (!confirmed){
                console.log("User aborted deleteSelection()");
                return;
            }

            this._deleteSelection(deleteChildren,data);
        });
    }

    private _findChildren = (parent : Node) : Node[] => {
        const children: Node[] = [];

        for(const node of this.logicalGraph().getNodes()){
            if (node.getParentKey() === parent.getKey()){
                children.push(node);
                children.push(...this._findChildren(node));
            }
        }

        return children;
    }

    private _deleteSelection = (deleteChildren: boolean,data:any) : void => {
        if (Eagle.selectedLocation() === Eagle.FileType.Graph){

            // if not deleting children, move them to different parents first
            if (!deleteChildren){
                this._moveChildrenOfSelection();
            }

            // delete the selection
            for (const object of data){
                if (object instanceof Node){
                    this.logicalGraph().removeNode(object);
                }

                if (object instanceof Edge){
                    this.logicalGraph().removeEdgeById(object.getId());
                }
            }

            // flag LG has changed
            this.logicalGraph().fileInfo().modified = true;

            this.checkGraph();
            this.undo().pushSnapshot(this, "Delete Selection");
        }

        if (Eagle.selectedLocation() === Eagle.FileType.Palette){

            for (const object of data){
                if (object instanceof Node){
                    for (const palette of this.palettes()){
                        palette.removeNodeById(object.getId());

                        // TODO: only flag palette has changed if a node was removed
                        palette.fileInfo().modified = true;
                    }
                }

                // NOTE: do nothing with edges! shouldn't be any in palettes
            }
        }

        // empty the selected objects, should have all been deleted
        this.selectedObjects([]);
    }

    // used before deleting a selection, if we wish to preserve the children of the selection
    private _moveChildrenOfSelection = () : void => {
        for (const object of this.selectedObjects()){
            if (object instanceof Node){
                for (const node of this.logicalGraph().getNodes()){
                    if (node.getParentKey() === object.getKey()){
                        node.setParentKey(object.getParentKey());
                    }
                }
            }
        }
    }

    addNodeToLogicalGraph = (node : Node, callback: (node: Node) => void) : void => {
        let pos : {x:number, y:number};

        // if node is a construct, set width and height a little larger
        if (CategoryData.getCategoryData(node.getCategory()).canContainComponents){
            node.setWidth(Node.GROUP_DEFAULT_WIDTH);
            node.setHeight(Node.GROUP_DEFAULT_HEIGHT);
        }

        // get new position for node
        if (Eagle.nodeDropLocation.x === 0 && Eagle.nodeDropLocation.y === 0){
            pos = this.getNewNodePosition(node.getWidth(), node.getHeight());
        } else {
            pos = Eagle.nodeDropLocation;
        }

        this.addNode(node, pos.x, pos.y, (newNode: Node) => {
            // make sure the new node is selected
            this.setSelection(Eagle.RightWindowMode.Inspector, newNode, Eagle.FileType.Graph);

            // expand the new node, so the user can start connecting it to other nodes
            newNode.setCollapsed(false);

            // set parent (if the node was dropped on something)
            const parent : Node = this.logicalGraph().checkForNodeAt(newNode.getPosition().x, newNode.getPosition().y, newNode.getWidth(), newNode.getHeight(), newNode.getKey(), true);

            // if a parent was found, update
            if (parent !== null && newNode.getParentKey() !== parent.getKey() && newNode.getKey() !== parent.getKey()){
                //console.log("set parent", parent.getKey());
                newNode.setParentKey(parent.getKey());
            }

            // if no parent found, update
            if (parent === null && newNode.getParentKey() !== null){
                //console.log("set parent", null);
                newNode.setParentKey(null);
            }

            this.checkGraph();
            this.undo().pushSnapshot(this, "Add node " + newNode.getName());
            this.logicalGraph.valueHasMutated();

            if (callback !== null){
                callback(newNode);
            }
        });
    }

    addGraphNodesToPalette = () : void => {
        //check if there are any nodes in the graph
        if  (this.logicalGraph().getNodes().length === 0){
            Utils.showNotification("Unable to add nodes to palette", "No nodes found in graph", "danger");
            return
        }

        // build a list of palette names
        const paletteNames: string[] = this.buildWritablePaletteNamesList();

        // ask user to select the destination node
        Utils.requestUserChoice("Destination Palette", "Please select the palette to which you'd like to add the nodes", paletteNames, 0, true, "New Palette Name", (completed : boolean, userChoiceIndex: number, userCustomChoice : string) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // if user made custom choice
            let userString: string = "";
            if (userChoiceIndex === paletteNames.length){
                userString = userCustomChoice;
            } else {
                userString = paletteNames[userChoiceIndex];
            }

            // Adding file extension to the title if it does not have it.
            if (!Utils.verifyFileExtension(userString)) {
                userString = userString + "." + Utils.getDiagramExtension(Eagle.FileType.Palette);
            }

            // get reference to palette (based on userString)
            const destinationPalette = this.findPalette(userString, true);

            // check that a palette was found
            if (destinationPalette === null){
                Utils.showUserMessage("Error", "Unable to find selected palette!");
                return;
            }

            // copy nodes to palette
            for (const node of this.logicalGraph().getNodes()){
                // check if clone has embedded applications, if so, add them to destination palette and remove
                if (node.hasInputApplication()){
                    destinationPalette.addNode(node.getInputApplication(), false);
                }
                if (node.hasOutputApplication()){
                    destinationPalette.addNode(node.getOutputApplication(), false);
                }

                destinationPalette.addNode(node, false);
            }

            // mark the palette as modified
            destinationPalette.fileInfo().modified = true;
        });
    }

    private buildWritablePaletteNamesList = () : string[] => {
        const paletteNames : string[] = [];
        for (const palette of this.palettes()){
            // skip the dynamically generated palette that contains all nodes
            if (palette.fileInfo().name === Palette.DYNAMIC_PALETTE_NAME){
                continue;
            }
            // skip the built-in palette
            if (palette.fileInfo().name === Palette.BUILTIN_PALETTE_NAME){
                continue;
            }
            // skip read-only palettes as well
            if (palette.fileInfo().readonly){
                continue;
            }

            paletteNames.push(palette.fileInfo().name);
        }

        return paletteNames;
    }

    private buildReadablePaletteNamesList = () : string[] => {
        const paletteNames : string[] = [];
        for (const palette of this.palettes()){
            paletteNames.push(palette.fileInfo().name);
        }

        return paletteNames;
    }

    findPalette = (name: string, createIfNotFound: boolean) : Palette => {
        let p: Palette = null;

        // look for palette in open palettes
        for (const palette of this.palettes()){
            if (palette.fileInfo().name === name){
                p = palette;
                break;
            }
        }

        // if user asked for a new palette, create one
        if (createIfNotFound && p === null){
            p = new Palette();
            p.fileInfo().name = name;
            p.fileInfo().readonly = false;
            this.palettes.unshift(p);
        }

        return p;
    }

    /* TODO: 4-level-deep callbacks here, probably should move this to use Promises */
    fetchDockerHTML = () : void => {
        Utils.showNotification("EAGLE", "Fetching data from Docker Hub", "info");

        const that = this;
        const username = Setting.findValue(Utils.DOCKER_HUB_USERNAME);

        // request eagle server to fetch a list of docker hub images
        Utils.httpPostJSON("/getDockerImages", {username:username}, function(error : string, data: any){
            if (error != null){
                console.error(error);
                return;
            }

            // build list of image strings
            const images: string[] = [];
            for (const result of data.results){
                images.push(result.user + "/" + result.name);
            }

            // present list of image names to user
            Utils.requestUserChoice("Docker Hub", "Choose an image", images, -1, false, "", function(completed: boolean, userChoiceIndex: number){
                if (!completed){
                    return;
                }

                const imageName: string = images[userChoiceIndex];

                Utils.showNotification("EAGLE", "Fetching data for " + imageName + " from Docker Hub", "info");

                // request eagle server to fetch a list of tags for the given docker image
                Utils.httpPostJSON("/getDockerImageTags", {imagename:imageName}, function(error: string, data: any){
                    if (error != null){
                        console.error(error);
                        return;
                    }

                    const tags: string[] = [];
                    for (const result of data.results){
                        tags.push(result.name);
                    }

                    // present list of tags to user
                    Utils.requestUserChoice("Docker Hub", "Choose a tag for image " + imageName, tags, -1, false, "", function(completed: boolean, userChoiceIndex: number){
                        if (!completed){
                            return;
                        }

                        const tag = data.results[userChoiceIndex].name;
                        const digest = data.results[userChoiceIndex].images[0].digest;

                        // get reference to the selectedNode
                        const selectedNode = that.selectedNode();

                        // get references to image, tag and digest fields in this component
                        const imageField:  Field = selectedNode.getFieldByIdText("image");
                        const tagField:    Field = selectedNode.getFieldByIdText("tag");
                        const digestField: Field = selectedNode.getFieldByIdText("digest");

                        // set values for the fields
                        if (imageField !== null){
                            imageField.setValue(imageName);
                        }
                        if (tagField !== null){
                            tagField.setValue(tag);
                        }
                        if (digestField !== null){
                            digestField.setValue(digest);
                        }
                    });
                });
            });
        });
    }

    showExplorePalettes = () : void => {
        Utils.showPalettesModal(this);
    }

    // Adds an field to the selected node via HTML
    addFieldHTML = () : void => {
        const node: Node = this.selectedNode();

        if (node === null){
            console.error("Attempt to add field when no node selected");
            return;
        }

        this.editField(node, Eagle.ModalType.Add, Eagle.FieldType.ComponentParameter, null);
        $("#editFieldModal").addClass("forceHide");
        $("#editFieldModal").removeClass("fade");
        $(".modal-backdrop").addClass("forceHide");
        $("#nodeInspectorAddFieldDiv").show();
    }

    // Adds an application param to the selected node via HTML
    addApplicationArgHTML = () : void => {
        const node: Node = this.selectedNode();

        if (node === null){
            console.error("Attempt to add application param when no node selected");
            return;
        }

        this.editField(node, Eagle.ModalType.Add, Eagle.FieldType.ApplicationArgument, null);
        $("#editFieldModal").addClass("forceHide");
        $("#editFieldModal").removeClass("fade");
        $(".modal-backdrop").addClass("forceHide");
        $("#nodeInspectorAddApplicationParamDiv").show();
    }

    // Adds an output port to the selected node via HTML
    addInputPortHTML = () : void => {
        const node: Node = this.selectedNode();

        if (node === null){
            console.error("Attempt to add input port when no node selected");
            return;
        }

        this.editField(node, Eagle.ModalType.Add, Eagle.FieldType.InputPort, null);
        $("#editFieldModal").addClass("forceHide");
        $("#editFieldModal").removeClass("fade");
        $(".modal-backdrop").addClass("forceHide");
        $("#nodeInspectorAddInputPortDiv").show();
    }

    // Adds an output port to the selected node via HTML
    addOutputPortHTML = () : void => {
        const node: Node = this.selectedNode();

        if (node === null){
            console.error("Attempt to add output port when no node selected");
            return;
        }

        this.editField(node, Eagle.ModalType.Add, Eagle.FieldType.OutputPort, null);
        $("#editFieldModal").addClass("forceHide");
        $("#editFieldModal").removeClass("fade");
        $(".modal-backdrop").addClass("forceHide");
        $("#nodeInspectorAddOutputPortDiv").show();
    }

    getInspectorHeadingTooltip = (title:string, category:any, description:any) : string => {
        const tooltipText = "<h5>"+title+":</h5>"+category+"<br>"+description;
        return tooltipText;
    }

    // hide the drop down menu that appears when the user is adding a new field
    hideDropDown = (divID:string) : void => {
        if (divID === "nodeInspectorAddFieldDiv"){
            //hides the dropdown node inspector elements when stopping hovering over the element
            if(!$("#editFieldModal").hasClass("nodeSelected")){
                $("#editFieldModal").modal('hide');
                $("#editFieldModal").addClass("fade");
            }
        }

        $("#editFieldModal").removeClass("nodeSelected");
        $("#"+divID).hide();
    }

    addEmptyTableRow = () : void => {
        let fieldIndex:number

        if(ParameterTable.hasSelection()){
            // A cell in the table is selected well insert new row instead of adding at the end
            fieldIndex = ParameterTable.selectionParentIndex() + 1
            this.selectedNode().addEmptyField(fieldIndex)
        }else{
            this.selectedNode().addEmptyField(-1)

            //getting the length of the array to use as an index to select the last row in the table
            fieldIndex = this.selectedNode().getFields().length-1;
        }

        //a timeout was necessary to wait for the element to be added before counting how many there are
        setTimeout(function() {
            //handling selecting and highlighting the newly created row
            const clickTarget = $($("#paramsTableWrapper tbody").children()[fieldIndex]).find('.selectionTargets')[0]

            clickTarget.click() //simply clicking the element is best as it also lets knockout handle all of the selection and obsrevable update processes
            clickTarget.focus() // used to focus the field allowing the user to immediately start typing

            //scroll to new row
            $("#parameterTableModal .modal-body").animate({
                scrollTop: (fieldIndex*30)
            }, 1000);
        }, 100);
    }

    // TODO: this is a bit difficult to understand, it seems like it is piggy-backing
    // an old UI that is no longer used, perhaps we should just call Eagle.editField(..., 'Add', ...)
    nodeInspectorDropdownClick = (val:number, num:number, divID:string) : void => {
        const selectSectionID : string = "fieldModalSelect";
        const modalID : string = "editFieldModal";
        const submitBtnID: string = "editFieldModalAffirmativeButton";

        // val -1 is an empty option, so just close the dropdown
        if (val===-1){
            this.hideDropDown(divID);
            return;
        }

        if (val===0){
            //select custom field externally and open custom properties menu
            $("#"+divID).hide();
            $("#"+selectSectionID).val(val).trigger('change');
            $("#"+modalID).addClass("nodeSelected");

            // triggers the 'add application argument' modal to show
            $("#"+modalID).removeClass("forceHide");

            // triggers the modal 'lightbox' to show
            $(".modal-backdrop").removeClass("forceHide");
        }else{
            $("#"+selectSectionID).val(val).trigger('change');
            $("#"+modalID).addClass("nodeSelected");
            $("#"+modalID).removeClass("forceHide");
            $(".modal-backdrop").removeClass("forceHide");
            $("#"+submitBtnID).click()
            this.hideDropDown(divID)
        }
    }

    editFieldDropdownClick = (newType: string, oldType: string) : void => {
        // check if the types already match, therefore nothing to do
        if (Utils.dataTypePrefix(oldType) === newType){
            return;
        }

        // NOTE: this changes the value (using val()), then triggers a change event, so that validation can be done
        $('#editFieldModalTypeInput').val(newType).change();
    }

    changeNodeParent = () : void => {
        // build list of node name + ids (exclude self)
        const selectedNode: Node = this.selectedNode();

        if (selectedNode === null){
            console.error("Attempt to add change parent node when no node selected");
            return;
        }

        const nodeList : string[] = [];
        let selectedChoiceIndex = 0;

        //this is needed for the selected choice index as the index of the function will not work because many entries a skipped, the selected choice index was generally higher than the amount of legitimate choices available
        let validChoiceIndex = 0

        // build list of nodes that are candidates to be the parent
        for (let i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            const node : Node = this.logicalGraph().getNodes()[i];

            // a node can't be its own parent
            if (node.getKey() === selectedNode.getKey()){
                continue;
            }

            // only group (construct) nodes can be parents
            if (!node.isGroup()){
                continue;
            }

            //this index only counts up if the above doesnt filter out the choice
            validChoiceIndex++

            // if this node is already the parent, note its index, so that we can preselect this parent node in the modal dialog
            if (node.getKey() === selectedNode.getParentKey()){
                selectedChoiceIndex = validChoiceIndex;
            }

            nodeList.push(node.getName() + " : " + node.getKey());
        }

        // add "None" to the list of possible parents
        nodeList.unshift("None : 0");

        // ask user to choose a parent
        Utils.requestUserChoice("Node Parent Id", "Select a parent node", nodeList, selectedChoiceIndex, false, "", (completed : boolean, userChoiceIndex: number) => {
            if (!completed)
                return;

            const choice: string = nodeList[userChoiceIndex];

            // change the parent
            const newParentKey : number = parseInt(choice.substring(choice.lastIndexOf(" ") + 1), 10);

            // key '0' is a special case
            if (newParentKey === 0){
                selectedNode.setParentKey(null);
            } else {
                selectedNode.setParentKey(newParentKey);
            }

            // refresh the display
            this.checkGraph();
            this.undo().pushSnapshot(this, "Change Node Parent");
            this.selectedObjects.valueHasMutated();
            this.logicalGraph.valueHasMutated();
        });
    }

    changeNodeSubject = () : void => {
        // build list of node name + ids (exclude self)
        const selectedNode: Node = this.selectedNode();

        if (selectedNode === null){
            console.error("Attempt to change subject node when no node selected");
            return;
        }

        const nodeList : string[] = [];
        let selectedChoiceIndex = 0;

        // build list of nodes that are candidates to be the subject
        for (let i = 0 ; i < this.logicalGraph().getNodes().length; i++){
            const node : Node = this.logicalGraph().getNodes()[i];

            // if this node is already the subject, note its index, so that we can preselect this subject node in the modal dialog
            if (node.getKey() === selectedNode.getSubjectKey()){
                selectedChoiceIndex = i;
            }

            // comment and description nodes can't be the subject of comment nodes
            if (node.getCategory() === Category.Comment || node.getCategory() === Category.Description){
                continue;
            }

            nodeList.push(node.getName() + " : " + node.getKey());
        }

        // ask user for parent
        Utils.requestUserChoice("Node Subject Id", "Select a subject node", nodeList, selectedChoiceIndex, false, "", (completed : boolean, userChoiceIndex: number) => {
            if (!completed)
                return;

            const choice = nodeList[userChoiceIndex];

            // change the subject
            const newSubjectKey : number = parseInt(choice.substring(choice.lastIndexOf(" ") + 1), 10);
            selectedNode.setSubjectKey(newSubjectKey);

            // refresh the display
            this.checkGraph();
            this.undo().pushSnapshot(this, "Change Node Subject");
            this.selectedObjects.valueHasMutated();
            this.logicalGraph.valueHasMutated();
        });
    }

    changeEdgeDataType = (edge: Edge) : void => {
        // get reference to selected Edge
        const selectedEdge: Edge = this.selectedEdge();

        if (selectedEdge === null){
            console.error("Attempt to change edge data type when no edge selected");
            return;
        }

        // set selectedIndex to the index of the current data type within the allTypes list
        let selectedIndex = 0;
        for (let i = 0 ; i < this.types().length ; i++){
            if (this.types()[i] === selectedEdge.getDataType()){
                selectedIndex = i;
                break;
            }
        }

        // launch modal
        Utils.requestUserChoice("Change Edge Data Type", "NOTE: changing a edge's data type will also change the data type of the source and destination ports", this.types(), selectedIndex, false, "", (completed:boolean, userChoiceIndex: number, userCustomString: string) => {
            if (!completed){
                return;
            }

            // get user selection
            const newType = this.types()[userChoiceIndex];

            // get references to the source and destination ports of this edge
            const sourceNode = this.logicalGraph().findNodeByKey(edge.getSrcNodeKey());
            const sourcePort = sourceNode.findPortById(edge.getSrcPortId());
            const destinationNode = this.logicalGraph().findNodeByKey(edge.getDestNodeKey());
            const destinationPort = destinationNode.findPortById(edge.getDestPortId());

            // update the edge and ports
            edge.setDataType(newType);
            sourcePort.setType(newType);
            destinationPort.setType(newType);

            // flag changes
            this.checkGraph();
            this.undo().pushSnapshot(this, "Change Edge Data Type");
            this.selectedObjects.valueHasMutated();
            this.logicalGraph.valueHasMutated();
        });
    }

    removeParamFromNodeByIndex = (node: Node, fieldType: Eagle.FieldType, index: number) : void => {
        if (node === null){
            console.warn("Could not remove param from null node");
            return;
        }

        // if we want to delete the Nth application arg, then the real index
        // into the fields array is probably larger than N, since all four types
        // of fields are stored there
        let realIndex = -1;
        let fieldTypeCount = 0;

        for (let i = 0 ; i < node.getFields().length; i++){
            const field: Field = node.getFields()[i];

            if (field.getFieldType() === fieldType || Eagle.FieldType.Unknown === fieldType){
                fieldTypeCount += 1;
            }

            // check if we have found the Nth field of desired type
            if (fieldTypeCount > index){
                realIndex = i;
                break;
            }
        }

        // check that we actually found the right field, otherwise abort
        if (realIndex === -1){
            console.warn("Could not remove param index", index, "of type", fieldType, ". Not found.");
            return;
        }

        node.removeFieldByIndex(realIndex);

        this.checkGraph();
        this.undo().pushSnapshot(this, "Remove param from node");
        this.flagActiveFileModified();
        this.selectedObjects.valueHasMutated();
    }

    removePortFromNodeByIndex = (node : Node, fieldId:string, input : boolean) : void => {
        console.log("removePortFromNodeByIndex(): node", node.getName(), "index",fieldId, "input", input);

        if (node === null){
            console.warn("Could not remove port from null node");
            return;
        }

        // remember port id
        const portId = fieldId
        //doing this so this function will work both in context of being in a port only loop as well as a fields loop
        const portIndex = node.findPortIndexById(portId)

        console.log("Found portId to remove:", portId);

        // remove port
        if (input){
            node.removeFieldTypeByIndex(portIndex, Eagle.FieldType.InputPort);
        } else {
            node.removeFieldTypeByIndex(portIndex, Eagle.FieldType.OutputPort);
        }

        // remove any edges connected to that port
        const edges : Edge[] = this.logicalGraph().getEdges();

        for (let i = edges.length - 1; i >= 0; i--){
            if (edges[i].getSrcPortId() === portId || edges[i].getDestPortId() === portId){
                console.log("Remove incident edge", edges[i].getSrcPortId(), "->", edges[i].getDestPortId());
                edges.splice(i, 1);
            }
        }

        this.checkGraph();
        this.undo().pushSnapshot(this, "Remove port from node");
        this.flagActiveFileModified();
        this.selectedObjects.valueHasMutated();
    }

    nodeDropLogicalGraph = (eagle : Eagle, e : JQueryEventObject) : void => {
        // keep track of the drop location
        Eagle.nodeDropLocation = this.getNodeDropLocation(e);

        // determine dropped node
        const sourceComponents : Node[] = [];

        // if some node in the graph is selected, ignore it and used the node that was dragged from the palette
        if (Eagle.selectedLocation() === Eagle.FileType.Graph || Eagle.selectedLocation() === Eagle.FileType.Unknown){
            const component = this.palettes()[Eagle.nodeDragPaletteIndex].getNodes()[Eagle.nodeDragComponentIndex];
            sourceComponents.push(component);
        }

        // if a node or nodes in the palette are selected, then assume those are being moved to the destination
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            for (const object of this.selectedObjects()){
                if (object instanceof Node){
                    sourceComponents.push(object);
                }
            }
        }

        // add each of the nodes we are moving
        for (const sourceComponent of sourceComponents){
            this.addNodeToLogicalGraph(sourceComponent, null);

            // to avoid placing all the selected nodes on top of each other at the same spot, we increment the nodeDropLocation after each node
            Eagle.nodeDropLocation.x += 20;
            Eagle.nodeDropLocation.y += 20;
        }

        // then reset the nodeDropLocation after all have been placed
        Eagle.nodeDropLocation = {x:0, y:0};
    }

    nodeDropPalette = (eagle: Eagle, e: JQueryEventObject) : void => {
        const sourceComponents : Node[] = [];
        
        if(Eagle.nodeDragPaletteIndex === undefined){
            return;
        }

        // if some node in the graph is selected, ignore it and used the node that was dragged from the palette
        if (Eagle.selectedLocation() === Eagle.FileType.Graph || Eagle.selectedLocation() === Eagle.FileType.Unknown){
            const component = this.palettes()[Eagle.nodeDragPaletteIndex].getNodes()[Eagle.nodeDragComponentIndex];
            sourceComponents.push(component);
        }

        // if a node or nodes in the palette are selected, then assume those are being moved to the destination
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            for (const object of this.selectedObjects()){
                if (object instanceof Node){
                    sourceComponents.push(object);
                }
            }
        }

        // determine destination palette
        const destinationPaletteIndex : number = parseInt($(e.currentTarget)[0].getAttribute('data-palette-index'), 10);
        const destinationPalette: Palette = this.palettes()[destinationPaletteIndex];

        const allowReadonlyPaletteEditing = Eagle.allowReadonlyPaletteEditing();

        // check user can write to destination palette
        if (destinationPalette.fileInfo().readonly && !allowReadonlyPaletteEditing){
            Utils.showUserMessage("Error", "Unable to copy component(s) to readonly palette.");
            return;
        }

        // copy all nodes that we are moving
        for (const sourceComponent of sourceComponents){
            // check that the destination palette does not already contain this exact node
            if (destinationPalette.findNodeById(sourceComponent.getId()) !== null){
                Utils.showUserMessage("Error", "Palette already contains an identical component.");
                return;
            }

            // add to destination palette
            destinationPalette.addNode(sourceComponent, true);
            destinationPalette.fileInfo().modified = true;
            destinationPalette.sort();
        }
    }

    getNodeDropLocation = (e : JQueryEventObject)  : {x:number, y:number} => {
        let x = e.clientX;
        let y = e.clientY;

        // clientX and clientY is the position relative to the document,
        // which doesn't take the space occupied by the navbar into account,
        // so here we get the "offset" of the svg rect.background
        // and subtract from clientX/clientY
        const offset = $(e.currentTarget).offset();
        x = x - offset.left;
        y = y - offset.top;

        // transform display coords into real coords
        x = (x - this.globalOffsetX)/this.globalScale;
        y = (y - this.globalOffsetY)/this.globalScale;

        return {x:x, y:y};
    };

    paletteComponentClick = (node: Node, event:JQueryEventObject) : void => {
        if (event.shiftKey)
            this.editSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Palette);
        else
            this.setSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Palette);
    }

    /*
    selectedEdgeValid = () : Eagle.LinkValid => {
        const selectedEdge = this.selectedEdge();

        if (selectedEdge === null){
            console.error("selectedEdgeValid check when no edge is selected");
            return Eagle.LinkValid.Unknown;
        }

        return Edge.isValid(this, selectedEdge.getId(), selectedEdge.getSrcNodeKey(), selectedEdge.getSrcPortId(), selectedEdge.getDestNodeKey(), selectedEdge.getDestPortId(), selectedEdge.getDataType(), selectedEdge.isLoopAware(), selectedEdge.isClosesLoop(), false, true, null);
    }
    */

    selectInputApplicationNode = () : void => {
        this.setSelection(Eagle.RightWindowMode.Inspector, this.selectedNode().getInputApplication(), Eagle.FileType.Graph);
    }

    selectOutputApplicationNode = () : void => {
        this.setSelection(Eagle.RightWindowMode.Inspector, this.selectedNode().getOutputApplication(), Eagle.FileType.Graph);
    }

    inspectNode = (target:any) : void => {
        target = $('#'+target)
        console.log(target)
        target.click()
        this.rightWindow().shown(true).mode(Eagle.RightWindowMode.Inspector)

    }

    // TODO: looks like the node argument is not used here (or maybe just not used in the 'edit' half of the func)?
    editField = (node:Node, modalType: Eagle.ModalType, fieldType: Eagle.FieldType, fieldIndex: number) : void => {
        // get field names list from the logical graph
        const allFields: Field[] = Utils.getUniqueFieldsOfType(this.logicalGraph(), fieldType);
        const allFieldNames: string[] = [];

        // once done, sort fields and then collect names into the allFieldNames list
        allFields.sort(Field.sortFunc);
        for (const field of allFields){
            allFieldNames.push(field.getIdText() + " (" + field.getType() + ")");
        }

        // if we are summoning this editField modal from the params table, close the params table
        if (modalType === Eagle.ModalType.Field){
            $('#parameterTableModal').modal("hide");
        }

        //if creating a new field
        if (modalType === Eagle.ModalType.Add) {
            let titleText:string

            // set the title of the modal based on the field type
            switch(fieldType){
                case Eagle.FieldType.ApplicationArgument:
                    titleText = "Add Application Argument"
                break;
                case Eagle.FieldType.ComponentParameter:
                    titleText = "Add Component Parameter"
                break;
                case Eagle.FieldType.InputPort:
                    titleText = "Add Input Port"
                break;
                case Eagle.FieldType.OutputPort:
                    titleText = "Add Output Port"
                break;
            }

            $("#editFieldModalTitle").html(this.selectedNode().getName()+" - "+ titleText);


            // show hide part of the UI appropriate for adding
            $("#addParameterWrapper").show();
            $("#customParameterOptionsWrapper").hide();

            // create a field variable to serve as temporary field when "editing" the information. If the add field modal is completed the actual field component parameter is created.
            const field: Field = new Field(Utils.uuidv4(), "", "", "", "", "", false, Eagle.DataType_Integer, false, [], false, Eagle.FieldType.ComponentParameter,false);

            Utils.requestUserEditField(this, Eagle.ModalType.Add, fieldType, field, allFieldNames, (completed : boolean, newField: Field) => {                
                // abort if the user aborted
                if (!completed){
                    return;
                }

                // check selected option in select tag
                const choice : number = parseInt(<string>$('#fieldModalSelect').val(), 10);

                // abort if -1 selected
                if (choice === -1){
                    return;
                }

                // hide the custom text input unless the first option in the select is chosen
                if (choice === 0){
                    newField.setFieldType(fieldType);

                    //create field from user input in modal
                    node.addField(newField);

                } else {
                    const clone : Field = allFields[choice-1].clone();
                    clone.setId(Utils.uuidv4());
                    clone.setFieldType(fieldType);
                    node.addField(clone);
                }

                this.checkGraph();
                this.undo().pushSnapshot(this, "Add field");
            });

        } else {
            //if editing an existing field
            let field: Field = null;
            let typeText:string

            switch (fieldType){
            case Eagle.FieldType.ComponentParameter:
                field = this.selectedNode().getComponentParameters()[fieldIndex];
                typeText = " (Component Parameter)"
                break;
            case Eagle.FieldType.ApplicationArgument:
                field = this.selectedNode().getApplicationArguments()[fieldIndex];
                typeText = " (Application Argument)"
                break;
            case Eagle.FieldType.InputPort:
                field = this.selectedNode().getInputPorts()[fieldIndex];
                typeText = " (Input Port)"
                break;
            case Eagle.FieldType.OutputPort:
                field = this.selectedNode().getOutputPorts()[fieldIndex];
                typeText = " (Output Port)"
                break;
            case Eagle.FieldType.Unknown:
                field = this.selectedNode().getFields()[fieldIndex];
                typeText = " (Parameter)"
                break;
            }
            $("#editFieldModalTitle").html(this.selectedNode().getName()+" - "+field.getDisplayText()+typeText);


            // check that we found a field
            if (field === null || typeof field === 'undefined'){
                console.error("Could not find the field to edit. fieldType", fieldType, "fieldIndex", fieldIndex);
                return;
            }

            $("#addParameterWrapper").hide();
            $("#customParameterOptionsWrapper").show();

            Utils.requestUserEditField(this, Eagle.ModalType.Edit, fieldType, field, allFieldNames, (completed : boolean, newField: Field) => {
                // abort if the user aborted
                if (!completed){
                    return;
                }
                
                // update field data
                field.setDisplayText(newField.getDisplayText());
                field.setIdText(newField.getIdText());
                field.setValue(newField.getValue());
                field.setDefaultValue(newField.getDefaultValue());
                field.setDescription(newField.getDescription());
                field.setReadonly(newField.isReadonly());
                field.setType(newField.getType());
                field.setPrecious(newField.isPrecious());
                field.setPositionalArgument(newField.isPositionalArgument());
                field.setFieldType(newField.getFieldType());
                field.setKeyAttribute(newField.isKeyAttribute());

                this.checkGraph();
                this.undo().pushSnapshot(this, "Edit Field");

                // if we summoned this editField modal from the params table, now that we are done, re-open the params table
                if (modalType === Eagle.ModalType.Field){
                    $('#parameterTableModal').modal("show");
                }
            });
        }
    };

    duplicateParameter = (index:number) : void => {
        let fieldIndex:number //variable holds the index of which row to highlight after creation

        const copiedField = this.selectedNode().getFields()[index].clone()
        copiedField.setId(Utils.uuidv4())
        copiedField.setIdText(copiedField.getIdText()+'copy')
        if(ParameterTable.hasSelection()){
            //if a cell in the table is selected in this case the new node will be placed below the currently selected node
            fieldIndex = ParameterTable.selectionParentIndex() + 1
            this.selectedNode().addFieldAtPosition(copiedField,fieldIndex)
        }else{
            //if no call in the table is selected, in this case the new node is 
            this.selectedNode().addField(copiedField)
            fieldIndex = this.selectedNode().getFields().length -1
        }

        setTimeout(function() {
            //handling selecting and highlighting the newly created node
            const clickTarget = $($("#paramsTableWrapper tbody").children()[fieldIndex]).find('.selectionTargets')[0]
            clickTarget.click() //simply clicking the element is best as it also lets knockout handle all of the selection and obsrevable update process
            clickTarget.focus() //used to focus the field allowing the user to immediately start typing 

            $("#parameterTableModal .modal-body").animate({
                scrollTop: (fieldIndex*30)
            }, 1000);
        }, 100);
    }

    showFieldValuePicker = (fieldIndex : number, input : boolean) : void => {
        const selectedNode = this.selectedNode();

        if (selectedNode === null){
            console.error("Attempt to show field picker when no node selected");
            return;
        }

        const selectedNodeKey : number = selectedNode.getKey();

        console.log("ShowFieldValuePicker() node:", selectedNode.getName(), "fieldIndex:", fieldIndex, "input", input);

        // build list of nodes that are attached to this node
        const nodes : string[] = [];
        for (const edge of this.logicalGraph().getEdges()){
            // add output nodes to the list
            if (edge.getSrcNodeKey() === selectedNodeKey){
                const destNode : Node = this.logicalGraph().findNodeByKey(edge.getDestNodeKey());
                const s : string = "output:" + destNode.getName() + ":" + destNode.getKey();
                nodes.push(s);
            }

            // add input nodes to the list
            if (edge.getDestNodeKey() === selectedNodeKey){
                const srcNode : Node = this.logicalGraph().findNodeByKey(edge.getSrcNodeKey());
                const s : string = "input:" + srcNode.getName() + ":" + srcNode.getKey();
                nodes.push(s);
            }
        }

        // ask the user to choose a node
        Utils.requestUserChoice("Select node", "Choose the input or output node to connect to this parameter", nodes, 0, false, "", (completed : boolean, userChoiceIndex: number) => {
            // abort if the user aborted
            if (!completed){
                return;
            }

            // split the user string into input/output, name, key
            const isInput : boolean = nodes[userChoiceIndex].split(":")[0] === "input";
            const key : string = nodes[userChoiceIndex].split(":")[2];

            let newValue : string;
            if (isInput){
                newValue = "%i[" + key + "]";
            } else {
                newValue = "%o[" + key + "]";
            }

            // update the correct field
            selectedNode.getFields()[fieldIndex].setValue(newValue);
        });
    }

    private setNodeApplication = (title: string, message: string, callback:(node:Node) => void) : void => {
        const applications: Node[] = this.getApplications();
        const applicationNames: string[] = [];
        for (const application of applications){
            applicationNames.push(application.getName())
        }

        // add "None" to the application list
        applicationNames.push(Node.NO_APP_STRING);

        Utils.requestUserChoice(title, message, applicationNames, 0, false, "", (completed : boolean, userChoiceIndex: number) => {
            if (!completed){
                return;
            }

            // abort if the user picked "None"
            if (userChoiceIndex === applicationNames.length - 1){
                console.log("User selected no application");
                callback(null);
                return;
            }

            const application : Node = applications[userChoiceIndex];

            // clone the input application to make a local copy
            // TODO: at the moment, this clone just 'exists' nowhere in particular, but it should be added to the components dict in JSON V3
            const clone : Node = application.clone();
            const newKey : number = Utils.newKey(this.logicalGraph().getNodes());
            clone.setKey(newKey);

            callback(clone);
        });
    }

    setNodeInputApplication = (nodeKey: number) : void => {
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            Utils.showUserMessage("Error", "Unable to add embedded applications to components within palettes. If you wish to add an embedded application, please add it to an instance of this component within a graph.");
            return;
        }

        this.setNodeApplication("Input Application", "Choose an input application", (inputApplication: Node) => {
            const node: Node = this.logicalGraph().findNodeByKey(nodeKey);
            const oldApp: Node = node.getInputApplication();

            // remove all edges incident on the old input application
            if (oldApp !== null){
                this.logicalGraph().removeEdgesByKey(oldApp.getKey());
            }

            node.setInputApplication(inputApplication);

            this.checkGraph();
            this.undo().pushSnapshot(this, "Set Node Input Application");
        });
    }

    setNodeOutputApplication = (nodeKey: number) : void => {
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            Utils.showUserMessage("Error", "Unable to add embedded applications to components within palettes. If you wish to add an embedded application, please add it to an instance of this component within a graph.");
            return;
        }

        this.setNodeApplication("Output Application", "Choose an output application", (outputApplication: Node) => {
            const node: Node = this.logicalGraph().findNodeByKey(nodeKey);
            const oldApp: Node = node.getOutputApplication();

            // remove all edges incident on the old output application
            if (oldApp !== null){
                this.logicalGraph().removeEdgesByKey(oldApp.getKey());
            }

            node.setOutputApplication(outputApplication);

            this.checkGraph();
            this.undo().pushSnapshot(this, "Set Node Output Application");
        });
    }

    getNewNodePosition = (width:number, height:number) : {x:number, y:number} => {
        const MARGIN = 100; // buffer to keep new nodes away from the maxX and maxY sides of the LG display area
        let suitablePositionFound = false;
        let numIterations = 0;
        const MAX_ITERATIONS = 100;
        let x;
        let y;

        while (!suitablePositionFound && numIterations <= MAX_ITERATIONS){
            // get visible screen size
            const minX = this.leftWindow().shown() ? this.leftWindow().width(): 0;
            const maxX = this.rightWindow().shown() ? $('#logicalGraphD3Div').width() - this.rightWindow().width() - width - MARGIN : $('#logicalGraphD3Div').width() - width - MARGIN;
            const minY = 0;
            const maxY = $('#logicalGraphD3Div').height() - height - MARGIN;

            // choose random position within minimums and maximums determined above
            const randomX = Math.floor(Math.random() * (maxX - minX + 1) + minX);
            const randomY = Math.floor(Math.random() * (maxY - minY + 1) + minY);

            x = randomX;
            y = randomY;

            // modify random positions using current translation of viewport
            x -= this.globalOffsetX;
            y -= this.globalOffsetY;

            x /= this.globalScale;
            y /= this.globalScale;

            //console.log("Candidate Position", numIterations, ":", x, ",", y, "X:", minX, "-", maxX, "Y:", minY, "-", maxY);

            // check position is suitable, doesn't collide with any existing nodes
            const collision = this.logicalGraph().checkForNodeAt(x, y, width, height, null);
            suitablePositionFound = collision === null;

            numIterations += 1;
        }

        // if we tried to find a suitable position 100 times, just print a console message
        if (numIterations > MAX_ITERATIONS){
            console.warn("Tried to find suitable position for new node", numIterations, "times and failed, using the last try by default.");
        }

        return {x:x, y:y};
    }

    copyGraphUrl = (): void => {
        // get reference to the LG fileInfo object
        const fileInfo: FileInfo = this.logicalGraph().fileInfo();

        // if we don't know where this file came from then we can't build a URL
        // for example, if the graph was loaded from local disk, then we can't build a URL for others to reach it
        if (fileInfo.repositoryService === Eagle.RepositoryService.Unknown || fileInfo.repositoryService === Eagle.RepositoryService.File){
            Utils.showNotification("Graph URL", "Source of graph is a local file or unknown, unable to create URL for graph.", "danger");
            return;
        }

        // build graph url
        let graph_url = window.location.origin;

        graph_url += "/?service=" + fileInfo.repositoryService;
        graph_url += "&repository=" + fileInfo.repositoryName;
        graph_url += "&branch=" + fileInfo.repositoryBranch;
        graph_url += "&path=" + encodeURI(fileInfo.path);
        graph_url += "&filename=" + encodeURI(fileInfo.name);

        // copy to cliboard
        navigator.clipboard.writeText(graph_url);

        // notification
        Utils.showNotification("Graph URL", "Copied to clipboard", "success");
    }

    checkGraph = (): void => {
        const checkResult = Utils.checkGraph(this);

        this.graphWarnings(checkResult.warnings);
        this.graphErrors(checkResult.errors);
    };

    showGraphErrors = (): void => {
        if (this.graphWarnings().length > 0 || this.graphErrors().length > 0){

            // switch to graph errors mode
            this.errorsMode(Eagle.ErrorsMode.Graph);

            // show graph modal
            Utils.showErrorsModal("Check Graph");
        } else {
            Utils.showNotification("Check Graph", "Graph OK", "success");
        }
    }

    addEdge = (srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean, callback: (edge: Edge) => void) : void => {
        const edgeConnectsTwoApplications : boolean =
            (srcNode.isApplication() || srcNode.isGroup()) &&
            (destNode.isApplication() || destNode.isGroup());

        const twoEventPorts : boolean = srcPort.getIsEvent() && destPort.getIsEvent();

        // if edge DOES NOT connect two applications, process normally
        if (!edgeConnectsTwoApplications || twoEventPorts){
            const edge : Edge = new Edge(srcNode.getKey(), srcPort.getId(), destNode.getKey(), destPort.getId(), srcPort.getType(), loopAware, closesLoop, false);
            this.logicalGraph().addEdgeComplete(edge);
            if (callback !== null) callback(edge);
            return;
        }

        // by default, use the positions of the nodes themselves to calculate position of new node
        let srcNodePosition = srcNode.getPosition();
        let destNodePosition = destNode.getPosition();

        // if source or destination node is an embedded application, use position of parent construct node
        if (srcNode.isEmbedded()){
            srcNodePosition = this.logicalGraph().findNodeByKey(srcNode.getEmbedKey()).getPosition();
        }
        if (destNode.isEmbedded()){
            destNodePosition = this.logicalGraph().findNodeByKey(destNode.getEmbedKey()).getPosition();
        }

        // calculate a position for a new data component, halfway between the srcPort and destPort
        const dataComponentPosition = {
            x: (srcNodePosition.x + destNodePosition.x) / 2.0,
            y: (srcNodePosition.y + destNodePosition.y) / 2.0
        };

        // if destination node is a BashShellApp, then the inserted data component may not be a Memory
        const ineligibleCategories : Category[] = [];
        if (destNode.getCategory() === Category.BashShellApp){
            ineligibleCategories.push(Category.Memory);
        }

        const memoryComponent = Utils.getDataComponentMemory(this.palettes());

        // if node not found, exit
        if (memoryComponent === null) {
            return;
        }

        // Add a data component to the graph.
        const newNode : Node = this.logicalGraph().addDataComponentToGraph(memoryComponent, dataComponentPosition);
        const newNodeKey : number = Utils.newKey(this.logicalGraph().getNodes());
        newNode.setId(Utils.uuidv4());
        newNode.setKey(newNodeKey);

        // set name of new node (use user-facing name)
        newNode.setName(srcPort.getDisplayText());

        // remove existing ports from the memory node
        newNode.removeAllInputPorts();
        newNode.removeAllOutputPorts();

        // add input port and output port for dataType (if they don't exist)
        // TODO: check by type, not name
        let newInputPort = newNode.findPortByIdText(srcPort.getIdText(), true, false);
        let newOutputPort = newNode.findPortByIdText(destPort.getIdText(), false, false);

        if (!newInputPort){
            newInputPort = new Field(Utils.uuidv4(), srcPort.getDisplayText(), srcPort.getIdText(), "", "", "", false, srcPort.getType(), false, [], false, Eagle.FieldType.InputPort,false);
            newNode.addField(newInputPort);
        }
        if (!newOutputPort){
            newOutputPort = new Field(Utils.uuidv4(), destPort.getDisplayText(), destPort.getIdText(), "", "", "", false, destPort.getType(), false, [], false, Eagle.FieldType.OutputPort,false);
            newNode.addField(newOutputPort);
        }

        // set the parent of the new node
        // by default, set parent to parent of source node,
        newNode.setParentKey(srcNode.getParentKey());

        // if source node is a child of dest node, make the new node a child too
        if (srcNode.getParentKey() === destNode.getKey()){
            newNode.setParentKey(destNode.getKey());
        }

         // if dest node is a child of source node, make the new node a child too
        if (destNode.getParentKey() === srcNode.getKey()){
            newNode.setParentKey(srcNode.getKey());
        }

        // create TWO edges, one from src to data component, one from data component to dest
        const firstEdge : Edge = new Edge(srcNode.getKey(), srcPort.getId(), newNodeKey, newInputPort.getId(), srcPort.getType(), loopAware, closesLoop, false);
        const secondEdge : Edge = new Edge(newNodeKey, newOutputPort.getId(), destNode.getKey(), destPort.getId(), destPort.getType(), loopAware, closesLoop,false);

        this.logicalGraph().addEdgeComplete(firstEdge);
        this.logicalGraph().addEdgeComplete(secondEdge);

        // reply with one of the edges
        if (callback !== null) callback(firstEdge);
    }

    editNodeCategory = () : void => {
        let selectedIndex = 0;
        let eligibleCategories : Category[];

        if (this.selectedNode().isData()){
            eligibleCategories = Utils.getCategoriesWithInputsAndOutputs(this.palettes(), Category.Type.Data, this.selectedNode().getInputPorts().length, this.selectedNode().getOutputPorts().length);
        } else if (this.selectedNode().isApplication()){
            eligibleCategories = Utils.getCategoriesWithInputsAndOutputs(this.palettes(), Category.Type.Application, this.selectedNode().getInputPorts().length, this.selectedNode().getOutputPorts().length);
        } else if (this.selectedNode().isConstruct()){
            eligibleCategories = Utils.getCategoriesWithInputsAndOutputs(this.palettes(), Category.Type.Construct, this.selectedNode().getInputPorts().length, this.selectedNode().getOutputPorts().length);
        } else {
            console.warn("Not sure which other nodes are suitable for change, show user all");
            eligibleCategories = Utils.getCategoriesWithInputsAndOutputs(this.palettes(), Category.Type.Unknown, this.selectedNode().getInputPorts().length, this.selectedNode().getOutputPorts().length);
        }

        // set selectedIndex to the index of the current category within the eligibleCategories list
        for (let i = 0 ; i < eligibleCategories.length ; i++){
            if (eligibleCategories[i] === this.selectedNode().getCategory()){
                selectedIndex = i;
                break;
            }
        }

        // launch modal
        Utils.requestUserChoice("Edit Node Category", "NOTE: changing a node's category could destroy some data (parameters, ports, etc) that are not appropriate for a node with the selected category", eligibleCategories, selectedIndex, false, "", (completed:boolean, userChoiceIndex: number, userCustomString: string) => {
            if (!completed){
                return;
            }

            // change the category of the node
            this.selectedNode().setCategory(eligibleCategories[userChoiceIndex]);

            // once the category is changed, some things about the node may no longer be valid
            // for example, the node may contain ports, but no ports are allowed

            // get category data
            const categoryData = CategoryData.getCategoryData(eligibleCategories[userChoiceIndex]);

            // delete parameters, if necessary
            if (this.selectedNode().getComponentParameters().length > 0 && !categoryData.canHaveComponentParameters){
                this.selectedNode().removeAllComponentParameters();
            }

            // delete application args, if necessary
            if (this.selectedNode().getApplicationArguments().length > 0 && !categoryData.canHaveApplicationArguments){
                this.selectedNode().removeAllApplicationArguments();
            }

            // delete extra input ports
            if (this.selectedNode().getInputPorts().length > categoryData.maxInputs){
                for (let i = this.selectedNode().getInputPorts().length - 1 ; i >= 0 ; i--){
                    this.removePortFromNodeByIndex(this.selectedNode(),this.selectedNode().getInputPorts()[i].getId(), true);
                }
            }

            // delete extra output ports
            if (this.selectedNode().getOutputPorts().length > categoryData.maxOutputs){
                for (let i = this.selectedNode().getOutputPorts().length - 1 ; i >= 0 ; i--){
                    this.removePortFromNodeByIndex(this.selectedNode(),this.selectedNode().getInputPorts()[i].getId(), false);
                }
            }

            // delete input application, if necessary
            if (this.selectedNode().hasInputApplication() && !categoryData.canHaveInputApplication){
                this.selectedNode().setInputApplication(null);
            }

            // delete output application, if necessary
            if (this.selectedNode().hasOutputApplication() && !categoryData.canHaveOutputApplication){
                this.selectedNode().setOutputApplication(null);
            }

            this.flagActiveFileModified();
            this.checkGraph();
            this.undo().pushSnapshot(this, "Edit Node Category");
            this.logicalGraph.valueHasMutated();
        });
    }

    // NOTE: clones the node internally
    addNode = (node : Node, x: number, y: number, callback : (node: Node) => void) : void => {
        // copy node
        let newNode : Node = node.clone();

        // set appropriate key for node (one that is not already in use)
        newNode.setId(Utils.uuidv4());
        newNode.setKey(Utils.newKey(this.logicalGraph().getNodes()));
        newNode.setPosition(x, y);
        newNode.setEmbedKey(null);

        // convert start of end nodes to data components
        if (newNode.getCategory() === Category.Start) {
            // Store the node's location.
            const nodePosition = newNode.getPosition();

            // build a list of ineligible types
            const eligibleComponents = Utils.getDataComponentsWithPortTypeList(this.palettes(), [Category.Memory, Category.SharedMemory]);

            // ask the user which data type should be added
            this.logicalGraph().addDataComponentDialog(eligibleComponents, (node: Node) : void => {
                if (node === null) {
                    return;
                }

                // Add a data component to the graph.
                newNode = this.logicalGraph().addDataComponentToGraph(node, nodePosition);

                // copy name from the original node
                newNode.setName(node.getName());

                // Remove the redundant input port
                newNode.removeAllInputPorts();

                // flag that the logical graph has been modified
                this.logicalGraph().fileInfo().modified = true;
                this.logicalGraph().fileInfo.valueHasMutated();

                if (callback !== null) callback(newNode);
            });
        } else {
            this.logicalGraph().addNodeComplete(newNode);

            // set new ids for any ports in this node
            Utils.giveNodePortsNewIds(newNode);

            // set new keys for embedded applications within node, and new ids for ports within those embedded nodes
            if (newNode.hasInputApplication()){
                newNode.getInputApplication().setKey(Utils.newKey(this.logicalGraph().getNodes()));
                newNode.getInputApplication().setEmbedKey(newNode.getKey());

                Utils.giveNodePortsNewIds(newNode.getInputApplication());
            }
            if (newNode.hasOutputApplication()){
                newNode.getOutputApplication().setKey(Utils.newKey(this.logicalGraph().getNodes()));
                newNode.getOutputApplication().setEmbedKey(newNode.getKey());

                Utils.giveNodePortsNewIds(newNode.getOutputApplication());
            }

            // flag that the logical graph has been modified
            this.logicalGraph().fileInfo().modified = true;
            this.logicalGraph().fileInfo.valueHasMutated();

            if (callback !== null) callback(newNode);
        }
    }

    checkForComponentUpdates = () : void => {
        console.log("checkForComponentUpdates()");

        ComponentUpdater.update(this.palettes(), this.logicalGraph(), function(errorsWarnings:Errors.ErrorsWarnings, updatedNodes:Node[]){
            console.log("callback", errorsWarnings, updatedNodes);

            // report missing palettes to the user
            if (errorsWarnings.errors.length > 0){
                const errorStrings = [];
                for (const error of errorsWarnings.errors){
                    errorStrings.push(error.message);
                }

                Utils.showNotification("Error", errorStrings.join("\n"), "danger");
            } else {
                const nodeNames = [];
                for (const node of updatedNodes){
                    nodeNames.push(node.getName());
                }

                Utils.showNotification("Success", "Successfully updated " + updatedNodes.length + " component(s): " + nodeNames.join(", "), "success");
            }
        });
    }

    static getCategoryData = (category : Category) : Category.CategoryData => {
        const c = CategoryData.getCategoryData(category);

        if (typeof c === 'undefined'){
            console.error("Could not fetch category data for category", category);
            return {
                categoryType: Category.Type.Unknown,
                isResizable: false,
                canContainComponents: false,
                minInputs: 0,
                maxInputs: 0,
                minOutputs: 0,
                maxOutputs: 0,
                canHaveInputApplication: false,
                canHaveOutputApplication: false,
                canHaveComponentParameters: false,
                canHaveApplicationArguments: false,
                icon: "error",
                color: "pink",
                collapsedHeaderOffsetY: 0,
                expandedHeaderOffsetY: 20,
                sortOrder: Number.MAX_SAFE_INTEGER,
            };
        }

        return c;
    }
}

export namespace Eagle
{
    export enum LeftWindowMode {
        None = "None",
        Palettes = "Palettes"
    }

    export enum RightWindowMode {
        None = "None",
        Repository = "Repository",
        Inspector = "Inspector",
        TranslationMenu = "TranslationMenu",
        Hierarchy = "Hierarchy"
    }

    export enum FileType {
        Graph = "Graph",
        Palette = "Palette",
        JSON = "JSON",
        Unknown = "Unknown"
    }

    export enum DALiuGEFileType {
        LogicalGraph = "LogicalGraph",
        LogicalGraphTemplate = "LogicalGraphTemplate",
        PhysicalGraph = "PhysicalGraph",
        PhysicalGraphTemplate = "PhysicalGraphTemplate",
        Unknown = "Unknown"
    }

    export enum DALiuGESchemaVersion {
        Unknown = "Unknown",
        OJS = "OJS",
    }

    export enum LinkValid {
        Unknown = "Unknown",
        Invalid = "Invalid",
        Warning = "Warning",
        Valid = "Valid"
    }

    export const DataType_Unknown = "Unknown";
    export const DataType_String = "String";
    export const DataType_Integer = "Integer";
    export const DataType_Float = "Float";
    export const DataType_Object = "Object";
    export const DataType_Boolean = "Boolean";
    export const DataType_Select = "Select";
    export const DataType_Password = "Password";
    export const DataType_Json = "Json";
    export const DataType_Python = "Python";
    export const DataTypes : string[] = [
        DataType_Unknown,
        DataType_String,
        DataType_Integer,
        DataType_Float,
        DataType_Object,
        DataType_Boolean,
        DataType_Select,
        DataType_Password,
        DataType_Json,
        DataType_Python,
    ];

    export enum ModalType {
        Add = "Add",
        Edit = "Edit",
        Field = "Field"
    }

    export enum FieldType {
        ComponentParameter = "ComponentParameter",
        ApplicationArgument = "ApplicationArgument",
        InputPort = "InputPort",
        OutputPort = "OutputPort",
        Unknown = "Unknown"
    }

    export enum RepositoryService {
        GitHub = "GitHub",
        GitLab = "GitLab",
        File = "File",
        Url = "Url",
        Unknown = "Unknown"
    }

    export enum Direction {
        Up = "Up",
        Down = "Down",
        Left = "Left",
        Right = "Right"
    }

    export enum ErrorsMode {
        Loading = "Loading",
        Graph = "Graph"
    }
    
    export enum UIMode {
        Minimal = "minimal",
        Default = "default",
        Graph = "graph",
        Palette = "palette",
        Expert = "expert",
        Custom = "custom"
    }

    export enum TranslatorMode {
        Minimal = "minimal",
        Default = "default",
        Expert = "expert"
    }
}

$( document ).ready(function() {
    // jquery event listeners start here
    var that = this

    //hides the dropdown navbar elements when stopping hovering over the element
    $(".dropdown-menu").mouseleave(function(){
      $(".dropdown-toggle").removeClass("show")
      $(".dropdown-menu").removeClass("show")
    })

    $('.modal').on('hidden.bs.modal', function () {
        $('.modal-dialog').css({"left":"0px", "top":"0px"})
        $("#editFieldModal textarea").attr('style','')
        $("#errorsModalAccordion").parent().parent().attr('style','')

        //reset parameter table selecction
        ParameterTable.resetSelection()
    }); 

    $('.modal').on('shown.bs.modal',function(){
        // modal draggables
        //the any type is required so we dont have an error when building. at runtime on eagle this actually functions without it.
        (<any>$('.modal-dialog')).draggable({
            handle: ".modal-header"
        });
    })

    let defaultTranslatingAlgorithm = localStorage.getItem('translationDefault')
    if(!defaultTranslatingAlgorithm){
        localStorage.setItem('translationDefault','agl-1')
        defaultTranslatingAlgorithm = localStorage.getItem('translationDefault')
    }

    $('#'+defaultTranslatingAlgorithm+ ' .translationDefault').click()
    Eagle.defaultTranslatorAlgorithm = defaultTranslatingAlgorithm;
    if(defaultTranslatingAlgorithm !== "agl-0"){
        $('#'+defaultTranslatingAlgorithm+ ' .translationDefault').parent().find('.accordion-button').click()
    }

    Eagle.defaultTranslatorAlgorithmMethod = $('#'+defaultTranslatingAlgorithm+ ' .generatePgt').val()

    $(".translationDefault").on("click",function(){
        const translationMethods = []
        translationMethods.push($('.translationDefault'))
        $('.translationDefault').each(function(){
            if($(this).is(':checked')){
                $(this).prop('checked', false).change()
                $(this).val('false')
            }
        })

        const element = $(event.target)
        
        if(element.val() === "true"){
            element.val('false')
        }else{
            element.val('true')
        }

        const translationId = element.closest('.accordion-item').attr('id')
        localStorage.setItem('translationDefault',translationId)
        Eagle.defaultTranslatorAlgorithm = translationId
        Eagle.defaultTranslatorAlgorithmMethod = $('#'+defaultTranslatingAlgorithm+ ' .generatePgt').val()

        
        $(this).prop('checked',true).change()
    })

    //increased click bubble for edit modal flag booleans
    $(".componentCheckbox").on("click",function(){
        $(event.target).find("input").click()
    })

    //removes focus from input and textareas when using the canvas
    $("#logicalGraphParent").on("mousedown", function(){
        $("input").blur();
        $("textarea").blur();
    });

    $(".tableParameter").on("click", function(){
        console.log(this)
    })

    //expand palettes when using searchbar and return to prior collapsed state on completion.
    $("#paletteList .componentSearchBar").on("keyup",function(){
        if ($("#paletteList .componentSearchBar").val() !== ""){
            $("#paletteList .accordion-button.collapsed").addClass("wasCollapsed")
            $("#paletteList .accordion-button.collapsed").click()
        }else{
            $("#paletteList .accordion-button.wasCollapsed").click()
            $("#paletteList .accordion-button.wasCollapsed").removeClass("wasCollapsed")
        }
    })

    $(document).on('click', '.hierarchyEdgeExtra', function(){
        const selectEdge = (<any>window).eagle.logicalGraph().findEdgeById(($(event.target).attr("id")))

        if(!selectEdge){
            console.log("no edge found")
            return
        }
        if(!(<PointerEvent>event).shiftKey){
            (<any>window).eagle.setSelection(Eagle.RightWindowMode.Inspector, selectEdge, Eagle.FileType.Graph);
        }else{
            (<any>window).eagle.editSelection(Eagle.RightWindowMode.Inspector, selectEdge, Eagle.FileType.Graph);
        }

    })

    $(".hierarchy").on("click", function(){
        (<any>window).eagle.selectedObjects([]);
    })         

});
