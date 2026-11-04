const {test}=require('node:test');
const assert=require('node:assert/strict');
const directory=require('../data/offices/28.json');
const sources=require('../data/offices/28-sources.json');
const api=require('../common/js/office-directory.js');
const readings=require('../data/national/municipality-readings.json').items;
const pilot=require('../data/national/municipality-offices-pilot.json').offices;

// Exercise the renderer's observable DOM, not a spelling of its source code.
function rendered(result,label){
 const createElement=tag=>({tag,children:[],attributes:{},
  append(...children){this.children.push(...children);},
  replaceChildren(...children){this.children=children;},
  setAttribute(key,value){this.attributes[key]=value;},
 });
 const container=createElement('div');api.render({createElement},container,result,label);
 const walk=node=>[node,...node.children.flatMap(walk)];
 return {container,nodes:walk(container)};
}

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
  if(o.status!=='verified'){assert.equal(o.address,null);assert.equal(o.postalCode,null);continue;}
  assert.match(o.postalCode,/^\d{3}-\d{4}$/);assert.match(o.address,/^兵庫県.+\d/);
  assert.ok(o.name&&o.officialPage&&o.sourceUrl&&o.sourcePostalUrl);
  assert.match(o.verifiedAt,/^\d{4}-\d{2}-\d{2}$/);assert.ok(o.verifiedAt<=directory.asOf);
  const source=sources[id.slice(0,5)];
  if(source.verificationMethod==='userProvidedOfficialConfirmation'){
   assert.equal(id,'28365-town');
   assert.ok(source.evidence.some(e=>e.method==='userProvidedOfficialConfirmation'&&e.url===o.sourceUrl));
  }else assert.equal(source.officialPageHttpStatus,200);
  assert.ok(sources[id.slice(0,5)].evidence.some(e=>e.excerpt.includes(o.postalCode)));
  const key=o.name+'|'+o.address;assert.ok(!unique.has(key),'duplicate '+id);unique.add(key);
  assert.ok(o.postalCode&&o.address);
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
 assert.notEqual(pair[0].address,pair[1].address);
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
 assert.deepEqual(api.resolve(directory,'99999'),{region:null,parentRegion:null,offices:[]});
 assert.equal(api.resolve(directory,'99999').offices.length,0);
 const partial=structuredClone(directory);partial.offices['28110-ward']={name:'中央区役所',status:'missing'};
 const pair=api.resolve(partial,'28110').offices;
 assert.equal(pair[0].address,undefined);assert.ok(pair[1].address);
 assert.equal(api.destination(pair[0]),null);assert.ok(api.destination(pair[1]));
 for(const u of [undefined,null,'javascript:alert(1)','http://example.com','https://user:secret@example.com'])assert.equal(api.safeUrl(u),null);
});

test('all 50 facilities are verified, including the official Taka confirmation',()=>{
 assert.equal(Object.values(directory.offices).filter(o=>o.status==='verified').length,50);
 assert.equal(Object.values(directory.offices).filter(o=>o.status!=='verified').length,0);
 const {region,offices:[office]}=api.resolve(directory,'28365');
 assert.equal(region.name,'多可町');assert.deepEqual(region.officeIds,['28365-town']);
 assert.equal(office.name,'多可町役場 本庁舎');
 assert.equal(office.postalCode,'679-1192');
 assert.equal(office.address,'兵庫県多可郡多可町中区中村町123番地');
 const url='https://www.town.taka.lg.jp/about_taka/chousha/';
 for(const key of ['officialPage','sourceUrl','sourcePostalUrl'])assert.equal(office[key],url);
 assert.equal(office.reviewNote,undefined);
 assert.ok(office.address.includes('多可町'));
 assert.equal(sources['28365'].officialPage,url);
 assert.equal(sources['28365'].checkedAt,office.verifiedAt);
 assert.equal(sources['28365'].officialPageHttpStatus,503);
 assert.equal(sources['28365'].verificationMethod,'userProvidedOfficialConfirmation');
 assert.ok(sources['28365'].evidence.some(e=>e.excerpt.includes(office.address)&&e.excerpt.includes(office.postalCode)));
});

test('regional cards render three actions per facility and distinct ward/city destinations',()=>{
 for(const code of ['28204','28365','28110']){
  const result=api.resolve(directory,code),{container,nodes}=rendered(result,result.region.name);
  const links=nodes.filter(n=>n.tag==='a'),expected=code==='28110'?6:3;
  assert.equal(links.length,expected);
  assert.equal(nodes.filter(n=>n.textContent==='庁舎案内').length,0);
  assert.equal(container.children.filter(n=>n.tag==='section').length,result.offices.length);
  const regions=code==='28110'?[result.region,result.parentRegion]:[result.region];
  for(let i=0;i<regions.length;i++){
   const row=links.slice(i*3,i*3+3);
   assert.deepEqual(row.map(n=>n.textContent),['公式サイト','Wikipedia','ここへ行く']);
   assert.equal(row[0].href,api.safeUrl(regions[i].official));assert.equal(row[1].href,api.safeUrl(regions[i].wikipedia));
   assert.equal(row[2].href,api.destination(result.offices[i]));
   for(const node of row){assert.equal(node.target,'_blank');assert.equal(node.rel,'noopener noreferrer');}
  }
  for(const office of result.offices){
   assert(nodes.some(n=>n.tag==='p'&&n.textContent.includes(office.address)),'address is reference text');
   assert(nodes.some(n=>n.tag==='h3'&&n.textContent===api.displayOfficeName(office.name)));
  }
 }
 assert.equal(directory.regions['28365'].official,'https://www.town.taka.lg.jp/');
 const ward=api.resolve(directory,'28110');
 assert.equal(ward.offices.length,2);
 const route=new URL(api.destination(ward.offices[0]));
 assert.equal(route.searchParams.get('destination'),ward.offices[0].name+' '+ward.offices[0].address);
 assert.notEqual(api.destination(ward.offices[0]),api.destination(ward.offices[1]));
 assert.equal(api.destination({name:'未確認',address:null,status:'missing'}),null);
 assert.equal(ward.region.wikipedia,directory.regions['28110'].wikipedia);
});

test('only URL audit A with a safe URL becomes an official link, including ward/city independence',()=>{
 for(const status of ['A','B','C','unclassified'])for(const url of ['https://example.com/','http://example.com/','javascript:alert(1)']){
  const copy=structuredClone(directory);copy.regions['28204'].officialAuditStatus=status;copy.regions['28204'].official=url;
  const {nodes}=rendered(api.resolve(copy,'28204'),'西宮市');
  const action=nodes.find(n=>n.textContent==='公式サイト');
  assert.equal(action.tag,status==='A'&&url.startsWith('https:')?'a':'span');
  if(action.tag==='span')assert.equal(action.attributes['aria-disabled'],'true');
 }
 const copy=structuredClone(directory);copy.regions['28110'].officialAuditStatus='B';
 const {nodes}=rendered(api.resolve(copy,'28110'),'神戸市中央区');
 const official=nodes.filter(n=>n.textContent==='公式サイト');
 assert.deepEqual(official.map(n=>n.tag),['span','a'],'parent A does not enable ward B');
 assert.equal(official[1].href,api.safeUrl(copy.regions['28100'].official));
});

test('display removes building suffixes without modifying stored names or route destinations',()=>{
 const pairs=[
  ['西宮市役所 本庁舎','西宮市役所'],
  ['神戸市役所（1号館）','神戸市役所'],
  ['多可町役場 本庁舎','多可町役場'],
  ['神戸市中央区役所','神戸市中央区役所']
 ];
 for(const [raw,expected] of pairs)assert.equal(api.displayOfficeName(raw),expected);
 assert.equal(directory.offices['28204-city'].name,'西宮市役所 本庁舎');
 const office=api.resolve(directory,'28204').offices[0];
 assert.equal(new URL(api.destination(office)).searchParams.get('destination'),office.name+' '+office.address);
 const central=api.resolve(directory,'28110').offices;
 assert.equal(central.length,2);
 assert.deepEqual(central.map(o=>api.displayOfficeName(o.name)),['神戸市中央区役所','神戸市役所']);
});
