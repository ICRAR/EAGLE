import * as ko from "knockout";

import {Eagle} from '../Eagle';

ko.bindingHandlers.nodeDataProperty = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        $(element).keyup(function() {
            const dataProperty = ko.unwrap(valueAccessor());
            const eagle : Eagle = bindingContext.$root;
            const selectedNode = eagle.getSelectedSingleNode();

            (<any>selectedNode)[dataProperty] = $(element).val();
            eagle.flagActiveFileModified();
            eagle.flagActiveDiagramHasMutated();
        });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        const dataProperty = ko.unwrap(valueAccessor());
        const eagle : Eagle = bindingContext.$root;
        const selectedNode = eagle.getSelectedSingleNode();

        if (eagle.logicalGraph() === null){
            console.warn("nodeDataProperty: logicalGraph is null");
            return;
        }

        if (selectedNode !== null)
            $(element).val((<any>selectedNode)[dataProperty]);
    }
};
