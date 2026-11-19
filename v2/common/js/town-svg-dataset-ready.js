/* TOWNMAP-SSOT-001 R-TOWN-00/06/10/13/14/30/44
 * Data-only readiness gate for nationwide SVG town-map generation.
 * Input is loadUnified() output plus verified town/region readings.
 * No municipality IDs or guessed readings/regions are hardcoded.
 * This is opt-in; existing approved map pages are not modified.
 */
(function(root){
 'use strict';
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const text=x=>typeof x==='string'&&x.trim().length>0;
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const unique=a=>new Set(a).size===a.length;
 function prepare({unified,townMetadata={},regionReadings={}}={}){
  if(!plain(unified)||!text(unified.municipalityId)||!Array.isArray(unified.regions)
   ||!Array.isArray(unified.records)||!unified.regions.length||!unified.records.length)
   throw Error('自治体の統一町名データが不足しています');
  if(!plain(townMetadata)||!plain(regionReadings))
   throw Error('町名・地域の読み台帳の形式が不正です');
  const regions=[...unified.regions];
  if(regions.some(x=>!text(x))||!unique(regions))
   throw Error('地域名が不正または重複しています');
  const regionSet=new Set(regions),seen=new Set();
  const namedRegions=regions.map(name=>{
   const reading=regionReadings[name];
   if(!text(reading))throw Error('地域の読みが未確認です: '+name);
   return Object.freeze({name,reading});
  });
  for(const name of Object.keys(regionReadings))
   if(!regionSet.has(name))throw Error('地域台帳に対象外の地域があります: '+name);
  const records=unified.records.map(record=>{
   if(!plain(record)||!text(record.name)||seen.has(record.name))
    throw Error('町名の欠落または重複があります: '+String(record?.name));
   seen.add(record.name);
   const metadata=own(townMetadata,record.name)?townMetadata[record.name]:null;
   if(metadata!==null&&!plain(metadata))throw Error('町名台帳が不正です: '+record.name);
   // Existing source data stays authoritative. Metadata can only supply
   // previously absent verified facts, never silently overwrite them.
   const originalReading=record.reading;
   const additionalReading=metadata?.reading;
   if(text(originalReading)&&text(additionalReading)&&originalReading!==additionalReading)
    throw Error('読み仮名が一致しません: '+record.name);
   const reading=text(originalReading)?originalReading:additionalReading;
   if(!text(reading))throw Error('町名の読みが未確認です: '+record.name);
   const sourceRegions=record.communities;
   if(!Array.isArray(sourceRegions))throw Error('地域所属の形式が不正です: '+record.name);
   const additionalRegions=metadata?.communities;
   if(additionalRegions!=null&&(!Array.isArray(additionalRegions)||!additionalRegions.length))
    throw Error('追加地域所属が不正です: '+record.name);
   if(sourceRegions.length&&additionalRegions&&
     (sourceRegions.length!==additionalRegions.length||sourceRegions.some(x=>!additionalRegions.includes(x))))
    throw Error('地域所属が一致しません: '+record.name);
   const communities=sourceRegions.length?sourceRegions:additionalRegions;
   if(!Array.isArray(communities)||!communities.length||!unique(communities)
    ||communities.some(name=>!regionSet.has(name)))
    throw Error('地域所属の欠落・重複・不明地域があります: '+record.name);
   const geometry=record.geometry;
   if(!plain(geometry)||!['geojson','svg-path'].includes(geometry.format)
    ||(geometry.format==='svg-path'&&!text(geometry.data))
    ||(geometry.format==='geojson'&&(!plain(geometry.data)||!plain(geometry.data.geometry))))
    throw Error('町域の図形データが不正です: '+record.name);
   // Preserve MultiPolygon, holes and region splits without collapsing shapes.
   return Object.freeze({name:record.name,reading,communities:Object.freeze([...communities]),
    geometry});
  });
  for(const name of Object.keys(townMetadata))
   if(!seen.has(name))throw Error('町名台帳に対象外の町があります: '+name);
  return Object.freeze({
   municipalityId:unified.municipalityId,
   sourceFormat:unified.sourceFormat,
   regions:Object.freeze(namedRegions),
   records:Object.freeze(records)
  });
 }
 const api=Object.freeze({prepare});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgDatasetReady=api;
})(typeof globalThis!=='undefined'?globalThis:this);
