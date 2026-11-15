/* Kussoon V2 automatic multi-component town labels (comparison only).
 * No town names or hand-picked coordinates. Source SVG paths must use M/L/Z.
 * Geometric components are assessed independently of town quiz identity.
 */
(function(root){
 'use strict';
 function parse(d){
  if(!/^[\d\s.,+\-MLZ]+$/.test(d))throw Error('自動ラベル解析：未対応SVGコマンド');
  return d.match(/M[^M]+/g)?.map(part=>{
   const points=[...part.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m=>[+m[1],+m[2]]);
   if(points.length<3)return null;
   let cross=0,x=0,y=0;
   for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],v=a[0]*b[1]-b[0]*a[1];
    cross+=v;x+=(a[0]+b[0])*v;y+=(a[1]+b[1])*v;
   }
   if(Math.abs(cross)<.001)return null;
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
   return {points,area:cross/2,center:[x/(3*cross),y/(3*cross)],
    bbox:{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}};
  }).filter(Boolean)||[];
 }
 function contains(poly,p){
  let inside=false;
  const pts=poly.points;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
   const a=pts[i],b=pts[j];
   if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
 }
 function distToEdges(poly,p){
  let smallest=Infinity,pts=poly.points;
  for(let i=0;i<pts.length;i++){
   const a=pts[i],b=pts[(i+1)%pts.length],dx=b[0]-a[0],dy=b[1]-a[1],s=dx*dx+dy*dy;
   const t=s?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/s)):0;
   const dd=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;
   smallest=Math.min(smallest,dd);
  }
  return smallest;
 }
 function interior(poly,isFilled){
  const b=poly.bbox;
  const valid=p=>contains(poly,p)&&isFilled(p);
  let best=null,score=-1;
  const consider=p=>{
   if(!valid(p))return;
   const d=distToEdges(poly,p);
   if(d>score){best=p;score=d}
  };
  consider(poly.center);
  // Search on the polygon itself rather than the entire town bounding box.
  // The second pass refines the largest clear-space point for concave polygons.
  for(let pass=0;pass<2;pass++){
   const side=pass===0?16:8,spanX=pass===0?b.width:Math.max(b.width/8,1),
    spanY=pass===0?b.height:Math.max(b.height/8,1);
   const left=pass===0?b.x:(best?best[0]-spanX/2:b.x),top=pass===0?b.y:(best?best[1]-spanY/2:b.y);
   for(let yi=0;yi<=side;yi++)for(let xi=0;xi<=side;xi++)
    consider([left+spanX*(xi+.35)/(side+.7),top+spanY*(yi+.35)/(side+.7)]);
  }
  return best;
 }
 function candidates(d,isFilled,viewBoxArea){
  const rings=parse(d),threshold=Math.max(.03,viewBoxArea*0.000006);
  const outer=rings.filter(r=>r.area>threshold);
  // Counter-clockwise nested contours with negative winding are holes,
  // not town subareas. Positive town components remain independent.
  const result=[];
  for(let i=0;i<outer.length;i++){
   const r=outer[i];
   // Avoid treating a positive nested island within a larger positive region
   // as a separate component where the SVG fill is already continuous.
   const nested=outer.some((q,j)=>i!==j&&q.area>r.area&&contains(q,r.points[0]));
   if(nested)continue;
   const point=interior(r,isFilled);
   if(point)result.push({point,area:r.area,bbox:r.bbox});
  }
  // Preserve one label for tiny or unusual geometries too.
  if(!result.length){
   const all=rings.filter(r=>r.area>0).sort((a,b)=>b.area-a.area);
   for(const ring of all){const point=interior(ring,isFilled);if(point){result.push({point,area:ring.area,bbox:ring.bbox});break}}
  }
  // Small viable components first: the largest polygon may be mountain land,
  // but this is not a claim that small polygons contain residences.
  result.sort((a,b)=>a.area-b.area);
  return result;
 }
 root.KussoonAutoTownLabels=Object.freeze({parse,contains,candidates});
})(window);
