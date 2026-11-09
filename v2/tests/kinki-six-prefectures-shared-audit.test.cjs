'use strict';
// Cross-prefecture data and user-interface regression checks for the five
// prefectures served by the shared V2 municipality quiz app.
// Hyogo's original quiz lives in the separate Kussoon/hyogo repository.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../..');
const prefectures=[
 {slug:'shiga',code:'25',regions:6,areas:19,counties:6},
 {slug:'kyoto',code:'26',regions:8,areas:36,counties:11},
 {slug:'osaka',code:'27',regions:8,areas:72,counties:10},
 {slug:'nara',code:'29',regions:5,areas:39,counties:27},
 {slug:'wakayama',code:'30',regions:7,areas:30,counties:21,excluded:['30000']}
];
const index=JSON.parse(fs.readFileSync(path.join(root,'v2/progressive-preview/label-index.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'v2/data/national/2026-common/national-2026-pilot/manifest.json'),'utf8'));
const quizRuntime=fs.readFileSync(path.join(root,'v2/municipalities/shared/quiz-app.js'),'utf8');
const quizCore=fs.readFileSync(path.join(root,'v2/municipalities/shared/regional-quiz.js'),'utf8');
const quizCss=fs.readFileSync(path.join(root,'v2/municipalities/shared/quiz.css'),'utf8');
assert.equal(index.count,1905);
assert(!quizCss.includes('\\n#rangeChoices'),'Regional selector styles must be separate CSS rules, not literal \\n');
assert(quizCss.includes('#rangeChoices button rt{font-size:.7em'),'Ruby selector keeps furigana legible');
assert(quizRuntime.includes('minZoom:0.25'),'Minus/pinch must shrink below first fit');
assert(quizRuntime.includes("const prefectureSuffix=/[都道府県]$/"),'Prefecture suffix must be automatic');
assert(quizRuntime.includes('const excluded=new Set(config.excludedAreaCodes||[])'),'Non-municipality exclusions opt-in only');
assert(quizRuntime.includes("byId('reset').onclick=()=>fitMap(current)"),'Region reset retained');
assert(quizRuntime.includes("byId('prefReset').onclick=()=>fitMap(all,true)"),'Prefecture reset retained');
assert(quizRuntime.includes("rt.textContent=region.reading"),'Every region button renders ruby');
assert(quizRuntime.includes('const result=Core.answer(session,code)'),'Shared scoring retained');
assert(quizRuntime.includes('proximity.options(item,current)'),'Geographic four-choice remains');
assert(quizRuntime.includes('const result=Core.finish(session)'),'Shared results retained');
assert(quizCore.includes('proximity')&&quizCore.includes('wrongCodes'),'Shared distractors and wrong-answer tracking retained');
let total=0;
for(const p of prefectures){
 const home=path.join(root,'v2/municipalities',p.slug);
 const cfg=JSON.parse(fs.readFileSync(path.join(home,'regions.json'),'utf8'));
 const overview=fs.readFileSync(path.join(home,'index.html'),'utf8');
 const quiz=fs.readFileSync(path.join(home,'quiz.html'),'utf8');
 const excluded=new Set(cfg.excludedAreaCodes||[]);
 const allIndex=index.entries.filter(e=>e.pref===p.code);
 const areas=allIndex.filter(e=>!excluded.has(e.code));
 const codes=cfg.regions.flatMap(r=>r.codes);
 const expected=areas.map(e=>e.code);
 assert.equal(cfg.prefecture,p.code,p.slug+' prefecture code');
 assert.equal(cfg.expectedAreaCount,p.areas,p.slug+' configured count');
 assert.equal(cfg.regions.length,p.regions,p.slug+' region count');
 assert.equal(areas.length,p.areas,p.slug+' index count');
 assert.equal(allIndex.length,manifest.entries.find(e=>e.pref===p.code).regions,p.slug+' manifest count');
 assert.deepEqual([...codes].sort(),expected.sort(),p.slug+' codes cover every municipality exactly once');
 assert.equal(new Set(codes).size,p.areas,p.slug+' no duplicate code');
 assert.deepEqual([...(cfg.excludedAreaCodes||[])].sort(),[...(p.excluded||[])].sort(),p.slug+' exclusions');
 assert(cfg.regions.every(r=>/^[ぁ-ゖー]+$/.test(r.reading)),p.slug+' region furigana complete');
 assert(areas.every(e=>/^[ぁ-ゖー]+$/.test(e.reading)),p.slug+' municipality furigana complete');
 const towns=areas.filter(e=>!e.name.endsWith('市')&&!e.name.endsWith('区'));
 assert.equal(towns.length,p.counties,p.slug+' number of towns and villages');
 assert.equal(Object.keys(cfg.countyByTown||{}).length,p.counties,p.slug+' county mappings');
 for(const town of towns){
  const row=cfg.countyByTown[town.name];
  assert(row&&row[0].endsWith('郡')&&/^[ぁ-ゖー]+$/.test(row[1]),p.slug+' county furigana: '+town.name);
 }
 assert(overview.includes('cfg.countyByTown[e.name]')||overview.includes('cfg.countyByTown[item.name]'),
  p.slug+' lists must show county names, not only quiz questions');
 assert(overview.includes('ruby.append(make(\'rt\',r.reading))')||
  overview.includes('ruby.append(make(\'rt\',region.reading))'),p.slug+' region picker ruby');
 assert(overview.includes('quiz.html?mode=1')&&overview.includes('quiz.html?mode=2'),p.slug+' links to both quizzes');
 assert(quiz.includes('data-region-config="./regions.json"'),p.slug+' shared configuration');
 assert(quiz.includes('regional-quiz.js')&&quiz.includes('quiz-app.js'),p.slug+' common quiz engine');
 assert(quiz.includes('id="prefReset"')&&quiz.includes('id="reset"'),p.slug+' both map reset controls');
 assert(quiz.includes('id="retryMissed"')&&quiz.includes('id="returnRegions"'),p.slug+' scoring/retry controls');
 assert(quiz.includes('/common/site-footer.js'),p.slug+' standard footer');
 total+=p.areas;
}
assert.equal(total,196);
console.log('Kinki V2 five-prefecture shared quiz audit: PASS ('+total+' municipalities, all readings/counties/quiz controls)');
