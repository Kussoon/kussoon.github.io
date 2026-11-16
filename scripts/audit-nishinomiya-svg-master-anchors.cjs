// Geometry report: C Leaflet Polygon.getCenter vs current SVG geoPath.centroid.
// This is not a substitute for the 321-label visual acceptance review.
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const out=path.resolve(process.env.SVG_ANCHOR_OUTPUT||'svg-master-v2-geometry');
fs.mkdirSync(out,{recursive:true});
const base=process.env.SVG_MASTER_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/v2/nishinomiya-town-svg-master-v2-20261116-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
  await page.addScriptTag({url:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'});
  const report=await page.evaluate(async()=>{
   const topology=await(await fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')).json();
   const features=topojson.feature(topology,topology.objects.town).features;
   const mapRect=document.getElementById('map').getBoundingClientRect();
   const projection=d3.geoMercator().fitExtent([[22,22],[mapRect.width-22,mapRect.height-22]],{type:'FeatureCollection',features});
   const d3Path=d3.geoPath(projection);
   const scratch=document.createElement('div');
   scratch.style.cssText='position:absolute;left:-3000px;top:0;width:1000px;height:700px';
   document.body.appendChild(scratch);
   const lmap=L.map(scratch,{zoomControl:false,attributionControl:false}).setView([34.76,135.34],12);
   const firstRingCenter=feature=>{
    const g=feature.geometry;
    const ring=g.type==='Polygon'?g.coordinates[0]:g.type==='MultiPolygon'?g.coordinates[0][0]:null;
    if(!ring||ring.length<3)return d3Path.centroid(feature);
    const points=ring.map(x=>projection(x));
    let a=0,cx=0,cy=0;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
     const p=points[j],q=points[i],cross=p[0]*q[1]-q[0]*p[1];
     a+=cross;cx+=(p[0]+q[0])*cross;cy+=(p[1]+q[1])*cross;
    }
    if(Math.abs(a)<1e-10)return points[0];
    return [cx/(3*a),cy/(3*a)];
   };
   const diffs=[];
   for(const f of features){
    const geo=L.geoJSON(f).addTo(lmap);
    const layer=geo.getLayers()[0];
    if(!layer||typeof layer.getCenter!=='function')throw Error('No C center for '+f.properties.S_NAME);
    const ll=layer.getCenter();
    const pointC=projection([ll.lng,ll.lat]);
    const pointSVG=d3Path.centroid(f),pointCStyle=firstRingCenter(f);
    if([...pointC,...pointSVG,...pointCStyle].some(v=>!Number.isFinite(v)))throw Error('Nonfinite label: '+f.properties.S_NAME);
    const dx=pointSVG[0]-pointC[0],dy=pointSVG[1]-pointC[1];
    diffs.push({town:f.properties.S_NAME,dx:+dx.toFixed(3),dy:+dy.toFixed(3),
      px:+Math.hypot(dx,dy).toFixed(3),cStylePx:+Math.hypot(pointCStyle[0]-pointC[0],pointCStyle[1]-pointC[1]).toFixed(3)});
    lmap.removeLayer(geo);
   }
   lmap.remove();scratch.remove();
   const ordered=[...diffs].sort((a,b)=>b.px-a.px);
   return {towns:diffs.length,canvas:[mapRect.width,mapRect.height],
    counts:{gt1:diffs.filter(v=>v.px>1).length,gt5:diffs.filter(v=>v.px>5).length,
      gt15:diffs.filter(v=>v.px>15).length,gt30:diffs.filter(v=>v.px>30).length},
    maximumPx:ordered[0]?.px,
    meanPx:+(diffs.reduce((t,v)=>t+v.px,0)/diffs.length).toFixed(3),
    cStyleMaxPx:+Math.max(...diffs.map(v=>v.cStylePx)).toFixed(3),
    cStyleMeanPx:+(diffs.reduce((t,v)=>t+v.cStylePx,0)/diffs.length).toFixed(3),
    top25:ordered.slice(0,25),rows:diffs};
  });
  assert.equal(report.towns,321);
  fs.writeFileSync(path.join(out,'anchors-c-vs-svg.json'),JSON.stringify(report,null,2));
  console.log('C_vs_SVG_ANCHOR_REPORT '+JSON.stringify({towns:report.towns,counts:report.counts,max:report.maximumPx,mean:report.meanPx,cStyleMax:report.cStyleMaxPx,cStyleMean:report.cStyleMeanPx,top10:report.top25.slice(0,10)}));
  await page.screenshot({path:path.join(out,'master-v2-default-svg.png'),fullPage:true});
  await page.evaluate(()=>document.getElementById('anchorMode').click());
  await page.screenshot({path:path.join(out,'master-v2-leaflet-like-mode.png'),fullPage:true});
  await page.goto(base+'/v2/nishinomiya-town-study-c.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('321町名'),null,{timeout:60000});
  await page.screenshot({path:path.join(out,'leaflet-c-baseline.png'),fullPage:true});
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
