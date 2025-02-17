import {TutorialStep, TutorialSystem} from '../Tutorial';

const newTut = TutorialSystem.newTutorial('Quick Start', 'This tutorial is an introductory tour around Eagle to get the user familiar with the user interface.')

newTut.newTutStep("Welcome to Eagle!", "Welcome to the basic UI tutorial for EAGLE, the Editor for the Advanced Graph Language Environment. You can quit this tutorial anytime using the 'exit' button or ESC key. Please refer to the main <a target='_blank' href='https://eagle-dlg.readthedocs.io'>documentation</a> for in-depth information.", function(){return $("#eagleAndVersion a")})

newTut.newTutStep("Left Panel", "This panel displays the components available to construct graphs. The components are organised in so-called <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/palettes.html'>Palettes</a>. By default EAGLE loads two palettes, which are part of the core system, but users can develop their own palettes as well and load them here.", function(){return $(".leftWindow")})

newTut.newTutStep("Graph Canvas", "In the graph canvas you can construct graphs using components from the palettes in the Palette Panel on the left.", function(){return $("#logicalGraphParent")})

newTut.newTutStep("Right Panel", "Multipurpose panel with several tabs offering a variety of functions.", function(){return $(".rightWindow")})

newTut.newTutStep("Hints Bar", "Keep an eye on this section to learn important shortcuts and methods. The content changes when selecting different components in the canvas.", function(){return $("#statusBar")})

newTut.newTutStep("User Interface Element Tooltips", "Much of Eagle's interface is using icons. You can always hover over the icons and most of the other elements to get more information on what they do.", function(){return $("#navbarSupportedContent .btn-group")})
    .setBackPreFunction(function (eagle) {eagle.closeShortcuts()})

newTut.newTutStep("Keyboard Shortcuts", "Many of the major functions are available through keyboard shortcuts and you can find the mapping here. To access this modal, find it in the navbar under 'Help' or simply press 'K'.", function(){return $("#shortcutsModal")})
    .setWaitType(TutorialStep.Wait.Modal)
    .setBackPreFunction(function(eagle){eagle.openShortcuts()})
    .setPreFunction(function(eagle){eagle.openShortcuts()})

newTut.newTutStep("Click To Open Settings", "The settings modal allows to customize EAGLE's user experience. By default, EAGLE is simplified by hiding a lot of functionality via the UI modes. To find out more check our <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/settings.html#settings'>settings documentation</a>. <em>To continue the tutorial please click the highlighted settings icon button!</em>", function(){return $("#settings")})
    .setType(TutorialStep.Type.Press)
    .setPreFunction(function(eagle){eagle.closeShortcuts();})
    .setBackPreFunction(function(eagle){eagle.closeSettings();})

newTut.newTutStep("Set up Eagle to how you need it.", "Eagle has a lot of functionality, as such, there are various settings that affect how eagle behaves and how much of it is hidden.", function(){return $("#settingsModal .modal-body")})
    .setWaitType(TutorialStep.Wait.Modal)
    
newTut.newTutStep("Eagle UI modes", "To help with this, there are a few <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/settings.html#ui-modes'>UI modes</a> for different use cases of EAGLE.", function(){return $("#settingUserInterfaceModeValue")})
    .setWaitType(TutorialStep.Wait.Modal)
    .setPreFunction(function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryUserOptions');})
    .setBackPreFunction( function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryUserOptions');})

newTut.newTutStep("Setup the URL for the Translator Service", "This is required when you want to submit a graph for translation and execution. The default value is correct, if the translator has been started on the same node as EAGLE. Feel free to change it now. This setting is also used to configure the function of the 'Translate' button.", function(){return $("#settingTranslatorURLValue")})
    .setWaitType(TutorialStep.Wait.Modal)
    .setPreFunction(function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryExternalServices');})

newTut.newTutStep("Setup your git access token", "Setting up the access tokens is necessary for getting access to the GitHub and GitLab repositories (see also the <a target='_blank' href='https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'>GitHub tutorial</a>). Feel free, to add one or both now.", function(){return $("#settingGitHubAccessTokenValue")})
    .setWaitType(TutorialStep.Wait.Modal)

newTut.newTutStep("DockerHub user name", "DockerHub user name setup. This is an optional setting, but required if you want to make use of docker components loaded from DockerHub", function(){return $("#settingDockerHubUserNameValue")})
    .setWaitType(TutorialStep.Wait.Modal)
    
newTut.newTutStep("Click To Save Settings", "Press 'Ok' (or hit Enter) to save your changes. You are also able to revert the changes you made by hitting 'cancel'", function(){return $("#settingsModalAffirmativeButton")})
    .setType(TutorialStep.Type.Press)
    .setWaitType(TutorialStep.Wait.Modal)
    .setPreFunction(function(eagle){$('#settingsModalNegativeButton').on('click.tutButtonListener', eagle.tutorial().tutPressStepListener).addClass('tutButtonListener');})
    .setBackPreFunction(function(eagle){eagle.tutorial().openSettingsSection('#settingCategoryExternalServices'); $('#settingsModalNegativeButton').on('click.tutButtonListener',eagle.tutorial().tutPressStepListener).addClass('tutButtonListener');$("#settingsModalAffirmativeButton").trigger("focus");})

newTut.newTutStep("Help Menu", "This menu allows you view the various help and documentation options.", function(){return $("#navbarDropdownHelp")})

newTut.newTutStep("Palette Menu", "This menu allows you to load a palette. If the more advanced interface options are switched on, you can also save and create palettes.", function(){return $("#navbarDropdownPalette")})

newTut.newTutStep("Graph Menu", "This menu allows you to load, save or create new graphs", function(){return $("#navbarDropdownGraph")})

newTut.newTutStep("Translate Button", "Once configured, you are able to translate the constructed graph quickly by using this button", function(){return $("#navDeployBtn")})

newTut.newTutStep("Well Done!", "You have completed the quick introduction tutorial! Be sure to check our <a target='_blank' href='https://eagle-dlg.readthedocs.io'>online documentation</a> for additional help and guidance. To continue to our tutorial on graph building press <a  onclick='TutorialSystem.initiateTutorial(`Graph Building`)' href='#'>here!</a>", function(){return $("#logicalGraphParent")})
