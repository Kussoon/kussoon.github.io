/* Nationwide V2 administrative readings, independent of map geometry.
 * Reading source: code4fukui/localgovjp (CC0); county readings separate.
 * Strictly match the official 5-digit municipality code AND expected name.
 */
(function(global){
 'use strict';
 const kana=s=>String(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96))
   .replace(/[\s　]/g,'');
 function attach(models,source,countySource){
  const items=source?.items||{},counties=countySource?.readings||{};
  return models.map(model=>{
   const entry=items[model.code];
   if(!entry)throw Error('読み仮名未収録：'+model.code+' '+model.name);
   const full=(model.major?.endsWith('市')?model.major:'')+model.name;
   if(entry.name!==full)throw Error('自治体名と読みデータが一致しません：'+model.code+' '+full+'≠'+entry.name);
   let parts;
   if(model.major?.endsWith('市')){
    const p=entry.reading.trim().split(/\s+/);
    if(p.length!==2)throw Error('市と区の読みが分離されていません：'+entry.name);
    parts=[{name:model.major,reading:kana(p[0])},{name:model.name,reading:kana(p[1])}];
   }else if(model.county){
    const countykana=counties[model.county];
    if(!countykana)throw Error('郡名の読みが未収録：'+model.county);
    parts=[{name:model.county,reading:kana(countykana)},{name:model.name,reading:kana(entry.reading)}];
   }else{
    parts=[{name:model.name,reading:kana(entry.reading)}];
   }
   if(parts.some(p=>!p.reading||!/^[ぁ-ゖー]+$/.test(p.reading)))
    throw Error('読み仮名に不正文字：'+model.name);
   return {...model,readingParts:parts,reading:parts.map(p=>p.reading).join('')};
  });
 }

 // Name/reading pairs are one unit for collision and territory fit.
 const SMALL=.62;
 function lines(model){
  return (model.readingParts||[]).flatMap(p=>[
   {text:p.name,scale:1,kind:'name'},
   {text:p.reading,scale:SMALL,kind:'reading'}
  ]);
 }
 function geometry(model,size,measure){
  const rows=lines(model),parts=model.readingParts||[];
  if(!parts.length)throw Error('Reading lines missing: '+model.name);
  const widths=rows.map(r=>measure(r.text,size*r.scale));
  const width=Math.max(...widths)+size*.28;
  const rowSizes=rows.map(r=>size*r.scale);
  const gaps=rows.slice(0,-1).map((r,i)=>i%2===0?size*.10:size*.24);
  const total=rowSizes.reduce((a,b)=>a+b,0)+gaps.reduce((a,b)=>a+b,0);
  const height=total+size*.20;
  let pos=-total/2;
  const positions=rowSizes.map((h,i)=>{
   const y=pos+h/2;pos+=h+(gaps[i]||0);return y;
  });
  return {width,height,rows,positions,rowSizes};
 }
 function boxFor(model,label,size,measure){
  const g=geometry(model,size,measure);
  const {x,y}=label;
  return {...label,width:g.width,height:g.height,
   box:{x1:x-g.width/2,x2:x+g.width/2,y1:y-g.height/2,y2:y+g.height/2}};
 }
 function paint(textElement,model,x,y,size,measure){
  const g=geometry(model,size,measure);
  const existing=[...textElement.querySelectorAll('tspan')];
  if(existing.length!==g.rows.length||existing.some((node,i)=>node.textContent!==g.rows[i].text)){
   const nodes=g.rows.map(row=>{
    const el=textElement.ownerDocument.createElementNS('http://www.w3.org/2000/svg','tspan');
    el.textContent=row.text;return el;
   });
   textElement.replaceChildren(...nodes);
  }
  const spans=[...textElement.querySelectorAll('tspan')];
  spans.forEach((span,i)=>{
   const row=g.rows[i],font=size*row.scale;
   span.setAttribute('x',Number(x).toFixed(2));
   span.setAttribute('y',(y+g.positions[i]).toFixed(2));
   span.setAttribute('font-size',font.toFixed(2));
   span.setAttribute('font-weight',row.kind==='reading'?'700':'850');
   span.setAttribute('stroke-width',(font*.18).toFixed(2));
   span.setAttribute('dominant-baseline','central');
   span.setAttribute('data-kind',row.kind);
  });
  return g;
 }
 global.KussoonNationalReadings={attach,kana,lines,geometry,boxFor,paint};

})(window);
