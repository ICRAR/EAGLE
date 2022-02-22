import { Selector } from 'testcafe';

var EAGLE_GITHUB_ACCESS_TOKEN = process.env.EAGLE_GITHUB_ACCESS_TOKEN;

/*
    run with:

    export EAGLE_GITHUB_ACCESS_TOKEN="<insert personal access token>";testcafe chrome tests/explore-palettes.js
*/

fixture `EAGLE Explore Palettes`
    .page `http://localhost:8888/`

test('Load palette and check', async t =>{
    await t
        // wait for the page to settle down
        .wait(3000)

        // open settings
        .click('#settings')
        .wait(1000)
        .click('#settingCategoryExternalServices')
        .wait(1000)

        // enter the github access token
        .typeText(Selector('#settingGitHubAccessTokenValue'), EAGLE_GITHUB_ACCESS_TOKEN)
        .click('#settingsModalAffirmativeButton')
        .wait(2000)

        // open the explore palettes modal
        .click('#explorePalettesButton')

        // wait for quite a while for it to load
        .wait(15000)

        .click('#explorePalettesModal .modal-body .list-group .list-group-item:nth-child(2)')

        // wait for the palette to load
        .wait(5000)

        // check that a file node has been created
        .expect(Selector("#palette0 h5").innerText).eql("daliuge-master.palette")

        // end
        .wait(3000);
});
