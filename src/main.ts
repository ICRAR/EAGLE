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

import {Eagle} from './Eagle';
import {Config} from './Config';
import {Utils} from './Utils';
import {GitHub} from './GitHub';
import {GitLab} from './GitLab';
import {Node} from './Node';

import {LogicalGraph} from './LogicalGraph';
import {Palette} from './Palette';

import {Repository} from './Repository';
import {RepositoryFile} from './RepositoryFile';

var eagle : Eagle;

$(function(){
    // Global variables.
    eagle = new Eagle();

    // add eagle to the window object, slightly hacky, but useful for debugging
    (<any>window).eagle = eagle;
    (<any>window).Eagle = Eagle;

    ko.applyBindings(eagle);
    ko.applyBindings(eagle, document.getElementById("tabTitle"));

    // Code responsible for displaying the EAGLE.
    console.log("Initialising EAGLE");
    eagle.resetEditor();

    // init empty logicalGraph and palette
    eagle.logicalGraph(new LogicalGraph());
    eagle.palette(new Palette());
    eagle.templatePalette(new Palette());

    initNodeDataLists(eagle);

    // Adjust interface to the graph editor mode.
    eagle.setGraphEditorMode();

    // Show repository list.
    GitHub.loadRepoList(eagle);
    GitLab.loadRepoList(eagle);

    // fetch default translator location
    Utils.fetchTranslatorURL();

    // load the default palette
    eagle.loadTemplatePalette();

    // enable bootstrap tooltips
    eagle.updateTooltips();

    // enable bootstrap accordion collapse
    $('.collapse').collapse();

    // initialise all the modal dialogs. event handlers etc
    Utils.initModals(eagle);


    // HACK: automatically load a graph (useful when iterating quickly during development)
    var autoLoadFile = new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE-graph-repo", "master", false), "summit", "summit_oskar2_384_nodes.json");
    eagle.selectFile(autoLoadFile);
});

/**
 * Build data lists (data nodes/categories, applications nodes/categories) from default palette.
 */
function initNodeDataLists(eagle : Eagle) {
    console.log("init node data lists");

    // Load default palette from the server.
    $.ajax({
        url: "./static/" + Config.templatePaletteFileName,
        success: function (data) {
            // TODO: we waste time here turning the response JSON back into a string, could be improved
            var paletteTemplate : Palette = Palette.fromOJSJson(JSON.stringify(data));

            // Adding event ports.
            paletteTemplate.addEventPorts();

            // Extracting data from the palette.
            Eagle.dataNodes = buildNodeList(paletteTemplate, Eagle.CategoryType.Data);
            Eagle.dataCategories = buildCategoryList(paletteTemplate, Eagle.CategoryType.Data);
            Eagle.applicationNodes = buildNodeList(paletteTemplate, Eagle.CategoryType.Application);
            Eagle.applicationCategories = buildCategoryList(paletteTemplate, Eagle.CategoryType.Application);
        }
    });
}

function buildNodeList(palette : Palette, categoryType : Eagle.CategoryType) : Node[] {
    var result : Node[] = [];

    // Searching for the node.
    for (var i = 0; i < palette.getNodes().length; i++) {
        var node : Node = palette.getNodes()[i];
        if (node.getCategoryType() === categoryType) {
            result.push(node);
        }
    }

    return result;
}

// Build a list of node data.
function buildCategoryList(palette : Palette, categoryType : Eagle.CategoryType) : Eagle.Category[] {
    var result : Eagle.Category[] = [];

    // Searching for the node.
    for (var i = 0; i < palette.getNodes().length; i++) {
        var node : Node = palette.getNodes()[i];
        if (node.getCategoryType() === categoryType) {
            result.push(node.getCategory());
        }
    }

    return result;
}
