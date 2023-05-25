import { Selector, ClientFunction } from 'testcafe';
import page from './page-model';

/*
    run with:

    testcafe chrome tests/add-node-parameter.js
*/

const FIELD_NAME = "dummy2";

fixture `EAGLE Edit Edge`
    .page `http://localhost:8888/`

test('Change destination port used by edge', async t =>{
    const getNumEdges = ClientFunction(() => window.eagle.logicalGraph().getEdges().length);
    const selectFirstEdge = ClientFunction(() => eagle.setSelection(Eagle.RightWindowMode.Inspector, eagle.logicalGraph().getEdges()[0], Eagle.FileType.Graph));

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

        // add File component to graph
        .click('#addPaletteNodeFile')

        // add CopyApp component to graph
        .click('#addPaletteNodeCopyApp')

        // add edge from File to CopyApp
        .click(Selector('#navbarDropdownGraph'))
        .hover(Selector('#navbarDropdownGraphNew'))
        .hover(Selector('#createNewGraph'))  // we have to make sure to move horizontally first, so that the menu doesn't disappear
        .click(Selector('#addEdgeToLogicalGraph'))

        // change destination node
        .click('#editEdgeModalDestNodeKeySelect')
        .click(Selector('#editEdgeModalDestNodeKeySelect').find('option').withText('CopyApp'))

        // close the add edge modal
        .click('#editEdgeModalAffirmativeButton')

        .wait(1000);
    
    const numEdgesBefore = await getNumEdges();
    
    await page.addField(FIELD_NAME,'','ApplicationArgument','InputPort')
    
    await selectFirstEdge();

    await t
        .wait(200)
        // edit the edge
        .click('#edgeEditBtn')

        // change destination port
        .click('#editEdgeModalDestPortIdSelect')
        .click(Selector('#editEdgeModalDestPortIdSelect').find('option').withText(FIELD_NAME))

        // close the edit edge modal
        .click('#editEdgeModalAffirmativeButton')

        .wait(1000);

    const numEdgesAfter = await getNumEdges();

    await t.expect(numEdgesBefore).eql(1, {timeout:3000});
    await t.expect(numEdgesAfter).eql(1, {timeout:3000});
});
