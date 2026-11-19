/* TOWNMAP-SSOT-001 — TopoJSON-to-SVG drawing bridge (opt-in).
 * Uses the accepted D3 Mercator/geoPath and TopoJSON merge algorithms.
 * No city names, no invented data, no mutation of approved source geometry.
 * Regional feature parts are grouped by verified community + a configurable
 * source-name normalization, not by municipality-specific render branches.
 */
(function(root){
 'use strict';
 function create({unified,prepared,d3,topojsonClient,
                 width=1000,height=720,padding=22,
                 normalizeSubName=name=>name}={}){
  if(!unified||unified.sourceFormat!=='topojson'||!unified.subtopology
    ||!prepared||!Array.isArray(prepared.records)||!Array.isArray(prepared.regions)
    ||prepared.municipalityId!==unified.municipalityId
    ||!d3?.geoMercator||!d3?.geoPath||!topojsonClient?.merge
    ||typeof normalizeSubName!=='function')
   throw new TypeError('検証済みのGeoJSON・地域別原図が必要です');
  if(!Number.isFinite(width)||width<=2*padding
    ||!Number.isFinite(height)||height<=2*padding)
   throw new Error('地図投影範囲が不正です');
  const names=new Set(prepared.records.map(r=>r.name));
  const regionSet=new Set(prepared.regions.map(r=>r.name));
  if(names.size!==prepared.records.length)throw new Error('重複町名があります');
  const features=prepared.records.map(r=>{
   if(r.geometry?.format!=='geojson'||r.geometry.data?.type!=='Feature'
    ||!r.geometry.data.geometry)throw new Error('未対応の町域形状: '+r.name);
   return r.geometry.data;
  });
  const projection=d3.geoMercator().fitExtent([[padding,padding],
   [width-padding,height-padding]],{type:'FeatureCollection',features});
  const path=d3.geoPath(projection),paths=new Map();
  const records=prepared.records.map(r=>{
   const data=path(r.geometry.data);
   if(typeof data!=='string'||!data)throw new Error('投影できない町域: '+r.name);
   paths.set(r.name,data);
   return Object.freeze({...r,geometry:{format:'svg-path',data}});
  });
  const shape=unified.subtopology.objects?.town;
  if(!shape||!Array.isArray(shape.geometries))throw new Error('地域別形状原図が不正です');
  const groups=new Map();
  for(const item of shape.geometries){
   const region=item?.properties?.community;
   const originalName=item?.properties?.S_NAME;
   if(typeof region!=='string'||typeof originalName!=='string'
     ||!regionSet.has(region))throw new Error('地域別形状の属性に欠落があります');
   const name=normalizeSubName(originalName);
   if(!names.has(name))throw new Error('地域別形状が未登録の町です: '+originalName);
   const approved=prepared.records.find(r=>r.name===name);
   if(!approved.communities.includes(region))
    throw new Error('地域別形状の所属がV34と不一致です: '+originalName);
   const key=region+'\u0000'+name,items=groups.get(key)||[];
   items.push(item);groups.set(key,items);
  }
  const regionPaths=new Map(),regionFeatures=new Map();
  for(const [key,items] of groups){
   const geometry=topojsonClient.merge(unified.subtopology,items);
   const name=normalizeSubName(items[0].properties.S_NAME);
   const feature={type:'Feature',properties:{S_NAME:name},geometry};
   const d=path(feature);
   if(!d)throw new Error('地域別形状を投影できません: '+key);
   regionPaths.set(key,d);regionFeatures.set(key,feature);
  }
  return Object.freeze({
   records:Object.freeze(records),projection,path,viewBox:'0 0 '+width+' '+height,
   sourceFeatures:features,regionPathCount:regionPaths.size,
   sourceGeometryCount:shape.geometries.length,
   pathFor:(name,region='')=>regionPaths.get(region+'\u0000'+name)||paths.get(name),
   featureFor:(name,region='')=>regionFeatures.get(region+'\u0000'+name)||
    features.find(f=>f.properties.S_NAME===name),
   hasRegionPath:(name,region)=>regionPaths.has(region+'\u0000'+name)
  });
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgTopoProjection=api;
})(typeof globalThis!=='undefined'?globalThis:this);
