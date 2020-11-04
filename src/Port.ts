import {Utils} from './Utils';

export class Port {
    private _id : string
    private name : string;
    private nodeKey : number;
    private local : boolean;

    public static readonly DEFAULT_ID : string = "<default>";

    constructor(id : string, name : string){
        this._id = id;
        this.name = name;
        this.nodeKey = 0;
        this.local = false;
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

    isLocal = () : boolean => {
        return this.local;
    }

    setLocal = (local : boolean) : void => {
        this.local = local;
    }

    clear = () : void => {
        this._id = "";
        this.name = "";
        this.nodeKey = 0;
        this.local = false;
    }

    isEventPort = () : boolean => {
        return Utils.isEventPortName(this.name);
    }

    clone = () : Port => {
        var p = new Port(this._id, this.name);
        p.local = this.local;
        return p;
    }
}
