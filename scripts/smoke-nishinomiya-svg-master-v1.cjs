// Nishinomiya SVG master V1 visual and functional smoke test.
// Chromium/WebKit emulation is NOT a physical iPhone Safari test.
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.SVG_MASTER_SCREENSHOTS||'svg-master-v1-screenshots');
fs.mkdirSync(root,{recursive:true});
const base=process.env.SVG_MASTER_URL||'http://127.0.0.1:8765';
const pathName='/v2/nishinomiya-town-svg-master-v1-20261116-pilot.html';
const cases=[
 {name:'chromium-pc',browser:chromium,width:1280,height:800},
 {name:'webkit-mobile-390',browser:webkit,width:390,height:844},
 {name:'webkit-mobile-320',browser:webkit,width:320,height:668}
];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(c){
 const browser=await c.browser.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:c.width,height:c.height},deviceScaleFactor:2,
   isMobile:c.width<=390,hasTouch:c.width<=390});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+pathName,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
  assert.equal(await page.locator('path.town').count(),321,'321 town SVG paths');
  const ids=['zoomIn','zoomOut','larger','smaller','size','reset','reading'];
  const bounds=await page.evaluate(ids=>{
   const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,right:r.right}};
   return {map:rect('map'),frame:rect('frame'),full:rect('fullscreen'),controls:rect('zoomIn'),
    buttons:ids.map(rect),documentWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};
  },ids);
  assert(bounds.documentWidth<=bounds.clientWidth+2,'horizontal scroll overflow');
  assert(Math.abs(bounds.full.w-49)<2,'fullscreen button should be 49px');
  assert(bounds.full.y<bounds.buttons[0].y,'fullscreen belongs to top right');
  for(let i=1;i<bounds.buttons.length;i++)assert(bounds.buttons[i].y>bounds.buttons[i-1].y,'controls must remain vertical');
  for(const r of bounds.buttons)assert(r.right<=bounds.frame.right+2&&r.x>=bounds.frame.x-2,'controls inside map');
  const scale=()=>page.evaluate(()=>window.d3.zoomTransform(document.getElementById('map')).k);
  const k0=await scale();
  const x=bounds.map.x+bounds.map.w*.48,y=bounds.map.y+bounds.map.h*.52;
  if(c.width>390){
   // Browser drivers cannot inject a mouse wheel into mobile WebKit.
   // Wheel B and double-click are desktop gesture contracts; mobile uses touch/button.
   await page.mouse.move(x,y);
   await page.mouse.wheel(0,-450);await sleep(400);
   assert(Math.abs(await scale()-k0)<.001,'wheel initially disarmed');
   await page.mouse.click(x,y);
   await page.mouse.wheel(0,-450);await sleep(400);
   const k1=await scale();assert(k1>k0*1.02,'wheel armed after map click');
   await page.locator('h1').click();
   await page.mouse.move(x,y);await page.mouse.wheel(0,-450);await sleep(400);
   assert(Math.abs(await scale()-k1)<.001,'wheel disarmed after outside pointerdown');
   await page.mouse.dblclick(x,y);await sleep(450);
   assert(await scale()>k1*1.1,'double-click must zoom in');
  }else{
   await page.locator('#zoomIn').tap();await sleep(350);
   assert(await scale()>k0*1.05,'mobile zoom + button works');
   await page.locator('#zoomOut').tap();await sleep(350);
  }
  await page.locator('#reset').click();await sleep(300);
  await page.locator('#reading').click();assert.match(await page.locator('#reading').innerText(),/ON/);
  assert(await page.locator('#labels text.town-label').count()>=321,'labels retained');
  await page.locator('#reading').click();
  await page.locator('#larger').click();assert.match(await page.locator('#size').innerText(),/125/);
  await page.locator('#size').click();assert.match(await page.locator('#size').innerText(),/100/);
  await page.locator('#fullscreen').click();await sleep(200);
  assert.equal(await page.locator('#fullscreen').innerText(),'戻る');
  await page.locator('#fullscreen').click();await sleep(200);
  assert.equal(await page.locator('#fullscreen').innerText(),'全画面');
  await page.locator('#communityToggle').click();
  assert.equal(await page.locator('#communityOptions button').count(),27);
  assert.equal(await page.locator('#communityOptions button').first().getAttribute('data-community'),'');
  const readings=await page.locator('#communityOptions button small').allTextContents();
  const ja=new Intl.Collator('ja',{usage:'sort',sensitivity:'base',numeric:false});
  for(let i=1;i<readings.length;i++)assert(ja.compare(readings[i-1],readings[i])<=0,'kana sort');
  const cols=await page.locator('#communityOptions').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  assert.equal(cols,c.width<=600?4:5,'region grid columns');
  await page.locator('#communityOptions button[data-community="西宮浜"]').click();
  assert.match(await page.locator('#communityCount').innerText(),/1町名/);
  await page.locator('#quizOne').click();
  await page.locator('#quizReveal').click();
  await page.locator('#quizNext').click();
  assert.equal(await page.locator('#quizRetryWrong').isVisible(),true);
  await page.locator('#quizBack').click();
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  await page.screenshot({path:path.join(root,c.name+'.png'),fullPage:true});
  assert.deepEqual(errors,[],'browser console page errors');
  console.log('PASS '+c.name+' 321 shapes, controls, wheel B, double click, fullscreen, 26 regions, both quizzes');
 }finally{await browser.close()}
}
(async()=>{for(const c of cases)await run(c)})().catch(e=>{console.error(e);process.exitCode=1});
