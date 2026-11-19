'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const OLD='/v2/takarazuka-town-svg-gestures-d-20261119-pilot.html';
const NEW='/v2/town-map-shared-browser-labels-20261119-pilot.html';
async function snapshot(page,fromOld){
 await page.waitForTimeout(250);
 return page.evaluate(fromOld=>{
  const nodes=[...document.querySelectorAll('#labels g.label')];
  return nodes.map(node=>{
   const d=node.__data__;
   return {key:d.key,point:fromOld?d.anchor:d.point,reading:d.reading,name:d.name,secondary:Boolean(d.secondary)};
  }).sort((a,b)=>a.key.localeCompare(b.key));
 },fromOld);
}
async function inspect(engine,width,height,label){
 const browser=await engine.launch({headless:true});
 try{
  const opts={viewport:{width,height},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:2};
  const old=await browser.newPage(opts),fresh=await browser.newPage(opts);
  const errors=[];old.on('pageerror',e=>errors.push('legacy: '+e.message));
  fresh.on('pageerror',e=>errors.push('new: '+e.message));
  await old.goto('http://127.0.0.1:8765'+OLD,{waitUntil:'domcontentloaded',timeout:60000});
  await fresh.goto('http://127.0.0.1:8765'+NEW,{waitUntil:'domcontentloaded',timeout:60000});
  await old.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  await fresh.waitForFunction(()=>window.__townPreview?.labelCandidateCount()>125,null,{timeout:60000});
  const legacy=await snapshot(old,true),newLabels=await snapshot(fresh,false);
  assert.equal(legacy.length,newLabels.length,'initial candidate count must match');
  assert(legacy.length>125,'multipart candidate labels must exceed town count');
  for(let i=0;i<legacy.length;i++){
   const a=legacy[i],b=newLabels[i];
   assert.equal(b.key,a.key,'candidate key');
   assert.equal(b.name,a.name,'candidate town');
   assert.equal(b.reading,a.reading,'verified reading');
   assert.equal(b.secondary,a.secondary,'secondary eligibility');
   for(let axis=0;axis<2;axis++)assert(Math.abs(a.point[axis]-b.point[axis])<1e-8,'candidate anchor must be unchanged');
  }
  await old.evaluate(()=>document.querySelector('#communityOptions button[data-community="仁川"]').click());
  await fresh.locator('#region').selectOption('仁川');
  const oldScoped=await snapshot(old,true),newScoped=await snapshot(fresh,false);
  assert.deepEqual(newScoped,oldScoped,'region-scoped candidate data must match exactly');
  const distinct=new Set(newLabels.map(x=>x.name));
  assert.equal(distinct.size,125);
  await fresh.locator('#reading').click();
  assert.equal(await fresh.locator('#labels tspan.town-reading').count(),newScoped.length);
  await fresh.locator('#zoomPlus').click();
  await fresh.waitForTimeout(250);
  assert.equal(await fresh.locator('#labels g.label').count(),newScoped.length);
  await fresh.locator('#quizTwo').click();
  assert.equal(await fresh.locator('#quizChoices button').count(),4);
  await fresh.locator('#quizQuit').click();
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log('PASS NATIONAL_MULTIPART_LABEL_PARITY '+JSON.stringify({label,candidates:legacy.length,regionCandidates:oldScoped.length,towns:125}));
 }finally{await browser.close()}
}
(async()=>{
 await inspect(chromium,1280,800,'chromium-1280');
 await inspect(webkit,390,844,'webkit-390');
})().catch(e=>{console.error(e);process.exitCode=1});
