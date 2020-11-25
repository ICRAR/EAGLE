import { Selector, t } from 'testcafe';

class Node {
  constructor (id, n = 0) {
    this.select = Selector(id + ' image');
    this.resize = Selector(id + ' .resize-control-label');
    //this.select = Selector(id + ' rect:not(.header-background)');
    this.input = Selector(id + ' g.inputPorts circle').nth(n);
    this.output = Selector(id + ' g.outputPorts circle').nth(n);
  }
}

class PaletteNode {
  constructor (n = 0) {
    this.addNode = Selector('#addPaletteNode' + n.toString());
  }
}

class RepoFile {
  constructor (repo, filepath, filename) {
    this.repo = Selector('#' + repo.replace('/','_'));
    this.path = Selector('#folder_' + filepath);
    this.filename = Selector('#id_' + filename.replace('.', '_'))
  }
}

class Page {
  constructor () {
    this.leftHandle = Selector('.leftWindowHandle');
    this.rightHandle = Selector('.rightWindowHandle');

    this.nameInput = Selector('#inputModalInput');
    this.submitButton = Selector('#inputModal .modal-footer button');

    this.nodeMode = Selector('#rightWindowModeNode');
    this.repoMode = Selector('#rightWindowModeRepositories');

    this.deleteNodeButton = Selector('#deleteSelectedNode');
    this.confirmButton = Selector('#confirmModalAffirmativeButton');

    this.parentButton = Selector('#nodeInspectorChangeParent');
    this.selectChoice = Selector('#choiceModalSelect');
    this.submitChoice = Selector('#choiceModal .modal-footer button');

    this.navbarNew = Selector('#navbarDropdown');
    this.newGraph = Selector('#createNewGraph');
    this.navbarGit = Selector('#navbarDropdownGit');
    this.saveGitAs = Selector('#commitToGitAsGraph');

    this.addRepo = Selector('#addRepository');
    this.newRepoName = Selector('#gitCustomRepositoryModalRepositoryNameInput');
    this.newRepoBranch = Selector('#gitCustomRepositoryModalRepositoryBranchInput');
    this.newRepoSubmit = Selector('#gitCustomRepositoryModalAffirmativeAnswer');

    this.setGitToken = Selector('#setGitHubAccessToken');

    this.commitRepo = Selector('#gitCommitModalRepositoryNameSelect');
    this.commitPath = Selector('#gitCommitModalFilePathInput');
    this.commitFile = Selector('#gitCommitModalFileNameInput');
    this.commitMessage = Selector('#gitCommitModalCommitMessageInput');
    this.commitSubmit = Selector('#gitCommitModalAffirmativeButton');
  }

  // For loading either a palette or a graph from a repo
  async loadFileFromRepo (repo, filepath, filename) {
    var newfile = new RepoFile (repo, filepath, filename);
    return newfile;
  }

  async addNewRepo (new_repo, new_branch) {
    await t
      .click(this.addRepo)
      .typeText(this.newRepoName, new_repo, { replace : true })
      .typeText(this.newRepoBranch, new_branch, { replace : true })
      .click(this.newRepoSubmit);
  }

  async submitName (name) {
    await t
      .typeText(this.nameInput, name, { replace : true })
      .click(this.submitButton);
  }

  async selectOption (optionText) {
    await t
      .click(this.selectChoice)
      .click(Selector(this.selectChoice).find('option').withText(optionText))
      .click(this.submitChoice);
  }

  // The speed is reduced a lot for the videos
  // This is also helpful for automated testing since the warning messages
  // need time to go away. They can sometimes obstruct other elements otherwise.
  async connectNodes (outID, inID, n1, n2) {
    var node1 = new Node(outID,n1);
    var node2 = new Node(inID,n2);
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

  async getRect (id) {
    const element = Selector(id);
    const state = await element();
    return state.boundingClientRect;
  }

  async setParent (parentText) {
    await t
      .click(this.nodeMode)
      .click(this.parentButton)
      .click(this.selectChoice)
      .click(Selector(this.selectChoice).find('option').withText(parentText))
      .click(this.submitChoice);
  }

  async createNewGraph (graph_name) {
    await t
      .click(this.navbarNew)
      .click(this.newGraph)
      .typeText(this.nameInput, graph_name)
      .click(this.submitButton);
  }

  async deleteNode (id) {
    var node_toDelete = new Node(id);
    await t
      .click(node_toDelete.select)
      .click(this.nodeMode)
      .click(this.deleteNodeButton)
      .click(this.confirmButton);
  }

  async moveNode (id,x,y) {
    var node_toMove = new Node(id);
    await t
      .click(node_toMove.select)
      .drag(node_toMove.select, x, y);
  }

  async resizeNode (id,x,y) {
    var node_toResize = new Node(id);
    await t
      .drag(node_toResize.resize, x, y, {
          offsetX: 10,
          offsetY: 10
      });
  }

  async selectNode (id) {
    var node_toSelect = new Node(id);
    await t.click(node_toSelect.select);
  }

  async addPaletteNode (n, hover = false) {
    var pal_node = new PaletteNode(n);
    await t.click(pal_node.addNode);
    if (hover) {
      await t.hover(this.leftHandle);
    }
  }
}

export default new Page();
