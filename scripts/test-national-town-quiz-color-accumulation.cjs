'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8765/v2/town-map-shared-browser-quiz-feedback-20261119-pilot.html';

async function run(engine,label,width,height){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},
   hasTouch:width<600,isMobile:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:90000});
  await page.locator('#region').selectOption('芦原');
  assert.equal(await page.evaluate(()=>window.__townPreview.activeCount()),7);
  const appearance=()=>page.evaluate(()=>{
   const all=[...document.querySelectorAll('#areas path.town')];
   return {
    yellow:all.filter(p=>p.classList.contains('selected')).map(p=>p.__data__.name),
    blink:all.filter(p=>p.classList.contains('blink')).map(p=>p.__data__.name),
    red:all.filter(p=>p.classList.contains('wrong')).map(p=>p.__data__.name),
    names:all.map(p=>p.__data__.name),
    score:document.querySelector('#quizProgress').textContent,
    target:window.__townPreview.quizTarget()
   };
  });
  async function clickTown(name){
   await page.evaluate(name=>{
    const el=[...document.querySelectorAll('#areas path.town')]
      .find(p=>p.__data__.name===name);
    assertPresent(el,name);
    el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    function assertPresent(x,n){if(!x)throw Error('No SVG area for '+n)}
   },name);
  }
  await page.locator('#quizOne').click();
  let state=await appearance();
  assert(state.target&&state.names.length===7);
  const wrong1=state.names.find(n=>n!==state.target);
  await clickTown(wrong1);
  state=await appearance();assert.deepEqual(state.red,[wrong1]);
  assert.deepEqual(state.yellow,[]);
  assert.match(state.score,/得点 6/);
  // The same erroneous place must not cost a point twice within this question.
  await clickTown(wrong1);assert.match((await appearance()).score,/得点 6/);
  const firstCorrect=state.target;
  await clickTown(firstCorrect);
  state=await appearance();
  assert.deepEqual(state.yellow,[firstCorrect]);
  assert(state.red.includes(wrong1));
  await page.locator('#quizNext').click();
  state=await appearance();
  assert.equal(state.yellow.length,0,'old yellow correct highlight must not accumulate');
  assert.deepEqual(state.red,[],'red error must clear upon entering the next question');
  assert.equal(state.blink.length,0);
  const wrong2=state.names.find(n=>n!==state.target&&n!==wrong1);
  assert(wrong2,'the second wrong tap must be a different region');
  await clickTown(wrong2);
  state=await appearance();
  assert.deepEqual(state.red,[wrong2],'only current-question wrong taps may be red');
  assert.match(state.score,/得点 5/);
  await clickTown(state.target);
  state=await appearance();
  assert.equal(state.yellow.length,1);
  assert.equal(state.yellow[0],state.target);
  await page.locator('#quizNext').click();
  state=await appearance();
  assert.equal(state.yellow.length,0,'second yellow must disappear');
  assert.deepEqual(state.red,[],'all previous-question red must clear on next question');
  // A fresh question can mark multiple different wrong towns simultaneously.
  // The already-used wrongs from earlier questions have no display persistence.
  const wrong3a=state.names.find(n=>n!==state.target);
  const wrong3b=state.names.find(n=>n!==state.target&&n!==wrong3a);
  await clickTown(wrong3a);
  await clickTown(wrong3b);
  state=await appearance();
  assert.deepEqual(new Set(state.red),new Set([wrong3a,wrong3b]),
   'two red towns must accumulate while the SAME question remains active');
  assert.match(state.score,/得点 3/);
  await clickTown(state.target);
  state=await appearance();
  assert.equal(state.yellow.length,1);
  assert.equal(state.red.length,2,'red stays through correct answer until next question');
  await page.locator('#quizNext').click();
  state=await appearance();
  assert.deepEqual(state.red,[],'next question clears all reds after correct answer');
  assert.deepEqual(state.yellow,[],'next question also clears yellow');
  // Quiz1 -> quiz2 must reset all color state, while retry history stays available.
  await page.locator('#quizTwo').click();
  state=await appearance();
  assert.equal(state.red.length,0,'new quiz starts with no previous red');
  assert.equal(state.yellow.length,0,'a new quiz clears prior quiz yellow');
  assert(state.blink.length<=1,'one target may blink, never multiple');
  let q2target=state.target;
  const buttons=page.locator('#quizChoices button');
  assert.equal(await buttons.count(),4);
  let correctIdx=await buttons.evaluateAll((els,target)=>els.findIndex(
   e=>e.querySelector('.choice-name')?.textContent?.trim()===target
  ),q2target);
  assert(correctIdx>=0,'quiz2 has correct choice for the current target');
  const wrongIdx=[0,1,2,3].find(x=>x!==correctIdx);
  await buttons.nth(wrongIdx).click();
  assert.equal(await buttons.nth(wrongIdx).getAttribute('class')?.then(c=>c.includes('quiz-wrong')),true);
  await buttons.nth(correctIdx).click();
  state=await appearance();
  assert.deepEqual(state.yellow,[q2target]);
  assert.equal(state.blink.length,0,'correct answer stops blinking');
  await page.locator('#quizNext').click();
  state=await appearance();
  assert.equal(state.yellow.length,0,'quiz2 old yellow must not accumulate');
  assert(state.blink.length<=1,'quiz2 next question has at most one blinking target');
  assert.equal(state.red.length,0);
  await page.locator('#quizQuit').click();
  await page.locator('#quizBack').click();
  state=await appearance();
  assert.equal(state.yellow.length,0);assert.equal(state.red.length,0);
  assert.equal(state.blink.length,0);
  // Region change clears any remaining color state as part of map navigation.
  await page.locator('#region').selectOption('西宮浜');
  assert.equal(await page.evaluate(()=>window.__townPreview.currentRegion()),'西宮浜');
  assert.deepEqual(errors,[],label+' runtime errors');
  console.log('PASS NATIONAL_QUIZ_COLOR_ACCUMULATION '+JSON.stringify({
   label,wrong1,wrong2,correct:firstCorrect,quiz2Target:q2target,
   redWithinQuestionOnly:true,yellowCurrentOnly:true,quizReset:true,scorePreserved:true
  }));
 }finally{await browser.close()}
}
(async()=>{
 await run(chromium,'chromium-1280',1280,800);
 await run(webkit,'webkit-390',390,844);
 await run(webkit,'webkit-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
