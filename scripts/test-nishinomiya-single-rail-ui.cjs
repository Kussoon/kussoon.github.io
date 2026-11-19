'use strict';
// Nationwide v1.3 accepted right-side control UI; preserve 321 town V34.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const url='http://127.0.0.1:8765/v2/nishinomiya-town-svg-single-rail-20261119-pilot.html';
async function test(driver,name,w,h){
 const browser=await driver.launch();
 try{
  const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<600,hasTouch:w<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
  const get=()=>page.evaluate(()=>{
   const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
   const labelNodes=[...document.querySelectorAll('#labels g.label')];
   const labelTexts=labelNodes.map(e=>e.querySelector('.town-name')?.textContent?.trim()||'').filter(Boolean);
   return {frame:rect('#frame'),rail:rect('.map-right-rail'),full:rect('#fullscreen'),plus:rect('.map-zoom-slider .zoom-mark:first-child'),minus:rect('.map-zoom-slider .zoom-mark:last-child'),
     slider:rect('.map-zoom-slider'),track:rect('.zoom-slider-visual-track'),thumb:rect('.zoom-slider-visual-thumb'),textPlus:rect('#larger'),
     k:d3.zoomTransform(document.querySelector('#map')).k,range:Number(document.querySelector('#zoomSlider').value),
     names:new Set(labelTexts).size,labels:labelNodes.length,oldButtons:document.querySelectorAll('#zoomIn,#zoomOut').length,
     readingText:document.querySelector('#reading').textContent,
     zoomPlus:rect('#zoomPlus'),zoomMinus:rect('#zoomMinus'),resetCount:document.querySelectorAll('#reset').length};
  });
  const check=g=>{
   assert.equal(g.oldButtons,0,name+' old map +/- removed');
   assert.equal(g.resetCount,0,name+' city whole standalone button removed');
   assert(g.zoomPlus.height>=32&&g.zoomMinus.height>=32,name+' step button hit targets');
   assert.equal(g.names,321,name+' town labels retained');
   assert.equal(g.labels,324,name+' multipart labels retained');
   assert(g.full.bottom+1<=g.plus.top,name+' full button above slider');
   assert(g.slider.bottom+1<=g.textPlus.top,name+' slider above text plus');
   assert(Math.abs(g.full.right-g.textPlus.right)<10,name+' right aligned');
   assert(g.rail.top>=g.frame.top-2&&g.rail.bottom<=g.frame.bottom+2,name+' rail within frame');
   assert(Math.abs(g.track.width-10)<1&&Math.abs(g.thumb.width-21)<1&&Math.abs(g.thumb.height-27)<1,name+' adopted Safari styling');
  };
  let g=await get();check(g);
  const start=g.k;
  await page.locator('#zoomSlider').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}))});
  const hi=await get();assert(hi.k>start);
  assert(Math.abs(hi.thumb.top-hi.track.top)<1.5,name+' upper thumb aligns with max');
  await page.locator('#zoomSlider').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
  const lo=await get();assert(lo.k<hi.k);
  assert(Math.abs(lo.thumb.bottom-lo.track.bottom)<1.5,name+' lower thumb aligns with min');
  await page.locator('#zoomSlider').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});await page.waitForTimeout(170);
  check(await get());
  // The plus/minus controls must trigger zoom independently.
  const beforeStep=(await get()).k;
  await page.locator('#zoomPlus').click();
  const afterPlus=(await get()).k;
  assert(afterPlus>beforeStep,name+' framed plus click zooms');
  await page.locator('#zoomMinus').click();
  assert((await get()).k<afterPlus,name+' framed minus click zooms');
    await page.locator('#reading').click();
  assert.equal(await page.locator('#reading').getAttribute('aria-pressed'),'true');
  await page.locator('#reading').click();
  await page.locator('#larger').click();
  assert.match(await page.locator('#size').innerText(),/100/,name+' reset button caption remains 100%');
  await page.locator('#size').click();
  assert.equal((await page.locator('#size').innerText()).replace(/\s+/g,''),'文字100％',name+' reset caption fixed');
  const touchProtection=await page.locator('.zoom-slider-well').evaluate(el=>{
   const css=getComputedStyle(el);
   return {userSelect:css.userSelect,webkitTouchCallout:css.getPropertyValue('-webkit-touch-callout')};
  });
  assert.equal(touchProtection.userSelect,'none',name+' prevents iOS long-press text selection');
  assert.equal(touchProtection.webkitTouchCallout,'none',name+' prevents iOS long-press callout');
  await page.locator('#fullscreen').click();await page.waitForTimeout(380);
  check(await get());
  assert.equal(await page.locator('#fullscreen').innerText(),'戻る');
  await page.locator('#fullscreen').click();await page.waitForTimeout(380);
  assert.equal(await page.locator('#fullscreen').innerText(),'全画面');
  assert.deepEqual(errors,[],name+' browser errors');
  console.log('PASS NISHINOMIYA_SINGLE_RAIL '+JSON.stringify({browser:name,labels:324,towns:321,max:hi.k,min:lo.k,fullscreen:true}));
 }finally{await browser.close()}
}
(async()=>{await test(chromium,'chromium-1280',1280,800);await test(webkit,'webkit-390',390,844);await test(webkit,'webkit-320',320,668)})().catch(e=>{console.error(e);process.exitCode=1});
