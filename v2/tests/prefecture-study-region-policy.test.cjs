'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../..');
const index=JSON.parse(fs.readFileSync(path.join(root,'v2/progressive-preview/label-index.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'v2/data/national/2026-common/national-2026-pilot/manifest.json'),'utf8'));
const cases=[
 ['osaka','27',8,72,[24,5,5,7,3,9,11,8]],
 ['kyoto','26',8,36,[4,3,3,11,3,6,3,3]],
 ['nara','29',5,39,[8,7,8,4,12]],
 ['shiga','25',6,19,[2,4,2,4,5,2]],
 ['wakayama','30',7,30,[3,2,4,4,7,4,6]],
 ['tottori','31',3,19,[5,5,9]],
 ['shimane','32',3,19,[6,9,4]],
 ['niigata','15',5,37,[6,11,11,5,4]]
];
assert.equal(index.count,1905);
let total=0,totalRegions=0;
for(const [slug,pref,regionCount,municipalCount,sizes] of cases){
 const dir=path.join(root,'v2/municipalities',slug);
 const cfg=JSON.parse(fs.readFileSync(path.join(dir,'regions.json'),'utf8'));
 const regions=cfg.regions,codes=regions.flatMap(r=>r.codes);
 const excluded=new Set(cfg.excludedAreaCodes||[]);
 const raw=index.entries.filter(e=>e.pref===pref);
 const active=raw.filter(e=>!excluded.has(e.code));
 assert.equal(cfg.prefecture,pref,slug+' pref code');
 assert.equal(cfg.expectedAreaCount,municipalCount,slug+' expected areas');
 assert.equal(raw.length,manifest.entries.find(e=>e.pref===pref).regions,slug+' manifest count');
 assert.equal(active.length,municipalCount,slug+' active 2026 areas');
 assert.equal(regions.length,regionCount,slug+' region count');
 assert.deepEqual(regions.map(r=>r.codes.length),sizes,slug+' region size snapshot');
 assert(regions.every(r=>r.codes.length>=2),slug+' has a one-area region; review grouping before publication');
 assert(regions.every(r=>r.name&&/^[ぁ-ゖー]+$/.test(r.reading)),slug+' region reading');
 assert.equal(codes.length,municipalCount,slug+' total codes');
 assert.equal(new Set(codes).size,municipalCount,slug+' no duplicates');
 assert.deepEqual([...codes].sort(),active.map(e=>e.code).sort(),slug+' code coverage');
 assert(cfg.regionSource&&/^https:\/\//.test(cfg.regionSource),slug+' documented region source');
 total+=municipalCount;totalRegions+=regionCount;
}
assert.equal(total,271);assert.equal(totalRegions,45);
console.log('PASS 8 prefectures / 45 regions / 271 units: no one-area region, unique 2026 codes. Hyogo 10/49 checked separately.');
