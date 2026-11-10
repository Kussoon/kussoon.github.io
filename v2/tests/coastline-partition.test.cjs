#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const browser={window:{},document:{}};
vm.runInNewContext(read('v2/progressive-preview/municipality-renderer.js'),browser);
const renderer=browser.window.KussoonV2MunicipalRenderer;
const lines=[[[0,0],[1,0]],[[1,0],[2,0]],[[1,0],[0,0]],[[9,9],[10,10]]];
const parts=renderer.partitionArcs([{arcs:[[0,1]]},{arcs:[[-1,2]]}],lines);
assert.equal(JSON.stringify(parts.shared),JSON.stringify([lines[0]]));
assert.equal(JSON.stringify(parts.outer),JSON.stringify([lines[1],lines[2]]));
assert(!parts.shared.includes(lines[3])&&!parts.outer.includes(lines[3]),'unused arcs must not be rendered');
const progressive={window:{},document:{}};
vm.runInNewContext(read('v2/progressive-preview/national-progressive-labels.js'),progressive);
const classified=progressive.window.KussoonV2NationalProgressive.classifySegments([
 [[0,0],[1,0]],[[1,0],[0,0]],[[1,0],[1,1]]
]);
assert.equal(classified.shared.length,1);
assert.equal(classified.outer.length,1);
assert.equal(JSON.stringify(classified.shared[0]),JSON.stringify([[0,0],[1,0]]));
const geometry={window:{},performance:{now:()=>1}};
vm.runInNewContext(read('v2/progressive-preview/progressive-geometry.js'),geometry);
const points=Float64Array.from([0,0,1,0,1,0,0,0,1,0,1,1]);
const data={code:'28',points,rings:[
 {first:0,length:2,box:[0,0,1,0]},
 {first:4,length:2,box:[0,0,1,0]},
 {first:8,length:2,box:[1,0,1,1]}
],regions:[],arcCount:3,coastArcFlags:Uint8Array.from([0,0,1])};
const scene=geometry.window.KussoonProgressiveGeometry.buildScene({
 entries:[data],overview:{regions:[]},selection:null,projection:[1,0,1,0],
 clip:{x:-1,y:-1,w:4,h:4},selected:''
});
assert.equal((scene.border.match(/L/g)||[]).length,1,'shared edge is rendered once');
assert.equal((scene.coast.match(/L/g)||[]).length,1,'exterior edge is rendered once in the coastline layer');
assert(scene.border.includes('M0.0000,0.0000L1.0000,0.0000'));
assert(scene.coast.includes('M1.0000,0.0000L1.0000,1.0000'));
assert(!scene.border.includes('M1.0000,0.0000L1.0000,1.0000'));
assert(!scene.coast.includes('M0.0000,0.0000L1.0000,0.0000'));
const css=read('v2/municipalities/shared/quiz.css');
assert(css.includes('stroke:none')&&css.includes('vector-effect:non-scaling-stroke'));
assert(css.includes('stroke:#486574;stroke-width:2.4'));
function luminance(hex){const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
assert(contrast('#486574','#d8ebf7')>=3&&contrast('#486574','#f2f0dd')>=3);
console.log('PASS: TopoJSON arc groups and worker edge groups are exclusive; candidate A styles and 3:1 contrast hold.');
