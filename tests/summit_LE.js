import { Selector, ClientFunction } from 'testcafe';


// Creating the message box
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
        msgBox.style['z-index'] = '1000';
        document.body.appendChild(msgBox);
        setTimeout(() => {
            document.body.removeChild(msgBox);
            resolve();
        }, 2000);
    });
});

const showNoteBox = ClientFunction((message, rect, direction) => {
    var box_trans1;
    var box_trans2;
    var top;
    var left;
    var box_top = rect.top;
    var box_bottom = rect.bottom;
    var box_left = rect.left;
    var box_right = rect.right;

    switch (direction) {
      case 'left':
        top = box_top
        left = box_left
        box_trans1 = '-100%';
        box_trans2 = '0%';
        break;
      case 'right':
        top = box_top;
        left = box_right;
        box_trans1 = '0%';
        box_trans2 = '0%';
        break;
      case 'above':
        top = box_top;
        left = box_left;
        box_trans1 = '0%';
        box_trans2 = '-100%';
        break;
      case 'below':
        top = box_bottom;
        left = box_left;
        box_trans1 = '0%';
        box_trans2 = '0%';
        break;
    }
    return new Promise(resolve => {
        var noteBox = document.createElement('div');
        noteBox.textContent = message;
        noteBox.style['top'] = top + 'px';
        noteBox.style['left'] = left + 'px';
        noteBox.style['max-width'] = '200px'
        noteBox.style['transform'] = 'translate('+ box_trans1 + ',' + box_trans2 + ')';
        noteBox.style['position'] = 'absolute';
        noteBox.style['font-size'] = 'medium';
        noteBox.style['box-shadow'] = '10px 10px 30px #555';
        noteBox.style['padding'] = '16px';
        //noteBox.style['border'] = '3px solid black';
        noteBox.style['border-radius'] = '.25rem';
        noteBox.style['background-color'] = '#f8e5b4';
        noteBox.style['z-index'] = '1000';
        document.body.appendChild(noteBox);
        setTimeout(() => {
            document.body.removeChild(noteBox);
            resolve();
        }, 2000);
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

var graph_filepath = TESTING_PATH + "/" + PROJECT_NAME;
var graph_filename = PROJECT_NAME + "-" + datestring + ".graph";
var graph_commit_message = "Automated " + PROJECT_NAME + " graph (" + graph_filename + ")";

fixture `EAGLE Summit Ingest`
    .page `http://localhost:8888/`

test('Load palette', async t =>{

    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .maximizeWindow()
        .wait(3000)
        .setTestSpeed(TEST_SPEED);

    await showMessageBox('Loading a palette from GitHub');


    const element1 = Selector('#' + PALETTE_REPOSITORY.replace('/','_'));
    const state1 = await element1();
    var rect = state1.boundingClientRect;

    await showNoteBox('Access repos here', rect, 'left');

    await t

        // enter the github access token
        .click('#setGitHubAccessToken')
        .typeText(Selector('#inputModalInput'), GITHUB_ACCESS_TOKEN)
        .click('#inputModal .modal-footer button')

        // PART 1 - load palette
        .click('#' + PALETTE_REPOSITORY.replace('/','_'))
        .click('#folder_' + PALETTE_PATH)
        .click('#id_' + PALETTE_FILENAME.replace('.', '_'))

    await showMessageBox('Creating a graph');

    await t

        // PART 2 - create graph

        // Use the assertion to check if the actual header text is equal to the expected one
        //.expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // create a new graph
        .click('#navbarDropdown')
        .click('#createNewGraph')

        // enter the name of the new graph
        .typeText(Selector('#inputModalInput'), graph_filename)
        .click('#inputModal .modal-footer button')

        // select the description node
        .click('#node0 rect:not(.header-background)')

        // click the node tab in right window
        .click('#rightWindowModeNode');

    const element2 = Selector('#nodeInspector');
    const state2 = await element2();
    var rect = state2.boundingClientRect;

    await showNoteBox('Access node properties here', rect, 'left');

    await t

        // click the delete node button
        .click('#deleteSelectedNode')

        // click Yes in the "are you sure you wish to delete" modal
        .click('#confirmModalAffirmativeButton');

    const element3 = Selector('#paletteList');
    const state3 = await element3();
    var rect = state3.boundingClientRect;

    await showNoteBox('Add components from the palette by clicking +', rect, 'right');

    await t

        // add the outer scatter from the palette to the graph
        .click('#addPaletteNode0')
        .hover('.leftWindowHandle')

        // move the outer scatter
        .drag(Selector('#node0 image'), 20, 0)

        // resize the outer scatter
        .drag(Selector('#node0 .resize-control-label'), 370, 200, {
            offsetX: 10,
            offsetY: 10
        })

        // add the inner scatter
        .click('#addPaletteNode1')
        .hover('.leftWindowHandle')

        // move the inner scatter
        .click('#node1 image')
        .drag(Selector('#node1 image'), 40, 75)

        // resize the inner scatter
        .drag(Selector('#node1 .resize-control-label'), 120, 110, {
            offsetX: 10,
            offsetY: 10
        })

        // click the node tab in right window
        .click('#rightWindowModeNode')

        // set parent of inner scatter
        .click('#nodeInspectorChangeParent')
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("ClusterScatterAverager : -1"))
        .click('#choiceModal .modal-footer button')

        // add the inner Python App
        .click('#addPaletteNode2')
        //.hover('.leftWindowHandle')

        // click the node tab in right window
        .click('#rightWindowModeNode')

        // set parent of inner Python App
        .click('#nodeInspectorChangeParent')
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("NodeScatterAverager : -2"))
        .click('#choiceModal .modal-footer button')

        // move the inner Python App
        .click('#node2 image')
        .drag(Selector('#node2 image'), 60, 150)

        // add the outer Python App
        .click('#addPaletteNode3')
        //.hover('.leftWindowHandle')

        // click the node tab in right window
        .click('#rightWindowModeNode')

        // set parent of outer Python App
        .click('#nodeInspectorChangeParent')
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("ClusterScatterAverager : -1"))
        .click('#choiceModal .modal-footer button')

        // move the outer Python App (NOTE: this is now node 2!)
        .click('#node2 image')
        .drag(Selector('#node2 image'), 370, 150)

        // debug click the object first
        .click(Selector('#node3 g.outputPorts circle').nth(1), {
            offsetX: 6,
            offsetY: 6
        })

        // draw edge from inner Python App to outer Python App
        .dragToElement(
            Selector('#node3 g.outputPorts circle').nth(1),
            Selector('#node2 g.inputPorts circle').nth(1),
            {
                offsetX: 6,
                offsetY: 6
            })

        // select 'memory' data type for spead2 data component
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("Memory"))
        .click('#choiceModal .modal-footer button')

        // add the gather
        .click('#addPaletteNode4')
        //.hover('.leftWindowHandle')

        // move the gather (NOTE: this is now node 1!)
        .click('#node1 image')
        .drag(Selector('#node1 image'), 640, 100)

        // debug click the object first
        .click(Selector('#node3 g.outputPorts circle').nth(1), {
            offsetX: 6,
            offsetY: 6
        })


        // draw edge from outer Python App to gather
        .dragToElement(
            Selector('#node3 g.outputPorts circle').nth(1),
            Selector('#node1 g.inputPorts circle').nth(1),
            {
                offsetX: 6,
                offsetY: 6
            })

        // select 'memory' data type for spead2 data component
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("Memory"))
        .click('#choiceModal .modal-footer button')

        // add the end node
        // NOTE: we don't hover the mouse elsewhere after this click, because the click handler opens a modal, and the usual hover target will be hidden
        .click('#addPaletteNode5')

        // select type of end node
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("File"))
        .click('#choiceModal .modal-footer button')

        // move the end node (NOTE: this is now node 2!)
        .click('#node2 image')
        .drag(Selector('#node2 image'), 640, 350)

        // debug click the object first
        .click(Selector('#node1 g.outputPorts circle').nth(0), {
            offsetX: 6,
            offsetY: 6
        })

        // draw edge from outer Python App to gather
        .dragToElement(
            Selector('#node1 g.outputPorts circle').nth(0),
            Selector('#node2 g.inputPorts circle').nth(0),
            {
                offsetX: 6,
                offsetY: 6
            })

        // click on the outer scatter to finish up
        .click('#node0 image');

    await showMessageBox('Saving the graph to GitHub');

    await t

        // switch back to the repositories tab
        .click('#rightWindowModeRepositories')


        // save graph to github as...
        .click('#navbarDropdownGit')
        .click('#commitToGitAsGraph')

        // save graph to the james-strauss-uwa/eagle-test repo
        .click('#gitCommitModalRepositoryNameSelect')
        .click(Selector('#gitCommitModalRepositoryNameSelect').find('option').withText(TESTING_REPOSITORY + " (" + TESTING_REPOSITORY_BRANCH + ")"))

        // enter filepath for save graph as...
        .typeText(Selector('#gitCommitModalFilePathInput'), graph_filepath, { replace: true })

        // use default filename for save graph as...
        .typeText(Selector('#gitCommitModalFileNameInput'), graph_filename, { replace: true })

        // enter commit message for save graph as...
        .typeText(Selector('#gitCommitModalCommitMessageInput'), graph_commit_message, { replace: true })

        // commit
        .click('#gitCommitModalAffirmativeButton')

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // end
        .wait(10000);
        //.takeScreenshot();
});
