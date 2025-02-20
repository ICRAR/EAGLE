export async function enableMouseCursor(page){
  await page.evaluate(() => {
    const arrowContainer = document.createElement('div');
    arrowContainer.style.cssText = 'position: sticky; top: 0; width: 35px; height:35px; color: black; text-align: left; z-index: 9999;';
    arrowContainer.className = 'videoArrowContainer'
    const arrow = '<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 80 80"> <path fill="#fff" d="M34.558 50.385L19.5 62.776 19.5 2.176 62.902 43.972 43.641 46.452 55.491 74.405 46.409 78.341z"></path><path fill="#788b9c" d="M20,3.351l41.805,40.258L44.23,45.871l-1.308,0.168l0.515,1.214l11.399,26.89l-8.164,3.538 L35.279,50.806l-0.522-1.232l-1.034,0.851L20,61.718V3.351 M19,1v62.836l15.359-12.639L46.145,79l9.999-4.334L44.358,46.863 L64,44.335L19,1L19,1z"></path> </svg>';
    arrowContainer.insertAdjacentHTML( 'beforeend', arrow )
    document.documentElement.prepend(arrowContainer);
  });
}

export async function moveMouseCursor(page, selector){
  const element = document.getElementById(selector)
  console.log(element)
  const newPos = element?.getBoundingClientRect()

  await page.evaluate(() => {
    // $('.videoArrowContainer').css({'top' : newPos?.y , 'left' : newPos?.x})
  });
}

export async function addTextBox(page){
  await page.evaluate(() => {
    const bar = document.createElement('div');
    bar.textContent = 'Chrome is being controlled by automated test software.';
    bar.style.cssText = 'position: fixed; top: 0; width: 100%; background: lightgrey; color: black; text-align: left; padding: 8px; font-size: 14px; border-bottom: 1px solid grey; z-index: 9999;';
    document.body.style.paddingTop = '30px';
    document.documentElement.prepend(bar);

  });
}