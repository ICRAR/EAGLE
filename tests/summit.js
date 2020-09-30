import { Selector } from 'testcafe';

/*
    run with:

    export GITHUB_ACCESS_TOKEN="<insert personal access token>";testcafe chrome tests/summit-injest.js
*/

var GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

var PROJECT_NAME = "summit";

var PALETTE_REPOSITORY = "ICRAR/EAGLE-graph-repo";
var PALETTE_PATH = "summit";
var PALETTE_FILENAME = "summit.palette";

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

var graph_filepath = PROJECT_NAME;
var graph_filename = PROJECT_NAME + "-" + datestring;
var graph_commit_message = "Automated " + PROJECT_NAME + " graph (" + graph_filename + ")";

fixture `EAGLE Summit Ingest`
    .page `http://localhost:8888/`

test('Load palette', async t =>{
    await t
        // wait for the page to settle down
        .maximizeWindow()
        .wait(2000)

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
        .drag(Selector('#node0 image'), 100, 0)
        .wait(WAIT_TIME)

        // resize the outer scatter
        .drag(Selector('#node0 .resize-control-label'), 600, 300, {
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
        .drag(Selector('#node1 image'), 125, 75)
        .wait(WAIT_TIME)

        // resize the outer scatter
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
        .drag(Selector('#node2 image'), 150, 150)
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
        .drag(Selector('#node2 image'), 600, 150)
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

        /*
        // add a gather from the palette to the graph
        .click('#addPaletteNode4')
        .wait(WAIT_TIME)

        // move the gather
        .drag(Selector('#node1 rect:not(.header-background)'), 700, 100, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(WAIT_TIME)

        // resize the gather
        .drag(Selector('#node1 .resize-control-label'), 50, 150, {
            offsetX: 10,
            offsetY: 10
        })
        .wait(WAIT_TIME)

        // add a 'application component' from the palette to the graph
        .click('#addPaletteNode2')
        .wait(WAIT_TIME)

        // move the application component
        .drag(Selector('#node3 rect:not(.header-background)'), 200, 150, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(WAIT_TIME)

        // make the 'application component' a child of the scatter
        .click('#nodeInspectorChangeParent')
        .wait(WAIT_TIME)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("ClusterScatterAverager : -2"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("#nodeParentValue").value).eql('-2')

        // debug click the object first
        .click(Selector('#node3 g.outputPorts circle').nth(1), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(WAIT_TIME)

        // join 'Ingest Big Component' and 'Averager' via spead2Stream port
        .drag(
            Selector('#node3 g.outputPorts circle').nth(1),
            320, -50,
            {
                offsetX: 6,
                offsetY: 6
            })
        .wait(WAIT_TIME)

        // select 'memory' data type for spead2 data component
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("memory"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // set data volume 15 on the new memory data component
        .click(Selector('#node4 rect:not(.header-background)'), {
            offsetX: 150,
            offsetY: 40
        })
        .typeText(Selector('#nodeInspectorFieldValue0'), "15", {replace:true})

        // change parent of the 'memory' data component
        .click('#nodeInspectorChangeParent')
        .wait(WAIT_TIME)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("ClusterScatterAverager : -2"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("#nodeParentValue").value).eql('-2')

        // add a 'end' node
        .click('#addPaletteNode1')
        .wait(WAIT_TIME)

        // choose a 'file' type for the end node
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("file"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // move end node
        .drag(Selector('#node5 rect:not(.header-background)'), 700, 300, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(WAIT_TIME)

        // name end node
        .typeText(Selector('#nodeNameValue'), "subMS", {replace:true})

        .click('#nodeInspectorChangeParent')
        .wait(WAIT_TIME)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("Averager : -3"))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // debug click the object first
        .click(Selector('#node1 g.outputPorts circle'), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(WAIT_TIME)

        // join the 'Averager' and the 'subMS' via the event port
        .drag(
            Selector('#node1 g.outputPorts circle'),
            -230, 200,
            {
                offsetX: 6,
                offsetY: 6
            })
        .wait(WAIT_TIME)

        // click on description node
        .click(Selector('#node2 rect:not(.header-background)'), {
            offsetX: 150,
            offsetY: 40
        })
        .wait(WAIT_TIME)

        // set the description label
        .typeText(Selector('#nodeNameValue'), "Summit ingest", {replace:true})

        // save graph to github as...
        .click('#navbarDropdownGitHub')
        .click('#commitToGitHubAsGraph')
        .wait(WAIT_TIME)

        // save graph to the james-strauss-uwa/eagle-test repo
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(PALETTE_REPOSITORY))
        .click('#choiceModal .modal-footer button')
        .wait(WAIT_TIME)

        // enter filepath for save graph as...
        .typeText(Selector('#inputModalInput'), graph_filepath)
        .click('#inputModal .modal-footer button')
        .wait(WAIT_TIME)

        // use default filename for save graph as...
        .click('#inputModal .modal-footer button')
        .wait(WAIT_TIME)

        // enter commit message for save graph as...
        .typeText(Selector('#inputModalInput'), graph_commit_message)
        .click('#inputModal .modal-footer button')
        .wait(WAIT_TIME)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        */

        // end
        .wait(5000);
});
