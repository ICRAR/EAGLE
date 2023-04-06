import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

export class SettingsGroup {
    private name : string;
    private displayFunc : (eagle: Eagle) => boolean;
    private settings : Setting[];

    constructor(name: string, displayFunc: () => boolean, settings: Setting[]){
        this.name = name;
        this.displayFunc = displayFunc;
        this.settings = settings;
    }

    isVisible = (eagle: Eagle) : boolean => {
        return this.displayFunc(eagle);
    }

    getSettings = () : Setting[] => {
        return this.settings;
    }

    // used by the settings modal html to generate an id from the name
    getHtmlId = () : string => {
        return 'settingCategory' + this.name.split(' ').join('');
    }
}

export class Setting {
    value : ko.Observable<any>;
    private name : string;
    private description : string;
    private type : Setting.Type;
    private key : string;
    private defaultValue : any;
    private oldValue : any;
    private options : string[];
    private display : boolean; // if true, display setting in settings modal, otherwise do not display

    static readonly GITHUB_ACCESS_TOKEN_KEY: string = "GitHubAccessToken";
    static readonly GITLAB_ACCESS_TOKEN_KEY: string = "GitLabAccessToken";
    static readonly RIGHT_WINDOW_WIDTH_KEY : string = "RightWindowWidth";
    static readonly LEFT_WINDOW_WIDTH_KEY : string = "LeftWindowWidth";

    static readonly CONFIRM_DISCARD_CHANGES : string = "ConfirmDiscardChanges";
    static readonly CONFIRM_REMOVE_REPOSITORES : string = "ConfirmRemoveRepositories";
    static readonly CONFIRM_RELOAD_PALETTES : string = "ConfirmReloadPalettes";
    static readonly CONFIRM_DELETE_OBJECTS : string = "ConfirmDeleteObjects";

    static readonly SHOW_FILE_LOADING_ERRORS : string = "ShowFileLoadingErrors";

    static readonly ALLOW_INVALID_EDGES : string = "AllowInvalidEdges";
    static readonly ALLOW_COMPONENT_EDITING : string = "AllowComponentEditing";
    static readonly ALLOW_READONLY_PALETTE_EDITING : string = "AllowReadonlyPaletteEditing";
    static readonly ALLOW_EDGE_EDITING : string = "AllowEdgeEditing";
    static readonly SHOW_NON_KEY_PARAMETERS : string = "ShowNonKeyParameters";
    static readonly AUTO_SUGGEST_DESTINATION_NODES : string = "AutoSuggestDestinationNodes";

    static readonly ALLOW_PALETTE_EDITING : string = "AllowPaletteEditing";
    static readonly DISPLAY_NODE_KEYS : string = "DisplayNodeKeys"
    static readonly ALLOW_SET_KEY_PARAMETER : string = "AllowSetKeyParameter"

    static readonly TRANSLATOR_URL : string = "TranslatorURL";

    static readonly TRANSLATE_WITH_NEW_CATEGORIES: string = "TranslateWithNewCategories"; // temp fix for incompatibility with the DaLiuGE translator

    static readonly OPEN_DEFAULT_PALETTE: string = "OpenDefaultPalette";
    static readonly CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS: string = "CreateApplicationsForConstructPorts";
    static readonly DISABLE_JSON_VALIDATION: string = "DisableJsonValidation";

    static readonly DOCKER_HUB_USERNAME: string = "DockerHubUserName";
    static readonly OPEN_TRANSLATOR_IN_CURRENT_TAB: string = "OpenTranslatorInCurrentTab";
    static readonly OVERWRITE_TRANSLATION_TAB: string = "OverwriteTranslationTab";
    static readonly ENABLE_PERFORMANCE_DISPLAY: string = "EnablePerformanceDisplay";
    static readonly HIDE_PALETTE_TAB: string = "HidePaletteTab";
    static readonly HIDE_READONLY_PARAMETERS: string = "HideReadonlyParamters";

    static readonly GRAPH_ZOOM_DIVISOR: string = "GraphZoomDivisor";
    static readonly USER_INTERFACE_MODE: string = "UserInterfaceMode";
    static readonly USER_TRANSLATOR_MODE: string = "UserTranslatorMode";

    static readonly SKIP_CLOSE_LOOP_EDGES: string = "SkipCloseLoopEdges";
    static readonly PRINT_UNDO_STATE_TO_JS_CONSOLE: string = "PrintUndoStateToJsConsole";
    static readonly SNAP_TO_GRID: string = "SnapToGrid";
    static readonly SNAP_TO_GRID_SIZE: string = "SnapToGridSize";
    static readonly SHOW_INSPECTOR_WARNINGS: string = "ShowInspectorWarnings";

    constructor(name : string, description : string, type : Setting.Type, key : string, defaultValue : any, display: boolean, options?: string[]){
        this.name = name;
        this.description = description;
        this.type = type;
        this.key = key;
        this.value = ko.observable(defaultValue);
        this.defaultValue = defaultValue;
        this.oldValue = "";
        this.options = options;
        this.display = display;

        this.load();

        const that = this;
        this.value.subscribe(function(){
            that.save();
        });
    }

    getName = () : string => {
        return this.name;
    }

    getDescription = () : string => {
        return this.description + " (default value: " + this.defaultValue + ")";
    }

    getType = () : Setting.Type => {
        return this.type;
    }

    getKey = () : string => {
        return this.key;
    }

    getOldValue = () : any => {
        return this.oldValue;
    }

    setValue = (value: any) : void => {
        this.value(value);
    }

    getDisplay = () : boolean => {
        return this.display;
    }

    save = () : void => {
        localStorage.setItem(this.key, this.valueToString(this.value()));
    }

    load = () : void => {
        const v = localStorage.getItem(this.key);

        if (v === null)
            this.value(this.defaultValue);
        else
            this.value(this.stringToValue(v));
    }

    toggle = () : void => {
        if (this.type !== Setting.Type.Boolean){
            console.warn("toggle() called on Setting that is not a boolean!" + this.getName() + " " + this.getType() + " " + this.value());
            return;
        }

        // update the value
        this.value(!this.value());
    }

    copy = () : void => {
        navigator.clipboard.writeText(this.value().toString()).then(function() {
            Utils.showNotification("Success", "Copying to clipboard was successful!", "success");
        }, function(err) {
            Utils.showNotification("Error", "Could not copy setting. " + err, "danger");
        });
    }

    resetDefault = () : void => {
        this.value(this.defaultValue);
    }

    cancelChanges = () : void => {
        this.value(this.oldValue)
    }

    copyCurrentSettings = () : void => {
        this.oldValue = this.value()
    }

    private valueToString = (value : any) : string => {
        return value.toString();
    }

    private stringToValue = (s : string) : any => {
        switch (this.type){
            case Setting.Type.String:
            case Setting.Type.Password:
            case Setting.Type.Select:
                return s;
            case Setting.Type.Number:
                return Number(s);
            case Setting.Type.Boolean:
                return s.toLowerCase() === "true";
            default:
                console.warn("Unknown setting type", this.type);
                return s;
        }
    }

    static find = (key : string) : Setting => {
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

    static findValue = (key : string) : any => {
        const setting = Setting.find(key);

        if (setting === null){
            console.warn("No setting", key);
            return null;
        }

        return setting.value();
    }

    static setValue = (key : string, value : any) : void => {
        const setting = Setting.find(key);
        console.log('settings changed')
        if (setting === null){
            console.warn("No setting", key);
            return;
        }

        return setting.value(value);
    }

    static resetDefaults = () : void => {
        // if a reset would turn off the expert mode setting,
        // AND we are currently on the 'advanced editing' or 'developer' tabs of the setting modal,
        // then those tabs will disappear and we'll be left looking at nothing, so switch to the 'User Options' tab
        const uiModeSetting: Setting = Setting.find(Setting.USER_INTERFACE_MODE);
        const turningOffExpertMode = uiModeSetting.value() !== Setting.UIMode.Expert && uiModeSetting.getOldValue() === Setting.UIMode.Expert;
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

    static getSettings = () : SettingsGroup[] => {
        return settings;
    }
}

export namespace Setting {
    export enum Type {
        String,
        Number,
        Boolean,
        Password,
        Select
    }

    export enum ShowErrorsMode {
        None = "None",
        Errors = "Errors",
        Warnings = "Warnings"
    }
            
    export enum UIMode {
        Minimal = "minimal",
        Default = "default",
        Graph = "graph",
        Palette = "palette",
        Expert = "expert",
        Custom = "custom"
    }

    export enum ErrorsMode {
        Loading = "Loading",
        Graph = "Graph"
    }

    export enum TranslatorMode {
        Minimal = "minimal",
        Default = "default",
        Expert = "expert"
    }
}

const settings : SettingsGroup[] = [
    new SettingsGroup(
        "User Options",
        () => {return true;},
        [
            new Setting("Confirm Discard Changes", "Prompt user to confirm that unsaved changes to the current file should be discarded when opening a new file, or when navigating away from EAGLE.", Setting.Type.Boolean, Setting.CONFIRM_DISCARD_CHANGES, true, true),
            new Setting("Confirm Remove Repositories", "Prompt user to confirm removing a repository from the list of known repositories.", Setting.Type.Boolean, Setting.CONFIRM_REMOVE_REPOSITORES, true, true),
            new Setting("Confirm Reload Palettes", "Prompt user to confirm when loading a palette that is already loaded.", Setting.Type.Boolean, Setting.CONFIRM_RELOAD_PALETTES, true, true),
            new Setting("Open Default Palette on Startup", "Open a default palette on startup. The palette contains an example of all known node categories", Setting.Type.Boolean, Setting.OPEN_DEFAULT_PALETTE, true, true),
            new Setting("Confirm Delete", "Prompt user to confirm when deleting node(s) or edge(s) from a graph.", Setting.Type.Boolean, Setting.CONFIRM_DELETE_OBJECTS, true, true),
            new Setting("Disable JSON Validation", "Allow EAGLE to load/save/send-to-translator graphs and palettes that would normally fail validation against schema.", Setting.Type.Boolean, Setting.DISABLE_JSON_VALIDATION, false, true),
            new Setting("Overwrite Existing Translator Tab", "When translating a graph, overwrite an existing translator tab", Setting.Type.Boolean, Setting.OVERWRITE_TRANSLATION_TAB, true, true),
            new Setting("Show File Loading Warnings", "Display list of issues with files encountered during loading.", Setting.Type.Boolean, Setting.SHOW_FILE_LOADING_ERRORS, false, true),
            new Setting("UI Mode", "User Interface Mode. Simple Mode removes palettes, uses a single graph repository, simplifies the parameters table. Expert Mode enables the display of additional settings usually reserved for advanced users", Setting.Type.Select, Setting.USER_INTERFACE_MODE, Setting.UIMode.Default, true, Object.values(Setting.UIMode)),
        ]
    ),
    new SettingsGroup(
        "UI Options",
        () => {return !Eagle.isInUIMode(Setting.UIMode.Minimal);},
        [
            new Setting("Show non key parameters", "Show additional parameters that are not marked as key parameters for the current graph", Setting.Type.Boolean, Setting.SHOW_NON_KEY_PARAMETERS, true, true),
            new Setting("Display Node Keys","Display Node Keys", Setting.Type.Boolean, Setting.DISPLAY_NODE_KEYS, false, true),
            new Setting("Hide Palette Tab", "Hide the Palette tab", Setting.Type.Boolean, Setting.HIDE_PALETTE_TAB, false, true),
            new Setting("Hide Read Only Parameters", "Hide read only paramters", Setting.Type.Boolean, Setting.HIDE_READONLY_PARAMETERS, false, true),
            new Setting("Translator Mode", "Configue the translator mode", Setting.Type.Select, Setting.USER_TRANSLATOR_MODE, Setting.TranslatorMode.Default, true, Object.values(Setting.TranslatorMode)),
            new Setting("Graph Zoom Divisor", "The number by which zoom inputs are divided before being applied. Larger divisors reduce the amount of zoom.", Setting.Type.Number, Setting.GRAPH_ZOOM_DIVISOR, 1000, true),
            new Setting("Snap To Grid", "Align positions of nodes in graph to a grid", Setting.Type.Boolean, Setting.SNAP_TO_GRID, false, false),
            new Setting("Snap To Grid Size", "Size of grid used when aligning positions of nodes in graph (pixels)", Setting.Type.Number, Setting.SNAP_TO_GRID_SIZE, 50, true),
            new Setting("Show edge/node errors/warnings in inspector", "Show the errors/warnings found for the selected node/edge in the inspector", Setting.Type.Select, Setting.SHOW_INSPECTOR_WARNINGS, Setting.ShowErrorsMode.Errors, true, Object.values(Setting.ShowErrorsMode)),
        ]
    ),
    new SettingsGroup(
        "Advanced Editing",
        () => {return Eagle.isInUIMode(Setting.UIMode.Expert);},
        [
            new Setting("Allow Invalid edges", "Allow the user to create edges even if they would normally be determined invalid.", Setting.Type.Boolean, Setting.ALLOW_INVALID_EDGES, true, true),
            new Setting("Allow Component Editing", "Allow the user to add/remove ports and parameters from components.", Setting.Type.Boolean, Setting.ALLOW_COMPONENT_EDITING, true, true),
            new Setting("Allow Set Key Parameter", "Allow the user to add/remove ports and parameters from components.", Setting.Type.Boolean, Setting.ALLOW_SET_KEY_PARAMETER, true, true),
            new Setting("Allow Palette Editing", "Allow the user to edit palettes.", Setting.Type.Boolean, Setting.ALLOW_PALETTE_EDITING, true, true),
            new Setting("Allow Readonly Palette Editing", "Allow the user to modify palettes that would otherwise be readonly.", Setting.Type.Boolean, Setting.ALLOW_READONLY_PALETTE_EDITING, true, true),
            new Setting("Allow Edge Editing", "Allow the user to edit edge attributes.", Setting.Type.Boolean, Setting.ALLOW_EDGE_EDITING, true, true),
            new Setting("Auto-suggest destination nodes", "If an edge is drawn to empty space, EAGLE will automatically suggest compatible destination nodes.", Setting.Type.Boolean, Setting.AUTO_SUGGEST_DESTINATION_NODES, true, true)
        ]
    ),
    new SettingsGroup(
        "External Services",
        () => {return true;},
        [
            new Setting("Translator URL", "The URL of the translator server", Setting.Type.String, Setting.TRANSLATOR_URL, "http://localhost:8084/gen_pgt", true),
            new Setting("GitHub Access Token", "A users access token for GitHub repositories.", Setting.Type.Password, Setting.GITHUB_ACCESS_TOKEN_KEY, "", true),
            new Setting("GitLab Access Token", "A users access token for GitLab repositories.", Setting.Type.Password, Setting.GITLAB_ACCESS_TOKEN_KEY, "", true),
            new Setting("Docker Hub Username", "The username to use when retrieving data on images stored on Docker Hub", Setting.Type.String, Setting.DOCKER_HUB_USERNAME, "icrar", true)
        ]
    ),
    new SettingsGroup(
        "Developer",
        () => {return Eagle.isInUIMode(Setting.UIMode.Expert);},
        [
            new Setting("Enable Performance Display", "Display the frame time of the graph renderer", Setting.Type.Boolean, Setting.ENABLE_PERFORMANCE_DISPLAY, false, true),
            new Setting("Translate with New Categories", "Replace the old categories with new names when exporting. For example, replace 'Component' with 'PythonApp' category.", Setting.Type.Boolean, Setting.TRANSLATE_WITH_NEW_CATEGORIES, false, true),
            new Setting("Open Translator In Current Tab", "When translating a graph, display the output of the translator in the current tab", Setting.Type.Boolean, Setting.OPEN_TRANSLATOR_IN_CURRENT_TAB, false, true),
            new Setting("Create Applications for Construct Ports", "When loading old graph files with ports on construct nodes, move the port to an embedded application", Setting.Type.Boolean, Setting.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS, true, true),
            new Setting("Skip 'closes loop' edges in JSON output", "We've recently added edges to the LinkDataArray that 'close' loop constructs and set the 'group_start' and 'group_end' automatically. In the short-term, such edges are not supported by the translator. This setting will keep the new edges during saving/loading, but remove them before sending the graph to the translator.", Setting.Type.Boolean, Setting.SKIP_CLOSE_LOOP_EDGES, true, true),
            new Setting("Print Undo state to JS Console", "Prints the state of the undo memory whenever a change occurs. The state is written to the browser's javascript console", Setting.Type.Boolean, Setting.PRINT_UNDO_STATE_TO_JS_CONSOLE, false, true),
        ]
    )
];
