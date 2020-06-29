export class Field {
    private text : string;
    private name : string;
    private value : string;
    private description : string;

    constructor(text: string, name: string, value: string, description: string){
        this.text = text;
        this.name = name;
        this.value = value;
        this.description = description;
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
        return new Field(this.text, this.name, this.value, this.description);
    }

    static toOJSJson = (field : Field) : object => {
        return {
            text:field.text,
            name:field.name,
            value:field.value,
            description:field.description
        };
    }

    static fromOJSJson = (data : any) : Field => {
        return new Field(data.text, data.name, data.value, data.description);
    }
}
