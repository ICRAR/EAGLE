export class Field {
    private text : string;
    private name : string;
    private value : string;
    private description : string;
    private readonly : boolean;

    constructor(text: string, name: string, value: string, description: string, readonly: boolean){
        this.text = text;
        this.name = name;
        this.value = value;
        this.description = description;
        this.readonly = readonly;
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
        return this.description == "" ? "No description available" : this.description;
    }

    isReadonly = () : boolean => {
        return this.readonly;
    }

    setValue = (value : string) : void => {
        this.value = value;
    }

    clear = () : void => {
        this.text = "";
        this.name = "";
        this.value = "";
        this.description = "";
    }

    clone = () : Field => {
        return new Field(this.text, this.name, this.value, this.description, this.readonly);
    }

    static toOJSJson = (field : Field) : object => {
        return {
            text:field.text,
            name:field.name,
            value:field.value,
            description:field.description,
            readonly:field.readonly
        };
    }

    static fromOJSJson = (data : any) : Field => {
        if (typeof data.readonly === 'undefined')
            return new Field(data.text, data.name, data.value, data.description, false);
        else
            return new Field(data.text, data.name, data.value, data.description, data.readonly);
    }
}
