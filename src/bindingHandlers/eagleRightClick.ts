import * as ko from "knockout";
import { RightClick } from "../RightClick";

ko.bindingHandlers.eagleRightClick = {
    init: function(element, valueAccessor) {
        const jQueryElement = $(element);

        jQueryElement.on('contextmenu', function(e){
            e.preventDefault();
            e.stopPropagation();
            const data = ko.unwrap(valueAccessor()).data;
            const type = ko.unwrap(valueAccessor()).type;
            
            RightClick.requestCustomContextMenu(data, type)
        })
    }
};
