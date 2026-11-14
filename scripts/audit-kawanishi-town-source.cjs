#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const topo=JSON.parse(fs.readFileSync('v2/data/towns/kawanishi-2020.topojson','utf8'));
const kana=JSON.parse(fs.readFileSync('v2/data/towns/kawanishi-readings-abr-20260623.json','utf8'));
const addressList=JSON.parse(fs.readFileSync('v2/data/towns/kawanishi-official-address-list-check.json','utf8'));
assert.equal(topo.type,'Topology');
assert.ok(topo.objects.town&&Array.isArray(topo.objects.town.geometries));
const rows=topo.objects.town.geometries;
assert.equal(rows.length,191);
assert.ok(rows.every(g=>g.type==='Polygon'||g.type==='MultiPolygon'));
assert.ok(rows.every(g=>g.properties?.S_NAME&&g.properties?.R2KAxx_ID!=null));
assert.equal(new Set(rows.map(g=>String(g.properties.R2KAxx_ID))).size,191);
assert.equal(new Set(rows.map(g=>g.properties.S_NAME)).size,182);
assert.equal(kana.nameEntryCount,182);
assert.equal(kana.matchedCount,180);
assert.equal(kana.unmatchedCount,2);
assert.equal(kana.ambiguousCount,0);
assert.equal(new Set(kana.entries.map(x=>x.name)).size,182);
assert.equal(addressList.officialNameCount,101);
assert.equal(addressList.entries.length,101);
assert.equal(addressList.partialImplementationCount,3);
const normalize=x=>x.normalize('NFKC').replace(/ケ/g,'ヶ').replace(/鴬/g,'鶯').replace(/[一二三四五六七八九〇]/g,c=>'1234567890'['一二三四五六七八九〇'.indexOf(c)]);
const codhNames=new Set(rows.map(g=>normalize(g.properties.S_NAME)));
assert.ok(addressList.entries.every(x=>codhNames.has(normalize(x.name))),'official住居表示 name not found in CODH');
assert.equal(kana.entries.filter(x=>x.matchStatus==='unmatched').map(x=>x.name).sort().join('|'),'一庫字北中島|西多田字平井田筋');
const arcs=topo.arcs, transform=topo.transform;
function arcPoints(index){
 const i=index<0?~index:index;assert.ok(i>=0&&i<arcs.length,`bad arc index ${index}`);
 let pts=arcs[i].map(p=>p.slice());
 if(transform){let x=0,y=0;pts=pts.map(([dx,dy])=>{x+=dx;y+=dy;return [x*transform.scale[0]+transform.translate[0],y*transform.scale[1]+transform.translate[1]]})}
 if(index<0)pts.reverse();return pts;
}
let ringCount=0;
for(const g of rows){
 const polygons=g.type==='Polygon'?[g.arcs]:g.arcs;
 for(const polygon of polygons)for(const ring of polygon){
  let points=[];for(const ref of ring){const part=arcPoints(ref);points=points.length?points.concat(part.slice(1)):part}
  assert.ok(points.length>=4,`${g.properties.S_NAME}: short ring`);
  assert.deepEqual(points[0],points.at(-1),`${g.properties.S_NAME}: unclosed ring`);
  assert.ok(points.flat().every(Number.isFinite),`${g.properties.S_NAME}: non-finite point`);
  ringCount++;
 }
}
console.log(`PASS: Kawanishi CODH 2020 source: ${rows.length} polygons, 182 distinct names, ${ringCount} closed rings; ${kana.matchedCount}/182 readings matched; official address list ${addressList.officialNameCount}/101 names matched, ${addressList.partialImplementationCount} partial areas`);
