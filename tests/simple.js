import { Selector } from 'testcafe';

/*
    run with:

    export EAGLE_GITHUB_ACCESS_TOKEN="<token>";testcafe chrome tests/simple.js
*/

var EAGLE_GITHUB_ACCESS_TOKEN = process.env.EAGLE_GITHUB_ACCESS_TOKEN;

fixture `EAGLE Set GitHub Access Token`
    .page `http://localhost:8888/`

test('Set token', async t =>{
    await t
        // wait for the page to settle down
        .wait(3000)

        // click the settings button
        .click('#navbarDropdownHelp')
        .click("#settings")
        .click("#settingCategoryExternalServices")

        // enter the github access token
        .typeText(Selector('#settingGitHubAccessTokenValue'), EAGLE_GITHUB_ACCESS_TOKEN)
        .click('#settingsModal .modal-footer button')

        // end
        .wait(3000);
});
