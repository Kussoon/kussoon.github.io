'use strict';
// V29: observe actual cached label-anchor state across interaction sequence.
// No changes to C, V25 or V28 application sources; transient HTML hook only.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out='nishinomiya-v29-label-state';fs.mkdirSync(out,{recursive:true});
const host=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const cases=[['pc-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
const urls={V25:'/v2/nishinomiya-town-svg-master-v25-20261117-pilot.html',V28:'/v2/nishinomiya-town-svg-master-v28-20261117-pilot.html'};
const hook=`window.__townLabelState=()=>({
 mode:cLabelMode,rebaseline:cRebaseline,readingOn,fontPct,
 fontPx:fontPixels(),transformK:transform.k,baselineCache:cBaselineLabelShifts.size,reflowCache:cLabelReflowMetrics.size,
 region:communityChoice,
 sample:[...labels.selectAll('g.label').nodes()].filter(g=>['西宮浜','安井町','川添町','上甲東園'].includes(g.querySelector('.town-name')?.textContent)).map(g=>{
  const t=g.querySelector('.town-name'),b=t&&document.createRange();if(b)b.selectNodeContents(t);
  const r=b?.getBoundingClientRect(),d=d3.select(g).datum(),stored=cBaselineLabelShifts.get(d?.id),reflow=cLabelReflowMetrics.get(d?.id);
  return {name:t?.textContent,rect:r?{x:r.x,y:r.y,w:r.width,h:r.height}:null,transform:g.getAttribute('transform'),id:d?.id,offset:d?.offset,baseline:stored,reflow};
 })
});\n`;
async function runConfig(cfg){
 const browser=await cfg[1].launch({headless:true});
 try{
  const records=[];
  for(const [version,url] of Object.entries(urls)){
   const page=await browser.newPage({viewport:{width:cfg[2],height:cfg[3]},deviceScaleFactor:2,isMobile:cfg[2]<600,hasTouch:cfg[2]<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**'+url+'*',async route=>{
    const response=await route.fetch(),html=await response.text(),marker='function updateLabelSize(){';
    assert.equal(html.split(marker).length,2,version+' injection marker count');
    await route.fulfill({response,body:html.replace(marker,hook+marker),headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
   });
   await page.goto(host+url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
   const states=[];
   const capture=async stage=>{states.push({stage,...await page.evaluate(()=>window.__townLabelState())})};
   const click=async id=>{await page.locator('#'+id).click();await page.waitForTimeout(110)};
   const region=async n=>{await page.evaluate(name=>{const b=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community===name);if(!b)throw Error('no region: '+name);b.click()},n);await page.waitForTimeout(130)};
   await capture('whole');
   await click('reading');await capture('reading-on');
   await click('larger');await capture('font125');
   await click('reading');await capture('reading-off');
   await click('size');await capture('font100-restored');
   for(const n of ['安井','香櫨園','上ヶ原']){await region(n);await capture('region:'+n)}
   await region('');await capture('whole-restored');
   assert.deepEqual(errors,[],'script errors');
   records.push({version,states});await page.close();
  }
  fs.writeFileSync(path.join(out,cfg[0]+'.json'),JSON.stringify(records,null,2));
  const summary={screen:cfg[0],states:records.map(r=>({version:r.version,stages:r.states.map(s=>({stage:s.stage,mode:s.mode,reading:s.readingOn,fontPx:+s.fontPx.toFixed(3),baseline:s.baselineCache,reflow:s.reflowCache,labels:s.sample.map(l=>({name:l.name,x:l.rect?.x,y:l.rect?.y,baseDy:l.baseline?.dy,refHeight:l.reflow?.height}))}))}))};
  console.log('V29_LABEL_STATE '+JSON.stringify(summary));
 }finally{await browser.close()}
}
(async()=>{for(const c of cases)await runConfig(c)})().catch(err=>{console.error(err);process.exitCode=1});
