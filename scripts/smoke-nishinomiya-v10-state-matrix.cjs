// SVG V6 state-transition matrix: controls, region changes, quiz interruptions.
// No source map changes. Browser emulation does not replace iPhone Safari acceptance.
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const route='/v2/nishinomiya-town-svg-master-v10-20261117-pilot.html';
const out=path.resolve('nishinomiya-v10-state-matrix');fs.mkdirSync(out,{recursive:true});
const states=[
 {name:'chromium-1280',browser:chromium,width:1280,height:800},
 {name:'webkit-390',browser:webkit,width:390,height:844},
 {name:'webkit-320',browser:webkit,width:320,height:668}
];
const visible=(page,sel)=>page.locator(sel).isVisible();
async function region(page,name){
 await page.locator('#communityToggle').click();
 await page.locator('#communityOptions button').filter({has:page.locator('strong',{hasText:name})}).first().click();
}
async function town(page,name){
 return page.evaluate(name=>{
  const p=[...document.querySelectorAll('#areas path.town')].find(x=>x.__data__?.properties?.S_NAME===name);
  if(!p)return false;p.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true
 },name);
}
const current=page=>page.evaluate(()=>{
 const scale=d3.zoomTransform(document.querySelector('#map')).k;
 const labs=[...document.querySelectorAll('#labels text.town-label')];
 return {
  scale,fullscreen:document.body.classList.contains('fullscreen'),
  selected:document.querySelectorAll('#areas path.town.selected').length,
  paths:document.querySelectorAll('#areas path.town').length,
  labels:labs.length,reading:document.querySelectorAll('#labels .town-reading').length,
  font:Number(labs[0]?.getAttribute('font-size')),
  result:document.querySelector('#quizResults')?.hidden,
  panel:document.querySelector('#quizPanel')?.hidden,
  feedback:document.querySelector('#quizFeedback')?.textContent,
  fit:document.querySelectorAll('#labels g.label[data-edge-shift]').length
 }
});
async function run(conf){
 const browser=await conf.browser.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:conf.width,height:conf.height},deviceScaleFactor:2,
   isMobile:conf.width<600,hasTouch:conf.width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
  const record=[];
  const snapshot=async phase=>{const s=await current(page);record.push({phase,...s});assert(Number.isFinite(s.scale)&&s.scale>0,phase+' invalid scale');return s};
  let s=await snapshot('initial');
  assert.equal(s.paths,321);assert.equal(s.labels,324);assert.equal(s.reading,0);assert(!s.fullscreen);
  await page.locator('#reading').click();
  await page.locator('#larger').click();
  s=await snapshot('reading125');
  assert.equal(s.reading,324);assert(Math.abs(s.font-10)<.01);
  await page.locator('#fullscreen').click();await page.waitForTimeout(250);
  s=await snapshot('fullscreen-reading125');
  assert(s.fullscreen&&s.reading===324&&Math.abs(s.font-10)<.01);
  // Fullscreen covers the community chooser, which lives OUTSIDE the map.
  // Verify the state can be left safely; choose the region in normal mode,
  // then re-enter fullscreen to test persistence instead of clicking through
  // the fullscreen SVG overlay.
  assert.equal(await page.locator('#communityToggle').evaluate(el=>{
   const top=document.elementFromPoint(el.getBoundingClientRect().left+el.getBoundingClientRect().width/2,
    el.getBoundingClientRect().top+el.getBoundingClientRect().height/2);
   return top===el||el.contains(top);
  }),false,'fullscreen covers the external region chooser');
  await page.locator('#fullscreen').click();await page.waitForTimeout(250);
  s=await snapshot('fullscreen-exit-before-region-selection');
  assert(!s.fullscreen);assert.equal(s.paths,321);assert.equal(s.reading,324);
  await region(page,'西宮浜');
  s=await snapshot('region-switch-in-normal-mode');
  assert.equal(s.paths,1);assert.equal(s.labels,1);assert(!s.fullscreen);assert.equal(s.reading,1);
  await page.locator('#fullscreen').click();await page.waitForTimeout(250);
  s=await snapshot('fullscreen-region-preserved');
  assert(s.fullscreen);assert.equal(s.paths,1);assert.equal(s.reading,1);
  await page.locator('#fullscreen').click();await page.waitForTimeout(250);
  s=await snapshot('fullscreen-exit-region-preserved');
  assert(!s.fullscreen);assert.equal(s.paths,1);assert.equal(s.reading,1);
  await page.locator('#quizTwo').click();
  s=await snapshot('quiz2-start');
  assert.equal(s.labels,1);assert.equal(s.reading,1);assert(!s.panel);
  assert.equal(await page.locator('#labels').evaluate(el=>getComputedStyle(el).display),'none','quiz must hide, not delete, town labels');
  assert.equal(await page.locator('#quizChoices button').count(),4);
  await page.locator('#quizQuit').click();
  s=await snapshot('quiz2-quit');
  assert(s.result===false&&s.panel===true);
  assert.match(await page.locator('#quizResult').innerText(),/途中終了/);
  assert.equal(s.labels,1);assert.equal(s.reading,1);
  await page.locator('#quizBack').click();
  s=await snapshot('quiz-back');
  assert(s.result&&s.panel&&s.reading===1&&s.paths===1);
  await page.locator('#quizOne').click();
  assert.equal(await page.locator('#quizReveal').isVisible(),true);
  await page.locator('#quizReveal').click();
  assert.match(await page.locator('#quizFeedback').innerText(),/答えは/);
  await page.locator('#quizNext').click();
  assert.match(await page.locator('#quizResult').innerText(),/間違えた問題 1件/);
  assert.equal(await visible(page,'#quizRetryWrong'),true);
  await page.locator('#quizRetryWrong').click();
  assert(await town(page,'西宮浜'),'missing one-town retry');
  await page.locator('#quizNext').click();
  assert.equal(await visible(page,'#quizRetryWrong'),false);
  await page.locator('#quizBack').click();
  await region(page,'山口');
  s=await snapshot('region-change-after-quiz');
  assert(s.paths>1&&s.paths<321);assert.equal(s.reading,s.labels);
  await page.locator('#zoomIn').click();await page.waitForTimeout(220);
  s=await snapshot('zoom-after-region-change');
  assert(s.scale>1&&s.fit===0,'zoom must release edge labels');
  await page.locator('#reset').click();await page.waitForTimeout(100);
  s=await snapshot('region-fit-reset');
  assert(s.fit>=0&&s.reading===s.labels);
  await page.locator('#reading').click();
  await page.locator('#size').click();
  s=await snapshot('reset-reading-and-size');
  assert.equal(s.reading,0);assert(s.font>0);
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community=""]').click());
  s=await snapshot('city-restored');
  assert.equal(s.paths,321);assert.equal(s.labels,324);assert.equal(s.reading,0);assert(!s.fullscreen);
  assert.deepEqual(errors,[],conf.name+' uncaught errors');
  fs.writeFileSync(path.join(out,conf.name+'.json'),JSON.stringify(record,null,2));
  await page.screenshot({path:path.join(out,conf.name+'.png'),fullPage:true});
  console.log('PASS STATE_MATRIX '+JSON.stringify({device:conf.name,transitions:record.length,final:s.paths,quiz:true,fullscreen:true}));
 }finally{await browser.close()}
}
(async()=>{for(const c of states)await run(c)})().catch(e=>{console.error(e);process.exitCode=1});
