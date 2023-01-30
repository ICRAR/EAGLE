import {Config} from './Config';
import {Eagle} from './Eagle';
import {Edge} from './Edge';
import {Node} from './Node';
import { Palette } from './Palette';

export class RightClick {

    constructor(){
    }

    static rightClickReloadPalette = () : void => {
        const eagle: Eagle = Eagle.getInstance();
        var index = 0
        var palettes = eagle.palettes()

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
        const eagle: Eagle = Eagle.getInstance();
        var searchValue:string = $(event.target).val().toString()
        $(".rightClickFocus").removeClass('rightClickFocus')
        if(searchValue !== ''){
            //if the search bar is not empty
            $('#rightClickPaletteList').hide()
            $(event.target).parent().find('a').show()
            $('#paletteNodesSearchResult').remove()
            $('#customContextMenu').append("<div id='paletteNodesSearchResult'></div>")

            var palettes = eagle.palettes()

            palettes.forEach(function(palette){
                palette.getNodes().forEach(function(paletteNode){
                    var paletteNodeName = paletteNode.getName().toLowerCase()

                    if(paletteNodeName.includes(searchValue)){
                        $('#paletteNodesSearchResult').append(`<a onclick='eagle.addNodeToLogicalGraph("`+paletteNode.getId()+`",null,"contextMenu")' class='contextMenuDropdownOption rightClickPaletteNode'>`+paletteNode.getName()+'</a>')
                    }
                })
            })
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
        const eagle: Eagle = Eagle.getInstance();
        Eagle.selectedRightClickObject().setSearchExclude(bool)
    }

    static rightClickCopyPaletteUrl = (bool:boolean) : void => {
        const eagle: Eagle = Eagle.getInstance();
        Eagle.selectedRightClickObject().copyUrl()
    }

    static closeCustomContextMenu = (force:boolean) : void => {
        if(force){
            $("#customContextMenu").remove()
        }else{
            setTimeout(function() {
                if($("#customContextMenu:hover").length === 0){
                    $("#customContextMenu").remove()
                }
            }, 300);
        }
    }

    static createHtmlPaletteList = () : string => {
        const eagle: Eagle = Eagle.getInstance();

        var paletteList:string = ''
        var palettes = eagle.palettes()

        palettes.forEach(function(palette){
            var htmlPalette = "<span class='contextmenuPalette' onmouseover='RightClick.openSubMenu()' onmouseleave='RightClick.closeSubMenu()'>"+palette.fileInfo().name
            htmlPalette = htmlPalette + '<img src="/static/assets/img/arrow_right_white_24dp.svg" alt="">'
            htmlPalette = htmlPalette + '<div class="contextMenuDropdown">'
            palette.getNodes().forEach(function(node){
                htmlPalette = htmlPalette+`<a onclick='eagle.addNodeToLogicalGraph("`+node.getId()+`",null,"contextMenu")' class='contextMenuDropdownOption rightClickPaletteNode'>`+node.getName()+'</a>'
            })
            htmlPalette = htmlPalette+"</div>"
            htmlPalette = htmlPalette+"</span>"
            paletteList = paletteList+htmlPalette
        })

        return paletteList
    }

    static initiateQuickSelect = () : void => {
        $("#customContextMenu").on('keydown',function(e){
            var current = $(".rightClickFocus")

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
        const eagle: Eagle = Eagle.getInstance();

        var passedObjectClass
        if(data instanceof Node){
            passedObjectClass = 'rightClick_graphNode'
        }else if(data instanceof Edge){
            passedObjectClass = 'rightClick_graphEdge'
        }
                    
        RightClick.requestCustomContextMenu(data,eventTarget, passedObjectClass)

        // prevent bubbling events
        event.stopPropagation();
    }

    static requestCustomContextMenu = (data:any, targetElement:JQuery, passedObjectClass:string) : void => {
        //getting the mouse event for positioning the right click menu at the cursor location
        const eagle: Eagle = Eagle.getInstance();

        var thisEvent = event as MouseEvent
        var mouseX = thisEvent.clientX
        var mouseY = thisEvent.clientY

        if(data instanceof Node||data instanceof Edge || data instanceof Palette){
            Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
            Eagle.selectedRightClickObject(data)
        }


        var targetClass = ''
        var targetId = ''

        if(passedObjectClass === ''){
            targetClass = $(targetElement).attr('class')
            targetId = $(targetElement).attr('id')
        }

        //setting up the menu div
        $('#customContextMenu').remove()
        $(document).find('body').append('<div id="customContextMenu" onmouseleave="RightClick.closeCustomContextMenu(false)"></div>')
        $('#customContextMenu').css('top',mouseY+'px')
        $('#customContextMenu').css('left',mouseX+'px')

        //in change of calculating the right click location as the location where to place the node
        const offset = $(targetElement).offset();
        var x = mouseX - offset.left;
        var y = mouseY - offset.top;

        // transform display coords into real coords
        x = (x - eagle.globalOffsetX)/eagle.globalScale;
        y = (y - eagle.globalOffsetY)/eagle.globalScale;

        Eagle.selectedRightClickPosition = {x:x, y:y};
        
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
        console.log(passedObjectClass)

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
                if(!Eagle.hidePaletteTab()){
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
                
            }else if(targetClass.includes('rightClick_paletteComponent')){
                Eagle.selectedRightClickLocation(Eagle.FileType.Palette)
    
                if(Eagle.allowPaletteEditing()){
                $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`inspectorTableModal`,`rightClick`)">Table Modal</a>')
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
                    $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to another palette</a>')
                }
            }else if(targetClass.includes('rightClick_hierarchyNode')){
                Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
    
                $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`inspectorTableModal`,`rightClick`)">Inspector Table</a>')
                $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`keyParametersTableModal`,`rightClick`)">Key Parameters Table</a>')
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
                if(Eagle.allowPaletteEditing()){
                    $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to palette</a>')
                }
                $('#customContextMenu').append('<a onclick=eagle.duplicateSelection("contextMenuRequest")>Duplicate</a>')
    
            }else if(passedObjectClass === 'rightClick_graphNode'){
                $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`inspectorTableModal`,`rightClick`)">Table Modal</a>')
                $('#customContextMenu').append('<a onclick="eagle.openParamsTableModal(`keyParametersTableModal`,`rightClick`)">Key Parameters Table</a>')
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
                if (data.isConstruct()){
                    $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,true)>Delete All</a>')
                }
                if(Eagle.allowPaletteEditing()){
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
                if(Eagle.allowPaletteEditing()){
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
