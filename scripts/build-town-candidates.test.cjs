#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {fromRaw}=require('./build-town-candidates.cjs');
const feature=(id,name)=>({type:'Feature',id,properties:{S_NAME:name,KEY_CODE:id},geometry:{type:'Polygon',coordinates:[[[135,34],[135.01,34],[135.01,34.01],[135,34]]]}});
const input={type:'FeatureCollection',features:[feature('A01','中央町'),feature('A02','中央町'),feature('A03','小花一丁目')]};
const result=fromRaw('28217',input);
assert.equal(result.statisticalAreaCount,3);
assert.equal(result.distinctNameCandidates,2);
assert.deepEqual(result.duplicateNames,[{name:'中央町',statisticalAreaIds:['A01','A02']}]);
assert.equal(result.entries[0].reading,null);
assert.equal(result.status,'unverified-statistical-areas');
assert.equal(result.errors.length,0);
assert.ok(fromRaw('28217',{type:'FeatureCollection',features:[feature('X','')]}).errors.length>0);
assert.ok(fromRaw('28217',{type:'FeatureCollection',features:[feature('X','A'),feature('X','B')]}).errors.some(s=>s.includes('重複')));
assert.equal(fromRaw('28301',{type:'Topology',objects:{town:{geometries:[{properties:{R2KAxx_ID:7011,S_NAME:'大字候補'},type:'Polygon',arcs:[[0]]}]},city:{geometries:[{id:'217',type:'MultiPolygon',properties:{CITY_NAME:'猪名川町'},arcs:[]}] }},arcs:[]}).statisticalAreaCount,1);
assert.throws(()=>fromRaw('00000',input),/対象外/);
console.log('PASS: candidate import rejects malformed inputs, preserves district IDs, flags duplicate names, leaves readings unverified');
