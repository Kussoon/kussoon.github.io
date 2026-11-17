'use strict';
// Regression for the iPhone report: a quiz1 interrupted-town message must not
// remain above the map after quiz2 begins and accepts its first answer.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const target='http://127.0.0.1:8765/v2/nishinomiya-town-svg-master-v34-20261117-pilot.html';
async function run(browserType,name,width,height){
 const browser=await browserType.launch();
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<600,hasTouch:width<600});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
  // Use the one-town region so the first quiz target is deterministic.
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community="西宮浜"]').click());
  await page.locator('#quizOne').click();
  await page.locator('#quizQuit').click();
  assert.match(await page.locator('#status').innerText(),/中断した問題/);
  await page.locator('#quizTwo').click();
  assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/,'quiz2 starts with old quiz1 interruption');
  assert.equal(await page.locator('#quizChoices button').count(),4);
  // Pick the correct answer; it is always 西宮浜 when the region has one town.
  const correct=page.locator('#quizChoices button').filter({hasText:'西宮浜'}).first();
  assert.equal(await correct.count(),1);
  await correct.click();
  assert.match(await page.locator('#quizFeedback').innerText(),/正解です/);
  assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/,'quiz2 answered with old quiz1 interruption');
  await page.locator('#quizNext').click();
  assert.equal(await page.locator('#quizResults').isVisible(),true);
  // Repeat in opposite direction; each new quiz owns its own status message.
  await page.locator('#quizBack').click();
  await page.locator('#quizTwo').click();
  await page.locator('#quizQuit').click();
  assert.match(await page.locator('#status').innerText(),/中断した問題/);
  await page.locator('#quizOne').click();
  assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/,'quiz1 starts with old quiz2 interruption');
  assert.deepEqual(errors,[]);
  console.log('PASS QUIZ_STATUS_CROSSOVER '+JSON.stringify({name,width,quiz1_to_quiz2:true,first_quiz2_correct:true,quiz2_to_quiz1:true}));
  await page.close();
 }finally{await browser.close()}
}
(async()=>{
 await run(chromium,'chromium-desktop',1280,800);
 await run(webkit,'webkit-iphone-390',390,844);
 await run(webkit,'webkit-iphone-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
