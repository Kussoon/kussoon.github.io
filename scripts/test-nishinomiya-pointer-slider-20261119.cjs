'use strict';
// TOWNMAP-SSOT-001 comparison: real pointer dragging; min means whole city.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const url='http://127.0.0.1:8767/v2/nishinomiya-town-svg-single-rail-20261119-pilot.html';
async function run(engine,name,width,height){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
  const read=()=>page.evaluate(()=>{
   const r=s=>{const t=document.querySelector(s).getBoundingClientRect();return {left:t.left,top:t.top,bottom:t.bottom,width:t.width,height:t.height}};
   return {track:r('.zoom-slider-visual-track'),thumb:r('.zoom-slider-visual-thumb'),
    value:Number(document.querySelector('#zoomSlider').value),
    k:d3.zoomTransform(document.querySelector('#map')).k,
    plus:r('#zoomPlus'),minus:r('#zoomMinus'),
    city:document.querySelector('#communityCount').textContent,
    reset:document.querySelectorAll('#reset').length};
  });
  await page.locator('#communityToggle').click();
  await page.locator('#communityOptions button[data-community="上ヶ原"]').click();
  assert(!((await read()).city.includes('市全域')),'must select region for bottom reset test');
  // Mobile map is below the fold. Playwright mouse does not scroll on its
  // own; bring the rail into the viewport before sending real pointer moves.
  await page.locator('.zoom-slider-well').scrollIntoViewIfNeeded();
  const current=await read();
  const x=current.track.left+current.track.width/2;
  // First touch the current thumb and drag toward the top in real pointer events.
  await page.mouse.move(x,current.thumb.top+current.thumb.height/2);
  await page.mouse.down();
  const y1=current.track.top+current.thumb.height/2+current.track.height*.36;
  const y2=current.track.top+current.thumb.height/2+current.track.height*.18;
  await page.mouse.move(x,y1,{steps:4});
  const mid=await read();
  await page.mouse.move(x,y2,{steps:4});
  const top=await read();
  console.log('DEBUG_DRAG '+JSON.stringify({browser:name,start:current.value,mid:mid.value,top:top.value,thumbStart:current.thumb.top,thumbMid:mid.thumb.top,thumbTop:top.thumb.top,trackTop:current.track.top,trackHeight:current.track.height,y1,y2}));
  assert(top.value>mid.value,name+' upward drag must change value monotonically');
  assert(top.thumb.top<mid.thumb.top,name+' thumb must visually follow the finger');
  await page.mouse.up();await page.waitForTimeout(220);
  const zoomed=await read();
  assert(zoomed.k>0&&zoomed.value>0,name+' pointer gesture applied to map');
  // A direct press of each framed button must zoom without pointer dragging.
  const before=(await read()).k;
  await page.locator('#zoomPlus').click();const increased=(await read()).k;
  assert(increased>before,name+' plus must increase zoom');
  await page.locator('#zoomMinus').click();const decreased=(await read()).k;
  assert(decreased<increased,name+' minus must decrease zoom');
  // Drag thumb to the very bottom; it must restore 321-town whole-city view.
  await page.locator('.zoom-slider-well').scrollIntoViewIfNeeded();
  const u=await read(),ty=u.thumb.top+u.thumb.height/2;
  await page.mouse.move(x,ty);await page.mouse.down();
  await page.mouse.move(x,u.track.bottom+10,{steps:9});await page.mouse.up();
  await page.waitForTimeout(250);
  const whole=await read();
  assert.equal(whole.reset,0,name+' standalone city reset button absent');
  assert(whole.city.includes('市全域：321町名'),name+' minimum must return to whole city');
  assert.equal(Math.round(whole.value*10)/10,0,name+' thumb should reach minimum');
  assert(Math.abs(whole.thumb.bottom-whole.track.bottom)<2,name+' thumb must sit at bottom');
  assert.deepEqual(errors,[],name+' browser errors');
  console.log('PASS NISHINOMIYA_POINTER_SLIDER '+JSON.stringify({browser:name,thumbFollows:true,stepButtons:true,
    minimumReturnsWholeCity:true,readout:whole.city}));
 }finally{await browser.close()}
}
(async()=>{await run(chromium,'chromium-1280',1280,800);await run(webkit,'webkit-390',390,844);await run(webkit,'webkit-320',320,668)})().catch(e=>{console.error(e);process.exitCode=1});
