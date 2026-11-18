'use strict';
const assert=require('node:assert/strict');
const {transition,sync}=require('../v2/common/js/town-svg-community-state.js');
const steps=[];
transition({stopQuiz:value=>steps.push(['stopQuiz',value]),stopBlink:()=>steps.push('stopBlink'),
 render:()=>steps.push('render'),updateUI:()=>steps.push('updateUI'),fit:()=>steps.push('fit')});
assert.deepEqual(steps,[['stopQuiz',false],'stopBlink','render','updateUI','fit']);
const control=()=>({textContent:''});
const buttons=['','中心','南部'].map(x=>({dataset:{community:x},active:false,pressed:null,
 classList:{toggle(key,value){assert.equal(key,'active');this.active=value}},
 setAttribute(key,value){assert.equal(key,'aria-pressed');this.pressed=value}}));
function check(region,n,expected){
 const toggle=control(),count=control(),reset=control();
 sync({selectedRegion:region,regionLabel:x=>x+'（かな）',cityLabel:'架空市',
 wholeCityCount:125,activeTownCount:n,toggle,count,reset,buttons});
 assert.deepEqual([toggle.textContent,count.textContent,reset.textContent],expected);
 for(const b of buttons){assert.equal(b.classList.active,b.dataset.community===region);
 assert.equal(b.pressed,String(b.dataset.community===region));}
}
check('',125,['架空市全域（125町名） ▾','市全域：125町名','市の\n全体']);
check('中心',18,['中心（かな） ▾','中心（かな）：18町名','区域\n全体']);
check('南部',20,['南部（かな） ▾','南部（かな）：20町名','区域\n全体']);
assert.throws(()=>transition({stopQuiz(){}}),TypeError);
assert.throws(()=>sync({selectedRegion:'中心',regionLabel:()=>'',cityLabel:'架空市',
 wholeCityCount:1,activeTownCount:1,toggle:control(),count:control(),reset:control(),buttons}),/地域名/);
console.log('PASS NATIONAL_TOWN_COMMUNITY_STATE_CONTRACT');
