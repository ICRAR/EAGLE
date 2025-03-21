import * as ko from "knockout";
import { Edge } from './Edge';

export class Edges {
    private edgeMap: ko.Observable<Edges.EdgeMap>;

    constructor(){
        this.edgeMap = ko.observable({});
    }

    get = (id: EdgeId) : Edge => {
        if (this.edgeMap().hasOwnProperty(id)){
            return this.edgeMap()[id];
        } else {
            return null;
        }
    }

    add = (edge: Edge): void => {
        this.edgeMap()[edge.getId()] = edge;
    }

    remove = (id: EdgeId): void => {
        delete this.edgeMap()[id];
    }

    all = () : Edge[] => {
        return Object.values(this.edgeMap());
    }

    clear = () : void => {
        this.edgeMap({});
    }
}

export namespace Edges {
    export type EdgeMap = {
        [key: EdgeId]: Edge;
    };
}