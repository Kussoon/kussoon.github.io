'use strict';
// Diagnose sequence-dependent C Leaflet DOM ghosts / SVG label counts.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out='nishinomiya-v36-region-sequence';fs.mkdirSync(out,{recursive:true});
const urls={C:'/v2/nishinomiya-town-study-c.html',SVG:'/v2/nishinomiya-town-svg-master-v34-20261117-pilot.html'};
const cases=[['pc-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
const host=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
async function load(browser,c,type){
 const page=await browser.newPage({viewport:{width:c[2],height:c[3]},deviceScaleFactor:2,isMobile:c[2]<600,hasTouch:c[2]<600});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(type==='C')await page.route('**'+urls.C+'*',async route=>{
  const response=await route.fetch(),html=await response.text(),marker="Promise.all([fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')";
  assert.equal(html.split(marker).length,2,'C hook placement');
  const hook="window.__townActiveLabelElements=()=>new Set(scopeItems().flatMap(it=>it.labels.map(t=>t.getElement())).filter(Boolean));\n";
  await route.fulfill({response,body:html.replace(marker,hook+marker),headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 await page.goto(host+urls[type],{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
 return {page,errors};
}
async function choose(page,name){
 await page.evaluate(n=>{
  const b=[...document.querySelectorAll('#communityOptions button[data-community]')].find(x=>x.dataset.community===n);
  if(!b)throw Error('missing community '+n);b.click();
 },name);
}
async function snap(page,type){
 return page.evaluate(type=>{
  const map=document.querySelector('#map').getBoundingClientRect();
  const active=type==='C'?window.__townActiveLabelElements():null;
  const els=type==='C'?[...document.querySelectorAll('.leaflet-tooltip.town-label')]:
   [...document.querySelectorAll('#labels text.town-label')];
  const rows=els.map((el,i)=>{
   const span=type==='C'?el.querySelector('span'):null;
   const t=type==='C'?span?.firstChild:el.querySelector('.town-name');
   if(!t)return null;
   const name=type==='C'?t.textContent||'':t.textContent||'';
   const rng=document.createRange();rng.selectNodeContents(t);const b=rng.getBoundingClientRect();
   const shown=b.width>0&&b.height>0&&b.right>map.left&&b.left<map.right&&b.bottom>map.top&&b.top<map.bottom;
   return {name,cx:+(b.left+b.width/2-map.left).toFixed(3),cy:+(b.top+b.height/2-map.top).toFixed(3),
    shown,active:type==='C'?active.has(el):true,index:i};
  }).filter(Boolean);
  const group={};for(const r of rows)(group[r.name]??=[]).push(r);
  const dupes=Object.entries(group).filter(([,x])=>x.length>1).map(([name,entries])=>({name,entries}));
  return {count:rows.length,active:rows.filter(x=>x.active).length,visible:rows.filter(x=>x.shown).length,
   unique:Object.keys(group).length,dupes,upper:rows.filter(x=>x.name==='上甲東園'),
   visibleNames:rows.filter(x=>x.shown).map(x=>x.name),
   activeNames:rows.filter(x=>x.active).map(x=>x.name)};
 },type);
}
(async()=>{
 for(const cfg of cases){
  const browser=await cfg[1].launch({headless:true});
  try{
   const a=await load(browser,cfg,'C'),b=await load(browser,cfg,'SVG');
   const regions=await a.page.evaluate(()=>[...document.querySelectorAll('#communityOptions button[data-community]')].map(x=>x.dataset.community).filter(Boolean));
   assert.equal(regions.length,26);
   const states=[];
   for(const [index,name] of ['',...regions,''].entries()){
    if(index>0){await choose(a.page,name);await choose(b.page,name)}
    const [C,S]=await Promise.all([snap(a.page,'C'),snap(b.page,'SVG')]);
    const difference=(x,y)=>x.filter(q=>!y.includes(q));
    const obj={stage:name||'whole',index,
     C:{count:C.count,active:C.active,visible:C.visible,unique:C.unique,dupes:C.dupes,upper:C.upper},
     SVG:{count:S.count,active:S.active,visible:S.visible,unique:S.unique,dupes:S.dupes,upper:S.upper},
     missingSVG:difference(C.activeNames,S.activeNames),extraSVG:difference(S.activeNames,C.activeNames),
     offscreenC:C.count-C.visible,offscreenSVG:S.count-S.visible};
    states.push(obj);
    console.log('V36_REGION_SEQUENCE '+JSON.stringify({screen:cfg[0],...obj}));
   }
   assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
   fs.writeFileSync(path.join(out,cfg[0]+'.json'),JSON.stringify(states,null,2));
   await a.page.close();await b.page.close();
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
