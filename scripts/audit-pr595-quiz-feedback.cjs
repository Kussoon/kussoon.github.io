'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function run(page,cfg,out,{city,samples}){
 const report={city,browser:cfg.name,scenarios:[]};
 const state=()=>page.evaluate(()=>({
  red:[...document.querySelectorAll('path.town.wrong')].map(e=>e.__data__.properties.S_NAME).sort(),
  yellow:[...document.querySelectorAll('path.town.selected')].map(e=>e.__data__.properties.S_NAME).sort(),
  feedback:document.querySelector('#quizFeedback').textContent,
  score:Number(document.querySelector('#quizProgress').textContent.match(/得点 (\d+)/)?.[1])
 }));
 for(const [index,kind]of ['reveal','correct-map','correct-choice'].entries()){
  const target=samples[index];
  const setup=await page.evaluate(({target,kind})=>{
   const a=window.__audit,names=a.features().map(f=>f.properties.S_NAME);
   a.showRegion('');a.startQuiz(kind==='correct-choice'?2:1,[target]);
   const wrong=names.filter(n=>n!==target).slice(0,3);
   if(kind!=='correct-choice')for(const name of wrong)a.quizMapAnswer(name);
   return {wrong};
  },{target,kind});
  let wrongChoices=[];
  if(kind==='correct-choice'){
   const choices=await page.locator('#quizChoices .choice-name').allTextContents();wrongChoices=choices.filter(n=>n!==target).slice(0,2);
   for(const name of wrongChoices)await page.locator('#quizChoices button').filter({has:page.locator('.choice-name').filter({hasText:new RegExp('^'+name+'$')})}).click();
   await page.locator('#quizChoices button').filter({has:page.locator('.choice-name').filter({hasText:new RegExp('^'+target+'$')})}).click();
  }else if(kind==='reveal')await page.locator('#quizReveal').click();
  else await page.evaluate(name=>window.__audit.quizMapAnswer(name),target);
  const assertColors=async(on)=>{
   const s=await state();
   assert.deepEqual(s.red,kind==='correct-choice'?[]:[...setup.wrong].sort(),kind+' must retain same-question red');
   assert.deepEqual(s.yellow,on?[target]:[],kind+' yellow phase');
   if(kind==='reveal')assert.equal(s.feedback,'点滅している場所が「'+target+'（'+await page.evaluate(name=>document.querySelector('#quizQuestion').textContent.match(/（([^）]+)）/)?.[1],target)+'）」です。');
   if(kind==='correct-choice'){
    const actual=await page.locator('#quizChoices button.quiz-wrong .choice-name').allTextContents();assert.deepEqual(actual.sort(),[...wrongChoices].sort());
    assert.deepEqual(await page.locator('#quizChoices button.quiz-correct .choice-name').allTextContents(),[target]);
   }
   return s;
  };
  // Sample actual timer transitions; a screenshot of a single yellow phase is insufficient.
  for(const on of [false,true]){
   await page.waitForFunction(({target,on})=>[...document.querySelectorAll('path.town')].find(e=>e.__data__.properties.S_NAME===target)?.classList.contains('selected')===on,{target,on},{timeout:2000});
   const s=await assertColors(on);report.scenarios.push({kind,on,red:s.red,yellow:s.yellow,score:s.score});
  }
  if(kind==='reveal'){
   if(await page.locator('body').evaluate(e=>e.classList.contains('fullscreen')))await page.locator('#fullscreen').click();
   await page.waitForTimeout(100);
   await page.waitForFunction(target=>[...document.querySelectorAll('path.town.selected')].some(e=>e.__data__.properties.S_NAME===target),target);
   await page.locator('#frame').screenshot({path:path.join(out,cfg.name+'-'+city+'-reveal-red-yellow.png')});
   // Red/yellow must survive redraw, including a fullscreen transition.
   await page.locator('#fullscreen').click();await page.waitForTimeout(100);
   assert.deepEqual((await state()).red,[...setup.wrong].sort(),'fullscreen loses red');
   await page.locator('#fullscreen').click();await page.waitForTimeout(100);
   assert.deepEqual((await state()).red,[...setup.wrong].sort(),'fullscreen exit loses red');
  }
  await page.locator('#quizNext').click();
  assert.deepEqual((await state()).red,[],'results must clear red');assert.deepEqual((await state()).yellow,[],'results must clear yellow');
  await page.waitForTimeout(550);assert.deepEqual((await state()).yellow,[],'orphan blink timer after results');
 }
 // Multi-question progression: feedback clears on next question, score history stays.
 await page.evaluate(()=>{const a=window.__audit,names=a.features().map(f=>f.properties.S_NAME);a.startQuiz(1,names.slice(0,6));const target=a.target();for(const name of names.filter(n=>n!==target).slice(0,2))a.quizMapAnswer(name);a.quizMapAnswer(target)});
 const before=await state();assert.equal(before.score,4);assert.equal(before.red.length,2);
 await page.locator('#quizNext').click();
 const next=await state();assert.deepEqual(next.red,[]);assert.deepEqual(next.yellow,[]);assert.equal(next.score,before.score);
 await page.evaluate(()=>window.__audit.stopQuiz(false));
 await page.waitForTimeout(550);assert.deepEqual((await state()).yellow,[]);
 fs.writeFileSync(path.join(out,cfg.name+'-'+city+'-feedback.json'),JSON.stringify(report,null,2));
 console.log('PASS QUIZ_FEEDBACK '+JSON.stringify({city,browser:cfg.name,phases:report.scenarios.length,redPreserved:true,nextClears:true}));
}
module.exports={run};
