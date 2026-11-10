/* Kussoon V2 prefecture palette shared by national, studyPref and prefecture views.
 * Fixed 47-prefecture assignments: directly adjacent prefectures have distinct
 * colours with perceptual separation across boundaries and conspicuous nearby
 * cross-sea pairs. The existing eight pastels and Hyogo beige are preserved.
 * Selection effects remain in prefecture-colors.css.
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
const colorByPrefecture=Object.freeze({
 '01':'#d9dea5',
 '02':'#b4d9ec',
 '03':'#dcc8ea',
 '04':'#f1d5a5',
 '05':'#bee0c1',
 '06':'#b4d9ec',
 '07':'#f1c2c2',
 '08':'#bce3db',
 '09':'#c9cfed',
 '10':'#bee0c1',
 '11':'#f1d5a5',
 '12':'#f1c2c2',
 '13':'#b4d9ec',
 '14':'#dcc8ea',
 '15':'#f1d5a5',
 '16':'#dcc8ea',
 '17':'#b4d9ec',
 '18':'#bee0c1',
 '19':'#bee0c1',
 '20':'#b4d9ec',
 '21':'#f1d5a5',
 '22':'#f1d5a5',
 '23':'#dcc8ea',
 '24':'#bee0c1',
 '25':'#b4d9ec',
 '26':'#f1c2c2',
 '27':'#bce3db',
 '28':'#f1d5a5',
 '29':'#f1d5a5',
 '30':'#dcc8ea',
 '31':'#bee0c1',
 '32':'#b4d9ec',
 '33':'#b4d9ec',
 '34':'#dcc8ea',
 '35':'#f1d5a5',
 '36':'#f1d5a5',
 '37':'#f1c2c2',
 '38':'#bee0c1',
 '39':'#b4d9ec',
 '40':'#f1d5a5',
 '41':'#dcc8ea',
 '42':'#f1d5a5',
 '43':'#dcc8ea',
 '44':'#b4d9ec',
 '45':'#f1d5a5',
 '46':'#bee0c1',
 '47':'#c9cfed'
});
function color(code){
 const pref=String(code??'').slice(0,2);
 return colorByPrefecture[pref]||null;
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
 // Selection only changes classes; the existing CSS handles its pulse. New
 // paths receive the same fixed prefecture colour without redrawing geometry.
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
 return Object.freeze({destroy(){observer.disconnect();changes.clear();},palette,color,colorByPrefecture,stats(){return{paintBatches:paints}}});
}
global.KussoonV2PrefectureColors=Object.freeze({palette,color,colorByPrefecture,attach});
})(window);
