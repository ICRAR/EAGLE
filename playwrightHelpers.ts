export async function enableMouseCursor(page){
  await page.evaluate(() => {
    const bar = document.createElement('div');
    bar.textContent = 'Chrome is being controlled by automated test software.';
    bar.style.cssText = 'position: fixed; top: 0; width: 100%; background: lightgrey; color: black; text-align: left; padding: 8px; font-size: 14px; border-bottom: 1px solid grey; z-index: 9999;';
    document.body.style.paddingTop = '30px';
    document.documentElement.prepend(bar);

  });
}