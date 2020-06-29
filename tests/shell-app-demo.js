import { Selector } from 'testcafe';

/*
    run with:

    export GITHUB_ACCESS_TOKEN="<insert personal access token>";testcafe chrome tests/shell-app-demo.js
*/

var GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
var TESTING_REPOSITORY = "james-strauss-uwa/eagle-test";
var TRANSLATOR_URL = "http://localhost:8084/gen_pgt";
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
var project_name = "shell-app";
var palette_filepath = project_name;
var palette_filename = project_name + "-" + datestring;
var palette_commit_message = "Automated " + project_name + " palette (" + palette_filename + ")";
var graph_filepath = project_name;
var graph_filename = project_name + "-" + datestring;
var graph_commit_message = "Automated " + project_name + " graph (" + graph_filename + ")";

fixture `EAGLE Shell App Demo`
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

        // add a shell app from the template palette to the palette
        .click('#addTemplatePaletteNode2')
        .wait(250)

        // click on the shell app to display the node inspector
        .click(Selector('#paletteNode4 rect:not(.header-background)'), {
            offsetX: 100,
            offsetY: 40
        })
        .wait(250)

        // set the name of the new shell app to 'DD'
        .typeText(Selector('#nodeNameValue'), "DD", {replace:true})

        // add args
        .click('#nodeInspectorAddField')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "dd")
        .click('#choiceModal .modal-footer button')
        .wait(250)

        .click('#nodeInspectorAddField')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "if")
        .click('#choiceModal .modal-footer button')
        .wait(250)

        .click('#nodeInspectorAddField')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "of")
        .click('#choiceModal .modal-footer button')
        .wait(250)

        .click('#nodeInspectorAddField')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "bs")
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // add input app field
        .click('#nodeInspectorAddField')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "count")
        .click('#choiceModal .modal-footer button')
        .wait(250)

        .typeText(Selector('#nodeInspectorFieldValue3'), "dd")
        .typeText(Selector('#nodeInspectorFieldValue4'), "/dev/urandom")
        .typeText(Selector('#nodeInspectorFieldValue5'), "%o[${ID}]")
        .typeText(Selector('#nodeInspectorFieldValue6'), "1024")
        .typeText(Selector('#nodeInspectorFieldValue7'), "10240")

        // create an output port on the shell app
        .click('#nodeInspectorAddOutputPort')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "random_file")
        .click('#choiceModal .modal-footer button')
        .wait(250)



        // add a shell app from the template palette to the palette
        .click('#addTemplatePaletteNode2')
        .wait(250)

        // click on the shell app to display the node inspector
        .click(Selector('#paletteNode5 rect:not(.header-background)'), {
            offsetX: 100,
            offsetY: 40
        })
        .wait(250)

        // set the name of the new shell app to 'MD5'
        .typeText(Selector('#nodeNameValue'), "MD5", {replace:true})

        // add args
        .click('#nodeInspectorAddField')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "md5")
        .click('#choiceModal .modal-footer button')
        .wait(250)
        .typeText(Selector('#nodeInspectorFieldValue3'), "md5 %i[-2] > %o[-3]")

        // create an output port on the shell app
        .click('#nodeInspectorAddInputPort')
        .wait(250)
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(CHOICE_MODAL_CUSTOM))
        .typeText(Selector('#choiceModalString'), "random_file")
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

        // create a new graph
        .click('#navbarDropdown')
        .click('#createNewGraph')

        // enter the name of the new graph
        .typeText(Selector('#inputModalInput'), graph_filename)
        .click('#inputModal .modal-footer button')
        .wait(250)

        // add a DD from the palette to the graph
        .click('#addPaletteNode2')
        .wait(250)

        // move the DD
        .drag(Selector('#node1 rect:not(.header-background)'), 200, 100, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // add a MD5 from the palette to the graph
        .click('#addPaletteNode3')
        .wait(250)

        // move the MD5
        .drag(Selector('#node2 rect:not(.header-background)'), 600, 300, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // debug click the object first
        .click(Selector('#node1 g.outputPorts circle').nth(1), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(250)

        // join apps via event port
        .drag(
            Selector('#node1 g.outputPorts circle').nth(1),
            220, 200,
            {
                offsetX: 6,
                offsetY: 6,
                speed: 0.01
            })
        .wait(250)

        // choose a file component
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("file"))
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // check
        //.expect(Selector("#edgeInspector").visible).ok()
        //.expect(Selector("#edge-data-type").value).eql("random_file")

        // click the newly created file
        .click(Selector('#node3 rect:not(.header-background)'), {
            offsetX: 100,
            offsetY: 40
        })
        .wait(250)

        // set the name of the file
        .typeText(Selector('#nodeNameValue'), "Random File Content", {replace:true})

        // add an END from the palette to the graph
        .click('#addPaletteNode1')
        .wait(250)

        // choose a file component for END
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText("file"))
        .click('#choiceModal .modal-footer button')
        .wait(250)

        // move the END
        .drag(Selector('#node4 rect:not(.header-background)'), 800, 400, {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // edit label of end
        .typeText(Selector('#nodeNameValue'), "MD5 Result", {replace:true})

        // debug click the object first
        .click(Selector('#node2 g.outputPorts circle'), {
            offsetX: 6,
            offsetY: 6
        })
        .wait(250)

        // connect the MD5 component and MD5 Result
        .drag(
            Selector('#node2 g.outputPorts circle'),
            20, 100,
            {
                offsetX: 6,
                offsetY: 6,
                speed: 0.01
            })
        .wait(250)

        // click on description node
        .click(Selector('#node0 rect:not(.header-background)'), {
            offsetX: 150,
            offsetY: 40
        })
        .wait(250)

        // set the description label
        .typeText(Selector('#nodeNameValue'), "ShellApp example", {replace:true})

        // step 32 - update ID in 'of' attribute of DD node (should be set to -4, the ID of the 'Random File Content' file component)
        .click(Selector('#node1 rect:not(.header-background)'), {
            offsetX: 100,
            offsetY: 40
        })
        .wait(250)
        .typeText(Selector('#nodeInspectorFieldValue5'), "of=%o[${-4}]", {replace:true})

        // step 33 -
        .click(Selector('#node2 rect:not(.header-background)'), {
            offsetX: 100,
            offsetY: 40
        })
        .wait(250)
        .typeText(Selector('#nodeInspectorFieldValue3'), "md5 %i[-4] > %o[-5]", {replace:true})

        // save graph to github as...
        .click('#navbarDropdownGitHub')
        .click('#commitToGitHubAsGraph')
        .wait(250)

        // save graph to the james-strauss-uwa/eagle-test repo
        .click('#choiceModalSelect')
        .click(Selector('#choiceModalSelect').find('option').withText(TESTING_REPOSITORY))
        //.expect(Selector('#choiceModalSelect option:selected').innerText).eql(TESTING_REPOSITORY)
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
