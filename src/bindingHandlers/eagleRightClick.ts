import * as ko from "knockout";
import * as bootstrap from 'bootstrap';
import { RightClick } from "../RightClick";

ko.bindingHandlers.eagleRightClick = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        const jQueryElement = $(element);

        jQueryElement.on('mousedown', function(e){
            console.log("eagleRightClick:mousedown");

            switch (e.which) {
                case 3:
                    RightClick.requestCustomContextMenu()
                    break;
                default:
                    return;
            }
        });

        jQueryElement.on('contextmenu', function(e){
            console.log("eagleRightClick:contextmenu");

            e.preventDefault();
        })

    },
    update: function (element, valueAccessor) {
        const data = ko.unwrap(valueAccessor());
        console.log("eagleRightClick:data", data);
    }
};
