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
import {LogicalGraph} from './LogicalGraph';
import {Setting} from './Setting';
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
    rmode : ko.Observable<number>;

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
        this.rmode = ko.observable(0);
        this.isTranslating = ko.observable(false);
    }

    submit = (translatorURL : string, formElements : { [index: string]: string }) : void => {
        // consult EAGLE settings to determine whether to open the transator in a new tab
        const translateInCurrentTab: boolean = Setting.findValue(Utils.OPEN_TRANSLATOR_IN_CURRENT_TAB);
        const overwriteTranslationTab: boolean = Setting.findValue(Utils.OVERWRITE_TRANSLATION_TAB);

        // create form element
        const form = document.createElement("form");
        form.method = "POST";
        form.action = translatorURL;

        if (translateInCurrentTab){
            form.target = "_self";
        } else if(overwriteTranslationTab) {
            form.target = "translator";
        } else {
            form.target = "_blank";
        }

        // add formElements to form
        for (const key in formElements) {
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
        this.addInput("rmode", this.rmode().toString(), form);

        // temporarily add form to document and submit
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    private addInput(name: string, value: string, form: HTMLFormElement){
        const element = document.createElement("input");
        element.name = name;
        element.value = value;
        form.appendChild(element);
    }

        //----------------- Physical Graph Generation --------------------------------
    /**
     * Generate Physical Graph Template.
     * @param algorithmName
     * @param testingMode
     * @param format
     */
     genPGT = (algorithmName : string, testingMode: boolean, format: Eagle.DALiuGESchemaVersion) : void => {
        const eagle: Eagle = Eagle.getInstance();

        if (eagle.logicalGraph().getNumNodes() === 0) {
            Utils.showUserMessage("Error", "Unable to translate. Logical graph has no nodes!");
            return;
        }

        if (eagle.logicalGraph().fileInfo().name === ""){
            Utils.showUserMessage("Error", "Unable to translate. Logical graph does not have a name! Please save the graph first.");
            return;
        }

        const translatorURL : string = Setting.findValue(Utils.TRANSLATOR_URL);
        console.log("Eagle.getPGT() : ", "algorithm name:", algorithmName, "translator URL", translatorURL);

        // set the schema version
        format = Eagle.DALiuGESchemaVersion.OJS;

        /*
        if (format === Eagle.DALiuGESchemaVersion.Unknown){
            const schemas: Eagle.DALiuGESchemaVersion[] = [Eagle.DALiuGESchemaVersion.OJS];

            // ask user to specify graph format to be sent to translator
            Utils.requestUserChoice("Translation format", "Please select the format for the graph that will be sent to the translator", schemas, 0, false, "", (completed: boolean, userChoiceIndex: number) => {
                if (!completed){
                    console.log("User aborted translation.");
                    return;
                }

                this._genPGT(eagle, translatorURL, algorithmIndex, testingMode, schemas[userChoiceIndex]);
            });
        } else {
            this._genPGT(eagle, translatorURL, algorithmIndex, testingMode, format);
        }
        */
        this._genPGT(eagle, translatorURL, algorithmName, testingMode, format);
    }

    private _genPGT = (eagle: Eagle, translatorURL: string, algorithmName : string, testingMode: boolean, format: Eagle.DALiuGESchemaVersion) : void => {
        // get json for logical graph
        let json;
        switch (format){
            case Eagle.DALiuGESchemaVersion.OJS:
                json = LogicalGraph.toOJSJson(eagle.logicalGraph(), true);
                break;
            default:
                console.error("Unsupported graph format for translator!");
                return;
        }

        // validate json
        if (!Setting.findValue(Utils.DISABLE_JSON_VALIDATION)){
            const validatorResult : {valid: boolean, errors: string} = Utils.validateJSON(json, format, Eagle.FileType.Graph);
            if (!validatorResult.valid){
                const message = "JSON Output failed validation against internal JSON schema, saving anyway";
                console.error(message, validatorResult.errors);
                Utils.showUserMessage("Error", message + "<br/>" + validatorResult.errors);
                //return;
            }
        }

        const translatorData = {
            algo: algorithmName,
            lg_name: eagle.logicalGraph().fileInfo().name,
            json_data: JSON.stringify(json),
            test: testingMode.toString()
        };

        eagle.translator().submit(translatorURL, translatorData);

        // mostly for debugging purposes
        console.log("translator data");
        console.log("---------");
        console.log(translatorData);
        console.log("---------");
        console.log(json);
        console.log("---------");
    }
}
