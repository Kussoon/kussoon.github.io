'use strict';
// All town IDs across all region scopes: identical 4-choice ordered arrays
// before/after replacing the municipality-local selector with the one shared
// with Nishinomiya. Deterministic shuffle makes this exact and reproducible.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base='http://127.0.0.1:8765';
const pages=[
 {tag:'before',html:'/v2/takarazuka-town-svg-unified-quiz-state-20261118-pilot.html',
  js:'/v2/common/js/town-map-unified-quiz-takarazuka-20261118-pilot.js'},
 {tag:'after',html:'/v2/takarazuka-town-svg-national-choices-20261118-pilot.html',
  js:'/v2/common/js/town-map-national-choices-takarazuka-20261118-pilot.js'}
];
const configs=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,720]];
const hook=`window.__choiceAudit=()=>{
 const previous=communityChoice,originalRandom=Math.random;
 try{
  Math.random=()=>0.375;
  const scopes=['',...communityNames];
  return scopes.map(scope=>{
   communityChoice=scope;
   return {scope,candidates:towns.map(t=>({name:t.name,choices:candidates(t.name)}))};
  });
 }finally{communityChoice=previous;Math.random=originalRandom}
};\n`;
async function snapshot(browser,variant){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await page.route('**'+variant.js,async route=>{
   const response=await route.fetch(),s=await response.text();
   const marker='function startQuizBlink(name){';
   assert.equal(s.split(marker).length,2);
   await route.fulfill({response,body:s.replace(marker,hook+marker),headers:{...response.headers(),'content-type':'text/javascript; charset=utf-8'}});
  });
  await page.goto(base+variant.html,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  return await page.evaluate(()=>window.__choiceAudit());
 }finally{await page.close()}
}
(async()=>{
 for(const [screen,engine,width,height] of configs){
  const browser=await engine.launch({headless:true});
  try{
   const [before,after]=await Promise.all(pages.map(variant=>snapshot(browser,variant)));
   assert.equal(before.length,21);assert.equal(after.length,21);
   assert.deepEqual(after,before,'all four-choice sets and their order must match for every scope');
   assert.ok(before.every(s=>s.candidates.length===125));
   for(const scope of after)for(const q of scope.candidates){
    assert.equal(q.choices.length,4);
    assert.equal(new Set(q.choices).size,4);
    assert.ok(q.choices.includes(q.name));
   }
   console.log('PASS NATIONAL_CHOICE_PARITY '+JSON.stringify({screen,scopes:after.length,targets:125,compared:after.length*125,choicesPerQuestion:4,parity:true}));
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
