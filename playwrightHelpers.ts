export async function enableMouseCursor(page){
  await page.evaluate(() => {
    const arrowContainer = document.createElement('div');
    arrowContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 35px; height:35px; z-index: 9999; transition:left 0.7s ease-in-out, top 0.7s ease-in-out; pointer-events:none;';
    arrowContainer.id = 'videoArrowContainer'
    const arrow = '<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 80 80"> <path fill="#fff" d="M34.558 50.385L19.5 62.776 19.5 2.176 62.902 43.972 43.641 46.452 55.491 74.405 46.409 78.341z"></path><path fill="#788b9c" d="M20,3.351l41.805,40.258L44.23,45.871l-1.308,0.168l0.515,1.214l11.399,26.89l-8.164,3.538 L35.279,50.806l-0.522-1.232l-1.034,0.851L20,61.718V3.351 M19,1v62.836l15.359-12.639L46.145,79l9.999-4.334L44.358,46.863 L64,44.335L19,1L19,1z"></path> </svg>';
    arrowContainer.insertAdjacentHTML( 'beforeend', arrow )
    document.documentElement.prepend(arrowContainer);
  });
}

export async function moveMouseCursor(page, targetElement){
  return new Promise<void>(async function(resolve){
    //readying the new position elements. we cant pass the element itself into the evaluate funtion.
    const newPos = await targetElement.boundingBox()
    const newX = await newPos.x + newPos.width / 2
    const newY = await newPos.y + newPos.height / 2
  
    await page.evaluate(({newX, newY}) => {
      //getting the fake cursor element note* the document is only reachable in the evaluate
      const cursor =  document.getElementById('videoArrowContainer');
  
      //setting the new position on screen
      if(cursor){
        cursor.style.top = newY + 'px';
        cursor.style.left = newX + 'px';
      }
    },{newX, newY})
    
    await page.waitForTimeout(700);
    resolve()
  })
}

export async function textNotification(page, title, text){
  return new Promise<void>(async function(resolve){
    await page.evaluate(({title,text}) => {
      const bar = document.createElement('div');
      bar.id = 'playwrightVideoNotification'
      bar.innerHTML = '<b>' + title + '</br></b>' + text;
      bar.style.cssText = 'position: fixed; top: 100px; left: 50%; transform: translateX(-50%); background: #d8ddf0; color: black; text-align: left; padding: 8px; font-size: 14px; border: 1px solid #002349; z-index: 9999; pointer-events:none;';
      document.body.style.paddingTop = '30px';
      document.documentElement.prepend(bar);
      setTimeout(() => {
        document.getElementById('playwrightVideoNotification')?.remove()
      }, 1000);
    },{title,text});
    await page.waitForTimeout(1000);
    resolve()
  })
}