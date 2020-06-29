import { Selector } from 'testcafe';

/*
    run with:

    export GITHUB_ACCESS_TOKEN="<insert personal access token>";testcafe chrome tests/cycle.js
*/

var GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
var TESTING_REPOSITORY = "james-strauss-uwa/eagle-test";
var TRANSLATOR_URL = "http://localhost:8084/gen_pgt";
var CHOICE_MODAL_CUSTOM = "Custom (enter below)";
var SPEAD2_STREAM = "spead2Stream";
var SUB_MS = "subMS";
var CONF = "conf";
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
var project_name = "cycle";
var palette_filepath = project_name;
var palette_filename = project_name + "-" + datestring;
var palette_commit_message = "Automated " + project_name + " palette (" + palette_filename + ")";
var graph_filepath = project_name;
var graph_filename = project_name + "-" + datestring;
var graph_commit_message = "Automated " + project_name + " graph (" + graph_filename + ")";

fixture `EAGLE Cycle`
    .page `http://localhost:8888/`

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

        // PART 1 - create palette


        // enter palette mode
        .click('#enterPaletteEditorMode')
        .wait(250)

        // create a new palette
        .click('#navbarDropdown')
        .click('#createNewPalette')

        // enter the name of the new palette
        .typeText(Selector('#inputModalInput'), palette_filename)
        .click('#inputModal .modal-footer button')
        .wait(250)

        // add a scatter from the template palette to the palette
        .click('#addTemplatePaletteNode13')
        .wait(250)

        // click on the scatter to display the node inspector
        .click(Selector('#paletteNode4 rect:not(.header-background)'), {
            offsetX: 100,
            offsetY: 40
        })
        .wait(250)

        // set the name of the new scatter to 'ClusterScatterAverager'
        .typeText(Selector('#nodeNameValue'), "ClusterScatterAverager", {replace:true})

        // set the 'app type' of the new scatter to a 'Component'
        .click('#inputApplicationTypeSelect')
        .click(Selector('#inputApplicationTypeSelect').find('option').withText('Component'))

        // set data component parameters of the new scatter
        .typeText(Selector('#nodeInspectorFieldValue0'), "4608", {replace:true})
        .typeText(Selector('#nodeInspectorFieldValue1'), "Config", {replace:true})

        // create an output port on the scatter
        .click('#nodeInspectorAddOutputPort')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), SPEAD2_STREAM)
        .click('#choiceModal .modal-footer button')
        .wait(250)




        // add a gather from the template palette to the palette
        .click('#addTemplatePaletteNode12')
        .wait(250)

        // click on the gather to display the node inspector
        .click(Selector('#paletteNode5 rect:not(.header-background)'), {
            offsetX: 100,
            offsetY: 40
        })
        .wait(250)

        // set the name of the new gather to 'Averager'
        .typeText(Selector('#nodeNameValue'), "Averager", {replace:true})

        // set the 'app type' of the new gather to a 'Component'
        .click('#inputApplicationTypeSelect')
        .click(Selector('#inputApplicationTypeSelect').find('option').withText('Component'))

        // set data component parameters of the new gather
        .typeText(Selector('#nodeInspectorFieldValue0'), "6", {replace:true})
        .typeText(Selector('#nodeInspectorFieldValue1'), "frequency", {replace:true})

        // add input app field
        .click('#nodeInspectorAddInputAppField')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), CONF)
        .click('#choiceModal .modal-footer button')
        .wait(250)

        .typeText(Selector('#nodeInspectorInputAppFieldValue4'), "/home/wu082/proj/jacal/summit_demo/oskar/ingest/conf/recv.json", {replace:true})

        // create an input port on the gather
        .click('#nodeInspectorAddInputPort')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), SPEAD2_STREAM)
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // create an output port on the gather
        .click('#nodeInspectorAddOutputPort')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), SUB_MS)
        .click('#choiceModal .modal-footer button')
        .wait(250)




        // add a application component from the template palette to the palette
        .click('#addTemplatePaletteNode6')
        .wait(250)

        // click on the gather to display the node inspector
        .click(Selector('#paletteNode6 rect:not(.header-background)'), {
            offsetX: 100,
            offsetY: 40
        })
        .wait(250)

        // set the name of the new application component to 'Ingest Big Component'
        .typeText(Selector('#nodeNameValue'), "Ingest Big Component", {replace:true})

        // set data params for the application component
        .click('#nodeInspectorAddField')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "freq_range")
        .click('#choiceModal .modal-footer button')
        .wait(250)
        .typeText(Selector('#nodeInspectorFieldValue4'), "freq_range", {replace:true})

        .click('#nodeInspectorAddField')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "num_freq")
        .click('#choiceModal .modal-footer button')
        .wait(250)
        .typeText(Selector('#nodeInspectorFieldValue5'), "num_freq", {replace:true})

        // create an output port on the scatter
        .click('#nodeInspectorAddOutputPort')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), SPEAD2_STREAM)
        .click('#choiceModal .modal-footer button')
        .wait(250)



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

        // use default filename for save palette as...
        .click('#inputModal .modal-footer button')
        .wait(500)

        // enter commit message for save palette as...
        .typeText(Selector('#inputModalInput'), palette_commit_message)
        .click('#inputModal .modal-footer button')
        .wait(500)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // PART 2 - create graph

        // enter logical graph template mode
        .click('#enterLGTEditorMode')
        .wait(250)
        /*
        // load the palette
        .click('#' + TESTING_REPOSITORY.replace('/','_'))
        .wait(500)
        .click('#folder_' + palette_filepath)
        .wait(500)
        .click('#id_summit-ingest-20190923-114434_palette')
        .wait(250)
        */

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // create a new graph
        .click('#navbarDropdown')
        .click('#createNewGraph')

        // enter the name of the new graph
        .typeText(Selector('#inputModalInput'), graph_filename)
        .click('#inputModal .modal-footer button')
        .wait(250)

        // move the description node
        .drag(Selector('#node0 rect:not(.header-background)'), 150, -50, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // add a scatter from the palette to the graph
        .click('#addPaletteNode3')
        .wait(250)

        // move the scatter
        .drag(Selector('#node0 rect:not(.header-background)'), 150, 100, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // resize the scatter
        .drag(Selector('#node0 rect.resize-control'), 300, 150, {
            offsetX: 10,
            offsetY: 10
        })
        .wait(250)

        // add a gather from the palette to the graph
        .click('#addPaletteNode4')
        .wait(250)

        // move the gather
        .drag(Selector('#node1 rect:not(.header-background)'), 700, 100, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // resize the gather
        .drag(Selector('#node1 rect.resize-control'), 50, 150, {
            offsetX: 10,
            offsetY: 10
        })
        .wait(250)

        // add a 'application component' from the palette to the graph
        .click('#addPaletteNode2')
        .wait(250)

        // move the application component
        .drag(Selector('#node3 rect:not(.header-background)'), 200, 150, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // make the 'application component' a child of the scatter
        .click('#nodeInspectorChangeParent')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("ClusterScatterAverager : -2"))
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("#nodeParentValue").value).eql('-2')

        // debug click the object first
        .click(Selector('#node3 g.outputPorts circle').nth(1), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(250)

        // join 'Ingest Big Component' and 'Averager' via spead2Stream port
        .drag(
            Selector('#node3 g.outputPorts circle').nth(1),
            320, -50,
            {
                offsetX: 6,
                offsetY: 6
            })
        .wait(250)

        // select 'memory' data type for spead2 data component
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("memory"))
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // set data volume 15 on the new memory data component
        .click(Selector('#node4 rect:not(.header-background)'), {
            offsetX: 150,
            offsetY: 40
        })
        .typeText(Selector('#nodeInspectorFieldValue0'), "15", {replace:true})

        // change parent of the 'memory' data component
        .click('#nodeInspectorChangeParent')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("ClusterScatterAverager : -2"))
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("#nodeParentValue").value).eql('-2')

        // add a 'end' node
        .click('#addPaletteNode1')
        .wait(250)

        // choose a 'file' type for the end node
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("file"))
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // move end node
        .drag(Selector('#node5 rect:not(.header-background)'), 700, 300, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // name end node
        .typeText(Selector('#nodeNameValue'), "subMS", {replace:true})

        .click('#nodeInspectorChangeParent')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("Averager : -3"))
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // debug click the object first
        .click(Selector('#node1 g.outputPorts circle'), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(250)

        // join the 'Averager' and the 'subMS' via the event port
        .drag(
            Selector('#node1 g.outputPorts circle'),
            -230, 200,
            {
                offsetX: 6,
                offsetY: 6
            })
        .wait(250)

        // click on description node
        .click(Selector('#node2 rect:not(.header-background)'), {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // set the description label
        .typeText(Selector('#nodeNameValue'), "Summit ingest", {replace:true})

        // save graph to github as...
        .click('#navbarDropdownGitHub')
        .click('#commitToGitHubAsGraph')
        .wait(250)

        // save graph to the james-strauss-uwa/eagle-test repo
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(TESTING_REPOSITORY))
        .click('#choiceModal .modal-footer button')
        .wait(500)

        // enter filepath for save graph as...
        .typeText(Selector('#inputModalInput'), graph_filepath)
        .click('#inputModal .modal-footer button')
        .wait(500)

        // use default filename for save graph as...
        .click('#inputModal .modal-footer button')
        .wait(500)

        // enter commit message for save graph as...
        .typeText(Selector('#inputModalInput'), graph_commit_message)
        .click('#inputModal .modal-footer button')
        .wait(500)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)



        // PART 3 - translate

        // set the url of the translator
        .click('#navbarDropdownGitHub')
        .click('#setTranslatorUrl')
        .typeText(Selector('#inputModalInput'), TRANSLATOR_URL, { replace: true })
        .click('#inputModal .modal-footer button')

        // enter logical graph template mode
        .click('#enterLGEditorMode')
        .wait(250)

        // open translate right window
        .click('#enterTranslationRightWindow')
        .wait(250)

        // open accordion for algorithm 1
        .click('#headingTwo')
        .wait(250)

        // click translate
        .click('#alg1PGT')

        // end
        .wait(5000);
});
