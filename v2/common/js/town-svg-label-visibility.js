/* TownMap R-TOWN-00/14: one nationwide label eligibility rule.
 * Geometry, anchor placement and view transforms are input data, not
 * municipality-specific behavior. Never hide a primary due to overlap.
 * Supports old-style always-on labels and multipart candidates.
 */
(function(root){
 'use strict';
 function eligible({secondary=false,zoomRatio=1,selected=false,threshold=1.15}){
  if(!Number.isFinite(zoomRatio)||zoomRatio<0)throw new TypeError('zoomRatio must be finite and nonnegative');
  return !secondary||zoomRatio>=threshold||Boolean(selected);
 }
 function intersects(rect,frame){
  return rect.width>0&&rect.height>0&&rect.right>frame.left&&rect.bottom>frame.top
   &&rect.left<frame.right&&rect.top<frame.bottom;
 }
 function visible({secondary=false,zoomRatio=1,selected=false,rect,frame,threshold=1.15,
                  clipToViewport=true}){
  return eligible({secondary,zoomRatio,selected,threshold})
   &&(!clipToViewport||intersects(rect,frame));
 }
 const api=Object.freeze({eligible,intersects,visible});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgLabelVisibility=api;
})(typeof globalThis!=='undefined'?globalThis:this);
