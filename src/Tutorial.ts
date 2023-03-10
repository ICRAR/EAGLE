import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

let activeTut : Tutorial 
let activeTutStepsNo = 0;
let activeTutCurrentStep = 0;
var waitForElementTimer:number = null
var cooldown:boolean = false

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
                that.initiateTutStep('next')
            }
        })
        this.initiateTutQuickSelect()
    }

    initiateTutQuickSelect = () : void => {
        var that = this
        $("body").on('keydown.tutEventListener',function(e){

            switch(e.which) {
                case 37: // left
                    that.tutButtonPrev()
                break;
        
                case 38: // up
                    that.tutButtonPrev()
                break;
        
                case 39: // right
                    if(activeTut.getTutorialSteps()[activeTutCurrentStep-1].getType() != TutorialStep.Type.Press){
                        that.tutButtonNext() 
                    }
                break;
        
                case 40: // down
                    that.tutButtonNext()
                break;

                case 27: //escape
                e.preventDefault()
                    that.tutButtonEnd()
                break;
        
                default: return; // exit this handler for other keys
            }
        })
    }

    //cooldown function that prevents too many actions that would cause the tutorial steps to go out of whack
    startCooldown = () : void => {
        cooldown = true
        setTimeout(function(){
            cooldown = false
        }, 500)
    }

    initiateTutStep = (direction:string) :void => {
        const eagle = Eagle.getInstance()

        var tutStep = activeTut.getTutorialSteps()[activeTutCurrentStep-1]

        //if there is a preFunction set, then we execute it here
        var preFunction

        if(direction === 'next'){
            preFunction = tutStep.getPreFunct()
        }else if(direction === 'prev'){
            preFunction = tutStep.getBackPreFunct()
        }
        
        if(preFunction != null){
            preFunction(eagle)
        }
        
        //we always pass through the wait funciton, it is decided there if we actully wait or not
        this.initiateWaitForElement(tutStep.getWaitType())
    }

    initiateWaitForElement = (waitType:Wait.Type) :void => {
        if(waitType===Wait.Type.None){
            this.pickStepType(activeTut.getTutorialSteps()[activeTutCurrentStep-1],null)
        }else{
            //we set a two second timer, the wait will check every .1 seconds for two seconds at which point it is timed out and we abort the tut
            waitForElementTimer = setInterval(function(){activeTut.waitForElement(waitType)}, 100);  
            setTimeout(function(){
                if(waitForElementTimer != null){
                    clearTimeout(waitForElementTimer);
                    waitForElementTimer = null;
                    console.warn('waiting for next tutorial step element timed out')
                }
            }, 2000)
        }
    }

    waitForElement = (waitType:Wait.Type) :void => {
        var tutStep = activeTut.getTutorialSteps()[activeTutCurrentStep-1]
        var elementAvailable = false
        var selectorElement = tutStep.getSelector()
        var alternateHighlightSelector = null

        if(waitType === Wait.Type.Modal){
            //in  case of a modal we make sure the selector is for the modal, we then check if it has the class 'show'
            //we also pass this modal selector to the highlighting function, so whole modal is highlighted, 
            //but the arrow still points at a specific object in the modal
            if(!selectorElement().hasClass('modal')){
                selectorElement = selectorElement().closest('.modal')
                alternateHighlightSelector = selectorElement
            }else{
                selectorElement = selectorElement()
            }
            elementAvailable = selectorElement.hasClass('show')
        }else if (waitType === Wait.Type.Element){
            if(selectorElement().length){
                elementAvailable = true
            }else{
                return
            }
        }else{
            console.warn('no Wait type for the tutorial is set')
            return
        }
       
        if(elementAvailable){
            this.pickStepType(tutStep, alternateHighlightSelector)
            clearTimeout(waitForElementTimer);
            waitForElementTimer = null;
        }else{
            return
        }
    }

    pickStepType = (tutStep:TutorialStep, alternateHighlightSelector:JQuery<HTMLElement>) :void => {
        const that = this;

        //call the correct function depending on which type of tutorial step this is
        if(tutStep.getType() === TutorialStep.Type.Info){
            that.initiateInfoStep(tutStep, alternateHighlightSelector)
        }else if(tutStep.getType() === TutorialStep.Type.Press){
            that.initiatePressStep(tutStep,alternateHighlightSelector)
        }else if(tutStep.getType() === TutorialStep.Type.Input){
            that.initiateInputStep(tutStep,alternateHighlightSelector)
        }else if(tutStep.getType() === TutorialStep.Type.Condition){
            const condition = '' //this should be a link to another function that returns a boolean value
            that.initiateConditionStep(tutStep,condition,alternateHighlightSelector)
        }
    }

    //normal info step
    initiateInfoStep = (tutStep:TutorialStep,alternateHighlightSelector:JQuery<HTMLElement>) : void => {
        var selectorElement = tutStep.getSelector()
        //the alternate highlight selector is for modals in which case we highlight the whole modal while the arrow points at a specific child
        if(alternateHighlightSelector != null){
            this.highlightStepTarget(alternateHighlightSelector)
        }else{
            this.highlightStepTarget(selectorElement())
        }
        this.openInfoPopUp()
    }

    //a selector press step
    initiatePressStep = (tutStep:TutorialStep,alternateHighlightSelector:JQuery<HTMLElement>) : void => {
        var selectorElement = tutStep.getSelector()
        if(alternateHighlightSelector != null){
            this.highlightStepTarget(alternateHighlightSelector)
        }else{
            this.highlightStepTarget(selectorElement())
        }
        const eagle = Eagle.getInstance()

        selectorElement().on('click.tutButtonListener',eagle.tutorial().tutPressStepListener).addClass('tutButtonListener')

        this.openInfoPopUp()
    }

    //these are ground work for fufture tutorial system functionality
    initiateInputStep = (tutStep:TutorialStep,alternateHighlightSelector:JQuery<HTMLElement>) : void => {
        console.log('initiating input step')
    }

    initiateConditionStep = (tutStep:TutorialStep, condition:string,alternateHighlightSelector:JQuery<HTMLElement>) : void => {
        console.log('initiating condition step')
    }

    highlightStepTarget = (selector:JQuery<HTMLElement>) : void => {
        
        //in order to darken the screen save the selection target, we must add divs on each side of the element.
        var coords = selector.offset()
        var docHeight = $(document).height()
        var docWidth = $(document).width()
        var top_actual = coords.top
        var top = docHeight - top_actual
        var right = coords.left+$(selector).outerWidth()
        var bottom_actual = coords.top+$(selector).outerHeight()
        var bottom = docHeight - bottom_actual
        var left = docWidth - coords.left

        //top
        $('body').append("<div class='tutorialHighlight' style='top:0px; right:0px;bottom:"+top+"px;left:0px;'></div>")
        //right
        $('body').append("<div class='tutorialHighlight' style='top:"+top_actual+"px; right:0px;bottom:"+bottom+"px;left:"+right+"px;'></div>")
        //bottom
        $('body').append("<div class='tutorialHighlight' style='top:"+bottom_actual+"px; right:0px;bottom:0px;left:0px;'></div>")
        //left
        $('body').append("<div class='tutorialHighlight' style='top:"+top_actual+"px; right:"+left+"px;bottom:"+bottom+"px;left:0px;'></div>")
    }   

    openInfoPopUp = () :void => {

        var step = activeTut.getTutorialSteps()[activeTutCurrentStep-1]
        var currentSelector = step.getSelector()
        //figuring out where there is enough space to place the tutorial
        var selectedLocationX = currentSelector().offset().left+(currentSelector().width()/2)
        var selectedLocationY = currentSelector().offset().top + currentSelector().outerHeight()
        var docWidth = $(document).width()
        var docHeight = $(document).height()

        var orientation = 'tutorialRight'
        
        if( currentSelector().outerWidth() === docWidth){
            //if this is the case then we are looking at an object that is set to 100% of the sceen 
            //such as the navbar or canvas. we will then position the tutorial in the middle of the object
            selectedLocationX = selectedLocationX
            if((docHeight - currentSelector().outerHeight())<250){
                selectedLocationY = selectedLocationY -  (currentSelector().height() / 2)
                orientation = 'tutorialRight tutorialMiddle'
            }
        }else if(docWidth-selectedLocationX<700){
            orientation = 'tutorialLeft'
            selectedLocationX = selectedLocationX-660-(currentSelector().width()/2)
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
                        if(activeTutCurrentStep<activeTutStepsNo && step.getType() != TutorialStep.Type.Press){
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
        if(cooldown === false){
            if(activeTutCurrentStep<activeTutStepsNo){
                this.closeInfoPopUp()
                activeTutCurrentStep ++
                this.initiateTutStep('next')
                this.startCooldown()
            }else{
                this.tutButtonEnd()
            }
        }
    }

    tutButtonPrev = () : void => {
        if(cooldown === false){
            if(activeTutCurrentStep>1){
                this.closeInfoPopUp()
                activeTutCurrentStep --
                this.initiateTutStep('prev')
                this.startCooldown()
            }
        }
    }

    tutButtonEnd = () : void => {
        this.closeInfoPopUp()
        $('body').off('keydown.tutEventListener');
        $('.tutButtonListener').off('click.tutButtonListener')
    } 

    tutPressStepListener = () : void => {
        $('.tutButtonListener').off('click.tutButtonListener')
        this.tutButtonNext()
    }
}

export class TutorialStep {
    private title : string;
    private text : string;
    private type : TutorialStep.Type;
    private waitType : Wait.Type;
    private selector : () => void;
    private preFunction : (eagle:Eagle) => void;
    private backPreFunction : (eagle:Eagle) => void;

    constructor(title : string, text : string, type : TutorialStep.Type,waitType: Wait.Type, selector:() => void, preFunction:(eagle:Eagle) => void, backPreFunction:(eagle:Eagle) => void){
        this.title = title;
        this.text = text;
        this.type = type;
        this.waitType = waitType
        this.selector = selector;
        this.preFunction = preFunction;
        this.backPreFunction = backPreFunction;
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

    getWaitType = () : Wait.Type => {
        return this.waitType;
    }

    getSelector = () : any => {
        return this.selector;
    }

    getPreFunct = () : any => {
        return this.preFunction;
    }

    getBackPreFunct = () : any => {
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
}

export namespace Wait {
    export enum Type {
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
            new TutorialStep("Welcome to Eagle!", "Welcome to a quickstart tutorial for EAGLE, the Editor for the Advanced Graph Language Environment. Abort anytime using the 'exit' button or ESC key.", TutorialStep.Type.Info,Wait.Type.None, function(){return $("#eagleAndVersion a")},null,null),
            new TutorialStep("User Interface Element Tooltips", "Much of Eagle's interface is iconised. However, you can always hover on elements to get more information on they do.", TutorialStep.Type.Info,Wait.Type.None, function(){return $("#navbarSupportedContent .btn-group")},null,null),
            new TutorialStep("Graph Options", "Here you are able to load, save or create graphs", TutorialStep.Type.Info,Wait.Type.None, function(){return $("#navbarDropdownGraph")},null,null),
            new TutorialStep("Repositories Tab", "You can browse and load graphs from linked github repositories here.", TutorialStep.Type.Info,Wait.Type.Element, function(){return $("#rightWindowModeRepositories")},function(eagle){$('#rightWindowModeRepositories').click();},function(eagle){$('#rightWindowModeRepositories').click();}),
            new TutorialStep("Click To Open Settings", "The settings in Eagle include user experience and interface related options. By default, Eagle is simplified by hiding a lot of functionality via the UI modes. To find out more check our <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/settings.html#settings'>settings documentation</a>.", TutorialStep.Type.Press,Wait.Type.None, function(){return $("#settings")},null,function(eagle){eagle.closeSettings()}),
            new TutorialStep("Setup External Services", "In the external services section of the settings you are able to set up your github access token, feel free to do so now.", TutorialStep.Type.Info,Wait.Type.Modal, function(){return $("#settingTranslatorURLValue")},function(eagle){eagle.openSettings();$('#settingCategoryExternalServices').click();},function(eagle){eagle.openSettings();$('#settingCategoryExternalServices').click();}),
            new TutorialStep("Setup your git access token", "Setting up a github access token is necessary for getting full access to your git repositories. feel free, to add one now.", TutorialStep.Type.Info,Wait.Type.Modal, function(){return $("#settingGitHubAccessTokenValue")},function(eagle){eagle.openSettings();$('#settingCategoryExternalServices').click();},function(eagle){eagle.openSettings();$('#settingCategoryExternalServices').click();}),
            new TutorialStep("Click To Save Settings", "Press 'Ok' to save your changes. You are also able to revert the changes you made by hitting 'cancel'", TutorialStep.Type.Press,Wait.Type.Modal, function(){return $("#settingsModalAffirmativeButton")},function(eagle){eagle.openSettings();$('#settingCategoryExternalServices').click();},function(eagle){eagle.openSettings();$('#settingCategoryExternalServices').click();}),
            new TutorialStep("Key Attributes Table", "This is where you can tweak the key attributes of a graph. These Key attributes are set by a Graph's or Component's creator.", TutorialStep.Type.Info,Wait.Type.None, function(){return $("#openKeyParameterTable")},function(eagle){eagle.closeSettings()},function(eagle){eagle.closeShortcuts()}),
            new TutorialStep("Keyboard Shortcuts", "To get through these menus quicker you can view our keyboard shurtcuts here. To access this modal, find it in the navbar under 'Help' or simply press 'K'.", TutorialStep.Type.Info,Wait.Type.Modal, function(){return $("#shortcutsModal")},function(eagle){eagle.openShortcuts()},function(eagle){eagle.openShortcuts()}),
            new TutorialStep("Setting up the translator", "In the Translator tab you are able to set up the translator url and settigns.", TutorialStep.Type.Info,Wait.Type.None, function(){return $("#rightWindowModeTranslation")},function(eagle){eagle.closeShortcuts();eagle.rightWindow().mode(Eagle.RightWindowMode.TranslationMenu);eagle.rightWindow().shown(true);},function(eagle){eagle.rightWindow().shown(true);}),
            new TutorialStep("Translating", "If youve set up everything so far, you should be able to deploy the translator. More information on translation on our <a target='_blank' href='https://eagle-dlg.readthedocs.io/en/master/graphs.html#templates-and-graphs'>templates and graphs documentation</a>", TutorialStep.Type.Info,Wait.Type.None, function(){return $("#navDeployBtn a")},null,null),

        ]
    )
]

