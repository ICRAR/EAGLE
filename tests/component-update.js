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

    await t.wait(3000);

    // !!!!!!!!!!!!! LOAD GRAPH
    await t
        .click(Selector('#navbarDropdownGraph'))
        .hover(Selector('#navbarDropdownGraphNew'))
        .hover(Selector('#createNewGraph'))  // we have to make sure to move horizontally first, so that the menu doesn't disappear
        .click(Selector('#createNewGraphFromJson'))

        .typeText(Selector('#inputTextModalInput'), graphJSON, { replace : true, paste : true })

        .click('#inputTextModal .modal-footer button')

        .wait(3000);

    // !!!!!!!!!!!!! Component Update
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

    // !!!!!!!!!!!!! CHECK FOR CORRECT NUMBER OF PARAMETERS IN INPUT COMPONENTS
    await t.expect(obj1.nodeDataArray[2].fields.length).eql(5, {timeout:3000});

    console.log(obj1.nodeDataArray[2].fields);
    console.log(obj2.nodeDataArray[2].fields);

    // !!!!!!!!!!!!! CHECK FOR CORRECT NUMBER OF PARAMETERS IN OUTPUT COMPONENTS
    await t.expect(obj2.nodeDataArray[2].fields.length).eql(9, {timeout:3000});
});

const fetchGraph = (filename) => {
    graphJSON = fs.readFileSync(filename, 'utf8');
};
