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

    static closeCustomContextMenu = () : void => {
        $("#customContextMenu").remove()
    }

    static initiateContextMenu = (data:any, eventTarget:any) : void => {
        //graph node specific context menu intitating function, we cannot use ko bindings within the d3 svg 
        const eagle: Eagle = Eagle.getInstance();

        // console.log(eventTarget,data)

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
        var thisEvent = event as MouseEvent
        var mouseX = thisEvent.clientX
        var mouseY = thisEvent.clientY

        if(data instanceof Node||data instanceof Edge || data instanceof Palette){
            // console.log("Is a node or edge")
            Eagle.selectedRightClickLocation(Eagle.FileType.Graph)
            Eagle.selectedRightClickObject(data)
        }

        // console.log("right click object: " , Eagle.selectedRightClickObject())

        var targetClass = ''
        var targetId = ''

        if(passedObjectClass === ''){
            targetClass = $(targetElement).attr('class')
            targetId = $(targetElement).attr('id')
        }
        console.log(targetClass)

        //setting up the menu div
        $('#customContextMenu').remove()
        $(document).find('body').append('<div id="customContextMenu" onmouseleave="RightClick.closeCustomContextMenu()"></div>')
        $('#customContextMenu').css('top',mouseY+'px')
        $('#customContextMenu').css('left',mouseX+'px')
            
        //append function options depending on the right click object
        if(targetClass.includes('rightClick_logicalGraph')){
            $('#customContextMenu').append('<a onclick="eagle.openShortcuts()">Palette list with search bar</a>')

            Eagle.selectedRightClickLocation(Eagle.FileType.Graph)

            console.log('logical graph background')
        }else if(targetClass.includes('rightClick_paletteComponent')){
            Eagle.selectedRightClickLocation(Eagle.FileType.Palette)

            $('#customContextMenu').append('<a onclick="eagle.inspectNode()">Inspect</a>')
            $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
            $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to another palette</a>')

            console.log('palette component')
        }else if(targetClass.includes('rightClick_hierarchyNode')){
            Eagle.selectedRightClickLocation(Eagle.FileType.Graph)

            $('#customContextMenu').append('<a onclick="eagle.inspectNode()">Inspect</a>')
            $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
            $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to palette</a>')
            $('#customContextMenu').append('<a onclick=eagle.duplicateSelection("contextMenuRequest")>Duplicate</a>')

            console.log('hierarchy component')
        }else if(passedObjectClass === 'rightClick_graphNode'){
            $('#customContextMenu').append('<a onclick="eagle.inspectNode()">Inspect</a>')
            $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')
            if (data.isConstruct()){
                $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,true)>Delete All</a>')
            }
            $('#customContextMenu').append('<a onclick=eagle.addSelectedNodesToPalette("contextMenuRequest")>Add to palette</a>')
            $('#customContextMenu').append('<a onclick=eagle.duplicateSelection("contextMenuRequest")>Duplicate</a>')


            console.log('graph node')
        }else if(passedObjectClass === 'rightClick_graphEdge'){
            $('#customContextMenu').append('<a onclick="eagle.inspectNode()">Inspect</a>')
            $('#customContextMenu').append('<a onclick=eagle.deleteSelection("contextMenuRequest",false,false)>Delete</a>')

            console.log('graph edge')
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

        // adding a listener to function options that closes the menu if an option is clicked
        $('#customContextMenu a').on('click',function(){RightClick.closeCustomContextMenu()})
    }

}
