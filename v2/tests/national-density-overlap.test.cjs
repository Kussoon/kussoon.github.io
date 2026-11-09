'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../national/density-labels.js'),'utf8');
const context={window:{}};
vm.runInNewContext(source,context);
const density=context.window.KussoonDensityLabels;
function model(id){return {id,code:'2800'+id,prefectureCode:'28',box:{w:40,h:30}};}
function label(x1,x2,y1=40,y2=60){
 return {x:(x1+x2)/2,y:(y1+y2)/2,width:x2-x1,height:y2-y1,
  box:{x1,x2,y1,y2}};
}
const models=[model('1'),model('2'),model('3')];
const options={view:{x:0,y:0,w:100,h:100},mode:'adaptive',density:'dense',
 screenWidth:100,screenHeight:100,selectedId:null,stableAnchors:true};
test('below 2x, fixed labels retain the collision rule',()=>{
 const result=density.select(models.slice(0,2),[label(40,60),label(42,62)],
  {...options,zoom:1.99});
 assert.deepEqual(result,[true,false]);
});
test('at 2x, all in-view fixed labels display despite overlap and sparse caps',()=>{
 const result=density.select(models.slice(0,2),[label(40,60),label(42,62)],
  {...options,zoom:2,density:'sparse'});
 assert.deepEqual(result,[true,true]);
});
test('a partly visible label displays while a fully offscreen label stays hidden',()=>{
 const labels=[label(-10,5),label(110,130),label(40,60)];
 const result=density.select(models,labels,{...options,zoom:4});
 assert.deepEqual(result,[true,false,true]);
});
test('overlap allowance applies only to stable nationwide anchors',()=>{
 const result=density.select(models.slice(0,2),[label(40,60),label(42,62)],
  {...options,zoom:4,stableAnchors:false});
 assert.deepEqual(result,[true,false]);
});
