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
console.log('PASS Japanese name/reading/code search normalization, polygon anchor, SVG label content');
