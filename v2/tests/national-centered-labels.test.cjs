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
 assert.match(s,/<option value="proposal5" selected>/);
 assert.match(s,/<option value="horizontal">/);
 assert.match(s,/<option value="conditional">/);
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
 assert.match(html,/centered-labels\.js\?v=20261101-proposal5a/);
 assert.match(html,/density-app\.js\?v=20261101-compactward1/);
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
 assert.ok(html.includes('value="proposal5" selected'));
});

test('diagnostic overlay shows both exact cross-sections without moving anchors',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 assert.match(html,/id="diagnostic-city"/);
 assert.match(html,/id="diagnostic-overlay"/);
 assert.match(html,/id="diagnostic-output"/);
 assert.match(html,/id="diagnostic-ranking"/);
 assert.match(html,/density-app\.js\?v=20261101-proposal5a/);
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

test('multiple horizontal intervals: take WESTMOST and EASTMOST edges, not a selected segment',()=>{
 const m={...rectangle('disconnected','複合市',0,0,100,100),
  rings:[[[0,0],[8,0],[8,100],[0,100]],
   [[9,0],[90,0],[90,100],[9,100]]]};
 const p=M.pointHorizontal(m);
 assert.deepEqual(Array.from(p),[45,50]);
 assert.equal(context.window.KussoonLabelEngine.isInside(...p,m.rings),true);
});
test('if full-extent midpoint is in a gap, keep Y and use closest interior X',()=>{
 const m={...rectangle('islands','飛地市',0,0,100,100),
  rings:[[[0,0],[20,0],[20,100],[0,100]],
   [[80,0],[100,0],[100,100],[80,100]]]};
 const p=M.pointHorizontal(m);
 assert.equal(p[1],50);
 assert.equal(context.window.KussoonLabelEngine.isInside(...p,m.rings),true);
 assert.ok(Math.abs(p[0]-20)<.01||Math.abs(p[0]-80)<.01);
});
test('keep the same full horizontal midpoint in proposal 2 and 3',()=>{
 const m={...rectangle('two','二区域',0,0,100,100),
  rings:[[[0,0],[8,0],[8,100],[0,100]],
   [[9,0],[90,0],[90,100],[9,100]]]};
 const h=M.pointHorizontal(m),v=M.pointHorizontalVertical(m),
  c=M.conditionalVertical(m,{fontSize:10}).point;
 assert.equal(h[0],45);
 assert.equal(v[0],h[0]);
 assert.equal(c[0],h[0]);
});

test('proposal 4 does not move inside horizontal midpoint, even in a thin neck',()=>{
 const m={...rectangle('neck','細首市',0,0,100,100),
  rings:[[[0,0],[100,0],[100,25],[51,25],[51,100],[49,100],[49,25],[0,25]]]};
 const r=M.proposal4(m);
 assert.equal(r.reason,'horizontal-inside');
 assert.equal(r.point[1],50);
 assert.equal(r.point[0],50);
});
test('proposal 4 lifts the gap midpoint vertically in a U-shaped area',()=>{
 const m={...rectangle('u','U字町',0,0,100,100),
  rings:[[[0,0],[100,0],[100,100],[70,100],[70,30],
   [30,30],[30,100],[0,100]]]};
 const r=M.proposal4(m);
 assert.equal(r.raw[0],50);
 assert.equal(r.raw[1],50);
 assert.equal(r.point[0],50);
 assert.equal(r.reason,'vertical-midpoint');
 assert.equal(r.point[1],15);
 assert.equal(context.window.KussoonLabelEngine.isInside(...r.point,m.rings),true);
});
test('proposal 4 handles disjoint islands with no vertical intersection',()=>{
 const m={...rectangle('islands','離島町',0,0,100,100),
  rings:[[[0,0],[20,0],[20,100],[0,100]],
   [[80,0],[100,0],[100,100],[80,100]]]};
 const r=M.proposal4(m);
 assert.equal(r.reason,'no-vertical-intersection');
 assert.equal(r.raw[0],50);
 assert.equal(r.point[1],50);
 assert.equal(context.window.KussoonLabelEngine.isInside(...r.point,m.rings),true);
});
test('proposal 4 picks a valid vertical interval when its full midpoint is a gap',()=>{
 const m={...rectangle('vertical gap','上下分離町',0,0,100,100),
  rings:[[[0,0],[100,0],[100,20],[0,20]],
   [[0,80],[100,80],[100,100],[0,100]]]};
 // The midpoint horizontal scanline does not cross either polygon,
 // so the nearest available height may be chosen as a rare exception.
 const r=M.proposal4(m);
 assert.equal(context.window.KussoonLabelEngine.isInside(...r.point,m.rings),true);
});
test('proposal 4 remains a precomputed map and horizontal marker shows full width',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 assert.match(html,/value="proposal5" selected/);
 assert.match(html,/id="proposal4-report"/);
 assert.match(app,/proposal4Centers=new Map/);
 assert.match(app,/proposal4Results=new Map/);
 assert.match(app,/Math\.min\(\.\.\.allHorizontal\.map/);
 assert.match(app,/Math\.max\(\.\.\.allHorizontal\.map/);
 const diagnostic=app.slice(app.indexOf('function renderDiagnostic(){'),
   app.indexOf('function renderLabels(){'));
 assert.doesNotMatch(diagnostic,/M\.proposal4\(/);
});

test('proposal5 selects the longest interval instead of joined outer extent',()=>{
 const m={...rectangle('two','二区域',0,0,100,100),
  rings:[[[0,0],[20,0],[20,100],[0,100]],
   [[30,0],[100,0],[100,100],[30,100]]]};
 const r=M.proposal5(m);
 assert.equal(r.reason,'longest-segment');
 assert.equal(r.segments.length,2);
 assert.deepEqual(Array.from(r.point),[65,50]);
 assert.equal(context.window.KussoonLabelEngine.isInside(...r.point,m.rings),true);
});
test('proposal5 uses the sole segment midpoint and stays at middle height',()=>{
 const m=rectangle('plain','普通市',0,0,100,100);
 const r=M.proposal5(m);
 assert.deepEqual(Array.from(r.point),[50,50]);
 assert.equal(r.segments.length,1);
});
test('proposal5 is deterministic with equal length segments',()=>{
 const m={...rectangle('equal','等幅市',0,0,100,100),
  rings:[[[0,0],[20,0],[20,100],[0,100]],
   [[80,0],[100,0],[100,100],[80,100]]]};
 const a=M.proposal5(m),b=M.proposal5(m);
 assert.deepEqual(a,b);
 assert.deepEqual(Array.from(a.point),[10,50]);
});
test('proposal5 can use nearby height only when middle has no intersection',()=>{
 const m={...rectangle('gaps','離島市',0,0,100,100),
  rings:[[[0,0],[100,0],[100,20],[0,20]],
   [[0,80],[100,80],[100,100],[0,100]]]};
 const r=M.proposal5(m);
 assert.equal(context.window.KussoonLabelEngine.isInside(...r.point,m.rings),true);
 assert.notEqual(r.point[1],50);
});
test('proposal5 uses cached anchors and displays selected longest interval',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 assert.ok(html.includes('value="proposal5" selected'));
 assert.ok(html.includes('data-city="朝来市"'));
 assert.ok(html.includes('id="proposal5-report"'));
 assert.match(app,/proposal5Centers=new Map/);
 assert.match(app,/class:'diag-longest'/);
 const render=app.slice(app.indexOf('function renderLabels()'),
  app.indexOf('function suggest',app.indexOf('function renderLabels()')));
 assert.doesNotMatch(render,/M\.proposal5\(/);
});

test('office pilot records use verified five digit codes and explicit source links',()=>{
 const json=JSON.parse(fs.readFileSync(path.resolve(__dirname,
  '../data/national/municipality-offices-pilot.json'),'utf8'));
 const records=json.offices;
 assert.equal(Object.keys(records).length,4);
 for(const code of ['28204','28214','28215','28446']){
  assert.equal(code.length,5);
  const entry=records[code];
  assert.ok(entry.name&&entry.office&&entry.address);
  assert.ok(entry.official.startsWith('https://'));
  assert.ok(entry.wikipedia.startsWith('https://'));
  assert.ok(entry.source.startsWith('https://'));
 }
 assert.ok(records['28204'].address.includes('六湛寺町10-3'));
 assert.ok(records['28446'].address.includes('寺前64番地'));
});
test('office overlay has separate selection, safe links, and unverified fallback',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 for(const id of ['municipal-popup','popup-name','popup-close',
  'popup-office','popup-address','popup-actions','popup-note'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('density-app.js?v=20261101-compactward1'));
 for(const title of ['公式サイト','Wikipedia','ここへ行く'])
  assert.ok(app.includes(title));
 for(const code of ['renderOfficePopup(model)','renderOfficePopup(chosen)',
  "popup-close').addEventListener", 'municipality-offices-pilot.json',
  'aria-disabled', 'encodeURIComponent(data.office', 'toggleMunicipality(id)'])
  assert.ok(app.includes(code),code);
 assert.ok(html.includes('.municipal-popup[hidden]'));
});

test('popup close preserves selection and repeated tap toggles selection',()=>{
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const closeStart=app.indexOf("popup-close').addEventListener");
 const closeEnd=app.indexOf("search').addEventListener",closeStart);
 const close=app.slice(closeStart,closeEnd);
 assert.ok(close.includes('popupDismissed=true'));
 assert.ok(close.includes('municipal-popup'));
 assert.ok(close.includes('hidden=true'));
 assert.ok(!close.includes('select(null)'));
 const begin=app.indexOf('function select(sel,scroll=false){');
 const end=app.indexOf('function toggleMunicipality(id){');
 const selection=app.slice(begin,end);
 assert.ok(selection.includes('popupDismissed=false'));
 assert.ok(selection.includes('selection=sel;highlight()'));
 assert.ok(app.includes("selection.id===id?null:{type:'model',id}"));
 assert.ok(app.includes("state.mode==='plate'||popupDismissed"));
 assert.ok(html.includes('×印は吹き出しだけを閉じ、選択色は残します'));
});

test('map toolbar sits at the lower-right and ruby starts enabled',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 assert.ok(html.includes('.map-toolbar{position:absolute;right:12px;bottom:12px;'));
 assert.ok(html.includes('.map-toolbar{right:8px;bottom:8px}'));
 assert.ok(!html.includes('.map-toolbar{position:absolute;right:12px;top:12px;'));
 assert.ok(html.includes('<option value="on" selected>漢字＋よみがな</option>'));
 assert.ok(html.includes('id="reading-toggle" aria-label="読み仮名の表示を切り替え" aria-pressed="true">よみがな ON'));
 assert.ok(html.includes('max-height:calc(100% - 207px)'));
 assert.ok(app.includes("'reading-toggle').addEventListener('click'"));
 assert.ok(app.includes("reading').value==='on'?'off':'on'"));
 assert.ok(app.includes("syncReadingButton();renderLabels()"));
});

test('popup comparison pages share geography and test two distinct responsive layouts',()=>{
 const a=fs.readFileSync(path.resolve(__dirname,'../national/density-popup-a.html'),'utf8');
 const b=fs.readFileSync(path.resolve(__dirname,'../national/density-popup-b.html'),'utf8');
 const current=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 for(const page of [a,b]){
  assert.ok(page.includes('density-app.js?v=20261101-zipcode-b2'));
  assert.ok(page.includes('centered-labels.js?v=20261101-proposal5a'));
  assert.ok(page.includes('value="proposal5" selected'));
  assert.ok(page.includes('id="municipal-popup"'));
  assert.ok(page.includes('id="map"'));
  assert.ok(page.includes('density-popup-a.html'));
  assert.ok(page.includes('density-popup-b.html'));
  assert.ok(page.includes('aria-label="吹き出しだけを閉じる"'));
 }
 assert.ok(a.includes('.popup-actions{display:flex;flex-direction:column'));
 assert.ok(a.includes('left:8px;bottom:8px;right:auto'));
 assert.ok(b.includes('.popup-actions{display:grid;grid-template-columns:repeat(3'));
 assert.ok(b.includes('right:120px;bottom:8px;width:calc(100% - 128px)'));
 assert.ok(b.includes('.map-toolbar{right:8px;bottom:8px;width:104px}'));
 assert.ok(!current.includes('吹き出しの配置を比較'));
});

test('B popup becomes the default layout; zip codes render above addresses',()=>{
 const current=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const a=fs.readFileSync(path.resolve(__dirname,'../national/density-popup-a.html'),'utf8');
 const b=fs.readFileSync(path.resolve(__dirname,'../national/density-popup-b.html'),'utf8');
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 const records=JSON.parse(fs.readFileSync(path.resolve(__dirname,
  '../data/national/municipality-offices-pilot.json'),'utf8')).offices;
 for(const [code,post] of Object.entries({'28204':'662-8567',
  '28214':'665-8665','28215':'673-0492','28446':'679-3116'})){
  assert.equal(records[code].postalCode,post);
  assert.ok(records[code].source.startsWith('https://'));
 }
 for(const page of [current,a,b]){
  assert.ok(page.includes('density-app.js?v=20261101-'+(page===current?'compactward1':'zipcode-b2')));
  assert.ok(page.includes('white-space:pre-line'));
 }
 assert.ok(current.includes('right:104px;bottom:8px;width:calc(100% - 112px)'));
 assert.ok(current.includes('.map-toolbar{width:96px}'));
 assert.ok(current.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert.ok(app.includes("data.postalCode?'〒'+data.postalCode"));
 assert.ok(app.includes("+'\\n':'')+data.address"));
});

test('default ward display, narrow right control, and non-purple selection',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../national/density.html'),'utf8');
 const app=fs.readFileSync(path.resolve(__dirname,'../national/density-app.js'),'utf8');
 assert.ok(html.includes('<option value="ward" selected>市区町村名（政令市の区も表示）</option>'));
 assert.ok(html.includes('<option value="on" selected>漢字＋よみがな</option>'));
 assert.ok(html.includes('--selected:#ffc36e'));
 assert.ok(html.includes('.map-toolbar{width:96px}'));
 assert.ok(html.includes('.map-toolbar{right:8px;bottom:8px;width:88px}'));
 assert.ok(html.includes('right:104px;bottom:8px;width:calc(100% - 112px)'));
 assert.ok(app.includes("let state={area:'kansai',mode:'ward'}"));
 assert.ok(app.includes("'plate':'ward';refresh()"));
 assert.ok(app.includes("if(area!=='fuji'&&$('mode').value==='plate')$('mode').value='ward'"));
 assert.ok(app.includes("m.name===name||m.major===name"));
 assert.ok(app.includes("const b={minX:Math.min(...parts.map(m=>m.box.minX))"));
 assert.ok(html.includes('density-app.js?v=20261101-compactward1'));
});
