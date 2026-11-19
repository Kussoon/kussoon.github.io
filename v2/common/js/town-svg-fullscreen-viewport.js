/* TOWNMAP-SSOT-001 R-TOWN-00/06/12/14/20/21/23/44.
 * Municipality-neutral fullscreen viewport preservation.
 * A capturing click listener snapshots the visible world center before the
 * approved control rail changes layout; the bound change callback restores
 * that exact center and zoom after CSS layout. No town data or UI duplication.
 */
(function(root){
 'use strict';
 function create({svg,zoom,d3,button,requestFrame,afterRestore}={}){
  if(!svg||!zoom||!d3||!button||typeof svg.node!=='function')
   throw new TypeError('全画面の地図表示状態に必要な部品がありません');
  const raf=requestFrame||root.requestAnimationFrame?.bind(root);
  if(typeof raf!=='function')throw new TypeError('画面更新の予約処理が必要です');
  let snapshot=null;
  function capture(){
   const box=svg.node().getBoundingClientRect();
   const t=d3.zoomTransform(svg.node());
   if(!box.width||!box.height||!Number.isFinite(t.k)||t.k<=0)return false;
   snapshot=Object.freeze({
    k:t.k,
    worldX:(box.width/2-t.x)/t.k,
    worldY:(box.height/2-t.y)/t.k
   });
   return true;
  }
  // Capture both pointer and keyboard-generated click activations.
  button.addEventListener('click',capture,true);
  function changed(){
   if(!snapshot)return;
   const old=snapshot;snapshot=null;
   raf(()=>{
    const box=svg.node().getBoundingClientRect();
    if(box.width<=0||box.height<=0)return;
    // Keep the centre world point and the zoom ratio unchanged, moving only
    // the screen translation for the resized viewport.
    const next=d3.zoomIdentity.translate(
     box.width/2-old.worldX*old.k,
     box.height/2-old.worldY*old.k
    ).scale(old.k);
    svg.interrupt();
    svg.call(zoom.transform,next);
    if(typeof afterRestore==='function')afterRestore();
   });
  }
  return Object.freeze({capture,onFullscreenChange:changed});
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgFullscreenViewport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
