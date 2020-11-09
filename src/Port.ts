import {Utils} from './Utils';

export class Port {
    private _id : string
    private name : string;
    private nodeKey : number;
    private event : boolean;

    public static readonly DEFAULT_ID : string = "<default>";
    public static readonly DEFAULT_EVENT_PORT_NAME = "event";

    constructor(id : string, name : string, event : boolean){
        this._id = id;
        this.name = name;
        this.nodeKey = 0;
        this.event = event;
    }

    getId = () : string => {
        return this._id;
    }

    getName = () : string => {
        return this.name;
    }

    getNodeKey = () : number => {
        return this.nodeKey;
    }

    setNodeKey = (key : number) : void => {
        this.nodeKey = key;
    }

    clear = () : void => {
        this._id = "";
        this.name = "";
        this.nodeKey = 0;
        this.event = false;
    }

    isEvent = () : boolean => {
        return this.event;
    }

    setEvent = (event : boolean) : void => {
        this.event = event;
    }

    clone = () : Port => {
        return new Port(this._id, this.name, this.event);
    }
}
