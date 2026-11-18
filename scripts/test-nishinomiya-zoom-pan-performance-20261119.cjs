'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const base='http://127.0.0.1:8765/v2/nishinomiya-town-svg-single-rail-20261119-pilot.html';
async function run(engine,name,width,height){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/v2/nishinomiya-town-svg-single-rail-20261119-pilot.html',async route=>{
   const response=await route.fetch();
   const original=await response.text();
   const marker='function updateLabelSize(){';
   assert.equal(original.split(marker).length-1,1);
   const replacement=marker+'window.__labelMeasureCount=(window.__labelMeasureCount||0)+1;';
   await route.fulfill({response,body:original.replace(marker,replacement),headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
  });
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
  await page.waitForTimeout(300);
  const initial=await page.evaluate(()=>({count:window.__labelMeasureCount,labels:document.querySelectorAll('#labels g.label').length,
   names:new Set([...document.querySelectorAll('#labels tspan.town-name')].map(x=>x.textContent)).size}));
  assert.equal(initial.labels,324);assert.equal(initial.names,321);
  // A 20-step continuous slider gesture must not run expensive browser
  // text-geometry measurement 20 times. The same accepted slider is used.
  const input=await page.evaluate(()=>{
   const el=document.querySelector('#zoomSlider');
   const start=performance.now(),before=window.__labelMeasureCount||0;
   for(let n=0;n<20;n++){
    el.value=String(20+n*3);
    el.dispatchEvent(new Event('input',{bubbles:true}));
   }
   return {durationMs:performance.now()-start,delta:(window.__labelMeasureCount||0)-before};
  });
  assert.equal(input.delta,0,name+' must not synchronously measure 324 labels for 20 inputs');
  const during=await page.evaluate(()=>{
   const t=document.querySelector('#labels g.label')?.getAttribute('transform')||'';
   const m=t.match(/scale\(([^)]+)\)/);
   return {scale:m?Number(m[1]):NaN,k:d3.zoomTransform(document.querySelector('#map')).k};
  });
  assert(Math.abs(during.scale* during.k-1)<0.002,name+' labels must stay at constant pixel size during gesture');
  await page.waitForTimeout(250);
  const after=await page.evaluate(()=>({count:window.__labelMeasureCount,
    labels:document.querySelectorAll('#labels g.label').length,k:d3.zoomTransform(document.querySelector('#map')).k}));
  assert.equal(after.count,initial.count+1,name+' must reflow exactly once after gesture settles');
  assert.equal(after.labels,324);
  await page.locator('#reset').click();
  await page.waitForTimeout(270);
  const final=await page.evaluate(()=>({count:window.__labelMeasureCount,labels:document.querySelectorAll('#labels g.label').length}));
  assert.equal(final.labels,324);
  assert.deepEqual(errors,[]);
  console.log('PASS NISHINOMIYA_ZOOM_PERF '+JSON.stringify({browser:name,slider20StepsMs:Math.round(input.durationMs),
    synchronousGlyphPasses:input.delta,settledGlyphPasses:after.count-initial.count,
    finalLabels:final.labels}));
 }finally{await browser.close()}
}
(async()=>{await run(chromium,'chromium-1280',1280,800);await run(webkit,'webkit-390',390,844)})().catch(e=>{console.error(e);process.exitCode=1});
