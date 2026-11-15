/* Kussoon town-map SVG common UI helpers: comparison pilot, phase 1.
 * No geometry, label placement, grading, or region assignments are changed here.
 * Pass confirmed readings only. DOM creation uses textContent (never innerHTML).
 */
(function(root){
 'use strict';
 function sortRegionsByReading(regionNames, readings){
  if(!Array.isArray(regionNames)||!readings)throw new TypeError('Region names and readings are required');
  const collator=new Intl.Collator('ja',{usage:'sort',sensitivity:'base',numeric:false});
  const result=[...regionNames];
  if(result.some(name=>typeof readings[name]!=='string'||!readings[name].trim())){
   throw new Error('地域名の確認済み読み仮名が不足しています');
  }
  return result.sort((a,b)=>collator.compare(readings[a],readings[b])||collator.compare(a,b));
 }
 function makeQuizChoice(doc, name, reading, onSelect){
  if(!doc||typeof doc.createElement!=='function'||!name||!reading||typeof onSelect!=='function'){
   throw new TypeError('Quiz choice requires a document, name, confirmed reading and click handler');
  }
  const button=doc.createElement('button');button.type='button';
  const town=doc.createElement('span');town.className='choice-name';town.textContent=name;
  const ruby=doc.createElement('span');ruby.className='choice-reading';ruby.textContent=reading;
  button.append(town,ruby);
  button.onclick=()=>onSelect(name,button);
  return button;
 }
 root.KussoonTownSvgUI=Object.freeze({sortRegionsByReading,makeQuizChoice});
})(window);
