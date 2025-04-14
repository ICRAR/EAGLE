import {tutorialArray, TutorialStep, TutorialSystem} from '../Tutorial';
import { Utils } from '../Utils';

const newTut = TutorialSystem.newTutorial('Welcome', 'This Tutorial is an introductory tour of how to get started.')

newTut.newTutStep("Welcome to Eagle!", "The Editor for the Advanced Graph Language Environment. This is an introduction on how to get started. You can quit this tutorial anytime using the 'exit' button or ESC key. Please refer to the main <a target='_blank' href='https://eagle-dlg.readthedocs.io'>documentation</a> for in-depth information.", function(){return $("#eagleAndVersion a")})

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
.setBackPreFunction(function(){$("#quickAction").trigger('mouseleave'); $('.modal').modal("hide");}) //hide the modal in case it has been opened by the user

newTut.newTutStep("Tooltips", "You can get more information about most UI Elements by hovering on them. This is a shortcut to remember!", function(){return $("#quickAction")})
.setPreFunction(function(){$('.forceShow').trigger('mouseleave').removeClass('forceShow'); $('.modal').modal("hide"); $("#quickAction").trigger('mouseenter');}) //allowing the help section in the navbar to close and closing any modals in case they are open
.setBackPreFunction(function(){$("#quickAction").trigger('mouseenter');}) //hide the modal in case it has been opened by the user

newTut.newTutStep("Quick Actions", "Use this tool to look up and run functions or discover documentation available in EAGLE.", function(){return $("#quickAction")})
.setPreFunction(function(){$("#quickAction").trigger('mouseleave');}) //hide the quickaction tooltip

newTut.newTutStep("Status Bar", "This section dipslays some of the major actions available in the current UI state. This information will change when selecting different things. ", function(){return $("#statusBar")})

newTut.newTutStep("Click To Open Settings", "The settings modal allows to customize EAGLE's user experience. By default, EAGLE is simplified by hiding a lot of functionality via the UI modes. To find out more check our <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/settings.html#settings'>settings documentation</a>. <em>Click the Settings Icon to continue.</em>", function(){return $("#settings")})
    .setType(TutorialStep.Type.Press)
    .setBackPreFunction(function(){Utils.hideSettingsModal();})

newTut.newTutStep("Set up Eagle to how you need it.", "Eagle has a lot of functionality, as such, there are various settings that affect how eagle behaves and how much of it is hidden.", function(){return $("#settingsModal .modal-body")})
    .setWaitType(TutorialStep.Wait.Modal)
    
newTut.newTutStep("Eagle UI modes", "To help with this, there are a few <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/settings.html#ui-modes'>UI modes</a> for different use cases of EAGLE.", function(){return $("#settingUserInterfaceModeValue")})
    .setWaitType(TutorialStep.Wait.Modal)
    .setPreFunction(function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryUserOptions');})
    .setBackPreFunction( function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryUserOptions');})

newTut.newTutStep("Well Done!", "You have completed the quick introduction tutorial! Be sure to check our <a target='_blank' href='https://eagle-dlg.readthedocs.io'>online documentation</a> for additional help and guidance. To continue to our tutorial on graph building press <a  onclick='TutorialSystem.initiateTutorial(`Graph Building`)' href='#'>here!</a>", function(){return $("#logicalGraphParent")})
