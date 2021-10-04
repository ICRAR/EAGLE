import { Selector } from 'testcafe';

/*
    run with:

    testcafe chrome tests/edit-node-parameter.js
*/

var NEW_PALETTE_NAME = "new.palette";
var DUMMY_VALUE = "02348562";

fixture `EAGLE Edit Node Parameter`
    .page `http://localhost:8888/`

test('Edit node parameter', async t =>{
    await t
        // wait for the page to settle down
        .wait(3000)

        // open settings modal
        .click('#settings')

        // enable 'allow palette editing'
        .click('#settingAllowPaletteEditingButton')

        // close settings modal
        .click('#settingsModal .modal-footer button')

        // select python app node in palette
        .click("#selectPaletteNodePythonApp")

        // add selected node to palette
        .click("#addSelectedNodeToPalette")

        .wait(1000)

        // new destination palette
        .typeText(Selector('#choiceModalString'), NEW_PALETTE_NAME)

        // click OK on modal dialog
        .click('#choiceModalAffirmativeButton')

        // add a python node to the graph
        .click("#addPaletteNodePythonApp")

        // check that a file node has been created
        .expect(Selector("#nodeNameValue").value).eql("Python App")

        // click the header for the parameters section
        .click(Selector('h5.card-header[href="#nodeCategoryCollapse9"]'))

        // edit first parameter in the node inspector
        .typeText(Selector('#nodeInspectorFieldValue0'), DUMMY_VALUE, {replace: true})

        // check that first parameter was updated
        .expect(Selector("#nodeInspectorFieldValue0").value).eql(DUMMY_VALUE)

        // end
        .wait(3000);
});
