'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {start}=require('./helpers/nationwide-browser.cjs');
const geometry=s=>createHash('sha256').update(JSON.stringify(s.paths)).digest('hex');
(async()=>{
 const app=await start(),{page}=app;
 try{
  await page.setViewportSize({width:390,height:844});await app.open();
  assert(!(await page.locator('#developerControls').isVisible()));assert(!(await page.locator('#metricsPanel').isVisible()));
  assert(await page.evaluate(()=>{
   const map=document.getElementById('map');return [...document.querySelectorAll('main input,main select')].every(n=>Boolean(map.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING));
  }),'production controls follow the map');
  assert.equal(await page.locator('#mapToolbar button').count(),4);
  for(const stage of ['national','prefecture','municipality']){
   if(stage==='prefecture')await app.pref('28');
   if(stage==='municipality'){await app.select('28101');await page.click('#popupClose');}
   const initial=await app.snapshot();await page.click('#mapZoomIn');
   await page.locator('#map').scrollIntoViewIfNeeded();const box=await page.locator('#map').boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+30);await page.mouse.down();await page.mouse.move(box.x+box.width/2+35,box.y+65,{steps:5});await page.mouse.up();
   assert.notEqual(await page.getAttribute('#map','viewBox'),initial.viewBox);
   await page.click('#mapReset');const reset=await app.snapshot();
   assert.equal(reset.viewBox,initial.viewBox,'S19 reset initial viewport for '+stage);
   assert.equal(geometry(reset),geometry(initial),'S19 reset must not reproject '+stage);
   assert.equal(reset.selected,initial.selected);assert.equal(reset.popupHidden,initial.popupHidden);
  }
  // Noncentral zoom anchors must stay under the same screen point even when
  // a tall production SVG letterboxes its fixed 850x700 viewBox.
  await page.click('#prefBtn');await page.locator('#map').scrollIntoViewIfNeeded();
  const box=await page.locator('#map').boundingBox(),at={x:Math.round(box.x+box.width*.38),y:Math.round(box.y+box.height*.43)};
  const world=()=>page.locator('#map').evaluate((map,at)=>{const p=map.createSVGPoint();p.x=at.x;p.y=at.y;const q=p.matrixTransform(map.getScreenCTM().inverse());return {x:q.x,y:q.y}},at);
  const before=await world();await page.locator('#map').dispatchEvent('wheel',{ctrlKey:true,deltaY:-160,clientX:at.x,clientY:at.y});const after=await world();
  assert(Math.hypot(before.x-after.x,before.y-after.y)<.01,'letterboxed wheel anchor remains on the same geographic point');
  assert.deepEqual(app.errors,[]);
 }finally{await app.close();}
 const debug=await start({query:'debug=1'});
 try{await debug.open();assert(await debug.page.locator('#developerControls').isVisible());assert(await debug.page.locator('#metricsPanel').isVisible());assert.equal(await debug.page.locator('#map .prefecture').count(),47);assert.deepEqual(debug.errors,[]);}
 finally{await debug.close();}
 console.log('PASS S19: map-first/default vs debug UI, three reset scopes preserve selection/projection, correct SVG letterbox anchor ('+(process.env.KUSSOON_BROWSER_ENGINE||'chromium')+')');
})().catch(error=>{console.error(error);process.exitCode=1;});
