import * as ko from "knockout";
import * as bootstrap from 'bootstrap';
import { RightClick } from "../RightClick";
import { Edge } from "../Edge";
import { Eagle } from "../Eagle";

ko.bindingHandlers.eagleRightClick = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        const jQueryElement = $(element);

        jQueryElement.on('contextmenu', function(e){
            e.preventDefault();
            e.stopPropagation();
            const data = ko.unwrap(valueAccessor()).data;
            const type = ko.unwrap(valueAccessor()).type;
            
            RightClick.requestCustomContextMenu(data,jQueryElement,type)
        })
    }
};
