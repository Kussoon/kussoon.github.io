'use strict';
// C Leaflet vs SVG V15 world-coordinate transformation probe.
// This reads zoom/center/projection data after loading without changing either page.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const out=path.resolve('nishinomiya-c-v15-projection-probe');fs.mkdirSync(out,{recursive:true});
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const urls={C:'/v2/nishinomiya-town-study-c.html',SVG:'/v2/nishinomiya-town-svg-master-v15-20261117-pilot.html'};
const cases=[{name:'pc-1280',driver:chromium,width:1280,height:800},{name:'webkit-390',driver:webkit,width:390,height:844},{name:'webkit-320',driver:webkit,width:320,height:668}];
const coords=[[135.25,34.83],[135.3,34.8],[135.35,34.78]];
const inject={
 C:{marker:"Promise.all([fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')",
  script:"window.__townProjectionProbe=()=>({engine:'Leaflet',zoom:map.getZoom(),center:map.getCenter(),initialZoom,bounds:{sw:allBounds.getSouthWest(),ne:allBounds.getNorthEast()},mapSize:map.getSize(),positions:[[135.25,34.83],[135.3,34.8],[135.35,34.78]].map(p=>{const q=map.latLngToContainerPoint([p[1],p[0]]);return [q.x,q.y]})});\n"},
 SVG:{marker:'KussoonTownSvgDataContract.load({',
  script:"window.__townProjectionProbe=()=>({engine:'SVG',initialK,transform:{k:transform.k,x:transform.x,y:transform.y},projectionScale:projection.scale(),projectionTranslation:projection.translate(),mapSize:[baseWidth,baseHeight],positions:[[135.25,34.83],[135.3,34.8],[135.35,34.78]].map(p=>{const q=projection(p);return [q[0]*transform.k+transform.x,q[1]*transform.k+transform.y]})});\n"}
};
(async()=>{
 const reports=[];
 for(const c of cases){
  const browser=await c.driver.launch({headless:true});
  try{
   const results={};
   for(const type of ['C','SVG']){
    const page=await browser.newPage({viewport:{width:c.width,height:c.height},deviceScaleFactor:2,isMobile:c.width<600,hasTouch:c.width<600});
    const spec=inject[type];
    await page.route('**'+urls[type],async route=>{
     const response=await route.fetch(),body=await response.text();
     assert.equal(body.split(spec.marker).length,2,type+' exact injection marker');
     await route.fulfill({response,body:body.replace(spec.marker,spec.script+spec.marker),
      headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
    });
    await page.goto(base+urls[type],{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(type==='C'
     ?()=>document.querySelector('#status')?.textContent.includes('321町名')
     :()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
    results[type]=await page.evaluate(()=>window.__townProjectionProbe());
    await page.close();
   }
   const C=results.C,SVG=results.SVG;
   const deltas=coords.map((coordinate,i)=>({coordinate,C:C.positions[i],SVG:SVG.positions[i],
    delta:SVG.positions[i].map((v,j)=>+(v-C.positions[i][j]).toFixed(4))}));
   const x0=C.positions[0][0],x1=C.positions[1][0],sx0=SVG.positions[0][0],sx1=SVG.positions[1][0];
   const screenScale=(sx1-sx0)/(x1-x0);
   const screenShift=sx0-screenScale*x0;
   const result={screen:c.name,C,SVG,sampleDeltas:deltas,
    xScaleRatio:+screenScale.toFixed(8),xTranslation:+screenShift.toFixed(4),
    zoomSnapConsistent:Number.isFinite(C.zoom)&&Math.abs(C.zoom*10-Math.round(C.zoom*10))<1e-5};
   reports.push(result);
   console.log('C_V15_PROJECTION_PROBE '+JSON.stringify(result));
  }finally{await browser.close()}
 }
 fs.writeFileSync(path.join(out,'projection-probe.json'),JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
