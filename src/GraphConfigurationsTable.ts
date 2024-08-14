import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Node } from "./Node";
import { Utils } from "./Utils";

export class GraphConfigurationsTable {

    static showTableModal : ko.Observable<boolean> = ko.observable(false);

    static openModal = () : void => {
        console.log("GraphConfigurationsTable.openModal()");

        const eagle: Eagle = Eagle.getInstance();

        eagle.showEagleIsLoading()

        setTimeout(function(){
            if($('.modal.show').length>0){
                if($('.modal.show').attr('id')==='graphConfigurationsTableModal'){
                    // TODO: use closeModal here!
                    $('#graphConfigurationsTableModal').modal('hide')
                    GraphConfigurationsTable.showTableModal(false)
                }else{
                    return
                }
            }

            Utils.showOpenGraphConfigurationsTableModal();

            GraphConfigurationsTable.showTableModal(true)

        },5)
    }

    static closeModal = (): void => {
        $('#graphConfigurationsTableModal').modal('hide')
        GraphConfigurationsTable.showTableModal(false)
    }
}


