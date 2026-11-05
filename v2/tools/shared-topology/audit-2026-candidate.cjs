#!/usr/bin/env node
'use strict';
/* Read-only release gate for a freshly rebuilt nationwide N03 2026 common
 * topology. Never mutate source geometry or the published V2 dataset.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const src=path.resolve(__dirname,'../../data/national/2026-common/national-2026-pilot/manifest.json');
const out=path.resolve(process.argv[2]||'');
if(process.argv.length<3)throw Error('Usage: node audit-candidate.cjs GENERATED_DIR [REPORT_JSON]');
const manifest=JSON.parse(fs.readFileSync(src,'utf8'));
const built=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
assert.equal(manifest.municipalityCount,1905,'established official 2026 region count');
assert.equal(manifest.prefectureCount,47);
assert.equal(built.regionCount,1905,'national source must retain all 1905 municipalities');
assert.equal(built.prefectureCount,47);
const codes=new Set(),byPref={},fileBytes={},bboxIssues=[];
for(const e of manifest.entries){
 const p=path.join(out,e.pref+'.topojson');
 const t=JSON.parse(fs.readFileSync(p,'utf8')),items=t.objects?.municipalities?.geometries;
 assert.equal(t.type,'Topology');assert(Array.isArray(items));
 const published=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../data/national/2026-common',e.source),'utf8'));
 const oldItems=published.objects?.municipalities?.geometries;
 const expected=new Map(oldItems.map(x=>[String(x.properties.N03_007),String(x.properties.N03_004)]));
 assert.equal(items.length,e.regions,'region count mismatch '+e.pref);
 assert.equal(expected.size,items.length);
 const current=new Map();
 for(const g of items){
  const c=String(g.properties?.N03_007),n=String(g.properties?.N03_004);
  assert.match(c,new RegExp('^'+e.pref+'\\d{3}$'));
  assert(!codes.has(c),'nationwide duplicate code '+c);
  assert.equal(n,expected.get(c),'name mismatch for '+c+' from baseline');
  assert(['Polygon','MultiPolygon'].includes(g.type));
  codes.add(c);current.set(c,n);
 }
 assert.equal(current.size,expected.size);
 byPref[e.pref]=current.size;fileBytes[e.pref]=fs.statSync(p).size;
 if(!Array.isArray(t.arcs)||!t.arcs.length)bboxIssues.push(e.pref);
}
assert.equal(codes.size,1905);assert.equal(bboxIssues.length,0);
const cross=built.sharedPrefectureArcCounts;
assert(cross&&typeof cross==='object');
const reference=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../data/national/2026-common/national-shared-border-pilot/manifest.json'),'utf8'));
for(const pair of reference.pairs)assert(cross[pair.pair]>0,'Lost reference shared border '+pair.pair);
const report={status:'audit-passed-without-production-switch',source:built.source,
 prefCount:47,regionCount:codes.size,crossPrefecturePairs:Object.keys(cross).length,
 historicalSharedPairs:reference.pairs.length,quantization:built.quantization,keep:built.keep,
 bytes:fileBytes,totalBytes:Object.values(fileBytes).reduce((a,b)=>a+b,0),byPref,
 reviewRequired:['2026 origin attribution and distribution license','actual mobile device memory and interaction',
 'municipality shapes, islands, inland waterways, holes and unsurveyed boundaries',
 'overview and detailed geometry must be derived from the same source',
 'visual seam closure and painted polygon matching']};
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
console.log('PASS candidate common topology audit '+JSON.stringify({prefectures:47,regions:codes.size,sharedPairs:Object.keys(cross).length,totalMiB:(report.totalBytes/1048576).toFixed(2)}));
