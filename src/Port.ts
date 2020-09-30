import {Utils} from './Utils';

export class Port {
    private _id : string
    private name : string;
    private nodeKey : number;

    public static readonly DEFAULT_ID : string = "<default>";

    constructor(id : string, name : string){
        this._id = id;
        this.name = name;
        this.nodeKey = 0;
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
    }

    isEventPort = () : boolean => {
        return Utils.isEventPortName(this.name);
    }

    clone = () : Port => {
        return new Port(this._id, this.name);
    }
}
