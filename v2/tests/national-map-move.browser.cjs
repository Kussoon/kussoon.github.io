'use strict';
const assert=require('node:assert/strict');
const {start}=require('./helpers/nationwide-browser.cjs');
(async()=>{
 for(const engine of ['chromium','webkit']){
  const app=await start({engine,contextOptions:{viewport:{width:390,height:844}}});
  const page=app.page,errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await app.open();
   await page.goto(page.url().replace('/v2/national/official-2026-nationwide-pilot.html','/maps/national-municipalities.html'));
   await page.waitForFunction(()=>window.KussoonV2PrefectureColors&&window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905,{},{timeout:90000});
   await page.waitForTimeout(2200);
   const debug=await page.evaluate(()=>({
      controller:window.KussoonV2ProgressivePreview?.controller.snapshot(),
      scripts:[...document.scripts].map(x=>x.src).filter(Boolean).slice(0,8),
      status:document.getElementById('status')?.textContent
   }));
   console.log('RELOCATED MAP DIAGNOSTIC',JSON.stringify(debug).slice(0,2100));
   const geo=await page.evaluate(()=>window.KussoonV2ProgressivePreview.controller.snapshot().geometry);
   assert.equal(geo.backend,'worker','relocated map must not silently fall back to the main-thread renderer');
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://kussoon.com/maps/national-municipalities.html');
   assert.equal(await page.locator('meta[name="robots"]').count(),0,'public map should be indexable');
   const publicLinks=await page.evaluate(async()=>{
     const [home,local]=await Promise.all([fetch('/index.html').then(x=>x.text()),fetch('/local/index.html').then(x=>x.text())]);
     return {home:home.includes('href="/maps/national-municipalities.html"'),local:local.includes('href="/maps/national-municipalities.html"')};
   });
   assert(publicLinks.home&&publicLinks.local,'new public map must be linked from home and local');
   const hub=await page.evaluate(()=>fetch('/maps/index.html').then(r=>r.text()));
   assert(hub.includes('href="/maps/national-municipalities.html"'),'maps hub must link to relocated map');
   const old=await page.evaluate(()=>fetch('/v2/national/map.html').then(r=>r.text()));
   assert(old.includes('location.replace('),'old page must redirect to /maps/');
   const sources=await page.evaluate(()=>Promise.all([
    fetch('/v2/progressive-preview/national-progressive-labels.js').then(r=>r.ok),
    fetch('/v2/national/density-labels.js').then(r=>r.ok),
    fetch('/v2/data/national/2026-common/national-2026-pilot/manifest.json').then(r=>r.ok)
   ]));
   assert(sources.every(Boolean),'all absolute V2 dependencies must resolve');
   assert(await page.locator('footer .kussoon-footer-links-unified a').count()>=7,'public footer present');

   await page.waitForFunction(()=>document.querySelectorAll('#map .prefecture[style*="pref-color"]').length===47,{},{timeout:30000});
   const colors=await page.evaluate(()=>{
    const c=KussoonV2PrefectureColors;
    return {count:new Set(Array.from({length:47},(_,i)=>c.color(String(i+1).padStart(2,'0')))).size,
      miyagi:c.color('04'),fukushima:c.color('07'),hyogo:c.color('28'),osaka:c.color('27')};
   });
   assert(colors.count>=6);
   assert.notEqual(colors.miyagi,colors.fukushima);
   assert.notEqual(colors.hyogo,colors.osaka);
   assert.equal(await page.locator('#mapReadingToggle').getAttribute('aria-pressed'),'false');
   await page.locator('#areaSettings').evaluate(el=>{el.open=true;});
   for(const pref of ['04','07','28']){
    await page.selectOption('#pref',pref);
    await page.waitForFunction(code=>(document.querySelector('#status')?.textContent||'').includes('市区町村を選べます')&&document.querySelector('#pref')?.value===code,pref,{timeout:90000});
    await page.waitForFunction(()=>document.querySelector('#map path.land[style*="pref-color"]')!==null,{},{timeout:30000});
    const code=await page.locator('#region option:not([value=""])').first().getAttribute('value');
    assert(code?.startsWith(pref));
    await page.selectOption('#region',code);
    await page.waitForFunction(c=>!!document.querySelector('#map path.land.chosen[data-code="'+c+'"]'),code,{timeout:30000});
    const selected=await page.evaluate(c=>{
     const el=document.querySelector('#map path.land.chosen[data-code="'+c+'"]'),style=getComputedStyle(el);
     return {color:style.fill,animation:style.animationName,property:el.style.getPropertyValue('--pref-color'),
       expected:KussoonV2PrefectureColors.color(c)};
    },code);
    assert.equal(selected.property,selected.expected,'selected municipality keeps original prefecture palette '+pref);
    const motion=await page.evaluate(()=>({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,body:document.body.className,sheet:!![...document.styleSheets].find(x=>x.href?.includes('prefecture-colors.css')),rules:(()=>{const x=[...document.styleSheets].find(x=>x.href?.includes('prefecture-colors.css'));try{return x?.cssRules?.length}catch(e){return e.message}})(),href:[...document.styleSheets].find(x=>x.href?.includes('prefecture-colors.css'))?.href}));
    console.log('S39 PULSE DIAG',JSON.stringify({engine,pref,motion,selected}));
    if(motion.reduced)assert.equal(selected.animation,'none','reduced-motion disables pulse');
    else assert.equal(selected.animation,'kussoon-selected-area-pulse','only selected path animates');
    assert.equal(await page.locator('#map path.land.chosen').count(),1,'single selected region');
    await page.selectOption('#region','');
    await page.waitForFunction(()=>document.querySelectorAll('#map path.land.chosen').length===0);
    console.log('PASS public nationwide colour and pulse '+engine+' '+pref+' selected='+code);
   }
   assert.equal(errors.length,0,errors.join('; '));
   console.log('PASS public nationwide '+engine+' old production path untouched; map loading and province colours, pulse passed');
  }finally{await app.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
