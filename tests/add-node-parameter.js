import { Selector, ClientFunction } from 'testcafe';

/*
    run with:

    testcafe chrome tests/add-node-parameter.js
*/

const FIELD_NAME = "ip0";

fixture `EAGLE Add Node Parameter`
    .page `http://localhost:8888/`

test('Add node parameter with usage InputPort', async t =>{
    const getNumInputPorts = ClientFunction(() => window.eagle.logicalGraph().getNodes()[0].getInputPorts().length);

    await t
        // wait for the page to settle down
        .wait(3000)

        // open settings modal
        .click('#settings')

        // enable 'expert mode'
        .click('#settingUserInterfaceModeValue')

        // click the 'expert' option
        .click(Selector('#settingUserInterfaceModeValue').find('option').withText('Expert'))

        // close settings modal
        .click('#settingsModalAffirmativeButton')

        // add CopyApp component to graph
        .click('#addPaletteNodeCopyApp')

        .wait(1000)

        // expand the node inspector
        .click('#inspectorCollapseStateIcon');

    
    const numInputPortsBefore = await getNumInputPorts();

    await t
        // click the '+' button to add input port
        .click('#nodeInspectorAddInputPort')

        .wait(200)

        // click the 'custom' option
        .click('.nodeInspectorDropdownOption:nth-child(2)')

        // add info to modal
        .typeText(Selector('#editFieldModalIdTextInput'), FIELD_NAME)
        .typeText(Selector('#editFieldModalDisplayTextInput'), FIELD_NAME)

        // click OK on modal dialog
        .click('#editFieldModalAffirmativeButton')

        .wait(200);

    const numInputPortsAfter = await getNumInputPorts();

    await t.expect(numInputPortsAfter).eql(numInputPortsBefore+1, {timeout:3000});
});
