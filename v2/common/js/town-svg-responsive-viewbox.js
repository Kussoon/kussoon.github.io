/* TOWNMAP-SSOT-001: shared SVG viewport coordinate alignment.
 * D3 zoom transforms are in the SVG viewBox's user units. When the viewBox
 * is the fixed source projection size (e.g. 1000x720) but the SVG renders
 * at a 350x430 CSS box, computing D3 fit from CSS pixels places the map in
 * the wrong coordinate system. Preserve all projected paths as-is and make
 * the viewBox match the actual CSS viewport before fitting or restoring.
 */
(function(root){
 'use strict';
 function sync(svg){
  if(!svg||typeof svg.getBoundingClientRect!=='function'
    ||typeof svg.setAttribute!=='function')
   throw new TypeError('表示領域のあるSVG要素が必要です');
  const bounds=svg.getBoundingClientRect();
  const width=bounds.width,height=bounds.height;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)
   throw new Error('SVG表示領域の大きさを取得できません');
  const current=svg.viewBox?.baseVal;
  if(!current||Math.abs(current.x)>0.01||Math.abs(current.y)>0.01
    ||Math.abs(current.width-width)>0.1||Math.abs(current.height-height)>0.1)
   svg.setAttribute('viewBox','0 0 '+width+' '+height);
  return Object.freeze({width,height});
 }
 const api=Object.freeze({sync});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgResponsiveViewBox=api;
})(typeof globalThis!=='undefined'?globalThis:this);
