#!/usr/bin/env node
/** Extract a small visual comparison from the nationwide common topology. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const [generatedArg,legacyArg,outArg]=process.argv.slice(2);
if(!generatedArg||!legacyArg||!outArg)throw Error('Usage: node extract-national-border-pilot.mjs GENERATED_DIR LEGACY_DATA_ROOT OUTPUT_DIR');
const generated=resolve(generatedArg),legacyRoot=resolve(legacyArg),out=resolve(outArg);
const expected=[
 ['07','08'],['07','09'],['07','15'],['06','15'],['10','15'],['10','20'],['11','20'],
 ['14','22'],['16','21'],['17','21'],['18','21'],['18','25'],['18','26'],['19','22'],
 ['20','21'],['20','22'],['20','23'],['21','25'],['24','25'],['24','29'],['28','31'],['28','33']
];
const prefNames=['','北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const indexOf=id=>id<0?~id:id;
function visit(g,fn){
 if(g.type==='Polygon')for(const r of g.arcs)for(const id of r)fn(id);
 else if(g.type==='MultiPolygon')for(const p of g.arcs)for(const r of p)for(const id of r)fn(id);
 else throw Error('Unsupported geometry '+g.type);
}
function decode(t){
 const tr=t.transform;
 return t.arcs.map(arc=>{
  let x=0,y=0;
  return arc.map(q=>{
   if(!tr)return [q[0],q[1]];
   x+=q[0];y+=q[1];
   return [x*tr.scale[0]+tr.translate[0],y*tr.scale[1]+tr.translate[1]];
  });
 });
}
function bounds(lines){
 const b=[Infinity,Infinity,-Infinity,-Infinity];
 for(const line of lines)for(const [x,y] of line){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}
 return b;
}
function intersects(a,b){return a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}
function lineBounds(line){return bounds([line]);}

const built=JSON.parse(await readFile(join(generated,'national.topojson'),'utf8'));
const buildManifest=JSON.parse(await readFile(join(generated,'manifest.json'),'utf8'));
const geometries=built.objects?.municipalities?.geometries;
if(!Array.isArray(geometries))throw Error('Missing municipalities in nationwide topology');
const owners=new Map();
for(const g of geometries){
 const pref=String(g.properties?.N03_007||'').slice(0,2);
 if(!/^\d{2}$/.test(pref))throw Error('Invalid region code in generated topology');
 visit(g,id=>{
  const idx=indexOf(id);
  if(!owners.has(idx))owners.set(idx,new Set());
  owners.get(idx).add(pref);
 });
}
const arcs=decode(built), common=new Map();
for(const [a,b] of expected){
 const pair=a+'-'+b, ids=[];
 for(const [idx,set] of owners)if(set.has(a)&&set.has(b))ids.push(idx);
 if(!ids.length)throw Error('Expected contiguous prefecture pair has no shared arc: '+pair);
 const lines=ids.map(i=>arcs[i]).filter(line=>line.length>=2);
 if(!lines.length)throw Error('No drawable shared arc for '+pair);
 common.set(pair,{ids,lines});
}
for(const [a,b] of expected){
 const pair=a+'-'+b;
 if(!(buildManifest.sharedPrefectureArcCounts?.[pair]>0))throw Error('Manifest does not record common arcs for '+pair);
}
const legacyManifest=JSON.parse(await readFile(join(legacyRoot,'national-2026-pilot/manifest.json'),'utf8'));
const entries=new Map(legacyManifest.entries.map(x=>[x.pref,x]));
const features=[],summary=[];
for(const [a,b] of expected){
 const pair=a+'-'+b, shared=common.get(pair), extent=bounds(shared.lines);
 const padded=[extent[0]-.12,extent[1]-.12,extent[2]+.12,extent[3]+.12];
 const oldCounts={};
 for(const pref of [a,b]){
  const entry=entries.get(pref);
  if(!entry)throw Error('Missing legacy manifest entry for '+pref);
  const t=JSON.parse(await readFile(join(legacyRoot,entry.source),'utf8'));
  const selected=t.objects.municipalities.geometries.filter(g=>String(g.properties?.N03_007||'').startsWith(pref));
  if(!selected.length)throw Error('No legacy geometries for '+pref);
  const refs=new Map();
  for(const g of selected)visit(g,id=>{const idx=indexOf(id);refs.set(idx,(refs.get(idx)||0)+1);});
  const oldArcs=decode(t), retained=[];
  for(const [idx,count] of refs){
   const line=oldArcs[idx];
   if(count===1&&line.length>=2&&intersects(lineBounds(line),padded)){
    features.push({type:'Feature',properties:{pair,stage:'current',pref,arcIndex:idx},geometry:{type:'LineString',coordinates:line}});
    retained.push(idx);
   }
  }
  oldCounts[pref]=retained.length;
  if(!retained.length)throw Error('No current external boundary lines near shared seam for '+pair+' side '+pref);
 }
 for(const idx of shared.ids){
  features.push({type:'Feature',properties:{pair,stage:'common',pref:'both',arcIndex:idx},geometry:{type:'LineString',coordinates:arcs[idx]}});
 }
 summary.push({
  pair,names:[prefNames[Number(a)],prefNames[Number(b)]],
  currentExternalArcCount:oldCounts,
  commonArcCount:shared.ids.length,
  commonArcIDs:shared.ids,
  exactSharedCoordinates:true,
  extent
 });
}
await mkdir(out,{recursive:true});
const collection={type:'FeatureCollection',metadata:{
 source:'国土数値情報 行政区域 N03 2026, processed through one nationwide topology',
 method:'Current separately generated exterior arcs are shown in blue/orange; green features are single arc records referenced by both prefecture codes in one national topology.',
 pairs:summary.length
},features};
await writeFile(join(out,'border-comparison.geojson'),JSON.stringify(collection)+'\n','utf8');
await writeFile(join(out,'manifest.json'),JSON.stringify({
 schemaVersion:1,source:buildManifest.source,prefectureCount:47,regionCount:buildManifest.regionCount,
 checkedPairs:summary.length,allExpectedPairsHaveSharedArcs:summary.every(x=>x.commonArcCount>0),
 pairs:summary
},null,2)+'\n','utf8');
console.log('PASS: '+summary.length+' expected cross-group land borders; exact common arcs present for every pair.');
for(const x of summary)console.log('PASS '+x.pair+': '+x.commonArcCount+' common arcs');
