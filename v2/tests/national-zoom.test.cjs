// National V2 zoom cap regression test: node --test v2/tests/national-zoom.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../national/national-app.js'),'utf8');
const zoomSource=source.match(/function zoomBy\([\s\S]*?\n}\n(?=function pan\()/)?.[0];
assert.ok(zoomSource,'Could not locate the original zoomBy() implementation');
const cases=[
 ['west-shikoku',96],
 ['chugoku-shikoku',72],
 ['west',72],
 ['shikoku',18],
 ['chugoku',18],
 ['kansai',18],
 ['fuji',18]
];
for(const [area,limit] of cases){
 test('national zoom limit for '+area+' remains '+limit+'x',()=>{
  const context={
   models:[{}],bounds:{x:0,y:0,w:900,h:500},
   view:{x:0,y:0,w:900,h:500},
   state:{area},clamp(){},syncView(){},scheduleLabels(){}
  };
  vm.createContext(context);
  vm.runInContext(zoomSource,context);
  for(let i=0;i<20;i++)vm.runInContext('zoomBy(1.5)',context);
  assert.ok(Math.abs(context.bounds.w/context.view.w-limit)<1e-8);
  const before=context.view.w;
  vm.runInContext('zoomBy(1.5)',context);
  assert.equal(context.view.w,before,'zoom must stop at safe upper limit');
  vm.runInContext('zoomBy(1/1.5)',context);
  assert.ok(context.view.w>before,'zooming out must remain available');
 });
}
test('no selection state is changed by zoom',()=>{
 const context={models:[{}],bounds:{x:0,y:0,w:900,h:500},
  view:{x:0,y:0,w:900,h:500},state:{area:'west-shikoku'},
  selection:{type:'model',id:'28:28204'},
  clamp(){},syncView(){},scheduleLabels(){}};
 vm.createContext(context);
 vm.runInContext(zoomSource,context);
 vm.runInContext('zoomBy(1.5)',context);
 assert.equal(context.selection.id,'28:28204');
});
