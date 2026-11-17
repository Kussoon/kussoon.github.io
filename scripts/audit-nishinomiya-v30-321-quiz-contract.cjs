// Exhaustive in-page grading contract: every one of Nishinomiya's 321 town names
// independently tested in quiz 1 and quiz 2. Does not mutate application code.
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const out=path.resolve('nishinomiya-v30-321-quiz-contract');fs.mkdirSync(out,{recursive:true});
const engines=[{name:'chromium-1280',driver:chromium,width:1280,height:800},
 {name:'webkit-390',driver:webkit,width:390,height:844}];
(async()=>{
 for(const cfg of engines){
  const browser=await cfg.driver.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},
     isMobile:cfg.width<600,hasTouch:cfg.width<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   // Test-only exposure of functions already scoped inside the production
   // IIFE. Do not alter the shipped HTML file or the quiz implementation.
   await page.route('**/v2/nishinomiya-town-svg-master-v30-20261117-pilot.html',async route=>{
    const response=await route.fetch();
    const original=await response.text();
    const marker='KussoonTownSvgDataContract.load({';
    if(original.split(marker).length!==2)throw Error('Unexpected quiz initialization marker');
    const instrumentation='window.__nishinomiyaQuizAudit=Object.freeze({names:()=>features.map(f=>f.properties.S_NAME),startQuiz,quizMapAnswer,stopQuiz,quizReveal});'+String.fromCharCode(10);
    const body=original.replace(marker,instrumentation+marker);
    await route.fulfill({response,body,headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
   });
   await page.goto(base+'/v2/nishinomiya-town-svg-master-v30-20261117-pilot.html',
    {waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),
    null,{timeout:60000});
   const report=await page.evaluate(()=>{
    const {names:getNames,startQuiz,quizMapAnswer,stopQuiz,quizReveal}=window.__nishinomiyaQuizAudit||{};
    if(!getNames)throw Error('Missing test-only instrumentation');
    const names=getNames();
    if(names.length!==321||new Set(names).size!==321)throw Error('Nonunique 321 town names');
    const $=id=>document.getElementById(id);
    const result={checked:[],quizzes:{quiz1:0,quiz2:0},failures:[],special:[]};
    const fail=(name,mode,message)=>result.failures.push({name,mode,message});
    const actualScore=()=>Number($('quizProgress').textContent.match(/得点 (\d+)/)?.[1]);
    // Single-town forced rounds let each name receive an independently
    // reproducible correctness, penalty, reveal/retry and result check.
    for(let i=0;i<names.length;i++){
     const name=names[i],wrong=names[(i+1)%names.length];
     try{
      startQuiz(1,[name]);
      if(actualScore()!==1)throw Error('quiz1 initial score');
      quizMapAnswer(wrong);
      if(actualScore()!==0||!$('quizFeedback').textContent.includes('違います'))throw Error('quiz1 penalty');
      quizMapAnswer(wrong);
      if(actualScore()!==0)throw Error('quiz1 same-wrong double scoring');
      quizMapAnswer(name);
      if(!$('quizFeedback').textContent.includes('正解です'))throw Error('quiz1 correct');
      $('quizNext').click();
      if($('quizResults').hidden||!$('quizResult').textContent.includes('1問中 0点'))throw Error('quiz1 result');
      if($('quizRetryWrong').hidden)throw Error('quiz1 missing retry wrong');
      result.quizzes.quiz1++;
      startQuiz(2,[name]);
      if(actualScore()!==1)throw Error('quiz2 initial score');
      const buttons=[...$('quizChoices').querySelectorAll('button')];
      const names4=buttons.map(b=>b.querySelector('.choice-name')?.textContent);
      const readings4=buttons.map(b=>b.querySelector('.choice-reading')?.textContent);
      if(buttons.length!==4||new Set(names4).size!==4||!names4.includes(name)||readings4.some(x=>!x))
       throw Error('quiz2 4-choice name/reading uniqueness');
      const wrongButton=buttons.find(b=>b.querySelector('.choice-name').textContent!==name);
      wrongButton.click();
      if(actualScore()!==0||!wrongButton.disabled||!wrongButton.classList.contains('quiz-wrong'))
       throw Error('quiz2 wrong-answer penalty');
      wrongButton.click();
      if(actualScore()!==0)throw Error('quiz2 wrong answer repeated');
      buttons.find(b=>b.querySelector('.choice-name').textContent===name).click();
      if(!$('quizFeedback').textContent.includes('正解です'))throw Error('quiz2 correct');
      $('quizNext').click();
      if($('quizResults').hidden||!$('quizResult').textContent.includes('1問中 0点'))throw Error('quiz2 result');
      result.quizzes.quiz2++;
      if(['岡田山','上甲東園','塩瀬町名塩','山口町下山口'].includes(name))
       result.special.push({name,quiz1:true,quiz2:true});
     }catch(e){fail(name,'1+2',e.message)}
     finally{stopQuiz(false)}
    }
    // Distinct branches: perfect score, reveal and quit.
    for(const mode of [1,2]){
     const target='西宮浜';startQuiz(mode,[target]);
     if(mode===1)quizMapAnswer(target);
     else{
      const right=[...$('quizChoices').children].find(b=>b.querySelector('.choice-name')?.textContent===target);
      right.click();
     }
     $('quizNext').click();
     if(!$('quizRetryWrong').hidden)fail(target,mode,'full-mark retry should be hidden');
     stopQuiz(false);
    }
    startQuiz(1,['西宮浜']);quizReveal();$('quizNext').click();
    if($('quizRetryWrong').hidden)fail('西宮浜','reveal','revealed incorrect retry hidden');
    stopQuiz(false);
    startQuiz(2,['西宮浜']);$('quizQuit').click();
    if(!$('quizResult').textContent.includes('途中終了'))fail('西宮浜','quit','missing early-quit result');
    stopQuiz(false);
    result.names=names.length;
    return result;
   });
   fs.writeFileSync(path.join(out,cfg.name+'.json'),JSON.stringify(report,null,2));
   assert.equal(report.names,321);assert.equal(report.quizzes.quiz1,321);assert.equal(report.quizzes.quiz2,321);
   assert.deepEqual(report.failures,[],'one or more named-town quiz contracts failed');
   assert.deepEqual(errors,[],'browser uncaught exceptions');
   console.log('PASS 321_QUIZ_EXHAUSTIVE '+JSON.stringify({browser:cfg.name,
     quiz1:report.quizzes.quiz1,quiz2:report.quizzes.quiz2,failures:report.failures.length,special:report.special}));
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
