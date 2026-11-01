/* Kussoon V2 — reusable map viewport for SVG municipality maps.
 * Zoom and pan use the SVG viewBox, so no TopoJSON paths are rebuilt while
 * interacting. Works with touch pointers, mouse dragging, buttons and wheel.
 */
(function(global){
'use strict';
function init(options){
 const {svg,width=850,height=700,minZoom=1,maxZoom=128,onZoomChange}=options||{};
 if(!svg)throw Error('SVG map element is required');
 let box={x:0,y:0,w:width,h:height};
 let fingers=new Map(), gesture=null, dragged=false, suppressClick=false, wheelArmed=false;
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const view=()=>({x:box.x,y:box.y,w:box.w,h:box.h});
 function emit(){
  svg.setAttribute('viewBox',[box.x,box.y,box.w,box.h].join(' '));
  if(typeof onZoomChange==='function')onZoomChange(width/box.w);
 }
 function bound(next){
  const w=clamp(next.w,width/maxZoom,width/minZoom);
  const h=w*height/width;
  // Allow the map to pan out of the initial frame by up to half a viewport
  // (useful when inspecting outer and remote islands).
  const marginX=width/2,marginY=height/2;
  const x=clamp(next.x,-marginX,width+marginX-w);
  const y=clamp(next.y,-marginY,height+marginY-h);
  return {x,y,w,h};
 }
 function setView(next){box=bound(next);emit();}
 function point(e){
  const rect=svg.getBoundingClientRect();
  const cx=Math.max(1,rect.width),cy=Math.max(1,rect.height);
  return {x:((e.clientX-rect.left)/cx)*width,y:((e.clientY-rect.top)/cy)*height};
 }
 function toMap(p,b=box){return {x:b.x+(p.x/width)*b.w,y:b.y+(p.y/height)*b.h};}
 function zoom(factor,at={x:width/2,y:height/2}){
  const before=toMap(at);
  const nextW=clamp(box.w/factor,width/maxZoom,width/minZoom);
  const ratio=nextW/width;
  setView({x:before.x-at.x*ratio,y:before.y-at.y*ratio,w:nextW,h:ratio*height});
 }
 function pan(dx,dy,from=box){
  setView({x:from.x-dx/width*from.w,y:from.y-dy/height*from.h,w:from.w,h:from.h});
 }
 function reset(){fingers.clear();gesture=null;dragged=false;box={x:0,y:0,w:width,h:height};emit();}
 function startGesture(){
  const pts=[...fingers.values()];
  if(!pts.length){gesture=null;return;}
  const midpoint=pts.length===1?pts[0]:{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
  const distance=pts.length===1?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
  gesture={count:pts.length,midpoint,distance,box:view(),anchor:toMap(midpoint)};
 }
 function pointerDown(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  wheelArmed=true;
  fingers.set(e.pointerId,point(e));
  // Do not capture a simple tap: Safari must deliver its click to the land path.
  if(fingers.size>1){dragged=true;suppressClick=true;
   if(svg.setPointerCapture)for(const id of fingers.keys())try{svg.setPointerCapture(id);}catch(_){/* another pointer may have ended */}
  }
  startGesture();
 }
 function pointerMove(e){
  if(!fingers.has(e.pointerId))return;
  const p=point(e),previous=fingers.get(e.pointerId);
  fingers.set(e.pointerId,p);
  if(!gesture)return;
  const pts=[...fingers.values()];
  const mid=pts.length===1?pts[0]:{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
  const moved=Math.hypot(p.x-previous.x,p.y-previous.y);
  if(moved<.1)return;
  if(pts.length===1&&gesture.count===1){
   const dx=mid.x-gesture.midpoint.x,dy=mid.y-gesture.midpoint.y;
   if(Math.hypot(dx,dy)>5&&!dragged){dragged=true;
    if(svg.setPointerCapture)try{svg.setPointerCapture(e.pointerId);}catch(_){}
   }
   if(dragged){suppressClick=true;pan(dx,dy,gesture.box);}
  }else if(pts.length>=2&&gesture.count>=2){
   dragged=true;suppressClick=true;
   const dist=Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));
   const factor=dist/Math.max(1,gesture.distance);
   const w=clamp(gesture.box.w/factor,width/maxZoom,width/minZoom);
   const ratio=w/width;
   setView({x:gesture.anchor.x-mid.x*ratio,y:gesture.anchor.y-mid.y*ratio,w,h:ratio*height});
  }
  if(dragged&&e.cancelable)e.preventDefault();
 }
 function pointerUp(e){
  if(!fingers.has(e.pointerId))return;
  fingers.delete(e.pointerId);
  if(svg.hasPointerCapture&&svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
  if(fingers.size)startGesture();else{gesture=null;dragged=false;}
 }
 function onWheel(e){
  if(!wheelArmed&&!e.ctrlKey)return;
  if(e.cancelable)e.preventDefault();
  zoom(Math.exp(-e.deltaY*.003),point(e));
 }
 function onDoubleClick(e){if(e.cancelable)e.preventDefault();zoom(2,point(e));suppressClick=true;}
 function onClickCapture(e){
  if(!suppressClick)return;
  e.preventDefault();e.stopPropagation();
  suppressClick=false;
 }
 function outside(e){if(!svg.contains(e.target))wheelArmed=false;}
 svg.style.touchAction='none';
 svg.addEventListener('pointerdown',pointerDown);
 svg.addEventListener('pointermove',pointerMove);
 svg.addEventListener('pointerup',pointerUp);
 svg.addEventListener('pointercancel',pointerUp);
 svg.addEventListener('lostpointercapture',pointerUp);
 svg.addEventListener('wheel',onWheel,{passive:false});
 svg.addEventListener('dblclick',onDoubleClick);
 svg.addEventListener('click',onClickCapture,true);
 document.addEventListener('pointerdown',outside,true);
 emit();
 return Object.freeze({zoomIn:()=>zoom(1.8),zoomOut:()=>zoom(1/1.8),reset,zoom,view,destroy(){
  svg.removeEventListener('pointerdown',pointerDown);
  svg.removeEventListener('pointermove',pointerMove);
  svg.removeEventListener('pointerup',pointerUp);
  svg.removeEventListener('pointercancel',pointerUp);
  svg.removeEventListener('lostpointercapture',pointerUp);
  svg.removeEventListener('wheel',onWheel);
  svg.removeEventListener('dblclick',onDoubleClick);
  svg.removeEventListener('click',onClickCapture,true);
  document.removeEventListener('pointerdown',outside,true);
 }});
}
global.KussoonV2MapViewport=Object.freeze({init});
})(window);
