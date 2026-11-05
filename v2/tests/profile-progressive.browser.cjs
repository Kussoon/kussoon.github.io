'use strict';
// Observational profile, not a device FPS/memory budget conformance test.
const {execFileSync}=require('node:child_process');const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');const {start}=require('./helpers/nationwide-browser.cjs');
(async()=>{const app=await start({query:'progressive=1',contextOptions:{viewport:{width:390,height:844}}}),{page}=app,rows=[];try{
 await page.addInitScript(()=>{window.profileTasks=[];new PerformanceObserver(list=>profileTasks.push(...list.getEntries().map(t=>({ms:t.duration,start:t.startTime})))).observe({entryTypes:['longtask']});});
 await app.open();await page.waitForFunction(()=>window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905);
 for(const [name,code,zoom] of [['initial',null,1],['mie','24201',16],['kobe','28101',64],['sapporo','01101',32],['okinawa','47201',64],['overview-again',null,1]]){
  if(code)await page.evaluate(({code,zoom})=>{const api=KussoonV2ProgressivePreview,a=api.controller.anchors().find(x=>x.code===code);api.viewport.setView({x:a.point[0]-850/zoom/2,y:a.point[1]-700/zoom/2,w:850/zoom,h:700/zoom});},{code,zoom});else await page.click('#mapReset');
  await page.waitForTimeout(400);await page.waitForFunction(()=>{const s=KussoonV2ProgressivePreview.store.stats();return !s.active&&!s.queued},{},{timeout:60000});
  const cdp=await app.context.newCDPSession(page),heap=await cdp.send('Runtime.getHeapUsage');await cdp.detach();const row=await page.evaluate(()=>({app:KussoonV2ProgressivePreview.controller.snapshot(),nodes:document.querySelectorAll('*').length,labels:document.querySelectorAll('[data-label-code]').length,viewBox:document.querySelector('#map').getAttribute('viewBox'),bytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.decodedBodySize,0),longTasks:profileTasks.splice(0)}));assert(row.app.store.cached<=3);assert(row.app.store.peakConcurrent<=2);rows.push({name,heap,...row});
 }
 const target=process.env.KUSSOON_BROWSER_ARTIFACTS||'/tmp/kussoon-progressive-profile';await fs.mkdir(target,{recursive:true});await fs.writeFile(path.join(target,'progressive-profile.json'),JSON.stringify({sourceRef:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Chromium JS heap/DOM/transfer and main thread tasks; not RSS/GPU/physical iPhone FPS',rows},null,2));assert.deepEqual(app.errors,[]);console.log('RECORDED bounded streaming profile: '+target);
}finally{await app.close();}})().catch(e=>{console.error(e);process.exitCode=1});
