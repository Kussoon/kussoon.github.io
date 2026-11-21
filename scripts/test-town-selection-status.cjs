'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
let communityMapping;
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/nishinomiya/data/community-town-map.json'){res.setHeader('Content-Type','application/json');res.end(communityMapping);return}
 let file=path.join(root,pathname);if(pathname.endsWith('/'))file=path.join(file,'index.html');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/json');res.end(fs.readFileSync(file));
});
async function main(){
 const mappingResponse=await fetch('https://kussoon.com/nishinomiya/data/community-town-map.json');assert(mappingResponse.ok);communityMapping=await mappingResponse.text();
 await new Promise(r=>server.listen(8766,'127.0.0.1',r));
 for(const cfg of [{name:'chromium1280',engine:chromium,width:1280,height:800},{name:'webkit390',engine:webkit,width:390,height:844},{name:'webkit320',engine:webkit,width:320,height:668}]){
 if(process.env.TOWNMAP_BROWSER&&cfg.name!==process.env.TOWNMAP_BROWSER)continue;
 const browser=await cfg.engine.launch({headless:true,...(cfg.name.startsWith('chromium')&&process.env.TOWNMAP_CHROMIUM_PATH?{executablePath:process.env.TOWNMAP_CHROMIUM_PATH}:{} )});
 try{
  const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},hasTouch:cfg.width<600,isMobile:cfg.width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const code of ['28214','28204']){
   await page.goto('http://127.0.0.1:8766/v2/verify-town-map-pr595/?code='+code);
   await page.waitForFunction(()=>document.querySelectorAll('path.town').length>0);
   const names=await page.locator('path.town').evaluateAll(es=>es.slice(0,2).map(e=>e.__data__.properties.S_NAME));
   const select=name=>page.locator('path.town').evaluateAll((es,name)=>es.find(e=>e.__data__.properties.S_NAME===name).dispatchEvent(new MouseEvent('click',{bubbles:true})),name);
   const sample=()=>page.evaluate(()=>{const s=document.querySelector('#status'),paths=[...document.querySelectorAll('path.town.selected')],r=s.getBoundingClientRect();return {text:s.textContent,font:getComputedStyle(s).fontSize,off:getComputedStyle(s).color==='rgba(0, 0, 0, 0)',active:s.classList.contains('selection-status'),dims:paths.map(p=>p.classList.contains('dim')),height:r.height,red:document.querySelectorAll('path.town.wrong').length,yellow:document.querySelectorAll('path.town.selected').length}});
   await select(names[0]);
   let s=await sample();assert.equal(s.font,'16px');assert.equal(s.off,false);assert(s.text.includes(names[0]));
   const islandName=await page.locator('path.town').evaluateAll(es=>es.map(e=>e.__data__).find(d=>d.geometry?.type==='MultiPolygon'&&d.geometry.coordinates.length>1)?.properties.S_NAME||null);
   if(islandName){await select(islandName);s=await sample();assert(s.text.includes(islandName)&&s.text.includes('飛び地が存在します'));await select(names[0]);}
   const height=s.height;
   for(let i=0;i<6;i++){
    const off=!!(i%2===0);
    await page.waitForFunction(off=>document.querySelector('#status').classList.contains('selection-off')===off,off,{timeout:1500});
    s=await sample();assert.equal(s.off,off);assert(s.dims.length>0&&s.dims.every(d=>d===off),'polygon and text phase differ');assert.equal(s.height,height);assert(s.text.includes(names[0]));
   }
   await page.locator('#fullscreen').click();s=await sample();assert(s.active);assert(s.dims.length>0&&s.dims.every(d=>d===s.off));
   await page.locator('#fullscreen').click();
   await select(names[0]);s=await sample();assert(!s.active&&!s.off);assert.equal(s.font,'14px');assert(s.text.includes('停止'));
   await select(names[1]);s=await sample();assert(s.active&&!s.off&&s.text.includes(names[1]));
   await page.locator('#quizOne').click();s=await sample();assert(!s.active&&!s.off&&s.text.includes('クイズ1'));assert.equal(s.font,'14px');
   const target=await page.locator('#quizQuestion').innerText().then(t=>t.slice(1,t.indexOf('（')));
   const wrongName=await page.locator('path.town').evaluateAll((es,target)=>es.map(e=>e.__data__.properties.S_NAME).find(n=>n!==target),target);
   await select(wrongName);await select(target);await page.locator('#quizNext').click();
   await page.locator('#quizQuit').click();s=await sample();assert(!s.active&&s.text.includes('赤＝間違えた場所'));assert.equal(s.red,1);assert.equal(s.yellow,1);
   await page.waitForTimeout(600);s=await sample();assert.equal(s.red,0);assert.equal(s.yellow,0);
   await page.locator('#quizBack').click();
   await page.locator('#quizOne').click();await page.locator('#quizReveal').click();assert((await page.locator('#quizFeedback').textContent()).includes('点滅している場所'));
   assert((await page.locator('path.town.selected').count())>0);
   await page.locator('#quizQuit').click();s=await sample();assert(!s.active&&!s.text.includes('中断した問題'));
   await page.locator('#quizBack').click();s=await sample();assert(!s.active&&!s.off);
   // A completed Quiz 1 result uses the same cumulative red/yellow view as early quit.
   if(cfg.name==='chromium1280'&&code==='28214'){
    await page.locator('#quizOne').click();
    let completed=0;
    while(!(await page.locator('#quizResults').isVisible())){
     await page.locator('#quizReveal').click();
     if(await page.locator('#quizNext').isVisible())await page.locator('#quizNext').click();
     assert(++completed<=200,'quiz completion did not finish');
    }
    s=await sample();assert(s.text.includes('クイズ1の結果です'));assert(s.yellow>0);assert(s.red===0);
    await page.waitForTimeout(600);s=await sample();assert.equal(s.red,0);assert.equal(s.yellow,0);
    await page.locator('#quizBack').click();s=await sample();assert(!s.active&&!s.off);
   }
   const quizTwoTarget=()=>page.locator('path.town.selected').first().evaluate(e=>e.__data__.properties.S_NAME);
   const quizTwoChoice=async(name,wrong=false)=>page.locator('#quizChoices button').evaluateAll((buttons,{name,wrong})=>{
    const button=buttons.find(b=>(b.querySelector('.choice-name').textContent===name)!==wrong);
    if(!button)throw new Error('Quiz 2 choice missing: '+name);
    button.click();
   },{name,wrong});
   await page.locator('#quizTwo').click();
   const missed=await quizTwoTarget();
   await quizTwoChoice(missed,true);await quizTwoChoice(missed);
   await page.locator('#quizNext').click();
   const firstTry=await quizTwoTarget();assert.notEqual(missed,firstTry);
   await quizTwoChoice(firstTry);
   await page.locator('#quizQuit').click();
   s=await sample();assert(s.text.includes('クイズ2を中断')&&s.text.includes('赤＝一度でも間違えた'));assert.equal(s.red,1);assert.equal(s.yellow,1);
   const resultNames=await page.locator('path.town.wrong, path.town.selected').evaluateAll(es=>[...new Set(es.map(e=>e.__data__.properties.S_NAME))]);
   assert.equal(resultNames.length,2);
   await page.waitForTimeout(600);s=await sample();assert.equal(s.red,0);assert.equal(s.yellow,0);
   await page.locator('#quizBack').click();
   if(cfg.name==='chromium1280'&&code==='28214'){
    await page.locator('#communityToggle').click();
    await page.locator('#communityOptions button[data-community]:not([data-community=""])').first().click();
    await page.locator('#quizTwo').click();
    let completed=0;
    while(!(await page.locator('#quizResults').isVisible())){
     const target=await quizTwoTarget();
     if(completed===0)await quizTwoChoice(target,true);
     await quizTwoChoice(target);
     await page.locator('#quizNext').click();
     assert(++completed<=200,'Quiz 2 completion did not finish');
    }
    s=await sample();assert(s.text.includes('クイズ2の結果です'));assert.equal(s.red,1);assert.equal(s.yellow,completed-1);
    await page.locator('#quizBack').click();
    await page.locator('#communityToggle').click();
    await page.locator('#communityOptions button[data-community=""]').first().click();
   }
   // Pointer focus must not paint the track; keyboard focus and keys remain usable.
   const slider=page.locator('#zoomSlider');await slider.scrollIntoViewIfNeeded();
   if(cfg.width<600){const b=await slider.boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2)}else await slider.click();
   const outlines=()=>page.evaluate(()=>['#zoomSlider','.zoom-slider-track'].map(sel=>getComputedStyle(document.querySelector(sel)).outlineStyle));
   assert((await outlines()).every(x=>x==='none'),'pointer focus outline');
   await slider.press('Home');await page.waitForTimeout(100);assert.equal(await slider.getAttribute('aria-valuenow'),'0.00');
   assert.notEqual((await outlines())[0],'none','keyboard focus missing');
   await slider.press('ArrowUp');await page.waitForTimeout(100);assert(Number(await slider.getAttribute('aria-valuenow'))>0);
   await slider.press('Tab');assert((await outlines()).every(x=>x==='none'));
   await page.locator('#communityToggle').click();
   await page.locator('#communityOptions button[data-community]:not([data-community=""])').first().click();
   await page.locator('#fullscreen').click();await page.waitForTimeout(250);
   const sliderLayout=await page.evaluate(()=>{const frame=document.querySelector('#frame').getBoundingClientRect(),slot=document.querySelector('.zoom-slider-slot').getBoundingClientRect(),controls=document.querySelector('.controls').getBoundingClientRect();return {frameHeight:frame.height,slotHeight:slot.height,slotBottom:slot.bottom,controlsTop:controls.top}});
   assert(sliderLayout.slotHeight<sliderLayout.frameHeight*.55,'slider was not shortened');
   assert(sliderLayout.slotBottom<=sliderLayout.controlsTop+8,'slider is not above the lower controls');
   const regionBox=()=>page.evaluate(()=>{const a=document.querySelector('#areas').getBoundingClientRect(),m=document.querySelector('#map').getBoundingClientRect();return {cx:(a.left+a.right)/2-m.left,cy:(a.top+a.bottom)/2-m.top,w:a.width,h:a.height,mw:m.width,mh:m.height}});
   const fitted=await regionBox();
   await slider.press('End');await page.waitForTimeout(100);
   await slider.press('Home');await page.waitForTimeout(100);
   const low=await regionBox();
   assert(Math.abs(low.cx-fitted.cx)<1&&Math.abs(low.cy-fitted.cy)<1,'region jumps at minimum zoom');
   assert(Math.abs(low.w-fitted.w)<1&&Math.abs(low.h-fitted.h)<1,'minimum does not fit selected region');
   await slider.press('End');await page.waitForTimeout(100);
   const high=await regionBox();assert(high.cx+high.w/2>0&&high.cx-high.w/2<high.mw&&high.cy+high.h/2>0&&high.cy-high.h/2<high.mh,'region outside maximum zoom');
   await page.locator('#reading').click();
   await page.locator('#fullscreen').click();await page.waitForTimeout(250);
   console.log('PASS SELECTION_STATUS '+JSON.stringify({browser:cfg.name,code,phases:6,redraw:true,cleanup:true,pointerOutline:false,keyboardOutline:true}));
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
