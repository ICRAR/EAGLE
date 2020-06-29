import { Selector } from 'testcafe';

var GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
var SUCCESS_MESSAGE = "Success:";

fixture `EAGLE`
    .page `http://localhost:8888/`

test('Load graph', async t => {
    await t
        .wait(2000)
        .click('#navbarDropdownGitHub')
        .click('#setAccessToken')
        .typeText(Selector('#inputModalInput'), GITHUB_ACCESS_TOKEN)
        .click('#inputModal .modal-footer button')

        .click('#ICRAR_EAGLE_test_repo')
        .wait(2000)
        .click('#id_Vitaliy_long_graph')
        .wait(2000)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE);
});

test('Load palette', async t => {
    await t
        .wait(2000)
        .click('#navbarDropdownGitHub')
        .click('#setAccessToken')
        .wait(1000)
        .typeText(Selector('#inputModalInput'), GITHUB_ACCESS_TOKEN)
        .click('#inputModal .modal-footer button')

        .click('#ICRAR_EAGLE_test_repo')
        .wait(2000)
        .click('#id_HelloWorld_palette')
        .wait(2000)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE);
});
