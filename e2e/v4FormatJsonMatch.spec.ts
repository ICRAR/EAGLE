import { test, expect } from '@playwright/test';
import fs from 'fs';
import https from 'https';
import path from 'path';

/*
1. Load OJS graph
2. Save V4 graph to string
3. Load V4 graph from string
4. Save OJS graph
5. Compare 1 and 4
*/

//const INPUT_GRAPH_LOCATION: string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/graph_patterns/genericScatter.graph";
//const INPUT_GRAPH_LOCATION: string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/examples/ArrayIngest_Demo.graph";
const INPUT_GRAPH_LOCATION: string = "data/LoopWithBranch.graph";

test('V4 Format JSON Match', async ({ page }) => {
  await page.goto('http://localhost:8888/?tutorial=none');

  //open settings modal
  await page.locator('#settings').click()

  //enable expert mode
  const uiModeSelect = await page.getByPlaceholder('uiMode')
  uiModeSelect.selectOption({value:'Expert'})

  //close settings modal (wait is needed, bootstrap is not ready to close the modal again that quickly)
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'OK' }).click()
  await page.waitForTimeout(500);

  // 1
  const inputOJS = await readGraph(INPUT_GRAPH_LOCATION);

  await loadGraphFromString(page, inputOJS);

  // 2

  // set schema to V4
  await setSchemaVersion(page, 'V4')

  // click 'display as JSON' from the 'Graph' menu
  await page.locator('#navbarDropdownGraph').click();
  await page.locator('#displayGraphAsJson').click();
  await page.waitForTimeout(500);

  // get JSON from modal
  const outputV4: string = await page.evaluate(getEditorContent);
  
  await page.waitForTimeout(500);
  await page.locator('#inputCodeModal button.affirmativeBtn').click()
  await page.waitForTimeout(500);

  // 3

  await loadGraphFromString(page, outputV4)

  // 4

  // set schema to OJS
  await setSchemaVersion(page, 'OJS');

  // click 'display as JSON' from the 'Graph' menu
  await page.locator('#navbarDropdownGraph').click();
  await page.locator('#displayGraphAsJson').click();
  await page.waitForTimeout(500);

  // get JSON from modal
  const outputOJS: string = await page.evaluate(getEditorContent);

  await page.waitForTimeout(500);
  await page.locator('#inputCodeModal button.affirmativeBtn').click()
  await page.waitForTimeout(500);

  // 5

  const obj1 = JSON.parse(inputOJS);
  const obj2 = JSON.parse(outputOJS);

  const result0 = compareObj(obj1, obj2);
  const result1 = compareObj(obj2, obj1);

  // !!!!!!!!!!!!! CHECK FOR MATCH
  await expect(JSON.stringify(result0)).toBe("{}");
  await expect(JSON.stringify(result1)).toBe("{}");

  //closing the browser
  await page.close();
});

const setEditorContent = (content): void => {
  const editor = $('#inputCodeModal').data('editor');
  editor.setValue(content);
}

const getEditorContent = (): string => {
  const editor = $('#inputCodeModal').data('editor');
  return editor.getValue();
}

const readGraph = (filename) => {
  return fs.readFileSync(path.join(__dirname, filename)).toString();
}

const fetchGraph = (url) => {
    return new Promise<string>((resolve, reject) => {
        const req = https.request(url, res => {
            let rawData: string = "";

            res.on('data', (d) => {
                rawData += d;
            });

            res.on('end', () => {
                resolve(rawData);
            });
        });

        req.on('error', e => {
            console.error(e);
            reject(e);
        });

        req.end();
    });
};

const loadGraphFromString = async (page, s: string) => {
  // navigate menus and click 
  await page.locator('#navbarDropdownGraph').click();
  await page.locator('#navbarDropdownGraphNew').hover();
  await page.locator('#createNewGraphFromJson').click();

  // short wait
  await page.waitForTimeout(500);

  // enter the graph JSON into the modal
  await page.evaluate(setEditorContent, s);

  // click the OK button on the modal
  await page.waitForTimeout(500);
  await page.locator('#inputCodeModal .modal-footer button.btn-primary').click();
  await page.waitForTimeout(500);

  // wait for the 'graph load success' notification to be shown
  await page.locator('div[data-notify="container"]').waitFor({state: 'attached'});

  // dismiss notification
  await page.locator('button[data-notify="dismiss"]').click();

  // wait for the 'graph load success' notification to be dismissed
  await page.locator('div[data-notify="container"]').waitFor({state: 'detached'});
}

const setSchemaVersion = async (page, format: 'OJS' | 'V4') => {
  //open settings modal
  await page.locator('#settings').click()

  await page.waitForTimeout(500);

  // click developer tab
  await page.locator('#settingCategoryDeveloper').click()

  // choose V4 format
  await page.locator('#settingDaliugeSchemaVersionValue').selectOption({value: format})

  // close settings modal
  await page.locator('#settingsModalAffirmativeAnswer').click()
  await page.waitForTimeout(500);
}

// use $.isEmptyObject or this
const isEmpty = function( o ) {
    for ( const p in o ) {
        if ( o.hasOwnProperty( p ) ) { return false; }
    }
    return true;
}

const compareObj = function(obj1, obj2) {
  const ret = {};
  let rett;
  for(const i in obj2) {
      rett = {};
      if (typeof obj2[i] === 'object' && typeof obj1 !== 'undefined'){
          rett = compareObj(obj1[i], obj2[i]);
          if (!isEmpty(rett) ){
           ret[i]= rett
          }
       }else{
           if(!obj1 || !obj1.hasOwnProperty(i) || obj2[i] !== obj1[i]) {
              ret[i] = obj2[i];
      }
   }
  }
  return ret;
};