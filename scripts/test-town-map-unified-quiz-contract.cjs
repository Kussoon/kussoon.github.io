'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const b=fs.readFileSync('v2/common/js/takarazuka-svg-ssot-region-status-20261118-pilot.js','utf8');
const s=fs.readFileSync('v2/common/js/town-map-unified-quiz-takarazuka-20261118-pilot.js','utf8');
const h=fs.readFileSync('v2/takarazuka-town-svg-unified-quiz-state-20261118-pilot.html','utf8');
const n=fs.readFileSync('v2/nishinomiya-town-svg-master-v34-20261117-pilot.html','utf8');
assert.match(h,/src="\/v2\/common\/js\/town-svg-quiz-state\.js"/);
assert.match(h,/src="\/v2\/common\/js\/town-map-unified-quiz-takarazuka-20261118-pilot\.js"/);
for(const fn of ['begin','mapAnswer','choiceAnswer','reveal','markCorrect','next','result']){
 assert.ok(s.includes('KussoonTownSvgQuizState.'+fn),'shared method missing '+fn);
 assert.ok(n.includes('KussoonTownSvgQuizState.'+fn),'Nishinomiya reference missing '+fn);
}
for(const guard of ['function fit(','function render(','function updateLabels(','function showCommunity(','function buildAdjacency(','function startQuizBlink(']){
 assert.ok(s.includes(guard),'Takarazuka component regressed '+guard);
 const fragment=x=>x.slice(x.indexOf(guard),x.indexOf('}',x.indexOf(guard))+1);
 assert.equal(fragment(s),fragment(b),'non-quiz block changed '+guard);
}
assert.ok(!s.includes('function penalty('),'obsolete bespoke penalty helper');
console.log('PASS NATIONAL_SHARED_QUIZ: Takarazuka uses Nishinomiya-adopted quiz contract for all scoring transitions');
