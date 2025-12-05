import * as ko from "knockout";
import {Utils} from '../Utils';
import { GraphRenderer } from "../GraphRenderer";
import {Eagle} from '../Eagle';
import { EagleConfig } from "../EagleConfig";
import { Node } from "../Node";

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
            const event = window.event as MouseEvent;
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

            const html = ko.unwrap(valueAccessor())
            let result = ''
            let size = EagleConfig.EAGLE_TOOLTIP_DEFAULT_MAX_WIDTH + 'px' //default size
            let content = ''

            // abort if the input html is undefined
            if (typeof html === 'undefined' || typeof html === 'object' && html.content === undefined){
                console.log('eagleTooltip: no content provided or faulty')
                return;
            }else if (typeof html === 'object'){
                //html can be either a string or an Object with a content string and size (in pixels)
                if(typeof html.size != 'undefined') size = html.size
                if(typeof html.content != 'undefined') content = html.content
            }else{
                content = html
            }

            // when surrounding text in a tooltip with |||, that section will be excluded from the markdown conversion. 
            if(content.includes('|||')){
                const x = content.split('|||')
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
                result = Utils.markdown2html(content)
            }



            let buttonRequirements : boolean = false

            //if a button is requested and all necessary info is supplied we will insert it here.
            if(typeof html.buttonAction != 'undefined'){

                if(html.buttonAction === 'descriptionEdit' && html.node instanceof Node ){
                    buttonRequirements = true
                }else{
                    console.warn('requested description button function: '+ html.buttonAction +' isnt supported or description button wasnt provided with its required arguments')
                }

                if(buttonRequirements){
                    result = '<div class="material-symbols-outlined float-end tooltipBtn iconHoverEffect">expand_content</div>' + result
                }
            }

            //fire the tooltip
            jQueryElement.attr("data-bs-original-title", result);
            jQueryElement.tooltip({
                html : true,
                boundary: document.body,
                trigger : 'manual',
            });

            if(buttonRequirements){
                //bootstrap will not let us place databinds or click events on our custom button itself, so we need to add an event listener to the button after the tooltip is shown
                jQueryElement.on('shown.bs.tooltip', function () {
                    $('.tooltip .tooltipBtn').on('click', function(){
                        if(html.buttonAction === 'descriptionEdit'){
                            eagle.editNodeDescription(html.node)
                        }
                    })
                });
            }

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
