import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

let activeTut : Tutorial 
let activeTutStepsNo = 0;
let activeTutCurrentStep = 0;

export class Tutorial {
    private name : string;
    private description : string;
    private tutorialSteps : TutorialStep[];

    constructor(name: string,description: string, tutorialSteps: TutorialStep[]){
        this.name = name;
        this.description = description;
        this.tutorialSteps = tutorialSteps;
    }

    getTutorialSteps = () : TutorialStep[] => {
        return this.tutorialSteps;
    }

    getName = () : string => {
        return this.name;
    }

    getDescription = () : string => {
        return this.description;
    }

    initiateTutorial = (tutorialName:string) : void => {
        const that = this;

        Eagle.tutorials.forEach(function(tut){
            if(tutorialName === tut.getName()){
                //this is the requsted tutorial
                activeTut = tut
                activeTutStepsNo = tut.getTutorialSteps().length
                activeTutCurrentStep = 1
                that.initiateTutStep()
            }
        })
    }

    initiateTutStep = () :void => {
        const that = this;

        var tutStep = activeTut.getTutorialSteps()[activeTutCurrentStep-1]

        //if there is a preFunction set, then we execute it here
        var preFunction = tutStep.getPreFunct()
        if(preFunction != ""){
            eval(preFunction)
            setTimeout(
                function() 
                {
                    that.pickStepType(tutStep)
                }, 500);
        }else{
            that.pickStepType(tutStep)
        }

            
    }

    pickStepType = (tutStep:TutorialStep) :void => {
        const that = this;

        //call the correct function depending on which type of tutorial step this is
        if(tutStep.getType() === TutorialStep.Type.Info){
            that.initiateInfoStep(tutStep)
        }else if(tutStep.getType() === TutorialStep.Type.Press){
            that.initiatePressStep(tutStep)
        }else if(tutStep.getType() === TutorialStep.Type.Input){
            that.initiateInputStep(tutStep)
        }else if(tutStep.getType() === TutorialStep.Type.Condition){
            const condition = '' //this should be a link to another function that returns a boolean value
            that.initiateConditionStep(tutStep,condition)
        }
    }

    initiateInfoStep = (tutStep:TutorialStep) : void => {
        this.highlightStepTarget(tutStep.getSelector())
        this.openInfoPopUp(activeTut, tutStep)
    }

    initiatePressStep = (tutStep:TutorialStep) : void => {
        console.log('initiating text step')
    }

    initiateInputStep = (tutStep:TutorialStep) : void => {
        console.log('initiating text step')
    }

    initiateConditionStep = (tutStep:TutorialStep, condition:string) : void => {
        console.log('initiating text step')
    }

    highlightStepTarget = (selector:string) : void => {
        var coords = $(selector).offset()
        var docHeight = $(document).height()
        var docWidth = $(document).width()
        var top_y = coords.top
        var top = docHeight - top_y
        var right_x = coords.left+$(selector).outerWidth()
        var bottom_y = coords.top+$(selector).outerHeight()
        var bottom = docHeight - bottom_y
        var left_x = coords.left
        var left = docWidth - left_x

        //in order to darken the screen save the selection target, we must add four divs. above, below and on each side of the element
        //top
        $('body').append("<div class='tutorialHighlight' style='top:0px; right:0px;bottom:"+top+"px;left:0px;'></div>")
        //right
        $('body').append("<div class='tutorialHighlight' style='top:"+top_y+"px; right:0px;bottom:"+bottom+"px;left:"+right_x+"px;'></div>")
        //bottom
        $('body').append("<div class='tutorialHighlight' style='top:"+bottom_y+"px; right:0px;bottom:0px;left:0px;'></div>")
        //left
        $('body').append("<div class='tutorialHighlight' style='top:"+top_y+"px; right:"+left+"px;bottom:"+bottom+"px;left:0px;'></div>")
    }   

    openInfoPopUp = (tut:Tutorial, step:TutorialStep) :void => {

        var currentSelector = step.getSelector()

        //figuring out where there is enough space to place the tutorial
        var selectedLocationX = currentSelector.offset().left+(currentSelector.width()/2)
        var selectedLocationY = currentSelector.offset().top + currentSelector.outerHeight()
        var docWidth = $(document).width()
        var docHeight = $(document).height()

        var orientation = 'tutorialRight'
        
        if( currentSelector.outerWidth() === docWidth){
            //if this is the case then we are looking at an object that is set to 100% of the sceen 
            //such as the navbar or canvas. we will then position the tutorial in the middle of the object
            selectedLocationX = selectedLocationX
            if((docHeight - currentSelector.outerHeight())<250){
                selectedLocationY = selectedLocationY -  (currentSelector.height() / 2)
                orientation = 'tutorialRight tutorialMiddle'
            }
        }else if(docWidth-selectedLocationX<700){
            orientation = 'tutorialLeft'
            selectedLocationX = selectedLocationX-660-(currentSelector.width()/2)
            if (docHeight-selectedLocationY<250){
                orientation = 'tutorialLeftTop'
                selectedLocationY = selectedLocationY-290
            }
        }else if (docWidth-selectedLocationX>700&&docHeight-selectedLocationY<250){
            orientation = 'tutorialRightTop'
            selectedLocationY = selectedLocationY-290
        }

        //creating the html tooltip before appending
        var tooltipPopUp

        tooltipPopUp = "<div id='tutorialInfoPopUp' class='"+orientation+"' style='left:"+selectedLocationX+"px;top:"+selectedLocationY+"px;'>"
            tooltipPopUp = tooltipPopUp + "<div class='tutorialArrowContainer'>"

                tooltipPopUp = tooltipPopUp + "<img src='static/assets/img/tooltip_arrow.svg'></img>"

                tooltipPopUp = tooltipPopUp + "<div class='tutorialContent'>"
                    tooltipPopUp = tooltipPopUp + "<div class='tutorialInfoTitle'>"
                        tooltipPopUp = tooltipPopUp + "<h4>"+step.getTitle()+"</h4>"
                    tooltipPopUp = tooltipPopUp + "</div>"
                    tooltipPopUp = tooltipPopUp + "<div class='tutorialInfoText'>"
                        tooltipPopUp = tooltipPopUp + "<span>"+step.getText()+"</span>"
                    tooltipPopUp = tooltipPopUp + "</div>"
                    tooltipPopUp = tooltipPopUp + "<div class='tutorialInfoButtons'>"
                        if(activeTutCurrentStep>1){
                            tooltipPopUp = tooltipPopUp + "<button class='tutPreviousBtn' onclick='eagle.tutorial().tutButtonPrev()'>Previous</button>"
                        }
                        if(activeTutCurrentStep<activeTutStepsNo){
                            tooltipPopUp = tooltipPopUp + "<button class='tutNextBtn' onclick='eagle.tutorial().tutButtonNext()'>Next</button>"
                        }
                        tooltipPopUp = tooltipPopUp + "<span class='tutProgress'>"+ activeTutCurrentStep +" of "+activeTutStepsNo+"</span>"
                        tooltipPopUp = tooltipPopUp + "<button class='tutEndBtn' onclick='eagle.tutorial().tutButtonEnd()'>Exit</button>"
                    tooltipPopUp = tooltipPopUp + "</div>"
                tooltipPopUp = tooltipPopUp + "</div>"

            tooltipPopUp = tooltipPopUp + "</div>"
        tooltipPopUp = tooltipPopUp + "</div>"

        $('body').append(tooltipPopUp)
    }

    closeInfoPopUp = () : void =>{
        $("#tutorialInfoPopUp").remove()
        $(".tutorialHighlight").remove()
    }

    tutButtonNext = () : void => {
        this.closeInfoPopUp()
        activeTutCurrentStep ++
        this.initiateTutStep()
    }

    tutButtonPrev = () : void => {
        if(activeTutCurrentStep>1){
            this.closeInfoPopUp()
            activeTutCurrentStep --
            this.initiateTutStep()
        }
    }

    tutButtonEnd = () : void => {
        this.closeInfoPopUp()
    }
}

export class TutorialStep {
    private title : string;
    private text : string;
    private type : TutorialStep.Type;
    private selector : JQuery<HTMLElement>;
    private preFunction : string;

    constructor(title : string, text : string, type : TutorialStep.Type, selector:JQuery<HTMLElement>, preFunction:string){
        this.title = title;
        this.text = text;
        this.type = type;
        this.selector = selector;
        this.preFunction = preFunction;
    }

    getTitle = () : string => {
        return this.title;
    }

    getText = () : string => {
        return this.text;
    }

    getType = () : TutorialStep.Type => {
        return this.type;
    }

    getSelector = () : any => {
        return this.selector;
    }

    getPreFunct = () : any => {
        return this.preFunction;
    }

}

export namespace TutorialStep {
    export enum Type {
        Info,
        Press,
        Input,
        Condition
    }
}

export const tutorialArray = [
    new Tutorial(
        "Test Tutorial",
        'This tutorial is for testing purposes of the tutorial system',
        [
            new TutorialStep("Snap To Grid", "Toggle snap-to-grid behaviour within the graph editor.This allows you to snap nodes in the graph to a grid to keep thing nice and clean!", TutorialStep.Type.Info, $('#toggleSnapToGrid'),""),
            new TutorialStep("Check For Component Upgrades", "This button checks if there is an updated version of the selected component at the source link", TutorialStep.Type.Info, $("#checkForComponentUpdates"),""),
            new TutorialStep("Settings", "This button shows the settings menu. In here you are able to tailor eagle to the workflow you intend to apply it for.", TutorialStep.Type.Info, $("#settings"),""),
            new TutorialStep("Palettes", "This is where the palettes can be found and managed. Plattes contain components that are the building blocks for creating a graph.", TutorialStep.Type.Info, $(".leftWindow"),""),
            new TutorialStep("Active Panel", "There are sever al different tabs with actions to be found here.", TutorialStep.Type.Info, $(".rightWindowDisplay"),""),
            new TutorialStep("Active Panel", "There are sever al different tabs with actions to be found here.", TutorialStep.Type.Info, $("#graphNameWrapper"),""),
            new TutorialStep("Active Panel", "There are sever al different tabs with actions to be found here.", TutorialStep.Type.Info, $("#graphArea"),""),
        ]
    ),
    new Tutorial(
        "Quick Start Tutorial",
        'This tutorial is an introductory tour around Eagle to get the user familiar with the user interface.',
        [
            new TutorialStep("Welcome to Eagle!", "Welcome to a quickstart tutorial for EAGLE, the Editor for the Advanced Graph Language Environment. Abort anytime using the 'exit' button or ESC key.", TutorialStep.Type.Info, $("#eagleAndVersion a"),""),
            new TutorialStep("User Interface Element Tooltips", "Much of Eagle's interface is iconised. However, you can always hover on elements to get more information on they do.", TutorialStep.Type.Info, $("#navbarSupportedContent .btn-group"),""),
            new TutorialStep("Graph Options", "Here you are able to load, save or create graphs", TutorialStep.Type.Info, $("#navbarDropdownGraph"),""),
            new TutorialStep("Repositories Tab", "You can browse and load graphs from linked github repositories here.", TutorialStep.Type.Info, $("#rightWindowModeRepositories"),"$('#rightWindowModeRepositories').click()"),
            new TutorialStep("Settings", "The settings in Eagle include user experience and interface related options. By default, Eagle is simplified by hiding a lot of functionality via the UI modes. To find out more check our <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/settings.html#settings'>settings documentation</a>.", TutorialStep.Type.Info, $("#settings"),""),
            new TutorialStep("Setup External Services", "In the external services section of the settings you are able to set up your github access token, feel free to do so now.", TutorialStep.Type.Info, $("#settingGitHubAccessTokenValue"),"eagle.openSettings();$('#settingCategoryExternalServices').click()"),
            new TutorialStep("Saving Settings", "Settings only apply once you hit 'ok'. If you've changed something and dont wish to save it, you are able to cancel.", TutorialStep.Type.Info, $("#settingsModalAffirmativeButton"),""),
            new TutorialStep("Key Attributes Table", "This is where you can tweak the key attributes of a graph. These Key attributes are set by a Graph's or Component's creator.", TutorialStep.Type.Info, $("#openKeyParameterTable"),"eagle.openSettings()"),
            new TutorialStep("Keyboard Shortcuts", "To get through these menus quicker you can view our keyboard shurtcuts here. To access this modal, find it in the navbar under 'Help' or simply press 'K'.", TutorialStep.Type.Info, $("#shortcutsModal"),"eagle.openShortcuts()"),
            new TutorialStep("Setting up the translator", "In the Translator tab you are able to set up the translator url and settigns.", TutorialStep.Type.Info, $("#rightWindowModeTranslation"),"eagle.openShortcuts();eagle.rightWindow().mode(Eagle.RightWindowMode.TranslationMenu);eagle.rightWindow().shown(true);"),
        
        ]
    )
]

