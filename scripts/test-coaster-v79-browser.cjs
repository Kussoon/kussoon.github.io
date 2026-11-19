'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
async function run(browserType,label,width,height){
 const browser=await browserType.launch({headless:true});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<500,isMobile:width<500,deviceScaleFactor:2});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/v2/one-stroke-coaster-3d-v79.html',
   {waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(await page.evaluate(()=>typeof window.KussoonCoasterSupportClearance?.create),'function');
  const rect=await page.locator('#canvas').boundingBox();
  assert(rect&&rect.width>100&&rect.height>150);
  const x0=rect.x+rect.width*.10, x1=rect.x+rect.width*.88;
  const y0=rect.y+rect.height*.62;
  // Real PointerEvent dispatch tests the user's original one-stroke flow.
  await page.evaluate(({x0,x1,y0})=>{
   const canvas=document.querySelector('#canvas');
   function ev(type,x,y){canvas.dispatchEvent(new PointerEvent(type,{
    bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',isPrimary:true,
    clientX:x,clientY:y,buttons:type==='pointerup'?0:1
   }));}
   ev('pointerdown',x0,y0);
   for(let i=1;i<=85;i++){
    const t=i/85;
    ev('pointermove',x0+(x1-x0)*t,y0-85*Math.sin(Math.PI*t*3)*Math.sin(Math.PI*t));
   }
   ev('pointerup',x1,y0);
  },{x0,x1,y0});
  assert.equal(await page.locator('#go').isEnabled(),true,'draw must enable ride');
  await page.locator('#go').click();
  await page.waitForTimeout(1000);
  const status=await page.locator('#status').textContent();
  assert.notEqual(status,'指で線を描いてください');
  assert.equal(await page.locator('#go').isVisible(),false,'ride started');
  assert.deepEqual(errors,[],'no browser exceptions while drawing or riding');
  console.log('PASS COASTER_V79_BROWSER '+JSON.stringify({label,canvas:[Math.round(rect.width),Math.round(rect.height)],status,started:true}));
 }finally{await browser.close()}
}
(async()=>{
 await run(chromium,'chromium-1280',1280,800);
 await run(webkit,'webkit-mobile-390',390,844);
})().catch(e=>{console.error(e);process.exitCode=1});
