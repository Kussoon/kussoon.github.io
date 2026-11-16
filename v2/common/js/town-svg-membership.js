/* Kussoon SVG town-map region membership adapter (phase 5).
 * No map rendering or quiz scoring, only town -> region membership.
 * MultiPolygon is one town; region-specific geometric splits are separate.
 */
(function(root){
 'use strict';
 const has=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
 function build(mapping,options){
  if(!mapping||!Array.isArray(mapping.communities)||!mapping.towns)
   throw new TypeError('地域所属データが不正です');
  const regions=[...mapping.communities];
  if(!regions.length||new Set(regions).size!==regions.length||regions.some(x=>typeof x!=='string'||!x))
   throw new Error('地域名の重複・欠落');
  const cfg=options||{};
  const normalize=cfg.normalizeName||((name)=>name);
  if(typeof normalize!=='function')throw new TypeError('町名の正規化関数が不正です');
  const regionSet=new Set(regions),counts=new Map();
  for(const [raw,info] of Object.entries(mapping.towns)){
   const town=normalize(raw),region=info&&info.community;
   if(typeof town!=='string'||!town||!regionSet.has(region))continue;
   if(!counts.has(town))counts.set(town,new Map());
   const choices=counts.get(town);
   choices.set(region,(choices.get(region)||0)+1);
  }
  const primary=new Map();
  // Preserve insertion-order tiebreak: V7 sorts by count descending only.
  for(const [town,choices] of counts){
   const ranked=[...choices].sort((a,b)=>b[1]-a[1]);
   if(ranked.length)primary.set(town,ranked[0][0]);
  }
  for(const [town,region] of Object.entries(cfg.primaryOverrides||{})){
   if(!regionSet.has(region))throw new Error('所属先の地域がありません: '+region);
   primary.set(town,region);
  }
  const extras=new Map();
  for(const [town,additional] of Object.entries(cfg.additionalRegions||{})){
   if(!Array.isArray(additional)||additional.some(x=>!regionSet.has(x)))
    throw new Error('追加所属先が不正です: '+town);
   extras.set(town,new Set(additional));
  }
  // Deliberately do not derive secondary membership from tied mapping counts.
  // Such decisions must remain explicit in a municipality-specific adapter.
  const belongs=(town,region)=>primary.get(town)===region||!!extras.get(town)?.has(region);
  return Object.freeze({regions,primary,belongs,counts,additional:extras});
 }
 root.KussoonTownSvgMembership=Object.freeze({build});
})(typeof window!=='undefined'?window:globalThis);
