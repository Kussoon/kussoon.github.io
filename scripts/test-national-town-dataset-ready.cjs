'use strict';
const assert=require('node:assert/strict');
const {prepare}=require('../v2/common/js/town-svg-dataset-ready.js');
const multi={type:'Feature',properties:{name:'飛び地町'},geometry:{type:'MultiPolygon',coordinates:[
 [[[0,0],[2,0],[2,2],[0,0]]],
 [[[5,5],[6,5],[6,6],[5,5]]]
]}};
const base={
 municipalityId:'jp-test-example',sourceFormat:'topojson',regions:['中央','北部'],
 records:[
  {name:'本町',reading:null,communities:['中央'],geometry:{format:'geojson',data:{
   type:'Feature',geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},properties:{name:'本町'}}}},
  {name:'飛び地町',reading:null,communities:[],geometry:{format:'geojson',data:multi}}
 ]
};
const metadata={'本町':{reading:'ほんまち'},'飛び地町':{reading:'とびちちょう',communities:['中央','北部']}};
const regionReadings={'中央':'ちゅうおう','北部':'ほくぶ'};
const ready=prepare({unified:base,townMetadata:metadata,regionReadings});
assert.equal(ready.records.length,2);
assert.deepEqual([...ready.records[1].communities],['中央','北部']);
assert.equal(ready.records[1].geometry.data,multi,'geometry object must survive verbatim');
assert.equal(ready.records[1].geometry.data.geometry.type,'MultiPolygon');
assert.equal(ready.regions[1].reading,'ほくぶ');
assert.equal(base.records[1].reading,null,'source must remain unmodified');
assert.equal(base.records[1].communities.length,0,'source must remain unmodified');
assert(Object.isFrozen(ready)&&Object.isFrozen(ready.records[0]));
const svg={
 municipalityId:'jp-svg-example',sourceFormat:'svg',regions:['南部'],
 records:[{name:'港町',reading:'みなとまち',communities:['南部'],
 geometry:{format:'svg-path',data:'M0,0L1,0L0,1Z'}}]
};
assert.equal(prepare({unified:svg,regionReadings:{'南部':'なんぶ'}}).records[0].reading,'みなとまち');
function bad(edit,part){
 const data=structuredClone(base),meta=structuredClone(metadata),regions=structuredClone(regionReadings);
 edit(data,meta,regions);
 assert.throws(()=>prepare({unified:data,townMetadata:meta,regionReadings:regions}),part);
}
bad((d,m)=>{delete m['本町'].reading},/読みが未確認/);
bad((d,m)=>{m['飛び地町'].communities=['架空']},/地域所属/);
bad((d,m)=>{m['余分な町']={reading:'よぶん',communities:['中央']}},/対象外/);
bad((d,m)=>{m['飛び地町'].communities=['中央','中央']},/重複/);
bad((d,m,r)=>{delete r['北部']},/読みが未確認/);
bad((d,m)=>{d.records[0].reading='べつのよみ'},/一致しません/);
bad((d,m)=>{d.records[1].communities=['北部'];m['飛び地町'].communities=['中央','北部']},/一致しません/);
bad((d,m)=>{d.records[1].geometry={format:'geojson',data:{type:'Feature',geometry:null}}},/図形/);
bad((d,m)=>{d.records.push(structuredClone(d.records[0]))},/重複/);
console.log('PASS TOWN_DATASET_READY: SVG/TopoJSON, 2-region split, MultiPolygon preservation, no guessing, nine rejection cases');
