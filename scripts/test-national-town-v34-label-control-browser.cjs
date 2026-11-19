'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const origin='http://127.0.0.1:8765';
const approved='/v2/town-map-shared-browser-approved-20261119-pilot.html';
const prior='/v2/town-map-shared-browser-responsive-20261119-pilot.html';
const acceptedLabels=require('../v2/data/town-maps/28204-v34-labels.json');
async function run(engine,name,width,height){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+approved,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:90000});
  await page.waitForTimeout(300);
  const snapshot=()=>page.evaluate(()=>{
   const labels=[...document.querySelectorAll('#labels g.label')];
   const rail=document.querySelector('.map-right-rail');
   const frame=document.querySelector('.frame').getBoundingClientRect();
   const buttons=['fullscreen','zoomPlus','zoomMinus','larger','smaller','size','reading'].map(id=>{
    const el=document.getElementById(id),r=el.getBoundingClientRect();
    return {id,w:r.width,h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};
   });
   return {labels:labels.length,visibleLabels:labels.filter(x=>getComputedStyle(x).display!=='none').length,names:new Set(labels.map(x=>x.__data__.name)).size,
    keys:labels.map(x=>x.__data__.key),nonFinite:labels.filter(x=>!x.__data__.point.every(Number.isFinite)).length,
    duplicated:['塩瀬町名塩','山口町上山口','山口町下山口'].map(name=>({name,n:labels.filter(x=>x.__data__.name===name).length})),
    areas:document.querySelectorAll('#areas path.town').length,
    buttons,frame:{left:frame.left,right:frame.right,top:frame.top,bottom:frame.bottom},
    railWidth:rail.getBoundingClientRect().width,
    region:window.__townPreview.currentRegion(),quiz:window.__townPreview.quizMode()};
  });
  let current=await snapshot();
  assert.equal(current.areas,321);
  assert.equal(current.labels,324,'accepted V34 324 labels, not auto-generated 323');
  assert.equal(current.visibleLabels,324,'V34 approved labels must be visible even at whole-city zoom');
  assert.equal(current.names,321);assert.equal(current.nonFinite,0);
  assert.equal(new Set(current.keys).size,324);
  assert.deepEqual(current.duplicated.map(x=>x.n),[2,2,2],'V34 extra label allocation');
  for(const b of current.buttons){
   assert(b.w<=64&&b.w>=32,name+' compact width '+b.id+': '+b.w);
   assert(b.h<=54&&b.h>=25,name+' compact height '+b.id+': '+b.h);
   assert(b.right<=current.frame.right+1&&b.left>=current.frame.left-1,name+' button outside x '+b.id);
   assert(b.bottom<=current.frame.bottom+1&&b.top>=current.frame.top-1,name+' button outside y '+b.id);
  }
  const byId=Object.fromEntries(current.buttons.map(x=>[x.id,x]));
  assert(byId.zoomPlus.bottom<byId.zoomMinus.top,'zoom step order');
  assert(byId.larger.bottom<byId.smaller.top,'font control order');
  for(const region of ['上ヶ原','甲東','西宮浜']){
   await page.locator('#region').selectOption(region);
   await page.waitForTimeout(200);
   current=await snapshot();
   assert(current.labels>=current.areas,name+' missing labels in '+region);
   assert.equal(current.region,region);
  }
  await page.locator('#region').selectOption('');
  await page.waitForTimeout(250);
  current=await snapshot();
  assert.equal(current.labels,324,'all labels restored');
  await page.locator('#reading').click();
  assert.equal(await page.locator('#labels tspan.town-reading').count(),324);
  await page.locator('#larger').click();
  await page.locator('#size').click();
  await page.locator('#zoomPlus').click();
  await page.locator('#fullscreen').click();
  await page.waitForTimeout(250);
  await page.locator('#fullscreen').click();
  await page.waitForTimeout(250);
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  assert.equal(await page.locator('#reading').isVisible(),false,'reading button hidden during quiz');
  await page.locator('#quizQuit').click();
  await page.locator('#quizBack').click();
  assert.deepEqual(errors,[],'browser errors');
  console.log('PASS NATIONAL_V34_ANCHOR_CONTROLS '+JSON.stringify({name,width,labels:324,regions:26,railWidth:current.railWidth,compactButtons:true,quiz:true}));
 }finally{await browser.close()}
}
(async()=>{
 assert.equal(acceptedLabels.expectedLabels,324);
 assert.equal(Object.keys(acceptedLabels.labelOffsets).length,14);
 await run(chromium,'chromium-1280',1280,800);
 await run(webkit,'webkit-390',390,844);
 await run(webkit,'webkit-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
