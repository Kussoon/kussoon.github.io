// Independent numerical audit of direct-link zoom and font scaling.
// Calculates Leaflet C fitBounds and SVG fitBounds for all 321 shapes.
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.env.SVG_ZOOM_OUTPUT||'svg-master-v4-zoom-report');
const viewportWidth=Number(process.env.SVG_ZOOM_WIDTH||1280),viewportHeight=Number(process.env.SVG_ZOOM_HEIGHT||800);
if(!(viewportWidth>=320&&viewportHeight>=500))throw Error('Invalid viewport dimensions');
fs.mkdirSync(out,{recursive:true});
const base=process.env.SVG_MASTER_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:viewportWidth,height:viewportHeight}});
  await page.goto(base+'/v2/nishinomiya-town-svg-master-v4-20261116-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:12000});
  }catch(e){
   console.error('V4_LOAD_DIAGNOSTIC',JSON.stringify({errors,status:await page.locator('#status').textContent().catch(()=>null),count:await page.locator('#communityCount').textContent().catch(()=>null)}));
   throw e;
  }
  await page.addScriptTag({url:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'});
  const report=await page.evaluate(async()=>{
   const raw=await(await fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')).json();
   const features=topojson.feature(raw,raw.objects.town).features,coll={type:'FeatureCollection',features};
   const rect=document.getElementById('map').getBoundingClientRect(),w=rect.width,h=rect.height;
   const proj=d3.geoMercator().fitExtent([[22,22],[w-22,h-22]],coll);
   const geoPath=d3.geoPath(proj);
   const host=document.createElement('div');host.style.cssText='position:absolute;left:-3000px;top:0;width:'+w+'px;height:'+h+'px';document.body.appendChild(host);
   const cMap=L.map(host,{zoomControl:false,attributionControl:false,minZoom:9,maxZoom:19,zoomSnap:.1,scrollWheelZoom:false});
   const all=L.geoJSON(coll).addTo(cMap);
   cMap.fitBounds(all.getBounds(),{padding:[22,22],animate:false});
   const initialC=cMap.getZoom();
   const maxClip=(x)=>Math.min(2,Math.max(.75,x));
   const getEnvelope=shapes=>{
    const env=[Infinity,Infinity,-Infinity,-Infinity];
    const visit=coords=>{
     if(!Array.isArray(coords))return;
     if(typeof coords[0]==='number'){
      env[0]=Math.min(env[0],coords[0]);env[1]=Math.min(env[1],coords[1]);
      env[2]=Math.max(env[2],coords[0]);env[3]=Math.max(env[3],coords[1]);
     }else for(const item of coords)visit(item);
    };
    for(const shape of shapes)visit(shape.geometry.coordinates);
    return env;
   };
   const mercatorY=lat=>Math.log(Math.tan(Math.PI/4+Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/360));
   const geographicZoom=(shapes,pad,maxZoom)=>{
    const envelope=getEnvelope(shapes);
    const geoW=256*(envelope[2]-envelope[0])/360;
    const geoH=256*(mercatorY(envelope[3])-mercatorY(envelope[1]))/(2*Math.PI);
    const z=Math.log2(Math.min((w-pad)/geoW,(h-pad)/geoH));
    return Math.max(9,Math.min(maxZoom,Math.floor((z+1e-9)*10)/10));
   };
   const computedCInitial=geographicZoom(features,44,19);
   if(Math.abs(computedCInitial-initialC)>0.000001)throw Error('Leaflet initial zoom mismatch: '+initialC+' vs '+computedCInitial);
   const rows=[];
   for(const f of features){
    const layer=L.geoJSON(f).getLayers()[0];const bounds=layer.getBounds();
    cMap.fitBounds(bounds,{padding:[50,50],maxZoom:15,animate:false});
    const cZoom=cMap.getZoom(),cScale=Math.pow(2,cZoom-initialC);
    const bb=geoPath.bounds(f);
    const fit=KussoonTownSvgViewport.fitBounds(bb,w,h,100,.6,40);
    if(!fit||!Number.isFinite(fit.scale))throw Error('invalid SVG fit '+f.properties.S_NAME);
    const cTargetFromGeography=geographicZoom([f],100,15);
    const sScale=Math.min(40,(256/(2*Math.PI))*Math.pow(2,cTargetFromGeography)/proj.scale());
    const cFont=8*maxClip(Math.pow(1.18,cZoom-initialC));
    const sFont=8*maxClip(Math.pow(1.18,cTargetFromGeography-computedCInitial));
    rows.push({town:f.properties.S_NAME,cZoom,sScale:+sScale.toFixed(3),cScale:+cScale.toFixed(3),
      scaleRatio:+(sScale*proj.scale()/((256/(2*Math.PI))*Math.pow(2,cZoom))).toFixed(3),cFont:+cFont.toFixed(3),sFont:+sFont.toFixed(3),
      fontDiff:+Math.abs(sFont-cFont).toFixed(3)});
   }
   cMap.remove();host.remove();
   const scale=[...rows].sort((a,b)=>Math.abs(Math.log2(b.scaleRatio))-Math.abs(Math.log2(a.scaleRatio)));
   const font=[...rows].sort((a,b)=>b.fontDiff-a.fontDiff);
   return{towns:rows.length,initialC,computedCInitial,canvas:[w,h],
    scaleRatio:{min:Math.min(...rows.map(x=>x.scaleRatio)),max:Math.max(...rows.map(x=>x.scaleRatio)),
      above125:rows.filter(x=>x.scaleRatio>1.25).length,below08:rows.filter(x=>x.scaleRatio<.8).length},
    font:{maxDiff:font[0].fontDiff,aboveOne:rows.filter(x=>x.fontDiff>1).length},
    topScale:scale.slice(0,20),topFont:font.slice(0,20),rows};
  });
  assert.equal(report.towns,321);
  fs.writeFileSync(path.join(out,'zoom-font-321-'+viewportWidth+'.json'),JSON.stringify(report,null,2));
  console.log('C_vs_SVG_ZOOM_FONT '+JSON.stringify({viewportWidth,initialC:report.initialC,computedCInitial:report.computedCInitial,scaleRatio:report.scaleRatio,font:report.font,topScale:report.topScale.slice(0,8),topFont:report.topFont.slice(0,8)}));
  assert(report.scaleRatio.min>=.99&&report.scaleRatio.max<=1.01,'V4 geographic rendered zoom differs by more than 1% from C baseline');
  assert(report.font.maxDiff<=.005,'V4 town-link label fonts must match C baseline to 0.005px');

 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
