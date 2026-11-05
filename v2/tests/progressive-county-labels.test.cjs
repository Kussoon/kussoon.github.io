'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=JSON.parse(read('v2/progressive-preview/label-index.json'));
const overlay=JSON.parse(read('v2/progressive-preview/county-overlay.json'));
const ctx={window:{}};vm.runInNewContext(read('v2/progressive-preview/county-overlay.js'),ctx);
assert.equal(index.count,1905);
assert.equal(overlay.matched,922);
assert.equal(Object.keys(overlay.entries).length,922);
const actual=ctx.window.KussoonV2CountyOverlay.apply(index,overlay);
assert.equal(actual.entries.length,1905);
const byCode=new Map(actual.entries.map(x=>[x.code,x]));
const inagawa=byCode.get('28301');
assert.equal(inagawa.fullName,'川辺郡猪名川町');
assert.equal(inagawa.county,'川辺郡');
assert.deepEqual(JSON.parse(JSON.stringify(inagawa.parts)),[
 {name:'川辺郡',reading:'かわべぐん'},
 {name:'猪名川町',reading:'いながわちょう'}
]);
assert.equal(inagawa.reading,'かわべぐんいながわちょう');
assert.equal(byCode.get('39405').fullName,'檮原町','Unverified historical spelling not silently overwritten');
assert.equal(byCode.get('01695').county,'色丹郡');
assert.equal(byCode.get('01695').parts.length,0,'Missing northern-area name reading must not be fabricated');
let validated=0;
for(const [code,source] of Object.entries(overlay.entries)){
 const entry=byCode.get(code);
 assert.ok(entry);
 assert.equal(entry.name,source.name);
 assert.equal(entry.fullName,source.county+source.name);
 assert.equal(entry.county,source.county);
 assert.ok(entry.county.endsWith('郡'));
 assert.ok(/[町村]$/.test(entry.name));
 if(entry.parts.length){assert.equal(entry.parts.length,2);assert.equal(entry.parts[0].name,source.county);assert.equal(entry.parts[0].reading,source.countyReading);}
 validated++;
}
assert.equal(validated,922);
console.log('PASS 2026 county labels: '+validated+' verified rows, Inagawa two-line reading, unresolved orthography retained');
