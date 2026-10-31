const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const directory=require('../data/offices/28.json');
const sources=require('../data/offices/28-sources.json');
const api=require('../common/js/office-directory.js');
const readings=require('../data/national/municipality-readings.json').items;
const pilot=require('../data/national/municipality-offices-pilot.json').offices;

test('Hyogo covers exactly 41 municipalities and 9 valid Kobe wards',()=>{
 const expected=Object.keys(readings).filter(c=>c.startsWith('28')).sort();
 assert.equal(directory.schemaVersion,2);assert.equal(directory.prefecture,'28');
 assert.deepEqual(Object.keys(directory.regions).sort(),expected);
 assert.equal(expected.length,50);assert.equal(Object.keys(directory.offices).length,50);
 const wards=Object.entries(directory.regions).filter(([,r])=>r.kind==='ward');
 assert.equal(wards.length,9);
 const used=new Set();
 for(const [code,r] of Object.entries(directory.regions)){
  assert.match(code,/^28\d{3}$/);assert.equal(r.name,readings[code].name);
  assert.equal(new Set(r.officeIds).size,r.officeIds.length);
  for(const id of r.officeIds){assert.ok(directory.offices[id],id);used.add(id);}
  if(r.kind==='ward'){
   assert.equal(r.parentCode,'28100');assert.equal(directory.regions[r.parentCode].kind,'designatedCity');
   assert.deepEqual(r.officeIds,[code+'-ward',...directory.regions[r.parentCode].officeIds]);
  }else{assert.equal(r.officeIds.length,1);assert.equal(r.parentCode,undefined);}
 }
 assert.equal(used.size,50);
});
test('verified facilities have complete official evidence, postal codes, addresses and safe URLs',()=>{
 const unique=new Set();
 for(const [id,o] of Object.entries(directory.offices)){
  assert.ok(['verified','needsReview','missing'].includes(o.status));
  for(const key of ['officialPage','sourceUrl','sourcePostalUrl'])if(o[key])assert.ok(api.safeUrl(o[key]),id+key);
  if(o.status!=='verified'){assert.equal(o.address,null);assert.equal(o.postalCode,null);assert.equal(api.destination(o),null);continue;}
  assert.match(o.postalCode,/^\d{3}-\d{4}$/);assert.match(o.address,/^兵庫県.+\d/);
  assert.ok(o.name&&o.officialPage&&o.sourceUrl&&o.sourcePostalUrl);
  assert.match(o.verifiedAt,/^\d{4}-\d{2}-\d{2}$/);assert.ok(o.verifiedAt<=directory.asOf);
  assert.equal(sources[id.slice(0,5)].officialPageHttpStatus,200);
  assert.ok(sources[id.slice(0,5)].evidence.some(e=>e.excerpt.includes(o.postalCode)));
  const key=o.name+'|'+o.address;assert.ok(!unique.has(key),'duplicate '+id);unique.add(key);
  const url=new URL(api.destination(o));assert.equal(url.searchParams.get('destination'),o.name+' '+o.address);
 }
 assert.equal(Object.values(directory.offices).filter(o=>o.kind==='cityHall'&&o.name.startsWith('神戸市役所')).length,1);
 assert.equal(directory.offices['28109-ward'].postalCode,'651-1195');
 assert.equal(directory.offices['28203-city'].address,'兵庫県明石市中崎1丁目5-1');
});
test('initial six regions retain pilot records and use distinct ward/city destinations',()=>{
 for(const [code,old] of Object.entries(pilot)){
  const {region,offices:[office]}=api.resolve(directory,code);
  for(const key of ['postalCode','address'])assert.equal(office[key],old[key]);
  assert.equal(office.name,old.office);assert.equal(region.wikipedia,old.wikipedia);
 }
 assert.equal(api.resolve(directory,'28100').offices.length,1);
 const pair=api.resolve(directory,'28110').offices;
 assert.deepEqual(pair.map(o=>o.postalCode),['651-8570','650-8570']);
 assert.notEqual(api.destination(pair[0]),api.destination(pair[1]));
});
test('regional links match confirmed Wikipedia articles and official top pages',()=>{
 for(const [code,r] of Object.entries(directory.regions)){
  if(r.official)assert.ok(api.safeUrl(r.official));
  assert.equal(new URL(r.wikipedia).hostname,'ja.wikipedia.org');
  assert.equal(r.wikipedia,sources[code].wikipedia.url);
 }
 for(const code of ['28109','28110','28111'])assert.ok(directory.regions[code].wikipedia.includes('_(神戸市)'));
 assert.ok(directory.regions['28464'].wikipedia.endsWith('太子町_(兵庫県)'));
});
test('unknown regions and partial wards never invent destinations',()=>{
 assert.deepEqual(api.resolve(directory,'99999'),{region:null,offices:[]});
 assert.equal(api.destination({name:'未確認',address:null,status:'missing'}),null);
 const partial=structuredClone(directory);partial.offices['28110-ward']={name:'中央区役所',status:'missing'};
 const pair=api.resolve(partial,'28110').offices;
 assert.equal(api.destination(pair[0]),null);assert.ok(api.destination(pair[1]));
 for(const u of [undefined,null,'javascript:alert(1)','http://example.com','https://user:secret@example.com'])assert.equal(api.safeUrl(u),null);
});
