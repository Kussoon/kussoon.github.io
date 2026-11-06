/* Kussoon V2 prefecture palette shared by national, studyPref and prefecture views.
 * Fixed 47-prefecture assignments: directly adjacent prefectures have distinct
 * colours. Selection effects remain in prefecture-colors.css.
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
 '02':'#f1c2c2',
 '03':'#dcc8ea',
 '04':'#f1d5a5',
 '05':'#bee0c1',
 '06':'#b4d9ec',
 '07':'#f1c2c2',
 '08':'#c9cfed',
 '09':'#d9dea5',
 '10':'#bee0c1',
 '11':'#f1d5a5',
 '12':'#f1c2c2',
 '13':'#dcc8ea',
 '14':'#b4d9ec',
 '15':'#dcc8ea',
 '16':'#d9dea5',
 '17':'#bee0c1',
 '18':'#d9dea5',
 '19':'#bce3db',
 '20':'#b4d9ec',
 '21':'#c9cfed',
 '22':'#f1d5a5',
 '23':'#bce3db',
 '24':'#bee0c1',
 '25':'#dcc8ea',
 '26':'#f1c2c2',
 '27':'#bce3db',
 '28':'#f1d5a5',
 '29':'#c9cfed',
 '30':'#b4d9ec',
 '31':'#d9dea5',
 '32':'#b4d9ec',
 '33':'#c9cfed',
 '34':'#bce3db',
 '35':'#f1d5a5',
 '36':'#f1c2c2',
 '37':'#dcc8ea',
 '38':'#bee0c1',
 '39':'#d9dea5',
 '40':'#bce3db',
 '41':'#dcc8ea',
 '42':'#f1c2c2',
 '43':'#c9cfed',
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
