// Nishinomiya town SVG V5: exhaustive 321-town label DOM/geometry regression.
// Report overlaps and clipping as observations; never auto-suppress approved labels.
// Browser emulation is not an iPhone Safari hardware check.
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve('svg-v6-edge-audit');fs.mkdirSync(root,{recursive:true});
const base=process.env.SVG_BASE||'http://127.0.0.1:8765';
const route='/v2/nishinomiya-town-svg-master-v6-20261117-pilot.html';
const cases=[
 {name:'chromium-desktop',engine:chromium,w:1280,h:800,mobile:false},
 {name:'webkit-390',engine:webkit,w:390,h:844,mobile:true},
 {name:'webkit-320',engine:webkit,w:320,h:668,mobile:true}
];
const awaitReady=page=>page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:45000});
async function inspect(page,tag,expectedNames){
 return await page.evaluate(({tag,expectedNames})=>{
  const map=document.getElementById('map'),labels=[...document.querySelectorAll('#labels g.label')];
  const canvas=map.getBoundingClientRect();
  const rows=labels.map(g=>{
   const t=g.querySelector('text.town-label'),name=t?.querySelector('.town-name')?.textContent||'';
   const reading=t?.querySelector('.town-reading')?.textContent||'';
   const b=t.getBoundingClientRect(),font=Number(t.getAttribute('font-size'));
   const visible=b.right>canvas.left&&b.left<canvas.right&&b.bottom>canvas.top&&b.top<canvas.bottom;
   return {name,reading,font,visible,edgeShift:g.getAttribute('data-edge-shift'),width:b.width,height:b.height,
    x:b.left-canvas.left,y:b.top-canvas.top,
    cx:b.left+b.width/2-canvas.left,cy:b.top+b.height/2-canvas.top};
  });
  const counts={};for(const r of rows)counts[r.name]=(counts[r.name]||0)+1;
  const unique=Object.keys(counts);
  const missing=expectedNames.filter(n=>!unique.includes(n));
  const extras=unique.filter(n=>!expectedNames.includes(n));
  const nonfinite=rows.filter(r=>!Number.isFinite(r.cx)||!Number.isFinite(r.cy)||!Number.isFinite(r.font)||r.font<=0);
  const overlaps=[];
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
   const a=rows[i],b=rows[j];
   if(!a.visible||!b.visible)continue;
   const x=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x));
   const y=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
   if(x>1&&y>1)overlaps.push({a:a.name,b:b.name,area:Math.round(x*y)});
  }
  overlaps.sort((a,b)=>b.area-a.area);
  return {tag,size:[canvas.width,canvas.height],total:rows.length,unique:unique.length,
   missing,extras,nonfinite,counts,readings:rows.filter(r=>r.reading).length,
   visible:rows.filter(r=>r.visible).length,edgeShifted:rows.filter(r=>r.edgeShift).length,centerOutside:rows.filter(r=>r.cx<0||r.cy<0||r.cx>canvas.width||r.cy>canvas.height).length,
   minFont:Math.min(...rows.map(r=>r.font)),maxFont:Math.max(...rows.map(r=>r.font)),
   clipped:rows.filter(r=>r.visible&&(r.x<0||r.y<0||r.x+r.width>canvas.width||r.y+r.height>canvas.height)).map(r=>r.name),
   overlapCount:overlaps.length,topOverlaps:overlaps.slice(0,40),rows};
 },{tag,expectedNames});
}
async function capture(page,name){await page.screenshot({path:path.join(root,name+'.png'),fullPage:true})}
async function runCase(c){
 const browser=await c.engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:c.w,height:c.h},deviceScaleFactor:2,isMobile:c.mobile,hasTouch:c.mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});await awaitReady(page);
  const expected=await page.locator('#areas path.town').evaluateAll(paths=>paths.map(p=>p.__data__?.properties?.S_NAME));
  assert.equal(expected.length,321);assert.equal(new Set(expected).size,321);
  const report={case:c.name,checkedAt:new Date().toISOString(),states:[],regions:[]};
  async function state(tag,names=expected){
   const result=await inspect(page,tag,names);
   assert.deepEqual(result.missing,[],tag+' missing names');
   assert.deepEqual(result.extras,[],tag+' extra names');
   assert.equal(result.nonfinite.length,0,tag+' invalid label');
   if(!['zoom-plus','zoom-plus-twice','zoom-after-minus'].includes(tag)){
    assert.deepEqual(result.clipped,[],tag+' contains clipped fitted-view labels');
   }
   report.states.push(result);
   return result;
  }
  let a=await state('whole-default');
  assert.equal(a.total,324,'321 town labels plus 3 additional placements');
  assert.deepEqual(Object.entries(a.counts).filter(([n,c])=>c>1).map(([n,c])=>[n,c]).sort(),[['塩瀬町名塩',2],['山口町上山口',2],['山口町下山口',2]].sort(),'3 expected extra label placements');
  assert.equal(a.readings,0);
  assert.equal(await page.locator('#areas path.town').count(),321);
  await capture(page,c.name+'-whole');
  await page.locator('#reading').click();
  a=await state('whole-reading-on');
  assert.equal(a.total,324);assert.equal(a.readings,324,'each label must get reading');
  await capture(page,c.name+'-readings');
  await page.locator('#larger').click();
  a=await state('font-125');assert(Math.abs(a.minFont-10)<.01,'font larger');
  await page.locator('#larger').click();await page.locator('#larger').click();await page.locator('#larger').click();
  a=await state('font-200');assert(Math.abs(a.minFont-16)<.01,'font max');
  await capture(page,c.name+'-font200');
  await page.locator('#smaller').click();await page.locator('#smaller').click();await page.locator('#smaller').click();await page.locator('#smaller').click();await page.locator('#smaller').click();
  a=await state('font-75');assert(Math.abs(a.minFont-6)<.01,'font min');
  await page.locator('#size').click();a=await state('font-reset');assert(Math.abs(a.minFont-8)<.01);
  await page.locator('#reading').click();a=await state('reading-off');assert.equal(a.readings,0);
  await page.locator('#zoomIn').click();await page.waitForTimeout(250);await state('zoom-plus');
  await page.locator('#zoomIn').click();await page.waitForTimeout(250);await state('zoom-plus-twice');
  await page.locator('#zoomOut').click();await page.waitForTimeout(250);await state('zoom-after-minus');
  await page.locator('#reset').click();await page.waitForTimeout(100);await state('city-reset');
  await page.locator('#fullscreen').click();await page.waitForTimeout(250);
  await state('fullscreen');
  assert.equal(await page.locator('#fullscreen').innerText(),'戻る');
  await capture(page,c.name+'-fullscreen');
  await page.locator('#fullscreen').click();await page.waitForTimeout(250);await state('fullscreen-exit');
  assert.equal(await page.locator('#fullscreen').innerText(),'全画面');
  const options=await page.locator('#communityOptions button').evaluateAll(ns=>ns.map(n=>n.dataset.community).filter(Boolean));
  assert.equal(options.length,26);
  for(const name of options){
   await page.evaluate(name=>{
    const item=[...document.querySelectorAll('#communityOptions button')].find(n=>n.dataset.community===name);
    if(!item)throw Error('Missing community button '+name);item.click();
   },name);
   const names=await page.locator('#areas path.town').evaluateAll(ps=>ps.map(p=>p.__data__.properties.S_NAME));
   const result=await inspect(page,'region:'+name,names);
   assert.equal(result.unique,new Set(names).size,name+' label count');
   assert.equal(result.nonfinite.length,0,name+' invalid');
   assert.deepEqual(result.missing,[],name+' missing');
   assert.deepEqual(result.clipped,[],name+' clipped after fit-to-region');
   report.regions.push({region:name,polygons:names.length,labels:result.total,visible:result.visible,
    clipped:result.clipped,centerOutside:result.centerOutside,
    overlaps:result.overlapCount,topOverlaps:result.topOverlaps.slice(0,8)});
   if(['上ヶ原','広田','山口','名塩','西宮浜'].includes(name))await capture(page,c.name+'-region-'+name);
  }
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community=""]').click());
  await state('whole-after-26-regions');
  assert.deepEqual(errors,[],'uncaught browser errors');
  fs.writeFileSync(path.join(root,c.name+'.json'),JSON.stringify(report,null,2));
  console.log('PASS LABEL_AUDIT '+JSON.stringify({case:c.name,states:report.states.length,regions:report.regions.length,
   initialVisible:report.states[0].visible,initialOverlaps:report.states[0].overlapCount,
   initialClipped:report.states[0].clipped.length,initialEdgeShifted:report.states[0].edgeShifted,readingCount:report.states[1].readings,
   allRegionLabels:report.regions.reduce((sum,x)=>sum+x.labels,0)}));
 }finally{await browser.close()}
}
(async()=>{for(const c of cases)await runCase(c)})().catch(err=>{console.error(err);process.exitCode=1});
