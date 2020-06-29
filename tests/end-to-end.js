import { Selector } from 'testcafe';

/*
    run with:

    export GITHUB_ACCESS_TOKEN="<insert personal access token>";testcafe chrome tests/end-to-end.js
*/

var GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
var TESTING_REPOSITORY = "james-strauss-uwa/eagle-test";
var TRANSLATOR_URL = "http://localhost:8084/gen_pgt";
var TEST_PORT_NAME_0 = "test-port-0";
var TEST_PORT_NAME_1 = "test-port-1";
var TEST_PORT_NAME_2 = "test-port-2";
var CHOICE_MODAL_CUSTOM = "Custom (enter below)";
var SUCCESS_MESSAGE = "Success:";

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
var project_name = "end-to-end";
var palette_filepath = project_name;
var palette_filename = project_name + "-" + datestring;
var palette_commit_message = "Automated " + project_name + " palette (" + palette_filename + ")";
var graph_filepath = project_name;
var graph_filename = project_name + "-" + datestring;
var graph_commit_message = "Automated " + project_name + " graph (" + graph_filename + ")";

console.log("palette_filename:", palette_filename);

fixture `EAGLE End-to-End`
    .page `http://localhost:8888/`
    /*
    .afterEach(async t => {
        const { error } = await t.getBrowserConsoleMessages();

        var consoleMessages = await t.getBrowserConsoleMessages();
        console.log("consoleMessages:", consoleMessages);
    });
    */

test('Create palette', async t =>{
    await t
        // wait for the page to settle down
        .maximizeWindow()
        .wait(2000)

        // enter the github access token
        .click('#navbarDropdownGitHub')
        .click('#setAccessToken')
        .typeText(Selector('#inputModalInput'), GITHUB_ACCESS_TOKEN)
        .click('#inputModal .modal-footer button')

        // enter the testing repo as a custom repo
        .click('#navbarDropdownGitHub')
        .click('#addCustomRepository')
        .typeText(Selector('#inputModalInput'), TESTING_REPOSITORY)
        .click('#inputModal .modal-footer button')

        // enter palette mode
        .click('#enterPaletteEditorMode')
        .wait(250)

        // add a few items from the template palette to the palette
        .click('#addTemplatePaletteNode0')
        .click('#addTemplatePaletteNode1')
        .click('#addTemplatePaletteNode2')
        .click('#addTemplatePaletteNode6')
        .wait(250)

        // add an output port to the start node
        .click(Selector('#paletteNode0 rect:not(.header-background)'), {
            offsetX: 100,
            offsetY: 40
        })
        .wait(1000)

        .click('#nodeInspectorAddOutputPort')
        .wait(1000)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), TEST_PORT_NAME_0)
        .click('#choiceModal .modal-footer button')
        .wait(500)

        .click('#nodeInspectorAddOutputPort')
        .wait(1000)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), TEST_PORT_NAME_1)
        .click('#choiceModal .modal-footer button')
        .wait(500)

        .click('#nodeInspectorAddOutputPort')
        .wait(1000)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), TEST_PORT_NAME_2)
        .click('#choiceModal .modal-footer button')
        .wait(500)

        // remove one of the output ports from the start node
        .click('#nodeInspectorRemoveOutputPort2')
        .wait(500)

        // add an input port to the end node (using EAGLE's suggestion for the port name)
        .click('#paletteNode1 rect:not(.header-background)', {
            offsetX: 100,
            offsetY: 40
        })
        .wait(1000)
        .click('#nodeInspectorAddInputPort')
        .wait(1000)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(TEST_PORT_NAME_0))
        .click('#choiceModal .modal-footer button')
        .wait(500)

        .click('#nodeInspectorAddInputPort')
        .wait(1000)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(TEST_PORT_NAME_2))
        .click('#choiceModal .modal-footer button')
        .wait(500)

        // remove one of the input ports from the end node
        .click('#nodeInspectorRemoveInputPort2')
        .wait(500)

        // save palette to github as...
        .click('#navbarDropdownGitHub')
        .click('#commitToGitHubAsPalette')
        .wait(250)

        // save palette to the james-strauss-uwa/eagle-test repo
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(TESTING_REPOSITORY))
        //.expect(Selector('#choiceModalSelect option:selected').innerText).eql(TESTING_REPOSITORY)
        .click('#choiceModal .modal-footer button')
        .wait(500)

        // enter filepath for save palette as...
        .typeText(Selector('#inputModalInput'), palette_filepath)
        .click('#inputModal .modal-footer button')
        .wait(500)

        // enter filename for save palette as...
        .typeText(Selector('#inputModalInput'), palette_filename)
        .click('#inputModal .modal-footer button')
        .wait(500)

        // enter commit message for save palette as...
        .typeText(Selector('#inputModalInput'), palette_commit_message)
        .click('#inputModal .modal-footer button')
        .wait(500)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE);
});

test('Create graph', async t =>{
    await t
        // wait for the page to settle down
        .maximizeWindow()
        .wait(2000)

        // enter the github access token
        .click('#navbarDropdownGitHub')
        .click('#setAccessToken')
        .typeText(Selector('#inputModalInput'), GITHUB_ACCESS_TOKEN)
        .click('#inputModal .modal-footer button')

        // enter the testing repo as a custom repo
        .click('#navbarDropdownGitHub')
        .click('#addCustomRepository')
        .typeText(Selector('#inputModalInput'), TESTING_REPOSITORY)
        .click('#inputModal .modal-footer button')

        // enter LGT mode
        //.click('#enterLGTEditorMode')
        //.wait(250)

        // load the palette
        .click('#' + TESTING_REPOSITORY.replace('/','_'))
        .wait(500)
        .click('#folder_' + palette_filepath)
        .wait(500)
        .click('#id_' + palette_filename + "_palette")
        //.click('#id_test-20190710-170657_palette')
        .wait(250)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // add a "start" object from the palette to the graph
        .click('#addPaletteNode0')
        .wait(250)

        // select a memory data component from the resulting dialog
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("memory"))
        //.expect(Selector('#choiceModalSelect option:selected').innerText).eql(TESTING_REPOSITORY)
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // click the newly created memory data component
        .click(Selector('#node0 rect:not(.header-background)'), {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // update the label in the node inspector
        .typeText(Selector('#nodeNameValue'), "test memory", { replace: true })

        // create shell app
        .click('#addPaletteNode2')
        .wait(500)

        // click the newly created memory data component
        .drag(Selector('#node1 rect:not(.header-background)'), 200, 100, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // update the label in the node inspector
        .typeText(Selector('#nodeNameValue'), "test shell app", { replace: true })

        // create python app
        .click('#addPaletteNode3')
        .wait(250)

        // click the newly created shell app
        .drag(Selector('#node2 rect:not(.header-background)'), 400, 200, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // update the label in the node inspector
        .typeText(Selector('#nodeNameValue'), "test python app", { replace: true })

        // add a "end" object from the palette to the graph
        .click('#addPaletteNode1')
        .wait(250)

        // select a file data component from the resulting dialog
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("file"))
        //.expect(Selector('#choiceModalSelect option:selected').innerText).eql(TESTING_REPOSITORY)
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // click the newly created file
        .drag(Selector('#node3 rect:not(.header-background)'), 600, 300, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // update the label in the node inspector
        .typeText(Selector('#nodeNameValue'), "test file", { replace: true })

        // debug click the object first
        .click(Selector('#node0 g.outputPorts circle'), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(250)

        // join apps via event port
        .drag(
            Selector('#node0 g.outputPorts circle'),
            20, 100,
            {
                offsetX: 6,
                offsetY: 6
            })
        .wait(250)

        //.expect(Selector("#edgeInspector").visible).ok()
        //.expect(Selector("#edge-data-type").value).eql("event")


        // debug click the object first
        .click(Selector('#node1 g.outputPorts circle'), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(250)

        // join apps via event port
        .drag(Selector('#node1 g.outputPorts circle'), 20, 100, {
            offsetX: 6,
            offsetY: 6
        })
        .wait(250)

        // debug click the object first
        .click(Selector('#node2 g.outputPorts circle'), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(250)

        // join apps via event port
        .drag(Selector('#node2 g.outputPorts circle'), 20, 100, {
            offsetX: 6,
            offsetY: 6
        })
        .wait(250)

        // save graph to github as...
        .click('#navbarDropdownGitHub')
        .click('#commitToGitHubAsGraph')
        .wait(250)

        // save palette to the james-strauss-uwa/eagle-test repo
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(TESTING_REPOSITORY))
        //.expect(Selector('#choiceModalSelect option:selected').innerText).eql(TESTING_REPOSITORY)
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // enter filepath for save graph as...
        .typeText(Selector('#inputModalInput'), graph_filepath)
        .click('#inputModal .modal-footer button')
        .wait(250)

        // enter filename for save graph as...
        .typeText(Selector('#inputModalInput'), graph_filename)
        .click('#inputModal .modal-footer button')
        .wait(250)

        // enter commit message for save graph as...
        .typeText(Selector('#inputModalInput'), graph_commit_message)
        .click('#inputModal .modal-footer button')
        .wait(250)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE);
});

test('Translate graph', async t =>{
    await t
        // wait for the page to settle down
        .maximizeWindow()
        .wait(2000)

        // enter the github access token
        .click('#navbarDropdownGitHub')
        .click('#setAccessToken')
        .typeText(Selector('#inputModalInput'), GITHUB_ACCESS_TOKEN)
        .click('#inputModal .modal-footer button')

        // enter the testing repo as a custom repo
        .click('#navbarDropdownGitHub')
        .click('#addCustomRepository')
        .typeText(Selector('#inputModalInput'), TESTING_REPOSITORY)
        .click('#inputModal .modal-footer button')

        // set the url of the translator
        .click('#navbarDropdownGitHub')
        .click('#setTranslatorUrl')
        .typeText(Selector('#inputModalInput'), TRANSLATOR_URL, { replace: true })
        .click('#inputModal .modal-footer button')

        // load the graph
        .click('#' + TESTING_REPOSITORY.replace('/','_'))
        .wait(500)
        .click('#folder_' + graph_filepath)
        .wait(500)
        .click('#id_' + graph_filename + '_graph')
        //.click('#id_test-20190711-135121_graph')
        .wait(500)

        // enter LG mode
        .click('#enterLGEditorMode')
        .wait(250)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // open translate right window
        .click('#enterTranslationRightWindow')
        .wait(250)

        // open accordion for algorithm 1
        .click('#headingTwo')
        .wait(250)

        // click translate
        .click('#alg1PGT')

        .wait(5000)
});
