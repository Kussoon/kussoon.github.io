// node --test v2/tests/national-density.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../national/density-labels.js'),'utf8');
const ctx={window:{}};
vm.runInNewContext(src,ctx);
const D=ctx.window.KussoonDensityLabels;
const models=['27100','28100','28204','29201','25201'].map((code,i)=>({
 id:'test-'+i,code,prefectureCode:code.slice(0,2),box:{w:20+i,h:12}
}));
const separate=models.map((_,i)=>({box:{x1:70*i,y1:0,x2:70*i+45,y2:20}}));
const same=models.map(()=>({box:{x1:0,y1:0,x2:45,y2:20}}));
const settings={view:{x:0,y:0,w:400,h:240},zoom:1,
 screenWidth:390,screenHeight:400,mode:'adaptive',density:'normal',
 selectedId:'test-2'};
test('original all-label mode preserves every label',()=>{
 assert.equal(D.select(models,same,{...settings,mode:'all'}).filter(Boolean).length,models.length);
});
test('natural mode suppresses colliding labels',()=>{
 assert.equal(D.select(models,same,settings).filter(Boolean).length,1);
});
test('selected label remains visible even when it conflicts with capital',()=>{
 assert.equal(D.select(models,same,settings)[2],true);
});
test('separated labels are not needlessly hidden',()=>{
 assert.equal(D.select(models,separate,settings).filter(Boolean).length,models.length);
});
test('out of viewport labels are excluded from the natural mode',()=>{
 const outside=[...separate];
 outside[4]={box:{x1:500,y1:10,x2:550,y2:30}};
 assert.equal(D.select(models,outside,settings)[4],false);
});
test('density setting is monotonic for isolated candidates',()=>{
 const ss={...settings,screenWidth:200,screenHeight:200};
 const s=D.select(models,separate,{...ss,density:'sparse'}).filter(Boolean).length;
 const m=D.select(models,separate,{...ss,density:'normal'}).filter(Boolean).length;
 const d=D.select(models,separate,{...ss,density:'dense'}).filter(Boolean).length;
 assert.ok(s<=m&&m<=d);
});

test('unused open cells can receive labels via polygon-internal candidate anchors',()=>{
 const clustered=models.slice(0,4).map((m,i)=>({
  ...m,
  polylabel:[40+i*90,110]
 }));
 const starting=clustered.map((m,i)=>({
  x:40+i*3,y:110,height:20,
  box:{x1:10+i*3,y1:100,x2:70+i*3,y2:120}
 }));
 const arranged=D.arrange(clustered,starting,{
  view:{x:0,y:0,w:440,h:220},
  screenWidth:440,screenHeight:220,
  mode:'adaptive',density:'dense',selectedId:null
 });
 assert.ok(arranged.visible.filter(Boolean).length>=3,
  'additional noncolliding polygon centers should be considered');
 assert.ok(arranged.labels.some((p,i)=>p.x!==starting[i].x));
});
test('selected model stays highlighted while alternative placements are considered',()=>{
 const crowded=models.slice(0,2).map((m,i)=>({
  ...m,polylabel:[50+i*110,50]
 }));
 const labels=crowded.map(m=>({
  x:50,y:50,height:20,box:{x1:30,y1:40,x2:70,y2:60}
 }));
 const result=D.arrange(crowded,labels,{
  view:{x:0,y:0,w:200,h:120},
  screenWidth:390,screenHeight:240,
  mode:'adaptive',density:'normal',selectedId:crowded[0].id
 });
 assert.equal(result.visible[0],true);
 assert.equal(result.labels[0].x,50);
});
