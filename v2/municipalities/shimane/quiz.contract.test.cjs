'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../../..');
const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'regions.json'),'utf8'));
const idx=JSON.parse(fs.readFileSync(path.join(root,'v2/progressive-preview/label-index.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'v2/data/national/2026-common/national-2026-pilot/manifest.json'),'utf8'));
const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const quiz=fs.readFileSync(path.join(__dirname,'quiz.html'),'utf8');
const app=fs.readFileSync(path.join(root,'v2/municipalities/shared/quiz-app.js'),'utf8');
const core=fs.readFileSync(path.join(root,'v2/municipalities/shared/regional-quiz.js'),'utf8');
const municipalities=idx.entries.filter(e=>e.pref==='32');
const codes=cfg.regions.flatMap(r=>r.codes);
assert.equal(cfg.prefecture,'32');assert.equal(cfg.name,'島根県');
assert.equal(cfg.expectedAreaCount,19);
assert.equal(idx.count,1905);
assert.equal(manifest.entries.find(e=>e.pref==='32').regions,19);
assert.equal(municipalities.length,19);
assert.deepEqual(cfg.regions.map(r=>r.name),['出雲','石見','隠岐']);
assert.deepEqual(cfg.regions.map(r=>r.codes.length),[6,9,4]);
assert.deepEqual(cfg.regions.map(r=>r.reading),['いずも','いわみ','おき']);
assert.equal(codes.length,19);assert.equal(new Set(codes).size,19);
assert.deepEqual([...codes].sort(),municipalities.map(e=>e.code).sort(),'All 19 municipalities covered exactly once');
assert(municipalities.every(e=>/^[ぁ-ゖー]+$/.test(e.reading)),'All municipality readings are present');
const towns=municipalities.filter(e=>!e.name.endsWith('市'));
assert.equal(towns.length,11);assert.equal(Object.keys(cfg.countyByTown).length,11);
const countyNames=[...new Set(Object.values(cfg.countyByTown).map(v=>v[0]))].sort();
assert.deepEqual(countyNames,['仁多郡','飯石郡','邑智郡','鹿足郡','隠岐郡'].sort());
for(const town of towns){
 const county=cfg.countyByTown[town.name];
 assert(county&&county[0].endsWith('郡')&&/^[ぁ-ゖー]+$/.test(county[1]),town.name+' requires county name and reading');
}
assert.equal(cfg.regionSource,'https://www.mhlw.go.jp/content/12300000/001490416.pdf');
assert.equal(cfg.countySource,'https://www.pref.shimane.lg.jp/infra/road/keikaku/doro_bosai/kinkyudoro.data/r7keikakusho.pdf');
assert(page.includes("cfg.countyByTown[item.name]"),'Municipality list includes county');
assert(page.includes("ruby.append(make('rt',region.reading))"),'Region selector shows readings');
assert(page.includes('quiz.html?mode=1')&&page.includes('quiz.html?mode=2'),'Both quiz modes linked');
assert(page.includes('id="regions"')&&page.includes('id="items"'),'Region and municipality list controls');
assert(page.includes('idx.count!==1905'),'Nationwide index invariant');
assert(quiz.includes('data-region-config="./regions.json"'),'Uses standard region config');
assert(quiz.includes('regional-quiz.js')&&quiz.includes('quiz-app.js'),'Uses common quiz runtime');
assert(quiz.includes('id="prefReset"')&&quiz.includes('id="retryMissed"'),'Prefecture fit and missed-question retry');
assert(quiz.includes('/common/site-footer.js'),'Common footer');
assert(app.includes('minZoom:0.25'),'Zoom-out remains available');
assert(app.includes('const COUNTY_BY_TOWN=config.countyByTown||{}'),'County name formatting inherited');
assert(app.includes("mode=query.get('mode')==='1'?1:2"),'Modes retained');
assert(core.includes('proximity')&&core.includes('wrongCodes'),'Shared quiz scoring and 4-choice logic intact');
// Each learning region has at least four municipalities, so the map quiz
// and four-choice quiz both have meaningful within-region alternatives.
assert(cfg.regions.every(r=>r.codes.length>=4),'Every region has at least four possible answers');
assert.deepEqual(cfg.regions.find(r=>r.key==='izumo').codes.sort(),
 ['32201','32203','32206','32209','32343','32386']);
assert.deepEqual(cfg.regions.find(r=>r.key==='iwami').codes.sort(),
 ['32202','32204','32205','32207','32441','32448','32449','32501','32505']);
const runtime={};
require('node:vm').runInNewContext(core,{window:runtime});
const all=municipalities.map(x=>({code:x.code,polys:[[[[Number(x.code)/100000,35],[Number(x.code)/100000+.01,35],[Number(x.code)/100000,35.01]]]]}));
const geometries=all.map(x=>({properties:{N03_007:x.code},arcs:[]}));
const picker=runtime.KussoonV2RegionalQuiz.proximity(all,geometries,{random:()=>.25});
for(const region of cfg.regions){
 const current=all.filter(x=>region.codes.includes(x.code));
 const correct=current[0];
 const options=picker.options(correct,current);
 assert.equal(options.length,4,region.name+' quiz 2 shows four choices');
 assert.equal(new Set(options.map(x=>x.code)).size,4,region.name+' quiz 2 options are unique');
 assert(options.some(x=>x.code===correct.code),region.name+' quiz 2 contains the right choice');
}
assert.deepEqual(cfg.regions.find(r=>r.key==='oki').codes.sort(),['32525','32526','32527','32528']);
console.log('Shimane V2: 19 municipalities, seven official regions, 11 counties, Izumo/Iwami/Oki 3-region quizzes, both quizzes: PASS');
