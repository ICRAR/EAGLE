import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Errors } from './Errors';
import { Palette } from "./Palette";
import { Repository } from "./Repository";
import { UiModeSystem } from './UiModes';
import { Utils } from './Utils';

export class SettingsGroup {
    private name : string;
    private displayFunc : (eagle: Eagle) => boolean;
    private settings : Setting[];

    constructor(name: string, displayFunc: () => boolean, settings: Setting[]){
        this.name = name;
        this.displayFunc = displayFunc;
        this.settings = settings;
    }

    getName = () :string => {
        return this.name;
    }

    isVisible = (eagle: Eagle) : boolean => {
        return this.displayFunc(eagle) || Setting.findValue(Setting.SHOW_DEVELOPER_TAB);
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
    private display : boolean; // if true, display setting in settings modal, otherwise do not display
    private name : string;
    private key : string;
    private description : string;
    private perpetual : boolean; // if true, then this setting will stay the same across all ui modes(always storing and using the data from the default ui mode)
    private type : Setting.Type;
    private studentDefaultValue : any;
    private minimalDefaultValue : any;
    private graphDefaultValue : any;
    private componentDefaultValue : any;
    private expertDefaultValue : any;
    private oldValue : any;
    private options : string[]; // an optional list of possible values for this setting
    private eventFunc : () => void; // optional function to be called when a settings button is clicked, or checkbox is toggled, or a input is changed

    constructor(display: boolean, name : string, key:string, description : string,perpetual:boolean, type : Setting.Type, studentDefaultValue : any, minimalDefaultValue : any,graphDefaultValue : any,componentDefaultValue : any,expertDefaultValue : any, options?: string[], eventFunc?: () => void){
        this.display = display;
        this.name = name;
        this.key = key;
        this.description = description;
        this.perpetual = perpetual;
        this.type = type;
        this.studentDefaultValue = studentDefaultValue;
        this.minimalDefaultValue = minimalDefaultValue;
        this.graphDefaultValue = graphDefaultValue;
        this.componentDefaultValue = componentDefaultValue;
        this.expertDefaultValue = expertDefaultValue;
        this.options = options;
        this.eventFunc = eventFunc;

        this.oldValue = "";
        this.value = ko.observable(graphDefaultValue);

        this.value.subscribe(function(){
            UiModeSystem.setActiveSetting(this.getKey(), this.value())
        },this);
    }

    getName = () : string => {
        return this.name;
    }

    getDescription = () : string => {
        return this.description;
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

    getStudentDefaultVal = () :any => {
        return this.studentDefaultValue
    }

    getMinimalDefaultVal = () :any => {
        return this.minimalDefaultValue
    }

    getGraphDefaultVal = () :any => {
        return this.graphDefaultValue
    }

    getComponentDefaultVal = () :any => {
        return this.componentDefaultValue
    }

    getExpertDefaultVal = () :any => {
        return this.expertDefaultValue
    }

    getPerpetualDefaultVal = () :any => {
        if(!this.perpetual){
            console.warn(this.name + " is not a perpetual setting: ",this)
        }
        return this.graphDefaultValue
    }

    getPerpetual = () : boolean => {
        return this.perpetual;
    }

    setValue = (value: any) : void => {
        this.value(value);
    }

    getDisplay = () : boolean => {
        return this.display;
    }

    toggle = () : void => {
        if (this.type !== Setting.Type.Boolean){
            console.warn("toggle() called on Setting that is not a boolean!" + this.getName() + " " + this.getType() + " " + this.value());
            return;
        }

        // update the value
        this.value(!this.value());
        this.callEventFunc();
    }

    copy = () : void => {
        navigator.clipboard.writeText(this.value().toString()).then(function() {
            Utils.showNotification("Success", "Copying to clipboard was successful!", "success");
        }, function(err) {
            Utils.showNotification("Error", "Could not copy setting. " + err, "danger");
        });
    }

    cancelChanges = () : void => {
        this.value(this.oldValue)
    }

    copyCurrentSettings = () : void => {
        this.oldValue = this.value()
    }

    callEventFunc = () : void => {
        this.eventFunc?.();
    }

    static find(key : string) : Setting {
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

    static findValue(key : string) : any {
        const setting = Setting.find(key);

        if (setting === null){
            console.warn("No setting", key);
            return null;
        }

        return setting.value();
    }

    static setValue(key : string, value : any) : void {
        const setting = Setting.find(key);
        if (setting === null){
            console.warn("No setting", key);
            return;
        }

        return setting.value(value);
    }

    resetDefault() : void {
        const activeUIModeName: string = UiModeSystem.getActiveUiMode().getName();
        let value: any = this.graphDefaultValue;

        switch (activeUIModeName){
            case "Student":
                value = this.studentDefaultValue;
                break;
            case "Minimal":
                value = this.minimalDefaultValue;
                break;
            case "Graph":
                value = this.graphDefaultValue;
                break;
            case "Component":
                value = this.componentDefaultValue;
                break;
            case "Expert":
                value = this.expertDefaultValue;
                break;
            default:
                console.warn("Unknown active UI mode name:", activeUIModeName, ", using default value for ", this.name, " setting");
        }

        this.value(value);
    }

    static resetDefaults() : void {
        for (const group of Eagle.settings){
            if(group.getName() === "External Services"){
                return  
            }else{
                for (const setting of group.getSettings()){
                    setting.resetDefault();
                }
            }
        }
    }

    static getSettings() : SettingsGroup[] {
        return settings;
    }

    static showInspectorErrorsWarnings() : boolean {
        const eagle = Eagle.getInstance();
            
        switch (Setting.findValue(Setting.SHOW_GRAPH_WARNINGS)){
            case Setting.ShowErrorsMode.Warnings:
                return eagle.selectedNode().getErrorsWarnings().errors.length + eagle.selectedNode().getErrorsWarnings().warnings.length > 0;
            case Setting.ShowErrorsMode.Errors:
                return eagle.selectedNode().getErrorsWarnings().errors.length > 0;
            case Setting.ShowErrorsMode.None:
            default:
                return false;
        }
    }

    static toggleTab(btn: string, target: string): void {
        //deselect and deactivate current tab content and buttons
        $(".settingsModalButton").removeClass("settingCategoryBtnActive");
        $(".settingsModalCategoryWrapper").removeClass("settingCategoryActive");

        //activate selected tab content and button
        $("#"+btn).addClass("settingCategoryBtnActive");
        $("#"+target).addClass("settingCategoryActive");
    }

    //copies currently set settings in case the user wishes to cancel changes in the setting modal
    static copy(): void {
        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                setting.copyCurrentSettings();
            }
        }
    }

    //returns settings values to the previously copied settings, canceling the settings editing
    static cancelChanges(): void {
        for (const group of Eagle.settings){
            for (const setting of group.getSettings()){
                setting.cancelChanges();
            }
        }
    }

    static readonly GITHUB_ACCESS_TOKEN_KEY: string = "GitHubAccessToken";
    static readonly GITLAB_ACCESS_TOKEN_KEY: string = "GitLabAccessToken";
    static readonly RIGHT_WINDOW_WIDTH : string = "RightWindowWidth";
    static readonly RIGHT_WINDOW_VISIBLE : string = "RightWindowVisible";
    static readonly RIGHT_WINDOW_MODE : string = "RightWindowMode";
    static readonly LEFT_WINDOW_WIDTH : string = "LeftWindowWidth";
    static readonly LEFT_WINDOW_VISIBLE : string = "LeftWindowVisible";
    static readonly BOTTOM_WINDOW_HEIGHT : string = "BottomWindowHeight";
    static readonly BOTTOM_WINDOW_VISIBLE : string = "BottomWindowVisible";
    static readonly BOTTOM_WINDOW_MODE : string = "BottomWindowMode";
    static readonly OBJECT_INSPECTOR_COLLAPSED_STATE : string = "ObjectInspectorVisibility";
    static readonly GRAPH_INSPECTOR_COLLAPSED_STATE : string = "GraphInspectorVisibility";
    static readonly NODE_PARAMS_TABLE_DUAL_VALUE_DISPLAY : string = "NodeParamsTableDualValueDisplay";
    
    static readonly OPEN_BUILTIN_PALETTE: string = "OpenBuiltinPalette";
    static readonly OPEN_TEMPLATE_PALETTE: string = "OpenTemplatePalette";

    static readonly ACTION_CONFIRMATIONS : string = "ActionConfirmations";
    static readonly CONFIRM_DISCARD_CHANGES : string = "ConfirmDiscardChanges";
    static readonly CONFIRM_NODE_CATEGORY_CHANGES : string = "ConfirmNodeCategoryChanges";
    static readonly CONFIRM_REMOVE_REPOSITORIES : string = "ConfirmRemoveRepositories";
    static readonly CONFIRM_RELOAD_PALETTES : string = "ConfirmReloadPalettes";
    static readonly CONFIRM_DELETE_FILES : string = "ConfirmDeleteFiles";
    static readonly CONFIRM_DELETE_OBJECTS : string = "ConfirmDeleteObjects";

    static readonly SHOW_DEVELOPER_NOTIFICATIONS: string = "ShowDeveloperNotifications";
    static readonly SHOW_FILE_LOADING_ERRORS : string = "ShowFileLoadingErrors";

    static readonly ALLOW_INVALID_EDGES : string = "AllowInvalidEdges";
    static readonly ALLOW_COMPONENT_EDITING : string = "AllowComponentEditing";
    static readonly ALLOW_READONLY_PALETTE_EDITING : string = "AllowReadonlyPaletteEditing";
    static readonly ALLOW_EDGE_EDITING : string = "AllowEdgeEditing";
    static readonly SHOW_NON_CONFIG_PARAMETERS : string = "ShowNonConfigParameters";
    static readonly FILTER_NODE_SUGGESTIONS : string = "AutoSuggestDestinationNodes";

    static readonly ALLOW_PALETTE_EDITING : string = "AllowPaletteEditing";
    static readonly ALLOW_GRAPH_EDITING : string = "AllowGraphEditing";
    static readonly ALLOW_MODIFY_GRAPH_CONFIG : string = "AllowModifyGraphConfig";
    static readonly STUDENT_SETTINGS_MODE : string = "StudentSettingsMode"
    static readonly VALUE_EDITING_PERMS : string = "ValueEditingPerms"
    static readonly AUTO_COMPLETE_EDGES_LEVEL : string = "AutoCompleteEdgesLevel"

    static readonly TRANSLATOR_URL : string = "TranslatorURL";
    static readonly TRANSLATOR_ALGORITHM_DEFAULT : string = "TranslatorAlgorithmDefault";

    static readonly EXPLORE_PALETTES_SERVICE : string = "ExplorePalettesService";
    static readonly EXPLORE_PALETTES_REPOSITORY : string = "ExplorePalettesRepository";
    static readonly EXPLORE_PALETTES_BRANCH : string = "ExplorePalettesBranch";

    static readonly CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS: string = "CreateApplicationsForConstructPorts";
    static readonly DISABLE_JSON_VALIDATION: string = "DisableJsonValidation";

    static readonly DOCKER_HUB_USERNAME: string = "DockerHubUserName";
    static readonly OPEN_TRANSLATOR_IN_CURRENT_TAB: string = "OpenTranslatorInCurrentTab";
    static readonly OVERWRITE_TRANSLATION_TAB: string = "OverwriteTranslationTab";
    static readonly SHOW_DEVELOPER_TAB: string = "ShowDeveloperTab";

    static readonly GRAPH_ZOOM_DIVISOR: string = "GraphZoomDivisor";
    static readonly USER_TRANSLATOR_MODE: string = "UserTranslatorMode";

    static readonly SKIP_CLOSE_LOOP_EDGES: string = "SkipCloseLoopEdges";
    static readonly PRINT_UNDO_STATE_TO_JS_CONSOLE: string = "PrintUndoStateToJsConsole";
    static readonly PRINT_TRANSLATOR_JSON_TO_JS_CONSOLE: string = "PrintTranslatorJsonToJsConsole";
    static readonly SNAP_TO_GRID: string = "SnapToGrid";
    static readonly SNAP_TO_GRID_SIZE: string = "SnapToGridSize";
    static readonly SHOW_GRAPH_WARNINGS: string = "ShowInspectorWarnings";
    static readonly SHOW_ALL_CATEGORY_OPTIONS: string = "ShowAllCategoryOptions";

    static readonly ALLOW_MODIFIED_GRAPH_TRANSLATION: string = "AllowModifiedGraphTranslation";
    static readonly APPLY_ACTIVE_GRAPH_CONFIG_BEFORE_TRANSLATION: string = "ApplyActiveGraphConfigBeforeTranslation";
    static readonly FETCH_REPOSITORY_FOR_URLS: string = "FetchRepositoryForUrls";
}

export namespace Setting {
    export enum Type {
        String,
        Number,
        Boolean,
        Password,
        Button,
        Select
    }

    export enum ShowErrorsMode {
        None = "None",
        Errors = "Errors",
        Warnings = "Warnings"
    }

    export enum ValueEditingPermission {
        ConfigOnly = "ConfigOnly",
        Normal = "Normal",
        ReadOnly = "Readonly"
    }

    export enum TranslatorMode {
        Minimal = "minimal",
        Normal = "normal",
        Expert = "expert"
    }
}

//setting order (display, name, key, description, perpetual, type, studentDefaultValue, minimalDefaultValue, GraphDefaultValue, ComponentDefaultValue, ExpertDefaultValue, options(only add for type select))
const settings : SettingsGroup[] = [
    new SettingsGroup(
        "User Options",
        () => {return true;},
        [
            new Setting(true, "Reset Action Confirmations", Setting.ACTION_CONFIRMATIONS, "Enable all action confirmation prompts",false, Setting.Type.Button, '', '', '', '', '', [], function(){Eagle.getInstance().resetActionConfirmations();}),
            new Setting(false, "Confirm Discard Changes", Setting.CONFIRM_DISCARD_CHANGES, "Prompt user to confirm that unsaved changes to the current file should be discarded when opening a new file, or when navigating away from EAGLE.",false, Setting.Type.Boolean, true, true,true,true,true),
            new Setting(false, "Confirm Node Category Changes", Setting.CONFIRM_NODE_CATEGORY_CHANGES, "Prompt user to confirm that changing the node category may break the node.",false, Setting.Type.Boolean, true, true,true,true,true),
            new Setting(false, "Confirm Remove Repositories", Setting.CONFIRM_REMOVE_REPOSITORIES, "Prompt user to confirm removing a repository from the list of known repositories.",false , Setting.Type.Boolean, true,true,true,true,true),
            new Setting(false, "Confirm Reload Palettes", Setting.CONFIRM_RELOAD_PALETTES, "Prompt user to confirm when loading a palette that is already loaded.",false , Setting.Type.Boolean,true,true,true,true,true),
            new Setting(false, "Confirm Delete Files", Setting.CONFIRM_DELETE_FILES, "Prompt user to confirm when deleting files from a repository.", false, Setting.Type.Boolean, true,true,true,true,true),
            new Setting(false, "Confirm Delete Objects", Setting.CONFIRM_DELETE_OBJECTS, "Prompt user to confirm when deleting node(s) or edge(s) from a graph.",false , Setting.Type.Boolean, true,true,true,true,true),
            new Setting(false, "Open " + Palette.BUILTIN_PALETTE_NAME + " Palette on Startup", Setting.OPEN_BUILTIN_PALETTE, "Open the '" + Palette.BUILTIN_PALETTE_NAME + "' palette on startup.", true, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(false, "Open " + Palette.TEMPLATE_PALETTE_NAME + " Palette on Startup", Setting.OPEN_TEMPLATE_PALETTE, "Open the '" + Palette.TEMPLATE_PALETTE_NAME + "' palette on startup.", true, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(true, "Disable JSON Validation", Setting.DISABLE_JSON_VALIDATION, "Allow EAGLE to load/save/send-to-translator graphs and palettes that would normally fail validation against schema.", false, Setting.Type.Boolean, false,false,false,false,false),
            new Setting(true, "Overwrite Existing Translator Tab", Setting.OVERWRITE_TRANSLATION_TAB, "When translating a graph, overwrite an existing translator tab", false, Setting.Type.Boolean, true,true,true,true,true),
        ]
    ),
    new SettingsGroup(
        "UI Options",
        () => {return true;},
        [
            new Setting(true, "Show non key parameters", Setting.SHOW_NON_CONFIG_PARAMETERS, "Show additional parameters that are not part of a graph configuration for the current graph",false, Setting.Type.Boolean, false,true,true,true,true),
            new Setting(false, "Show Developer Tab", Setting.SHOW_DEVELOPER_TAB, "Reveals the developer tab in the settings menu", false, Setting.Type.Boolean, false,false,false,false,true),
            new Setting(true, "Translator Mode", Setting.USER_TRANSLATOR_MODE, "Configure the translator mode", false, Setting.Type.Select, Setting.TranslatorMode.Minimal,Setting.TranslatorMode.Minimal,Setting.TranslatorMode.Normal,Setting.TranslatorMode.Normal,Setting.TranslatorMode.Expert, Object.values(Setting.TranslatorMode)),
            new Setting(true, "Graph Zoom Divisor", Setting.GRAPH_ZOOM_DIVISOR, "The number by which zoom inputs are divided before being applied. Larger divisors reduce the amount of zoom.", false, Setting.Type.Number,1000,1000,1000,1000,1000),
            new Setting(false, "Snap To Grid", Setting.SNAP_TO_GRID, "Align positions of nodes in graph to a grid", false, Setting.Type.Boolean,false,false,false,false,false),
            new Setting(false, "Snap To Grid Size", Setting.SNAP_TO_GRID_SIZE, "Size of grid used when aligning positions of nodes in graph (pixels)", false, Setting.Type.Number, 50, 50, 50, 50, 50),
            new Setting(true, "Show edge/node errors/warnings in Graph", Setting.SHOW_GRAPH_WARNINGS, "Show the errors/warnings found in the graph", false, Setting.Type.Select,  Setting.ShowErrorsMode.None, Setting.ShowErrorsMode.None, Setting.ShowErrorsMode.Errors, Setting.ShowErrorsMode.Errors,Setting.ShowErrorsMode.Errors, Object.values(Setting.ShowErrorsMode)),
            new Setting(false, "Right Window Width", Setting.RIGHT_WINDOW_WIDTH, "saving the width of the right window", true, Setting.Type.Number,400,400,400,400,400),
            new Setting(false, "Right Window Visibility", Setting.RIGHT_WINDOW_VISIBLE, "visibility state of the right window", true, Setting.Type.Boolean,true,true,true,true,true),
            new Setting(false, "Right Window Mode/Tab", Setting.RIGHT_WINDOW_MODE, "saving the selected mode/tab of the right window", true, Setting.Type.String,'Repository','Repository','Repository','Repository','Repository'),
            new Setting(false, "Left Window Width", Setting.LEFT_WINDOW_WIDTH, "saving the width of the left window", true, Setting.Type.Number, 310, 310, 310, 310, 310),
            new Setting(false, "Left Window Visibility", Setting.LEFT_WINDOW_VISIBLE, "saving the visibility state of the left window", true, Setting.Type.Boolean, false, false, true, true, true),
            new Setting(false, "Bottom Window Height", Setting.BOTTOM_WINDOW_HEIGHT, "saving the height of the bottom window", true, Setting.Type.Number, 25, 25, 25, 25, 25),
            new Setting(false, "Bottom Window Visibility", Setting.BOTTOM_WINDOW_VISIBLE, "saving the visibility state of the bottom window", true, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(false, "Bottom Window Mode/Tab", Setting.BOTTOM_WINDOW_MODE, "saving the mode/tab of the bottom window", true, Setting.Type.Number, 'ParameterTable', 'ParameterTable', 'ParameterTable', 'ParameterTable', 'ParameterTable'),
            new Setting(false, "Graph Objects Inspector", Setting.OBJECT_INSPECTOR_COLLAPSED_STATE, "saving the collapsed state of the graph object inspector", true, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(false, "Graph Info Inspector", Setting.GRAPH_INSPECTOR_COLLAPSED_STATE, "saving the collapsed state of the graph inspector", true, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(false, "Node Parameter Table Dual Value Display", Setting.NODE_PARAMS_TABLE_DUAL_VALUE_DISPLAY, "Should both the graph value and config value be displayed", false, Setting.Type.Boolean, false, false, false, false, true),
        ]
    ),
    new SettingsGroup(
        "Advanced Editing",
        () => {return true;},
        [
            new Setting(true, "Allow Invalid edges", Setting.ALLOW_INVALID_EDGES, "Allow the user to create edges even if they would normally be determined invalid.", false, Setting.Type.Boolean, false, false, false, false, true),
            new Setting(true, "Allow Component Editing", Setting.ALLOW_COMPONENT_EDITING, "Allow the user to add/remove ports and parameters from components.",false, Setting.Type.Boolean,false, false, false, true,true),
            new Setting(true, "Allow Modify Graph Configurations", Setting.ALLOW_MODIFY_GRAPH_CONFIG, "Allow the user to add/remove parameters from graph configurations.", false, Setting.Type.Boolean,false, true, true, true,true),
            new Setting(true, "Allow Graph Editing", Setting.ALLOW_GRAPH_EDITING, "Allow the user to edit and create graphs.", false, Setting.Type.Boolean, false, false, true, true, true),
            new Setting(true, "Allow Palette Editing", Setting.ALLOW_PALETTE_EDITING, "Allow the user to edit palettes.", false, Setting.Type.Boolean, false, false, false, true, true),
            new Setting(true, "Allow Readonly Palette Editing", Setting.ALLOW_READONLY_PALETTE_EDITING, "Allow the user to modify palettes that would otherwise be readonly.", false, Setting.Type.Boolean,false,false,false,false,true),
            new Setting(true, "Allow Edge Editing", Setting.ALLOW_EDGE_EDITING, "Allow the user to edit edge attributes.", false, Setting.Type.Boolean, false, false,false, false, true),
            new Setting(true, "Filter Node Suggestions", Setting.FILTER_NODE_SUGGESTIONS, "Filter Node Options When Drawing Edges Into Empty Space", false, Setting.Type.Boolean,true,true,true,true,false),
            new Setting(false, "STUDENT_SETTINGS_MODE", Setting.STUDENT_SETTINGS_MODE, "Mode disabling setting editing for students.", false, Setting.Type.Boolean, true, false,false, false, false),
            new Setting(true, "Value Editing", Setting.VALUE_EDITING_PERMS, "Set which values are allowed to be edited.", false, Setting.Type.Select, Setting.ValueEditingPermission.ConfigOnly,Setting.ValueEditingPermission.Normal,Setting.ValueEditingPermission.Normal,Setting.ValueEditingPermission.ReadOnly,Setting.ValueEditingPermission.ReadOnly, Object.values(Setting.ValueEditingPermission)),
            new Setting(true, "Auto-complete edges level", Setting.AUTO_COMPLETE_EDGES_LEVEL, "Specifies the minimum validity level of auto-complete edges displayed when dragging a new edge", false, Setting.Type.Select, Errors.Validity.Valid, Errors.Validity.Valid, Errors.Validity.Warning, Errors.Validity.Warning, Errors.Validity.Error, [Errors.Validity.Error, Errors.Validity.Warning, Errors.Validity.Valid]),
        ]
    ),
    new SettingsGroup(
        "External Services",
        () => {return true;},
        [
            new Setting(true, "Translator URL", Setting.TRANSLATOR_URL, "The URL of the translator server", true, Setting.Type.String, "http://localhost:8084/gen_pgt","http://localhost:8084/gen_pgt","http://localhost:8084/gen_pgt", "http://localhost:8084/gen_pgt", "http://localhost:8084/gen_pgt"),
            new Setting(true, "GitHub Access Token", Setting.GITHUB_ACCESS_TOKEN_KEY, "A users access token for GitHub repositories.",true , Setting.Type.Password, "", "", "", "", ""),
            new Setting(true, "GitLab Access Token", Setting.GITLAB_ACCESS_TOKEN_KEY, "A users access token for GitLab repositories.", true, Setting.Type.Password, "","","", "", ""),
            new Setting(true, "Docker Hub Username", Setting.DOCKER_HUB_USERNAME, "The username to use when retrieving data on images stored on Docker Hub", true, Setting.Type.String, "icrar","icrar","icrar", "icrar", "icrar"),
            new Setting(false, "Default Translation Algorithm", Setting.TRANSLATOR_ALGORITHM_DEFAULT, "Which of the algorithms will be used by default", true, Setting.Type.String, "agl-1", "agl-1", "agl-1", "agl-1", "agl-1"),
            new Setting(true, "Explore Palettes Service", Setting.EXPLORE_PALETTES_SERVICE, "The service hosting the repository from which palettes will be fetched by the 'Explore Palettes' feature", true, Setting.Type.Select, Repository.Service.GitHub, Repository.Service.GitHub, Repository.Service.GitHub, Repository.Service.GitHub, Repository.Service.GitHub, [Repository.Service.GitHub /*, Repository.Service.GitLab*/]),
            new Setting(true, "Explore Palettes Repository", Setting.EXPLORE_PALETTES_REPOSITORY, "The repository from which palettes will be fetched by the 'Explore Palettes' feature", true, Setting.Type.String, "ICRAR/EAGLE-graph-repo", "ICRAR/EAGLE-graph-repo", "ICRAR/EAGLE-graph-repo", "ICRAR/EAGLE-graph-repo", "ICRAR/EAGLE-graph-repo"),
            new Setting(true, "Explore Palettes Branch", Setting.EXPLORE_PALETTES_BRANCH, "The branch of the repository from which palettes will be fetched by the 'Explore Palettes' feature", true, Setting.Type.String, "master", "master", "master", "master", "master"),
        ]
    ),
    new SettingsGroup(
        "Developer",
        () => {return false;},
        [
            new Setting(true, "Show Developer Notifications", Setting.SHOW_DEVELOPER_NOTIFICATIONS, "EAGLE generates a number of messages intended to alert developers to unusual occurrences or issues. Enabling this setting displays those messages.", false, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(true, "Show File Loading Warnings", Setting.SHOW_FILE_LOADING_ERRORS, "Display list of issues with files encountered during loading.", false, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(true, "Open Translator In Current Tab", Setting.OPEN_TRANSLATOR_IN_CURRENT_TAB, "When translating a graph, display the output of the translator in the current tab", false, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(true, "Create Applications for Construct Ports", Setting.CREATE_APPLICATIONS_FOR_CONSTRUCT_PORTS, "When loading old graph files with ports on construct nodes, move the port to an embedded application", false, Setting.Type.Boolean, true, true, true, true, true),
            new Setting(true, "Skip 'closes loop' edges in JSON output", Setting.SKIP_CLOSE_LOOP_EDGES, "We've recently added edges to the LinkDataArray that 'close' loop constructs and set the 'group_start' and 'group_end' automatically. In the short-term, such edges are not supported by the translator. This setting will keep the new edges during saving/loading, but remove them before sending the graph to the translator.", false, Setting.Type.Boolean, true, true, true, true, true),
            new Setting(true, "Print Undo state to JS Console", Setting.PRINT_UNDO_STATE_TO_JS_CONSOLE, "Prints the state of the undo memory whenever a change occurs. The state is written to the browser's javascript console", false, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(true, "Print Translator JSON to JS Console", Setting.PRINT_TRANSLATOR_JSON_TO_JS_CONSOLE, "When translating a graph, print the JSON data sent to the translator to the browser's javascript console", false, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(true, "Display all Category options", Setting.SHOW_ALL_CATEGORY_OPTIONS, "Displays all category options when changing the category of a node", false, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(true, "Allow modified graph translation", Setting.ALLOW_MODIFIED_GRAPH_TRANSLATION, "Allow users to submit graphs for translation even when not saved or committed", true, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(true, "Apply active graph config before translation", Setting.APPLY_ACTIVE_GRAPH_CONFIG_BEFORE_TRANSLATION, "Apply the active graph config to the graph before sending the graph for translation", false, Setting.Type.Boolean, false, false, false, false, false),
            new Setting(true, "Fetch repository for URLs", Setting.FETCH_REPOSITORY_FOR_URLS, "Automatically fetch the contents of the object's repository when a graph/palette is specified in the URL", true, Setting.Type.Boolean, false, false ,false, false, false),
        ]
    )
];