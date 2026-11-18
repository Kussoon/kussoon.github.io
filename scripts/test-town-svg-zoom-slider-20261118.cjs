'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const base='http://127.0.0.1:8765/v2/takarazuka-town-svg-zoom-slider-20261118-pilot.html';
async function run(driver,name,width,height){
 const browser=await driver.launch();
 try{
  const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  const state=()=>page.evaluate(()=>({k:d3.zoomTransform(document.querySelector('#map')).k,
   slider:Number(document.querySelector('#zoomSlider').value),labelCount:document.querySelectorAll('#labels g.label').length,
   controlHeight:document.querySelector('#zoomIn').getBoundingClientRect().height,
   fullHeight:document.querySelector('#fullscreen').getBoundingClientRect().height
  }));
  let s=await state();assert.equal(s.labelCount,136);assert(s.controlHeight>=40);assert(s.fullHeight>=42);
  const before=s.k;
  await page.locator('#zoomSlider').evaluate(el=>{el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}))});
  s=await state();assert(s.k>before,'slider must zoom in');
  assert(Math.abs(s.slider-90)<1,'slider position must reflect requested zoom');
  await page.locator('#zoomSlider').evaluate(el=>{el.value='20';el.dispatchEvent(new Event('input',{bubbles:true}))});
  const low=await state();assert(low.k<s.k,'slider must zoom out');
  await page.locator('#zoomIn').click();
  await page.waitForFunction(k=>d3.zoomTransform(document.querySelector('#map')).k>k+1e-6,low.k,{timeout:5000});
  await page.waitForTimeout(170);
  const plus=await state();assert(plus.slider>low.slider,'plus button must update thumb');
  await page.locator('#reset').click();await page.waitForTimeout(180);
  const reset=await state();assert(reset.k>0&&reset.slider>=0&&reset.slider<=100);
  const err=errors.filter(Boolean);assert.deepEqual(err,[]);
  console.log('PASS TOWN_ZOOM_SLIDER '+JSON.stringify({browser:name,buttons:plus.controlHeight,fullscreen:plus.fullHeight,labels:s.labelCount,sliderIn:true,sliderOut:true,plusSync:true,resetSync:true}));
 }finally{await browser.close()}
}
(async()=>{await run(chromium,'chromium-1280',1280,800);await run(webkit,'webkit-390',390,844)})().catch(e=>{console.error(e);process.exitCode=1});
