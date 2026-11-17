// C Leaflet vs SVG V16 rendered reference capture. No changes to approved maps.
// A DOM geometric comparison is not a proof of subjective visual quality.
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve('nishinomiya-c-v16-direct-visual');fs.mkdirSync(out,{recursive:true});
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const cases=[{name:'pc-1280',driver:chromium,w:1280,h:800},{name:'webkit-390',driver:webkit,w:390,h:844},{name:'webkit-320',driver:webkit,w:320,h:668}];
const urls={C:'/v2/nishinomiya-town-study-c.html',SVG:'/v2/nishinomiya-town-svg-master-v16-20261117-pilot.html'};
async function ready(page,type){await page.waitForFunction(type==='C'?()=>document.querySelector('#status')?.textContent.includes('321町名'):()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000})}
async function metrics(page,type,stage){
 return page.evaluate(({type,stage})=>{
  const map=document.querySelector('#map');const box=map.getBoundingClientRect();
  const nodes=type==='C'?[...document.querySelectorAll('.leaflet-tooltip.town-label')]:
   [...document.querySelectorAll('#labels text.town-label')];
  const labels=nodes.map(el=>{
   const name=type==='C'?el.querySelector('span')?.childNodes[0]?.textContent||'':el.querySelector('.town-name')?.textContent||'';
   const r=el.getBoundingClientRect(),font=Number.parseFloat(getComputedStyle(el).fontSize||el.getAttribute('font-size'));
   return {name,x:r.x-box.x,y:r.y-box.y,cx:r.x+r.width/2-box.x,cy:r.y+r.height/2-box.y,
    width:r.width,height:r.height,font,shown:r.width>0&&r.height>0&&r.right>box.left&&r.left<box.right&&r.bottom>box.top&&r.top<box.bottom};
  });
  const unique=[...new Set(labels.map(l=>l.name))];
  return {type,stage,map:[box.width,box.height],labels:labels.length,unique:unique.length,
   visible:labels.filter(l=>l.shown).length,nonFinite:labels.filter(l=>!Number.isFinite(l.cx)||!Number.isFinite(l.cy)),
   fontRange:[Math.min(...labels.map(l=>l.font)),Math.max(...labels.map(l=>l.font))],
   names:unique,rows:labels};
 },{type,stage});
}
async function chooseRegion(page,type,name){
 if(type==='C'){
  const toggle=page.locator('#communityToggle');
  if(await toggle.count())await toggle.click();
  const options=page.locator('#communityOptions button');
  if(await options.count()){await options.filter({hasText:name}).first().click();return}
  const select=page.locator('#communitySelect');
  if(await select.count()){await select.selectOption({label:name});return}
  throw Error('Cannot locate C community control');
 }
 await page.evaluate(name=>{const b=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community===name);if(!b)throw Error('No SVG region '+name);b.click()},name);
}
(async()=>{
 const results=[];
 for(const c of cases){
  const browser=await c.driver.launch({headless:true});
  try{
   for(const type of ['C','SVG']){
    const page=await browser.newPage({viewport:{width:c.w,height:c.h},deviceScaleFactor:2,isMobile:c.w<600,hasTouch:c.w<600});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+urls[type],{waitUntil:'domcontentloaded',timeout:60000});await ready(page,type);
    const baseline=await metrics(page,type,'whole');
    assert.equal(baseline.unique,321,type+' unique town labels');
    assert.equal(baseline.nonFinite.length,0,'all centres finite');
    results.push({case:c.name,...baseline});
    await page.locator('#map').screenshot({path:path.join(out,c.name+'-'+type+'-whole.png')});
    if(type==='SVG'){
     await page.locator('#reading').click();
     const r=await metrics(page,type,'reading');
     assert.equal(r.unique,321);
     results.push({case:c.name,...r});
     await page.locator('#map').screenshot({path:path.join(out,c.name+'-'+type+'-reading.png')});
     await chooseRegion(page,type,'山口');
     const m=await metrics(page,type,'yamaguchi');
     assert(m.labels>0);results.push({case:c.name,...m});
     await page.locator('#map').screenshot({path:path.join(out,c.name+'-'+type+'-yamaguchi.png')});
    }
    assert.deepEqual(errors,[],type+' runtime error');
    await page.close();
   }
  }finally{await browser.close()}
 }
 // Distances are absolute screen-pixel distances relative to the map viewport;
 // C has Leaflet tooltip layout and SVG has SVG text layout. We report differences,
 // not automatic approval or a claim of visual equality.
 const quantile=(values,q)=>{
  if(!values.length)return null;
  const ordered=[...values].sort((a,b)=>a-b);
  const at=q*(ordered.length-1),lo=Math.floor(at),hi=Math.ceil(at);
  return +(ordered[lo]+(ordered[hi]-ordered[lo])*(at-lo)).toFixed(3);
 };
 const report=[];
 for(const c of cases){
  const a=results.find(x=>x.case===c.name&&x.type==='C'&&x.stage==='whole');
  const b=results.find(x=>x.case===c.name&&x.type==='SVG'&&x.stage==='whole');
  const missing=b.names.filter(x=>!a.names.includes(x)),extra=a.names.filter(x=>!b.names.includes(x));
  assert.deepEqual(missing,[],'SVG names missing from C');
  assert.deepEqual(extra,[],'C names missing from SVG');
  const counts={};for(const z of b.rows)counts[z.name]=(counts[z.name]||0)+1;
  assert.equal(counts['山口町阪神流通センター'],1);
  const group=rows=>{
   const map=new Map();
   for(const x of rows){if(!map.has(x.name))map.set(x.name,[]);map.get(x.name).push(x)}
   return map;
  };
  const cg=group(a.rows),sg=group(b.rows),deltas=[],byTown=[];
  for(const [name,cRects] of cg){
   const svgs=sg.get(name)||[];
   assert.equal(svgs.length,cRects.length,name+' label count differs');
   // For duplicate labels, pair closest unmatched centres; this is for diagnosis only.
   const unused=[...svgs],local=[];
   for(const cr of cRects){
    let best=-1,min=Infinity;
    for(let i=0;i<unused.length;i++){
     const dx=unused[i].cx-cr.cx,dy=unused[i].cy-cr.cy;
     const dist=Math.hypot(dx,dy);
     if(dist<min){min=dist;best=i}
    }
    if(best<0)throw Error('Unmatched label '+name);
    const sv=unused.splice(best,1)[0];
    const dx=sv.cx-cr.cx,dy=sv.cy-cr.cy;
    const row={name,dx:+dx.toFixed(3),dy:+dy.toFixed(3),distance:+Math.hypot(dx,dy).toFixed(3),
     c:[+cr.cx.toFixed(2),+cr.cy.toFixed(2)],svg:[+sv.cx.toFixed(2),+sv.cy.toFixed(2)]};
    local.push(row);deltas.push(row.distance);
   }
   byTown.push(...local);
  }
  // Estimate a global similarity transform C -> SVG to distinguish
  // map scale/translation differences from town-specific anchor differences.
  const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
  const cmx=mean(byTown.map(x=>x.c[0])),cmy=mean(byTown.map(x=>x.c[1]));
  const smx=mean(byTown.map(x=>x.svg[0])),smy=mean(byTown.map(x=>x.svg[1]));
  let numerator=0,denominator=0;
  for(const x of byTown){
   numerator+=(x.c[0]-cmx)*(x.svg[0]-smx)+(x.c[1]-cmy)*(x.svg[1]-smy);
   denominator+=(x.c[0]-cmx)**2+(x.c[1]-cmy)**2;
  }
  const scale=numerator/denominator,translateX=smx-scale*cmx,translateY=smy-scale*cmy;
  const residuals=byTown.map(x=>Math.hypot(x.svg[0]-(scale*x.c[0]+translateX),
    x.svg[1]-(scale*x.c[1]+translateY)));
  const affineDiagnosis={scale:+scale.toFixed(7),translation:[+translateX.toFixed(3),+translateY.toFixed(3)],
   residualPx:{median:quantile(residuals,.5),p95:quantile(residuals,.95),max:quantile(residuals,1),
     above1:residuals.filter(x=>x>1).length,above5:residuals.filter(x=>x>5).length},
   meanDelta:[+(smx-cmx).toFixed(3),+(smy-cmy).toFixed(3)]};
  byTown.sort((x,y)=>y.distance-x.distance);
  const comparison={screen:c.name,C:{labels:a.labels,unique:a.unique,visible:a.visible,font:a.fontRange,map:a.map},
   SVG:{labels:b.labels,unique:b.unique,visible:b.visible,font:b.fontRange,map:b.map},
   mapSizeEqual:JSON.stringify(a.map)===JSON.stringify(b.map),
   globalTransformDiagnosis:affineDiagnosis,
   centerDistancesPx:{min:quantile(deltas,0),median:quantile(deltas,.5),p90:quantile(deltas,.9),
     p95:quantile(deltas,.95),max:quantile(deltas,1),
     above1:deltas.filter(v=>v>1).length,above5:deltas.filter(v=>v>5).length,
     above20:deltas.filter(v=>v>20).length,observations:deltas.length},
   worstLabels:byTown.slice(0,25),missing,extra,
   svgToCVisibleRatio:+(b.visible/Math.max(1,a.visible)).toFixed(3)};
  report.push(comparison);
  console.log('C_V16_DIRECT_VISUAL '+JSON.stringify({...comparison,worstLabels:byTown.slice(0,5)}));
 }
 fs.writeFileSync(path.join(out,'metrics-summary.json'),JSON.stringify(report,null,2));
 fs.writeFileSync(path.join(out,'all-label-rectangles.json'),JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
