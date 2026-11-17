// V14-to-V15 4-choice candidate parity across every town and region scope.
// Uses deterministic random only during audit, never changes public page.
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const out=path.resolve('nishinomiya-v15-candidate-parity');fs.mkdirSync(out,{recursive:true});
const versions={
 V14:'/v2/nishinomiya-town-svg-master-v14-20261117-pilot.html',
 V15:'/v2/nishinomiya-town-svg-master-v15-20261117-pilot.html'
};
async function snapshot(page,scope){
 return page.evaluate(scope=>{
  const audit=window.__nishinomiyaCandidateAudit;
  const names=audit.names();if(names.length!==321)throw Error('321 town names missing');
  const original=Math.random,originalCentroid=d3.geoCentroid,results=[];
  // Memoize an identical centroid for each immutable GeoJSON feature during
  // this audit only. V14 otherwise recalculates it millions of times.
  const centroidCache=new WeakMap();
  d3.geoCentroid=function(feature){
   if(centroidCache.has(feature))return centroidCache.get(feature);
   const center=originalCentroid(feature);centroidCache.set(feature,center);return center;
  };
  try{
   for(let index=0;index<names.length;index++){
    let seed=(index+1)*2654435761>>>0;
    Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
    const got=audit.choiceCandidates(names[index]);
    if(got.length!==4||new Set(got).size!==4||!got.includes(names[index]))
     throw Error('Invalid four-choice candidate '+names[index]);
    results.push({town:names[index],answers:got});
   }
  }finally{Math.random=original;d3.geoCentroid=originalCentroid}
  return {scope,results};
 },scope);
}
async function load(page,version){
 await page.route('**'+versions[version],async route=>{
  const res=await route.fetch(),body=await res.text();
  const marker='KussoonTownSvgDataContract.load({';
  if(body.split(marker).length!==2)throw Error('Unexpected app loader marker');
  const injection='window.__nishinomiyaCandidateAudit={names:()=>features.map(f=>f.properties.S_NAME),choiceCandidates};\n';
  await route.fulfill({response:res,body:body.replace(marker,injection+marker),
   headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 await page.goto(base+versions[version],{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),
  null,{timeout:60000});
}
(async()=>{
 for(const c of [{name:'chromium-1280',driver:chromium,w:1280,h:800},
  {name:'webkit-390',driver:webkit,w:390,h:844}]){
  const browser=await c.driver.launch({headless:true});
  try{
   const report={device:c.name,versions:{}};
   for(const version of Object.keys(versions)){
    const page=await browser.newPage({viewport:{width:c.w,height:c.h},isMobile:c.w<600,hasTouch:c.w<600});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await load(page,version);
    report.versions[version]={};
    for(const scope of ['whole','山口','上ヶ原','西宮浜']){
     if(scope!=='whole'){
      await page.evaluate(scope=>{
       const btn=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community===scope);
       if(!btn)throw Error('Missing region '+scope);btn.click();
      },scope);
     }
     report.versions[version][scope]=await snapshot(page,scope);
    }
    assert.deepEqual(errors,[],version+' JS errors');
    await page.close();
   }
   for(const scope of ['whole','山口','上ヶ原','西宮浜']){
    assert.deepEqual(report.versions.V15[scope],report.versions.V14[scope],
     c.name+' '+scope+' candidate selection changed');
   }
   const summary={device:c.name,towns:321,scopes:4,comparisonCount:1284,identical:true};
   fs.writeFileSync(path.join(out,c.name+'.json'),JSON.stringify(summary,null,2));
   console.log('PASS V15_CANDIDATE_PARITY '+JSON.stringify(summary));
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
