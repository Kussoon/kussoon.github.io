/* TOWNMAP-SSOT-001 R-TOWN-00/06/10/12/13/14/44
 * Apply independently verified municipality membership corrections as DATA.
 * Never guess grouped town membership from the map or ignore a new mismatch.
 * The original geometry is carried through verbatim; this helper does not
 * repair projected geometry, split polygons or label placements.
 */
(function(root){
 'use strict';
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function apply({unified,manifest}={}){
  if(!unified||!manifest||unified.municipalityId!==manifest.municipalityId
    ||!Array.isArray(unified.records)||!Array.isArray(unified.regions)
    ||!manifest.townMetadata||!Array.isArray(manifest.membershipCorrections))
   throw new Error('検証済みの自治体台帳・元データが必要です');
  if(unified.records.length!==manifest.expectedTownCount
    ||unified.regions.length!==manifest.expectedRegionCount)
   throw new Error('町名数または地域数が原本と一致しません');
  const correctionMap=new Map();
  for(const c of manifest.membershipCorrections){
   if(!c||typeof c.name!=='string'||correctionMap.has(c.name)
     ||!Array.isArray(c.sourceCommunities)||!Array.isArray(c.approvedCommunities)
     ||!c.approvedCommunities.length)throw new Error('地域所属補正の記録が不正です');
   correctionMap.set(c.name,c);
  }
  const approved=manifest.townMetadata,observed=new Set(),regionSet=new Set(unified.regions);
  const records=unified.records.map(record=>{
   if(!record||typeof record.name!=='string'||observed.has(record.name)
     ||!Array.isArray(record.communities))throw new Error('町名または所属元データが不正です');
   const name=record.name,entry=approved[name];
   if(!own(approved,name)||!entry||typeof entry.reading!=='string'||!entry.reading
     ||!Array.isArray(entry.communities)||!entry.communities.length
     ||entry.communities.some(x=>!regionSet.has(x)))
    throw new Error('承認済み町名・読み・地域所属が不足しています: '+name);
   observed.add(name);
   const source=record.communities,expected=entry.communities;
   const same=source.length===expected.length&&source.every(x=>expected.includes(x));
   const correction=correctionMap.get(name);
   if(same&&correction)throw new Error('不要な補正記録が存在します: '+name);
   if(!same){
    if(!correction||source.length!==correction.sourceCommunities.length
      ||source.some(x=>!correction.sourceCommunities.includes(x))
      ||expected.length!==correction.approvedCommunities.length
      ||expected.some(x=>!correction.approvedCommunities.includes(x)))
     throw new Error('原本との不一致が未承認です: '+name);
   }
   if(record.reading&&record.reading!==entry.reading)
    throw new Error('原本と確定読み仮名が矛盾しています: '+name);
   return Object.freeze({...record,reading:entry.reading,
    communities:Object.freeze([...expected])});
  });
  for(const name of Object.keys(approved))
   if(!observed.has(name))throw new Error('町名台帳に原本にない町があります: '+name);
  for(const name of correctionMap.keys())
   if(!observed.has(name))throw new Error('所属補正記録に原本にない町があります: '+name);
  return Object.freeze({...unified,records:Object.freeze(records)});
 }
 const api=Object.freeze({apply});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgVerifiedMembership=api;
})(typeof globalThis!=='undefined'?globalThis:this);
