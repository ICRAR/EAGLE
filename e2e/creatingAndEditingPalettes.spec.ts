import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Creating and editing Palettes', async ({ page }) => {
  
  await page.goto('http://localhost:8888/?tutorial=none');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);
  
  // set 'Expert' UI mode
  await TestHelpers.setUIMode(page, 'Expert');

  //expand the 'Builtin Components' palette
  await TestHelpers.expandPalette(page, 0);

  //right click the hello world app in the palette
  await page.locator('#palette_0_CopyApp').click({
    button: 'right'
  });

  //click menu item add to another palette
  await page.getByText('Add to another palette').click();

  //enter the new palette name and confirm
  await TestHelpers.enterCustomChoiceName(page, 'test');

  await page.close();
});

test('Palette loading continues after an unavailable palette', async ({ page }) => {
  await page.goto('http://localhost:8888/?tutorial=none');
  await expect(page).toHaveTitle(/EAGLE/);

  const result = await page.evaluate(async () => {
    const eagle = (window as any).eagle;
    const utils = (window as any).Utils;

    // keep track of the original httpPostJSON so we can restore it later
    const originalHttpPostJSON = utils.httpPostJSON;

    // define a minimal fake palette to return for the second palette request
    const paletteJson = JSON.stringify({
      modelData: { filePath: 'second.palette', fileType: 'Palette' },
      nodeDataArray: []
    });

    // overwrite httpPostJSON to simulate a failed fetch for the first palette and a successful fetch for the second
    utils.httpPostJSON = async (_url: string, request: { url: string }) => {
      if (request.url === 'missing.palette') {
        // failed fetch with no localStorage fallback.
        throw new Error('palette unavailable');
      }
      return paletteJson;
    };

    try {
      // Race palette loading against a timeout so a pending loader is
      // observable instead of allowing the test to hang indefinitely.
      const loadWithTimeout = (paletteList: any[]) => Promise.race([
        eagle.loadPalettes(paletteList),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('palette loading timed out')), 1000);
        })
      ]);

      // The failed first request must not prevent the later palette from loading.
      const firstFailureResult = await loadWithTimeout([
        { name: 'Missing Palette', filename: 'missing.palette', readonly: true, expanded: false },
        { name: 'Second Palette', filename: 'second.palette', readonly: true, expanded: false }
      ]);

      // Also cover the case when the final request fails, completion
      // must be checked after that palette's finally block clears isFetching.
      const finalFailureResult = await loadWithTimeout([
        { name: 'First Palette', filename: 'second.palette', readonly: true, expanded: false },
        { name: 'Final Missing Palette', filename: 'missing.palette', readonly: true, expanded: false }
      ]);

      // both placeholders should be present once each load is complete
      return {
        firstFailure: firstFailureResult.palettes.map((palette: any) => palette.fileInfo().name),
        finalFailure: finalFailureResult.palettes.map((palette: any) => palette.fileInfo().name)
      };
    } finally {
      // restore the original httpPostJSON so other tests are not affected
      utils.httpPostJSON = originalHttpPostJSON;
    }
  });

  expect(result).toEqual({
    firstFailure: ['Missing Palette', 'Second Palette'],
    finalFailure: ['First Palette', 'Final Missing Palette']
  });
  await page.close();
});
