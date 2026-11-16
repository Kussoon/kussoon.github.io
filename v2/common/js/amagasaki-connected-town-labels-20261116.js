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
 const candidateList=auto.candidates(d,filled,viewArea);
 return groups.map(group=>{
  const largest=[...group].sort((a,b)=>Math.abs(b.area)-Math.abs(a.area))[0];
  const own=candidateList.filter(c=>group.some(r=>auto.contains(r,c.point)));
  let best=own.sort((a,b)=>b.area-a.area)[0];
  if(!best){
   const b=largest.bbox;
   const pos=[[b.x+b.width/2,b.y+b.height/2]];
   for(let y=1;y<=24;y++)for(let x=1;x<=24;x++)
    pos.push([b.x+b.width*x/25,b.y+b.height*y/25]);
   const point=pos.find(p=>auto.contains(largest,p)&&filled(p));
   if(!point)throw Error('町域内の代表点が見つかりません');
   best={point,area:Math.abs(largest.area),bbox:b};
  }
  return {point:best.point,area:group.reduce((sum,r)=>sum+Math.abs(r.area),0),bbox:largest.bbox};
 });
}
root.KussoonConnectedTownLabels=Object.freeze({components,representative});
})(window);
