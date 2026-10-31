// Run: node --test v2/tests/national-centered-labels.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={window:{KussoonLabelEngine:{isInside:(x,y,rings)=>{
 let inside=false;
 for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}}}};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../national/centered-labels.js'),'utf8'),context);
const M=context.window.KussoonCenteredLabels;
const rectangle=(id,name,x0,y0,x1,y1)=>({
 id,name,box:{minX:x0,minY:y0,maxX:x1,maxY:y1,w:x1-x0,h:y1-y0},
 rings:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1]]],
 polylabel:[(x0+x1)/2,(y0+y1)/2]
});
test('north-south and east-west central point in a rectangle',()=>{
 const m=rectangle('r','長方形',0,0,100,180);
 assert.deepEqual(Array.from(M.point(m)),[50,90]);
});
test('wide northern lobe does not pull a long city label upward',()=>{
 const m={...rectangle('l','縦長市',0,0,120,200),
  rings:[[[0,0],[120,0],[120,60],[75,60],[75,200],[45,200],[45,60],[0,60]]],
  polylabel:[60,32]};
 assert.deepEqual(Array.from(M.point(m)),[60,100]);
});
test('central horizontal line uses the available interior interval, not a hole',()=>{
 const m={...rectangle('h','穴あり',0,0,100,100),
  rings:[[[0,0],[100,0],[100,100],[0,100]],
   [[40,35],[60,35],[60,65],[40,65]]]};
 const p=M.point(m);
 assert.equal(context.window.KussoonLabelEngine.isInside(...p,m.rings),true);
 assert.ok(p[0]!==50,'hole centre must not be chosen');
});
test('fixed anchors remain stable on repeated builds and are inside territory',()=>{
 const ms=[rectangle('a','甲市',0,0,70,140),
  rectangle('b','乙市',70,0,140,140),
  rectangle('c','丙市',140,0,210,140)];
 const opt={fontSize:15,measure:(s,z)=>s.length*z};
 const a=M.build(ms,opt),b=M.build(ms,opt);
 assert.deepEqual(a.anchors,b.anchors);
 a.anchors.forEach((p,i)=>assert.equal(
  context.window.KussoonLabelEngine.isInside(...p,ms[i].rings),true));
});
test('zoom, pan and kana state never enter the fixed-layout input',()=>{
 const s=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 const point=s.indexOf('M.build(models');
 const load=s.indexOf('async function load(');
 const render=s.indexOf('function renderLabels()');
 assert.ok(point>load,'fixed layout is computed after new geometry arrives');
 assert.ok(point>render,'no call to build inside repeated label rendering');
 const functionBody=s.slice(render,s.indexOf('function suggest',render));
 assert.doesNotMatch(functionBody,/M\.build\(/);
 assert.match(s,/fixedCenters\.get\(m\.id\)/);
});
test('comparison page loads the centred module before density app',()=>{
 const s=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 assert.ok(s.indexOf('centered-labels.js')>0);
 assert.ok(s.indexOf('centered-labels.js')<s.indexOf('density-app.js'));
 assert.match(s,/<option value="center" selected>/);
});
