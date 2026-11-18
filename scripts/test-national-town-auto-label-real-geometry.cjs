'use strict';
// TOWNMAP-SSOT-001 R-TOWN-00/01/05/06/13/14/44.
// Execute the real generic geometry-candidate engine (no mocked generator).
// Do not modify any accepted map, label positions or municipality data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../v2/common/js/town-svg-auto-labels.js'),'utf8');
const context={window:{}};
vm.runInNewContext(source,context,{filename:'town-svg-auto-labels.js'});
const auto=context.window.KussoonAutoTownLabels;
assert.equal(typeof auto.candidates,'function');
const square=(x0,y0,x1,y1,clockwise=true)=>
 clockwise
  ? `M${x0},${y0}L${x1},${y0}L${x1},${y1}L${x0},${y1}Z`
  : `M${x0},${y0}L${x0},${y1}L${x1},${y1}L${x1},${y0}Z`;
const inSquare=(p,x0,y0,x1,y1)=>p[0]>x0&&p[0]<x1&&p[1]>y0&&p[1]<y1;
function check(title,path,fill,expected){
 const entries=auto.candidates(path,fill,10000);
 assert.equal(entries.length,expected,title+' candidate count');
 for(const item of entries){
  assert.equal(fill(item.point),true,title+' candidate in painted area');
  assert.ok(Number.isFinite(item.point[0])&&Number.isFinite(item.point[1]));
  assert.ok(item.area>0);
 }
 return entries;
}
// Two independent disjoint positive-winding rings must retain two candidates.
const two=square(0,0,20,20)+' '+square(40,0,60,20);
const twoFill=p=>inSquare(p,0,0,20,20)||inSquare(p,40,0,60,20);
const parts=check('disjoint components',two,twoFill,2);
assert.ok(parts.some(x=>inSquare(x.point,0,0,20,20)));
assert.ok(parts.some(x=>inSquare(x.point,40,0,60,20)));
// A counter-winding hole must never become another town-component label.
const donut=square(0,0,100,100)+' '+square(40,40,60,60,false);
const donutFill=p=>inSquare(p,0,0,100,100)&&!inSquare(p,40,40,60,60);
const ring=check('hole',donut,donutFill,1);
assert.equal(inSquare(ring[0].point,40,40,60,60),false);
// Concave ring: a bounding-box midpoint can be outside the area.
const concave='M0,0L60,0L60,10L10,10L10,60L0,60Z';
const concaveFill=p=>inSquare(p,0,0,60,10)||inSquare(p,0,10,10,60);
check('concave region',concave,concaveFill,1);
// A tiny positive component cannot silently disappear.
const tiny=square(0,0,1,1);
check('tiny region',tiny,p=>inSquare(p,0,0,1,1),1);
// No fictitious label when the SVG fill test rejects every point.
assert.equal(auto.candidates(square(0,0,20,20),()=>false,10000).length,0);
assert.throws(()=>auto.candidates('M0 0 Q10 10 20 20',()=>true,10000),/未対応SVGコマンド/);
console.log('PASS NATIONAL_TOWN_AUTO_LABEL_REAL_GEOMETRY: disjoint, holes, concave, tiny, unfilled and unsupported path');
