#!/usr/bin/env node
// V2 shared renderer: DOM-free regression via a minimal SVG DOM stub.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function element(tag){
 return {tag,attrs:{},children:[],dataset:{},setAttribute(k,v){this.attrs[k]=String(v);},
  append(child){this.children.push(child);}};
}
let map={children:[],replaceChildren(node){this.children=node.children;}};
const document={createElementNS(_,tag){return element(tag);},
 createDocumentFragment(){return element('fragment');}};
const context={window:{},document};vm.runInNewContext(fs.readFileSync('v2/shared/municipality-renderer.js','utf8'),context);
const renderer=context.window.KussoonV2MunicipalRenderer;
assert(renderer);
const regions=[
 {code:'21001',name:'A',polys:[[[[0,0],[1,0],[1,1],[0,0]]]]},
 {code:'21002',name:'B',polys:[[[[1,0],[2,0],[2,1],[1,0]]]]}
];
const arcs=[[[0,0],[1,0]],[[1,0],[1,1]],[[1,0],[2,0]]];
renderer.render({map,regions,arcs,project:([x,y])=>[x*20,y*20],selected:'21002'});
assert.equal(map.children.length,3,'two fill paths and one shared-border path');
assert.equal(map.children[0].attrs.class,'land');
assert.equal(map.children[1].attrs.class,'land chosen');
assert.equal(map.children[2].attrs.class,'borders');
assert.equal(map.children[1].attrs.stroke,undefined,'no extra selection outline');
assert.equal(map.children[2].attrs['pointer-events'],'none','border must not block taps');
assert.equal(map.children[2].attrs.d,'M0.00,0.00L20.00,0.00M20.00,0.00L20.00,20.00M20.00,0.00L40.00,0.00');
assert.equal(map.children[1].dataset.code,'21002');
const pages=['tokai-four','kyushu-prefecture','kyushu-okinawa-eight'];
for(const name of pages){
 const html=fs.readFileSync('v2/national/official-2026-'+name+'-20m-trial.html','utf8');
 assert(html.includes('<script src="../shared/municipality-renderer.js"></script>'),name+' missing shared script');
 assert(html.includes('KussoonV2MunicipalRenderer.render({map,regions,arcs:current.arcs,project:proj,selected})'),name+' missing call');
 assert(!html.includes('function shape(polys,proj)'),name+' duplicate shape');
 assert(!html.includes('function outline(arcs,proj)'),name+' duplicate outline');
 assert(html.includes('item={regions,arcs,box:b'),name+' missing arcs cache');
 assert(!html.includes('selected-outline'),name+' double stroke');
 const scripts=html.match(/<script>([\s\S]*?)<\/script>/g)||[];
 for(const s of scripts)new vm.Script(s.replace(/^<script>/,'').replace(/<\/script>$/,''));
 console.log('PASS '+name+' uses shared V2 renderer');
}
console.log('PASS common municipal boundary rendered once and selected fill only');
