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

import * as ko from "knockout";
import * as $ from "jquery";
import "jqueryMigrate";
import "jqueryui";
import * as bootstrap from 'bootstrap';

import { Category } from './Category';
import { CategoryData } from './CategoryData';
import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { EagleStorage } from "./EagleStorage";
import { Errors } from './Errors';
import { FileInfo } from "./FileInfo";
import { GitHub } from './GitHub';
import { GitLab } from './GitLab';
import { GraphConfig } from "./GraphConfig";
import { GraphConfigurationsTable } from "./GraphConfigurationsTable";
import { GraphRenderer } from "./GraphRenderer";
import { Hierarchy } from './Hierarchy';
import { KeyboardShortcut } from './KeyboardShortcut';
import { StatusEntry } from './StatusEntry';
import { LogicalGraph } from './LogicalGraph';
import { Modals } from './Modals';
import { ParameterTable } from "./ParameterTable";
import { QuickActions } from './QuickActions';
import { Repositories } from './Repositories';
import { Repository } from './Repository';
import { RepositoryFile } from './RepositoryFile';
import { RightClick } from './RightClick';
import { Setting } from './Setting';
import { SideWindow } from "./SideWindow";
import { TutorialSystem } from "./Tutorial";
import { UiModeSystem } from './UiModes';
import { Utils } from './Utils';

import * as quickStart from './tutorials/quickStart'
import * as graphBuilding from './tutorials/graphBuilding'
import * as graphConfigs from './tutorials/graphConfigs'

console.assert(quickStart != null) //this is needed to run the tutorial file
console.assert(graphBuilding != null) //this is needed to run the tutorial file
console.assert(graphConfigs != null) //this is needed to run the tutorial file

let eagle : Eagle;

$(function(){
    //Check if the user is a first time visitor to the site
    const firstTimeVisit = localStorage.getItem('activeUiMode') === null;
    const lastSeenVersion = localStorage.getItem('lastSeenVersion') || "0.0.0";
    const showWhatsNew = Utils.compareVersions((<any>window).version, lastSeenVersion) > 0;

    // Global variables.
    eagle = new Eagle();

    // add eagle to the window object, slightly hacky, but useful for debugging
    // TODO: remove this when possible, use Eagle.getInstance() if we can
    (<any>window).eagle = eagle;

    (<any>window).Category = Category;
    (<any>window).Daliuge = Daliuge;
    (<any>window).Eagle = Eagle;
    (<any>window).EagleConfig = EagleConfig;
    (<any>window).EagleStorage = EagleStorage;
    (<any>window).Errors = Errors;
    (<any>window).FileInfo = FileInfo;
    (<any>window).GraphConfig = GraphConfig;
    (<any>window).GraphConfigurationsTable = GraphConfigurationsTable;
    (<any>window).Hierarchy = Hierarchy;
    (<any>window).ParameterTable = ParameterTable;
    (<any>window).Repositories = Repositories;
    (<any>window).Repository = Repository;
    (<any>window).RightClick = RightClick;
    (<any>window).Setting = Setting;
    (<any>window).SideWindow = SideWindow;
    (<any>window).TutorialSystem = TutorialSystem;
    (<any>window).GraphRenderer = GraphRenderer;
    (<any>window).UiModeSystem = UiModeSystem;
    (<any>window).Utils = Utils;
    (<any>window).KeyboardShortcut = KeyboardShortcut;

    (<any>window).StatusEntry = StatusEntry;
    (<any>window).QuickActions = QuickActions;
    (<any>window).Modals = Modals;

    ko.options.deferUpdates = true;

    // Code responsible for displaying the EAGLE.
    console.log("Initialising EAGLE");
    eagle.resetEditor();

    EagleConfig.initCSS();

    // init empty data structures
    eagle.logicalGraph(new LogicalGraph());
    eagle.palettes([]);

    // save initial state to undo memory
    eagle.undo().pushSnapshot(eagle, "EAGLE Startup");

    // set UI Mode
    const user_interface_mode = (<any>window).mode;
    if (typeof user_interface_mode !== 'undefined' && user_interface_mode !== ""){
        // make sure that the specified user interface mode is a known mode
        if (UiModeSystem.getFullUiModeNamesList().includes(user_interface_mode)){
            UiModeSystem.setActiveUiModeByName(user_interface_mode)
        } else {
            console.warn("Unknown user_interface_mode:", user_interface_mode, ". Known types are:", UiModeSystem.getFullUiModeNamesList().join(','));
        }

        // hide the ?mode=x part of the url
        window.history.replaceState(null, "", window.location.origin + window.location.pathname);
    }

    // load the default palette
    eagle.loadDefaultPalettes();

    // set other state based on settings values
    eagle.snapToGrid(Setting.findValueAsBoolean(Setting.SNAP_TO_GRID));

    // load schemas
    Utils.loadSchemas();

    // enable bootstrap accordion collapse
    new bootstrap.Collapse('.collapse', {});

    // initialise all the modal dialogs. event handlers etc
    Modals.init(eagle);

    // add a listener for the beforeunload event, helps warn users before leaving webpage with unsaved changes
    window.onbeforeunload = () => (eagle.areAnyFilesModified() && Setting.findValue(Setting.CONFIRM_DISCARD_CHANGES)) ? "Check graph" : null;

    // keyboard shortcut event listener
    document.onkeydown = KeyboardShortcut.processKey;
    document.onkeyup = KeyboardShortcut.processKey;

    loadRepos();

    // auto load a tutorial, if specified on the url
    autoTutorial();

    //request a first time visitor welcome to eagle if applicable
    initiateWelcome(firstTimeVisit);
  
    // if not first time visit, but version is newer than last seen version, show the versions modal
    if (!firstTimeVisit && showWhatsNew){
        eagle.showWhatsNew();
        // set the last seen version
        localStorage.setItem('lastSeenVersion', (<any>window).version);
    }

    $('.modal').on('hidden.bs.modal', function () {
        $('.modal-dialog').css({"left":"0px", "top":"0px"})
        $("#editFieldModal textarea").attr('style','')
        $("#issuesDisplayAccordion").parent().parent().attr('style','')

        //reset parameter table selection
        ParameterTable.resetSelection()
    });

    $('.modal').on('shown.bs.modal',function(){
        // modal draggables
        //the any type is required so we don't have an error when building. at runtime on eagle this actually functions without it.
        (<any>$('.modal-dialog')).draggable({
            handle: ".modal-header"
        });
    })

    //increased click bubble for edit modal flag booleans
    $(".componentCheckbox").on("click",function(event: JQuery.TriggeredEvent){
        $(event.target).find("input").trigger("click")
    })

    $('#editFieldModalValueInputCheckbox').on("change",function(event: JQuery.TriggeredEvent){
        $(event.target).parent().find("span").text($(event.target).prop('checked'))
    })

    $('#editFieldModalDefaultValueInputCheckbox').on("change",function(event: JQuery.TriggeredEvent){
        $(event.target).parent().find("span").text($(event.target).prop('checked'))
    })

    $('#componentDefaultValueCheckbox').on('click',function(event: JQuery.TriggeredEvent){
        $((event.target)).find('input').trigger("click")
    })

    $('#componentValueCheckbox').on('click',function(event: JQuery.TriggeredEvent){
        $((event.target)).find('input').trigger("click")
    })

    //removes focus from input and textareas when using the canvas
    $("#logicalGraphParent").on("mousedown", function(){
        $("input").trigger("blur");
        $("textarea").trigger("blur");
    });

    //expand palettes when using searchbar and return to prior collapsed state on completion.
    $("#paletteList .componentSearchBar").on("keyup",function(){
        if ($("#paletteList .componentSearchBar").val() !== ""){
            for (const palette of Eagle.getInstance().palettes()){
                palette.expanded(true);
            }
        }
    })

    // TODO: move to Hierarchy.ts?
    $(document).on('click', '.hierarchyEdgeExtra', function(event: JQuery.TriggeredEvent){
        const eagle: Eagle = Eagle.getInstance();
        const edgeId: EdgeId = $(event.target).attr("id") as EdgeId;
        const selectEdge = eagle.logicalGraph().getEdgeById(edgeId);

        if(typeof selectEdge === 'undefined'){
            console.log("no edge found with id:", edgeId);
            return
        }
        if(!event.shiftKey){
            eagle.setSelection(selectEdge, Eagle.FileType.Graph);
        }else{
            eagle.editSelection(selectEdge, Eagle.FileType.Graph);
        }
    })

    // TODO: replace this with a data-bind=click in the element html
    $(".hierarchy").on("click", function(){
        Eagle.getInstance().selectedObjects([]);
    })

    // check that all categories have category data
    for (const category of Utils.enumKeys(Category)){
        CategoryData.getCategoryData(<Category>category);

        // exit after the last category, before we get to the other enums in the Category object
        if (category === Category.UnknownApplication){
            break;
        }
    }
    
    //initiating all the eagle ui when the graph is ready
    eagle.eagleIsReady(true);

    //applying html ko bindings
    ko.applyBindings(eagle, document.getElementById("tabTitle"));
    ko.applyBindings(eagle);
    
    //changing errors mode from loading to graph as eagle is now ready and finished loading
    eagle.errorsMode(Errors.Mode.Graph);
});

async function loadRepos() {
    // initialise EagleStorage
    await EagleStorage.init();

    // Get the list of git repos
    if (UiModeSystem.getActiveUiMode().getName()==='Student'){
        GitHub.loadStudentRepoList();
    } else {
        const gh: Repository[] = await GitHub.loadRepoList();
        const gl: Repository[] = await GitLab.loadRepoList();

        Repositories.repositories.push(...gh);
        Repositories.repositories.push(...gl);
        Repositories.sort();
    }

    // auto load the file
    autoLoad();
}

// NOTE: specify a URL like this:
//     http://localhost:8888/?service=Url&url=https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/EAGLE-1302/simple-arrays.graph
async function autoLoad() {
    const service    = (<any>window).auto_load_service;
    const repository = (<any>window).auto_load_repository;
    const branch     = (<any>window).auto_load_branch;
    const path       = (<any>window).auto_load_path;
    const filename   = (<any>window).auto_load_filename;
    const url        = (<any>window).auto_load_url;

    // cast the service string to an enum
    const realService: Repository.Service = Repositories.translateStringToService(service);

    // skip unknown services
    if (typeof realService === "undefined" || realService === Repository.Service.Unknown){
        console.log("No auto load. Service Unknown");
        return;
    }

    // check if service is a supported git service
    const serviceIsGit: boolean = [Repository.Service.GitHub, Repository.Service.GitLab].includes(realService);

    // skip empty strings
    if (serviceIsGit && (repository === "" || branch === "")){
        console.log("No auto load. Repository or branch not specified");
        return;
    }

    // skip url if url is not specified
    if (realService === Repository.Service.Url && url === ""){
        console.log("No auto load. Url not specified");
        return;
    }

    // decide what to do based on the url
    if (realService === Repository.Service.Url){
        Repositories.selectFile(new RepositoryFile(new Repository(realService, "", "", false), "", url));
    } else {
        if (filename === ""){
            // check if repository already exists
            const existingRepo = Repositories.get(realService, repository, branch);
            if (existingRepo !== null) {
                Utils.showNotification("Add Repository", "Repository already exists!", "info");
                return;
            }

            // add repository to repository list
            await eagle.repositories()._addCustomRepository(realService, repository, branch);
            Utils.showNotification("Add Repository", "Repository added successfully!", "success");
        } else {
            // load file
            console.log("Auto load file:", service, repository, branch, path, filename);
            Repositories.selectFile(new RepositoryFile(new Repository(realService, repository, branch, false), path, filename));
        }
    }

    // if developer setting enabled, fetch the repository that this graph belongs to (if the repository is in the list of known repositories)
    if (serviceIsGit && Setting.findValue(Setting.FETCH_REPOSITORY_FOR_URLS)){
        let repo: Repository | null = Repositories.get(service, repository, branch);

        // check whether the source repository is already known to EAGLE
        if (repo === null){
            // if not found, add the repository
            await eagle.repositories()._addCustomRepository(service, repository, branch);

            // then look for it again
            repo = Repositories.get(service, repository, branch);

            // if repo is still null, then it could not be added
            if (repo === null){
                console.log("Abort adding repository");
                return;
            }
        }

        // fetch the repository contents, then open the folder hierarchy to display the location of the graph
        await repo.refresh();
        await repo.expandPath(path);
    }
}

function autoTutorial(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const tutorialName = urlParams.get('tutorial');

    if (tutorialName !== null){
        console.log("Running tutorial:", tutorialName);
        setTimeout(function () {
            TutorialSystem.initiateTutorial(tutorialName);
        },1000)
    }
}

function initiateWelcome(firstTimeVisit:boolean): void {
    if(firstTimeVisit){
        const urlParams = new URLSearchParams(window.location.search);
        const tutorialName = urlParams.get('tutorial');

        if(tutorialName != 'none'){
            TutorialSystem.initiateTutorial('Quick Start');
        }
    }
}

declare const __brand: unique symbol
type Brand<B> = { [__brand]: B }

/**
 * Creates a branded type, combining a base type T with a unique brand B.
 * This pattern enhances type safety by creating nominally unique types,
 * preventing accidental use of structurally similar but semantically
 * different values (e.g., different types of IDs).
 */
export type Branded<T, B> = T & Brand<B>

declare global {
    type NodeId = Branded<string, "NodeId">
    type FieldId = Branded<string, "FieldId">
    type EdgeId = Branded<string, "EdgeId">
    type RepositoryId = Branded<string, "RepositoryId">
    type RepositoryFileId = Branded<string, "RepositoryFileId">
    type GraphConfigId = Branded<string, "GraphConfigId">
}