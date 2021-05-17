/*
#
#    ICRAR - International Centre for Radio Astronomy Research
#    (c) UWA - The University of Western Australia, 2016
#    Copyright by UWA (in the framework of the ICRAR)
#    All rights reserved
#
#    This library is free software; you can redistribute it and/or
#    modify it under the terms of the GNU Lesser General Public
#    License as published by the Free Software Foundation; either
#    version 2.1 of the License, or (at your option) any later version.
#
#    This library is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#    Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public
#    License along with this library; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston,
#    MA 02111-1307  USA
#
*/

import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

export class Translator {
    numberOfIslands : ko.Observable<number>;
    numberOfNodes : ko.Observable<number>;
    partitionLabel : ko.Observable<string>;
    loadBalancing : ko.Observable<number>;
    maxCPUsPerPartition : ko.Observable<number>;
    greediness : ko.Observable<number>;
    deadline : ko.Observable<number>;
    swarmSize : ko.Observable<number>;
    searchSpaceDimension : ko.Observable<number>;
    numberOfParallelTaskStreams : ko.Observable<number>;

    isTranslating: ko.Observable<boolean>

    constructor(){
        this.numberOfIslands = ko.observable(0);
        this.numberOfNodes = ko.observable(1);
        this.partitionLabel = ko.observable("Partition");
        this.loadBalancing = ko.observable(100);
        this.maxCPUsPerPartition = ko.observable(8);
        this.greediness = ko.observable(50);
        this.deadline = ko.observable(300);
        this.swarmSize = ko.observable(40);
        this.searchSpaceDimension = ko.observable(30);
        this.numberOfParallelTaskStreams = ko.observable(1);

        this.isTranslating = ko.observable(false);
    }

    submit = (translatorURL : string, formElements : { [index: string]: string }) : void => {
        // consult EAGLE settings to determine whether to open the transator in a new tab
        var spawnTranslationTab: boolean = Eagle.findSettingValue(Utils.SPAWN_TRANSLATION_TAB);

        // create form element
        var form = document.createElement("form");
        form.method = "POST";
        form.action = translatorURL;

        if (spawnTranslationTab){
            form.target = "_blank";
        } else {
            form.target = "_self";
        }

        // add formElements to form
        for (var key in formElements) {
            this.addInput(key, formElements[key], form);
        }

        // add the other inputs to the form
        // not all of these values are used for all the algorithms, but it seems
        // OK to just send everything along, so the receiver can rely on a
        // single 'style' of request
        this.addInput("num_islands", this.numberOfIslands().toString(), form);
        this.addInput("num_par", this.numberOfNodes().toString(), form);
        this.addInput("par_label", this.partitionLabel(), form);
        this.addInput("max_load_imb", this.loadBalancing().toString(), form);
        this.addInput("max_cpu", this.maxCPUsPerPartition().toString(), form);
        this.addInput("num_parallel_task_streams", this.numberOfParallelTaskStreams().toString(), form);

        // temporarily add form to document and submit
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    private addInput(name: string, value: string, form: HTMLFormElement){
        var element = document.createElement("input");
        element.name = name;
        element.value = value;
        form.appendChild(element);
    }
}
