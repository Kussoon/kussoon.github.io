/* Municipality-neutral pointer slider. Native vertical-range behavior is deliberately
 * not mixed with a separately painted thumb. No label/layout search occurs here. */
(function(root){
 'use strict';
 const clamp=value=>Math.max(0,Math.min(100,value));
 function valueAt(rect,y,offset=0){
  const travel=Math.max(1,rect.height-18);
  return clamp((rect.bottom-9-(y-offset))/travel*100);
 }
 function install({element,onStart,onChange}){
  const track=element.parentElement;
  let value=0,active=null,grabOffset=0,frame=0,pending=null;
  function setValue(next){
   if(!Number.isFinite(Number(next)))return;
   value=clamp(Number(next));
   element.setAttribute('aria-valuenow',value.toFixed(2));
   track.style.setProperty('--zoom-position',String(1-value/100));
  }
  function queue(next){
   pending=clamp(next);setValue(pending);
   if(frame)return;
   frame=requestAnimationFrame(()=>{frame=0;const next=pending;pending=null;onChange(next)});
  }
  element.addEventListener('pointerdown',event=>{
   if(active!==null||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
   event.preventDefault();event.stopPropagation();onStart();
   element.focus({preventScroll:true});active=event.pointerId;
   const rect=element.getBoundingClientRect(),center=rect.bottom-9-(rect.height-18)*value/100;
   grabOffset=Math.abs(event.clientY-center)<=12?event.clientY-center:0;
   try{element.setPointerCapture(active)}catch(_){/* Synthetic regression inputs have no native pointer. */}
   queue(valueAt(rect,event.clientY,grabOffset));
  });
  element.addEventListener('pointermove',event=>{
   if(event.pointerId!==active)return;
   event.preventDefault();event.stopPropagation();
   queue(valueAt(element.getBoundingClientRect(),event.clientY,grabOffset));
  });
  element.addEventListener('pointerup',event=>{
   if(event.pointerId!==active)return;
   event.preventDefault();event.stopPropagation();
   queue(valueAt(element.getBoundingClientRect(),event.clientY,grabOffset));
   const id=active;active=null;
   if(element.hasPointerCapture?.(id))element.releasePointerCapture(id);
  });
  const cancel=event=>{if(event.pointerId===active)active=null};
  element.addEventListener('pointercancel',cancel);
  element.addEventListener('lostpointercapture',cancel);
  element.addEventListener('click',event=>{event.preventDefault();event.stopPropagation()});
  element.addEventListener('keydown',event=>{
   const deltas={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1,PageUp:10,PageDown:-10};
   if(!(event.key in deltas)&&!['Home','End'].includes(event.key))return;
   event.preventDefault();event.stopPropagation();onStart();
   queue(event.key==='Home'?0:event.key==='End'?100:value+deltas[event.key]);
  });
  setValue(0);return Object.freeze({setValue});
 }
 const api=Object.freeze({install,valueAt});
 root.KussoonTownMapZoomSlider=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
