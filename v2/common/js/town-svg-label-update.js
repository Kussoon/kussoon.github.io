/* TOWNMAP-SSOT-001 R-TOWN-00/06/14: city-neutral label viewport update.
 * Accepted name/reading positions and visibility policies are supplied as
 * input; no town- or municipality-specific branching. Opt-in comparisons only.
 */
(function(root){
 'use strict';
 function update({labels,transform,fs,readingOn,anchorOf,candidateMode=true,
                  frame,zoomRatio=1,selected='',threshold=1.15,
                  visibility=root.KussoonTownSvgLabelVisibility}){
  if(!labels||!transform||typeof anchorOf!=='function')throw new TypeError('Missing SVG label update inputs');
  const all=labels.selectAll('g.label');
  // Preserve the adopted SVG transform string and tspan update order.
  all.attr('transform',d=>{
   const point=anchorOf(d);
   return 'translate('+point[0]+','+point[1]+') scale('+(1/transform.k)+')';
  });
  all.selectAll('text.town-label').attr('font-size',fs);
  all.selectAll('tspan.town-name').attr('y',readingOn?(-.48*fs):0);
  all.selectAll('tspan.town-reading').attr('y',.54*fs).attr('font-size',fs*.78);
  if(!candidateMode){
   all.style('display',null).attr('data-visible','true');
   return all;
  }
  if(!frame||!visibility||typeof visibility.visible!=='function')throw new TypeError('Missing viewport and visibility');
  for(const node of all.nodes()){
   const d=node.__data__;
   // Measure while visible, before applying viewport clipping.
   node.style.display='';
   const rect=node.getBoundingClientRect();
   const show=visibility.visible({
    secondary:d.secondary,zoomRatio,selected:d.name===selected,
    rect,frame,threshold,clipToViewport:true
   });
   node.style.display=show?'':'none';
   node.dataset.visible=String(show);
  }
  return all;
 }
 const api=Object.freeze({update});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgLabelUpdate=api;
})(typeof globalThis!=='undefined'?globalThis:this);
