import { Eagle } from '../Eagle';
import { RightClick } from '../RightClick';
import { TutorialStep, TutorialSystem } from '../Tutorial';
import { Setting } from '../Setting';

const newTut = TutorialSystem.newTutorial('Graph Configurations', 'An introduction to using graph configurations.')

newTut.newTutStep("Welcome to the Graph Configuration tutorial!", "You can quit this tutorial anytime using the 'exit' button or ESC key. Please refer to the main <a target='_blank' href='https://eagle-dlg.readthedocs.io'>documentation</a> for in-depth information.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Creating a New Graph", "Lets once again create a new graph. <em>Click on 'Graph' to continue.</em>", function(){return $("#navbarDropdownGraph")})
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('.forceShow').removeClass('forceShow');$('.modal').modal("hide");}) //allowing the graph navbar dropdown to hide

newTut.newTutStep("Creating a New Graph", "<em>Click on 'New'.</em>", function(){return $("#navbarDropdownGraph").parent().find('.dropdown-item').first()})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow')}) //keeping the navbar graph dropdown open
.setBackPreFunction(function(){$("#navbarDropdownGraph").parent().find('#createNewGraph').removeClass('forceShow')})//allowing the 'new' drop drop down section to close
.setBackSkip(true)

newTut.newTutStep("Creating a New Graph", "<em>Click on 'Create new graph'</em>", function(){return $("#navbarDropdownGraph").parent().find('#createNewGraph')})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow')})//keeping the 'new' drop drop down section open as well
.setBackPreFunction(function(){$("#navbarDropdownGraph").parent().find('.dropdown-item').first().parent().addClass('forceShow');TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow')})//force showing both of the navbar graph drop downs
.setBackSkip(true)

newTut.newTutStep("Creating a new graph", "Then just <em>give it a name and press enter on you keyboard</em>", function(){return $("#inputModalInput")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Input)
.setPreFunction(function(){$('.forceShow').removeClass('forceShow')}) //allowing the graph navbar dropdown to hide
.setBackSkip(true)

newTut.newTutStep("Creating a new graph", "<em>And 'Ok' to confirm!</em>", function(){return $("#inputModal .affirmativeBtn")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Press)
.setBackSkip(true)

newTut.newTutStep("Right Click to add a hello world app node", "Use the right click menu to add a node. <em>Right click on the graph to bring up a 'add node' menu</em>", function(){return $("#logicalGraphParent")})
.setType(TutorialStep.Type.Condition)
.setConditionFunction(function(){ if($('#customContextMenu .searchBarContainer').length){return true}else{return false}})
.setPreFunction(function(){$('.modal').modal("hide");}) //hiding open modals
.setBackPreFunction(function(){RightClick.closeCustomContextMenu(true);})

newTut.newTutStep("Add a hello world app node", "<em>Search for 'hello' and press enter</em>", function(){return $("#rightClickSearchBar")})
.setType(TutorialStep.Type.Condition)
.setConditionFunction(function(){return TutorialSystem.isRequestedNodeSelected('HelloWorldApp')})
// .setType(TutorialStep.Type.Input)
// .setExpectedInput('hello')
.setBackSkip(true)

newTut.newTutStep("Right Click to add a file node", "Use the right click menu to add a second node. <em>Right click on the graph to bring up a 'add node' menu</em>", function(){return $("#logicalGraphParent")})
.setType(TutorialStep.Type.Condition)
.setConditionFunction(function(){ if($('#customContextMenu .searchBarContainer').length){return true}else{return false}})
.setPreFunction(function(){$('.modal').modal("hide");}) //hiding open modals
.setBackPreFunction(function(){RightClick.closeCustomContextMenu(true);})

newTut.newTutStep("Add a file node", "<em>Search for 'file' and press enter</em>", function(){return $("#rightClickSearchBar")})
.setType(TutorialStep.Type.Condition)
.setConditionFunction(function(){return TutorialSystem.isRequestedNodeSelected('File')})
// .setType(TutorialStep.Type.Input)
// .setExpectedInput('file')
.setBackSkip(true)

newTut.newTutStep("Connecting nodes", "<em>Click and hold the output Port of the hello world app and drag over near the file node's input port, until you see the edge from the cursor turn a deep purple, then release.</em>",  function(){return $('#portContainer .' + TutorialSystem.initiateSimpleFindGraphNodeIdByNodeName('HelloWorldApp')+' .outputPort')})
.setType(TutorialStep.Type.Condition)
.setAlternateHighlightTargetFunc(function(){return $("#logicalGraphParent")})
.setConditionFunction(function(eagle:Eagle){if(eagle.logicalGraph().getEdges().length != 0){return true}else{return false}}) //check if there are any edges present in the graph

newTut.newTutStep("Graph Configurations", "Now that we have a working hello world graph, we should set up a graph configuration and flag the important fields. This makes consecutive runs easier and the graph more user friendly. <em>next to continue</em>", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Adding Graph Configuration Fields", "<em>Click on the HelloWorldApp node to select it.</em>",  function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('HelloWorldApp')})
.setType(TutorialStep.Type.Condition)
.setWaitType(TutorialStep.Wait.Element)
.setConditionFunction(function(){return TutorialSystem.isRequestedNodeSelected('HelloWorldApp')})
.setPreFunction(function(eagle:Eagle){eagle.resetEditor()})
.setBackPreFunction(function(eagle:Eagle){eagle.resetEditor()})

newTut.newTutStep("Adding Graph Configuration Fields", "<em>Click to open the node fields table and continue.</em>", function(){return $("#inspector #openNodeParamsTable")})
.setWaitType(TutorialStep.Wait.Element)
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){Setting.find(Setting.OBJECT_INSPECTOR_COLLAPSED_STATE).setValue(false)})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(400)

newTut.newTutStep("Creating Graph Configurations", "Lets flag the 'greet' field of who we are greeting as a graph configuration field. This button appears when hovering on the field name. <em>Click on the heart to flag this field as graph configuration field.</em>", function(){return $('.column_DisplayText button').first()})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){setTimeout(function(){$('.column_DisplayText button').first().css('visibility','visible')},200)})
// .setBackPreFunction(function(){$('#openNodeFieldsTable').trigger("click")})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(700)

newTut.newTutStep("Creating Graph Configurations", "A graph may have many configurations for different purposes. <em>Enter a descriptive name such as 'Simple Hello World' and click OK</em>",function(){return $('#inputModal .affirmativeBtn')})
.setType(TutorialStep.Type.Press)
.setAlternateHighlightTargetFunc(function(){return $('#inputModal .modal-content')})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(200)

newTut.newTutStep("Graph Configurations", "You can view the graph configuration fields by opening the Graph Configurations table here. <em>click to continue</em>", function(){return $("#button_open_graph_attributes_configuration_table")})
.setType(TutorialStep.Type.Press)
// .setPreFunction(function(){$('.parameterTable').modal('hide')})

newTut.newTutStep("Graph Configurations", "Our name field has been added to the graph configuration, where we can quickly change it for future runs of the graph. <em>next to continue</em>", function(){return $('.column_DisplayText').first()})
.setAlternateHighlightTargetFunc(function(){return $('.parameterTable')})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(200)

newTut.newTutStep("Adjusting Graph Configurations", "We should describe what the field does for our graph. <em>Type 'Change the name of who we are greeting' and press Enter</em>", function(){return $('.tableFieldCommentInput').first()})
.setType(TutorialStep.Type.Input)

newTut.newTutStep("Adjusting Graph Configurations", "For example, lets greet John. <em>Type 'John' and press enter to continue.</em>", function(){return $('.tableFieldStringValueInput').first()})
.setType(TutorialStep.Type.Input)

newTut.newTutStep("Saving Graph Configurations", "This will commit the new graph configuration changes into the graph. You will still need to save the graph to git, or locally. <em>Save the configuration</em>", function(){return $('#parameterTableSaveGraphConfig')})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){$('.parameterTable').modal('hide')})

newTut.newTutStep("Saving Graph Configurations", "You must enter a description of what this graph config is designed to do, such as; 'with control over the name of who we are greeting' <em>Enter a description and click OK</em>",function(){return $('#inputModal .affirmativeBtn')})
.setType(TutorialStep.Type.Press)
.setAlternateHighlightTargetFunc(function(){return $('#inputModal .modal-content')})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(200)

newTut.newTutStep("Managing Graph Configurations", "<em>Click to Switch to the graph configurations table</em>", function(){return $('#bottomTabGraphConfigurationsSwitcher')})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Managing Graph Configurations", "In this table we can view, edit, copy or delete existing graph configurations saved in this graph. <em>next to continue</em>", function(){return $('.column-actions').first()})
.setAlternateHighlightTargetFunc(function(){return $('#bottomWindow .content')})

newTut.newTutStep("Managing Graph Configurations", "Lets say we want another version of this config, but also be able to easily change the output file path. First, we must duplicate our existing graph configuration. <em>Click to duplicate our first configuration</em>", function(){return $('.btmWindowDuplicateBtn').first()})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Managing Graph Configurations", "Our configuration has been duplicated, lets add the additional field. <em>next to continue</em>", function(){return $('.bottomWindowHeader span')})
.setAlternateHighlightTargetFunc(function(){return $('#bottomWindow .content')})

newTut.newTutStep("Adding another field", "<em>Click on the File node to select it.</em>",  function(){return TutorialSystem.initiateFindGraphNodeIdByNodeName('File')})
.setType(TutorialStep.Type.Condition)
.setWaitType(TutorialStep.Wait.Element)
.setConditionFunction(function(){return TutorialSystem.isRequestedNodeSelected('File')})
.setPreFunction(function(eagle:Eagle){eagle.resetEditor()})
.setBackPreFunction(function(eagle:Eagle){eagle.resetEditor()})

newTut.newTutStep("Adding another field", "<em>Click to Switch to the node fields table</em>", function(){return $('#bottomTabParamsTableSwitcher')})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Adding another field", "<em>Click on the heart to flag the file path field as a graph configuration field.</em>", function(){return $('.column_DisplayText button').first()})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){setTimeout(function(){$('.column_DisplayText button').first().css('visibility','visible')},200)})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(700)

newTut.newTutStep("Adding another field", "Switch back to the graph configuration fields table <em>Click to Switch</em>", function(){return $('#bottomTabKeyParamsSwitcher')})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Adjusting Graph Configurations", "We can see that the FilePath field has been added to our graph configuration. Describe what it does, such as 'the output file path of the graph' <em>Type a description and press Enter</em>", function(){return $('.tableFieldCommentInput').eq(1)})
.setType(TutorialStep.Type.Input)
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(200)

newTut.newTutStep("Saving Graph Configurations", "Don't forget to save the new config</em>", function(){return $('#parameterTableSaveGraphConfig')})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Saving Graph Configurations", "update the description to better describe the new purpose of the configuration 'with control over the name of who we are greeting and output file path' <em>Enter a description and click OK",function(){return $('#inputModal .affirmativeBtn')})
.setType(TutorialStep.Type.Press)
.setAlternateHighlightTargetFunc(function(){return $('#inputModal .modal-content')})
.setWaitType(TutorialStep.Wait.Delay)
.setDelayAmount(200)

newTut.newTutStep("Activating Graph Configurations", "To select which configuration is active for use, view them in the graph configurations table. <em>Click to Switch</em>", function(){return $('#bottomTabGraphConfigurationsSwitcher')})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Activating Graph Configurations", "As you can see, the newly created configuration with filepath is active. You may simply click the active button to toggle which configuration is active. <em>next to continue</em>", function(){return $('.column-active').eq(1)})
.setAlternateHighlightTargetFunc(function(){return $('.parameterTable')})

newTut.newTutStep("Well Done!", "You have completed the Hello world graph creation tutorial! Be sure to check our <a target='_blank' href='https://eagle-dlg.readthedocs.io'>online documentation</a> for additional help and guidance.", function(){return $("#logicalGraphParent")})
.setPreFunction(function(){$('.forceShow').removeClass('forceShow')}) //allowing the graph navbar dropdown to hide
