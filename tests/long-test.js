import { Selector, ClientFunction, Role } from 'testcafe';
import page from './page-model';
import github from './github-model';

// This script has everything removed that's just for the videos, to keep the automated testing simple

/*
    run with:

    testcafe chrome tests/long-test.js
*/

var PROJECT_PATH = "";
var PROJECT_NAME = "summit";

var CHOICE_MODAL_CUSTOM = "Custom (enter below)";
var SPEAD2_STREAM = "spead2Stream";
var SUB_MS = "subMS";
var CONF = "conf";
var SUCCESS_MESSAGE = "Success:";
var TEST_SPEED = 0.5;     //A number between 0.01 (slowest) and 1.0 (fastest)

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

var graph_filepath = PROJECT_PATH;     //+ "/" + PROJECT_NAME;
var graph_filename = PROJECT_NAME + "-" + datestring + ".graph";

fixture `EAGLE Long Test`
    .page `http://localhost:8888/`


test('Graph creation', async t =>{

    await t
        // wait for the page to settle down
        //.resizeWindow(1920, 1080)
        .maximizeWindow()
        .wait(3000)
        .setTestSpeed(TEST_SPEED);

    // create graph

    // create a new graph
    await page.createNewGraph(graph_filename);

    // Delete the description node
    await page.deleteNode('#node0');

    // add the outer scatter from the palette to the graph
    await page.addPaletteNode(0,14,true);
    await page.setNodeName("ClusterScatterAverager", true);

    // move and resize the outer scatter
    await page.moveNode('#node0', 120, 100);
    await page.resizeNode('#node0', 370, 200);

    // add the inner scatter
    await page.addPaletteNode(0,14,true);

    await page.setNodeName("NodeScatterAverager", true);

    // move and resize the inner scatter
    await page.moveNode('#node1', 140, 175);
    await page.resizeNode('#node1', 120, 110);

    // add the inner Python App
    await page.addPaletteNode(0,6,false);

    await page.setNodeName("OSKAR2 Simulator", true);

    await page.addNodePort("spead2", false);

    // move the inner Python App
    await page.moveNode('#node1', 160, 250);

    // add the outer Python App
    await page.addPaletteNode(0,6,false);
    await page.setNodeName("Average 6 Channels", true);

    await page.addNodePort("spead2", true);
    await page.addNodePort("spead2", false);

    // move the outer Python App (NOTE: this is node 1!)
    await page.moveNode('#node1', 470, 250);

    // draw edge from inner Python App to outer Python App
    await page.createEdge("OSKAR2 Simulator", "Average 6 Channels", false, false, "spead2", "spead2");

    // The option chosen for the spead2 data component is Memory
    await page.selectOption("Memory");

    // add the gather
    await page.addPaletteNode(0,13,false);

    await page.addNodeInputApplication("Python App");

    await t.click('#nodeInspectorInspectInputApplication');

    await page.addNodePort("spead2", true);
    await page.addNodePort("event", false);

    // move the gather (NOTE: this is now node 1!)
    await page.moveNode('#node1', 740, 200);

    // draw edge from outer Python App to gather
    // The number refers to which numbered port is being connected

    //await page.connectNodes('#node3','#node1',false,true,0,0);
    //await t.takeScreenshot();
    await page.createEdge("Average 6 Channels", "Python App", false, true, "spead2", "spead2");


    // The option chosen for the spead2 data component is Memory
    await page.selectOption("Memory");

    // add the end node
    // NOTE: we don't hover the mouse elsewhere after this click, because the click handler opens a modal, and the usual hover target will be hidden
    await page.addPaletteNode(0,1,false);

    // select type of end node
    await page.selectOption("File");

    await page.addNodePort("event", true);

    // move the end node (NOTE: this is now node 2!)
    await page.moveNode('#node2', 740, 450);

    // An extra pause is needed because of warning messages blocking the next connection
    await t.wait(1000);

    // draw edge from gather to end node
    // The number refers to which numbered port is being connected
    await page.connectNodes('#node1','#node2',true,false,0,0);

    // click on the outer scatter to finish up
    await page.selectNode('#node0');
});
