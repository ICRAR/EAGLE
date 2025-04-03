import {TutorialStep, TutorialSystem} from '../Tutorial';
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

newTut.newTutStep("Read The Docs", "This is a link to our in depth documentation on Read The Docs. There are also tutorials in video form available there.", function(){return $("#onlineDocs")})

newTut.newTutStep("Keyboard Shortcuts", "Eagle has many keyboard shortcuts to boost productivity, this is the keyboard shortcut cheat sheet. We encourage to note frequently taken actions and learning the keyboard shortcuts for them as you go.", function(){return $("#onlineDocs")})

newTut.newTutStep("Well Done!", "You have completed the quick introduction tutorial! Be sure to check our <a target='_blank' href='https://eagle-dlg.readthedocs.io'>online documentation</a> for additional help and guidance. To continue to our tutorial on graph building press <a  onclick='TutorialSystem.initiateTutorial(`Graph Building`)' href='#'>here!</a>", function(){return $("#logicalGraphParent")})
