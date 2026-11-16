// C Leaflet vs SVG V6 rendered reference capture. No changes to approved maps.
// A DOM geometric comparison is not a proof of subjective visual quality.
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve('nishinomiya-c-svg-visual-comparison');fs.mkdirSync(out,{recursive:true});
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const cases=[{name:'pc-1280',driver:chromium,w:1280,h:800},{name:'webkit-390',driver:webkit,w:390,h:844},{name:'webkit-320',driver:webkit,w:320,h:668}];
const urls={C:'/v2/nishinomiya-town-study-c.html',SVG:'/v2/nishinomiya-town-svg-master-v6-20261117-pilot.html'};
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
 const report=[];
 for(const c of cases){
  const a=results.find(x=>x.case===c.name&&x.type==='C'&&x.stage==='whole');
  const b=results.find(x=>x.case===c.name&&x.type==='SVG'&&x.stage==='whole');
  const missing=b.names.filter(x=>!a.names.includes(x)),extra=a.names.filter(x=>!b.names.includes(x));
  assert.deepEqual(missing,[],'SVG names missing from C');
  assert.deepEqual(extra,[],'C names missing from SVG');
  const counts={};for(const z of b.rows)counts[z.name]=(counts[z.name]||0)+1;
  assert.equal(counts['山口町阪神流通センター'],1);
  const summary={screen:c.name,C:{labels:a.labels,unique:a.unique,visible:a.visible,font:a.fontRange,map:a.map},
    SVG:{labels:b.labels,unique:b.unique,visible:b.visible,font:b.fontRange,map:b.map},
    missing,extra,svgToCVisibleRatio:+(b.visible/Math.max(1,a.visible)).toFixed(3)};
  report.push(summary);
  console.log('C_SVG_VISUAL_REFERENCE '+JSON.stringify(summary));
 }
 fs.writeFileSync(path.join(out,'metrics-summary.json'),JSON.stringify(report,null,2));
 fs.writeFileSync(path.join(out,'all-label-rectangles.json'),JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
