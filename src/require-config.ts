declare const require: any;
require.config({
    /* waitSeconds: 30, */
    paths: {
        "text": "./static/externals/text",
        "knockout": "./static/externals/knockout-min",
        "jquery": "./static/externals/jquery-3.6.0.min",
        "jqueryMigrate": "/static/externals/jquery-migrate-3.0.0.min",
        "jqueryui": "./static/externals/jquery-ui.min",
        "bootstrap": "./static/externals/bootstrap.bundle.min",
        "bootstrap-notify": "./static/externals/bootstrap-notify.min",
        "d3": "./static/externals/d3.v5.min",
        "ajv": "./static/externals/ajv.min",
        "showdown": "./static/externals/showdown.min",
        "bindingHandlers/readonly":"./static/built/bindingHandlers/readonly",
        "bindingHandlers/disabled":"./static/built/bindingHandlers/disabled",
        "bindingHandlers/graphRenderer":"./static/built/bindingHandlers/graphRenderer",
        "bindingHandlers/eagleTooltip":"./static/built/bindingHandlers/eagleTooltip",
        "bindingHandlers/eagleRightClick":"./static/built/bindingHandlers/eagleRightClick",
        "components":"./static/built/components",
        "main":"./static/built/main",
        "Config": "./static/built/Config",
        "Daliuge": "./static/built/Daliuge",
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
        "FileInfo": "./static/built/FileInfo",
        "Setting": "./static/built/Setting",
        "UiModes": "./static/built/UiModes",
        "Tutorial": "./static/built/Tutorial",
        "tutorials/quickStart": "./static/built/tutorials/quickStart",
        "tutorials/graphBuilding": "./static/built/tutorials/graphBuilding",
        "SideWindow": "./static/built/SideWindow",
        "KeyboardShortcut": "./static/built/KeyboardShortcut",
        "QuickActions": "./static/built/QuickActions",
        "PaletteInfo": "./static/built/PaletteInfo",
        "ExplorePalettes": "./static/built/ExplorePalettes",
        "Undo": "./static/built/Undo",
        "Errors": "./static/built/Errors",
        "CategoryType": "./static/built/CategoryType",
        "ComponentUpdater": "./static/built/ComponentUpdater",
        "Category": "./static/built/Category",
        "CategoryData": "./static/built/CategoryData",
        "Hierarchy": "./static/built/Hierarchy",
        "RightClick": "./static/built/RightClick",
        "Repositories": "./static/built/Repositories",
        "ParameterTable": "./static/built/ParameterTable"
    },
    shim: {
        "bootstrap": {
            deps: ["jquery"],
            exports: "bootstrap"
        }
    }
});
