/* Kussoon town SVG common geometry viewport helpers (Phase 2 pilot).
 * Pure transform calculation only. The SVG/D3 event handlers remain in each page.
 * Padding and zoom range are passed by caller to preserve each baseline.
 */
(function(root){
 'use strict';
 function fitBounds(bounds, width, height, padding, minScale, maxScale){
  if(!Array.isArray(bounds)||bounds.length!==2||!bounds.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))
     ||![width,height,padding,minScale,maxScale].every(Number.isFinite)
     ||width<=0||height<=0||padding<0||minScale<=0||maxScale<minScale) return null;
  const x=(bounds[0][0]+bounds[1][0])/2,y=(bounds[0][1]+bounds[1][1])/2;
  const w=Math.max(1,bounds[1][0]-bounds[0][0]),h=Math.max(1,bounds[1][1]-bounds[0][1]);
  const scale=Math.min(maxScale,Math.max(minScale,Math.min((width-padding)/w,(height-padding)/h)));
  return {scale,x:width/2-scale*x,y:height/2-scale*y};
 }
 root.KussoonTownSvgViewport=Object.freeze({fitBounds});
})(window);
