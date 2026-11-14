// Region landing-page template: source-backed contracts and safe pilot rollout.
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=path.resolve(process.argv[2]||".");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const data=JSON.parse(read("v2/region-top/data/regions.json"));
const regions=data.regions,ids=new Set(regions.map(r=>r.id));
assert.equal(regions.length,9,"兵庫県・既存5市・新規3市町の計9件");
assert.equal(ids.size,9,"地域IDの重複");
assert.equal(regions.filter(r=>r.status==="existing").length,6);
assert.equal(regions.filter(r=>r.status==="planned").length,3);
assert.deepEqual(regions.filter(r=>r.status==="planned").map(r=>r.name).sort(),["三田市","川西市","猪名川町"].sort());
const hierarchy=JSON.parse(read("v2/geography/data/hierarchy.json")).nodes;
const cityMap=new Map(hierarchy.map(n=>[n.id,n]));
assert.deepEqual(regions.filter(r=>r.geographyId).map(r=>r.townCount),[321,125,140,76,59]);
assert.equal(regions.filter(r=>r.geographyId).reduce((s,r)=>s+r.townCount,0),721);
for(const r of regions){
 assert.ok(r.id&&r.name&&r.reading&&["existing","planned"].includes(r.status));
 assert.ok(Array.isArray(r.features)&&r.description);
 if(r.status==="existing"){
  assert.ok(r.existingTop&&/^\/(?!\/)/.test(r.existingTop),"既存トップへのパスがありません");
  if(r.kind==="municipality"){
   const original=cityMap.get(r.geographyId);
   assert.ok(original&&original.name===r.name&&original.townData?.expectedCount===r.townCount,"元の5市情報と町名数が一致しません");
   assert.ok(original.links.some(l=>l.url===r.existingTop),"元サイトトップのリンクが階層の正本と違います");
  }else assert.equal(r.existingTop,"/hyogo/");
 }else{
  assert.equal(r.kind,"municipality");
  assert.equal(r.existingTop,null,"新市町の仮トップを公開済みと偽らない");
  assert.equal(r.geographyId,undefined,"未接続の町名階層を指してはいけません");
  assert.equal(r.townCount,undefined,"町名件数を未検証のまま提示しない");
  assert.deepEqual(r.features,[],"未整備の機能をリンクしない");
 }
 for(const feature of r.features){
  assert.ok(feature.label&&feature.description&&/^\/(?!\/)/.test(feature.url));
  assert.ok(!feature.url.includes(".."),"path traversal: "+feature.url);
 }
}
const nishinomiya=regions.find(r=>r.id==="jp-hyogo-nishinomiya");
const expectedNishinomiya=[
 "/nishinomiya/all-area-labeled.html",
 "/nishinomiya/town-search.html",
 "/nishinomiya/full-location-quiz.html",
 "/nishinomiya/community-select.html",
 "/nishinomiya/sweets/",
 "/nishinomiya/jisha/",
 "/nishinomiya/nishinomiya-intersections-map.html"
];
assert.deepEqual(nishinomiya.features.map(f=>f.url),expectedNishinomiya,"比較基準として選んだ西宮市の元リンクが変わりました");
const html=read("v2/region-top/index.html");
assert.ok(html.includes('name="robots" content="noindex,follow"'));
assert.ok(html.includes("id=\"regionMenu\"")&&html.includes("id=\"featureList\""));
assert.ok(html.includes("aria-current"));
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];assert.ok(script);new vm.Script(script);
for(const p of ["v2/geography/index.html","v2/geography/data/hierarchy.json"]){
 assert.ok(fs.existsSync(path.join(root,p)),"existing geography path preserved");
}
console.log("PASS: 9 data-driven region tops (1 prefecture, 5 existing cities, 3 unconnected planned municipalities)");
console.log("PASS: original Nishinomiya feature paths, 721 counts, safe URLs, pilot noindex, JS syntax");
