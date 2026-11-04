'use strict';
// S09/S11/S28/S38-S40: read committed assets; never regenerate or rewrite them.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const json=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));

function inspectPrefecture(entry,topology){
 const geometries=topology.objects?.municipalities?.geometries;
 assert(Array.isArray(geometries),'municipality geometries required');
 assert.equal(geometries.length,entry.regions,'manifest region count');
 assert(Array.isArray(topology.arcs)&&topology.arcs.length,'shared arcs required');
 const codes=new Set();
 for(const geometry of geometries){
  const code=String(geometry.properties?.N03_007||'');
  assert.match(code,new RegExp('^'+entry.pref+'\\d{3}$'),'prefecture-qualified five-digit code');
  assert(!codes.has(code),'duplicate municipality code '+code);codes.add(code);
  assert(['Polygon','MultiPolygon'].includes(geometry.type),'polygon geometry required');
  const visit=value=>{
   assert(Array.isArray(value)&&value.length,'nonempty polygon/ring');
   for(const part of value){
    if(Array.isArray(part))visit(part);
    else{assert(Number.isInteger(part),'integer arc reference');assert(topology.arcs[part<0?~part:part],'missing shared arc');}
   }
  };
  visit(geometry.arcs);
 }
 for(const arc of topology.arcs){
  assert(Array.isArray(arc)&&arc.length>=2,'nonempty boundary arc');
  for(const point of arc)assert(point.length===2&&point.every(Number.isFinite),'finite boundary coordinates');
 }
 return codes;
}

// Negative controls: these checks must reject damaged data, not just report counts.
const fixture={objects:{municipalities:{geometries:[{type:'Polygon',arcs:[[0]],properties:{N03_007:'28204'}}]}},arcs:[[[0,0],[1,1]]]};
assert.deepEqual([...inspectPrefecture({pref:'28',regions:1},fixture)],['28204']);
for(const damage of [
 t=>t.objects.municipalities.geometries.push(structuredClone(t.objects.municipalities.geometries[0])),
 t=>t.objects.municipalities.geometries[0].properties.N03_007='27204',
 t=>t.objects.municipalities.geometries[0].arcs=[[99]],
 t=>t.arcs[0][0][0]=NaN,
]){const broken=structuredClone(fixture);damage(broken);assert.throws(()=>inspectPrefecture({pref:'28',regions:broken.objects.municipalities.geometries.length},broken));}
assert.throws(()=>inspectPrefecture({pref:'28',regions:2},fixture));

const manifest=json('data/national/2026-common/national-2026-pilot/manifest.json');
assert.equal(manifest.prefectureCount,47);assert.equal(manifest.entries.length,47);
assert.deepEqual(manifest.entries.map(e=>e.pref).sort(),Array.from({length:47},(_,i)=>String(i+1).padStart(2,'0')));
const allCodes=new Set(),mapOnly=new Set(),officeOnly=new Set(),directories=new Map();
let officeCount=0;
for(const entry of manifest.entries){
 const file=path.resolve(root,'data/national/2026-common',entry.source);
 assert(file.startsWith(path.join(root,'data/national/2026-common/')),'detail source stays inside data directory');
 const codes=inspectPrefecture(entry,JSON.parse(fs.readFileSync(file,'utf8')));
 const directory=json('data/offices/'+entry.pref+'.json');directories.set(entry.pref,directory);
 assert.equal(directory.schemaVersion,2);assert.equal(directory.prefecture,entry.pref);
 for(const code of codes){assert(!allCodes.has(code),'nationwide duplicate '+code);allCodes.add(code);if(!directory.regions[code])mapOnly.add(code);}
 for(const [code,region] of Object.entries(directory.regions)){
  officeCount++;assert.match(code,new RegExp('^'+entry.pref+'\\d{3}$'));
  if(!codes.has(code)){officeOnly.add(code);assert.equal(region.kind,'designatedCity','only city parents may be office-only');}
  assert.equal(new Set(region.officeIds).size,region.officeIds.length);
  for(const id of region.officeIds)assert(directory.offices[id],'missing office '+id);
  if(region.kind==='ward'&&region.parentCode){
   const parent=directory.regions[region.parentCode];assert(parent,'ward parent exists');assert.equal(parent.kind,'designatedCity');
   assert(parent.officeIds.every(id=>region.officeIds.includes(id)),'ward must include its parent city hall');
  }else if(region.kind==='ward'){
   assert(Number(code)>=13101&&Number(code)<=13123,'only Tokyo special wards have no parent city');
   assert.equal(region.officeIds.length,1,'special ward has its own office');
  }
 }
}
assert.equal(manifest.municipalityCount,1905);assert.equal(allCodes.size,1905);assert.equal(officeCount,1912);
assert.deepEqual([...mapOnly].sort(),['01695','01696','01697','01698','01699','01700','12000','13000','23000','30000','40000','46000','47000']);
assert.equal(officeOnly.size,20);
assert.deepEqual([...allCodes].filter(c=>/^2213[1-9]$|^22140$/.test(c)).sort(),['22138','22139','22140'],'2024 Hamamatsu reorganization in 2026 geometry');
const overview=json('data/national/2026-common/national-2026-pilot/prefectures-overview.geojson');
assert.deepEqual(overview.features.map(f=>f.properties.code).sort(),manifest.entries.map(e=>e.pref).sort());

// PR #205 is a read-only input. Officiality is distinct from HTTP reachability.
const ledger=json('audit/official-url-nationwide-classification-20261103.json');
const seen=new Set(),counts={A:0,B:0,C:0,unclassified:0};
for(const record of ledger.records){
 const code=record.municipalityCode;assert(!seen.has(code),'duplicate URL audit code');seen.add(code);
 const region=directories.get(record.prefectureCode)?.regions[code];assert(region,'URL audit code has office region');
 assert.equal(region.official,record.registeredUrl);assert.equal(region.officialAuditStatus,record.classification||'unclassified');
 assert(Object.hasOwn(counts,region.officialAuditStatus));counts[region.officialAuditStatus]++;
}
assert.equal(seen.size,officeCount);assert.deepEqual(counts,{A:1907,B:1,C:1,unclassified:3});
// PR #204: every searchable record must route to an actual current polygon.
// Do not fetch every detailed topology in the browser just to build the index.
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'shared/reading-bridge.js'),'utf8'),context);
const source=json('data/national/municipality-readings-all-source.json');
const original=JSON.stringify(source),index=context.window.KussoonV2ReadingBridge.searchIndex(source);
assert.equal(JSON.stringify(source),original,'search must not mutate the source snapshot');
assert.equal(new Set(index.map(r=>r.code)).size,index.length,'unique search codes');
assert.deepEqual(Array.from(index,r=>r.code).sort(),[...allCodes].filter(c=>!mapOnly.has(c)).sort(),'all 1892 named municipalities route to 2026 geometry, including Hamamatsu');
console.log('PASS S09/S11/S28/S38-S40: 47 real 2026 assets, 1905 unique map codes, 1912 offices/URL audit records, explicit exceptions and negative controls');
