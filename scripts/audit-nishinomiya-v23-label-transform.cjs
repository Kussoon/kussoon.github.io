'use strict';
// V23 diagnostics only: measure the effect of changing tspan.y and the
// enclosing g.label transform separately, without modifying production pages.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const dir='nishinomiya-v23-label-transform';fs.mkdirSync(dir,{recursive:true});
const cases=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
async function run(){
 const reports=[];
 for(const [id,engine,width,height] of cases){
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<600,hasTouch:width<600});
   await page.goto(base+'/v2/nishinomiya-town-svg-master-v21-20261117-pilot.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
   await page.locator('#reading').click();
   const values=await page.evaluate(()=>{
    const el=[...document.querySelectorAll('#labels g.label')].find(g=>g.querySelector('tspan.town-name')?.textContent==='西宮浜');
    if(!el)throw Error('Expected sample town missing');
    const name=el.querySelector('tspan.town-name'),reading=el.querySelector('tspan.town-reading');
    const rect=t=>{const b=t.getBBox(),m=t.getScreenCTM(),p=new DOMPoint(b.x+b.width/2,b.y+b.height/2).matrixTransform(m);return {cx:p.x,cy:p.y,width:b.width,height:b.height}};
    const snapshot=tag=>({tag,name:rect(name),reading:rect(reading),
      relativeY:rect(reading).cy-rect(name).cy,
      readingY:reading.getAttribute('y'),groupTransform:el.getAttribute('transform')});
    const before=snapshot('before');
    const y=Number(reading.getAttribute('y'));
    reading.setAttribute('y',String(y+8));const plus=snapshot('reading-y+8');
    reading.setAttribute('y',String(y-8));const minus=snapshot('reading-y-8');
    reading.setAttribute('y',String(y));
    // Isolate parent transform: moving g by eight CSS pixels via SVG transform
    // should move the two lines together without changing their relative offset.
    const transform=el.getAttribute('transform');
    el.setAttribute('transform',transform+' translate(0,8)');
    const group=snapshot('group-translate');
    el.setAttribute('transform',transform);
    return {before,plus,minus,group};
   });
   const diff=(a,b)=>({nameDy:+(a.name.cy-b.name.cy).toFixed(3),
    readingDy:+(a.reading.cy-b.reading.cy).toFixed(3),
    relativeDy:+(a.relativeY-b.relativeY).toFixed(3)});
   const out={id,base:values.before,deltaPlus8:diff(values.plus,values.before),
    deltaMinus8:diff(values.minus,values.before),deltaGroup:diff(values.group,values.before)};
   reports.push(out);
   assert.ok(Number.isFinite(out.deltaPlus8.relativeDy),'relative SVG reading movement must be finite');
  }finally{await browser.close()}
 }
 fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(reports,null,2));
 reports.forEach(x=>console.log('V23_LABEL_TRANSFORM '+JSON.stringify(x)));
}
run().catch(err=>{console.error(err);process.exitCode=1});
