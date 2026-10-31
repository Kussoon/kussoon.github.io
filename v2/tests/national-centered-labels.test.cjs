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
 assert.match(s,/<option value="conditional" selected>/);
 assert.match(s,/<option value="horizontal">/);
 assert.match(s,/<option value="vertical">/);
 assert.match(s,/<option value="multi">/);
 assert.match(s,/<option value="center">/);
});

test('multi-section anchor is inside an irregular administrative polygon',()=>{
 const m={...rectangle('irregular','変形市',0,0,140,200),
  rings:[[[0,0],[140,0],[140,55],[90,55],[90,200],
   [55,200],[55,55],[0,55]]],polylabel:[65,30]};
 const p=M.pointMulti(m);
 assert.equal(context.window.KussoonLabelEngine.isInside(...p,m.rings),true);
 assert.ok(p[1]>60&&p[1]<140,'prefer a central height over the wide northern lobe');
});
test('multi-section cross-section X follows the FINAL Y after correction',()=>{
 const m={...rectangle('stair','階段市',0,0,150,150),
  rings:[[[0,0],[60,0],[60,45],[150,45],
   [150,150],[55,150],[55,85],[0,85]]]};
 const y=110;
 const p=M.centerAtHeight(m,y,90);
 assert.ok(p);
 assert.equal(p[1],y);
 assert.equal(context.window.KussoonLabelEngine.isInside(...p,m.rings),true);
 const runs=M.horizontalRuns(m.rings,y);
 assert.ok(runs.some(([a,b])=>Math.abs(p[0]-(a+b)/2)<.00001));
});
test('multi-section build does not depend on zoom, viewport, or selection',()=>{
 const ms=[rectangle('one','第一市',0,0,60,180),
  rectangle('two','第二市',60,0,120,180)];
 const a=M.build(ms,{strategy:'multi',fontSize:12});
 const b=M.build(ms,{strategy:'multi',fontSize:12});
 assert.deepEqual(a.anchors,b.anchors);
 a.anchors.forEach((p,i)=>assert.ok(
  context.window.KussoonLabelEngine.isInside(...p,ms[i].rings)));
 const source=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 assert.match(source,/multiCenters=new Map\(models\.map/);
 assert.match(source,/strategy:'multi'/);
});
test('four-city comparison controls and script versions exist',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const js=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 for(const city of ['宝塚市','西宮市','神戸市','京都市']){
  assert.ok(html.includes('data-city="'+city+'"'));
 }
 assert.match(html,/centered-labels\.js\?v=20261101-conditional1/);
 assert.match(html,/density-app\.js\?v=20261101-conditional1/);
 assert.match(js,/city-shortcuts'\)\.addEventListener/);
});

test('horizontal centre keeps the midpoint even when the municipal neck is narrow',()=>{
 const m={...rectangle('neck','くびれ市',0,0,120,200),
  rings:[[[0,0],[120,0],[120,65],[68,65],[68,180],[60,180],
   [60,65],[0,65]]],polylabel:[45,32]};
 const p=M.pointHorizontal(m);
 assert.equal(p[1],100);
 assert.equal(p[0],64);
 assert.equal(context.window.KussoonLabelEngine.isInside(...p,m.rings),true);
});
test('vertical pass uses the segment at the chosen X, without shifting X',()=>{
 const m={...rectangle('lobe','変形市',0,0,130,200),
  rings:[[[0,0],[100,0],[100,60],[55,60],[55,170],[20,170],
   [20,60],[0,60]]],polylabel:[60,30]};
 const h=M.pointHorizontal(m);
 const v=M.pointHorizontalVertical(m);
 assert.equal(h[1],100);
 assert.equal(h[0],37.5);
 assert.equal(v[0],h[0]);
 assert.ok(v[1]!==h[1]);
 assert.equal(context.window.KussoonLabelEngine.isInside(...v,m.rings),true);
});
test('vertical intervals respect holes and include the original point',()=>{
 const m={...rectangle('hole','穴町',0,0,100,100),
  rings:[[[0,0],[100,0],[100,100],[0,100]],
   [[35,40],[65,40],[65,60],[35,60]]]};
 const h=M.pointHorizontal(m),v=M.pointHorizontalVertical(m);
 assert.equal(context.window.KussoonLabelEngine.isInside(...h,m.rings),true);
 assert.equal(context.window.KussoonLabelEngine.isInside(...v,m.rings),true);
 const runs=M.verticalRuns(m.rings,h[0]);
 assert.ok(runs.some(([a,b])=>a<=h[1]&&b>=h[1]));
});
test('new horizontal and vertical anchors are computed only at geometry load',()=>{
 const s=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 const render=s.slice(s.indexOf('function renderLabels()'),s.indexOf('function suggest',s.indexOf('function renderLabels()')));
 assert.doesNotMatch(render,/M\.pointHorizontal\(/);
 assert.doesNotMatch(render,/M\.pointHorizontalVertical\(/);
 assert.match(s,/horizontalCenters=new Map\(models\.map/);
 assert.match(s,/verticalCenters=new Map\(models\.map/);
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 for(const city of ['神河町','西脇市','三田市','加西市','加東市','小野市','三木市','加古川市'])
  assert.ok(html.includes('data-city="'+city+'"'));
});

test('new proposal 3 never moves a label for a narrow midpoint alone',()=>{
 const m={...rectangle('neck','縦長市',0,0,120,200),
  rings:[[[0,0],[120,0],[120,65],[68,65],[68,180],[60,180],
   [60,65],[0,65]]],polylabel:[45,32]};
 const result=M.conditionalVertical(m,{fontSize:10,measure:(x,z)=>x.length*z});
 assert.equal(result.adjusted,false);
 assert.deepEqual(Array.from(result.point),Array.from(M.pointHorizontal(m)));
});
test('new proposal 3 does not shift because of sideways overflow alone',()=>{
 const m=rectangle('stripe','細長市',0,0,12,200);
 const result=M.conditionalVertical(m,{fontSize:20,measure:(x,z)=>x.length*z});
 assert.equal(result.adjusted,false);
 assert.equal(result.reason,'acceptable-vertical-overflow');
});
test('new proposal 3 makes vertical correction only when it improves fit',()=>{
 const m={...rectangle('lobe','南北変形市',0,0,130,200),
  rings:[[[0,0],[100,0],[100,60],[55,60],[55,170],[20,170],
   [20,60],[0,60]]],polylabel:[60,30]};
 const first=M.conditionalVertical(m,{fontSize:44,measure:()=>25,threshold:.1,
  minImprovement:.03,maxShiftFraction:.25,maxWorsening:1});
 assert.equal(first.point[0],M.pointHorizontal(m)[0]);
 if(first.adjusted){
  assert.ok(first.beforeVertical-first.afterVertical>=.03);
  assert.ok(first.delta<=m.box.h*.25);
 }else{
  assert.deepEqual(Array.from(first.point),Array.from(M.pointHorizontal(m)));
 }
});
test('new proposal 3 is deterministic and keeps its point inside territory',()=>{
 const ms=[rectangle('x','甲市',0,0,65,180),
  rectangle('y','乙市',65,0,130,180)];
 for(const m of ms){
  const a=M.conditionalVertical(m,{fontSize:12});
  const b=M.conditionalVertical(m,{fontSize:12});
  assert.deepEqual(a,b);
  assert.equal(context.window.KussoonLabelEngine.isInside(...a.point,m.rings),true);
 }
});
test('new proposal 3 is cached at load and not recomputed on zoom',()=>{
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 const render=app.slice(app.indexOf('function renderLabels()'),
  app.indexOf('function suggest',app.indexOf('function renderLabels()')));
 assert.doesNotMatch(render,/M\.conditionalVertical\(/);
 assert.match(app,/conditionalCenters=new Map\(conditional\.map/);
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 assert.ok(html.includes('id="conditional-report"'));
 assert.ok(html.includes('value="conditional" selected'));
});

test('diagnostic overlay shows both exact cross-sections without moving anchors',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 assert.match(html,/id="diagnostic-city"/);
 assert.match(html,/id="diagnostic-overlay"/);
 assert.match(html,/id="diagnostic-output"/);
 assert.match(html,/density-app\.js\?v=20261101-diagnostic1/);
 assert.match(app,/function renderDiagnostic\(\)/);
 assert.match(app,/M\.horizontalRuns\(model\.rings,h\[1\]\)/);
 assert.match(app,/M\.verticalRuns\(model\.rings,h\[0\]\)/);
 assert.match(app,/tag\('circle'/);
 assert.match(app,/class:'label-diagnostic'/);
 // Visualization must read stable anchors; it must not compute a new one.
 const diagnostics=app.slice(app.indexOf('function renderDiagnostic(){'),
  app.indexOf('function renderLabels(){'));
 assert.doesNotMatch(diagnostics,/M\.pointHorizontal(?:Vertical)?\(/);
 assert.doesNotMatch(diagnostics,/M\.conditionalVertical\(/);
 assert.match(diagnostics,/horizontalCenters\.get\(model\.id\)/);
 assert.match(diagnostics,/verticalCenters\.get\(model\.id\)/);
});
test('anchor displacement compares only two points on one fixed X',()=>{
 const m={...rectangle('stair','段差市',0,0,130,200),
  rings:[[[0,0],[110,0],[110,65],[70,65],[70,200],
   [40,200],[40,65],[0,65]]]};
 const first=M.pointHorizontal(m),second=M.pointHorizontalVertical(m);
 assert.equal(first[0],second[0]);
 assert.ok(first.every(Number.isFinite)&&second.every(Number.isFinite));
 const vertical=M.verticalRuns(m.rings,first[0]).find(([a,b])=>
  a<=first[1]&&b>=first[1]);
 assert.ok(vertical);
 assert.ok(second[1]>=vertical[0]&&second[1]<=vertical[1]);
});
