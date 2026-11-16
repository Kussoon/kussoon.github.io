'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'..');
const context={};context.globalThis=context;
vm.runInNewContext(fs.readFileSync(path.join(base,'v2/common/js/town-svg-membership.js'),'utf8'),context);
const {build}=context.KussoonTownSvgMembership;
const mapping=JSON.parse(fs.readFileSync(path.join(base,'nishinomiya/data/community-town-map.json'),'utf8'));
const topology=JSON.parse(fs.readFileSync(path.join(base,'v2/data/nishinomiya-town-v2-premerged.topojson'),'utf8'));
const names=topology.objects.town.geometries.map(x=>x.properties.S_NAME);
assert.equal(names.length,321);assert.equal(new Set(names).size,321);
const groupedName=s=>String(s||'').replace(/[一二三四五六七八九十百]+丁目$/,'');
const oldPrimary=new Map(),counts=new Map();
for(const [raw,info] of Object.entries(mapping.towns||{})){
 const name=groupedName(raw),co=info.community;
 if(!counts.has(name))counts.set(name,new Map());
 const values=counts.get(name);values.set(co,(values.get(co)||0)+1);
}
for(const [name,values] of counts){
 const sorted=[...values].filter(([co])=>mapping.communities.includes(co)).sort((a,b)=>b[1]-a[1]);
 if(sorted.length)oldPrimary.set(name,sorted[0][0]);
}
oldPrimary.set('岡田山','上ヶ原');
const shared=build(mapping,{normalizeName:groupedName,
 primaryOverrides:{'岡田山':'上ヶ原'},
 additionalRegions:{'岡田山':['広田'],'上甲東園':['甲東']}
});
assert.equal(shared.regions.length,26);assert.equal(shared.primary.get('岡田山'),'上ヶ原');
let pairs=0,covered=0;const regionCounts={};
for(const name of names){
 if(shared.primary.has(name))covered++;
 for(const co of mapping.communities){
  const old=oldPrimary.get(name)===co||(name==='岡田山'&&co==='広田')||(name==='上甲東園'&&co==='甲東');
  const next=shared.belongs(name,co);
  assert.equal(next,old,name+' / '+co);
  if(next)regionCounts[co]=(regionCounts[co]||0)+1;
  pairs++;
 }
}
assert.equal(covered,321,'every Nishinomiya town must have primary region');
assert.equal(pairs,321*26);
assert.equal(shared.belongs('岡田山','広田'),true);
assert.equal(shared.belongs('岡田山','上ヶ原'),true);
assert.equal(shared.belongs('上甲東園','甲東'),true);
assert.equal(shared.belongs('上甲東園','上ヶ原'),true);
const toy=build({communities:['北','南'],towns:{
 '一区一丁目':{community:'北'},'一区二丁目':{community:'南'},'二区':{community:'南'}
}},{normalizeName:groupedName,additionalRegions:{'二区':['北']}});
assert.equal(toy.primary.get('一区'),'北','same-count tie retains first appearance');
assert.equal(toy.belongs('二区','北'),true);
assert.equal(toy.belongs('二区','南'),true);
assert.throws(()=>build({communities:['北','北'],towns:{}}));
assert.throws(()=>build({communities:['北'],towns:{}},{additionalRegions:{'一区':['無効']}}));
assert.throws(()=>build({communities:['北'],towns:{}},{primaryOverrides:{'一区':'無効'}}));
console.log('PASS TOWN_SVG_MEMBERSHIP '+JSON.stringify({towns:names.length,regions:mapping.communities.length,pairs,covered,regionCounts,
 exceptions:['岡田山','上甲東園'],toyMultiRegion:true}));
