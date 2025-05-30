import { test, expect } from '@playwright/test';
import fs from 'fs';
import https from 'https';
import path from 'path';


const GRAPHS = [
  // graph_patterns
  //"https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/graph_patterns/LoopWithBranch.graph",
  //"https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/graph_patterns/genericScatter.graph"

  "data/LoopWithBranch.graph"
]

let graphJSON: string = "input";

test('Load/Save JSON Match', async ({ page }) => {
  for (const graph of GRAPHS){
    //await fetchGraph(graph);
    await readGraph(graph);

    await page.goto('http://localhost:8888/?tutorial=none');

    // navigate menus and click 
    await page.locator('#navbarDropdownGraph').click();
    await page.locator('#navbarDropdownGraphNew').hover();
    await page.locator('#createNewGraphFromJson').click();

    // short wait
    await page.waitForTimeout(500);

    // enter the graph JSON into the modal
    await page.evaluate(setEditorContent, graphJSON);

    // click the OK button on the modal
    await page.locator('#inputCodeModal .modal-footer button.btn-primary').click();

    // wait for the 'graph load success' notification to be shown
    await page.locator('div[data-notify="container"]').waitFor({state: 'attached'});

    // dismiss notification
    await page.locator('button[data-notify="dismiss"]').click();

    // wait for the 'graph load success' notification to be dismissed
    await page.locator('div[data-notify="container"]').waitFor({state: 'detached'});

    // click 'display as JSON' from the 'Graph' menu
    await page.locator('#navbarDropdownGraph').click();
    await page.locator('#displayGraphAsJson').click();

    // get JSON from modal
    const outputJSON: string = await page.evaluate(getEditorContent);
    
    const obj1 = JSON.parse(graphJSON);
    const obj2 = JSON.parse(outputJSON);

    const result0 = compareObj(obj1, obj2);
    const result1 = compareObj(obj2, obj1);

    // !!!!!!!!!!!!! CHECK FOR MATCH
    await expect(JSON.stringify(result0)).toBe("{}");
    await expect(JSON.stringify(result1)).toBe("{}");
  }

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
  graphJSON = fs.readFileSync(path.join(__dirname, filename)).toString();
}

const fetchGraph = (url) => {
    return new Promise<void>((resolve, reject) => {
        const req = https.request(url, res => {
            let rawData = "";

            res.on('data', (d) => {
                rawData += d;
            });

            res.on('end', () => {
                graphJSON = rawData;
                resolve();
            });
        });

        req.on('error', e => {
            console.error(e);
            reject(e);
        });

        req.end();
    });
};

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