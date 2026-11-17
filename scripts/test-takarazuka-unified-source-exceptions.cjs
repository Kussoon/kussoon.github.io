'use strict';
// TOWNMAP-SSOT-001 R-TOWN-30..35,44. Diagnostic only, no production edits.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const origin='http://127.0.0.1:8765',html='/v2/takarazuka-town-svg-unified-source-20261118-pilot.html';
const js='/v2/common/js/town-map-unified-source-takarazuka-20261118-pilot.js';
const output='takarazuka-ssot-quiz-exceptions';fs.mkdirSync(output,{recursive:true});
const engines=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,720]];
const injected=`window.__quizExceptionAudit={
  start:(mode,names)=>startQuiz(mode,names),
  state:()=>({mode:quizMode,lastMode:quizLastMode,index:quizIndex,
    order:[...quizOrder],score:quizScore,wrong:[...quizWrong],locked:quizLocked,
    selected,blinkActive:blinkTimer!==null,quizBlinkActive:quizTimer!==null,
    community:communityChoice}),
  mapAnswer:name=>quizMapAnswer(name),
  choice:(name)=>{
   const button=[...document.querySelectorAll('#quizChoices button')].find(b=>b.querySelector('.choice-name')?.textContent===name);
   if(!button)throw Error('choice not found '+name);
   button.click();
  },
  choices:()=>[...document.querySelectorAll('#quizChoices button')].map(b=>({name:b.querySelector('.choice-name')?.textContent||'',disabled:b.disabled,wrong:b.classList.contains('quiz-wrong')})),
  active:()=>active().map(t=>t.name)
};\n`;
async function run([screen,engine,width,height]){
 const browser=await engine.launch({headless:true});const log=[];
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**'+js,async route=>{
   const response=await route.fetch(),body=await response.text(),marker='function startQuiz(mode,forced){';
   assert.equal(body.split(marker).length,2);
   await route.fulfill({response,body:body.replace(marker,injected+marker),
    headers:{...response.headers(),'content-type':'text/javascript; charset=utf-8'}});
  });
  await page.goto(origin+html,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  const state=()=>page.evaluate(()=>window.__quizExceptionAudit.state());
  const start=(mode,names)=>page.evaluate(p=>window.__quizExceptionAudit.start(p.mode,p.names),{mode,names});
  const mapAnswer=name=>page.evaluate(n=>window.__quizExceptionAudit.mapAnswer(n),name);
  const choice=name=>page.evaluate(n=>window.__quizExceptionAudit.choice(n),name);
  const choices=()=>page.evaluate(()=>window.__quizExceptionAudit.choices());
  const towns=await page.evaluate(()=>window.__quizExceptionAudit.active());
  assert.equal(towns.length,125);
  const [a,b,c]=towns.slice(0,3);
  // Quiz1: identical wrong area only charges once per question.
  await start(1,[a,b]);
  let q=await state(),first=q.order[0],other=towns.find(n=>n!==first);
  await mapAnswer(other);
  q=await state();assert.equal(q.score,1);assert.deepEqual(q.wrong,[first]);
  assert.match(await page.locator('#quizFeedback').innerText(),/違います/);
  await mapAnswer(other);assert.equal((await state()).score,1,'same incorrect area should be ignored');
  await mapAnswer(first);assert.equal((await state()).score,1);
  assert.match(await page.locator('#quizFeedback').innerText(),/正解です！/);
  await page.locator('#quizNext').click();
  q=await state();assert.equal(q.index,1);await mapAnswer(q.order[1]);
  await page.locator('#quizNext').click();
  assert.match(await page.locator('#quizResult').innerText(),/2問中 1点/);
  assert.equal(await page.locator('#quizRetryWrong').isEnabled(),true);
  log.push({case:'quiz1 wrong-once / answer / result',pass:true});

  await page.locator('#quizRetryWrong').click();
  q=await state();assert.equal(q.order.length,1);assert.deepEqual(q.order,[first]);
  await mapAnswer(first);await page.locator('#quizNext').click();
  assert.match(await page.locator('#quizResult').innerText(),/1問中 1点/);
  log.push({case:'quiz1 replay missed-only',pass:true});
  await page.locator('#quizRetryAll').click();
  q=await state();assert.equal(q.order.length,125,'retry all returns selected community scope');
  await page.locator('#quizQuit').click();
  assert.equal(await page.locator('#quizResults').isVisible(),true);
  assert.match(await page.locator('#quizResult').innerText(),/途中終了/);
  log.push({case:'quiz1 retry-all / quit',pass:true});

  // Switching to quiz2 must discard the previous quiz1 interruption.
  await start(2,[a,b]);
  assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/);
  q=await state();assert.equal(q.order.length,2);
  let opts=await choices();assert.equal(opts.length,4);
  const first2=q.order[0],wrong2=opts.find(o=>o.name!==first2).name;
  await choice(wrong2);q=await state();assert.equal(q.score,1);
  assert.ok((await choices()).find(o=>o.name===wrong2).disabled);
  assert.match(await page.locator('#quizFeedback').innerText(),/違います/);
  await choice(wrong2);assert.equal((await state()).score,1,'disabled wrong answer cannot subtract again');
  await choice(first2);q=await state();assert.equal(q.score,1);assert.equal(q.locked,true);
  assert.match(await page.locator('#quizFeedback').innerText(),/正解です！/);
  await page.locator('#quizNext').click();
  q=await state();await choice(q.order[1]);await page.locator('#quizNext').click();
  assert.match(await page.locator('#quizResult').innerText(),/2問中 1点/);
  await page.locator('#quizRetryWrong').click();
  q=await state();assert.equal(q.mode,2);assert.deepEqual(q.order,[first2]);
  await choice(first2);await page.locator('#quizNext').click();
  assert.match(await page.locator('#quizResult').innerText(),/1問中 1点/);
  log.push({case:'quiz2 wrong, disabled repeat, correct, missed-only replay',pass:true});

  // Quit without answering then return to region selection: no stale quiz UI.
  await start(2,[a,b]);
  await page.locator('#quizQuit').click();
  const interrupted=await page.locator('#status').innerText();
  assert.match(interrupted,/中断した問題/);
  await page.locator('#quizBack').click();
  assert.equal((await state()).mode,0);
  assert.equal(await page.locator('#quizResults').isVisible(),false);
  const postBack=await page.locator('#status').innerText();
  assert.doesNotMatch(postBack,/中断した問題/,'stale hint after returning to area selection');
  log.push({case:'back to community after quit',staleStatus:/中断した問題/.test(postBack),text:postBack.slice(0,130)});
  // State change through the region selector must not retain a stale quit hint.
  await page.locator('#communityToggle').click();
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community="仁川"]').click());
  assert.equal((await state()).community,'仁川');
  const postCommunity=await page.locator('#status').innerText();
  assert.doesNotMatch(postCommunity,/中断した問題/,'stale hint after area change');
  assert.match(postCommunity,/仁川/,'area status must show chosen area');
  log.push({case:'region change after quit',staleStatus:/中断した問題/.test(postCommunity),text:postCommunity.slice(0,130)});
  await page.locator('#quizOne').click();
  q=await state();assert.equal(q.order.length,12);
  assert.doesNotMatch(await page.locator('#status').innerText(),/中断した問題/);
  await page.locator('#quizQuit').click();
  log.push({case:'region scope 仁川 12 + re-enter quiz',pass:true});

  assert.deepEqual(errors,[]);
  console.log('TAKARAZUKA_QUIZ_EXCEPTIONS '+JSON.stringify({screen,log,errors:errors.length}));
  fs.writeFileSync(path.join(output,screen+'.json'),JSON.stringify({screen,log,errors},null,2));
 }finally{await browser.close()}
}
(async()=>{for(const c of engines)await run(c)})().catch(e=>{console.error(e);process.exitCode=1});
