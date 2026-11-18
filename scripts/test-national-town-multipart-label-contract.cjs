'use strict';
// Contract tests only. No changes to accepted Nishinomiya/Takarazuka pages.
const assert=require('node:assert/strict');
const contract=require('../v2/common/js/town-svg-multipart-label-contract.js');
const old=require('../v2/common/js/town-svg-labels.js');
const approved={
 '塩瀬町名塩':[[34.844983,135.29825],[34.8213,135.292587]],
 '山口町上山口':[[34.8245,135.2450],[34.814562,135.241245]]
};
const projection=([lon,lat])=>[lon*10,lat*10];
for(const [name,positions] of Object.entries(approved)){
 const legacy=old.positions({properties:{S_NAME:name}},{
  nameProperty:'S_NAME',multiLabels:{[name]:positions},projection,projectedAt:()=>{throw Error('must not fall through')}
 });
 const normalized=contract.fromApproved({name,reading:'検査用',positions:legacy});
 assert.equal(normalized.length,2);
 assert.deepEqual(normalized.map(x=>x.point),legacy.map(x=>x.point));
 assert.deepEqual(normalized.map(x=>x.offset),legacy.map(x=>x.offset));
 assert.deepEqual(normalized.map(x=>x.secondary),[false,true]);
 assert.equal(new Set(normalized.map(x=>x.key)).size,2);
}
const downstream=old.positions({properties:{S_NAME:'山口町下山口'}},{
 nameProperty:'S_NAME',projection,projectedAt:()=>[1,2],
 extraLabels:{'山口町下山口':[[34.830141,135.262235]]}
});
assert.deepEqual(contract.fromApproved({name:'山口町下山口',positions:downstream})
 .map(x=>x.point),downstream.map(x=>x.point));
const path='M0,0L10,0L10,10L0,10Z M20,0L30,0L30,10L20,10Z';
const tinyAuto={candidates:(p,filled,area)=>{
 assert.equal(p,path);assert.equal(area,1000);
 assert.equal(filled([5,5]),true);
 return [{point:[5,5],area:100},{point:[25,5],area:100}];
}};
const derived=contract.fromSvg({name:'切畑',reading:'きりはた',path,
 isFilled:()=>true,viewBoxArea:1000,autoLabels:tinyAuto});
assert.equal(derived.length,2);
assert.deepEqual(derived.map(x=>x.secondary),[false,true]);
assert.deepEqual(derived.map(x=>x.key),['切畑:component:0','切畑:component:1']);
assert.deepEqual(derived.map(x=>x.point),[[5,5],[25,5]]);
assert.throws(()=>contract.normalize({name:'重複',candidates:[
 {point:[1,2],key:'same'},{point:[3,4],key:'same'}]}),/重複/);
assert.throws(()=>contract.normalize({name:'不正',candidates:[{point:[NaN,2]}]}),/座標/);
const bbox={x:3,y:4,width:10,height:20};
const ctm={a:2,b:0,c:0,d:3,e:5,f:7};
const el={getBBox:()=>bbox,getScreenCTM:()=>ctm};
const doc={createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>({width:0,height:0})})};
assert.deepEqual(contract.glyphScreenRect(el,doc),{
 left:11,right:31,top:19,bottom:79,width:20,height:60
});
const exact={left:2,right:8,top:1,bottom:9,width:6,height:8};
assert.equal(contract.glyphScreenRect({},{
 createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>exact})
}),exact);
console.log('PASS NATIONAL_MULTIPART_LABEL_CONTRACT: existing approved multi-label points, SVG candidate adapter, glyph Range fallback');
