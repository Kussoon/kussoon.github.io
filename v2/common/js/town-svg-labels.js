// SVG town-label data and element creation; municipality-specific labels remain configuration.
// Pixel size, zoom, viewport clipping and label style remain controlled by the caller.
(function(root){
 'use strict';
 function positions(feature,{nameProperty='S_NAME',multiLabels={},extraLabels={},labelOffsets={},projection,projectedAt}){
  const name=feature.properties[nameProperty],multi=multiLabels[name],extra=extraLabels[name]||[];
  if(multi)return multi.map(x=>({point:projection([x[1],x[0]]),offset:[0,0]}));
  const first=projectedAt(feature);
  return [{point:first,offset:labelOffsets[name]||[0,0]},...extra.map(x=>({point:projection([x[1],x[0]]),offset:[0,0]}))];
 }
 function makeData(features,locate,nameProperty='S_NAME'){
  return features.flatMap(f=>locate(f).filter(x=>x.point.every(Number.isFinite)).map((p,i)=>({...p,name:f.properties[nameProperty],id:f.properties[nameProperty]+':'+i})));
 }
 // R-TOWN-00/14: one SVG label-element creation contract.
 // The data key and reading source may be supplied by any municipality
 // dataset. Defaults preserve the adopted Nishinomiya render path exactly.
 function render(labels,data,d3,readings,readingOn,options={}){
  const key=options.key||((d)=>d.id);
  const read=options.reading||((d)=>readings[d.name]);
  const g=labels.selectAll('g.label').data(data,key).join('g').attr('class','label');
  g.each(function(d){
   const el=d3.select(this);el.selectAll('*').remove();
   const t=el.append('text').attr('class','town-label');
   t.append('tspan').attr('class','town-name').attr('x',0).text(d.name);
   const phonetic=readingOn?read(d):'';
   if(phonetic)t.append('tspan').attr('class','town-reading').attr('x',0).text(phonetic);
  });
 }
 const api=Object.freeze({positions,makeData,render});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgLabels=api;
})(typeof globalThis!=='undefined'?globalThis:this);
