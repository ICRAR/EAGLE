import { Selector, ClientFunction } from 'testcafe';

/*
    run with:

    testcafe chrome tests/copy-new-insert.js
*/

const getNumEdges = ClientFunction(() => window.eagle.logicalGraph().getEdges().length);
const selectAll = ClientFunction(() => window.eagle.selectAllInGraph());
const copySelection = ClientFunction(() => window.eagle.copySelectionToClipboard(true));

fixture `EAGLE Copy New Insert`
    .page `http://localhost:8888/`

    test('Create simple graph, copy, then create new graph', async t =>{

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
    
        await selectAll();
    
        const lgString = await copySelection();
    
        // !!!!!!!!!!!!! CREATE NEW GRAPH
        await t
            .click(Selector('#navbarDropdownGraph'))
            .hover(Selector('#navbarDropdownGraphNew'))
            .hover(Selector('#createNewGraph'))  // we have to make sure to move horizontally first, so that the menu doesn't disappear
            .click(Selector('#createNewGraphFromJson'))
    
            .typeText(Selector('#inputTextModalInput'), lgString, { replace : true, paste : true })
    
            .click('#inputTextModal .modal-footer button')
    
            .wait(3000);
    
        const numEdgesAfter = await getNumEdges();
    
        await t.expect(numEdgesBefore).eql(1, {timeout:3000});
        await t.expect(numEdgesAfter).eql(1, {timeout:3000});
    });

    test('Create simple graph, copy, then insert', async t =>{

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
    
        await selectAll();
    
        const lgString = await copySelection();
    
        // !!!!!!!!!!!!! ADD TO GRAPH
        await t
            .click(Selector('#navbarDropdownGraph'))
            .hover(Selector('#navbarDropdownGraphNew'))
            .hover(Selector('#createNewGraph'))  // we have to make sure to move horizontally first, so that the menu doesn't disappear
            .click(Selector('#addToGraphFromJson'))
    
            .typeText(Selector('#inputTextModalInput'), lgString, { replace : true, paste : true })
    
            .click('#inputTextModal .modal-footer button')
    
            .wait(3000);
    
        const numEdgesAfter = await getNumEdges();
    
        await t.expect(numEdgesBefore).eql(1, {timeout:3000});
        await t.expect(numEdgesAfter).eql(2, {timeout:3000});
    });