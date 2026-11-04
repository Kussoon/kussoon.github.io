'use strict';
// Native Chromium touch events via CDP, rather than dispatching PointerEvents.
// This covers the shared input path, not Safari's device-specific behavior.
const assert=require('node:assert/strict');
const {start}=require('./helpers/nationwide-browser.cjs');
(async()=>{
 const app=await start(),{page}=app;
 try{
  await page.setViewportSize({width:390,height:844});await app.open();await app.pref('28');await app.select('28365');await page.click('#popupClose');
  const cdp=await app.context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await page.locator('#map').scrollIntoViewIfNeeded();const box=await page.locator('#map').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
  const point=(id,x,y)=>({id,x,y,radiusX:4,radiusY:4,force:1});
  const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  const before=await page.getAttribute('#map','viewBox');
  await send('touchStart',[point(1,cx-25,cy),point(2,cx+25,cy)]);
  for(let n=1;n<=5;n++)await send('touchMove',[point(1,cx-25-n*8,cy),point(2,cx+25+n*8,cy)]);
  await send('touchEnd',[]);
  const pinched=await page.getAttribute('#map','viewBox');
  assert(Number(pinched.split(' ')[2])<Number(before.split(' ')[2])*.8,'S17 actual two-finger input zooms');
  for(const [dx,dy] of [[70,0],[-70,0],[0,70],[0,-70]]){
   const previous=await page.getAttribute('#map','viewBox');
   await send('touchStart',[point(3,cx,cy)]);
   for(let n=1;n<=5;n++)await send('touchMove',[point(3,cx+dx*n/5,cy+dy*n/5)]);
   await send('touchEnd',[]);
   assert.notEqual(await page.getAttribute('#map','viewBox'),previous,'S16 real touch pan '+dx+','+dy);
   assert.equal(await page.inputValue('#region'),'28365','drag release must not deselect');
  }
  assert.equal(await page.locator('#map .chosen').count(),1);assert.equal(await page.locator('#officePopup').isVisible(),false);
  assert.deepEqual(app.errors,[]);console.log('PASS S14-S17: real Chromium two-finger pinch and four-direction touch pan after popup dismissal; iPhone Safari remains unverified');
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
