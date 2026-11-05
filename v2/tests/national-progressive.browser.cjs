'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');const {start}=require('./helpers/nationwide-browser.cjs');
const wait=page=>page.waitForTimeout(260),out=process.env.KUSSOON_BROWSER_ARTIFACTS;
async function resource(a){let heap=null;if((process.env.KUSSOON_BROWSER_ENGINE||'chromium')==='chromium'){const c=await a.context.newCDPSession(a.page);heap=await c.send('Runtime.getHeapUsage');await c.detach();}return {heap,domNodes:await a.page.locator('*').count(),app:await a.page.evaluate(()=>KussoonV2ProgressivePreview.controller.snapshot()),bytes:await a.page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>new URL(x.name).origin===location.origin).reduce((s,x)=>s+x.decodedBodySize,0))};}
async function clickLabel(page,code){
 await page.locator('#map').scrollIntoViewIfNeeded();
 const point=await page.evaluate(code=>{const n=document.querySelector('[data-label-code="'+code+'"]');if(!n)return null;const b=n.getBoundingClientRect();for(const fx of [.5,.25,.75])for(const fy of [.5,.25,.75]){const x=b.x+b.width*fx,y=b.y+b.height*fy;if(document.elementFromPoint(x,y)?.closest('[data-label-code]')?.dataset.labelCode===code)return {x,y};}return null;},code);
 assert(point,'real hit-testable label '+code);await page.mouse.click(point.x,point.y);
}
(async()=>{
 const report={scope:'Native representative gestures plus exhaustive actual SVG/camera label reachability; not 1905 native finger gestures',runs:[]};
 for(const [width,height] of [[1280,1000],[390,844]]){
  const app=await start({query:'progressive=1',contextOptions:{viewport:{width,height}}}),{page}=app,requests=[];page.on('request',r=>{if(r.url().endsWith('.topojson'))requests.push(new URL(r.url()).pathname);});
  try{
   await app.open();await page.waitForFunction(()=>window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905);await wait(page);
   const before=await resource(app);assert.equal(requests.length,0,'nationwide overview labels do not fetch all detail geometry');assert(await page.locator('[data-label-code]').count()>10);assert.equal(await page.getAttribute('#mapReadingToggle','aria-pressed'),'false');
   const stages=[];
   for(const step of [1,2,4,8]){
    if(step>1){await page.locator('#map').scrollIntoViewIfNeeded();const b=await page.locator('#map').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.keyboard.down('Control');await page.mouse.wheel(0,-Math.log(2)/.003);await page.keyboard.up('Control');await wait(page);}
    stages.push(await page.evaluate(()=>({zoom:850/KussoonV2ProgressivePreview.viewport.view().w,count:document.querySelectorAll('[data-label-code]').length,labels:[...document.querySelectorAll('[data-label-code]')].map(n=>n.dataset.labelCode),state:KussoonV2ProgressivePreview.controller.snapshot()})));
    assert.equal(await page.inputValue('#pref'),'','native continuous zoom stays in national mode');
   }
   assert(stages[1].labels.some(c=>!stages[0].labels.includes(c)),'zoom reveals additional actual names');
   await page.click('#mapReset');await wait(page);assert.equal(await page.locator('[data-label-code]').count(),stages[0].count,'zooming out restores overview culling');
   // Choose with actual label input, rather than a private selection setter.
   await page.evaluate(()=>{const api=KussoonV2ProgressivePreview,a=api.controller.anchors().find(x=>x.code==='28101');api.viewport.setView({x:a.point[0]-850/64/2,y:a.point[1]-700/64/2,w:850/64,h:700/64});api.controller.refreshLabels();});
   await clickLabel(page,'28101');await page.locator('#officePopup').waitFor();assert.equal(await page.locator('#officePopup a').count(),6);assert.equal(await page.inputValue('#pref'),'');
   await page.click('#popupClose');const retained=await page.getAttribute('#map','viewBox');await clickLabel(page,'28101');assert.equal(await page.getAttribute('#map','viewBox'),retained);assert.equal(await page.getAttribute('#map','data-national-selection'),'');
   await clickLabel(page,'28101');await page.locator('#officePopup').waitFor();await page.click('#popupClose');await page.click('#mapZoomIn');await wait(page);assert.equal(await page.getAttribute('#map','data-national-selection'),'28101');assert(!(await page.locator('#officePopup').isVisible()));
   assert.equal(await page.locator('#map .borders').count(),1);assert.equal(await page.locator('#map [data-pref][tabindex="0"][role="button"]').count(),47,'all existing prefecture keyboard entries survive detail streaming');
   const mesh=await page.locator('#map .borders').evaluate(n=>{const segments=n.getAttribute('d').split('M').filter(Boolean).map(s=>{const a=s.split('L');return a[0]<a[1]?a.join('|'):a.reverse().join('|')});return {segments:segments.length,unique:new Set(segments).size};});assert.equal(mesh.segments,mesh.unique,'actual rendered boundary segments are unique in either direction');assert(await page.locator('#map .land').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).stroke==='none')));
   const pinned=await page.getAttribute('#map','data-national-selection');await page.click('#mapReset');await wait(page);assert.equal(await page.getAttribute('#map','data-national-selection'),pinned,'S19 reset preserves national selection');
   if((process.env.KUSSOON_BROWSER_ENGINE||'chromium')==='chromium'){
    await page.evaluate(()=>{const api=KussoonV2ProgressivePreview,a=api.controller.anchors().find(x=>x.code==='28101');api.viewport.setView({x:a.point[0]-850/32/2,y:a.point[1]-700/32/2,w:850/32,h:700/32});});await wait(page);await page.locator('#map').scrollIntoViewIfNeeded();
    const box=await page.locator('#map').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2,cdp=await app.context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    const pt=(id,x,y)=>({id,x,y,radiusX:3,radiusY:3,force:1}),send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});const widthBefore=await page.getAttribute('#map','viewBox');
    const held=await page.evaluate(()=>KussoonV2ProgressivePreview.controller.snapshot());await send('touchStart',[pt(1,cx-25,cy),pt(2,cx+25,cy)]);await page.waitForTimeout(350);const still=await page.evaluate(()=>KussoonV2ProgressivePreview.controller.snapshot());assert.equal(still.labelPasses,held.labelPasses,'held touch never replaces label targets');assert.equal(still.shapePasses,held.shapePasses,'held touch never rebuilds shapes');for(let i=1;i<=5;i++)await send('touchMove',[pt(1,cx-25-i*8,cy),pt(2,cx+25+i*8,cy)]);await send('touchEnd',[]);assert.notEqual(await page.getAttribute('#map','viewBox'),widthBefore);
    for(const [dx,dy] of [[60,0],[-60,0],[0,60],[0,-60]]){const previous=await page.getAttribute('#map','viewBox');await send('touchStart',[pt(3,cx,cy)]);for(let n=1;n<=4;n++)await send('touchMove',[pt(3,cx+dx*n/4,cy+dy*n/4)]);await send('touchEnd',[]);assert.notEqual(await page.getAttribute('#map','viewBox'),previous);assert.equal(await page.getAttribute('#map','data-national-selection'),pinned);}
    await cdp.detach();
   }
   // All 1905 targets rendered by the SAME real draw routine, at legal frames.
   // Timers cannot launch 47 network fetches during this synchronous census.
   const reaches=[];for(const reading of ['off','on']){await app.readings(reading);await wait(page);
   const reach=await page.evaluate(()=>{
    const api=KussoonV2ProgressivePreview,anchors=api.controller.anchors(),saved=api.viewport.view(),missing=[],partial=[],oversize=[];let maxMs=0;
    for(const a of anchors){api.viewport.setView({x:a.point[0]-850/768/2,y:a.point[1]-700/768/2,w:850/768,h:700/768});const result=api.controller.refreshLabels();maxMs=Math.max(maxMs,result.ms);const node=document.querySelector('[data-label-code="'+a.code+'"]');if(!node){missing.push(a.code);continue;}const b=node.getBoundingClientRect(),r=document.querySelector('#map').getBoundingClientRect();if(b.left<r.left||b.right>r.right||b.top<r.top||b.bottom>r.bottom)partial.push(a.code);const m=node.getScreenCTM(),texts=node.querySelectorAll('tspan');for(const t of texts.length?texts:[node])if(parseFloat(getComputedStyle(t).fontSize)*Math.hypot(m.a,m.b)>13.05)oversize.push(a.code);}
    api.viewport.setView(saved);api.controller.refreshLabels();return {count:anchors.length,missing,partial,oversize,maxLabelMs:maxMs};
   });
   assert.equal(reach.count,1905);assert.deepEqual(reach.missing,[],'every current target appears in actual SVG');assert.deepEqual(reach.partial,[],'whole label box fits when centred');assert.deepEqual(reach.oversize,[],'screen font stays <=13px');
   reaches.push({reading,...reach});}
   await app.readings('on');await wait(page);const rows=await page.evaluate(()=>{const api=KussoonV2ProgressivePreview,a=api.controller.anchors().find(x=>x.code==='28101');api.viewport.setView({x:a.point[0]-850/64/2,y:a.point[1]-700/64/2,w:850/64,h:700/64});api.controller.refreshLabels();return [...document.querySelectorAll('[data-label-code="28101"] tspan')].map(n=>n.textContent)});assert.deepEqual(rows,['神戸市','こうべし','東灘区','ひがしなだく']);
   const portraitBefore=await page.getAttribute('#map','viewBox');await page.setViewportSize({width:height,height:width});await wait(page);const rotatedFont=await page.locator('[data-label-code="28101"] tspan').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize)*Math.hypot(n.getScreenCTM().a,n.getScreenCTM().b));assert(rotatedFont<=13.05,'rotation updates inverse screen font');assert.equal(await page.getAttribute('#map','viewBox'),portraitBefore);await page.setViewportSize({width,height});await wait(page);
   const after=await resource(app);assert(after.app.store.cached<=3);assert(after.app.store.peakConcurrent<=2);
   // The existing prefecture flow and global search still work in the opt-in UI.
   await app.pref('28');await page.waitForFunction(()=>document.querySelectorAll('#map .land').length===49&&!document.querySelector('#map').classList.contains('progressive-national'));await app.select('28204');assert.equal(await page.locator('#officePopup a').count(),3);await page.click('#nationBtn');await page.fill('#placeSearch','浜松市中央区');await page.locator('#searchResults button').first().click();await page.locator('#officePopup').waitFor();assert.equal(await page.getAttribute('#map','data-national-selection'),'22138');assert.equal(await page.inputValue('#pref'),'');
   if(out){await fs.mkdir(out,{recursive:true});await page.locator('#map').screenshot({path:path.join(out,'progressive-'+width+'.png')});}
   assert.deepEqual(app.errors,[]);report.runs.push({width,height,stages,reaches,before,after,detailRequests:requests.length});
  }finally{await app.close();}
 }
 const race=await start({query:'progressive=1'});
 try{
  let attempts=0;await race.page.route('**/28.topojson',async route=>{if(++attempts===1){await route.abort('failed');return;}await new Promise(r=>setTimeout(r,600));await route.continue();});
  await race.open();await race.page.waitForFunction(()=>window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905);
  await race.page.evaluate(()=>{void KussoonV2ProgressivePreview.controller.focus('28101')});
  await race.page.waitForFunction(()=>document.querySelector('#status').textContent.includes('取得できません'));
  assert.equal(await race.page.getAttribute('#map','data-national-selection'),'28101','failed detail keeps selection and geographic camera');
  await race.page.evaluate(()=>{void KussoonV2ProgressivePreview.controller.focus('28101')});
  await race.page.evaluate(()=>KussoonV2ProgressivePreview.controller.focus('13101'));
  const retained=await race.page.getAttribute('#map','viewBox');await race.page.waitForTimeout(800);assert.equal(await race.page.getAttribute('#map','data-national-selection'),'13101');assert.equal(await race.page.getAttribute('#map','viewBox'),retained);assert((await race.page.textContent('#popupName')).includes('千代田'));
  assert.deepEqual(race.errors,[]);report.delayedFailureRetry={attempts,state:await race.page.evaluate(()=>KussoonV2ProgressivePreview.controller.snapshot())};
 }finally{await race.close();}
 const unavailable=await start({query:'progressive=1'});
 try{await unavailable.page.route('**/label-index.json',r=>r.fulfill({status:503,body:'unavailable'}));await unavailable.open();await unavailable.page.fill('#placeSearch','28101');await unavailable.page.locator('#searchResults button').first().click();await unavailable.page.locator('#map .chosen[data-code="28101"]').waitFor();assert.equal(await unavailable.page.locator('#officePopup a').count(),6);assert.equal(await unavailable.page.inputValue('#pref'),'28');assert.deepEqual(unavailable.errors,[]);report.indexFailureFallback='existing prefecture search and six links remain available';}
 finally{await unavailable.close();}
 const delayedIndex=await start({query:'progressive=1'});
 try{await delayedIndex.page.route('**/label-index.json',async r=>{await new Promise(resolve=>setTimeout(resolve,600));await r.continue();});await delayedIndex.open();await delayedIndex.page.evaluate(()=>{void KussoonV2ProgressivePreview.controller.focus('28101')});await delayedIndex.pref('16');await delayedIndex.page.waitForTimeout(700);assert.equal(await delayedIndex.page.inputValue('#pref'),'16');assert.equal(await delayedIndex.page.locator('#map .land').count(),15);assert.deepEqual(delayedIndex.errors,[]);report.cancelledPendingSearch='late nationwide index cannot undo explicit prefecture navigation';}
 finally{await delayedIndex.close();}
 if(out)await fs.writeFile(path.join(out,'progressive-report.json'),JSON.stringify(report,null,2));console.log('PASS native nationwide zoom/culling/selection/3+6 links, actual SVG 1905 targets × 2 viewports, reading rows, LRU, existing prefecture/search');
})().catch(e=>{console.error(e);process.exitCode=1;});
