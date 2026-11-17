'use strict';
// V35: compare *all* town labels, visible / offscreen / detached or stale,
// including duplicate 上甲東園 text nodes, without changing either page.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out='nishinomiya-v35-uekoto-labels';fs.mkdirSync(out,{recursive:true});
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const paths={C:'/v2/nishinomiya-town-study-c.html',SVG:'/v2/nishinomiya-town-svg-master-v34-20261117-pilot.html'};
const screens=[['pc-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
async function load(browser,c,type){
 const page=await browser.newPage({viewport:{width:c[2],height:c[3]},deviceScaleFactor:2,isMobile:c[2]<600,hasTouch:c[2]<600});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(type==='C')await page.route('**'+paths.C+'*',async route=>{
  const response=await route.fetch(),html=await response.text();
  const marker="Promise.all([fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')";
  assert.equal(html.split(marker).length,2,'inject C active-label introspection once');
  const hook=`window.__townActiveLabelElements=()=>new Set(scopeItems().flatMap(it=>it.labels.map(t=>t.getElement())).filter(Boolean));\n`;
  await route.fulfill({response,body:html.replace(marker,hook+marker),headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 await page.goto(base+paths[type],{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
 return {page,errors};
}
async function region(page,name){
 await page.evaluate(n=>{
  const b=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community===n);
  if(!b)throw Error('missing region '+n);b.click()
 },name);
 await page.waitForTimeout(100);
}
async function measure(page,type){
 return page.evaluate(type=>{
  const map=document.querySelector('#map').getBoundingClientRect();
  const els=type==='C'?[...document.querySelectorAll('.leaflet-tooltip.town-label')]:[...document.querySelectorAll('#labels text.town-label')];
  const active=type==='C'?window.__townActiveLabelElements():null;
  const rows=els.map((el,i)=>{
   const span=type==='C'?el.querySelector('span'):null;
   const name=type==='C'?span?.firstChild?.textContent||'':el.querySelector('.town-name')?.textContent||'';
   const text=type==='C'?span?.firstChild:el.querySelector('.town-name');
   if(!text)return null;
   const range=document.createRange();range.selectNodeContents(text);const b=range.getBoundingClientRect();
   const shown= b.width>0&&b.height>0&&b.right>map.left&&b.left<map.right&&b.bottom>map.top&&b.top<map.bottom;
   const row={index:i,name,cx:+(b.left+b.width/2-map.left).toFixed(3),cy:+(b.top+b.height/2-map.top).toFixed(3),
    shown,centerInMap:b.left+b.width/2>=map.left&&b.left+b.width/2<=map.right&&b.top+b.height/2>=map.top&&b.top+b.height/2<=map.bottom,
    cssDisplay:getComputedStyle(el).display,rect:[+b.width.toFixed(3),+b.height.toFixed(3)],
    active:type==='C'?active.has(el):true};
   if(type==='SVG'){const d=d3.select(el.parentElement).datum();row.labelId=d?.id;row.offset=d?.offset;row.target=d?.point;}
   return row;
  }).filter(Boolean);
  const summary={total:rows.length,visible:rows.filter(x=>x.shown).length,active:rows.filter(x=>x.active).length};
  const groups={};for(const r of rows)(groups[r.name]??=[]).push(r);
  const duplicates=Object.entries(groups).filter(([,r])=>r.length>1).map(([name,entries])=>({name,entries}));
  const special=rows.filter(r=>r.name==='上甲東園');
  const excluded=rows.filter(x=>!x.active||!x.shown);
  return {summary,duplicates,special,excluded,rows};
 },type);
}
(async()=>{
 for(const s of screens){
  const browser=await s[1].launch({headless:true});
  try{
   const a=await load(browser,s,'C'),b=await load(browser,s,'SVG'),data=[];
   for(const co of ['','上ヶ原','甲東','']){
    if(data.length){await region(a.page,co);await region(b.page,co)}
    const C=await measure(a.page,'C'),SVG=await measure(b.page,'SVG');
    const ca=C.rows.map(x=>x.name),sa=SVG.rows.map(x=>x.name);
    const unique=a=>[...new Set(a)];
    const missing=unique(ca).filter(n=>!sa.includes(n)),extra=unique(sa).filter(n=>!ca.includes(n));
    const outcome={stage:co||'whole',C:{summary:C.summary,special:C.special,duplicates:C.duplicates,excluded:C.excluded},SVG:{summary:SVG.summary,special:SVG.special,duplicates:SVG.duplicates,excluded:SVG.excluded},missing,extra};
    data.push(outcome);
    console.log('V35_UEKOTO_DIAG '+JSON.stringify({screen:s[0],...outcome}));
   }
   assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
   fs.writeFileSync(path.join(out,s[0]+'.json'),JSON.stringify(data,null,2));
  }finally{await browser.close()}
 }
})().catch(err=>{console.error(err);process.exitCode=1});
