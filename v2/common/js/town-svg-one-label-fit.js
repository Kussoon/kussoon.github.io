/* TOWNMAP-SSOT-001 R-TOWN-06/11/13/14
 * Comparison-only, geography-first SINGLE label placement.
 * A municipality's seat / office is NOT an input. For multipart geography,
 * choose the largest polygon that can contain the whole label; failing that,
 * choose the best legal-center fallback. All polygons remain interactive.
 * SVG geometry must be projected into the same coordinate system as the text.
 */
(function(root){
 'use strict';
 const ok=p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite);
 const box=(rings)=>{
  const pts=rings[0];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const p of pts){minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);
   maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);}
  return {x:minX,y:minY,width:maxX-minX,height:maxY-minY};
 };
 const within=(point,rings,inside)=>inside(point,rings[0])&&
  !rings.slice(1).some(r=>inside(point,r));
 function segmentCross(a,b,c,d){
  const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const x1=cross(a,b,c),x2=cross(a,b,d),x3=cross(c,d,a),x4=cross(c,d,b);
  // Reject touching as well as true intersections: text needs a margin.
  const eps=1e-9;
  const on=(p,q,r)=>Math.abs(cross(p,q,r))<=eps&&
   r[0]>=Math.min(p[0],q[0])-eps&&r[0]<=Math.max(p[0],q[0])+eps&&
   r[1]>=Math.min(p[1],q[1])-eps&&r[1]<=Math.max(p[1],q[1])+eps;
  if(on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return true;
  return (x1>0)!==(x2>0)&&(x3>0)!==(x4>0);
 }
 function fits(point,rings,width,height,padding,inside){
  if(!(width>0&&height>0)||!(padding>=0))throw new RangeError('文字幅・高さ・余白が必要です');
  const halfW=width/2+padding,halfH=height/2+padding;
  const x0=point[0]-halfW,y0=point[1]-halfH,x1=point[0]+halfW,y1=point[1]+halfH;
  const corners=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  if(!corners.every(p=>within(p,rings,inside)))return false;
  // Four contained corners alone are not enough for concave polygons and
  // holes fully contained inside the text rectangle.
  const edges=[[corners[0],corners[1]],[corners[1],corners[2]],
   [corners[2],corners[3]],[corners[3],corners[0]]];
  for(const ring of rings){
   for(let i=0;i<ring.length-1;i++){
    const a=ring[i],b=ring[i+1];
    // A hole that is entirely inside the text rectangle is invalid too.
    if(a[0]>=x0&&a[0]<=x1&&a[1]>=y0&&a[1]<=y1)return false;
    if(edges.some(e=>segmentCross(a,b,e[0],e[1])))return false;
   }
  }
  return true;
 }
 function signedArea(r){
  let s=0;for(let i=0,j=r.length-1;i<r.length;j=i++)
   s+=r[j][0]*r[i][1]-r[i][0]*r[j][1];
  return s/2;
 }
 function areaOf(rings){return Math.abs(signedArea(rings[0]))-
  rings.slice(1).reduce((s,r)=>s+Math.abs(signedArea(r)),0);}
 function place({geometry,projection=p=>p,width,height,padding=.7,
                 componentEngine=root.KussoonTownGeojsonComponentLabels,
                 viewBoxArea=720000,grid=15}={}){
  if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type)||typeof projection!=='function'||
    !Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0||
    !Number.isFinite(padding)||padding<0||!Number.isInteger(grid)||grid<3||grid>35||
    !componentEngine?.candidates||!componentEngine?.insideRing)
   throw new TypeError('町域・文字寸法・投影・候補生成器が必要です');
  const raw=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  const parts=raw.map(part=>part.map(r=>r.map(p=>{
   const value=projection(p);
   if(!ok(value))throw new Error('投影点が不正です');
   return [value[0],value[1]];
  })));
  const candidates=componentEngine.candidates({geometry,projection,viewBoxArea,
   minimumAreaFraction:0});
  const byPart=new Map(candidates.map(x=>[x.component,x]));
  let bestFit=null,bestFallback=null;
  const inside=componentEngine.insideRing;
  for(let i=0;i<parts.length;i++){
   const rings=parts[i],b=box(rings),area=areaOf(rings);
   const base=byPart.get(i);
   if(!base)throw Error('有効なラベル中心候補がありません');
   const sample=(point)=>{
    if(!within(point,rings,inside))return;
    const full=fits(point,rings,width,height,padding,inside);
    // Fallback: number of samples across glyph bounds contained in area;
    // this does not claim a whole-label fit.
    const fractions=[-.5,0,.5];
    let covered=0;
    for(const dx of fractions)for(const dy of fractions){
     if(within([point[0]+dx*width,point[1]+dy*height],rings,inside))covered++;
    }
    const entry={point,component:i,area,fullFit:full,coveredSamples:covered,
     clearance:base.clearance};
    if(full){
     // Largest admissible component wins (not the mainland or town hall).
     if(!bestFit||area>bestFit.area||
      (area===bestFit.area&&entry.component<bestFit.component))bestFit=entry;
    }else if(!bestFallback||
      covered>bestFallback.coveredSamples||
      (covered===bestFallback.coveredSamples&&
       (area>bestFallback.area||(area===bestFallback.area&&i<bestFallback.component)))){
     bestFallback=entry;
    }
   };
   sample(base.point);
   // Test candidate centers in a regular grid and a staggered one for
   // narrow/concave corridors. No municipality-specific coordinates.
   for(let iy=0;iy<grid;iy++)for(let ix=0;ix<grid;ix++){
    const shift=iy%2?.27:0;
    const x=b.x+b.width*(ix+.5+shift)/grid,y=b.y+b.height*(iy+.5)/grid;
    sample([x,y]);
   }
  }
  const chosen=bestFit||bestFallback;
  if(!chosen)throw Error('ラベルを配置できる区域がありません');
  return Object.freeze({
   point:Object.freeze([...chosen.point]),component:chosen.component,
   area:chosen.area,wholeLabelFits:chosen.fullFit,
   coveredSamples:chosen.coveredSamples,parts:parts.length,
   reason:chosen.fullFit?'whole-label-inside-largest-fitting-component':
     'center-inside-best-coverage-fallback'
  });
 }
 const api=Object.freeze({place,fits});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownOneLabelFit=api;
})(typeof globalThis!=='undefined'?globalThis:this);
