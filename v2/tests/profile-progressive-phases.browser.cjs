'use strict';
// Phase comparison diagnostic. Browser RAF/JS heap are not physical-device FPS/RSS.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {start}=require('./helpers/nationwide-browser.cjs');
(async()=>{
 const engine=process.env.KUSSOON_BROWSER_ENGINE||'chromium',runs=[];
 for(const [width,height] of [[1280,1000],[390,844]]){
  const a=await start({query:process.env.KUSSOON_PROFILE_QUERY||'progressive=1',contextOptions:{viewport:{width,height}}}),{page}=a;
  try{
   await page.addInitScript(()=>{window.phaseTasks=[];window.frameGaps=[];let prev=0;function tick(t){if(prev)frameGaps.push(t-prev);prev=t;requestAnimationFrame(tick);}requestAnimationFrame(tick);if(PerformanceObserver.supportedEntryTypes?.includes('longtask'))new PerformanceObserver(l=>phaseTasks.push(...l.getEntries().map(x=>x.duration))).observe({entryTypes:['longtask']});});
   await a.open();await page.waitForFunction(()=>window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905);await page.waitForTimeout(350);const rows=[];
   for(const [name,code,zoom] of [['initial',null,1],['mie','24201',16],['kobe','28101',64],['sapporo','01101',32],['okinawa','47201',64],['mie-revisit','24201',16],['overview',null,1]]){
    await page.evaluate(()=>{frameGaps=[];phaseTasks=[];});
    if(code)await page.evaluate(({code,zoom})=>{const api=KussoonV2ProgressivePreview,a=api.controller.anchors().find(x=>x.code===code);api.viewport.setView({x:a.point[0]-850/zoom/2,y:a.point[1]-700/zoom/2,w:850/zoom,h:700/zoom});},{code,zoom});else await page.click('#mapReset');
    await page.waitForTimeout(450);await page.waitForFunction(()=>{const api=KussoonV2ProgressivePreview,s=api.store.stats();return !s.active&&!s.queued&&!api.controller.snapshot().shapePending&&!api.controller.snapshot().scheduled;},{},{timeout:60000});await page.waitForTimeout(100);
    let heap=null;if(engine==='chromium'){const c=await a.context.newCDPSession(page);heap=await c.send('Runtime.getHeapUsage');await c.detach();}
    const row=await page.evaluate(()=>{const gaps=frameGaps.slice().sort((a,b)=>a-b);return {snapshot:KussoonV2ProgressivePreview.controller.snapshot(),loads:window.KussoonProgressiveLoadTimings||[],worker:window.KussoonProgressiveWorkerMetrics||null,nodes:document.querySelectorAll('*').length,labels:document.querySelectorAll('[data-label-code]').length,viewBox:document.querySelector('#map').getAttribute('viewBox'),decodedBytes:performance.getEntriesByType('resource').reduce((s,x)=>s+x.decodedBodySize,0),maxFrameGapMs:Math.max(0,...gaps),p95FrameGapMs:gaps[Math.floor(gaps.length*.95)]||0,longTasks:phaseTasks,resources:performance.getEntriesByType('resource').filter(x=>x.name.endsWith('.topojson')).map(x=>({path:new URL(x.name).pathname,ms:x.duration,bytes:x.decodedBodySize}))};});
    assert(row.snapshot.store.cached<=3);assert(row.snapshot.store.peakConcurrent<=2);rows.push({name,heap,...row});
    if(name==='mie'&&process.env.KUSSOON_BROWSER_ARTIFACTS)await page.locator('#map').screenshot({path:path.join(process.env.KUSSOON_BROWSER_ARTIFACTS,engine+'-'+width+'-mie.png')});
   }
   assert.deepEqual(a.errors,[]);runs.push({width,height,rows});
  }finally{await a.close();}
 }
 const out=process.env.KUSSOON_BROWSER_ARTIFACTS||'/tmp/kussoon-progressive-phases';await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'phases-'+engine+'.json'),JSON.stringify({sourceRef:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),engine,scope:'Same cameras/zoom and viewport; RAF gaps on automated desktop host, not iPhone device FPS. Worker heap excluded from CDP page heap.',runs},null,2));console.log('RECORDED progressive phases '+engine);
})().catch(e=>{console.error(e);process.exitCode=1;});
