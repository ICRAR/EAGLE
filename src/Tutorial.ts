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
                    const condition = ''
                    that.initiateConditionStep(tutStep,condition)
                }
            }
        })
    }

    initiateInfoStep = (tutStep:TutorialStep) : void => {
        console.log('initiating text step')

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
            new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "#graphArea"),
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

