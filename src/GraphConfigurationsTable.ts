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

    static addEmptyTableRow = () : void => {
        let fieldIndex:number
        const selectedNode: Node = Eagle.getInstance().selectedNode();

        /*
        if(ParameterTable.hasSelection()){
            // A cell in the table is selected well insert new row instead of adding at the end
            fieldIndex = ParameterTable.selectionParentIndex() + 1
            selectedNode.addEmptyField(fieldIndex)
        }else{
            selectedNode.addEmptyField(-1)

            //getting the length of the array to use as an index to select the last row in the table
            fieldIndex = selectedNode.getFields().length-1;
        }
        */

        //a timeout was necessary to wait for the element to be added before counting how many there are
        setTimeout(function() {
            //handling selecting and highlighting the newly created row
            const clickTarget = $($("#paramsTableWrapper tbody").children()[fieldIndex]).find('.selectionTargets')[0]

            clickTarget.click() //simply clicking the element is best as it also lets knockout handle all of the selection and observable update processes
            clickTarget.focus() // used to focus the field allowing the user to immediately start typing
            $(clickTarget).trigger("select")

            //scroll to new row
            $("#parameterTableModal .modal-body").animate({
                scrollTop: (fieldIndex*30)
            }, 1000);
        }, 100);
    }
}


