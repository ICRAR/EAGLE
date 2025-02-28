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

// custom component for repositories
// TODO: can we remove the custom component here, is it possible to use a native Repository class instance?
ko.components.register('repository', {
    viewModel: function(params : {data : any, parent : any}){
        this.name = params.data.name;
        this.service = params.data.service;
        this.branch = params.data.branch;
        this._id = params.data._id;
        this.htmlId = params.data.htmlId;
        this.fetched = params.data.fetched;
        this.isFetching = params.data.isFetching;
        this.isBuiltIn = params.data.isBuiltIn;
        this.expanded = params.data.expanded;
        this.files = params.data.files;
        this.folders = params.data.folders;

        this.refresh = params.data.refresh;
        this.select = params.data.select;
        this.remove = params.parent.repositories().removeCustomRepository;
    },
    template: { require: "text!static/components/repository.html" }
});

// custom component for the hierarchy
ko.components.register('hierarchy', {
    viewModel: function(params : {data : any}){
        this.nodes = params.data().getNodes();
    },
    template: { require: "text!static/components/hierarchy.html" }
});

ko.components.register('hierarchy-node', {
    viewModel: function(params : {data : any}){
        return params.data;
    },
    template: { require: "text!static/components/hierarchy-node.html" }
});

// custom component for a component that appears in the palette
ko.components.register('palette-component', {
    viewModel: function(params : {data : any, paletteIndex : any, index : any}){
        const vm = params.data;
        vm.paletteIndex = params.paletteIndex;
        vm.index = params.index;
        return vm;
    },
    template: { require: "text!static/components/palette-component.html" }
});

// custom component for a fix
ko.components.register('fix', {
    viewModel: function(params : {data : any, isError: boolean}){
        const vm = params.data;
        vm.isError = params.isError;
        return vm;
    },
    template: { require: "text!static/components/fix.html" }
});
