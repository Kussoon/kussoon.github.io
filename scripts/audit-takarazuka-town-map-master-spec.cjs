// TOWNMAP-SSOT-001 regression audit for the Takarazuka input dataset.
// This exercises the national SVG engine and quiz contract; it does not add
// Takarazuka-specific rendering or scoring code.
'use strict';

const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');

const base=process.env.TAKARAZUKA_TEST_BASE||'http://127.0.0.1:8765';
const route='/v2/takarazuka-town-svg-result-navigation-20261118-pilot.html';
const regionNames=[
 '安倉','光明','小浜','逆瀬台','末成','末広','すみれガ丘','高司',
 '宝塚第一','長尾','長尾台','中山台','仁川','西谷','西山','宝小',
 '美座','売布','山本山手','良元'
];

async function open(page,query=''){
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+route+query,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(
  ()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),
  null,{timeout:60000}
 );
 return errors;
}
async function chooseRegion(page,name){
 const menu=page.locator('#communityOptions');
 if(await menu.getAttribute('hidden')!==null)await page.locator('#communityToggle').click();
 await page.locator('#communityOptions button[data-community="'+name+'"]').click();
 await page.waitForTimeout(60);
}
async function chooseWhole(page){
 const menu=page.locator('#communityOptions');
 if(await menu.getAttribute('hidden')!==null)await page.locator('#communityToggle').click();
 await page.locator('#communityOptions button[data-community=""]').click();
 await page.waitForTimeout(60);
}
async function snapshot(page){
 return page.evaluate(()=>({
  paths:document.querySelectorAll('#areas path.town').length,
  labels:[...document.querySelectorAll('#labels g.label')].filter(el=>el.dataset.visible==='true').length,
  candidates:document.querySelectorAll('#labels g.label').length,
  readings:[...document.querySelectorAll('#labels .town-reading')]
   .filter(el=>getComputedStyle(el).display!=='none').length,
  selected:[...document.querySelectorAll('#areas path.selected')]
   .map(el=>el.getAttribute('aria-label')),
  status:document.querySelector('#status')?.textContent||'',
  menuCount:document.querySelectorAll('#communityOptions button[data-community]').length,
  scale:window.d3.zoomTransform(document.querySelector('#map')).k
 }));
}
async function run(driver,name,width,height){
 const browser=await driver.launch();
 try{
  const page=await browser.newPage({
   viewport:{width,height},deviceScaleFactor:2,
   isMobile:width<600,hasTouch:width<600
  });
  await page.route('**/v2/common/js/town-map-result-navigation-takarazuka-20261118-pilot.js*',
   async route=>{
    const response=await route.fetch();
    const original=await response.text();
    const marker='KussoonTownSvgDataContract.loadUnified({';
    assert.equal(original.split(marker).length,2,'unexpected Takarazuka loader marker');
    const instrumentation='window.__takarazukaQuizAudit=Object.freeze({names:()=>towns.map(t=>t.name),startQuiz,quizMapAnswer,stopQuiz});\n';
    await route.fulfill({response,body:original.replace(marker,instrumentation+marker),
     headers:{...response.headers(),'content-type':'text/javascript; charset=utf-8'}});
   });
  const errors=await open(page);
  let s=await snapshot(page);
  assert.equal(s.paths,125,name+' must render 125 town paths');
  assert.equal(s.menuCount,20,name+' must expose 20 regions');
  assert(s.labels>=125,name+' must render one or more labels for every town');
  assert(s.candidates>125,name+' must retain detached/multipart label candidates');
  assert.equal(s.readings,0,name+' readings must start OFF');

  const initialScale=s.scale;
  await page.locator('#reading').click();
  s=await snapshot(page);
  assert.equal(s.readings,s.labels,name+' reading ON must have a reading for each visible label');
  await page.locator('#larger').click();
  assert.match(await page.locator('#size').innerText(),/125％/);
  await page.locator('#size').click();
  await page.locator('#zoomIn').click();
  const zoomed=await snapshot(page);
  assert(zoomed.scale>initialScale,name+' zoom-in must increase the view scale');
  await page.locator('#zoomOut').click();
  await chooseWhole(page);

  for(const region of regionNames){
   await chooseRegion(page,region);
   const regionState=await snapshot(page);
   assert(regionState.paths>0&&regionState.paths<=125,
    name+' '+region+' must have a nonempty input scope');
   assert.match(await page.locator('#communityToggle').innerText(),new RegExp(region));
  }
  await chooseWhole(page);

  // Exhaustive data-driven quiz contract: every one of the 125 town names
  // receives an independent quiz1 and quiz2 correctness/penalty check.
  const exhaustive=await page.evaluate(()=>{
   const api=window.__takarazukaQuizAudit;
   if(!api)throw new Error('missing quiz audit instrumentation');
   const names=api.names();
   const $=id=>document.getElementById(id);
   const report={quiz1:0,quiz2:0,failures:[]};
   for(let i=0;i<names.length;i++){
    const name=names[i],wrong=names[(i+1)%names.length];
    try{
     api.startQuiz(1,[name]);
     const before=Number($('quizProgress').textContent.match(/得点 (\d+)/)?.[1]);
     if(before!==1)throw Error('quiz1 initial score');
     api.quizMapAnswer(wrong);
     if(Number($('quizProgress').textContent.match(/得点 (\d+)/)?.[1])!==0)
      throw Error('quiz1 penalty');
     api.quizMapAnswer(wrong);
     api.quizMapAnswer(name);
     if(!$('quizFeedback').textContent.includes('正解です'))throw Error('quiz1 correct');
     $('quizNext').click();
     if($('quizResults').hidden||!$('quizResult').textContent.includes('1問中 0点'))
      throw Error('quiz1 result');
     report.quiz1++;
     api.startQuiz(2,[name]);
     const buttons=[...$('quizChoices').querySelectorAll('button')];
     const labels=buttons.map(b=>b.querySelector('.choice-name')?.textContent);
     if(buttons.length!==4||new Set(labels).size!==4||!labels.includes(name))
      throw Error('quiz2 four choices');
     const bad=buttons.find(b=>b.querySelector('.choice-name').textContent!==name);
     bad.click();
     if(!bad.disabled||!bad.classList.contains('quiz-wrong'))
      throw Error('quiz2 penalty');
     buttons.find(b=>b.querySelector('.choice-name').textContent===name).click();
     if(!$('quizFeedback').textContent.includes('正解です'))throw Error('quiz2 correct');
     $('quizNext').click();
     if($('quizResults').hidden||!$('quizResult').textContent.includes('1問中 0点'))
      throw Error('quiz2 result');
     report.quiz2++;
    }catch(error){report.failures.push({name,message:error.message})}
    finally{api.stopQuiz(false)}
   }
   return report;
  });
  assert.equal(exhaustive.quiz1,125,'all 125 towns must pass quiz1');
  assert.equal(exhaustive.quiz2,125,'all 125 towns must pass quiz2');
  assert.deepEqual(exhaustive.failures,[],'named-town quiz failures');

  // Direct town navigation must focus a real town without changing the dataset.
  const direct=await page.goto(base+route+'?town=%E5%88%87%E7%95%91',
   {waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(
   ()=>document.querySelector('#status')?.textContent.includes('切畑'),null,
   {timeout:60000}
  );
  const directState=await snapshot(page);
  assert(directState.selected.some(x=>x.startsWith('切畑')),
   name+' ?town=切畑 must select the requested town');
  assert.equal(directState.paths,125);

  // Quiz 2: 4 choices, one wrong answer, then all questions correct.
  await chooseRegion(page,'すみれガ丘');
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4,
   name+' quiz2 must provide four choices');
  assert.equal(await page.locator('#reading').isVisible(),false,
   name+' reading toggle must be hidden during quiz');
  const regionTownCount=await page.locator('#areas path.town').count();
  assert.equal(regionTownCount,2,'すみれガ丘 is the two-town regression scope');
  let wrongUsed=false;
  for(let i=0;i<regionTownCount;i++){
   const target=(await page.locator('#areas path.selected').first()
    .getAttribute('aria-label')).split('（')[0];
   const choices=page.locator('#quizChoices button');
   if(!wrongUsed){
    const wrong=choices.filter({hasNotText:target}).first();
    await wrong.click();
    assert.match(await page.locator('#quizFeedback').innerText(),/違います/);
    wrongUsed=true;
   }
   await choices.filter({hasText:target}).first().click();
   await page.locator('#quizNext').click();
  }
  assert.match(await page.locator('#quizResult').innerText(),/2問中 1点/);
  assert.equal(await page.locator('#quizRetryWrong').isVisible(),true,
   name+' quiz2 must show retry-wrong after an error');
  await page.locator('#quizBack').click();

  // Quiz 1: reveal is a scored wrong answer and creates retryable history.
  await chooseRegion(page,'すみれガ丘');
  await page.locator('#quizOne').click();
  await page.locator('#quizReveal').click();
  await page.locator('#quizNext').click();
  await page.locator('#quizReveal').click();
  await page.locator('#quizNext').click();
  assert.match(await page.locator('#quizResult').innerText(),/間違えた問題 2件/);
  assert.equal(await page.locator('#quizRetryWrong').isVisible(),true);
  await page.locator('#quizBack').click();

  // Full marks must hide the invalid retry-wrong action.
  await chooseRegion(page,'すみれガ丘');
  await page.locator('#quizTwo').click();
  for(let i=0;i<2;i++){
   const target=(await page.locator('#areas path.selected').first()
    .getAttribute('aria-label')).split('（')[0];
   await page.locator('#quizChoices button').filter({hasText:target}).first().click();
   await page.locator('#quizNext').click();
  }
  assert.match(await page.locator('#quizResult').innerText(),/2問中 2点（間違えた問題 0件）/);
  assert.equal(await page.locator('#quizRetryWrong').isVisible(),false,
   name+' full marks must hide retry-wrong');
  assert.equal(await page.locator('#quizRetryWrong').isEnabled(),false);
  assert.deepEqual(errors,[],name+' must have no page errors');
  console.log('PASS TAKARAZUKA_TOWNMAP '+JSON.stringify({
   browser:name,towns:125,regions:20,regionScopes:regionNames.length,
   directTown:true,quiz1:true,quiz2:true,fullMarkRetryHidden:true
  }));
 }finally{await browser.close()}
}
(async()=>{
 await run(chromium,'chromium-1280',1280,800);
 await run(webkit,'webkit-390',390,844);
 await run(webkit,'webkit-320',320,668);
})().catch(error=>{console.error(error);process.exitCode=1});
