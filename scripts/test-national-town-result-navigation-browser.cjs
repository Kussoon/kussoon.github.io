'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const cities=[
 {city:'Nishinomiya',region:'西宮浜',count:321,pages:[
  '/v2/nishinomiya-town-svg-quiz-ui-20261118-pilot.html',
  '/v2/nishinomiya-town-svg-result-navigation-20261118-pilot.html']},
 {city:'Takarazuka',region:'仁川',count:125,pages:[
  '/v2/takarazuka-town-svg-quiz-ui-20261118-pilot.html',
  '/v2/takarazuka-town-svg-result-navigation-20261118-pilot.html']}
];
const screens=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
async function run(browser,city,url,width,height){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:2});
 await page.addInitScript(()=>{let seed=91812;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const states=[];
 async function snap(stage){
  states.push({stage,...await page.evaluate(()=>{
   const get=id=>document.getElementById(id);
   return {status:get('status').textContent,region:get('communityCount').textContent,
    result:get('quizResult').textContent,question:get('quizQuestion').textContent,
    feedback:get('quizFeedback').textContent,
    panelHidden:get('quizPanel').hidden,resultsHidden:get('quizResults').hidden,
    retryWrongHidden:get('quizRetryWrong').hidden,
    retryWrongDisabled:get('quizRetryWrong').disabled,
    retryAllDisabled:get('quizRetryAll').disabled,
    nextHidden:get('quizNext').hidden,choiceCount:get('quizChoices').querySelectorAll('button').length,
    inQuiz:document.body.classList.contains('town-quiz-mode')};
  })});
 }
 try{
  await page.goto('http://127.0.0.1:8765'+url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(n=>document.querySelector('#communityCount')?.textContent.includes(n+'町名'),city.count,{timeout:60000});
  await page.evaluate(name=>document.querySelector('#communityOptions button[data-community="'+name+'"]').click(),city.region);
  await snap('region');
  await page.locator('#quizOne').click();await snap('start-quiz1');
  await page.locator('#quizQuit').click();await snap('quit-no-wrong');
  await page.locator('#quizRetryAll').click();await snap('retry-all');
  assert.doesNotMatch(states.at(-1).status,/中断した問題/);
  await page.locator('#quizReveal').click();await snap('reveal-wrong');
  await page.locator('#quizQuit').click();await snap('quit-with-wrong');
  assert.equal(await page.locator('#quizRetryWrong').isEnabled(),true);
  await page.locator('#quizRetryWrong').click();await snap('retry-wrong-only');
  assert.doesNotMatch(states.at(-1).status,/中断した問題/);
  await page.locator('#quizQuit').click();await snap('quit-retry');
  await page.locator('#quizBack').click();await snap('back-to-region');
  await page.locator('#quizTwo').click();await snap('start-quiz2');
  await page.locator('#quizQuit').click();await snap('quit-quiz2');
  await page.locator('#quizRetryAll').click();await snap('retry-all-quiz2');
  assert.equal(await page.locator('#quizChoices button').count(),4);
  assert.deepEqual(errors,[],city.city+' page errors');
  return states;
 }finally{await page.close()}
}
(async()=>{
 for(const [screen,driver,w,h] of screens){
  const browser=await driver.launch({headless:true});
  try{
   for(const city of cities){
    const before=await run(browser,city,city.pages[0],w,h);
    const after=await run(browser,city,city.pages[1],w,h);
    // The only approved difference is R-TOWN-33: when there are no wrong
    // questions, the old Takarazuka pilot left a disabled button visible.
    // The new nationwide specification hides it in both cities.
    const normalized=before.map(item=>({...item,
      retryWrongHidden:item.retryWrongDisabled
       ?true:item.retryWrongHidden
    }));
    assert.deepEqual(after,normalized,city.city+' '+screen+' result/retry navigation parity');
    for(const item of after){
      if(!item.resultsHidden&&item.retryWrongDisabled)
       assert.equal(item.retryWrongHidden,true,city.city+' '+screen+' zero wrong retry must be hidden');
      if(!item.resultsHidden&&!item.retryWrongDisabled)
       assert.equal(item.retryWrongHidden,false,city.city+' '+screen+' nonzero wrong retry must remain visible');
    }
    console.log('PASS NATIONAL_TOWN_RESULT_NAVIGATION_PARITY '+JSON.stringify({city:city.city,screen,states:before.length,retryWrong:true,retryAll:true,back:true}));
   }
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
