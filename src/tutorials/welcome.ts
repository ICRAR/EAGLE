import {TutorialStep, TutorialSystem} from '../Tutorial';
import { Utils } from '../Utils';

const newTut = TutorialSystem.newTutorial('Welcome', 'This Tutorial is an introductory tour of how to get started.')

newTut.newTutStep("Welcome to Eagle!", "The Editor for the Advanced Graph Language Environment. This is an introduction on how to get started. You can quit this tutorial anytime using the 'exit' button or ESC key. Please refer to the main <a target='_blank' href='https://eagle-dlg.readthedocs.io'>documentation</a> for in-depth information.", function(){return $("#eagleAndVersion a")})

newTut.newTutStep("Help", "This is where you can find a lot of material to aid in learing your way around EAGLE.", function(){return $("#navbarDropdownHelp")})
.setType(TutorialStep.Type.Press)
.setBackPreFunction(function(){$('.forceShow').removeClass('forceShow');$('.modal').modal("hide");}) //allowing the graph navbar dropdown to hide

newTut.newTutStep("Tutorials", "All the avaiable tutorials, including this one, will always be available here.", function(){return $("#navTutorials")})
.setType(TutorialStep.Type.Press)
.setPreFunction(function(){TutorialSystem.activeTutCurrentStep.getTargetFunc()().parent().addClass('forceShow');$("#navbarDropdownHelp").parent().find('#navTutorials').addClass('forceShow')}) //keeping the navbar graph dropdown open
.setBackPreFunction(function(){$("#navbarDropdownHelp").parent().find('#navTutorials').removeClass('forceShow')})//allowing the 'new' drop drop down section to close

newTut.newTutStep("Well Done!", "You have completed the quick introduction tutorial! Be sure to check our <a target='_blank' href='https://eagle-dlg.readthedocs.io'>online documentation</a> for additional help and guidance. To continue to our tutorial on graph building press <a  onclick='TutorialSystem.initiateTutorial(`Graph Building`)' href='#'>here!</a>", function(){return $("#logicalGraphParent")})
