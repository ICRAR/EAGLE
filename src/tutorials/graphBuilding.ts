import { Eagle } from '../Eagle';
import { RightClick } from '../RightClick';
import { TutorialStep, TutorialSystem } from '../Tutorial';
import { SideWindow } from '../SideWindow';
import { Setting } from '../Setting';
import { Utils } from '../Utils';
import { Modals } from "../Modals";

const newTut = TutorialSystem.newTutorial('Graph Building', 'An introduction to graph building.')

newTut.newTutStep("Welcome to the Graph Building tutorial!", "You can quit this tutorial anytime using the 'exit' button or ESC key. Please refer to the main <a target='_blank' href='https://eagle-dlg.readthedocs.io'>documentation</a> for in-depth information.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Creating a New Graph", "First we are going to create a new graph. Options for creating, loading and saving graphs can be found here. <em>Click on 'Graph' to continue.</em>", function(){return $("#navbarDropdownGraph")})
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('.forceShow').removeClass('forceShow');$('.modal').modal("hide");}) //allowing the graph navbar dropdown to hide

newTut.newTutStep("Creating a New Graph", "<em>Click on 'New'.</em>", function(){return $("#navbarDropdownGraph").parent().find('.dropdown-item').first()})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.forceShowTargetParent()}) //keeping the navbar graph dropdown open
.setBackPreFunction(function(){$("#navbarDropdownGraph").parent().find('#createNewGraph').removeClass('forceShow')})//allowing the 'new' drop drop down section to close
.setBackSkip(true)

newTut.newTutStep("Creating a New Graph", "<em>Click on 'Create new graph'</em>", function(){return $("#navbarDropdownGraph").parent().find('#createNewGraph')})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.forceShowTargetParent()})//keeping the 'new' drop drop down section open as well
.setBackPreFunction(function(){$("#navbarDropdownGraph").parent().find('.dropdown-item').first().parent().addClass('forceShow');TutorialSystem.activeTutCurrentStep.forceShowTargetParent()})//force showing both of the navbar graph drop downs
.setBackSkip(true)

newTut.newTutStep("Creating a new graph", "Then just <em>give it a name and press enter</em>", function(){return $("#inputModalInput")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Input)
.setPreFunction(function(){$('.forceShow').removeClass('forceShow')}) //allowing the graph navbar dropdown to hide
.setBackSkip(true)

newTut.newTutStep("Creating a new graph", "<em>And 'Ok' to save!</em>", function(){return $("#inputModal .affirmativeBtn")})
.setType(TutorialStep.Type.Press)
.setBackSkip(true)

newTut.newTutStep("Editing Graph Descriptions", "Its important to add a description of what the use of the graph is. <em>Click to continue</em>", function(){return $("#shortDescriptionEditBtn")})
.setType(TutorialStep.Type.Press)
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(400)//wait a moment for the graph to be created

newTut.newTutStep("Editing Graph Descriptions", "Descriptions in EAGLE support markdown. In the short description we can enter the top level goal of the graph. For this graph enter a description like 'Simple Hello World Graph to greet someone' and <em>Press Enter</em> to Continue.", function(){return $("#inputMarkdownModalEditor")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Input)
.setPreFunction(function(){Modals.toggleMarkdownEditMode(true)})

newTut.newTutStep("Editing Graph Descriptions", "<em>Click OK to apply and continue", function(){return $('#inputMarkdownModal .modal-footer button.affirmativeBtn')})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Graph Information", "This button brings up the 'Graph Modal Data' which shows you all relevant information about a graph. <em>Try clicking it now to try it out</em>", function(){return $("#inspectorGraphInfoBtn")})
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('.modal').modal("hide");}) //hiding open modals

newTut.newTutStep("Graph Information", "This includes descriptions entered by the graph's creator and technical information such as the version of EAGLE used for creating it. Most of this is filled out automatically when saving the graph.", function(){return $("#modelDataGeneratorVersion")})
.setWaitType(TutorialStep.Wait.Modal)

newTut.newTutStep("Close the Modal", "<em>Press OK to close the modal and continue the Tutorial.</em>", function(){return $("#modelDataModalOKButton")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('#modelDataModal').modal('show')})

newTut.newTutStep("Palette Components", "Each of these components in a palette performs a function that can be used in your graph", function(){return $("#palette_0_HelloWorldApp")})
.setPreFunction(function(){SideWindow.setShown('left', true); TutorialSystem.findInPalettes('#palette_0_HelloWorldApp');})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(500)

newTut.newTutStep("Adding base components into the graph", "To add one into the graph, simply click on the icon or drag the component into the graph.<em> Click on the icon to continue.</em>", function(){return $("#addPaletteNodeHelloWorldApp")})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Graph Nodes", "Once added into your graph, the component is in your own instance. This means you can adjust its parameters and they will be saved with the graph. <em>Click on the node to select it.</em>",  function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('HelloWorldApp')})
.setType(TutorialStep.Type.Condition)
.setWaitType(TutorialStep.Wait.Element)
.setConditionFunction(function(){return TutorialSystem.isRequestedNodeSelected('HelloWorldApp')})
.setPreFunction(function(eagle:Eagle){eagle.resetEditor()})
.setBackPreFunction(function(eagle:Eagle){eagle.resetEditor()})

newTut.newTutStep("Editing Components", "The inspector panel provides access to the complete set of specifications of a component.", function(){return $("#inspector")})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(200)
.setPreFunction(function(){Setting.setValue(Setting.INSPECTOR_COLLAPSED_STATE, false)})

newTut.newTutStep("The Parameter Table", "<em>Click to open the node fields table and continue.</em>", function(){return $("#inspector #openNodeParamsTable")})
.setWaitType(TutorialStep.Wait.Element)
.setType(TutorialStep.Type.Press)

newTut.newTutStep("The Parameter Table", " The Component Parameters are settings pertaining to the DALiuGE component wrapper, the Application Arguments are settings exposed by the underlying application code.", function(){return $('.parameterTable thead')})
.setWaitType(TutorialStep.Wait.Element)
.setAlternateHighlightTargetFunc(function(){return $("#bottomWindow .tableBody")})

newTut.newTutStep("Enter a Name", "In case of this hello world app we can change who we are greeting. <em>Enter a name and press enter to continue.</em>", function(){return $('.tableFieldStringValueInput').first()})

newTut.newTutStep("Right Click to add nodes", "There are various right click options available in EAGLE. <em>Right click on the graph to bring up a 'add node' menu</em>", function(){return $("#logicalGraphParent")})
.setType(TutorialStep.Type.Condition)
.setConditionFunction(function(){ if($('#customContextMenu').length){return true}else{return false}})
.setPreFunction(function(){$('.modal').modal("hide");}) //hiding open modals
.setBackPreFunction(function(){RightClick.closeCustomContextMenu(true);})

newTut.newTutStep("Graph Context menu", "all of your loaded palettes and their contents will appear here", function(){return $("#rightClickPaletteList")})
.setPreFunction(function(){$("#customContextMenu").addClass('forceShow')})
.setWaitType(TutorialStep.Wait.Element)
.setBackSkip(true)

newTut.newTutStep("Quickly adding nodes", "If you already know what you want you can quickly add it by using the search bar. <em>Search for 'file' now and press enter</em>", function(){return $("#rightClickSearchBar")})
.setType(TutorialStep.Type.Input)
.setExpectedInput('file')
.setBackSkip(true)

newTut.newTutStep("Connecting nodes", "To save the output of the hello world app onto the file we need to draw an edge from the 'Hello World' node's output port to the 'File' node's input port.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Node Ports", "This is the output port of the Hello world app, Output ports are always shown with a blue outline and are initially on the right side of the node.",  function(){return $('#portContainer .' + TutorialSystem.initiateSimpleFindGraphNodeIdByNodeName('HelloWorldApp')+' .outputPort')})
.setPreFunction(function(eagle:Eagle){eagle.resetEditor()})
.setBackPreFunction(function(eagle:Eagle){eagle.resetEditor()})
.setAlternateHighlightTargetFunc(function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('HelloWorldApp')})
.setWaitType(TutorialStep.Wait.Element)

newTut.newTutStep("Node Ports", "And this is the input port for the file storage node, Input ports are always shown as solid green and are initially on the left side of the node.",  function(){return $('#portContainer .' + TutorialSystem.initiateSimpleFindGraphNodeIdByNodeName('File')+' .inputPort')})
.setPreFunction(function(eagle:Eagle){eagle.resetEditor()})
.setBackPreFunction(function(eagle:Eagle){eagle.resetEditor()})
.setAlternateHighlightTargetFunc(function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('File')})
.setWaitType(TutorialStep.Wait.Element)

newTut.newTutStep("Connecting nodes", "<em>Click and hold the output Port of the hello world app and drag over to the file node's input port, then release.</em>",  function(){return $('#portContainer .' + TutorialSystem.initiateSimpleFindGraphNodeIdByNodeName('HelloWorldApp')+' .outputPort')})
.setType(TutorialStep.Type.Condition)
.setAlternateHighlightTargetFunc(function(){return $("#logicalGraphParent")})
.setConditionFunction(function(eagle:Eagle){if(eagle.logicalGraph().getNumEdges() != 0){return true}else{return false}}) //check if there are any edges present in the graph

newTut.newTutStep("Graph Errors and warnings", "This is the error checking system, it is showing a check mark, so we did everything correctly. If there are errors in the graph you are able to troubleshoot them by clicking here.", function(){return $("#checkGraphWarnings")})

newTut.newTutStep("Saving a Graph", "Options to save your graph are available in the graph menu <em>Click on 'Graph' to continue.</em>", function(){return $("#navbarDropdownGraph")})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(eagle:Eagle){Utils.closeErrorsModal()})
.setBackPreFunction(function(){$('.forceShow').removeClass('forceShow');$(".dropdown-toggle").removeClass("show");$(".dropdown-menu").removeClass("show")}) //allowing the graph navbar dropdown to hide

newTut.newTutStep("Saving a Graph", "You are able to download the graph in the 'local storage' section, or save the graph into your github repository under 'git storage'", function(){return $("#navbarDropdownGraph").parent().find('.dropdown-menu')})
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.forceShowTargetParent()}) //keeping the navbar graph dropdown open
.setBackSkip(true)

newTut.newTutStep("Well Done!", "You have completed the Hello world graph creation tutorial! Be sure to check our <a target='_blank' href='https://eagle-dlg.readthedocs.io'>online documentation</a> for additional help and guidance.", function(){return $("#logicalGraphParent")})
.setPreFunction(function(){$('.forceShow').removeClass('forceShow')}) //allowing the graph navbar dropdown to hide
