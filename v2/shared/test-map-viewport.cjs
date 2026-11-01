#!/usr/bin/env node
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const listeners=new Map(),docListeners=new Map();
const el={
 style:{},attrs:{},
 setAttribute(n,v){this.attrs[n]=v;},
 getBoundingClientRect(){return {left:0,top:0,width:850,height:700};},
 addEventListener(n,fn){listeners.set(n,fn);},
 removeEventListener(n){listeners.delete(n);},
 contains(target){return target===this;},
 hasPointerCapture(){return false;}
};
const document={addEventListener(n,fn){docListeners.set(n,fn)},removeEventListener(n){docListeners.delete(n)}};
const window={};
vm.runInNewContext(fs.readFileSync('v2/shared/map-viewport.js','utf8'),{window,document});
assert(window.KussoonV2MapViewport);
let zoomLevel=0;
const v=window.KussoonV2MapViewport.init({svg:el,onZoomChange:z=>{zoomLevel=z}});
assert.equal(zoomLevel,1);
v.zoomIn();assert(zoomLevel>1.7&&zoomLevel<1.9);
const centered=v.view();
assert(Math.abs(centered.x+centered.w/2-425)<1e-5);
v.zoomOut();assert(Math.abs(v.view().w-850)<1e-5);
v.zoom(2,{x:210,y:350});assert(Math.abs(v.view().x-105)<1e-5,'zoom must anchor clicked island');
v.reset();assert.equal(zoomLevel,1);
const pointer=(id,x,y,type='touch')=>({pointerId:id,pointerType:type,button:0,clientX:x,clientY:y,cancelable:true,preventDefault(){}});
listeners.get('pointerdown')(pointer(1,200,200));
listeners.get('pointermove')(pointer(1,270,220));
assert(v.view().x<0,'finger drag should pan eastward on map');
listeners.get('pointerup')(pointer(1,270,220));
v.reset();
listeners.get('pointerdown')(pointer(1,300,300));
listeners.get('pointerdown')(pointer(2,500,300));
listeners.get('pointermove')(pointer(2,600,300));
assert(zoomLevel>1,'pinch should zoom');
listeners.get('pointerup')(pointer(1,300,300));
listeners.get('pointerup')(pointer(2,600,300));
v.reset();
listeners.get('wheel')({deltaY:-100,clientX:425,clientY:350,cancelable:true,ctrlKey:true,preventDefault(){}});
assert(zoomLevel>1,'wheel or trackpad zoom must work');
v.reset();
v.destroy();
assert.equal(listeners.size,0,'listeners should be removable');
const page=fs.readFileSync('v2/national/official-2026-kanto-seven-20m-trial.html','utf8');
assert(page.includes('src="../shared/map-viewport.js"'));
for(const id of ['zoomIn','zoomOut','zoomReset','zoomLevel'])assert(page.includes('id="'+id+'"'));
assert(page.includes("viewport.zoomIn()")&&page.includes("viewport.zoomOut()"));
assert(page.includes("viewport.reset()"));
assert(page.includes("KussoonV2MunicipalRenderer.focusBounds(chosen.polys)"));
new vm.Script(page.split('<script>').at(-1).split('</script>')[0]);
console.log('PASS SVG viewport buttons, zoom anchors, finger drag, pinch, wheel, reset and JS syntax');
