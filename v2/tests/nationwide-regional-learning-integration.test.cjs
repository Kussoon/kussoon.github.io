'use strict';
/* Nationwide regional learning integration: consume the 47-prefecture
 * directory as the single source of navigation metadata. Do not alter the
 * independent municipality topology or any shared map/quiz engine. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'v2/municipalities/index.html'),'utf8');
const idx=JSON.parse(fs.readFileSync(path.join(root,'v2/progressive-preview/label-index.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'v2/data/national/2026-common/national-2026-pilot/manifest.json'),'utf8'));
const entries=[...html.matchAll(/<li class="prefecture" data-pref="(\d{2})" data-slug="([a-z-]+)" data-regions="(\d+)" data-areas="(\d+)">/g)]
 .map(m=>({pref:m[1],slug:m[2],regions:Number(m[3]),areas:Number(m[4])}));
assert.equal(entries.length,47,'Nationwide directory must list 47 prefectures exactly once');
assert.deepEqual(entries.map(x=>x.pref),Array.from({length:47},(_,i)=>String(i+1).padStart(2,'0')),'Prefecture order and completeness');
assert.equal(new Set(entries.map(x=>x.slug)).size,47,'Unique prefecture slugs');
assert.equal(idx.count,1905,'Frozen 2026 label index count');
assert(html.includes('270地域・1,898出題区域'),'Display verified nationwide totals');
let regionCount=0,areaCount=0,excludedCount=0;
const allCodes=new Set();
for(const {pref,slug,regions,areas} of entries){
 const dir=path.join(root,'v2/municipalities',slug);
 const cfg=JSON.parse(fs.readFileSync(path.join(dir,'regions.json'),'utf8'));
 const expected=idx.entries.filter(e=>e.pref===pref);
 const excluded=new Set(cfg.excludedAreaCodes||[]);
 const active=expected.filter(e=>!excluded.has(e.code));
 const codes=cfg.regions.flatMap(r=>r.codes);
 assert.equal(cfg.prefecture,pref,slug+' prefecture code');
 assert.equal(cfg.expectedAreaCount,areas,slug+' directory area count');
 assert.equal(cfg.regions.length,regions,slug+' directory region count');
 assert.equal(expected.length,manifest.entries.find(e=>e.pref===pref)?.regions,slug+' manifest count');
 assert.equal(active.length,areas,slug+' 2026 active code count');
 assert.equal(codes.length,areas,slug+' code count');
 assert.equal(new Set(codes).size,areas,slug+' duplicate region code');
 assert.deepEqual([...codes].sort(),active.map(e=>e.code).sort(),slug+' complete 2026 code coverage');
 assert(cfg.regions.every(r=>r.codes.length>=2),slug+' single-area regional quiz forbidden');
 assert(cfg.regions.every(r=>r.name&&/^[ぁ-ゖー]+$/.test(r.reading)),slug+' region name/reading');
 for(const e of active){
  assert(!allCodes.has(e.code),slug+' code duplicated across prefectures: '+e.code);
  allCodes.add(e.code);
  if(/[町村]$/.test(e.name)){
   const county=cfg.countyByCode?.[e.code]||cfg.countyByTown?.[e.name];
   assert(county&&county[0]&&/^[ぁ-ゖー]+$/.test(county[1]),slug+' missing readable county for '+e.code);
  }
 }
 for(const code of excluded)assert(expected.some(e=>e.code===code),slug+' excluded code not in 2026 index: '+code);
 const page=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const quiz=fs.readFileSync(path.join(dir,'quiz.html'),'utf8');
 assert(page.includes("key:'all',name:'全域'"),slug+' municipality overview lacks whole-area selection');
 assert(page.includes('cfg.regions.length!=='+regions),slug+' overview region-count runtime guard');
 assert(page.includes('new Set(codes).size!=='+areas),slug+' overview unique-code runtime guard');
 assert(page.includes('quiz.html?mode=1')&&page.includes('quiz.html?mode=2'),slug+' overview quiz links');
 assert(quiz.includes('data-region-config="./regions.json"'),slug+' quiz uses region config');
 assert(quiz.includes('quiz-app.js'),slug+' quiz uses shared runtime');
 assert(quiz.includes('id="prefReset"'),slug+' quiz includes prefecture zoom control');
 for(const suffix of ['','quiz.html?mode=1','quiz.html?mode=2'])
  assert(html.includes('href="/v2/municipalities/'+slug+'/'+suffix+'"'),slug+' nationwide directory link '+suffix);
 regionCount+=regions;areaCount+=areas;excludedCount+=excluded.size;
}
assert.equal(regionCount,270,'Nationwide learning regions');
assert.equal(areaCount,1898,'Nationwide quiz areas');
assert.equal(excludedCount,7,'Explicit non-municipal placeholder exclusions');
assert.equal(areaCount+excludedCount,idx.count,'Every 2026 source entry accounted for');
assert.equal(allCodes.size,1898,'All quiz codes globally unique');
const home=fs.readFileSync(path.join(root,'v2/index.html'),'utf8');
assert(home.includes('href="/v2/municipalities/"'),'V2 hub links to nationwide directory');
console.log('PASS nationwide 47 prefectures / 270 learning regions / 1898 quiz areas / 7 excluded placeholders: full directory, county, overview, quiz and code coverage');
