'use strict';
// R-TOWN-24/30-35: browser checks in both original and isolated common-UI pilot.
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const cases=[
 {name:'Nishinomiya',region:'西宮浜',townCount:321,versions:[
 '/v2/nishinomiya-town-svg-community-state-20261118-pilot.html',
 '/v2/nishinomiya-town-svg-quiz-ui-20261118-pilot.html']},
 {name:'Takarazuka',region:'仁川',townCount:125,versions:[
 '/v2/takarazuka-town-svg-community-state-20261118-pilot.html',
 '/v2/takarazuka-town-svg-quiz-ui-20261118-pilot.html']}
];
const screens=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
async function run(browser,url,city,width,height){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:2});
 // Stable Fisher-Yates question order across both independent pilot pages.
 await page.addInitScript(()=>{let seed=123456789;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const records=[];
 async function snap(label){
  records.push({label,...await page.evaluate(()=>{
   const get=id=>document.getElementById(id);
   return {status:get('status').textContent,feedback:get('quizFeedback').textContent,
    question:get('quizQuestion').textContent,result:get('quizResult').textContent,
    resultsHidden:get('quizResults').hidden,panelHidden:get('quizPanel').hidden,
    nextHidden:get('quizNext').hidden,nextText:get('quizNext').textContent,
    revealHidden:get('quizReveal').hidden,choiceCount:get('quizChoices').querySelectorAll('button').length,
    classQuiz:document.body.classList.contains('town-quiz-mode'),
    region:get('communityCount').textContent};
  })});
 }
 try{
  await page.goto('http://127.0.0.1:8765'+url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(n=>document.querySelector('#communityCount')?.textContent.includes(n+'町名'),city.townCount,{timeout:60000});
  await page.evaluate(name=>{document.querySelector('#communityOptions button[data-community="'+name+'"]').click()},city.region);
  await snap('region');
  await page.locator('#quizOne').click();await snap('quiz1-start');
  assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/);
  await page.locator('#quizQuit').click();await snap('quiz1-quit');
  assert.match(await page.locator('#status').innerText(),/中断した問題/);
  await page.locator('#quizTwo').click();await snap('quiz2-start');
  assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/);
  assert.equal(await page.locator('#quizChoices button').count(),4);
  await page.locator('#quizQuit').click();await snap('quiz2-quit');
  await page.locator('#quizOne').click();await snap('quiz1-restart');
  assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/);
  assert.deepEqual(errors,[],city.name+' browser errors');
  return records;
 }finally{await page.close()}
}
(async()=>{
 for(const [screen,driver,w,h] of screens){
  const browser=await driver.launch({headless:true});
  try{
   for(const city of cases){
    const before=await run(browser,city.versions[0],city,w,h);
    const after=await run(browser,city.versions[1],city,w,h);
    assert.deepEqual(after,before,city.name+' '+screen+' quiz UI presentation parity');
    console.log('PASS NATIONAL_TOWN_QUIZ_UI_BROWSER '+JSON.stringify({city:city.name,screen,states:before.length,quiz1_to_quiz2:true,quiz2_to_quiz1:true}));
   }
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
