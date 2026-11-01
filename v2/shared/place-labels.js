/* Kussoon V2 — fast and reusable Japanese place labels and name matching.
 * No assumptions about furigana: callers provide a verified reading when known.
 */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg';
const normalize=value=>String(value||'').normalize('NFKC').replace(/[\s　]+/g,'').toLocaleLowerCase('ja-JP');
function matches(record,query){
 const q=normalize(query);
 return !q||[record.name,record.reading,record.code].some(s=>normalize(s).includes(q));
}
function anchor(polys){
 let best=null,area=-1;
 for(const polygon of polys||[]){
  const ring=polygon[0]||[];
  if(!ring.length)continue;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,twice=0;
  for(let i=0;i<ring.length;i++){
   const p=ring[i],q=ring[(i+1)%ring.length];
   minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);
   minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);
   twice+=p[0]*q[1]-q[0]*p[1];
  }
  const value=Math.abs(twice);
  if(value>area){area=value;best=[(minX+maxX)/2,(minY+maxY)/2];}
 }
 return best;
}
function show(options){
 const {svg,regions,project,selected='',all=false,readings=false}=options||{};
 if(!svg||!Array.isArray(regions)||typeof project!=='function')throw Error('Invalid label options');
 const existing=svg.querySelector('[data-v2-labels]');
 if(existing)existing.remove();
 const layer=document.createElementNS(NS,'g');
 layer.setAttribute('data-v2-labels','');
 layer.setAttribute('pointer-events','none');
 let count=0;
 for(const region of regions){
  if(!all&&region.code!==selected)continue;
  const pt=anchor(region.polys);
  if(!pt)continue;
  const [x,y]=project(pt);
  if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  const group=document.createElementNS(NS,'g');
  group.setAttribute('transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+')');
  const title=document.createElementNS(NS,'text');
  title.setAttribute('text-anchor','middle');
  title.setAttribute('paint-order','stroke');
  title.setAttribute('stroke','#fff');
  title.setAttribute('stroke-width',region.code===selected?'4':'3');
  title.setAttribute('stroke-linejoin','round');
  title.setAttribute('fill','#173b56');
  title.setAttribute('font-size',region.code===selected?'18':'14');
  title.setAttribute('font-weight',region.code===selected?'700':'600');
  title.setAttribute('y',readings&&region.reading?'-5':'5');
  title.textContent=region.name;
  group.append(title);
  if(readings&&region.reading){
   const sub=document.createElementNS(NS,'text');
   sub.setAttribute('text-anchor','middle');
   sub.setAttribute('paint-order','stroke');
   sub.setAttribute('stroke','#fff');
   sub.setAttribute('stroke-width','3');
   sub.setAttribute('fill','#173b56');
   sub.setAttribute('font-size','11');
   sub.setAttribute('y','12');
   sub.textContent=region.reading;
   group.append(sub);
  }
  layer.append(group);count++;
 }
 svg.append(layer);
 return count;
}
global.KussoonV2PlaceLabels=Object.freeze({normalize,matches,anchor,show});
})(window);
