/* TOWNMAP-SSOT-001 R-TOWN-00/04/06/20: single nationwide view transform
 * dispatch. The fitted transform remains source-specific input, protecting
 * the approved geographic/Leaflet-C and raw-SVG viewport calculations.
 */
(function(root){
 'use strict';
 function apply({svg,zoom,transform}){
  if(!svg||typeof svg.call!=='function'||!zoom||typeof zoom.transform!=='function'
     ||!transform||typeof transform!=='object')
   throw new TypeError('SVG・D3ズーム・計算済み変換が必要です');
  // Preserve the original exact D3 callback, not an animated transition.
  return svg.call(zoom.transform,transform);
 }
 function fromFit({svg,zoom,d3,fit}){
  if(!d3||!d3.zoomIdentity||!fit||![fit.x,fit.y,fit.scale].every(Number.isFinite)
     ||fit.scale<=0)throw new TypeError('表示範囲の変換値が不正です');
  return apply({svg,zoom,transform:d3.zoomIdentity.translate(fit.x,fit.y).scale(fit.scale)});
 }
 const api=Object.freeze({apply,fromFit});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgViewActions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
