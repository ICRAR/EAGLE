import { Eagle } from './Eagle';
import { LogicalGraph } from './LogicalGraph';
import { Utils } from './Utils';

export class TutorialSystem {

    static activeTut: Tutorial | null = null //current active tutorial
    static activeTutCurrentStep: TutorialStep //current active tutorial step
    static activeTutCurrentStepIndex: number = 0;  //index of the current step in the active tutorial
    static waitForElementTimer: number | undefined    //this houses the time out timer when waiting for a target element to appear
    static onCoolDown: boolean = false //boolean if the tutorial system is currently on cool down
    static conditionCheck: number | undefined //this stores the condition interval function TODO: not actually a function, it actually stores the interval ID, could be better named

    static readonly HIGHLIGHT_TIMEOUT = 510; // wait for the css animation of the highlighting system
    static readonly COOLDOWN_TIMEOUT = 700; // cool-down time in milliseconds

    static initiateTutorial(tutorialName: string): void {
        for (const tut of Eagle.tutorials){
            if (tutorialName === tut.getName()) {
                //this is the requested tutorial
                TutorialSystem.activeTut = tut
                TutorialSystem.activeTutCurrentStepIndex = 0
                TutorialSystem.activeTut.initiateTutStep(TutorialStep.Direction.Next) // TODO: no call to StartCoolDown here?
                TutorialSystem.addTutKeyboardShortcuts()
                return;
            }
        }

        // couldn't find a tutorial with the given name
        console.warn("Could not find a tutorial with the name:", tutorialName);
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
    static startCoolDown(): void {
        TutorialSystem.onCoolDown = true
        setTimeout(function () {
            TutorialSystem.onCoolDown = false
        }, TutorialSystem.COOLDOWN_TIMEOUT);
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

    static initiateFindGraphNodeIdByNodeName(name: string): JQuery<HTMLElement> {
        const lg: LogicalGraph = Eagle.getInstance().logicalGraph();
        return $('#logicalGraph #' + lg.findNodeIdByNodeName(name) + '.container');
    }

    static initiateSimpleFindGraphNodeIdByNodeName(name:string): NodeId | null {
        const lg: LogicalGraph = Eagle.getInstance().logicalGraph();
        return lg.findNodeIdByNodeName(name)
    }

    static isRequestedNodeSelected(name:string) : boolean {
        //used when asking the user to select a specific node
        const eagle = Eagle.getInstance()
        const selectedNode = eagle.selectedNode();

        return selectedNode !== null && selectedNode.getName() === name;
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
        setTimeout(() => {
            const newScrollPos = $(target).position().top - 100; //the position of the target node in the palette list minus an offset 
            $('#paletteList').animate({
                scrollTop: newScrollPos
            },10);
        }, 100);
    }

    static isLastStep(): boolean {
        const activeTutorial: Tutorial | null = TutorialSystem.activeTut;
        if (activeTutorial === null) {
            console.warn("No active tutorial found, cannot check if last step.");
            return false;
        }

        return TutorialSystem.activeTutCurrentStepIndex + 1 >= activeTutorial.getNumSteps();
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

    getNumSteps = (): number => {
        return this.tutorialSteps.length;
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
        const x = new TutorialStep(title, description, TutorialStep.Type.Info, TutorialStep.Wait.None, TutorialStep.DEFAULT_DELAY_AMOUNT, selector, null, null, false, "", null, null)
        this.tutorialSteps.push(x)
        return x
    }

    initiateTutStep = (direction: TutorialStep.Direction): void => {
        //the lock function locks down the entire ui, preventing all clicks and key presses while the tutorial system is getting a step ready.
        //this is because there were many bugs, because eagles' actual ui is faster than the tutorial system. thats because the tutorial system reacts to and waits for the eagle ui.
        //the unlock happens after the waits for target elements in the ui, transitions of the tutorial visuals and changes of content and positioning has all been finished, this is when the tut system is ready to proceed.

        const eagle = Eagle.getInstance()
        const activeTutorial: Tutorial | null = TutorialSystem.activeTut;

        if (activeTutorial === null) {
            console.warn("No active tutorial found, cannot initiate step.");
            return;
        }

        TutorialSystem.activeTutCurrentStep = activeTutorial.getTutorialSteps()[TutorialSystem.activeTutCurrentStepIndex]
        const tutStep = TutorialSystem.activeTutCurrentStep
        
        clearTimeout(TutorialSystem.conditionCheck);
        TutorialSystem.conditionCheck = undefined;
        
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
            //in case of a delay we just wait for the delay amount, then we initiate the step
            setTimeout(function () {
                that.initiateStep(TutorialSystem.activeTutCurrentStep, null)
            }, TutorialSystem.activeTutCurrentStep.getDelayAmount())
        }else {
            //we set a two second timer, the wait will check every .1 seconds for two seconds at which point it is timed out and we abort the tut
            // TODO: magic number here!
            TutorialSystem.waitForElementTimer = setInterval(function () { activeTutorial.waitForElementThenRun(tutStep.getWaitType()) }, 100);
            setTimeout(function () {
                if (typeof TutorialSystem.waitForElementTimer !== 'undefined') {
                    clearTimeout(TutorialSystem.waitForElementTimer);
                    TutorialSystem.waitForElementTimer = undefined;
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

        const targetFunc = tutStep.getTargetFunc();
        if (targetFunc === null) {
            console.warn('no target function for this tutorial step')
            return
        }

        let targetElement: JQuery<HTMLElement> = targetFunc()
        let autoAlternateHighlightTarget: JQuery<HTMLElement> | null = null // used for modals to automatically highlight the modal body, footer or header

        if (waitType === TutorialStep.Wait.Modal) {
            //in  case of a modal we make sure the selector is for the modal, we then check if it has the class 'show'
            if (!targetElement.hasClass('modal')) {
                //we also pass this modal selector to the highlighting function, so whole modal is highlighted, 
                //but the arrow still points at a specific object in the modal
                if (targetElement.closest('.modal-body').length > 0) {
                    autoAlternateHighlightTarget = targetElement.closest('.modal-body')
                } else if (targetElement.closest('.modal-footer').length > 0) {
                    autoAlternateHighlightTarget = targetElement.closest('.modal-footer')
                } else if (targetElement.closest('.modal-header').length > 0) {
                    autoAlternateHighlightTarget = targetElement.closest('.modal-header')
                } else {
                    autoAlternateHighlightTarget = targetElement.closest('.modal')
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
            this.initiateStep(tutStep, autoAlternateHighlightTarget)
            clearTimeout(TutorialSystem.waitForElementTimer);
            TutorialSystem.waitForElementTimer = undefined;
        } else {
            return
        }
    }

    initiateStep = (tutStep: TutorialStep, autoAlternateHighlightTarget: JQuery<HTMLElement> | null): void => {
        const that = this;
        $(':focus').trigger("blur");
        const targetFunc = tutStep.getTargetFunc();
        if (targetFunc === null) {
            console.warn('no target function for this tutorial step')
            return
        }
        targetFunc().trigger("focus");

        //call the correct function depending on which type of tutorial step this is
        if (tutStep.getType() === TutorialStep.Type.Info) {
            that.initiateInfoStep(tutStep, autoAlternateHighlightTarget)
        } else if (tutStep.getType() === TutorialStep.Type.Press) {
            that.initiatePressStep(tutStep, autoAlternateHighlightTarget)
        } else if (tutStep.getType() === TutorialStep.Type.Input) {
            that.initiateInputStep(tutStep, autoAlternateHighlightTarget)
        } else if (tutStep.getType() === TutorialStep.Type.Condition) {
            that.initiateConditionStep(tutStep, autoAlternateHighlightTarget)
        }
    }

    //normal info step
    initiateInfoStep = (tutStep: TutorialStep, autoAlternateHighlightTarget: JQuery<HTMLElement> | null): void => {
        //the alternate highlight selector is for modals in which case we highlight the whole modal while the arrow points at a specific child
        if (autoAlternateHighlightTarget != null && autoAlternateHighlightTarget.length > 0) {
            this.highlightStepTarget(autoAlternateHighlightTarget)
        } else {
            const targetFunc = tutStep.getTargetFunc();
            if (targetFunc === null) {
                console.warn('no target function for this tutorial step')
                return
            }
            this.highlightStepTarget(targetFunc())
        }

        //the little wait is waiting for the css animation of the highlighting system
        setTimeout(function () {
            TutorialSystem.activeTut?.openInfoPopUp()
        }, TutorialSystem.HIGHLIGHT_TIMEOUT);
    }

    //a selector press step
    initiatePressStep = (tutStep: TutorialStep, autoAlternateHighlightTarget: JQuery<HTMLElement> | null): void => {
        const targetFunc = tutStep.getTargetFunc();
        if (targetFunc === null) {
            console.warn('no target function for this tutorial step')
            return
        }

        const targetElement = targetFunc()
        if (autoAlternateHighlightTarget != null) {
            this.highlightStepTarget(autoAlternateHighlightTarget)
        } else {
            this.highlightStepTarget(targetElement)
        }
        const eagle = Eagle.getInstance()

        targetElement.on('click.tutButtonListener', eagle.tutorial().tutPressStepListener).addClass('tutButtonListener')

        //the little wait is waiting for the css animation of the highlighting system
        setTimeout(function () {
            TutorialSystem.activeTut?.openInfoPopUp()
        }, TutorialSystem.HIGHLIGHT_TIMEOUT);
    }

    //these are ground work for future tutorial system functionality
    initiateInputStep = (tutStep: TutorialStep, autoAlternateHighlightTarget: JQuery<HTMLElement> | null): void => {
        const targetFunc = tutStep.getTargetFunc();
        if (targetFunc === null) {
            console.warn('no target function for this tutorial step')
            return;
        }

        if (autoAlternateHighlightTarget != null) {
            this.highlightStepTarget(autoAlternateHighlightTarget)
        } else {
            this.highlightStepTarget(targetFunc())
        }

        const activeTutorial: Tutorial | null = TutorialSystem.activeTut;
        if (activeTutorial === null) {
            console.warn("No active tutorial found, cannot initiate condition step.");
            return;
        }

        //the little wait is waiting for the css animation of the highlighting system
        setTimeout(function () {
            activeTutorial.openInfoPopUp()
        }, TutorialSystem.HIGHLIGHT_TIMEOUT);

        //attaching an input handler for checking input
        targetFunc().on('keydown.tutInputCheckFunc',function(event: JQuery.TriggeredEvent){
            const e: KeyboardEvent = event.originalEvent as KeyboardEvent;
            activeTutorial.tutInputCheckFunc(e, tutStep)
        })
    }

    initiateConditionStep = (tutStep: TutorialStep, autoAlternateHighlightTarget: JQuery<HTMLElement> | null): void => {
        if (autoAlternateHighlightTarget != null) {
            this.highlightStepTarget(autoAlternateHighlightTarget)
        } else {
            const targetFunc = tutStep.getTargetFunc();

            if (targetFunc !== null){
                this.highlightStepTarget(targetFunc());
            }
        }

        const activeTutorial: Tutorial | null = TutorialSystem.activeTut;
        if (activeTutorial === null) {
            console.warn("No active tutorial found, cannot initiate condition step.");
            return;
        }

        //the little wait is waiting for the css animation of the highlighting system
        setTimeout(function () {
            activeTutorial.openInfoPopUp()
        }, TutorialSystem.HIGHLIGHT_TIMEOUT);

        TutorialSystem.conditionCheck = setInterval(function(){activeTutorial.checkConditionFunction(tutStep)}, 100); // TODO: magic number here!
    }

    highlightStepTarget = (target: JQuery<HTMLElement>): void => {
        const eagle = Eagle.getInstance()
        const activeTutorial: Tutorial | null = TutorialSystem.activeTut;

        if (activeTutorial === null){
            console.warn("No active tutorial found.");
            return;
        }

        //if the target element is not found, we end the tutorial gracefully
        if(target.length === 0){
            console.warn('target highlight element not found: ', TutorialSystem.activeTutCurrentStep.getTargetFunc())
            activeTutorial.tutButtonEnd()
            return
        }

        const alternateHighlightTargetFunc = TutorialSystem.activeTutCurrentStep.getAlternateHighlightTargetFunc();

        // if this step has an alternate highlight target function, we use that instead of the main target
        if(alternateHighlightTargetFunc !== null){
            const alternateHighlightTarget = alternateHighlightTargetFunc();
            if (target.length > 0){
                target = alternateHighlightTarget;
            }else{
                console.warn('alternate highlight target not found using main target instead')
            }
        }

        // if the selector is not working, we end the tutorial because it is broken
        if(typeof target === 'undefined' || target.length === 0){
            this.tutButtonEnd()
            Utils.showNotification("Tutorial Error", "There was an error in the tutorial, if this persists, please let our team know.", "warning");
            console.warn('no target for this step could be found')
            return
        }

        // check that we can find coordinates for the target element
        const coords = target.offset();
        if (typeof coords === 'undefined') {
            console.warn("Could not find coordinates for the target element.");
            return;
        }

        const outerWidth = target.outerWidth();
        const outerHeight = target.outerHeight();
        if (typeof outerHeight === 'undefined' || typeof outerWidth === 'undefined') {
            console.warn("Could not find outer width for the target element.");
            return;
        }

        //in order to darken the screen save the selection target, we must add divs on each side of the element.
        const docWidth = window.innerWidth
        const top_actual = Math.round(coords.top)//distance of the top of the element from the top of the document
        let right = coords.left + outerWidth;
        const left = docWidth - coords.left
        let targetHeight = Math.round(outerHeight)
        let bottom_actual = Math.round(coords.top + targetHeight) //distance from the bottom of the target element to the bottom of the document

        if(target.parents('#logicalGraphParent').length){
            targetHeight = Math.round(targetHeight*eagle.globalScale())
            right = coords.left + outerWidth * eagle.globalScale()
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
        const step: TutorialStep = TutorialSystem.activeTutCurrentStep;
        const targetFunc = step.getTargetFunc();
        if (targetFunc === null) {
            console.warn('no target function for this tutorial step')
            return
        }
        const currentTarget: JQuery<HTMLElement> = targetFunc();
        if (typeof currentTarget === 'undefined' || currentTarget.length === 0) {
            console.warn('no target for this step could be found')
            return
        }
        const offset = currentTarget.offset();
        if (typeof offset === 'undefined') {
            console.warn("Could not find offset for the target element.");
            return;
        }
        const width = currentTarget.width();
        const height = currentTarget.height();
        if (typeof width === 'undefined' || typeof height === 'undefined') {
            console.warn("Could not find width or height for the target element.");
            return;
        }

        const outerWidth = currentTarget.outerWidth();
        const outerHeight = currentTarget.outerHeight();
        if (typeof outerHeight === 'undefined' || typeof outerWidth === 'undefined') {
            console.warn("Could not find outer width or outer height for the target element.");
            return;
        }

        const docWidth = $(document).width()
        const docHeight = $(document).height()
        if (typeof docWidth === 'undefined' || typeof docHeight === 'undefined') {
            console.warn("Could not find document width or height.");
            return;
        }

        //figuring out where there is enough space to place the tutorial
        let selectedLocationX = offset.left + (width / 2)
        let selectedLocationY = offset.top + outerHeight


        this.closeInfoPopUp()

        let orientation = 'tutorialRight'

        if (outerWidth === docWidth || outerHeight / docHeight > 0.7) {
            //if this is the case then we are looking at an object that is set to 100% of the screen 
            //such as the navbar or canvas. we will then position the tutorial in the middle of the object
            if ((docHeight - outerHeight) < 250) {
                selectedLocationY = selectedLocationY - (height / 2)
                if (docWidth - selectedLocationX < 700) {
                    orientation = 'tutorialLeft tutorialMiddle'
                    selectedLocationX = selectedLocationX - 600 - (width / 2)
                } else {
                    orientation = 'tutorialRight tutorialMiddle'
                }
            }
        } else if (docWidth - selectedLocationX < 700) {
            orientation = 'tutorialLeft'
            selectedLocationX = selectedLocationX - 660 - (width / 2)
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
        if (!TutorialSystem.isLastStep() && step.getType() === TutorialStep.Type.Info) {
            tooltipPopUp = tooltipPopUp + "<button class='tutNextBtn' onclick='eagle.tutorial().tutButtonNext()'>Next</button>"
        }
        tooltipPopUp = tooltipPopUp + "<span class='tutProgress'>" + activeStepIndexDisplay + " of " + TutorialSystem.activeTut?.getNumSteps() + "</span>"
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
        // abort if the tutorial system is on cool down
        if (TutorialSystem.onCoolDown){
            return;
        }

        const activeTutorial: Tutorial | null = TutorialSystem.activeTut;
        if (activeTutorial === null) {
            console.warn("No active tutorial found, cannot go to next step.");
            return;
        }

        if (!TutorialSystem.isLastStep()){
            this.closeInfoPopUp()
            TutorialSystem.activeTutCurrentStepIndex++
            this.initiateTutStep(TutorialStep.Direction.Next)
            TutorialSystem.startCoolDown()
        } else {
            this.tutButtonEnd()
        }
    }

    tutButtonPrev = (): void => {
        const activeTutorial: Tutorial | null = TutorialSystem.activeTut;

        // abort if there is no active tutorial
        if (activeTutorial === null) {
            console.warn("No active tutorial found, cannot go to previous step.");
            return;
        }

        // abort if the tutorial system is on cool down
        if (TutorialSystem.onCoolDown){
            return;
        }
        
        // abort if we are already at the first step
        if (TutorialSystem.activeTutCurrentStepIndex === 0) {
            console.warn("Already at the first step of the tutorial, cannot go back.");
            return;
        }

        this.closeInfoPopUp()
        TutorialSystem.activeTutCurrentStepIndex--

        // get the new current step
        const currentStep: TutorialStep = activeTutorial.getTutorialSteps()[TutorialSystem.activeTutCurrentStepIndex];

        // TODO: explanation?
        if(currentStep.getBackSkip()){
            this.tutButtonPrev()
        }else{
            this.initiateTutStep(TutorialStep.Direction.Prev)
            TutorialSystem.startCoolDown()
        }
    }

    tutButtonEnd = (): void => {
        console.log('ending tut')
        this.closeInfoPopUp()
        $('body').off('keydown.tutEventListener');
        $('.tutButtonListener').off('click.tutButtonListener').removeClass('tutButtonListener')
        $(".tutorialHighlight").remove()
        $('.forceShow').removeClass('forceShow')
        TutorialSystem.activeTut = null
        clearTimeout(TutorialSystem.conditionCheck);
        TutorialSystem.conditionCheck = undefined;
        clearTimeout(TutorialSystem.waitForElementTimer);
        TutorialSystem.waitForElementTimer = undefined;
    }

    tutPressStepListener = (): void => {
        $('.tutButtonListener').off('click.tutButtonListener').removeClass('tutButtonListener')
        this.tutButtonNext()
    }


    //helpers
    openSettingsSection = (tab: string): void => {
        Utils.showSettingsModal();
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

        const activeTutorial: Tutorial | null = TutorialSystem.activeTut;
        if (activeTutorial === null) {
            console.warn("No active tutorial found, cannot check input.");
            return;
        }

        const targetFunc = tutStep.getTargetFunc();
        if (targetFunc === null) {
            console.warn('no target function for this tutorial step')
            return;
        }
        const targetElement: JQuery<HTMLElement> = targetFunc();

        if(tutStep.getExpectedInput() === ''||tutStep.getExpectedInput() === null){
            if(event.key === "Enter"){
                event.preventDefault()
                event.stopImmediatePropagation()
                activeTutorial.tutButtonNext()
                targetElement.off('keydown.tutInputCheckFunc')
            }
        }else{
            if(targetElement.val() === tutStep.getExpectedInput()){
                activeTutorial.tutButtonNext()
                targetElement.off('keydown.tutInputCheckFunc')
            }
        }
    }

    checkConditionFunction = (tutStep: TutorialStep): void => {
        const eagle = Eagle.getInstance()
        const conditionFunc = tutStep.getConditionFunction();

        if (conditionFunc === null) {
            console.warn("No condition function set for the tutorial step:", tutStep.getTitle());
            return;
        }

        const conditionReturn: boolean = conditionFunc(eagle)

        if(conditionReturn){
            clearTimeout(TutorialSystem.conditionCheck);
            TutorialSystem.conditionCheck = undefined;
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
    
    private targetFunc: (() => JQuery<HTMLElement>) | null;
    private alternateHighlightTargetFunc: (() => JQuery<HTMLElement>) | null;
    private preFunc: ((eagle: Eagle) => void) | null;
    private backPreFunc: ((eagle: Eagle) => void) | null;
    private conditionFunc : ((eagle: Eagle) => boolean) | null;

    private backSkip : boolean; // TODO: explanation needed, what does this do?
    private expectedInput : string;

    static readonly DEFAULT_DELAY_AMOUNT: number = 400 //default delay amount for the delay wait type
    
    constructor(title: string, text: string, type: TutorialStep.Type, waitType: TutorialStep.Wait, delayAmount: number, targetFunc: () => JQuery<HTMLElement>, preFunc: ((eagle: Eagle) => void) | null, backPreFunc: ((eagle: Eagle) => void) | null, backSkip: boolean, expectedInput: string, conditionFunc: ((eagle: Eagle) => boolean) | null, alternateHighlightTargetFunc: (() => JQuery<HTMLElement>) | null) {
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

    getTargetFunc = (): (() => JQuery<HTMLElement>) | null => {
        return this.targetFunc;
    }

    getPreFunc = (): ((eagle: Eagle) => void) | null => {
        return this.preFunc;
    }

    getBackPreFunc = (): ((eagle: Eagle) => void) | null => {
        return this.backPreFunc;
    }

    getBackSkip = (): boolean => {
        return this.backSkip;
    }

    getExpectedInput = (): string => {
        return this.expectedInput;
    }

    getConditionFunction = (): ((eagle: Eagle) => boolean) | null => {
        return this.conditionFunc;
    }

    getAlternateHighlightTargetFunc = () : (() => JQuery<HTMLElement>) | null => {
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
