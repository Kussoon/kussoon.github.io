'use strict';
// Direct C vs V28 visual comparison across every one of the 26 learning regions,
// reading, 125% text and direct-town links. This audit does NOT alter maps.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve('nishinomiya-c-v28-glyph-metrics');fs.mkdirSync(out,{recursive:true});
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const urls={C:'/v2/nishinomiya-town-study-c.html',SVG:'/v2/nishinomiya-town-svg-master-v28-20261117-pilot.html'};
// Ref guard: never accidentally audit a previous pilot under a new version.
assert.equal(urls.SVG,'/v2/nishinomiya-town-svg-master-v28-20261117-pilot.html','V28 audit target URL');
const cases=[{name:'pc-1280',driver:chromium,w:1280,h:800},{name:'webkit-390',driver:webkit,w:390,h:844},{name:'webkit-320',driver:webkit,w:320,h:668}];
const quantile=(arr,q)=>{if(!arr.length)return null;const a=[...arr].sort((x,y)=>x-y),z=q*(a.length-1),lo=Math.floor(z),hi=Math.ceil(z);return +(a[lo]+(a[hi]-a[lo])*(z-lo)).toFixed(3)};
async function ready(page,type){await page.waitForFunction(type==='C'
 ?()=>document.querySelector('#communityCount')?.textContent.includes('321町名')
 :()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000})}
async function snap(page,type){
 return page.evaluate(type=>{
  const map=document.querySelector('#map').getBoundingClientRect();
  const active=type==='C'?window.__townActiveLabelElements():null;
  const els=type==='C'?[...document.querySelectorAll('.leaflet-tooltip.town-label')].filter(el=>active.has(el))
   :[...document.querySelectorAll('#labels text.town-label')];
  const svgGlyphBox=element=>{
   // V28: use the actual text-node Range rather than WebKit's tspan
   // getBBox, which V23 demonstrated can equal the entire parent <text>.
   const range=document.createRange();
   range.selectNodeContents(element);
   const actual=range.getBoundingClientRect();
   if(actual.width>0&&actual.height>0)return actual;
   // Keep the fallback for diagnostics, explicitly distinguish it in CI.
   const box=element.getBBox(),m=element.getScreenCTM();
   if(!m)return element.getBoundingClientRect();
   const corners=[[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]]
     .map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
   const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x));
   const top=Math.min(...corners.map(p=>p.y)),bottom=Math.max(...corners.map(p=>p.y));
   return {left,right,top,bottom,width:right-left,height:bottom-top};
  };
  const rows=els.map(el=>{
   const span=type==='C'?el.querySelector('span'):null;
   const name=type==='C'?span?.firstChild?.textContent||'':el.querySelector('.town-name')?.textContent||'';
   const nameEl=type==='C'?span?.firstChild:el.querySelector('.town-name');
   // Compare rendered glyph extents, not Leaflet's potentially stale
   // outer tooltip element dimensions after read/size changes.
   let b;
   if(type==='C'){
    const range=document.createRange();range.selectNodeContents(nameEl);
    b=range.getBoundingClientRect();
   }else b=svgGlyphBox(nameEl);
   const readingEl=type==='C'?span?.querySelector('small.reading'):el.querySelector('tspan.town-reading');
   const r=readingEl?(type==='C'?readingEl.getBoundingClientRect():svgGlyphBox(readingEl)):null;
   return {name,cx:b.left+b.width/2-map.left,cy:b.top+b.height/2-map.top,
    width:b.width,height:b.height,
    reading:r?{cx:r.left+r.width/2-map.left,cy:r.top+r.height/2-map.top}:null,
    shown:b.width>0&&b.height>0&&b.right>map.left&&b.left<map.right&&b.bottom>map.top&&b.top<map.bottom};
  });
  return {rows,map:[map.width,map.height],labels:rows.length,names:[...new Set(rows.map(x=>x.name))]};
 },type);
}
function compare(stage,A,B){
 const missing=A.names.filter(x=>!B.names.includes(x)),extra=B.names.filter(x=>!A.names.includes(x));
 // Do not conceal a mismatch: report it for the region/zoom acceptance gate.
 // Whole-city or reading changes must still keep exactly the same name set.
 if(['whole','reading-on','reading-on-font-125','whole-restored'].includes(stage)){
  assert.deepEqual(missing,[],'Missing SVG names at '+stage);
  assert.deepEqual(extra,[],'Extra SVG names at '+stage);
  assert.equal(A.rows.length,B.rows.length,'Mismatching labels at '+stage);
 }
 const groups=new Map();
 for(const x of B.rows){if(!groups.has(x.name))groups.set(x.name,[]);groups.get(x.name).push(x)}
 const diff=[],readingDiff=[],readingNameRelative=[];
 for(const c of A.rows){
  const rest=groups.get(c.name)||[];
  if(!rest.length)continue;
  let idx=0,best=Infinity;
  for(let i=0;i<rest.length;i++){const d=Math.hypot(c.cx-rest[i].cx,c.cy-rest[i].cy);if(d<best){best=d;idx=i}}
  const match=rest.splice(idx,1)[0];
  diff.push({name:c.name,delta:+best.toFixed(3)});
  if(c.reading&&match.reading){readingDiff.push(Math.hypot(c.reading.cx-match.reading.cx,c.reading.cy-match.reading.cy));readingNameRelative.push((match.reading.cy-match.cy)-(c.reading.cy-c.cy))}
 }
 diff.sort((a,b)=>b.delta-a.delta);
 return {stage,count:A.rows.length,unique:A.names.length,visibleC:A.rows.filter(x=>x.shown).length,
  visibleSVG:B.rows.filter(x=>x.shown).length,mapC:A.map,mapSVG:B.map,
  median:quantile(diff.map(x=>x.delta),.5),p95:quantile(diff.map(x=>x.delta),.95),
  max:quantile(diff.map(x=>x.delta),1),readingMedian:quantile(readingDiff,.5),readingMax:quantile(readingDiff,1),readingRelativeYMedian:quantile(readingNameRelative,.5),worst:diff.slice(0,3)};
}
async function choose(page,name){
 await page.evaluate(name=>{
  const b=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community===name);
  if(!b)throw Error('Region not found '+name);
  b.click();
 },name);
}
async function load(browser,config,type,query=''){
 const page=await browser.newPage({viewport:{width:config.w,height:config.h},deviceScaleFactor:2,
  isMobile:config.w<600,hasTouch:config.w<600});
 const errs=[];page.on('pageerror',e=>errs.push(e.message));
 if(type==='C'){
  await page.route('**'+urls.C+'*',async route=>{
   const response=await route.fetch(),html=await response.text();
   const marker="Promise.all([fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')";
   assert.equal(html.split(marker).length,2,'C insertion marker');
   const hook="window.__townActiveLabelElements=()=>new Set(scopeItems().flatMap(it=>it.labels.map(t=>t.getElement())).filter(Boolean));\n";
   await route.fulfill({response,body:html.replace(marker,hook+marker),
    headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
  });
 }
 await page.goto(base+urls[type]+query,{waitUntil:'domcontentloaded',timeout:60000});
 await ready(page,type);
 return {page,errs};
}
(async()=>{
 const summary=[];
 for(const c of cases){
  const browser=await c.driver.launch({headless:true});
  try{
   const a=await load(browser,c,'C'),b=await load(browser,c,'SVG'),checks=[];
   checks.push(compare('whole',await snap(a.page,'C'),await snap(b.page,'SVG')));
   await a.page.locator('#reading').click();await b.page.locator('#reading').click();
   checks.push(compare('reading-on',await snap(a.page,'C'),await snap(b.page,'SVG')));
   await a.page.locator('#larger').click();await b.page.locator('#larger').click();
   checks.push(compare('reading-on-font-125',await snap(a.page,'C'),await snap(b.page,'SVG')));
   await a.page.locator('#reading').click();await b.page.locator('#reading').click();
   await a.page.locator('#size').click();await b.page.locator('#size').click();
   const regions=await a.page.evaluate(()=>[...document.querySelectorAll('#communityOptions button[data-community]')].map(x=>x.dataset.community).filter(Boolean));
   assert.equal(regions.length,26);
   for(const name of regions){
    await choose(a.page,name);await choose(b.page,name);
    checks.push(compare('region:'+name,await snap(a.page,'C'),await snap(b.page,'SVG')));
   }
   await choose(a.page,'');await choose(b.page,'');
   checks.push(compare('whole-restored',await snap(a.page,'C'),await snap(b.page,'SVG')));
   assert.deepEqual(a.errs,[],'Leaflet JS errors');
   assert.deepEqual(b.errs,[],'SVG JS errors');
   await a.page.close();await b.page.close();
   for(const name of ['岡田山','山口町下山口']){
    const q='?town='+encodeURIComponent(name);
    const ca=await load(browser,c,'C',q),sb=await load(browser,c,'SVG',q);
    checks.push(compare('direct:'+name,await snap(ca.page,'C'),await snap(sb.page,'SVG')));
    assert.deepEqual(ca.errs,[]);assert.deepEqual(sb.errs,[]);
    await ca.page.close();await sb.page.close();
   }
   const result={screen:c.name,states:checks.length,whole:checks[0],
    reading:checks[1],font125:checks[2],regions:checks.filter(x=>x.stage.startsWith('region:')),
    restored:checks.find(x=>x.stage==='whole-restored'),
    direct:checks.filter(x=>x.stage.startsWith('direct:'))};
   summary.push(result);
   fs.writeFileSync(path.join(out,c.name+'.json'),JSON.stringify(result,null,2));
   console.log('C_V28_GLYPH_METRICS '+JSON.stringify({screen:c.name,states:checks.length,
    whole:result.whole,reading:result.reading,font125:result.font125,
    regionWorst:[...result.regions].sort((a,b)=>b.max-a.max).slice(0,5),
    restored:result.restored,direct:result.direct}));
  }finally{await browser.close()}
 }
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
