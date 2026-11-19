'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const pages=[
 {name:'accepted-glyph',path:'/v2/town-map-shared-browser-glyph-20261119-pilot.html'},
 {name:'fullscreen-state',path:'/v2/town-map-shared-browser-fullscreen-20261119-pilot.html'}
];
async function check(engine,label,width,height){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function state(){
   return page.evaluate(()=>{
    const svg=document.querySelector('#map'),b=svg.getBoundingClientRect();
    const t=window.d3.zoomTransform(svg);
    return {k:t.k,wx:(b.width/2-t.x)/t.k,wy:(b.height/2-t.y)/t.k,
      region:window.__townPreview.currentRegion(),count:window.__townPreview.activeCount(),
      quiz:window.__townPreview.quizMode(),reading:document.querySelector('#reading').getAttribute('aria-pressed'),
      font:document.querySelector('#labels text.town-label')?.getAttribute('font-size'),
      candidates:window.__townPreview.labelCandidateCount(),
      fullscreen:document.body.classList.contains('fullscreen')};
   });
  }
  const checks=[];
  for(const scenario of [
   {name:'all-regions-reading-off',region:'',reading:false,font:false,quiz:false},
   {name:'selected-region-reading-125-quiz2',region:'仁川',reading:true,font:true,quiz:true}
  ]){
   await page.goto('http://127.0.0.1:8765'+pages[1].path,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__townPreview?.labelCandidateCount()===136,null,{timeout:60000});
   if(scenario.region)await page.locator('#region').selectOption(scenario.region);
   if(scenario.reading)await page.locator('#reading').click();
   if(scenario.font)await page.locator('#larger').click();
   await page.locator('#zoomPlus').click();
   await page.waitForTimeout(450);
   if(scenario.quiz)await page.locator('#quizTwo').click();
   const before=await state();
   assert.equal(before.candidates,136);
   await page.locator('#fullscreen').click();
   await page.waitForTimeout(350);
   const during=await state();
   assert.equal(during.fullscreen,true);
   for(const key of ['k','wx','wy']){
    assert(Math.abs(before[key]-during[key])<1e-4,
      label+' '+scenario.name+' fullscreen changed '+key+': '+before[key]+' vs '+during[key]);
   }
   for(const key of ['region','count','quiz','reading','font','candidates']){
    assert.equal(during[key],before[key],scenario.name+' lost '+key);
   }
   await page.locator('#fullscreen').click();
   await page.waitForTimeout(350);
   const after=await state();
   assert.equal(after.fullscreen,false);
   for(const key of ['k','wx','wy'])assert(Math.abs(before[key]-after[key])<1e-4,
     label+' '+scenario.name+' exit changed '+key);
   for(const key of ['region','count','quiz','reading','font','candidates'])
    assert.equal(after[key],before[key],scenario.name+' exit lost '+key);
   checks.push({scenario:scenario.name,region:after.region,quiz:after.quiz,
     zoom:after.k,candidates:after.candidates});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS NATIONAL_FULLSCREEN_VIEWPORT '+JSON.stringify({label,checks}));
 }finally{await browser.close()}
}
(async()=>{
 await check(chromium,'chromium-1280',1280,800);
 await check(webkit,'webkit-390',390,844);
 await check(webkit,'webkit-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
