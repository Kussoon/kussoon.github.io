#!/usr/bin/env node
/**
 * Build a lightweight 47-prefecture overview from the already published
 * official 2026 V2 topology files. Do not download or alter N03 originals.
 * Only Kinki (25-30) and Chugoku/Shikoku (31-39) need new prefecture slices:
 * they currently use multi-prefecture combined topology on their trial pages.
 *
 * Source groups were generated separately; do NOT claim that seams between
 * groups have been mathematically reconciled at nationwide source level.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {merge} from 'topojson-client';
const root=resolve(process.argv[2]||'../../data/national/2026-common');
const dest=resolve(process.argv[3]||'../../data/national/2026-common/national-2026-pilot');
const entries=[];
for(let code=1;code<=47;code++){
 const pref=String(code).padStart(2,'0');
 let source,combined=false;
 if(code===1)source='hokkaido-prefecture-20m/01.topojson';
 else if(code<=7)source='tohoku-prefecture-20m/'+pref+'.topojson';
 else if(code<=14)source='kanto-prefecture-20m/'+pref+'.topojson';
 else if(code<=20)source='hokuriku-koshinetsu-prefecture-20m/'+pref+'.topojson';
 else if(code<=24)source='tokai-prefecture-20m/'+pref+'.topojson';
 else if(code<=30){source='kinki-six-20m.topojson';combined=true;}
 else if(code<=39){source='chugoku-shikoku-nine-20m.topojson';combined=true;}
 else source='kyushu-prefecture-20m/'+pref+'.topojson';
 entries.push({pref,source,combined});
}
const cached=new Map();
async function load(name){
 if(!cached.has(name))cached.set(name,JSON.parse(await readFile(join(root,name),'utf8')));
 return cached.get(name);
}
const arcIdx=i=>i<0?~i:i;
function forIds(g,fn){
 if(g.type==='Polygon')for(const ring of g.arcs)for(const id of ring)fn(id);
 else if(g.type==='MultiPolygon')for(const polygon of g.arcs)for(const ring of polygon)for(const id of ring)fn(id);
 else throw Error('Unsupported municipal geometry '+g.type);
}
function slicePref(t,geoms){
 const used=new Set();geoms.forEach(g=>forIds(g,id=>used.add(arcIdx(id))));
 const ids=[...used].sort((a,b)=>a-b),map=new Map(ids.map((v,i)=>[v,i]));
 function clone(g){
  const cv=id=>{const n=map.get(arcIdx(id));if(n===undefined)throw Error('Missing arc '+id);return id<0?~n:n;};
  return {...g,arcs:g.type==='Polygon'?g.arcs.map(r=>r.map(cv)):g.arcs.map(p=>p.map(r=>r.map(cv)))};
 }
 const out={type:'Topology',objects:{municipalities:{type:'GeometryCollection',geometries:geoms.map(clone)}},arcs:ids.map(i=>t.arcs[i])};
 if(t.transform)out.transform=t.transform;
 return out;
}
// Douglas-Peucker on coordinate rings (in lat/lon degrees). A low-detail
// overview is only a navigation layer; it is never used for municipality zoom.
function dp(points,sqTol){
 if(points.length<=2)return points;
 const selected=new Uint8Array(points.length);selected[0]=selected[points.length-1]=1;
 const stack=[[0,points.length-1]];
 while(stack.length){
  const [a,b]=stack.pop();let best=-1,index=-1;
  const p=points[a],q=points[b],dx=q[0]-p[0],dy=q[1]-p[1],len=dx*dx+dy*dy;
  for(let i=a+1;i<b;i++){
   const r=points[i],t=len?Math.max(0,Math.min(1,((r[0]-p[0])*dx+(r[1]-p[1])*dy)/len)):0;
   const xx=p[0]+t*dx,yy=p[1]+t*dy,dist=(r[0]-xx)**2+(r[1]-yy)**2;
   if(dist>best){best=dist;index=i;}
  }
  if(best>sqTol&&index>a&&index<b){selected[index]=1;stack.push([a,index],[index,b]);}
 }
 return points.filter((_,i)=>selected[i]);
}
function ringSimplify(ring){
 const closed=ring.length>1&&ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1];
 const p=closed?ring.slice(0,-1):ring.slice();
 if(p.length<=3)return [...p,p[0]];
 // Rotate the starting vertex to reduce closed-ring simplification artifacts.
 let western=0;for(let i=1;i<p.length;i++)if(p[i][0]<p[western][0])western=i;
 const rotated=p.slice(western).concat(p.slice(0,western));
 const reduced=dp([...rotated,rotated[0]],.018*.018);
 return reduced.length>=4?reduced:[...rotated.slice(0,3),rotated[0]];
}
function previewArea(ring){
 let area=0;
 for(let i=0;i<ring.length-1;i++)area+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];
 return Math.abs(area)/2;
}
function simplifyGeometry(geometry){
 const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 const output=[];
 // This is ONLY the nationwide locator. Omit speck-sized offshore islets
 // (~1 sq km) that cannot be distinguished at Japan-wide screen scale.
 // Every original polygon remains available in the detailed prefecture data.
 for(const polygon of polys){
  if(!polygon[0]||previewArea(polygon[0])<.00011)continue;
  const rings=polygon.map(ringSimplify).filter(r=>r.length>=4).map(r=>
   r.map(p=>[Number(p[0].toFixed(3)),Number(p[1].toFixed(3))])
  );
  if(rings.length)output.push(rings);
 }
 return {type:'MultiPolygon',coordinates:output};
}
await mkdir(dest,{recursive:true});
const features=[],counts={},manifest=[];
for(const {pref,source,combined} of entries){
 const t=await load(source),municipalities=t.objects?.municipalities?.geometries||[];
 const geometries=municipalities.filter(g=>String(g.properties?.N03_007).slice(0,2)===pref);
 if(!geometries.length)throw Error('No official 2026 municipalities for '+pref);
 const codes=geometries.map(g=>String(g.properties.N03_007));
 if(new Set(codes).size!==codes.length)throw Error('Duplicate codes in '+pref);
 if(combined){
  const slice=slicePref(t,geometries);
  await writeFile(join(dest,pref+'.topojson'),JSON.stringify(slice)+'\n');
 }
 const merged=merge(t,geometries);
 const geom=simplifyGeometry(merged);
 if(!geom.coordinates.length)throw Error('Empty prefecture geometry '+pref);
 features.push({type:'Feature',properties:{code:pref},geometry:geom});
 counts[pref]=codes.length;
 manifest.push({pref,regions:codes.length,source:combined?'national-2026-pilot/'+pref+'.topojson':source});
 console.log('PASS',pref,codes.length,'regions,',geom.coordinates.length,'land polygons');
}
if(features.length!==47)throw Error('Incomplete nationwide preview');
const collection={type:'FeatureCollection',metadata:{source:'MLIT N03-2026, pre-existing Kussoon regional V2 topology',purpose:'low-detail navigation only',note:'Inter-region shared border topology not yet nationally reconciled; small uninhabited islets omitted in preview only'},features};
await writeFile(join(dest,'prefectures-overview.geojson'),JSON.stringify(collection)+'\n');
await writeFile(join(dest,'manifest.json'),JSON.stringify({version:1,prefectureCount:47,municipalityCount:Object.values(counts).reduce((a,b)=>a+b,0),entries:manifest},null,2)+'\n');
console.log('PASS nationwide overview 47 prefectures',Object.values(counts).reduce((a,b)=>a+b,0),'municipalities');
