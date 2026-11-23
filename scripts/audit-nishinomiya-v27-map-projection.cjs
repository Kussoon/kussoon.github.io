'use strict';
// Diagnose map projection displacement separately from SVG text layout.
// No production HTML/source changes: temporary Playwright hooks only.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out='nishinomiya-v27-map-projection';fs.mkdirSync(out,{recursive:true});
const host=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const targets={C:'/v2/nishinomiya-town-study-c.html',SVG:'/v2/nishinomiya-town-svg-master-v25-20261117-pilot.html'};
const configs=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
const names=['西宮浜','岡田山','山口町下山口','甲子園口北町'];
async function load(browser,device,type){
 const page=await browser.newPage({viewport:{width:device[2],height:device[3]},deviceScaleFactor:2,isMobile:device[2]<600,hasTouch:device[2]<600});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const marker=type==='C'?"Promise.all([fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')":"function updateLabelSize(){";
 const hook=type==='C'
 ?`window.__townMapProbe=(coords)=>coords.map(([lat,lon])=>{const p=map.latLngToContainerPoint([lat,lon]);return [p.x,p.y]});
window.__townGeoSamples=()=>['西宮浜','岡田山','山口町下山口','甲子園口北町'].map(name=>{const it=items.find(x=>x.name===name);if(!it)throw Error('missing '+name);const c=it.layer.getBounds().getCenter();return {name,lat:c.lat,lon:c.lng}});
`
 :`window.__townMapProbe=(coords)=>coords.map(([lat,lon])=>{const p=projection([lon,lat]);return [p[0]*transform.k+transform.x,p[1]*transform.k+transform.y]});
`;
 await page.route('**'+targets[type]+'*',async route=>{
  const response=await route.fetch(),html=await response.text();
  assert.equal(html.split(marker).length,2,type+' injection marker must occur once');
  await route.fulfill({response,body:html.replace(marker,hook+marker),headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 await page.goto(host+targets[type],{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
 assert.deepEqual(errors,[],'page errors '+type);
 return {page,errors};
}
async function selectRegion(page,name){
 await page.evaluate(n=>{const b=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community===n);if(!b)throw Error('missing region '+n);b.click()},name);
 await page.waitForTimeout(130);
}
function stats(stage,values,c,s){
 const coords=values.map(p=>[p.lat,p.lon]);
 return Promise.all([c.page.evaluate(x=>window.__townMapProbe(x),coords),s.page.evaluate(x=>window.__townMapProbe(x),coords)]).then(([C,S])=>{
  const points=values.map((x,i)=>({name:x.name,dx:+(S[i][0]-C[i][0]).toFixed(3),dy:+(S[i][1]-C[i][1]).toFixed(3)}));
  const means=[0,1].map(axis=>+(points.reduce((a,b)=>a+b[['dx','dy'][axis]],0)/points.length).toFixed(3));
  return {stage,points,meanDx:means[0],meanDy:means[1],rangeDx:+(Math.max(...points.map(p=>p.dx))-Math.min(...points.map(p=>p.dx))).toFixed(3),rangeDy:+(Math.max(...points.map(p=>p.dy))-Math.min(...points.map(p=>p.dy))).toFixed(3)};
 });
}
(async()=>{
 const rows=[];
 for(const config of configs){
  const browser=await config[1].launch({headless:true});
  try{
   const c=await load(browser,config,'C'),s=await load(browser,config,'SVG');
   const samples=await c.page.evaluate(()=>window.__townGeoSamples());assert.equal(samples.length,names.length);
   const states=[await stats('whole',samples,c,s)];
   for(const region of ['上ヶ原','香櫨園','安井','山口']){
    await selectRegion(c.page,region);await selectRegion(s.page,region);
    states.push(await stats('region:'+region,samples,c,s));
   }
   await selectRegion(c.page,'');await selectRegion(s.page,'');
   states.push(await stats('whole-restored',samples,c,s));
   assert.deepEqual(c.errors,[]);assert.deepEqual(s.errors,[]);
   const report={screen:config[0],states};rows.push(report);
   fs.writeFileSync(path.join(out,config[0]+'.json'),JSON.stringify(report,null,2));
   console.log('V27_MAP_PROJECTION '+JSON.stringify(report));
  }finally{await browser.close()}
 }
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(rows,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
