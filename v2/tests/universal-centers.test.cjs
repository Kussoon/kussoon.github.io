// Geometry-only V2 regression tests for crescent and real irregular districts.
// Run: node --test v2/tests/universal-centers.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..'),ctx={window:{},performance:{now:()=>0}};
for(const filename of ['label-engine.js','readable-labels.js']){
  vm.runInNewContext(fs.readFileSync(path.join(base,'common/js',filename),'utf8'),ctx,{filename});
}
const E=ctx.window.KussoonLabelEngine,R=ctx.window.KussoonReadableLabels;
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nishinomiya-irregular.json'),'utf8'));
const asModel=(name,rings)=>({name,rings,box:E.bbox(rings),centroid:E.centroid(rings),polylabel:E.polylabel(rings)});
const actual=fixture.examples.map(x=>asModel(x.name,x.rings));
function near(a,b,epsilon=1e-8){return Math.hypot(a[0]-b[0],a[1]-b[1])<epsilon;}
function crescent(){
  const outer=[],inner=[];
  for(let i=0;i<=50;i++){
    const a=(45+270*i/50)*Math.PI/180;
    outer.push([150+135*Math.cos(a),150+135*Math.sin(a)]);
  }
  for(let i=50;i>=0;i--){
    const a=(45+270*i/50)*Math.PI/180;
    inner.push([150+85*Math.cos(a),150+85*Math.sin(a)]);
  }
  return asModel('三日月形',[[...outer,...inner]]);
}
const U=asModel('U字形',[[[0,0],[40,0],[40,140],[150,140],[150,0],[190,0],[190,200],[0,200]]]);
const hook=asModel('鉤形',[[[0,0],[30,0],[30,170],[190,170],[190,200],[0,200]]]);
const kagoshima=asModel('鹿児島県風・多枝と離島',[
 [[50,10],[140,10],[190,50],[210,100],[185,140],[165,180],[190,250],[185,310],[160,365],[140,315],[125,225],[100,185],[50,200],[20,130],[25,55]],
 [[250,280],[275,280],[285,300],[266,320],[245,315]]
]);
const donut=asModel('穴あき町域',[
 [[0,0],[200,0],[200,200],[0,200]],
 [[70,70],[70,130],[130,130],[130,70]]
]);
const slenderMain=asModel('狭い本体と広い飛地',[
 [[0,0],[650,0],[650,10],[0,10]],
 [[700,40],[750,40],[750,90],[700,90]]
]);
const synthetic=[crescent(),U,hook,kagoshima,donut,slenderMain];

test('real Nishinomiya fixture contains Ikegaya and six named Nigawa subregions',()=>{
  assert.equal(fixture.examples.length,3);
  assert.equal(actual.find(x=>x.name==='一ケ谷町').rings.length,1);
  assert.equal(actual.find(x=>x.name==='仁川町').rings.length,6);
  assert.equal(actual.find(x=>x.name==='仁川町六丁目').rings.length,1);
});

test('every irregular example gets a reproducible interior anchor',()=>{
  for(const m of [...synthetic,...actual]){
    const a=R.universalInteriorAnchor(m,E),b=R.universalInteriorAnchor(m,E);
    assert.ok(E.isInside(...a,m.rings),m.name+' outside');
    assert.ok(E.signedDist(...a,m.rings)>0,m.name+' on boundary');
    assert.ok(near(a,b),m.name+' unstable');
    assert.ok(a.every(Number.isFinite));
  }
});

test('crescent, U-shape and hooked districts anchor close to their visual center',()=>{
  for(const m of [synthetic[0],U,hook,donut]){
    assert.equal(E.isInside(...m.centroid,m.rings),false,m.name+' must be genuinely concave');
    const old=R.safeInteriorCenter(m,E),selected=R.universalInteriorAnchor(m,E);
    const distance=p=>Math.hypot(p[0]-m.centroid[0],p[1]-m.centroid[1]);
    assert.ok(distance(selected)<=distance(old)+1e-7,m.name+' closer to centroid');
    assert.ok(E.signedDist(...selected,m.rings)>0);
  }
});

test('Kagoshima-like multipart outline anchors on main body, never a small offshore island',()=>{
  const m=kagoshima,p=R.universalInteriorAnchor(m,E);
  assert.ok(E.isInside(...p,[m.rings[0]]),'anchor should be on mainland');
  assert.ok(!E.isInside(...p,[m.rings[1]]),'anchor should not be on offshore island');
});

test('a larger but narrow mainland still wins against a smaller, round island',()=>{
  const m=slenderMain,p=R.universalInteriorAnchor(m,E);
  assert.ok(E.isInside(...p,[m.rings[0]]),'choose dominant component');
  assert.ok(E.signedDist(...p,m.rings)>0);
  assert.ok(!E.isInside(...p,[m.rings[1]]),'reject small island');
});

test('the named Nigawa chome grouping is placed on dominant sixth-chome polygon',()=>{
  const combined=actual.find(x=>x.name==='仁川町');
  const sixth=actual.find(x=>x.name==='仁川町六丁目');
  const p=R.universalInteriorAnchor(combined,E);
  assert.ok(E.isInside(...p,sixth.rings));
  const original=R.safeInteriorCenter(combined,E);
  const d=q=>Math.hypot(q[0]-combined.centroid[0],q[1]-combined.centroid[1]);
  assert.ok(d(p)<d(original)-10,'generic rule is substantially closer to center');
  assert.ok(E.signedDist(...p,combined.rings)>0);
});

test('real Ikegaya keeps its safe, natural center without manual override',()=>{
  const m=actual.find(x=>x.name==='一ケ谷町');
  assert.ok(near(R.universalInteriorAnchor(m,E),R.safeInteriorCenter(m,E)));
});

test('the old Ashiya safe mode stays identical, and optional mode keeps all names',()=>{
  const features=JSON.parse(fs.readFileSync(path.join(base,'data/ashiya/labels-source.json'),'utf8')).features;
  const readings=JSON.parse(fs.readFileSync(path.join(base,'data/ashiya/readings.json'),'utf8')).readings;
  const {models}=E.buildModels(features);
  const measure=(name,size)=>Array.from(name).length*size;
  const scale=E.screenPixelsToSvgUnits(18,1000,390);
  const old=R.planCenterFirstLabels(models,readings,'both',scale,measure,E,{anchor:'safe',shift:'adjacent'});
  const again=R.planCenterFirstLabels(models,readings,'both',scale,measure,E,{anchor:'safe',shift:'adjacent'});
  const universal=R.planCenterFirstLabels(models,readings,'both',scale,measure,E,{anchor:'universal',shift:'adjacent'});
  assert.equal(old.length,59);
  assert.equal(universal.length,59);
  for(let i=0;i<59;i++){
    assert.ok(near([old[i].x,old[i].y],[again[i].x,again[i].y]),models[i].name+' safe stable');
    assert.ok(E.isInside(universal[i].x,universal[i].y,models[i].rings),models[i].name+' universal outside');
  }
});

test('new anchors do not depend on display mode or current zoom',()=>{
  const src=actual.find(x=>x.name==='仁川町');
  const a=R.universalInteriorAnchor(src,E);
  for(const f of [12,16,18,22])for(const style of ['kanji','both','kana']){
    const label=R.planCenterFirstLabels([src],{仁川町:'にがわちょう'},style,f,
      (s,size)=>[...s].length*size,E,{anchor:'universal',shift:'none'})[0];
    assert.ok(near([label.x,label.y],a));
  }
});
