// National V2 data-contract regression, no external node_modules needed.
// node --test v2/tests/national-boundaries.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(base,p),'utf8');
const catalog=JSON.parse(file('data/national/catalog.json'));
const codes=['19','22','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39'];
const topologies=Object.fromEntries(codes.map(code=>[code,
 JSON.parse(file('data/national/2021/'+code+'.topojson'))]));
// A narrow test geometry adapter decodes topological arcs without dissolving
// shared edges. Browser rendering uses the real topojson-client merge.
function decodeGeometry(topo,g){
 const trans=topo.transform;
 const arc=index=>{
  const reverse=index<0,key=reverse?~index:index;
  let x=0,y=0;
  const pts=topo.arcs[key].map(p=>{
   x+=p[0];y+=p[1];
   return [x*trans.scale[0]+trans.translate[0],y*trans.scale[1]+trans.translate[1]];
  });
  return reverse?pts.reverse():pts;
 };
 const ring=ids=>ids.flatMap((i,j)=>arc(i).slice(j?1:0));
 const polys=g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:null;
 if(!polys)throw Error('Invalid polygon geometry');
 return polys.map(poly=>poly.map(ring));
}
const ctx={window:{topojson:{
 merge:(topo,geometries)=>({type:'MultiPolygon',
  coordinates:geometries.flatMap(g=>decodeGeometry(topo,g))})
}},performance:{now:()=>0}};
for(const script of ['label-engine.js','national-boundaries.js','administrative-labels.js']){
 vm.runInNewContext(file('common/js/'+script),ctx,{filename:script});
}
const E=ctx.window.KussoonLabelEngine,N=ctx.window.KussoonNationalBoundaries;
const L=ctx.window.KussoonAdministrativeLabels;
const kansai=Object.fromEntries(['25','26','27','28','29','30'].map(code=>[code,topologies[code]]));
const fuji=Object.fromEntries(['19','22'].map(code=>[code,topologies[code]]));
const chugoku=Object.fromEntries(['31','32','33','34','35'].map(code=>[code,topologies[code]]));
const west=Object.fromEntries(['25','26','27','28','29','30','31','32','33','34','35'].map(code=>[code,topologies[code]]));
function assertModels(valid){
 assert.ok(valid.bounds.w>0&&valid.bounds.h>0);
 for(const model of valid.models){
  assert.ok(model.box.w>0&&model.box.h>0,model.name);
  assert.ok(model.rings.length>0,model.name);
  assert.ok(model.centroid.every(Number.isFinite),model.name);
  assert.ok(model.polylabel.every(Number.isFinite),model.name);
  assert.ok(/^\d{5}$/.test(model.code),model.name);
 }
}
test('source years and loaded prefectures remain explicit and non-production',()=>{
 assert.equal(catalog.geometry.asOf,'2021-01-01');
 assert.equal(catalog.prefectures.length,17);
 assert.equal(catalog.experimental,true);
 for(const code of codes){
  const topo=topologies[code];
  assert.equal(topo.type,'Topology');
  assert.ok(topo.transform,'Missing transform '+code);
  const objects=Object.values(topo.objects);
  assert.equal(objects.length,1);
  assert.ok(objects[0].geometries.length>0);
 }
});
test('Kansai groups correctly to 198 municipalities or 245 wards',()=>{
 const municipal=N.registry(kansai,catalog,'municipality');
 const ward=N.registry(kansai,catalog,'ward');
 assert.equal(municipal.length,198);
 assert.equal(ward.length,245);
 const cityCases=[['26100','京都市',11],['27100','大阪市',24],
  ['27140','堺市',7],['28100','神戸市',9]];
 for(const [code,name,count] of cityCases){
  const m=municipal.find(x=>x.code===code);
  assert.ok(m,'Missing '+name);
  assert.equal(m.name,name);
  assert.equal(m.municipalityCodes.length,count);
 }
 assert.ok(ward.find(x=>x.code==='27127').fullName==='大阪市北区');
 assert.ok(ward.find(x=>x.code==='28107').fullName==='神戸市須磨区');
 // N03_003 also holds county names. County towns must never be merged.
 assert.ok(municipal.some(x=>x.name==='富士河口湖町')===false);
 const inagawa=municipal.find(x=>x.name==='猪名川町');
 assert.ok(inagawa);
 assert.equal(inagawa.county,'川辺郡');
 assert.equal(inagawa.fullName,'川辺郡猪名川町');
 assert.equal(ward.find(x=>x.code==='28301').fullName,'川辺郡猪名川町');
 assert.equal(municipal.find(x=>x.name==='京都市').fullName,'京都市');
 assert.equal(ward.find(x=>x.code==='28101').fullName,'神戸市東灘区');
 const countyTowns=municipal.filter(x=>x.county);
 assert.ok(countyTowns.length>=20,'Missing county suffixes from municipality names');
 assert.ok(countyTowns.every(x=>x.fullName===x.county+x.name));
 assert.equal(new Set(municipal.map(x=>x.id)).size,198);
 assert.equal(new Set(ward.map(x=>x.id)).size,245);
 assertModels(N.project(municipal,E));
 assertModels(N.project(ward,E));
});
test('Chugoku region and connected 11-prefecture western map use the same city-grouping rules',()=>{
 const chugoku=Object.fromEntries(['31','32','33','34','35'].map(code=>[code,topologies[code]]));
 const west=Object.fromEntries(['25','26','27','28','29','30','31','32','33','34','35'].map(code=>[code,topologies[code]]));
 const municipal=N.registry(chugoku,catalog,'municipality');
 const ward=N.registry(chugoku,catalog,'ward');
 assert.equal(municipal.length,107);
 assert.equal(ward.length,117);
 const okayama=municipal.find(x=>x.code==='33100');
 const hiroshima=municipal.find(x=>x.code==='34100');
 assert.equal(okayama.name,'岡山市');
 assert.equal(okayama.municipalityCodes.length,4);
 assert.equal(hiroshima.name,'広島市');
 assert.equal(hiroshima.municipalityCodes.length,8);
 assert.equal(ward.find(x=>x.code==='33101').fullName,'岡山市北区');
 assert.equal(ward.find(x=>x.code==='34101').fullName,'広島市中区');
 assert.equal(municipal.find(x=>x.name==='邑南町').fullName,'邑智郡邑南町');
 assert.equal(municipal.find(x=>x.name==='隠岐の島町').fullName,'隠岐郡隠岐の島町');
 assert.equal(N.registry(west,catalog,'municipality').length,305);
 assert.equal(N.registry(west,catalog,'ward').length,362);
 assertModels(N.project(municipal,E));
 assertModels(N.project(ward,E));
});
test('Fuji plate area crosses the Yamanashi/Shizuoka prefectural boundary',()=>{
 const municipalities=N.registry(fuji,catalog,'municipality');
 assert.equal(municipalities.length,62);
 const projected=N.project(municipalities,E);
 assertModels(projected);
 const plate=catalog.plates.find(p=>p.id==='fuji');
 assert.ok(plate);
 const ward=N.registry(fuji,catalog,'ward');
 assert.equal(ward.length,70);
 assert.equal(municipalities.find(x=>x.code==='22100').municipalityCodes.length,3);
 assert.equal(municipalities.find(x=>x.code==='22130').municipalityCodes.length,7);
 const members=N.plateMembers(projected.models,plate);
 assert.equal(members.length,12);
 assert.equal(members.filter(m=>m.prefectureCode==='19').length,7);
 assert.equal(members.filter(m=>m.prefectureCode==='22').length,5);
 assert.ok(members.some(m=>m.name==='富士吉田市'));
 assert.ok(members.some(m=>m.name==='富士宮市'));
 assert.equal(members.find(m=>m.name==='富士河口湖町').fullName,'南都留郡富士河口湖町');
 const target=N.joinPlateShape(members,E);
 assert.ok(target.rings.length>1);
 assert.ok(target.polylabel.every(Number.isFinite));
});
test('plate classification refuses missing or repeated municipality codes',()=>{
 const regions=N.registry(fuji,catalog,'municipality');
 const projected=N.project(regions,E);
 assert.throws(()=>N.plateMembers(projected.models,{
  municipalityCodes:['19202','99999']}),/Missing plate municipalities/);
 assert.throws(()=>N.plateMembers(projected.models,{
  municipalityCodes:['19202','19202']}),/Duplicate plate/);
});
test('catalog cannot silently collapse two prefectures into one municipality ID',()=>{
 const all=N.registry(topologies,catalog,'ward');
 assert.equal(all.length,527);
 assert.equal(new Set(all.map(r=>r.id)).size,527);
 assert.ok(all.some(r=>r.prefectureCode==='19'));
 assert.ok(all.some(r=>r.prefectureCode==='30'));
});

test('2021 nationwide data uses two lines for all county towns and city wards',()=>{
 const municipal=N.registry(kansai,catalog,'municipality');
 const ward=N.registry(kansai,catalog,'ward');
 const countyPlaces=municipal.filter(m=>m.county);
 assert.equal(countyPlaces.length,87);
 for(const m of countyPlaces){
  assert.equal(L.rows(m)[0],m.county);
  assert.equal(L.rows(m)[1],m.name);
  assert.equal(m.fullName,L.rows(m).join(''));
 }
 const inagawa=municipal.find(m=>m.name==='猪名川町');
 assert.deepEqual([...L.rows(inagawa)],['川辺郡','猪名川町']);
 const cityWard=ward.find(m=>m.code==='28101');
 assert.deepEqual([...L.rows(cityWard)],['神戸市','東灘区']);
 const fujiCounty=N.registry(fuji,catalog,'municipality').find(m=>m.name==='富士河口湖町');
 assert.deepEqual([...L.rows(fujiCounty)],['南都留郡','富士河口湖町']);
 assert.equal(L.rows(municipal.find(m=>m.name==='西宮市')),null);
});

test('Chugoku five prefectures and contiguous Western Japan use the same engine',()=>{
 const municipal=N.registry(chugoku,catalog,'municipality');
 const ward=N.registry(chugoku,catalog,'ward');
 assert.equal(municipal.length,107);
 assert.equal(ward.length,117);
 const okayama=municipal.find(m=>m.code==='33100');
 const hiroshima=municipal.find(m=>m.code==='34100');
 assert.equal(okayama.name,'岡山市');
 assert.equal(okayama.municipalityCodes.length,4);
 assert.equal(hiroshima.name,'広島市');
 assert.equal(hiroshima.municipalityCodes.length,8);
 assert.equal(ward.find(m=>m.code==='33101').fullName,'岡山市北区');
 assert.equal(ward.find(m=>m.code==='34105').fullName,'広島市安佐南区');
 const western=N.registry(west,catalog,'municipality');
 assert.equal(western.length,305);
 assert.equal(N.registry(west,catalog,'ward').length,362);
 assert.equal(new Set(western.map(m=>m.id)).size,305);
 assertModels(N.project(municipal,E));
 assertModels(N.project(ward,E));
 assertModels(N.project(western,E));
});
test('Chugoku county names, islands and small villages are preserved',()=>{
 const municipal=N.registry(chugoku,catalog,'municipality');
 const hiezuson=municipal.find(m=>m.code==='31384');
 assert.equal(hiezuson.fullName,'西伯郡日吉津村');
 const ama=municipal.find(m=>m.code==='32525');
 assert.equal(ama.fullName,'隠岐郡海士町');
 assert.ok(ama.geoPolygons.length>0);
 const oochi=municipal.find(m=>m.code==='32449');
 assert.equal(oochi.fullName,'邑智郡邑南町');
});

test('Shikoku and connected western maps preserve 2021 pilot geometry counts',()=>{
 const four=Object.fromEntries(['36','37','38','39'].map(code=>[code,topologies[code]]));
 const nine=Object.fromEntries(['31','32','33','34','35','36','37','38','39'].map(code=>[code,topologies[code]]));
 const fifteen=Object.fromEntries(['25','26','27','28','29','30','31','32','33','34','35','36','37','38','39'].map(code=>[code,topologies[code]]));
 assert.equal(N.registry(four,catalog,'municipality').length,95);
 assert.equal(N.registry(four,catalog,'ward').length,95);
 assert.equal(N.registry(nine,catalog,'municipality').length,202);
 assert.equal(N.registry(nine,catalog,'ward').length,212);
 assert.equal(N.registry(fifteen,catalog,'municipality').length,400);
 assert.equal(N.registry(fifteen,catalog,'ward').length,457);
 assertModels(N.project(N.registry(four,catalog,'municipality'),E));
 assertModels(N.project(N.registry(nine,catalog,'ward'),E));
 assertModels(N.project(N.registry(fifteen,catalog,'municipality'),E));
 const kochi=N.registry(four,catalog,'municipality').find(x=>x.code==='39405');
 assert.equal(kochi.name,'梼原町');
});
