import * as ko from "knockout";

import { ActionMessage } from "./Action";
import { Eagle } from './Eagle';
import { Edge } from "./Edge";
import { LogicalGraph } from "./LogicalGraph";
import { Node } from "./Node";
import { Utils } from './Utils';

export class GraphChecker {

    issues: ko.ObservableArray<ActionMessage>;

    constructor(){
        this.issues = ko.observableArray([]);
    }

    static check(logicalGraph: LogicalGraph){
        const errors: ActionMessage[] = [];
        const eagle: Eagle = Eagle.getInstance();

        // check all nodes are valid
        for (const node of logicalGraph.getNodes()){
            Node.isValid(eagle, node, Eagle.selectedLocation(), false, false, errors);
        }

        // check all edges are valid
        for (const edge of logicalGraph.getEdges()){
            Edge.isValid(logicalGraph, edge.getId(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), edge.isLoopAware(), edge.isClosesLoop(), false, false, errors);
        }

        return errors;
    }

    // TODO: should we pass eagle as an argument here?
    check = () : void => {
        const eagle = Eagle.getInstance();
        const logicalGraph: LogicalGraph = eagle.logicalGraph();
        const errors: ActionMessage[] = GraphChecker.check(logicalGraph);
        this.issues(errors);
    }

    fix = (eagle: Eagle, fixFunc: () => void): void => {
        fixFunc();
        this.postFixFunc(eagle);
    }

    // TODO: should we pass eagle as an argument here?
    fixAll = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        const initialNumMessages = this.issues().length;
        let numMessages   = Infinity;
        let numIterations = 0;

        // iterate through the messages list multiple times, until the length of the list is unchanged
        while (numMessages !== this.issues().length){
            // check that we haven't iterated through the list too many times
            if (numIterations > 10){
                console.warn("Too many iterations in performAll()");
                break;
            }
            numIterations = numIterations+1;

            numMessages = this.issues().length;

            for (const message of this.issues()){
                if (message.fix !== null){
                    message.fix();
                }
            }
        }

        // show notification
        Utils.showNotification("Fixed All Issues: ", initialNumMessages + " issue(s), " + numMessages + " remain. ", "info");

        this.postFixFunc(eagle);
    }

    postFixFunc = (eagle: Eagle) => {
        eagle.selectedObjects.valueHasMutated();
        eagle.logicalGraph().fileInfo().modified = true;

        this.check();

        eagle.undo().pushSnapshot(eagle, "Fix");
    }

    getNumFixableIssues : ko.PureComputed<number> = ko.pureComputed(() => {
        let count: number = 0;

        // count the warnings
        for (const message of this.issues()){
            if (message.fix !== null){
                count += 1;
            }
        }

        return count;
    }, this);


    getNumWarnings : ko.PureComputed<number> = ko.pureComputed(() => {
        let result: number = 0;

        for (const error of this.issues()){
            if (error.level === ActionMessage.Level.Warning){
                result += 1;
            }
        }

        return result;

    }, this);

    getNumErrors : ko.PureComputed<number> = ko.pureComputed(() => {
        let result: number = 0;

        for (const error of this.issues()){
            if (error.level === ActionMessage.Level.Error){
                result += 1;
            }
        }

        return result;
    }, this);

    static hasWarnings = (errors: ActionMessage[]) : boolean => {
        if (errors === null){
            return false;
        }

        for (const error of errors){
            if (error.level === ActionMessage.Level.Warning){
                return true;
            }
        }
        return false;
    }

    static hasErrors = (errors: ActionMessage[]) : boolean => {
        if (errors === null){
            return false;
        }

        for (const error of errors){
            if (error.level === ActionMessage.Level.Error){
                return true;
            }
        }
        return false;
    }

    // only update result if it is worse that current result
    static worstError(errors: ActionMessage[]) : Eagle.LinkValid {
        // TODO: can probably avoid doing two loops here!
        const hasWarnings: boolean = GraphChecker.hasWarnings(errors);
        const hasErrors: boolean   = GraphChecker.hasErrors(errors);

        if (!hasWarnings && !hasErrors){
            return Eagle.LinkValid.Valid;
        }

        if (hasErrors){
            return Eagle.LinkValid.Invalid;
        }

        return Eagle.LinkValid.Warning;
    }
}

