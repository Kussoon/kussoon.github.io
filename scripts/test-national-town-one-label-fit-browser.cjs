'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v2/town-map-one-label-fit-20261120-pilot.html';
const A='http://127.0.0.1:8765/v2/town-map-shared-browser-approved-20261119-pilot.html';
async function test(engine,label,width,height){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__oneLabelAudit?.summary?.towns===321,null,{timeout:120000});
  const result=await page.evaluate(async()=>{
   const data=window.__oneLabelAudit,geometry=await (await fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')).json();
   const fs=topojson.feature(geometry,geometry.objects.town).features;
   const projection=d3.geoMercator().fitExtent([[22,22],[978,698]],{type:'FeatureCollection',features:fs});
   const names=Object.fromEntries(fs.map(f=>[f.properties.S_NAME,f]));
   const e=window.KussoonTownGeojsonComponentLabels;
   let exteriorError=0;
   for(const r of data.rows){
    const g=names[r.name].geometry,part=g.type==='MultiPolygon'?g.coordinates[r.component]:g.coordinates;
    const rings=part.map(x=>x.map(projection));
    if(!e.insideRing(r.point,rings[0])||
     rings.slice(1).some(h=>e.insideRing(r.point,h)))exteriorError++;
   }
   return {summary:data.summary,rows:data.rows,exteriorError,
    textCount:document.querySelectorAll('#names text').length,
    shapeCount:document.querySelectorAll('#shapes path').length};
  });
  assert.equal(result.summary.labels,321,'exactly one label per town');
  assert.equal(result.textCount,321);
  assert.equal(result.shapeCount,321);
  assert.equal(result.exteriorError,0,'every label center must lie within its chosen component');
  assert.equal(result.summary.fits+result.summary.fallback,321);
  assert(result.summary.fits>0);
  assert(result.summary.elapsedMs<120000);
  const rows=Object.fromEntries(result.rows.map(r=>[r.name,r]));
  for(const name of ['塩瀬町名塩','山口町上山口','山口町下山口']){
   assert.equal(rows[name].point.length,2);assert.equal(rows[name].name,name);
  }
  assert.equal(rows['塩瀬町名塩'].parts,2);
  assert.equal(rows['山口町下山口'].parts,2);
  await page.locator('#filter').selectOption('multi');
  assert.equal(await page.locator('#rows tr').count(),2);
  await page.locator('#filter').selectOption('approved-multi');
  assert.equal(await page.locator('#rows tr').count(),3);
  await page.locator('#filter').selectOption('fallback');
  assert.equal(await page.locator('#rows tr').count(),result.summary.fallback);
  await page.locator('#filter').selectOption('all');
  assert.equal(await page.locator('#rows tr').count(),321);
  await page.locator('#query').fill('宝生ケ丘');
  assert.equal(await page.locator('#rows tr').count(),1);
  await page.locator('#rows button').first().click();
  assert.equal((await page.locator('#selected').textContent()),'宝生ケ丘');
  assert.equal(await page.locator('#quizOne').count(),0,'comparison must have no quiz');
  await page.locator('#resetView').click();
  assert.equal(await page.locator('#map').getAttribute('viewBox'),'0 0 1000 720');
  assert.deepEqual(errors,[]);
  // The pre-existing 324-label comparison is preserved, not overwritten.
  await page.goto(A,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:90000});
  assert.equal(await page.locator('#labels g.label').count(),324);
  console.log('PASS ONE_LABEL_NISHINOMIYA_321 '+JSON.stringify({
   label,...result.summary,polygonCenterValid:true,
   sameTownApprovedComparisonPreserved:324,
   sample:[rows['塩瀬町名塩'],rows['山口町下山口'],rows['山口町上山口']]
  }));
 }finally{await browser.close()}
}
(async()=>{
 await test(chromium,'chromium-1280',1280,800);
 await test(webkit,'webkit-390',390,844);
 await test(webkit,'webkit-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
