#!/usr/bin/env node
/**
 * Build Kussoon V2 administrative boundaries from ONE nationwide GeoJSON.
 * 
 * Geometries are grouped by N03_007; topology is constructed and simplified
 * ONCE at national scope. Prefecture files then take unchanged national arcs,
 * never simplify/snap them independently. This prevents prefecture seams.
 *
 * Usage:
 * node build.mjs --input /path/to/N03-national.geojson --output /tmp/v2-common
 * Optional: --quantization 1000000 --keep 0.02 --expect-prefectures 47
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {topology as makeTopology} from 'topojson-server';
import {presimplify,simplify,quantile} from 'topojson-simplify';

function arg(name,fallback){
 const i=process.argv.indexOf(name);
 return i===-1?fallback:process.argv[i+1];
}
const input=arg('--input');
const output=resolve(arg('--output','./generated'));
const quantization=Number(arg('--quantization','1000000'));
const keep=Number(arg('--keep','0.02'));
const expected=Number(arg('--expect-prefectures','0'));
if(!input||!Number.isInteger(quantization)||quantization<1e5
 ||!Number.isFinite(keep)||keep<=0||keep>1
 ||!Number.isInteger(expected)||expected<0){
 console.error('Usage: node build.mjs --input nationwide.geojson --output DIR [--quantization 1000000] [--keep 0.02] [--expect-prefectures 47]');
 process.exit(2);
}
function polygons(geometry){
 if(!geometry)return [];
 if(geometry.type==='Polygon')return [geometry.coordinates];
 if(geometry.type==='MultiPolygon')return geometry.coordinates;
 throw Error('Unexpected geometry type: '+geometry.type);
}
function gather(geojson){
 if(geojson.type!=='FeatureCollection'||!Array.isArray(geojson.features))
  throw Error('Input must be a nationwide GeoJSON FeatureCollection');
 const grouped=new Map(),duplicates=[];
 for(const [i,f] of geojson.features.entries()){
  const p=f.properties||{},code=String(p.N03_007||'').trim();
  if(!/^\d{5}$/.test(code)){duplicates.push(i);continue;}
  const name=String(p.N03_004||'').trim();
  const pref=code.slice(0,2);
  if(!name)throw Error('Missing municipality name: '+code);
  if(!grouped.has(code))grouped.set(code,{code,pref,name,polygons:[]});
  const region=grouped.get(code);
  if(region.name!==name)throw Error('Conflicting names for '+code+': '+region.name+' / '+name);
  region.polygons.push(...polygons(f.geometry));
 }
 if(duplicates.length)throw Error('Missing/invalid N03_007 in '+duplicates.length+' source features (first '+duplicates.slice(0,10).join(', ')+'). Fix or explicitly document boundary-undetermined regions; do not drop silently.');
 const features=[...grouped.values()].sort((a,b)=>a.code.localeCompare(b.code)).map(g=>({
  type:'Feature',id:g.code,properties:{N03_007:g.code,N03_004:g.name,N03_001:g.pref},
  geometry:{type:'MultiPolygon',coordinates:g.polygons}
 }));
 return features;
}
function walkArcs(geom,fn){
 if(geom.type==='Polygon')for(const ring of geom.arcs)for(const arc of ring)fn(arc);
 else if(geom.type==='MultiPolygon')for(const polygon of geom.arcs)for(const ring of polygon)for(const arc of ring)fn(arc);
 else if(geom.type==='GeometryCollection')for(const child of geom.geometries)walkArcs(child,fn);
}
function arcIndex(id){return id<0?~id:id;}
function borderAudit(topo){
 const owners=new Map();
 for(const g of topo.objects.municipalities.geometries){
  const pref=String(g.properties.N03_007).slice(0,2);
  walkArcs(g,id=>{
   const idx=arcIndex(id);
   const set=owners.get(idx)||new Set();
   set.add(pref);owners.set(idx,set);
  });
 }
 const counts=new Map();
 for(const prefSet of owners.values()){
  const codes=[...prefSet].sort();
  for(let a=0;a<codes.length;a++)for(let b=a+1;b<codes.length;b++){
   const key=codes[a]+'-'+codes[b];
   counts.set(key,(counts.get(key)||0)+1);
  }
 }
 return Object.fromEntries([...counts].sort(([a],[b])=>a.localeCompare(b)));
}
function slicePref(topo,pref){
 const selected=topo.objects.municipalities.geometries.filter(g=>String(g.properties.N03_007).startsWith(pref));
 const used=new Set();
 selected.forEach(g=>walkArcs(g,id=>used.add(arcIndex(id))));
 const indices=[...used].sort((a,b)=>a-b),mapping=new Map(indices.map((idx,j)=>[idx,j]));
 function mapGeom(g){
  const remap=id=>{
   const newIndex=mapping.get(arcIndex(id));
   if(newIndex===undefined)throw Error('Unknown arc reference: '+id);
   return id<0?~newIndex:newIndex;
  };
  const copy={...g};
  if(g.type==='Polygon')copy.arcs=g.arcs.map(r=>r.map(remap));
  else if(g.type==='MultiPolygon')copy.arcs=g.arcs.map(p=>p.map(r=>r.map(remap)));
  else throw Error('Unhandled geometry '+g.type);
  return copy;
 }
 const obj={
  type:'Topology',
  objects:{municipalities:{type:'GeometryCollection',geometries:selected.map(mapGeom)}},
  arcs:indices.map(i=>topo.arcs[i])
 };
 if(topo.transform)obj.transform=topo.transform;
 if(topo.bbox)obj.bbox=topo.bbox;
 return {obj,usedCount:indices.length};
}
const inputJson=JSON.parse(await readFile(resolve(input),'utf8'));
const features=gather(inputJson);
const prefs=[...new Set(features.map(f=>f.id.slice(0,2)))].sort();
if(expected&&prefs.length!==expected)throw Error('Expected '+expected+' prefectures; got '+prefs.length);
console.log('Input regions:',features.length,'prefectures:',prefs.length);
let topo=makeTopology({municipalities:{type:'FeatureCollection',features}},quantization);
if(keep<1){
 const weighted=presimplify(topo);
 topo=simplify(weighted,quantile(weighted,1-keep));
}
const cross=borderAudit(topo);
const hasOsaka=prefs.includes('27'),hasNara=prefs.includes('29');
if(hasOsaka&&hasNara&&!cross['27-29']){
 throw Error('No shared arc between Osaka and Nara. This input does not have a unified prefecture border. Stop rather than publish an inconsistent map.');
}
await mkdir(output,{recursive:true});
const manifest={
 schemaVersion:1,
 source:'Single nationwide N03 GeoJSON provided by operator; see README and record provenance separately',
 quantization,keep,prefectureCount:prefs.length,regionCount:features.length,
 sharedPrefectureArcCounts:cross,
 output:'Prefecture slices retain exactly the same arcs and transform as the nationwide topology; no independent simplification'
};
for(const pref of prefs){
 const {obj}=slicePref(topo,pref);
 await writeFile(join(output,pref+'.topojson'),JSON.stringify(obj)+'\n','utf8');
}
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
console.log('Wrote',prefs.length,'prefecture slices to',output);
console.log('Common Osaka/Nara arcs:',cross['27-29']||0);
