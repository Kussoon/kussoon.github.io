'use strict';
// Diagnosis only: compare C Leaflet / V19 SVG mapping of identical geographic
// coordinates after reading, font-size, region selection and city reset.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve('nishinomiya-c-v19-state-projection');fs.mkdirSync(output,{recursive:true});
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const urls={C:'/v2/nishinomiya-town-study-c.html',SVG:'/v2/nishinomiya-town-svg-master-v19-20261117-pilot.html'};
const cases=[{name:'chromium-1280',driver:chromium,w:1280,h:800},{name:'webkit-390',driver:webkit,w:390,h:844},{name:'webkit-320',driver:webkit,w:320,h:668}];
const points=[[135.25,34.83],[135.30,34.80],[135.35,34.78]];
const names=['北口町','甲陽園日之出町','山口町下山口','山口町阪神流通センター'];
const labelHook={
 C:`window.__townLabelSnapshot=()=>{
  const root=document.querySelector('#map').getBoundingClientRect();
  return items.filter(it=>['北口町','甲陽園日之出町','山口町下山口','山口町阪神流通センター'].includes(it.name))
   .flatMap(it=>it.labels.map(t=>{const b=t.getElement()?.getBoundingClientRect();
    const a=t.getLatLng(),q=map.latLngToContainerPoint(a);
    return {name:it.name,attached:map.hasLayer(t),anchor:[q.x,q.y],
      label:b?[b.left-root.left,b.top-root.top,b.width,b.height]:null,
      font:getComputedStyle(t.getElement()||root).fontSize};
   }));
 };`,
 SVG:`window.__townLabelSnapshot=()=>{
  const root=svg.node().getBoundingClientRect();
  return labels.selectAll('g.label').nodes()
   .filter(n=>['北口町','甲陽園日之出町','山口町下山口','山口町阪神流通センター'].includes(n.__data__?.name))
   .map(n=>{const d=n.__data__,b=n.querySelector('text.town-label')?.getBoundingClientRect();
    return {name:d.name,anchor:[d.point[0]*transform.k+transform.x+d.offset[0],d.point[1]*transform.k+transform.y+d.offset[1]],
      label:b?[b.left-root.left,b.top-root.top,b.width,b.height]:null,
      cache:cBaselineLabelShifts.get(d.id),font:fontPixels() };
   });
 };`
};
const hooks={
 C:{marker:"Promise.all([fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')",
 script:`window.__townProjectionSnapshot=()=>({zoom:map.getZoom(),center:map.getCenter(),width:map.getSize().x,height:map.getSize().y,
  points:[[135.25,34.83],[135.30,34.80],[135.35,34.78]].map(p=>{const q=map.latLngToContainerPoint([p[1],p[0]]);return [q.x,q.y]})});\n`},
 SVG:{marker:'KussoonTownSvgDataContract.load({',
 script:`window.__townProjectionSnapshot=()=>({zoom:transform.k,origin:[transform.x,transform.y],width:baseWidth,height:baseHeight,
  points:[[135.25,34.83],[135.30,34.80],[135.35,34.78]].map(p=>{const q=projection(p);return [q[0]*transform.k+transform.x,q[1]*transform.k+transform.y]})});\n`}
};
async function open(browser,c,type){
 const page=await browser.newPage({viewport:{width:c.w,height:c.h},isMobile:c.w<600,hasTouch:c.w<600,deviceScaleFactor:2});
 const h=hooks[type];
 await page.route('**'+urls[type],async route=>{
  const response=await route.fetch(),html=await response.text();
  assert.equal(html.split(h.marker).length,2,'hook marker: '+type);
  await route.fulfill({response,body:html.replace(h.marker,h.script+labelHook[type]+h.marker),headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto(base+urls[type],{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
 return {page,errors};
}
async function stage(page,type,which){
 if(which==='reading')await page.locator('#reading').click();
 if(which==='125')await page.locator('#larger').click();
 if(which.startsWith('region:')||which==='restore'){
  const name=which==='restore'?'':which.slice(7);
  await page.evaluate(n=>{const b=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community===n);if(!b)throw Error('No region '+n);b.click()},name);
 }
}
async function snapshot(page){return page.evaluate(()=>window.__townProjectionSnapshot())}
(async()=>{
 const results=[];
 for(const c of cases){
  const browser=await c.driver.launch({headless:true});
  try{
   const a=await open(browser,c,'C'),b=await open(browser,c,'SVG');
   const out=[];
   for(const which of ['initial','reading','125','region:山口','region:上ヶ原','restore']){
    await Promise.all([stage(a.page,'C',which),stage(b.page,'SVG',which)]);
    const ca=await snapshot(a.page),sb=await snapshot(b.page);
    const labelStates={C:await a.page.evaluate(()=>window.__townLabelSnapshot()),SVG:await b.page.evaluate(()=>window.__townLabelSnapshot())};
    const deltas=ca.points.map((p,i)=>[+(sb.points[i][0]-p[0]).toFixed(3),+(sb.points[i][1]-p[1]).toFixed(3)]);
    const ratio=(sb.points[1][0]-sb.points[0][0])/(ca.points[1][0]-ca.points[0][0]);
    out.push({stage:which,C:{zoom:ca.zoom,center:ca.center},SVG:{zoom:sb.zoom,origin:sb.origin},scaleRatio:+ratio.toFixed(6),deltas,labels:labelStates});
   }
   assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
   results.push({screen:c.name,stages:out});
   console.log('C_V19_STATE_PROJECTION '+JSON.stringify({screen:c.name,stages:out}));
   await a.page.close();await b.page.close();
  }finally{await browser.close()}
 }
 fs.writeFileSync(path.join(output,'state-projection.json'),JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
