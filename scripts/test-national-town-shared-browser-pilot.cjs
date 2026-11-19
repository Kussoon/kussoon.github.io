'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const cases=[
 ['chromium-1280',chromium,1280,800],
 ['webkit-390',webkit,390,844]
];
async function run(driver,name,width,height){
 const browser=await driver.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},isMobile:width<600,
   hasTouch:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8765/v2/town-map-shared-browser-20261119-pilot.html',
   {waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===125,null,{timeout:60000});
  const census=await page.evaluate(()=>({
   towns:document.querySelectorAll('#areas path.town').length,
   labels:document.querySelectorAll('#labels g.label').length,
   regions:document.querySelectorAll('#region option').length,
   ready:document.querySelector('#readiness').textContent
  }));
  assert.equal(census.towns,125);
  assert.equal(census.labels,125);
  assert.equal(census.regions,21);
  assert.match(census.ready,/125町名 \/ 20地域/);
  await page.locator('#region').selectOption('仁川');
  const active=await page.evaluate(()=>window.__townPreview.activeCount());
  assert(active>0&&active<125,'region-specific town count');
  assert.equal(await page.locator('#areas path.town').count(),active);
  await page.locator('#quizOne').click();
  assert.equal(await page.evaluate(()=>window.__townPreview.quizMode()),1);
  let target=await page.evaluate(()=>window.__townPreview.quizTarget());
  assert(target);
  await page.evaluate(target=>{
   const path=[...document.querySelectorAll('#areas path.town')].find(p=>p.dataset.name===target);
   if(!path)throw Error('Quiz-1 target missing from map');
   path.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  },target);
  assert.equal(await page.locator('#quizNext').isVisible(),true);
  await page.locator('#quizQuit').click();
  assert.equal(await page.locator('#quizResults').isVisible(),true);
  await page.locator('#quizTwo').click();
  assert.equal(await page.evaluate(()=>window.__townPreview.quizMode()),2);
  target=await page.evaluate(()=>window.__townPreview.quizTarget());
  assert.equal(await page.locator('#quizChoices button').count(),4);
  const answer=page.locator('#quizChoices button').filter({has:page.locator('.choice-name', {hasText:target})});
  await answer.click();
  assert.equal(await page.locator('#quizNext').isVisible(),true);
  await page.locator('#quizQuit').click();
  await page.locator('#quizBack').click();
  assert.equal(await page.evaluate(()=>window.__townPreview.quizMode()),0);
  await page.locator('#region').selectOption('');
  assert.equal(await page.locator('#areas path.town').count(),125);
  await page.locator('#reading').click();
  assert.equal(await page.locator('#labels .town-reading').count(),125);
  assert.deepEqual(errors,[],'no uncaught browser exceptions');
  console.log('PASS NATIONAL_TOWN_SHARED_BROWSER '+JSON.stringify({name,towns:125,regions:20,scope:active,quiz1:true,quiz2:true,reading:true}));
 }finally{await browser.close()}
}
(async()=>{for(const [name,driver,w,h] of cases)await run(driver,name,w,h)})()
 .catch(err=>{console.error(err);process.exitCode=1});
