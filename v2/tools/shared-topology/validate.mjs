#!/usr/bin/env node
/** Validate that independently loaded prefecture slices preserve shared arcs. */
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const at=process.argv.indexOf('--dir'),dir=resolve(at>=0?process.argv[at+1]||'./generated':'./generated');
const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
const inputFiles=(await import('node:fs/promises')).readdir;
const prefs=(await inputFiles(dir)).filter(x=>/^\d{2}\.topojson$/.test(x)).map(x=>x.slice(0,2)).sort();
if(prefs.length!==manifest.prefectureCount)throw Error('Incorrect prefecture count '+prefs.length);
const arcsByPref=new Map(),codes=new Set(),regions=[];
let transformSignature=null;
for(const pref of prefs){
 const geo=JSON.parse(await readFile(join(dir,pref+'.topojson'),'utf8'));
 if(geo.type!=='Topology'||!geo.objects?.municipalities||!Array.isArray(geo.arcs))
  throw Error('Invalid TopoJSON: '+pref);
 const signature=JSON.stringify(geo.transform||null);
 if(transformSignature===null)transformSignature=signature;
 else if(signature!==transformSignature)throw Error('Different coordinate transforms: '+pref);
 const features=geo.objects.municipalities.geometries;
 for(const g of features){
  const code=String(g.properties?.N03_007||'');
  if(code.slice(0,2)!==pref||codes.has(code))throw Error('Invalid or duplicated code '+code);
  codes.add(code);regions.push(code);
 }
 const hashes=new Set(geo.arcs.map(arc=>JSON.stringify(arc)));
 arcsByPref.set(pref,hashes);
}
if(regions.length!==manifest.regionCount)throw Error('Incorrect region count '+regions.length);
const actual={};
for(let a=0;a<prefs.length;a++)for(let b=a+1;b<prefs.length;b++){
 const left=arcsByPref.get(prefs[a]),right=arcsByPref.get(prefs[b]);
 let common=0;
 for(const arc of left)if(right.has(arc))common++;
 if(common)actual[prefs[a]+'-'+prefs[b]]=common;
}
for(const [pair,count] of Object.entries(manifest.sharedPrefectureArcCounts)){
 if(actual[pair]!==count)throw Error('Shared arc mismatch '+pair+': expected '+count+', got '+(actual[pair]||0));
}
const unexpected=Object.keys(actual).filter(k=>!(k in manifest.sharedPrefectureArcCounts));
if(unexpected.length)throw Error('Unexpected shared prefecture arc pairs: '+unexpected.join(','));
console.log('PASS: '+prefs.length+' prefectures, '+regions.length+' regions, '+Object.keys(actual).length+' shared-prefecture seams; all arcs identical.');
