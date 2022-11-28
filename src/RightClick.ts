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

    static initiateRightClick = () : void => {
        console.log('starting..')
        RightClick.rightClickTargetsArray.forEach(function(target){
            console.log(target.identifier)
        })
    }

    static requestCustomContextMenu = () : void => {
        var thisEvent = event as MouseEvent
        var mouseX = thisEvent.clientX
        var mouseY = thisEvent.clientY

        console.log(event)

        console.log("xy",mouseX,mouseY)

        $('#customContextMenu').remove()
        console.log('eventTarget:',event.target)
        $(document).find('body').append('<div id="customContextMenu" onmouseout="eagle.closeCustomContextMenu()"></div>')
        $('#customContextMenu').append('<a data-bind="click: openShortcuts">openShortcutsModal</a>')

        $('#customContextMenu').css('top',mouseY+'px')
        $('#customContextMenu').css('left',mouseX+'px')
    }

}

$(document).ready(function(){
    RightClick.initiateRightClick()
})
