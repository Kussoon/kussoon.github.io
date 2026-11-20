'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function run(page,cfg,out){
 const results=[];
 await page.evaluate(()=>window.__audit.showRegion(''));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const minScale=await page.evaluate(()=>window.__audit.minScale());
 const slider=page.locator('#zoomSlider');
 const rect=await slider.boundingBox(),x=rect.x+rect.width/2;
 const yAt=f=>rect.y+9+(rect.height-18)*f;
 const snap=()=>page.evaluate(()=>{const e=document.querySelector('#zoomSlider'),r=e.getBoundingClientRect(),t=document.querySelector('.zoom-slider-thumb').getBoundingClientRect();return {value:Number(e.getAttribute('aria-valuenow')),scale:window.__audit.transform().k,thumb:t.y+t.height/2,expected:r.bottom-9-(r.height-18)*Number(e.getAttribute('aria-valuenow'))/100,measures:document.querySelector('#map').getAttribute('data-label-measurements')}});
 await slider.evaluate(e=>{for(const type of ['pointerdown','pointermove','pointerup'])e.addEventListener(type,event=>{window.__sliderInput={type,y:event.clientY,id:event.pointerId,primary:event.isPrimary,pointerType:event.pointerType}})});
 async function verify(f,label){
  const requestedTarget=Math.max(0,Math.min(100,(1-f)*100));
  // WebKit rounds native input coordinates (e.g. requested199.4 -> clientY199).
  // Judge tracking against the actual delivered finger/mouse position, with the
  // same strict thumb and map agreement; never assume fractional OS coordinates.
  const physical=/^(mouse |native touch tap |native continuous touch )/.test(label);
  const input=physical?await page.evaluate(()=>window.__sliderInput):null;
  if(physical)assert(Math.abs(input.y-yAt(f))<=1.01,label+' unexpected native coordinate rounding');
  const target=physical?Math.max(0,Math.min(100,(rect.y+rect.height-9-input.y)/(rect.height-18)*100)):requestedTarget;
  try{await page.waitForFunction(({target,minScale})=>Math.abs(Number(document.querySelector('#zoomSlider').getAttribute('aria-valuenow'))-target)<.12&&Math.abs(window.__audit.transform().k-(minScale*Math.pow(40/minScale,target/100)))<.03,{target,minScale})}catch(error){console.error('SLIDER_DIAGNOSTIC '+JSON.stringify({browser:cfg.name,label,target,state:await snap(),rect,input:await page.evaluate(()=>window.__sliderInput)}));throw error}
  const s=await snap();assert(Math.abs(s.scale-(minScale*Math.pow(40/minScale,target/100)))<.03,label+' map/slider mismatch');
  assert(Math.abs(s.thumb-s.expected)<.75,label+' painted thumb drift');
  if(physical&&f>=0&&f<=1)assert(Math.abs(s.thumb-input.y)<.75,label+' thumb does not track actual native input');
  results.push({label,value:s.value,scale:s.scale,requestedTarget,actualInputY:input?.y});return s;
 }
 await slider.press('Home');await verify(1,'keyboard min');
 // Continuous real mouse drag, reversing several times and leaving the track.
 await page.mouse.move(x,yAt(.2));await page.mouse.down();
 const measurements=(await snap()).measures;
 for(const f of [.2,.3,.5,.7,.95,.75,.45,.1,0,-.2,.3,.8,1,1.2,.55]){await page.mouse.move(x,yAt(f));await verify(f,'mouse '+f);}
 await page.mouse.up();const release=await snap();await page.waitForTimeout(100);assert.deepEqual(await snap(),release,'release changes value/scale/thumb');
 assert.equal(release.measures,measurements,'drag remeasures labels');
 if(cfg.width<600){
  // Native WebKit touch taps verify coordinate-to-value handling in the real engine.
  for(const f of [.2,.65,.9,.4]){await slider.press('Home');await page.touchscreen.tap(x,yAt(f));await verify(f,'native touch tap '+f)}
 }
 if(cfg.name.startsWith('chromium')){
  // CDP supplies a continuous native touch stream, including movement outside bounds.
  const cdp=await page.context().newCDPSession(page);
  await slider.press('Home');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:yAt(.2),id:11}]});
  for(const f of [.2,.4,.75,.95,.5,.1,-.1,.35,1.1,.6]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:yAt(f),id:11}]});await verify(f,'native continuous touch '+f)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }
 // All browsers: exercise touch pointer capture lifecycle/cancel and repeated reversals.
 await slider.press('Home');
 const pointer=(type,f,id=21,primary=true)=>slider.dispatchEvent(type,{pointerId:id,pointerType:'touch',isPrimary:primary,clientX:x,clientY:yAt(f),button:0,buttons:type==='pointerup'?0:1,bubbles:true,cancelable:true});
 await pointer('pointerdown',.2);
 for(const f of [.2,.4,.8,.55,.15,0,1,.6]){await pointer('pointermove',f);await verify(f,'touch pointer '+f)}
 await pointer('pointerdown',.9,22,false);await verify(.6,'secondary pointer ignored');
 await pointer('pointerup',.6);const beforeUp=await snap();await page.waitForTimeout(100);assert.deepEqual(await snap(),beforeUp,'touch release jumps');
 await pointer('pointerdown',.2);await verify(.2,'cancel start');await pointer('pointercancel',.2);await pointer('pointermove',.9);await verify(.2,'cancel ignores late movement');
 await slider.press('End');await verify(0,'keyboard max');await slider.press('Home');await verify(1,'keyboard reset min');
 await slider.press('PageUp');await verify(.9,'keyboard pageup');
 await slider.press('ArrowUp');await verify(.89,'keyboard up');
 // Existing plus/minus continue using the same D3 zoom and update the slider.
 await slider.press('Home');await verify(1,'before buttons');
 await page.locator('#zoomIn').click();await page.waitForTimeout(200);
 assert(Math.abs((await snap()).scale-2*minScale)<.01);
 await page.locator('#zoomOut').click();await page.waitForTimeout(200);await verify(1,'minus sync');
 const meta=await page.evaluate(()=>({time:document.querySelector('#updatedAt').textContent,iso:document.querySelector('#updatedAt').dateTime,notice:document.querySelector('.notice').textContent}));
 assert.match(meta.time,/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/);assert(Number.isFinite(Date.parse(meta.iso)));assert.match(meta.notice,/PR #681/);assert.match(meta.notice,/PR #595/);
 if(await page.locator('body').evaluate(e=>e.classList.contains('fullscreen'))){await page.locator('#fullscreen').click();await page.waitForTimeout(100)}
 await page.evaluate(()=>window.__audit.startQuiz(2,[window.__audit.features()[0].properties.S_NAME]));
 const colors=await page.evaluate(()=>({action:getComputedStyle(document.querySelector('#quizQuit')).backgroundColor,choices:[...document.querySelectorAll('#quizChoices button')].map(e=>getComputedStyle(e).backgroundColor)}));
 assert.equal(colors.action,'rgb(230, 241, 250)');assert(colors.choices.every(c=>c==='rgb(255, 255, 255)'));
 await page.locator('#quizPanel').screenshot({path:path.join(out,cfg.name+'-action-colors.png')});
 await page.evaluate(()=>window.__audit.stopQuiz(false));
 await page.locator('#fullscreen').click();await page.waitForTimeout(100);
 fs.writeFileSync(path.join(out,cfg.name+'-slider.json'),JSON.stringify({results,meta,colors},null,2));
 console.log('PASS SLIDER_CONTROLS '+JSON.stringify({browser:cfg.name,cases:results.length,nativeTouchDrag:cfg.name.startsWith('chromium'),nativeTouchTaps:cfg.width<600}));
}
module.exports={run};
