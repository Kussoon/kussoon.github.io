// node --test v2/tests/administrative-labels.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'common/js/administrative-labels.js'),'utf8'),context);
const L=context.window.KussoonAdministrativeLabels;
const measure=(word,size)=>[...word].length*size;
const county={id:'28:28301',name:'猪名川町',fullName:'川辺郡猪名川町',county:'川辺郡'};
const countyOther={id:'24:24562',name:'紀宝町',fullName:'南牟婁郡紀宝町',county:'南牟婁郡'};
const hyogoCounty={id:'28301',name:'猪名川町',major:'川辺郡'};
const ward={id:'28101',name:'東灘区',major:'神戸市',fullName:'神戸市東灘区'};
const city={id:'28204',name:'西宮市'};
test('both county variants produce the same two-line town label',()=>{
 assert.deepEqual([...L.rows(county)],['川辺郡','猪名川町']);
 assert.deepEqual([...L.rows(hyogoCounty)],['川辺郡','猪名川町']);
 assert.deepEqual([...L.rows(countyOther)],['南牟婁郡','紀宝町']);
 assert.deepEqual([...L.rows(ward)],['神戸市','東灘区']);
 assert.equal(L.rows(city),null);
});
test('one shared layout uses only the wider row, not county plus town concatenation',()=>{
 assert.equal(L.widestRowModel(county,15,measure).name,'猪名川町');
 assert.equal(L.widestRowModel(countyOther,15,measure).name,'南牟婁郡');
 assert.equal(L.widestRowModel(ward,15,measure).name,'神戸市');
 assert.equal(L.widestRowModel(city,15,measure),city);
 const center={x:100,y:200,width:75,height:17,box:{x1:62.5,x2:137.5,y1:191.5,y2:208.5}};
 const mapped=L.boxFor(county,center,15,measure);
 assert.equal(mapped.width,4*15+15*.24);
 assert.equal(mapped.height,15*2.48);
 assert.equal(mapped.box.x1,100-mapped.width/2);
 assert.equal(mapped.box.y2,200+mapped.height/2);
 assert.equal(L.boxFor(city,center,15,measure),center);
});
test('SVG rows are updated on zoom and never duplicate tspans',()=>{
 class Node {
  constructor(tag,ownerDocument){this.tagName=tag;this.ownerDocument=ownerDocument;this.attributes={};this.children=[];this.textContent='';}
  setAttribute(k,v){this.attributes[k]=v;}
  querySelectorAll(tag){return this.children.filter(c=>c.tagName===tag);}
  replaceChildren(...nodes){this.children=nodes;}
 }
 const doc={createElementNS:(ns,tag)=>new Node(tag,doc)};
 const el=new Node('text',doc);
 assert.equal(L.paint(el,county,100,15),true);
 assert.deepEqual(el.children.map(c=>c.textContent),['川辺郡','猪名川町']);
 assert.equal(el.children[0].attributes.x,'100.00');
 assert.equal(el.children[0].attributes.dy,'-8.70');
 assert.equal(el.children[1].attributes.dy,'17.40');
 const same=[...el.children];
 assert.equal(L.paint(el,county,200,18),true);
 assert.equal(el.children[0],same[0]);
 assert.equal(el.children[1],same[1]);
 assert.equal(el.children[1].attributes.x,'200.00');
 assert.equal(el.children[0].attributes.dy,'-10.44');
 assert.equal(el.children[1].attributes.dy,'20.88');
 assert.equal(L.paint(el,city,0,15),false);
 assert.equal(el.textContent,'西宮市');
});
test('view-only label calculation does not rewrite administrative identity',()=>{
 const clone=L.widestRowModel(countyOther,15,measure);
 assert.equal(clone.id,'24:24562');
 assert.equal(clone.fullName,'南牟婁郡紀宝町');
 assert.equal(countyOther.name,'紀宝町');
});
