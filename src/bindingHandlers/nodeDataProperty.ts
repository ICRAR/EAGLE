import * as ko from "knockout";

import {Eagle} from '../Eagle';

ko.bindingHandlers.nodeDataProperty = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        $(element).change(function() {
            var dataProperty = ko.unwrap(valueAccessor());
            var eagle : Eagle = bindingContext.$root;

            (<any>eagle.selectedNode())[dataProperty] = $(element).val();
            eagle.flagActiveFileModified();
            eagle.flagActiveDiagramHasMutated();
        });
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        var dataProperty = ko.unwrap(valueAccessor());
        var eagle : Eagle = bindingContext.$root;

        if (eagle.logicalGraph() === null){
            console.warn("nodeDataProperty: logicalGraph is null");
            return;
        }

        if (eagle.selectedNode() !== null)
            $(element).val((<any>eagle.selectedNode())[dataProperty]);
    }
};
