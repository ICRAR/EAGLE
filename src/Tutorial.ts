import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

let activeTut = '';
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
        console.log('initiating tut')
        const that = this;

        Eagle.tutorials.forEach(function(tut){
            if(tutorialName === tut.getName()){
                //this is the requsted tutorial
                console.log(tut.getName())
                activeTut = tut.getName()
                activeTutStepsNo = tut.getTutorialSteps().length
                activeTutCurrentStep = -1
                console.log(activeTut)
                console.log(activeTutStepsNo)
                console.log(activeTutCurrentStep)
                that.initiateNextStep()
            }
        })
    }

    initiateNextStep = () :void => {
        const that = this;

        Eagle.tutorials.forEach(function(tut){
            if(activeTut === tut.getName()){
                activeTutCurrentStep ++
                console.log(activeTutCurrentStep)

                var tutStep = tut.getTutorialSteps()[activeTutCurrentStep]
                console.log(tutStep.getText())

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
        })
    }

    initiateInfoStep = (tutStep:TutorialStep) : void => {
        console.log('initiating text step')
        this.highlightStepTarget(tutStep.getSelector())
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
        console.log('initiating step target highlighter')
        $(selector).addClass('bopped')
        var coords = $(selector).offset()
        var docHeight = $(document).height()
        var docWidth = $(document).width()
        var top_y = coords.top
        var top = docHeight - top_y
        var right_x = coords.left+$(selector).outerWidth()
        var right = docWidth - right_x
        var bottom_y = coords.top+$(selector).outerHeight()
        var bottom = docHeight - bottom_y
        var left_x = coords.left
        var left = docWidth - left_x
        console.log(coords, $(selector).width(), $(selector).height())



        //in order to darken the screen save the selection target, we must add four divs. above, below and on each side of the element
        //top
        $('body').append("<div class='tutorialHighlight' style='top:0px; right:0px;bottom:"+top+"px;left:0px;'></div>")
        //right
        $('body').append("<div class='tutorialHighlight' style='top:"+coords.top+"px; right:0px;bottom:"+bottom+"px;left:"+right_x+"px;'></div>")
        //bottom
        $('body').append("<div class='tutorialHighlight' style='top:"+bottom_y+"px; right:0px;bottom:0px;left:0px;'></div>")
        //left
        $('body').append("<div class='tutorialHighlight' style='top:"+coords.top+"px; right:"+left+"px;bottom:"+bottom+"px;left:0px;'></div>")

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
            new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "#toggleSnapToGrid"),
            new TutorialStep("Step title", "step text2", TutorialStep.Type.Info, "#paletteList"),
            new TutorialStep("Step title", "step text3", TutorialStep.Type.Info, "#settings"),
        ]
    ),
    new Tutorial(
        "Test Tutorial2",
        'This tutorial is for testing purposes of the tutorial system',
        [
            new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "#graphArea"),
            new TutorialStep("Step title", "step text2", TutorialStep.Type.Info, "#paletteList"),
            new TutorialStep("Step title", "step text3", TutorialStep.Type.Info, "#settings"),
        ]
    )
]

