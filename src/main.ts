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
import {Utils} from './Utils';
import {GitHub} from './GitHub';
import {GitLab} from './GitLab';

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
    (<any>window).Utils = Utils;

    ko.applyBindings(eagle);
    ko.applyBindings(eagle, document.getElementById("tabTitle"));

    // Code responsible for displaying the EAGLE.
    console.log("Initialising EAGLE");
    eagle.resetEditor();

    // init empty data structures
    eagle.logicalGraph(new LogicalGraph());
    eagle.editorPalette(new Palette());
    eagle.palettes([]);
    eagle.templatePalette(new Palette());

    // Adjust interface to the graph editor mode.
    eagle.setGraphEditorMode();

    // Show repository list.
    GitHub.loadRepoList(eagle);
    GitLab.loadRepoList(eagle);

    // load the default palette
    eagle.loadTemplatePalette();

    // enable bootstrap tooltips
    eagle.updateTooltips();

    // enable bootstrap accordion collapse
    $('.collapse').collapse();

    // initialise all the modal dialogs. event handlers etc
    Utils.initModals(eagle);

    // add a listener for the beforeunload event, helps warn users before leaving webpage with unsaved changes
    window.onbeforeunload = () => (eagle.areAnyFilesModified() && Eagle.findSettingValue(Utils.CONFIRM_DISCARD_CHANGES)) ? "Check graph" : null;

    // HACK: automatically load a graph (useful when iterating quickly during development)
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE-graph-repo", "master", false), "", "LEAP-Work-Flow.graph"));
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE-graph-repo", "master", false), "leap", "LeapMVP.graph"));
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE-graph-repo", "master", false), "", "SummitIngest_Demo.graph"));
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "james-strauss-uwa/eagle-test", "master", false), "summit", "summit.graph"));
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE-graph-repo", "master", false), "leap", "LeapAccelerateCLI.palette"));
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE_test_repo", "master", false), "", "everything2.palette"));
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE_test_repo", "master", false), "LEAP", "leap.palette"));
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE-graph-repo", "master", false), "SDP Pipelines", "cont_img_mvp.graph"));
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE_test_repo", "master", false), "loop", "loop_exit_app_ports.graph"));
    //eagle.selectFile(new RepositoryFile(new Repository(Eagle.RepositoryService.GitHub, "ICRAR/EAGLE_test_repo", "master", false), "loop", "test.graph"));
});
