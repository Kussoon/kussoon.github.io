/* Kussoon V2 shared town quiz-2 choice selection.
 * Only orders candidate town IDs: no municipality rules, geometry renderer,
 * UI markup, scoring, or random generator are embedded here.
 * Maintains Nishinomiya V9 prioritization and stable tie handling.
 */
(function(root){
 'use strict';
 function select(target,{townNames,scopeNames,adjacency,primaryRegion,distance,shuffle}){
  if(typeof target!=='string'||!target||!Array.isArray(townNames)||!townNames.includes(target))
   throw new Error('Invalid quiz target');
  if(typeof distance!=='function'||typeof shuffle!=='function')
   throw new Error('Distance and shuffle callbacks are required');
  const all=townNames.filter(name=>name!==target);
  const scope=new Set(scopeNames);
  const group=name=>primaryRegion.get(name)===primaryRegion.get(target);
  const neighbors=all.filter(name=>adjacency.get(target)?.has(name));
  const sorted=values=>values.sort((a,b)=>distance(a)-distance(b));
  const ordered=[],used=new Set();
  const add=values=>{for(const name of values)if(!used.has(name)){used.add(name);ordered.push(name)}};
  add(sorted(neighbors.filter(group)));
  add(sorted(neighbors));
  add(sorted(all.filter(name=>scope.has(name)&&group(name))));
  add(sorted(all.filter(name=>scope.has(name))));
  add(sorted(all));
  return shuffle([target,...ordered.slice(0,3)]);
 }
 root.KussoonTownSvgQuizChoices=Object.freeze({select});
})(typeof window!=='undefined'?window:globalThis);
