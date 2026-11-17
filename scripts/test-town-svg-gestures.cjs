'use strict';
const assert=require('node:assert/strict');
const {install}=require('../v2/common/js/town-svg-gestures.js');
let mapClick,documentPointer,filter,backgroundClick,stopped=0,quizMode=0,selected='A',called=false;
const root={inside:true};
const svg={node:()=>({
 addEventListener(type,fn,capture){assert.equal(type,'click');assert.equal(capture,true);mapClick=fn},
 contains(target){return target===root}
}),call(obj){assert.equal(obj,zoom);called=true;return this},on(type,fn){assert.equal(type,'click');backgroundClick=fn;return this}};
const zoom={filter(fn){filter=fn;return this}};
const document={addEventListener(type,fn,capture){assert.equal(type,'pointerdown');assert.equal(capture,true);documentPointer=fn}};
const state=install({svg,zoom,document,getQuizMode:()=>quizMode,getSelected:()=>selected,stopBlink:()=>stopped++});
const ev=(type,extras={})=>({type,ctrlKey:false,button:0,...extras});
assert.equal(called,true);
assert.equal(filter(ev('wheel')),false,'wheel locked before click');
assert.equal(filter(ev('mousedown')),true,'drag works before wheel arming');
assert.equal(filter(ev('dblclick')),true,'double click handled by D3');
assert.equal(filter(ev('mousedown',{ctrlKey:true})),false);
assert.equal(filter(ev('wheel',{ctrlKey:true})),false);
assert.equal(filter(ev('mousedown',{button:2})),false);
mapClick();assert.equal(state.isWheelArmed(),true);
assert.equal(filter(ev('wheel')),true);
assert.equal(filter(ev('wheel',{ctrlKey:true})),true);
documentPointer({target:root});assert.equal(state.isWheelArmed(),true);
documentPointer({target:{}});assert.equal(state.isWheelArmed(),false);
assert.equal(filter(ev('wheel')),false);
backgroundClick();assert.equal(stopped,1);
quizMode=1;backgroundClick();assert.equal(stopped,1);
quizMode=0;selected='';backgroundClick();assert.equal(stopped,1);
console.log('PASS shared gesture arming, click, wheel, drag and double-click contract');
