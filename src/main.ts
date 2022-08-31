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

import {Category} from './Category';
import {Config} from './Config';
import {Eagle} from './Eagle';
import {Errors} from './Errors';
import {GitHub} from './GitHub';
import {GitLab} from './GitLab';
import {Hierarchy} from './Hierarchy';
import {KeyboardShortcut} from './KeyboardShortcut';
import {LogicalGraph} from './LogicalGraph';
import {Modals} from './Modals';
import {Palette} from './Palette';
import {Setting} from './Setting';
import {Utils} from './Utils';
import {Repository} from './Repository';
import {RepositoryFile} from './RepositoryFile';

let eagle : Eagle;

$(function(){
    // Global variables.
    eagle = new Eagle();

    // add eagle to the window object, slightly hacky, but useful for debugging
    (<any>window).eagle = eagle;
    (<any>window).Eagle = Eagle;
    (<any>window).Utils = Utils;
    (<any>window).Config = Config;
    (<any>window).Category = Category;
    (<any>window).Errors = Errors;
    (<any>window).Hierarchy = Hierarchy;

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

    // Show repository list.
    GitHub.loadRepoList(eagle);
    GitLab.loadRepoList(eagle);

    // load the default palette
    if (Setting.findValue(Utils.OPEN_DEFAULT_PALETTE)){
        eagle.loadPalettes([
            {name:"DALiuGE Components", filename:Config.DALIUGE_PALETTE_URL, readonly:true},
            {name:Palette.DYNAMIC_PALETTE_NAME, filename:Config.DALIUGE_TEMPLATE_URL, readonly:true},
            {name:"Graph Components", filename:"./static/" + Config.templatePaletteFileName, readonly:true}
        ], (palettes: Palette[]):void => {
            for (const palette of palettes){
                if (palette !== null){
                    eagle.palettes.push(palette);
                }
            }
            eagle.leftWindow().shown(true);
        });
    }

    // load schemas
    eagle.loadSchemas();

    // enable bootstrap accordion collapse
    const bsCollapse = new bootstrap.Collapse('.collapse', {});

    // initialise all the modal dialogs. event handlers etc
    Modals.init(eagle);

    // add a listener for the beforeunload event, helps warn users before leaving webpage with unsaved changes
    window.onbeforeunload = () => (eagle.areAnyFilesModified() && Setting.findValue(Utils.CONFIRM_DISCARD_CHANGES)) ? "Check graph" : null;

    // keyboard shortcut event listener
    document.onkeydown = KeyboardShortcut.processKey;
    document.onkeyup = KeyboardShortcut.processKey;

    // HACK: without this global wheel event handler, d3 does not receive zoom events
    //       not sure why, this wasn't always the case
    document.onwheel = (ev: WheelEvent) => {};

    const auto_load_service    = (<any>window).auto_load_service;
    const auto_load_repository = (<any>window).auto_load_repository;
    const auto_load_branch     = (<any>window).auto_load_branch;
    const auto_load_path       = (<any>window).auto_load_path;
    const auto_load_filename   = (<any>window).auto_load_filename;
    //console.log("auto_load_service", auto_load_service, "auto_load_repository", auto_load_repository, "auto_load_branch", auto_load_branch, "auto_load_path", auto_load_path, "auto_load_filename", auto_load_filename);=

    // cast the service string to an enum
    const service: Eagle.RepositoryService = Eagle.RepositoryService[auto_load_service as keyof typeof Eagle.RepositoryService];

    // auto load the file
    autoLoad(eagle, service, auto_load_repository, auto_load_branch, auto_load_path, auto_load_filename);

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

function autoLoad(eagle: Eagle, service: Eagle.RepositoryService, repository: string, branch: string, path: string, filename: string) {
    console.log("autoLoad()", service, repository, branch, path, filename);

    // skip empty string urls
    if (service === Eagle.RepositoryService.Unknown || repository === "" || branch === "" || filename === ""){
        console.log("No auto load");
        return;
    }

    // load
    eagle.selectFile(new RepositoryFile(new Repository(service, repository, branch, false), path, filename));
}