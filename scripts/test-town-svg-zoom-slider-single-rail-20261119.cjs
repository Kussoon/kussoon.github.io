'use strict';
// TOWNMAP-SSOT-001 R-TOWN-20/21/22: compare a single right-side vertical rail.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const url='http://127.0.0.1:8765/v2/takarazuka-town-svg-zoom-slider-rail-20261119-pilot.html';
async function run(driver,name,w,h){
 const browser=await driver.launch();
 try{
  const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<600,hasTouch:w<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  const geometry=()=>page.evaluate(()=>{
    const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
    return {rail:rect('.map-right-rail'),full:rect('#fullscreen'),slider:rect('.map-zoom-slider'),
     sliderInput:rect('#zoomSlider'),plus:rect('.map-zoom-slider .zoom-mark:first-child'),minus:rect('.map-zoom-slider .zoom-mark:last-child'),
     textPlus:rect('#larger'),textMinus:rect('#smaller'),frame:rect('#frame'),
     k:d3.zoomTransform(document.querySelector('#map')).k,
     candidates:document.querySelectorAll('#labels g.label').length,
     forbidden:document.querySelectorAll('#zoomIn,#zoomOut').length,
     textButtons:[...document.querySelectorAll('#larger,#smaller')].map(e=>e.textContent.trim())};
  });
  const verifyLayout=g=>{
   assert.equal(g.forbidden,0,name+' must delete map +/-');
   assert.equal(g.candidates,136,name+' must retain candidates');
   assert(g.full.height>=40&&g.textPlus.height>=40,name+' controls accessible');
   assert(g.full.bottom+2<=g.plus.top,name+' slider plus begins below fullscreen');
   assert(g.plus.bottom<=g.sliderInput.top+2,name+' plus precedes the track');
   assert(g.sliderInput.bottom<=g.minus.top+2,name+' track ends before minus');
   assert(g.slider.bottom+2<=g.textPlus.top,name+' slider must end above text+');
   assert(Math.abs(g.full.right-g.textPlus.right)<10,name+' all controls on the same right edge');
   assert(g.rail.top>=g.frame.top-2&&g.rail.bottom<=g.frame.bottom+2,name+' rail inside frame');
   assert(g.sliderInput.height>=32,name+' slider must preserve useful length');
  };
  let g=await geometry();verifyLayout(g);
  const lowBefore=g.k;
  await page.locator('#zoomSlider').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}))});
  let hi=await geometry();assert(hi.k>lowBefore,name+' maximum at plus');
  await page.locator('#zoomSlider').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
  const lo=await geometry();assert(lo.k<hi.k,name+' minimum at minus');
  await page.locator('#reset').click();await page.waitForTimeout(200);
  g=await geometry();verifyLayout(g);
  await page.locator('#fullscreen').click();await page.waitForTimeout(350);
  const f=await geometry();verifyLayout(f);
  assert.equal(await page.locator('#fullscreen').innerText(),'戻る');
  await page.locator('#fullscreen').click();await page.waitForTimeout(350);
  assert.equal(await page.locator('#fullscreen').innerText(),'全画面');
  assert.deepEqual(errors,[],name+' page errors');
  console.log('PASS SINGLE_RAIL '+JSON.stringify({browser:name,width:w,frameHeight:g.frame.height,sliderLength:g.sliderInput.height,
   maxZoom:hi.k,minZoom:lo.k,controlsAligned:true,fullscreenLayout:true}));
 }finally{await browser.close()}
}
(async()=>{await run(chromium,'chromium-1280',1280,800);await run(webkit,'webkit-390',390,844);await run(webkit,'webkit-320',320,668)})().catch(e=>{console.error(e);process.exitCode=1});
