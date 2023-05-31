import * as ko from "knockout";

import { ActionMessage } from "./Action";
import { Eagle } from './Eagle';
import { Utils } from './Utils';

export class ActionList {

    actions: ActionMessage[];  

    static fixAll = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        const initialNumMessages = eagle.actionMessages().length;
        let numMessages   = Infinity;
        let numIterations = 0;

        while (numMessages !== eagle.actionMessages().length){
            if (numIterations > 10){
                console.warn("Too many iterations in fixAll()");
                break;
            }
            numIterations = numIterations+1;

            numMessages = eagle.actionMessages().length;

            for (const message of eagle.actionMessages()){
                if (message.fix !== null){
                    message.fix();
                }
            }

            // TODO: if the fixAll function performed component updates, then we do not need to re-check the graph
            eagle.checkGraph();
        }

        // show notification
        Utils.showNotification("Fix All Graph Errors", initialNumMessages + " error(s), " + numMessages + " remain. ", "info");

        Utils.postFixFunc(eagle);
    }

    static getNumWarnings : ko.PureComputed<number> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();
        let result: number = 0;

        for (const error of eagle.checkGraphMessages()){
            if (error.level === ActionMessage.Level.Warning){
                result += 1;
            }
        }

        return result;

    }, this);

    static getNumErrors : ko.PureComputed<number> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();
         let result: number = 0;

        for (const error of eagle.checkGraphMessages()){
            if (error.level === ActionMessage.Level.Error){
                result += 1;
            }
        }

        return result;
    }, this);
}
