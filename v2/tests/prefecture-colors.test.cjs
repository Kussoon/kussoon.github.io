'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {adjacency,codes,pairs}=require('./fixtures/prefecture-adjacencies.cjs');

const source=fs.readFileSync(path.join(__dirname,'../progressive-preview/prefecture-colors.js'),'utf8');
const window={};
vm.runInNewContext(source,{window});
const colors=window.KussoonV2PrefectureColors;
assert(colors,'palette script exports the shared colour API');
assert.deepEqual(Object.keys(colors.colorByPrefecture).sort(),codes,'fixed colour table has exactly 47 prefectures');
assert.equal(new Set(Object.values(colors.colorByPrefecture)).size,8,'the existing eight pastel colours remain in use');
for(const code of codes){
 assert(colors.palette.includes(colors.colorByPrefecture[code]),'prefecture '+code+' uses a palette colour');
 assert.equal(colors.color(code),colors.colorByPrefecture[code],'two-digit lookup '+code);
 assert.equal(colors.color(code+'110'),colors.colorByPrefecture[code],'five-digit municipality lookup '+code);
}
assert.equal(colors.color('00'),null);
assert.equal(colors.color('48'),null);
assert.equal(colors.color(''),null);

let degreeSum=0;
for(const [code,neighbors] of Object.entries(adjacency)){
 degreeSum+=neighbors.length;
 assert.equal(new Set(neighbors).size,neighbors.length,'no duplicate neighbors for '+code);
 assert(!neighbors.includes(code),'prefecture is not its own neighbor');
 for(const neighbor of neighbors){
  assert(codes.includes(neighbor),'neighbor code is valid: '+code+' / '+neighbor);
  assert(adjacency[neighbor].includes(code),'adjacency is symmetric: '+code+' / '+neighbor);
  assert.notEqual(colors.color(code),colors.color(neighbor),
   'adjacent prefectures use different colors: '+code+' / '+neighbor);
 }
}
assert.equal(degreeSum/2,pairs.length,'pair list represents the symmetric adjacency table once');
assert.equal(pairs.length,88,'complete adjacent-boundary pair list');
for(const neighbor of ['26','27','31','33'])
 assert.notEqual(colors.color('28'),colors.color(neighbor),'Hyogo differs from adjacent '+neighbor);
// User-approved 2026-11-13 B arrangement. Maintain these comparison anchors.
assert.equal(colors.color('28'),'#f1d5a5','Hyogo retains its approved golden beige');
assert.equal(colors.color('16'),'#bee0c1','Toyama matches approved B arrangement');
assert.equal(colors.color('18'),'#f1c2c2','Fukui matches approved B arrangement');
assert.equal(colors.color('09'),'#c9cfed','Tochigi matches approved B arrangement');
assert.equal(colors.color('10'),'#d9dea5','Gunma matches approved B arrangement');
assert.notEqual(colors.color('16'),colors.color('18'),'Toyama and Fukui are different');
console.log('PASS fixed prefecture palette: 47 assignments, 8 colours, '+pairs.length+' adjacent pairs');
