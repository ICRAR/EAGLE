"use strict";

import * as ko from "knockout";

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
    exitApplication: ko.Observable<boolean>;
    parameters: ko.Observable<boolean>;

    constructor(){
        this.description = ko.observable(true);
        this.displayOptions = ko.observable(true);
        this.graphComment = ko.observable(true);
        this.graphDescription = ko.observable(true);
        this.inputApplication = ko.observable(true);
        this.inputPorts = ko.observable(true);
        this.outputApplication = ko.observable(true);
        this.outputPorts = ko.observable(true);
        this.exitApplication = ko.observable(true);
        this.parameters = ko.observable(true);
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
        this.exitApplication(value);
        this.parameters(value);
    }

    set(sectionName: string, value: boolean): void {
        let state = this.get(sectionName);

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
            case "Exit Application":
                return this.exitApplication;
            case "Parameters":
                return this.parameters;

            default:
                console.warn("Unknown inspector section", sectionName);
                return null;
            }
    }

    all : ko.PureComputed<boolean> = ko.pureComputed(() => {
        return this.description() && this.displayOptions() && this.graphComment() && this.graphDescription() && this.inputApplication() && this.inputPorts() && this.outputApplication() && this.outputPorts() && this.exitApplication() && this.parameters();
    }, this);

    toggleAll = (item: any, e:JQueryEventObject): void => {
        let allCollapsed = this.all();

        this.setAll(!allCollapsed);

        // actually ask bootstrap to collapse all the sections
        $(".nodeInspectorCollapseAll").collapse(allCollapsed ? "show" : "hide");
    }

    toggleSection = (item: any, e: JQueryEventObject): void => {
        let target: JQuery<Element> = $(e.currentTarget);
        let sectionName: string = target.data('section-name');

        // dont run function if class collapsing exists on collapsable section. the collapsing variable below is not correct yet.
        let collapsing = target.parent().children(".nodeInspectorCollapseAll").hasClass("collapsing");
        if (!collapsing){
            this.toggle(sectionName);
        } else {
            console.log("Abort section toggle, already collapsing");
            return;
        }
    }

    toggle(sectionName: string): void {
        let state = this.get(sectionName);

        if (state === null){
            return;
        }

        state(!state());
    }
}
