import * as ko from "knockout";
import {Utils} from '../Utils';
import { GraphRenderer } from "../GraphRenderer";
import {Eagle} from '../Eagle';

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
                const tooltipElement = document.getElementById(tooltipElementId);

                if (tooltipElement){
                    tooltipElement.remove();
                }
            }
        });
    },
    update: function (element, valueAccessor) {
        const eagle: Eagle = Eagle.getInstance();
        const jQueryElement = $(element);
        
        // manual tooltip open system to allow for hovering on the tooltips
        let stillHovering = false
        jQueryElement.on('mouseenter', function () {
            event.stopImmediatePropagation()
            event.stopPropagation()
            event.preventDefault()
            jQueryElement.attr("data-bs-toggle", "tooltip");
            jQueryElement.attr("data-html", "true");
    
            // optionally set data-bs-placement attribute to 'right', if not already set for this element
            const placement = jQueryElement.attr("data-bs-placement");
            if (typeof placement === 'undefined'){
                jQueryElement.attr("data-bs-placement", "right");
            }

            let html = ko.unwrap(valueAccessor())
            let result = ''
            let size = '300px'

            // abort if the input html is undefined
            if (typeof html === 'undefined'){
                return;
            }

            //html can be either a string or an Object with a content string and size (in pixels)
            if(html.content != undefined){
                size = html.size
                html = html.content
            }

            // when surrounding text in a tooltip with |||, that section will be excluded from the markdown conversion. 
            if(html.includes('|||')){
                const x = html.split('|||')
                for(let i = 0 ; i < x.length ; i++){
                    if(i===0){
                        if(x[i].length === 0){
                            continue
                        }
                    }

                    let y = ''
                    if((i % 2) == 1){
                        y = x[i]
                    }else{
                        y = Utils.markdown2html(x[i])
                    }
                    result += y
                }
            }else{
                result = Utils.markdown2html(html)
            }

            jQueryElement.attr("data-bs-original-title", result);

            jQueryElement.tooltip({
                html : true,
                boundary: document.body,
                trigger : 'manual',
            });

            stillHovering=true

            //in manual trigger mode the delay attribute of the bootstrap tooltip no longer works, we need to do this ourselves
            setTimeout(function(){
                if(stillHovering && !GraphRenderer.draggingPort && !GraphRenderer.draggingPaletteNode){
                    // make sure there is never more than one tooltip open
                    $(".tooltip").remove();
                    jQueryElement.tooltip('show');

                    //adding our custom size if provided
                    $('.tooltip-inner').css('max-width',size)

                    //leave listener on the tooltip itself, we attach this when the tooltip is shown
                    $('.tooltip').on('mouseleave', function () {
                        jQueryElement.tooltip('hide');
                        stillHovering = false
                    });
                    
                    //enter listener on the tooltip itself, we attach this when the tooltip is shown
                    $('.tooltip').on('mouseenter', function () {
                        if(GraphRenderer.draggingPort || GraphRenderer.draggingPaletteNode){
                            jQueryElement.tooltip('hide');
                        }
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
