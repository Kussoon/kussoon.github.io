'use strict';
/* TOWNMAP-SSOT-001 strict original-source census and verified metadata:
 * DO NOT interpret TopoJSON arcs as projected GeoJSON geometry; this test
 * verifies data identity only. A separate browser rendering comparison is
 * required before using the Nishinomiya manifest for the common page.
 */
const fs=require('node:fs'),assert=require('node:assert/strict');
const overlay=require('../v2/common/js/town-svg-verified-membership.js');
const ready=require('../v2/common/js/town-svg-dataset-ready.js');
const manifest=require('../v2/data/town-maps/28204-preview.json');
const topology=JSON.parse(fs.readFileSync('v2/data/nishinomiya-town-v2-premerged.topojson','utf8'));
const mapping=JSON.parse(fs.readFileSync('nishinomiya/data/community-town-map.json','utf8'));
const exceptions=JSON.parse(fs.readFileSync('v2/data/nishinomiya-uekoto-community.topojson','utf8'));
const v34=fs.readFileSync('v2/nishinomiya-town-svg-master-v34-20261117-pilot.html','utf8');
const match=v34.match(/const READINGS=(\{[\s\S]*?\}), LABEL_OFFSETS=/);
assert(match,'V34 verified 321 town readings');
const readings=JSON.parse(match[1]);
const regionText=v34.match(/const COMMUNITY_READINGS=(\{[^\n]+\});/);
assert(regionText,'V34 verified 26 regional readings');
const regionReadings={};
for(const m of regionText[1].matchAll(/'([^']+)':'([^']+)'/g))regionReadings[m[1]]=m[2];
assert.equal(Object.keys(readings).length,321);
assert.equal(Object.keys(regionReadings).length,26);
assert.deepEqual(manifest.regionReadings,regionReadings);
assert.equal(manifest.expectedLabelCount,324);
assert.deepEqual(manifest.townMetadata['岡田山'].communities,['上ヶ原','広田']);
assert.deepEqual(manifest.townMetadata['上甲東園'].communities,['上ヶ原','甲東']);
const split=exceptions.objects?.town?.geometries||[];
assert.equal(split.filter(g=>g.properties?.community==='上ヶ原').length,4);
assert.equal(split.filter(g=>g.properties?.community==='甲東').length,2);
assert.equal(manifest.membershipCorrections.length,40);
const normalize=s=>String(s||'').replace(/[一二三四五六七八九十百]+丁目$/,'');
const counts=new Map();
for(const [raw,v] of Object.entries(mapping.towns)){
 if(!mapping.communities.includes(v?.community))continue;
 const name=normalize(raw),m=counts.get(name)||new Map();
 m.set(v.community,(m.get(v.community)||0)+1);counts.set(name,m);
}
const primary=new Map([...counts].map(([n,v])=>
 [n,[...v].sort((a,b)=>b[1]-a[1])[0][0]]));
primary.set('岡田山','上ヶ原');
const additions={'岡田山':['広田'],'上甲東園':['甲東']};
const shapes=topology.objects.town.geometries;
const names=shapes.map(g=>g.properties?.S_NAME);
assert.equal(shapes.length,321);
assert.equal(new Set(names).size,321);
assert.deepEqual(manifest.expectedRegionCount,26);
assert.deepEqual(manifest.expectedTownCount,321);
const records=shapes.map(g=>{
 const name=g.properties.S_NAME;
 assert.equal(manifest.townMetadata[name].reading,readings[name]);
 assert.deepEqual(manifest.townMetadata[name].communities,
  [primary.get(name),...(additions[name]||[])]);
 const origin=mapping.towns[name]?.community;
 return {name,reading:null,communities:origin?[origin]:[],
  geometry:{format:'geojson',data:{type:'Feature',properties:g.properties,geometry:g}}};
});
const source={municipalityId:manifest.municipalityId,sourceFormat:'topojson',
 regions:[...mapping.communities],records};
const initial=records.map(x=>({name:x.name,communities:[...x.communities],geometry:x.geometry}));
const adopted=overlay.apply({unified:source,manifest});
const prepared=ready.prepare({unified:adopted,townMetadata:manifest.townMetadata,regionReadings:manifest.regionReadings});
assert.equal(prepared.records.length,321);
assert.equal(prepared.regions.length,26);
for(let i=0;i<321;i++){
 assert.equal(prepared.records[i].name,initial[i].name);
 assert.equal(prepared.records[i].geometry,initial[i].geometry);
 assert.deepEqual(records[i].communities,initial[i].communities,'source regions untouched');
}
const expectedCorrections=records.filter((r,i)=>{
 const c=manifest.townMetadata[r.name].communities;
 return c.length!==r.communities.length||c.some(v=>!r.communities.includes(v));
}).map(x=>x.name).sort();
assert.deepEqual(manifest.membershipCorrections.map(x=>x.name).sort(),expectedCorrections);
const wrongSource=structuredClone(source);
wrongSource.records[0].communities=['存在しない地域'];
assert.throws(()=>overlay.apply({unified:wrongSource,manifest}),/未承認/);
const missing=structuredClone(manifest);
missing.membershipCorrections=missing.membershipCorrections.slice(1);
assert.throws(()=>overlay.apply({unified:source,manifest:missing}),/未承認/);
const wrongReading=structuredClone(source);
wrongReading.records[0].reading='誤読';
assert.throws(()=>overlay.apply({unified:wrongReading,manifest}),/矛盾/);
const extra=structuredClone(manifest);
extra.townMetadata['架空町']={reading:'かくうちょう',communities:['鳴尾']};
assert.throws(()=>overlay.apply({unified:source,manifest:extra}),/原本にない町/);
const conflicting=structuredClone(manifest);
conflicting.membershipCorrections[0].approvedCommunities=['別の地域'];
assert.throws(()=>overlay.apply({unified:source,manifest:conflicting}),/未承認/);
console.log('PASS NATIONAL_NISHINOMIYA_ACCEPTED_DATA '+JSON.stringify({
 towns:321,regions:26,approvedLabelCount:324,explicitMembershipCorrections:40,
 splitComponents:{uegahara:4,koto:2},sourceGeometryPreserved:true
}));
