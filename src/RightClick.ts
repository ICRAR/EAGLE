import { Category } from './Category';
import { Eagle } from './Eagle';
import { Edge } from './Edge';
import { Field } from './Field';
import { GraphRenderer } from './GraphRenderer';
import { Node } from './Node';
import { Palette } from './Palette';
import { Repository } from './Repository';
import { Setting } from './Setting';


export class RightClick {

    static edgeDropSrcNode : Node
    static edgeDropSrcPort : Field
    static edgeDropSrcIsInput : boolean

    constructor(){
        RightClick.edgeDropSrcNode = null;
        RightClick.edgeDropSrcPort = null;
        RightClick.edgeDropSrcIsInput = null;
    }

    static rightClickReloadPalette() : void {
        const eagle: Eagle = Eagle.getInstance();
        let index = 0
        const palettes = eagle.palettes()

        palettes.forEach(function(palette){
            if (palette === Eagle.selectedRightClickObject()){
                eagle.reloadPalette(palette,index)
            }
            index++
        })
    }

    static openSubMenu(menuElement: HTMLElement) : void {
        $(menuElement).find('.contextMenuDropdown').show()
    }

    static closeSubMenu(menuElement: HTMLElement) : void {
        $(menuElement).find('.contextMenuDropdown').hide()
    }

    // TODO: global event
    static checkSearchField() : void {
        const searchValue:string = $(event.target).val().toString().toLocaleLowerCase()

        let paletteNodesHtml = ''
        let graphNodesHtml = ''

        
        $(".rightClickFocus").removeClass('rightClickFocus')
        if(searchValue !== ''){
            //if the search bar is not empty
            $('#rightClickPaletteList').hide()
            $(event.target).parent().find('a').show()
            $('#paletteNodesSearchResult').remove()
            $('#customContextMenu .searchBarContainer').after("<div id='paletteNodesSearchResult'></div>")

            const dropDownOptions = $('#rightClickPaletteList .contextMenuDropdownOption')
            dropDownOptions.each(function(index,dropdownOption){
                const dropdownNode = $(dropdownOption).text().toLocaleLowerCase();
                if(dropdownNode.toLocaleLowerCase().includes(searchValue)){
                    if($(dropdownOption).hasClass('graphNode')){
                        graphNodesHtml= graphNodesHtml +$(dropdownOption).clone().get(0).outerHTML
                    }else{                        
                        paletteNodesHtml=paletteNodesHtml +$(dropdownOption).clone().get(0).outerHTML
                    }
                }
            })

            if(paletteNodesHtml != ''){
                $('#paletteNodesSearchResult').append('<h5 class="rightClickDropdownDividerTitle" tabindex="-1">Palette Nodes</h5>')
                $('#paletteNodesSearchResult').append(paletteNodesHtml)
            }
            if(graphNodesHtml != ''){
                $('#paletteNodesSearchResult').append('<h5 class="rightClickDropdownDividerTitle" tabindex="-1">Graph Nodes</h5>')
                $('#paletteNodesSearchResult').append(graphNodesHtml)
            }
        } else{
            //if the search bar is empty
            $(event.target).parent().find('a').hide()
            $('#rightClickPaletteList').show()
            $('#paletteNodesSearchResult').remove()
        }
    }

    static clearSearchField() : void {
        $('#rightClickSearchBar').val('')
        RightClick.checkSearchField()
    }

    static rightClickDeletePalette() : void {
        const eagle: Eagle = Eagle.getInstance();
        eagle.closePalette(Eagle.selectedRightClickObject())
    }

    static rightClickSavePaletteToDisk() : void {
        const eagle: Eagle = Eagle.getInstance();
        eagle.savePaletteToDisk(Eagle.selectedRightClickObject())
    }

    static rightClickSavePaletteToGit() : void {
        const eagle: Eagle = Eagle.getInstance();
        eagle.savePaletteToGit(Eagle.selectedRightClickObject())
    }

    static rightClickToggleSearchExclude(bool:boolean) : void {
        Eagle.selectedRightClickObject().setSearchExclude(bool)
    }

    static rightClickCopyPaletteUrl = () : void => {
        Eagle.selectedRightClickObject().copyUrl()
    }

    static closeCustomContextMenu(force:boolean) : void {
        if(force){
            $("#customContextMenu").remove()
            $('.fullOpacity').removeClass('fullOpacity')//remove any elements that are kept visible during the right click menu process
        }else {
            setTimeout(function() {
                if($("#customContextMenu:hover").length === 0){
                    if($('#customContextMenu').hasClass('forceShow')){
                        return
                    }else {
                        $("#customContextMenu").remove()
                        $('.fullOpacity').removeClass('fullOpacity')//this exists twice so it happens at the correct time with this timeout func
                    }
                }
            }, 300);
        }

        GraphRenderer.renderDraggingPortEdge(false);
    }

    static createHtmlPaletteList() : string {
        const eagle: Eagle = Eagle.getInstance();

        let paletteList:string = ''
        const palettes = eagle.palettes()

        // add nodes from each palette
        palettes.forEach(function(palette){
            paletteList += RightClick.constructHtmlPaletteList(palette.getNodes(),'addNode',null,palette.fileInfo().name,null)
        })

        // add nodes from the logical graph
        paletteList += RightClick.constructHtmlPaletteList(eagle.logicalGraph().getNodes(),'addNode',null,'Graph',null)

        return paletteList
    }

    static createHtmlEdgeDragList(compatibleNodesList:Node[]) : string {
        const eagle: Eagle = Eagle.getInstance();

        let paletteList:string = ''
        const palettes = eagle.palettes();

        palettes.forEach(function(palette){
            paletteList += RightClick.constructHtmlPaletteList(palette.getNodes(), 'addAndConnect', compatibleNodesList, palette.fileInfo().name,null)
        })

        paletteList += RightClick.constructHtmlPaletteList(eagle.logicalGraph().getNodes(), 'addAndConnect', compatibleNodesList, 'Graph',null)
        return paletteList
    }

    static  createHtmlEligibleEmbeddedNodesList(nodeType:Category.Type,passedObjectClass:string) : string {
        const eagle: Eagle = Eagle.getInstance();

        let paletteList:string = ''
        const palettes = eagle.palettes()

        // sorting and adding nodes from each palette
        palettes.forEach(function(palette){
            const paletteNodes:Node[] = []

            palette.getNodes().forEach(function(paletteNode){
                if(paletteNode.getCategoryType() === nodeType){
                    paletteNodes.push(paletteNode)
                }
            })
            paletteList += RightClick.constructHtmlPaletteList(paletteNodes,'embedNode',null,palette.fileInfo().name,passedObjectClass)
        })

        //sorting and adding compatible nodes from the graph
        const graphNodes:Node[]=[]
        eagle.logicalGraph().getNodes().forEach(function(graphNode){
            if(graphNode.getCategoryType() === nodeType){
                graphNodes.push(graphNode)
            }
        })
        paletteList += RightClick.constructHtmlPaletteList(graphNodes,'embedNode',null,'Graph',passedObjectClass)

        return paletteList
    }

    static constructHtmlPaletteList(collectionOfNodes:Node[], mode:string, compatibleNodesList:Node[],paletteName:string,embedMode:String) : string {
        let nodesHtml = ''
        let nodeFound = false
        let htmlPalette = "<span class='contextmenuPalette' onmouseover='RightClick.openSubMenu(this)' onmouseleave='RightClick.closeSubMenu(this)'>"+paletteName
        htmlPalette = htmlPalette + '<img src="/static/assets/img/arrow_right_white_24dp.svg" alt="">'
        htmlPalette = htmlPalette + '<div class="contextMenuDropdown">'
        let dataHtml = '<h5 class="rightClickDropdownDividerTitle" tabindex="-1">Data Nodes</h5>'
        let dataFound = false
        let appHtml = '<h5 class="rightClickDropdownDividerTitle" tabindex="-1">Apps</h5>'
        let appFound = false
        let otherHtml = '<h5 class="rightClickDropdownDividerTitle" tabindex="-1">Other</h5>'
        let otherFound = false

        let originClass:string = ''
        if(paletteName === 'Graph'){
            originClass = 'graphNode'
        }else{
            originClass = 'paletteNode'
        }

        if(mode === 'addAndConnect'){
            //this mode is for when dropping an edge onto the graph, this means we are filtering out some options based on if they are fitting to the node or not
            collectionOfNodes.forEach(function(node){
                for(const filteredNode of compatibleNodesList){
                    if(node === filteredNode){
                        if(node.isData()){
                            dataHtml += `<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraphAndConnect("`+node.getId()+`")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                            dataFound = true
                        }else if (node.isApplication()){
                            appHtml += `<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraphAndConnect("`+node.getId()+`")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                            appFound = true
                        }else{
                            otherHtml += `<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraphAndConnect("`+node.getId()+`")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                            otherFound = true
                        }
                        nodeFound = true
                        break
                    }else{
                        continue
                    }
                }
            })
        }else if(mode === 'addNode'){
            collectionOfNodes.forEach(function(node){
                //this mode is the simplest version for right click adding a node on the graph canvas
                if(node.isData()){
                    dataHtml = dataHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraph(null,"`+node.getId()+`",Eagle.AddNodeMode.ContextMenu, null)' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                    dataFound = true
                }else if (node.isApplication()){
                    appHtml = appHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraph(null,"`+node.getId()+`",Eagle.AddNodeMode.ContextMenu, null)' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                    appFound = true
                }else{
                    otherHtml = otherHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraph(null,"`+node.getId()+`",Eagle.AddNodeMode.ContextMenu, null)' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                    otherFound = true
                }
                nodeFound = true
            })
        }else if(mode === 'embedNode'){
            collectionOfNodes.forEach(function(node){
                //this mode is used when right clicking a socket of a construct node to add an embedded app to it.
                if(node.isData()){
                    dataHtml = dataHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='GraphRenderer.setNewEmbeddedApp("`+node.getId()+`","`+embedMode+`")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                    dataFound = true
                }else if (node.isApplication()){
                    appHtml = appHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='GraphRenderer.setNewEmbeddedApp("`+node.getId()+`","`+embedMode+`")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                    appFound = true
                }else{
                    otherHtml = otherHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='GraphRenderer.setNewEmbeddedApp("`+node.getId()+`","`+embedMode+`")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                    otherFound = true
                }
                nodeFound = true
            })
        }else{
            console.warn('cannot find this mode: ',mode)
        }

        if(dataFound){
            htmlPalette = htmlPalette+dataHtml
        }
        if(appFound){
            htmlPalette = htmlPalette+appHtml
        }
        if(otherFound){
            htmlPalette = htmlPalette +otherHtml
        }
        htmlPalette = htmlPalette+"</div>"
        htmlPalette = htmlPalette+"</span>"

        if(nodeFound){
            nodesHtml = nodesHtml+htmlPalette;
        }

        return nodesHtml
    }


    static getNodeDescriptionDropdown() : string {
        const eagle: Eagle = Eagle.getInstance();

        const node = Eagle.selectedRightClickObject()

        let htmlNodeDescription = "<span class='contextmenuNodeDescription' onmouseover='RightClick.openSubMenu(this)' onmouseleave='RightClick.closeSubMenu(this)'> Node Info"
            htmlNodeDescription += '<img src="/static/assets/img/arrow_right_white_24dp.svg" alt="">'

            htmlNodeDescription += '<div class="contextMenuDropdown">'
                htmlNodeDescription += '<div class="container">'
                    htmlNodeDescription += '<div class="row">'
                        htmlNodeDescription += "<span id='nodeInfoName'><h4>Name:  </h4>" + node.getName() + "</span>"
                    htmlNodeDescription += "</div>"
                    htmlNodeDescription += '<div class="row">'
                        htmlNodeDescription += "<span id='nodeInfoId'><h4>Id:  </h4>" + node.getId() + "</span>"
                    htmlNodeDescription += "</div>"
                    htmlNodeDescription += '<div class="row">'
                        htmlNodeDescription += "<span id='nodeInfoCategory'><h4>Category:  </h4>" + node.getCategory() + "</span>"
                    htmlNodeDescription += "</div>"
                    htmlNodeDescription += '<div class="row">'
                        htmlNodeDescription += "<span><h4>Description:  </h4>" + node.getDescription() + "</span>"
                    htmlNodeDescription += "</div>"
                htmlNodeDescription += "</div>"
            htmlNodeDescription += "</div>"
        htmlNodeDescription += "</span>"

        return htmlNodeDescription
    }

    static initiateQuickSelect() : void {
        $("#customContextMenu").on('keydown', function(event: JQuery.TriggeredEvent){
            const current = $(".rightClickFocus")
            const e: KeyboardEvent = event.originalEvent as KeyboardEvent;

            switch(e.key) {
        
                //--- ARROW UP ---
                    case "ArrowUp":
                    e.preventDefault()

                    // if there is something in the search bar
                    if($('#rightClickSearchBar').val()!==''){   
                        if($(".rightClickFocus").length === 0){
                            //if there is nothing currently highlighted
                            $('#customContextMenu #paletteNodesSearchResult a,#customContextMenu #paletteNodesSearchResult span').last().addClass('rightClickFocus')
                        }else{
                            $(".rightClickFocus").removeClass('rightClickFocus')
                            if(current.prev().is('a, span')){ //if the next item is an a or span tag, it is an item we want to highlight
                                current.prev().addClass('rightClickFocus')
                            }else if(current.prev().is('h5') && current.prev().prev().is('a ,span')){ //h5 tags are used as headers or spacers, jummp over these
                                current.prev().prev().addClass('rightClickFocus')
                            }else{//if neither of them are true, we are at the end of the list and should loop back to the first selectable item
                                current.siblings('a,span').last().addClass('rightClickFocus')
                            }
                        }

                    // if there is nothing in the search bar
                    }else{
                        if($(".rightClickFocus").length === 0){
                            //if there is nothing currently highlighted
                            if($('.rightClickFocusParent').length != 0){
                                //if there is a rightClickFocusParent, we are moving through the sub menu of a palette
                                $('#rightClickPaletteList .rightClickFocusParent a:last').addClass('rightClickFocus')
                            }else{
                                $('#rightClickPaletteList .contextmenuPalette:last').addClass('rightClickFocus')
                            }
                        }else{
                            $(".rightClickFocus").removeClass('rightClickFocus')
                            if(current.prev().is('a, span')){ //if the next item is an a or span tag, it is an item we want to highlight
                                current.prev().addClass('rightClickFocus')
                            }else if(current.prev().is('h5') && current.prev().prev().is('a ,span')){ //h5 tags are used as headers or spacers, jummp over these
                                current.prev().prev().addClass('rightClickFocus')
                            }else{//if neither of them are true, we are at the end of the list and should loop back to the first selectable item
                                current.siblings('a,span').last().addClass('rightClickFocus')
                            }
                        }
                    }
                    break;
        

                //--- ARROW DOWN ---
                    case "ArrowDown":
                    e.preventDefault()
                    
                    // if there is something in the search bar
                    if($('#rightClickSearchBar').val()!==''){   
                        if($(".rightClickFocus").length === 0){
                            //if there is nothing currently highlighted
                            $('#customContextMenu #paletteNodesSearchResult a,#customContextMenu #paletteNodesSearchResult span').first().addClass('rightClickFocus')
                        }else{
                            $(".rightClickFocus").removeClass('rightClickFocus')
                            if(current.next().is('a, span')){ //if the next item is an a or span tag, it is an item we want to highlight
                                current.next().addClass('rightClickFocus')
                            }else if(current.next().is('h5')){ //h5 tags are used as headers or spacers, jummp over these
                                current.next().next().addClass('rightClickFocus')
                            }else{//if neither of them are true, we are at the end of the list and should loop back to the first selectable item
                                current.siblings('a,span').first().addClass('rightClickFocus')
                            }
                        }
                    
                    // if there is nothing in the search bar
                    }else{
                        if($(".rightClickFocus").length === 0){
                            //if there is nothing currently highlighted
                            if($('.rightClickFocusParent').length != 0){
                                //if there is a rightClickFocusParent, we are moving through the sub menu of a palette
                                $('#rightClickPaletteList .rightClickFocusParent a:first').addClass('rightClickFocus')
                            }else{
                                $('#rightClickPaletteList .contextmenuPalette:first').addClass('rightClickFocus')
                            }
                        }else{
                            $(".rightClickFocus").removeClass('rightClickFocus')
                            if(current.next().is('a, span')){ //if the next item is an a or span tag, it is an item we want to highlight
                                current.next().addClass('rightClickFocus')
                            }else if(current.next().is('h5')){ //h5 tags are used as headers or spacers, jummp over these
                                current.next().next().addClass('rightClickFocus')
                            }else{//if neither of them are true, we are at the end of the list and should loop back to the first selectable item
                                current.siblings('a,span').first().addClass('rightClickFocus')
                            }
                        }
                    }
                    break;

                //--- ARROW LEFT ---
                    case "ArrowLeft":

                    // if there is nothing in the search bar
                    if($('#rightClickSearchBar').val()===''){
                        e.preventDefault()
                        if(current.hasClass('rightClickPaletteNode')){
                            $('.rightClickFocusParent').removeClass('rightClickFocusParent')
                            $(".rightClickFocus").removeClass('rightClickFocus')
                            current.parent().hide()
                            current.parent().parent().addClass('rightClickFocus')
                        }
                    }
                    break;

                //--- ARROW RIGHT ---
                    case "ArrowRight":

                    // if there is nothing in the search bar
                    if($('#rightClickSearchBar').val()==='' && current.is('span')){   
                        e.preventDefault()
                        current.addClass('rightClickFocusParent')
                        $(".rightClickFocus").removeClass('rightClickFocus')
                        current.find('.contextMenuDropdown').show()
                        current.find('.rightClickPaletteNode:first').addClass('rightClickFocus')
                    }
                    break;
        

                case "Enter":

                if(current.hasClass('rightClickPaletteNode')){
                    e.preventDefault()
                    current.trigger("click")
                }else if (current.hasClass('contextmenuPalette')){
                    e.preventDefault()

                    current.addClass('rightClickFocusParent')
                    $(".rightClickFocus").removeClass('rightClickFocus')
                    current.find('.contextMenuDropdown').show()
                    current.find('.rightClickPaletteNode:first').addClass('rightClickFocus')
                }else if ($('#rightClickSearchBar').val()!=='' && current.length === 0){
                    $('#paletteNodesSearchResult .rightClickPaletteNode:first').trigger("click")
                }
                break;
        
                default: return; // exit this handler for other keys
            }

            //if we are in a sub-menu, scroll the selected item into view
            $('#rightClickPaletteList .rightClickFocusParent .contextMenuDropdown .rightClickFocus').get(0)?.scrollIntoView(false); //for the menu without search filtering
            $('#customContextMenu #paletteNodesSearchResult .rightClickFocus').get(0)?.scrollIntoView(false); //for the menu with search filtering
        })
    }

    

    // TODO: event var used in function is the deprecated global, we should get access to the event via some other method
    static edgeDropCreateNode = (data: Node[]) : void => {
        RightClick.requestCustomContextMenu(data, 'edgeDropCreate')

        // prevent bubbling events
        event.stopPropagation();
    }

    // TODO: event var used in function is the deprecated global, we should get access to the event via some other method
    // TODO: perhaps break this function up into a top-level handler, that uses 'passedObjectClass' to call one of several sub-functions
    // TODO: make the passedObjectClass an enumerated type
    // data can be a Edge, Node, Palette?, Eagle, Node[], and the passedObjectClass variable tells the function what to do with it
    static requestCustomContextMenu = (data: any, passedObjectClass:string) : void => {
        // getting the mouse event for positioning the right click menu at the cursor location
        const eagle: Eagle = Eagle.getInstance();

        const thisEvent = event as MouseEvent
        let mouseX = thisEvent.clientX+2 //small margin to prevent the cursor from hovering on the menu right on the corner, making the experience fiddly
        let mouseY = thisEvent.clientY+2

        if(data instanceof Node||data instanceof Edge || data instanceof Palette){
            Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
            Eagle.selectedRightClickObject(data)
        }

        if(data instanceof Edge){
            eagle.setSelection(data,Eagle.FileType.Graph)
        }

        // close any existing context menu, the close custom context menu function seems to be doing too much
        $('#customContextMenu').remove();

        // setting up the menu div
        $(document).find('body').append('<div id="customContextMenu" onmouseleave="RightClick.closeCustomContextMenu(false)"></div>')

        const minXMargin = 390 // this is the minimum amount of room we need on the right side of the click location to draw the context menu
        const minYMargin = 430 // this is the minimum amount of room we need on the bottom side of the click location to draw the context menu

        //checking for screen real estate to the right and bottom, if we are too close to the edges of the window, we expand left, up or both
        if($(document).innerWidth()-mouseX<minXMargin){
            mouseX -= 4 // correcting the usability margin in the opposite direction
            $('#customContextMenu').addClass("leftBoundContextMenu")
        }

        if($(document).innerHeight()-mouseY<minYMargin){
            mouseY -= 4 
            $('#customContextMenu').addClass("topBoundContextMenu")
        }

        $('#customContextMenu').css('top',mouseY+'px')
        $('#customContextMenu').css('left',mouseX+'px')

        if(passedObjectClass != 'edgeDropCreate'){
            // here we are grabbing the on graph location of the mouse cursor, this is where we will place the node when right clicking on the empty graph
            const x = GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null)
            const y = GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null)
            Eagle.selectedRightClickPosition = {x:x, y:y};
        }
        
        const selectedObjectAmount = eagle.selectedObjects().length
        let rightClickObjectInSelection = false
        if (selectedObjectAmount > 1){
            //if more than one node is selected
            eagle.selectedObjects().forEach(function(selectedObject){
                if (selectedObject === data){
                    rightClickObjectInSelection = true
                }
            })
        }

        if(rightClickObjectInSelection){
            // if we right clicked an object that is part of a multi selection
            if(passedObjectClass === 'rightClick_graphNode' || passedObjectClass === 'rightClick_graphEdge' || passedObjectClass === 'rightClick_hierarchyNode' || passedObjectClass === 'rightClick_paletteComponent'){
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection(false,false,false)>Delete</a>')
                $('#customContextMenu').append('<a onclick=eagle.duplicateSelection("normal")>Duplicate</a>')
                $('#customContextMenu').append('<a onclick=eagle.copySelectionToClipboard()>Copy</a>')
                $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("normal")>Add To Palette</a>')
                $('#customContextMenu').append('<a onclick=eagle.createConstructFromSelection()>Construct from Selection</a>')
                $('#customContextMenu').append('<a onclick=eagle.createSubgraphFromSelection()>Sub Graph from Selection</a>')
            }
        }else{
            //defining the search bar as it is used in several right click menus
            const searchbar = `<div class="searchBarContainer" data-bind="clickBubble:false, click:function(){}">
                        <i class="material-icons md-18 searchBarIcon">search</i>
                        <a onclick="RightClick.clearSearchField()">
                            <i class="material-icons md-18 searchBarIconClose">close</i>
                        </a>
                        <input id="rightClickSearchBar" autocomplete="off" type="text" placeholder="Search" oninput="RightClick.checkSearchField()" >
                    </div>` 

            //if we right clicked an individual object
            //append function options depending on the right click object
            if(passedObjectClass === 'rightClick_logicalGraph'){
                if(Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
                    $('#customContextMenu').append(searchbar)
    
                    $('#customContextMenu').append('<div id="rightClickPaletteList"></div>')
                    const paletteList = RightClick.createHtmlPaletteList()
    
                    $('#rightClickPaletteList').append(paletteList)
    
                    Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
                    $('#rightClickSearchBar').trigger("focus")
                    RightClick.initiateQuickSelect()
                }else{
                    const message = '<span>Lacking graph editing permissions</span>'
                    $('#customContextMenu').append(message)
                }

                $('#customContextMenu').append('<h5 class="rightClickDropdownDividerTitle" tabindex="-1">Graph Options</h5>')
                $('#customContextMenu').append(`<a class='rightClickPerpetual' onclick="Utils.showModelDataModal('Graph Info', eagle.logicalGraph().fileInfo());">Show Graph Info</a>`)
                $('#customContextMenu').append(`<a class='rightClickPerpetual' onclick="ParameterTable.openTable(Eagle.BottomWindowMode.ConfigParameterTable, ParameterTable.SelectType.Normal);">Graph Attributes Table</a>`)
                $('#customContextMenu').append(`<a class='rightClickPerpetual' onclick="eagle.copyGraphUrl();">Copy Graph URL</a>`)
            }else if(passedObjectClass === 'edgeDropCreate'){
                if(Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
                    $('#customContextMenu').append(searchbar)
    
                    $('#customContextMenu').append('<div id="rightClickPaletteList"></div>')
                    const paletteList = RightClick.createHtmlEdgeDragList(data)
                    $('#rightClickPaletteList').append(paletteList)
    
                    Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
                    $('#rightClickSearchBar').trigger("focus")
                    RightClick.initiateQuickSelect()
                }else{
                    const message = '<span>Lacking graph editing permissions</span>'
                    $('#customContextMenu').append(message)
                }
            }else if(passedObjectClass === 'addEmbeddedOutputApp' || passedObjectClass === 'addEmbeddedInputApp'){
                if(Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){

                    $(thisEvent.target).addClass('fullOpacity')

                    //making sure the construct we are trying to add an embedded node to is selected
                    if(data instanceof Node){
                        eagle.setSelection(data,Eagle.FileType.Graph)
                    }

                    $('#customContextMenu').append(searchbar)
    
                    $('#customContextMenu').append('<div id="rightClickPaletteList"></div>')
                    const paletteList = RightClick.createHtmlEligibleEmbeddedNodesList(Category.Type.Application,passedObjectClass)
                    $('#rightClickPaletteList').append(paletteList)
    
                    Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
                    $('#rightClickSearchBar').trigger("focus")
                    RightClick.initiateQuickSelect()
                }else{
                    const message = '<span>Lacking graph editing permissions</span>'
                    $('#customContextMenu').append(message)
                }
            }else if(passedObjectClass === 'rightClick_paletteComponent'){
                Eagle.selectedRightClickLocation(Eagle.FileType.Palette)
    
                if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                    $('#customContextMenu').append(RightClick.getNodeDescriptionDropdown())
                    $('#customContextMenu').append('<a onclick="ParameterTable.openTable(Eagle.BottomWindowMode.NodeParameterTable, ParameterTable.SelectType.RightClick)">Open Fields Table</a>')
                    $('#customContextMenu').append('<a onclick=eagle.deleteSelection(true,false,false)>Delete</a>')
                    $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to another palette</a>')
                }
            }else if(passedObjectClass === 'rightClick_hierarchyNode'){
                Eagle.selectedRightClickLocation(Eagle.FileType.Graph)

                $('#customContextMenu').append(RightClick.getNodeDescriptionDropdown())
                $('#customContextMenu').append('<a onclick="ParameterTable.openTable(Eagle.BottomWindowMode.NodeParameterTable, ParameterTable.SelectType.RightClick)">Open Fields Table</a>')
                $('#customContextMenu').append('<a onclick="ParameterTable.openTable(Eagle.BottomWindowMode.ConfigParameterTable, ParameterTable.SelectType.RightClick)">Graph Attributes</a>')
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection(true,false,false)>Delete</a>')
                if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                    $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to palette</a>')
                }
                $('#customContextMenu').append('<a onclick=eagle.duplicateSelection("contextMenuRequest")>Duplicate</a>')
    
            }else if(passedObjectClass === 'rightClick_graphNode'){
                $('#customContextMenu').append(RightClick.getNodeDescriptionDropdown())
                $('#customContextMenu').append('<a onclick="ParameterTable.openTable(Eagle.BottomWindowMode.NodeParameterTable, ParameterTable.SelectType.RightClick)">Open Fields Table</a>')
                $('#customContextMenu').append('<a onclick="ParameterTable.openTable(Eagle.BottomWindowMode.ConfigParameterTable, ParameterTable.SelectType.RightClick)">Graph Attributes</a>')
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection(true,false,false)>Delete</a>')
                if (data.isConstruct()){
                    $('#customContextMenu').append('<a onclick=eagle.deleteSelection(true,false,true)>Delete with children</a>')
                    $('#customContextMenu').append('<a onclick=GraphRenderer.centerConstruct(eagle.selectedNode(),eagle.logicalGraph().getNodes())>Center Around Children</a>')
                }
                if(data.getCategory() === Category.Docker){
                    $('#customContextMenu').append('<a onclick=eagle.fetchDockerHTML()>Browse DockerHub</a>')
                }
                if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                    $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to palette</a>')
                }
                    $('#customContextMenu').append('<a onclick=eagle.duplicateSelection("contextMenuRequest")>Duplicate</a>')

            }else if(passedObjectClass === 'rightClick_graphEdge'){
                $('#customContextMenu').append('<a onclick=Eagle.selectedRightClickObject().toggleLoopAware()>Toggle Loop Aware</a>')
                $('#customContextMenu').append('<a onclick=eagle.toggleEdgeClosesLoop()>Toggle Closes Loop</a>')
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection(true,false,false)>Delete</a>')
    
            }else if(passedObjectClass === 'rightClick_paletteHeader'){
                
                if(!data.fileInfo().builtIn){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickDeletePalette()"><span>Remove Palette</span></a>')
                }
                if(data.fileInfo().repositoryService !== Repository.Service.Unknown){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickReloadPalette()"><span>Reload Palette</span></a>')
                }
                if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickSavePaletteToDisk()"><span>Save Locally</span></a>')
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickSavePaletteToGit()"><span>Save To Git</span></a>')
                }
                if(data.searchExclude()){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickToggleSearchExclude(false)"><span>Include In Search</span></a>')
                }
                if(!data.searchExclude()){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickToggleSearchExclude(true)"><span>Exclude From Search</span></a>')
                }
                if(data.fileInfo().repositoryService !== Repository.Service.Unknown && data.fileInfo().repositoryService !== Repository.Service.File){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickCopyPaletteUrl()"><span>Copy Palette URL</span></a>')
                }
            }
        }
        // adding a listener to function options that closes the menu if an option is clicked
        $('#customContextMenu a').on('click',function(){if($(event.target).parents('.searchBarContainer').length){return}RightClick.closeCustomContextMenu(true)})
    }
}
