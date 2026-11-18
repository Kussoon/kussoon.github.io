'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const moduleSrc=fs.readFileSync('v2/common/js/town-svg-labels.js','utf8');
const context={};context.globalThis=context;vm.runInNewContext(moduleSrc,context);
const api=context.KussoonTownSvgLabels;
const data=[{id:'A:0',key:'A:primary',name:'A',reading:'えー'},
 {id:'B:0',key:'B:primary',name:'B',reading:'びー'}];
function fakeD3(){
 const records=[];let current=null;
 class Selection{
  constructor(record){this.record=record}
  selectAll(x){if(x==='g.label')return this;this.record.children=[];return this}
  data(items,key){records.length=0;for(const x of items)records.push({data:x,key:key(x),children:[]});return this}
  join(){return this}
  attr(k,v){for(const r of records)r[k]=v;return this}
  each(fn){for(const r of records)fn.call(r,r.data);return this}
  remove(){return this}
  append(type){const child={tag:type,attrs:{},textContent:'',children:[]};this.record.children.push(child);return new Child(child)}
 }
 class Child{
  constructor(record){this.record=record}
  attr(k,v){this.record.attrs[k]=v;return this}
  text(v){this.record.textContent=v;return this}
  append(type){const child={tag:type,attrs:{},textContent:'',children:[]};this.record.children.push(child);return new Child(child)}
 }
 return {labels:{selectAll:()=>new Selection(null)},d3:{select:rec=>new Selection(rec)},records};
}
const old=fakeD3();api.render(old.labels,data,old.d3,{A:'えー',B:'びー'},true);
const modern=fakeD3();api.render(modern.labels,data,modern.d3,null,true,{key:d=>d.key,reading:d=>d.reading});
assert.deepEqual(old.records.map(x=>x.key),['A:0','B:0']);
assert.deepEqual(modern.records.map(x=>x.key),['A:primary','B:primary']);
assert.deepEqual(JSON.parse(JSON.stringify(modern.records.map(x=>x.children))),
 JSON.parse(JSON.stringify(old.records.map(x=>x.children))));
const without=fakeD3();api.render(without.labels,data,without.d3,null,false,{key:d=>d.key,reading:d=>d.reading});
assert.ok(without.records.every(x=>x.children[0].children.length===1));
const a=fs.readFileSync('v2/common/js/town-map-unified-label-render-takarazuka-20261118-pilot.js','utf8');
assert.match(a,/KussoonTownSvgLabels\.render\(labels,entries,d3,null,readingOn/);
assert.ok(!a.includes("label.append('tspan')"),'duplicated city-specific tspan creation');
console.log('PASS NATIONAL_LABEL_RENDER_CONTRACT existing Nishinomiya defaults, multi-candidate data key and reading, kana OFF');
