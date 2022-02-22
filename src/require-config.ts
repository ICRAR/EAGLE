declare const require: any;
require.config({
    /* waitSeconds: 30, */
    paths: {
        "text": "./static/externals/text",
        "knockout": "./static/externals/knockout-min",
        "jquery": "./static/externals/jquery-3.2.1",
        "jqueryui": "./static/externals/jquery-ui.min",
        "bootstrap": "./static/externals/bootstrap.bundle.min",
        "bootstrap-notify": "./static/externals/bootstrap-notify.min",
        "introjs": "./static/externals/intro.min",
        "d3": "./static/externals/d3.v5.min",
        "ajv": "./static/externals/ajv.min",
        "bindingHandlers/readonly":"./static/built/bindingHandlers/readonly",
        "bindingHandlers/disabled":"./static/built/bindingHandlers/disabled",
        "bindingHandlers/graphRenderer":"./static/built/bindingHandlers/graphRenderer",
        "bindingHandlers/nodeDataProperty":"./static/built/bindingHandlers/nodeDataProperty",
        "bindingHandlers/eagleTooltip":"./static/built/bindingHandlers/eagleTooltip",
        "components":"./static/built/components",
        "main":"./static/built/main",
        "Config": "./static/built/Config",
        "GitHub": "./static/built/GitHub",
        "GitLab": "./static/built/GitLab",
        "Eagle": "./static/built/Eagle",
        "Utils": "./static/built/Utils",
        "Modals": "./static/built/Modals",
        "GraphUpdater": "./static/built/GraphUpdater",
        "Repository": "./static/built/Repository",
        "RepositoryFolder": "./static/built/RepositoryFolder",
        "RepositoryFile": "./static/built/RepositoryFile",
        "Translator": "./static/built/Translator",
        "LogicalGraph": "./static/built/LogicalGraph",
        "Palette": "./static/built/Palette",
        "Node": "./static/built/Node",
        "Field": "./static/built/Field",
        "Edge": "./static/built/Edge",
        "Port": "./static/built/Port",
        "FileInfo": "./static/built/FileInfo",
        "Setting": "./static/built/Setting",
        "SideWindow": "./static/built/SideWindow",
        "InspectorState": "./static/built/InspectorState",
        "KeyboardShortcut": "./static/built/KeyboardShortcut",
        "PaletteInfo": "./static/built/PaletteInfo",
        "ExplorePalettes": "./static/built/ExplorePalettes"
    },
    shim: {
        "bootstrap": {
            deps: ["jquery"],
            exports: "bootstrap"
        }
    }
});
