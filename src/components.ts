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
