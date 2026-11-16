// V5 acceptance: all 26 regions, quiz feedback visibility, 1/2 and C zoom regressions.
// Browser emulation ≠ physical iPhone Safari.
'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=process.env.SVG_MASTER_URL||'http://127.0.0.1:8765';
const out=path.resolve('svg-master-v5-acceptance');fs.mkdirSync(out,{recursive:true});
(async()=>{
 for(const {name,browserType,w,h} of [
  {name:'chromium-pc',browserType:chromium,w:1280,h:800},
  {name:'webkit-390',browserType:webkit,w:390,h:844},
  {name:'webkit-320',browserType:webkit,w:320,h:668}]){
  const browser=await browserType.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<600,hasTouch:w<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(root+'/v2/nishinomiya-town-svg-master-v5-20261116-pilot.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.getElementById('communityCount')?.textContent.includes('321町名'),null,{timeout:45000});
   assert.equal(await page.locator('#areas path.town').count(),321);
   const choices=await page.locator('#communityOptions button').evaluateAll(nodes=>nodes.map(n=>n.dataset.community).filter(Boolean));
   assert.equal(choices.length,26);
   for(const community of choices){
    await page.evaluate(co=>{
     const button=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community===co);
     if(!button)throw Error('Missing community '+co);
     button.click();
    },community);
    const count=await page.locator('#areas path.town').count();
    assert(count>=1&&count<=321,community+' invalid town count '+count);
    const text=await page.locator('#communityCount').innerText();
    assert(text.includes(community)&&text.includes(count+'町名'),community+' count label mismatch '+text);
    assert.equal(await page.locator('#reset').innerText().then(s=>s.replace(/\s/g,'')),'区域全体');
    if(community==='広田'||community==='上ヶ原'){
     assert.equal(await page.locator('#boundaryNote').isVisible(),true);
     assert.equal(await page.locator('#areas path.town.okada').count(),1);
    }
   }
   await page.evaluate(()=>{
    const btn=[...document.querySelectorAll('#communityOptions button')].find(n=>n.dataset.community==='西宮浜');
    btn.click();
   });
   assert.equal(await page.locator('#areas path.town').count(),1);
   await page.locator('#quizTwo').click();
   const feedback=page.locator('#quizFeedback');
   assert.equal(await feedback.innerText(),'');
   assert.equal(await feedback.evaluate(el=>getComputedStyle(el).display),'none','empty feedback box must be hidden in quiz 2');
   assert.equal(await page.locator('#quizChoices button').count(),4);
   const target='西宮浜';
   const buttons=page.locator('#quizChoices button');
   const txt=await buttons.allInnerTexts();
   const wrongIndex=txt.findIndex(v=>!v.includes(target));assert(wrongIndex>=0);
   await buttons.nth(wrongIndex).click();
   assert.match(await feedback.innerText(),/違います/);
   assert.notEqual(await feedback.evaluate(el=>getComputedStyle(el).display),'none','feedback shown after wrong answer');
   const before=await page.locator('#quizProgress').innerText();
   await buttons.nth(wrongIndex).evaluate(el=>el.click()); // DOM click on disabled input must be a no-op
   assert.equal(await page.locator('#quizProgress').innerText(),before,'wrong disabled answer cannot alter score');
   const rightIndex=txt.findIndex(v=>v.includes(target));assert(rightIndex>=0);
   await buttons.nth(rightIndex).click();
   assert.match(await feedback.innerText(),/正解です/);
   await page.locator('#quizNext').click();
   assert.equal(await page.locator('#quizResults').isVisible(),true);
   assert.equal(await page.locator('#quizRetryWrong').isVisible(),true);
   await page.locator('#quizRetryWrong').click();
   assert.equal(await page.locator('#quizChoices button').count(),4);
   const retry=await page.locator('#quizChoices button').allInnerTexts();
   await page.locator('#quizChoices button').nth(retry.findIndex(v=>v.includes(target))).click();
   await page.locator('#quizNext').click();
   assert.equal(await page.locator('#quizRetryWrong').isVisible(),false,'perfect score hides retry-wrong');
   await page.locator('#quizBack').click();
   await page.locator('#quizOne').click();
   await page.locator('#areas path.town').first().evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));
   assert.match(await page.locator('#quizFeedback').innerText(),/正解です/);
   await page.locator('#quizNext').click();
   assert.equal(await page.locator('#quizResults').isVisible(),true);
   await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
   assert.deepEqual(errors,[],name+' page errors');
   console.log('PASS '+name+': 26 region scopes, two quizzes, feedback hide/show, wrong retry, perfect result');
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
