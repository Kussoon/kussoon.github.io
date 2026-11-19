'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const before='/v2/takarazuka-town-svg-gestures-d-20261119-pilot.html';
const after='/v2/takarazuka-town-svg-label-scheduler-e-20261119-pilot.html';
const cases=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
async function inspect(browser,url,width,height){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8765'+url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  async function snapshot(){
   await page.waitForTimeout(300);
   return page.evaluate(()=>{
    const groups=[...document.querySelectorAll('g.label')];
    return {
     count:groups.length,
     labels:groups.map(el=>({name:el.__data__?.name,key:el.__data__?.key,visible:el.dataset.visible,display:el.style.display,
       transform:el.getAttribute('transform'),font:el.querySelector('text')?.getAttribute('font-size')})),
     density:document.querySelector('#densityStatus')?.textContent
    };
   });
  }
  const initial=await snapshot();
  await page.evaluate(()=>document.getElementById('zoomPlus').click());
  const zoomed=await snapshot();
  await page.evaluate(()=>document.getElementById('zoomMinus').click());
  const reset=await snapshot();
  assert.equal(initial.count>125,true);
  assert.deepEqual(errors,[]);
  return {initial,zoomed,reset};
 }finally{await page.close()}
}
(async()=>{
 for(const [name,driver,w,h] of cases){
  const browser=await driver.launch({headless:true});
  try{
   const oldVersion=await inspect(browser,before,w,h);
   const newVersion=await inspect(browser,after,w,h);
   assert.deepEqual(newVersion,oldVersion,name+' label geometry and visibility drift');
   console.log('PASS TOWN_LABEL_SCHEDULER_BROWSER '+JSON.stringify({name,labels:oldVersion.initial.count,stages:3}));
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
