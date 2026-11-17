'use strict';
const assert=require('node:assert/strict');
const {fontPixels,update}=require('../v2/common/js/town-svg-label-viewport.js');
const expected=({zoomK,initialK,directLinkFontOffset=0,fontPct=100})=>8*Math.min(2,Math.max(.75,Math.pow(1.18,Math.log2(zoomK/initialK)+directLinkFontOffset)))*fontPct/100;
for(const initialK of [.6,1,2,10])for(const zoomK of [.6,1,2,3,10,40])for(const fontPct of [75,100,125,200]){
 const x={zoomK,initialK,fontPct};
 assert.equal(fontPixels(x),expected(x));
}
assert.equal(fontPixels({zoomK:1,initialK:1,fontPct:100}),8);
// Fake minimal D3 selection to verify transform, font offsets and edge correction order.
function scenario(fittedView){
 const data={point:[100,50],offset:[-7,2]};
 const group={attrs:{},removeAttribute(k){delete this.attrs[k]},setAttribute(k,v){this.attrs[k]=v},querySelector(){return {getBoundingClientRect:()=>({left:-8,right:52,top:5,bottom:15,width:60,height:10})}}};
 const labels={selectAll(sel){
  if(sel==='g.label')return {attr(k,v){group.attrs[k]=v(data);return this},each(fn){fn.call(group,data);return this}};
  if(sel==='text.town-label')return {attr(){return this},selectAll(){return {attr(){return this}}}};
  throw Error('Unexpected selector '+sel);
 }};
 const svg={node:()=>({getBoundingClientRect:()=>({left:0,right:200,top:0,bottom:100,width:200,height:100})})};
 update({labels,svg,transform:{k:2},fittedView,readingOn:true,fs:8});
 assert.equal(group.attrs['transform'],fittedView?'translate(101.5,51) scale(0.5)':'translate(96.5,51) scale(0.5)');
 assert.equal(group.attrs['data-edge-shift'],fittedView?'10.00,0.00':undefined);
}
scenario(true);scenario(false);
console.log('PASS town SVG font-scale and fit-only edge correction contract');
