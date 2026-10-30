/* Kussoon V2 - interleaved kanji / hiragana labels.
 * Plain administrative names and shapes stay in their original data model.
 * County/city + town/ward uses:
 *    county or city
 *    county/city reading
 *    town or ward
 *    town/ward reading
 * All four lines share one bounding box for collision and border checking.
 */
(function(global){
'use strict';
const SVG='http://www.w3.org/2000/svg';
const READING_RATIO=.60;
const hasReading=s=>typeof s==='string'&&/^[ぁ-ゖー\s]+$/.test(s)&&s.trim().length>0;
function attach(models,municipalItems,countyItems){
 return models.map(model=>{
  const record=municipalItems[model.code];
  if(!record)throw Error('読み仮名が未登録です：'+model.code+' '+model.name);
  const parent=model.county||(model.major?.endsWith('郡')?model.major:null);
  const city=model.major?.endsWith('市')&&model.name.endsWith('区')?model.major:null;
  const full=(city||'')+model.name;
  if(record.name!==full)throw Error('漢字名称と読み仮名データが一致しません：'+model.code);
  if(!hasReading(record.reading))throw Error('読み仮名の形式が不正です：'+model.code);
  let groups;
  if(city){
   const segments=record.reading.trim().split(/\s+/);
   if(segments.length!==2||!segments.every(hasReading))
    throw Error('政令市・区の読み分割ができません：'+model.code);
   groups=[{name:city,reading:segments[0]},{name:model.name,reading:segments[1]}];
  }else if(parent){
   const county=countyItems[parent];
   if(!hasReading(county))throw Error('郡名の読み仮名が未登録です：'+parent);
   groups=[{name:parent,reading:county},{name:model.name,reading:record.reading}];
  }else{
   if(record.reading.trim().includes(' '))throw Error('単独自治体に複数の読みがあります：'+model.code);
   groups=[{name:model.name,reading:record.reading}];
  }
  return {...model,rubyGroups:groups,readingSearch:groups.map(g=>g.reading).join('')};
 });
}
function lines(model,withReading){
 const groups=model?.rubyGroups;
 if(!Array.isArray(groups))return [{text:model.name,kind:'kanji'}];
 return groups.flatMap(group=>withReading?
  [{text:group.name,kind:'kanji'},{text:group.reading,kind:'reading'}]:
  [{text:group.name,kind:'kanji'}]);
}
function dimensions(model,size,measure,withReading){
 const items=lines(model,withReading);
 let width=0,height=0;
 const metrics=items.map(({text,kind})=>{
  const font=kind==='reading'?size*READING_RATIO:size;
  const lineHeight=kind==='reading'?font*1.14:font*1.13;
  width=Math.max(width,measure(text,font));
  height+=lineHeight;
  return {text,kind,font,lineHeight};
 });
 // Extra space between a completed name-reading pair and the next name.
 if(withReading&&items.length===4)height+=size*.12;
 return {width:width+size*.30,height:height+size*.24,metrics};
}
function boxFor(model,label,size,measure,withReading){
 const {width,height}=dimensions(model,size,measure,withReading);
 return {...label,width,height,box:{x1:label.x-width/2,x2:label.x+width/2,
  y1:label.y-height/2,y2:label.y+height/2}};
}
function paint(element,model,x,y,size,measure,withReading){
 const {height,metrics}=dimensions(model,size,measure,withReading);
 const current=[...element.querySelectorAll('tspan')];
 const same=current.length===metrics.length&&metrics.every((m,i)=>
  current[i].textContent===m.text&&current[i].getAttribute('data-kind')===m.kind);
 const nodes=same?current:metrics.map(m=>{
  const node=element.ownerDocument.createElementNS(SVG,'tspan');
  node.textContent=m.text;node.setAttribute('data-kind',m.kind);
  return node;
 });
 if(!same)element.replaceChildren(...nodes);
 let top=y-height/2+size*.12;
 const xx=Number(x).toFixed(2);
 metrics.forEach((m,i)=>{
  const node=nodes[i];
  node.setAttribute('x',xx);
  node.setAttribute('y',(top+m.lineHeight/2).toFixed(2));
  node.setAttribute('font-size',m.font.toFixed(2));
  node.setAttribute('stroke-width',(m.font*(m.kind==='reading'?.11:.17)).toFixed(2));
  node.setAttribute('font-weight',m.kind==='reading'?'700':'850');
  if(m.kind==='reading')node.setAttribute('fill','#274b65');
  else node.removeAttribute('fill');
  top+=m.lineHeight;
  if(withReading&&metrics.length===4&&i===1)top+=size*.12;
 });
 return nodes;
}
global.KussoonMunicipalityRuby={attach,lines,dimensions,boxFor,paint,READING_RATIO};
})(window);
