#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const d=JSON.parse(read('data/amagasaki-town-svg-v2-20261116.json'));
const auto=read('common/js/town-svg-auto-labels.js');
const connected=read('common/js/amagasaki-connected-town-labels-centroid-20261116.js');
const html=read('amagasaki-town-svg-centroid-20261116.html');
const win={};vm.runInNewContext(auto,{window:win});vm.runInNewContext(connected,{window:win});
assert.equal(d.towns.length,140);
const result=new Map();
for(const t of d.towns){
 const rings=win.KussoonAutoTownLabels.parse(t.d);
 const filled=p=>rings.reduce((n,r)=>n+(win.KussoonAutoTownLabels.contains(r,p)?1:0),0)%2===1;
 const positions=win.KussoonConnectedTownLabels.representative(t.d,win.KussoonAutoTownLabels,filled,1365000);
 assert.equal(positions.length,1,'one connected-label per town: '+t.name);
 assert(positions.every(c=>filled(c.point)),'anchor outside town: '+t.name);
 result.set(t.name,positions[0].point);
}
const east=result.get('東難波町');
assert(east[1]>680&&east[1]<730,'East Nanibacho should be near town area-weighted center');
assert(html.includes('/v2/common/js/amagasaki-connected-town-labels-centroid-20261116.js'));
assert(html.includes('2026/11/16 16:47:56（JST）'));
assert(!html.includes('/amagasaki/town-search.html'));
console.log('PASS: 140 town label anchors within filled shapes, connected chome, East Nanibacho central.');
