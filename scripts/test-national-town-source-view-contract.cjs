'use strict';
const assert=require('node:assert/strict');
const {create}=require('../v2/common/js/town-svg-source-view.js');
function feature(name,type,coords){return {type:'Feature',properties:{S_NAME:name},geometry:{type,coordinates:coords}}}
const multipolygon=feature('分離町','MultiPolygon',[
 [[[0,0],[2,0],[2,2],[0,2],[0,0]],[[.2,.2],[.8,.2],[.8,.8],[.2,.8],[.2,.2]]],
 [[[4,4],[5,4],[5,5],[4,5],[4,4]]]
]);
const polygon=feature('中心町','Polygon',[[[0,0],[1,0],[1,1],[0,1],[0,0]]]);
const topo={municipalityId:'test-topo',sourceFormat:'topojson',regions:['東','西'],
 records:[{name:'分離町',reading:null,communities:[],geometry:{format:'geojson',data:multipolygon}},
 {name:'中心町',reading:null,communities:['東'],geometry:{format:'geojson',data:polygon}}]};
const missing=create(topo);
assert.equal(missing.validation.unresolvedMembership.length,1);
assert.equal(missing.validation.unresolvedReading.length,2);
assert.equal(missing.validation.unresolvedCandidates.length,2);
assert.strictEqual(missing.records[0].geometry.data,multipolygon,'do not reproject or simplify geometry');
assert.equal(missing.records[0].geometry.data.geometry.coordinates[0].length,2,'inner ring retained');
assert.equal(missing.records[0].geometry.data.geometry.coordinates.length,2,'disconnected components retained');
assert.throws(()=>create(topo,{requireMembership:true}),/未解決/);
const approved=[{key:'分離町:0',point:[12.1,30],provenance:'approved'},
 {key:'分離町:1',point:[19,35],provenance:'approved'}];
const verified=create(topo,{
 memberships:{'分離町':['東','西']},readings:{'分離町':'ぶんりまち','中心町':'ちゅうしんまち'},
 candidates:{'分離町':approved,'中心町':[{point:[2,3],provenance:'approved'}]},
 requireMembership:true,requireCandidates:true
});
assert.deepEqual(verified.records[0].communities,['東','西']);
assert.strictEqual(verified.records[0].geometry.data,multipolygon);
assert.strictEqual(verified.records[0].candidates[0],approved[0]);
assert.equal(verified.validation.suppliedCandidateCount,3);
assert.deepEqual(verified.validation.unresolvedCandidates,[]);
assert.throws(()=>create(topo,{memberships:{'分離町':['未存在']}}),/不正/);
assert.throws(()=>create(topo,{memberships:{'分離町':['東','東']}}),/不正/);
assert.throws(()=>create(topo,{readings:{'存在しない町':'ふめい'}}),/存在しない町名/);
assert.throws(()=>create(topo,{candidates:{'分離町':[{point:[0,1],provenance:'guessed'}]}}),/出典/);
assert.throws(()=>create(topo,{candidates:{'分離町':[{point:[0,1],provenance:'approved',key:'a'},
 {point:[0,2],provenance:'approved',key:'a'}]}}),/重複/);
const svg={municipalityId:'test-svg',sourceFormat:'svg',regions:['中部'],
 records:[{name:'穴のある町',reading:'あなのあるまち',communities:['中部'],geometry:{format:'svg-path',data:'M0,0L6,0L6,6Z M2,2L3,2L3,3Z'}}]};
const ss=create(svg,{candidates:{'穴のある町':[{point:[1,1],provenance:'geometry-derived'}]},requireMembership:true,requireCandidates:true});
assert.strictEqual(ss.records[0].geometry,svg.records[0].geometry,'path object retained verbatim');
assert.equal(ss.records[0].geometry.data,svg.records[0].geometry.data,'both path rings remain');
assert.equal(ss.validation.suppliedCandidateCount,1);
console.log('PASS NATIONAL_TOWN_SOURCE_VIEW_CONTRACT: untouched polygon/hole, svg rings, missing metadata, explicit provenance, unknown names and bad regions rejected');
