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
