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

import {Config} from './Config';
import {Eagle} from './Eagle';
import {Utils} from './Utils';
import {GitHub} from './GitHub';
import {GitLab} from './GitLab';

import {LogicalGraph} from './LogicalGraph';
import {Palette} from './Palette';

import {KeyboardShortcut} from './KeyboardShortcut';

let eagle : Eagle;

$(function(){
    // Global variables.
    eagle = new Eagle();

    // add eagle to the window object, slightly hacky, but useful for debugging
    (<any>window).eagle = eagle;
    (<any>window).Eagle = Eagle;
    (<any>window).Utils = Utils;

    ko.applyBindings(eagle);
    ko.applyBindings(eagle, document.getElementById("tabTitle"));

    // Code responsible for displaying the EAGLE.
    console.log("Initialising EAGLE");
    eagle.resetEditor();

    // init empty data structures
    eagle.logicalGraph(new LogicalGraph());
    eagle.palettes([]);

    // Show repository list.
    GitHub.loadRepoList(eagle);
    GitLab.loadRepoList(eagle);

    // load the default palette
    if (Eagle.findSettingValue(Utils.OPEN_DEFAULT_PALETTE)){
        eagle.loadPalettes([
            {name:Palette.BUILTIN_PALETTE_NAME, filename:"./static/" + Config.builtinPaletteFileName, readonly:true},
            {name:Palette.DYNAMIC_PALETTE_NAME, filename:"./static/" + Config.templatePaletteFileName, readonly:true}
        ], (data: Palette[]):void => {
            for (let i = 0; i < data.length; i++){
                if (data[i] !== null){
                    eagle.palettes.push(data[i]);
                }
            }
            eagle.leftWindow().shown(true);
            // destroy orphaned tooltips and initializing tooltip on document ready.
            eagle.reloadTooltips();
        });
    }

    // load template palette (only used for Eagle.PaletteEditor)
    eagle.loadTemplatePalette();

    // load schemas
    eagle.loadSchemas();

    // enable bootstrap accordion collapse
    $('.collapse').collapse();

    // initialise all the modal dialogs. event handlers etc
    Utils.initModals(eagle);

    // add a listener for the beforeunload event, helps warn users before leaving webpage with unsaved changes
    window.onbeforeunload = () => (eagle.areAnyFilesModified() && Eagle.findSettingValue(Utils.CONFIRM_DISCARD_CHANGES)) ? "Check graph" : null;

    // keyboard shortcut event listener
    document.onkeydown = KeyboardShortcut.processKey;

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
    eagle.autoLoad(service, auto_load_repository, auto_load_branch, auto_load_path, auto_load_filename);
    
    
});