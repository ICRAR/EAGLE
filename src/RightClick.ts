import {Config} from './Config';
import {Eagle} from './Eagle';
import {Edge} from './Edge';
import {Node} from './Node';

export class RightClick {
    
    static rightClickTargetsArray : Array<{identifier:string, rightClickActive:boolean}> = []

    constructor(){

        RightClick.rightClickTargetsArray.push({identifier:"nodeIcon", rightClickActive: true});
        RightClick.rightClickTargetsArray.push({identifier:"hierarchyNode", rightClickActive: false});
    }

    static closeCustomContextMenu = () : void => {
        $("#customContextMenu").remove()
    }

    static requestCustomContextMenu = (data:any, targetElement:JQuery) : void => {
        //getting the mouse event for positioning the right click menu at the cursor location
        var thisEvent = event as MouseEvent
        var mouseX = thisEvent.clientX
        var mouseY = thisEvent.clientY

        console.log(Eagle.selectedRightClickObject())

        var targetClass = $(targetElement).attr('class')
        var targetId = $(targetElement).attr('id')
        console.log('wat: ',targetElement,targetId)

        //setting up the menu div
        $('#customContextMenu').remove()
        $(document).find('body').append('<div id="customContextMenu" onmouseleave="RightClick.closeCustomContextMenu()"></div>')
        $('#customContextMenu').css('top',mouseY+'px')
        $('#customContextMenu').css('left',mouseX+'px')

        console.log('rightmenurequested: ',data,targetClass)
        //append function options depending on the right click object
        $('#customContextMenu').append('<a onclick="eagle.openShortcuts()">Test function</a>')
        if(targetClass.includes('rightClick_logicalGraph')){
            
            console.log('logical graph')
        }else if(targetClass.includes('rightClick_paletteComponent')){
            $('#customContextMenu').append('<a onclick="eagle.inspectNode(`'+targetId+'`)">Inspect</a>')
            $('#customContextMenu').append('<a onclick="eagle.inspectNode(`'+targetId+'`)">Delete</a>')

            console.log('palette component')
        }else if(targetClass.includes('rightClick_hierarchyNode')){
            $('#customContextMenu').append('<a onclick="eagle.inspectNode(`'+targetId+'`)">Inspect</a>')

            console.log('hierarchy component')
        }

        // adding a listener to function options that closes the menu if an option is clicked
        $('#customContextMenu a').on('click',function(){RightClick.closeCustomContextMenu()})
    }

}