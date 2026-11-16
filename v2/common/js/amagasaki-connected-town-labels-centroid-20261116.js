/* Amagasaki V2: derive connected town components from SVG edges.
 * Adjacent chome polygons share a boundary segment and form ONE town.
 * Negative-winding SVG contours are cut-outs, never independent towns.
 * No town-name-specific coordinates or hardcoded exceptions.
 */
(function(root){'use strict';
function components(d,auto){
 const rings=auto.parse(d);
 const positive=rings.filter(r=>r.area>0);
 // Some source polygons consist solely of reverse-winding contours.
 // In that case treat the largest exterior contour as the filled region.
 const valid=(positive.length?positive:rings).map((r,i)=>({...r,index:i}));
 if(!valid.length)throw Error('町域の正面積がありません');
 const parent=valid.map((_,i)=>i);
 const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
 const owners=new Map();
 valid.forEach((r,i)=>{
  const points=r.points;
  for(let j=0;j<points.length;j++){
   const a=points[j],b=points[(j+1)%points.length];
   const u=a.join(','),v=b.join(',');
   if(u===v)continue;
   const key=u<v?u+'|'+v:v+'|'+u;
   if(owners.has(key))parent[find(i)]=find(owners.get(key));
   else owners.set(key,i);
  }
 });
 const groups=new Map();
 valid.forEach((r,i)=>{
  const k=find(i);
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(r);
 });
 return [...groups.values()].sort((a,b)=>{
  const area=x=>x.reduce((sum,r)=>sum+Math.abs(r.area),0);
  return area(b)-area(a);
 });
}
function representative(d,auto,filled,viewArea){
 const groups=components(d,auto);
 return groups.map(group=>{
  const areas=group.map(r=>Math.abs(r.area));
  const total=areas.reduce((a,b)=>a+b,0);
  // Use the area-weighted centre of the WHOLE connected town, not its
  // largest chome polygon.  This avoids labels at the south/north edge.
  const center=[
   group.reduce((s,r,i)=>s+r.center[0]*areas[i],0)/total,
   group.reduce((s,r,i)=>s+r.center[1]*areas[i],0)/total
  ];
  const minX=Math.min(...group.map(r=>r.bbox.x)),
   minY=Math.min(...group.map(r=>r.bbox.y)),
   maxX=Math.max(...group.map(r=>r.bbox.x+r.bbox.width)),
   maxY=Math.max(...group.map(r=>r.bbox.y+r.bbox.height));
  const bbox={x:minX,y:minY,width:maxX-minX,height:maxY-minY};
  const isInside=p=>group.some(r=>auto.contains(r,p))&&filled(p);
  let chosen=isInside(center)?center:null;
  if(!chosen){
   // Search across the combined town extent, never only one chome.
   // Pick the valid point closest to its area-weighted centre.
   const options=[];
   for(const ring of group)if(isInside(ring.center))options.push(ring.center);
   for(let y=1;y<=48;y++)for(let x=1;x<=48;x++){
    const p=[minX+(maxX-minX)*x/49,minY+(maxY-minY)*y/49];
    if(isInside(p))options.push(p);
   }
   options.sort((a,b)=>(a[0]-center[0])**2+(a[1]-center[1])**2-
                      ((b[0]-center[0])**2+(b[1]-center[1])**2));
   chosen=options[0];
  }
  if(!chosen)throw Error('町全体の内部に代表点が見つかりません');
  return {point:chosen,area:total,bbox};
 });
}
root.KussoonConnectedTownLabels=Object.freeze({components,representative});
})(window);
