import { Selector, ClientFunction, Role } from 'testcafe';
import page from './page-model';

/*
    run with:

    export GITHUB_ACCESS_TOKEN="<token>";testcafe chrome tests/helloWorld_testCafe_testing.js -t "Hello World graph" --skip-js-errors
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
var TEST_SPEED = 0.8     //A number between 0.01 (slowest) and 1.0 (fastest)
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


// This test creates a Hello World graph, changes the parameter, and connects it to a File node
// which has a "hello" input port added. Some other UI manipulations have been left in like
// writing a description for the description node, moving nodes around,
// collapsing and opening the top palette.
test('Hello World graph', async t =>{

    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .maximizeWindow()
        .wait(3000)
        .setTestSpeed(TEST_SPEED);

    // create a new graph
    await page.createNewGraph(graph_filename);
    //await t.click(page.centerGraph);

    await page.selectNode('#node0');

    // Add a description to the description node
    await t.typeText(page.descriptionField, "A graph saving the output of a HelloWorldApp to disk");
    // Move it to the bottom left (small screen resolution)
    await page.moveNode('#node0', 110, 480);

    // Collapse the top palette (the bottom palette isn't visible otherwise in the videos)
    await t.click(page.collapseTopPalette);

    // Add HelloWorldApp node and move it
    await page.addPaletteNode(1,2);
    await page.moveNode('#node1', 160,200);

    // Drag out the right panel (needed for small screen)
    await t.drag(page.rightAdjuster, -70, 0);

    // Change the parameter
    await t.typeText(page.changeGreet, 'Felicia', { replace: true});

   // Open top palette again
    await t.click(page.collapseTopPalette);

    // Add file node
    await page.addPaletteNode(0,8);

    // The file node is node2. Select and move it
    await page.selectNode("#node2");
    await page.moveNode('#node2', 550, 200);

    // Add a port to the node for the HelloWordApp output
    // Hover first to get the button onto the screen
    await t.hover(page.addInputPort);
    await t.click(page.addInputPort);

    // Choose the option "hello"
    await page.selectOption("hello");

    //Connect the nodes
    await page.connectNodes("#node1", "#node2", 0, 0);


});

test('Hello World save graph', async t =>{

  await t
      // wait for the page to settle down
      //.resizeWindow(1920, 1080)
      .maximizeWindow()
      .wait(3000)
      .setTestSpeed(TEST_SPEED);


  // Set up a standard HelloWorld graph
  await page.createHelloWorldFile(graph_filename, "#node0", "#node1", "#node2", "Felicia")

  // switch back to the repositories tab
  await t.click(page.repoMode);

  await page.addNewRepo(SAVE_REPOSITORY, SAVE_REPOSITORY_BRANCH);

  // Set the git token
  await t
    .setTestSpeed(TEST_SPEED)
    .click(page.openSettings);

  // The script doesn't try to use the new access token, just the one already set
  await page.changeSetting(page.setGitToken, GITHUB_ACCESS_TOKEN);

  // Save to github menu navigation
  await t
      // save graph to github as...
      .click(page.navbarGit)
      .click(page.saveGitAs);

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

  // Create a standard Hello World graph
  await page.createHelloWorldFile(graph_filename, "#node0", "#node1", "#node2", "Felicia")

  await t.click(page.transMode);

  // Set the translation engine url
  // This script uses http://18.212.69.141:8084/gen_pgt
  await t.click(page.setTransURL);
  await page.submitName(TRANSURL);

  // Select an algorithm
  await t
    .click(page.algorithm0)
    .click(page.alg0Button);

  // Select a file type and translate
  await page.selectOption("OJS");



});
