/* TOWNMAP-SSOT-001: accepted label anchors from source geometry and a
 * municipality-owned override data file. No municipal branches.
 * The default anchor matches V34's Leaflet Polygon.getCenter emulation:
 * projected centroid of the FIRST exterior ring, not maximum-inside-area.
 * Additional labels and offsets are loaded verbatim, not re-guessed.
 */
(function(root){
 'use strict';
 function projectedFirstRing(feature,projection,fallback){
  const g=feature?.geometry;
  const ring=g?.type==='Polygon'?g.coordinates?.[0]:
   g?.type==='MultiPolygon'?g.coordinates?.[0]?.[0]:null;
  if(!ring||ring.length<3)return fallback(feature);
  const points=ring.map(p=>projection(p));
  if(points.some(p=>!p||!p.every(Number.isFinite)))return fallback(feature);
  let area2=0,x=0,y=0;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[j],b=points[i],cross=a[0]*b[1]-b[0]*a[1];
   area2+=cross;x+=(a[0]+b[0])*cross;y+=(a[1]+b[1])*cross;
  }
  return Math.abs(area2)<1e-10?points[0]:[x/(3*area2),y/(3*area2)];
 }
 function create({data,municipalityId,records,projection,path,featureFor,
                  positions=root.KussoonTownSvgLabels?.positions,
                  fromApproved=root.KussoonTownMultipartLabels?.fromApproved}={}){
  if(!data||municipalityId!==data.municipalityId
    ||!Array.isArray(records)||records.length!==data.expectedTownCount
    ||typeof projection!=='function'||typeof path?.centroid!=='function'
    ||typeof featureFor!=='function'||typeof positions!=='function'
    ||typeof fromApproved!=='function')
   throw new Error('確定ラベルの原本・投影・町名が揃っていません');
  const names=new Set(records.map(r=>r.name));
  if(names.size!==data.expectedTownCount)throw Error('町名の重複があります');
  for(const set of [data.labelOffsets,data.multiLabels,data.extraLabels])
   if(!set||typeof set!=='object'||Object.keys(set).some(x=>!names.has(x)))
    throw Error('確定ラベルの指定に未登録町名があります');
  const baseline=data.expectedTownCount+
   Object.values(data.multiLabels).reduce((n,x)=>n+x.length-1,0)+
   Object.values(data.extraLabels).reduce((n,x)=>n+x.length,0);
  if(baseline!==data.expectedLabels)throw Error('確定ラベル件数が一致しません');
  const recordMap=new Map(records.map(r=>[r.name,r]));
  function candidates(name,region=''){
   const record=recordMap.get(name);
   if(!record)throw Error('未登録の町名: '+name);
   const feature=featureFor(name,region);
   if(!feature?.geometry)throw Error('町域形状がありません: '+name);
   const pos=positions(feature,{
    nameProperty:'S_NAME',multiLabels:data.multiLabels,
    extraLabels:data.extraLabels,labelOffsets:data.labelOffsets,projection,
    projectedAt:f=>projectedFirstRing(f,projection,x=>path.centroid(x))
   });
   const output=fromApproved({name,reading:record.reading,
    positions:pos.map((p,i)=>({...p,key:name+':approved:'+i}))});
   return output;
  }
  return Object.freeze({candidates,expectedLabels:data.expectedLabels});
 }
 const api=Object.freeze({create,projectedFirstRing});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgApprovedAnchors=api;
})(typeof globalThis!=='undefined'?globalThis:this);
