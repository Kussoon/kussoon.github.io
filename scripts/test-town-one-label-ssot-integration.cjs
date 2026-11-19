'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const BASE='http://127.0.0.1:8765';
const URL=BASE+'/v2/town-map-shared-browser-one-label-20261120-pilot.html';
const OLD=BASE+'/v2/town-map-shared-browser-quiz-feedback-20261119-pilot.html';
async function run(browserType,label,width,height){
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},
   isMobile:width<600,hasTouch:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:120000});
  assert.equal(await page.evaluate(()=>window.__townPreview.oneLabelMode),true);
  const n=()=>page.locator('#labels g.label').count();
  assert.equal(await n(),321,'321 names have 321 labels in city-wide view');
  assert.equal(await page.evaluate(()=>window.__townPreview.labelCandidateCount()),321);
  assert.equal(await page.locator('#areas path.town').count(),321);
  // Zoom frames must not invoke layout-heavy glyph-centering correction.
  await page.evaluate(()=>{
   const api=window.KussoonTownSvgGlyphCenter;
   let calls=0; const align=api.align;
   window.__glyphAlignCalls=()=>calls;
   api.align=(...args)=>{calls++;return align(...args)};
  });
  for(let i=0;i<3;i++)await page.locator('#zoomPlus').click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__glyphAlignCalls()),0,
   'zoom does not force glyph layout correction');
  assert.equal(await page.locator('#quizOne').isEnabled(),true);
  assert.equal(await page.locator('#quizTwo').isEnabled(),true);
  const regions=await page.locator('#region option').count();
  assert.equal(regions,27,'26 certified regions + city');
  for(const region of ['山口','名塩','芦原','西宮浜','甲東']){
   await page.locator('#region').selectOption(region);
   const count=await page.evaluate(()=>window.__townPreview.activeCount());
   assert(count>0,'region is not empty '+region);
   assert.equal(await n(),count,'one label per active town in '+region);
   const unique=await page.locator('#labels g.label').evaluateAll(els=>
    new Set(els.map(el=>el.__data__.name)).size);
   assert.equal(unique,count,'no duplicate labels in '+region);
  }
  await page.locator('#region').selectOption('芦原');
  assert.equal(await page.evaluate(()=>window.__townPreview.activeCount()),7);
  await page.locator('#quizOne').click();
  let target=await page.evaluate(()=>window.__townPreview.quizTarget());
  let wrong=await page.locator('#areas path.town').evaluateAll((els,t)=>
    els.find(x=>x.__data__.name!==t)?.__data__.name,target);
  await page.evaluate(wrong=>{
   const p=[...document.querySelectorAll('#areas path.town')].find(x=>x.__data__.name===wrong);
   p.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  },wrong);
  assert.equal(await page.locator('#areas path.town.wrong').count(),1);
  await page.evaluate(target=>{
   const p=[...document.querySelectorAll('#areas path.town')].find(x=>x.__data__.name===target);
   p.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  },target);
  assert.equal(await page.locator('#areas path.town.selected').count(),1);
  await page.locator('#quizNext').click();
  assert.equal(await page.locator('#areas path.town.wrong').count(),0,'wrong is per question');
  assert.equal(await page.locator('#areas path.town.selected').count(),0,'yellow is per question');
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  const controls=['#fullscreen','#zoomPlus','#zoomMinus'];
  for(const id of controls)assert.equal(await page.locator(id).count(),1,'control preserved '+id);
  const r=await page.locator('#labels g.label').count();
  assert.equal(r,7,'quiz mode does not alter label count in dataset');
  assert.deepEqual(errors,[],label+' page errors');
  await page.goto(OLD,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:120000});
  assert.equal(await page.locator('#labels g.label').count(),324,'historical comparison unchanged');
  console.log('PASS TOWN_ONE_LABEL_INTEGRATION '+JSON.stringify({
   label,towns:321,labels:321,regions:26,quiz1StatePreserved:true,
   quiz2Choices:4,controlsPreserved:true,legacyLabels:324
  }));
 }finally{await browser.close()}
}
(async()=>{
 await run(chromium,'chromium-1280',1280,800);
 await run(webkit,'webkit-390',390,844);
 await run(webkit,'webkit-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
