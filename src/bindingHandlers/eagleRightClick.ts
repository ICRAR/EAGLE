import * as ko from "knockout";
import { RightClick } from "../RightClick";

ko.bindingHandlers.eagleRightClick = {
    init: function(element, valueAccessor) {
        const jQueryElement = $(element);

        jQueryElement.on('contextmenu', function(e){
            e.preventDefault();
            e.stopPropagation();
            const bindingValue = ko.unwrap(valueAccessor()) as {
                data: unknown;
                type: Parameters<typeof RightClick.requestCustomContextMenu>[1];
            };

            RightClick.requestCustomContextMenu(bindingValue.data, bindingValue.type)
        })
    }
};
