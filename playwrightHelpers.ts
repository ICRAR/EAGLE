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
      //getting the fake cursor element note* the document is only reachable in the evaluate function
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

export async function textNotification(page, title, text, timeoutDuration){
  return new Promise<void>(async function(resolve){

    await page.evaluate(({title,text,timeoutDuration}) => {
      //creating and attatching a text box with the requested text note* the document is only reachable in the evaluate function
      const bar = document.createElement('div');
      bar.id = 'playwrightVideoNotification'
      bar.innerHTML = '<b>' + title + '</br></b>' + text;
      bar.style.cssText = 'position: fixed; top: 100px; left: 50%; transform: translateX(-50%); background: #d8ddf0; color: black; text-align: left; padding: 8px; font-size: 14px; border: 1px solid #002349; z-index: 9999; pointer-events:none;';
      document.body.style.paddingTop = '30px';
      document.documentElement.prepend(bar);

      //remove the text box after a certain time has passed
      setTimeout(() => {
        document.getElementById('playwrightVideoNotification')?.remove()
      }, timeoutDuration);
    },{title,text,timeoutDuration});
    //we will resolve the function after the same time has passed to continue the test
    //resolve is not reachable from inside the evaluate and i wasnt able to pass it in.
    await page.waitForTimeout(timeoutDuration);
    resolve()
  })
}

export async function explainElement(page, targetElement, direction, message, timeout_time){

  //i need to process this first then pass it into the evaluate function because i can only pass in numbers on strings.
  const target = await targetElement.boundingBox()
  const box_top = target.y;
  const box_bottom = target.y + target.height;
  const box_left = target.x;
  const box_right = target.x + target.width;
  
  await page.evaluate(({message, direction, box_top, box_bottom, box_left, box_right, timeout_time}) => {
    let box_trans;
    let box_offset;
    let top;
    let left;
    let arrowBorderTop;
    let arrowBorderBottom;
    let arrowBorderLeft;
    let arrowBorderRight;
    let arrowTop;
    let arrowLeft;
    let arrow_trans;

    switch (direction) {
      case 'left':
        top = box_top + 0.5*(box_bottom - box_top);
        left = box_left
        box_trans = '-100%,-50%';
        box_offset = '-10px,0';
        arrowBorderTop = '5px solid transparent';
        arrowBorderBottom = '5px solid transparent';
        arrowBorderLeft = '10px solid #f8e5b4';
        arrowBorderRight = '0';
        arrowTop = '50%';
        arrowLeft = '100%';
        arrow_trans = '0%, -50%';
        break;
      case 'right':
        top = box_top + 0.5*(box_bottom - box_top);
        left = box_right;
        box_trans = '0%,-50%';
        box_offset = '10px,0';
        arrowBorderTop = '5px solid transparent';
        arrowBorderBottom = '5px solid transparent';
        arrowBorderLeft = '0';
        arrowBorderRight = '10px solid #f8e5b4';
        arrowTop = '50%';
        arrowLeft = '0%';
        arrow_trans = '-100%,-50%';
        break;
      case 'up':
        top = box_top;
        left = box_left + 0.5*(box_right - box_left);
        box_trans = '-50%,-100%';
        box_offset = '0,-10px';
        arrowBorderTop = '10px solid #f8e5b4';
        arrowBorderBottom = '0';
        arrowBorderLeft = '5px solid transparent';
        arrowBorderRight = '5px solid transparent';
        arrowTop = '100%';
        arrowLeft = '50%';
        arrow_trans = '-50%,0%';
        break;
      case 'down':
        top = box_bottom;
        left = box_left + 0.5*(box_right - box_left);
        box_trans = '-50%,0%';
        box_offset = '0,10px';
        arrowBorderTop = '0';
        arrowBorderBottom = '10px solid #f8e5b4';
        arrowBorderLeft = '5px solid transparent';
        arrowBorderRight = '5px solid transparent';
        arrowTop = '0%';
        arrowLeft = '50%';
        arrow_trans = '-50%,-100%';
        break;
    }

    return new Promise<void>(resolve => {
        const noteBox = document.createElement('div');
        noteBox.textContent = message;
        noteBox.style['transform-box'] = 'border-box';
        noteBox.style['top'] = top + 'px';
        noteBox.style['left'] = left + 'px';
        noteBox.style['max-width'] = '300px';
        noteBox.style['min-width'] = '300px';
        noteBox.style['transform'] = 'translate('+ box_trans + ') translate(' + box_offset + ')';
        noteBox.style['position'] = 'absolute';
        noteBox.style['font-size'] = 'medium';
        noteBox.style['box-shadow'] = '10px 10px 30px #555';
        noteBox.style['padding'] = '16px';
        //noteBox.style['border'] = '3px solid black';
        noteBox.style['border-radius'] = '.25rem';
        noteBox.style['background-color'] = '#f8e5b4';
        noteBox.style['z-index'] = '999999';

        const arrow = document.createElement('div')
        arrow.style['width'] = '0';
        arrow.style['height'] = '0';
        arrow.style['border-top'] = arrowBorderTop;
        arrow.style['border-bottom'] = arrowBorderBottom;
        arrow.style['border-left'] = arrowBorderLeft;
        arrow.style['border-right'] = arrowBorderRight;
        arrow.style['position'] = 'absolute';
        arrow.style['top'] = arrowTop;
        arrow.style['left'] = arrowLeft;
        arrow.style['transform'] = 'translate('+ arrow_trans + ')';

        noteBox.appendChild(arrow);
        document.body.appendChild(noteBox);
        setTimeout(() => {
            document.body.removeChild(noteBox);
            resolve();
        }, timeout_time);
    });
  },{message, direction, box_top, box_bottom, box_left, box_right, timeout_time});
}