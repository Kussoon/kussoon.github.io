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

test('visible part of a municipality gets a label before its old offscreen anchor enters view',()=>{
 // Mock point-in-polygon with axis-aligned rectangle rings for this regression.
 ctx.window.KussoonLabelEngine={isInside:(x,y,rings)=>{
  const corners=rings[0];
  return x>=corners[0][0]&&x<=corners[1][0]&&
   y>=corners[0][1]&&y<=corners[1][1];
 }};
 const a={id:'clipped-city',code:'28999',prefectureCode:'28',
  box:{minX:0,maxX:420,minY:0,maxY:120,w:420,h:120},
  rings:[[[0,0],[420,120]]],polylabel:[30,60]};
 const old={x:30,y:60,width:65,height:20,box:{x1:-2.5,x2:62.5,y1:50,y2:70}};
 const result=D.arrange([a],[old],{
  view:{x:260,y:10,w:140,h:100},zoom:4,
  mode:'adaptive',density:'dense',selectedId:null,
  screenWidth:390,screenHeight:500
 });
 assert.equal(result.visible[0],true);
 assert.ok(result.labels[0].x>=260&&result.labels[0].x<=400);
});
test('dense mode has no early global label cap when many non-overlapping names fit',()=>{
 const many=Array.from({length:24},(_,i)=>({
  id:'a'+i,code:String(50000+i),prefectureCode:'50',
  box:{w:40,h:30},polylabel:[20+(i%6)*70,20+Math.floor(i/6)*50]
 }));
 const boxes=many.map((m,i)=>{
  const x=20+(i%6)*70,y=20+Math.floor(i/6)*50;
  return {x,y,height:16,width:38,box:{x1:x-19,x2:x+19,y1:y-8,y2:y+8}};
 });
 const result=D.arrange(many,boxes,{
  view:{x:0,y:0,w:440,h:240},zoom:3,
  mode:'adaptive',density:'dense',selectedId:null,
  screenWidth:220,screenHeight:240
 });
 assert.equal(result.visible.filter(Boolean).length,24);
});

test('A mode keeps all municipality labels at their supplied central anchors',()=>{
 const rect=[{x:50,y:50,width:30,height:20,box:{x1:35,x2:65,y1:40,y2:60}},
  {x:65,y:50,width:30,height:20,box:{x1:50,x2:80,y1:40,y2:60}}];
 const ms=rect.map((_,i)=>({id:'m'+i,rings:[[[0,0],[140,0],[140,120],[0,120]]],box:{w:140,h:120}}));
 const res=D.fullCompare(ms,rect,{mode:'fixed',view:{x:0,y:0,w:140,h:120},
  screenWidth:280,screenHeight:240});
 assert.equal(res.visible.filter(Boolean).length,2);
 assert.equal(res.labels[0],rect[0]);
 assert.equal(res.labels[1],rect[1]);
 assert.equal(res.moved,0);
});
test('B mode retains every label, moves only colliding ones within eight screen pixels',()=>{
 ctx.window.KussoonLabelEngine={isInside:(x,y)=>x>=0&&x<=140&&y>=0&&y<=120};
 const rect=[{x:50,y:50,width:30,height:20,box:{x1:35,x2:65,y1:40,y2:60}},
  {x:65,y:50,width:30,height:20,box:{x1:50,x2:80,y1:40,y2:60}},
  {x:115,y:50,width:30,height:20,box:{x1:100,x2:130,y1:40,y2:60}}];
 const ms=rect.map((_,i)=>({id:'m'+i,rings:[[[0,0],[140,0],[140,120],[0,120]]],box:{w:140,h:120}}));
 const res=D.fullCompare(ms,rect,{mode:'light',view:{x:0,y:0,w:140,h:120},
  screenWidth:280,screenHeight:240,selectedId:'m0'});
 assert.equal(res.visible.filter(Boolean).length,3);
 assert.equal(res.labels[0],rect[0]);
 assert.ok(res.moved>=1);
 res.labels.forEach((label,i)=>{
  assert.ok(Math.hypot(label.x-rect[i].x,label.y-rect[i].y)<=4*Math.SQRT2+1e-6);
 });
 assert.equal(res.labels[2],rect[2]);
});
