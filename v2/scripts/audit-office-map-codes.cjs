'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../data');
const man=JSON.parse(fs.readFileSync(path.join(root,'national/2026-common/national-2026-pilot/manifest.json'),'utf8'));
const expectedMapOnly=new Set(['01695','01696','01697','01698','01699','01700','12000','13000','23000','30000','40000','46000','47000']);
const knownMapOnlySeen=new Set();
const unexpected=[];
const report={generatedAt:'2026-11-02',mapTotal:0,officeTotal:0,prefectures:[],mapOnlyTotal:0,officeOnlyTotal:0,duplicateMapCodes:[],invalidOfficeLinks:[]};
for(const e of man.entries){
 const data=JSON.parse(fs.readFileSync(path.join(root,'offices',e.pref+'.json'),'utf8'));
 const topo=JSON.parse(fs.readFileSync(path.join(root,'national/2026-common',e.source),'utf8'));
 const geoms=topo.objects?.municipalities?.geometries||[];
 const map=new Map(),duplicate=[];
 for(const g of geoms){
   const code=String(g.properties?.N03_007??'');
   if(map.has(code))duplicate.push(code);
   map.set(code,{code,name:String(g.properties?.N03_004??''),prefecture:String(g.properties?.N03_001??''),city:String(g.properties?.N03_003??'')});
 }
 const office=data.regions;
 const mapOnly=[...map].filter(([c])=>!office[c]).map(([,r])=>r);
 const officeOnly=Object.entries(office).filter(([c])=>!map.has(c)).map(([code,r])=>({code,name:r.name,kind:r.kind}));
 report.prefectures.push({pref:e.pref,topo:e.source,mapRegions:geoms.length,officeRegions:Object.keys(office).length,mapOnly,officeOnly});
 report.mapTotal+=geoms.length;report.officeTotal+=Object.keys(office).length;
 report.mapOnlyTotal+=mapOnly.length;report.officeOnlyTotal+=officeOnly.length;
 for(const entry of mapOnly){
   if(!expectedMapOnly.has(entry.code))unexpected.push({pref:e.pref,reason:'unexpected map-only code',...entry});
   else knownMapOnlySeen.add(entry.code);
 }
 for(const entry of officeOnly){
   const region=office[entry.code];
   if(region.kind!=='designatedCity')unexpected.push({pref:e.pref,reason:'office-only code is not designated city',...entry});
   else {
     const wards=Object.values(office).filter(x=>x.parentCode===entry.code);
     if(!wards.length)unexpected.push({pref:e.pref,reason:'designated city has no wards',...entry});
     for(const ward of wards)if(ward.kind!=='ward'||!ward.officeIds.includes(entry.code+'-city'))unexpected.push({pref:e.pref,reason:'ward not linked to parent city',...entry});
   }
 }
 if(duplicate.length)report.duplicateMapCodes.push({pref:e.pref,codes:duplicate});
 for(const [code,r] of Object.entries(office))if(!/^https:\/\/[^\s]+$/.test(r.official||''))report.invalidOfficeLinks.push({pref:e.pref,code,url:r.official});
}
for(const code of expectedMapOnly)if(!knownMapOnlySeen.has(code))unexpected.push({reason:'expected map-only exception absent',code});
report.knownExceptions={unassignedCodes:['12000','13000','23000','30000','40000','46000','47000'],northernTerritoriesCodes:['01695','01696','01697','01698','01699','01700'],designatedCityParentCount:report.officeOnlyTotal};
report.unexpected=unexpected;
const out=path.resolve(__dirname,'../audit/office-map-coverage-20261102.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n','utf8');
console.log('AUDIT map total',report.mapTotal,'office total',report.officeTotal,'map-only',report.mapOnlyTotal,'office-only',report.officeOnlyTotal);
for(const p of report.prefectures)if(p.mapOnly.length||p.officeOnly.length)
 console.log(p.pref,'mapOnly',p.mapOnly.map(x=>x.code+':'+x.name).join(' / '),'officeOnly',p.officeOnly.map(x=>x.code+':'+x.name).join(' / '));
if(report.mapTotal!==man.municipalityCount)throw Error('Manifest count inconsistency');
if(report.invalidOfficeLinks.length||report.duplicateMapCodes.length||unexpected.length)throw Error('Unexpected map-office mismatch or invalid data: '+JSON.stringify({invalidOfficeLinks:report.invalidOfficeLinks,duplicateMapCodes:report.duplicateMapCodes,unexpected}));
if(report.mapOnlyTotal!==13||report.officeOnlyTotal!==20)throw Error('Expected map/office exception totals changed');
