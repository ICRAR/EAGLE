import * as ko from "knockout";
import * as bootstrap from 'bootstrap';
import {Utils} from '../Utils';
import {Field} from '../Field';
import {Node} from '../Node';

ko.bindingHandlers.graphRendererPortPosition = {
    init: function(element:any, field, allBindings) {
        console.log('init',field())
    },
    update: function (element:any, field) {
    console.log('update',field())
    }
};
