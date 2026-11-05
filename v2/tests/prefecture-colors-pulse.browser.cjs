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
   await page.goto(page.url().replace('official-2026-nationwide-pilot.html','progressive-color-test.html'));
   await page.waitForFunction(()=>window.KussoonV2PrefectureColors&&window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905,{},{timeout:90000});
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
    const motion=await page.evaluate(()=>({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,body:document.body.className,sheet:!![...document.styleSheets].find(x=>x.href?.includes('prefecture-colors.css'))}));
    console.log('S39 PULSE DIAG',JSON.stringify({engine,pref,motion,selected}));
    if(motion.reduced)assert.equal(selected.animation,'none','reduced-motion disables pulse');
    else assert.equal(selected.animation,'kussoon-selected-area-pulse','only selected path animates');
    assert.equal(await page.locator('#map path.land.chosen').count(),1,'single selected region');
    await page.selectOption('#region','');
    await page.waitForFunction(()=>document.querySelectorAll('#map path.land.chosen').length===0);
    console.log('PASS prefecture colour and pulse '+engine+' '+pref+' selected='+code);
   }
   assert.equal(errors.length,0,errors.join('; '));
  }finally{await app.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
