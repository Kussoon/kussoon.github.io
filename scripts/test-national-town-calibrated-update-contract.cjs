'use strict';
// R-TOWN-00/04/06/14: neutral geometry callback preserves proven label
// calibration and existing visibility without municipality-specific branching.
const assert=require('node:assert/strict');
const update=require('../v2/common/js/town-svg-label-update.js').update;
const labelsData=[{name:'区域甲',anchor:[1,2]}];
const calls=[],node={__data__:labelsData[0],style:{display:'none'},dataset:{visible:'existing'}};
const sel={
 attr(name,value){calls.push(['attr',name,value]);return this},
 selectAll(name){calls.push(['select',name]);return this},
 style(name,value){calls.push(['style',name,value]);return this},
 nodes(){return [node]}
};
const labels={selectAll(name){calls.push(['root',name]);return sel}};
let geometryCount=0;
update({labels,transform:{k:1.25},fs:10,readingOn:false,
 candidateMode:false,preserveVisibility:true,
 geometryUpdate:({fs})=>{assert.equal(fs,10);geometryCount++;calls.push(['calibrated'])}});
assert.equal(geometryCount,1);
assert.equal(node.style.display,'none','calibrated visibility is preserved');
assert.equal(node.dataset.visible,'existing','no unwanted visibility attributes');
assert.ok(!calls.some(x=>x[0]==='attr'&&x[1]==='transform'),'no unapproved transform replaces calibration');
assert.equal(calls[1][0],'calibrated','calibrated layout first');
assert.throws(()=>update({labels,transform:{k:1},fs:8,readingOn:true,geometryUpdate:123}),TypeError);
console.log('PASS NATIONAL_TOWN_CALIBRATED_LABEL_UPDATE');
