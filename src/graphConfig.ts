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
        color: '#0000002e'
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
        name: 'nodeUtilPort',
        color: '#6fa7f1'
    },{
        name: 'selectBackground',
        color: '#b4d4ff'
    },{
        name: 'edgeColor',
        color: '#58595b'
    },{
        name: 'commentEdgeColor',
        color: '#7c7e81'
    }
]

const nodeSuggestionRadius = 150


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

    static getNodeSuggestionRadius = () : number => {
        return nodeSuggestionRadius
    }

}