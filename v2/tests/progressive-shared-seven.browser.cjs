'use strict';
/* S39 isolated integration: the same progressive UI with seven 2026 shared
 * prefecture slices. Tests the source routing, county index and interactions.
 * No claim that 47 prefecture geometry or SVG seam closure is validated.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {start}=require('./helpers/nationwide-browser.cjs');
const output=process.env.KUSSOON_BROWSER_ARTIFACTS;
const shared=['04','07','27','28','29','43','44'];
async function run(engine){
 const app=await start({engine,contextOptions:{viewport:{width:390,height:844}}});
 const {page}=app,errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().includes('.topojson'))requests.push(r.url());});
 try{
  await app.open();
  await page.goto(page.url().replace('official-2026-nationwide-pilot.html','progressive-shared-test.html'));
  await page.waitForFunction(()=>window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905,{},{timeout:90000});
  assert.deepEqual(await page.evaluate(()=>window.KussoonV2SharedSeamTrial.prefectures),shared);
  assert.equal(await page.locator('#mapReadingToggle').getAttribute('aria-pressed'),'false','readings must start off');
  await page.locator('#areaSettings').evaluate(el=>{el.open=true;});
  for(const pref of [...shared,'01']){
   await page.selectOption('#pref',pref);
   await page.waitForFunction(code=>{
    const s=document.querySelector('#status')?.textContent||'';
    return document.querySelector('#pref')?.value===code&&!s.includes('読み込み中')&&s.includes('市区町村を選べます');
   },pref,{timeout:90000});
   const source=await page.evaluate(code=>window.KussoonV2SharedSeamTrial.sourceFor(code),pref);
   assert.equal(Boolean(source),shared.includes(pref));
   if(source)assert(requests.some(u=>u.includes('/2026-shared-preview/'+pref+'.topojson')),'must load shared source '+pref);
   else assert(requests.some(u=>u.includes('/2026-common/')&&u.endsWith('/'+pref+'.topojson')&&!u.includes('/2026-shared-preview/')),'fallback must load original source '+pref);
   assert(await page.locator('#map .land').count()>0,'prefecture must have visible shape '+pref);
   assert.equal(await page.locator('#map .borders').count(),1);
   console.log('PASS shared progressive '+engine+' '+pref+' source='+(source?'common':'old')+' paths='+await page.locator('#map .land').count());
  }
  await page.selectOption('#pref','28');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('市区町村を選べます'),{},{timeout:90000});
  await page.selectOption('#region','28301');
  const options=await page.locator('#region option:checked').textContent();
  assert(options.includes('猪名川町'),'town selection intact');
  await page.click('#mapReadingToggle');
  assert.equal(await page.locator('#mapReadingToggle').getAttribute('aria-pressed'),'true','reading toggle');
  await page.click('#nationBtn');
  await page.waitForFunction(()=>window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905);
  const before=await page.locator('#map').getAttribute('viewBox');
  await page.click('#mapZoomIn');
  assert.notEqual(await page.locator('#map').getAttribute('viewBox'),before,'zoom works');
  const index=await page.evaluate(async()=>{
   const [a,b]=await Promise.all([fetch('../progressive-preview/label-index.json').then(x=>x.json()),fetch('../progressive-preview/county-overlay.json').then(x=>x.json())]);
   const result=KussoonV2CountyOverlay.apply(a,b);return result.entries.find(x=>x.code==='28301');
  });
  assert.equal(index.fullName,'川辺郡猪名川町','S25 county label kept');
  assert.deepEqual(index.parts.map(x=>x.name),['川辺郡','猪名川町']);
  assert.equal(errors.length,0,'no page errors: '+errors.join('; '));
  if(output){await fs.mkdir(output,{recursive:true});await page.screenshot({path:path.join(output,'progressive-shared-'+engine+'.png')});}
  console.log('PASS shared progressive '+engine+' all 7 prefectures and original fallback, county, reading toggle and zoom');
 }finally{await app.close();}
}
(async()=>{for(const engine of ['chromium','webkit'])await run(engine);})().catch(e=>{console.error(e);process.exitCode=1;});
