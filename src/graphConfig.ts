const colors: { name: string; color: string; }[] = [
    {
        name: 'body',
        color: '#2e3192'
    },{
        name: 'graphText',
        color: 'black'
    },{
        name: 'nodeInputPort',
        color: '#2bb673'
    },{
        name: 'nodeOutputPort',
        color: '#fbb040'
    }
]

const normalNodeRadius = 25
const branchNodeRadius = 50

export class GraphConfig {

    static getColor = (name:string) : string => {
        let result = 'red'
        for (var color of colors) {
            if(color.name === name){
                result = color.color
            }else{
                continue
            }
        }
        return result
    }

    static getNormalRadius = () : number => {
        return normalNodeRadius
    }

    static getBranchRadius = () : number => {
        return branchNodeRadius
    }

}