/* Kussoon V2 — shared single-stroke municipality renderer (2026).
 * Municipality polygon paths are fills only. Shared TopoJSON arcs are drawn
 * once in an independent, noninteractive layer to prevent thick overlap.
 * The selected area changes fill only; it never gains a second stroke.
 */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg';
function pathFromPolygons(polys, project){
 let d='';
 for(const polygon of polys)for(const ring of polygon){
  for(let i=0;i<ring.length;i++){
   const p=project(ring[i]);d+=(i?'L':'M')+p[0].toFixed(2)+','+p[1].toFixed(2);
  }
  d+='Z';
 }
 return d;
}
function pathFromArcs(arcs,project){
 let d='';
 for(const arc of arcs){
  if(arc.length<2)continue;
  for(let i=0;i<arc.length;i++){
   const p=project(arc[i]);d+=(i?'L':'M')+p[0].toFixed(2)+','+p[1].toFixed(2);
  }
 }
 return d;
}
function element(name){return document.createElementNS(NS,name);}
function render(options){
 const {map,regions,arcs,project,selected='',landClass='land',chosenClass='chosen',borderClass='borders'}=options;
 if(!map||!Array.isArray(regions)||!Array.isArray(arcs)||typeof project!=='function')throw Error('Invalid Kussoon V2 map arguments');
 const fragment=document.createDocumentFragment();
 for(const region of regions){
  const el=element('path');
  el.setAttribute('d',pathFromPolygons(region.polys,project));
  el.setAttribute('class',landClass+(region.code===selected?' '+chosenClass:''));
  el.dataset.code=region.code;
  const title=element('title');title.textContent=region.name;el.append(title);
  fragment.append(el);
 }
 const borders=element('path');
 borders.setAttribute('d',pathFromArcs(arcs,project));
 borders.setAttribute('class',borderClass);
 borders.setAttribute('pointer-events','none');
 fragment.append(borders);
 map.replaceChildren(fragment);
 return regions.length;
}
global.KussoonV2MunicipalRenderer=Object.freeze({render,pathFromArcs,pathFromPolygons});
})(window);
