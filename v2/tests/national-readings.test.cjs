// node --test v2/tests/national-readings.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const state={window:{}};
vm.runInNewContext(read('common/js/national-readings.js'),state);
const NR=state.window.KussoonNationalReadings;
const dataset=JSON.parse(read('data/national/municipality-readings.json'));
const counties=JSON.parse(read('data/national/county-readings.json'));
const measure=(value,size)=>[...value].length*size;
function one(code,name,props={}){
 return NR.attach([{code,name,...props}],dataset,counties)[0];
}
test('one ordinary city becomes kanji then a small hiragana row',()=>{
 const m=one('28204','西宮市');
 assert.deepEqual(m.readingParts.map(p=>[p.name,p.reading]),[['西宮市','にしのみやし']]);
 assert.deepEqual(NR.lines(m).map(p=>[p.text,p.kind]),[
  ['西宮市','name'],['にしのみやし','reading']]);
 assert.equal(m.reading,'にしのみやし');
});
test('designated city shows name, reading, ward, reading in that exact order',()=>{
 const m=one('28110','中央区',{major:'神戸市'});
 const expected=['神戸市','こうべし','中央区','ちゅうおうく'];
 assert.deepEqual(NR.lines(m).map(p=>p.text),expected);
 const g=NR.geometry(m,15,measure);
 assert.equal(g.rows.length,4);
 assert.ok(g.height>15*3.5);
 assert.equal(g.rows[1].scale,.62);
 assert.ok(g.positions.every((y,i)=>i===0||y>g.positions[i-1]));
});
test('county name and town name are interleaved, never concatenated into a single line',()=>{
 const m=one('28301','猪名川町',{county:'川辺郡'});
 assert.deepEqual(NR.lines(m).map(p=>p.text),[
  '川辺郡','かわべぐん','猪名川町','いながわちょう']);
 const kusimoto=one('30428','串本町',{county:'東牟婁郡'});
 assert.deepEqual(NR.lines(kusimoto).map(p=>p.text),[
  '東牟婁郡','ひがしむろぐん','串本町','くしもとちょう']);
});
test('candidate position uses the full label rectangle, not kanji-only height',()=>{
 const m=one('28110','中央区',{major:'神戸市'});
 const old={x:100,y:50,box:{x1:65,x2:135,y1:30,y2:70},width:70,height:40};
 const n=NR.boxFor(m,old,15,measure);
 assert.equal(n.x,100);assert.equal(n.y,50);
 assert.ok(n.width>0);assert.ok(n.height>old.height);
 assert.equal(n.box.y1,50-n.height/2);assert.equal(n.box.x2,100+n.width/2);
});
test('SVG paint uses explicit per-line centers and reading font smaller than name',()=>{
 class Node{
  constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.textContent='';this.attrs={};this.childNodes=[];}
  setAttribute(k,v){this.attrs[k]=v;}
  querySelectorAll(name){return this.childNodes.filter(n=>n.tagName===name);}
  replaceChildren(...nodes){this.childNodes=nodes;}
 }
 const doc={createElementNS:(ns,tag)=>new Node(tag,doc)},el=new Node('text',doc);
 const m=one('28110','中央区',{major:'神戸市'});
 NR.paint(el,m,120,180,15,measure);
 assert.deepEqual(el.childNodes.map(n=>n.textContent),['神戸市','こうべし','中央区','ちゅうおうく']);
 assert.ok(Number(el.childNodes[1].attrs['font-size'])<Number(el.childNodes[0].attrs['font-size']));
 assert.ok(Number(el.childNodes[1].attrs.y)<Number(el.childNodes[2].attrs.y));
 const before=[...el.childNodes];
 NR.paint(el,m,122,182,17,measure);
 assert.equal(el.childNodes[0],before[0],'Zoom should reuse existing tspans');
 assert.equal(el.childNodes[0].attrs.x,'122.00');
});
test('2021 pilot geometry names match 321 code-verified readings, with 45 district readings',()=>{
 const prefs=['19','22','25','26','27','28','29','30'];
 const models=[],countySet=new Set(),codes=new Set();
 for(const pref of prefs){
  const t=JSON.parse(read('data/national/2021/'+pref+'.topojson'));
  for(const g of Object.values(t.objects)[0].geometries){
   const p=g.properties;
   assert.equal(codes.has(p.N03_007),false,'Duplicate '+p.N03_007);
   codes.add(p.N03_007);
   const city=p.N03_003?.endsWith('市')?p.N03_003:null;
   const county=p.N03_003?.endsWith('郡')?p.N03_003:null;
   if(county)countySet.add(county);
   models.push({code:p.N03_007,name:p.N03_004,major:city,county});
  }
 }
 const attached=NR.attach(models,dataset,counties);
 assert.equal(attached.length,315);
 assert.equal(Object.keys(dataset.items).length,321);
 assert.equal(countySet.size,45);
 assert.equal(Object.keys(counties.readings).length,45);
 assert.ok(attached.every(m=>m.readingParts.length===1||m.readingParts.length===2));
 for(const city of [['26100','京都市'],['27100','大阪市'],['27140','堺市'],['28100','神戸市'],['22100','静岡市'],['22130','浜松市']]){
  assert.ok(one(...city).reading);
 }
});
test('reject swapped municipality readings rather than guessing',()=>{
 assert.throws(()=>one('28110','北区',{major:'神戸市'}),/一致しません/);
 assert.throws(()=>NR.attach([{code:'00000',name:'架空町'}],dataset,counties),/未収録/);
});
