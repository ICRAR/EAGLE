import {Config} from './Config';
import {Eagle} from './Eagle';
import {Edge} from './Edge';
import {Node} from './Node';

export class Hierarchy {

    static updateDisplay = () : void => {
        const eagle: Eagle = Eagle.getInstance();

        $("#hierarchyEdgesSvg").empty()
        
        eagle.logicalGraph().getNodes().forEach(function(element){
            element.setKeepExpanded(false)
        })

        // TODO: should we move this up?
        //return if the graph is not loaded yet
        if(eagle.logicalGraph()=== null){
            return
        }

        //reset allselection relatives to false
        $(".positionPointer").remove()
        eagle.logicalGraph().getEdges().forEach(function(element:Edge){
            element.setSelectionRelative(false)
        })

        //this part of the function flags edges that are selected or directly connected to the selected object
        const hierarchyEdgesList : {edge:Edge, use:string, edgeSelected:boolean}[] = []
        const nodeRelative : Node[]=[]

        //loop over selected objects
        eagle.selectedObjects().forEach(function(element:any){
            //ignore palette selections
            if(Eagle.selectedLocation() === "Palette"){return}

            const elementsToProcess = [element]

            elementsToProcess.forEach(function(element){
                //for selected nodes we must find the related egdes to draw
                if (element instanceof Node){
                    const key = element.getKey()

                    eagle.logicalGraph().getEdges().forEach(function(e:Edge){
                        if(e.getDestNodeKey() === key){
                            e.setSelectionRelative(true)
                            Hierarchy.addUniqueHierarchyEdge(e, "input", hierarchyEdgesList, false)
                            nodeRelative.push(eagle.logicalGraph().findNodeByKey(e.getDestNodeKey()))
                            nodeRelative.push(eagle.logicalGraph().findNodeByKey(e.getSrcNodeKey()))
                        }else if(e.getSrcNodeKey() === key){
                            e.setSelectionRelative(true)
                            Hierarchy.addUniqueHierarchyEdge(e, "output", hierarchyEdgesList,false)
                            nodeRelative.push(eagle.logicalGraph().findNodeByKey(e.getDestNodeKey()))
                            nodeRelative.push(eagle.logicalGraph().findNodeByKey(e.getSrcNodeKey()))
                        }
                    })
                //for edges we must check if a related node is selected to decide if it should be drawn as input or output edge
                }else if(element instanceof Edge){
                    element.setSelectionRelative(true)
                    if(eagle.objectIsSelected(eagle.logicalGraph().findNodeByKey(element.getSrcNodeKey()))){
                        Hierarchy.addUniqueHierarchyEdge(element, "output", hierarchyEdgesList,true)
                    }else{
                        Hierarchy.addUniqueHierarchyEdge(element, "input", hierarchyEdgesList,true)
                    }
                    nodeRelative.push(eagle.logicalGraph().findNodeByKey(element.getDestNodeKey()))
                    nodeRelative.push(eagle.logicalGraph().findNodeByKey(element.getSrcNodeKey()))
                }
            })
        })

        //using a called async function here to wait for changes to the hierarchy to finish before drawing the edges
        hierarchyDraw()


        //an array of edges is used as we have to ensure there are no duplicate edges drawn.
        async function hierarchyDraw() {
            await setNodeRelatives()
            hierarchyEdgesList.forEach(function(e:{edge:Edge , use:string, edgeSelected:boolean}){
                Hierarchy.drawEdge(e.edge, e.use, e.edgeSelected)
            })   
        }
        
        //handle expanding groups that nades get drawn to, and hadle adding nodeRelative
        function setNodeRelatives(){
            nodeRelative.forEach(function(element:Node){
                let iterations = 0;
    
                if (element === null){
                    return
                }
    
                while (true){
                    if (iterations > 32){
                        console.error("too many iterations in nodeRelativeForEach");
                        return
                    }
    
                    if(element.isEmbedded()){
                        const localPortGroup = eagle.logicalGraph().findNodeByKey(element.getEmbedKey())
                        localPortGroup.setExpanded(true)
                        localPortGroup.setKeepExpanded(true)
                    }else{  
                        element.setExpanded(true)
                        element.setKeepExpanded(true)
                    }
    
                    iterations += 1;
    
                    // otherwise keep traversing upwards
                    const parentKey = element.getParentKey();
    
                    // if we reach a null parent, we are done looking
                    if (parentKey === null){
                        return 
                    }
    
                    element = eagle.logicalGraph().findNodeByKey(parentKey);
                }
            })
        }
    }

    // TODO: rename to remove "hierarchy" from name
    static addUniqueHierarchyEdge = (edge:Edge, use:string, hierarchyEdgeList:{edge:Edge , use:string, edgeSelected:boolean}[],edgeSelected:boolean) : void => {
        const eagle: Eagle = Eagle.getInstance();

        let unique = true
        hierarchyEdgeList.forEach(function(e:{edge:Edge , use:string, edgeSelected:boolean}){
            if(e.edge.getId()===edge.getId()){
                unique = false
            }
        })

        if(eagle.objectIsSelected(edge)){
            if(!unique){
                hierarchyEdgeList.forEach(function(e:{edge:Edge , use:string, edgeSelected:boolean}){
                    if(e.edge.getId()===edge.getId()){
                        e.edgeSelected=true
                    }
                })
            }
        }

        if(unique){
            hierarchyEdgeList.push({edge:edge,use:use,edgeSelected:edgeSelected})
        }
    }

    static drawEdge = (edge:Edge, use:string, edgeSelected:boolean) : void =>{
        const srcKey = edge.getSrcNodeKey()
        const destKey = edge.getDestNodeKey()
        //const srcEmbedKey = this.logicalGraph().findNodeByKey(edge.getSrcNodeKey()).getEmbedKey()
        //const destEmbedKey = this.logicalGraph().findNodeByKey(edge.getDestNodeKey()).getEmbedKey()

        const srcNodeElement = $('.hierarchyNode#'+ srcKey)[0];
        const destNodeElement = $('.hierarchyNode#'+ destKey)[0];

        // check that HTML elements for the src and dest node already exist, otherwise we can't draw this edge, so abort
        if (typeof srcNodeElement === 'undefined' || typeof destNodeElement === 'undefined'){
            console.warn("Hierarchy.drawEdge() srcNode or destNode element not ready");
            return;
        }

        const srcNodePos = srcNodeElement.getBoundingClientRect()
        const destNodePos = destNodeElement.getBoundingClientRect()
        const parentPos = $("#rightWindowContainer")[0].getBoundingClientRect()
        const parentScrollOffset = $(".rightWindowDisplay.hierarchy").scrollTop()

        // determine colour of edge
        const colour: string = edgeSelected ? Config.HIERARCHY_EDGE_SELECTED_COLOR : Config.HIERARCHY_EDGE_DEFAULT_COLOR;

        let p1x, p1y, p2x, p2y, arrowX, mpx;
        if(use==="input"){
            p1x = (srcNodePos.left - parentPos.left)-1
            p1y = ((srcNodePos.top - parentPos.top)+8)+parentScrollOffset
            p2x = (destNodePos.left - parentPos.left)-15
            p2y = ((destNodePos.top - parentPos.top)+8)+parentScrollOffset
            arrowX = (destNodePos.left - parentPos.left)-17
            mpx = parentPos.left-srcNodePos.left-10

            //append arrows
            $('#nodeList .col').append('<div class="positionPointer" style="height:15px;width:auto;position:absolute;z-index:10001;top:'+p2y+'px;left:'+arrowX+'px;transform:rotate(90deg);fill:'+colour+';"><svg id="triangle" viewBox="0 0 100 100" style="transform: translate(-30%, -50%);"><polygon points="50 15, 100 100, 0 100"/></svg></div>')

        }else if(use==="output"){
            p1x = ($('#nodeList .col').width() - (parentPos.right-srcNodePos.right))+29
            p1y = ((srcNodePos.top - parentPos.top)+9)+parentScrollOffset
            p2x = ($('#nodeList .col').width() - (parentPos.right-destNodePos.right))+39
            p2y = ((destNodePos.top - parentPos.top)+9)+parentScrollOffset
            arrowX = (parentPos.right-destNodePos.right) - 20
            mpx = parentPos.right-srcNodePos.right+10

            //append arrows
            $('#nodeList .col').append('<div class="positionPointer" style="height:15px;width:auto;position:absolute;z-index:1001;top:'+p2y+'px;right:'+arrowX+'px;transform:rotate(-90deg);fill:'+colour+';"><svg id="triangle" viewBox="0 0 100 100" style="transform: translate(40%, -50%);"><polygon points="50 15, 100 100, 0 100"/></svg></div>')
        }else{
            console.log("error")
        }

        //Y values re-adjusted for edges
        p1y = p1y+9
        p2y = p2y+9

        // mid-point of line:
        let mpy

        if(p1y > p2y){
            mpy = -((p1y - p2y)/2)
        }else{
            mpy = (p2y - p1y)/2
        }

        // construct the command to draw a quadratic curve
        const positions = "M " + p1x + " " + p1y + " q " + mpx + " " + mpy + " " + (p2x - p1x) + " " + (p2y - p1y);

        // variable for the namespace
        const svgns = "http://www.w3.org/2000/svg";

        // make a simple rectangle
        const curve = document.createElementNS(svgns, "path");

        curve.setAttribute("d", positions);
        curve.setAttribute("stroke", colour);
        curve.setAttribute("stroke-width", "3");
        curve.setAttribute("fill", "none");
        curve.setAttribute("class", "hierarchyEdge");

        //curve extras as click targets, invisible thicker stroke
        const curveExtra = document.createElementNS(svgns, "path");

        curveExtra.setAttribute("d", positions);
        curveExtra.setAttribute("stroke", "transparent");
        curveExtra.setAttribute("stroke-width", "10");
        curveExtra.setAttribute("fill", "none");
        curveExtra.setAttribute("id", edge.getId());
        curveExtra.setAttribute("class", "hierarchyEdgeExtra");

        // append the edge paths to the svg
        $("#hierarchyEdgesSvg")[0].appendChild(curve)
        $("#hierarchyEdgesSvg")[0].appendChild(curveExtra)
    }

    static isNodeSelected = (selectState:boolean) : string => {
        let className : string = ""
        if(selectState){
            className = "hierarchyNodeIsSelected"
        }else{
            className = "hierarchyNodeIsntSelected"
        }
        return className
    }

    static isApplicationSelected = (selectState:boolean) : string => {
        let className : string = ""
        if(selectState){
            className = "hierarchyApplicationIsSelected"
        }

        return className
    }
    

    // NOTE: input type here is NOT a Node, it is a Node ViewModel as defined in components.ts
    static selectNode = (nodeViewModel : any, e : any) : void => {
        const eagle: Eagle = Eagle.getInstance();

        const node : Node = eagle.logicalGraph().findNodeByKey(nodeViewModel.key());
        if (node === null){
            console.warn("Unable to find node in hierarchy!");
            return;
        }
        // node.toggleExpanded();

        if(!e.shiftKey){
            eagle.setSelection(Eagle.RightWindowMode.Hierarchy, node, Eagle.FileType.Graph);

        }else if(e.shiftKey){
            eagle.editSelection(Eagle.RightWindowMode.Hierarchy, node, Eagle.FileType.Graph)
        }
        
        eagle.logicalGraph.valueHasMutated();
    }

    static nodeIsHidden = (key:number) : string => {
        const eagle: Eagle = Eagle.getInstance();

        const node = eagle.logicalGraph().findNodeByKey(key);
        let nodeHasConnectedInput: boolean = false;
        let nodeHasConnectedOutput: boolean = false;

        // check if node has connected input and output
        for (const edge of eagle.logicalGraph().getEdges()){
            if (edge.getDestNodeKey() === node.getKey()){
                nodeHasConnectedInput = true;
            }

            if (edge.getSrcNodeKey() === node.getKey()){
                nodeHasConnectedOutput = true;
            }
        }

        if (!eagle.showDataNodes() && node.isData() && nodeHasConnectedInput && nodeHasConnectedOutput){
            return 'visible';
        }

        return 'hidden';
    }
}