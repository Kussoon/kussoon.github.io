'use strict';
// Read existing 321-town V34 source geometry and run a new candidate engine
// independently in both browsers. Do NOT replace approved label positions,
// quiz behavior, or the existing comparison page.
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const url='http://127.0.0.1:8765/v2/town-map-shared-browser-approved-20261119-pilot.html';
async function run(browserType,label,width,height){
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},
   isMobile:width<600,hasTouch:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:90000});
  const approvedCount=await page.locator('#labels g.label').count();
  assert.equal(approvedCount,324,'V34 approved display is the immutable baseline');
  await page.addScriptTag({url:'/v2/common/js/town-geojson-component-labels.js'});
  const audit=await page.evaluate(async()=>{
   const data=await (await fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')).json();
   const features=window.topojson.feature(data,data.objects.town).features;
   const projection=window.d3.geoMercator().fitExtent(
    [[22,22],[978,698]],{type:'FeatureCollection',features});
   const engine=window.KussoonTownGeojsonComponentLabels;
   let disconnected=0,withHoles=0,candidateCount=0,selectedCount=0;
   const componentNames=[],samples=[];
   const start=performance.now();
   for(const f of features){
    const geometry=f.geometry,name=f.properties.S_NAME;
    const parts=geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];
    if(parts.length>1){disconnected++;componentNames.push({name,parts:parts.length})}
    if(parts.some(rings=>rings.length>1))withHoles++;
    const cs=engine.candidates({geometry,projection,viewBoxArea:1000*720,
     minimumAreaFraction:0});
    candidateCount+=cs.length;
    const chosen=cs.filter(x=>x.area>=1000*720*.000006);
    selectedCount+=Math.max(chosen.length,1);
    for(const c of cs){
     const rings=parts[c.component].map(r=>r.map(projection));
     if(!engine.insideRing(c.point,rings[0]))throw Error('Outside component '+name);
     if(rings.slice(1).some(r=>engine.insideRing(c.point,r)))
      throw Error('Inside a hole '+name);
     if(!(c.clearance>0))throw Error('Invalid clearance '+name);
    }
    if(['塩瀬町名塩','山口町上山口','山口町下山口','岡田山','上甲東園'].includes(name))
     samples.push({name,parts:parts.length,accepted:document.querySelectorAll('#labels g.label').length,
      candidates:cs.map(c=>({component:c.component,area:+c.area.toFixed(2),
       clearance:+c.clearance.toFixed(2)}))});
   }
   const elapsed=performance.now()-start;
   return {towns:features.length,disconnected,withHoles,candidateCount,
    filteredCount:selectedCount,componentNames,samples,elapsedMs:Math.round(elapsed),
    labelsUnaffected:document.querySelectorAll('#labels g.label').length};
  });
  assert.equal(audit.towns,321);
  assert.equal(audit.labelsUnaffected,324);
  assert(audit.candidateCount>=321);
  assert(audit.disconnected>0,'the audited real data must include multipart polygons');
  assert(audit.elapsedMs<60000,'performance warning: full source audit exceeded 60 seconds');
  assert.deepEqual(errors,[],'unexpected map errors');
  console.log('PASS NATIONAL_GEOJSON_COMPONENT_REAL '+JSON.stringify({label,...audit,
   componentNames:audit.componentNames.slice(0,20)}));
 }finally{await browser.close()}
}
(async()=>{
 await run(chromium,'chromium-1280',1280,800);
 await run(webkit,'webkit-390',390,844);
})().catch(e=>{console.error(e);process.exitCode=1});
