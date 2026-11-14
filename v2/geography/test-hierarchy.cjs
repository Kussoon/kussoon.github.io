// Kussoon V2 geography hierarchy: static, source-backed contracts.
// Usage: node v2/geography/test-hierarchy.cjs [site-root] [nishinomiya-repo-root]
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=path.resolve(process.argv[2]||"."),nishinomiya=path.resolve(process.argv[3]||"../nishinomiya");
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const config=JSON.parse(read("v2/geography/data/hierarchy.json"));
const html=read("v2/geography/index.html");
assert.equal(config.status,"pilot");
const map=new Map(config.nodes.map(n=>[n.id,n]));
assert.equal(map.size,config.nodes.length,"地域IDの重複");
assert.equal(config.nodes.filter(n=>n.parentId===null).length,1,"世界ルートは一つ");
assert.equal(map.get("world")?.kind,"world","世界ノードなし");
for(const n of config.nodes){
 assert.ok(n.id&&n.name&&n.reading&&n.kind,"必須情報が不足: "+n.id);
 assert.ok(Array.isArray(n.children)&&Array.isArray(n.groups)&&Array.isArray(n.links),"配列が不足: "+n.id);
 if(n.parentId!==null){
  assert.ok(map.has(n.parentId),"親がいません: "+n.id);
  assert.ok(map.get(n.parentId).children.includes(n.id),"親から子へのリンクなし: "+n.id);
 }
 const seen=new Set();let cur=n;
 while(cur){assert.ok(!seen.has(cur.id),"行政親子の循環: "+n.id);seen.add(cur.id);cur=map.get(cur.parentId)}
 for(const child of n.children){assert.ok(map.has(child),"子IDが存在しません: "+child);assert.equal(map.get(child).parentId,n.id,"親子の不整合")}
 for(const l of n.links){
  assert.ok(l.label&&/^\/(?!\/)/.test(l.url)&&!l.url.includes(".."),"外部・相対URLの誤設定: "+l.url);
 }
}
assert.deepEqual(map.get("world").children,["jp"]);
assert.deepEqual(map.get("jp").children,["jp-hyogo"]);
const cities=config.nodes.filter(n=>n.kind==="municipality");
assert.equal(cities.length,5,"第1段階は5市");
for(const city of cities){
 assert.equal(city.parentId,"jp-hyogo");
 assert.ok(city.groups.includes("hanshinkan"));
 assert.ok(city.links.some(x=>x.url.endsWith("/town-search.html")),"町名検索リンクがありません: "+city.id);
}
const west=map.get("jp-hyogo-nishinomiya"),source=west.townData;
assert.ok(source&&source.expectedCount===321);
assert.equal(source.focusUrl,"/v2/nishinomiya-town-study-c.html");
assert.equal(source.focusParam,"town");
assert.ok(html.includes("conf.focusUrl")&&html.includes("encodeURIComponent(town.name)"),"町名からC版へ直接移動するリンクがありません");
const townMapPage=read("v2/nishinomiya-town-study-c.html");
assert.ok(townMapPage.includes("new URLSearchParams(location.search).get('town')"),"C版の町名指定がありません");
assert.ok(townMapPage.includes("if(found){$('hierarchyReturn')"),"無効な町名で地図が壊れない処理がありません");
const topo=JSON.parse(read(source.topologyUrl.replace(/^\//,"")));
const names=topo.objects[source.objectKey].geometries.map(g=>g.properties[source.nameKey]);
assert.equal(names.length,321);assert.equal(new Set(names).size,321);
const readingFile=path.join(nishinomiya,"data/maniac-readings.json");
if(fs.existsSync(readingFile)){
 const readings=JSON.parse(fs.readFileSync(readingFile,"utf8"));
 for(const name of names)assert.ok(readings[name],"町の読み仮名がありません: "+name);
}else console.log("NOTE: 元の西宮市リポジトリ未配置。町名読みデータとの突合は省略");
assert.ok(html.includes('name="robots" content="noindex,follow"'));
assert.ok(html.includes('src="/common/site-footer.js"'));
assert.ok(html.includes('cloud.umami.is/script.js'));
assert.ok(html.includes("最大35件表示"));
assert.ok(html.includes("#town:")&&html.includes("#towns:"));
assert.ok(!html.includes("location.replace("),"既存公開URLを変更してはいけません");
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,"ナビゲーションJSがありません");new vm.Script(inline,{filename:"hierarchy-pilot.js"});
console.log("PASS: 世界→日本→兵庫県→5市、親子・ID・循環・読み仮名・リンク");
console.log("PASS: 西宮市321町名データ、試作属性、検索35件、JS構文");
