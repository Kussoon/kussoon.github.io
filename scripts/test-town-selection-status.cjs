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
 const browser=await cfg.engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},hasTouch:cfg.width<600,isMobile:cfg.width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const code of ['28214','28204']){
   await page.goto('http://127.0.0.1:8766/v2/verify-town-map-pr595/?code='+code);
   await page.waitForFunction(()=>document.querySelectorAll('path.town').length>0);
   const names=await page.locator('path.town').evaluateAll(es=>es.slice(0,2).map(e=>e.__data__.properties.S_NAME));
   const select=name=>page.locator('path.town').evaluateAll((es,name)=>es.find(e=>e.__data__.properties.S_NAME===name).dispatchEvent(new MouseEvent('click',{bubbles:true})),name);
   const sample=()=>page.evaluate(()=>{const s=document.querySelector('#status'),paths=[...document.querySelectorAll('path.town.selected')],r=s.getBoundingClientRect();return {text:s.textContent,font:getComputedStyle(s).fontSize,off:getComputedStyle(s).color==='rgba(0, 0, 0, 0)',active:s.classList.contains('selection-status'),dims:paths.map(p=>p.classList.contains('dim')),height:r.height}});
   await select(names[0]);
   let s=await sample();assert.equal(s.font,'16px');assert.equal(s.off,false);assert(s.text.includes(names[0]));
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
   await page.waitForTimeout(600);assert(!(await sample()).active);
   await page.locator('#quizReveal').click();assert((await page.locator('#quizFeedback').textContent()).includes('点滅している場所'));
   assert((await page.locator('path.town.selected').count())>0);
   await page.locator('#quizQuit').click();s=await sample();assert(s.active&&s.text.includes('中断した問題'));
   await page.locator('#quizBack').click();s=await sample();assert(!s.active&&!s.off);
   // Pointer focus must not paint the track; keyboard focus and keys remain usable.
   const slider=page.locator('#zoomSlider');await slider.scrollIntoViewIfNeeded();
   if(cfg.width<600){const b=await slider.boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2)}else await slider.click();
   const outlines=()=>page.evaluate(()=>['#zoomSlider','.zoom-slider-track'].map(sel=>getComputedStyle(document.querySelector(sel)).outlineStyle));
   assert((await outlines()).every(x=>x==='none'),'pointer focus outline');
   await slider.press('Home');await page.waitForTimeout(100);assert.equal(await slider.getAttribute('aria-valuenow'),'0.00');
   assert.notEqual((await outlines())[0],'none','keyboard focus missing');
   await slider.press('ArrowUp');await page.waitForTimeout(100);assert(Number(await slider.getAttribute('aria-valuenow'))>0);
   await slider.press('Tab');assert((await outlines()).every(x=>x==='none'));
   console.log('PASS SELECTION_STATUS '+JSON.stringify({browser:cfg.name,code,phases:6,redraw:true,cleanup:true,pointerOutline:false,keyboardOutline:true}));
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
