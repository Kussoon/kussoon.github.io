'use strict';
// TOWNMAP-SSOT-001 R-TOWN-22: nonvisual behavior matrix for B versus D.
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const versions=[
 '/v2/takarazuka-town-svg-community-b-20261119-pilot.html',
 '/v2/takarazuka-town-svg-gestures-d-20261119-pilot.html'
];
// Wheel events exist on desktop pointers, even for narrow responsive viewports.
const cases=[['chromium-1280',chromium,1280,800],['webkit-desktop-390',webkit,390,844],['webkit-desktop-320',webkit,320,668]];
async function run(browser,url,width,height){
 const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:false});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const k=()=>page.evaluate(()=>window.d3.zoomTransform(document.querySelector('#map')).k);
 try{
  await page.goto('http://127.0.0.1:8765'+url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  const box=await page.locator('#map').boundingBox();
  assert(box&&box.width>100&&box.height>100);
  const x=box.x+box.width*.45,y=box.y+box.height*.48;
  const before=await k();
  await page.mouse.move(x,y);await page.mouse.wheel(0,-280);
  await page.waitForTimeout(150);
  const unarmed=await k();
  assert(Math.abs(unarmed-before)<1e-8,'wheel acted before map arming');
  // Arm on a blank SVG background, not a town path with its own click handler.
  await page.mouse.click(box.x+12,box.y+12);
  await page.mouse.move(x,y);
  await page.mouse.wheel(0,-300);
  await page.waitForTimeout(200);
  const armed=await k();
  assert(armed>unarmed,'wheel did not zoom after map click');
  await page.locator('h1').click();await page.mouse.move(x,y);await page.mouse.wheel(0,-300);
  await page.waitForTimeout(200);
  const outside=await k();
  assert(Math.abs(outside-armed)<1e-8,'outside click did not disarm wheel');
  await page.mouse.dblclick(x,y);await page.waitForTimeout(900);
  const doubled=await k();
  assert(doubled>outside,'double click did not zoom');
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community="仁川"]').click());
  await page.locator('#quizOne').click();
  assert.equal(await page.locator('#quizPanel').isVisible(),true);
  await page.locator('#quizQuit').click();
  assert.equal(await page.locator('#quizResults').isVisible(),true);
  assert.deepEqual(errors,[],'browser page errors');
  return {loaded:true,unarmed:true,armed:true,disarmed:true,doubleClick:true,quizQuit:true};
 }finally{await page.close()}
}

// Real mobile WebKit contexts do not support mouse.wheel; check touch/tap
// and quiz state there, instead of pretending a mouse wheel is an iPhone input.
async function runMobile(browser,url,width,height){
 const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8765'+url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  const map=page.locator('#map'),box=await map.boundingBox();
  assert(box&&box.width>100&&box.height>100);
  await page.touchscreen.tap(box.x+box.width*.45,box.y+box.height*.48);
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community="仁川"]').click());
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  await page.locator('#quizQuit').click();
  assert.equal(await page.locator('#quizResults').isVisible(),true);
  assert.deepEqual(errors,[],'mobile WebKit page errors');
  return {loaded:true,touchTap:true,quizChoices:4,quizQuit:true};
 }finally{await page.close()}
}
(async()=>{
 for(const [name,driver,w,h] of cases){
  const browser=await driver.launch({headless:true});
  try{
   const before=await run(browser,versions[0],w,h);
   const after=await run(browser,versions[1],w,h);
   assert.deepEqual(after,before,'gesture behavior mismatch');
   console.log('PASS TOWN_GESTURES_D '+JSON.stringify({name,before,after}));
   if(name.startsWith('webkit')){
    const mobileBefore=await runMobile(browser,versions[0],w,h);
    const mobileAfter=await runMobile(browser,versions[1],w,h);
    assert.deepEqual(mobileAfter,mobileBefore,'mobile WebKit touch behavior mismatch');
    console.log('PASS TOWN_GESTURES_D_MOBILE '+JSON.stringify({name,mobileAfter}));
   }
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
