"use strict";

import * as ko from "knockout";

var collapseRunning:boolean = false;
var allCollapseRunning:boolean = false;

export class InspectorState {
    // NOTE: for these variables, false indicates expanded, true indicates collapsed
    description: ko.Observable<boolean>;
    displayOptions: ko.Observable<boolean>;
    graphComment: ko.Observable<boolean>;
    graphDescription: ko.Observable<boolean>;
    inputApplication: ko.Observable<boolean>;
    inputPorts: ko.Observable<boolean>;
    outputApplication: ko.Observable<boolean>;
    outputPorts: ko.Observable<boolean>;
    componentParameters: ko.Observable<boolean>;
    applicationParameters: ko.Observable<boolean>;

    constructor(){
        this.description = ko.observable(true);
        this.displayOptions = ko.observable(true);
        this.graphComment = ko.observable(true);
        this.graphDescription = ko.observable(true);
        this.inputApplication = ko.observable(true);
        this.inputPorts = ko.observable(true);
        this.outputApplication = ko.observable(true);
        this.outputPorts = ko.observable(true);
        this.componentParameters = ko.observable(true);
        this.applicationParameters = ko.observable(true);
    }

    setAll(value:boolean): void {
        this.description(value);
        this.displayOptions(value);
        this.graphComment(value);
        this.graphDescription(value);
        this.inputApplication(value);
        this.inputPorts(value);
        this.outputApplication(value);
        this.outputPorts(value);
        this.componentParameters(value);
        this.applicationParameters(value);
    }

    set(sectionName: string, value: boolean): void {
        const state = this.get(sectionName);

        if (state === null){
            return;
        }

        state(value);
    }

    get(sectionName: string): ko.Observable<boolean> {
        // TODO: this switch statement is a little clunky
        //       if all the booleans were stored in a single dictionary (or similar) and keyed by the sectionName,
        //       then this could be replaced with one line (and a correctness check)
        switch(sectionName){
            case "Description":
                return this.description;
            case "Display Options":
                return this.displayOptions;
            case "Graph Comment":
                return this.graphComment;
            case "Graph Description":
                return this.graphDescription;
            case "Input Application":
                return this.inputApplication;
            case "Inputs":
                return this.inputPorts;
            case "Output Application":
                return this.outputApplication;
            case "Outputs":
                return this.outputPorts;
            case "Component Parameters":
                return this.componentParameters;
            case "Application Parameters":
                return this.applicationParameters;
            default:
                console.warn("Unknown inspector section", sectionName);
                return null;
            }
    }

    all : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return this.description() && this.displayOptions() && this.graphComment() && this.graphDescription() && this.inputApplication() && this.inputPorts() && this.outputApplication() && this.outputPorts() && this.componentParameters() && this.applicationParameters();
    }, this);

    toggleAll = (item: any, e:JQueryEventObject): void => {
        const allCollapsed = this.all();
        allCollapseRunning
        if(!allCollapseRunning){
            allCollapseRunning = true
            this.setAll(!allCollapsed);

            // actually ask bootstrap to collapse all the sections
            $(".nodeInspectorCollapseAll").collapse(allCollapsed ? "show" : "hide");
            setTimeout(function(){
                allCollapseRunning = false
            }, 350);
        }
    }

    toggleSection = (item: any, e: JQueryEventObject): void => {
        const target: JQuery<Element> = $(e.currentTarget);
        const sectionName: string = target.data('section-name');
        var that = this
        // dont run function if class collapsing exists on collapsable section. the collapsing variable below is not correct yet.
        const collapsing = target.parent().children(".nodeInspectorCollapseAll").hasClass("collapsing");

        //timer equals the time it takes for bootstrap to finish collapsing. it is required to keep them in sync.
        if(!collapseRunning){
            collapseRunning = true
            that.toggle(sectionName);
            setTimeout(function(){
                collapseRunning = false
            }, 350);
        }
    }

    toggle(sectionName: string): void {
        const state = this.get(sectionName);

        if (state === null){
            return;
        }

        state(!state());
    }

    updateAllInspectorSections = (): void => {
        $(".nodeInspectorCollapseAll").each((index: number, element: HTMLElement): void => {
            const h5 = $(element).parent().find('h5');
            const sectionName = h5.data("section-name");

            const sectionState = this.get(sectionName);

            if (sectionState === null){
                return;
            }

            $(element).collapse(sectionState() ? "hide" : "show");
        });
    }
}
