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
import * as bootstrap from 'bootstrap';


import {Utils} from './Utils';
import {Modals} from './Modals'
import {Config} from './Config';
import {GitHub} from './GitHub';
import {GitLab} from './GitLab';
import {Repository} from './Repository';
import {RepositoryFolder} from './RepositoryFolder';
import {RepositoryFile} from './RepositoryFile';
import {Translator} from './Translator';

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
import {PaletteInfo} from './PaletteInfo';
import {Undo} from './Undo';
import { selection, text, treemapSquarify } from "d3";

export class Eagle {
    palettes : ko.ObservableArray<Palette>;
    logicalGraph : ko.Observable<LogicalGraph>;

    repositories : ko.ObservableArray<Repository>;

    leftWindow : ko.Observable<SideWindow>;
    rightWindow : ko.Observable<SideWindow>;

    selectedObjects : ko.ObservableArray<Node|Edge>;
    static selectedLocation : ko.Observable<Eagle.FileType>;

    static parameterTableType : ko.Observable<Eagle.FieldType>;
    static parameterTableSelectionParent : ko.Observable<Field>; // row in the parameter table that is currently selected
    static parameterTableSelectionParentIndex : ko.Observable<number> // id of the selected field
    static parameterTableSelection : ko.Observable<string>; // cell in the parameter table that is currently selected
    static parameterTableSelectionName : ko.Observable<string>; // name of selected parameter in field
    static parameterTableSelectionReadonly : ko.Observable<boolean> // check if selection is readonly

    translator : ko.Observable<Translator>;
    undo : ko.Observable<Undo>;

    globalOffsetX : number;
    globalOffsetY : number;
    globalScale : number;

    inspectorState : ko.Observable<InspectorState>;

    rendererFrameDisplay : ko.Observable<string>;
    rendererFrameMax : number;
    rendererFrameCountRender : number;
    rendererFrameCountTick : number;

    explorePalettes : ko.Observable<ExplorePalettes>;

    graphWarnings : ko.ObservableArray<string>;
    graphErrors : ko.ObservableArray<string>;

    static paletteComponentSearchString : ko.Observable<string>;
    static componentParamsSearchString : ko.Observable<string>;
    static applicationArgsSearchString : ko.Observable<string>;
    static tableSearchString : ko.Observable<string>;

    static settings : SettingsGroup[];
    static shortcuts : ko.ObservableArray<KeyboardShortcut>;

    static dragStartX : number;
    static lastClickTime : number = 0;

    static nodeDropLocation : {x: number, y: number} = {x:0, y:0}; // if this remains x=0,y=0, the button has been pressed and the getNodePosition function will be used to determine a location on the canvas. if not x:0, y:0, it has been over written by the nodeDrop function as the node has been dragged into the canvas. The node will then be placed into the canvas using these co-ordinates.
    static nodeDragPaletteIndex : number;
    static nodeDragComponentIndex : number;
    static shortcutModalCooldown : number;

    constructor(){
        this.palettes = ko.observableArray();
        this.logicalGraph = ko.observable(null);

        this.repositories = ko.observableArray();

        this.leftWindow = ko.observable(new SideWindow(Eagle.LeftWindowMode.Palettes, Utils.getLeftWindowWidth(), false));
        this.rightWindow = ko.observable(new SideWindow(Eagle.RightWindowMode.Repository, Utils.getRightWindowWidth(), true));

        this.selectedObjects = ko.observableArray([]);
        Eagle.selectedLocation = ko.observable(Eagle.FileType.Unknown);

        this.translator = ko.observable(new Translator());
        this.undo = ko.observable(new Undo());

        Eagle.componentParamsSearchString = ko.observable("");
        Eagle.paletteComponentSearchString = ko.observable("");
        Eagle.applicationArgsSearchString = ko.observable("");
        Eagle.tableSearchString = ko.observable("");

        Eagle.settings = [
            new SettingsGroup(
                "User Options",
                (eagle) => {return true;},
                [
                    new Setting("Confirm Discard Changes", "Prompt user to confirm that unsaved changes to the current file should be discarded when opening a new file, or when navigating away from EAGLE.", Setting.Type.Boolean, Utils.CONFIRM_DISCARD_CHANGES, true),
                    new Setting("Confirm Remove Repositories", "Prompt user to confirm removing a repository from the list of known repositories.", Setting.Type.Boolean, Utils.CONFIRM_REMOVE_REPOSITORES, true),
                    new Setting("Confirm Reload Palettes", "Prompt user to confirm when loading a palette that is already loaded.", Setting.Type.Boolean, Utils.CONFIRM_RELOAD_PALETTES, true),
                    new Setting("Open Default Palette on Startup", "Open a default palette on startup. The palette contains an example of all known node categories", Setting.Type.Boolean, Utils.OPEN_DEFAULT_PALETTE, true),
                    new Setting("Confirm Delete", "Prompt user to confirm when deleting node(s) or edge(s) from a graph.", Setting.Type.Boolean, Utils.CONFIRM_DELETE_OBJECTS, true),
                    new Setting("Display Node Keys","Display Node Keys", Setting.Type.Boolean, Utils.DISPLAY_NODE_KEYS, false),
                    new Setting("Disable JSON Validation", "Allow EAGLE to load/save/send-to-translator graphs and palettes that would normally fail validation against schema.", Setting.Type.Boolean, Utils.DISABLE_JSON_VALIDATION, false),
                    new Setting("Spawn Translation Tab", "When translating a graph, display the output of the translator in a new tab", Setting.Type.Boolean, Utils.SPAWN_TRANSLATION_TAB, true),
                    new Setting("Enable Performance Display", "Display the frame time of the graph renderer", Setting.Type.Boolean, Utils.ENABLE_PERFORMANCE_DISPLAY, false),
                    new Setting("Use Simplified Translator Options", "Hide the complex and rarely used translator options", Setting.Type.Boolean, Utils.USE_SIMPLIFIED_TRANSLATOR_OPTIONS, true),
                    new Setting("Show File Loading Warnings", "Display list of issues with files encountered during loading.", Setting.Type.Boolean, Utils.SHOW_FILE_LOADING_ERRORS, false),
                    new Setting("Enable Expert Mode", "Expert Mode enables the display of additional settings usually reserved for advanced users", Setting.Type.Boolean, Utils.ENABLE_EXPERT_MODE, false),
                    new Setting("Graph Zoom Divisor", "The number by which zoom inputs are divided before being applied. Larger divisors reduce the amount of zoom.", Setting.Type.Number, Utils.GRAPH_ZOOM_DIVISOR, 1000),
                ]
            ),
            new SettingsGroup(
                "Advanced Editing",
                (eagle) => {return Eagle.findSettingValue(Utils.ENABLE_EXPERT_MODE);},
                [
                    new Setting("Allow Invalid edges", "Allow the user to create edges even if they would normally be determined invalid.", Setting.Type.Boolean, Utils.ALLOW_INVALID_EDGES, true),
                    new Setting("Allow Component Editing", "Allow the user to add/remove ports and parameters from components.", Setting.Type.Boolean, Utils.ALLOW_COMPONENT_EDITING, true),
                    new Setting("Allow Palette Editing", "Allow the user to edit palettes.", Setting.Type.Boolean, Utils.ALLOW_PALETTE_EDITING, true),
                    new Setting("Allow Readonly Palette Editing", "Allow the user to modify palettes that would otherwise be readonly.", Setting.Type.Boolean, Utils.ALLOW_READONLY_PALETTE_EDITING, true),
                    new Setting("Allow Edge Editing", "Allow the user to edit edge attributes.", Setting.Type.Boolean, Utils.ALLOW_EDGE_EDITING, true),
                    new Setting("Show DALiuGE runtime parameters", "Show additional component arguments that modify the behaviour of the DALiuGE runtime. For example: Data Volume, Execution Time, Num CPUs, Group Start/End", Setting.Type.Boolean, Utils.SHOW_DALIUGE_RUNTIME_PARAMETERS, true),
                ]
            ),
            new SettingsGroup(
                "External Services",
                (eagle) => {return true;},
                [
                    new Setting("Translator URL", "The URL of the translator server", Setting.Type.String, Utils.TRANSLATOR_URL, "http://localhost:8084/gen_pgt"),
                    new Setting("GitHub Access Token", "A users access token for GitHub repositories.", Setting.Type.Password, Utils.GITHUB_ACCESS_TOKEN_KEY, ""),
                    new Setting("GitLab Access Token", "A users access token for GitLab repositories.", Setting.Type.Password, Utils.GITLAB_ACCESS_TOKEN_KEY, ""),
                    new Setting("Docker Hub Username", "The username to use when retrieving data on images stored on Docker Hub", Setting.Type.String, Utils.DOCKER_HUB_USERNAME, "icrar")
                ]
            ),
            new SettingsGroup(
                "Developer",
                (eagle) => {return Eagle.findSettingValue(Utils.ENABLE_EXPERT_MODE);},
                [
                    new Setting("Translate with New Categories", "Replace the old categories with new names when exporting. For example, replace 'Component' with 'PythonApp' category.", Setting.Type.Boolean, Utils.TRANSLATE_WITH_NEW_CATEGORIES, false),
                    new Setting("Create Applications for Construct Ports", "When loading old graph files with ports on construct nodes, move the port to an embedded application", Setting.Type.Boolean, Utils.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS, true),
                    new Setting("Skip 'closes loop' edges in JSON output", "We've recently added edges to the LinkDataArray that 'close' loop constructs and set the 'group_start' and 'group_end' automatically. In the short-term, such edges are not supported by the translator. This setting will keep the new edges during saving/loading, but remove them before sending the graph to the translator.", Setting.Type.Boolean, Utils.SKIP_CLOSE_LOOP_EDGES, true),
                    new Setting("Print Undo state to JS Console", "Prints the state of the undo memory whenever a change occurs. The state is written to the browser's javascript console", Setting.Type.Boolean, Utils.PRINT_UNDO_STATE_TO_JS_CONSOLE, false)
                ]
            )
        ];

        Eagle.shortcuts = ko.observableArray();
        Eagle.shortcuts.push(new KeyboardShortcut("new_graph", "New Graph", ["n"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, Eagle.allowPaletteEditing, (eagle): void => {eagle.newLogicalGraph();}));
        Eagle.shortcuts.push(new KeyboardShortcut("new_palette", "New palette", ["n"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, Eagle.allowPaletteEditing, (eagle): void => {eagle.newPalette();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_graph_from_repo", "Open graph from repo", ["g"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().mode(Eagle.RightWindowMode.Repository);eagle.rightWindow().shown(true);}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_graph_from_local_disk", "Open graph from local disk", ["g"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.getGraphFileToLoad();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_palette_from_repo", "Open palette from repo", ["p"], "keydown", KeyboardShortcut.Modifier.None,KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.rightWindow().mode(Eagle.RightWindowMode.Repository);eagle.rightWindow().shown(true);}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_palette_from_local_disk", "Open palette from local disk", ["p"], "keydown", KeyboardShortcut.Modifier.Shift,KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.getPaletteFileToLoad();}));
        Eagle.shortcuts.push(new KeyboardShortcut("add_graph_nodes_to_palette", "Add graph nodes to palette", ["a"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.addGraphNodesToPalette();}));
        Eagle.shortcuts.push(new KeyboardShortcut("insert_graph_from_local_disk", "Insert graph from local disk", ["i"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.getGraphFileToInsert();}));
        Eagle.shortcuts.push(new KeyboardShortcut("save_graph", "Save Graph", ["s"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.graphNotEmpty, (eagle): void => {eagle.saveGraph();}));
        Eagle.shortcuts.push(new KeyboardShortcut("save_as_graph", "Save Graph As", ["s"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.graphNotEmpty, (eagle): void => {eagle.saveGraphAs()}));
        Eagle.shortcuts.push(new KeyboardShortcut("delete_selection", "Delete Selection", ["Backspace", "Delete"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.somethingIsSelected, (eagle): void => {eagle.deleteSelection(false, true);}));
        Eagle.shortcuts.push(new KeyboardShortcut("delete_selection_except_children", "Delete Selection Except Children", ["Backspace", "Delete"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.somethingIsSelected, (eagle): void => {eagle.deleteSelection(false, false);}));
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
        Eagle.shortcuts.push(new KeyboardShortcut("open_component_parameter_table_modal", "Open Component Parameter Table Modal", ["t"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.openParamsTableModal(Eagle.FieldType.ComponentParameter);}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_application_argument_table_modal", "Open Application Argument Table Modal", ["t"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.openParamsTableModal(Eagle.FieldType.ApplicationArgument);}));
        Eagle.shortcuts.push(new KeyboardShortcut("undo", "Undo", ["z"], "keydown", KeyboardShortcut.Modifier.None, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.undo().prevSnapshot(eagle)}));
        Eagle.shortcuts.push(new KeyboardShortcut("redo", "Redo", ["z"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => {eagle.undo().nextSnapshot(eagle)}));
        Eagle.shortcuts.push(new KeyboardShortcut("check_graph", "Check Graph", ["!"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.graphNotEmpty, (eagle): void => {eagle.showGraphErrors();}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_inspector", "Open Inspector", ["i"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.somethingIsSelected, (eagle): void => { this.rightWindow().shown(true).mode(Eagle.RightWindowMode.Inspector)}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_repository", "Open Repository", ["r"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => { this.rightWindow().shown(true).mode(Eagle.RightWindowMode.Repository)}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_translation", "Open Translation", [">"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => { this.rightWindow().shown(true).mode(Eagle.RightWindowMode.TranslationMenu)}));
        Eagle.shortcuts.push(new KeyboardShortcut("open_hierarchy", "Open Hierarchy", ["h"], "keydown", KeyboardShortcut.Modifier.Shift, KeyboardShortcut.Display.Enabled, KeyboardShortcut.true, (eagle): void => { this.rightWindow().shown(true).mode(Eagle.RightWindowMode.Hierarchy)}));


        this.globalOffsetX = 0;
        this.globalOffsetY = 0;
        this.globalScale = 1.0;

        Eagle.parameterTableType = ko.observable(Eagle.FieldType.Unknown);
        Eagle.parameterTableSelectionParent = ko.observable(null);
        Eagle.parameterTableSelectionParentIndex = ko.observable(-1);
        Eagle.parameterTableSelection = ko.observable(null);
        Eagle.parameterTableSelectionName = ko.observable('');
        Eagle.parameterTableSelectionReadonly = ko.observable(false);

        this.inspectorState = ko.observable(new InspectorState());

        this.rendererFrameDisplay = ko.observable("");
        this.rendererFrameMax = 0;
        this.rendererFrameCountRender = 0;
        this.rendererFrameCountTick = 0;

        this.explorePalettes = ko.observable(new ExplorePalettes());

        this.graphWarnings = ko.observableArray([]);
        this.graphErrors = ko.observableArray([]);
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
        return Eagle.findSettingValue(Utils.ENABLE_EXPERT_MODE) && Eagle.findSettingValue(Utils.ALLOW_INVALID_EDGES);
    }

    static allowPaletteEditing = () : boolean => {
        return Eagle.findSettingValue(Utils.ENABLE_EXPERT_MODE) && Eagle.findSettingValue(Utils.ALLOW_PALETTE_EDITING);
    }

    static allowReadonlyPaletteEditing = () : boolean => {
        return Eagle.findSettingValue(Utils.ENABLE_EXPERT_MODE) && Eagle.findSettingValue(Utils.ALLOW_READONLY_PALETTE_EDITING);
    }

    static allowComponentEditing = () : boolean => {
        return Eagle.findSettingValue(Utils.ENABLE_EXPERT_MODE) && Eagle.findSettingValue(Utils.ALLOW_COMPONENT_EDITING);
    }

    static allowEdgeEditing = (): boolean => {
        return Eagle.findSettingValue(Utils.ENABLE_EXPERT_MODE) && Eagle.findSettingValue(Utils.ALLOW_EDGE_EDITING);
    }

    static showDaliugeRuntimeParameters = () : boolean => {
        return Eagle.findSettingValue(Utils.ENABLE_EXPERT_MODE) && Eagle.findSettingValue(Utils.SHOW_DALIUGE_RUNTIME_PARAMETERS);
    }

    displayNodeKeys = () :boolean => {
        return Eagle.findSetting(Utils.DISPLAY_NODE_KEYS).value();
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

    getRepositoryList = (service : Eagle.RepositoryService) : Repository[] => {
        const list : Repository[] = [];

        for (const repository of this.repositories()){
            if (repository.service === service){
                list.push(repository);
            }
        }

        return list;
    };

    getRepository = (service : Eagle.RepositoryService, name : string, branch : string) : Repository | null => {
        console.log("getRepository()", service, name, branch);

        for (const repository of this.repositories()){
            if (repository.service === service && repository.name === name && repository.branch === branch){
                return repository;
            }
        }
        console.warn("getRepositoryByName() could not find " + service + " repository with the name " + name + " and branch " + branch);
        return null;
    };

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
        var text
        var nodeCount = 0
        var edgeCount = 0
        this.selectedObjects().forEach(function(element){
            if(element instanceof Node){
                nodeCount++
            }else if (element instanceof Edge){
                edgeCount++
            }
        })

        text = nodeCount + " nodes and " + edgeCount + " edges selected."

        return text
    }

    isTypeNode = (object : any) : boolean => {
        if (object instanceof Node){
            return true;
        }else{
            return false;
        }
    }

    /**
     * This function is repeatedly called throughout the EAGLE operation.
     * It resets al fields in the editor menu.
     */
    resetEditor = () : void => {
        this.selectedObjects([]);
        Eagle.selectedLocation(Eagle.FileType.Unknown);

        // Show the last open repository.
        this.rightWindow().mode(Eagle.RightWindowMode.Repository);
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
        if (selection === null){
            this.selectedObjects([]);
        } else {
            this.selectedObjects([selection]);
        }

        Eagle.selectedLocation(selectedLocation);
        this.rightWindow().mode(rightWindowMode);

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

    showSimplifiedTranslatorOptions : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return Eagle.findSetting(Utils.USE_SIMPLIFIED_TRANSLATOR_OPTIONS).value();
    }, this);

    //----------------- Physical Graph Generation --------------------------------
    /**
     * Generate Physical Graph Template.
     * @param algorithmIndex Algorithm number.
     */
    genPGT = (algorithmIndex : number, testingMode: boolean, format: Eagle.DALiuGESchemaVersion) : void => {
        if (this.logicalGraph().getNumNodes() === 0) {
            Utils.showUserMessage("Error", "Unable to translate. Logical graph has no nodes!");
            return;
        }

        if (this.logicalGraph().fileInfo().name === ""){
            Utils.showUserMessage("Error", "Unable to translate. Logical graph does not have a name! Please save the graph first.");
            return;
        }

        const translatorURL : string = Eagle.findSetting(Utils.TRANSLATOR_URL).value();
        console.log("Eagle.getPGT() : algorithm index:", algorithmIndex, "algorithm name:", Config.translationAlgorithms[algorithmIndex], "translator URL", translatorURL);

        // set the schema version
        format = Eagle.DALiuGESchemaVersion.OJS;

        /*
        if (format === Eagle.DALiuGESchemaVersion.Unknown){
            const schemas: Eagle.DALiuGESchemaVersion[] = [Eagle.DALiuGESchemaVersion.OJS];

            // ask user to specify graph format to be sent to translator
            Utils.requestUserChoice("Translation format", "Please select the format for the graph that will be sent to the translator", schemas, 0, false, "", (completed: boolean, userChoiceIndex: number) => {
                if (!completed){
                    console.log("User aborted translation.");
                    return;
                }

                this._genPGT(translatorURL, algorithmIndex, testingMode, schemas[userChoiceIndex]);
            });
        } else {
            this._genPGT(translatorURL, algorithmIndex, testingMode, format);
        }
        */
        this._genPGT(translatorURL, algorithmIndex, testingMode, format);
    }

    _genPGT = (translatorURL: string, algorithmIndex : number, testingMode: boolean, format: Eagle.DALiuGESchemaVersion) : void => {
        // get json for logical graph
        let json;
        switch (format){
            case Eagle.DALiuGESchemaVersion.OJS:
                json = LogicalGraph.toOJSJson(this.logicalGraph(), true);
                break;
            default:
                console.error("Unsupported graph format for translator!");
                return;
        }

        // validate json
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
            const validatorResult : {valid: boolean, errors: string} = Utils.validateJSON(json, format, Eagle.FileType.Graph);
            if (!validatorResult.valid){
                const message = "JSON Output failed validation against internal JSON schema, saving anyway";
                console.error(message, validatorResult.errors);
                Utils.showUserMessage("Error", message + "<br/>" + validatorResult.errors);
                //return;
            }
        }

        const translatorData = {
            algo: Config.translationAlgorithms[algorithmIndex],
            lg_name: this.logicalGraph().fileInfo().name,
            json_data: JSON.stringify(json),
            test: testingMode.toString()
        };

        this.translator().submit(translatorURL, translatorData);

        // mostly for debugging purposes
        console.log("translator data");
        console.log("---------");
        console.log(translatorData);
        console.log("---------");
        console.log(json);
        console.log("---------");
    }

    /**
     * Uploads a file from a local file location.
     * @param e The event to be handled.
     */
    uploadGraphFile = () : void => {
        const uploadedGraphFileToLoadInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedGraphFileToLoad");
        const fileFullPath : string = uploadedGraphFileToLoadInputElement.value;
        const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

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

            this._loadGraphJSON(data, showErrors, fileFullPath, (lg: LogicalGraph) : void => {
                this.logicalGraph(lg);

                // center graph
                this.centerGraph();

                // update the activeFileInfo with details of the repository the file was loaded from
                if (fileFullPath !== ""){
                    this.updateLogicalGraphFileInfo(Eagle.RepositoryService.File, "", "", Utils.getFilePathFromFullPath(fileFullPath), Utils.getFileNameFromFullPath(fileFullPath));
                }
            });
        });
    }

    /**
     * Uploads a file from a local file location. File will be "insert"ed into the current graph
     * @param e The event to be handled.
     */
    insertGraphFile = () : void => {
        const uploadedGraphFileToInsertInputElement : HTMLInputElement = <HTMLInputElement> document.getElementById("uploadedGraphFileToInsert");
        const fileFullPath : string = uploadedGraphFileToInsertInputElement.value;
        const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

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

            this._loadGraphJSON(data, showErrors, fileFullPath, (lg: LogicalGraph) : void => {
                const parentNode: Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), lg.fileInfo().name, lg.fileInfo().getText(), Eagle.Category.SubGraph);

                this.insertGraph(lg.getNodes(), lg.getEdges(), parentNode);

                this.checkGraph();
                this.undo().pushSnapshot(this, "Insert Logical Graph");
                this.logicalGraph.valueHasMutated();
            });
        });
    }

    private _loadGraphJSON = (data: string, showErrors: boolean, fileFullPath: string, loadFunc: (lg: LogicalGraph) => void) : void => {
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

        const errorsWarnings: Eagle.ErrorsWarnings = {errors: [], warnings: []};
        const dummyFile: RepositoryFile = new RepositoryFile(Repository.DUMMY, "", fileFullPath);

        // use the correct parsing function based on schema version
        switch (schemaVersion){
            case Eagle.DALiuGESchemaVersion.OJS:
            case Eagle.DALiuGESchemaVersion.Unknown:
                loadFunc(LogicalGraph.fromOJSJson(dataObject, dummyFile, errorsWarnings));
                break;
        }

        // show errors (if found)
        if (errorsWarnings.errors.length > 0){
            if (showErrors){
                Utils.showUserMessage("Errors during loading", errorsWarnings.errors.join('<br/>'));
            }
        } else {
            Utils.showNotification("Success", Utils.getFileNameFromFullPath(fileFullPath) + " has been loaded.", "success");
        }
    }

    formatTableInspectorSelection = () : string => {
        if (Eagle.parameterTableSelection() === null){
            return "";
        }

        return Eagle.parameterTableSelectionParent().getDisplayText()+" - "+Eagle.parameterTableSelectionName()
    }

    formatTableInspectorValue = () : string => {
        if (Eagle.parameterTableSelection() === null){
            return "";
        }

        return Eagle.parameterTableSelection();
    }

    tableInspectorUpdateSelection = (value:string) : void => {
        var selected = Eagle.parameterTableSelectionName()
        var selectedForm = Eagle.parameterTableSelectionParent()
        if(selected === 'text'){
            selectedForm.setDisplayText(value)
        } else if(selected === 'name'){
            selectedForm.setIdText(value)
        } else if(selected === 'value'){
            selectedForm.setValue(value)
        } else if(selected === 'defaultValue'){
            selectedForm.setDefaultValue(value)
        } else if(selected === 'description'){
            selectedForm.setDescription(value)
        } else{
            return
        }
    }

    createSubgraphFromSelection = () : void => {
        console.log("createSubgraphFromSelection()");

        // create new subgraph
        const parentNode: Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), "Subgraph", "", Eagle.Category.SubGraph);

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

    createConstructFromSelection = () : void => {
        console.log("createConstructFromSelection()");

        const constructs : string[] = Utils.buildComponentList((cData: Eagle.CategoryData) => {
            return cData.isGroup;
        });

        // ask the user what type of construct to use
        Utils.requestUserChoice("Choose Construct", "Please choose a construct type to contain the selection", constructs, -1, false, "", (completed: boolean, userChoiceIndex: number, userCustomString: string) => {
            if (!completed)
            {   // Cancelling action.
                return;
            }

            const userChoice: string = constructs[userChoiceIndex];

            // create new subgraph
            const parentNode: Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), userChoice, "", <Eagle.Category>userChoice);

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
            let mappedParent: Node = keyMap.get(node.getParentKey());

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
        const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

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

            this._loadPaletteJSON(data, showErrors, fileFullPath);

            this.palettes()[0].fileInfo().repositoryService = Eagle.RepositoryService.File;
            this.palettes()[0].fileInfo.valueHasMutated();
        });
    }

    private _loadPaletteJSON = (data: string, showErrors: boolean, fileFullPath: string) => {
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

        const errorsWarnings: Eagle.ErrorsWarnings = {"errors":[], "warnings":[]};
        const p : Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", Utils.getFileNameFromFullPath(fileFullPath)), errorsWarnings);

        // show errors (if found)
        if (errorsWarnings.errors.length > 0 && showErrors){
            Utils.showUserMessage("Errors during loading", errorsWarnings.errors.join('<br/>'));
        }

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
            const node : Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), "Description", "", Eagle.Category.Description);
            const pos = this.getNewNodePosition(node.getDisplayWidth(), node.getDisplayHeight());
            node.setColor(Utils.getColorForNode(Eagle.Category.Description));
            this.addNode(node, pos.x, pos.y, null);
            this.checkGraph();
            this.undo().pushSnapshot(this, "New Logical Graph");
            this.logicalGraph.valueHasMutated();
        });
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

            const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

            this._loadGraphJSON(userText, showErrors, "", (lg: LogicalGraph) : void => {
                this.logicalGraph(lg);
            });
        });
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

            const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

            this._loadPaletteJSON(userText, showErrors, "");
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
                this.selectFile(new RepositoryFile(new Repository(fileInfo.repositoryService, fileInfo.repositoryName, fileInfo.repositoryBranch, false), fileInfo.path, fileInfo.name));
                break;
            case Eagle.RepositoryService.Url:
                // TODO: new code
                this.loadPalettes([
                    {name:palette.fileInfo().name, filename:palette.fileInfo().gitUrl, readonly:palette.fileInfo().readonly}
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
                const gitHubRepoList : Repository[] = this.getRepositoryList(Eagle.RepositoryService.GitHub);
                const gitLabRepoList : Repository[] = this.getRepositoryList(Eagle.RepositoryService.GitLab);

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

        Utils.requestUserGitCommit(defaultRepository, this.getRepositoryList(defaultRepository.service), fileInfo().path, fileInfo().name, (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            const repository : Repository = this.getRepository(repositoryService, repositoryName, repositoryBranch);

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

        const repository = this.getRepository(fileInfo().repositoryService, fileInfo().repositoryName, fileInfo().repositoryBranch);

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
                token = Eagle.findSettingValue(Utils.GITHUB_ACCESS_TOKEN_KEY);
                break;
            case Eagle.RepositoryService.GitLab:
                token = Eagle.findSettingValue(Utils.GITLAB_ACCESS_TOKEN_KEY);
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
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
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
        const errorsWarnings: Eagle.ErrorsWarnings = {"errors":[], "warnings":[]};

        for (let i = 0 ; i < paletteList.length ; i++){
            results.push(null);
            complete.push(false);
            const index = i;

            Utils.httpGet(paletteList[i].filename, (error: string, data: string) => {
                complete[index] = true;

                if  (error !== null){
                    console.error(error);
                    errorsWarnings.errors.push(error);
                } else {
                    const palette: Palette = Palette.fromOJSJson(data, new RepositoryFile(Repository.DUMMY, "", paletteList[index].name), errorsWarnings);
                    palette.fileInfo().clear();
                    palette.fileInfo().name = paletteList[index].name;
                    palette.fileInfo().readonly = paletteList[index].readonly;
                    palette.fileInfo().builtIn = true;
                    palette.fileInfo().gitUrl = paletteList[index].filename;
                    palette.fileInfo().sha = "master";
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

    loadSchemas = () : void => {
        console.log("loadSchemas()");

        Utils.httpGet(Config.DALIUGE_GRAPH_SCHEMA_URL, (error : string, data : string) => {
            if (error !== null){
                console.error(error);
                return;
            }

            Utils.ojsGraphSchema = JSON.parse(data);

            // NOTE: we don't have a schema for the V3 or appRef versions
            Utils.v3GraphSchema = JSON.parse(data);
            Utils.appRefGraphSchema = JSON.parse(data);
        });
    }

    refreshRepositoryList = () : void => {
        console.log("refreshRepositoryList()");

        GitHub.loadRepoList(this);
        GitLab.loadRepoList(this);
    };

    // TODO: move to Repository class?
    selectRepository = (repository : Repository) : void => {
        console.log("selectRepository(" + repository.name + ")");

        // if we have already fetched data for this repo, just expand or collapse the list as appropriate
        // otherwise fetch the data
        if (repository.fetched()){
            repository.expanded(!repository.expanded());
        } else {
            switch(repository.service){
                case Eagle.RepositoryService.GitHub:
                    GitHub.loadRepoContent(repository);
                    break;
                case Eagle.RepositoryService.GitLab:
                    GitLab.loadRepoContent(repository);
                    break;
                default:
                    Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repository.service + ")");
            }
        }
    };

    selectFolder = (folder : RepositoryFolder) : void => {
        console.log("selectFolder()", folder.name);

        // toggle expanded state
        folder.expanded(!folder.expanded());
    }

    selectFile = (file : RepositoryFile) : void => {
        console.log("selectFile() service:", file.repository.service, "repo:", file.repository.name, "branch:", file.repository.branch, "path:", file.path, "file:", file.name, "type:", file.type);

        // check if the current file has been modified
        let isModified = false;
        switch (file.type){
            case Eagle.FileType.Graph:
                isModified = this.logicalGraph().fileInfo().modified;
                break;
            case Eagle.FileType.Palette:
                const palette: Palette = this.findPalette(file.name, false);
                isModified = palette !== null && palette.fileInfo().modified;
                break;
            case Eagle.FileType.JSON:
                isModified = this.logicalGraph().fileInfo().modified;
                break;
        }

        // if the file is modified, get the user to confirm they want to overwrite changes
        if (isModified && Eagle.findSetting(Utils.CONFIRM_DISCARD_CHANGES).value()){
            Utils.requestUserConfirm("Discard changes?", "Opening a new file will discard changes. Continue?", "OK", "Cancel", (confirmed : boolean) : void => {
                if (!confirmed){
                    console.log("selectFile() cancelled");
                    return;
                }

                this.openRemoteFile(file);
            });
        } else {
            this.openRemoteFile(file);
        }
    }

    insertFile = (file : RepositoryFile) : void => {
        console.log("insertFile() repo:", file.repository.name, "branch:", file.repository.branch, "path:", file.path, "file:", file.name, "type:", file.type);

        this.insertRemoteFile(file);
    }

    refreshRepository = (repository : Repository) : void => {
        switch(repository.service){
            case Eagle.RepositoryService.GitHub:
                GitHub.loadRepoContent(repository);
                break;
            case Eagle.RepositoryService.GitLab:
                GitLab.loadRepoContent(repository);
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab!");
        }
    }

    // use a custom modal to ask user for repository service and url at the same time
    addCustomRepository = () : void => {
        Utils.requestUserAddCustomRepository((completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string) : void => {
            console.log("requestUserAddCustomRepository callback", completed, repositoryService, repositoryName);

            if (!completed){
                console.log("No repo entered");
                return;
            }

            if (repositoryName.trim() == ""){
                Utils.showUserMessage("Error", "Repository name is empty!");
                return;
            }

            if (repositoryBranch.trim() == ""){
                Utils.showUserMessage("Error", "Repository branch is empty! If you wish to use the master branch, please enter 'master'.");
                return;
            }

            // debug
            console.log("User entered new repo name:", repositoryService, repositoryName, repositoryBranch);

            // add extension to userString to indicate repository service
            const localStorageKey : string = Utils.getLocalStorageKey(repositoryService, repositoryName, repositoryBranch);
            if (localStorageKey === null){
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repositoryService + ")");
                return;
            }

            // Adding the repo name into the local browser storage.
            localStorage.setItem(localStorageKey, Utils.getLocalStorageValue(repositoryService, repositoryName, repositoryBranch));

            // Reload the repository lists
            if (repositoryService === Eagle.RepositoryService.GitHub)
                GitHub.loadRepoList(this);
            if (repositoryService === Eagle.RepositoryService.GitLab)
                GitLab.loadRepoList(this);
        });
    };

    removeCustomRepository = (repository : Repository) : void => {
        // if settings dictates that we don't confirm with user, remove immediately
        if (!Eagle.findSetting(Utils.CONFIRM_REMOVE_REPOSITORES).value()){
            this._removeCustomRepository(repository);
            return;
        }

        // otherwise, check with user
        Utils.requestUserConfirm("Remove Custom Repository", "Remove this repository from the list?", "OK", "Cancel", (confirmed : boolean) =>{
            if (!confirmed){
                console.log("User aborted removeCustomRepository()");
                return;
            }

            this._removeCustomRepository(repository);
        });
    };

    private _removeCustomRepository = (repository : Repository) : void => {
        // abort if the repository is one of those that is builtin to the app
        if (repository.isBuiltIn){
            console.warn("User attempted to remove a builtin repository from the list");
            return;
        }

        // remove from localStorage
        switch(repository.service){
            case Eagle.RepositoryService.GitHub:
                localStorage.removeItem(repository.name + ".repository");
                localStorage.removeItem(repository.name + ".github_repository");
                localStorage.removeItem(repository.name + "|" + repository.branch + ".github_repository_and_branch");
                GitHub.loadRepoList(this);
                break;
            case Eagle.RepositoryService.GitLab:
                localStorage.removeItem(repository.name + ".gitlab_repository");
                localStorage.removeItem(repository.name + "|" + repository.branch + ".gitlab_repository_and_branch");
                GitLab.loadRepoList(this);
                break;
            default:
                Utils.showUserMessage("Error", "Unknown repository service. Not GitHub or GitLab! (" + repository.service + ")");
                return;
        }
    }

    sortRepositories = () : void => {
        this.repositories.sort(Repository.repositoriesSortFunc);
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

            // if setting dictates, show errors during loading
            const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

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

                    const errorsWarnings: Eagle.ErrorsWarnings = {"errors":[], "warnings":[]};

                    // use the correct parsing function based on schema version
                    switch (schemaVersion){
                        case Eagle.DALiuGESchemaVersion.OJS:
                        case Eagle.DALiuGESchemaVersion.Unknown:
                            this.logicalGraph(LogicalGraph.fromOJSJson(dataObject, file, errorsWarnings));
                            break;
                    }

                    if (errorsWarnings.errors.length > 0){
                        if (showErrors){
                            Utils.showUserMessage("Errors during loading", errorsWarnings.errors.join('<br/>'));
                        }
                    } else {
                        Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ". " + errorsWarnings.warnings.length + " warnings.", "success");
                    }

                    // print warnings in console
                    for (const warning of errorsWarnings.warnings){
                        console.warn(warning);
                    }

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

            // if setting dictates, show errors during loading
            const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

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

            const errorsWarnings: Eagle.ErrorsWarnings = {"errors":[], "warnings":[]};

            // use the correct parsing function based on schema version
            let lg: LogicalGraph;
            switch (schemaVersion){
                case Eagle.DALiuGESchemaVersion.OJS:
                case Eagle.DALiuGESchemaVersion.Unknown:
                    lg = LogicalGraph.fromOJSJson(dataObject, file, errorsWarnings);
                    break;
            }

            // create parent node
            const parentNode: Node = new Node(Utils.newKey(this.logicalGraph().getNodes()), lg.fileInfo().name, lg.fileInfo().getText(), Eagle.Category.SubGraph);

            // perform insert
            this.insertGraph(lg.getNodes(), lg.getEdges(), parentNode);

            // trigger re-render
            this.logicalGraph.valueHasMutated();
            this.undo().pushSnapshot(this, "Inserted " + file.name);
            this.checkGraph();

            if (errorsWarnings.errors.length > 0){
                if (showErrors){
                    Utils.showUserMessage("Errors during loading", errorsWarnings.errors.join('<br/>'));
                }
            } else {
                Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
            }
        });
    };

    private _remotePaletteLoaded = (file : RepositoryFile, data : string) : void => {
        // load the remote palette into EAGLE's palettes object.

        // check palette is not already loaded
        const alreadyLoadedPalette : Palette = this.findPaletteByFile(file);

        // if dictated by settings, reload the palette immediately
        if (alreadyLoadedPalette !== null && Eagle.findSetting(Utils.CONFIRM_RELOAD_PALETTES).value()){
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
        const showErrors: boolean = Eagle.findSetting(Utils.SHOW_FILE_LOADING_ERRORS).value();

        // close the existing version of the open palette
        if (palette !== null){
            this.closePalette(palette);
        }

        // load the new palette
        const errorsWarnings: Eagle.ErrorsWarnings = {"errors":[], "warnings":[]};
        const newPalette = Palette.fromOJSJson(data, file, errorsWarnings);

        // sort items in palette
        newPalette.sort();

        // add to list of palettes
        this.palettes.unshift(newPalette);

        if (errorsWarnings.errors.length > 0){
            if (showErrors){
                Utils.showUserMessage("Errors during loading", errorsWarnings.errors.join('<br/>'));
            }
        } else {
            Utils.showNotification("Success", file.name + " has been loaded from " + file.repository.service + ".", "success");
        }

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
                if (p.fileInfo().modified && Eagle.findSetting(Utils.CONFIRM_DISCARD_CHANGES).value()){
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
    }

    getParentNameAndKey = (parentKey:number) : string => {
        if(parentKey === null){
            return ""
        }

        var parentText = this.logicalGraph().findNodeByKey(parentKey).getName() + ' | Key: ' + parentKey;

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
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
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
            palette.fileInfo().gitUrl = "";
            palette.fileInfo().sha = "";
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
        if (!Eagle.findSettingValue(Utils.DISABLE_JSON_VALIDATION)){
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
            graph.fileInfo().gitUrl = "";
            graph.fileInfo().sha = "";
            graph.fileInfo.valueHasMutated();
        });
    }

    savePaletteToGit = (palette: Palette): void => {
        console.log("savePaletteToGit()", palette.fileInfo().name, palette.fileInfo().type);

        const defaultRepository: Repository = new Repository(palette.fileInfo().repositoryService, palette.fileInfo().repositoryName, palette.fileInfo().repositoryBranch, false);

        Utils.requestUserGitCommit(defaultRepository, this.getRepositoryList(Eagle.RepositoryService.GitHub),  palette.fileInfo().path, palette.fileInfo().name, (completed : boolean, repositoryService : Eagle.RepositoryService, repositoryName : string, repositoryBranch : string, filePath : string, fileName : string, commitMessage : string) : void => {
            // check completed boolean
            if (!completed){
                console.log("Abort commit");
                return;
            }

            // check repository name
            const repository : Repository = this.getRepository(repositoryService, repositoryName, repositoryBranch);
            if (repository === null){
                console.log("Abort commit");
                return;
            }

            // get access token for this type of repository
            let token : string;

            switch (repositoryService){
                case Eagle.RepositoryService.GitHub:
                    token = Eagle.findSettingValue(Utils.GITHUB_ACCESS_TOKEN_KEY);
                    break;
                case Eagle.RepositoryService.GitLab:
                    token = Eagle.findSettingValue(Utils.GITLAB_ACCESS_TOKEN_KEY);
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
        const translatorURLSetting : Setting = Eagle.findSetting(Utils.TRANSLATOR_URL);

        Utils.requestUserString("Translator Url", "Enter the Translator Url", translatorURLSetting.value(), false, (completed : boolean, userString : string) : void => {
            // abort if user cancelled the action
            if (!completed)
                return;

            translatorURLSetting.value(userString);
        });
    };

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

    openSettings = () : void => {
        //if no tab is selected yet, default to the first tab
        if(!$(".settingCategoryActive").length){
            $(".settingsModalButton").first().click()
        }
        Utils.showSettingsModal();
    }

    openParamsTableModal = (tableType:Eagle.FieldType) : void => {
        Eagle.parameterTableType(tableType)
        if (!this.selectedNode()){
            Utils.showNotification("Error", "No Node Is Selected", "warning");
        }else{
            if (tableType === Eagle.FieldType.ComponentParameter){
                if (!this.selectedNode().canHaveComponentParameters()){
                    Utils.showNotification("Error", "This node cannot have component parameters", "warning");
                    return
                }
            }else{
                if (!this.selectedNode().canHaveApplicationArguments()){
                    Utils.showNotification("Error", "This node cannot have application arguments", "warning");
                    return
                }
            }
            Utils.showOpenParamsTableModal();
        }
    }

    getParamsTableModalTitleText = () : string => {
        if (Eagle.parameterTableType() === Eagle.FieldType.ComponentParameter){
            return "Component Parameter Table"
        }else{
            return "Application Argument Table"
        }
    }

    getParamsTableModalButtonText = () : string => {
        if (Eagle.parameterTableType() === Eagle.FieldType.ComponentParameter){
            return "Add Parameter"
        }else{
            return "Add Argument"
        }
    }

    currentParamsArray : ko.PureComputed<Field[]> = ko.pureComputed(() => {
        if (Eagle.parameterTableType() === Eagle.FieldType.ComponentParameter){
            return this.selectedNode().getFields()
        }else{
            return this.selectedNode().getApplicationArgs()
        }
    })

    getCurrentParamReadonly = (index: number, type:Eagle.FieldType) : boolean => {
        if (type === Eagle.FieldType.Unknown){
            type = Eagle.parameterTableType()
        }

        if(Eagle.selectedLocation() === Eagle.FileType.Palette){
            if(Eagle.allowPaletteEditing()){
                    return false;
            }else{
                if (type === Eagle.FieldType.ComponentParameter){
                    return this.selectedNode().getFieldReadonly(index);
                }else{
                    return this.selectedNode().getApplicationParamReadonly(index);
                }
            }
        }else{
            if(Eagle.allowComponentEditing()){
                return false
            }else{
                if (type === Eagle.FieldType.ComponentParameter){
                    return this.selectedNode().getFieldReadonly(index);
                }else{
                    return this.selectedNode().getApplicationParamReadonly(index);
                }
            }
        }
    }

    toggleSettingsTab = (btn:any, target:any) :void => {
        //deselect and deactivate current tab content and buttons
        $(".settingsModalButton").removeClass("settingCategoryBtnActive");
        $(".settingsModalCategoryWrapper").removeClass("settingCategoryActive");

        //activate selected tab content and button
        $("#"+btn).addClass("settingCategoryBtnActive");
        $("#"+target).addClass("settingCategoryActive");
    }

    openShortcuts = () : void => {
        if(!Eagle.shortcutModalCooldown || Date.now() >= (Eagle.shortcutModalCooldown + 500)){
            Eagle.shortcutModalCooldown = Date.now()
            Utils.showShortcutsModal();
        }
        return
    }

    private static findSetting = (key : string) : Setting => {
        // check if Eagle constructor has not been run (usually the case when this module is being used from a tools script)
        if (typeof Eagle.settings === 'undefined'){
            return null;
        }

        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                if (setting.getKey() === key){
                    return setting;
                }
            }
        }

        return null;
    }

    // TODO: maybe move to Field.ts
    // TODO: add comments
    // TODO: a "get" function probably should not alter state
    getFieldType = (type:Eagle.DataType, id:string, value:string) : string => {
        if (type === Eagle.DataType.Float || type === Eagle.DataType.Integer){
            return "number"
        }else if(type === Eagle.DataType.Boolean){
            $("#"+id).addClass("form-check-input")
            if (Utils.asBool(value)){
                $("#"+id).addClass("inputChecked")
                $("#"+id).html("Checked")
            }else {
                $("#"+id).removeClass("inputChecked")
                $("#"+id).html("Check")
            }
            return "checkbox"
        }else if(type === Eagle.DataType.Select){
            return "select";
        }else if(type === Eagle.DataType.Password){
            return "password";
        }else{
            return "text"
        }
    }

    static resetParamsTableSelection = ():void => {
        Eagle.parameterTableSelectionParentIndex(-1);
        Eagle.parameterTableSelection(null);
    }

    fillParametersTable = (type:Eagle.DataType):string => {
        var options:string = "";

        for (let dataType of Object.values(Eagle.DataType)){
            var selected=""
            if(type === dataType){
                selected = "selected=true"
            }
            options = options + "<option value="+dataType+"  "+selected+">"+dataType+"</option>";
        }

        return options
    }

    fillFieldTypeCell = (fieldType:Eagle.FieldType):string => {
        var options:string = "";

        const allowedTypes = [Eagle.FieldType.ApplicationArgument, Eagle.FieldType.InputPort, Eagle.FieldType.OutputPort];

        for (let dataType of allowedTypes){
            var selected=""
            if(fieldType === dataType){
                selected = "selected=true"
            }
            options = options + "<option value="+dataType+"  "+selected+">"+dataType+"</option>";
        }

        return options
    }

    static findSettingValue = (key : string) : any => {
        const setting = Eagle.findSetting(key);

        if (setting === null){
            console.warn("No setting", key);
            return null;
        }

        return setting.value();
    }

    static setSettingValue = (key : string, value : any) : void => {
        const setting = Eagle.findSetting(key);

        if (setting === null){
            console.warn("No setting", key);
            return;
        }

        return setting.value(value);
    }

    getShortcutDisplay = () : {description:string, shortcut : string}[] => {
        var displayShorcuts : {description:string, shortcut : string} []=[];

        for (const object of Eagle.shortcuts()){
            if (object.display === KeyboardShortcut.Display.Disabled){
                continue;
            }

            var shortcut = Utils.getKeyboardShortcutTextByKey(object.key, false);
            displayShorcuts.push({description: object.name, shortcut: shortcut});
        }

        return displayShorcuts;
    }

    resetSettingsDefaults = () : void => {
        // if a reset would turn off the expert mode setting,
        // AND we are currently on the 'advanced editing' or 'developer' tabs of the setting modal,
        // then those tabs will disappear and we'll be left looking at nothing, so switch to the 'User Options' tab
        const expertModeSetting: Setting = Eagle.findSetting(Utils.ENABLE_EXPERT_MODE);
        const turningOffExpertMode = expertModeSetting.value() && !expertModeSetting.getOldValue();
        const currentSettingsTab: string = $('.settingsModalButton.settingCategoryBtnActive').attr('id');

        if (turningOffExpertMode && (currentSettingsTab === "settingCategoryAdvancedEditing" || currentSettingsTab === "settingCategoryDeveloper")){
            // switch back to "User Options" tab
            $('#settingCategoryUserOptions').click();
        }

        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                setting.resetDefault();
            }
        }
    }

    //copies currently set settings in case the user wishes to cancel chenges in the setting modal
    copyCurrentSettings = () : void => {
        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                setting.copyCurrentSettings();
            }
        }
    }

    //returns settings values to the previously copied settings, cancelling the settings editing
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
        const newEdge = new Edge(this.logicalGraph().getNodes()[0].getKey(), "", this.logicalGraph().getNodes()[0].getKey(), "", "", false, false);

        // display edge editing modal UI
        Utils.requestUserEditEdge(newEdge, this.logicalGraph(), (completed: boolean, edge: Edge) => {
            if (!completed){
                console.log("User aborted addEdgeToLogicalGraph()");
                return;
            }

            // validate edge
            const isValid: Eagle.LinkValid = Edge.isValid(this.logicalGraph(), edge.getId(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.isLoopAware(), false, true, null, null);
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
            const isValid: Eagle.LinkValid = Edge.isValid(this.logicalGraph(), edge.getId(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.isLoopAware(), false, true, null, null);
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

    deleteSelection = (suppressUserConfirmationRequest: boolean, deleteChildren: boolean) : void => {
        // if no objects selected, warn user
        if (this.selectedObjects().length === 0){
            console.warn("Unable to delete selection: Nothing selected");
            Utils.showNotification("Warning", "Unable to delete selection: Nothing selected", "warning");
            return;
        }

        // skip confirmation if setting dictates
        if (!Eagle.findSetting(Utils.CONFIRM_DELETE_OBJECTS).value() || suppressUserConfirmationRequest){
            this._deleteSelection();
            return;
        }

        // determine number of nodes and edges in current selection
        let numNodes = 0;
        let numEdges = 0;
        for (const object of this.selectedObjects()){
            if (object instanceof Node){
                numNodes += 1;
            }

            if (object instanceof Edge){
                numEdges += 1;
            }
        }

        // request confirmation from user
        Utils.requestUserConfirm("Delete?", "Are you sure you wish to delete " + numEdges + " edge(s) and " + numNodes + " node(s) (and their children)?", "Yes", "No", (confirmed : boolean) : void => {
            if (!confirmed){
                console.log("User aborted deleteSelection()");
                return;
            }

            this._deleteSelection();
        });
    }

    private _deleteSelection = () : void => {
        if (Eagle.selectedLocation() === Eagle.FileType.Graph){

            for (const object of this.selectedObjects()){
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

            for (const object of this.selectedObjects()){
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

    // used before deleting a
    private _moveChildrenOfSelection = () : void => {

    }

    addNodeToLogicalGraph = (node : Node) : void => {
        let pos : {x:number, y:number};

        // if node is a construct, set width and height a little larger
        if (Eagle.getCategoryData(node.getCategory()).isGroup){
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

    private findPalette = (name: string, createIfNotFound: boolean) : Palette => {
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
        const username = Eagle.findSettingValue(Utils.DOCKER_HUB_USERNAME);

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

    /**
     * Adds an field to the selected node via HTML.
     */
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

    /**
     * Adds an application param to the selected node via HTML.
     */
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

    getInspectorHeadingTooltip = (title:string, category:any, description:any) : string => {
        var tooltipText = "<h5>"+title+":</h5>"+category+"<br>"+description;
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
        var fieldIndex
        if(Eagle.parameterTableSelectionParentIndex() != -1){
        // A cell in the table is selected well insert new row instead of adding at the end
            fieldIndex = Eagle.parameterTableSelectionParentIndex()+1
            if(Eagle.parameterTableType() === Eagle.FieldType.ComponentParameter){
                //component table
                this.selectedNode().addEmptyField(fieldIndex)
            }else{
                //argument table
                this.selectedNode().addEmptyArg(fieldIndex)
            }
        }else{
        //no cell selected, add new row at the end
            if(Eagle.parameterTableType() === Eagle.FieldType.ComponentParameter){
                //component table
                this.selectedNode().addEmptyField(-1)
            }else{
                //argument table
                this.selectedNode().addEmptyArg(-1)
            }
            //getting the length of the array to use as an index to select the last row in the table
            fieldIndex = this.currentParamsArray().length -1
        }

        //handling selecting and highlighting the newly created row
        let clickTarget = $("#paramsTableWrapper tbody").children()[fieldIndex].firstElementChild.firstElementChild as HTMLElement
        clickTarget.click() //simply clicking the element is best as it also lets knockout handle all of the selection and obsrevable update processes

        //scroll to new row
        $("#parameterTableModal .modal-content").animate({
            scrollTop: (fieldIndex*30)
          }, 1000);
    }

    nodeInspectorDropdownClick = (val:number, num:number, divID:string) : void => {
        let selectSectionID;
        let modalID;
        let submitBtnID;

        if(divID==="nodeInspectorAddFieldDiv" || divID==="nodeInspectorAddApplicationParamDiv"){
            selectSectionID = "fieldModalSelect"
            modalID = "editFieldModal"
            submitBtnID = "editFieldModalAffirmativeButton"
        }

        if (val===-1){
            this.hideDropDown(divID)
            return
        }else if(val===num){
            //select custom field externally and open custom properties menu
            $("#"+divID).hide();
            $("#"+selectSectionID).val(val).trigger('change');
            $("#"+modalID).addClass("nodeSelected");
            $("#"+modalID).removeClass("forceHide");
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
        var validChoiceIndex = 0

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
            if (node.getCategory() === Eagle.Category.Comment || node.getCategory() === Eagle.Category.Description){
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

    removePortFromNodeByIndex = (node : Node, index : number, input : boolean) : void => {
        console.log("removePortFromNodeByIndex(): node", node.getName(), "index", index, "input", input);

        if (node === null){
            console.warn("Could not remove port from null node");
            return;
        }

        // remember port id
        let portId;
        if (input){
            portId = node.getInputPorts()[index].getId();
        } else {
            portId = node.getOutputPorts()[index].getId();
        }

        console.log("Found portId to remove:", portId);

        // remove port
        if (input){
            node.removeFieldTypeByIndex(index, Eagle.FieldType.InputPort);
        } else {
            node.removeFieldTypeByIndex(index, Eagle.FieldType.OutputPort);
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
    }

    // dragdrop
    nodeDragStart = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        // retrieve data about the node being dragged
        // NOTE: I found that using $(e.target).data('palette-index'), using JQuery, sometimes retrieved a cached copy of the attribute value, which broke this functionality
        //       Using the native javascript works better, it always fetches the current value of the attribute

        //this is for dealing with drag and drop actions while there is already one ore more palette components selected
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){

            var paletteIndex = $(e.target).data("palette-index")
            var componentIndex = $(e.target).data("component-index")
            var draggedNode = this.palettes()[paletteIndex].getNodes()[componentIndex]

            if(!this.objectIsSelected(draggedNode)){
                $(e.target).find("div").click()
            }
        }

        Eagle.nodeDragPaletteIndex = parseInt(e.target.getAttribute('data-palette-index'), 10);
        Eagle.nodeDragComponentIndex = parseInt(e.target.getAttribute('data-component-index'), 10);

        // discourage the rightWindow and navbar as drop targets
        $(".rightWindow").addClass("noDropTarget");
        $(".navbar").addClass("noDropTarget");

        // grab and set the node's icon and sets it as drag image.
        const drag = e.target.getElementsByClassName('input-group-prepend')[0] as HTMLElement;
        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(drag, 0, 0);

        return true;
    }

    nodeDragEnd = () : boolean => {
        $(".rightWindow").removeClass("noDropTarget");
        $(".navbar").removeClass("noDropTarget");
        return true;
    }

    nodeDragOver = () : boolean => {
        return false;
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
            this.addNodeToLogicalGraph(sourceComponent);

            // to avoid placing all the selected nodes on top of each other at the same spot, we increment the nodeDropLocation after each node
            Eagle.nodeDropLocation.x += 20;
            Eagle.nodeDropLocation.y += 20;
        }

        // then reset the nodeDropLocation after all have been placed
        Eagle.nodeDropLocation = {x:0, y:0};
    }

    nodeDropPalette = (eagle: Eagle, e: JQueryEventObject) : void => {
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

    getReadOnlyText = () : string => {
        if (Eagle.selectedLocation() === Eagle.FileType.Graph || Eagle.selectedLocation() === Eagle.FileType.Unknown){
            return "Read Only - Turn on 'Allow Component Editing' in the settings to unlock"
        }

        // if a node or nodes in the palette are selected, then assume those are being moved to the destination
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            return "Read Only - Turn on 'Allow Palette Editing' in the settings to unlock"
        }
        return ''
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

    rightWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        Eagle.dragStartX = e.clientX;
        this.leftWindow().adjusting(false);
        this.rightWindow().adjusting(true);

        return true;
    }

    //workaround to aviod left or right window adjusting on any and all drag events
    sideWindowAdjustEnd = () : boolean => {
        this.leftWindow().adjusting(false);
        this.rightWindow().adjusting(false);

        return true;
    }

    sideWindowAdjust = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        // workaround to avoid final dragEvent at 0,0!
        if (e.clientX === 0){
            return true;
        }

        if (isNaN(this.leftWindow().width())){
            console.warn("Had to reset left window width from invalid state (NaN)!");
            this.leftWindow().width(Config.defaultLeftWindowWidth);
        }
        if (isNaN(this.rightWindow().width())){
            console.warn("Had to reset right window width from invalid state (NaN)!");
            this.rightWindow().width(Config.defaultRightWindowWidth);
        }

        const dragDiff : number = e.clientX - Eagle.dragStartX;
        let newWidth : number;

        if (this.leftWindow().adjusting()){
            newWidth = this.leftWindow().width() + dragDiff;
            if(newWidth <= Config.defaultLeftWindowWidth){
                this.leftWindow().width(Config.defaultLeftWindowWidth);
                Utils.setLeftWindowWidth(Config.defaultLeftWindowWidth);
            }else{
                this.leftWindow().width(newWidth);
                Utils.setLeftWindowWidth(newWidth);
            }
        } else if(this.rightWindow().adjusting()) {
            newWidth = this.rightWindow().width() - dragDiff;
            if(newWidth <= Config.defaultRightWindowWidth){
                this.rightWindow().width(Config.defaultRightWindowWidth);
                Utils.setRightWindowWidth(Config.defaultRightWindowWidth);
            }else{
                this.rightWindow().width(newWidth);
                Utils.setRightWindowWidth(newWidth);
            }
        }

        Eagle.dragStartX = e.clientX;

        return true;
    }

    leftWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) : boolean => {

        Eagle.dragStartX = e.clientX;
        this.leftWindow().adjusting(true);
        this.rightWindow().adjusting(false);

        return true;
    }

    paletteComponentClick = (node: Node, event:JQueryEventObject) : void => {
        if (event.shiftKey)
            this.editSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Palette);
        else
            this.setSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Palette);
    }

    selectedEdgeValid = () : Eagle.LinkValid => {
        const selectedEdge = this.selectedEdge();

        if (selectedEdge === null){
            console.error("selectedEdgeValid check when no edge is selected");
            return Eagle.LinkValid.Unknown;
        }

        return Edge.isValid(this.logicalGraph(), selectedEdge.getId(), selectedEdge.getSrcNodeKey(), selectedEdge.getSrcPortId(), selectedEdge.getDestNodeKey(), selectedEdge.getDestPortId(), selectedEdge.isLoopAware(), false, true, null, null);
    }

    printUndoTable = () : void => {
        const tableData : any[] = [];
        const realCurrent: number = (this.undo().current() - 1 + Config.UNDO_MEMORY_SIZE) % Config.UNDO_MEMORY_SIZE;

        for (let i = Config.UNDO_MEMORY_SIZE - 1 ; i >= 0 ; i--){
            const snapshot = this.undo().memory()[i];

            if (snapshot === null){
                continue;
            }

            tableData.push({
                "current": realCurrent === i ? "->" : "",
                "description": snapshot.description(),
                "buffer position": i,
            });
        }

        // cycle the table rows (move top row to bottom) X times so that we have "front" at the top of the table
        const numCycles = tableData.length - this.undo().front();
        for (let i = 0 ; i < numCycles ; i++){
            tableData.push(tableData.shift());
        }

        console.table(tableData);
    }

    printLogicalGraphNodesTable = () : void => {
        const tableData : any[] = [];

        // add logical graph nodes to table
        for (const node of this.logicalGraph().getNodes()){
            tableData.push({
                "name":node.getName(),
                "key":node.getKey(),
                "parentKey":node.getParentKey(),
                "category":node.getCategory(),
                "expanded":node.getExpanded(),
                "x":node.getPosition().x,
                "y":node.getPosition().y,
                "width":node.getWidth(),
                "height":node.getHeight(),
                "inputAppKey":node.getInputApplication() === null ? null : node.getInputApplication().getKey(),
                "inputAppCategory":node.getInputApplication() === null ? null : node.getInputApplication().getCategory(),
                "inputAppEmbedKey":node.getInputApplication() === null ? null : node.getInputApplication().getEmbedKey(),
                "outputAppKey":node.getOutputApplication() === null ? null : node.getOutputApplication().getKey(),
                "outputAppCategory":node.getOutputApplication() === null ? null : node.getOutputApplication().getCategory(),
                "outputAppEmbedKey":node.getOutputApplication() === null ? null : node.getOutputApplication().getEmbedKey()
            });
        }

        console.table(tableData);
    }

    printLogicalGraphEdgesTable = () : void => {
        const tableData : any[] = [];

        // add logical graph nodes to table
        for (const edge of this.logicalGraph().getEdges()){
            tableData.push({
                "_id":edge.getId(),
                "sourceNodeKey":edge.getSrcNodeKey(),
                "sourcePortId":edge.getSrcPortId(),
                "destNodeKey":edge.getDestNodeKey(),
                "destPortId":edge.getDestPortId(),
                "dataType":edge.getDataType(),
                "loopAware":edge.isLoopAware()
            });
        }

        console.table(tableData);
    }

    printPalettesTable = () : void => {
        const tableData : any[] = [];

        // add logical graph nodes to table
        for (const palette of this.palettes()){
            for (const node of palette.getNodes()){
                tableData.push({"palette":palette.fileInfo().name, "name":node.getName(), "key":node.getKey(), "id":node.getId(), "embedKey":node.getEmbedKey(), "category":node.getCategory()});
            }
        }

        console.table(tableData);
    }

    generateLogicalGraphsTable = () : any[] => {
        // check that all repos have been fetched
        let foundUnfetched = false;
        for (const repo of this.repositories()){
            if (!repo.fetched()){
                foundUnfetched = true;
                console.warn("Unfetched repo:" + repo.getNameAndBranch());
            }
        }
        if (foundUnfetched){
            return [];
        }

        const tableData : any[] = [];

        // add logical graph nodes to table
        for (const repo of this.repositories()){
            for (const folder of repo.folders()){
                this._addGraphs(repo, folder, folder.name, tableData);
            }

            for (const file of repo.files()){
                if (file.name.endsWith(".graph")){
                    tableData.push({
                        "service":repo.service,
                        "name":repo.name,
                        "branch":repo.branch,
                        "folder":"",
                        "file":file.name,
                        "eagleVersion":"",
                        "sha":"",
                        "gitUrl":"",
                        "lastModified":"",
                        "lastModifiedBy":"",
                        "numLoadWarnings":"",
                        "numLoadErrors":"",
                        "numCheckWarnings":"",
                        "numCheckErrors":""
                    });
                }
            }
        }

        return tableData;
    }

    // recursive traversal through the folder structure to find all graph files
    _addGraphs = (repository: Repository, folder: RepositoryFolder, path: string, data: any[]) : void => {
        for (const subfolder of folder.folders()){
            this._addGraphs(repository, subfolder, path + "/" + subfolder.name, data);
        }

        for (const file of folder.files()){
            if (file.name.endsWith(".graph")){
                data.push({
                    "service": repository.service,
                    "name":repository.name,
                    "branch":repository.branch,
                    "folder":path,
                    "file":file.name,
                    "eagleVersion":"",
                    "sha":"",
                    "gitUrl":"",
                    "lastModified":"",
                    "lastModifiedBy":"",
                    "numLoadWarnings":"",
                    "numLoadErrors":"",
                    "numCheckWarnings":"",
                    "numCheckErrors":""
                });
            }
        }
    }

    fetchAllRepositories = () : void => {
        for (const repo of this.repositories()){
            if (!repo.fetched()){
                this.selectRepository(repo);
            }
        }
    }

    attemptLoadLogicalGraphTable = async(data: any[]) : Promise<void> => {
        for (const row of data){
            // determine the correct function to load the file
            let openRemoteFileFunc: any;
            if (row.service === Eagle.RepositoryService.GitHub){
                openRemoteFileFunc = GitHub.openRemoteFile;
            } else {
                openRemoteFileFunc = GitLab.openRemoteFile;
            }

            // try to load the file
            await new Promise<void>((resolve, reject) => {
                openRemoteFileFunc(row.service, row.name, row.branch, row.folder, row.file, (error: string, data: string) => {
                    // if file fetched successfully
                    if (error === null){
                        const errorsWarnings: Eagle.ErrorsWarnings = {"errors":[], "warnings":[]};
                        const file: RepositoryFile = new RepositoryFile(row.service, row.folder, row.file);
                        const lg: LogicalGraph = LogicalGraph.fromOJSJson(JSON.parse(data), file, errorsWarnings);

                        // record number of errors
                        row.numLoadWarnings = errorsWarnings.warnings.length;
                        row.numLoadErrors = errorsWarnings.errors.length;

                        // use git-related info within file
                        row.eagleVersion = lg.fileInfo().eagleVersion;
                        row.lastModifiedBy = lg.fileInfo().lastModifiedName;
                        row.sha = lg.fileInfo().sha;
                        row.gitUrl = lg.fileInfo().gitUrl;

                        // convert date from timestamp to date string
                        const date = new Date(lg.fileInfo().lastModifiedDatetime * 1000);
                        row.lastModified = date.toLocaleDateString() + " " + date.toLocaleTimeString()

                        // check the graph once loaded
                        const results: Eagle.ErrorsWarnings = Utils.checkGraph(lg);
                        row.numCheckWarnings = results.warnings.length;
                        row.numCheckErrors = results.errors.length;
                    }

                    resolve();
                });
            });
        }
    }


    // NOTE: input type here is NOT a Node, it is a Node ViewModel as defined in components.ts
    selectNodeInHierarchy = (nodeViewModel : any) : void => {
        const node : Node = this.logicalGraph().findNodeByKey(nodeViewModel.key());
        if (node === null){
            console.warn("Unable to find node in hierarchy!");
            return;
        }

        node.toggleExpanded();

        this.setSelection(Eagle.RightWindowMode.Hierarchy, node, Eagle.FileType.Graph);

        this.logicalGraph.valueHasMutated();
    }

    selectInputApplicationNode = () : void => {
        this.setSelection(Eagle.RightWindowMode.Inspector, this.selectedNode().getInputApplication(), Eagle.FileType.Graph);
    }

    selectOutputApplicationNode = () : void => {
        this.setSelection(Eagle.RightWindowMode.Inspector, this.selectedNode().getOutputApplication(), Eagle.FileType.Graph);
    }

    // TODO: looks like the node argument is not used here (or maybe just not used in the 'edit' half of the func)?
    editField = (node:Node, modalType: Eagle.ModalType, fieldType: Eagle.FieldType, fieldIndex: number) : void => {
        console.log("editField node:", node, "modalType:", modalType, "fieldType:", fieldType, "fieldIndex:", fieldIndex);

        // get field names list from the logical graph
        let allFields: Field[];
        let allFieldNames: string[] = [];

        if (fieldType === Eagle.FieldType.ComponentParameter){
            allFields = Utils.getUniqueFieldsList(this.logicalGraph());
        } else {
            allFields = Utils.getUniqueapplicationArgsList(this.logicalGraph());
        }

        // once done, sort fields and then collect names into the allFieldNames list
        allFields.sort(Field.sortFunc);
        for (const field of allFields){
            allFieldNames.push(field.getIdText() + " (" + field.getType() + ")");
        }

        //if creating a new field component parameter
        if (modalType === Eagle.ModalType.Add) {
            if (fieldType == Eagle.FieldType.ComponentParameter){
                $("#editFieldModalTitle").html("Add Component Parameter")
            } else {
                $("#editFieldModalTitle").html("Add Application Parameter")
            }
            $("#addParameterWrapper").show();
            $("#customParameterOptionsWrapper").hide();

            // create a field variable to serve as temporary field when "editing" the information. If the add field modal is completed the actual field component parameter is created.
            const field: Field = new Field(Utils.uuidv4(), "", "", "", "", "", false, Eagle.DataType.Integer, false, [], false);

            Utils.requestUserEditField(this, Eagle.ModalType.Add, fieldType, field, allFieldNames, (completed : boolean, newField: Field) => {
                // abort if the user aborted
                if (!completed){
                    return;
                }

                // check selected option in select tag
                const choices : string[] = $('#editFieldModal').data('choices');
                const choice : number = parseInt(<string>$('#fieldModalSelect').val(), 10);

                // abort if -1 selected
                if (choice === -1){
                    return;
                }

                // hide the custom text input unless the last option in the select is chosen
                if (choice === choices.length){
                    newField.setFieldType(fieldType);

                   //create field from user input in modal
                   if (fieldType === Eagle.FieldType.ComponentParameter){
                       node.addField(newField);
                   } else {
                       node.addApplicationArg(newField);
                   }
                } else {
                   const clone : Field = allFields[choice].clone();
                   clone.setFieldType(fieldType);
                   if (fieldType === Eagle.FieldType.ComponentParameter){
                       node.addField(clone);
                   } else {
                       node.addApplicationArg(clone);
                   }
                }

                this.checkGraph();
                this.undo().pushSnapshot(this, "Add field");
            });

        } else {
            //if editing an existing field
            let field: Field = null;

            switch (fieldType){
            case Eagle.FieldType.ComponentParameter:
                $("#editFieldModalTitle").html("Edit Component Parameter");
                field = this.selectedNode().getFields()[fieldIndex];
                break;
            case Eagle.FieldType.ApplicationArgument:
                $("#editFieldModalTitle").html("Edit Application Argument");
                field = this.selectedNode().getApplicationArgs()[fieldIndex];
                break;
            case Eagle.FieldType.InputPort:
                $("#editFieldModalTitle").html("Edit Input Port");
                field = this.selectedNode().getInputPorts()[fieldIndex];
                break;
            case Eagle.FieldType.OutputPort:
                $("#editFieldModalTitle").html("Edit Output Port");
                field = this.selectedNode().getOutputPorts()[fieldIndex];
                break;
            }

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

                this.checkGraph();
                this.undo().pushSnapshot(this, "Edit Field");
            });
        }
    };

    duplicateParameter = (index:number) :void => {
        var fieldIndex //variable holds the index of which row to highlight after creation
        if(Eagle.parameterTableSelectionParentIndex() != -1){
        //if a cell in the table is selected in this case the new node will be placed below the currently selected node
            fieldIndex = Eagle.parameterTableSelectionParentIndex()+1
            if (Eagle.parameterTableType() === Eagle.FieldType.ComponentParameter){
            //for component parameter tables
                this.selectedNode().addFieldAtPosition(this.selectedNode().getFields()[index].clone(),fieldIndex)
            }else{
            //for application parameter tables
                this.selectedNode().addApplicationArgAtPosition(this.selectedNode().getApplicationArgs()[index].clone(),fieldIndex)
            }
        }else{
        //if no call in the table is selected, in this case the new node is appended
            if (Eagle.parameterTableType() === Eagle.FieldType.ComponentParameter){
            //for component parameter tables
                this.selectedNode().addField(this.selectedNode().getFields()[index].clone())
            }else{
            //for application parameter tables
                this.selectedNode().addApplicationArg(this.selectedNode().getApplicationArgs()[index].clone())
            }
            fieldIndex = this.selectedNode().getFields().length -1
        }

        //handling selecting and highlighting the newly created node
        let clickTarget = $("#paramsTableWrapper tbody").children()[fieldIndex].firstElementChild.firstElementChild as HTMLElement
        clickTarget.click() //simply clicking the element is best as it also lets knockout handle all of the selection and obsrevable update process
        $("#parameterTableModal .modal-content").animate({
            scrollTop: (fieldIndex*30)
          }, 1000);
    }

    explorePalettesClickHelper = (data: PaletteInfo, event:any): void => {
        if (data === null){
            return;
        }

        var newState = !data.isSelected()
        data.isSelected(newState)

        if (typeof event === "undefined"){
            // load immediately
            this.openRemoteFile(new RepositoryFile(new Repository(data.repositoryService, data.repositoryName, data.repositoryBranch, false), data.path, data.name));
            $('#explorePalettesModal').modal('hide');
        } else {
            // mark as checked
            $(event.target).find('input').prop("checked", newState);
        }
    }

    getExplorePaletteText = (number:number): string => {
        var text = " branch"
        if (number > 1){
            text = " branches"
        }
        var text = "Click to view " + number + text;
        return text;
    }

    disableClickToLoadDefault = (data:string, event:any):void =>{
        console.log("blop")
        console.log(event.target)
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

    setNodeInputApplication = () : void => {
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            Utils.showUserMessage("Error", "Unable to add embedded applications to components within palettes. If you wish to add an embedded application, please add it to an instance of this component within a graph.");
            return;
        }

        this.setNodeApplication("Input Application", "Choose an input application", (node: Node) => {
            const selectedNode: Node = this.selectedNode();
            const oldApp: Node = selectedNode.getInputApplication();

            // remove all edges incident on the old input application
            if (oldApp !== null){
                this.logicalGraph().removeEdgesByKey(oldApp.getKey());
            }

            selectedNode.setInputApplication(node);

            this.checkGraph();
            this.undo().pushSnapshot(this, "Set Node Input Application");
        });
    }

    setNodeOutputApplication = () : void => {
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            Utils.showUserMessage("Error", "Unable to add embedded applications to components within palettes. If you wish to add an embedded application, please add it to an instance of this component within a graph.");
            return;
        }

        this.setNodeApplication("Output Application", "Choose an output application", (node: Node) => {
            const selectedNode: Node = this.selectedNode();
            const oldApp: Node = selectedNode.getOutputApplication();

            // remove all edges incident on the old output application
            if (oldApp !== null){
                this.logicalGraph().removeEdgesByKey(oldApp.getKey());
            }

            selectedNode.setOutputApplication(node);

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

    autoLoad = (service: Eagle.RepositoryService, repository: string, branch: string, path: string, filename: string): void => {
        console.log("autoLoadUrl()", service, repository, branch, path, filename);

        // skip empty string urls
        if (service === Eagle.RepositoryService.Unknown || repository === "" || branch === "" || filename === ""){
            console.log("No auto load");
            return;
        }

        // load
        this.selectFile(new RepositoryFile(new Repository(service, repository, branch, false), path, filename));
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
        const checkResult = Utils.checkGraph(this.logicalGraph());

        this.graphWarnings(checkResult.warnings);
        this.graphErrors(checkResult.errors);
    };

    // TODO: maybe try to move some of this html out to a template
    showGraphErrors = (): void => {
        if (this.graphWarnings().length > 0 || this.graphErrors().length > 0){
            let message = "";

            //start of modal content
            message += "<div class='accordion' id='checkGraphAccordion'>"

                //graph errors
                if (this.graphErrors().length > 0){
                    message += '<div class="accordion-item">'
                        message += '<h2 class="accordion-header" id="checkGraphAccordionHeadingOne">'
                            message += '<button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#checkGraphAccordionCollapseOne" aria-expanded="true" aria-controls="checkGraphAccordionCollapseOne"> Errors  <span id="graphErrorRed">[' + this.graphErrors().length + ']</span></button>'
                        message += "</h2>"
                        message += '<div id="checkGraphAccordionCollapseOne" class="accordion-collapse collapse show" aria-labelledby="checkGraphAccordionHeadingOne">'
                            message += '<div class="accordion-body">'
                                message += this.graphErrors().join('<br/>')
                            message += '</div>'
                        message += '</div>'
                    message += "</div>"
                }

                //graph warnings
                if (this.graphWarnings().length > 0){
                    message += '<div class="accordion-item">'
                        message += '<h2 class="accordion-header" id="checkGraphAccordionHeadingTwo">'
                            message += '<button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#checkGraphAccordionCollapseTwo" aria-expanded="true" aria-controls="checkGraphAccordionCollapseTwo"> Warnings  <span id="graphErrorYellow">[' + this.graphWarnings().length + ']</span></button>'
                        message += "</h2>"
                        message += '<div id="checkGraphAccordionCollapseTwo" class="accordion-collapse collapse show" aria-labelledby="checkGraphAccordionHeadingTwo">'
                            message += '<div class="accordion-body">'
                                message += this.graphWarnings().join('<br/>')
                            message += '</div>'
                        message += '</div>'
                    message += "</div>"
                }

            //end of modal content
            message += "</div>"

            Utils.showUserMessage("Check Graph", message);
            //set fixed height for this use of the shared modal to prevent it collapsing when collapsing a section within
            $("#checkGraphAccordion").parent().parent().css("height","70vh")
        } else {
            Utils.showNotification("Check Graph", "Graph OK", "success");
        }
    }

    showPerformanceDisplay : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return Eagle.findSetting(Utils.ENABLE_PERFORMANCE_DISPLAY).value();
    }, this);

    addEdge = (srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean, callback: (edge: Edge) => void) : void => {
        const edgeConnectsTwoApplications : boolean =
            (srcNode.isApplication() || srcNode.isGroup()) &&
            (destNode.isApplication() || destNode.isGroup());

        const twoEventPorts : boolean = srcPort.getIsEvent() && destPort.getIsEvent();

        // if edge DOES NOT connect two applications, process normally
        if (!edgeConnectsTwoApplications || twoEventPorts){
            const edge : Edge = new Edge(srcNode.getKey(), srcPort.getId(), destNode.getKey(), destPort.getId(), srcPort.getType(), loopAware, closesLoop);
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
        const ineligibleCategories : Eagle.Category[] = [];
        if (destNode.getCategory() === Eagle.Category.BashShellApp){
            ineligibleCategories.push(Eagle.Category.Memory);
        }

        const eligibleComponents = Utils.getDataComponentsWithPortTypeList(this.palettes(), srcPort.getIdText(), srcPort.getType(), ineligibleCategories);

        // if edge DOES connect two applications, insert data component (of type chosen by user except ineligibleTypes)
        this.logicalGraph().addDataComponentDialog(eligibleComponents, (node: Node) : void => {
            if (node === null) {
                return;
            }

            // Add a data component to the graph.
            const newNode : Node = this.logicalGraph().addDataComponentToGraph(node, dataComponentPosition);
            const newNodeKey : number = Utils.newKey(this.logicalGraph().getNodes());
            newNode.setKey(newNodeKey);

            // set name of new node (use user-facing name)
            newNode.setName(srcPort.getDisplayText());

            // add input port and output port for dataType (if they don't exist)
            // TODO: check by type, not name
            let newInputPort = newNode.findPortByIdText(srcPort.getIdText(), true, false);
            let newOutputPort = newNode.findPortByIdText(destPort.getIdText(), false, false);

            if (!newInputPort){
                newInputPort = new Field(Utils.uuidv4(), srcPort.getDisplayText(), srcPort.getIdText(), "", "", "", false, srcPort.getType(), false, [], false);
                newInputPort.setFieldType(Eagle.FieldType.InputPort);
                newNode.addApplicationArg(newInputPort);
            }
            if (!newOutputPort){
                newOutputPort = new Field(Utils.uuidv4(), destPort.getDisplayText(), destPort.getIdText(), "", "", "", false, destPort.getType(), false, [], false);
                newOutputPort.setFieldType(Eagle.FieldType.OutputPort);
                newNode.addApplicationArg(newOutputPort);
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
            const firstEdge : Edge = new Edge(srcNode.getKey(), srcPort.getId(), newNodeKey, newInputPort.getId(), srcPort.getType(), loopAware, closesLoop);
            const secondEdge : Edge = new Edge(newNodeKey, newOutputPort.getId(), destNode.getKey(), destPort.getId(), destPort.getType(), loopAware, closesLoop);

            this.logicalGraph().addEdgeComplete(firstEdge);
            this.logicalGraph().addEdgeComplete(secondEdge);

            // reply with one of the edges
            if (callback !== null) callback(firstEdge);
        });
    }

    editNodeCategory = (eagle: Eagle) : void => {
        // create array of all categories
        let categories: Eagle.Category[] = [];
        let selectedIndex = 0;
        let i = 0;

        for (const category of Object.values(Eagle.Category)){
            categories.push(category);
            if (category === this.selectedNode().getCategory()){
                selectedIndex = i;
            }
            i++;
        }

        Utils.requestUserChoice("Edit Node Category", "NOTE: changing a node's category could destroy some data (parameters, ports, etc) that are not appropriate for a node with the selected category", categories, selectedIndex, false, "", (completed:boolean, userChoiceIndex: number, userCustomString: string) => {
            if (!completed){
                return;
            }

            // change the category of the node
            this.selectedNode().setCategory(categories[userChoiceIndex]);

            // once the category is changed, some things about the node may no longer be valid
            // for example, the node may contain ports, but no ports are allowed

            // get category data
            const categoryData = Eagle.getCategoryData(categories[userChoiceIndex]);

            // delete parameters, if necessary
            if (this.selectedNode().getFields().length > 0 && !categoryData.canHaveComponentParameters){
                this.selectedNode().removeAllFields();
            }

            // delete application args, if necessary
            if (this.selectedNode().getApplicationArgs().length > 0 && !categoryData.canHaveApplicationArguments){
                this.selectedNode().removeAllApplicationArgs();
            }

            // delete extra input ports
            if (this.selectedNode().getInputPorts().length > categoryData.maxInputs){
                for (let i = this.selectedNode().getInputPorts().length - 1 ; i >= 0 ; i--){
                    this.removePortFromNodeByIndex(this.selectedNode(), i, true);
                }
            }

            // delete extra output ports
            if (this.selectedNode().getOutputPorts().length > categoryData.maxOutputs){
                for (let i = this.selectedNode().getOutputPorts().length - 1 ; i >= 0 ; i--){
                    this.removePortFromNodeByIndex(this.selectedNode(), i, false);
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
        if (newNode.getCategory() === Eagle.Category.Start) {
            // Store the node's location.
            const nodePosition = newNode.getPosition();

            // build a list of ineligible types
            const eligibleComponents = Utils.getDataComponentsWithPortTypeList(this.palettes(), null, null, [Eagle.Category.Memory, Eagle.Category.SharedMemory]);

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
                newNode.removeApplicationArgByIndex(0);

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

    static getCategoryData = (category : Eagle.Category) : Eagle.CategoryData => {
        const c = Eagle.cData[category];

        if (typeof c === 'undefined'){
            console.error("Could not fetch category data for category", category);
            return {
                isData: false,
                isApplication: false,
                isGroup: false,
                isResizable: false,
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

    static readonly dataIconColor : string = "#2c2c2c"
    static readonly appIconColor : string = "#0059a5"
    static readonly groupIconColor : string = "rgb(221, 173, 0)"
    static readonly descriptionIconColor : string = "rgb(157 43 96)"
    static readonly errorIconColor : string = "#FF66CC"
    static readonly controlIconColor : string = "rgb(88 167 94)"
    static readonly selectionColor : string = "rgb(47 22 213)"

    static readonly controlSortOrder = 0;
    static readonly appSortOrder = 1;
    static readonly dataSortOrder = 2;
    static readonly constructSortOrder = 3;
    static readonly documentationSortOrder = 4;
    static readonly otherSortOrder = 5;

    static readonly cData : {[category:string] : Eagle.CategoryData} = {
        Start                : {isData: false, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-play_arrow", color: Eagle.controlIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.controlSortOrder},
        End                  : {isData: false, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-stop", color: Eagle.controlIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.controlSortOrder},
        Comment              : {isData: false, isApplication: false, isGroup: false, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-comment", color: Eagle.descriptionIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.documentationSortOrder},
        Description          : {isData: false, isApplication: false, isGroup: false, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-description", color: Eagle.descriptionIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.documentationSortOrder},
        Scatter              : {isData: false, isApplication: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-call_split", color: Eagle.groupIconColor, collapsedHeaderOffsetY: 20, expandedHeaderOffsetY: 20, sortOrder: Eagle.constructSortOrder},
        Gather               : {isData: false, isApplication: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-merge_type", color: Eagle.groupIconColor, collapsedHeaderOffsetY: 20, expandedHeaderOffsetY: 20, sortOrder: Eagle.constructSortOrder},
        MKN                  : {isData: false, isApplication: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: true, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-many-to-many", color: Eagle.groupIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.constructSortOrder},
        GroupBy              : {isData: false, isApplication: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: true, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-group", color: Eagle.groupIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.constructSortOrder},
        Loop                 : {isData: false, isApplication: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-loop", color: Eagle.groupIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.constructSortOrder},

        PythonApp            : {isData: false, isApplication: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-python", color: Eagle.appIconColor, collapsedHeaderOffsetY: 10, expandedHeaderOffsetY: 20, sortOrder: Eagle.appSortOrder},
        BashShellApp         : {isData: false, isApplication: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-bash", color: Eagle.appIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.appSortOrder},
        DynlibApp            : {isData: false, isApplication: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-dynamic_library", color: Eagle.appIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.appSortOrder},
        DynlibProcApp        : {isData: false, isApplication: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-dynamic_library", color: Eagle.appIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.appSortOrder},
        Mpi                  : {isData: false, isApplication: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-mpi", color: Eagle.appIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.appSortOrder},
        Docker               : {isData: false, isApplication: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-docker", color: Eagle.appIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.appSortOrder},
        Singularity          : {isData: false, isApplication: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-singularity", color: Eagle.appIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.appSortOrder},

        File                 : {isData: true, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-hard-drive", color: Eagle.dataIconColor, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Eagle.dataSortOrder},
        Memory               : {isData: true, isApplication: false, isGroup: false, isResizable: false, minInputs: 1, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-memory", color: Eagle.dataIconColor, collapsedHeaderOffsetY: 16, expandedHeaderOffsetY: 20, sortOrder: Eagle.dataSortOrder},
        SharedMemory         : {isData: true, isApplication: false, isGroup: false, isResizable: false, minInputs: 1, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-shared_memory", color: Eagle.dataIconColor, collapsedHeaderOffsetY: 16, expandedHeaderOffsetY: 20, sortOrder: Eagle.dataSortOrder},
        NGAS                 : {isData: true, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-ngas", color: Eagle.dataIconColor, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Eagle.dataSortOrder},
        S3                   : {isData: true, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-s3_bucket", color: Eagle.dataIconColor, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Eagle.dataSortOrder},
        Plasma               : {isData: true, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-plasma", color: Eagle.dataIconColor, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Eagle.dataSortOrder},
        PlasmaFlight         : {isData: true, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-plasmaflight", color: Eagle.dataIconColor, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Eagle.dataSortOrder},

        ParameterSet         : {isData: true, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-tune", color: Eagle.dataIconColor, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Eagle.dataSortOrder},
        EnvironmentVariables : {isData: true, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-tune", color: Eagle.dataIconColor, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Eagle.dataSortOrder},

        Service              : {isData: false, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-build", color: Eagle.appIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.appSortOrder},
        ExclusiveForceNode   : {isData: false, isApplication: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-force_node", color: Eagle.groupIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.constructSortOrder},

        Branch               : {isData: false, isApplication: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 2, maxOutputs: 2, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-share", color: Eagle.controlIconColor, collapsedHeaderOffsetY: 20, expandedHeaderOffsetY: 54, sortOrder: Eagle.controlSortOrder},

        SubGraph             : {isData: false, isApplication: false, isGroup: true, isResizable: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-subgraph", color: Eagle.groupIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.constructSortOrder},

        Unknown              : {isData: false, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-question_mark", color: Eagle.errorIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.otherSortOrder},
        None                 : {isData: false, isApplication: false, isGroup: false, isResizable: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-none", color: Eagle.errorIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.otherSortOrder},
        UnknownApplication   : {isData: false, isApplication: true, isGroup: false, isResizable: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-question_mark", color: Eagle.errorIconColor, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Eagle.otherSortOrder},
    };
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

    export enum DataType {
        Unknown = "Unknown",
        String = "String",
        Integer = "Integer",
        Float = "Float",
        Complex = "Complex",
        Boolean = "Boolean",
        Select = "Select",
        Password = "Password",
        Json = "Json",
        Python = "Python",
    }

    export enum ModalType {
        Add = "Add",
        Edit = "Edit"
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

    export enum Category {
        Start = "Start",
        End = "End",
        Comment = "Comment",
        Description = "Description",
        Scatter = "Scatter",
        Gather = "Gather",
        MKN = "MKN",
        GroupBy = "GroupBy",
        Loop = "Loop",

        PythonApp = "PythonApp",
        BashShellApp = "BashShellApp",
        DynlibApp = "DynlibApp",
        DynlibProcApp = "DynlibProcApp",
        MPI = "Mpi",
        Docker = "Docker",

        NGAS = "NGAS",
        S3 = "S3",
        Memory = "Memory",
        SharedMemory = "SharedMemory",
        File = "File",
        Plasma = "Plasma",
        PlasmaFlight = "PlasmaFlight",

        ParameterSet = "ParameterSet",
        EnvironmentVariables = "EnvironmentVariables",

        Service = "Service",
        ExclusiveForceNode = "ExclusiveForceNode",

        Branch = "Branch",

        SubGraph = "SubGraph",

        Unknown = "Unknown",
        None = "None",
        UnknownApplication = "UnknownApplication", // when we know the component is an application, but know wlmost nothing else about it

        Component = "Component" // legacy only
    }

    export enum Direction {
        Up = "Up",
        Down = "Down",
        Left = "Left",
        Right = "Right"
    }

    export type CategoryData = {
        isData: boolean,
        isApplication: boolean,
        isGroup:boolean,
        isResizable:boolean,
        minInputs: number,
        maxInputs: number,
        minOutputs: number,
        maxOutputs: number,
        canHaveInputApplication: boolean,
        canHaveOutputApplication: boolean,
        canHaveComponentParameters: boolean,
        canHaveApplicationArguments: boolean,
        icon: string,
        color: string,
        collapsedHeaderOffsetY: number,
        expandedHeaderOffsetY: number,
        sortOrder: number
    };
    export type ErrorsWarnings = {warnings: string[], errors: string[]};
}


$( document ).ready(function() {
    // jquery event listeners start here

    //hides the dropdown navbar elements when stopping hovering over the element
    $(".dropdown-menu").mouseleave(function(){
      $(".dropdown-toggle").removeClass("show")
      $(".dropdown-menu").removeClass("show")
    })

    $('.modal').on('hidden.bs.modal', function () {
        $('.modal-dialog').css({"left":"0px", "top":"0px"})
        $("#editFieldModal textarea").attr('style','')
        $("#checkGraphAccordion").parent().parent().attr('style','')

        //reset parameter table selecction
        Eagle.resetParamsTableSelection()
    });

    $('.modal').on('shown.bs.modal',function(){
        // modal draggables
        //the any type is required so we dont have an error when building. at runtime on eagle this actually functions without it.
        (<any>$('.modal-dialog')).draggable({
            handle: ".modal-header"
        });
    })

    //increased click bubble for edit modal flag booleans
    $(".componentCheckbox").on("click",function(){
        $(event.target).find("input").click()
    })

    $('#editFieldModalValueInputCheckbox').on("change",function(){
        $(event.target).parent().find("span").text($(event.target).prop('checked'))
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


});
