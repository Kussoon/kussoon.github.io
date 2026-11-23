'use strict';
// Trace who switches the town-label mode back to centered, without modifying
// the map's source in GitHub. The hooks only append diagnostic records.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out='nishinomiya-v31-event-provenance';fs.mkdirSync(out,{recursive:true});
const host=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const configs=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
const targets={V28:'/v2/nishinomiya-town-svg-master-v28-20261117-pilot.html',V30:'/v2/nishinomiya-town-svg-master-v30-20261117-pilot.html'};
const substitutions=[
 ['function cLabelReflow(){',`function cLabelReflow(){window.__traceTown('reflow-call',{stack:(new Error()).stack?.split('\\n').slice(1,5).join(' | ')});`],
 ['function onZoom(event){',`function onZoom(event){window.__traceTown('onZoom-entry',{sourceType:event.sourceEvent?.type||null,depth:typeof programmaticFitDepth==='number'?programmaticFitDepth:null});`],
 ['function regionFit(){',`function regionFit(){window.__traceTown('regionFit-entry');`],
 ['function reset(){',`function reset(){window.__traceTown('reset-entry');`],
 ['function showCommunity(){',`function showCommunity(){window.__traceTown('showCommunity-entry');`],
 ['function updateLabelSize(){',`function updateLabelSize(){window.__traceTown('label-update-entry');`]
];
const head=`window.__townTrace=[];
window.__traceTown=(event,details={})=>{
 const entries=window.__townTrace;
 if(entries.length>1200)return;
 entries.push({event,region:communityChoice,mode:cLabelMode,readingOn,fontPct,
   cache:cLabelReflowMetrics.size,depth:typeof programmaticFitDepth==='number'?programmaticFitDepth:null,...details});
};
window.__townTraceDump=()=>window.__townTrace;
`;
async function load(browser,cfg,version,url){
 const page=await browser.newPage({viewport:{width:cfg[2],height:cfg[3]},deviceScaleFactor:2,isMobile:cfg[2]<600,hasTouch:cfg[2]<600});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**'+url+'*',async route=>{
  const response=await route.fetch();let html=await response.text();
  for(const [old,repl] of substitutions){
   assert.equal(html.split(old).length,2,version+' unique injection marker '+old);
   html=html.replace(old,repl);
  }
  const marker="function cLabelReflow(){";
  assert.equal(html.split(marker).length,2,'head injection anchor');
  html=html.replace(marker,head+marker);
  await route.fulfill({response,body:html,headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 await page.goto(host+url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
 const click=async id=>{await page.locator('#'+id).click();await page.waitForTimeout(80)};
 const choose=async name=>{await page.evaluate(n=>{const b=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community===n);if(!b)throw Error('missing region '+n);b.click()},name);await page.waitForTimeout(100)};
 await click('reading');await click('larger');await click('reading');await click('size');
 await choose('安井');await choose('香櫨園');await choose('');
 const trace=await page.evaluate(()=>window.__townTraceDump());
 assert.deepEqual(errors,[],'browser errors');
 await page.close();
 return {version,trace,modeCalls:trace.filter(e=>e.event==='reflow-call'),zoomEvents:trace.filter(e=>e.event==='onZoom-entry')};
}
(async()=>{
 for(const cfg of configs){
  const browser=await cfg[1].launch({headless:true});
  try{
   const versions=[];
   for(const [version,url] of Object.entries(targets))versions.push(await load(browser,cfg,version,url));
   fs.writeFileSync(path.join(out,cfg[0]+'.json'),JSON.stringify(versions,null,2));
   for(const x of versions){
    console.log('V31_EVENT_PROVENANCE '+JSON.stringify({
     screen:cfg[0],version:x.version,reflowCalls:x.modeCalls.map(t=>({region:t.region,modeBefore:t.mode,depth:t.depth,stack:t.stack})),
     zoomEvents:x.zoomEvents.map(t=>({region:t.region,sourceType:t.sourceType,depth:t.depth,mode:t.mode})),
     last:x.trace.slice(-2)
    }));
   }
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
