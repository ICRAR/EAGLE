import * as ko from "knockout";

import {Eagle} from './Eagle';

export class Port {
    private _id : ko.Observable<string>;
    private name : ko.Observable<string>;
    private nodeKey : ko.Observable<number>;
    private local : ko.Observable<boolean>;
    private event : ko.Observable<boolean>;
    private type : ko.Observable<Eagle.DataType>;

    public static readonly DEFAULT_ID : string = "<default>";
    public static readonly DEFAULT_EVENT_PORT_NAME = "event";

    constructor(id : string, name : string, event : boolean, type: Eagle.DataType){
        this._id = ko.observable(id);
        this.name = ko.observable(name);
        this.nodeKey = ko.observable(0);
        this.local = ko.observable(false);
        this.event = ko.observable(event);
        this.type = ko.observable(type);
    }

    getId = () : string => {
        return this._id();
    }

    setId = (id: string): void => {
        this._id(id);
    }

    getName = () : string => {
        return this.name();
    }

    setName = (name : string) : void => {
        this.name(name);
    }

    getNodeKey = () : number => {
        return this.nodeKey();
    }

    setNodeKey = (key : number) : void => {
        this.nodeKey(key);
    }

    clear = () : void => {
        this._id("");
        this.name("");
        this.nodeKey(0);
        this.local(false);
        this.event(false);
        this.type(Eagle.DataType.Unknown);
    }

    isEvent = () : boolean => {
        return this.event();
    }

    setEvent = (event : boolean) : void => {
        this.event(event);
    }

    toggleEvent = () : void => {
        console.log("toggleEvent()", this._id(), !this.event());
        this.event(!this.event());
    }

    getType = (): Eagle.DataType => {
        return this.type();
    }

    getDescriptionText : ko.PureComputed<string> = ko.pureComputed(() => {
        return this.name() + " (" + this.type() + ")";
    }, this);

    clone = () : Port => {
        var p = new Port(this._id(), this.name(), this.event(), this.type());
        p.local(this.local());
        return p;
    }

    copy = (src: Port) => {
        this.name(src.name());
        this.nodeKey(src.nodeKey());
        this.local(src.local());
        this.event(src.event());
        this.type(src.type());
    }

    copyWithKeyAndId = (src: Port, nodeKey: number, id: string) => {
        this._id(id);
        this.name(src.name());
        this.nodeKey(nodeKey);
        this.local(src.local());
        this.event(src.event());
        this.type(src.type());
    }

    static toOJSJson = (port : Port) : object => {
        return {
            Id:port._id(),
            IdText:port.name(),
            event:port.event(),
            type:port.type()
        };
    }

    static toV3Json = (port : Port) : object => {
        return {
            name:port.name(),
            event:port.event(),
            type:port.type()
        };
    }

    static fromOJSJson = (data : any) : Port => {
        let event: boolean = false;
        let type: Eagle.DataType = Eagle.DataType.Unknown;

        if (typeof data.event !== 'undefined')
            event = data.event;
        if (typeof data.type !== 'undefined')
            type = data.type;

        return new Port(data.Id, data.IdText, event, type);
    }
}
