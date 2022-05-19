import * as ko from "knockout";

import {Eagle} from './Eagle';

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
ko.components.register('repository', {
    viewModel: function(params : {data : any, parent : any}){
        this.name = params.data.name;
        this.service = params.data.service;
        this.branch = params.data.branch;
        this.htmlId = params.data.htmlId;
        this.fetched = params.data.fetched;
        this.isFetching = params.data.isFetching;
        this.isBuiltIn = params.data.isBuiltIn;
        this.expanded = params.data.expanded;
        this.files = params.data.files;
        this.folders = params.data.folders;

        this.refresh = params.parent.refreshRepository;
        this.select = params.parent.selectRepository;
        this.remove = params.parent.removeCustomRepository;
    },
    template: { require: "text!static/components/repository.html" }
});

// custom component for a field
ko.components.register('field', {
    viewModel: function(params : {data : any, ro: boolean}){
        const vm = params.data;
        vm.ro = params.ro;
        return vm;
    },
    template: { require: "text!static/components/field.html" }
});

ko.components.register('port', {
    viewModel: function(params : {id : string, name : string, description: string, multiplicity : number, isEventPort : boolean, toggleEvent : boolean, input : boolean, fieldType: Eagle.FieldType}){
        return {
            id: params.id,
            name: params.name,
            description: params.description,
            multiplicity: params.multiplicity,
            isEventPort: params.isEventPort,
            toggleEvent: params.toggleEvent,
            input: params.input,
            fieldType: params.fieldType
        };
    },
    template: { require: "text!static/components/port.html" }
});

// custom component for the hierarchy
ko.components.register('hierarchy', {
    viewModel: function(params : {data : any}){
        this.nodes = params.data().getNodes();
    },
    template: { require: "text!static/components/hierarchy.html" }
});

ko.components.register('hierarchy-node', {
    viewModel: function(params : {data : any, parentKey : number | null, select : Function}){
        this._id = params.data._id;
        this.name = params.data.name().trim() === "" ? params.data.category : params.data.name;
        this.key = params.data.key;
        this.parentKey = params.data.parentKey;
        this.expanded = params.data.expanded;

        this.select = params.select;
    },
    template: { require: "text!static/components/hierarchy-node.html" }
});

// custom component for a component that appears in the inspector
ko.components.register('inspector-component', {
    viewModel: function(params : {node : any, callback: any}){
        return params;
    },
    template: { require: "text!static/components/inspector-component.html" }
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
