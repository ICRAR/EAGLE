import {Eagle} from './Eagle';

export class Port {
    private _id : string
    private name : string;
    private nodeKey : number;
    private local : boolean;
    private event : boolean;
    private type : Eagle.DataType;

    public static readonly DEFAULT_ID : string = "<default>";
    public static readonly DEFAULT_EVENT_PORT_NAME = "event";

    constructor(id : string, name : string, event : boolean, type: Eagle.DataType){
        this._id = id;
        this.name = name;
        this.nodeKey = 0;
        this.local = false;
        this.event = event;
        this.type = type;
    }

    getId = () : string => {
        return this._id;
    }

    setId = (id: string): void => {
        this._id = id;
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
        this.local = false;
        this.event = false;
        this.type = Eagle.DataType.Unknown;
    }

    isEvent = () : boolean => {
        return this.event;
    }

    setEvent = (event : boolean) : void => {
        this.event = event;
    }

    toggleEvent = () : void => {
        console.log("toggleEvent()", this._id, !this.event);
        this.event = !this.event;
    }

    getType = (): Eagle.DataType => {
        return this.type;
    }

    getDescriptionText = () : string => {
        return this.name + " (" + this.type + ")";
    }

    clone = () : Port => {
        var p = new Port(this._id, this.name, this.event, this.type);
        p.local = this.local;
        return p;
    }

    copy = (src: Port) => {
        this.name = src.name;
        this.nodeKey = src.nodeKey;
        this.local = src.local;
        this.event = src.event;
        this.type = src.type;
    }

    static toOJSJson = (port : Port) : object => {
        return {
            Id:port._id,
            IdText:port.name,
            event:port.event,
            type:port.type
        };
    }

    static toV3Json = (port : Port) : object => {
        return {
            name:port.name,
            event:port.event,
            type:port.type
        };
    }

    static fromOJSJson = (data : any) : Port => {
        let event = false;
        let type = Eagle.DataType.Unknown;

        if (typeof data.event !== 'undefined')
            event = data.event;
        if (typeof data.type !== 'undefined')
            type = data.type;

        return new Port(data.Id, data.IdText, event, type);
    }
}
