'use strict';
// TOWNMAP-SSOT-001: one city-neutral updater with data-supplied anchors and visibility.
const assert=require('node:assert/strict');
const vis=require('../v2/common/js/town-svg-label-visibility.js');
const engine=require('../v2/common/js/town-svg-label-update.js');
function fakeLabels(entries){
 const records=[];
 const nodes=entries.map(d=>({
  __data__:d,style:{display:''},dataset:{},
  getBoundingClientRect:()=>({left:30,right:50,top:30,bottom:50,width:20,height:20})
 }));
 const wrapper={
  attr(k,v){records.push({kind:'attr',k,value:typeof v==='function'?entries.map(v):v});return this},
  style(k,v){nodes.forEach(x=>{x.style[k]=v===null?'':v});return this},
  selectAll(sel){records.push({kind:'select',sel});return this},
  nodes(){return nodes}
 };
 return {labels:{selectAll(){return wrapper}},nodes,records};
}
const data=[
 {name:'任意の町名',anchor:[12,24],secondary:false},
 {name:'別の町名',anchor:[30,42],secondary:true}
];
const a=fakeLabels(data);
const params={labels:a.labels,transform:{k:2},fs:12,readingOn:true,
 anchorOf:d=>d.anchor,candidateMode:true,
 frame:{left:0,right:100,top:0,bottom:100},
 zoomRatio:1,selected:'',threshold:1.15,visibility:vis};
engine.update(params);
assert.deepEqual(a.records.find(x=>x.k==='transform').value,[
 'translate(12,24) scale(0.5)','translate(30,42) scale(0.5)'
]);
assert.equal(a.nodes[0].dataset.visible,'true');
assert.equal(a.nodes[1].dataset.visible,'false');
assert.equal(a.nodes[1].style.display,'none');
engine.update({...params,zoomRatio:1.2});
assert.equal(a.nodes[1].dataset.visible,'true','secondary enabled after zoom');
engine.update({...params,selected:'別の町名'});
assert.equal(a.nodes[1].dataset.visible,'true','selected can override zoom threshold');
engine.update({...params,candidateMode:false});
assert.equal(a.nodes[1].dataset.visible,'true','legacy always-on labels');
assert.equal(a.nodes[1].style.display,'');
assert.throws(()=>engine.update({...params,anchorOf:null}),TypeError);
console.log('PASS NATIONAL_TOWN_LABEL_UPDATE_CONTRACT');
