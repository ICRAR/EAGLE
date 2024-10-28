import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Node } from "./Node";
import { Utils } from "./Utils";
import { Setting } from "./Setting";
import { SideWindow } from "./SideWindow";

export class GraphConfigurationsTable {

    static showTableModal : ko.Observable<boolean> = ko.observable(false);

    static openModal = () : void => {
        const eagle: Eagle = Eagle.getInstance();

        // eagle.showEagleIsLoading()

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

            // $('#graphConfigurationsTable').modal("show");

            // GraphConfigurationsTable.showTableModal(true)

        },5)
    }

    static closeModal = (): void => {
        $('#graphConfigurationsTable').modal('hide')
        GraphConfigurationsTable.showTableModal(false)
    }
}


