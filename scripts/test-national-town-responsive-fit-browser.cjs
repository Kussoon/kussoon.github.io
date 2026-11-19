'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const base='http://127.0.0.1:8765';
const before='/v2/town-map-shared-browser-topo-20261119-pilot.html';
const after='/v2/town-map-shared-browser-responsive-20261119-pilot.html';
async function measurements(page){
 return page.evaluate(()=>{
  const svg=document.querySelector('#map'),areas=document.querySelector('#areas'),b=svg.getBoundingClientRect();
  const r=areas.getBoundingClientRect(),v=svg.viewBox.baseVal;
  const t=window.d3.zoomTransform(svg);
  return {viewport:{width:b.width,height:b.height},viewBox:{width:v.width,height:v.height},
   map:{width:r.width,height:r.height,x:r.x-b.x,y:r.y-b.y},
   fractions:{width:r.width/b.width,height:r.height/b.height,
    cx:(r.left+r.width/2-b.left)/b.width,
    cy:(r.top+r.height/2-b.top)/b.height},
   zoom:t.k,region:window.__townPreview.currentRegion(),
   towns:window.__townPreview.activeCount(),candidates:window.__townPreview.labelCandidateCount(),
   quiz:window.__townPreview.quizMode()};
 });
}
function centered(a,context){
 assert(Math.abs(a.viewBox.width-a.viewport.width)<1.5,context+' viewBox width');
 assert(Math.abs(a.viewBox.height-a.viewport.height)<1.5,context+' viewBox height');
 assert(Math.max(a.fractions.width,a.fractions.height)>.70,context+' town too small '+JSON.stringify(a.fractions));
 assert(Math.abs(a.fractions.cx-.5)<.045,context+' off center X '+a.fractions.cx);
 assert(Math.abs(a.fractions.cy-.5)<.045,context+' off center Y '+a.fractions.cy);
 assert(a.map.x>=-3&&a.map.y>=-3,context+' beyond viewport top/left');
 assert(a.map.x+a.map.width<=a.viewport.width+3&&
   a.map.y+a.map.height<=a.viewport.height+3,context+' beyond viewport right/bottom');
}
async function verify(engine,label,w,h){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<600,
   hasTouch:w<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const old=await browser.newPage({viewport:{width:w,height:h},isMobile:w<600,
   hasTouch:w<600,deviceScaleFactor:2});
  await old.goto(base+before,{waitUntil:'domcontentloaded',timeout:60000});
  await old.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:90000});
  await old.waitForTimeout(280);
  const baseline=await measurements(old);
  await old.close();
  await page.goto(base+after,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:90000});
  await page.waitForTimeout(280);
  let curr=await measurements(page);
  centered(curr,label+' initial');
  assert.equal(curr.towns,321);
  assert.equal(curr.candidates,323,'initial label candidates unchanged');
  const beforeMax=Math.max(baseline.fractions.width,baseline.fractions.height);
  const afterMax=Math.max(curr.fractions.width,curr.fractions.height);
  console.log('RESPONSIVE_FIT_BEFORE_AFTER '+JSON.stringify({label,beforeMax,afterMax,
    initialCenter:[curr.fractions.cx,curr.fractions.cy]}));
  if(w<600){
   assert(afterMax>beforeMax*1.5,
     label+' mobile map must be materially larger than the old page');
  }else{
   assert(afterMax>=beforeMax*.98,
     label+' desktop map must not become smaller');
  }
  const scenarios=['西宮浜','山口','上ヶ原','甲東'];
  const regions=[];
  for(const name of scenarios){
   await page.locator('#region').selectOption(name);
   await page.waitForTimeout(220);
   curr=await measurements(page);
   centered(curr,label+' '+name);
   assert.equal(curr.region,name);
   assert(curr.towns>0&&curr.towns<321);
   regions.push({region:name,towns:curr.towns,width:curr.fractions.width,height:curr.fractions.height});
  }
  await page.locator('#region').selectOption('');
  await page.waitForTimeout(220);
  curr=await measurements(page);centered(curr,label+' city reset');
  assert.equal(curr.towns,321);
  // Fullscreen keeps the current world position and zoom, not forced re-fit.
  await page.locator('#zoomPlus').click();
  await page.waitForTimeout(220);
  const zoomed=await measurements(page);
  await page.locator('#fullscreen').click();
  await page.waitForTimeout(400);
  const full=await measurements(page);
  assert(Math.abs(full.zoom-zoomed.zoom)<1e-5,label+' fullscreen lost zoom');
  assert(Math.abs(full.viewBox.width-full.viewport.width)<1.5,'fullscreen user units x');
  assert(Math.abs(full.viewBox.height-full.viewport.height)<1.5,'fullscreen user units y');
  await page.locator('#fullscreen').click();
  await page.waitForTimeout(400);
  const restored=await measurements(page);
  assert(Math.abs(restored.zoom-zoomed.zoom)<1e-5,label+' fullscreen exit lost zoom');
  assert.equal(restored.towns,321);
  await page.locator('#reading').click();
  assert(await page.locator('#labels tspan.town-reading').count()>0);
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  await page.locator('#quizQuit').click();
  assert.deepEqual(errors,[],label+' uncaught browser errors');
  console.log('PASS TOWN_RESPONSIVE_CENTRAL_FIT '+JSON.stringify({label,
   baselineMaxFraction:Math.max(baseline.fractions.width,baseline.fractions.height),
   correctedMaxFraction:Math.max(curr.fractions.width,curr.fractions.height),
   center:[curr.fractions.cx,curr.fractions.cy],regions,fullscreen:true}));
 }finally{await browser.close()}
}
(async()=>{
 await verify(chromium,'chromium-1280',1280,800);
 await verify(webkit,'webkit-390',390,844);
 await verify(webkit,'webkit-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
