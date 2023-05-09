import { Selector } from 'testcafe';
import fs from 'fs';

/*
    run with:

    testcafe chrome tests/component-update.js
*/

const LG_PATH = "tests/data/component-update-test.graph";

let graphJSON = "input";

fixture `EAGLE Update Components`
    .page `http://localhost:8888/`

test('Update components', async t =>{
    await fetchGraph(LG_PATH);

    await t.
        
        wait(3000)

        // open settings modal
        .click('#settings')

        // enable 'expert mode'
        .click('#settingUserInterfaceModeValue')

        // click the 'expert' option
        .click(Selector('#settingUserInterfaceModeValue').find('option').withText('Expert'))

        // close settings modal
        .click('#settingsModalAffirmativeButton')

    // !!!!!!!!!!!!! LOAD GRAPH (with out-of-date 'CopyApp' component)
    await t
        .click(Selector('#navbarDropdownGraph'))
        .hover(Selector('#navbarDropdownGraphNew'))
        .hover(Selector('#createNewGraph'))  // we have to make sure to move horizontally first, so that the menu doesn't disappear
        .click(Selector('#createNewGraphFromJson'))

        .typeText(Selector('#inputTextModalInput'), graphJSON, { replace : true, paste : true })

        .click('#inputTextModal .modal-footer button')

        .wait(3000);

    // !!!!!!!!!!!!! Click the "component update" button
    await t
        .click(Selector('#checkForComponentUpdates'));
    await t.wait(3000);

    // !!!!!!!!!!!!! EXPORT JSON
    await t
        .click(Selector('#navbarDropdownGraph'))
        .hover(Selector('#navbarDropdownGraphNew'))
        .hover(Selector('#createNewGraph'))  // we have to make sure to move horizontally first, so that the menu doesn't disappear
        .click(Selector('#displayGraphAsJson'));

    await t.wait(1000);

    const outputJSON = await Selector("#inputTextModalInput").value;

    const obj1 = JSON.parse(graphJSON);
    const obj2 = JSON.parse(outputJSON);

    // !!!!!!!!!!!!! CHECK FOR EXPECTED INPUT COMPONENTS
    await t.expect(obj1.nodeDataArray[2].fields.length).eql(7, {timeout:3000});
    await t.expect(obj1.nodeDataArray[2].fields[0].name).eql("appclass", {timeout:3000});
    await t.expect(obj1.nodeDataArray[2].fields[0].value).eql("dlg.apps.simple.CopyAppBad", {timeout:3000});

    // !!!!!!!!!!!!! CHECK FOR CORRECTLY UPDATED OUTPUT COMPONENTS
    await t.expect(obj2.nodeDataArray[2].fields.length).eql(11, {timeout:3000});
    await t.expect(obj2.nodeDataArray[2].fields[0].name).eql("appclass", {timeout:3000});
    await t.expect(obj2.nodeDataArray[2].fields[0].value).eql("dlg.apps.simple.CopyApp", {timeout:3000});
    await t.expect(obj2.nodeDataArray[2].fields[5].name).eql("hello", {timeout:3000});
    await t.expect(obj2.nodeDataArray[2].fields[6].name).eql("hello", {timeout:3000});
    await t.expect(obj2.nodeDataArray[2].fields[7].name).eql("bufsize", {timeout:3000});
    await t.expect(obj2.nodeDataArray[2].fields[8].name).eql("n_tries", {timeout:3000});
    await t.expect(obj2.nodeDataArray[2].fields[9].name).eql("dummy_in", {timeout:3000});
    await t.expect(obj2.nodeDataArray[2].fields[10].name).eql("dummy_out", {timeout:3000});
});

const fetchGraph = (filename) => {
    graphJSON = fs.readFileSync(filename, 'utf8');
};
