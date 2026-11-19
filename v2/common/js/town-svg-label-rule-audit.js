/* TOWNMAP-SSOT-001 R-TOWN-11/13/14/40/44
 * READ-ONLY national town-label placement audit. No display, quiz or data
 * mutation; all dimensions are in one normalized D3 projection frame.
 * Existing approved label coordinates are evidence, not a training oracle:
 * this report proposes no new rule/threshold without user acceptance.
 */
(function(root){
 'use strict';
 const round=(x,d=3)=>Number(x.toFixed(d));
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const dist2=(a,b)=>distance(a,b)**2;
 function signedArea(ring){
  let area=0;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++)
   area+=ring[j][0]*ring[i][1]-ring[i][0]*ring[j][1];
  return area/2;
 }
 function perimeter(ring){
  let sum=0;
  for(let i=1;i<ring.length;i++)sum+=distance(ring[i-1],ring[i]);
  if(ring.length>1)sum+=distance(ring.at(-1),ring[0]);
  return sum;
 }
 function bboxOf(points){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return {x:Math.min(...xs),y:Math.min(...ys),
   width:Math.max(...xs)-Math.min(...xs),
   height:Math.max(...ys)-Math.min(...ys)};
 }
 function partsOf(geometry){
  if(geometry?.type==='Polygon')return [geometry.coordinates];
  if(geometry?.type==='MultiPolygon')return geometry.coordinates;
  throw new Error('Polygon/MultiPolygon以外は解析できません');
 }
 function compare({features,projection,approved,componentEngine,approvedAnchor,
                   viewBoxArea=720000}={}){
  if(!Array.isArray(features)||features.length===0||
   typeof projection!=='function'||!approved||
   typeof componentEngine?.candidates!=='function'||
   typeof componentEngine?.insideRing!=='function'||
   typeof approvedAnchor?.projectedFirstRing!=='function'||
   !Number.isFinite(viewBoxArea)||viewBoxArea<=0)
   throw new TypeError('町域・確定アンカー・共通候補生成器が必要です');
  const names=new Set(),rows=[];
  for(const feature of features){
   const name=feature?.properties?.S_NAME,geometry=feature?.geometry;
   if(typeof name!=='string'||!name||names.has(name))
    throw new Error('町名が不正または重複しています');
   names.add(name);
   const parts=partsOf(geometry),rings=parts.map(part=>
    part.map(ring=>ring.map(point=>projection(point))));
   const componentAreas=rings.map(part=>Math.abs(signedArea(part[0]))-
    part.slice(1).reduce((v,r)=>v+Math.abs(signedArea(r)),0));
   if(componentAreas.some(v=>!(v>0)))throw new Error('町域面積が不正です: '+name);
   const totalArea=componentAreas.reduce((a,b)=>a+b,0);
   const allPoints=rings.flat(2),bbox=bboxOf(allPoints);
   const boundary=rings.reduce((s,part)=>s+part.reduce((n,ring)=>n+perimeter(ring),0),0);
   const holes=parts.reduce((n,p)=>n+p.length-1,0);
   const candidates=componentEngine.candidates({geometry,projection,viewBoxArea,
    minimumAreaFraction:0});
   const acceptedCoordinate=(latlon)=>projection([latlon[1],latlon[0]]);
   const multi=approved.multiLabels?.[name];
   const extras=approved.extraLabels?.[name]||[];
   const offsets=approved.labelOffsets?.[name]||[0,0];
   const defaultAnchor=approvedAnchor.projectedFirstRing(feature,projection,()=>[NaN,NaN]);
   const acceptedPoints=multi
    ?multi.map(acceptedCoordinate)
    :[defaultAnchor,...extras.map(acceptedCoordinate)];
   if(acceptedPoints.some(p=>p.length!==2||!p.every(Number.isFinite)))
    throw new Error('確定ラベルの投影位置が不正です: '+name);
   const placementStatus=acceptedPoints.map(point=>{
    const partIndex=rings.findIndex(part=>
     componentEngine.insideRing(point,part[0])&&
     !part.slice(1).some(h=>componentEngine.insideRing(point,h)));
    const nearest=candidates.reduce((best,c)=>{
     const d=distance(point,c.point);
     return d<best.distance?{component:c.component,distance:d}:best;
    },{component:-1,distance:Infinity});
    return {inside:partIndex>=0,part:partIndex,nearestComponent:nearest.component,
     nearestDistance:round(nearest.distance),point:point.map(v=>round(v)),
     kind:multi?'explicit-multi':point===defaultAnchor?'centroid':'additional'};
   });
   const maxA=Math.max(...componentAreas);
   const minorAreaRatio=parts.length>1?round((totalArea-maxA)/totalArea,6):0;
   const compactness=4*Math.PI*totalArea/(boundary**2);
   rows.push({
    name,parts:parts.length,holes,area:round(totalArea),perimeter:round(boundary),
    bboxWidth:round(bbox.width),bboxHeight:round(bbox.height),
    longestSide:round(Math.max(bbox.width,bbox.height)),
    bboxAspect:round(Math.max(bbox.width,bbox.height)/
     Math.max(.000001,Math.min(bbox.width,bbox.height))),
    compactness:round(compactness,5),minorAreaRatio,
    acceptedCount:acceptedPoints.length,automaticCount:candidates.length,
    countDifference:candidates.length-acceptedPoints.length,
    offset:offsets,acceptedPoints:placementStatus,
    automaticCandidates:candidates.map(c=>({part:c.component,
     area:round(c.area),clearance:round(c.clearance),point:c.point.map(v=>round(v))})),
    maximumAnchorDeviation:round(Math.max(...placementStatus.map(p=>p.nearestDistance)))
   });
  }
  const acceptedTotal=rows.reduce((n,r)=>n+r.acceptedCount,0);
  const autoTotal=rows.reduce((n,r)=>n+r.automaticCount,0);
  const difference=rows.filter(r=>r.countDifference!==0);
  const outside=rows.filter(r=>r.acceptedPoints.some(p=>!p.inside));
  const sorted=[...rows].sort((a,b)=>
   Number(b.countDifference!==0)-Number(a.countDifference!==0)||
   b.maximumAnchorDeviation-a.maximumAnchorDeviation);
  return {summary:{
   towns:rows.length,approvedLabels:acceptedTotal,automaticLabels:autoTotal,
   mismatchTowns:difference.length,missingComparedToApproved:difference
    .reduce((n,r)=>n+Math.max(0,-r.countDifference),0),
   additionalComparedToApproved:difference
    .reduce((n,r)=>n+Math.max(0,r.countDifference),0),
   disjoint:rows.filter(r=>r.parts>1).length,
   withHoles:rows.filter(r=>r.holes>0).length,
   approvedOutsideSource:outside.length
  },rows:sorted};
 }
 const api=Object.freeze({compare});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownLabelRuleAudit=api;
})(typeof globalThis!=='undefined'?globalThis:this);
