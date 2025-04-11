import { Selector, t } from 'testcafe';

class Node {
  constructor(id, isConstruct, n = 0) {
    this.select = Selector(id + ' image');
    this.resize = Selector(id + ' .resize-control-label');
    //this.select = Selector(id + ' rect:not(.header-background)');
    if (isConstruct) {
      this.input = Selector(id + ' g.inputPorts circle').nth(n);
      this.output = Selector(id + ' g.inputLocalPorts circle').nth(n);
    } else {
      this.input = Selector(id + ' g.inputPorts circle').nth(n);
      this.output = Selector(id + ' g.outputPorts circle').nth(n);
    }
  }
}

class PaletteNode {
  // "i" here represents which palette the node is from in the left pane (0 is the top palette).
  // "n" is which number node it is in the palette.
  constructor(i = 0, n = 0) {
    this.addNode = Selector('#addPaletteNode' + n.toString()).nth(i);
  }
}

class RepoFile {
  constructor(repo, filepath, filename) {
    this.repo = Selector('#' + repo.replace('/', '_'));
    this.path = Selector('#folder_' + filepath);
    this.filename = Selector('#id_' + filename.replace('.', '_'))
  }
}

class Page {
  constructor() {
    this.leftHandle = Selector('.leftWindowHandle');
    this.rightHandle = Selector('.rightWindowHandle');

    this.rightAdjuster = Selector('.rightWindowSizeAdjuster');

    this.nameInput = Selector('#inputModalInput');
    this.submitButton = Selector('#inputModal .modal-footer button');

    this.nodeMode = Selector('#rightWindowModeNode');
    this.repoMode = Selector('#rightWindowModeRepositories');
    this.transMode = Selector('#rightWindowModeTranslation');

    this.deleteNodeButton = Selector('#deleteSelectedNode');
    this.confirmButton = Selector('#confirmModalAffirmativeButton');

    this.description = Selector('#inspectorDescriptionHeading');
    this.displayOptions = Selector('#inspectorDisplayOptionsHeading');
    this.parameters = Selector('#inspectorComponentParamsHeading');
    this.inputPorts = Selector('#inspectorInputsHeading');
    this.outputPorts = Selector('#inspectorOutputsHeading');
    this.inputApplication = Selector('#inspectorInpuputAppHeading');
    this.outputApplication = Selector('#inspectorInputAppHeading');

    this.nodeNameValue = Selector('#nodeNameValue');
    this.parentButton = Selector('#nodeInspectorChangeParent');
    this.selectChoice = Selector('#choiceModalSelect');
    this.selectCustom = Selector('#choiceModalString');
    this.submitChoice = Selector('#choiceModal .modal-footer button');

    this.navbarGraph = Selector('#navbarDropdownGraph');
    this.navbarPalette = Selector('#navbarDropdownPalette');
    this.navbarHelp = Selector('#navbarDropdownHelp');

    this.navbarGraphNew = Selector('#navbarDropdownGraphNew');
    this.navbarGraphNewCreate = Selector('#createNewGraph');
    this.navbarGraphNewCreateFromJson = Selector('#createNewGraphFromJson');
    this.navbarGraphNewAddEdge = Selector('#addEdgeToLogicalGraph');

    this.saveGitAs = Selector('#commitToGitAsGraph');

    this.descriptionField = Selector('textarea.form-control');

    this.addRepo = Selector('#addRepository');
    this.newRepoName = Selector('#gitCustomRepositoryModalRepositoryNameInput');
    this.newRepoBranch = Selector('#gitCustomRepositoryModalRepositoryBranchInput');
    this.newRepoSubmit = Selector('#gitCustomRepositoryModalAffirmativeAnswer');

    this.settings = Selector('#settings');
    this.allowComponentEditing = Selector('#setting7Button');
    this.setGitToken = Selector('#setting13Value');
    this.disableJSONval = Selector('#setting16Button');
    this.settingsSubmit = Selector('#settingsModalAffirmativeAnswer');

    this.centerGraph = Selector('#centerGraph');

    this.closeTopPalette = Selector('button.close');
    this.collapseTopPalette = Selector('#palette0.card-header');

    this.componentParameters = Selector('.card-header').withText("Component Parameters");
    this.outputPorts = Selector('span').withText("Output Ports");
    this.changeGreet = Selector('#Field0');

    this.addInputPort = Selector('#nodeInspectorAddInputPort');
    this.addOutputPort = Selector('#nodeInspectorAddOutputPort');
    this.addInputApplication = Selector('#nodeInspectorAddInputApplication');
    this.addOutputApplication = Selector('#nodeInspectorAddOutputApplication');

    this.commitRepo = Selector('#gitCommitModalRepositoryNameSelect');
    this.commitPath = Selector('#gitCommitModalFilePathInput');
    this.commitFile = Selector('#gitCommitModalFileNameInput');
    this.commitMessage = Selector('#gitCommitModalCommitMessageInput');
    this.commitSubmit = Selector('#gitCommitModalAffirmativeButton');

    this.setTransURL = Selector('.btn.btn-primary.btn-block').withText("Set Translator URL");

    this.algorithm0 = Selector('#headingOne');
    this.alg0Button = Selector('#alg0PGT');

    this.algorithm1 = Selector('#headingTwo');
    this.alg1Button = Selector('#alg1PGT');

    this.algorithm2 = Selector('#headingThree');
    this.alg2Button = Selector('#alg2PGT');

    this.algorithm3 = Selector('#headingFour');
    this.alg3Button = Selector('#alg3PGT');

    this.algorithm4 = Selector('#headingFive');
    this.alg4Button = Selector('#alg4PGT');

    this.algorithm5 = Selector('#headingSix');
    this.alg5Button = Selector('#alg5PGT');
  }

  // For loading either a palette or a graph from a repo
  async loadFileFromRepo(repo, filepath, filename) {
    var newfile = new RepoFile(repo, filepath, filename);
    return newfile;
  }

  async addNewRepo(new_repo, new_branch) {
    await t
      .click(this.addRepo)
      .typeText(this.newRepoName, new_repo, { replace: true })
      .typeText(this.newRepoBranch, new_branch, { replace: true })
      .click(this.newRepoSubmit);
  }

  async submitName(name) {
    await t
      .typeText(this.nameInput, name, { replace: true })
      .click(this.submitButton);
  }

  async changeSetting(setting, name) {
    await t
      .typeText(setting, name, { replace: true })
      .click(this.settingsSubmit);
  }

  async selectOption(optionText) {
    await t
      .click(this.selectChoice)
      .click(Selector(this.selectChoice).find('option').withText(optionText))
      .click(this.submitChoice);
  }

  // The speed is reduced a lot for the videos
  // This is also helpful for automated testing since the warning messages
  // need time to go away. They can sometimes obstruct other elements otherwise.
  async connectNodes(outID, inID, outIsConstruct, inIsConstruct, n1, n2) {
    var node1 = new Node(outID, outIsConstruct, n1);
    var node2 = new Node(inID, inIsConstruct, n2);
    await t
      .dragToElement(
        node1.output,
        node2.input,
        {
          offsetX: 6,
          offsetY: 6,
          speed: 0.3
        });
  }

  async addField(name, value, parameterType, useAs) {
    await t
      //opening the table and adding a new field
      .click('#openNodeFieldsTable')
      .click('#parameterTableModalAddParameterButton')

      //setting the name of the new field
      .typeText(Selector('#paramsTableWrapper').find('tr').nth(-1).find('.tableFieldDisplayName'), name, { replace: true })

      //setting the requested parameter type 
      .click(Selector('#paramsTableWrapper').find('tr').nth(-1).find('.tableFieldParamTypeSelect'))
      .click(Selector('#paramsTableWrapper').find('tr').nth(-1).find('.tableFieldParamTypeSelect').find('option').withText(parameterType))

      //setting the requested use as 
      .click(Selector('#paramsTableWrapper').find('tr').nth(-1).find('.tableFieldUseAs'))
      .click(Selector('#paramsTableWrapper').find('tr').nth(-1).find('.tableFieldUseAs').find('option').withText(useAs))
    
    if(value != ''){
      await t
        
        //setting up the value field
        .typeText(Selector('#paramsTableWrapper').find('tr').nth(-1).find('.tableFieldStringValueInput'), value, { replace: true })

    }
    
    await t

      .click('#parameterTableModalAffirmativeButton')
  }

  async createEdge(srcNode, dstNode, srcIsConstruct, dstIsConstruct, srcPort, dstPort) {
    await t
      .click(this.navbarGraph)
      .hover(this.navbarGraphNew)
      .hover(this.navbarGraphNewCreate)  // we have to make sure to move horizontally first, so that the menu doesn't dissappear
      .click(this.navbarGraphNewAddEdge)

      // choose source node
      .click(Selector("#editEdgeModalSrcNodeIdSelect"))
      .click(Selector("#editEdgeModalSrcNodeIdSelect").find('option').withText(srcNode))

      // choose source port
      .click(Selector("#editEdgeModalSrcPortIdSelect"))
      .click(Selector("#editEdgeModalSrcPortIdSelect").find('option').withText(srcPort))

      // choose destination node
      .click(Selector("#editEdgeModalDestNodeIdSelect"))
      .click(Selector("#editEdgeModalDestNodeIdSelect").find('option').withText(dstNode))

      // choose destination port
      .click(Selector("#editEdgeModalDestPortIdSelect"))
      .click(Selector("#editEdgeModalDestPortIdSelect").find('option').withText(dstPort))

      .click(Selector("#editEdgeModalAffirmativeButton"));
  }

  async getRect(id, i = 0) {
    const element = Selector(id).nth(i);
    const state = await element();
    //console.log(state.boundingClientRect);
    return state.boundingClientRect;
  }

  async setNodeName(name, open) {
    await t.click(this.nodeMode);

    if (open) {
      await t.wait(1000);
      await t.click(this.displayOptions);
    }

    await t.typeText(this.nodeNameValue, name, { replace: true });
  }

  async setParent(parentText) {
    await t
      .click(this.nodeMode)
      .click(this.parentButton)
      .click(this.selectChoice)
      .click(Selector(this.selectChoice).find('option').withText(parentText))
      .click(this.submitChoice);
  }

  async addNodeInputApplication(applicationName) {
    await t.click(this.inputApplication);
    await t.click(this.addInputApplication);
    await t
      .click(this.selectChoice)
      .click(Selector(this.selectChoice).find('option').withText(applicationName));
    await t.click(this.submitChoice);
  }

  async createNewGraph(graph_name) {
    await t
      .click(this.navbarGraph)
      .hover(this.navbarGraphNew)
      .click(this.navbarGraphNewCreate)
      .typeText(this.nameInput, graph_name)
      .click(this.submitButton);
  }

  async deleteNode(id) {
    var node_toDelete = new Node(id, false);
    await t
      .click(node_toDelete.select)
      .click(this.nodeMode)
      .click(this.deleteNodeButton)
      .click(this.confirmButton);
  }

  // async moveNode (id,x,y) {
  //   var node_toMove = new Node(id);
  //   await t
  //     .click(node_toMove.select)
  //     .drag(node_toMove.select, x, y);
  // }

  async moveNode(id, x, y) {
    var node_toMove = new Node(id, false);
    await t.click(node_toMove.select);
    await t.dragToElement(node_toMove.select, this.leftHandle, {
      destinationOffsetX: x,
      destinationOffsetY: y
    });
  }

  async resizeNode(id, x, y) {
    var node_toResize = new Node(id, false);
    await t
      .drag(node_toResize.resize, x, y, {
        offsetX: 10,
        offsetY: 10
      });
  }

  async selectNode(id) {
    var node_toSelect = new Node(id, false);
    await t.click(node_toSelect.select);
  }

  // This adds the nth node in the ith palette. The hover might be necessary to make a tooltip go away.
  async addPaletteNode(i, n, hover = false) {
    var pal_node = new PaletteNode(i, n);
    await t.click(pal_node.addNode);
    if (hover) {
      await t.hover(this.leftHandle);
    }
  }

  // This is to hover over the nth node in the ith palette and pop up the tool tip with its information
  async hoverPaletteNode(i, n, wtime) {
    var pal_node = new PaletteNode(i, n);
    await t.hover(pal_node.addNode, {
      offsetX: -230
    })
    await t.wait(wtime);
  }

  async createHelloWorldFile(graph_filename, node0, node1, node2, greet) {

    // create a new graph
    await this.createNewGraph(graph_filename);
    //await t.click(page.centerGraph);

    await this.selectNode(node0);

    // Add a description to the description node
    await t.typeText(this.descriptionField, "A graph saving the output of a HelloWorldApp to disk");
    // Move it to the bottom left (small screen resolution)
    await this.moveNode(node0, 110, 480);

    // Collapse the top palette (the bottom palette isn't visible otherwise in the videos)
    await t.click(this.collapseTopPalette);

    // Add HelloWorldApp node and move it
    await this.addPaletteNode(1, 2);
    await this.moveNode(node1, 160, 200);

    // Drag out the right panel (needed for small screen)
    await t.drag(this.rightAdjuster, -70, 0);

    // Change the parameter
    await t.typeText(this.changeGreet, greet, { replace: true });

    // Open top palette again
    await t.click(this.collapseTopPalette);

    // Add file node
    await this.addPaletteNode(0, 8);

    // The file node is node2. Select and move it
    await this.selectNode(node2);
    await this.moveNode(node2, 550, 200);

    // Add a port to the node for the HelloWordApp output
    // Hover first to get the button onto the screen
    await t.hover(this.addInputPort);
    await t.click(this.addInputPort);

    // Choose the option "hello"
    await this.selectOption("hello");

    //Connect the nodes
    await this.connectNodes(node1, node2, 0, 0);

    // Disable JSON validation due to a bug
    await t
      .click(this.openSettings)
      .click(this.disableJSONval)
      .click(this.settingsSubmit);
  }
}

export default new Page();
