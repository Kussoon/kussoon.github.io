#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const listeners=new Map(),docListeners=new Map();
const svg={style:{},attrs:{},setAttribute(n,v){this.attrs[n]=v;},getBoundingClientRect(){return{left:0,top:0,width:850,height:700};},addEventListener(n,fn){listeners.set(n,fn);},removeEventListener(n){listeners.delete(n);},contains(target){return target===this;},hasPointerCapture(){return false;}};
const document={addEventListener(n,fn){docListeners.set(n,fn);},removeEventListener(n){docListeners.delete(n);}};
const window={};
vm.runInNewContext(fs.readFileSync('v2/progressive-preview/map-viewport.js','utf8'),{window,document,Math,Map});
const viewport=window.KussoonV2MapViewport.init({svg});
viewport.setZoomTarget({x:700,y:140});viewport.zoomIn();
let view=viewport.view();
assert(Math.abs(view.x+view.w/2-700)<1e-6,'focus geometry is centered by the actual progressive viewport button zoom');
assert(Math.abs(view.y+view.h/2-140)<1e-6,'focus geometry is centered vertically');
viewport.zoomIn();view=viewport.view();
assert(Math.abs(view.x+view.w/2-700)<1e-6,'consecutive buttons zoom around the current focused viewport');
// A direct pan/pinch replaces the one-shot geometry anchor. The next button
// zoom must preserve the position the user navigated to.
viewport.reset();viewport.setZoomTarget({x:700,y:140});
const pointer=(id,x,y)=>({pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,cancelable:true,preventDefault(){}});
listeners.get('pointerdown')(pointer(1,300,300));
listeners.get('pointermove')(pointer(1,420,300));
listeners.get('pointerup')(pointer(1,420,300));
view=viewport.view();const pannedCenter={x:view.x+view.w/2,y:view.y+view.h/2};
viewport.zoomIn();view=viewport.view();
assert(Math.abs(view.x+view.w/2-pannedCenter.x)<1e-6,'button zoom after map pan retains the user-selected horizontal center');
assert(Math.abs(view.y+view.h/2-pannedCenter.y)<1e-6,'button zoom after map pan retains the user-selected vertical center');
viewport.reset();viewport.zoomIn();view=viewport.view();
assert(Math.abs(view.x+view.w/2-425)<1e-6,'national/ordinary maps keep the historic viewport-center zoom');
viewport.destroy();
console.log('PASS progressive map viewport geometry-centered study zoom; ordinary center and reset preserved');
