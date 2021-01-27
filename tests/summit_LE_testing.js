import { Selector, ClientFunction, Role } from 'testcafe';
import page from './page-model';
import github from './github-model';

// This script has everything removed that's just for the videos, to keep the automated testing simple

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
var graph_filename = PROJECT_NAME + "-" + datestring + ".graph";
var graph_commit_message = "Automated " + PROJECT_NAME + " graph (" + graph_filename + ")";

fixture `EAGLE Summit Ingest`
    .page `http://localhost:8888/`

test('Load palette', async t =>{

    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .maximizeWindow()
        .wait(3000);

    // Set the git token
    await t
      .click(page.setGitToken);

    await page.submitName(GITHUB_ACCESS_TOKEN);

    // Not using the loadPalette function from the Page class as I want to add notes in between steps.
    var palette = await page.loadFileFromRepo(PALETTE_REPOSITORY, PALETTE_PATH, PALETTE_FILENAME);

    await t
      .click(palette.repo)
      .click(palette.path)
      .click(palette.filename);

});

test('Graph creation', async t =>{

    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .maximizeWindow()
        .wait(3000);

    // Loading a palette needs to be repeated to be ready to create the graph.
    // Doing this at maximum speed because it's not intended to be captured
    await t.click(page.setGitToken);

    // enter the github access token
    await page.submitName(GITHUB_ACCESS_TOKEN);

    // load palette
    var palette = await page.loadFileFromRepo(PALETTE_REPOSITORY, PALETTE_PATH, PALETTE_FILENAME);
    await t
      .click(palette.repo)
      .click(palette.path)
      .click(palette.filename);

    // PART 2 - create graph

        // Use the assertion to check if the actual header text is equal to the expected one
        //.expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

    // create a new graph
    await page.createNewGraph(graph_filename);

    // Delete the description node
    await page.deleteNode('#node0');

    // add the outer scatter from the palette to the graph
    await page.addPaletteNode(0,true);

    // move and resize the outer scatter
    await page.moveNode('#node0', 20, 0);
    await page.resizeNode('#node0', 370, 200);

    // add the inner scatter
    await page.addPaletteNode(1,true);

    // move and resize the inner scatter
    await page.moveNode('#node1', 40, 75);
    await page.resizeNode('#node1', 120, 110);

    // set parent of inner scatter
    await page.setParent("ClusterScatterAverager : -1");

    // add the inner Python App
    await page.addPaletteNode(2,false);

    // set parent of inner Python App
    await page.setParent("NodeScatterAverager : -2");

    // move the inner Python App
    await page.moveNode('#node2', 60, 150);

    // add the outer Python App
    await page.addPaletteNode(3,false);

    // set parent of outer Python App
    await page.setParent("ClusterScatterAverager : -1");

    // move the outer Python App (NOTE: this is now node 2!)
    await page.moveNode('#node2', 370, 150);

    // draw edge from inner Python App to outer Python App
    // The number refers to which numbered port is being connected
    await page.connectNodes('#node3','#node2',1,1);

    // The option chosen for the spead2 data component is Memory
    await page.selectOption("Memory");

    // add the gather
    await page.addPaletteNode(4, false);

    // move the gather (NOTE: this is now node 1!)
    await page.moveNode('#node1', 640, 100);

    // draw edge from outer Python App to gather
    // The number refers to which numbered port is being connected
    await page.connectNodes('#node3','#node1',1,1);

    // The option chosen for the spead2 data component is Memory
    await page.selectOption("Memory");

    // add the end node
    // NOTE: we don't hover the mouse elsewhere after this click, because the click handler opens a modal, and the usual hover target will be hidden
    await page.addPaletteNode(5, false);

    // select type of end node
    await page.selectOption("File");

    // move the end node (NOTE: this is now node 2!)
    await page.moveNode('#node2', 640, 350);

    // An extra pause is needed because of warning messages blocking the next connection
    await t.wait(1000);

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
        .wait(3000);

    // switch back to the repositories tab
    await t.click(page.repoMode);


    // Not using the function in the page model for this because I needed to add a note
    //await page.addNewRepo(SAVE_REPOSITORY, SAVE_REPOSITORY_BRANCH);
    await t
      .click(page.addRepo)
      .typeText(page.newRepoName, SAVE_REPOSITORY, { replace : true });

    // Complete adding the repo
    await t
      .typeText(page.newRepoBranch, SAVE_REPOSITORY_BRANCH, { replace : true })
      .click(page.newRepoSubmit);

    // Set the git token
    await t.click(page.setGitToken);

    // The script doesn't try to use the new access token, just the one already set
    await page.submitName(GITHUB_ACCESS_TOKEN);

    //Loading a graph to be saved
    //I had to do this after getting back from Github, otherwise it was erased
    var graph = await page.loadFileFromRepo(PALETTE_REPOSITORY, PALETTE_PATH, PALETTE_FILENAME);

    // Loading the graph
    await t
      .click(graph.repo)
      .click(graph.path)
      .click('#id_test_stats_graph');

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
