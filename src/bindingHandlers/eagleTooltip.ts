import * as ko from "knockout";
import {Utils} from '../Utils';

ko.bindingHandlers.eagleTooltip = {
    init: function(element) {
        
        ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
            // This will be called when the element is removed by Knockout or
            // if some other part of your code calls ko.removeNode(element)

            // read the aria-describedby parameter of the current element, the
            // value of this element is the id of the tooltip
            const tooltipElementId : string = element.getAttribute('aria-describedby');

            // if tooltip id is not null, remove the tooltip from the DOM
            if (tooltipElementId !== null && tooltipElementId.startsWith('tooltip')){
                document.getElementById(tooltipElementId).remove();
            }
        });
    },
    update: function (element, valueAccessor) {
        
        const jQueryElement = $(element);
        
        // manual tooltip open system to allow for hovering on the tooltips
        let stillHovering = false
        jQueryElement.on('mouseenter', function () {

            jQueryElement.attr("data-bs-toggle", "tooltip");
            jQueryElement.attr("data-html", "true");
    
            // optionally set data-bs-placement attribute to 'right', if not already set for this element
            const placement = jQueryElement.attr("data-bs-placement");
            if (typeof placement === 'undefined'){
                jQueryElement.attr("data-bs-placement", "right");
            }
            jQueryElement.attr("data-bs-original-title", Utils.markdown2html(ko.unwrap(valueAccessor())));

            jQueryElement.tooltip({
                html : true,
                boundary: document.body,
                trigger : 'manual',
            });

            stillHovering=true

            //in manual trigger mode the delay attribute of the bootstrap tooltip no longer works, we need to do this ourselves
            setTimeout(function(){
                if(stillHovering){
                    jQueryElement.tooltip('show');

                    //leave listener on the tooltip itself, we attach this when the tooltip is shown
                    $('.tooltip').on('mouseleave', function () {
                        jQueryElement.tooltip('hide');
                        stillHovering = false
                    });
                    
                    //enter listener on the tooltip itself, we attach this when the tooltip is shown
                    $('.tooltip').on('mouseenter', function () {
                        stillHovering = true
                    });
                }
            },800)
        });

        jQueryElement.on('mouseleave', function(){
            stillHovering = false

            //we need to give the user a little bit of time to move from the element to to tooltip
            setTimeout(function(){
                if(!stillHovering){
                    jQueryElement.tooltip('hide');
                    stillHovering = false
                }
            },100)
        })
    }
};
