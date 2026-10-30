/* Kussoon V2 administrative label presentation.
 * One geometry-agnostic convention for prefecture-wide and nationwide maps:
 * designated-city wards -> city / ward; county towns/villages -> county / town.
 * Search names and municipality codes remain separate from display rows.
 */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg';
function rows(model){
 if(!model||typeof model.name!=='string')return null;
 const parent=model.county ||
   (typeof model.major==='string'&&model.major.endsWith('郡')?model.major:null) ||
   (typeof model.major==='string'&&model.major.endsWith('市')&&model.name.endsWith('区')?model.major:null);
 if(!parent)return null;
 // A designated city is a parent of a ward; a county is a parent of a town/village.
 if(parent.endsWith('郡')&&!/[町村]$/.test(model.name))return null;
 return [parent,model.name];
}
function widestRowModel(model,size,measure){
 const pair=rows(model);
 if(!pair)return model;
 const longest=measure(pair[0],size)>=measure(pair[1],size)?pair[0]:pair[1];
 return {...model,name:longest};
}
function boxFor(model,label,size,measure){
 const pair=rows(model);
 if(!pair)return label;
 const width=Math.max(measure(pair[0],size),measure(pair[1],size))+size*.24;
 const height=size*2.48;
 const box={x1:label.x-width/2,y1:label.y-height/2,
  x2:label.x+width/2,y2:label.y+height/2};
 return {...label,width,height,box};
}
function paint(textElement,model,x,size){
 const pair=rows(model);
 if(!pair){
  if(textElement.textContent!==model.name)textElement.textContent=model.name;
  return false;
 }
 const list=[...textElement.querySelectorAll('tspan')];
 let top=list[0],bottom=list[1];
 if(list.length!==2||top.textContent!==pair[0]||bottom.textContent!==pair[1]){
  const doc=textElement.ownerDocument;
  top=doc.createElementNS(NS,'tspan');
  bottom=doc.createElementNS(NS,'tspan');
  top.textContent=pair[0];
  bottom.textContent=pair[1];
  textElement.replaceChildren(top,bottom);
 }
 const pos=Number(x).toFixed(2);
 top.setAttribute('x',pos);
 bottom.setAttribute('x',pos);
 top.setAttribute('dy',(-size*.58).toFixed(2));
 bottom.setAttribute('dy',(size*1.16).toFixed(2));
 return true;
}
global.KussoonAdministrativeLabels={rows,widestRowModel,boxFor,paint};
})(window);
