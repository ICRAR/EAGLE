import {Eagle} from './Eagle';
import { Utils } from './Utils';

export class TutorialSystem {

    static activeTut: Tutorial = null //current active tutorial
    static activeTutCurrentStep: TutorialStep //current active tutorial step
    static activeTutNumSteps: number = 0;  //total number of steps in the active tutorial
    static activeTutCurrentStepIndex: number = 0;  //index of the current step in the active tutorial
    static waitForElementTimer: number = null    //this houses the time out timer when waiting for a target element to appear
    static onCoolDown: boolean = false //boolean if the tutorial system is currently on cool down
    static conditionCheck:number = null //this stores the condition interval function

    static initiateTutorial(tutorialName: string): void {
        Eagle.tutorials.forEach(function (tut) {

            if (tutorialName === tut.getName()) {
                //this is the requested tutorial
                TutorialSystem.activeTut = tut
                TutorialSystem.activeTutNumSteps = tut.getTutorialSteps().length
                TutorialSystem.activeTutCurrentStepIndex = 0
                TutorialSystem.activeTut.initiateTutStep(TutorialStep.Direction.Next)
                TutorialSystem.addTutKeyboardShortcuts()
            }
        })
    }

    static addTutKeyboardShortcuts(): void {
        //these are the keyboard shortcuts for the tutorial system
        //by putting a .name after an event type, we are giving this specific listener a name. This allows us to remove or modify it later
        $("body").on('keydown.tutEventListener', function (event: JQuery.TriggeredEvent) {
            const e: KeyboardEvent = event.originalEvent as KeyboardEvent;

            if(TutorialSystem.activeTut===null){return} //catching a niche error
            if($("input,textarea").is(":focus")){return} //if an input or textfield is active we want to ignore the arrows, as the user might be using them to correct mistakes in typing


            switch (e.key) {
                case "ArrowLeft":
                case "ArrowUp":
                    e.preventDefault()
                    TutorialSystem.activeTut.tutButtonPrev()
                    break;

                case "ArrowRight":
                case "ArrowDown":
                    e.preventDefault()
                    if (TutorialSystem.activeTutCurrentStep.getType() === TutorialStep.Type.Info) {
                        TutorialSystem.activeTut.tutButtonNext()
                    }
                    break;

                case "Escape":
                    e.preventDefault()
                    TutorialSystem.activeTut.tutButtonEnd()
                    break;

                case "Enter":
                    e.preventDefault()
                    e.stopImmediatePropagation()
                    if(TutorialSystem.activeTutCurrentStep.getType() === TutorialStep.Type.Press){
                        $(':focus').trigger("click")
                    }
                    break;

                default: return; // exit this handler for other keys
            }
        })
    }

    // cool-down function that prevents too many actions that would cause the tutorial steps to go out of whack
    // TODO: magic number 700 here, define this a constant somewhere in the tutorial system
    static startCoolDown(): void {
        TutorialSystem.onCoolDown = true
        setTimeout(function () {
            TutorialSystem.onCoolDown = false
        }, 700)
    }

    static newTutorial(title:string, description:string) : Tutorial {
        const x = new Tutorial(
            title,
            description,
            []
        )
        tutorialArray.push(x)
        return x
    }

    static initiateFindGraphNodeIdByNodeName(name:string) : JQuery<HTMLElement> {
        const eagle = Eagle.getInstance()
        const x = $('#logicalGraph #'+eagle.logicalGraph().findNodeGraphIdByNodeName(name)+'.container')
        return x
    }

    static initiateSimpleFindGraphNodeIdByNodeName(name:string) : string {
        const eagle = Eagle.getInstance()
        const x = eagle.logicalGraph().findNodeGraphIdByNodeName(name)
        return x
    }

    static isRequestedNodeSelected(name:string) : boolean {
        //used when asking the user to select a specific node
        const eagle = Eagle.getInstance()
        if(eagle.selectedObjects().length>1 || eagle.selectedObjects().length<1){
            return false
        }
        if(name === eagle.selectedNode().getName()){
            return true
        }else{
            return false
        }
    }

    static findInPalettes(target:string) : void {
        //expand all palettes
        const paletteElements = $('#paletteList .accordion .paletteCardWrapper')
        paletteElements.each(function(){
            if(!$(this).find('.accordion-collapse').hasClass('show')){
                $(this).find('.accordion-button')[0].click()
            }
        })

        //find and scroll to the vertical location of the target node in the palette list
        const newScrollPos = $(target).position().top - 100; //the position of the target node in the palette list minus an offset 
        $('#paletteList').animate({
            scrollTop: newScrollPos
        },10);
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

    newTutStep = (title:string, description:string, selector:() => JQuery<HTMLElement>) : TutorialStep =>{
        const x = new TutorialStep(title, description, TutorialStep.Type.Info, TutorialStep.Wait.None,null, selector, null, null,false,null,null,null)
        this.tutorialSteps.push(x)
        return x
    }

    lockEagleUi = () :void => {
        $('div, button').css('pointer-events', 'none');
        $("body").on('keydown.lockUi', function (event: JQuery.TriggeredEvent) {
            event.preventDefault()
            event.stopImmediatePropagation()
            event.stopPropagation()
        })
    }

    unlockEagleUi = () :void => {
        $('div, button').css('pointer-events', '');
        $('body').off('keydown.lockUi');
    }

    initiateTutStep = (direction: TutorialStep.Direction): void => {
        //the lock function locks down the entire ui, preventing all clicks and key presses while the tutorial system is getting a step ready.
        //this is because there were many bugs, because eagles' actual ui is faster than the tutorial system. thats because the tutorial system reacts to and waits for the eagle ui.
        //the unlock happens after the waits for target elements in the ui, transitions of the tutorial visuals and changes of content and positioning has all been finished, this is when the tut system is ready to proceed.
        this.lockEagleUi()

        const eagle = Eagle.getInstance()
        TutorialSystem.activeTutCurrentStep = TutorialSystem.activeTut.getTutorialSteps()[TutorialSystem.activeTutCurrentStepIndex]
        const tutStep = TutorialSystem.activeTutCurrentStep
        
        clearTimeout(TutorialSystem.conditionCheck);
        TutorialSystem.conditionCheck = null;
        
        $('body').off('keydown.tutEventListener');
        TutorialSystem.addTutKeyboardShortcuts()

        //if there is a preFunction set, then we execute it here
        let preFunction

        if (direction === TutorialStep.Direction.Next) {
            preFunction = tutStep.getPreFunc()
        } else if (direction === TutorialStep.Direction.Prev) {
            preFunction = tutStep.getBackPreFunc()
        }

        if (preFunction != null) {
            preFunction(eagle)
        }

        const that = this
        //we always pass through the wait function, it is decided there if we actually wait or not
        if (tutStep.getWaitType() === TutorialStep.Wait.None) {
            this.initiateStep(TutorialSystem.activeTutCurrentStep, null)
        } else if (tutStep.getWaitType() === TutorialStep.Wait.Delay) {
            //if a delay amount is not specified we will default to 4ms
            let delay:number = 400
            if(TutorialSystem.activeTutCurrentStep.getDelayAmount()!=null){
                delay = TutorialSystem.activeTutCurrentStep.getDelayAmount()
            }
            setTimeout(function () {
                that.initiateStep(TutorialSystem.activeTutCurrentStep, null)
            }, delay)
        }else {
            //we set a two second timer, the wait will check every .1 seconds for two seconds at which point it is timed out and we abort the tut
            TutorialSystem.waitForElementTimer = setInterval(function () { TutorialSystem.activeTut.waitForElementThenRun(tutStep.getWaitType()) }, 100);
            setTimeout(function () {
                if (TutorialSystem.waitForElementTimer != null) {
                    clearTimeout(TutorialSystem.waitForElementTimer);
                    TutorialSystem.waitForElementTimer = null;
                    console.warn('waiting for next tutorial step element timed out')
                    TutorialSystem.onCoolDown = false
                    that.tutButtonPrev()
                }
            }, 2000)
        }
    }

    waitForElementThenRun = (waitType: TutorialStep.Wait): void => {
        const tutStep = TutorialSystem.activeTutCurrentStep
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

        } else if (waitType === TutorialStep.Wait.Element|| TutorialSystem.activeTutCurrentStepIndex === 0 ) {      //in case of an element we check if the element exists
            if (targetElement.length) {
                elementAvailable = true
            } else {
                //the element has not been found yet
                return
            }
        }else {
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
        $(':focus').trigger("blur");
        tutStep.getTargetFunc()().trigger("focus");

        //call the correct function depending on which type of tutorial step this is
        if (tutStep.getType() === TutorialStep.Type.Info) {
            that.initiateInfoStep(tutStep, alternateHighlightTarget)
        } else if (tutStep.getType() === TutorialStep.Type.Press) {
            that.initiatePressStep(tutStep, alternateHighlightTarget)
        } else if (tutStep.getType() === TutorialStep.Type.Input) {
            that.initiateInputStep(tutStep, alternateHighlightTarget)
        } else if (tutStep.getType() === TutorialStep.Type.Condition) {
            that.initiateConditionStep(tutStep, alternateHighlightTarget)
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
        // TODO: magic number here, move it to a constant somewhere in the tutorial system
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
        // TODO: magic number here!
        setTimeout(function () {
            TutorialSystem.activeTut.openInfoPopUp()
        }, 510);
    }

    //these are ground work for future tutorial system functionality
    initiateInputStep = (tutStep: TutorialStep, alternateHighlightTarget: JQuery<HTMLElement>): void => {
        if (alternateHighlightTarget != null) {
            this.highlightStepTarget(alternateHighlightTarget)
        } else {
            this.highlightStepTarget(tutStep.getTargetFunc()())
        }

        //the little wait is waiting for the css animation of the highlighting system
        // TODO: magic number (510) here!
        setTimeout(function () {
            TutorialSystem.activeTut.openInfoPopUp()
        }, 510);

        //attaching an input handler for checking input
        tutStep.getTargetFunc()().on('keydown.tutInputCheckFunc',function(event: JQuery.TriggeredEvent){
            const e: KeyboardEvent = event.originalEvent as KeyboardEvent;
            TutorialSystem.activeTut.tutInputCheckFunc(e, tutStep)
        })
    }

    initiateConditionStep = (tutStep: TutorialStep, alternateHighlightTarget: JQuery<HTMLElement>): void => {
        if (alternateHighlightTarget != null) {
            this.highlightStepTarget(alternateHighlightTarget)
        } else {
            this.highlightStepTarget(tutStep.getTargetFunc()())
        }

        //the little wait is waiting for the css animation of the highlighting system
        setTimeout(function () {
            TutorialSystem.activeTut.openInfoPopUp()
        }, 510);

        TutorialSystem.conditionCheck = setInterval(function(){TutorialSystem.activeTut.checkConditionFunction(tutStep)}, 100);
    }

    highlightStepTarget = (target: JQuery<HTMLElement>): void => {
        const eagle = Eagle.getInstance()
        if(TutorialSystem.activeTutCurrentStep.getAlternateHighlightTargetFunc() != null){
            target = TutorialSystem.activeTutCurrentStep.getAlternateHighlightTargetFunc()()
        }

        //if the selector is not working, we end the tutorial because it is broken
        if(target.length === 0){
            this.tutButtonEnd()
            Utils.showNotification("Tutorial Error", "There was an error in the tutorial, if this persists, please let our team know.", "warning");
            return
        }

        //in order to darken the screen save the selection target, we must add divs on each side of the element.
        const coords = target.offset()
        const docWidth = window.innerWidth
        const top_actual = Math.round(coords.top)//distance of the top of the element from the top of the document
        let right = coords.left + $(target).outerWidth() 
        const left = docWidth - coords.left
        let targetHeight = Math.round($(target).outerHeight())
        let bottom_actual = Math.round(coords.top + targetHeight) //distance from the bottom of the target element to the bottom of the document

        if(target.parents('#logicalGraphParent').length){
            targetHeight = Math.round(targetHeight*eagle.globalScale())
            right = coords.left+$(target).outerWidth() *eagle.globalScale()
            bottom_actual = Math.round(coords.top + targetHeight)
        }

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
        $('.tutorialHighlight.tutorialHighlightTop').attr("style", "top: 0px; left: 0px;width:100%;height:"+top_actual+"px" )

        //right
        $('.tutorialHighlight.tutorialHighlightRight').attr("style", "top: "+top_actual+"px; right: 0px; left: "+right+"px; height:"+targetHeight+"px;" )

        //bottom
        $('.tutorialHighlight.tutorialHighlightBottom').attr("style", "top: "+bottom_actual+"px; right: 0px; bottom: 0px; left: 0px" )

        //left
        $('.tutorialHighlight.tutorialHighlightLeft').attr("style", "top: "+top_actual+"px; right: "+left+"px; left: 0px;height:"+targetHeight+"px;" )
    }

    openInfoPopUp = (): void => {

        const step = TutorialSystem.activeTutCurrentStep
        const currentTarget: JQuery<HTMLElement> = step.getTargetFunc()()
        //figuring out where there is enough space to place the tutorial
        let selectedLocationX = currentTarget.offset().left + (currentTarget.width() / 2)
        let selectedLocationY = currentTarget.offset().top + currentTarget.outerHeight()
        const docWidth = $(document).width()
        const docHeight = $(document).height()

        this.closeInfoPopUp()

        let orientation = 'tutorialRight'

        if (currentTarget.outerWidth() === docWidth || currentTarget.outerHeight() / docHeight > 0.7) {
            //if this is the case then we are looking at an object that is set to 100% of the screen 
            //such as the navbar or canvas. we will then position the tutorial in the middle of the object
            if ((docHeight - currentTarget.outerHeight()) < 250) {
                selectedLocationY = selectedLocationY - (currentTarget.height() / 2)
                if (docWidth - selectedLocationX < 700) {
                    orientation = 'tutorialLeft tutorialMiddle'
                    selectedLocationX = selectedLocationX - 600 - (currentTarget.width() / 2)
                } else {
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
        if (TutorialSystem.activeTutCurrentStepIndex + 1 !== TutorialSystem.activeTutNumSteps && step.getType() === TutorialStep.Type.Info) {
            tooltipPopUp = tooltipPopUp + "<button class='tutNextBtn' onclick='eagle.tutorial().tutButtonNext()'>Next</button>"
        }
        tooltipPopUp = tooltipPopUp + "<span class='tutProgress'>" + activeStepIndexDisplay + " of " + TutorialSystem.activeTutNumSteps + "</span>"
        tooltipPopUp = tooltipPopUp + "<button class='tutEndBtn' onclick='eagle.tutorial().tutButtonEnd()'>Exit</button>"
        tooltipPopUp = tooltipPopUp + "</div>"
        tooltipPopUp = tooltipPopUp + "</div>"

        tooltipPopUp = tooltipPopUp + "</div>"
        tooltipPopUp = tooltipPopUp + "</div>"

        $('body').append(tooltipPopUp)
        this.unlockEagleUi()
    }

    closeInfoPopUp = (): void => {
        $("#tutorialInfoPopUp").remove()
    }

    tutButtonNext = (): void => {
        if (TutorialSystem.onCoolDown === false) {
            if (TutorialSystem.activeTutCurrentStepIndex + 1 !== TutorialSystem.activeTutNumSteps) {
                this.closeInfoPopUp()
                TutorialSystem.activeTutCurrentStepIndex++
                this.initiateTutStep(TutorialStep.Direction.Next)
                TutorialSystem.startCoolDown()
            } else {
                this.tutButtonEnd()
            }
        }
    }

    tutButtonPrev = (): void => {
        if (TutorialSystem.onCoolDown === false) {
            if (TutorialSystem.activeTutCurrentStepIndex > 0) {
                this.closeInfoPopUp()
                TutorialSystem.activeTutCurrentStepIndex--
                if(TutorialSystem.activeTut.getTutorialSteps()[TutorialSystem.activeTutCurrentStepIndex].getBackSkip() === true){
                    this.tutButtonPrev()
                }else{
                    this.initiateTutStep(TutorialStep.Direction.Prev)
                    TutorialSystem.startCoolDown()
                }
            }
        }
    }

    tutButtonEnd = (): void => {
        this.closeInfoPopUp()
        $('body').off('keydown.tutEventListener');
        $('.tutButtonListener').off('click.tutButtonListener').removeClass('tutButtonListener')
        $(".tutorialHighlight").remove()
        $('.forceShow').removeClass('forceShow')
        TutorialSystem.activeTut = null
        clearTimeout(TutorialSystem.conditionCheck);
        TutorialSystem.conditionCheck = null;
        clearTimeout(TutorialSystem.waitForElementTimer);
        TutorialSystem.waitForElementTimer = null;
        this.unlockEagleUi()
    }

    tutPressStepListener = (): void => {
        $('.tutButtonListener').off('click.tutButtonListener').removeClass('tutButtonListener')
        this.tutButtonNext()
    }


    //helpers
    openSettingsSection = (tab: string): void => {
        const eagle = Eagle.getInstance()
        eagle.openSettings()
        $(':focus').trigger("blur")
        $(tab).trigger("click")
    }

    tutInputCheckFunc = (event: KeyboardEvent, tutStep:TutorialStep):void => {
        if( event.key === "ArrowLeft" ||
            event.key === "ArrowUp" ||
            event.key === "ArrowRight" ||
            event.key === "ArrowDown" ||
            event.key === "Backspace"){
            return
        }

        if(tutStep.getExpectedInput() === ''||tutStep.getExpectedInput() === null){
            if(event.key === "Enter"){
                event.preventDefault()
                event.stopImmediatePropagation()
                TutorialSystem.activeTut.tutButtonNext()
                tutStep.getTargetFunc()().off('keydown.tutInputCheckFunc')
            }
        }else{
            if(tutStep.getTargetFunc()().val() === tutStep.getExpectedInput()){
                TutorialSystem.activeTut.tutButtonNext()
                tutStep.getTargetFunc()().off('keydown.tutInputCheckFunc')
            }
        }
    }

    checkConditionFunction = (tutStep: TutorialStep): void => {
        const eagle = Eagle.getInstance()        
        const conditionReturn: boolean = tutStep.getConditionFunction()(eagle)

        if(conditionReturn){
            clearTimeout(TutorialSystem.conditionCheck);
            TutorialSystem.conditionCheck = null;
            this.tutButtonNext()
        }
    }
}

export class TutorialStep {
    private title: string;
    private text: string;
    private type: TutorialStep.Type;
    private waitType: TutorialStep.Wait;
    private delayAmount : number;
    
    private targetFunc: () => JQuery<HTMLElement>;
    private alternateHighlightTargetFunc: () => JQuery<HTMLElement>;
    private preFunc: (eagle: Eagle) => void;
    private backPreFunc: (eagle: Eagle) => void;
    private conditionFunc : (eagle: Eagle) => boolean;

    private backSkip : boolean;
    private expectedInput : string;

    constructor(title: string, text: string, type: TutorialStep.Type, waitType: TutorialStep.Wait, delayAmount:number, targetFunc: () => JQuery<HTMLElement>, preFunc: (eagle: Eagle) => void, backPreFunc: (eagle: Eagle) => void, backSkip:boolean, expectedInput:string, conditionFunc:(eagle: Eagle) => boolean, alternateHighlightTargetFunc: () => JQuery<HTMLElement>) {
        this.title = title;
        this.text = text;
        this.type = type;
        this.waitType = waitType;
        this.delayAmount = delayAmount;

        this.targetFunc = targetFunc;
        this.alternateHighlightTargetFunc = alternateHighlightTargetFunc;
        this.preFunc = preFunc;
        this.backPreFunc = backPreFunc;
        this.conditionFunc = conditionFunc;
        
        this.backSkip = backSkip
        this.expectedInput = expectedInput;
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

    getDelayAmount = (): number => {
        return this.delayAmount;
    }

    getTargetFunc = (): () => JQuery<HTMLElement> => {
        return this.targetFunc;
    }

    getPreFunc = (): (eagle: Eagle) => void => {
        return this.preFunc;
    }

    getBackPreFunc = (): (eagle: Eagle) => void => {
        return this.backPreFunc;
    }

    getBackSkip = (): boolean => {
        return this.backSkip;
    }

    getExpectedInput = (): string => {
        return this.expectedInput;
    }

    getConditionFunction = (): (eagle: Eagle) => boolean => {
        return this.conditionFunc;
    }

    getAlternateHighlightTargetFunc = () : () => JQuery<HTMLElement> => {
        return this.alternateHighlightTargetFunc;
    }

    setType = (newType:TutorialStep.Type): this => {
        this.type = newType;
        return this
    }

    setWaitType = (newWaitType:TutorialStep.Wait): this => {
        this.waitType = newWaitType;
        return this
    }

    setDelayAmount = (newDelayAmount:number): this => {
        this.delayAmount = newDelayAmount;
        return this
    }

    setPreFunction = (newPreFunc:(eagle: Eagle) => void): this => {
        this.preFunc = newPreFunc;
        return this
    }

    setBackPreFunction = (newBackPreFunc:(eagle: Eagle) => void): this => {
        this.backPreFunc = newBackPreFunc;
        return this
    }

    setBackSkip = (newBackSkip:boolean): this => {
        this.backSkip = newBackSkip;
        return this
    }

    setExpectedInput = (newExpectedInput:string): this => {
        this.expectedInput = newExpectedInput;
        return this
    }

    setConditionFunction = (newConditionFunction:(eagle: Eagle) => boolean): this => {
        this.conditionFunc = newConditionFunction;
        return this
    }

    setAlternateHighlightTargetFunc = (newAlternateHighlightTargetFunc:() => JQuery<HTMLElement>): this => {
        this.alternateHighlightTargetFunc = newAlternateHighlightTargetFunc;
        return this
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
        Delay,
        None
    }
}

// getting the tutorials array ready for eagle
export const tutorialArray: Tutorial[] = []
