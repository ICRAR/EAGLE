import { Selector } from 'testcafe';

var EAGLE_GITHUB_ACCESS_TOKEN = process.env.EAGLE_GITHUB_ACCESS_TOKEN;
var SUCCESS_MESSAGE = "Success:";

fixture `EAGLE Load Files`
    .page `http://localhost:8888/`

test('Load graph', async t => {
    await t
        .wait(2000)

        // open settings
        .click('#navbarDropdownHelp')
        .click('#settings')
        .click("#settingCategoryExternalServices")

        // enter the github access token
        .typeText(Selector('#setting13Value'), EAGLE_GITHUB_ACCESS_TOKEN)
        .click('#settingsModal .modal-footer button')
        .wait(2000)

        .click('#ICRAR_EAGLE_test_repo')
        .wait(12000);

    await t
        const log = await Selector("#htmlElementLog").innerText;
        console.log("log:", log);

    await t
        .click('#id_Vitaliy_long_graph')
        .wait(2000)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE);
});

test('Load palette', async t => {
    await t
        .wait(2000)

        // open settings
        .click('#navbarDropdownHelp')
        .click('#settings')
        .click("#settingCategoryExternalServices")

        // enter the github access token
        .typeText(Selector('#setting13Value'), EAGLE_GITHUB_ACCESS_TOKEN)
        .click('#settingsModal .modal-footer button')
        .wait(2000)

        .click('#ICRAR_EAGLE_test_repo')
        .wait(12000);

    await t
        const log = await Selector("#htmlElementLog").innerText;
        console.log("log2:", log);

    await t
        .click('#id_HelloWorld_palette')
        .wait(2000)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE);
});
