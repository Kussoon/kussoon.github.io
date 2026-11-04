#!/usr/bin/env node
'use strict';
// Independent provenance verifier: all exact cross-prefecture source edges
// must appear exactly once in generated overlay. Unmatched edges remain unverified.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.isAbsolute(p)?p:path.join(root,p),'utf8'));
const manifest=read('v2/data/national/2026-common/national-2026-pilot/manifest.json');
const point=p=>p.map(n=>Number(n).toFixed(7)).join(',');
const edge=(a,b)=>[point(a),point(b)].sort().join('|');
function arc(t,n){
 const raw=t.arcs[n<0?~n:n];assert(raw&&raw.length>=2,'missing arc');
 let x=0,y=0;
 const pts=raw.map(p=>{if(!t.transform)return p;x+=p[0];y+=p[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];});
 return n<0?pts.reverse():pts;
}
function boundary(t,pref){
 const objects=Object.values(t.objects||{});assert.equal(objects.length,1);
 const usage=new Map(),rings=[];
 for(const g of objects[0].geometries){
  assert.match(String(g.properties?.N03_007||''),new RegExp('^'+pref+'[0-9]{3}$'));
  const polys=g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:null;assert(polys);
  for(const poly of polys)for(const ring of poly){
   rings.push(ring);for(const n of ring){let id=n<0?~n:n;usage.set(id,(usage.get(id)||0)+1);}
  }
 }
 const edges=new Set();
 for(const ring of rings)for(const n of ring){
  if(usage.get(n<0?~n:n)!==1)continue;
  const pts=arc(t,n);
  for(let i=1;i<pts.length;i++){
   if(point(pts[i-1])===point(pts[i]))continue;
   const id=edge(pts[i-1],pts[i]);
   assert(!edges.has(id),'duplicate edge inside '+pref);
   edges.add(id);
  }
 }
 return edges;
}
function verify(overlay,sources){
 assert.equal(overlay.type,'FeatureCollection');
 const owners=new Map();
 for(const {pref,edges} of sources)for(const id of edges){
  if(!owners.has(id))owners.set(id,new Set());
  owners.get(id).add(pref);
 }
 const expected=new Map();
 for(const [id,prefs] of owners){
  assert(prefs.size<=2,'edge has more than two prefecture owners');
  if(prefs.size===2)expected.set(id,[...prefs].sort().join('-'));
 }
 const found=new Map(),pairGraphs=new Map();
 for(const f of overlay.features){
  assert.equal(f.geometry.type,'MultiLineString');
  const pair=f.properties.prefectures.join('-'),lines=f.geometry.coordinates;
  assert.equal(f.properties.segmentCount,lines.length);
  if(!pairGraphs.has(pair))pairGraphs.set(pair,{edges:0,degrees:new Map(),connections:[]});
  const graph=pairGraphs.get(pair);
  for(const l of lines){
   assert.equal(l.length,2);assert(l.every(pt=>pt.length>=2&&pt.every(Number.isFinite)));
   const id=edge(l[0],l[1]);assert(point(l[0])!==point(l[1]),'collapsed edge');
   assert(!found.has(id),'duplicate overlay edge');
   assert.equal(expected.get(id),pair,'invented edge or wrong prefecture pair');
   found.set(id,pair);graph.edges++;
   const a=point(l[0]),b=point(l[1]);graph.connections.push([a,b]);
   for(const p of [a,b])graph.degrees.set(p,(graph.degrees.get(p)||0)+1);
  }
 }
 assert.equal(found.size,expected.size,'missing shared edges');
 for(const [id,pair] of expected)assert.equal(found.get(id),pair,'missing or wrongly assigned segment');
 assert.equal(overlay.metadata.totalSharedSegments,found.size);
 assert.equal(overlay.metadata.pairCount,pairGraphs.size);
 const pairs=[];
 for(const [pair,g] of pairGraphs){
  const parent=new Map();
  function find(x){if(!parent.has(x))parent.set(x,x);if(parent.get(x)!==x)parent.set(x,find(parent.get(x)));return parent.get(x);}
  for(const [a,b] of g.connections){const x=find(a),y=find(b);if(x!==y)parent.set(x,y);}
  pairs.push({pair,segments:g.edges,endpoints:[...g.degrees.values()].filter(n=>n===1).length,
   junctions:[...g.degrees.values()].filter(n=>n>2).length,
   components:new Set([...g.degrees.keys()].map(find)).size});
 }
 pairs.sort((a,b)=>a.pair.localeCompare(b.pair));
 return {schemaVersion:1,summary:{prefectures:sources.length,sharedPairs:pairs.length,
  sharedSegments:found.size,pairsWithMultipleComponents:pairs.filter(p=>p.components>1).length,
  pairsWithJunctions:pairs.filter(p=>p.junctions>0).length},
  caveat:'Verifies exactly shared source segments only, NOT missing/misaligned inter-prefecture boundaries.',pairs};
}
function selfTest(){
 const id=edge([1,0],[1,1]);
 const sources=[{pref:'01',edges:new Set([id])},{pref:'02',edges:new Set([id])}];
 const overlay={type:'FeatureCollection',metadata:{totalSharedSegments:1,pairCount:1},
 features:[{properties:{prefectures:['01','02'],segmentCount:1},geometry:{type:'MultiLineString',coordinates:[[[1,0],[1,1]]]}}]};
 assert.equal(verify(overlay,sources).summary.sharedSegments,1);
 const missing=structuredClone(overlay);missing.features=[];missing.metadata.totalSharedSegments=0;missing.metadata.pairCount=0;
 assert.throws(()=>verify(missing,sources),/missing shared edges/);
 const dupe=structuredClone(overlay);dupe.features[0].geometry.coordinates.push([[1,0],[1,1]]);dupe.features[0].properties.segmentCount=2;
 assert.throws(()=>verify(dupe,sources),/duplicate overlay edge/);
 console.log('PASS valid/missing/duplicate shared-edge fixtures');
}
if(process.argv.includes('--self-test'))selfTest();
else{
 const overlay=read(process.argv[2]);
 const sources=manifest.entries.map(e=>({pref:e.pref,edges:boundary(read('v2/data/national/2026-common/'+e.source),e.pref)}));
 const report=verify(overlay,sources);
 assert.equal(report.summary.prefectures,47);
 assert.equal(report.summary.sharedPairs,60,'review changed boundary baseline');
 assert.equal(report.summary.sharedSegments,29440,'review changed shared segment baseline');
 if(process.argv[3]){const dest=process.argv[3];fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');}
 console.log('PASS independent shared-seam integrity '+JSON.stringify(report.summary));
 console.log('Unmatched border segments and adjacency completeness remain unverified; not for production switch.');
 for(const p of report.pairs)console.log(p.pair+' segments='+p.segments+' components='+p.components+' endpoints='+p.endpoints+' junctions='+p.junctions);
}
