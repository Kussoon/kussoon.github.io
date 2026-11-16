#!/usr/bin/env node
'use strict';
// Exact data audit for Nishinomiya SVG V2. Requires the original city data
// checked out/downloaded at /nishinomiya/data/community-town-map.json.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const top=read('v2/data/nishinomiya-town-v2-premerged.topojson');
const ex=read('v2/data/nishinomiya-uekoto-community.topojson');
const comm=read('nishinomiya/data/community-town-map.json');
assert.equal(top.type,'Topology');assert.equal(ex.type,'Topology');
const shapes=top.objects.town.geometries;
assert.equal(shapes.length,321);
const names=shapes.map(g=>g.properties.S_NAME);
assert.equal(new Set(names).size,321,'duplicate town geometry name');
assert(names.every(name=>typeof name==='string'&&name.length));
assert.equal(comm.communities.length,26);
assert.equal(new Set(comm.communities).size,26);
const group=name=>String(name).replace(/[一二三四五六七八九十百]+丁目$/,'');
const mapped=new Map();
for(const [name,row] of Object.entries(comm.towns)){
 const k=group(name);if(!mapped.has(k))mapped.set(k,new Set());
 mapped.get(k).add(row.community);
}
const missing=names.filter(name=>!mapped.has(name));
assert.deepEqual(missing,[],'towns with no community membership');
const unused=[...mapped.keys()].filter(name=>!names.includes(name));
assert.deepEqual(unused,['重要湾口尼崎，西宮，芦屋港'],'only documented non-town statistical region may be unmapped');
assert(mapped.get('上甲東園').has('上ヶ原')&&mapped.get('上甲東園').has('甲東'));
assert(mapped.get('岡田山').has('1〜3 広田、4〜7 上ヶ原'));
const parts=ex.objects.town.geometries;
assert.equal(parts.length,6,'special split geometry count');
for(const region of ['上ヶ原','甲東']){
 const n=parts.filter(g=>g.properties.community===region).length;
 assert.equal(n,region==='上ヶ原'?4:2,region+' shape count');
}
function checkArcs(topology){
 const max=topology.arcs.length,visit=x=>{
  if(Array.isArray(x)){for(const y of x)visit(y);return}
  assert(Number.isInteger(x),'non-integer TopoJSON arc reference');
  const id=x<0?~x:x;assert(id>=0&&id<max,'invalid TopoJSON arc index '+id);
 };
 for(const geom of topology.objects.town.geometries)visit(geom.arcs);
}
checkArcs(top);checkArcs(ex);
console.log('PASS: 321 unique TopoJSON towns; 26 communities; all towns mapped; six special town geometries; arc references valid.');
console.log('NOTE: non-town metadata entry '+unused.join(',')+' is excluded from the 321 plotted towns.');
