import * as ko from "knockout";
import { Node } from './Node';

export class Nodes {
    private nodeMap: ko.Observable<Nodes.NodeMap>;

    constructor(){
        this.nodeMap = ko.observable({});
    }

    get = (id: NodeId) : Node => {
        if (this.nodeMap().hasOwnProperty(id)){
            return this.nodeMap()[id];
        } else {
            return null;
        }
    }

    add = (node: Node): Node => {
        this.nodeMap()[node.getId()] = node;
        return node;
    }

    remove = (id: NodeId): void => {
        delete this.nodeMap()[id];
    }

    all = () : Node[] => {
        return Object.values(this.nodeMap());
    }

    clear = () : void => {
        this.nodeMap({});
    }
}

export namespace Nodes {
    export type NodeMap = {
        [key: NodeId]: Node;
    };
}