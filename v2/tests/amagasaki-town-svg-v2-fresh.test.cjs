#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('data/amagasaki-town-svg-v2-20261116.json'));
const html=read('amagasaki-town-svg-v2-fresh-20261116.html');
const script=read('common/js/amagasaki-town-svg-v2-20261116.js');
const labels=read('common/js/town-svg-auto-labels.js');
assert.equal(data.municipalityCode,'28202');
assert.equal(data.towns.length,140);
assert.equal(new Set(data.towns.map(t=>t.name)).size,140);
assert(data.towns.every(t=>t.reading&&t.d&&Array.isArray(t.communities)&&t.communities.length===0));
assert(!html.includes('/amagasaki/town-search.html')&&!script.includes('/amagasaki/town-search.html'),'Old page must not load');
assert(!html.includes('takarazuka-svg-controls-narrow-pilot.js'));
assert(html.includes('amagasaki-town-svg-v2-20261116.js'));
assert(html.includes('2026/11/16 15:26:27（JST）'));
for(const id of ['map','areas','labels','zoomIn','zoomOut','larger','smaller','size','reset','reading','fullscreen','quizOne','quizTwo','quizPanel','quizResults'])
 assert(html.includes('id="'+id+'"'),'missing '+id);
assert(html.includes('.full{width:49px;min-height:27px'));
assert(script.includes('positions.find(filled)'));
new vm.Script(script);
const window={};vm.runInNewContext(labels,{window});
let standard=0,fallback=0;
for(const t of data.towns){
 const rings=window.KussoonAutoTownLabels.parse(t.d);
 assert(rings.length>0,'Invalid geometry '+t.name);
 const filled=p=>rings.reduce((n,r)=>n+(window.KussoonAutoTownLabels.contains(r,p)?1:0),0)%2===1;
 const candidates=window.KussoonAutoTownLabels.candidates(t.d,filled,1365000);
 if(candidates.length){standard++;continue;}
 const xs=rings.flatMap(r=>[r.bbox.x,r.bbox.x+r.bbox.width]);
 const ys=rings.flatMap(r=>[r.bbox.y,r.bbox.y+r.bbox.height]);
 const b={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
 const probes=[[b.x+b.width/2,b.y+b.height/2]];
 for(let y=1;y<=15;y++)for(let x=1;x<=15;x++)probes.push([b.x+b.width*x/16,b.y+b.height*y/16]);
 assert(probes.some(filled),'No fallback candidate for '+t.name);
 fallback++;
}
assert.equal(standard+fallback,140);
console.log('Amagasaki V2 geometry and static contracts PASS: 140 towns, auto '+standard+', fallback '+fallback);
