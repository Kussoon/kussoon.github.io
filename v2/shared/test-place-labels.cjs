#!/usr/bin/env node
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function element(tag){
 return {tag,attrs:{},children:[],textContent:'',setAttribute(k,v){this.attrs[k]=v;},
 append(v){this.children.push(v);},remove(){this.removed=true;},
 querySelector(){return null;}};
}
const document={createElementNS(_,tag){return element(tag)}};
const context={window:{},document};
vm.runInNewContext(fs.readFileSync('v2/shared/place-labels.js','utf8'),context);
const labels=context.window.KussoonV2PlaceLabels;
assert(labels);
assert.equal(labels.normalize('  西 宮 市　'),'西宮市');
assert(labels.matches({name:'西宮市',code:'28204'},'西宮'));
assert(labels.matches({name:'豊田市',code:'23211'},'23211'));
assert(labels.matches({name:'豊田市',code:'23211',reading:'とよたし'},'とよた'));
assert(!labels.matches({name:'西宮市',code:'28204'},'神戸'));
const region={code:'28204',name:'西宮市',polys:[[[[135,34],[136,34],[136,35],[135,35],[135,34]]]]};
const pt=Array.from(labels.anchor(region.polys));
assert.equal(pt[0],135.5);assert.equal(pt[1],34.5);
let svg=element('svg');
assert.equal(labels.show({svg,regions:[region],project:x=>x,selected:'28204'}),1);
assert(svg.children[0].children[0].children[0].textContent==='西宮市');
assert.equal(labels.show({svg,regions:[region],project:x=>x}),0,'label should be opt-in when no selected region');

// An L-shaped ward has its bounding-box centre OUTSIDE the territory.
const lShape=[[[[0,0],[5,0],[5,1],[1,1],[1,5],[0,5],[0,0]]]];
const lpt=Array.from(labels.anchor(lShape));
assert(labels.insidePolygon(lpt,lShape[0]),'label must be within a concave municipality');
assert(lpt[0]<1.1||lpt[1]<1.1,'L-shape label must not fall in an adjoining territory');
// Small detached islands must not move the anchor away from the main island.
const islands=[[[[10,10],[14,10],[14,14],[10,14],[10,10]]],[[[40,40],[40.1,40],[40.1,40.1],[40,40.1],[40,40]]]];
assert.deepEqual(Array.from(labels.anchor(islands)),[12,12]);
// Polygon holes also cannot host a label.
const donut=[[[[0,0],[8,0],[8,8],[0,8],[0,0]],[[2,2],[6,2],[6,6],[2,6],[2,2]]]];
const dpt=Array.from(labels.anchor(donut));
assert(labels.insidePolygon(dpt,donut[0]),'label must avoid internal holes');
assert.equal(labels.anchor(donut),labels.anchor(donut),'stable cached anchor');
console.log('PASS Japanese name search and land-centered labels for concave boundaries, islands and holes');
