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

import {Config} from './Config';
import {Eagle} from './Eagle';
import {LogicalGraph} from './LogicalGraph';
import {Setting} from './Setting';
import {Utils} from './Utils';


class Snapshot {
    description: ko.Observable<string>;
    data : ko.Observable<LogicalGraph>;

    constructor(description: string, data: LogicalGraph){
        this.description = ko.observable(description);
        this.data = ko.observable(data);
    }
}

export class Undo {
    memory: ko.ObservableArray<Snapshot>;
    front: ko.Observable<number>; // place where next snapshot will go
    rear: ko.Observable<number>;
    current: ko.Observable<number>; // snapshot currently in use, normally equal to front

    constructor(){
        this.memory = ko.observableArray([]);
        for (let i = 0 ; i < Config.UNDO_MEMORY_SIZE ; i++){
            this.memory.push(null);
        }

        this.front = ko.observable(0);
        this.rear = ko.observable(0);
        this.current = ko.observable(0);
    }

    clear = () : void => {
        for (let i = 0 ; i < Config.UNDO_MEMORY_SIZE ; i++){
            this.memory()[i] = null;
        }
        this.memory.valueHasMutated();
        this.front(0);
        this.current(0);
        this.rear(0);
    }

    pushSnapshot = (eagle: Eagle, description: string) : void => {
        const previousIndex = (this.current() + Config.UNDO_MEMORY_SIZE - 1) % Config.UNDO_MEMORY_SIZE;
        const previousSnapshot : Snapshot = this.memory()[previousIndex];
        const newContent : LogicalGraph = eagle.logicalGraph().clone();

        // check if newContent matches old content, if so, no need to push
        // TODO: maybe speed this up with checksums? or maybe not required
        if (previousSnapshot !== null && previousSnapshot.data() === newContent){
            console.log("Undo.pushSnapshot() : content hasn't changed, abort!");
            return;
        }

        console.log("Undo: write to memory at", this.current());
        this.memory()[this.current()] = new Snapshot(description, newContent);
        this.memory.valueHasMutated();
        this.front((this.current() + 1) % Config.UNDO_MEMORY_SIZE);
        this.current(this.front());

        // update rear
        if (this.rear() === this.front()){
            this.rear((this.rear() + 1) % Config.UNDO_MEMORY_SIZE);
        }

        // delete items from current to rear
        for (let i = 0 ; i < Config.UNDO_MEMORY_SIZE ; i++){
            const index = (this.current() + i) % Config.UNDO_MEMORY_SIZE;

            if (((index + 1) % Config.UNDO_MEMORY_SIZE) === this.rear()){
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
            console.log("Undo.prevSnapshot() : no previous snapshot, abort!");
            Utils.showNotification("Unable to Undo", "No further history available", "warning");
            return;
        }

        const prevprevIndex = (this.current() + Config.UNDO_MEMORY_SIZE - 2) % Config.UNDO_MEMORY_SIZE;

        this._loadFromIndex(prevprevIndex, eagle);
        this.current((this.current() + Config.UNDO_MEMORY_SIZE - 1) % Config.UNDO_MEMORY_SIZE);

        if (Setting.findValue(Setting.PRINT_UNDO_STATE_TO_JS_CONSOLE)){
            Undo.printTable();
        }

        eagle.checkGraph();

        this._updateSelection();
    }

    nextSnapshot = (eagle: Eagle) : void => {
        if (this.front() === this.current()){
            console.log("Undo.nextSnapshot() : no next snapshot, abort!");
            Utils.showNotification("Unable to Redo", "No further history available", "warning");
            return;
        }

        this._loadFromIndex(this.current(), eagle);
        this.current((this.current() + 1) % Config.UNDO_MEMORY_SIZE);

        if (Setting.findValue(Setting.PRINT_UNDO_STATE_TO_JS_CONSOLE)){
            Undo.printTable();
        }

        eagle.checkGraph();

        this._updateSelection();
    }

    toString = () : string => {
        const result = [];

        for (let i = 0; i < Config.UNDO_MEMORY_SIZE ; i++){
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
        console.log("_loadFromIndex()", index);
        const snapshot : Snapshot = this.memory()[index];

        if (snapshot === null){
            console.warn("Undo memory at index", index, "is null");
            return;
        }

        const dataObject: LogicalGraph = snapshot.data();
        console.log("dataObject", "nodes", dataObject.getNodes().length, "edges", dataObject.getEdges().length);

        eagle.logicalGraph(dataObject.clone());
    }

    // if we undo, or redo, then the objects in selectedObject are from the graph prior to the new snapshot
    // so the references will be to non-existent objects
    // in this function, we use the ids of the old selectedObjects, and attempt to add the matching objects in the new snapshot to the selectedObjects list
    _updateSelection = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        const objectIds: string[] = [];

        // build a list of the ids of the selected objects
        for (const object of eagle.selectedObjects()){
            objectIds.push(object.getId());
        }

        // clear selection
        eagle.setSelection(Eagle.RightWindowMode.Hierarchy, null, Eagle.FileType.Graph);

        // find the objects in the ids list, and add them to the selection
        for (const id of objectIds){
            const node = eagle.logicalGraph().findNodeById(id);
            const edge = eagle.logicalGraph().findEdgeById(id);
            const object = node || edge;

            eagle.editSelection(<Eagle.RightWindowMode>eagle.rightWindow().mode(), object, Eagle.selectedLocation());
        }
    }

    static printTable() : void {
        const eagle: Eagle = Eagle.getInstance();
        const tableData : any[] = [];
        const realCurrent: number = (eagle.undo().current() - 1 + Config.UNDO_MEMORY_SIZE) % Config.UNDO_MEMORY_SIZE;

        for (let i = Config.UNDO_MEMORY_SIZE - 1 ; i >= 0 ; i--){
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
