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
import { Hierarchy } from "./Hierarchy";
import { ParameterTable } from "./ParameterTable";


class Snapshot {
    description: ko.Observable<string>;
    data : ko.Observable<LogicalGraph>;

    constructor(description: string, data: LogicalGraph){
        this.description = ko.observable(description);
        this.data = ko.observable(data);
    }
}

export class Undo {
    static readonly MEMORY_SIZE : number = 10;

    memory: ko.ObservableArray<Snapshot>;
    front: ko.Observable<number>; // place where next snapshot will go
    rear: ko.Observable<number>;
    current: ko.Observable<number>; // snapshot currently in use, normally equal to front

    constructor(){
        this.memory = ko.observableArray([]);
        for (let i = 0 ; i < Undo.MEMORY_SIZE ; i++){
            this.memory.push(null);
        }

        this.front = ko.observable(0);
        this.rear = ko.observable(0);
        this.current = ko.observable(0);
    }

    clear = () : void => {
        for (let i = 0 ; i < Undo.MEMORY_SIZE ; i++){
            this.memory()[i] = null;
        }
        this.memory.valueHasMutated();
        this.front(0);
        this.current(0);
        this.rear(0);
    }

    pushSnapshot = (eagle: Eagle, description: string) : void => {
        const previousIndex = (this.current() + Undo.MEMORY_SIZE - 1) % Undo.MEMORY_SIZE;
        const previousSnapshot : Snapshot = this.memory()[previousIndex];
        const newContent : LogicalGraph = eagle.logicalGraph().clone();

        // check if newContent matches old content, if so, no need to push
        // TODO: maybe speed this up with checksums? or maybe not required
        if (previousSnapshot !== null && previousSnapshot.data() === newContent){
            console.log("Undo.pushSnapshot() : content hasn't changed, abort!");
            return;
        }

        this.memory()[this.current()] = new Snapshot(description, newContent);
        this.memory.valueHasMutated();
        this.front((this.current() + 1) % Undo.MEMORY_SIZE);
        this.current(this.front());

        // update rear
        if (this.rear() === this.front()){
            this.rear((this.rear() + 1) % Undo.MEMORY_SIZE);
        }

        // delete items from current to rear
        for (let i = 0 ; i < Undo.MEMORY_SIZE ; i++){
            const index = (this.current() + i) % Undo.MEMORY_SIZE;

            if (((index + 1) % Undo.MEMORY_SIZE) === this.rear()){
                break;
            }

            this.memory()[index] = null;
        }

        if (Setting.findValue(Setting.PRINT_UNDO_STATE_TO_JS_CONSOLE)){
            Undo.printTable();
        }
    }

    prevSnapshot = (eagle: Eagle) : void => {
        if (this.rear() === this.current()){
            Utils.showNotification("Unable to Undo", "No further history available", "warning");
            return;
        }

        const prevprevIndex = (this.current() + Undo.MEMORY_SIZE - 2) % Undo.MEMORY_SIZE;

        this._loadFromIndex(prevprevIndex, eagle);
        this.current((this.current() + Undo.MEMORY_SIZE - 1) % Undo.MEMORY_SIZE);

        if (Setting.findValue(Setting.PRINT_UNDO_STATE_TO_JS_CONSOLE)){
            Undo.printTable();
        }

        eagle.checkGraph();

        this._updateSelection();

        // update the ParameterTable view
        ParameterTable.updateContent(eagle.selectedNode());

        //we need to update the hierarchy view. this needs a small timeout to wait for the undo to complete
        setTimeout(function(){
            Hierarchy.updateDisplay()
        },100)
    }

    nextSnapshot = (eagle: Eagle) : void => {
        if (this.front() === this.current()){
            Utils.showNotification("Unable to Redo", "No further history available", "warning");
            return;
        }

        this._loadFromIndex(this.current(), eagle);
        this.current((this.current() + 1) % Undo.MEMORY_SIZE);

        if (Setting.findValue(Setting.PRINT_UNDO_STATE_TO_JS_CONSOLE)){
            Undo.printTable();
        }

        eagle.checkGraph();

        this._updateSelection();

        // update the ParameterTable view
        ParameterTable.updateContent(eagle.selectedNode());

        //we need to update the hierarchy view. this needs a small timeout to wait for the undo to complete
        setTimeout(function(){
            Hierarchy.updateDisplay()
        },100)
    }

    toString = () : string => {
        const result = [];

        for (let i = 0; i < Undo.MEMORY_SIZE ; i++){
            let suffix = "";

            if (i === this.rear()){
                suffix += "r";
            }
            if (i === this.current()){
                suffix += "c";
            }
            if (i === this.front()){
                suffix += "f";
            }

            result.push(i + suffix);
        }

        return result.join(",");
    }

    _loadFromIndex = (index: number, eagle: Eagle) : void => {
        const snapshot : Snapshot = this.memory()[index];

        if (snapshot === null){
            console.warn("Undo memory at index", index, "is null");
            return;
        }

        const dataObject: LogicalGraph = snapshot.data();
        eagle.logicalGraph(dataObject.clone());
    }

    // if we undo, or redo, then the objects in selectedObject are from the graph prior to the new snapshot
    // so the references will be to non-existent objects
    // in this function, we use the ids of the old selectedObjects, and attempt to add the matching objects in the new snapshot to the selectedObjects list
    _updateSelection = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        const objectIds: (NodeId | EdgeId)[] = [];

        // build a list of the ids of the selected objects
        for (const object of eagle.selectedObjects()){
            objectIds.push(object.getId());
        }

        // clear selection
        eagle.setSelection(null, Eagle.FileType.Graph);

        // find the objects in the ids list, and add them to the selection
        for (const id of objectIds){
            const node = eagle.logicalGraph().findNodeById(id as NodeId);
            const edge = eagle.logicalGraph().findEdgeById(id as EdgeId);
            const object = node || edge;

            // abort if no edge or node exists fot that id
            if (node === null && edge === null){
                continue;
            }

            eagle.editSelection(object, Eagle.selectedLocation());
        }
    }

    static printTable() : void {
        const eagle: Eagle = Eagle.getInstance();
        const tableData : any[] = [];
        const realCurrent: number = (eagle.undo().current() - 1 + Undo.MEMORY_SIZE) % Undo.MEMORY_SIZE;

        for (let i = Undo.MEMORY_SIZE - 1 ; i >= 0 ; i--){
            const snapshot = eagle.undo().memory()[i];

            if (snapshot === null){
                continue;
            }

            tableData.push({
                "current": realCurrent === i ? "->" : "",
                "description": snapshot.description(),
                "buffer position": i,
                "nodes": snapshot.data().getNodes().length,
                "edges": snapshot.data().getEdges().length
            });
        }

        // cycle the table rows (move top row to bottom) X times so that we have "front" at the top of the table
        const numCycles = tableData.length - eagle.undo().front();
        for (let i = 0 ; i < numCycles ; i++){
            tableData.push(tableData.shift());
        }

        console.table(tableData);
    }
}
