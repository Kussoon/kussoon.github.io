'use strict';
// TOWNMAP-SSOT-001 R-TOWN-20/21/22: compare a single right-side vertical rail.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const url='http://127.0.0.1:8772/v2/takarazuka-town-svg-community-b-20261119-pilot.html';
async function run(driver,name,w,h){
 const browser=await driver.launch();
 try{
  const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<600,hasTouch:w<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  const geometry=()=>page.evaluate(()=>{
    const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
    return {rail:rect('.map-right-rail'),full:rect('#fullscreen'),slider:rect('.map-zoom-slider'),
     sliderInput:rect('#zoomSlider'),sliderTrack:rect('.zoom-slider-visual-track'),sliderThumb:rect('.zoom-slider-visual-thumb'),plus:rect('#zoomPlus'),minus:rect('#zoomMinus'),
     textPlus:rect('#larger'),textMinus:rect('#smaller'),frame:rect('#frame'),
     k:d3.zoomTransform(document.querySelector('#map')).k,
     candidates:document.querySelectorAll('#labels g.label').length,
     forbidden:document.querySelectorAll('#zoomIn,#zoomOut,#reset').length,
     textButtons:[...document.querySelectorAll('#larger,#smaller')].map(e=>e.textContent.trim())};
  });
  const verifyLayout=g=>{
   assert.equal(g.forbidden,0,name+' must remove old map buttons and standalone city reset');
   assert.equal(g.candidates,136,name+' must retain candidates');
   assert(g.full.height>=40&&g.textPlus.height>=40,name+' controls accessible');
   assert(g.plus.height>=32&&g.minus.height>=32,name+' framed zoom button hit targets');
   assert(g.full.bottom+2<=g.plus.top,name+' slider plus begins below fullscreen');
   assert(g.plus.bottom<=g.sliderInput.top+2,name+' plus precedes the track');
   assert(g.sliderInput.bottom<=g.minus.top+2,name+' track ends before minus');
   assert(g.slider.bottom+2<=g.textPlus.top,name+' slider must end above text+');
   assert(Math.abs(g.full.right-g.textPlus.right)<10,name+' all controls on the same right edge');
   assert(g.rail.top>=g.frame.top-2&&g.rail.bottom<=g.frame.bottom+2,name+' rail inside frame');
   assert(g.sliderInput.height>=32,name+' slider must preserve useful length');
   assert(Math.abs(g.sliderTrack.width-10)<1,name+' visual rail must be 10 CSS pixels');
   assert(Math.abs(g.sliderThumb.width-21)<1,name+' visual knob width must be 21 CSS pixels');
   assert(Math.abs(g.sliderThumb.height-27)<1,name+' visual knob height must be 27 CSS pixels');
   assert(g.sliderThumb.left>=g.slider.left&&g.sliderThumb.right<=g.slider.right,name+' thumb inside control frame');
  };
  let g=await geometry();verifyLayout(g);
  const lowBefore=g.k;
  await page.locator('#zoomSlider').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}))});
  let hi=await geometry();assert(hi.k>lowBefore,name+' maximum at plus');
  assert(Math.abs(hi.sliderThumb.top-hi.sliderTrack.top)<1.5,name+' max knob at track top');
  await page.locator('#zoomSlider').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
  const lo=await geometry();assert(lo.k<hi.k,name+' minimum at minus');
  assert(Math.abs(lo.sliderThumb.bottom-lo.sliderTrack.bottom)<1.5,name+' min knob at track bottom');
  // The slider minimum replaces the old standalone reset button.
  await page.locator('#zoomSlider').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});await page.waitForTimeout(200);
  g=await geometry();verifyLayout(g);
  const beforeStep=g.k;
  await page.locator('#zoomPlus').click();const afterPlus=(await geometry()).k;
  assert(afterPlus>beforeStep,name+' standalone plus zooms in');
  await page.locator('#zoomMinus').click();assert((await geometry()).k<afterPlus,name+' standalone minus zooms out');
  // "文字100％" is an action label, never the current percentage.
  await page.locator('#larger').click();
  assert.equal((await page.locator('#size').textContent()).replace(/\s+/g,''),'文字100％',name+' reset text never changes');
  await page.locator('#size').click();
  const selection=await page.locator('.zoom-slider-well').evaluate(el=>getComputedStyle(el).getPropertyValue('user-select'));
  if(selection)assert.equal(selection,'none',name+' Safari long-touch selection inhibited');
  // Genuine browser pointer drag, not just a programmatic range input.
  await page.locator('.zoom-slider-well').scrollIntoViewIfNeeded();
  let current=await geometry();
  const x=current.sliderTrack.left+current.sliderTrack.width/2;
  await page.mouse.move(x,current.sliderThumb.top+current.sliderThumb.height/2);
  await page.mouse.down();
  await page.mouse.move(x,current.sliderTrack.top+current.sliderTrack.height*.26,{steps:8});
  const moved=await geometry();
  assert(moved.sliderThumb.top<current.sliderThumb.top,name+' knob follows pointer upward');
  await page.mouse.up();
  await page.locator('#communityToggle').click();
  await page.locator('#communityOptions button[data-community="西谷"]').click();
  await page.locator('.zoom-slider-well').scrollIntoViewIfNeeded();
  current=await geometry();
  await page.mouse.move(x,current.sliderThumb.top+current.sliderThumb.height/2);
  await page.mouse.down();
  await page.mouse.move(x,current.sliderTrack.bottom+10,{steps:8});
  await page.mouse.up();await page.waitForTimeout(180);
  assert.match(await page.locator('#communityCount').textContent(),/市全域：125町名/,name+' slider bottom restores entire city');
  const all=await geometry();
  assert(Math.abs(all.sliderThumb.bottom-all.sliderTrack.bottom)<2,name+' knob reaches bottom');
  
  await page.locator('#fullscreen').click();await page.waitForTimeout(350);
  const f=await geometry();verifyLayout(f);
  assert.equal(await page.locator('#fullscreen').innerText(),'戻る');
  await page.locator('#fullscreen').click();await page.waitForTimeout(350);
  assert.equal(await page.locator('#fullscreen').innerText(),'全画面');
  assert.deepEqual(errors,[],name+' page errors');
  console.log('PASS TAKARAZUKA_POINTER_RAIL '+JSON.stringify({browser:name,width:w,frameHeight:g.frame.height,sliderLength:g.sliderInput.height,
   maxZoom:hi.k,minZoom:lo.k,controlsAligned:true,fullscreenLayout:true}));
 }finally{await browser.close()}
}
(async()=>{await run(chromium,'chromium-1280',1280,800);await run(webkit,'webkit-390',390,844);await run(webkit,'webkit-320',320,668)})().catch(e=>{console.error(e);process.exitCode=1});
