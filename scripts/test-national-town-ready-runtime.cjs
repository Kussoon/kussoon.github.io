'use strict';
// R-TOWN-00/06/12/13/30-35/44: verified input reaches the same nationwide
// rendering and scoring modules, without municipality-specific rules.
const assert=require('node:assert/strict');
const ready=require('../v2/common/js/town-svg-dataset-ready.js');
const runtime=require('../v2/common/js/town-svg-ready-runtime.js');
require('../v2/common/js/town-svg-quiz-state.js');
require('../v2/common/js/town-svg-quiz-choices.js');
const quizState=globalThis.KussoonTownSvgQuizState;
const quizChoices=globalThis.KussoonTownSvgQuizChoices;
const townNames=['本町','中央町','港町','山手町','飛び地町'];
const geometry={type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:[
 [[[0,0],[1,0],[1,1],[0,0]]],
 [[[5,5],[6,5],[6,6],[5,5]]]]}};
const raw={municipalityId:'jp-any',sourceFormat:'topojson',regions:['西部','東部'],
 records:townNames.map((name,i)=>({
  name,reading:null,communities:i===0?['西部']:[],geometry:{format:'geojson',data:
   i===4?geometry:{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[]}}}
 }))};
const townMetadata=Object.fromEntries(townNames.map((name,i)=>[name,{
 reading:'よみ'+i,communities:i===4?['西部','東部']:i<2?['西部']:['東部']
}]));
const regionReadings={'西部':'せいぶ','東部':'とうぶ'};
const dataset=ready.prepare({unified:raw,townMetadata,regionReadings});
let invocations=[],selected=[];
const render={renderPaths:arg=>{
 const values=arg.records.map(r=>({name:arg.nameOf(r),path:arg.pathOf(r),
  label:arg.ariaLabel(r)}));
 invocations.push(values);
 arg.onSelect(arg.nameOf(arg.records[0]));
 return values;
}};
const app=runtime.create({dataset,render,quizState,quizChoices});
assert.equal(app.active().length,5);
assert.equal(app.regions.length,2);
const drawing=app.renderCurrent({areas:{},pathFor:(g)=>g.data,onSelect:name=>selected.push(name)});
assert.equal(drawing.length,5);
assert.equal(drawing[4].path,geometry,'MultiPolygon must be retained by reference');
assert.equal(drawing[0].label,'本町（よみ0）');
assert.deepEqual(selected,['本町']);
assert.deepEqual(app.selectRegion('西部').map(x=>x.name),['本町','中央町','飛び地町']);
assert.deepEqual(app.names(),['本町','中央町','飛び地町']);
assert.equal(app.renderCurrent({areas:{},pathFor:g=>g.data,onSelect:()=>{}}).length,3);
const shuffle=values=>[...values];
const q1=app.startQuiz(1,shuffle);
assert.equal(q1.order.length,3);
assert.equal(quizState.question(q1),'本町');
assert.equal(quizState.mapAnswer(q1,'中央町').kind,'wrong');
assert.equal(q1.score,2);
const q2=app.startQuiz(2,shuffle);
assert.equal(q2.order.length,3);
const alternatives=app.choices('飛び地町',{distance:()=>1,shuffle});
assert.equal(alternatives.length,4);
assert.equal(new Set(alternatives).size,4);
assert(alternatives.includes('飛び地町'));
assert.equal(quizState.choiceAnswer(q2,'中央町',false).kind,'wrong');
assert.deepEqual(app.selectRegion('東部').map(x=>x.name),['港町','山手町','飛び地町']);
assert.throws(()=>app.selectRegion('架空'),/存在しない地域/);
assert.equal(app.currentRegion(),'東部','Invalid regions cannot mutate current scope');
app.selectRegion();
assert.equal(app.active().length,5);
assert.equal(app.town('飛び地町').geometry.data,geometry);
assert.equal(raw.records[4].communities.length,0,'source must remain unmodified');
assert.equal(invocations.length,2);
// Exact same connector accepts source SVG path geometry without city exceptions.
const svgRaw={municipalityId:'jp-svg-any',sourceFormat:'svg',regions:['中心'],
 records:[{name:'港',reading:'みなと',communities:['中心'],
  geometry:{format:'svg-path',data:'M0,0L3,0L0,3Z'}}]};
const svg=ready.prepare({unified:svgRaw,regionReadings:{'中心':'ちゅうしん'}});
const svgApp=runtime.create({dataset:svg,render,quizState,quizChoices});
assert.equal(svgApp.renderCurrent({areas:{},pathFor:g=>g.data,onSelect:()=>{}})[0].path,'M0,0L3,0L0,3Z');
assert.throws(()=>svgApp.choices('港',{distance:()=>0,shuffle}),/4択/);
console.log('PASS NATIONAL_TOWN_READY_RUNTIME: GeoJSON & SVG, multi-region, 4-choice, quiz 1/2, unchanged MultiPolygon');
