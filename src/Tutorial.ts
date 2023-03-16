import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Utils } from './Utils';


export class TutorialSystem {

    static activeTut: Tutorial //current active tutorial
    static activeTutNumSteps: number = 0;  //total number of steps in the active tutorial
    static activeTutCurrentStepIndex: number = 0;  //index of the current step in the active tutorial
    static waitForElementTimer: number = null    //this houses the time out timer when waiting for a target element to appear
    static cooldown: boolean = false //boolean if the tutorial system is currently on cooldown

    static initiateTutorial = (tutorialName: string): void => {

        Eagle.tutorials.forEach(function (tut) {
            if (tutorialName === tut.getName()) {
                //this is the requsted tutorial
                TutorialSystem.activeTut = tut
                TutorialSystem.activeTutNumSteps = tut.getTutorialSteps().length
                TutorialSystem.activeTutCurrentStepIndex = 0
                TutorialSystem.activeTut.initiateTutStep(TutorialStep.Direction.Next)
            }
        })
        TutorialSystem.addTutKeyboardShortcuts()
    }

    static addTutKeyboardShortcuts = (): void => {
        //these are the keyboard shortcuts for the tutorial system
        //by putting a .name after an even type, we are giving this specific listener a name. This allows us to remove or modify it later
        $("body").on('keydown.tutEventListener', function (e) {

            switch (e.which) {
                case 37: // left
                    TutorialSystem.activeTut.tutButtonPrev()
                    break;

                case 38: // up
                    TutorialSystem.activeTut.tutButtonPrev()
                    break;

                case 39: // right
                    if (TutorialSystem.activeTut.getTutorialSteps()[TutorialSystem.activeTutCurrentStepIndex].getType() != TutorialStep.Type.Press) {
                        TutorialSystem.activeTut.tutButtonNext()
                    }
                    break;

                case 40: // down
                    TutorialSystem.activeTut.tutButtonNext()
                    break;

                case 27: //escape
                    e.preventDefault()
                    TutorialSystem.activeTut.tutButtonEnd()
                    break;

                default: return; // exit this handler for other keys
            }
        })
    }

    //cooldown function that prevents too many actions that would cause the tutorial steps to go out of whack
    static startCooldown = (): void => {
        TutorialSystem.cooldown = true
        setTimeout(function () {
            TutorialSystem.cooldown = false
        }, 500)
    }



}

export class Tutorial {
    private name: string;
    private description: string;
    private tutorialSteps: TutorialStep[];

    constructor(name: string, description: string, tutorialSteps: TutorialStep[]) {
        this.name = name;
        this.description = description;
        this.tutorialSteps = tutorialSteps;

    }

    getTutorialSteps = (): TutorialStep[] => {
        return this.tutorialSteps;
    }

    getName = (): string => {
        return this.name;
    }

    getDescription = (): string => {
        return this.description;
    }

    initiateTutStep = (direction: TutorialStep.Direction): void => {
        const eagle = Eagle.getInstance()

        const tutStep = TutorialSystem.activeTut.getTutorialSteps()[TutorialSystem.activeTutCurrentStepIndex]
        if (tutStep.getTargetFunc()().length === 0) {
            console.warn('skipping step, selector could not be found: ', tutStep.getTargetFunc())
            this.tutButtonNext()
            return
        }

        //if there is a preFunction set, then we execute it here
        let preFunction

        if (direction === TutorialStep.Direction.Next) {
            preFunction = tutStep.getPreFunct()
        } else if (direction === TutorialStep.Direction.Prev) {
            preFunction = tutStep.getBackPreFunct()
        }

        if (preFunction != null) {
            preFunction(eagle)
        }

        //we always pass through the wait function, it is decided there if we actually wait or not
        if (tutStep.getWaitType() === TutorialStep.Wait.None) {
            this.initiateStep(TutorialSystem.activeTut.getTutorialSteps()[TutorialSystem.activeTutCurrentStepIndex], null)
        } else {
            //we set a two second timer, the wait will check every .1 seconds for two seconds at which point it is timed out and we abort the tut
            TutorialSystem.waitForElementTimer = setInterval(function () { TutorialSystem.activeTut.waitForElementThenRun(tutStep.getWaitType()) }, 100);
            setTimeout(function () {
                if (TutorialSystem.waitForElementTimer != null) {
                    clearTimeout(TutorialSystem.waitForElementTimer);
                    TutorialSystem.waitForElementTimer = null;
                    console.warn('waiting for next tutorial step element timed out')
                }
            }, 2000)
        }
    }

    waitForElementThenRun = (waitType: TutorialStep.Wait): void => {
        const tutStep = TutorialSystem.activeTut.getTutorialSteps()[TutorialSystem.activeTutCurrentStepIndex]
        let elementAvailable: boolean = false
        let targetElement: JQuery<HTMLElement> = tutStep.getTargetFunc()()
        let alternateHighlightTarget: JQuery<HTMLElement> = null

        if (waitType === TutorialStep.Wait.Modal) {
            //in  case of a modal we make sure the selector is for the modal, we then check if it has the class 'show'
            if (!targetElement.hasClass('modal')) {
                //we also pass this modal selector to the highlighting function, so whole modal is highlighted, 
                //but the arrow still points at a specific object in the modal
                if (targetElement.closest('.modal-body').length > 0) {
                    alternateHighlightTarget = targetElement.closest('.modal-body')
                } else if (targetElement.closest('.modal-footer').length > 0) {
                    alternateHighlightTarget = targetElement.closest('.modal-footer')
                } else if (targetElement.closest('.modal-header').length > 0) {
                    alternateHighlightTarget = targetElement.closest('.modal-header')
                } else {
                    alternateHighlightTarget = targetElement.closest('.modal')
                }

                targetElement = targetElement.closest('.modal')
            }

            elementAvailable = targetElement.hasClass('show')

        } else if (waitType === TutorialStep.Wait.Element) {      //in case of an element we check if the element exists
            if (targetElement.length) {
                elementAvailable = true
            } else {
                //the element has not been found yet
                return
            }
        } else {
            console.warn('no Wait type for the tutorial is set')
            return
        }

        if (elementAvailable) {
            this.initiateStep(tutStep, alternateHighlightTarget)
            clearTimeout(TutorialSystem.waitForElementTimer);
            TutorialSystem.waitForElementTimer = null;
        } else {
            return
        }
    }

    initiateStep = (tutStep: TutorialStep, alternateHighlightTarget: JQuery<HTMLElement>): void => {
        const that = this;

        //call the correct function depending on which type of tutorial step this is
        if (tutStep.getType() === TutorialStep.Type.Info) {
            that.initiateInfoStep(tutStep, alternateHighlightTarget)
        } else if (tutStep.getType() === TutorialStep.Type.Press) {
            that.initiatePressStep(tutStep, alternateHighlightTarget)
        } else if (tutStep.getType() === TutorialStep.Type.Input) {
            that.initiateInputStep(tutStep, alternateHighlightTarget)
        } else if (tutStep.getType() === TutorialStep.Type.Condition) {
            const condition = '' //this should be a link to another function that returns a boolean value
            that.initiateConditionStep(tutStep, condition, alternateHighlightTarget)
        }
    }

    //normal info step
    initiateInfoStep = (tutStep: TutorialStep, alternateHighlightTarget: JQuery<HTMLElement>): void => {
        //the alternate highlight selector is for modals in which case we highlight the whole modal while the arrow points at a specific child
        if (alternateHighlightTarget != null) {
            this.highlightStepTarget(alternateHighlightTarget)
        } else {
            this.highlightStepTarget(tutStep.getTargetFunc()())
        }
        //the little wait is waiting for the css animation of the highlighting system
        setTimeout(function () {
            TutorialSystem.activeTut.openInfoPopUp()
        }, 510);
    }

    //a selector press step
    initiatePressStep = (tutStep: TutorialStep, alternateHighlightTarget: JQuery<HTMLElement>): void => {
        const targetElement = tutStep.getTargetFunc()()
        if (alternateHighlightTarget != null) {
            this.highlightStepTarget(alternateHighlightTarget)
        } else {
            this.highlightStepTarget(targetElement)
        }
        const eagle = Eagle.getInstance()

        targetElement.on('click.tutButtonListener', eagle.tutorial().tutPressStepListener).addClass('tutButtonListener')

        //the little wait is waiting for the css animation of the highlighting system
        setTimeout(function () {
            TutorialSystem.activeTut.openInfoPopUp()
        }, 510);
    }

    //these are ground work for fufture tutorial system functionality
    initiateInputStep = (tutStep: TutorialStep, alternateHighlightTarget: JQuery<HTMLElement>): void => {
        console.log('initiating input step')
    }

    initiateConditionStep = (tutStep: TutorialStep, condition: string, alternateHighlightTarget: JQuery<HTMLElement>): void => {
        console.log('initiating condition step')
    }

    highlightStepTarget = (target: JQuery<HTMLElement>): void => {

        //in order to darken the screen save the selection target, we must add divs on each side of the element.
        const coords = target.offset()
        const docHeight = $(document).height()
        const docWidth = $(document).width()
        const top_actual = coords.top
        const top = docHeight - top_actual
        const right = coords.left + $(target).outerWidth()
        const bottom_actual = coords.top + $(target).outerHeight()
        const bottom = docHeight - bottom_actual
        const left = docWidth - coords.left

        //i am appending these once if they dont exist. they are then adjusted for each step. and finally removed when exiting the tutorial
        if ($('.tutorialHighlight').length === 0) {
            //top
            $('body').append("<div class='tutorialHighlight tutorialHighlightTop'></div>")
            //right
            $('body').append("<div class='tutorialHighlight tutorialHighlightRight'></div>")
            //bottom
            $('body').append("<div class='tutorialHighlight tutorialHighlightBottom'></div>")
            //left
            $('body').append("<div class='tutorialHighlight tutorialHighlightLeft'></div>")
        }

        //top
        $('.tutorialHighlight.tutorialHighlightTop').css({ "top": "0px", "right": "0px", "bottom": top + "px", "left": "0px" })
        //right
        $('.tutorialHighlight.tutorialHighlightRight').css({ "top": top_actual + "px", "right": "0px", "bottom": bottom + "px", "left": right + "px" })

        //bottom
        $('.tutorialHighlight.tutorialHighlightBottom').css({ "top": bottom_actual + "px", "right": "0px", "bottom": "0px", "left": "0px" })

        //left
        $('.tutorialHighlight.tutorialHighlightLeft').css({ "top": top_actual + "px", "right": left + "px", "bottom": bottom + "px", "left": "0px" })

    }

    openInfoPopUp = (): void => {

        const step = TutorialSystem.activeTut.getTutorialSteps()[TutorialSystem.activeTutCurrentStepIndex]
        const currentTarget: JQuery<HTMLElement> = step.getTargetFunc()()
        //figuring out where there is enough space to place the tutorial
        let selectedLocationX = currentTarget.offset().left + (currentTarget.width() / 2)
        let selectedLocationY = currentTarget.offset().top + currentTarget.outerHeight()
        const docWidth = $(document).width()
        const docHeight = $(document).height()

        this.closeInfoPopUp()

        let orientation = 'tutorialRight'

        if (currentTarget.outerWidth() === docWidth||currentTarget.outerHeight()/docHeight>0.7) {
            //if this is the case then we are looking at an object that is set to 100% of the sceen 
            //such as the navbar or canvas. we will then position the tutorial in the middle of the object
            selectedLocationX = selectedLocationX
            if ((docHeight - currentTarget.outerHeight()) < 250) {
                selectedLocationY = selectedLocationY - (currentTarget.height() / 2)
                if (docWidth - selectedLocationX < 700){
                    orientation = 'tutorialLeft tutorialMiddle'
                    selectedLocationX = selectedLocationX - 600 - (currentTarget.width() / 2)
                }else{
                    orientation = 'tutorialRight tutorialMiddle'
                }
            }
        } else if (docWidth - selectedLocationX < 700) {
            orientation = 'tutorialLeft'
            selectedLocationX = selectedLocationX - 660 - (currentTarget.width() / 2)
            if (docHeight - selectedLocationY < 250) {
                orientation = 'tutorialLeftTop'
                selectedLocationY = selectedLocationY - 290
            }
        } else if (docWidth - selectedLocationX > 700 && docHeight - selectedLocationY < 250) {
            orientation = 'tutorialRightTop'
            selectedLocationY = selectedLocationY - 290
        }

        //creating the html tooltip before appending
        let tooltipPopUp: string
        const activeStepIndexDisplay = TutorialSystem.activeTutCurrentStepIndex + 1

        tooltipPopUp = "<div id='tutorialInfoPopUp' class='" + orientation + "' style='left:" + selectedLocationX + "px;top:" + selectedLocationY + "px;'>"
        tooltipPopUp = tooltipPopUp + "<div class='tutorialArrowContainer'>"

        tooltipPopUp = tooltipPopUp + "<img src='static/assets/img/tooltip_arrow.svg'></img>"

        tooltipPopUp = tooltipPopUp + "<div class='tutorialContent'>"
        tooltipPopUp = tooltipPopUp + "<div class='tutorialInfoTitle'>"
        tooltipPopUp = tooltipPopUp + "<h4>" + step.getTitle() + "</h4>"
        tooltipPopUp = tooltipPopUp + "</div>"
        tooltipPopUp = tooltipPopUp + "<div class='tutorialInfoText'>"
        tooltipPopUp = tooltipPopUp + "<span>" + step.getText() + "</span>"
        tooltipPopUp = tooltipPopUp + "</div>"
        tooltipPopUp = tooltipPopUp + "<div class='tutorialInfoButtons'>"
        if (TutorialSystem.activeTutCurrentStepIndex > 0) {
            tooltipPopUp = tooltipPopUp + "<button class='tutPreviousBtn' onclick='eagle.tutorial().tutButtonPrev()'>Previous</button>"
        }
        if (TutorialSystem.activeTutCurrentStepIndex + 1 !== TutorialSystem.activeTutNumSteps && step.getType() != TutorialStep.Type.Press) {
            tooltipPopUp = tooltipPopUp + "<button class='tutNextBtn' onclick='eagle.tutorial().tutButtonNext()'>Next</button>"
        }
        tooltipPopUp = tooltipPopUp + "<span class='tutProgress'>" + activeStepIndexDisplay + " of " + TutorialSystem.activeTutNumSteps + "</span>"
        tooltipPopUp = tooltipPopUp + "<button class='tutEndBtn' onclick='eagle.tutorial().tutButtonEnd()'>Exit</button>"
        tooltipPopUp = tooltipPopUp + "</div>"
        tooltipPopUp = tooltipPopUp + "</div>"

        tooltipPopUp = tooltipPopUp + "</div>"
        tooltipPopUp = tooltipPopUp + "</div>"

        $('body').append(tooltipPopUp)
    }

    closeInfoPopUp = (): void => {
        $("#tutorialInfoPopUp").remove()
    }

    tutButtonNext = (): void => {
        if (TutorialSystem.cooldown === false) {
            if (TutorialSystem.activeTutCurrentStepIndex + 1 !== TutorialSystem.activeTutNumSteps) {
                this.closeInfoPopUp()
                TutorialSystem.activeTutCurrentStepIndex++
                this.initiateTutStep(TutorialStep.Direction.Next)
                TutorialSystem.startCooldown()
            } else {
                this.tutButtonEnd()
            }
        }
    }

    tutButtonPrev = (): void => {
        if (TutorialSystem.cooldown === false) {
            if (TutorialSystem.activeTutCurrentStepIndex > 0) {
                this.closeInfoPopUp()
                TutorialSystem.activeTutCurrentStepIndex--
                this.initiateTutStep(TutorialStep.Direction.Prev)
                TutorialSystem.startCooldown()
            }
        }
    }

    tutButtonEnd = (): void => {
        this.closeInfoPopUp()
        $('body').off('keydown.tutEventListener');
        $('.tutButtonListener').off('click.tutButtonListener').removeClass('tutButtonListener')
        $(".tutorialHighlight").remove()
    }

    tutPressStepListener = (): void => {
        $('.tutButtonListener').off('click.tutButtonListener').removeClass('tutButtonListener')
        this.tutButtonNext()
    }


    //helpers
    openSettingsSection = (tab: string): void => {
        const eagle = Eagle.getInstance()
        eagle.openSettings()
        $(tab).click()
    }

}

export class TutorialStep {
    private title: string;
    private text: string;
    private type: TutorialStep.Type;
    private waitType: TutorialStep.Wait;
    private targetFunc: () => void;
    private preFunction: (eagle: Eagle) => void;
    private backPreFunction: (eagle: Eagle) => void;

    constructor(title: string, text: string, type: TutorialStep.Type, waitType: TutorialStep.Wait, targetFunc: () => void, preFunction: (eagle: Eagle) => void, backPreFunction: (eagle: Eagle) => void) {
        this.title = title;
        this.text = text;
        this.type = type;
        this.waitType = waitType
        this.targetFunc = targetFunc;
        this.preFunction = preFunction;
        this.backPreFunction = backPreFunction;
    }

    getTitle = (): string => {
        return this.title;
    }

    getText = (): string => {
        return this.text;
    }

    getType = (): TutorialStep.Type => {
        return this.type;
    }

    getWaitType = (): TutorialStep.Wait => {
        return this.waitType;
    }

    getTargetFunc = (): any => {
        return this.targetFunc;
    }

    getPreFunct = (): any => {
        return this.preFunction;
    }

    getBackPreFunct = (): any => {
        return this.backPreFunction;
    }

}

export namespace TutorialStep {
    export enum Type {
        Info,
        Press,
        Input,
        Condition
    }

    export enum Direction {
        Next,
        Prev
    }

    export enum Wait {
        Modal,
        Element,
        None
    }
}

//add new tutorials here.
export const tutorialArray = [

    new Tutorial(
        "Quick Start Tutorial",
        'This tutorial is an introductory tour around Eagle to get the user familiar with the user interface.',
        [
            new TutorialStep("Welcome to Eagle!", "Welcome to a quickstart tutorial for EAGLE, the Editor for the Advanced Graph Language Environment. Abort the tutorial anytime using the 'exit' button or ESC key.", TutorialStep.Type.Info, TutorialStep.Wait.None, function () { return $("#eagleAndVersion a") }, null, null),
            new TutorialStep("left window", "left windows", TutorialStep.Type.Info, TutorialStep.Wait.None, function () { return $(".leftWindow") }, null, null),
            new TutorialStep("graph area", "This is the graph canvas", TutorialStep.Type.Info, TutorialStep.Wait.None, function () { return $("#logicalGraphParent") }, null, null),
            new TutorialStep("Right window", "Multipurpose window with several systems", TutorialStep.Type.Info, TutorialStep.Wait.None, function () { return $(".rightWindow") }, null, null),
            new TutorialStep("User Interface Element Tooltips", "Much of Eagle's interface is iconised. However, you can always hover over the icons to get more information on what they are doing.", TutorialStep.Type.Info, TutorialStep.Wait.None, function () { return $("#navbarSupportedContent .btn-group") }, null, function (eagle) { eagle.closeShortcuts() }),
            new TutorialStep("Keyboard Shortcuts", "To get through the functions quicker you can view our keyboard shurtcuts here. To access this modal, find it in the navbar under 'Help' or simply press 'K'.", TutorialStep.Type.Info, TutorialStep.Wait.Modal, function () { return $("#shortcutsModal") }, function (eagle) { eagle.openShortcuts() }, function (eagle) { eagle.openShortcuts() }),
            new TutorialStep("Translate Button", "Once set up, You are able to translate quickly by using this button", TutorialStep.Type.Info, TutorialStep.Wait.None, function () { return $("#navDeployBtn") }, function (eagle) { eagle.closeShortcuts() }, null),
            new TutorialStep("Graph Menu", "This menu allows you to load, save or create new graphs", TutorialStep.Type.Info, TutorialStep.Wait.None, function () { return $("#navbarDropdownGraph") },null, null),
            new TutorialStep("Palette Menu", "This menu allows you to load a palette", TutorialStep.Type.Info, TutorialStep.Wait.None, function () { return $("#navbarDropdownPalette") }, null, null),
            new TutorialStep("Help Menu", "This menu allows you view the various help options", TutorialStep.Type.Info, TutorialStep.Wait.None, function () { return $("#navbarDropdownHelp") }, null, null),
            new TutorialStep("Click To Open Settings", "The settings modal allows to cusomize EAGLE's user experience. By default, EAGLE is simplified by hiding a lot of functionality via the UI modes. To find out more check our <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/settings.html#settings'>settings documentation</a>.", TutorialStep.Type.Press, TutorialStep.Wait.None, function () { return $("#settings") }, null, function (eagle) { eagle.closeSettings() }),
            new TutorialStep("Setup the URL for the Translator Service", "This is required when you want to submit a graph for translation and execution. Feel free to enter it now.", TutorialStep.Type.Info, TutorialStep.Wait.Modal, function () { return $("#settingTranslatorURLValue") }, function (eagle) { eagle.tutorial().openSettingsSection('#settingCategoryExternalServices'); }, null),
            new TutorialStep("Setup your git access token", "Setting up the access tokens is necessary for getting access to the GitHub and GitLab repositories (see also the <a target='_blank' href='https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'>GitHub tutorial</a>). Feel free, to add one or both now.", TutorialStep.Type.Info, TutorialStep.Wait.Modal, function () { return $("#settingGitHubAccessTokenValue") }, null, null),
            new TutorialStep("DockerHub Value", "dockerhub value", TutorialStep.Type.Info, TutorialStep.Wait.Modal, function () { return $("#settingDockerHubUserNameValue") }, null, null),
            new TutorialStep("Click To Save Settings", "Press 'Ok' (or hit Enter) to save your changes. You are also able to revert the changes you made by hitting 'cancel'", TutorialStep.Type.Press, TutorialStep.Wait.Modal, function () { return $("#settingsModalAffirmativeButton") }, function (eagle) { $('#settingsModalNegativeButton').on('click.tutButtonListener', eagle.tutorial().tutPressStepListener).addClass('tutButtonListener'); }, function (eagle) { eagle.tutorial().openSettingsSection('#settingCategoryExternalServices'); $('#settingsModalNegativeButton').on('click.tutButtonListener', eagle.tutorial().tutPressStepListener).addClass('tutButtonListener'); }),
        ]
    )
]

