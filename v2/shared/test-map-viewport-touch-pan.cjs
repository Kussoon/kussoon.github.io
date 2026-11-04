#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('v2/shared/map-viewport.js','utf8');
function mock(){
 const listeners=new Map(),captures=new Set();
 const docListeners=new Map();
 const svg={
  style:{},rect:{left:0,top:0,width:850,height:700},
  attrs:{},
  addEventListener(n,fn){listeners.set(n,fn);},
  removeEventListener(){},
  setAttribute(n,v){this.attrs[n]=v;},
  getBoundingClientRect(){return this.rect;},
  setPointerCapture(id){captures.add(id);},
  hasPointerCapture(id){return captures.has(id);},
  releasePointerCapture(id){captures.delete(id);},
  contains(){return false}
 };
 const document={addEventListener(n,fn){docListeners.set(n,fn);},removeEventListener(){}};
 const context={window:{},document,Math,Map};
 vm.runInNewContext(js,context);
 const vp=context.window.KussoonV2MapViewport.init({svg,width:850,height:700});
 const event=(type,id,x,y)=>({pointerId:id,pointerType:type,button:0,clientX:x,clientY:y,cancelable:true,preventDefault(){}});
 return {svg,vp,captures,fire:(n,e)=>listeners.get(n)(e),event};
}
{
 const t=mock();t.vp.zoomIn();
 const before=t.vp.view();
 t.fire('pointerdown',t.event('touch',1,460,340));
 t.fire('pointermove',t.event('touch',1,457,340));
 assert(t.captures.has(1),'early touch movement must capture the pointer');
 t.fire('pointermove',t.event('touch',1,260,340));
 const after=t.vp.view();
 assert(after.x>before.x+100,'long pan must move the view continuously');
 t.fire('pointerup',t.event('touch',1,260,340));
 assert(!t.captures.has(1),'pointer capture must release');
 assert.equal(t.svg.style.touchAction,'none');
 console.log('PASS touch early capture and long distance pan');
}
{
 const t=mock();
 t.fire('pointerdown',t.event('touch',2,300,300));
 t.fire('pointerup',t.event('touch',2,300,300));
 assert(!t.captures.has(2),'simple tap must not capture or interfere with native prefecture click');
 console.log('PASS tap remains native');
}
{
 const t=mock();
 t.vp.zoomIn();
 t.fire('pointerdown',t.event('mouse',3,500,350));
 t.fire('pointermove',t.event('mouse',3,497,350));
 assert(!t.captures.has(3),'mouse click jitter must not start drag');
 t.fire('pointermove',t.event('mouse',3,480,350));
 assert(t.captures.has(3),'mouse drag threshold must remain');
 t.fire('pointerup',t.event('mouse',3,480,350));
 console.log('PASS mouse threshold unchanged');
}

{
 // On iOS, touch has implicit pointer capture on the original SVG path.
 // Once SVG obtains capture, that child emits a *bubbling* loss event.
 // It must not clear the active finger or stop continued movement.
 const t=mock();t.vp.zoomIn();
 t.fire('pointerdown',t.event('touch',4,470,340));
 t.fire('pointermove',t.event('touch',4,466,340));
 assert(t.captures.has(4),'the map should capture dragging');
 const before=t.vp.view().x;
 t.fire('lostpointercapture',{pointerId:4,target:{tagName:'path'},pointerType:'touch'});
 t.fire('pointermove',t.event('touch',4,260,340));
 assert(t.vp.view().x>before+100,'bubbling child capture loss must not stop pan');
 t.fire('pointerup',t.event('touch',4,260,340));
 console.log('PASS Safari implicit SVG-child capture loss does not terminate drag');
}
{
 // Genuine capture loss from the SVG itself still terminates the gesture.
 const t=mock();t.vp.zoomIn();
 t.fire('pointerdown',t.event('touch',5,470,340));
 t.fire('pointermove',t.event('touch',5,466,340));
 t.fire('lostpointercapture',{pointerId:5,target:t.svg,pointerType:'touch'});
 const before=t.vp.view().x;
 t.fire('pointermove',t.event('touch',5,270,340));
 assert.equal(t.vp.view().x,before,'true map capture loss should end pan');
 console.log('PASS genuine SVG capture loss still cancels gesture');
}
