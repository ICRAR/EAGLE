const colors: { name: string; color: string; }[] = [
    {
    //node colours
        name: 'bodyBorder',
        color: '#2e3192'
    },{
        name: 'branchBg',
        color: '#d4d4d4'
    },{
        name: 'constructBg',
        color: '#1f344d12'
    },{
        name: 'embeddedApp',
        color: '#d2d5d9'
    },{
        name: 'constructIcon',
        color: '#0000000f'
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
        name: 'selectConstructBackground',
        color: '#85b9ff94'
    },{

    //edge colours
        name: 'edgeDefault',
        color: '#58595b'
    },{
        name: 'edgeDefaultSelected',
        color: '#4247df'
    },{
        name: 'commentEdge',
        color: '#7c7e81'
    },{
        name: 'edgeValid',
        color: '#32cd32'
    },{
        name: 'edgeWarning',
        color: '#ffa500'
    },{
        name: 'edgeWarningSelected',
        color: '#4247df'
    },{
        name: 'edgeInvalid',
        color: '#ff0000'
    },{
        name: 'edgeInvalidSelected',
        color: '#4247df'
    },{
        name: 'edgeEvent',
        color: '#a6a6fe'
    },{
        name: 'edgeEventSelected',
        color: '#4247df'
    },{
        name: 'edgeAutoCompleteSuggestion',
        color: '#9980af'
    },{
        name: 'edgeAutoComplete',
        color: '#9c3bca'
    },{
        name: 'edgeClosesLoop',
        color: '#58595b'
    },{
        name: 'edgeClosesLoopSelected',
        color: '#4247df'
    }
]

export class GraphConfig {

    // graph behaviour
    public static readonly NODE_SUGGESTION_RADIUS = 150
    
    //node settings
    // TODO: could move to CategoryData?
    public static readonly NORMAL_NODE_RADIUS : number = 25;
    public static readonly BRANCH_NODE_RADIUS : number = 44;
    public static readonly CONSTRUCT_NODE_RADIUS: number = 200;
    public static readonly MINIMUM_CONSTRUCT_RADIUS : number = 44;

    //edge settings
    public static readonly EDGE_ARROW_SIZE : number = 8;
    public static readonly EDGE_DISTANCE_ARROW_VISIBILITY : number = 100; //how loong does an edge have to be to show the direction arrows

    // when creating a new construct to enclose a selection, or shrinking a node to enclose its children,
    // this is the default margin that should be left on each side
    public static readonly CONSTRUCT_MARGIN: number = 30;
    public static readonly CONSTRUCT_DRAG_OUT_DISTANCE: number = 200;

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