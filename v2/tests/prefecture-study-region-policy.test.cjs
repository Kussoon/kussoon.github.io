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
 ['niigata','15',5,37,[6,11,11,5,4]],
 ['toyama','16',4,15,[4,5,4,2]],
 ['ishikawa','17',4,19,[4,5,6,4]],
 ['fukui','18',4,17,[4,2,5,6]],
 ['yamanashi','19',4,27,[7,3,5,12]],
 ['nagano','20',10,77,[11,4,6,8,14,6,8,5,9,6]],
 ['gifu','21',5,42,[9,11,13,5,4]],
 ['shizuoka','22',6,39,[14,6,3,6,6,4]],
 ['aichi','23',6,69,[16,18,7,10,10,8]],
 ['mie','24',5,29,[10,5,7,2,5]],
 ["ibaraki", "08", 5, 44, [6, 9, 5, 14, 10]],
 ["tochigi", "09", 3, 25, [6, 7, 12]],
 ["gunma", "10", 5, 35, [6, 9, 6, 5, 9]],
 ["saitama", "11", 10, 72, [10, 3, 7, 7, 5, 14, 5, 9, 7, 5]],
 ["chiba", "12", 11, 59, [7, 5, 6, 9, 4, 3, 6, 7, 4, 4, 4]],
 ["tokyo", "13", 5, 62, [23, 17, 8, 5, 9]],
 ["kanagawa", "14", 7, 58, [18, 7, 3, 5, 7, 8, 10]],
 ['aomori','02',6,40,[5,7,7,7,9,5]],
 ['iwate','03',4,33,[8,8,9,8]],
 ['miyagi','04',6,39,[9,18,5,2,3,2]],
 ['akita','05',3,25,[9,9,7]],
 ['yamagata','06',4,35,[14,8,8,5]],
 ['fukushima','07',6,59,[8,12,9,13,4,13]],
 ['hokkaido','01',14,194,[24,17,20,11,7,11,7,23,8,10,18,19,8,11]]
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
 if(['aomori','iwate','miyagi','akita','yamagata','fukushima','hokkaido'].includes(slug)){
  const overview=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  assert(overview.includes('cfg.regions.length!=='+regionCount),slug+' overview validates region count');
  assert(overview.includes('codes.length!=='+municipalCount),slug+' overview validates area count');
  assert(overview.includes("key:'all',name:'全域'"),slug+' overview offers all-area selection');
  assert(overview.includes(cfg.regionSource)&&overview.includes(cfg.countySource),slug+' overview links to documented sources');
  const quiz=fs.readFileSync(path.join(dir,'quiz.html'),'utf8');
  assert(quiz.includes('data-region-config="./regions.json"')&&quiz.includes('quiz-app.js'),slug+' quiz uses shared configuration and runtime');
 }
 assert.deepEqual(regions.map(r=>r.codes.length),sizes,slug+' region size snapshot');
 assert(regions.every(r=>r.codes.length>=2),slug+' has a one-area region; review grouping before publication');
 assert(regions.every(r=>r.name&&/^[ぁ-ゖー]+$/.test(r.reading)),slug+' region reading');
 assert.equal(codes.length,municipalCount,slug+' total codes');
 assert.equal(new Set(codes).size,municipalCount,slug+' no duplicates');
 assert.deepEqual([...codes].sort(),active.map(e=>e.code).sort(),slug+' code coverage');
 assert(cfg.regionSource&&/^https:\/\//.test(cfg.regionSource),slug+' documented region source');
 total+=municipalCount;totalRegions+=regionCount;
}
assert.equal(total,1385);assert.equal(totalRegions,182);
console.log('PASS 31 prefectures / 182 regions / 1385 units: no one-area region, unique 2026 codes. Hyogo 10/49 checked separately.');
