/* TOWNMAP-SSOT-001 R-TOWN-00/06/10/11/12/13/14/44.
 * Read-only projection of the EXISTING loadUnified() source contract.
 * Retain geometry references and detect missing metadata; never infer it.
 * Source encoding, candidate provenance, and unverified membership remain explicit.
 */
(function(root){
 'use strict';
 const text=x=>typeof x==='string'&&x.trim().length>0;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function create(unified,{memberships={},readings={},candidates={},requireMembership=false,
                           requireCandidates=false}={}){
  if(!unified||!Array.isArray(unified.records)||!Array.isArray(unified.regions)
    ||!text(unified.municipalityId)||!['topojson','svg'].includes(unified.sourceFormat))
   throw new TypeError('loadUnifiedの町域と地域入力が必要です');
  const regions=[...unified.regions],validRegions=new Set(regions);
  if(regions.length===0||validRegions.size!==regions.length||regions.some(x=>!text(x)))
   throw new Error('地域IDに欠落・重複があります');
  const names=new Set(),unresolvedMembership=[],unresolvedReading=[],unresolvedCandidates=[],ambiguousMembership=[];
  const records=unified.records.map(record=>{
   if(!record||!text(record.name)||names.has(record.name))throw new Error('町名IDに欠落・重複があります');
   names.add(record.name);
   const geometry=record.geometry;
   if(!geometry||!['geojson','svg-path'].includes(geometry.format)||!geometry.data)
    throw new Error('町域図形が不正です: '+record.name);
   if(unified.sourceFormat==='topojson'&&geometry.format!=='geojson'
       ||unified.sourceFormat==='svg'&&geometry.format!=='svg-path')
    throw new Error('入力形式と形状形式が一致しません: '+record.name);
   if(geometry.format==='geojson'){
    if(!['Polygon','MultiPolygon'].includes(geometry.data.geometry?.type))
     throw new Error('GeoJSON図形の型が不正です: '+record.name);
   }else if(!text(geometry.data))throw new Error('SVGパスが空です: '+record.name);
   const overridden=own(memberships,record.name);
   const sourceMembership=record.communities;
   const supplied=overridden?memberships[record.name]:sourceMembership;
   if(!Array.isArray(supplied)||new Set(supplied).size!==supplied.length
      ||supplied.some(x=>!text(x)))
    throw new Error('所属地域が不正です: '+record.name);
   // A TopoJSON mapping may contain an explicit compound town-split note,
   // e.g. "1〜3 広田、4〜7 上ヶ原", rather than a single region ID.
   // Preserve it as unresolved source evidence instead of guessing or
   // rejecting an otherwise valid polygon. Explicit overrides must be valid.
   const unknown=supplied.filter(x=>!validRegions.has(x));
   if(unknown.length&&overridden)throw new Error('明示された所属地域が不正です: '+record.name);
   if(unknown.length&&unified.sourceFormat!=='topojson')
    throw new Error('SVG所属地域が不正です: '+record.name);
   if(unknown.length)ambiguousMembership.push(Object.freeze({
    name:record.name,source:Object.freeze([...supplied])
   }));
   const membership=unknown.length?[]:supplied;
   if(membership.length===0)unresolvedMembership.push(record.name);
   const reading=own(readings,record.name)?readings[record.name]:record.reading;
   if(reading!=null&&!text(reading))throw new Error('読みが不正です: '+record.name);
   if(!text(reading))unresolvedReading.push(record.name);
   const labels=own(candidates,record.name)?candidates[record.name]:null;
   if(labels!==null&&(!Array.isArray(labels)||labels.length===0))throw new Error('ラベル候補が不正です: '+record.name);
   if(labels===null)unresolvedCandidates.push(record.name);
   if(labels!==null){
    const keys=new Set();
    for(const c of labels){
     if(!c||!Array.isArray(c.point)||c.point.length!==2||!c.point.every(Number.isFinite)
       ||!['approved','geometry-derived'].includes(c.provenance))
      throw new Error('ラベル候補座標と出典が不正です: '+record.name);
     if(c.key!=null){
      if(!text(c.key)||keys.has(c.key))throw new Error('ラベル候補キーが重複しています: '+record.name);
      keys.add(c.key);
     }
    }
   }
   // The original GeoJSON feature or SVG path remains identical, including
   // holes and disconnected components. No conversion, splitting, or sorting.
   return Object.freeze({name:record.name,reading:reading??null,
    communities:Object.freeze([...membership]),geometry,
    candidates:labels===null?null:Object.freeze([...labels])});
  });
  if(requireMembership&&unresolvedMembership.length)
   throw new Error('所属地域が未解決です: '+unresolvedMembership.length+'町名');
  if(requireCandidates&&unresolvedCandidates.length)
   throw new Error('ラベル候補が未解決です: '+unresolvedCandidates.length+'町名');
  for(const map of [memberships,readings,candidates]){
   for(const key of Object.keys(map))if(!names.has(key))
    throw new Error('元データに存在しない町名ID: '+key);
  }
  return Object.freeze({
   municipalityId:unified.municipalityId,sourceFormat:unified.sourceFormat,
   regions:Object.freeze(regions),records:Object.freeze(records),
   validation:Object.freeze({
    towns:records.length,regions:regions.length,
    suppliedCandidateCount:records.reduce((n,r)=>n+(r.candidates?.length||0),0),
    unresolvedMembership:Object.freeze(unresolvedMembership),
    ambiguousMembership:Object.freeze(ambiguousMembership),
    unresolvedReading:Object.freeze(unresolvedReading),
    unresolvedCandidates:Object.freeze(unresolvedCandidates)
   }),
   raw:unified
  });
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgSourceView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
