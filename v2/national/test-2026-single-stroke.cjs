#!/usr/bin/env node
'use strict';
// Lightweight 2026 rendering regression: synthetic DOM, no network/no browser.
// Protects single-stroke SVG and forbids adding the 29,440-edge overlay to the map.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'v2/national/official-2026-nationwide-pilot.html'),'utf8');
const renderer=fs.readFileSync(path.join(root,'v2/shared/municipality-renderer.js'),'utf8');
class Element{
 constructor(name){this.name=name;this.attrs={};this.children=[];this.dataset={};}
 setAttribute(k,v){this.attrs[k]=String(v);}
 append(x){if(x instanceof Fragment)this.children.push(...x.children);else this.children.push(x);}
 replaceChildren(...nodes){this.children=nodes.flatMap(x=>x instanceof Fragment?x.children:[x]);}
}
class Fragment{constructor(){this.children=[];}append(x){this.children.push(x);}}
const document={createElementNS:(_,name)=>new Element(name),createDocumentFragment:()=>new Fragment()};
const ctx={window:{},document};vm.runInNewContext(renderer,ctx,{filename:'municipality-renderer.js'});
const draw=ctx.window.KussoonV2MunicipalRenderer.render;
const map=new Element('svg');
const regions=[
 {code:'10101',name:'甲',polys:[[[[0,0],[1,0],[1,1],[0,1],[0,0]]]]},
 {code:'10102',name:'乙',polys:[[[[1,0],[2,0],[2,1],[1,1],[1,0]]]]}
];
const arcs=[[[0,0],[1,0],[2,0]],[[1,0],[1,1]]];
const proj=p=>[p[0]*100,p[1]*100];
const count=draw({map,regions,arcs,project:proj,selected:'10101'});
assert.equal(count,2);
assert.equal(map.children.length,3,'two fill paths plus exactly one shared border path');
assert.deepEqual(map.children.map(x=>x.attrs.class),['land chosen','land','borders']);
assert.equal(map.children.filter(x=>x.attrs.class==='borders').length,1);
assert.equal(map.children.find(x=>x.attrs.class==='borders').attrs['pointer-events'],'none');
assert(!map.children.filter(x=>x.attrs.class==='land').some(x=>'stroke' in x.attrs),'polygon shapes must not receive added border strokes');
const borderPath=map.children.find(x=>x.attrs.class==='borders').attrs.d;
draw({map,regions,arcs,project:proj,selected:'10102'});
assert.equal(map.children.length,3,'rerender must replace the old border rather than append overlays');
assert.equal(map.children.find(x=>x.attrs.class==='borders').attrs.d,borderPath);
assert.deepEqual(map.children.map(x=>x.attrs.class),['land','land chosen','borders']);
assert(html.includes('.borders{fill:none;stroke:white;stroke-width:.9;vector-effect:non-scaling-stroke;'),'border width must not scale with zoom');
assert(html.includes('KussoonV2MunicipalRenderer.render({map:'),'2026 pilot must use shared renderer');
assert(!html.includes('prefecture-seam-national-visual.js'),'do not pull comparison page into main pilot');
assert(html.includes('noindex,follow'));
console.log('PASS: 2026 rendering uses 2 fill-only polygons + exactly 1 border SVG path, selection rerender replaces DOM, constant screen-width stroke, no comparison overlay.');
