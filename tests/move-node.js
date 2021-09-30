import { Selector, ClientFunction } from 'testcafe';
import page from './page-model';

/*
    run with:

    testcafe chrome tests/move-node.js
*/

fixture `EAGLE Move Node`
    .page `http://localhost:8888/`

test('Move node', async t =>{
    await t
        // wait for the page to settle down
        .wait(3000)

        // create a HelloWorld App at a random location in the graph
        .click(Selector('#addPaletteNodeHelloWorldApp'))

        .wait(1000);

    await page
        .moveNode('#node0', 110, 480);

    await t
        .wait(1000);

    const getNode0Position = ClientFunction(() => {
        return eagle.logicalGraph().getNodes()[0].getPosition();
    });

    const node0Position = await getNode0Position();

    await t.expect(node0Position).eql({ x: 320, y: 446 });
});
