import {Tutorial, TutorialStep, TutorialSystem} from '../Tutorial';
import {Eagle} from '../Eagle';
import {InspectorState} from '../InspectorState';


const newTut = TutorialSystem.newTutorial('Graph Building', 'This tutorial is for testing purposes.')

newTut.newTutStep("Welcome to the Hello World tutorial!", "You can quit this tutorial anytime using the 'exit' button or ESC key. Please refer to the main <a target='_blank' href='https://eagle-dlg.readthedocs.io'>documentation</a> for in-depth information.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Creating a New Graph", "First we are going to create a new graph. Options for creating, loading and saving graphs can be found here. <em>Click on 'Graph' to continue.</em>", function(){return $("#navbarDropdownGraph")})
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('.forceShow').removeClass('forceShow');$('.modal').modal("hide");}) //allowing the graph navbar dropdown to hide

newTut.newTutStep("Creating a New Graph", "<em>Click on 'New'.</em>", function(){return $("#navbarDropdownGraph").parent().find('.dropdown-item').first()})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow')}) //keeping the navbar graph doropdown open
.setBackPreFunction(function(){$("#navbarDropdownGraph").parent().find('#createNewGraph').removeClass('forceShow')})//allowing the 'new' drop drop down section to close
.setBackSkip(true)

newTut.newTutStep("Creating a New Graph", "<em>Click on 'Create new graph'</em>", function(){return $("#navbarDropdownGraph").parent().find('#createNewGraph')})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow')})//keeping the 'new' drop drop down section open as well
.setBackPreFunction(function(){$("#navbarDropdownGraph").parent().find('.dropdown-item').first().parent().addClass('forceShow');TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow')})//force showing both of the navbar graph drop downs
.setBackSkip(true)

newTut.newTutStep("Creating a new graph", "Then just <em>give it a name and press enter</em>", function(){return $("#inputModalInput")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Input)
.setPreFunction(function(){$('.forceShow').removeClass('forceShow')}) //allowing the graph navbar dropdown to hide
.setBackSkip(true)

newTut.newTutStep("Creating a new graph", "<em>And 'Ok' to save!</em>", function(){return $("#inputModal .affermativeBtn")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Press)
.setBackSkip(true)

newTut.newTutStep("Graph Model Data", "This button brings up the 'Graph Modal Data' which allows you to add a description for your graph. <em>Try clicking it now to try it out</em>", function(){return $("#openGraphModelDataModal")})
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('.modal').modal("hide");}) //hiding open moddals
 
newTut.newTutStep("Editing Graph Descriptions", "You are able to enter a simple first glance and a more detailed decription in addition to description nodes in the graph, should you need it.", function(){return $("#modelDataDescription")})
.setWaitType(TutorialStep.Wait.Modal)

newTut.newTutStep("Other Graph Information", "Most of the other information is automatically filled out when saving a graph, such as the version of EAGLE used for creating it.", function(){return $("#modelDataEagleVersion")})
.setWaitType(TutorialStep.Wait.Modal)

newTut.newTutStep("Close the Modal", "<em>Press OK to close the modal and continue the Tutorial.</em>", function(){return $("#modelDataModalOKButton")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('#modelDataModal').modal('show')})

newTut.newTutStep("Palette Components", "Each of these components in a palette performs a function that can be used in your graph", function(){return $("#palette_0_HelloWorldApp")})

newTut.newTutStep("Adding base components into the graph", "To add one into the graph, simply click on the icon or drag the component into the graph.<em> Click on the icon to continue.</em>", function(){return $("#addPaletteNodeHelloWorldApp")})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Graph Nodes", "Once added into your graph, the component is in your own instance. This means you can adjust its parameters and they will be saved with the graph. <em>Click on the node to select it.</em>",  function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('HelloWorldApp')})
.setType(TutorialStep.Type.Condition)
.setWaitType(TutorialStep.Wait.Element)
.setConditionFunction(function(){return TutorialSystem.isRequestedNodeSelected('HelloWorldApp')})
.setPreFunction(function(eagle:Eagle){eagle.resetEditor()})
.setBackPreFunction(function(eagle:Eagle){eagle.resetEditor()})

newTut.newTutStep("Editing Components", "The inspector houses all the editable parameters of a node. Component parameters are .. while application arguments ... ", function(){return $("#rightWindowContainer")})        
.setPreFunction(function(eagle:Eagle){eagle.rightWindow().mode(Eagle.RightWindowMode.Inspector)})

newTut.newTutStep("Click to expand", "<em>Click to expand the application arguments section and continue.</em>", function(){return $("#inspectorAppArgsHeading button")})
.setBackPreFunction(function(){$("#inspectorAppArgsHeading button").click()})
.setWaitType(TutorialStep.Wait.Element)
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Enter a Name", "In case of this hello world app we can change who we are greeting. <em>Enter a name and press enter to continue.</em>", function(){return TutorialSystem.findInspectorInputGroupByName('Greet').find('input')})  
.setType(TutorialStep.Type.Input)
.setWaitType(TutorialStep.Wait.Delay)

newTut.newTutStep("Key Attributes", "You can flag important parameters and attributes of a graph as 'Key Attributes'. These are then all available for editing in one location. <em>Click on the heart to flag this argument as key attribute.</em>", function(){return TutorialSystem.findInspectorInputGroupByName('Greet').find('.keyAttributeButton')})  
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Key Attributes", "You can view the key attributes of a graph by opening the key attributes table located here.", function(){return $("#openKeyParameterTable")})

newTut.newTutStep("Right Click to add nodes", "There are also various right click options available in eagle. <em>Right click on the graph to bring up a 'add node' menu</em>", function(){return $("#logicalGraphParent")})  
.setType(TutorialStep.Type.Condition)
.setConditionFunction(function(){ if($('#customContextMenu').length){return true}else{return false}})
.setPreFunction(function(){$('.modal').modal("hide");}) //hiding open moddals
.setBackPreFunction(function(){$("#customContextMenu").removeClass('forceShow')})

newTut.newTutStep("Graph Context menu", "all of your loaded palettes and their contents will appear here", function(){return $("#rightClickPaletteList")})  
.setPreFunction(function(){$("#customContextMenu").addClass('forceShow')})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(200)
.setBackSkip(true)

newTut.newTutStep("Quickly adding nodes", "If you already know what you want you can quickly add it by using the search bar. <em>Search for 'file' now and press enter</em>", function(){return $("#rightClickSearchBar")})
.setType(TutorialStep.Type.Input)
.setExpectedInput('file')
.setBackSkip(true)

newTut.newTutStep("Connecting nodes", "To save the output of the hello world app onto the file we need to draw an edge from the 'Hello World' node's output port to the 'File' node's input port.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Node Ports", "This is the output port of the Hello world app, Outpout ports are always shown on the right side of the node.",  function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('HelloWorldApp').parent().find('.outputPorts').find('circle')})
.setAlternateHighlightTargetFunc(function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('HelloWorldApp')})
.setWaitType(TutorialStep.Wait.Element)

newTut.newTutStep("Node Ports", "And this is the input port for the file storage node, Iutpout ports are always shown on the left side of the node.",  function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('File').parent().find('.inputPorts').find('circle')})
.setAlternateHighlightTargetFunc(function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('File')})
.setWaitType(TutorialStep.Wait.Element)

newTut.newTutStep("Connecting nodes", "<em>Click and hold the output Port of the hello world app and drag over to the file node's input port, then release.</em>", function(){return $("#logicalGraphParent")})
.setType(TutorialStep.Type.Condition)
.setConditionFunction(function(eagle:Eagle){if(eagle.logicalGraph().getEdges().length != 0){return true}else{return false}}) //check if there are any edges present in the graph

newTut.newTutStep("Graph Errors and warnings", "Notice that we have a few graph warnings detected. <em>Click here to view them</em>", function(){return $("#checkGraphWarnings")})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Graph Errors and warnings", "This modal may aid you in troubleshooting graphs. In this case these errors are all port type errors. Eagle can automatically fix errors such as these for you. To do this you can press 'F' in the graph or <em>click on 'Fix All'</em>", function(){return $("#errorModalFixAll")})
.setType(TutorialStep.Type.Press)
.setWaitType(TutorialStep.Wait.Modal)
.setAlternateHighlightTargetFunc(function(){return $("#errorModalFixAll").parent().parent()})
.setBackPreFunction(function(){$('#errorsModal').modal('show')})

newTut.newTutStep("Saving a Graph", "Options to save your graph are available in the graph menu <em>Click on 'Graph' to continue.</em>", function(){return $("#navbarDropdownGraph")})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(eagle:Eagle){eagle.closeErrorsModal()})
.setBackPreFunction(function(){$('.forceShow').removeClass('forceShow');$(".dropdown-toggle").removeClass("show");$(".dropdown-menu").removeClass("show")}) //allowing the graph navbar dropdown to hide

newTut.newTutStep("Saving a Graph", "You are able to download the graph in the 'local storage' section, or save the graph into your github repository under 'git storage'", function(){return $("#navbarDropdownGraph").parent().find('.dropdown-menu')})
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().addClass('forceShow')}) //keeping the navbar graph doropdown open
.setBackSkip(true)

newTut.newTutStep("Well Done!", "You have completed the Hello world graph creation tutorial! Be sure to check our <a target='_blank' href='https://eagle-dlg.readthedocs.io'>online documentation</a> for additional help and guidance.", function(){return $("#logicalGraphParent")})
.setPreFunction(function(){$('.forceShow').removeClass('forceShow')}) //allowing the graph navbar dropdown to hide
