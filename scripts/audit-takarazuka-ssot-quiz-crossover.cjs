'use strict';
// Baseline-vs-isolated pilot. Expected baseline defect is measured, not hidden.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const host=process.env.TOWN_TEST_BASE||'http://127.0.0.1:8765';
const pages={
 baseline:'/v2/takarazuka-town-overlay-compact-matched-20261116-pilot.html',
 pilot:'/v2/takarazuka-town-svg-ssot-quiz-crossover-20261118-pilot.html'
};
const cases=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,720]];
async function run(name,engine,width,height,version){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(host+pages[version],{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名')||document.querySelector('#communityCount')?.textContent.includes('125'),null,{timeout:60000});
  assert.equal(await page.locator('#areas path.town').count(),125);
  await page.locator('#communityToggle').click();
  const regions=await page.locator('#communityOptions button[data-community]').evaluateAll(els=>els.filter(e=>e.dataset.community).map(e=>({name:e.dataset.community,reading:e.querySelector('small')?.textContent||''})));
  assert.equal(regions.length,20);
  assert.ok(regions.every(r=>r.reading&&r.reading!=='読み確認中'));
  // Switch from quiz 1 to quiz 2 after interruption.
  await page.locator('#communityToggle').click();
  await page.locator('#quizOne').click();await page.locator('#quizQuit').click();
  assert.match(await page.locator('#status').innerText(),/中断した問題/);
  await page.locator('#quizTwo').click();
  const notice=await page.locator('#status').innerText();
  const stale=notice.includes('中断した問題');
  assert.equal(stale,version==='baseline','incorrect expected stale status for '+version);
  assert.equal(await page.locator('#quizChoices button').count(),4);
  // Attempt the four choices until correct; verify old status does not resurface.
  for(let i=0;i<4;i++){
   const available=page.locator('#quizChoices button:not([disabled])');
   if(await available.count()===0)break;
   await available.first().click();
   if((await page.locator('#quizFeedback').innerText()).includes('正解です'))break;
  }
  assert.match(await page.locator('#quizFeedback').innerText(),/正解です/);
  if(version==='pilot')assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/);
  await page.locator('#quizQuit').click();
  await page.locator('#quizOne').click();
  if(version==='pilot')assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/);
  assert.deepEqual(errors,[]);
  console.log('TAKARAZUKA_SSOT_QUIZ '+JSON.stringify({screen:name,version,regions:regions.length,paths:125,staleAfterSwitch:stale,correctFirstQuiz2:true,errors:0}));
 }finally{await browser.close()}
}
(async()=>{for(const c of cases){await run(...c,'baseline');await run(...c,'pilot')}})().catch(e=>{console.error(e);process.exitCode=1});
