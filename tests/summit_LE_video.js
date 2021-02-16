import { Selector, ClientFunction, Role } from 'testcafe';
import page from './page-model';
import github from './github-model';

// For logging into GitHub

const gitHubUser = Role('https://github.com/login', async t => {
    await t
        .typeText('#login_field', 'icrar.testing@gmail.com')
        .typeText('#password', '%8\\G`+Lo<')
        .click('.btn.btn-primary.btn-block');
});

// Creating the message box - this is used for large, bold messages centred at the top
// of the screen.

const showMessageBox = ClientFunction(message => {
    return new Promise(resolve => {
        var msgBox = document.createElement('div');
        msgBox.textContent = message;
        msgBox.style['top'] = '10%';
        msgBox.style['left'] = '50%';
        msgBox.style['transform'] = 'translate(-50%, -50%)';
        msgBox.style['position'] = 'absolute';
        msgBox.style['font-size'] = 'x-large';
        msgBox.style['box-shadow'] = '10px 10px 30px #555';
        msgBox.style['padding'] = '16px';
        msgBox.style['border'] = '3px solid black';
        msgBox.style['border-radius'] = '.25rem';
        msgBox.style['background-color'] = 'white';
        msgBox.style['z-index'] = '999999';
        document.body.appendChild(msgBox);
        setTimeout(() => {
            document.body.removeChild(msgBox);
            resolve();
        }, 3000);
    });
});

// These are used for smaller annotations on a yellow background that point to elements
// on the screen. They need to know the element's bounding rectangle, whether to sit to the
// right, left, above or below, and how long to stay on screen (a number to multiply
// the timeout by).

const showNoteBox = ClientFunction((message, rect, direction, timeout_multiplier) => {
    var box_trans;
    var box_offset;
    var top;
    var left;
    var arrowBorderTop;
    var arrowBorderBottom;
    var arrowBorderLeft;
    var arrowBorderRight;
    var arrowTop;
    var arrowLeft;
    var arrow_trans;
    var box_top = rect.top;
    var box_bottom = rect.bottom;
    var box_left = rect.left;
    var box_right = rect.right;
    var timeout_time = 2500 * timeout_multiplier;

    switch (direction) {
      case 'left':
        top = box_top + 0.5*(box_bottom - box_top);
        left = box_left
        box_trans = '-100%,-50%';
        box_offset = '-10px,0';
        arrowBorderTop = '5px solid transparent';
        arrowBorderBottom = '5px solid transparent';
        arrowBorderLeft = '10px solid #f8e5b4';
        arrowBorderRight = '0';
        arrowTop = '50%';
        arrowLeft = '100%';
        arrow_trans = '0%, -50%';
        break;
      case 'right':
        top = box_top + 0.5*(box_bottom - box_top);
        left = box_right;
        box_trans = '0%,-50%';
        box_offset = '10px,0';
        arrowBorderTop = '5px solid transparent';
        arrowBorderBottom = '5px solid transparent';
        arrowBorderLeft = '0';
        arrowBorderRight = '10px solid #f8e5b4';
        arrowTop = '50%';
        arrowLeft = '0%';
        arrow_trans = '-100%,-50%';
        break;
      case 'above':
        top = box_top;
        left = box_left + 0.5*(box_right - box_left);
        box_trans = '-50%,-100%';
        box_offset = '0,-10px';
        arrowBorderTop = '10px solid #f8e5b4';
        arrowBorderBottom = '0';
        arrowBorderLeft = '5px solid transparent';
        arrowBorderRight = '5px solid transparent';
        arrowTop = '100%';
        arrowLeft = '50%';
        arrow_trans = '-50%,0%';
        break;
      case 'below':
        top = box_bottom;
        left = box_left + 0.5*(box_right - box_left);
        box_trans = '-50%,0%';
        box_offset = '0,10px';
        arrowBorderTop = '0';
        arrowBorderBottom = '10px solid #f8e5b4';
        arrowBorderLeft = '5px solid transparent';
        arrowBorderRight = '5px solid transparent';
        arrowTop = '0%';
        arrowLeft = '50%';
        arrow_trans = '-50%,-100%';
        break;
    }
    return new Promise(resolve => {
        var noteBox = document.createElement('div');
        noteBox.textContent = message;
        noteBox.style['transform-box'] = 'border-box';
        noteBox.style['top'] = top + 'px';
        noteBox.style['left'] = left + 'px';
        noteBox.style['max-width'] = '300px';
        noteBox.style['min-width'] = '300px';
        noteBox.style['transform'] = 'translate('+ box_trans + ') translate(' + box_offset + ')';
        noteBox.style['position'] = 'absolute';
        noteBox.style['font-size'] = 'medium';
        noteBox.style['box-shadow'] = '10px 10px 30px #555';
        noteBox.style['padding'] = '16px';
        //noteBox.style['border'] = '3px solid black';
        noteBox.style['border-radius'] = '.25rem';
        noteBox.style['background-color'] = '#f8e5b4';
        noteBox.style['z-index'] = '999999';

        var arrow = document.createElement('div')
        arrow.style['width'] = '0';
        arrow.style['height'] = '0';
        arrow.style['border-top'] = arrowBorderTop;
        arrow.style['border-bottom'] = arrowBorderBottom;
        arrow.style['border-left'] = arrowBorderLeft;
        arrow.style['border-right'] = arrowBorderRight;
        arrow.style['position'] = 'absolute';
        arrow.style['top'] = arrowTop;
        arrow.style['left'] = arrowLeft;
        arrow.style['transform'] = 'translate('+ arrow_trans + ')';

        noteBox.appendChild(arrow);
        document.body.appendChild(noteBox);
        setTimeout(() => {
            document.body.removeChild(noteBox);
            resolve();
        }, timeout_time);
    });
});

/*
    run with:

    export GITHUB_ACCESS_TOKEN="<token>";testcafe -s "/Users/james/testcafe/" --video "/Users/james/testcafe/videos/" "chrome '--window-size=1920,1208'" tests/summit.js
*/

var GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

var PROJECT_NAME = "summit";

var PALETTE_REPOSITORY = "ICRAR/EAGLE-graph-repo";
var PALETTE_PATH = "summit";
var PALETTE_FILENAME = "summit.palette";

var TESTING_REPOSITORY = "ICRAR/EAGLE_test_repo";
var TESTING_PATH = "automated_testing";
var TESTING_REPOSITORY_BRANCH = "master";

var SAVE_REPOSITORY = "eagle-testcafe/Saved-Graphs";
var SAVE_PATH = "testcafe";
var SAVE_REPOSITORY_BRANCH = "main";

var TRANSURL = "http://18.212.69.141:8084/gen_pgt";

var CHOICE_MODAL_CUSTOM = "Custom (enter below)";
var SPEAD2_STREAM = "spead2Stream";
var SUB_MS = "subMS";
var CONF = "conf";
var SUCCESS_MESSAGE = "Success:";
var TEST_SPEED = 0.7     //A number between 0.01 (slowest) and 1.0 (fastest)
//var WAIT_TIME = 500;

// prepare to save palette as...
var d = new Date();
var datestring =
    d.getFullYear() +
    ("0" + (d.getMonth()+1)).slice(-2) +
    ("0" + d.getDate()).slice(-2) +
     "-" +
    ("0" + d.getHours()).slice(-2) +
    ("0" + d.getMinutes()).slice(-2) +
    ("0" + d.getSeconds()).slice(-2);

var graph_filepath = SAVE_PATH;     //+ "/" + PROJECT_NAME;
var graph_filename = "Saved_Graph" + "-" + datestring + ".graph";
var graph_commit_message = "Saving a graph demo (" + graph_filename + ")";

fixture `EAGLE Summit Ingest`
    .page `http://localhost:8888/`

test('Load palette', async t =>{

    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .maximizeWindow()
        .wait(3000)
        .setTestSpeed(TEST_SPEED*0.7);

    await showMessageBox('Loading a palette from GitHub'); // This is all you need for a messageBox

    // enter the github access token
    var rect = await page.getRect(page.openSettings);
    await showNoteBox('To access the repositories, create a GitHub access token with the correct permissions and enter it in Settings', rect, 'below', 1.5);

    // How to create a token on github
    // First navigate to github and login
    await t
        .setNativeDialogHandler(() => true)
        .navigateTo('https://github.com')
        .useRole(gitHubUser);

    // Using the github page model to complete the following steps
    var rect = await page.getRect(github.accountIcon);
    await showNoteBox('Go to your GitHub account settings, then choose Developer settings', rect, 'left', 1.3);

    await github.developerSettings();

    var rect = await page.getRect(github.accountTokens);
    await showNoteBox('Click on Personal access tokens, then generate a new token', rect, 'right', 1.3);

    await github.generateNewToken();

    var rect = await page.getRect(github.tokenDescription);
    await showNoteBox('Enter a description and the following permissions', rect, 'above', 1.3);

    await github.setTokenScope("Eagle access token");

    var rect = await page.getRect(github.copyToken);
    await showNoteBox('Copy the token here and return to Eagle', rect, 'above', 1.2);

    // Wait for a moment, then return to Eagle
    await t
        .wait(500)
        .navigateTo('http://localhost:8888/');

    // Set the git token
    await t
      .setTestSpeed(TEST_SPEED)
      .click(page.openSettings);


    // The script doesn't try to use the new access token, just the one already set
    //await page.submitName(GITHUB_ACCESS_TOKEN);
    await page.changeSetting(page.setGitToken, GITHUB_ACCESS_TOKEN);

    //Note
    var rect = await page.getRect(page.collapseTopPalette);
    await showNoteBox('Collapse the default palette by clicking here', rect, 'right', 1.0);
    await t.click(page.collapseTopPalette);

    // Not using the loadPalette function from the Page class as I want to add notes in between steps.
    var palette = await page.loadFileFromRepo(PALETTE_REPOSITORY, PALETTE_PATH, PALETTE_FILENAME);

    var rect = await page.getRect(palette.repo);
    await showNoteBox('Click the repository containing the new palette', rect, 'left', 1.0);
    await t.click(palette.repo);

    await t.click(palette.path);

    var rect = await page.getRect(palette.filename);
    await showNoteBox('Click the palette filename ending in .palette', rect, 'below', 1.3);
    await t
      .click(palette.filename)

      //Need to wait for the palette to fully slide out before creating a note
      .wait(1000);

    var rect = await page.getRect('#palette1');
    await showNoteBox('The list of components in the new palette are accessed here', rect, 'right', 1.2);

});

test('Graph creation', async t =>{

    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .maximizeWindow()
        .wait(3000)
        .setTestSpeed(1);

    await showMessageBox('Setting up (not for capture)');

    // Loading a palette needs to be repeated to be ready to create the graph.
    // Doing this at maximum speed because it's not intended to be captured
    await t
      .click(page.openSettings)
      .click(page.allowComponentEditing);

    // enter the github access token
    //await page.submitName(GITHUB_ACCESS_TOKEN);
    await page.changeSetting(page.setGitToken, GITHUB_ACCESS_TOKEN);

    // The buttons to add palette nodes don't have unique identities. This script only works if I close the "All Nodes" palette
    // and then the Built-in Palette.
    await t
      .click(page.closeTopPalette)
      .click(page.closeTopPalette);

    // load palette
    var palette = await page.loadFileFromRepo(PALETTE_REPOSITORY, PALETTE_PATH, PALETTE_FILENAME);
    await t
      .click(palette.repo)
      .click(palette.path)
      .click(palette.filename);

    //Switch to the speed used for the video capture
    await t.setTestSpeed(TEST_SPEED);

    // Message
    await showMessageBox('Creating a graph');

    // PART 2 - create graph

        // Use the assertion to check if the actual header text is equal to the expected one
        //.expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

    // create a new graph
    await page.createNewGraph(graph_filename);
    //await t.click(page.centerGraph);

    // Delete the description node
    await page.deleteNode('#node0');

    // For a noteBox, you need to select the element you want to point to, then get
    // its bounding rectangle first.
    var rect = await page.getRect('#addPaletteNode0');
    await showNoteBox('Adding a scatter component to distribute processing across the cluster', rect, 'right', 1.0);

    // add the outer scatter from the palette to the graph
    await page.addPaletteNode(0,0,false);
    //await t.click(page.centerGraph);

    // move and resize the outer scatter
    await page.moveNode('#node0',110, 100);
    await page.resizeNode('#node0', 370, 200);

    // Note
    var rect = await page.getRect('#addPaletteNode1');
    await showNoteBox('Adding a scatter component to distribute processing across the 6 GPUs on each node in the cluster', rect, 'right', 1.5);

    // add the inner scatter
    await page.addPaletteNode(0,1,false);

    // move and resize the inner scatter
    await page.moveNode('#node1', 120, 170);
    await page.resizeNode('#node1', 120, 110);

    // Note
    var rect = await page.getRect('#node-parent');
    await showNoteBox('Making the inner scatter a child of the outer scatter', rect, 'left', 1.0);

    // set parent of inner scatter
    await page.setParent("ClusterScatterAverager : -1");

    // add the inner Python App
    await page.addPaletteNode(0,2,false);

    // The new node is now node1 due to the draw order
    await page.selectNode('#node1');

    // set parent of inner Python App
    await page.setParent("NodeScatterAverager : -3");

    // move the inner Python App. It is now node2
    await page.moveNode('#node2', 130, 240);

    // Note
    var rect = await page.getRect('#node2');
    await showNoteBox('Each GPU generates simulated SKA data using an OSKAR2 instance', rect, 'left', 1.2);

    // add the outer Python App
    await page.addPaletteNode(0,3,false);

    // Now this node is node1
    await page.selectNode('#node1');

    // set parent of outer Python App
    await page.setParent("ClusterScatterAverager : -1");

    // move the outer Python App (NOTE: this is now node 2!)
    await page.moveNode('#node2', 470, 240);

    // Note
    var rect = await page.getRect('#node2');
    await showNoteBox('Data from each GPU is averaged', rect, 'right', 1.0);

    // draw edge from inner Python App to outer Python App
    // The number refers to which numbered port is being connected
    await page.connectNodes('#node3','#node2',1,1);

    // Note
    var rect = await page.getRect(page.selectChoice);
    await showNoteBox('Memory components are used to avoid moving the data wherever possible', rect, 'above', 1.5);

    // The option chosen for the spead2 data component is Memory
    await page.selectOption("Memory");

    // add the gather
    await page.addPaletteNode(0,4, false);

    // move the gather (NOTE: this is now node 1!)
    await page.moveNode('#node1', 720, 240);

    // Note
    var rect = await page.getRect('#node1');
    await showNoteBox('Data from each node in the cluster is averaged', rect, 'left', 1.0);

    // draw edge from outer Python App to gather
    // The number refers to which numbered port is being connected
    await page.connectNodes('#node3','#node1',1,1);

    // The option chosen for the spead2 data component is Memory
    await page.selectOption("Memory");

    // add the end node
    // NOTE: we don't hover the mouse elsewhere after this click, because the click handler opens a modal, and the usual hover target will be hidden
    await page.addPaletteNode(0,5, false);

    // select type of end node
    await page.selectOption("File");

    // move the end node (NOTE: this is now node 2!)
    await page.moveNode('#node2', 720, 470);

    // Note
    var rect = await page.getRect('#node2');
    await showNoteBox('The results are stored in a file', rect, 'left', 1.0);

    // Add the input port needed to the file node
    // Hover first to get the button onto the screen
    await t.hover(page.addInputPort);

    var rect = await page.getRect(page.addInputPort);
    await showNoteBox('Click here to add an input port to receive the output from the node', rect, 'above', 1.3);
    await t.click(page.addInputPort);

    // Choose the option "hello"
    await page.selectOption("event");

    // draw edge from outer Python App to gather
    // The number refers to which numbered port is being connected
    await page.connectNodes('#node1','#node2',0,0);

    // click on the outer scatter to finish up
    await page.selectNode('#node0');

});

test('Saving a graph', async t =>{

    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .maximizeWindow()
        .wait(3000)
        .setTestSpeed(TEST_SPEED);

    // Start the video capture here
    await showMessageBox('Saving a graph to a Git repository');

    // Note
    var rect = await page.getRect(page.repoMode);
    await showNoteBox('Click here to open the repositories', rect, 'below', 1.0);

    // switch back to the repositories tab
    await t.click(page.repoMode);

    // Note
    var rect = await page.getRect(page.addRepo);
    await showNoteBox('You can add a new repository that you have write access to', rect, 'left', 1.0);

    // Not using the function in the page model for this because I needed to add a note
    //await page.addNewRepo(SAVE_REPOSITORY, SAVE_REPOSITORY_BRANCH);
    await t
      .click(page.addRepo)
      .typeText(page.newRepoName, SAVE_REPOSITORY, { replace : true });

    // Note
    var rect = await page.getRect(page.newRepoBranch);
    await showNoteBox('The branch might be \"master\" or \"main\" depending on when you created it', rect, 'left', 1.3);

    // Complete adding the repo
    await t
      .typeText(page.newRepoBranch, SAVE_REPOSITORY_BRANCH, { replace : true })
      .click(page.newRepoSubmit);

    // Note
    var rect = await page.getRect(page.openSettings);
    await showNoteBox('You need to enter a GitHub access token in your settings with all \"repo\" permissions for the added repository', rect, 'below', 1.5);

    // How to create a token on github
    // First navigate to github and login
    await t
        .setTestSpeed(TEST_SPEED*0.7)
        .setNativeDialogHandler(() => true)
        .navigateTo('https://github.com')
        .useRole(gitHubUser);

    // Using the github page model to complete the following steps
    var rect = await page.getRect(github.accountIcon);
    await showNoteBox('Go to your Settings, then choose Developer settings', rect, 'left', 1.3);

    // Navigate to developer settings
    await github.developerSettings();

    // Note
    var rect = await page.getRect(github.accountTokens);
    await showNoteBox('Click on Personal access tokens, then generate a new token', rect, 'right', 1.3);

    // Generating a new token
    await github.generateNewToken();

    // Note
    var rect = await page.getRect(github.tokenDescription);
    await showNoteBox('Enter a description and the following permissions', rect, 'above', 1.3);

    // Enter scope and submit
    await github.setTokenScope("Eagle access token");

    // Note
    var rect = await page.getRect(github.copyToken);
    await showNoteBox('Copy the token here and return to Eagle', rect, 'above', 1.2);

    // Wait for a moment, then return to Eagle
    await t
        .wait(500)
        .navigateTo('http://localhost:8888/');

    // Set the git token
    await t
      .setTestSpeed(TEST_SPEED)
      .click(page.openSettings);

    // The script doesn't try to use the new access token, just the one already set
    await page.changeSetting(page.setGitToken, GITHUB_ACCESS_TOKEN);

    // Close the left pane as we are not using it
    await t.click(page.leftHandle);

    //Loading a graph to be saved
    //I had to do this after getting back from Github, otherwise it was erased
    var graph = await page.loadFileFromRepo(PALETTE_REPOSITORY, PALETTE_PATH, PALETTE_FILENAME);

    // Note
    var rect = await page.getRect(graph.repo);
    await showNoteBox('Loading an existing graph from GitHub so it can be saved', rect, 'left', 1.0);

    // Loading the graph
    await t
      .click(graph.repo)
      .click('#folder_leap')
      .click('#id_LeapDocker_graph')
      .click(page.centerGraph);

    // Note
    var rect = await page.getRect(page.navbarGit);
    await showNoteBox('Click here to save the graph to GitHub', rect, 'below', 1.0);

    // Save to github menu navigation
    await t
        // save graph to github as...
        .click(page.navbarGit)
        .click(page.saveGitAs);

    // Note
    var rect = await page.getRect(page.commitRepo);
    await showNoteBox('Fill in all the details for the repository you added', rect, 'above', 1.2);

    // Saving the graph
    await t
        .click(page.commitRepo)
        .click(page.commitRepo.find('option').withText(SAVE_REPOSITORY + " (" + SAVE_REPOSITORY_BRANCH + ")"))

        // Enter the path
        .typeText(page.commitPath, graph_filepath, { replace : true })

        // use default filename for save graph as...
        .typeText(page.commitFile, graph_filename, { replace: true })

        // enter commit message for save graph as...
        .typeText(page.commitMessage, graph_commit_message, { replace: true })

        // commit
        .click(page.commitSubmit)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // end
        .wait(10000);
        //.takeScreenshot();
});

test('Translating a graph', async t =>{

  await t
      // wait for the page to settle down
      //.resizeWindow(1920, 1080)
      .maximizeWindow()
      .wait(3000)
      .setTestSpeed(TEST_SPEED);

  // Start the video capture here
  await showMessageBox('Translating a graph');

  // Set the git token
  await t.click(page.setGitToken);
  await page.submitName(GITHUB_ACCESS_TOKEN);

  //Loading a graph to be translated
  var graph = await page.loadFileFromRepo(PALETTE_REPOSITORY, PALETTE_PATH, PALETTE_FILENAME);

  // Note
  var rect = await page.getRect(graph.repo);
  await showNoteBox('Loading an existing graph from GitHub so it can be translated', rect, 'left', 1.0);

  // Loading the graph
  await t
    .click(graph.repo)
    .click('#folder_leap')
    .click('#id_LeapDocker_graph');

  // Note
  var rect = await page.getRect(page.transMode);
  await showNoteBox('Click here to access the different translation algorithms', rect, 'below', 1.0);

  await t.click(page.transMode);

  // Note
  var rect = await page.getRect(page.setTransURL);
  await showNoteBox('The URL for the translator you are using needs to be set here', rect, 'left', 1.3);

  await t.click(page.setTransURL);
  await page.submitName(TRANSURL);

  // Note
  var rect = await page.getRect(page.algorithm0);
  await showNoteBox('Algorith0 is the simplest algorithm (add more about this)', rect, 'left', 1.0);

  await t
    .click(page.algorithm0)
    .click(page.alg0Button);



});
