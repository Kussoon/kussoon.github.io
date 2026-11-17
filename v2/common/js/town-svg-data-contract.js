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
 // One municipality-independent access contract for different source encodings.
 // This adds an adapter layer: it does not rewrite any accepted SVG or TopoJSON.
 // Return records with the same name/communities/geometry shape, retaining the
 // original geometry object verbatim so multipart shapes and holes survive.
 async function loadUnified(manifest,deps){
  if(!manifest||typeof manifest!=='object')throw new TypeError('自治体設定が必要です');
  const mode=manifest.sourceFormat;
  if(mode==='svg'){
   if(!isText(manifest.municipalityId)||!isText(manifest.htmlPath)||!isText(manifest.infoPath))
    throw new Error('自治体IDとSVG・町名台帳のパスが必要です');
   if(!/^[a-z0-9][a-z0-9-]*$/.test(manifest.municipalityId)
    ||![manifest.htmlPath,manifest.infoPath].every(validPath))
    throw new Error('町域データのURLまたは自治体IDが不正です');
   if(!Number.isSafeInteger(manifest.expectedTownCount)||manifest.expectedTownCount<=0
    ||!Number.isSafeInteger(manifest.expectedRegionCount)||manifest.expectedRegionCount<=0)
    throw new Error('町名数・地域数が不正です');
   if(!deps?.svgAdapter||typeof deps.svgAdapter.loadSvgTownSource!=='function')
    throw new Error('SVG入力アダプターが必要です');
   const raw=await deps.svgAdapter.loadSvgTownSource({
    htmlPath:manifest.htmlPath,infoPath:manifest.infoPath,expectedCount:manifest.expectedTownCount
   });
   const towns=raw.towns;
   if(!Array.isArray(towns)||towns.length!==manifest.expectedTownCount)
    throw new Error('町名数が不一致です');
   const names=new Set(),regions=new Set();
   const records=towns.map(t=>{
    if(!isText(t.name)||!isText(t.reading)||!isText(t.d)||names.has(t.name)
      ||!Array.isArray(t.communities)||!t.communities.length
      ||t.communities.some(c=>!isText(c)))throw Error('町名・読み・所属・図形が不正です');
    names.add(t.name);for(const c of t.communities)regions.add(c);
    return {name:t.name,reading:t.reading,communities:[...t.communities],
     geometry:{format:'svg-path',data:t.d}};
   });
   if(regions.size!==manifest.expectedRegionCount)throw Error('地域数が不一致です');
   if(!isText(raw.viewBox))throw Error('SVG viewBoxが不正です');
   return {municipalityId:manifest.municipalityId,sourceFormat:'svg',
    regions:[...regions],records,viewBox:raw.viewBox,raw};
  }
  if(mode==='topojson'){
   const raw=await load(manifest,deps);
   const {features,mapping}=raw;
   const records=features.map(feature=>{
    const name=feature.properties[manifest.townNameProperty];
    const entry=mapping.towns[name];
    // The source may use grouped names (e.g. a split of numbered chome),
    // so do not invent a region if the input does not name one.
    const communities=entry&&isText(entry.community)?[entry.community]:[];
    return {name,reading:null,communities,geometry:{format:'geojson',data:feature}};
   });
   return {municipalityId:manifest.municipalityId,sourceFormat:'topojson',
    regions:[...mapping.communities],records,topology:raw.topology,
    subtopology:raw.subtopology,mapping,raw};
  }
  throw new Error('未対応の町域入力形式です: '+String(mode));
 }
 root.KussoonTownSvgDataContract=Object.freeze({validateManifest,load,loadUnified});
})(typeof window!=='undefined'?window:globalThis);
