// Usage: node scripts/audit-nishinomiya-town-v2.cjs [site-root] [nishinomiya-root]
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const site=path.resolve(process.argv[2]||"."),old=path.resolve(process.argv[3]||"../nishinomiya");
const read=(root,file)=>fs.readFileSync(path.join(root,file),"utf8");
const c=read(site,"v2/nishinomiya-town-study-c.html"),b=read(site,"v2/nishinomiya-town-comparison-b.html");
const t=JSON.parse(read(site,"v2/data/nishinomiya-town-v2-premerged.topojson"));
const special=JSON.parse(read(site,"v2/data/nishinomiya-uekoto-community.topojson"));
const m=JSON.parse(read(old,"data/community-town-map.json"));
const orig=JSON.parse(read(old,"data/nishinomiya-towns.topojson"));
const ext=JSON.parse(read(old,"data/maniac-readings.json"));
const js=c.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];assert.ok(js);new vm.Script(js);
const readMatch=c.match(/const READINGS=(\{[^\n]+?\}), LABEL_OFFSETS=/);assert.ok(readMatch);
const readings=JSON.parse(readMatch[1]);
const css=v=>v.match(/\.town-label\{[^}]+\}/)?.[0];
assert.equal(css(c),css(b),"B版ラベルCSS変更");
const features=t.objects.town.geometries,names=features.map(x=>x.properties.S_NAME);
assert.equal(names.length,321);assert.equal(new Set(names).size,321);assert.equal(m.communities.length,26);
for(const name of names)assert.ok(readings[name]&&readings[name]===ext[name],"読み仮名: "+name);
const arcCheck=a=>a.forEach(x=>Array.isArray(x)?arcCheck(x):assert.ok(Number.isInteger(x)&&t.arcs[x<0?~x:x],"アーク参照"));
for(const g of features){assert.ok(g.arcs.length);arcCheck(g.arcs)}
const norm=x=>x.replace(/[一二三四五六七八九十百]+丁目$/,""),valid=new Set(m.communities);
const fromOriginal=new Set(orig.objects.town.geometries.filter(g=>g.properties.S_NAME==="岡田山"||valid.has(m.towns[g.properties.S_NAME]?.community)).map(g=>norm(g.properties.S_NAME)));
assert.deepEqual([...fromOriginal].sort(),[...names].sort());
const counts=new Map();for(const [raw,entry] of Object.entries(m.towns)){const n=norm(raw),bucket=counts.get(n)||new Map();bucket.set(entry.community,(bucket.get(entry.community)||0)+1);counts.set(n,bucket)}
const assigned=new Map();for(const [n,countsByRegion] of counts){const sorted=[...countsByRegion].filter(([co])=>valid.has(co)).sort((a,b)=>b[1]-a[1]);if(sorted.length)assigned.set(n,sorted[0][0])}assigned.set("岡田山","上ヶ原");
const groups=m.communities.map(co=>({co,names:names.filter(n=>assigned.get(n)===co||(n==="岡田山"&&co==="広田")||(n==="上甲東園"&&co==="甲東"))}));
assert.equal(groups.reduce((s,g)=>s+g.names.length,0),323);assert.ok(groups.every(g=>g.names.length));
assert.equal(groups.find(g=>g.co==="上ヶ原").names.length,18);assert.equal(groups.find(g=>g.co==="西宮浜").names.length,1);
assert.ok(names.every(n=>groups.some(g=>g.names.includes(n))));
assert.equal(counts.get("上甲東園").size,2);
const splitParts=special.objects.town.geometries;
assert.equal(splitParts.length,6);
assert.equal(splitParts.filter(g=>g.properties.community==="上ヶ原").length,4);
assert.equal(splitParts.filter(g=>g.properties.community==="甲東").length,2);
for(const g of splitParts){assert.equal(m.towns[g.properties.S_NAME].community,g.properties.community);const originalGeometry=orig.objects.town.geometries.find(x=>x.properties.S_NAME===g.properties.S_NAME);assert.ok(originalGeometry,"元の丁目が存在しません");
 const asArcs=(geometry,arcData)=>{const output=[];const walk=v=>Array.isArray(v)?v.forEach(walk):output.push(JSON.stringify((v<0?[...arcData[~v]].reverse():arcData[v])));walk(geometry.arcs);return output.sort()};
 assert.deepEqual(asArcs(g,special.arcs),asArcs(originalGeometry,orig.arcs),"元町丁の境界座標を保持: "+g.properties.S_NAME);}
for(const g of splitParts){const visit=v=>Array.isArray(v)?v.forEach(visit):assert.ok(Number.isInteger(v)&&special.arcs[v<0?~v:v],"分割アーク参照");visit(g.arcs)}
assert.ok(js.includes("initRegionalShapes(subtopology)"),"分割データが未使用");
assert.ok(js.includes("regionLayers?.[communityChoice]"),"地域ごとに図形を切替していません");
assert.ok(js.includes("it.name==='岡田山'"),"岡田山の未分割状態が未処理");
const fnSource=js.match(/function choiceCandidates\(target\)\{[^\n]+\}/)?.[0];assert.ok(fnSource);
const items=names.map((name,i)=>({name,layer:{getBounds:()=>({getCenter:()=>({lat:Math.floor(i/20),lng:i%20})})}}));
const map={distance:(a,b)=>Math.hypot(a.lat-b.lat,a.lng-b.lng)},adjacency=new Map(),shuffleQuiz=x=>x;
let checks=0;
for(const g of groups){const set=new Set(g.names),scopeItems=()=>items.filter(it=>set.has(it.name));
 const candidate=new Function("items","scopeItems","adjacency","communityByTown","map","shuffleQuiz","communityChoice",fnSource+";return choiceCandidates")(items,scopeItems,adjacency,assigned,map,shuffleQuiz,g.co);
 for(const name of g.names){if(name==="岡田山"&&(g.co==="上ヶ原"||g.co==="広田"))continue;const opts=candidate(name);assert.equal(opts.length,4,g.co+":"+name);assert.equal(new Set(opts).size,4);assert.ok(opts.includes(name));checks++}
}
for(const token of ["quizWrongPlaces.has(it.name)","quizWrongPlaces.add(it.name)","button.classList.add('quiz-wrong')","startQuiz(quizLastMode,[...quizWrong])","finishQuiz(true)","quizTownName(name)","communityChoice?'区域全体':'市の全体'"])assert.ok(js.includes(token),token);
assert.ok(c.includes("body.town-quiz-mode #reading{display:none!important}"));
console.log("PASS 321町名 / 26地域 / 読み仮名 / アーク参照 / B版ラベルCSS");
console.log("PASS "+checks+"地域別出題（4択・正解・重複なし）、主要クイズ動作の構造検査");
console.log("PASS 上甲東園の上ヶ原4丁目分・甲東2丁目分の境界を元データで照合");
console.log("REVIEW 岡田山は番地別境界がないため参考表示、地域別クイズ出題を保留。Safari実機テストは未実施");
