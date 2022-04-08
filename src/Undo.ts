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

export class Undo {
    static memory: ko.ObservableArray<string>;
    static index: ko.Observable<number>;

    static init(){
        Undo.memory = ko.observableArray([]);
        for (let i = 0 ; i < Config.UNDO_MEMORY_SIZE ; i++){
            Undo.memory.push(null);
        }

        Undo.index = ko.observable(0);
    }

    static clear = () : void => {
        Undo.memory.removeAll();
        Undo.index(0);
    }

    static push = (eagle: Eagle) : void => {
        console.log("Undo.push()");

        Undo.memory.splice(Undo.index(), 1, JSON.stringify(LogicalGraph.toOJSJson(eagle.logicalGraph())));
        Undo.index((Undo.index() + 1) % Config.UNDO_MEMORY_SIZE);
    }

    static pop = (eagle: Eagle) : void => {
        console.log("Undo.pop()");

        Undo.index((Undo.index() - 1) % Config.UNDO_MEMORY_SIZE);
        const data : string = Undo.memory()[Undo.index()];
        Undo.memory.splice(Undo.index(), 1, null);

        if (data !== null){
            const dataObject = JSON.parse(data);
            const errorsWarnings: Eagle.ErrorsWarnings = {errors: [], warnings: []};
            const dummyFile: RepositoryFile = new RepositoryFile(Repository.DUMMY, "", "");

            eagle.logicalGraph(LogicalGraph.fromOJSJson(dataObject, dummyFile, errorsWarnings));
        }

    }
}
