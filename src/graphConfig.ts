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

export class GraphConfig {

    // TODO: could move to CategoryData?
    public static readonly NORMAL_NODE_RADIUS : number = 25;
    public static readonly BRANCH_NODE_RADIUS : number = 44;
    public static readonly CONSTRUCT_NODE_RADIUS: number = 300;
    public static readonly MINIMUM_CONSTRUCT_RADIUS : number = 200;

    // when creating a new construct to enclose a selection, or shrinking a node to enclose its children,
    // this is the default margin that should be left on each side
    public static readonly CONSTRUCT_MARGIN: number = 25;

    static getColor = (name:string) : string => {
        let result = 'red'
        for (const color of colors) {
            if(color.name === name){
                result = color.color
            }else{
                continue
            }
        }
        return result
    }
}