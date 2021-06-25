import { Selector } from 'testcafe';

/*
    run with:

    testcafe chrome tests/drag-and-drop.js
*/

fixture `EAGLE Drag and Drop Node`
    .page `http://localhost:8888/`

test('Drag and drop node', async t =>{
    await t
        // wait for the page to settle down
        .wait(3000)

        // drag a File node from the palette into the graph
        .drag(Selector('#addPaletteNodeFile'), 250, 0, {
            offsetX: 40,
            offsetY: 40
        })
        .wait(250)

        // check that a file node has been created
        .expect(Selector("#nodeNameValue").value).eql("File")

        // end
        .wait(3000);
});
