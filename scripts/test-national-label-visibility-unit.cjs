'use strict';
const assert=require('node:assert/strict');
const visibility=require('../v2/common/js/town-svg-label-visibility.js');
const frame={left:0,top:0,right:390,bottom:600};
const inside={left:12,top:25,right:80,bottom:44,width:68,height:19};
const outside={left:500,top:25,right:550,bottom:44,width:50,height:19};
assert.equal(visibility.visible({secondary:false,zoomRatio:1,rect:inside,frame}),true);
assert.equal(visibility.visible({secondary:true,zoomRatio:1,rect:inside,frame}),false);
assert.equal(visibility.visible({secondary:true,zoomRatio:1.15,rect:inside,frame}),true);
assert.equal(visibility.visible({secondary:true,zoomRatio:1,selected:true,rect:inside,frame}),true);
assert.equal(visibility.visible({secondary:false,zoomRatio:1,rect:outside,frame}),false);
assert.equal(visibility.visible({secondary:false,zoomRatio:1,rect:outside,frame,clipToViewport:false}),true);
assert.equal(visibility.visible({secondary:true,zoomRatio:1,rect:inside,frame,clipToViewport:false}),false);
assert.equal(visibility.eligible({secondary:false,zoomRatio:1}),true);
for(const zoomRatio of [0.25,0.8,1.1,1.15,2,3]){
 for(const secondary of [false,true])for(const selected of [false,true]){
  const old=!secondary||zoomRatio>=1.15||selected;
  assert.equal(visibility.eligible({secondary,selected,zoomRatio}),old);
 }
}
assert.throws(()=>visibility.eligible({zoomRatio:NaN}),/zoomRatio/);
console.log('PASS NATIONAL_LABEL_VISIBILITY_RULE: primary retained, secondary zoom/selected, edge clipping and no municipality branching');
