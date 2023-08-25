const colors: { name: string; color: string; }[] = [
    {
        name: 'bodyBorder',
        color: '#2e3192'
    },{
        name: 'branchBg',
        color: '#d4d4d4'
    },{
        name: 'constructBg',
        color: '#d4d4d4'
    },{
        name: 'constructIcon',
        color: '#c1c1c1'
    },{
        name: 'graphText',
        color: 'black'
    },{
        name: 'nodeBg',
        color: 'white'
    },{
        name: 'nodeInputPort',
        color: '#2bb673'
    },{
        name: 'nodeOutputPort',
        color: '#fbb040'
    },{
        name: 'selectBackground',
        color: '#b4d4ff'
    }
]

const normalNodeRadius = 25
const branchNodeRadius = 44
const constructNodeRadius = 300

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

    static getConstructRadius = () : number => {
        return constructNodeRadius
    }

}