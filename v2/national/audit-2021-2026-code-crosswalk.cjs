#!/usr/bin/env node
'use strict';
// Source-level preflight for migrating density.html from 2021 (1902) to 2026 (1905).
// It reports every code mismatch; it never edits municipal geometry or production pages.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('v2/data/national/2026-common/national-2026-pilot/manifest.json');
assert.equal(manifest.prefectureCount,47);
assert.equal(manifest.municipalityCount,1905);
assert.equal(manifest.entries.length,47);
const allOld=new Set(),allNew=new Set(),allOffices=new Set();
const rows=[], diffs=[];
let oldCount=0,newCount=0;
function geometryCodes(topo,pref,version){
 assert.equal(topo.type,'Topology',version+' '+pref);
 const objects=Object.values(topo.objects||{});
 assert.equal(objects.length,1,version+' '+pref+' objects');
 assert(Array.isArray(objects[0].geometries),version+' '+pref+' geometries');
 const codes=new Set();
 for(const g of objects[0].geometries){
  const code=String(g.properties?.N03_007||'');
  assert.match(code,/^\d{5}$/,version+' '+pref+' bad municipal code');
  assert.equal(code.slice(0,2),pref,version+' '+pref+' mismatched prefecture for '+code);
  codes.add(code);
 }
 return {codes, geometries:objects[0].geometries.length};
}
for(const entry of manifest.entries){
 const pref=entry.pref;
 assert.match(pref,/^\d{2}$/);
 const old=geometryCodes(read('v2/data/national/2021/'+pref+'.topojson'),pref,'2021');
 const modern=geometryCodes(read('v2/data/national/2026-common/'+entry.source),pref,'2026');
 assert.equal(modern.codes.size,entry.regions,'2026 manifest mismatch '+pref);
 const directory=read('v2/data/offices/'+pref+'.json');
 assert.equal(directory.prefecture,pref,'office prefecture mismatch '+pref);
 const offices=new Set(Object.keys(directory.regions||{}));
 const removed=[...old.codes].filter(c=>!modern.codes.has(c)).sort();
 const added=[...modern.codes].filter(c=>!old.codes.has(c)).sort();
 const missingOffice2021=[...old.codes].filter(c=>!offices.has(c)).sort();
 const missingOffice2026=[...modern.codes].filter(c=>!offices.has(c)).sort();
 const officesNotIn2026=[...offices].filter(c=>!modern.codes.has(c)).sort();
 rows.push({pref,old:old.codes.size,modern:modern.codes.size,oldGeometry:old.geometries,newGeometry:modern.geometries,removed,added,missingOffice2021,missingOffice2026,officesNotIn2026});
 for(const c of old.codes){assert(!allOld.has(c),'duplicate 2021 code '+c);allOld.add(c);}
 for(const c of modern.codes){assert(!allNew.has(c),'duplicate 2026 code '+c);allNew.add(c);}
 for(const c of offices){assert(!allOffices.has(c),'duplicate office code '+c);allOffices.add(c);}
 oldCount+=old.codes.size;newCount+=modern.codes.size;
 if(removed.length||added.length||missingOffice2026.length) diffs.push(pref);
}
assert.equal(rows.length,47);
assert.equal(allOld.size,1902,'2021 geometry count changed: revisit fixed 5C and readings before migrating');
assert.equal(allNew.size,1905,'2026 geometry count changed');
assert.equal(allOffices.size,1912,'office inventory count changed');
assert.equal(newCount,1905);
assert.equal(oldCount,1902);
const only2021=[...allOld].filter(c=>!allNew.has(c)).sort();
const only2026=[...allNew].filter(c=>!allOld.has(c)).sort();
assert.equal(allNew.size-allOld.size,only2026.length-only2021.length);
const ham=rows.find(x=>x.pref==='22');
for(const c of ['22131','22132','22133','22134','22135','22136','22137'])
 assert(ham.removed.includes(c),'Hamamatsu old 7 wards no longer match: '+c);
for(const c of ['22138','22139','22140'])
 assert(ham.added.includes(c),'Hamamatsu new 3 wards missing: '+c);
const result={
 schemaVersion:1,source:'existing main files; no network or live-browser assertions',
 legend:{removed:'2021 map code absent in 2026',added:'2026 map code absent in 2021',
  missingOffice2026:'2026 geometry lacks matching office-directory region'},
 totals:{prefectures:47,oldMapCodes:allOld.size,newMapCodes:allNew.size,officeRegions:allOffices.size,
  unchangedCodes:allOld.size-only2021.length,removedCodes:only2021.length,addedCodes:only2026.length},
 only2021,only2026,affectedPrefectures:diffs,byPrefecture:rows
};
const dest=process.argv[2];
if(dest){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');}
console.log('PASS static 2021/2026 map+office crosswalk: '+JSON.stringify(result.totals));
for(const r of rows)if(r.removed.length||r.added.length||r.missingOffice2026.length)
 console.log('PREF '+r.pref+' old-only='+r.removed.join(',')+' new-only='+r.added.join(',')+
 ' 2026-without-office='+r.missingOffice2026.join(','));
console.log('No production map or office files were changed.');
