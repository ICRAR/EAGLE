import {Tutorial, TutorialStep, TutorialSystem} from '../Tutorial';

const newTut = TutorialSystem.newTutorial('Test Tutorial', 'This tutorial is for testing purposes.')

newTut.newTutStep("Welcome to the Hello World tutorial!", "You can quit this tutorial anytime using the 'exit' button or ESC key. Please refer to the main <a target='_blank' href='https://eagle-dlg.readthedocs.io'>documentation</a> for in-depth information.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Creating a New Graph", "First we are going to create a new graph. Options for creating, loading and saving graphs can be found here. Click on 'Graph' to continue..", function(){return $("#navbarDropdownGraph")})
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('.forceShow').removeClass('forceShow')}) //allowing the graph navbar dropdown to hide

newTut.newTutStep("Creating a New Graph", "Click on 'New' ..", function(){return $("#navbarDropdownGraph").parent().find('.dropdown-item').first()})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow')}) //keeping the navbar graph doropdown open
.setBackPreFunction(function(){$("#navbarDropdownGraph").parent().find('#createNewGraph').removeClass('forceShow')})//allowing the 'new' drop drop down section to close

newTut.newTutStep("Creating a New Graph", "Click on 'Create new graph'", function(){return $("#navbarDropdownGraph").parent().find('#createNewGraph')})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow')})//keeping the 'new' drop drop down section open as well
.setBackPreFunction(function(){$("#navbarDropdownGraph").parent().find('.dropdown-item').first().parent().addClass('forceShow');TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow')})//force showing both of the navbar graph drop downs

newTut.newTutStep("Creating a new graph", "The just give it a name and press enter", function(){return $("#inputModalInput")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Input)
.setPreFunction(function(){$('.forceShow').removeClass('forceShow')}) //allowing the graph navbar dropdown to hide

newTut.newTutStep("Creating a new graph", "And 'Ok' to save!", function(){return $("#inputModal .affermativeBtn")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Graph Model Data", "This button brings up the 'Graph Modal Data' which allows you to add a description for your graph.", function(){return $("#openGraphModelDataModal")})
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Editing Graph Descriptions", "You are able to enter a simple first glance and a more detailed decription in addition to a description node in the graph, should you need it.", function(){return $("#modelDataDescription")})
.setWaitType(TutorialStep.Wait.Modal)

newTut.newTutStep("Other Graph Information", "Most of the other information is automatically filled out when saving a graph, such as the version of EAGLE used for creating it.", function(){return $("#modelDataEagleVersion")})
.setWaitType(TutorialStep.Wait.Modal)

newTut.newTutStep("Close the Modal", "Press OK to close the modal and continue the Tutorial", function(){return $("#modelDataModalOKButton")})
.setWaitType(TutorialStep.Wait.Modal)
.setType(TutorialStep.Type.Press)

newTut.newTutStep("Graph Description Node", "A new description node is created. You can use this to enter a description for your graph. Click it to select the node.", function(){return $("#logicalGraphD3Div #node0 .nodeIcon .icon-description")})
.setType(TutorialStep.Type.Press)
.setWaitType(TutorialStep.Wait.Element)
.setAlternateHighlightTargetFunc(function(){return $("#logicalGraphParent")})

newTut.newTutStep("The Node Inspector", "Notice, when you select a node, the inspector becomes available in the right window. This is where you can edit the parameters of a node.", function(){return $("#rightWindowContainer")})

