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
        $(selector).addClass('bopped')
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

        //figuring out if there is enough space to place the tutorial to the right
        var selectedLocationX = $(step.getSelector()).offset().left+$(step.getSelector()).width()
        var selectedLocationY = $(step.getSelector()).offset().top + $(step.getSelector()).height()
        var docWidth = $(document).width()
        var docHeight = $(document).height()

        var orientation = 'tutorialRight'
        if(docWidth-selectedLocationX<700){
            orientation = 'tutorialLeft'
            selectedLocationX = selectedLocationX-660-$(step.getSelector()).width()
            if (docHeight-selectedLocationY<250){
                orientation = 'tutorialLeftTop'
                selectedLocationY = selectedLocationY-290
            }
        }else if (docWidth-selectedLocationX>700&&docHeight-selectedLocationY<250){
            orientation = 'tutorialRightTop'
            selectedLocationY = selectedLocationY-290
        }

        var tooltipPopUp

        tooltipPopUp = "<div id='tutorialInfoPopUp' class='"+orientation+"' style='left:"+selectedLocationX+"px;top:"+selectedLocationY+"px;'>"
            tooltipPopUp = tooltipPopUp + "<div class='tutorialArrowContainer'>"

                tooltipPopUp = tooltipPopUp + "<img src='static/assets/img/tooltip_arrow.svg'></img>"

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
                    tooltipPopUp = tooltipPopUp + "<button class='tutEndBtn' onclick='eagle.tutorial().tutButtonEnd()'>End</button>"
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
    private selector : string;

    constructor(title : string, text : string, type : TutorialStep.Type, selector:string){
        this.title = title;
        this.text = text;
        this.type = type;
        this.selector = selector;
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
            new TutorialStep("Snap To Grid", "Toggle snap-to-grid behaviour within the graph editor.This allows you to snap nodes in the graph to a grid to keep thing nice and clean!", TutorialStep.Type.Info, "#toggleSnapToGrid"),
            new TutorialStep("Check For Component Upgrades", "This button checks if there is an updated version of the selected component at the source link", TutorialStep.Type.Info, "#checkForComponentUpdates"),
            new TutorialStep("Settings", "This button shows the settings menu. In here you are able to tailor eagle to the workflow you intend to apply it for.", TutorialStep.Type.Info, "#settings"),
            new TutorialStep("Palettes", "This is where the palettes can be found and managed. Plattes contain components that are the building blocks for creating a graph.", TutorialStep.Type.Info, ".leftWindowDisplay"),
            new TutorialStep("Active Panel", "There are sever al different tabs with actions to be found here.", TutorialStep.Type.Info, ".rightWindowDisplay"),
        ]
    ),
    new Tutorial(
        "Test Tutorial2",
        'This tutorial is for testing purposes of the tutorial system',
        [
            new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "#graphArea"),
            new TutorialStep("Step title", "step text2", TutorialStep.Type.Info, "#checkForComponentUpdates"),
            new TutorialStep("Step title", "step text3", TutorialStep.Type.Info, "#settings"),
        ]
    )
]

