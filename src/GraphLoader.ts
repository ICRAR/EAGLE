/*
 * (c) 2025, the ROME project and contributors. All rights reserved.
 *
 * SPDX-License-File: LICENSE
 */

import type {Eagle} from "./Eagle";
import {EagleFileType} from "./Eagle";
import {EagleConfig} from "./EagleConfig";
import {CategoryName} from "./Category";
import {Daliuge} from "./Daliuge";
import {Edge} from "./Edge";
import type {Field} from "./Field";
import {Errors, type ErrorsWarnings, Mode} from "./Errors";
import {FileLocation} from "./FileLocation";
import type {FileInfo} from "./FileInfo";
import {GitHub} from "./GitHub";
import {GitLab} from "./GitLab";
import {GraphConfig} from "./GraphConfig";
import {GraphUpdater} from "./GraphUpdater";
import type {JsonObject, V4GraphJson} from "./JsonLoadTypes";
import {Id} from "./Id";
import {LogicalGraph} from "./LogicalGraph";
import {Palette} from "./Palette";
import {Node} from "./Node";
import {Repository, RepositoryService} from "./Repository";
import {RepositoryFile} from "./RepositoryFile";
import {Repositories} from "./Repositories";
import {SchemaVersion, Setting} from "./Setting";
import {Utils} from "./Utils";

/**
 * GraphLoader
 *
 * Handles creating, loading and inserting graphs, palettes and graph
 * configurations (local JSON, remote files, and the shared insert machinery).
 */
export class GraphLoader {

    /**
     * Reference to the Eagle instance that this GraphLoader is associated with
     */
    private eagle: Eagle;

    /**
     * Constructor.
     *
     * @param eagle - the Eagle instance this GraphLoader operates on
     */
    constructor(eagle: Eagle){
        this.eagle = eagle;
    }

    private _handleLoadingErrors = (errorsWarnings: ErrorsWarnings, fileName: string, service: RepositoryService) : void => {
        const showIssues: boolean = Setting.findValue<boolean>(Setting.SHOW_FILE_LOADING_WARNINGS, false);
        this.eagle.hideEagleIsLoading()

        // errors are always shown in the issues modal; the setting only controls warnings
        const hasErrors: boolean = Errors.hasErrors(errorsWarnings);
        const hasWarnings: boolean = showIssues && Errors.hasWarnings(errorsWarnings);

        if (hasErrors || hasWarnings){
            // add errors/warnings to the arrays (warnings only if the setting is on)
            this.eagle.loadingErrors(hasErrors ? errorsWarnings.errors : []);
            this.eagle.loadingWarnings(hasWarnings ? errorsWarnings.warnings : []);

            this.eagle.errorsMode(Mode.Loading);
            Utils.showErrorsModal("Loading File");
        } else {
            Utils.showNotification("Success", fileName + " has been loaded from " + service + ".", "success");
        }
    }

    private _validateV4GraphLoadJSON = (dataObject: JsonObject, errorsWarnings: ErrorsWarnings): boolean => {
        if (Setting.findValue<boolean>(Setting.DISABLE_JSON_VALIDATION, false)) {
            return true;
        }

        const validatorResult = Utils._validateJSON(dataObject, SchemaVersion.V4, EagleFileType.Graph);
        if (validatorResult.valid) {
            return true;
        }

        errorsWarnings.errors.push(Errors.Message("V4 graph JSON failed schema validation: " + validatorResult.errors));
        return false;
    }

    // NOTE: public (not private) because it is called from FileIO.ts
    _loadGraphJSON = async (data: string, fileFullPath: string, loadFunc: (lg: LogicalGraph, errorsWarnings: ErrorsWarnings) => void | Promise<void>) : Promise<boolean> => {
        let dataObject;

        // attempt to parse the JSON
        try {
            dataObject = JSON.parse(data);
        } catch(err){
            Utils.showUserMessage("Error parsing file JSON", Errors.UnknownToError(err));
            return false;
        }

        const fileType : EagleFileType = Utils.determineFileType(dataObject);

        // Only load graph files.
        if (fileType !== EagleFileType.Graph) {
            Utils.showUserMessage("Error", "This is not a graph file!");
            return false;
        }

        // attempt to determine schema version from FileInfo
        const schemaVersion: SchemaVersion = Utils.determineSchemaVersion(dataObject);

        const errorsWarnings: ErrorsWarnings = {errors: [], warnings: []};
        let loaded = false;

        // use the correct parsing function based on schema version
        switch (schemaVersion){
            case SchemaVersion.OJS:
            case SchemaVersion.Unknown:
                // check if we need to update the graph from keys to ids
                if (GraphUpdater.usesNodeKeys(dataObject)){
                    GraphUpdater.updateKeysToIds(dataObject);
                }

                await loadFunc(LogicalGraph.fromOJSJson(dataObject, "", errorsWarnings), errorsWarnings);
                loaded = true;
                break;
            case SchemaVersion.V4:
                if (!this._validateV4GraphLoadJSON(dataObject as JsonObject, errorsWarnings)) {
                    break;
                }
                await loadFunc(LogicalGraph.fromV4Json(dataObject as V4GraphJson, "", errorsWarnings), errorsWarnings);
                loaded = true;
                break;
            default:
                errorsWarnings.errors.push(Errors.Message("Unknown schemaVersion: " + schemaVersion));
                break;
        }

        this._handleLoadingErrors(errorsWarnings, Utils.getFileNameFromFullPath(fileFullPath), RepositoryService.File);
        return loaded;
    }

    // NOTE: parentNode would be null if we are duplicating a selection of objects
    insertGraph = async (nodes: Node[], edges: Edge[], parentNode: Node | null, errorsWarnings: ErrorsWarnings) => {
        // create map of inserted graph keys to final graph nodes, and of inserted port ids to final graph ports
        const nodeMap: Map<NodeId, Node> = new Map();
        const portMap: Map<FieldId, Field> = new Map();
        let parentNodePosition;

        // add the parent node to the logical graph
        if (parentNode !== null){
            this.eagle.logicalGraph().addNodeComplete(parentNode);

            // we need to know the required width for the new parentNode, which will be a bounding box for all nodes in nodes[]
            const bbSize = LogicalGraph.normaliseNodes(nodes);

            // find a suitable position for the parent node
            parentNodePosition = this.eagle.getNewNodePosition(bbSize);

            // set attributes of parentNode
            parentNode.setPosition(parentNodePosition.x+(bbSize/2), parentNodePosition.y+(bbSize/2));
        } else {
            parentNodePosition = {x: EagleConfig.DUPLICATE_OFFSET, y: EagleConfig.DUPLICATE_OFFSET};
        }

        // insert nodes from lg into the existing logicalGraph
        for (const node of nodes){
            const insertedNode: Node = await this.eagle.addNode(node, parentNodePosition.x + node.getPosition().x, parentNodePosition.y + node.getPosition().y); // NOTE: addNode does not add embedded apps

            // save mapping for node itself
            nodeMap.set(node.getId(), insertedNode);

            // if insertedNode has no parent, make it a parent of the parent node
            if (insertedNode.getParent() === null && parentNode !== null){
                insertedNode.setParent(parentNode);
            }

            // save mapping for input ports
            for (let j = 0 ; j < node.getInputPorts().length; j++){
                portMap.set(node.getInputPorts()[j].getId(), insertedNode.getInputPorts()[j]);
            }

            // save mapping for output ports
            for (let j = 0 ; j < node.getOutputPorts().length; j++){
                portMap.set(node.getOutputPorts()[j].getId(), insertedNode.getOutputPorts()[j]);
            }

            // clear edge lists within fields of inserted node
            for (const field of insertedNode.getFields()){
                field.clearEdges();
            }
        }

        // copy embedded applications
        for (const node of nodes){
            const insertedNode = nodeMap.get(node.getId());

            // abort if the inserted node was not found in the node map
            if (typeof insertedNode === "undefined"){
                console.error("Error: could not find mapping for node " + node.getName() + " " + node.getId());
                continue;
            }

            const oldInputApplication = node.getInputApplication();
            const oldOutputApplication = node.getOutputApplication();

            // copy embedded input application
            if (oldInputApplication !== null){
                
                const newInputApplication = nodeMap.get(oldInputApplication.getId());

                if (typeof newInputApplication === "undefined"){
                    console.error("Error: could not find mapping for input application " + oldInputApplication.getName() + " " + oldInputApplication.getId());
                    continue;
                }

                insertedNode.setInputApplication(newInputApplication);
                
                nodeMap.set(oldInputApplication.getId(), newInputApplication);

                // save mapping for input ports
                for (let j = 0 ; j < oldInputApplication.getInputPorts().length; j++ ){
                    portMap.set(oldInputApplication.getInputPorts()[j].getId(), newInputApplication.getInputPorts()[j]);
                    
                }

                // save mapping for output ports
                for (let j = 0 ; j < oldInputApplication.getOutputPorts().length; j++){
                    portMap.set(oldInputApplication.getOutputPorts()[j].getId(), newInputApplication.getOutputPorts()[j]);
                }

                // clear edge lists within fields of the old input application
                for (const field of oldInputApplication.getFields()){
                    field.clearEdges();
                }
            }



            // copy embedded output application
            if (oldOutputApplication !== null){
                const newOutputApplication = nodeMap.get(oldOutputApplication.getId());

                if (typeof newOutputApplication === "undefined"){
                    console.error("Error: could not find mapping for output application " + oldOutputApplication.getName() + " " + oldOutputApplication.getId());
                    continue;
                }

                insertedNode.setOutputApplication(newOutputApplication);
                
                nodeMap.set(oldOutputApplication.getId(), newOutputApplication);
                
                // save mapping for input ports
                for (let j = 0 ; j < oldOutputApplication.getInputPorts().length; j++){
                    portMap.set(oldOutputApplication.getInputPorts()[j].getId(), newOutputApplication.getInputPorts()[j]);
                }

                // save mapping for output ports
                for (let j = 0 ; j < oldOutputApplication.getOutputPorts().length; j++){
                    portMap.set(oldOutputApplication.getOutputPorts()[j].getId(), newOutputApplication.getOutputPorts()[j]);
                }

                // clear edge lists within fields of the old output application
                for (const field of oldOutputApplication.getFields()){
                    field.clearEdges();
                }
            }
        }

        // update some other details of the nodes are updated correctly
        for (const node of nodes){
            const insertedNode = nodeMap.get(node.getId());

            // abort if the inserted node was not found in the node map
            if (typeof insertedNode === "undefined"){
                console.error("Error: could not find mapping for node " + node.getName() + " " + node.getId());
                continue;
            }

            // if original node has a parent, set the parent of the inserted node to the inserted parent
            const nodeParent = node.getParent();
            if (nodeParent !== null){
                // check if parent of original node was also mapped to a new node
                const insertedParent = nodeMap.get(nodeParent.getId());

                // make sure parent is set correctly
                // if no mapping is available for the parent, then set parent to the new parentNode, or if no parentNode exists, just set parent to null
                // if a mapping is available, then use the mapped node as the parent for the new node
                if (typeof insertedParent === 'undefined'){
                    if (parentNode === null){
                        insertedNode.setParent(null);
                    } else {
                        insertedNode.setParent(parentNode);
                    }
                } else {
                    insertedNode.setParent(insertedParent);
                }
            }
        }

        // insert edges from lg into the existing logicalGraph
        for (const edge of edges){
            const srcNode = nodeMap.get(edge.getSrcNode().getId());
            const destNode = nodeMap.get(edge.getDestNode().getId());
            const srcPort = portMap.get(edge.getSrcPort().getId());
            const destPort = portMap.get(edge.getDestPort().getId());
            const loopAware = edge.isLoopAware();
            const closesLoop = edge.isClosesLoop();

            if (typeof srcNode === "undefined" || typeof srcPort === "undefined" || typeof destNode === "undefined" || typeof destPort === "undefined"){
                errorsWarnings.errors.push(Errors.Message("Unable to insert edge " + edge.getId() + " source node or destination node could not be found."));
                continue;
            }

            // add new edge
            const newEdge : Edge = new Edge('', srcNode, srcPort, destNode, destPort, loopAware, closesLoop, false);
            this.eagle.logicalGraph().addEdgeComplete(newEdge);
        }

        //used if we cant find space on the canvas, we then extend the search area for space and center the graph after adding to bring new nodes into view
        if(parentNodePosition.extended){
            setTimeout(function(){
                this.eagle.centerGraph()
            }, EagleConfig.STANDARD_UI_SHORT_TIMEOUT)
        }
    }

    /**
     * Creates a new logical graph for editing.
     */
    newLogicalGraph = async(): Promise<void> => {
        const allowGraphEditing = Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false);

        // check that graph editing is permitted
        if (!allowGraphEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "New Logical Graph");
            return;
        }

        // reset EAGLE state
        this.eagle.resetEditor();
        this.eagle.undo().clear();

        // create new logical graph
        this.eagle.logicalGraph(new LogicalGraph());

        // name the new graph and initialize it (creates default graph config)
        const filename:string = await Utils.ensureGraphIsInitialized(this.eagle.logicalGraph());

        Utils.showNotification("New Graph Created", filename, "success");
    }

    /**
     * Presents the user with a textarea in which to paste JSON. Reads the JSON and parses it into a logical graph for editing.
     */
    newLogicalGraphFromJson = async (): Promise<void> => {
        const allowGraphEditing = Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false);

        // check that graph editing is permitted
        if (!allowGraphEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "New Logical Graph From JSON")
            return;
        }

        let userCode: string;
        try{
            userCode = await Utils.requestUserCode("json", "New Logical Graph from JSON", "");
        } catch (error){
            console.error(error);
            return;
        }

        await this._loadGraphJSON(userCode, "", (lg: LogicalGraph) : void => {
            this.eagle.logicalGraph(lg);
        });

        this.eagle.resetEditor()
    }

    insertGraphFromJson = async (): Promise<void> => {
        const allowGraphEditing = Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false);

        // check that graph editing is permitted
        if (!allowGraphEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Insert Graph from JSON");
            return;
        }

        let userCode: string;
        try {
            userCode = await Utils.requestUserCode("json", "Insert Graph from JSON", "");
        } catch (error) {
            console.error(error);
            return;
        }

        // parse JSON
        const dataObject = JSON.parse(userCode);

        // read as LogicalGraph
        const errorsWarnings: ErrorsWarnings = {errors: [], warnings: []};
        const lg: LogicalGraph = LogicalGraph.fromOJSJson(dataObject, null, errorsWarnings);

        // insert
        const nodes = Array.from(lg.getNodes());
        const edges = Array.from(lg.getEdges());
        await this.insertGraph(nodes, edges, null, errorsWarnings);

        // display notification to user
        Utils.showNotification("Inserted Graph from JSON", "Inserted " + nodes.length + " nodes and " + edges.length + " edges.", "info");
    }

    loadFileFromUrl = async(fileType: EagleFileType): Promise<void> => {
        let url: string;
        try {
            url = await Utils.requestUserString("Url", "Enter Url of " + fileType + " to load", "", false, Utils.httpUrlStringValidator("URL"));
        } catch(error){
            console.error(error);
            return;
        }

        try {
            Repositories.selectFile(new RepositoryFile(new Repository(RepositoryService.Url, "", "", false), "", url));
        } catch(error){
            console.error(error);
        }
    }

    displayObjectAsJson = (fileType: EagleFileType, object: LogicalGraph | Palette | GraphConfig) : void => {
        let jsonString: string;
        const version: SchemaVersion = Setting.findValue<SchemaVersion>(Setting.DALIUGE_SCHEMA_VERSION, SchemaVersion.Unknown);
        
        switch(fileType){
            case EagleFileType.Graph:
                jsonString = LogicalGraph.toJsonString(object as LogicalGraph, false, version);
                break;
            case EagleFileType.Palette:
                jsonString = Palette.toJsonString(object as Palette, version);
                break;
            case EagleFileType.GraphConfig:
                jsonString = GraphConfig.toJsonString(object as GraphConfig);
                break;
            default:
                console.error("displayObjectAsJson(): Un-handled fileType", fileType);
                return;
        }

        Utils.requestUserCode("json", "Display " + fileType + " as JSON", jsonString, true);
    }

    displayNodeAsJson = (node: Node) : void => {
        let jsonString: string;
        const version: SchemaVersion = Setting.findValue<SchemaVersion>(Setting.DALIUGE_SCHEMA_VERSION, SchemaVersion.Unknown);

        switch(version){
            case SchemaVersion.OJS:
                jsonString = JSON.stringify(Node.toOJSGraphJson(node), null, EagleConfig.JSON_INDENT);
                break;
            case SchemaVersion.V4:
                jsonString = JSON.stringify(Node.toV4GraphJson(node), null, EagleConfig.JSON_INDENT);
                break;
            default:
                console.error("Unsupported graph format! (" + version + ")");
                jsonString = "";
                break;
        }

        Utils.requestUserCode("json", "Display Node as JSON", jsonString, true);
    }

    /**
     * Creates a new palette for editing.
     */
    newPalette = async () : Promise<void> => {
        const allowPaletteEditing = Setting.findValue<boolean>(Setting.ALLOW_PALETTE_EDITING, false);

        // check that palette editing is permitted
        if (!allowPaletteEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Palette, "New Palette");
            return;
        }

        let filename: string;
        try {
            filename = await Utils.requestDiagramFilename(EagleFileType.Palette);
        } catch (error){
            console.warn(error);
            return;
        }
        const p: Palette = new Palette();
        p.fileInfo().name = filename;
        p.fileInfo().location.repositoryFileName(filename);

        // mark the palette as modified and readwrite
        p.fileInfo().modified = true;
        p.fileInfo().readonly = false;

        // add to palettes
        this.eagle.palettes.unshift(p);

        Utils.showNotification("New Palette Created", filename, "success");
    }

    /**
     * Presents the user with a textarea in which to paste JSON. Reads the JSON and parses it into a palette.
     */
    newPaletteFromJson = async (): Promise<void> => {
        const allowPaletteEditing = Setting.findValue<boolean>(Setting.ALLOW_PALETTE_EDITING, false);

        // check that palette editing is permitted
        if (!allowPaletteEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Palette, "New Palette from JSON");
            return;
        }

        let userText: string;
        try {
            userText = await Utils.requestUserText("New Palette from JSON", "Enter the JSON below", "");
        } catch (error) {
            console.error(error);
            return;
        }

        this._loadPaletteJSON(userText, "");
    }

    /**
     * Reloads a previously loaded palette.
     */
     reloadPalette = async (palette: Palette, index: number): Promise<void> => {
         const fileInfo : FileInfo = palette.fileInfo();
         // remove palette
         this.closePalette(palette);

         switch (fileInfo.location.repositoryService()){
             case RepositoryService.File:
                // load palette
                this.eagle.getPaletteFileToLoad();
                break;
            case RepositoryService.GitLab:
            case RepositoryService.GitHub:
                Repositories.selectFile(new RepositoryFile(new Repository(fileInfo.location.repositoryService(), fileInfo.location.repositoryName(), fileInfo.location.repositoryBranch(), false), fileInfo.location.repositoryPath(), fileInfo.location.repositoryFileName()));
                break;
            case RepositoryService.Url:
                const {palettes} = await this.loadPalettes([
                    {name:palette.fileInfo().name, filename:palette.fileInfo().location.downloadUrl(), readonly:palette.fileInfo().readonly, expanded: true}
                ]);

                for (const palette of palettes){
                    if (palette !== null){
                        this.eagle.palettes.splice(index, 0, palette);
                    }
                }
                break;
            default:
                // can't be fetched
                break;
         }
    }

    /**
     * Creates a new graph configuration
     */

    newConfig = () : void => {
        const allowGraphEditing = Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false);

        // check that editing graphs is permitted
        if (!allowGraphEditing){
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "New Config");
            return;
        }

        const c: GraphConfig = new GraphConfig();
        c.fileInfo().name = 'newConfig';
        c.fileInfo().type = EagleFileType.GraphConfig;
        c.fileInfo().schemaVersion = SchemaVersion.V4;
        c.fileInfo().readonly = false;

        // adding a new graph config to the array
        this.eagle.logicalGraph().addGraphConfig(c)
    }

    duplicateGraphConfig = (config: GraphConfig): void => {
        const newConfigName = Utils.generateGraphConfigName(config);
        const clone = config
            .clone()
            .setId(Id.generateGraphConfigId());
        clone.fileInfo().name = newConfigName;

        // add duplicate to LG
        this.eagle.logicalGraph().addGraphConfig(clone);
    }

    loadDefaultPalettes = async (): Promise<void> => {
        // get collapsed/expanded state of palettes from html local storage
        let templatePaletteExpanded: boolean = Setting.findValue<boolean>(Setting.OPEN_TEMPLATE_PALETTE, false);
        let builtinPaletteExpanded: boolean = Setting.findValue<boolean>(Setting.OPEN_BUILTIN_PALETTE, false);
        templatePaletteExpanded = templatePaletteExpanded === null ? false : templatePaletteExpanded;
        builtinPaletteExpanded = builtinPaletteExpanded === null ? false : builtinPaletteExpanded;

        const {errorsWarnings} = await this.loadPalettes([
            {name:Palette.TEMPLATE_PALETTE_NAME, filename:Daliuge.TEMPLATE_URL, readonly:true, expanded: templatePaletteExpanded},
            {name:Palette.BUILTIN_PALETTE_NAME, filename:Daliuge.PALETTE_URL, readonly:true, expanded: builtinPaletteExpanded}
        ]);
        
        const showIssues: boolean = Setting.findValue<boolean>(Setting.SHOW_FILE_LOADING_WARNINGS, false);

        // errors are always shown in the issues modal; the setting only controls warnings
        const hasErrors: boolean = Errors.hasErrors(errorsWarnings);
        const hasWarnings: boolean = showIssues && Errors.hasWarnings(errorsWarnings);

        // display of errors (always) and warnings (if the setting is on)
        if (hasErrors || hasWarnings){
            // add errors/warnings to the arrays (warnings only if the setting is on)
            this.eagle.loadingErrors(hasErrors ? errorsWarnings.errors : []);
            this.eagle.loadingWarnings(hasWarnings ? errorsWarnings.warnings : []);

            this.eagle.errorsMode(Mode.Loading);
            Utils.showErrorsModal("Loading File");
        }
    }

    loadPalettes = async (paletteList: {name:string, filename:string, readonly:boolean, expanded:boolean}[]): Promise<{palettes: Palette[], errorsWarnings: ErrorsWarnings}> => {
        return new Promise(async(resolve) => {
            const destinationPalettes: Palette[] = [];
            const errorsWarnings: ErrorsWarnings = {"errors":[], "warnings":[]};

            // define a function to check if all requests are now complete, if so we can return the list of palettes
            function _checkAllPalettesComplete() : void {
                let allComplete = true;

                for (const palette of destinationPalettes){
                    if (palette.isFetching()){
                        allComplete = false;
                    }
                }
                if (allComplete){
                    resolve({palettes: destinationPalettes, errorsWarnings: errorsWarnings});
                }
            }

            // initialise the state
            for (let i = 0 ; i < paletteList.length ; i++){
                // create placeholder palette to show in the UI while the palette is being fetched
                const palette = new Palette();
                palette.isFetching(true);
                palette.fileInfo().name = paletteList[i].name;
                palette.expanded(false);

                // keep reference to the placeholder palette so that it can be replaced when the palette is loaded
                destinationPalettes.push(palette);
                this.eagle.palettes.unshift(palette);
            }

            // start trying to load the palettes
            for (let i = 0 ; i < paletteList.length ; i++){
                const index = i;
                const postData = {url: paletteList[i].filename};

                let data: any;
                let fetchFailed = false;
                try {
                    data = await Utils.httpPostJSON("/openRemoteUrlFile", postData);
                } catch (error){
                    fetchFailed = true;
                    // an error occurred when fetching the palette
                    errorsWarnings.errors.push(Errors.Message(Errors.UnknownToError(error)));

                    // try to load palette from localStorage
                    const paletteData = localStorage.getItem(paletteList[i].filename);

                    if (paletteData === null){
                        console.warn("Unable to fetch palette '" + paletteList[i].name + "'. Palette also unavailable from localStorage.");
                    } else {
                        console.warn("Unable to fetch palette '" + paletteList[i].name + "'. Palette loaded from localStorage.");

                        // attempt to determine schema version from FileInfo
                        const schemaVersion: SchemaVersion = Utils.determineSchemaVersion(paletteData);
                        let palette: Palette;
                        const file = new RepositoryFile(new Repository(RepositoryService.Url, "", "", false), "", paletteList[i].name);
                        file.type = EagleFileType.Palette;
                        switch (schemaVersion){
                            case SchemaVersion.OJS:
                            case SchemaVersion.Unknown:
                                palette = Palette.fromOJSJson(paletteData, file, errorsWarnings);
                                break;
                            case SchemaVersion.V4:
                                palette = Palette.fromV4Json(paletteData, file, errorsWarnings);
                                break;
                        }
                        
                        Utils.preparePalette(palette, paletteList[i]);

                        destinationPalettes[index].copy(palette);
                    }

                } finally {
                    destinationPalettes[index].isFetching(false);
                    destinationPalettes[index].expanded(paletteList[index].expanded);
                }

                if (fetchFailed){
                    _checkAllPalettesComplete();
                    continue;
                }

                // palette fetched successfully
                const repositoryFile = new RepositoryFile(new Repository(RepositoryService.Url, "", "", false), "", paletteList[i].name);
                const palette: Palette = Palette.fromOJSJson(data, repositoryFile, errorsWarnings);
                Utils.preparePalette(palette, paletteList[index]);

                // copy loaded palette into the destination palette that is already in the list of palettes
                destinationPalettes[index].copy(palette);

                // save to localStorage
                localStorage.setItem(paletteList[index].filename, data);

                _checkAllPalettesComplete();
            }
        });
    }

    openRemoteFile = async (file : RepositoryFile, replaceActiveGraph: boolean = false): Promise<void> => {
        // flag file as being fetched
        file.isFetching(true);

        // check palette is not already loaded
        const alreadyLoadedPalette = this.findPaletteByFile(file);
        if (typeof alreadyLoadedPalette !== 'undefined'){
            this.closePalette(alreadyLoadedPalette);
        }

        // if this is a palette, create the destination palette and add to list of palettes so that it shows in the UI
        let destinationPalette: Palette | null = null;
        if (file.type === EagleFileType.Palette){
            destinationPalette = new Palette();
            destinationPalette.isFetching(true);
            destinationPalette.fileInfo().name = file.name;
            destinationPalette.expanded(false);
            this.eagle.palettes.unshift(destinationPalette);
        }

        // check the service required to fetch the file
        let openRemoteFileFunc: (repositoryService: RepositoryService, repositoryName: string, repositoryBranch: string, filePath: string, fileName: string) => Promise<string>;
        switch (file.repository.service){
            case RepositoryService.GitHub:
                openRemoteFileFunc = GitHub.openRemoteFile;
                break;
            case RepositoryService.GitLab:
                openRemoteFileFunc = GitLab.openRemoteFile;
                break;
            case RepositoryService.Url:
                openRemoteFileFunc = Utils.openRemoteFileFromUrl;
                break;
            default:
                const message = "Unable to load '" + file.name + "': repository service '" + file.repository.service + "' is not supported for remote loading.";
                console.warn(message);
                Utils.showUserMessage("Error", message);
                return;
        }

        // load file from github or gitlab
        let data: string;
        try {
            data = await openRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
        } catch (error){
            Utils.showUserMessage("Error", "Unable to open remote file: " + error);
            this.eagle.hideEagleIsLoading()
            return;
        } finally {
            // flag fetching as complete
            file.isFetching(false);
        }
        
        // determine file extension
        const fileExtension = Utils.getFileExtension(file.name);
        let fileTypeLoaded: EagleFileType = EagleFileType.Unknown;
        let dataObject: JsonObject | null = null;
        const eagleWindow = window as Window & {version?: string};

        if (fileExtension !== "md"){
            // attempt to parse the JSON
            try {
                const parsed = JSON.parse(data);

                if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)){
                    Utils.showUserMessage("Error parsing file JSON", "Top-level JSON must be an object");
                    return;
                }

                dataObject = parsed as JsonObject;
            } catch(err){
                Utils.showUserMessage("Error parsing file JSON", Errors.UnknownToError(err));
                return;
            }

            fileTypeLoaded = Utils.determineFileType(dataObject);
        } else {
            fileTypeLoaded = EagleFileType.Markdown;
        }        

        switch (fileTypeLoaded){
            case EagleFileType.Graph: {
                if (dataObject === null){
                    Utils.showUserMessage("Error", "Graph JSON payload is empty or invalid.");
                    return;
                }

                // attempt to determine schema version from FileInfo
                const eagleVersion: string = Utils.determineEagleVersion(dataObject);

                // check if we need to update the graph from keys to ids
                if (GraphUpdater.usesNodeKeys(dataObject)){
                    GraphUpdater.updateKeysToIds(dataObject);
                }

                // warn user if file newer than EAGLE
                if (Utils.newerEagleVersion(eagleVersion, eagleWindow.version ?? "")){
                    const confirmed = await Utils.requestUserConfirm("Newer EAGLE Version", "File " + file.name + " was written with EAGLE version " + eagleVersion + ", whereas the current EAGLE version is " + (eagleWindow.version ?? "") + ". Do you wish to load the file anyway?", "Yes", "No", undefined);
                    if (confirmed){
                        if (replaceActiveGraph) {
                            await this._loadGraph(data, file);
                        } else {
                            await this._loadGraphWithChoice(data, file);
                        }
                    }
                } else {
                    if (replaceActiveGraph) {
                        await this._loadGraph(data, file);
                    } else {
                        await this._loadGraphWithChoice(data, file);
                    }
                }
                break;
            }
            case EagleFileType.Palette:
                // abort if destination palette is null
                if (destinationPalette === null){
                    Utils.showUserMessage("Error", "Destination palette is null when loading remote palette.");
                    return;
                }
                this._remotePaletteLoaded(file, data, destinationPalette);
                break;

            case EagleFileType.GraphConfig:
                if (dataObject === null){
                    Utils.showUserMessage("Error", "GraphConfig JSON payload is empty or invalid.");
                    return;
                }
                this._loadGraphConfig(dataObject, file);
                break;

            case EagleFileType.Markdown:
                Utils.showUserMessage(file.name, Utils.markdown2html(data), true);
                break;

            default:
                // Show error message
                Utils.showUserMessage("Error", "The file type is unknown!");
        }
        this.eagle.resetEditor();
    };

    // NOTE: public (not private) because it is called from FileIO.ts
    _loadGraphWithChoice = async (data: string, file: RepositoryFile): Promise<void> => {
        const graphIsActive = this.eagle.logicalGraph().fileInfo().name !== "";
        if (!graphIsActive) {
            await this._loadGraph(data, file);
            return;
        }

        const userOption = await Utils.requestUserOptions(
            "Load Graph",
            "A graph is already active. How would you like to load this graph?",
            "Add as Subgraph",
            "Replace Active Graph",
            "Cancel",
            1
        );

        // Cancel if the user chooses to cancel
        if (userOption === "Cancel") {
            return;
        }

        // Replace the active graph if the user chooses that option
        if (userOption === "Replace Active Graph") {
            if (this.eagle.logicalGraph().fileInfo().modified) {
                const confirmed = await Utils.requestUserConfirm(
                    "Graph Modified",
                    "The current graph has unsaved changes. Loading a new graph will overwrite those changes. Do you wish to continue?",
                    "Yes",
                    "No",
                    undefined
                );

                if (!confirmed) {
                    return;
                }
            }

            await this._loadGraph(data, file);
            return;
        }


        // Insert as subgraph
        await this._loadGraphJSON(data, file.name, async (logicalGraph: LogicalGraph, errorsWarnings: ErrorsWarnings): Promise<void> => {
            const parentNode = new Node(
                logicalGraph.fileInfo().name,
                logicalGraph.fileInfo().location.getText(),
                "",
                CategoryName.SubGraph
            );

            await this.insertGraph(
                Array.from(logicalGraph.getNodes()),
                Array.from(logicalGraph.getEdges()),
                parentNode,
                errorsWarnings
            );

            this.eagle.checkEagle();
            this.eagle.undo().pushSnapshot(this.eagle, "Insert Logical Graph");
            this.eagle.logicalGraph.valueHasMutated();
        });
    }

    _loadGraph = async (data: string, file: RepositoryFile) : Promise<void> => {
        // load graph
        const loaded = await this._loadGraphJSON(data, file.name, (lg: LogicalGraph) => {
            this.eagle.logicalGraph(lg);
        });

        if (loaded) {
            this._postLoadGraph(file);
        }
    }

    _postLoadGraph = (file: RepositoryFile) : void => {
        //needed when centering after init of a graph. we need to wait for all the constructs to finish resizing themselves
        setTimeout(function(){
            this.eagle.centerGraph()
        }, EagleConfig.STANDARD_UI_SHORT_TIMEOUT);

        // check graph
        this.eagle.checkEagle();
        this.eagle.undo().clear();
        this.eagle.undo().pushSnapshot(this.eagle, "Loaded " + file.name);

        // if the fileType is the same as the current mode, update the activeFileInfo with details of the repository the file was loaded from
        Utils.updateFileInfo(this.eagle.logicalGraph().fileInfo, file);
    }

    // NOTE: public (not private) because it is called from FileIO.ts
    _loadGraphConfig = async (dataObject: JsonObject, file: RepositoryFile): Promise<void> => {
        const errorsWarnings: ErrorsWarnings = {"errors":[], "warnings":[]};

        let graphConfig = GraphConfig.fromJson(dataObject, this.eagle.logicalGraph(), errorsWarnings);

        const graphModified: boolean = this.eagle.logicalGraph().fileInfo().modified;
        let someGraphAlreadyLoaded: boolean = this.eagle.logicalGraph().fileInfo().name !== ""; // true if there is already a graph loaded

        // check if graphConfig belongs to this graph
        let configMatch = FileLocation.match(graphConfig.fileInfo().graphLocation, this.eagle.logicalGraph().fileInfo().location);

        // check if LogicalGraph is modified, if so warn user that loading a GraphConfig may overwrite unsaved changes
        if (graphModified && !configMatch){
            const confirmed = await Utils.requestUserConfirm("Graph Modified", "The current graph has unsaved changes. Loading a GraphConfig may overwrite some of these changes. Do you wish to continue?", "Yes", "No", undefined);

            if (!confirmed) {
                return;
            }
        }

        // if no graph is loaded, or the graphConfig does not match the current graph, then load the graph that matches the graphConfig
        if (!someGraphAlreadyLoaded || !configMatch){
            const repository = new Repository(graphConfig.fileInfo().graphLocation.repositoryService(), graphConfig.fileInfo().graphLocation.repositoryName(), graphConfig.fileInfo().graphLocation.repositoryBranch(), false);
            const repositoryFile = new RepositoryFile(repository, graphConfig.fileInfo().graphLocation.repositoryPath(), graphConfig.fileInfo().graphLocation.repositoryFileName());
            repositoryFile.type = EagleFileType.Graph;

            // if the associated graph is a local file, we cannot load the graph config remotely
            if (repository.service === RepositoryService.File) {
                Utils.showUserMessage(
                    "Error",
                    "Unable to load graph config '" + file.name + "': its associated graph is a local file. Load the associated graph first, then load the graph config."
                );
                return;
            }

            // load graph first
            await this.openRemoteFile(repositoryFile, true);

            someGraphAlreadyLoaded = true;
            configMatch = true;
            // Rebind configuration nodes to the graph that was just loaded.
            errorsWarnings.errors = [];
            errorsWarnings.warnings = [];
            graphConfig = GraphConfig.fromJson(dataObject, this.eagle.logicalGraph(), errorsWarnings);
        }

        // check if graphConfig already exists in this graph
        const configAlreadyExists: boolean = this.eagle.logicalGraph().getGraphConfigById(graphConfig.getId()) !== undefined;

        if (someGraphAlreadyLoaded && configMatch && configAlreadyExists){
            const userOption = await Utils.requestUserOptions("Graph Config Already Exists", "A graph config with the same id already exists in this graph. Do you wish to overwrite it, or load the new one with a different name?", "Overwrite", "Load as Separate Config", "Cancel", 0);

            if (userOption === "Overwrite"){
                this.eagle.logicalGraph().addGraphConfig(graphConfig);
            } else if (userOption === "Load as Separate Config"){
                graphConfig.fileInfo().name = graphConfig.fileInfo().name + " (copy)";
                graphConfig.setId(Id.generateGraphConfigId());
                this.eagle.logicalGraph().addGraphConfig(graphConfig);
            } else {
                // do nothing
            }
        }

        if (someGraphAlreadyLoaded && configMatch && !configAlreadyExists){
            this.eagle.logicalGraph().addGraphConfig(graphConfig);
        }

        // show errors/warnings
        this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);
    }

    insertRemoteFile = async (file : RepositoryFile): Promise<void> => {
        // flag file as being fetched
        file.isFetching(true);

        // check the service required to fetch the file
        let insertRemoteFileFunc: (repositoryService: RepositoryService, repositoryName: string, repositoryBranch: string, filePath: string, fileName: string) => Promise<string>;
        switch (file.repository.service){
            case RepositoryService.GitHub:
                insertRemoteFileFunc = GitHub.openRemoteFile;
                break;
            case RepositoryService.GitLab:
                insertRemoteFileFunc = GitLab.openRemoteFile;
                break;
            default:
                console.warn("Unsure how to fetch file with unknown service ", file.repository.service);
                return;
        }

        // load file from github or gitlab
        let data: string;
        try {
            data = await insertRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
        } catch (error) {
            Utils.showUserMessage("Error", "Failed to load a file!");
            console.error(error);
            return;
        } finally {
            // flag fetching as complete
            file.isFetching(false);
        }

        // attempt to parse the JSON
        let dataObject;
        try {
            dataObject = JSON.parse(data);
        } catch(err){
            Utils.showUserMessage("Error parsing file JSON", Errors.UnknownToError(err));
            return;
        }

        const fileTypeLoaded: EagleFileType = Utils.determineFileType(dataObject);

        // only do this for graphs at the moment
        if (fileTypeLoaded !== EagleFileType.Graph){
            Utils.showUserMessage("Error", "Unable to insert non-graph!");
            console.error("Unable to insert non-graph!");
            return;
        }

        // attempt to determine schema version from FileInfo
        const schemaVersion: SchemaVersion = Utils.determineSchemaVersion(dataObject);

        // check if we need to update the graph from keys to ids
        if (GraphUpdater.usesNodeKeys(dataObject)){
            GraphUpdater.updateKeysToIds(dataObject);
        }

        const errorsWarnings: ErrorsWarnings = {"errors":[], "warnings":[]};

        // use the correct parsing function based on schema version
        let lg: LogicalGraph;
        switch (schemaVersion){
            case SchemaVersion.OJS:
            case SchemaVersion.Unknown:
                lg = LogicalGraph.fromOJSJson(dataObject, file.name, errorsWarnings);
                break;
            case SchemaVersion.V4:
                if (!this._validateV4GraphLoadJSON(dataObject as JsonObject, errorsWarnings)) {
                    this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);
                    return;
                }
                lg = LogicalGraph.fromV4Json(dataObject as V4GraphJson, file.name, errorsWarnings);
                break;
            default:
                errorsWarnings.errors.push(Errors.Message("Unknown schemaVersion: " + schemaVersion));
                return;
        }

        // check that graph has been named, if not, name the graph before inserting
        await Utils.ensureGraphIsInitialized(this.eagle.logicalGraph());

        // create parent node
        const parentNode: Node = new Node(lg.fileInfo().name, lg.fileInfo().location.getText(), "", CategoryName.SubGraph);

        // perform insert
        await this.insertGraph(Array.from(lg.getNodes()), Array.from(lg.getEdges()), parentNode, errorsWarnings);

        // trigger re-render
        this.eagle.logicalGraph.valueHasMutated();
        this.eagle.undo().pushSnapshot(this.eagle, "Inserted " + file.name);
        this.eagle.checkEagle();

        // show errors/warnings
        this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);
    };

    deleteRemoteFile = async (file : RepositoryFile): Promise<void> => {
        // request confirmation from user
        const confirmed = await Utils.requestUserConfirm("Delete?", "Are you sure you wish to delete '" + file.name + "' from this repository?", "Yes", "No", Setting.find(Setting.CONFIRM_DELETE_FILES));
        if (confirmed){
            this._deleteRemoteFile(file);
        }
    }

    private _deleteRemoteFile = async (file: RepositoryFile): Promise<void> => {
        // check the service required to delete the file
        let deleteRemoteFileFunc;

        switch (file.repository.service){
            case RepositoryService.GitHub:
                deleteRemoteFileFunc = GitHub.deleteRemoteFile;
                break;
            case RepositoryService.GitLab:
                deleteRemoteFileFunc = GitLab.deleteRemoteFile;
                break;
            default:
                console.warn("Unsure how to delete file with unknown service ", file.repository.service);
                return;
        }

        // run the delete file function
        try {
            await deleteRemoteFileFunc(file.repository.service, file.repository.name, file.repository.branch, file.path, file.name);
        } catch (error) {
            // display error if one occurred
            if (error != null){
                Utils.showNotification("Error deleting file", String(error), "danger");
                return;
            }
        }

        Utils.showNotification("Success", "File deleted", "success");

        file.repository.deleteFile(file);
    }

    private _remotePaletteLoaded = async (file : RepositoryFile, data : string, destinationPalette: Palette): Promise<void> => {
        this._reloadPalette(file, data, destinationPalette);
    }

    // NOTE: public (not private) because it is called from FileIO.ts
    _loadPaletteJSON = (data: string, fileFullPath: string) => {
        let dataObject;

        // attempt to parse the JSON
        try {
            dataObject = JSON.parse(data);
        } catch(err){
            Utils.showUserMessage("Error parsing file JSON", Errors.UnknownToError(err));
            return;
        }

        // determine file type
        const loadedFileType : EagleFileType = Utils.determineFileType(dataObject);

        // abort if not palette
        if (loadedFileType !== EagleFileType.Palette){
            Utils.showUserMessage("Error", "This is not a palette file! Looks like a " + loadedFileType);
            return;
        }

        // create a destination palette and add to palettes list
        const palette = new Palette();
        palette.fileInfo().location.repositoryService(RepositoryService.File);
        palette.fileInfo().location.repositoryPath(Utils.getFilePathFromFullPath(fileFullPath));
        palette.fileInfo().location.repositoryFileName(Utils.getFileNameFromFullPath(fileFullPath));
        palette.isFetching(true);
        this.eagle.palettes.unshift(palette);

        // load the palette, handle errors and add palettes list
        this._reloadPalette(new RepositoryFile(Repository.placeholder(), "", Utils.getFileNameFromFullPath(fileFullPath)), data, palette);
    }

    // NOTE: public (not private) because it is called from FileIO.ts
    _reloadPalette = (file : RepositoryFile, data : string, palette : Palette) : void => {
        // close the existing version of the open palette
        if (palette !== null && !palette.isFetching()){
            this.closePalette(palette);
        }

        // determine schema version from FileInfo
        const schemaVersion: SchemaVersion = Utils.determineSchemaVersion(JSON.parse(data));

        // load the new palette
        const errorsWarnings: ErrorsWarnings = {"errors":[], "warnings":[]};
        let newPalette: Palette;
        switch (schemaVersion){
            case SchemaVersion.OJS:
            case SchemaVersion.Unknown:
                newPalette = Palette.fromOJSJson(data, file, errorsWarnings);
                break;
            case SchemaVersion.V4:
                newPalette = Palette.fromV4Json(data, file, errorsWarnings);
                break;
            default:
                errorsWarnings.errors.push(Errors.Message("Unknown schemaVersion: " + schemaVersion));
                return;
        }

        if (file.repository.service === RepositoryService.Url){
            newPalette.fileInfo().location.repositoryService(RepositoryService.Url);
            newPalette.fileInfo().location.downloadUrl(file.name);
            newPalette.fileInfo.valueHasMutated();
        }

        // all new (or reloaded) palettes should have 'expanded' flag set to true
        newPalette.expanded(true);

        // copy content of fetched palette into the destination palette that is already in the list of palettes
        palette.copy(newPalette);

        // show errors/warnings
        this._handleLoadingErrors(errorsWarnings, file.name, file.repository.service);

        // check EAGLE
        this.eagle.checkEagle();
    }

    findPaletteByFile = (file : RepositoryFile) : Palette | undefined => {
        for (const palette of this.eagle.palettes()){
            if (palette.fileInfo().name === file.name){
                return palette;
            }
        }

        return undefined;
    }

    closePalette = async (palette : Palette): Promise<void> => {
        for (let i = 0 ; i < this.eagle.palettes().length ; i++){
            const p = this.eagle.palettes()[i];

            // TODO: can we use a palette id here, to be sure the correct palette is closed?
            if (p.fileInfo().name === palette.fileInfo().name){

                // check if the palette is modified, and if so, ask the user to confirm they wish to close
                if (p.fileInfo().modified && Setting.findValue<boolean>(Setting.CONFIRM_DISCARD_CHANGES, false)){
                    const confirmed = await Utils.requestUserConfirm("Close Modified Palette", "Are you sure you wish to close this modified palette?", "Close", "Cancel", undefined);
                    if (confirmed){
                        this.eagle.palettes.splice(i, 1);
                    }
                } else {
                    this.eagle.palettes.splice(i, 1);
                }

                break;
            }
        }
        this.eagle.resetEditor()
    }

    selectAllInPalette = (palette: Palette): void => {
        this.eagle.selectedObjects([]);
        for (const node of palette.getNodes()){
            this.eagle.editSelection(node, EagleFileType.Palette);
        }

        Utils.showNotification("Select All", "All components in '" + palette.fileInfo().name + "' palette selected", "info", false);
    }

}
