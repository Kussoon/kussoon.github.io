// Usage: node --test v2/tests/region-fit.test.cjs
// Regression for geometry-only territory containment with no place-specific offsets.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ctx={window:{},performance:{now:()=>0}};
const root=path.resolve(__dirname,'..');
for(const script of ['label-engine.js','region-fit.js']){
 vm.runInNewContext(fs.readFileSync(path.join(root,'common/js',script),'utf8'),ctx,{filename:script});
}
const E=ctx.window.KussoonLabelEngine,F=ctx.window.KussoonRegionFit;
function rect(a,b,c,d){return [[a,b],[c,b],[c,d],[a,d]];}
function model(rings){
 return {rings,box:E.bbox(rings),centroid:E.centroid(rings),polylabel:E.polylabel(rings)};
}
function label(x,y,w=50,h=20){
 return {x,y,width:w,height:h,box:{x1:x-w/2,x2:x+w/2,y1:y-h/2,y2:y+h/2},step:0};
}
function collisions(labels){
 let count=0;
 for(let i=0;i<labels.length;i++)for(let j=0;j<i;j++){
  const a=labels[i].box,b=labels[j].box;
  if(Math.min(a.x2,b.x2)>Math.max(a.x1,b.x1)&&
     Math.min(a.y2,b.y2)>Math.max(a.y1,b.y1))count++;
 }
 return count;
}
test('moves a boundary-crossing label even without any overlapping neighbor',()=>{
 const m=model([rect(0,0,120,55)]),seed=label(110,25,48,17);
 const r=F.refine([m],[seed],15,E);
 assert.equal(r.moved,1);
 assert.equal(r.poorlyContainedAfter,0);
 assert.ok(r.afterOutside<r.beforeOutside);
 assert.equal(F.fractionInside(r.labels[0].box,m.rings,E),1);
 assert.equal(seed.x,110,'Input layouts must be immutable');
});
test('keeps already-contained center and pinned selection unchanged',()=>{
 const m=model([rect(0,0,120,55)]),safe=label(60,25,45,17);
 const a=F.refine([m],[safe],15,E);
 assert.equal(a.moved,0);
 assert.equal(a.labels[0].x,60);
 const outside=label(111,25,48,17);
 const b=F.refine([m],[outside],15,E,{pinned:0});
 assert.equal(b.moved,0);
 assert.equal(b.labels[0].x,111);
});
test('never introduces an extra label collision to improve containment',()=>{
 const models=[model([rect(0,0,120,65)]),model([rect(120,0,240,65)])];
 const labels=[label(115,34,65,24),label(166,34,65,24)];
 const initialCollisions=collisions(labels);
 const r=F.refine(models,labels,15,E,{passes:2});
 assert.ok(r.afterOutside<=r.beforeOutside+1e-9);
 assert.ok(collisions(r.labels)<=initialCollisions);
});
test('handles a disconnected territory and chooses a valid component for the box',()=>{
 const m=model([rect(0,0,45,45),rect(80,0,180,65)]);
 const initial=label(40,22,54,19);
 const r=F.refine([m],[initial],15,E);
 assert.ok(F.fractionInside(r.labels[0].box,m.rings,E)>
  F.fractionInside(initial.box,m.rings,E));
 assert.equal(E.isInside(r.labels[0].x,r.labels[0].y,m.rings),true);
});
test('hole polygons do not receive fake positive containment',()=>{
 const outer=rect(0,0,180,120),hole=rect(55,35,125,85);
 const m=model([outer,hole]);
 const bad=label(90,60,65,27);
 assert.equal(F.fractionInside(bad.box,m.rings,E),0);
 const r=F.refine([m],[bad],15,E);
 assert.equal(r.moved,1);
 assert.ok(r.afterOutside<r.beforeOutside);
 assert.equal(E.isInside(r.labels[0].x,r.labels[0].y,m.rings),true);
});
test('keeps all names; preserves identifying metadata and box dimensions',()=>{
 const m=model([rect(0,0,90,90)]);
 m.name='神崎郡神河町';m.id='28:28446';
 const old={...label(80,44,68,35),fontSize:15,primary:'神崎郡 / 神河町'};
 const r=F.refine([m],[old],15,E);
 assert.equal(r.labels.length,1);
 assert.equal(r.labels[0].width,68);
 assert.equal(r.labels[0].height,35);
 assert.equal(r.labels[0].primary,old.primary);
 assert.equal(m.id,'28:28446');
});

test('a narrow notch crossing a label edge triggers DOWNWARD movement even when interior sampling reports perfect fit',()=>{
 const rings=[[[0,0],[40,0],[40,23],[66,23],[66,0],[120,0],[120,70],[0,70]]];
 const m=model(rings),start=label(55,33,36,24);
 assert.equal(F.fractionInside(start.box,m.rings,E),1);
 assert.ok(F.edgeClearance(start.box,m.rings,E)<0);
 const r=F.refine([m],[start],15,E);
 assert.equal(r.moved,1);
 assert.ok(r.labels[0].y>start.y,'The useful free space is below the notch');
 assert.ok(F.edgeClearance(r.labels[0].box,m.rings,E)>
  F.edgeClearance(start.box,m.rings,E));
 assert.ok(r.edgeRiskAfter<=r.edgeRiskBefore);
 const legacy=F.refine([m],[start],15,E,{perimeter:false});
 assert.equal(legacy.moved,0,'Pre-existing overview positioning remains unchanged');
});
test('a left-side notch triggers RIGHTWARD movement without a municipality-specific offset',()=>{
 const rings=[[[0,0],[130,0],[130,75],[0,75],[0,50],[23,50],[23,22],[0,22]]];
 const m=model(rings),start=label(34,36,24,24);
 assert.equal(F.fractionInside(start.box,m.rings,E),1);
 assert.ok(F.edgeClearance(start.box,m.rings,E)<0);
 const r=F.refine([m],[start],15,E);
 assert.equal(r.moved,1);
 assert.ok(r.labels[0].x>start.x,'The available land is to the right');
 assert.ok(F.edgeClearance(r.labels[0].box,m.rings,E)>
  F.edgeClearance(start.box,m.rings,E));
});
