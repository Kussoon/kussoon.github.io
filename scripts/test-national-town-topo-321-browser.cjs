'use strict';
// TOWNMAP-SSOT-001: first real 321-name TopoJSON-to-shared-SVG browser proof.
// This validates town geometry and region splits, NOT V34 label-pixel parity.
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const url='http://127.0.0.1:8765/v2/town-map-shared-browser-topo-20261119-pilot.html';
async function test(driver,label,width,height){
 const browser=await driver.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},
   isMobile:width<600,hasTouch:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:90000});
  const initial=await page.evaluate(()=>{
   const paths=[...document.querySelectorAll('#areas path.town')];
   return {count:paths.length,names:paths.map(x=>x.dataset.name),
    regions:document.querySelector('#region').options.length,
    candidates:window.__townPreview.labelCandidateCount(),
    splitSource:window.__townPreview.sourceGeometryCount,
    splitPaths:window.__townPreview.regionPathCount,
    hasSplit:window.__townPreview.hasRegionPath('上甲東園','上ヶ原')&&
      window.__townPreview.hasRegionPath('上甲東園','甲東'),
    whole:window.__townPreview.pathFor('上甲東園',''),
    uegahara:window.__townPreview.pathFor('上甲東園','上ヶ原'),
    koto:window.__townPreview.pathFor('上甲東園','甲東'),
    ready:document.querySelector('#readiness').textContent};
  });
  assert.equal(initial.count,321,'accepted town census');
  assert.equal(new Set(initial.names).size,321,'unique town names');
  assert.equal(initial.regions,27,'full city plus 26 regions');
  assert(initial.candidates>=321,'one or more label candidate per town');
  assert.equal(initial.splitSource,6,'four Uegahara + two Koto original shapes');
  assert.equal(initial.splitPaths,2,'both regional contours');
  assert(initial.hasSplit);
  assert.notEqual(initial.whole,initial.uegahara,'split not identical to whole');
  assert.notEqual(initial.koto,initial.uegahara,'region-specific paths differ');
  assert.match(initial.ready,/321町名 \/ 26地域/);
  for(const region of ['上ヶ原','甲東']){
   await page.locator('#region').selectOption(region);
   await page.waitForTimeout(180);
   const scoped=await page.evaluate(()=>{
    const paths=[...document.querySelectorAll('#areas path.town')];
    const split=paths.find(x=>x.dataset.name==='上甲東園');
    return {region:window.__townPreview.currentRegion(),
      count:paths.length,active:window.__townPreview.activeCount(),
      names:new Set(paths.map(x=>x.dataset.name)).size,
      splitPath:split?.getAttribute('d'),
      expected:window.__townPreview.pathFor('上甲東園',window.__townPreview.currentRegion()),
      labels:document.querySelectorAll('#labels g.label').length};
   });
   assert.equal(scoped.region,region);
   assert(scoped.count<321&&scoped.count>0);
   assert.equal(scoped.count,scoped.active);
   assert.equal(scoped.names,scoped.count);
   assert.equal(scoped.splitPath,scoped.expected,'regional geometry must be selected');
   assert(scoped.labels>=scoped.count,'no names lost during region filter');
  }
  await page.locator('#quizOne').click();
  assert.equal(await page.evaluate(()=>window.__townPreview.quizMode()),1);
  const name=await page.evaluate(()=>window.__townPreview.quizTarget());
  await page.evaluate(name=>{
   const path=[...document.querySelectorAll('#areas path.town')].find(x=>x.dataset.name===name);
   if(!path)throw Error('quiz target has no projected SVG path: '+name);
   path.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  },name);
  assert(await page.locator('#quizNext').isVisible());
  await page.locator('#quizQuit').click();
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  await page.locator('#quizQuit').click();
  await page.locator('#quizBack').click();
  await page.locator('#region').selectOption('');
  assert.equal(await page.locator('#areas path.town').count(),321);
  await page.locator('#reading').click();
  assert(await page.locator('#labels .town-reading').count()>=321);
  await page.locator('#fullscreen').click();
  assert(await page.locator('body').evaluate(e=>e.classList.contains('fullscreen')));
  await page.locator('#fullscreen').click();
  assert.deepEqual(errors,[],'no browser errors');
  console.log('PASS NATIONAL_TOPO_321_BROWSER '+JSON.stringify({label,towns:321,regions:26,splitPaths:2,candidates:initial.candidates,quiz1:true,quiz2:true}));
 }finally{await browser.close()}
}
(async()=>{
 await test(chromium,'chromium-1280',1280,800);
 await test(webkit,'webkit-390',390,844);
})().catch(e=>{console.error(e);process.exitCode=1});
