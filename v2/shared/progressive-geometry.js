/* Exact geometry transport and SVG scene builder. No LOD/anchor/data changes.
 * The worker owns transferred flat buffers; the page retains its existing LRU.
 */
(function(global){'use strict';
const now=()=>performance.now();
function boxOf(rings){let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;for(const ring of rings)for(const p of ring){a=Math.min(a,p[0]);b=Math.min(b,p[1]);c=Math.max(c,p[0]);d=Math.max(d,p[1]);}return [a,b,c,d];}
async function pack(entry,yieldTask=()=>new Promise(r=>setTimeout(r,0))){
 const start=now(),sources=[...entry.arcs],regions=entry.regions.map(r=>({code:r.code,name:r.fullName||r.name,polys:r.polys.map(poly=>poly.map(ring=>{const i=sources.length;sources.push(ring);return i;}))}));
 let count=0;for(const s of sources)count+=s.length;const points=new Float64Array(count*2),rings=[];let offset=0,batch=now(),maxSliceMs=0,yields=0;
 for(const source of sources){const first=offset;let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;
  for(let i=0;i<source.length;i++){const p=source[i];points[offset++]=p[0];points[offset++]=p[1];a=Math.min(a,p[0]);b=Math.min(b,p[1]);c=Math.max(c,p[0]);d=Math.max(d,p[1]);
   if((i&1023)===0&&now()-batch>=4){maxSliceMs=Math.max(maxSliceMs,now()-batch);await yieldTask();batch=now();yields++;}}
  rings.push({first,length:source.length,box:[a,b,c,d]});
 }
 maxSliceMs=Math.max(maxSliceMs,now()-batch);
 for(const r of regions)r.polys=r.polys.map(ids=>({ids,box:ids.reduce((b,id)=>{const x=rings[id].box;return [Math.min(b[0],x[0]),Math.min(b[1],x[1]),Math.max(b[2],x[2]),Math.max(b[3],x[3])];},[Infinity,Infinity,-Infinity,-Infinity])}));
 return {points,rings,regions,arcCount:entry.arcs.length,box:entry.box,bytes:entry.bytes,metrics:{packWallMs:now()-start,maxSliceMs,yields,bufferBytes:points.byteLength}};
}
function buildScene({entries,overview,selection,projection,clip,selected='',detail=true}){
 const start=now(),[ax,bx,ay,by]=projection,p=([x,y])=>[ax*x+bx,ay*y+by],overlaps=b=>{const a=p([b[0],b[3]]),z=p([b[2],b[1]]);return z[0]>=clip.x&&a[0]<=clip.x+clip.w&&z[1]>=clip.y&&a[1]<=clip.y+clip.h;},loaded=new Set(entries.map(x=>x.code)),paths=[],seen=new Set();let border='',segments=0,chosenDrawn=false,points=0;
 function ringPath(data,id,closed){const r=data.rings[id],v=data.points;let s='';for(let i=0;i<r.length;i++){const n=r.first+i*2,q=p([v[n],v[n+1]]);s+=(i?'L':'M')+q[0].toFixed(4)+','+q[1].toFixed(4);points++;}return s+(closed?'Z':'');}
 function boundary(data,id){const r=data.rings[id],v=data.points;let last='';for(let i=1;i<r.length;i++){const a=r.first+(i-1)*2,b=a+2,u=p([v[a],v[a+1]]),w=p([v[b],v[b+1]]);
  if(Math.max(u[0],w[0])<clip.x||Math.min(u[0],w[0])>clip.x+clip.w||Math.max(u[1],w[1])<clip.y||Math.min(u[1],w[1])>clip.y+clip.h){last='';continue;}
  const ka=u[0].toFixed(4)+','+u[1].toFixed(4),kb=w[0].toFixed(4)+','+w[1].toFixed(4);if(ka===kb){continue;}const key=ka<kb?ka+'|'+kb:kb+'|'+ka;if(seen.has(key)){last='';continue;}seen.add(key);border+=(last===ka?'L':'M'+ka+'L')+kb;last=kb;segments++;
 }}
 function land(data,region){const polys=region.polys.filter(x=>overlaps(x.box));if(!polys.length)return;paths.push({kind:'land',code:region.code,name:region.name,d:polys.map(poly=>poly.ids.map(id=>ringPath(data,id,true)).join('')).join('')});if(region.code===selected)chosenDrawn=true;}
 for(const region of overview.regions){paths.push({kind:loaded.has(region.code)?'prefecture-focus':'prefecture',code:region.code,name:region.name,d:region.polys.map(poly=>poly.ids.map(id=>ringPath(overview,id,true)).join('')).join('')});if(!loaded.has(region.code))for(const poly of region.polys)for(const id of poly.ids)boundary(overview,id);}
 const overviewAt=now();
 for(const data of entries){for(let i=0;i<data.arcCount;i++)if(overlaps(data.rings[i].box))boundary(data,i);for(const r of data.regions)land(data,r);}
 if(!chosenDrawn&&selection)for(const r of selection.regions)land(selection,r);
 return {paths,border,metrics:{buildMs:now()-start,overviewMs:overviewAt-start,segments,fillPoints:points,pathChars:border.length+paths.reduce((n,x)=>n+x.d.length,0)}};
}
global.KussoonProgressiveGeometry=Object.freeze({pack,buildScene,boxOf});
})(typeof window==='undefined'?self:window);
