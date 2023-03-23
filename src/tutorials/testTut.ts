import {TutorialStep, TutorialSystem} from '../Tutorial';

const newTut = TutorialSystem.newTutorial('Test Tutorial', 'This tutorial is for testing purposes.')

newTut.newTutStep("Welcome to the Hello World tutorial!", "You can quit this tutorial anytime using the 'exit' button or ESC key. Please refer to the main <a target='_blank' href='https://eagle-dlg.readthedocs.io'>documentation</a> for in-depth information.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Create a New Graph", "To create a new graph select 'Create New Graph' under 'graph -> new -> new Graph'", function(){return $("#navbarDropdownGraph")})
.setAlternateHighlightTargetFunc(function(){return $("#logicalGraphParent")})

newTut.newTutStep("Graph Canvas", "In the graph canvas you can construct graphs using components from the palettes in the Palette Panel on the left.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Right Panel", "Multipurpose panel with several tabs offering a variety of functions.", function(){return $(".rightWindow")})
