'use strict';
// Diagnostic only: Leaflet tooltip glyph vs anchor, SVG glyph vs anchor.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out='nishinomiya-v33-tooltip-anchor';fs.mkdirSync(out,{recursive:true});
const host=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const urls={C:'/v2/nishinomiya-town-study-c.html',SVG:'/v2/nishinomiya-town-svg-master-v25-20261117-pilot.html'};
const cases=[['pc-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
const cHook=`window.__probeTownAnchor=()=>{
 const box=document.querySelector('#map').getBoundingClientRect();
 const samples=[];
 for(const it of scopeItems()){
  for(const t of it.labels){
   const el=t.getElement(),ll=t.getLatLng();if(!el||!ll||!map.hasLayer(t))continue;
   const span=el.querySelector('span');if(!span?.firstChild)continue;
   const range=document.createRange();range.selectNodeContents(span.firstChild);
   const r=range.getBoundingClientRect(),p=map.latLngToContainerPoint(ll);
   samples.push({name:it.name,anchor:[p.x,p.y],glyph:[r.left+r.width/2-box.left,r.top+r.height/2-box.top],
    rect:[r.width,r.height],tooltip:[el.getBoundingClientRect().width,el.getBoundingClientRect().height],
    size:parseFloat(getComputedStyle(span).fontSize),layer:it.layer===it.regionLayers?.[communityChoice]?'regional':'standard'});
  }
 }
 return {region:communityChoice,zoom:map.getZoom(),fontPct,readingOn,samples};
};\n`;
const sHook=`window.__probeTownAnchor=()=>{
 const box=document.querySelector('#map').getBoundingClientRect(),samples=[];
 labels.selectAll('g.label').each(function(d){
  const el=this.querySelector('.town-name');if(!el)return;
  const range=document.createRange();range.selectNodeContents(el);
  const r=range.getBoundingClientRect();
  samples.push({name:el.textContent,anchor:[d.point[0]*transform.k+transform.x+d.offset[0],d.point[1]*transform.k+transform.y+d.offset[1]],
   glyph:[r.left+r.width/2-box.left,r.top+r.height/2-box.top],rect:[r.width,r.height],
   font:fontPixels(),dId:d.id,mode:cLabelMode,rebaseline:cRebaseline,
   cached:cBaselineLabelShifts.get(d.id),reflow:cLabelReflowMetrics.get(d.id)});
 });
 return {region:communityChoice,zoomK:transform.k,fontPct,readingOn,samples};
};\n`;
async function load(browser,cfg,type){
 const page=await browser.newPage({viewport:{width:cfg[2],height:cfg[3]},deviceScaleFactor:2,isMobile:cfg[2]<600,hasTouch:cfg[2]<600});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**'+urls[type]+'*',async route=>{
  const response=await route.fetch(),html=await response.text();
  const marker=type==='C'?"Promise.all([fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')":"function updateLabelSize(){";
  assert.equal(html.split(marker).length,2,'unique probe injection point '+type);
  await route.fulfill({response,body:html.replace(marker,(type==='C'?cHook:sHook)+marker),headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 await page.goto(host+urls[type],{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
 return {page,errors};
}
async function setRegion(page,name){
 await page.evaluate(n=>{
  const btn=[...document.querySelectorAll('#communityOptions button[data-community]')].find(x=>x.dataset.community===n);
  if(!btn)throw Error('missing region button '+n);btn.click();
 },name);await page.waitForTimeout(100);
}
const selectors=['安井町','川添町','上甲東園','西宮浜','山口町下山口'];
(async()=>{
 for(const cfg of cases){
  const browser=await cfg[1].launch({headless:true});
  try{
   const a=await load(browser,cfg,'C'),b=await load(browser,cfg,'SVG'),states=[];
   const capture=async name=>{
    const [C,S]=await Promise.all([a.page.evaluate(()=>window.__probeTownAnchor()),b.page.evaluate(()=>window.__probeTownAnchor())]);
    const picks=inputs=>inputs.samples.filter(x=>selectors.includes(x.name)).map(x=>({...x,relative:[+(x.glyph[0]-x.anchor[0]).toFixed(3),+(x.glyph[1]-x.anchor[1]).toFixed(3)]}));
    const cNames=C.samples.map(x=>x.name),sNames=S.samples.map(x=>x.name);
    states.push({stage:name,C:{region:C.region,total:C.samples.length,selected:picks(C)},SVG:{region:S.region,total:S.samples.length,selected:picks(S)},
     names:{cUpper:cNames.filter(n=>n==='上甲東園').length,svgUpper:sNames.filter(n=>n==='上甲東園').length}});
   };
   await capture('whole-initial');
   for(const [region,town] of [['安井','安井町'],['香櫨園','川添町'],['上ヶ原','上甲東園'],['山口','山口町下山口']]){
    await setRegion(a.page,region);await setRegion(b.page,region);await capture('region:'+region);
   }
   await setRegion(a.page,'');await setRegion(b.page,'');await capture('whole-restored');
   assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
   fs.writeFileSync(path.join(out,cfg[0]+'.json'),JSON.stringify(states,null,2));
   console.log('V33_TOOLTIP_ANCHOR '+JSON.stringify({screen:cfg[0],states}));
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
