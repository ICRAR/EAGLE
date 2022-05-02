import * as ko from "knockout";
import * as bootstrap from 'bootstrap';

ko.bindingHandlers.eagleTooltip = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        const jQueryElement = $(element);

        jQueryElement.attr("data-bs-toggle", "tooltip");
        jQueryElement.attr("data-html", "true");

        // optionally set data-bs-placement attribute to 'right', if not already set for this element
        const placement = jQueryElement.attr("data-bs-placement");
        if (typeof placement === 'undefined'){
            jQueryElement.attr("data-bs-placement", "right");
        }

        ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
            // This will be called when the element is removed by Knockout or
            // if some other part of your code calls ko.removeNode(element)

            // read the aria-describedby parameter of the current element, the
            // value of this element is the id of the tooltip
            const tooltipElementId = element.getAttribute('aria-describedby');

            // if tooltip id is not null, remove the tooltip from the DOM
            if (tooltipElementId !== null){
                document.getElementById(tooltipElementId).remove();
            }
        });
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
