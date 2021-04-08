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

//var TRANSURL = "http://18.212.69.141:8084/gen_pgt";
var TRANSURL = "http://localhost:8084/gen_pgt";

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
var graph_filename = "Hello_World" + "-" + datestring + ".graph";
var graph_commit_message = "Saving a Hello World graph (" + graph_filename + ")";

fixture `EAGLE Summit Ingest`
    .page `http://localhost:8888/`

test('Hello World graph', async t =>{

    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .maximizeWindow()
        .wait(3000)
        .setTestSpeed(TEST_SPEED*0.7);

    // await t
    //   .click(page.navbarHelp)
    //   .click(page.settings)
    //   .click(page.allowComponentEditing)
    //   .click(page.settingsSubmit);

    await showMessageBox('Creating a Hello World graph'); // This is all you need for a messageBox

    //Note
    var rect = await page.getRect(page.navbarNew);
    await showNoteBox('First, create a new graph using the menu. This allows you to give your graph a name.', rect, 'below', 1.3);

    // create a new graph
    await page.createNewGraph(graph_filename);
    //await t.click(page.centerGraph);

    await page.selectNode('#node0');
    var rect = await page.getRect('#node0');
    await showNoteBox('A new description node is created. You can use this to enter a description of your graph.', rect, 'above', 1.3);
    await t.typeText(page.descriptionField, "A graph saving the output of a HelloWorldApp to disk");
    await page.moveNode('#node0', 110, 480);

    //Note
    var rect = await page.getRect(page.collapseTopPalette);
    await showNoteBox('Collapse the default palette by clicking here', rect, 'right', 1.0);
    await t.click(page.collapseTopPalette);

    //Note
    var rect = await page.getRect('#addPaletteNode2',1);
    await showNoteBox('Hover over the icon on the left hand side of a palette component to find out information about it', rect, 'right', 1.3)

    await page.hoverPaletteNode(1,2,2000);
    await t.hover(page.leftHandle);

    var rect = await page.getRect('#addPaletteNode2',1);
    await showNoteBox('Click the \"+\" to add a new node to the graph', rect, 'right', 1.0)

    await page.addPaletteNode(1,2);

    var rect = await page.getRect('#node1 image');
    await showNoteBox('This is a representation of the HelloWorldApp graph node', rect, 'above', 1.1);

    await page.moveNode('#node1', 160,200);

    var rect = await page.getRect(Selector('#node1 g.outputPorts circle').nth(0));
    await showNoteBox('This is the node\'s output port', rect, 'right', 1.0);

    var rect = await page.getRect(page.rightHandle);
    await showNoteBox('Its properties and parameters are listed here, in the \"Node\" pane', rect, 'left', 1.2);

    var rect = await page.getRect(page.componentParameters);
    await showNoteBox('Adjust the node\'s parameters here', rect, 'left', 1.0);

    await t.drag(page.rightAdjuster, -70, 0);

    var rect = await page.getRect(page.changeGreet);
    await showNoteBox('You can edit this parameter to change the text output for the HelloWorldApp', rect, 'left', 1.2);

    await t.typeText(page.changeGreet, 'Felicia', { replace: true});

    var rect = await page.getRect(page.collapseTopPalette);
    await showNoteBox('Open the top palette again and add a \"File\" node', rect, 'right', 1.0);
    await t.click(page.collapseTopPalette);

    // Add file node
    await page.addPaletteNode(0,8);

    // The file node is node1. Select it.
    await page.selectNode("#node2");

    // Note
    var rect = await page.getRect("#node2 image");
    await showNoteBox('This is a File node, representing a Data Component for saving data to disk', rect, 'above', 1.3);
    await page.moveNode('#node2', 550, 200);

    // Add a port to the node for the HelloWordApp output
    // Hover first to get the button onto the screen
    await t.hover(page.addInputPort);

    //Note
    var rect = await page.getRect(page.addInputPort);
    await showNoteBox('Click here to add an input port to receive the output from the HelloWorldApp', rect, 'above', 1.3);
    await t.click(page.addInputPort);

    // Choose the option "hello"
    await page.selectOption("hello");

    // Note
    var rect = await page.getRect(Selector('#node1 g.outputPorts circle').nth(0));
    await showNoteBox('Now click and drag to connect the output port on the HelloWorld node to the input port on the File node', rect, 'right', 1.5);

    //Connect the nodes
    await page.connectNodes("#node1", "#node2", 0, 0);

    var rect = await page.getRect(Selector('#node2 g.inputPorts circle').nth(0));
    await showNoteBox('This arrow is an \"edge\". It represents an event generated by the first node that causes the second node to execute some commands.', rect, 'above', 2.0);


});

test('Hello World save graph', async t =>{

  await t
      // wait for the page to settle down
      //.resizeWindow(1920, 1080)
      .maximizeWindow()
      .wait(3000)
      .setTestSpeed(TEST_SPEED);

  // Don't capture this
  await showMessageBox('Setting up for video');

  await page.createHelloWorldFile(graph_filename, "#node0", "#node1", "#node2", "Felicia")


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
  await t.click(page.navbarHelp);
  var rect = await page.getRect(page.settings);
  await showNoteBox('You need to enter a GitHub access token in your settings with all \"repo\" permissions for the added repository', rect, 'below', 1.5);


  // Get the current window to switch back to later
  const initialWindow = await t.getCurrentWindow();

  // How to create a token on github
  // First navigate to github and login
  await t
      .setTestSpeed(TEST_SPEED*0.7)
      .setNativeDialogHandler(() => true);
      //.navigateTo('https://github.com')

  const github_window = await t.openWindow('https://github.com');

  const url = await t.eval(() => document.documentURI);
  await t
      .expect(url).eql('https://github.com')
      .maximizeWindow()
      .wait(1000)
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

  // // Wait for a moment, then return to Eagle
  // await t
  //     .wait(500)
  //     .navigateTo('http://localhost:8888/');

  // Switch back to Eagle
  await t.closeWindow(github_window);

  // Set the git token
  await t
    .setTestSpeed(TEST_SPEED)
    .click(page.navbarHelp)
    .click(page.settings);

  // The script doesn't try to use the new access token, just the one already set
  await page.changeSetting(page.setGitToken, GITHUB_ACCESS_TOKEN);

  // Close the left pane as we are not using it
  await t.click(page.leftHandle);

  // //Loading a graph to be saved
  // //I had to do this after getting back from Github, otherwise it was erased
  // var graph = await page.loadFileFromRepo(PALETTE_REPOSITORY, PALETTE_PATH, PALETTE_FILENAME);
  //
  // // Note
  // var rect = await page.getRect(graph.repo);
  // await showNoteBox('Loading an existing graph from GitHub so it can be saved', rect, 'left', 1.0);
  //
  // // Loading the graph
  // await t
  //   .click(graph.repo)
  //   .click('#folder_leap')
  //   .click('#id_LeapDocker_graph')
  //   .click(page.centerGraph);

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

test('Hello World translate', async t =>{

  await t
      // wait for the page to settle down
      //.resizeWindow(1920, 1080)
      .maximizeWindow()
      .wait(3000)
      .setTestSpeed(TEST_SPEED);

  // Don't capture this
  await showMessageBox('Setting up for video');

  await page.createHelloWorldFile(graph_filename, "#node0", "#node1", "#node2", "Felicia")

  // Start the video capture here
  await showMessageBox('Translating a Hello World graph');

  // Note
  var rect = await page.getRect(page.transMode);
  await showNoteBox('Click here to access the different translation algorithms', rect, 'below', 1.0);

  await t.click(page.transMode);

  // Note
  var rect = await page.getRect(page.setTransURL);
  await showNoteBox('The URL for the translator you are using needs to be set here', rect, 'left', 1.3);

  // This script currently uses localhost for the translation, but should work with a different url as well.
  await t.click(page.setTransURL);
  await page.submitName(TRANSURL);

  // Note
  var rect = await page.getRect(page.algorithm0);
  await showNoteBox('Different algorithms will optimise the translated graph in different ways', rect, 'left', 1.0);

  await t
    .click(page.algorithm0)
    .click(page.alg0Button);

  await page.selectOption("OJS");



});
