// Common geography adapter for town SVG quiz distractors.
// Preserve the existing shared-TopoJSON-arc adjacency contract and d3 spherical distance.
// The town name property, object name and geometry functions are injected per municipality.
(function(root){
 'use strict';
 function create({topology,features,objectName='town',nameProperty='S_NAME',geoCentroid,geoDistance}){
  if(!topology?.objects?.[objectName]?.geometries||!Array.isArray(features))throw Error('Invalid quiz geography input');
  if(typeof geoCentroid!=='function'||typeof geoDistance!=='function')throw Error('Missing geographic functions');
  const adjacency=new Map(),owners=new Map(),byName=new Map();
  for(const feature of features)byName.set(feature.properties[nameProperty],feature);
  for(const geom of topology.objects[objectName].geometries){
   const name=geom.properties[nameProperty];
   const visit=arcs=>{for(const id of arcs){
    if(Array.isArray(id)){visit(id);continue}
    const idx=id<0?~id:id;
    if(!owners.has(idx))owners.set(idx,new Set());
    owners.get(idx).add(name);
   }};
   visit(geom.arcs);
  }
  for(const names of owners.values()){
   for(const name of names){
    if(!adjacency.has(name))adjacency.set(name,new Set());
    for(const next of names)if(name!==next)adjacency.get(name).add(next);
   }
  }
  function distanceFrom(target){
   const feature=byName.get(target);
   if(!feature)throw Error('Unknown quiz target: '+target);
   const middle=geoCentroid(feature);
   return name=>{
    const candidate=byName.get(name);
    if(!candidate)throw Error('Unknown quiz candidate: '+name);
    return geoDistance(middle,geoCentroid(candidate));
   };
  }
  return Object.freeze({adjacency,distanceFrom});
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgQuizGeography=api;
})(typeof globalThis!=='undefined'?globalThis:this);
