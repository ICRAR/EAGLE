import * as ko from "knockout";
import * as bootstrap from 'bootstrap';
import {Utils} from '../Utils';
import {Field} from '../Field';
import {Node} from '../Node';

ko.bindingHandlers.graphRendererPortPosition = {
    init: function(field:Field, allBindings, viewModel, bindingContext : ko.BindingContext) {
        console.log('init',field)
    },
    update: function (field:Field) {
    console.log('update',field)
    }
};
