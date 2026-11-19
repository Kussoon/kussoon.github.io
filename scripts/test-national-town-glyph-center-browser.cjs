'use strict';
// Compare an independent glyph-centred page against the already adopted
// multipart-candidate pilot. Candidates and reading-ON layout must not drift.
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const oldUrl='/v2/town-map-shared-browser-labels-20261119-pilot.html';
const newUrl='/v2/town-map-shared-browser-glyph-20261119-pilot.html';
async function collect(page){
 await page.waitForTimeout(380);
 return page.evaluate(()=>{
  const world=document.querySelector('#world'),m=world.getScreenCTM();
  return [...document.querySelectorAll('#labels g.label')].map(node=>{
   const d=node.__data__,span=node.querySelector('tspan.town-name');
   const box=window.KussoonTownMultipartLabels.glyphScreenRect(span,document);
   const pos={x:m.a*d.point[0]+m.c*d.point[1]+m.e,
              y:m.b*d.point[0]+m.d*d.point[1]+m.f};
   return {key:d.key,name:d.name,reading:d.reading,point:d.point,
    secondary:d.secondary,visible:node.dataset.visible==='true',
    center:{x:box.left+box.width/2,y:box.top+box.height/2},
    error:Math.hypot(pos.x-(box.left+box.width/2),pos.y-(box.top+box.height/2)),
    transform:node.getAttribute('transform')
   };
  }).sort((a,b)=>a.key.localeCompare(b.key));
 });
}
const median=xs=>{const a=[...xs].sort((a,b)=>a-b);return a[Math.floor(a.length/2)]};
async function run(engine,label,viewport){
 const browser=await engine.launch({headless:true});
 try{
  const opts={viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500,deviceScaleFactor:2};
  const old=await browser.newPage(opts),fresh=await browser.newPage(opts),errors=[];
  old.on('pageerror',e=>errors.push('old '+e.message));
  fresh.on('pageerror',e=>errors.push('new '+e.message));
  for(const [page,url] of [[old,oldUrl],[fresh,newUrl]]){
   await page.goto('http://127.0.0.1:8765'+url,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__townPreview?.labelCandidateCount()===136,null,{timeout:60000});
  }
  async function parity(stage){
   const a=await collect(old),b=await collect(fresh);
   assert.equal(a.length,136===a.length&&stage==='initial'?136:a.length,stage+' candidate count');
   assert.equal(a.length,b.length,stage+' candidate count differs');
   const active=[];
   for(let i=0;i<a.length;i++){
    assert.equal(a[i].key,b[i].key,stage+' key');
    assert.equal(a[i].name,b[i].name,stage+' name');
    assert.equal(a[i].reading,b[i].reading,stage+' reading');
    assert.deepEqual(a[i].point,b[i].point,stage+' coordinate unchanged');
    assert.equal(a[i].secondary,b[i].secondary,stage+' extra component unchanged');
    assert.equal(a[i].visible,b[i].visible,stage+' visibility unchanged');
    if(b[i].visible)active.push(b[i].error);
   }
   assert(active.length>0,stage+' no visible labels');
   assert(Math.max(...active)<1.8,stage+' glyph center exceeds 1.8px: '+Math.max(...active));
   return {visible:active.length,median:median(active),max:Math.max(...active)};
  }
  const initial=await parity('initial');
  for(const page of [old,fresh])await page.locator('#region').selectOption('仁川');
  const scoped=await collect(fresh);
  assert(scoped.length>0&&scoped.length<136,'region label scope');
  // The scoped fit must be centred at approved candidate glyph coordinates.
  const scopedA=await collect(old);
  for(let i=0;i<scoped.length;i++){
   assert.equal(scoped[i].key,scopedA[i].key);
   assert.deepEqual(scoped[i].point,scopedA[i].point);
  }
  const visible=scoped.filter(x=>x.visible).map(x=>x.error);
  assert(visible.length>0);
  assert(Math.max(...visible)<1.8,'scoped glyph center mismatch: '+Math.max(...visible));
  // Reading-on is separately calibrated: new page must not change its geometry.
  for(const page of [old,fresh])await page.locator('#reading').click();
  const onA=await collect(old),onB=await collect(fresh);
  for(let i=0;i<onA.length;i++){
   assert.equal(onA[i].key,onB[i].key);
   // DOM label transforms are byte-for-byte the same when readings are ON.
   assert.equal(onA[i].transform,onB[i].transform,'reading-ON shift is forbidden');
  }
  for(const page of [old,fresh])await page.locator('#reading').click();
  const off=await collect(fresh);
  assert(Math.max(...off.filter(x=>x.visible).map(x=>x.error))<1.8,'reading-OFF recenter');
  assert.deepEqual(errors,[],'page errors');
  console.log('PASS NATIONAL_GLYPH_CENTER '+JSON.stringify({label,initial,scopeVisible:visible.length,scopeMax:Math.max(...visible),candidates:136}));
 }finally{await browser.close()}
}
(async()=>{
 await run(chromium,'chromium-1280',{width:1280,height:800});
 await run(webkit,'webkit-390',{width:390,height:844});
 await run(webkit,'webkit-320',{width:320,height:668});
})().catch(e=>{console.error(e);process.exitCode=1});
