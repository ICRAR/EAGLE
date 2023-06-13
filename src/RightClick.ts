import {Eagle} from './Eagle';
import {Edge} from './Edge';
import {Node} from './Node';
import { Palette } from './Palette';
import { TutorialSystem } from './Tutorial';
import { Setting } from './Setting';


export class RightClick {

    static edgeDropSrcNode : Node
    static edgeDropSrcPort : any
    static edgeDropSrcIsInput : boolean

    constructor(){
        RightClick.edgeDropSrcNode = null;
        RightClick.edgeDropSrcPort = null;
        RightClick.edgeDropSrcIsInput = null;
    }

    static rightClickReloadPalette = () : void => {
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

    static openSubMenu = () : void => {
        $(event.target).find('.contextMenuDropdown').show()
    }

    static closeSubMenu = () : void => {
        $(event.target).find('.contextMenuDropdown').hide()
    }

    static checkSearchField = () : void => {
        const searchValue:string = $(event.target).val().toString().toLocaleLowerCase()

        let paletteNodesHtml = ''
        let graphNodesHtml = ''

        
        $(".rightClickFocus").removeClass('rightClickFocus')
        if(searchValue !== ''){
            //if the search bar is not empty
            $('#rightClickPaletteList').hide()
            $(event.target).parent().find('a').show()
            $('#paletteNodesSearchResult').remove()
            $('#customContextMenu').append("<div id='paletteNodesSearchResult'></div>")

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
            

            $('#paletteNodesSearchResult').append('<h5 class="rightClickDropdownDividerTitle" tabindex="-1">Palette Nodes</h5>')
            $('#paletteNodesSearchResult').append(paletteNodesHtml)
            $('#paletteNodesSearchResult').append('<h5 class="rightClickDropdownDividerTitle" tabindex="-1">Graph Nodes</h5>')
            $('#paletteNodesSearchResult').append(graphNodesHtml)

        } else{
            //if the search bar is empty
            $(event.target).parent().find('a').hide()
            $('#rightClickPaletteList').show()
            $('#paletteNodesSearchResult').remove()
        }
    }

    static clearSearchField = () : void => {
        $('#rightClickSearchBar').val('')
        RightClick.checkSearchField()
    }

    static rightClickDeletePalette = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        eagle.closePalette(Eagle.selectedRightClickObject())
    }

    static rightClickSavePaletteToDisk = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        eagle.savePaletteToDisk(Eagle.selectedRightClickObject())
    }

    static rightClickSavePaletteToGit = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        eagle.savePaletteToGit(Eagle.selectedRightClickObject())
    }

    static rightClicktoggleSearchExclude = (bool:boolean) : void => {
        Eagle.selectedRightClickObject().setSearchExclude(bool)
    }

    static rightClickCopyPaletteUrl = () : void => {
        Eagle.selectedRightClickObject().copyUrl()
    }

    static closeCustomContextMenu = (force:boolean) : void => {
        if(force){
            $("#customContextMenu").remove()
        }else {
            setTimeout(function() {
                if($("#customContextMenu:hover").length === 0){
                    if($('#customContextMenu').hasClass('forceShow')){
                        return
                    }else {
                        $("#customContextMenu").remove()
                    }
                }
            }, 300);
        }
    }

    static createHtmlPaletteList = () : string => {
        const eagle: Eagle = Eagle.getInstance();

        let paletteList:string = ''
        const palettes = eagle.palettes()

        palettes.forEach(function(palette){
            paletteList = paletteList + RightClick.constructHtmlPaletteList(palette.getNodes(),'addNode',null,palette.fileInfo().name)
        })

        paletteList = paletteList + RightClick.constructHtmlPaletteList(eagle.logicalGraph().getNodes(),'addNode',null,'Graph')

        return paletteList
    }

    static createHtmlEdgeDragList = (compatibleNodesList:Node[]) : string => {
        const eagle: Eagle = Eagle.getInstance();

        let paletteList:string = ''
        const palettes = eagle.palettes()

        //toggling showing only filtered nodes or showing all
        if(!Setting.findValue(Setting.FILTER_NODE_SUGGESTIONS)){
            let x : Node[] = []
            palettes.forEach(function(palette){

                palette.getNodes().forEach(function(node){
                    x.push(node)
                })
            })

            compatibleNodesList = x
        }

        palettes.forEach(function(palette){
            paletteList = paletteList+RightClick.constructHtmlPaletteList(palette.getNodes(), 'addAndConnect', compatibleNodesList ,palette.fileInfo().name)
        })

        paletteList = paletteList + RightClick.constructHtmlPaletteList(eagle.logicalGraph().getNodes(),'addAndConnect',compatibleNodesList,'Graph')

        return paletteList
    }


    static constructHtmlPaletteList = (collectionOfNodes:Node[], mode:string, compatibleNodesList:Node[],paletteName:string) : string => {
        let nodesHtml = ''
        let nodeFound = false
        let htmlPalette = "<span class='contextmenuPalette' onmouseover='RightClick.openSubMenu()' onmouseleave='RightClick.closeSubMenu()'>"+paletteName
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
                            dataHtml = dataHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraphAndConnect("`+node.getId()+`")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`>`+node.getName()+'</a>'
                            dataFound = true
                        }else if (node.isApplication()){
                            appHtml = appHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraphAndConnect("`+node.getId()+`")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                            appFound = true
                        }else{
                            otherHtml = otherHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraphAndConnect("`+node.getId()+`")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
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
                    dataHtml = dataHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraph("`+node.getId()+`",null,"contextMenu")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                    dataFound = true
                }else if (node.isApplication()){
                    appHtml = appHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraph("`+node.getId()+`",null,"contextMenu")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
                    appFound = true
                }else{
                    otherHtml = otherHtml+`<a id='rightclickNode_`+node.getId()+`' onclick='eagle.addNodeToLogicalGraph("`+node.getId()+`",null,"contextMenu")' class='contextMenuDropdownOption rightClickPaletteNode `+originClass+`'>`+node.getName()+'</a>'
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


    static getNodeDescriptionDropdown = () : string => {
        const eagle: Eagle = Eagle.getInstance();

        const node = Eagle.selectedRightClickObject()

        let htmlNodeDescription = "<span class='contextmenuNodeDescription' onmouseover='RightClick.openSubMenu()' onmouseleave='RightClick.closeSubMenu()'> Node Info"
            htmlNodeDescription = htmlNodeDescription + '<img src="/static/assets/img/arrow_right_white_24dp.svg" alt="">'

            htmlNodeDescription = htmlNodeDescription + '<div class="contextMenuDropdown">'
                htmlNodeDescription = htmlNodeDescription + '<div class="container">'
                    htmlNodeDescription = htmlNodeDescription + '<div class="row">'
                        htmlNodeDescription = htmlNodeDescription + "<span id='nodeInfoName'><h4>Name:  </h4>" + node.getName() + "</span>"
                    htmlNodeDescription = htmlNodeDescription+"</div>"
                    if(eagle.displayNodeKeys()){
                        htmlNodeDescription = htmlNodeDescription + '<div class="row">'
                            htmlNodeDescription = htmlNodeDescription + "<span id='nodeInfoKey'><h4>Key:  </h4>" + node.getKey() + "</span>"
                        htmlNodeDescription = htmlNodeDescription+"</div>"
                    }
                    htmlNodeDescription = htmlNodeDescription + '<div class="row">'
                        htmlNodeDescription = htmlNodeDescription + "<span id='nodeInfoCategory'><h4>Category:  </h4>" + node.getCategory() + "</span>"
                    htmlNodeDescription = htmlNodeDescription+"</div>"
                    htmlNodeDescription = htmlNodeDescription + '<div class="row">'
                        htmlNodeDescription = htmlNodeDescription + "<span><h4>Description:  </h4>" + node.getDescription() + "</span>"
                    htmlNodeDescription = htmlNodeDescription+"</div>"
                htmlNodeDescription = htmlNodeDescription+"</div>"
            htmlNodeDescription = htmlNodeDescription+"</div>"
        htmlNodeDescription = htmlNodeDescription+"</span>"

        return htmlNodeDescription
    }

    static initiateQuickSelect = () : void => {
        $("#customContextMenu").on('keydown',function(e){
            const current = $(".rightClickFocus")

            switch(e.which) {
                case 37: // left
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
        
                case 38: // up
                e.preventDefault()
                if($('#rightClickSearchBar').val()!==''){   
                    if($(".rightClickFocus").length === 0){
                        $('#paletteNodesSearchResult .rightClickPaletteNode:last').addClass('rightClickFocus')
                    }else{
                        $(".rightClickFocus").removeClass('rightClickFocus')
                        current.prev().addClass('rightClickFocus')
                    }
                }else{
                    if($(".rightClickFocus").length === 0){
                        $('#rightClickPaletteList .contextmenuPalette:last').addClass('rightClickFocus')
                    }else{
                        $(".rightClickFocus").removeClass('rightClickFocus')
                        current.prev().addClass('rightClickFocus')
                    }
                }
                break;
        
                case 39: // right
                if($('#rightClickSearchBar').val()===''){   
                    e.preventDefault()
                    current.addClass('rightClickFocusParent')
                    $(".rightClickFocus").removeClass('rightClickFocus')
                    current.find('.contextMenuDropdown').show()
                    current.find('.rightClickPaletteNode:first').addClass('rightClickFocus')
                }
                break;
        
                case 40: // down
                e.preventDefault()
                if($('#rightClickSearchBar').val()!==''){   
                    if($(".rightClickFocus").length === 0){
                        $('#paletteNodesSearchResult .rightClickPaletteNode:first').addClass('rightClickFocus')
                    }else{
                        $(".rightClickFocus").removeClass('rightClickFocus')
                        current.next().addClass('rightClickFocus')
                    }
                }else{
                    if($(".rightClickFocus").length === 0){
                        $('#rightClickPaletteList .contextmenuPalette:first').addClass('rightClickFocus')
                    }else{
                        $(".rightClickFocus").removeClass('rightClickFocus')
                        current.next().addClass('rightClickFocus')
                    }
                }
                break;

                case 13: //enter

                if(current.hasClass('rightClickPaletteNode')){
                    e.preventDefault()
                    current.click()
                }else if (current.hasClass('contextmenuPalette')){
                    e.preventDefault()

                    current.addClass('rightClickFocusParent')
                    $(".rightClickFocus").removeClass('rightClickFocus')
                    current.find('.contextMenuDropdown').show()
                    current.find('.rightClickPaletteNode:first').addClass('rightClickFocus')
                }else if ($('#rightClickSearchBar').val()!=='' && current.length === 0){
                    $('#paletteNodesSearchResult .rightClickPaletteNode:first').click()
                }
                break;
        
                default: return; // exit this handler for other keys
            }
        })
    }

    static initiateContextMenu = (data:any, eventTarget:any) : void => {
        //graph node specific context menu intitating function, we cannot use ko bindings within the d3 svg 

        let passedObjectClass
        if(data instanceof Node){
            passedObjectClass = 'rightClick_graphNode'
        }else if(data instanceof Edge){
            passedObjectClass = 'rightClick_graphEdge'
        }
                    
        RightClick.requestCustomContextMenu(data,eventTarget, passedObjectClass)

        // prevent bubbling events
        event.stopPropagation();
    }

    static edgeDropCreateNode = (data:any, eventTarget:any) : void => {
                    
        RightClick.requestCustomContextMenu(data,eventTarget, 'edgeDropCreate')

        // prevent bubbling events
        event.stopPropagation();
    }

    static requestCustomContextMenu = (data:any, targetElement:JQuery, passedObjectClass:string) : void => {

        //getting the mouse event for positioning the right click menu at the cursor location
        const eagle: Eagle = Eagle.getInstance();

        const thisEvent = event as MouseEvent
        const mouseX = thisEvent.clientX+2
        const mouseY = thisEvent.clientY+2

        if(data instanceof Node||data instanceof Edge || data instanceof Palette){
            Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
            Eagle.selectedRightClickObject(data)
        }


        let targetClass = ''

        if(passedObjectClass === ''){
            targetClass = $(targetElement).attr('class')
        }

        //setting up the menu div
        $('#customContextMenu').remove()
        $(document).find('body').append('<div id="customContextMenu" onmouseleave="RightClick.closeCustomContextMenu(false)"></div>')
        $('#customContextMenu').css('top',mouseY+'px')
        $('#customContextMenu').css('left',mouseX+'px')

        if(passedObjectClass != 'edgeDropCreate'){
            //in change of calculating the right click location as the location where to place the node
            const offset = $(targetElement).offset();
            let x = mouseX - offset.left;
            let y = mouseY - offset.top;

            // transform display coords into real coords
            x = (x - eagle.globalOffsetX)/eagle.globalScale;
            y = (y - eagle.globalOffsetY)/eagle.globalScale;

            Eagle.selectedRightClickPosition = {x:x, y:y};
        }
        
        var selectedObjectAmount = eagle.selectedObjects().length
        var rightClickObjectInSelection = false
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
            if(passedObjectClass === 'rightClick_graphNode' || passedObjectClass === 'rightClick_graphEdge' || passedObjectClass === 'rightClick_hierarchyNode' || targetClass.includes('rightClick_paletteComponent')){
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection("",false,false)>Delete</a>')
                $('#customContextMenu').append('<a onclick=eagle.duplicateSelection("normal")>Duplicate</a>')
                $('#customContextMenu').append('<a onclick=eagle.copySelectionToClipboard()>Copy</a>')
            }
        }else{
            //if we right clicked an individual object
            //append function options depending on the right click object
            if(targetClass.includes('rightClick_logicalGraph')){
                if(Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
                    var searchbar = `<div class="searchBarContainer" data-bind="clickBubble:false, click:function(){}">
                        <i class="material-icons md-18 searchBarIcon">search</i>
                        <a onclick="RightClick.clearSearchField()">
                            <i class="material-icons md-18 searchBarIconClose">close</i>
                        </a>
                        <input id="rightClickSearchBar" autocomplete="off" type="text" placeholder="Search" oninput="RightClick.checkSearchField()" >
                    </div>` 
    
                    $('#customContextMenu').append(searchbar)
    
                    $('#customContextMenu').append('<div id="rightClickPaletteList"></div>')
                    var paletteList = RightClick.createHtmlPaletteList()
    
                    $('#rightClickPaletteList').append(paletteList)
    
                    Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
                    $('#rightClickSearchBar').focus()
                    RightClick.initiateQuickSelect()
                }else{
                    var message = '<span>Lacking graph editing permissions</span>'
                    $('#customContextMenu').append(message)
                }
            }else if(passedObjectClass === 'edgeDropCreate'){
                if(Setting.findValue(Setting.ALLOW_GRAPH_EDITING)){
                    var searchbar = `<div class="searchBarContainer" data-bind="clickBubble:false, click:function(){}">
                        <i class="material-icons md-18 searchBarIcon">search</i>
                        <a onclick="RightClick.clearSearchField()">
                            <i class="material-icons md-18 searchBarIconClose">close</i>
                        </a>
                        <input id="rightClickSearchBar" autocomplete="off" type="text" placeholder="Search" oninput="RightClick.checkSearchField()" >
                    </div>` 
    
                    $('#customContextMenu').append(searchbar)
    
                    $('#customContextMenu').append('<div id="rightClickPaletteList"></div>')
                    var paletteList = RightClick.createHtmlEdgeDragList(data)
    
                    $('#rightClickPaletteList').append(paletteList)
    
                    Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
                    $('#rightClickSearchBar').focus()
                    RightClick.initiateQuickSelect()
                }else{
                    var message = '<span>Lacking graph editing permissions</span>'
                    $('#customContextMenu').append(message)
                }
            }else if(targetClass.includes('rightClick_paletteComponent')){
                Eagle.selectedRightClickLocation(Eagle.FileType.Palette)
    
                if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                    $('#customContextMenu').append(RightClick.getNodeDescriptionDropdown())
                    $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`inspectorTableModal`,`rightClick`)">Table Modal</a>')
                    $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
                    $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to another palette</a>')
                }
            }else if(targetClass.includes('rightClick_hierarchyNode')){
                Eagle.selectedRightClickLocation(Eagle.FileType.Graph)

                $('#customContextMenu').append(RightClick.getNodeDescriptionDropdown())
                $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`inspectorTableModal`,`rightClick`)">Inspector Table</a>')
                $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`keyParametersTableModal`,`rightClick`)">Key Parameters Table</a>')
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
                if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                    $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to palette</a>')
                }
                $('#customContextMenu').append('<a onclick=eagle.duplicateSelection("contextMenuRequest")>Duplicate</a>')
    
            }else if(passedObjectClass === 'rightClick_graphNode'){
                $('#customContextMenu').append(RightClick.getNodeDescriptionDropdown())
                $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`inspectorTableModal`,`rightClick`)">Table Modal</a>')
                $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`keyParametersTableModal`,`rightClick`)">Key Parameters Table</a>')
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
                if (data.isConstruct()){
                    $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,true)>Delete All</a>')
                }
                if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                    $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to palette</a>')
                }
                    $('#customContextMenu').append('<a onclick=eagle.duplicateSelection("contextMenuRequest")>Duplicate</a>')
    
            }else if(passedObjectClass === 'rightClick_graphEdge'){
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
    
            }else if(targetClass.includes('rightClick_paletteHeader')){
                
                if(!data.fileInfo().builtIn){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickDeletePalette()"><span>Remove Palette</span></a>')
                }
                if(data.fileInfo().repositoryService !== Eagle.RepositoryService.Unknown){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickReloadPalette()"><span>Reload Palette</span></a>')
                }
                if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickSavePaletteToDisk()"><span>Save Locally</span></a>')
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickSavePaletteToGit()"><span>Save To Git</span></a>')
                }
                if(data.searchExclude()){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClicktoggleSearchExclude(false)"><span>Include In Search</span></a>')
                }
                if(!data.searchExclude()){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClicktoggleSearchExclude(true)"><span>Exclude From Search</span></a>')
                }
                if(data.fileInfo().repositoryService !== Eagle.RepositoryService.Unknown && data.fileInfo().repositoryService !== Eagle.RepositoryService.File){
                    $('#customContextMenu').append('<a onclick="RightClick.rightClickCopyPaletteUrl()"><span>Copy Palette URL</span></a>')
                }
    
            }
        }
        // adding a listener to function options that closes the menu if an option is clicked
        $('#customContextMenu a').on('click',function(){if($(event.target).parents('.searchBarContainer').length){return};RightClick.closeCustomContextMenu(true)})
    }

}
