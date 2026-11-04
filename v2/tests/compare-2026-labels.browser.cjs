'use strict';
// Diagnostic only: reuse both existing engines on the SAME committed 2026
// polygons/projection. Timing is reported, never used as a flaky pass threshold.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {start}=require('./helpers/nationwide-browser.cjs');
(async()=>{
 const app=await start(),{page}=app,results=[];
 try{
  await app.open();await page.locator('#showNames').uncheck();await page.addScriptTag({url:new URL('centered-labels.js',page.url()).href});
  for(const [pref,code] of [['27','27362'],['28','28110'],['28','28204'],['28','28219'],['22','22138'],['22','22205'],['01','01102']]){
   await app.pref(pref);await app.select(code);
   const result=await page.evaluate(async({pref,code})=>{
    const manifest=await fetch('../data/national/2026-common/national-2026-pilot/manifest.json').then(r=>r.json());
    const entry=manifest.entries.find(e=>e.pref===pref);
    const topo=await fetch('../data/national/2026-common/'+entry.source).then(r=>r.json());
    const arcs=topo.arcs.map(arc=>{let x=0,y=0;return arc.map(p=>{if(!topo.transform)return p;x+=p[0];y+=p[1];return [x*topo.transform.scale[0]+topo.transform.translate[0],y*topo.transform.scale[1]+topo.transform.translate[1]];});});
    const ring=ids=>{const out=[];for(const id of ids){const a=arcs[id<0?~id:id],p=id<0?a.slice().reverse():a;out.push(...(out.length?p.slice(1):p));}return out;};
    const g=topo.objects.municipalities.geometries.find(g=>String(g.properties.N03_007)===code);
    const polys=g.type==='Polygon'?[g.arcs.map(ring)]:g.arcs.map(p=>p.map(ring));
    const source=await fetch('../data/national/municipality-readings-all-source.json').then(r=>r.json());
    const region=KussoonV2ReadingBridge.attach([{code,name:g.properties.N03_004,polys}],source).regions[0];
    const b=KussoonV2MunicipalRenderer.focusBounds(polys),cos=Math.cos((b[1]+b[3])/2*Math.PI/180);
    const scale=Math.min(806/Math.max((b[2]-b[0])*cos,.04),662/Math.max(b[3]-b[1],.04));
    const project=p=>[425+(p[0]-(b[0]+b[2])/2)*cos*scale,350-(p[1]-(b[1]+b[3])/2)*scale];
    const references=await fetch('../data/national/office-reference-points.json').then(r=>r.json()),site=references.points[code];
    const model=()=>{const components=polys.map(p=>p.map(r=>r.map(project))),rings=components.flat();return {name:region.name,code,components,rings,box:KussoonLabelEngine.bbox(rings),centroid:KussoonLabelEngine.centroid(rings),officeReferencePoint:site?project([site.longitude,site.latitude]):null};};
    const M=KussoonCenteredLabels,E=KussoonLabelEngine,F=KussoonRegionFit;
    const current=()=>KussoonV2EstablishedLabelAdapter.layout({regions:[region],project,selected:code,all:false,readings:false}).get(code);
    const fixed=()=>M.officeComponent5(model());
    const median=fn=>{const times=[];for(let n=0;n<5;n++){const start=performance.now();fn();times.push(performance.now()-start);}return times.sort((a,b)=>a-b)[2];};
    const adapterPoint=current(),fixedResult=fixed(),base=model();
    const group=document.querySelector('#map [data-v2-labels] > g'),matrix=group.transform.baseVal.consolidate().matrix,box=group.getBBox();
    const actualPoint=[matrix.e,matrix.f];
    const quality=point=>({component:base.components.findIndex(p=>E.isInside(...point,p)),boxInside25:F.fractionInside({x1:point[0]+box.x,y1:point[1]+box.y,x2:point[0]+box.x+box.width,y2:point[1]+box.y+box.height},base.rings,E)});
    const font=document.querySelector('#map [data-v2-labels] text'),fontPx=()=>parseFloat(getComputedStyle(font).fontSize)*Math.hypot(font.getScreenCTM().a,font.getScreenCTM().b);
    const value={pref,code,name:region.fullName,componentCount:base.components.length,adapterPoint,actualPoint,fixedPoint:fixedResult.point,officeReason:fixedResult.officeReason,adapterQuality:quality(adapterPoint),fixedQuality:quality(fixedResult.point),adapterMedianMs:median(current),fixedWithModelMedianMs:median(fixed),screenFontAt1x:fontPx()};
    const marker=document.createElementNS('http://www.w3.org/2000/svg','g');marker.style.pointerEvents='none';
    for(const [point,color] of [[adapterPoint,'#174bff'],[fixedResult.point,'#159447']]){const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',point[0]);c.setAttribute('cy',point[1]);c.setAttribute('r','6');c.setAttribute('fill',color);marker.append(c);}document.querySelector('#map').append(marker);
    return value;
   },{pref,code});
   assert(result.adapterPoint.every(Number.isFinite)&&result.fixedPoint.every(Number.isFinite));
   assert(Math.hypot(result.adapterPoint[0]-result.actualPoint[0],result.adapterPoint[1]-result.actualPoint[1])<.02,'comparison projection matches actual page');
   if(process.env.KUSSOON_BROWSER_ARTIFACTS){await fs.mkdir(process.env.KUSSOON_BROWSER_ARTIFACTS,{recursive:true});await page.locator('#mapFrame').screenshot({path:path.join(process.env.KUSSOON_BROWSER_ARTIFACTS,'labels-'+code+'.png')});}
   for(let n=0;n<3;n++)await page.click('#mapZoomIn');
   result.screenFontAt5_832x=await page.locator('#map [data-v2-labels] text').first().evaluate(t=>parseFloat(getComputedStyle(t).fontSize)*Math.hypot(t.getScreenCTM().a,t.getScreenCTM().b));
   if(code==='28110'){
    const rows=()=>page.locator('#map [data-v2-labels] text').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,y:n.getAttribute('y')})));
    result.readingOffRows=await rows();await app.readings('on');result.readingOnRows=await rows();await app.readings('off');
   }
   for(let n=0;n<12;n++)await page.click('#mapZoomIn');
   result.actualMaximumZoom=await page.textContent('#zoomLevel');results.push(result);
  }
  const report={scope:'Seven selected real 2026 regions in desktop Chromium; readings OFF; equal current text box for anchor comparison; five in-process samples, no timing threshold; not whole-prefecture collision/readability or iPhone FPS testing',browser:app.browser.version(),results};
  if(process.env.KUSSOON_LABEL_REPORT){await fs.mkdir(path.dirname(process.env.KUSSOON_LABEL_REPORT),{recursive:true});await fs.writeFile(process.env.KUSSOON_LABEL_REPORT,JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify(report,null,2));assert.deepEqual(app.errors,[]);
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
