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

import { Eagle } from './Eagle';
import { LogicalGraph } from './LogicalGraph';
import { Setting } from './Setting';
import { Utils } from './Utils';
import { Repository } from "./Repository";

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
        // consult EAGLE settings to determine whether to open the translator in a new tab
        const translateInCurrentTab: boolean = Setting.findValueAsBoolean(Setting.OPEN_TRANSLATOR_IN_CURRENT_TAB);
        const overwriteTranslationTab: boolean = Setting.findValueAsBoolean(Setting.OVERWRITE_TRANSLATION_TAB);

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
     genPGT = async (algorithmName : string, testingMode: boolean) : Promise<void> => {
        const eagle: Eagle = Eagle.getInstance();

        // check if the graph has at least one node
        if (eagle.logicalGraph().getNumNodes() === 0) {
            throw new Error("Unable to translate. Logical graph has no nodes!");
        }

        // check if the graph has a name
        if (eagle.logicalGraph().fileInfo().name === ""){
            throw new Error("Unable to translate. Logical graph does not have a name! Please save the graph first.");
        }

        // is the graph a local file?
        const isLocalFile: boolean = eagle.logicalGraph().fileInfo().location.repositoryService() === Repository.Service.File;

        // check if the graph is committed before translation
        if (!Setting.findValue(Setting.TEST_TRANSLATE_MODE) && !isLocalFile && this._checkGraphModified(eagle)){
            Utils.showNotification("Saving graph", "Automatically saving modified graph prior to translation", "info");

            // use the async function here, so that we can check isModified after saving
            await eagle.saveGraph();

            // short wait after saving, just to indicate to the user that saving is performed by EAGLE
            // and that the translation is a separate step
            await new Promise( resolve => setTimeout(resolve, 2000) );
            
            // check again if graph is modified
            if (this._checkGraphModified(eagle)){
                Utils.showNotification("Unable to Translate", "Please save/commit the graph before attempting translation", "danger");
                return;
            }
        }

        const translatorURL : string = Setting.findValueAsString(Setting.TRANSLATOR_URL);
        console.log("Eagle.getPGT() : ", "algorithm name:", algorithmName, "translator URL", translatorURL);

        this._genPGT(eagle, translatorURL, algorithmName, testingMode);
    }

    private _checkGraphModified = (eagle: Eagle): boolean => {
        return eagle.logicalGraph().fileInfo().modified && !Setting.findValue(Setting.ALLOW_MODIFIED_GRAPH_TRANSLATION);
    }

    private _genPGT = (eagle: Eagle, translatorURL: string, algorithmName : string, testingMode: boolean) : void => {
        // clone the logical graph
        const lgClone: LogicalGraph = eagle.logicalGraph().clone();

        // get the version of JSON we are using
        const version: Setting.SchemaVersion = Setting.findValueAsString(Setting.DALIUGE_SCHEMA_VERSION) as Setting.SchemaVersion;

        // convert to JSON
        const jsonString: string = LogicalGraph.toJsonString(lgClone, true, version);

        // validate json
        Utils.validateJSON(jsonString, Eagle.FileType.Graph, version);

        const translatorData = {
            algo: algorithmName,
            lg_name: eagle.logicalGraph().fileInfo().name,
            json_data: jsonString,
            test: testingMode.toString()
        };

        eagle.translator().submit(translatorURL, translatorData);

        // if developer setting is enabled, write the translator-ready JSON to the console
        if (Setting.findValue(Setting.PRINT_TRANSLATOR_JSON_TO_JS_CONSOLE)){
            console.log("Translator Json");
            console.log("---------");
            console.log(translatorData);
            console.log("---------");
            console.log(JSON.parse(jsonString));
            console.log("---------");
        }
    }

    algorithmVisible = (algorithm: string) : boolean => {
        const normalTranslatorMode :boolean = Setting.findValue(Setting.USER_TRANSLATOR_MODE) === Setting.TranslatorMode.Normal;
        if(!normalTranslatorMode){
            return true
        }
        if(algorithm === Setting.findValue(Setting.TRANSLATOR_ALGORITHM_DEFAULT)){
            return true
        }
    
        return false
    }
        
    setUrl = async () : Promise<void> => {
        const defaultUrl = Setting.findValueAsString(Setting.TRANSLATOR_URL);

        let userString: string;
        try {
            userString = await Utils.requestUserString("Translator Url", "Enter the Translator Url", defaultUrl, false);
        } catch (error){
            console.error(error);
            return;
        }

        Setting.setValue(Setting.TRANSLATOR_URL, userString);
    };
}
