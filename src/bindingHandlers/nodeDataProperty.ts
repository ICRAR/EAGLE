import * as ko from "knockout";

import {Eagle} from '../Eagle';

ko.bindingHandlers.nodeDataProperty = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        $(element).keyup(function() {
            const dataProperty = ko.unwrap(valueAccessor());
            const eagle : Eagle = bindingContext.$root;

            (<any>eagle.selectedNode())[dataProperty] = $(element).val();

            // TODO: do we need both 'valueHasMutated' calls here? It seems like one should be sufficient.
            eagle.logicalGraph().flagFileModified();
            eagle.logicalGraph.valueHasMutated();
        });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        const dataProperty = ko.unwrap(valueAccessor());
        const eagle : Eagle = bindingContext.$root;

        if (eagle.logicalGraph() === null){
            console.warn("nodeDataProperty: logicalGraph is null");
            return;
        }

        if (eagle.selectedNode() !== null)
            $(element).val((<any>eagle.selectedNode())[dataProperty]);
    }
};
