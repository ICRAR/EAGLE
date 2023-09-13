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

import {UiMode, UiModeSystem, SettingData} from './UiModes';
import {Category} from './Category';
import {CategoryData} from './CategoryData';
import {Config} from './Config';
import {Daliuge} from './Daliuge';
import {Eagle} from './Eagle';
import {Errors} from './Errors';
import {GitHub} from './GitHub';
import {GitLab} from './GitLab';
import { GraphRenderer } from "./GraphRenderer";
import {Hierarchy} from './Hierarchy';
import {RightClick} from './RightClick';
import {QuickActions} from './QuickActions';
import {KeyboardShortcut} from './KeyboardShortcut';
import {LogicalGraph} from './LogicalGraph';
import {Modals} from './Modals';
import {Palette} from './Palette';
import {Setting} from './Setting';
import {Utils} from './Utils';
import {Repositories} from './Repositories';
import {Repository} from './Repository';
import {RepositoryFile} from './RepositoryFile';
import {ParameterTable} from "./ParameterTable";
import {SideWindow} from "./SideWindow";
import {TutorialSystem} from "./Tutorial";
import {GraphConfig} from "./graphConfig";

import * as quickStart from './tutorials/quickStart'
import * as graphBuilding from './tutorials/graphBuilding'

console.assert(quickStart != null) //this is needed to run the tutorial file
console.assert(graphBuilding != null) //this is needed to run the tutorial file

let eagle : Eagle;

$(function(){
    // Global variables.
    eagle = new Eagle();

    // add eagle to the window object, slightly hacky, but useful for debugging
    (<any>window).eagle = eagle;

    (<any>window).Category = Category;
    (<any>window).Config = Config;
    (<any>window).Daliuge = Daliuge;
    (<any>window).Eagle = Eagle;
    (<any>window).Errors = Errors;
    (<any>window).Hierarchy = Hierarchy;
    (<any>window).ParameterTable = ParameterTable;
    (<any>window).Repositories = Repositories;
    (<any>window).RightClick = RightClick;
    (<any>window).Setting = Setting;
    (<any>window).SideWindow = SideWindow;
    (<any>window).TutorialSystem = TutorialSystem;
    (<any>window).GraphRenderer = GraphRenderer;
    (<any>window).UiModeSystem = UiModeSystem;
    (<any>window).Utils = Utils;
    (<any>window).KeyboardShortcut = KeyboardShortcut;
    (<any>window).QuickActions = QuickActions;
    (<any>window).Modals = Modals;
    (<any>window).GraphConfig = GraphConfig;

    ko.options.deferUpdates = true;
    ko.applyBindings(eagle);
    ko.applyBindings(eagle, document.getElementById("tabTitle"));

    // Code responsible for displaying the EAGLE.
    console.log("Initialising EAGLE");
    eagle.resetEditor();

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
        window.history.replaceState(null, null, window.location.origin + window.location.pathname);
    }

    // Get the list of git repos
    if (UiModeSystem.getActiveUiMode().getName()==='Student'){
        GitHub.loadStudentRepoList();
    } else {
        GitHub.loadRepoList();
        GitLab.loadRepoList();
    }

    // load the default palette
    if (Setting.findValue(Setting.OPEN_DEFAULT_PALETTE)){
        eagle.loadPalettes([
            {name:"Builtin Components", filename:Daliuge.PALETTE_URL, readonly:true},
            {name:Palette.DYNAMIC_PALETTE_NAME, filename:Daliuge.TEMPLATE_URL, readonly:true}
        ], (errorsWarnings: Errors.ErrorsWarnings, palettes: Palette[]):void => {
            const showErrors: boolean = Setting.findValue(Setting.SHOW_FILE_LOADING_ERRORS);

            // display of errors if setting is true
            if (showErrors && (Errors.hasErrors(errorsWarnings) || Errors.hasWarnings(errorsWarnings))){
                // add warnings/errors to the arrays
                eagle.loadingErrors(errorsWarnings.errors);
                eagle.loadingWarnings(errorsWarnings.warnings);

                eagle.errorsMode(Setting.ErrorsMode.Loading);
                Utils.showErrorsModal("Loading File");
            }

            for (const palette of palettes){
                if (palette !== null){
                    eagle.palettes.push(palette);
                }
            }
            eagle.leftWindow().shown(true);
        });
    }

    // set other state based on settings values
    if (Setting.findValue(Setting.SNAP_TO_GRID)){
        eagle.snapToGrid(Setting.findValue(Setting.SNAP_TO_GRID));
    }

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

    // HACK: without this global wheel event handler, d3 does not receive zoom events
    //       not sure why, this wasn't always the case
    document.onwheel = () => {return;};

    // auto load the file
    autoLoad(eagle);

    // auto load a tutorial, if specified on the url
    autoTutorial(eagle);

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

    //increased click bubble for edit modal flag booleans
    $(".componentCheckbox").on("click",function(){
        $(event.target).find("input").click()
    })

    $('#editFieldModalValueInputCheckbox').on("change",function(){
        $(event.target).parent().find("span").text($(event.target).prop('checked'))
    })

    $('#editFieldModalDefaultValueInputCheckbox').on("change",function(){
        $(event.target).parent().find("span").text($(event.target).prop('checked'))
    })

    $('#componentDefaultValueCheckbox').on('click',function(){
        $((event.target)).find('input').click()
    })

    $('#componentValueCheckbox').on('click',function(){
        $((event.target)).find('input').click()
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


    // check that all categories have category data
    for (const category of Utils.enumKeys(Category)){
        CategoryData.getCategoryData(<Category>category);

        // exit after the last category
        if (category === Category.Component){
            break;
        }
    }

    
    //initiating all the eagle ui when the graph is ready
    $('#logicalGraphD3Div').show(200)
    $('.leftWindow').show(200)
    $('.rightWindow').show(200)
    $('#graphNameWrapper').show(200)
    $('nav.navbar').show(200).css('display', 'flex');
});

function autoLoad(eagle: Eagle) {
    const service    = (<any>window).auto_load_service;
    const repository = (<any>window).auto_load_repository;
    const branch     = (<any>window).auto_load_branch;
    const path       = (<any>window).auto_load_path;
    const filename   = (<any>window).auto_load_filename;
    const url        = (<any>window).auto_load_url;

    // cast the service string to an enum
    const realService: Eagle.RepositoryService = Eagle.RepositoryService[service as keyof typeof Eagle.RepositoryService];

    // skip unknown services
    if (typeof realService === "undefined" || realService === Eagle.RepositoryService.Unknown){
        console.log("No auto load. Service Unknown");
        return;
    }

    // skip empty strings
    if ([Eagle.RepositoryService.GitHub, Eagle.RepositoryService.GitLab].includes(realService) && (repository === "" || branch === "" || filename === "")){
        console.log("No auto load. Repository, branch or filename not specified");
        return;
    }

    // skip url if url is not specified
    if (realService === Eagle.RepositoryService.Url && url === ""){
        console.log("No auto load. Url not specified");
        return;
    }

    // load
    if (service === Eagle.RepositoryService.Url){
        Repositories.selectFile(new RepositoryFile(new Repository(service, "", "", false), "", url));
    } else {
        Repositories.selectFile(new RepositoryFile(new Repository(service, repository, branch, false), path, filename));
    }
}

function autoTutorial(eagle: Eagle){
    const urlParams = new URLSearchParams(window.location.search);
    const tutorialName = urlParams.get('tutorial');

    if (tutorialName !== null){
        console.log("Running tutorial:", tutorialName);
        setTimeout(function () {
            TutorialSystem.initiateTutorial(tutorialName);
        },1000)
    }
}