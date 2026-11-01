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

// Return geographic bounds with the chosen municipality centered. For a region
// consisting of islands scattered hundreds of kilometres apart, focus on its
// largest polygon component so the municipality is actually visible.
function focusBounds(polys, options={}){
 const {minLonSpan=.12,minLatSpan=.10,padding=1.6,dispersedThreshold=1.8}=options;
 if(!Array.isArray(polys)||!polys.length)throw Error('No selected municipality polygons');
 function bounds(polygon){
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  for(const ring of polygon)for(const pt of ring){
   if(!Number.isFinite(pt[0])||!Number.isFinite(pt[1]))continue;
   west=Math.min(west,pt[0]);south=Math.min(south,pt[1]);
   east=Math.max(east,pt[0]);north=Math.max(north,pt[1]);
  }
  return [west,south,east,north];
 }
 function area(polygon){
  const ring=polygon[0]||[];
  let total=0;
  for(let i=0;i<ring.length;i++){
   const [x,y]=ring[i], [x2,y2]=ring[(i+1)%ring.length];
   total+=x*y2-x2*y;
  }
  return Math.abs(total);
 }
 const all=bounds(polys.flatMap(p=>p));
 if(!all.every(Number.isFinite))throw Error('Invalid polygon coordinates');
 let box=all;
 if(all[2]-all[0]>dispersedThreshold||all[3]-all[1]>dispersedThreshold){
  let main=polys[0],biggest=-1;
  for(const p of polys){
   const size=area(p);
   if(size>biggest){main=p;biggest=size;}
  }
  box=bounds(main);
 }
 const centerLon=(box[0]+box[2])/2,centerLat=(box[1]+box[3])/2;
 const lonSpan=Math.max((box[2]-box[0])*padding,minLonSpan);
 const latSpan=Math.max((box[3]-box[1])*padding,minLatSpan);
 return [centerLon-lonSpan/2,centerLat-latSpan/2,centerLon+lonSpan/2,centerLat+latSpan/2];
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
global.KussoonV2MunicipalRenderer=Object.freeze({render,pathFromArcs,pathFromPolygons,focusBounds});
})(window);
