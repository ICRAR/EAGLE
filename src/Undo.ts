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
import {Config} from './Config';
import {Repository} from './Repository';
import {RepositoryFile} from './RepositoryFile';

class Snapshot {
    description: ko.Observable<string>;
    data : ko.Observable<string>; // TODO: can we store the data as an object, must we go to JSON?

    constructor(description: string, data: string){
        this.description = ko.observable(description);
        this.data = ko.observable(data);
    }
}

export class Undo {
    memory: ko.ObservableArray<Snapshot>;
    front: ko.Observable<number>; // place where next snapshot will go
    rear: ko.Observable<number>;

    constructor(){
        this.memory = ko.observableArray([]);
        for (let i = 0 ; i < Config.UNDO_MEMORY_SIZE ; i++){
            this.memory.push(null);
        }

        this.front = ko.observable(0);
        this.rear = ko.observable(0);
    }

    clear = () : void => {
        for (let i = 0 ; i < Config.UNDO_MEMORY_SIZE ; i++){
            this.memory()[i] = null;
        }
        this.memory.valueHasMutated();
        this.front(0);
        this.rear(0);
    }

    pushSnapshot = (eagle: Eagle, description: string) : void => {
        console.log("Undo.pushSnapshot()");

        const previousIndex = (this.front() + Config.UNDO_MEMORY_SIZE - 1) % Config.UNDO_MEMORY_SIZE;
        const previousSnapshot : Snapshot = this.memory()[previousIndex];
        const newContent : string = JSON.stringify(LogicalGraph.toOJSJson(eagle.logicalGraph()));

        // check if newContent matches old content, if so, no need to push
        // TODO: maybe speed this up with checksums? or maybe not required
        if (previousSnapshot !== null && previousSnapshot.data() === newContent){
            console.log("Undo.pushSnapshot() : content hasn't changed, abort!");
            return;
        }

        this.memory()[this.front()] = new Snapshot(description, newContent);
        this.memory.valueHasMutated();
        this.front((this.front() + 1) % Config.UNDO_MEMORY_SIZE);

        // TODO: update rear
    }

    popSnapshot = (eagle: Eagle) : void => {
        console.log("Undo.popSnapshot()");

        const prevprevIndex = (this.index() + Config.UNDO_MEMORY_SIZE - 2) % Config.UNDO_MEMORY_SIZE;
        const prevIndex = (this.index() + Config.UNDO_MEMORY_SIZE - 1) % Config.UNDO_MEMORY_SIZE;
        const previousSnapshot : Snapshot = this.memory()[prevprevIndex];

        if (previousSnapshot !== null){
            this.memory()[prevIndex] = null;
            this.memory.valueHasMutated();
            this.index(prevIndex);

            const dataObject = JSON.parse(previousSnapshot.data());
            const errorsWarnings: Eagle.ErrorsWarnings = {errors: [], warnings: []};
            const dummyFile: RepositoryFile = new RepositoryFile(Repository.DUMMY, "", "");

            eagle.logicalGraph(LogicalGraph.fromOJSJson(dataObject, dummyFile, errorsWarnings));
        }
    }

    prevSnapshot = (eagle: Eagle) : void => {

    }

    nextSnapshot = (eagle: Eagle) : void => {

    }

    print = () : string => {
        const result = [];

        for (let i = Config.UNDO_MEMORY_SIZE - 1 ; i >= 0 ; i--){
            const index = (i + this.index()) % Config.UNDO_MEMORY_SIZE;

            if (this.memory()[index] === null){
                break;
            }

            result.push(index);
        }

        return result.join(",");
    }

    history : ko.PureComputed<Snapshot[]> = ko.pureComputed(() => {
        const result : Snapshot[] = [];

        for (let i = Config.UNDO_MEMORY_SIZE - 1 ; i >= 0 ; i--){
            const index = (i + this.index()) % Config.UNDO_MEMORY_SIZE;

            if (this.memory()[index] === null){
                break;
            }

            result.push(this.memory()[index]);
        }

        return result;
    }, this);
}
