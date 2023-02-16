import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

export class Tutorial {
    private name : string;
    private description : string;
    private tutorialSteps : TutorialStep[];


    constructor(name: string,description: string, tutorialSteps: TutorialStep[]){
        this.name = name;
        this.description = description;
        this.tutorialSteps = tutorialSteps
    }

    getTutorials = () : TutorialStep[] => {
        return this.tutorialSteps;
    }

    getName = () : string => {
        return this.name;
    }

    getDescription = () : string => {
        return this.description;
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

const x = [
    new Tutorial(
        "Test Tutorial",
        'This tutorial is for testing purposes of the tutorial system',
        [
            new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "$('#graphArea')"),
            new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "$('#paletteList')"),
            new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "$('#settings')"),
        ]
    )
]

export{x}

// Eagle.tutorial = [
//     new Tutorial(
//         "Test Tutorial",
//         'This tutorial is for testing purposes of the tutorial system',
//         [
//             new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "$('#graphArea')"),
//             new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "$('#graphArea')"),
//             new TutorialStep("Step title", "step text", TutorialStep.Type.Info, "$('#graphArea')"),
        
//         ]
//     )
// ]