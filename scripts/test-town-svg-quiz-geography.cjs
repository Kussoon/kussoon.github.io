'use strict';
const assert=require('node:assert/strict');
const {create}=require('../v2/common/js/town-svg-quiz-geography.js');
const topology={objects:{town:{geometries:[
 {properties:{S_NAME:'A'},arcs:[[0,1,-3]]},
 {properties:{S_NAME:'B'},arcs:[[-2,3]]},
 {properties:{S_NAME:'C'},arcs:[[4],[5]]},
 {properties:{S_NAME:'D'},arcs:[[5]]}
]}}};
const feats=['A','B','C','D'].map((n,i)=>({properties:{S_NAME:n},center:[i,0]}));
const geo=create({topology,features:feats,geoCentroid:f=>f.center,geoDistance:(x,y)=>Math.abs(x[0]-y[0])});
assert.deepEqual([...geo.adjacency.get('A')].sort(),['B']);
assert.deepEqual([...geo.adjacency.get('B')].sort(),['A']);
assert.deepEqual([...geo.adjacency.get('C')].sort(),['D']);
assert.deepEqual([...geo.adjacency.get('D')].sort(),['C']);
assert.equal(geo.distanceFrom('A')('D'),3);
assert.throws(()=>geo.distanceFrom('missing'));
console.log('PASS quiz geography shared arc and distance contract');
