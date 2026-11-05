#!/usr/bin/env node
'use strict';
// Read-only candidate geometry health. Does not replace legal/visual seam review.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const dir=path.resolve(process.argv[2]||''),baseline=path.resolve(__dirname,'../../data/national/2026-common');
if(process.argv.length<3)throw Error('Usage: node compare-lightweight.cjs GENERATED_DIR [report.json]');
const ref=JSON.parse(fs.readFileSync(path.join(baseline,'national-2026-pilot/manifest.json')));
const candidate=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
assert.equal(candidate.prefectureCount,47);assert.equal(candidate.regionCount,1905);
const rows=[],seen=new Set(),ringFailures=[],allPairs=Object.keys(candidate.sharedPrefectureArcCounts||{});
for(const pref of ref.entries){
 const geo=JSON.parse(fs.readFileSync(path.join(dir,pref.pref+'.topojson')));
 const original=JSON.parse(fs.readFileSync(path.join(baseline,pref.source)));
 const originals=new Map(original.objects.municipalities.geometries.map(g=>[String(g.properties.N03_007),String(g.properties.N03_004)]));
 const regions=geo.objects.municipalities.geometries;
 assert.equal(regions.length,pref.regions,'region count '+pref.pref);
 let rings=0,arcs=0,totalVertices=0,degenerate=0,discontinuous=0,holes=0;
 const norm=i=>i<0?~i:i;
 const pos=(arc,i,reversed=false)=>{const a=geo.arcs[norm(arc)];return a[reversed?a.length-1-i:i];};
 // TopoJSON arcs are delta-encoded when transform exists. Decode points once per arc.
 const decoded=geo.arcs.map(a=>{let x=0,y=0;return a.map(p=>{if(geo.transform){x+=p[0];y+=p[1];return [x,y];}return p;});});
 const endpoints=id=>{const a=decoded[norm(id)];return id<0?[a[a.length-1],a[0]]:[a[0],a[a.length-1]];};
 const eq=(a,b)=>a[0]===b[0]&&a[1]===b[1];
 const inspectRing=(ring,code)=>{
  rings++;if(!ring.length){degenerate++;ringFailures.push({pref:pref.pref,code,kind:'empty-ring'});return;}
  let points=0,unique=new Set(),start=null,last=null;
  for(const id of ring){
   assert(Number.isInteger(id)&&decoded[norm(id)],'invalid arc '+pref.pref+'/'+code);
   const arr=decoded[norm(id)];assert(arr.length>=2,'short arc');
   arcs++;const [a,b]=endpoints(id);
   if(start===null)start=a;
   if(last&&!eq(last,a)){discontinuous++;if(ringFailures.length<40)ringFailures.push({pref:pref.pref,code,kind:'broken-arc-join'});}
   last=b;points+=arr.length-1;
   for(const p of arr)unique.add(p.join(','));
  }
  if(!eq(start,last)){discontinuous++;if(ringFailures.length<40)ringFailures.push({pref:pref.pref,code,kind:'open-ring'});}
  if(unique.size<3||points<3){degenerate++;if(ringFailures.length<40)ringFailures.push({pref:pref.pref,code,kind:'degenerate-ring',points,unique:unique.size});}
 };
 for(const g of regions){
  const code=String(g.properties.N03_007),name=String(g.properties.N03_004);
  assert.equal(name,originals.get(code),'code or name mismatch '+code);
  assert(!seen.has(code),'duplicate '+code);seen.add(code);
  const polys=g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:null;
  assert(polys&&polys.length,'missing polygons '+code);
  for(const poly of polys){
   for(let i=0;i<poly.length;i++){if(i>0)holes++;inspectRing(poly[i],code);}
  }
 }
 totalVertices=decoded.reduce((n,a)=>n+a.length,0);
 rows.push({pref:pref.pref,regions:regions.length,rings,holes,arcs,totalVertices,degenerate,discontinuous,bytes:fs.statSync(path.join(dir,pref.pref+'.topojson')).size});
}
assert.equal(seen.size,1905);
const report={keep:candidate.keep,quantization:candidate.quantization,regions:seen.size,prefectures:rows.length,sharedPairs:allPairs.length,
 totalMiB:Number((rows.reduce((n,r)=>n+r.bytes,0)/1048576).toFixed(2)),
 totalDegenerateRings:rows.reduce((n,r)=>n+r.degenerate,0),
 totalDiscontinuousRings:rows.reduce((n,r)=>n+r.discontinuous,0),
 rings:rows.reduce((n,r)=>n+r.rings,0),holes:rows.reduce((n,r)=>n+r.holes,0),
 rows,ringFailures:ringFailures.slice(0,40)};
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
console.log('CANDIDATE_SUMMARY '+JSON.stringify({keep:report.keep,totalMiB:report.totalMiB,rings:report.rings,holes:report.holes,degenerate:report.totalDegenerateRings,discontinuous:report.totalDiscontinuousRings,sharedPairs:report.sharedPairs}));
if(process.env.KUSSOON_COLLECT_ONLY==='1'){console.log('DIAGNOSTIC_ONLY: unapproved candidate, failure counts retained');process.exit(0);}
assert.equal(report.totalDegenerateRings,0,'candidate contains degenerate rings');
assert.equal(report.totalDiscontinuousRings,0,'candidate contains unclosed/discontinuous rings');
assert(report.sharedPairs>=22,'known land-seam coverage lost');
