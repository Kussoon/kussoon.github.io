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
const codes=['19','22','25','26','27','28','29','30'];
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
for(const script of ['label-engine.js','national-boundaries.js']){
 vm.runInNewContext(file('common/js/'+script),ctx,{filename:script});
}
const E=ctx.window.KussoonLabelEngine,N=ctx.window.KussoonNationalBoundaries;
const kansai=Object.fromEntries(['25','26','27','28','29','30'].map(code=>[code,topologies[code]]));
const fuji=Object.fromEntries(['19','22'].map(code=>[code,topologies[code]]));
function assertModels(valid){
 assert.ok(valid.bounds.w>0&&valid.bounds.h>0);
 for(const model of valid.models){
  assert.ok(model.box.w>0&&model.box.h>0,model.name);
  assert.ok(model.rings.length>0,model.name);
  assert.ok(model.centroid.every(Number.isFinite),model.name);
  assert.ok(model.polylabel.every(Number.isFinite),model.name);
  assert.ok(/^\\d{5}$/.test(model.code),model.name);
 }
}
test('source years and loaded prefectures remain explicit and non-production',()=>{
 assert.equal(catalog.geometry.asOf,'2021-01-01');
 assert.equal(catalog.prefectures.length,8);
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
 assert.ok(municipal.find(x=>x.name==='猪名川町'));
 assert.equal(new Set(municipal.map(x=>x.id)).size,198);
 assert.equal(new Set(ward.map(x=>x.id)).size,245);
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
 assert.equal(all.length,315);
 assert.equal(new Set(all.map(r=>r.id)).size,315);
 assert.ok(all.some(r=>r.prefectureCode==='19'));
 assert.ok(all.some(r=>r.prefectureCode==='30'));
});
