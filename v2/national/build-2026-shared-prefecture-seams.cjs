#!/usr/bin/env node
'use strict';
// Experimental seam overlay data. This emits ONLY segments identical in two
// prefectural 2026 input files. Missing exact matches are not silently repaired.
// It is not a substitute for validating the full national topology.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const dir='v2/data/national/2026-common/';
const manifest=read(dir+'national-2026-pilot/manifest.json');
const coord=p=>p[0].toFixed(7)+','+p[1].toFixed(7);
const edge=(a,b)=>{let x=coord(a),y=coord(b);return x<y?x+'|'+y:y+'|'+x;};
function unpack(t,idx){
 let a=t.arcs[idx<0?~idx:idx],x=0,y=0;
 const pts=a.map(p=>{if(!t.transform)return p;x+=p[0];y+=p[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];});
 return idx<0?pts.reverse():pts;
}
function boundaries(pref,t){
 const objects=Object.values(t.objects||{});
 assert.equal(objects.length,1);
 const usage=new Map();
 const rings=[];
 for(const g of objects[0].geometries){
  assert.equal(String(g.properties?.N03_007).slice(0,2),pref);
  const polys=g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:null;
  assert(polys,'invalid polygon '+pref);
  for(const poly of polys)for(const ring of poly){
   rings.push(ring);
   for(const n of ring){let i=n<0?~n:n;usage.set(i,(usage.get(i)||0)+1);}
  }
 }
 const found=new Map();
 for(const ring of rings)for(const n of ring){
  let i=n<0?~n:n;
  if(usage.get(i)!==1)continue;
  const pts=unpack(t,n);
  for(let j=1;j<pts.length;j++){
   const a=pts[j-1],b=pts[j],k=edge(a,b);
   if(coord(a)===coord(b))continue;
   if(!found.has(k))found.set(k,[a,b]);
  }
 }
 return found;
}
function assemble(items){
 const owners=new Map();
 for(const {pref,edges} of items)for(const [key,points] of edges){
  const existing=owners.get(key);
  if(existing)existing.prefs.add(pref);
  else owners.set(key,{prefs:new Set([pref]),points});
 }
 const pairs=new Map(),invalid=[];
 for(const [key,{prefs,points}] of owners){
  if(prefs.size>2){invalid.push({key,prefs:[...prefs]});continue;}
  if(prefs.size!==2)continue;
  const label=[...prefs].sort().join('-');
  if(!pairs.has(label))pairs.set(label,[]);
  pairs.get(label).push(points);
 }
 assert.equal(invalid.length,0,'segments shared by more than two prefectures '+JSON.stringify(invalid.slice(0,3)));
 // Keep segment endpoints unchanged and preserve each matched segment exactly once.
 // No rounding is applied to the emitted geometry; rounding is for match keys only.
 const features=[...pairs].sort(([a],[b])=>a.localeCompare(b)).map(([pair,segments])=>({
  type:'Feature',properties:{prefectures:pair.split('-'),segmentCount:segments.length},
  geometry:{type:'MultiLineString',coordinates:segments}
 }));
 return {type:'FeatureCollection',metadata:{schemaVersion:1,description:'Exact segment matches across two 2026 prefecture outer boundaries; diagnostic-only overlay, not complete nationwide border and not production-ready',
  totalSharedSegments:features.reduce((n,f)=>n+f.properties.segmentCount,0),pairCount:features.length,
  geographicCrs:'EPSG:4326',precisionForMatching:7},features};
}
function selfTest(){
 const t=(p,x0,x1)=>({type:'Topology',objects:{areas:{type:'GeometryCollection',geometries:[{type:'Polygon',arcs:[[0]],properties:{N03_007:p+'001'}}]}},arcs:[[[x0,0],[x1,0],[x1,1],[x0,1],[x0,0]]]});
 const a=boundaries('01',t('01',0,1)),b=boundaries('02',t('02',1,2));
 const overlap=assemble([{pref:'01',edges:a},{pref:'02',edges:b}]);
 assert.equal(overlap.metadata.pairCount,1);
 assert.equal(overlap.metadata.totalSharedSegments,1);
 const shifted=assemble([{pref:'01',edges:a},{pref:'03',edges:boundaries('03',t('03',1.0001,2))}]);
 assert.equal(shifted.metadata.pairCount,0);
 console.log('PASS shared-border overlay synthetic fixtures');
}
if(process.argv.includes('--self-test'))selfTest();
else{
 assert.equal(manifest.prefectureCount,47);
 assert.equal(manifest.entries.length,47);
 const items=manifest.entries.map(e=>({pref:e.pref,edges:boundaries(e.pref,read(dir+e.source))}));
 const result=assemble(items);
 assert.equal(result.metadata.pairCount,60,'unexpected shared pair count: review PR #233 regression report before changing baseline');
 const dest=process.argv[2];
 if(dest){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(result)+'\n');}
 console.log('PASS exact shared-edge overlay '+JSON.stringify(result.metadata));
 console.log('NOT PRODUCTION READY: unmatched edges and coastal outlines intentionally omitted; must validate adjacent prefecture coverage before map integration.');
}
