import { Selector } from 'testcafe';

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

var CHOICE_MODAL_CUSTOM = "Custom (enter below)";
var SPEAD2_STREAM = "spead2Stream";
var SUB_MS = "subMS";
var CONF = "conf";
var SUCCESS_MESSAGE = "Success:";
var WAIT_TIME = 250;

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

var graph_filepath = TESTING_PATH + "/" + PROJECT_NAME;
var graph_filename = PROJECT_NAME + "-" + datestring + ".graph";
var graph_commit_message = "Automated " + PROJECT_NAME + " graph (" + graph_filename + ")";

fixture `EAGLE Summit Ingest`
    .page `http://localhost:8888/`

test('Load palette', async t =>{
    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .wait(3000)

        // enter the github access token
        .click('#setGitHubAccessToken')
        .typeText(Selector('#inputModalInput'), GITHUB_ACCESS_TOKEN)
        .click('#inputModal .modal-footer button')
        .wait(WAIT_TIME)

        // PART 1 - load palette
        .click('#' + PALETTE_REPOSITORY.replace('/','_'))
        .wait(WAIT_TIME)
        .click('#folder_' + PALETTE_PATH)
        .wait(WAIT_TIME)
        .click('#id_' + PALETTE_FILENAME.replace('.', '_'))
        .wait(WAIT_TIME)

        // PART 2 - create graph

        // Use the assertion to check if the actual header text is equal to the expected one
        //.expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // create a new graph
        .click('#navbarDropdown')
        .click('#createNewGraph')
        .wait(WAIT_TIME)

        // enter the name of the new graph
        .typeText(Selector('#inputModalInput'), graph_filename)
        .click('#inputModal .modal-footer button')
        .wait(WAIT_TIME)

        // select the description node
        .click('#node0 rect:not(.header-background)')
        .wait(WAIT_TIME)

        // click the node tab in right window
        .click('#rightWindowModeNode')
        .wait(WAIT_TIME)

        // click the delete node button
        .click('#deleteSelectedNode')
        .wait(WAIT_TIME)

        // click Yes in the "are you sure you wish to delete" modal
        .click('#confirmModalAffirmativeButton')
        .wait(WAIT_TIME)

        // add the outer scatter from the palette to the graph
        .click('#addPaletteNode0')
        .hover('.leftWindowHandle')
        .wait(WAIT_TIME)

        // move the outer scatter
        .drag(Selector('#node0 image'), 20, 0)
        .wait(WAIT_TIME)

        // resize the outer scatter
        .drag(Selector('#node0 .resize-control-label'), 650, 300, {
            offsetX: 10,
            offsetY: 10
        })
        .wait(WAIT_TIME)

        // add the inner scatter
        .click('#addPaletteNode1')
        .hover('.leftWindowHandle')
        .wait(WAIT_TIME)

        // move the inner scatter
        .click('#node1 image')
        .drag(Selector('#node1 image'), 40, 75)
        .wait(WAIT_TIME)

        // resize the inner scatter
        .drag(Selector('#node1 .resize-control-label'), 250, 200, {
            offsetX: 10,
            offsetY: 10
        })
        .wait(WAIT_TIME)

        // click the node tab in right window
        .click('#rightWindowModeNode')
        .wait(WAIT_TIME)

        // set parent of inner scatter
        .click('#nodeInspectorChangeParent')
        .wait(WAIT_TIME)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("ClusterScatterAverager : -1"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // add the inner Python App
        .click('#addPaletteNode2')
        .hover('.leftWindowHandle')
        .wait(WAIT_TIME)

        // click the node tab in right window
        .click('#rightWindowModeNode')
        .wait(WAIT_TIME)

        // set parent of inner Python App
        .click('#nodeInspectorChangeParent')
        .wait(WAIT_TIME)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("NodeScatterAverager : -2"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // move the inner Python App
        .click('#node2 image')
        .drag(Selector('#node2 image'), 60, 150)
        .wait(WAIT_TIME)

        // add the outer Python App
        .click('#addPaletteNode3')
        .hover('.leftWindowHandle')
        .wait(WAIT_TIME)

        // click the node tab in right window
        .click('#rightWindowModeNode')
        .wait(WAIT_TIME)

        // set parent of outer Python App
        .click('#nodeInspectorChangeParent')
        .wait(WAIT_TIME)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("ClusterScatterAverager : -1"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // move the outer Python App (NOTE: this is now node 2!)
        .click('#node2 image')
        .drag(Selector('#node2 image'), 500, 150)
        .wait(WAIT_TIME)

        // debug click the object first
        .click(Selector('#node3 g.outputPorts circle').nth(1), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(WAIT_TIME)

        // draw edge from inner Python App to outer Python App
        .dragToElement(
            Selector('#node3 g.outputPorts circle').nth(1),
            Selector('#node2 g.inputPorts circle').nth(1),
            {
                offsetX: 6,
                offsetY: 6
            })
        .wait(WAIT_TIME)

        // select 'memory' data type for spead2 data component
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("Memory"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // add the gather
        .click('#addPaletteNode4')
        .hover('.leftWindowHandle')
        .wait(WAIT_TIME)

        // move the gather (NOTE: this is now node 1!)
        .click('#node1 image')
        .drag(Selector('#node1 image'), 900, 150)
        .wait(WAIT_TIME)

        // debug click the object first
        .click(Selector('#node3 g.outputPorts circle').nth(1), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(WAIT_TIME)

        // draw edge from outer Python App to gather
        .dragToElement(
            Selector('#node3 g.outputPorts circle').nth(1),
            Selector('#node1 g.inputPorts circle').nth(1),
            {
                offsetX: 6,
                offsetY: 6
            })
        .wait(WAIT_TIME)

        // select 'memory' data type for spead2 data component
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("Memory"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // add the end node
        // NOTE: we don't hover the mouse elsewhere after this click, because the click handler opens a modal, and the usual hover target will be hidden
        .click('#addPaletteNode5')
        .wait(WAIT_TIME)

        // select type of end node
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("File"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // move the end node (NOTE: this is now node 2!)
        .click('#node2 image')
        .drag(Selector('#node2 image'), 1125, 150)
        .wait(WAIT_TIME)

        // debug click the object first
        .click(Selector('#node1 g.outputPorts circle').nth(0), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(WAIT_TIME)

        // draw edge from outer Python App to gather
        .dragToElement(
            Selector('#node1 g.outputPorts circle').nth(0),
            Selector('#node2 g.inputPorts circle').nth(0),
            {
                offsetX: 6,
                offsetY: 6
            })
        .wait(WAIT_TIME)

        // click on the outer scatter to finish up
        .click('#node0 image')

        // switch back to the repositories tab
        .click('#rightWindowModeRepositories')
        .wait(WAIT_TIME)

        // save graph to github as...
        .click('#navbarDropdownGit')
        .click('#commitToGitAsGraph')
        .wait(WAIT_TIME)

        // save graph to the james-strauss-uwa/eagle-test repo
        .click('#gitCommitModalRepositoryNameSelect')
        .click(Selector('#gitCommitModalRepositoryNameSelect').find('option').withText(TESTING_REPOSITORY + " (" + TESTING_REPOSITORY_BRANCH + ")"))
        .wait(WAIT_TIME)

        // enter filepath for save graph as...
        .typeText(Selector('#gitCommitModalFilePathInput'), graph_filepath, { replace: true })
        .wait(WAIT_TIME)

        // use default filename for save graph as...
        .typeText(Selector('#gitCommitModalFileNameInput'), graph_filename, { replace: true })
        .wait(WAIT_TIME)

        // enter commit message for save graph as...
        .typeText(Selector('#gitCommitModalCommitMessageInput'), graph_commit_message, { replace: true })
        .wait(WAIT_TIME)

        // commit
        .click('#gitCommitModalAffirmativeButton')
        .wait(WAIT_TIME)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // end
        .wait(10000);
        //.takeScreenshot();
});
