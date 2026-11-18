/* TOWNMAP-SSOT-001: municipality-neutral direct-pointer vertical zoom control.
 * No invisible native slider geometry for pointer mapping on iOS WebKit.
 * The native range remains available to keyboard/assistive technology.
 */
(function(root){
 'use strict';
 function install({svg,zoom,input,d3,well,plus,minus,getMinimumTransform,onMinimum}){
  if(!svg||!zoom||!input||!d3||!well||!plus||!minus||!getMinimumTransform||!onMinimum)
   throw new TypeError('Zoom pointer slider: incomplete setup');
  const thumb=well.querySelector('.zoom-slider-visual-thumb');
  const track=well.querySelector('.zoom-slider-visual-track');
  if(!thumb||!track)throw new Error('Zoom pointer slider: visual controls missing');
  const max=zoom.scaleExtent()[1];
  let dragging=false,pointerId=null,grabOffset=0,frame=null,pendingValue=null;
  const clamp=x=>Math.max(0,Math.min(100,x));
  const low=()=>Math.max(0.0001,Math.min(max*.999,getMinimumTransform().k));
  const kFor=value=>low()*Math.pow(max/low(),clamp(value)/100);
  const forK=k=>clamp(100*Math.log(Math.max(low(),Math.min(max,k))/low())/Math.log(max/low()));
  function paint(v){
   v=clamp(v);input.value=String(v);
   const height=track.getBoundingClientRect().height;
   const travel=Math.max(0,height-thumb.offsetHeight);
   // top relative to the WELL: visual track is inset 7px.
   thumb.style.top=(7+(1-v/100)*travel)+'px';
   input.setAttribute('aria-valuetext',v===0?'市の全体':('地図の拡大率 '+Math.round(kFor(v)*100)+'％'));
  }
  function sync(event){
   if(dragging)return;
   const k=event?.transform?.k??d3.zoomTransform(svg.node()).k;
   paint(forK(k));
  }
  zoom.on('zoom.townPointerSlider',sync);
  function apply(v){
   const val=clamp(v);
   // Keep the thumb under the user's finger, independent from map rendering.
   paint(val);
   svg.interrupt();
   if(val===0){onMinimum();paint(0);return}
   svg.call(zoom.scaleTo,kFor(val));
   if(!dragging)paint(val);
  }
  function flush(){
   frame=null;
   if(pendingValue===null)return;
   const v=pendingValue;pendingValue=null;
   apply(v);
  }
  function enqueue(v){
   pendingValue=clamp(v);paint(pendingValue);
   if(frame===null)frame=requestAnimationFrame(flush);
  }
  function positionToValue(clientY){
   const rect=track.getBoundingClientRect(),travel=Math.max(1,rect.height-thumb.offsetHeight);
   const top=rect.top+Math.max(0,Math.min(travel,clientY-grabOffset-rect.top));
   return clamp(100*(1-(top-rect.top)/travel));
  }
  well.addEventListener('pointerdown',e=>{
   if(e.button!==0&&e.pointerType==='mouse')return;
   e.preventDefault();e.stopPropagation();
   dragging=true;pointerId=e.pointerId;
   const thumbRect=thumb.getBoundingClientRect();
   grabOffset=e.clientY>=thumbRect.top&&e.clientY<=thumbRect.bottom?
    e.clientY-thumbRect.top:thumbRect.height/2;
   well.setPointerCapture(e.pointerId);
   enqueue(positionToValue(e.clientY));
  });
  well.addEventListener('pointermove',e=>{
   if(!dragging||e.pointerId!==pointerId)return;
   e.preventDefault();e.stopPropagation();enqueue(positionToValue(e.clientY));
  });
  function end(e){
   if(!dragging||e.pointerId!==pointerId)return;
   e.preventDefault();e.stopPropagation();
   const v=positionToValue(e.clientY);
   dragging=false;pointerId=null;
   if(frame!==null){cancelAnimationFrame(frame);frame=null}
   pendingValue=null;apply(v);
   if(well.hasPointerCapture(e.pointerId))well.releasePointerCapture(e.pointerId);
  }
  well.addEventListener('pointerup',end);
  well.addEventListener('pointercancel',end);
  input.addEventListener('input',()=>{if(!dragging)apply(Number(input.value))});
  // Minimum at bottom returns the ENTIRE city, not a previously chosen region.
  plus.addEventListener('click',()=>{
   const k=d3.zoomTransform(svg.node()).k;
   apply(forK(Math.min(max,k*2)));
  });
  minus.addEventListener('click',()=>{
   const k=d3.zoomTransform(svg.node()).k;
   apply(forK(k*.5));
  });
  paint(0);
  return Object.freeze({sync,apply});
 }
 const api=Object.freeze({install});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgZoomSliderDrag=api;
})(typeof globalThis!=='undefined'?globalThis:this);
