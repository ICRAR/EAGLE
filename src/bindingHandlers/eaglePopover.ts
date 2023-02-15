import * as ko from "knockout";
import * as bootstrap from 'bootstrap';

ko.bindingHandlers.eaglePopover = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        const jQueryElement = $(element);

        jQueryElement.attr("data-bs-toggle", "popover");
        jQueryElement.attr("data-html", "true");
        jQueryElement.attr("data-bs-custom-class", "custom-popover");

        // optionally set data-bs-placement attribute to 'right', if not already set for this element
        const placement = jQueryElement.attr("data-bs-placement");
        if (typeof placement === 'undefined'){
            jQueryElement.attr("data-bs-placement", "right");
        }

        jQueryElement.on("mouseover", function(){
            console.log("mouseover popover show");

            // close all other popovers
            $(".popover").popover('hide');

            // open the new popover
            jQueryElement.popover('show');
        })

        ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
            // This will be called when the element is removed by Knockout or
            // if some other part of your code calls ko.removeNode(element)

            // read the aria-describedby parameter of the current element, the
            // value of this element is the id of the popover
            const popoverElementId : string = element.getAttribute('aria-describedby');

            // if popover id is not null, remove the popover from the DOM
            if (popoverElementId !== null && popoverElementId.startsWith('popover')){
                console.log("remove popoverElementId", popoverElementId);
                document.getElementById(popoverElementId).remove();
            }
        });
    },
    update: function (element, valueAccessor) {
        const jQueryElement = $(element);

        jQueryElement.attr("data-bs-content", ko.unwrap(valueAccessor()));

        jQueryElement.popover({
            html : true,
            boundary: document.body,
            trigger : 'manual',
            //delay: { "show": 800, "hide": 100 }
        });
    }
};