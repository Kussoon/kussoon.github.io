'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {start,devices}=require('./helpers/nationwide-browser.cjs');
(async()=>{
 const app=await start({contextOptions:{...devices['iPhone 13'],locale:'ja-JP'}}),{page}=app;
 try{
  await app.open();await app.pref('28');
  for(const [width,height] of [[390,844],[320,568],[375,667],[844,390]]){
   await page.setViewportSize({width,height});
   for(const [code,count] of [['28101',6],['28110',6],['28204',3]]){
    await app.select(code);await page.locator('#officePopup').scrollIntoViewIfNeeded();
    const popup=page.locator('#officePopup');
    assert.equal(await popup.locator('a').count(),count);
    assert.equal(await popup.locator('.popup-facility').count(),count===6?2:1,'S08 both offices are in the same card');
    const first=await popup.locator('.popup-actions').first().evaluate(n=>({bottom:n.getBoundingClientRect().bottom,popupBottom:document.querySelector('#officePopup').getBoundingClientRect().bottom}));
    assert(first.bottom<=first.popupBottom-4,'S12 first link row must not open with a clipped bottom');
    if(code==='28101')assert.equal(await page.textContent('#popupName'),'神戸市東灘区・神戸市','parent office is discoverable before scrolling');
    const boxes=await page.evaluate(()=>{const r=id=>{const b=document.getElementById(id).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}};return {popup:r('officePopup'),toolbar:r('mapToolbar'),map:r('map')};});
    assert(boxes.popup.left>=boxes.map.left&&boxes.popup.right<=boxes.toolbar.left,'card does not cover the four controls');
    assert(boxes.popup.top>=boxes.map.top&&boxes.popup.bottom<=boxes.map.bottom,'card stays in map');
    if(process.env.KUSSOON_BROWSER_ARTIFACTS&&code==='28101'&&[390,844].includes(width)){
     await fs.mkdir(process.env.KUSSOON_BROWSER_ARTIFACTS,{recursive:true});
     await page.locator('#mapFrame').screenshot({path:path.join(process.env.KUSSOON_BROWSER_ARTIFACTS,'higashinada-'+width+'.png')});
    }
    if(width===320&&code==='28101'&&(process.env.KUSSOON_BROWSER_ENGINE||'chromium')==='chromium'){
     const view=await page.getAttribute('#map','viewBox'),cdp=await app.context.newCDPSession(page),b=await page.locator('#popupScroll').boundingBox();
     const touch=y=>[{id:1,x:b.x+b.width/2,y,radiusX:3,radiusY:3,force:1}];
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touch(b.y+b.height-10)});
     for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touch(b.y+b.height-10-n*18)});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     await page.waitForFunction(()=>document.querySelector('#popupScroll').scrollTop>20);
     assert.equal(await page.getAttribute('#map','viewBox'),view,'native scrolling inside popup must not pan map');
     await cdp.detach();
    }
    for(const link of await popup.locator('a').all()){
     await link.scrollIntoViewIfNeeded();
     const visible=await link.evaluate(n=>{const b=n.getBoundingClientRect(),s=document.getElementById('popupScroll').getBoundingClientRect();const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return b.top>=s.top-1&&b.bottom<=s.bottom-4&&n.contains(hit);});
     assert(visible,'S13 every link, including last city row, is fully reachable and hit-testable');
    }
    assert(await popup.locator('.popup-address').evaluateAll(ns=>ns.every(n=>parseFloat(getComputedStyle(n).fontSize)>=12)),'addresses are not shrunk to force a fit');
    await page.click('#popupClose');assert.equal(await page.locator('#map .chosen').count(),1);
   }
  }
  assert.deepEqual(app.errors,[]);console.log('PASS S08/S12/S13: 320/375/390/844px, Higashinada/Chuo/city, full 3/6 links and internal scroll ('+(process.env.KUSSOON_BROWSER_ENGINE||'chromium')+')');
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
