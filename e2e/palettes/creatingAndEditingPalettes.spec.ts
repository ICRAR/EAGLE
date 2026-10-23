import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';
import type { Eagle } from '../../src/Eagle';
import type { Utils } from '../../src/Utils';

test('Creating and editing Palettes', async ({ page }) => {
  await test.step('Open the palette editing workflow', async () => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);
    await TestHelpers.setUIMode(page, 'Expert');
    await TestHelpers.expandPalette(page, 0);
  });

  await test.step('Add a component to another palette', async () => {
    await page.locator('#palette_0_CopyApp').click({ button: 'right' });
    await page.getByText('Add to another palette').click();
    await TestHelpers.enterCustomChoiceName(page, 'test');
  });

  await page.close();
});

test('Palette loading continues after an unavailable palette', async ({ page }) => {
  await test.step('Prepare palette loading', async () => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);
  });

  // the fixture palette data that the mock serves for the 'second.palette' request
  const paletteJson = JSON.stringify({
    modelData: { filePath: 'second.palette', fileType: 'Palette' },
    nodeDataArray: []
  });

  const result = await test.step('Load palettes with a failed request', async () => page.evaluate(async () => {
    const eagle = (window as any).eagle as Eagle;
    const utils = (window as any).Utils as typeof Utils;

    // keep track of the original httpPostText so we can restore it later
    const originalHttpPostText = utils.httpPostText;

    // define a minimal fake palette to return for the second palette request
    const paletteJson = JSON.stringify({
      modelData: { filePath: 'second.palette', fileType: 'Palette' },
      nodeDataArray: []
    });

    // overwrite httpPostText to simulate a failed fetch for the first palette and a successful fetch for the second
    utils.httpPostText = async (_url: string, request: object) => {
      if (Reflect.get(request, 'url') === 'missing.palette') {
        // failed fetch with no localStorage fallback.
        throw new Error('palette unavailable');
      }
      return paletteJson;
    };

    try {
      // Race palette loading against a timeout so a pending loader is
      // observable instead of allowing the test to hang indefinitely.
      const loadWithTimeout = (paletteList: Parameters<Eagle['loadPalettes']>[0]) => Promise.race([
        eagle.loadPalettes(paletteList),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('palette loading timed out')), 1000);
        })
      ]) as Promise<Awaited<ReturnType<Eagle['loadPalettes']>>>;

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
      // the cached localStorage data for the fixture proves the successful-load
      // path ran (it is only written after the fixture palette was loaded)
      const secondPaletteCache = localStorage.getItem('second.palette');
      localStorage.removeItem('second.palette');

      return {
        firstFailure: firstFailureResult.palettes.map((palette) => palette.fileInfo().name),
        finalFailure: finalFailureResult.palettes.map((palette) => palette.fileInfo().name),
        secondPaletteCache
      };
    } finally {
      // restore the original httpPostText so other tests are not affected
      utils.httpPostText = originalHttpPostText;
    }
  }));

  await test.step('Verify later palettes still load', async () => {
    expect(result).toEqual({
      firstFailure: ['Missing Palette', 'Second Palette'],
      finalFailure: ['First Palette', 'Final Missing Palette'],
      // the fixture palette data was fetched via the mock and cached, proving
      // the successful-load path was exercised
      secondPaletteCache: paletteJson
    });
  });

  await page.close();
});

test('Load Palette navbar option opens the local file picker', async ({ page }) => {
  await test.step('Open the palette menu', async () => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);
    await TestHelpers.setUIMode(page, 'Expert');
    await page.locator('#navbarDropdownPalette').click();
    await page.locator('span.dropDropDownParent').filter({ has: page.locator('#loadPalette') }).hover();
  });

  await test.step('Open the local file picker', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#loadPalette').click();
    await fileChooserPromise;
  });

  await page.close();
});
