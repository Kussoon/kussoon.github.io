'use strict';
// TOWNMAP-SSOT-001 R-TOWN-01/02/04/05/06/13/14/40/44.
// Diagnostic-only: never change accepted label coordinates or fail solely
// because a projected centroid falls outside a concave polygon.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const samples=['上大市','宝生ケ丘','青葉台']; // audit cases, NOT rendering exceptions
const screens=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
const out=process.env.TOWN_ANCHOR_DIAG_DIR||'artifacts/national-town-anchor-diagnostics';
fs.mkdirSync(out,{recursive:true});const reports=[];
(async()=>{
 for(const [screen,engine,width,height] of screens){
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto('http://127.0.0.1:8765/v2/nishinomiya-town-svg-master-v34-20261117-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>(document.querySelector('#communityCount')?.textContent||'').includes('321町名'),{timeout:60000});
    const data=await page.evaluate(names=>{
     const svg=document.querySelector('#map');
     const paths=new Map([...document.querySelectorAll('#areas path.town')].map(el=>[el.__data__?.properties?.S_NAME||el.__data__?.name,el]));
     const groups=new Map([...document.querySelectorAll('#labels g.label')].map(el=>[el.__data__?.name,el]));
     return names.map(name=>{
      const el=groups.get(name),shape=paths.get(name);
      if(!el||!shape)return {name,missing:true};
      const d=el.__data__,bbox=shape.getBBox(),p=d.point,offset=d.offset||[0,0];
      const inside=(x,y)=>{
       const q=svg.createSVGPoint();q.x=x;q.y=y;
       return shape.isPointInFill(q);
      };
      const insideBase=inside(p[0],p[1]);
      let nearest=null,best=Infinity,interiorCount=0;
      // Diagnostics only: uniform grid in actual SVG local geometry, not
      // a proposal to overwrite historical C/V34 calibrated labels.
      for(let iy=0;iy<=40;iy++)for(let ix=0;ix<=40;ix++){
       const x=bbox.x+bbox.width*(ix+.5)/41,y=bbox.y+bbox.height*(iy+.5)/41;
       if(!inside(x,y))continue;
       interiorCount++;
       const dist=Math.hypot(x-p[0],y-p[1]);
       if(dist<best){best=dist;nearest=[x,y];}
      }
      const rect=el.getBoundingClientRect(),r=shape.getBoundingClientRect();
      return {name,missing:false,base:p,offset,bbox:{x:bbox.x,y:bbox.y,width:bbox.width,height:bbox.height},
       insideBase,nearestSample:nearest,nearestDistanceSVGUnits:Number.isFinite(best)?best:null,
       interiorSamples:interiorCount,
       textRect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom},
       pathRect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom}};
     });
    },samples);
    assert.deepEqual(errors,[]);
    assert.ok(data.every(x=>!x.missing),'existing V34 labels and path geometry remain available');
    reports.push({screen,data});
    console.log('PASS NATIONAL_TOWN_ACCEPTED_ANCHOR_DIAGNOSTIC '+JSON.stringify({screen,rows:data.map(x=>({name:x.name,insideBase:x.insideBase,offset:x.offset,nearestDistanceSVGUnits:x.nearestDistanceSVGUnits,interiorSamples:x.interiorSamples}))}));
   }finally{await page.close();}
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(out,'accepted-anchor-diagnostics.json'),JSON.stringify(reports,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
