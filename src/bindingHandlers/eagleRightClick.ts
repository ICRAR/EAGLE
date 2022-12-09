import * as ko from "knockout";
import * as bootstrap from 'bootstrap';
import { RightClick } from "../RightClick";
import { Edge } from "../Edge";
import { Eagle } from "../Eagle";

ko.bindingHandlers.eagleRightClick = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        const jQueryElement = $(element);

        jQueryElement.on('mousedown', function(e){
            switch (e.which) {
                case 3:
                    const data = ko.unwrap(valueAccessor());
                    
                    RightClick.requestCustomContextMenu(data,jQueryElement,'')
                    e.stopPropagation();
                    break;
                default:
                    return;
            }
        });

        jQueryElement.on('contextmenu', function(e){
            e.preventDefault();
        })

    },
    update: function (element, valueAccessor) {
        const data = ko.unwrap(valueAccessor());
        // console.log("eagleRightClick:data", data);
    }
};
