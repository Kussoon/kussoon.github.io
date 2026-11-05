/* Protect the existence of narrow municipalities, detached islands and holes
 * during nationwide TopoJSON weight-threshold simplification.
 * This DOES NOT validate area, legal boundaries or visual shape fidelity.
 */
function eachRing(topo,visitor){
 const walk=g=>{
  if(g.type==='Polygon')for(const r of g.arcs)visitor(r);
  else if(g.type==='MultiPolygon')for(const p of g.arcs)for(const r of p)visitor(r);
  else if(g.type==='GeometryCollection')for(const child of g.geometries)walk(child);
 };
 for(const obj of Object.values(topo.objects))walk(obj);
}
function indexOf(id){return id<0?~id:id;}
function pointsOfRing(topology,ring){
 const points=[];
 for(const [i,id] of ring.entries()){
  const src=topology.arcs[indexOf(id)],inverse=id<0;
  for(let j=0;j<src.length;j++){
   if(i>0&&j===0)continue; // shared arc endpoints appear once in the ring
   points.push(src[inverse?src.length-1-j:j]);
  }
 }
 return points;
}
export function protectRings(weighted,threshold){
 if(!Number.isFinite(threshold)||threshold<0)throw Error('Invalid threshold');
 const stats={rings:0,protectedRings:0,extraVertices:0,unrepairableRings:0};
 eachRing(weighted,ring=>{
  stats.rings++;
  const points=pointsOfRing(weighted,ring),kept=new Set();
  for(const p of points)if(p[2]>=threshold)kept.add(p[0]+','+p[1]);
  if(kept.size>=3)return;
  const remaining=new Map();
  for(const p of points){
   const key=p[0]+','+p[1];
   if(kept.has(key)||!(p[2]<threshold))continue;
   const old=remaining.get(key);
   if(!old||p[2]>old[2])remaining.set(key,p);
  }
  const candidates=[...remaining.values()].sort((a,b)=>b[2]-a[2]);
  let changed=false;
  for(const p of candidates){
   if(kept.size>=3)break;
   const key=p[0]+','+p[1];
   if(kept.has(key))continue;
   // Source topology reuses the same point object for every incidence
   // of the same arc; this therefore preserves neighbours as well.
   p[2]=Infinity;
   kept.add(key);stats.extraVertices++;changed=true;
  }
  if(changed)stats.protectedRings++;
  if(kept.size<3)stats.unrepairableRings++;
 });
 return stats;
}
