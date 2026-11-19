/* TOWNMAP-SSOT-001 R-TOWN-00/06/11/13/14/40/44
 * Topology-aware, municipality-neutral candidate labels. An opt-in tool for
 * validating disconnected town geometry before replacing any approved page.
 *
 * GeoJSON Polygon = one exterior + zero or more holes; MultiPolygon = separate
 * exterior components. A hole is NEVER a label component, regardless of SVG
 * ring winding or source coordinate orientation. Candidate coordinates are
 * deterministic and are checked against exterior and ALL holes.
 */
(function(root){
 'use strict';
 const finitePoint=p=>Array.isArray(p)&&p.length>=2&&
   Number.isFinite(p[0])&&Number.isFinite(p[1]);
 function insideRing(p,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[i],b=ring[j];
   // Points exactly on a boundary are excluded; labels require interior.
   const cross=(p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]);
   if(Math.abs(cross)<1e-8&&p[0]>=Math.min(a[0],b[0])-1e-8&&
    p[0]<=Math.max(a[0],b[0])+1e-8&&
    p[1]>=Math.min(a[1],b[1])-1e-8&&p[1]<=Math.max(a[1],b[1])+1e-8)
    return false;
   if((a[1]>p[1])!==(b[1]>p[1])&&
      p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
 }
 function signedArea(ring){
  let a=0;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   a+=ring[j][0]*ring[i][1]-ring[i][0]*ring[j][1];
  }
  return a/2;
 }
 function bbox(ring){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const p of ring){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);
   y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])}
  return {x:x0,y:y0,width:x1-x0,height:y1-y0};
 }
 function edgeDistanceSquared(p,ring){
  let best=Infinity;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[i],b=ring[j],dx=b[0]-a[0],dy=b[1]-a[1];
   const dot=dx*dx+dy*dy,t=dot?Math.max(0,Math.min(1,
    ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/dot)):0;
   best=Math.min(best,(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2);
  }
  return best;
 }
 function centerOfRing(ring){
  let a2=0,cx=0,cy=0;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[j],b=ring[i],cross=a[0]*b[1]-b[0]*a[1];
   a2+=cross;cx+=(a[0]+b[0])*cross;cy+=(a[1]+b[1])*cross;
  }
  if(Math.abs(a2)<1e-12)return null;
  return [cx/(3*a2),cy/(3*a2)];
 }
 function candidateFor(rings){
  const outer=rings[0],holes=rings.slice(1),box=bbox(outer);
  const valid=p=>insideRing(p,outer)&&!holes.some(h=>insideRing(p,h));
  let best=null,score=-Infinity;
  const consider=p=>{
   if(!finitePoint(p)||!valid(p))return;
   const q=Math.min(edgeDistanceSquared(p,outer),
     ...holes.map(h=>edgeDistanceSquared(p,h)));
   if(q>score){best=p;score=q}
  };
  const centroid=centerOfRing(outer);
  consider(centroid);
  // A deterministic coarse + refinement grid balances placement with
  // nationwide performance; no town-specific hand-picked coordinates.
  for(let pass=0;pass<2;pass++){
   const cols=pass?11:19,spanX=pass?Math.max(box.width/5,1e-6):box.width,
    spanY=pass?Math.max(box.height/5,1e-6):box.height;
   const left=pass&&best?best[0]-spanX/2:box.x;
   const top=pass&&best?best[1]-spanY/2:box.y;
   for(let j=0;j<cols;j++)for(let i=0;i<cols;i++)
    consider([left+spanX*(i+.5)/cols,top+spanY*(j+.5)/cols]);
  }
  if(!best){
   // Extremely thin or oblique parts can fall between grid samples.
   // Probe points between adjacent vertices and a third exterior vertex.
   for(let i=0;i<outer.length-2;i++){
    const a=outer[i],b=outer[i+1],c=outer[i+2];
    consider([(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3]);
   }
  }
  return best?{point:best,clearance:Math.sqrt(Math.max(0,score)),bbox:box}:null;
 }
 function candidates({geometry,projection=p=>p,viewBoxArea,
     minimumAreaFraction=.000006,minArea=0}={}){
  if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type)||
    typeof projection!=='function'||
    !Number.isFinite(viewBoxArea)||viewBoxArea<=0||
    !Number.isFinite(minimumAreaFraction)||minimumAreaFraction<0||
    !Number.isFinite(minArea)||minArea<0)
   throw new TypeError('多角形町域・投影・地図の面積が必要です');
  const components=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  if(!Array.isArray(components)||!components.length)
   throw new Error('町域の外周形状がありません');
  const ranked=[];
  for(let i=0;i<components.length;i++){
   const part=components[i];
   if(!Array.isArray(part)||!part.length)throw Error('町域リングが不正です');
   const rings=part.map(r=>{
    if(!Array.isArray(r)||r.length<4||!r.every(finitePoint))
     throw Error('投影前の町域座標が不正です');
    const pts=r.map(p=>projection(p));
    if(!pts.every(finitePoint))throw Error('投影済み町域座標が不正です');
    return pts;
   });
   const area=Math.abs(signedArea(rings[0]))-
     rings.slice(1).reduce((n,r)=>n+Math.abs(signedArea(r)),0);
   if(!(area>0))throw Error('町域の穴が外周を超えています');
   const placement=candidateFor(rings);
   if(!placement)throw Error('町域内部に表示位置を見つけられません');
   ranked.push({component:i,area,point:placement.point,
    clearance:placement.clearance,bbox:placement.bbox});
  }
  // Preserve each disconnected polygon at the geometry level. A controlled
  // minimum threshold may omit tiny islands from DISPLAY only; input remains.
  const threshold=Math.max(minArea,viewBoxArea*minimumAreaFraction);
  const selected=ranked.filter(r=>r.area>=threshold);
  if(!selected.length)selected.push([...ranked].sort((a,b)=>b.area-a.area)[0]);
  selected.sort((a,b)=>a.area-b.area||a.component-b.component);
  return Object.freeze(selected.map(x=>Object.freeze({
   component:x.component,area:x.area,point:Object.freeze([...x.point]),
   clearance:x.clearance,bbox:Object.freeze({...x.bbox})
  })));
 }
 const api=Object.freeze({candidates,insideRing});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownGeojsonComponentLabels=api;
})(typeof globalThis!=='undefined'?globalThis:this);
