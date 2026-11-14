// Kussoon V2 geography hierarchy: static, source-backed contracts.
// Usage: node v2/geography/test-hierarchy.cjs [site-root] [nishinomiya-repo-root]
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=path.resolve(process.argv[2]||"."),nishinomiya=path.resolve(process.argv[3]||"../nishinomiya"),takarazuka=path.resolve(process.argv[4]||"../takarazuka"),amagasaki=path.resolve(process.argv[5]||"../amagasaki"),itami=path.resolve(process.argv[6]||"../itami"),ashiya=path.resolve(process.argv[7]||"../ashiya");
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
const takaNode=map.get("jp-hyogo-takarazuka"),takaSource=takaNode.townData;
assert.ok(takaSource&&takaSource.sourceKind==="town-info-array"&&takaSource.expectedCount===125);
assert.equal(takaSource.infoUrl,"/takarazuka/data/takarazuka-town-info.json");
assert.equal(takaSource.focusUrl,"/takarazuka/town-search.html");
assert.equal(takaSource.focusParam,"q");
assert.equal(takaSource.focusMode,"search");
const infoPath=path.join(takarazuka,"data/takarazuka-town-info.json");
const topoPath=path.join(takarazuka,"data/takarazuka-towns.topojson");
if(fs.existsSync(infoPath)&&fs.existsSync(topoPath)){
 const info=JSON.parse(fs.readFileSync(infoPath,"utf8")).towns;
 const rawTopo=JSON.parse(fs.readFileSync(topoPath,"utf8"));
 const normalize=s=>s.replace(/[一二三四五六七八九十百]+丁目$/,"");
 const rawNames=[...new Set(rawTopo.objects.town.geometries.map(g=>normalize(g.properties.S_NAME)))];
 const normalizedRaw=rawNames.map(s=>s==="布売自由ガ丘"?"売布自由ガ丘":s);
 assert.equal(rawTopo.objects.town.geometries.length,398,"宝塚市の元図形数");
 assert.equal(info.length,125,"宝塚市の町名台帳件数");
 assert.equal(new Set(info.map(t=>t.name)).size,125,"宝塚市の町名重複");
 assert.ok(info.every(t=>t.name&&t.reading),"宝塚市の読み仮名欠落");
 assert.deepEqual(normalizedRaw.sort(),info.map(t=>t.name).sort(),"宝塚市の町名と元TopoJSONが不一致");
 const search=fs.readFileSync(path.join(takarazuka,"town-search.html"),"utf8");
 assert.ok(search.includes("new URLSearchParams(location.search).get('q')"),"既存宝塚市検索で?qが未対応");
}else console.log("NOTE: 宝塚市元リポジトリ未配置。125町名の照合は省略");
const amaga=map.get("jp-hyogo-amagasaki")?.townData;
assert.ok(amaga&&amaga.sourceKind==="town-list-json"&&amaga.expectedCount===140);
assert.equal(amaga.focusUrl,"/v2/geography/amagasaki-focus.html");
assert.equal(amaga.focusParam,"town");
assert.equal(amaga.focusMode,"bridge");
const generated=JSON.parse(read(amaga.listUrl.replace(/^\//,"")));
assert.equal(generated.count,140);assert.equal(generated.towns.length,140);
assert.equal(new Set(generated.towns.map(t=>t.name)).size,140);
assert.ok(generated.towns.every(t=>t.name&&t.reading),"尼崎市の町名・読み仮名欠落");
assert.ok(generated.towns.some(t=>t.name==="上食満"&&t.reading==="かみけま"),"上食満を維持");
const oldAmagaPath=path.join(amagasaki,"town-search.html");
if(fs.existsSync(oldAmagaPath)){
 const oldPage=fs.readFileSync(oldAmagaPath,"utf8");
 const start=oldPage.indexOf("const data="),end=oldPage.indexOf("],byName=",start);
 assert.ok(start>=0&&end>=0,"尼崎市の既存町名データの抽出不可");
 const original=JSON.parse(oldPage.slice(start+"const data=".length,end+1));
 assert.deepEqual(generated.towns,original,"尼崎市140町の軽量データが元ページと不一致");
 const shapes=[...oldPage.matchAll(/<path class="town" data-name="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(shapes.length,140,"尼崎市の地図面数が変化");
 assert.deepEqual(shapes.slice().sort(),original.map(t=>t.name).sort(),"尼崎市の町名と地図面が不一致");
}else console.log("NOTE: 尼崎市元リポジトリ未配置。原本との突合省略");
const itamiNode=map.get("jp-hyogo-itami")?.townData;
assert.ok(itamiNode&&itamiNode.sourceKind==="town-list-json"&&itamiNode.expectedCount===76);
assert.equal(itamiNode.focusUrl,"/v2/geography/itami-focus.html");
assert.equal(itamiNode.focusMode,"bridge");
const itamiIndex=JSON.parse(read(itamiNode.listUrl.replace(/^\//,"")));
assert.equal(itamiIndex.count,76);assert.equal(itamiIndex.towns.length,76);
assert.equal(new Set(itamiIndex.towns.map(t=>t.name)).size,76);
assert.ok(itamiIndex.towns.every(t=>t.name&&t.reading));
const itamiOldPath=path.join(itami,"town-search.html");
if(fs.existsSync(itamiOldPath)){
 const old=fs.readFileSync(itamiOldPath,"utf8");
 const match=old.match(/const SEARCH_INDEX=(\[[\s\S]*?\]);\s*\n\s*const input=/);
 assert.ok(match,"伊丹市の町名原本の抽出不可");
 assert.deepEqual(itamiIndex.towns,JSON.parse(match[1]),"伊丹市76町名の原本との不一致");
 const polygons=[...old.matchAll(/<path class="town" data-name="([^"]+)"/g)].map(m=>m[1]);
 const labels=[...old.matchAll(/<text\b[^>]*data-name="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(polygons.length,74);
 assert.equal(labels.length,76);
 assert.deepEqual(itamiIndex.towns.filter(t=>!polygons.includes(t.name)).map(t=>t.name).sort(),["小阪田","東桑津"].sort());
 assert.ok(["小阪田","東桑津"].every(name=>labels.includes(name)),"文字アンカーを持たない町名");
}else console.log("NOTE: 伊丹市元リポジトリ未配置。原本との突合省略");
const itamiBridge=read("v2/geography/itami-focus.html");
assert.ok(itamiBridge.includes('src="/itami/town-search.html"'));
assert.ok(itamiBridge.includes("text[data-name]"));
const bridgeInline=itamiBridge.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(bridgeInline);new vm.Script(bridgeInline);
const ashiyaNode=map.get("jp-hyogo-ashiya")?.townData;
assert.ok(ashiyaNode&&ashiyaNode.sourceKind==="town-list-json"&&ashiyaNode.expectedCount===59);
assert.equal(ashiyaNode.focusUrl,"/v2/geography/ashiya-focus.html");
assert.equal(ashiyaNode.focusParam,"town");
assert.equal(ashiyaNode.focusMode,"bridge");
const ashiyaIndex=JSON.parse(read(ashiyaNode.listUrl.replace(/^\//,"")));
assert.equal(ashiyaIndex.count,59);
assert.equal(ashiyaIndex.towns.length,59);
assert.equal(new Set(ashiyaIndex.towns.map(t=>t.name)).size,59);
assert.ok(ashiyaIndex.towns.every(t=>t.name&&t.reading),"芦屋市の読み仮名欠落");
assert.ok(ashiyaIndex.towns.some(t=>t.name==="南浜町"&&t.reading==="みなみはまちょう"));
const originalAshiyaPath=path.join(ashiya,"town-search.html");
if(fs.existsSync(originalAshiyaPath)){
 const original=fs.readFileSync(originalAshiyaPath,"utf8");
 const start=original.indexOf("const data = ["),end=original.indexOf("],\n        byName =",start);
 assert.ok(start>=0&&end>=0,"芦屋市の元台帳を抽出できません");
 const sourceRecords=[...original.slice(start,end).matchAll(/\{\s*name:\s*"([^"]+)",\s*reading:\s*"([^"]+)"\s*\}/g)].map(m=>({name:m[1],reading:m[2]}));
 assert.deepEqual(ashiyaIndex.towns,sourceRecords,"芦屋市の元データと不一致");
 const pathNames=[...original.matchAll(/<path\s+class="town"\s+data-name="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(pathNames.length,59,"芦屋市町名検索のポリゴン件数");
 assert.deepEqual(pathNames.slice().sort(),sourceRecords.map(t=>t.name).sort(),"芦屋市59町名と元SVGが不一致");
}else console.log("NOTE: 芦屋市元リポジトリ未配置。原本との突合省略");
const ashiyaBridge=read("v2/geography/ashiya-focus.html");
assert.ok(ashiyaBridge.includes('src="/ashiya/town-search.html"'));
assert.ok(ashiyaBridge.includes("doc.querySelector('#townSearch')"));
assert.ok(ashiyaBridge.includes('name="robots" content="noindex,follow"'));
const ashiyaInline=ashiyaBridge.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(ashiyaInline);new vm.Script(ashiyaInline);
assert.ok(html.includes("conf.sourceKind==='town-list-json'"),"尼崎市の軽量町名アダプター欠落");
const bridge=read("v2/geography/amagasaki-focus.html");
assert.ok(bridge.includes('src="/amagasaki/town-search.html"'),"既存尼崎市地図が読まれません");
assert.ok(bridge.includes('doc.querySelector(\'#townSearch\')'),"既存尼崎市検索への連携がありません");
assert.ok(bridge.includes('name="robots" content="noindex,follow"'));
const bridgeScript=bridge.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];assert.ok(bridgeScript);new vm.Script(bridgeScript);
assert.ok(html.includes("conf.sourceKind==='town-info-array'"),"町名台帳形式アダプターがありません");
assert.ok(html.includes('name="robots" content="noindex,follow"'));
assert.ok(html.includes('src="/common/site-footer.js"'));
assert.ok(html.includes('cloud.umami.is/script.js'));
assert.ok(html.includes("最大35件表示"));
assert.ok(html.includes("#town:")&&html.includes("#towns:"));
assert.ok(!html.includes("location.replace("),"既存公開URLを変更してはいけません");
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,"ナビゲーションJSがありません");new vm.Script(inline,{filename:"hierarchy-pilot.js"});
console.log("PASS: 世界→日本→兵庫県→5市、親子・ID・循環・読み仮名・リンク");
console.log("PASS: 西宮市321・宝塚市125・尼崎市140・伊丹市76・芦屋市59町名／例外照合");
