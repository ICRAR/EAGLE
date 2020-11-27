import {Eagle} from './Eagle';

export class Field {
    private text : string;
    private name : string;
    private value : string;
    private description : string;
    private readonly : boolean;
    private type : Eagle.FieldDataType;

    constructor(text: string, name: string, value: string, description: string, readonly: boolean, type: Eagle.FieldDataType){
        this.text = text;
        this.name = name;
        this.value = value;
        this.description = description;
        this.readonly = readonly;
        this.type = type;
    }

    getText = () : string => {
        return this.text;
    }

    getName = () : string => {
        return this.name;
    }

    getValue = () : string => {
        return this.value;
    }

    getDescription = () : string => {
        return this.description;
    }

    getDescriptionText = () : string => {
        return this.description == "" ? "No description available" + " (" + this.type + ")" : this.description + " (" + this.type + ")";
    }

    isReadonly = () : boolean => {
        return this.readonly;
    }

    getType = () : Eagle.FieldDataType => {
        return this.type;
    }

    setValue = (value : string) : void => {
        this.value = value;
    }

    clear = () : void => {
        this.text = "";
        this.name = "";
        this.value = "";
        this.description = "";
        this.readonly = false;
        this.type = Eagle.FieldDataType.Unknown;
    }

    clone = () : Field => {
        return new Field(this.text, this.name, this.value, this.description, this.readonly, this.type);
    }

    static toOJSJson = (field : Field) : object => {
        return {
            text:field.text,
            name:field.name,
            value:field.value,
            description:field.description,
            readonly:field.readonly,
            type:field.type
        };
    }

    static fromOJSJson = (data : any) : Field => {
        let readonly = false;
        let type = Eagle.FieldDataType.Unknown;

        if (typeof data.readonly !== 'undefined')
            readonly = data.readonly;
        if (typeof data.type !== 'undefined')
            type = data.type;

        return new Field(data.text, data.name, data.value, data.description, readonly, type);
    }
}
