'use strict';
// Real browser + committed 2026 geometry, no external services or telemetry.
const assert=require('node:assert/strict');
const {start}=require('./helpers/nationwide-browser.cjs');
(async()=>{
 const app=await start();const {page}=app;
 try{
  await app.open();
  assert.equal(await page.inputValue('#readingMode'),'off','S27 reading initially OFF');
  assert.equal(await page.getAttribute('#mapReadingToggle','aria-pressed'),'false');
  assert.equal(await page.locator('#quizPanel').isVisible(),false,'S32 quiz intentionally hidden');
  // S14-S17: B-style wheel stays inactive until the map is clicked.
  await page.locator('#map').scrollIntoViewIfNeeded();const rect=await page.locator('#map').boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
  const initial=await page.getAttribute('#map','viewBox');await page.mouse.wheel(0,-180);await page.waitForTimeout(100);
  assert.equal(await page.getAttribute('#map','viewBox'),initial,'unarmed wheel must scroll page, not zoom');
  // A real click on blank ocean arms the map without choosing a prefecture.
  await page.locator('#map').scrollIntoViewIfNeeded();const ocean=await page.locator('#map').boundingBox();
  await page.mouse.click(ocean.x+5,ocean.y+5);await page.mouse.wheel(0,-180);
  await page.waitForFunction(before=>document.querySelector('#map').getAttribute('viewBox')!==before,initial);
  await page.click('#mapReset');
  await page.mouse.dblclick(ocean.x+5,ocean.y+5);
  assert.notEqual(await page.getAttribute('#map','viewBox'),initial,'double-click zooms');
  await page.click('#mapReset');
  // S11/S18/S36/S38: under-20 prefecture and islands retain actual assets.
  for(const [pref,count] of [['16',15],['47',42],['28',49]]){
   await app.pref(pref);assert.equal(await page.locator('#map [data-code]').count(),count);
   assert.equal(await page.locator('#map .borders').count(),1,'exactly one shared boundary path');
   assert(await page.locator('#map .land').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).stroke==='none')),'municipal paths are fill-only');
   const border=await page.locator('#map .borders').evaluate(n=>({width:getComputedStyle(n).strokeWidth,effect:getComputedStyle(n).vectorEffect}));
   assert.equal(border.width,'0.9px');assert.equal(border.effect,'non-scaling-stroke');
  }
  for(const [code,linkCount,facilityCount] of [['28204',3,1],['28365',3,1],['28110',6,2]]){
   await app.select(code);
   assert.equal(await page.locator('#officePopup a').count(),linkCount,'S07/S08 actual 3/6 links');
   assert.equal(await page.locator('#officePopup .popup-facility').count(),facilityCount);
   const actions=await page.locator('#officePopup a').evaluateAll(nodes=>nodes.map(n=>({title:n.textContent,href:n.href,target:n.target,rel:n.rel})));
   for(const action of actions){assert(action.href.startsWith('https://'));assert.equal(action.target,'_blank');assert(action.rel.includes('noopener'));}
   const routes=actions.filter(a=>a.title==='ここへ行く').map(a=>new URL(a.href).searchParams.get('destination'));
   assert.equal(new Set(routes).size,facilityCount,'ward and city have different destinations');
   assert(!await page.locator('#officePopup .popup-office').evaluateAll(nodes=>nodes.some(n=>/本庁舎|[0-9０-９]号館/.test(n.textContent))),'display strips building suffixes');
   const before=await app.snapshot();await page.click('#popupClose');const after=await app.snapshot();
   assert.equal(after.selected,code);assert(after.popupHidden);assert.deepEqual(after.paths,before.paths);assert.equal(after.viewBox,before.viewBox,'S01 close keeps projection AND viewport');
   await page.click('#mapZoomIn');assert.notEqual(await page.getAttribute('#map','viewBox'),before.viewBox);assert.equal(await page.locator('#map .chosen').count(),1);
   await page.locator('#map').scrollIntoViewIfNeeded();const mapBox=await page.locator('#map').boundingBox();
   const panBefore=await page.getAttribute('#map','viewBox');
   await page.mouse.move(mapBox.x+mapBox.width/2,mapBox.y+mapBox.height/2);await page.mouse.down();
   await page.mouse.move(mapBox.x+mapBox.width/2+75,mapBox.y+mapBox.height/2+60,{steps:8});await page.mouse.up();
   assert.notEqual(await page.getAttribute('#map','viewBox'),panBefore,'S16 focused map pans after popup close');
   assert.equal(await page.locator('#map .chosen').count(),1,'drag release must not toggle municipality');
   await page.click('#mapZoomOut');await page.click('#mapReset');assert.equal(await page.locator('#map .chosen').count(),1);
  }
  // S12/S13: measure actual narrow-screen rectangles, not CSS substrings.
  await page.setViewportSize({width:390,height:844});await app.select('28110');
  await page.locator('#officePopup').scrollIntoViewIfNeeded();
  const boxes=await page.evaluate(()=>{const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {map:box('map'),popup:box('officePopup'),toolbar:box('mapToolbar')};});
  assert(boxes.popup.x>=boxes.map.x&&boxes.popup.right<=boxes.toolbar.x,'popup fits left of toolbar');
  assert(boxes.popup.bottom<=boxes.map.bottom&&boxes.popup.y>=boxes.map.y,'popup fits vertically');
  assert(boxes.popup.height>=boxes.toolbar.height,'popup is not restricted to a clipped toolbar-sized card');
  await page.locator('#popupScroll').evaluate(n=>n.scrollTop=n.scrollHeight);
  assert(await page.locator('#popupScroll').evaluate(n=>n.scrollTop+n.clientHeight>=n.scrollHeight-2),'six-link card can scroll to end');
  // S04/S30: nationwide queries disambiguate prefectures without loading all maps.
  await page.click('#nationBtn');await page.fill('#placeSearch','西宮市');
  const result=page.locator('#searchResults button').filter({hasText:'西宮市'});await result.waitFor();assert((await result.textContent()).includes('兵庫県'));
  await result.click();await page.locator('#map .chosen[data-code="28204"]').waitFor();assert(await page.locator('#officePopup').isVisible());
  // Nationwide regional-learning directory: exercise the new actual page in
  // Chromium, rather than relying only on HTML string-based contracts.
  await page.goto(new URL('/v2/municipalities/index.html',page.url()).href);
  assert.equal(await page.locator('li.prefecture').count(),47,'47 prefectures have visible directory entries');
  assert.equal(await page.locator('section[id^="region-"]').count(),8,'Eight regional navigation groups');
  assert.equal(await page.locator('li.prefecture .links a').count(),141,'Each prefecture has overview + two quiz links');
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'Regional directory fits 390px iPhone viewport');
  // Older prefecture overviews previously lacked the All-area option.
  for(const [slug,regionCount,areaCount] of [['shiga',6,19],['kyoto',8,36],['osaka',8,72],['nara',5,39],['wakayama',7,30],['tottori',3,19],['shimane',3,19],['okayama',3,30],['hiroshima',8,30]]){
   await page.goto(new URL('/v2/municipalities/'+slug+'/index.html',page.url()).href);
   await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('照合：合格'));
   const buttons=page.locator('#regions button');
   assert.equal(await buttons.count(),regionCount+1,slug+' overview has all-area option');
   await buttons.last().click();
   assert.equal(await page.locator('#items .item').count(),areaCount,slug+' whole-prefecture list has every municipality area');
   assert.equal(await page.locator('#selection').textContent(),'全域：'+areaCount+(['kyoto','osaka','okayama','hiroshima'].includes(slug)?'区域':'市町村'),slug+' whole-area selection heading');
  }
  assert.deepEqual(app.errors,[]);
  console.log('PASS real Chromium: S01/S04/S07/S08/S12/S13/S14-S18/S27/S30/S32/S36/S38 (desktop + 390px; not iPhone Safari)');
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
