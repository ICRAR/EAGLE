import {TutorialStep, TutorialSystem} from '../Tutorial';
import { Utils } from '../Utils';

const newTut = TutorialSystem.newTutorial('Quick Start', 'This tutorial is an introductory tour around Eagle to get the user familiar with the user interface.')

newTut.newTutStep("Welcome to Eagle!", "Welcome to the basic UI tutorial for EAGLE, the Editor for the Advanced Graph Language Environment. You can quit this tutorial anytime using the 'exit' button or ESC key. Please refer to the main <a target='_blank' href='https://eagle-dlg.readthedocs.io'>documentation</a> for in-depth information.", function(){return $("#eagleAndVersion a")})

newTut.newTutStep("Left Panel", "This panel displays the components available to construct graphs. The components are organised in so-called <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/palettes.html'>Palettes</a>. By default EAGLE loads two palettes, which are part of the core system, but users can develop their own palettes as well and load them here.", function(){return $(".leftWindow")})

newTut.newTutStep("Graph Canvas", "In the graph canvas you can construct graphs using components from the palettes.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Right Panel", "This Panel houses your repositories, allowing for loading of palettes and graphs. The Hierarchy tab, for a better overview of the graph structure. And the Translate tab, which is where translation options can be set.", function(){return $(".rightWindow")})

newTut.newTutStep("Hints Bar", "Keep an eye on this section to learn important shortcuts and methods. The content changes when selecting different components in the canvas.", function(){return $("#statusBar")})

newTut.newTutStep("User Interface Element Tooltips", "Much of Eagle's interface is using icons. You can always hover over the icons and most of the other elements to get more information on what they do.", function(){return $("#navbarSupportedContent .btn-group")})
    .setBackPreFunction(function (eagle) {Utils.hideShortcutsModal()})

newTut.newTutStep("Help", "This is where you can find various documentation to aid in learning your way around EAGLE. <em>Click on 'Help' to continue.</em>", function(){return $("#navbarDropdownHelp")})
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('.forceShow').removeClass('forceShow');$('.modal').modal("hide");}) //allowing the graph navbar dropdown to hide

newTut.newTutStep("Tutorials", "All the of our tutorials, including this one, will always be available here.", function(){return $("#navTutorials")})
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow');$("#navTutorials").find('.dropDropDown').addClass('forceShow')}) //keeping the navbar graph dropdown open and showing the contents of the tutorials drop down
.setBackPreFunction(function(){$("#navTutorials").find('.dropDropDown').addClass('forceShow')})//showing the contents of the tutorials drop down

newTut.newTutStep("Read The Docs", "This is a link to our in depth documentation on Read The Docs.", function(){return $("#onlineDocs")})
.setPreFunction(function(){$("#navTutorials").find('.dropDropDown').removeClass('forceShow')}) //hiding the contents of the tutorials drop down
.setBackPreFunction(function(){$('.modal').modal("hide");}) //hide the modal in case it has been opened by the user

newTut.newTutStep("Keyboard Shortcuts", "Eagle has many keyboard shortcuts to boost productivity, this is the cheat sheet. The shortcut for this is [K]", function(){return $("#keyboardShortcuts")})
.setBackPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow');}) //hide the modal in case it has been opened by the user

newTut.newTutStep("Quick Actions", "Use this tool to look up and run functions or discover documentation available in EAGLE.", function(){return $("#quickAction")})
.setPreFunction(function(){$(".forceShow").removeClass("forceShow"); $("#navbarDropdownHelp").trigger('mouseleave');}) //hide the quickaction tooltip

newTut.newTutStep("Click To Open Settings", "The settings modal allows you to customize EAGLE's user experience. By default, EAGLE is simplified by hiding a lot of functionality via the UI modes. To find out more check our <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/settings.html#settings'>settings documentation</a>. <em>Click the Settings Button to continue.</em>", function(){return $("#settings")})
    .setType(TutorialStep.Type.Press)
    .setPreFunction(function(eagle){Utils.hideShortcutsModal();})
    .setBackPreFunction(function(eagle){Utils.hideSettingsModal();})

newTut.newTutStep("Set up Eagle to how you need it.", "Eagle has a lot of functionality, as such, there are various settings that affect how EAGLE behaves and how much of it is hidden.", function(){return $("#settingsModal .modal-body")})
    .setWaitType(TutorialStep.Wait.Modal)
    
newTut.newTutStep("Eagle UI modes", "To help with this, there are a few <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/settings.html#ui-modes'>UI modes</a> for different use cases of EAGLE.", function(){return $("#settingUserInterfaceModeValue")})
    .setWaitType(TutorialStep.Wait.Modal)
    .setPreFunction(function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryUserOptions');})
    .setBackPreFunction( function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryUserOptions');})

newTut.newTutStep("Setup the URL for the Translator Service", "This is required when you want to submit a graph for translation and execution. The default value is correct, if the translator has been started on the same node as EAGLE. Feel free to change it now. This setting is also used to configure the function of the 'Translate' button.", function(){return $("#settingTranslatorURLValue")})
    .setWaitType(TutorialStep.Wait.Modal)
    .setPreFunction(function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryExternalServices');})

newTut.newTutStep("Setup your git access token", "Setting up the access tokens is necessary for getting access to the GitHub and GitLab repositories (see also the <a target='_blank' href='https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'>GitHub tutorial</a>). Feel free to add one or both now, you can change these at any time.", function(){return $("#settingGitHubAccessTokenValue")})
    .setWaitType(TutorialStep.Wait.Modal)

newTut.newTutStep("DockerHub user name", "DockerHub user name setup. This is an optional setting, but required if you want to make use of docker components loaded from DockerHub", function(){return $("#settingDockerHubUserNameValue")})
    .setWaitType(TutorialStep.Wait.Modal)
    
newTut.newTutStep("Click To Save Settings", "<em>Press 'Ok' (or hit Enter) to save your changes and continue.</em>", function(){return $("#settingsModalAffirmativeButton")})
    .setType(TutorialStep.Type.Press)
    .setWaitType(TutorialStep.Wait.Modal)
    .setPreFunction(function(eagle){$('#settingsModalNegativeButton').on('click.tutButtonListener', eagle.tutorial().tutPressStepListener).addClass('tutButtonListener');})
    .setBackPreFunction(function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryExternalServices'); $('#settingsModalNegativeButton').on('click.tutButtonListener',eagle.tutorial().tutPressStepListener).addClass('tutButtonListener');$("#settingsModalAffirmativeButton").trigger("focus");})

newTut.newTutStep("Translate Button", "Once configured, you are able to send your graph to the Translator", function(){return $("#navDeployBtn")})

newTut.newTutStep("Well Done!", "You have completed the quick introduction tutorial! Be sure to check our <a target='_blank' href='https://eagle-dlg.readthedocs.io'>online documentation</a> for additional help and guidance. To continue to our tutorial on graph building press <a  onclick='TutorialSystem.initiateTutorial(`Graph Building`)' href='#'>here!</a>", function(){return $("#logicalGraphParent")})
