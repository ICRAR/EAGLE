import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Setting } from "./Setting";
import { SideWindow } from "./SideWindow";

export class GraphConfigurationsTable {

    static showTableModal : ko.Observable<boolean> = ko.observable(false);

    static toggleTable = () : void => {
        //if we are already in the requested mode, we can toggle the bottom window
        if(Setting.findValue(Setting.BOTTOM_WINDOW_MODE) === Eagle.BottomWindowMode.GraphConfigsTable){
            SideWindow.toggleShown('bottom')
        }else{
            this.openTable()
        }
    }

    static openTable = () : void => {
        setTimeout(function(){
            if($('.modal.show').length>0){
                if($('.modal.show').attr('id')==='graphConfigurationsTable'){
                    // TODO: use closeModal here!
                    $('#graphConfigurationsTable').modal('hide')
                    GraphConfigurationsTable.showTableModal(false)
                }else{
                    return
                }
            }
            
            Setting.find(Setting.BOTTOM_WINDOW_MODE).setValue(Eagle.BottomWindowMode.GraphConfigsTable)
            SideWindow.setShown('bottom',true)
        },5)
    }

    static closeModal = (): void => {
        $('#graphConfigurationsTable').modal('hide')
        GraphConfigurationsTable.showTableModal(false)
    }
}


