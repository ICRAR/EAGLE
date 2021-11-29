import * as ko from "knockout";

ko.bindingHandlers.eagleTooltip = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        const jQueryElement = $(element);

        jQueryElement.attr("data-bs-toggle", "tooltip");
        jQueryElement.attr("data-html", "true");
        jQueryElement.attr("data-bs-placement", "right");
    },
    update: function (element, valueAccessor) {
        const jQueryElement = $(element);

        jQueryElement.attr("data-bs-original-title", ko.unwrap(valueAccessor()));

        jQueryElement.tooltip({
            html : true,
            boundary: document.body,
            trigger : 'hover',
            delay: { "show": 800, "hide": 100 }
        });
    }
};
