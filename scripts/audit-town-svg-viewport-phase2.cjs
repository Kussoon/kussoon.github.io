#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../v2/common/js/town-svg-viewport.js'),'utf8');
const context={window:{}};vm.runInNewContext(src,context);
const fit=context.window.KussoonTownSvgViewport.fitBounds;
function original(bounds,width,height,padding){
 const x=(bounds[0][0]+bounds[1][0])/2,y=(bounds[0][1]+bounds[1][1])/2;
 const w=Math.max(1,bounds[1][0]-bounds[0][0]),h=Math.max(1,bounds[1][1]-bounds[0][1]);
 const scale=Math.min(40,Math.max(.6,Math.min((width-padding)/w,(height-padding)/h)));
 return {scale,x:width/2-scale*x,y:height/2-scale*y};
}
for(const width of [320,390,1280]){
 for(const padding of [44,100]){
  for(const bounds of [[[1,2],[8,19]],[[0,0],[0,0]],[[100,80],[200,240]],[[-200,-300],[700,800]]]){
   const a=original(bounds,width,700,padding),b=fit(bounds,width,700,padding,.6,40);
   assert.ok(b,'valid bounds');
   for(const key of ['scale','x','y'])assert.ok(Math.abs(a[key]-b[key])<1e-9,key+' regression');
  }
 }
}
assert.equal(fit([[0,0],[NaN,1]],390,700,44,.6,40),null);
assert.equal(fit([[0,0],[2,2]],0,700,44,.6,40),null);
console.log('PASS SVG viewport shared transform numeric parity at mobile and desktop widths');
