'use strict';
// Zero-dependency full parity test. Parse the same original path source as
// Takarazuka's SVG adapter, compare all 125 targets across 21 scopes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const info=JSON.parse(fs.readFileSync('takarazuka/data/takarazuka-town-info.json','utf8'));
const html=fs.readFileSync('takarazuka/town-search.html','utf8');
const tags=[...html.matchAll(/<path\s+class="town"\s+data-name="([^"]+)"\s+d="([^"]+)"[^>]*>/g)];
assert.equal(tags.length,125,'125 source shapes');
const meta=new Map(info.towns.map(t=>[t.name,t]));
const towns=tags.map(m=>{
 const d=m[2],coords=[...d.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m=>[+m[1],+m[2]]);
 assert.ok(coords.length>2);
 let x1=Infinity,x2=-Infinity,y1=Infinity,y2=-Infinity;
 for(const [x,y] of coords){x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y)}
 const item=meta.get(m[1]);assert.ok(item,'town missing metadata '+m[1]);
 return {name:m[1],d,communities:item.communities,bbox:{x:x1,y:y1,width:x2-x1,height:y2-y1}};
});
assert.equal(new Set(towns.map(t=>t.name)).size,125);
const byName=new Map(towns.map(t=>[t.name,t]));
const groups=[...new Set(towns.flatMap(t=>t.communities))];assert.equal(groups.length,20);
const owners=new Map();
for(const t of towns)for(const part of t.d.match(/M[^M]+/g)||[]){
 const points=[...part.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m=>[+m[1],+m[2]]);
 if(points.length<3)continue;
 for(let i=0;i<points.length;i++){
  const a=points[i].map(v=>v.toFixed(3)).join(','),b=points[(i+1)%points.length].map(v=>v.toFixed(3)).join(',');
  if(a===b)continue;const key=a<b?a+'|'+b:b+'|'+a;
  if(!owners.has(key))owners.set(key,new Set());
  owners.get(key).add(t.name);
 }
}
const adjacency=new Map(towns.map(t=>[t.name,new Set()]));
for(const set of owners.values())if(set.size>1)for(const a of set)for(const b of set)if(a!==b)adjacency.get(a).add(b);
const source=fs.readFileSync('v2/common/js/town-svg-quiz-choices.js','utf8');
const context={};context.globalThis=context;vm.runInNewContext(source,context);
const shared=context.KussoonTownSvgQuizChoices.select;
const center=x=>[x.bbox.x+x.bbox.width/2,x.bbox.y+x.bbox.height/2];
const same=(n,target)=>byName.get(n).communities.some(c=>byName.get(target).communities.includes(c));
const shuffled=x=>x; // identity: test pre-shuffle order exactly
let comparisons=0;
for(const scope of ['',...groups])for(const target of towns){
 const t=target;
 const scoped=scope?towns.filter(x=>x.communities.includes(scope)):towns;
 const [cx,cy]=center(t),distance=x=>{const [a,b]=center(x);return (cx-a)**2+(cy-b)**2};
 const direct=x=>adjacency.get(t.name)?.has(x.name);
 const order=[],seen=new Set([t.name]),add=xs=>{
  for(const x of [...xs].sort((a,b)=>distance(a)-distance(b)))
   if(!seen.has(x.name)){seen.add(x.name);order.push(x.name)}
 };
 const all=towns.filter(x=>x.name!==t.name),subset=scoped.filter(x=>x.name!==t.name);
 add(all.filter(x=>direct(x)&&same(x.name,t.name)));add(all.filter(direct));
 add(subset.filter(x=>same(x.name,t.name)));add(subset);add(all);
 const old=[t.name,...order.slice(0,3)];
 const fresh=[...shared(t.name,{townNames:towns.map(x=>x.name),scopeNames:scoped.map(x=>x.name),
  adjacency,sameRegion:same,distance:n=>distance(byName.get(n)),shuffle:shuffled})];
 assert.deepEqual(fresh,old,'different choices '+scope+' '+t.name);
 assert.equal(fresh.length,4);assert.equal(new Set(fresh).size,4);
 comparisons++;
}
assert.equal(comparisons,2625);
console.log('PASS NATIONAL_CHOICE_2625_EXACT_PARITY '+JSON.stringify({towns:125,scopes:21,compared:comparisons,allChoiceSetsAndOrderIdentical:true,originalSvgShapes:tags.length}));
