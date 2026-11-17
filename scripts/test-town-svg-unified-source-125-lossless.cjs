'use strict';
// Read the actual 125 source SVG path strings and original town metadata.
// Verify the nationwide source contract returns them unmodified for all towns.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const doc=fs.readFileSync('takarazuka/town-search.html','utf8');
const registry=JSON.parse(fs.readFileSync('takarazuka/data/takarazuka-town-info.json','utf8'));
const raw=[...doc.matchAll(/<path\s+class="town"\s+data-name="([^"]+)"\s+d="([^"]+)"[^>]*>/g)]
 .map(m=>({name:m[1],d:m[2]}));
const viewBox=doc.match(/<svg\s+id="map"\s+viewBox="([^"]+)"/)?.[1];
assert.equal(raw.length,125);assert.ok(viewBox);
const names=new Map(registry.towns.map(x=>[x.name,x]));
assert.equal(names.size,125);
const towns=raw.map(p=>{const meta=names.get(p.name);assert.ok(meta);return {...p,reading:meta.reading,communities:meta.communities}});
const context={};context.globalThis=context;
vm.runInNewContext(fs.readFileSync('v2/common/js/town-svg-data-contract.js','utf8'),context);
(async()=>{
 const contract=await context.KussoonTownSvgDataContract.loadUnified({
  municipalityId:'jp-hyogo-takarazuka',sourceFormat:'svg',
  htmlPath:'/takarazuka/town-search.html',
  infoPath:'/takarazuka/data/takarazuka-town-info.json',
  expectedTownCount:125,expectedRegionCount:20
 },{svgAdapter:{loadSvgTownSource:async()=>({towns,viewBox})}});
 assert.equal(contract.records.length,125);assert.equal(contract.regions.length,20);
 for(let i=0;i<125;i++){
  const a=towns[i],b=contract.records[i];
  assert.equal(b.name,a.name,'name order '+i);
  assert.equal(b.reading,a.reading,'reading '+i);
  assert.equal(b.geometry.format,'svg-path');
  assert.equal(b.geometry.data,a.d,'exact SVG path '+a.name);
  assert.deepEqual(JSON.parse(JSON.stringify(b.communities)),a.communities,'region membership '+a.name);
 }
 assert.equal(contract.viewBox,viewBox);
 console.log('PASS NATIONAL_SOURCE_125_LOSSLESS '+JSON.stringify({towns:125,regions:20,pathStringsUnchanged:true,readingsUnchanged:true,membershipsUnchanged:true}));
})().catch(err=>{console.error(err);process.exitCode=1});
