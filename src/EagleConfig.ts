const colors: { name: string; color: string; }[] = [
    {
    //node colors
        name: 'bodyBorder',
        color: '#2e3192'
    },{
        name: 'branchBg',
        color: '#dcdee2'
    },{
        name: 'constructBg',
        color: '#05142912'
    },{
        name: 'embeddedApp',
        color: '#dcdee2'
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
        color: '#4346ac'
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
        name: 'errorBackground',
        color: '#ffdcdc'
    },{
        name: 'warningBackground',
        color: '#ffeac4'
    },{

    //edge colors
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
        name: 'edgeFixable',
        color: '#6dc7bd'
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
        color: '#dbcfe1'
    },{
        name: 'edgeAutoComplete',
        color: '#9c3bca'
    },{
        name: 'edgeClosesLoop',
        color: '#58595b'
    },{
        name: 'edgeClosesLoopSelected',
        color: '#4247df'
    },{

    // hierarchy colors
        name: 'hierarchyEdgeSelectedColor',
        color: '#2F16D5'
    },{
        name: 'hierarchyEdgeDefaultColor',
        color: '#000000'
    },{

    //graph issue colors
        name: 'graphError',
        color: '#ea2727'
    },{
        name: 'graphWarning',
        color: '#ffa500'
    },{
        
    //eagle colors
        name: 'hoverHighlight',
        color: '#feb609'
    }
]

export class EagleConfig {

    // graph behaviour
    public static readonly NODE_SUGGESTION_RADIUS = 300
    public static readonly NODE_SUGGESTION_SNAP_RADIUS = 150
    public static readonly PORT_MINIMUM_DISTANCE = 14
    
    //node settings
    // TODO: could move to CategoryData?
    public static readonly NORMAL_NODE_RADIUS : number = 25;
    public static readonly DATA_NODE_RADIUS : number = 18;
    public static readonly BRANCH_NODE_RADIUS : number = 44;
    public static readonly CONSTRUCT_NODE_RADIUS: number = 200;
    public static readonly MINIMUM_CONSTRUCT_RADIUS : number = 44;

    //edge settings
    public static readonly EDGE_ARROW_SIZE : number = 8;
    public static readonly EDGE_DISTANCE_ARROW_VISIBILITY : number = 100; //how long does an edge have to be to show the direction arrows
    public static readonly SWITCH_TO_STRAIGHT_EDGE_MULTIPLIER : number = 5 //this affect the cutoff distance between nodes required to switch between a straight and curved edge

    // when creating a new construct to enclose a selection, or shrinking a node to enclose its children,
    // this is the default margin that should be left on each side
    public static readonly CONSTRUCT_MARGIN: number = 30;
    public static readonly CONSTRUCT_DRAG_OUT_DISTANCE: number = 200;

    // number of spaces used for indenting output JSON, makes everything human-readable
    public static readonly JSON_INDENT: number = 4;

    static getColor(name:string) : string {
        let result: string = null;

        for (const color of colors) {
            if(color.name === name){
                result = color.color
                break;
            }
        }

        if (result === null){
            console.warn("EagleConfig.getColor() could not find color with name", name);
            result = 'red';
        }

        return result
    }

    static initCSS(){
        //overwriting css variables using colors from EagleConfig. I am using this for simple styling to avoid excessive css data binds in the node html files
        $("#logicalGraphParent").get(0).style.setProperty("--selectedBg", EagleConfig.getColor('selectBackground'));
        $("#logicalGraphParent").get(0).style.setProperty("--selectedConstructBg", EagleConfig.getColor('selectConstructBackground'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeBorder", EagleConfig.getColor('bodyBorder'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeBg", EagleConfig.getColor('nodeBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--graphText", EagleConfig.getColor('graphText'));
        $("#logicalGraphParent").get(0).style.setProperty("--branchBg", EagleConfig.getColor('branchBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--constructBg", EagleConfig.getColor('constructBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--embeddedApp", EagleConfig.getColor('embeddedApp'));
        $("#logicalGraphParent").get(0).style.setProperty("--constructIcon", EagleConfig.getColor('constructIcon'));
        $("#logicalGraphParent").get(0).style.setProperty("--commentEdgeColor", EagleConfig.getColor('commentEdge'));
        $("#logicalGraphParent").get(0).style.setProperty("--matchingEdgeColor", EagleConfig.getColor('edgeAutoComplete'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeOutputColor", EagleConfig.getColor('nodeOutputPort'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeInputColor", EagleConfig.getColor('nodeInputPort'));
        $("html").get(0).style.setProperty("--hoverHighlight", EagleConfig.getColor('hoverHighlight'));
    }
}