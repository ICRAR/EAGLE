import * as ko from "knockout";

ko.components.register('repository-file', {
    viewModel: function(params : {data : any}){
        return params.data;
    },
    template: { require: "text!static/components/repository-file.html" }
});

ko.components.register('repository-folder', {
    viewModel: function(params : {data : any}){
        return params.data;
    },
    template: { require: "text!static/components/repository-folder.html" }
});

ko.components.register('hierarchy-node', {
    viewModel: function(params : {data : any}){
        return params.data;
    },
    template: { require: "text!static/components/hierarchy-node.html" }
});

// custom component for a component that appears in the palette
/*
ko.components.register('palette-component', {
    viewModel: function(params : {data : any, paletteIndex : any, index : any}){
        const vm = params.data;
        vm.paletteIndex = params.paletteIndex;
        vm.index = params.index;
        return vm;
    },
    template: { require: "text!static/components/palette-component.html" }
});
*/
