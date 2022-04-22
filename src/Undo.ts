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
    static memory: ko.ObservableArray<Snapshot>;
    static index: ko.Observable<number>; // place where next snapshot will go

    static init(){
        Undo.memory = ko.observableArray([]);
        for (let i = 0 ; i < Config.UNDO_MEMORY_SIZE ; i++){
            Undo.memory.push(null);
        }

        Undo.index = ko.observable(0);
    }

    static clear = () : void => {
        for (let i = 0 ; i < Config.UNDO_MEMORY_SIZE ; i++){
            Undo.memory()[i] = null;
        }
        Undo.index(0);
    }

    static pushSnapshot = (eagle: Eagle, description: string) : void => {
        console.log("Undo.pushSnapshot()");

        const previousIndex = (Undo.index() + Config.UNDO_MEMORY_SIZE - 1) % Config.UNDO_MEMORY_SIZE;
        const previousSnapshot : Snapshot = Undo.memory()[previousIndex];
        const newContent : string = JSON.stringify(LogicalGraph.toOJSJson(eagle.logicalGraph()));

        // check if newContent matches old content, if so, no need to push
        // TODO: maybe speed this up with checksums? or maybe not required
        if (previousSnapshot !== null && previousSnapshot.data() === newContent){
            console.log("Undo.pushSnapshot() : content hasn't changed, abort!");
            return;
        }

        Undo.memory()[Undo.index()] = new Snapshot(description, newContent);
        Undo.index((Undo.index() + 1) % Config.UNDO_MEMORY_SIZE);
    }

    static popSnapshot = (eagle: Eagle) : void => {
        console.log("Undo.popSnapshot()");

        const prevprevIndex = (Undo.index() + Config.UNDO_MEMORY_SIZE - 2) % Config.UNDO_MEMORY_SIZE;
        const prevIndex = (Undo.index() + Config.UNDO_MEMORY_SIZE - 1) % Config.UNDO_MEMORY_SIZE;
        const previousSnapshot : Snapshot = Undo.memory()[prevprevIndex];

        if (previousSnapshot !== null){
            Undo.memory()[prevIndex] = null;
            Undo.index(prevIndex);

            const dataObject = JSON.parse(previousSnapshot.data());
            const errorsWarnings: Eagle.ErrorsWarnings = {errors: [], warnings: []};
            const dummyFile: RepositoryFile = new RepositoryFile(Repository.DUMMY, "", "");

            eagle.logicalGraph(LogicalGraph.fromOJSJson(dataObject, dummyFile, errorsWarnings));
        }
    }

    static print = () : string => {
        const result = [];

        for (let i = Config.UNDO_MEMORY_SIZE - 1 ; i >= 0 ; i--){
            const index = (i + Undo.index()) % Config.UNDO_MEMORY_SIZE;

            if (Undo.memory()[index] === null){
                break;
            }

            result.push(index);
        }

        return result.join(",");
    }
}
