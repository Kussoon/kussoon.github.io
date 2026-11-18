'use strict';
// TOWNMAP-SSOT-001 R-TOWN-22 / R-TOWN-14: real-browser gesture and label checks.
// Intentionally do not change the application or silently relax the standard.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const out='artifacts/takarazuka-gesture-label-check';
fs.mkdirSync(out,{recursive:true});
const cases=[['chromium-1280',chromium,1280,800],['chromium-390',chromium,390,844],['webkit-390',webkit,390,844]];
const report=[];
const base='http://127.0.0.1:8765/v2/takarazuka-town-svg-result-navigation-20261118-pilot.html';
async function state(page){
 return page.evaluate(()=>{
  const map=document.querySelector('#map'),t=window.d3.zoomTransform(map);
  const nodes=[...document.querySelectorAll('#labels g.label')];
  const visible=nodes.filter(e=>e.dataset.visible==='true');
  const names=new Set(visible.map(e=>e.__data__?.name));
  const boxes=visible.map(e=>e.querySelector('tspan.town-name')?.getBoundingClientRect())
   .filter(r=>r&&r.width>0&&r.height>0);
  let collisions=0;
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];
   if(a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom)collisions++;
  }
  const frame=map.getBoundingClientRect();
  const visibleInside=visible.every(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>frame.left&&r.left<frame.right&&r.bottom>frame.top&&r.top<frame.bottom;});
  return {k:t.k,x:t.x,y:t.y,labelElements:nodes.length,visible:visible.length,
   uniqueNames:names.size,visibleInside,collisions,allNamesPresent:names.size>=125};
 });
}
async function test(name,engine,width,height){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>(document.querySelector('#communityCount')?.textContent||'').includes('125町名'),{timeout:60000});
  const initial=await state(page),rect=await page.locator('#map').boundingBox();
  // Map button zoom is established baseline. This also tests label persistence
  // at a progressively closer view, without imposing a zero-overlap criterion.
  await page.locator('#zoomIn').click();
  await page.waitForFunction(k=>window.d3.zoomTransform(document.querySelector('#map')).k>k+1e-5,initial.k,{timeout:5000});
  await page.waitForTimeout(200);
  const zoomed=await state(page);
  const map=page.locator('#map'),afterButton=await state(page);
  // D3 has its dblclick.zoom handler removed by town-svg-core. Record actual
  // behavior rather than assuming the promised double-click action works.
  await map.dblclick({position:{x:rect.width*.55,y:rect.height*.45}});
  await page.waitForTimeout(250);
  const afterDouble=await state(page);
  const doubleClickZoomed=afterDouble.k>afterButton.k+1e-4;
  let dragMoved=null;
  if(width>=600){
   const preDrag=await state(page);
   const px=rect.x+rect.width*.48,py=rect.y+rect.height*.48;
   await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(px+65,py+35,{steps:12});await page.mouse.up();
   const dragged=await state(page);
   dragMoved=Math.hypot(dragged.x-preDrag.x,dragged.y-preDrag.y)>10;
  }
  // Wheel B is a desktop-only input; mobile WebKit intentionally has no
  // mouse.wheel support, so its equivalent coverage is the touch pan below.
  let wheelWorked=null,wheelDisarmed=null;
  if(width>=600){
   await page.mouse.click(rect.x+rect.width*.50,rect.y+rect.height*.50);
   const preWheel=await state(page);
   await page.mouse.wheel(0,-240);await page.waitForTimeout(200);
   const armedWheel=await state(page);wheelWorked=armedWheel.k>preWheel.k+1e-5;
   await page.mouse.click(5,5);
   const beforeDisarmed=await state(page);
   await page.mouse.move(rect.x+rect.width*.52,rect.y+rect.height*.52);
   await page.mouse.wheel(0,-240);await page.waitForTimeout(200);
   const disarmed=await state(page);wheelDisarmed=Math.abs(disarmed.k-beforeDisarmed.k)<1e-5;
  }
  // Native touch input is available over Chromium's CDP protocol. For WebKit,
  // Playwright exposes tapping but no portable swipe actions. Do not mislabel
  // a synthetic touch event as a real iPhone swipe.
  let touchPan=null,touchTap=null,webKitSyntheticPan=null;
  if(width<600){
   await page.evaluate(()=>{window.__townAuditInputs={touch:0,pointer:0};
    document.addEventListener('touchstart',()=>window.__townAuditInputs.touch++,true);
    document.addEventListener('pointerdown',()=>window.__townAuditInputs.pointer++,true);
   });
   await page.touchscreen.tap(rect.x+rect.width*.50,rect.y+rect.height*.45);
   const inputs=await page.evaluate(()=>window.__townAuditInputs);
   touchTap=inputs.touch>0||inputs.pointer>0;
   if(name.startsWith('chromium')){
    const cdp=await page.context().newCDPSession(page);
    const pre=await state(page),x=rect.x+rect.width*.55,y=rect.y+rect.height*.55;
    await page.evaluate(()=>{window.__townAuditTouchTrace={start:0,move:0,end:0};
     for(const t of ['touchstart','touchmove','touchend'])document.addEventListener(t,()=>{
       const k=t.replace('touch','');window.__townAuditTouchTrace[k]++
     },true);
    });
    const ev=(type,xx,yy)=>cdp.send('Input.dispatchTouchEvent',{
      type,touchPoints:type==='touchEnd'?[]:[{x:xx,y:yy,id:1}],modifiers:0
    });
    await ev('touchStart',x,y);
    for(let i=1;i<=12;i++){await ev('touchMove',x+i*8,y+i*5);await page.waitForTimeout(16);}
    await ev('touchEnd',x+96,y+60);
    await page.waitForTimeout(160);
    const after=await state(page);
    const diag=await page.evaluate(()=>({trace:window.__townAuditTouchTrace,maxTouchPoints:navigator.maxTouchPoints,ontouchstart:'ontouchstart' in document.querySelector('#map'),hasD3TouchStart:typeof window.d3.select('#map').on('touchstart.zoom')==='function',hasD3TouchMove:typeof window.d3.select('#map').on('touchmove.zoom')==='function',touchAction:getComputedStyle(document.querySelector('#map')).touchAction}));
    console.log('TOUCH_TRACE '+JSON.stringify({browser:name,diag,before:{x:pre.x,y:pre.y,k:pre.k},after:{x:after.x,y:after.y,k:after.k}}));
    touchPan=Math.hypot(after.x-pre.x,after.y-pre.y)>10;
   }
  }
  const record={browser:name,width,height,initial,zoomed,
   doubleClickZoomed,dragMoved,wheelWorked,wheelDisarmed,touchPan,touchTap,webKitSyntheticPan,
   errors,labelVisibilityAfterZoom:zoomed.uniqueNames>=initial.uniqueNames,
   moreLabelsAtZoom:zoomed.visible>=initial.visible};
  report.push(record);
  console.log('GESTURE_LABEL_REPORT '+JSON.stringify({browser:name,initial:initial.uniqueNames,
   zoomed:zoomed.uniqueNames,collisionsBefore:initial.collisions,collisionsAfter:zoomed.collisions,
   doubleClickZoomed,dragMoved,wheelWorked,wheelDisarmed,touchPan,touchTap,errors}));
 }finally{await browser.close()}
}
(async()=>{for(const args of cases)await test(...args);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 // Report any actual failures as CI failure, after saving precise evidence.
 const problems=report.flatMap(r=>[
  ...(!r.doubleClickZoomed?['double click zoom']:[]),
  ...(r.dragMoved===false?['desktop mouse drag pan']:[]),
  ...(r.wheelWorked===false?['wheel B arm']:[]),
  ...(r.wheelDisarmed===false?['wheel B disarm']:[]),
  ...(r.touchTap===false?['touch tap']:[]),
  ...(r.touchPan===false?['native chromium touch pan']:[]),
  ...(!r.initial.visibleInside||!r.zoomed.visibleInside?['visible label outside viewport']:[]),
  ...(r.errors.length?['page error']:[])
 ].map(what=>r.browser+': '+what));
 if(problems.length)throw new Error('TOWNMAP_GESTURE_FAIL '+problems.join('; '));
})().catch(e=>{console.error(e);process.exitCode=1});
