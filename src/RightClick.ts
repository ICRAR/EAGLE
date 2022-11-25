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

}

$(document).ready(function(){
    RightClick.initiateRightClick()
})
