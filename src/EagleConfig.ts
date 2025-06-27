type ColorMap = {[name: string]: string};

const colors: ColorMap = {
    // node colors
    nodeDefault:                 '#ffffff',
    bodyBorder:                  '#2e3192',
    branchBackground:            '#dcdee2',
    constructBackground:         '#05142912',
    embeddedApp:                 '#dcdee2',
    constructIcon:               '#0000000f',
    graphText:                   'black',
    nodeBackground:              'white',
    nodeInputPort:               '#2bb673',
    nodeOutputPort:              '#4346ac',
    nodeUtilPort:                '#6fa7f1',
    selectBackground:            '#b4d4ff',
    selectedConstructBackground: '#85b9ff94',
    errorBackground:             '#ffdcdc',
    warningBackground:           '#ffeac4',

    // edge colors
    edgeDefault:                 '#58595b',
    edgeDefaultSelected:         '#4247df',
    commentEdge:                 '#7c7e81',
    edgeValid:                   '#32cd32',
    edgeWarning:                 '#ffa500',
    edgeFixable:                 '#6dc7bd',
    edgeWarningSelected:         '#4247df',
    edgeInvalid:                 '#ff0000',
    edgeInvalidSelected:         '#4247df',
    edgeEvent:                   '#a6a6fe',
    edgeEventSelected:           '#4247df',
    edgeAutoCompleteSuggestion:  '#dbcfe1',
    edgeAutoComplete:            '#9c3bca',
    edgeClosesLoop:              '#58595b',
    edgeClosesLoopSelected:      '#4247df',

    // hierarchy colors
    hierarchyEdgeSelected:       '#2F16D5',
    hierarchyEdgeDefault:        '#000000',

    // graph issue colors
    graphError:                  '#ea2727',
    graphWarning:                '#ffa500',
    
    // eagle colors
    hoverHighlight:              '#feb609'
};

export class EagleConfig {

    // General UI
    public static readonly DROPDOWN_DISMISS_DELAY: number = 400;
    public static readonly EDGE_SVG_SIZE: number = 10000;

    // graph behaviour
    public static readonly NODE_SUGGESTION_RADIUS = 300
    public static readonly NODE_SUGGESTION_SNAP_RADIUS = 150
    public static readonly PORT_MINIMUM_DISTANCE = 14
    
    //node settings
    // TODO: could move to CategoryData?
    public static readonly NORMAL_NODE_RADIUS : number = 25;
    public static readonly DATA_NODE_RADIUS : number = 18;
    public static readonly BRANCH_NODE_RADIUS : number = 32;
    public static readonly CONSTRUCT_NODE_RADIUS: number = 200;
    public static readonly MINIMUM_CONSTRUCT_RADIUS : number = 44;

    //edge settings
    public static readonly EDGE_ARROW_SIZE : number = 8;
    public static readonly EDGE_DISTANCE_ARROW_VISIBILITY : number = 100; //how long does an edge have to be to show the direction arrows
    public static readonly STRAIGHT_EDGE_SWITCH_DISTANCE : number = 120 //the length of the edge at which it will switch between bezier and straight
    public static readonly EDGE_BEZIER_CURVE_MULT : number = 0.4 //this affects how far away from the start and end of the edge the curve transform handles are

    // when creating a new construct to enclose a selection, or shrinking a node to enclose its children,
    // this is the default margin that should be left on each side
    public static readonly CONSTRUCT_MARGIN: number = 30;
    public static readonly CONSTRUCT_DRAG_OUT_DISTANCE: number = 100;

    // number of spaces used for indenting output JSON, makes everything human-readable
    public static readonly JSON_INDENT: number = 4;

    static getColor(name:string) : string {
        let result: string = colors[name];

        if (typeof result === 'undefined'){
            console.warn("EagleConfig.getColor() could not find color with name", name);
            result = 'red';
        }

        return result
    }

    static initCSS(){
        const style: CSSStyleDeclaration = $("#logicalGraphParent").get(0).style;

        //overwriting css variables using colors from EagleConfig. I am using this for simple styling to avoid excessive css data binds in the node html files
        style.setProperty("--selectedBg", EagleConfig.getColor('selectBackground'));
        style.setProperty("--selectedConstructBackground", EagleConfig.getColor('selectedConstructBackground'));
        style.setProperty("--nodeBorder", EagleConfig.getColor('bodyBorder'));
        style.setProperty("--nodeBackground", EagleConfig.getColor('nodeBackground'));
        style.setProperty("--graphText", EagleConfig.getColor('graphText'));
        style.setProperty("--branchBackground", EagleConfig.getColor('branchBackground'));
        style.setProperty("--constructBackground", EagleConfig.getColor('constructBackground'));
        style.setProperty("--embeddedApp", EagleConfig.getColor('embeddedApp'));
        style.setProperty("--constructIcon", EagleConfig.getColor('constructIcon'));
        style.setProperty("--commentEdgeColor", EagleConfig.getColor('commentEdge'));
        style.setProperty("--matchingEdgeColor", EagleConfig.getColor('edgeAutoComplete'));
        style.setProperty("--nodeOutputColor", EagleConfig.getColor('nodeOutputPort'));
        style.setProperty("--nodeInputColor", EagleConfig.getColor('nodeInputPort'));
        style.setProperty("--edgeSVGSize", EagleConfig.EDGE_SVG_SIZE+'px');
        $("html").get(0).style.setProperty("--hoverHighlight", EagleConfig.getColor('hoverHighlight'));
    }
}