#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=JSON.parse(read('data/amagasaki-town-svg-v2-20261116.json'));
const markup=read('amagasaki-town-svg-connected-20261116.html');
const code=read('common/js/amagasaki-town-svg-connected-20261116.js');
const auto=read('common/js/town-svg-auto-labels.js'),helper=read('common/js/amagasaki-connected-town-labels-20261116.js');
const win={};vm.runInNewContext(auto,{window:win});vm.runInNewContext(helper,{window:win});new vm.Script(code);
assert.equal(json.towns.length,140);
assert.equal(new Set(json.towns.map(t=>t.name)).size,140);
let count=0;
for(const town of json.towns){
 const rings=win.KussoonAutoTownLabels.parse(town.d);
 const filled=p=>rings.reduce((n,r)=>n+(win.KussoonAutoTownLabels.contains(r,p)?1:0),0)%2===1;
 const candidates=win.KussoonConnectedTownLabels.representative(town.d,win.KussoonAutoTownLabels,filled,1365000);
 assert.equal(candidates.length,1,town.name+' should have ONE label, chome are not islands');
 count+=candidates.length;
}
assert.equal(count,140);
for(const name of ['塚口町','塚口本町','南塚口町','富松町','船出','西海岸町']){
 const town=json.towns.find(t=>t.name===name);assert(town,'required town '+name);
}
assert(markup.includes('town{paint-order:stroke fill}'),'internal chome boundaries must not be emphasized');
assert(markup.includes('amagasaki-connected-town-labels-20261116.js'));
assert(markup.includes('amagasaki-town-svg-connected-20261116.js'));
assert(markup.includes('更新：2026/11/16 16:34:52（JST）'));
assert(!markup.includes('/amagasaki/town-search.html'));
assert(code.includes('function updateLabels()'));
assert(code.includes('KussoonConnectedTownLabels.representative'));
assert(code.includes('t.pathEl.isPointInFill(probe)'));
for(const id of ['zoomIn','zoomOut','larger','smaller','size','reset','reading','fullscreen','quizOne','quizTwo'])
 assert(markup.includes('id="'+id+'"'));
console.log('PASS 140/140 town labels; chome connected; SVG holes excluded; controls preserved.');
