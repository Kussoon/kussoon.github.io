'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const host='http://127.0.0.1:8765';
async function verify(engine,device,width,height){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,
   isMobile:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(host+'/v2/town-map-shared-browser-one-label-20261120-pilot.html',
   {waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.townCount===321,null,{timeout:120000});
  assert.equal(await page.locator('#labels g.label').count(),321);
  const start=await page.evaluate(()=>window.__townPreview.labelUpdateDiagnostics());
  assert(start.preciseReflows>=1,'redraw must calibrate glyphs');
  for(let i=0;i<8;i++)await page.locator('#zoomPlus').click();
  await page.waitForTimeout(350);
  const after=await page.evaluate(()=>window.__townPreview.labelUpdateDiagnostics());
  assert(after.labelUpdates>start.labelUpdates,'zoom must update glyph scale');
  assert.equal(after.preciseReflows,start.preciseReflows,
   'zoom must never perform synchronous DOM Range alignment of every town label');
  await page.locator('#region').selectOption('芦原');
  const regional=await page.evaluate(()=>window.__townPreview.labelUpdateDiagnostics());
  assert(regional.preciseReflows>start.preciseReflows,
   'region switch calibrates only when labels are rebuilt');
  assert.equal(await page.locator('#labels g.label').count(),7);
  await page.locator('#region').selectOption('');
  assert.equal(await page.locator('#labels g.label').count(),321);
  for(const name of ['清瀬台','青葉台','柳本町','河原町']){
   const location=await page.locator('#labels g.label').evaluateAll((all,name)=>{
    const n=all.find(el=>el.__data__?.name===name);
    const p=n?.__data__?.point;
    const town=[...document.querySelectorAll('#areas path.town')]
      .find(el=>el.__data__?.name===name);
    if(!n||!town||!p)return {found:false};
    const pt=document.querySelector('#map').createSVGPoint();
    pt.x=p[0];pt.y=p[1];
    return {found:true,inside:town.isPointInFill(pt)};
   },name);
   assert(location.found,'label missing '+name);
   assert(location.inside,name+' label anchor must stay in polygon');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS TOWN_LABEL_ZOOM_FAST '+JSON.stringify({device,start,after,regional}));
 }finally{await browser.close()}
}
(async()=>{
 await verify(chromium,'chromium-1280',1280,800);
 await verify(webkit,'webkit-390',390,844);
 await verify(webkit,'webkit-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
