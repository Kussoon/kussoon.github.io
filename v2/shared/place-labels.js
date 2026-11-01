/* Kussoon V2 — fast and reusable Japanese place labels and name matching.
 * No assumptions about furigana: callers provide a verified reading when known.
 */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg';
const normalize=value=>String(value||'').normalize('NFKC').replace(/[\s　]+/g,'').toLocaleLowerCase('ja-JP');
function matches(record,query){
 const q=normalize(query);
 return !q||[record.name,record.reading,record.code].some(s=>normalize(s).includes(q));
}
// Use the largest land polygon. Its bounding-box centre alone can land outside
// a crescent, L-shaped territory or island, so search for a point IN the land.
// The scan favours central positions and adequate whitespace, without forcing
// labels wholly inside small / narrow municipalities.
const anchorCache=new WeakMap();
function ringContains(point,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j],intersects=(a[1]>point[1])!==(b[1]>point[1])&&
    point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0];
  if(intersects)inside=!inside;
 }
 return inside;
}
function insidePolygon(point,polygon){
 if(!polygon[0]||!ringContains(point,polygon[0]))return false;
 for(let i=1;i<polygon.length;i++)if(ringContains(point,polygon[i]))return false;
 return true;
}
function ringArea(ring){
 let twice=0;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length];
  twice+=a[0]*b[1]-b[0]*a[1];
 }
 return Math.abs(twice)/2;
}
function minEdgeDistance(point,ring,cos){
 let best=Infinity;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length];
  const x=(point[0]-a[0])*cos,y=point[1]-a[1];
  const dx=(b[0]-a[0])*cos,dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,(x*dx+y*dy)/length)):0;
  const d=Math.hypot(x-t*dx,y-t*dy);
  if(d<best)best=d;
 }
 return best;
}
function anchor(polys){
 if(!Array.isArray(polys)||!polys.length)return null;
 if(anchorCache.has(polys))return anchorCache.get(polys);
 let largest=null,area=-1;
 for(const polygon of polys){
  const ring=polygon[0]||[];
  if(ring.length<3)continue;
  const size=ringArea(ring);
  if(size>area){largest=polygon;area=size;}
 }
 if(!largest)return null;
 const ring=largest[0];
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const [x,y] of ring){
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);
  minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 }
 const center=[(minX+maxX)/2,(minY+maxY)/2];
 if(!Number.isFinite(center[0])||!Number.isFinite(center[1]))return null;
 if(insidePolygon(center,largest)){anchorCache.set(polys,center);return center;}
 const w=maxX-minX,h=maxY-minY,cos=Math.cos(center[1]*Math.PI/180);
 let best=null,bestScore=-Infinity;
 // 9×9 grid with inset points; don't hide names just because a municipal
 // polygon is thin. Positions stay central rather than at the perimeter.
 for(let ix=0;ix<9;ix++)for(let iy=0;iy<9;iy++){
  const p=[minX+(ix+.5)/9*w,minY+(iy+.5)/9*h];
  if(!insidePolygon(p,largest))continue;
  const clearance=Math.min(...largest.map(r=>minEdgeDistance(p,r,cos)));
  const centrality=Math.hypot((p[0]-center[0])*cos,p[1]-center[1]);
  const score=clearance-.18*centrality;
  if(score>bestScore){best=p;bestScore=score;}
 }
 // Even a very thin strip must get a label; use polygon's first valid vertex
 // rather than put the label blindly into a neighboring municipality.
 const result=best||ring[0].slice(0,2);
 anchorCache.set(polys,result);
 return result;
}
function show(options){
 const {svg,regions,project,selected='',all=false,readings=false}=options||{};
 if(!svg||!Array.isArray(regions)||typeof project!=='function')throw Error('Invalid label options');
 const existing=svg.querySelector('[data-v2-labels]');
 if(existing)existing.remove();
 const layer=document.createElementNS(NS,'g');
 layer.setAttribute('data-v2-labels','');
 layer.setAttribute('pointer-events','none');
 let count=0;
 for(const region of regions){
  if(!all&&region.code!==selected)continue;
  const pt=anchor(region.polys);
  if(!pt)continue;
  const [x,y]=project(pt);
  if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  const group=document.createElementNS(NS,'g');
  group.setAttribute('transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+')');
  const title=document.createElementNS(NS,'text');
  title.setAttribute('text-anchor','middle');
  title.setAttribute('paint-order','stroke');
  title.setAttribute('stroke','#fff');
  title.setAttribute('stroke-width',region.code===selected?'4':'3');
  title.setAttribute('stroke-linejoin','round');
  title.setAttribute('fill','#173b56');
  title.setAttribute('font-size',region.code===selected?'18':'14');
  title.setAttribute('font-weight',region.code===selected?'700':'600');
  title.setAttribute('y',readings&&region.reading?'-5':'5');
  title.textContent=region.name;
  group.append(title);
  if(readings&&region.reading){
   const sub=document.createElementNS(NS,'text');
   sub.setAttribute('text-anchor','middle');
   sub.setAttribute('paint-order','stroke');
   sub.setAttribute('stroke','#fff');
   sub.setAttribute('stroke-width','3');
   sub.setAttribute('fill','#173b56');
   sub.setAttribute('font-size','11');
   sub.setAttribute('y','12');
   sub.textContent=region.reading;
   group.append(sub);
  }
  layer.append(group);count++;
 }
 svg.append(layer);
 return count;
}
global.KussoonV2PlaceLabels=Object.freeze({normalize,matches,anchor,show});
})(window);
