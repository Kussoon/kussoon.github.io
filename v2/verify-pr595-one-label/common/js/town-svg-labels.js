// SVG town-label data and element creation; municipality-specific labels remain configuration.
// Pixel size, zoom, viewport clipping and label style remain controlled by the caller.
(function(root){
 'use strict';
 function positions(feature,{nameProperty='S_NAME',multiLabels={},extraLabels={},labelOffsets={},projection,projectedAt}){
  const name=feature.properties[nameProperty],multi=multiLabels[name];
  // One label per named town; retain the first existing approved anchor.
  if(multi&&multi.length)return [{point:projection([multi[0][1],multi[0][0]]),offset:[0,0]}];
  const first=projectedAt(feature);
  return [{point:first,offset:labelOffsets[name]||[0,0]}];
 }
 function makeData(features,locate,nameProperty='S_NAME'){
  return features.flatMap(f=>locate(f).filter(x=>x.point.every(Number.isFinite)).map((p,i)=>({...p,name:f.properties[nameProperty],id:f.properties[nameProperty]+':'+i})));
 }
 function render(labels,data,d3,readings,readingOn){
  const g=labels.selectAll('g.label').data(data,d=>d.id).join('g').attr('class','label');
  g.each(function(d){
   const el=d3.select(this);el.selectAll('*').remove();
   const t=el.append('text').attr('class','town-label');
   t.append('tspan').attr('class','town-name').attr('x',0).text(d.name);
   if(readingOn&&readings[d.name])t.append('tspan').attr('class','town-reading').attr('x',0).text(readings[d.name]);
  });
 }
 const api=Object.freeze({positions,makeData,render});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgLabels=api;
})(typeof globalThis!=='undefined'?globalThis:this);
