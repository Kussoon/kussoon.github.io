/* Kussoon V2 town SVG: municipality-independent dataset contract, phase 4.
 * Side-by-side with the existing loader. No change to approved map pages.
 * Owns loading and validation only; geography-specific exceptions are adapters.
 */
(function(root){
 'use strict';
 const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
 const isText=x=>typeof x==='string'&&x.trim().length>0;
 const validPath=x=>isText(x)&&x.startsWith('/')&&!x.startsWith('//');
 function validateManifest(manifest){
  if(!manifest||typeof manifest!=='object')throw new TypeError('自治体設定が必要です');
  const required=['municipalityId','topologyUrl','mappingUrl','objectName','townNameProperty'];
  for(const key of required)if(!isText(manifest[key]))throw new Error('設定値がありません: '+key);
  if(!/^[a-z0-9][a-z0-9-]*$/.test(manifest.municipalityId))throw new Error('自治体ID形式が不正です');
  if(!validPath(manifest.topologyUrl)||!validPath(manifest.mappingUrl))
   throw new Error('町域・地域所属は同一サイト内の絶対パスが必要です');
  if(manifest.exceptionUrl!=null&&!validPath(manifest.exceptionUrl))
   throw new Error('特殊形状の指定が不正です');
  if(!Number.isSafeInteger(manifest.expectedTownCount)||manifest.expectedTownCount<=0)
   throw new Error('町名数が不正です');
  if(!Number.isSafeInteger(manifest.expectedRegionCount)||manifest.expectedRegionCount<=0)
   throw new Error('地域数が不正です');
  return Object.freeze({
   municipalityId:manifest.municipalityId,
   topologyUrl:manifest.topologyUrl,
   mappingUrl:manifest.mappingUrl,
   exceptionUrl:manifest.exceptionUrl||null,
   objectName:manifest.objectName,
   townNameProperty:manifest.townNameProperty,
   expectedTownCount:manifest.expectedTownCount,
   expectedRegionCount:manifest.expectedRegionCount
  });
 }
 async function load(manifest,deps){
  const cfg=validateManifest(manifest);
  if(!deps||typeof deps.fetchJSON!=='function'||!deps.topojsonClient
    ||typeof deps.topojsonClient.feature!=='function')
   throw new TypeError('fetchJSON と topojsonClient.feature が必要です');
  // Do not fetch /null or create fake exception TopoJSON for ordinary towns.
  const tasks=[deps.fetchJSON(cfg.topologyUrl),deps.fetchJSON(cfg.mappingUrl)];
  if(cfg.exceptionUrl)tasks.push(deps.fetchJSON(cfg.exceptionUrl));
  const values=await Promise.all(tasks);
  const topology=values[0],mapping=values[1],subtopology=values[2]||null;
  if(!topology||topology.type!=='Topology'||!topology.objects||!own(topology.objects,cfg.objectName))
   throw new Error('町域Topologyが不正です');
  const collection=deps.topojsonClient.feature(topology,topology.objects[cfg.objectName]);
  const features=collection&&collection.features;
  if(!Array.isArray(features)||features.length!==cfg.expectedTownCount)
   throw new Error('町名図形の件数が不一致です: '+(features&&features.length));
  const names=features.map(x=>x&&x.properties&&x.properties[cfg.townNameProperty]);
  if(names.some(x=>!isText(x))||new Set(names).size!==names.length)
   throw new Error('町名IDの欠落または重複を検出しました');
  if(!mapping||!Array.isArray(mapping.communities)||mapping.communities.length!==cfg.expectedRegionCount
    ||mapping.communities.some(x=>!isText(x))
    ||new Set(mapping.communities).size!==mapping.communities.length)
   throw new Error('地域の件数・重複・名前が不正です');
  if(!mapping.towns||typeof mapping.towns!=='object'||Array.isArray(mapping.towns))
   throw new Error('地域所属レコードが不正です');
  if(subtopology&&(!subtopology.objects||subtopology.type!=='Topology'))
   throw new Error('特殊形状のTopoJSONが不正です');
  // No automatic merging, splitting, label removal or region reassignment.
  return {manifest:cfg,topology,mapping,subtopology,features};
 }
 root.KussoonTownSvgDataContract=Object.freeze({validateManifest,load});
})(typeof window!=='undefined'?window:globalThis);
