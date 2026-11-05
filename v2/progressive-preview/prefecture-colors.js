/* Kussoon V2 prefecture palette. Trial-only attachment to progressive-shared-test.
 * No geometry, label, county, tooltip, or input handling changes.
 */
(function(global){'use strict';
const palette=Object.freeze([
 '#b4d9ec', // blue
 '#f1d5a5', // golden beige
 '#bee0c1', // soft green
 '#dcc8ea', // lavender
 '#f1c2c2', // rose
 '#d9dea5', // olive lime
 '#c9cfed', // periwinkle
 '#bce3db'  // mint
]);
const order=[0,4,2,6,1,5,3,7];
function color(code){
 const n=Number(String(code).slice(0,2));
 if(!Number.isInteger(n)||n<1||n>47)return null;
 // Deterministic, non-random; adjacent numeric prefecture codes differ,
 // including Miyagi(04) / Fukushima(07).
 const slot=(n-1+Math.floor((n-1)/8)*3)%8;
 return palette[order[slot]];
}
function prefFor(node){
 if(node.classList.contains('prefecture'))return node.dataset.pref;
 if(node.classList.contains('land'))return (node.dataset.code||node.dataset.nationalCode||'').slice(0,2);
 return null;
}
function paint(node){
 if(node.nodeType!==1)return;
 if(node.tagName.toLowerCase()==='path'){
  const pref=prefFor(node);
  if(pref){
   const colorValue=color(pref);
   if(colorValue&&node.style.getPropertyValue('--pref-color')!==colorValue)
    node.style.setProperty('--pref-color',colorValue);
   return;
  }
 }
 if(node.querySelectorAll){
  for(const p of node.querySelectorAll('path.land, path.prefecture'))paint(p);
 }
}
function attach(svg=document.getElementById('map')){
 if(!svg)throw Error('Map SVG missing');
 let pending=false,changes=new Set(),paints=0;
 // A selection toggles class, but CSS handles the pulse. Only freshly created
 // paths need variables; don't trigger geometry redraws.
 function queue(records){
  for(const m of records){
   if(m.type==='childList')for(const n of m.addedNodes)changes.add(n);
   else changes.add(m.target);
  }
  if(pending)return;
  pending=true;
  queueMicrotask(()=>{
   pending=false;
   for(const node of changes){paint(node);paints++;}
   changes.clear();
  });
 }
 svg.querySelectorAll('path.land, path.prefecture').forEach(paint);
 const observer=new MutationObserver(queue);
 observer.observe(svg,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-pref','data-code','data-national-code']});
 return Object.freeze({destroy(){observer.disconnect();changes.clear();},palette,color,stats(){return{paintBatches:paints}}});
}
global.KussoonV2PrefectureColors=Object.freeze({palette,color,attach});
})(window);
