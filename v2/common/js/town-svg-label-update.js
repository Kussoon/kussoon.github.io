/* TOWNMAP-SSOT-001 R-TOWN-00/06/14: city-neutral label viewport update.
 * Accepted name/reading positions and visibility policies are supplied as
 * input; no town- or municipality-specific branching. Opt-in comparisons only.
 */
(function(root){
 'use strict';
 function update({labels,transform,fs,readingOn,anchorOf,candidateMode=true,
                  frame,zoomRatio=1,selected='',threshold=1.15,
                  visibility=root.KussoonTownSvgLabelVisibility,
                  geometryUpdate=null,preserveVisibility=false}){
  if(!labels||!transform||(!geometryUpdate&&typeof anchorOf!=='function'))throw new TypeError('Missing SVG label update inputs');
  if(geometryUpdate!==null&&typeof geometryUpdate!=='function')throw new TypeError('geometryUpdate must be a function');
  const all=labels.selectAll('g.label');
  // A caller may supply an established, precisely calibrated SVG placement
  // transform. It is input geometry, NOT municipality-specific behavior.
  // Run it first; text-size / reading operations below remain shared.
  if(geometryUpdate)geometryUpdate({labels,transform,fs,readingOn});
  else all.attr('transform',d=>{
   const point=anchorOf(d);
   return 'translate('+point[0]+','+point[1]+') scale('+(1/transform.k)+')';
  });
  all.selectAll('text.town-label').attr('font-size',fs);
  all.selectAll('tspan.town-name').attr('y',readingOn?(-.48*fs):0);
  all.selectAll('tspan.town-reading').attr('y',.54*fs).attr('font-size',fs*.78);
  if(!candidateMode){
   // Previously approved always-on labels may intentionally retain their
   // existing DOM visibility attributes; do not introduce data-visible.
   if(!preserveVisibility)all.style('display',null).attr('data-visible','true');
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
