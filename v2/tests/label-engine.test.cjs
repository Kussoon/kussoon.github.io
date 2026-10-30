// Run from repository root: node --test v2/tests/label-engine.test.cjs
// Uses only Node's built-in modules. Not loaded by production or V2 pages.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'common/js/label-engine.js'),'utf8');
const raw=JSON.parse(fs.readFileSync(path.join(root,'data/ashiya/labels-source.json'),'utf8'));
const context={window:{},performance:{now:()=>Date.now()}};
vm.runInNewContext(script,context,{filename:'label-engine.js'});
const E=context.window.KussoonLabelEngine;

test('source covers 59 town names and precisely 60 SVG polygon rings',()=>{
  assert.equal(raw.features.length,59);
  assert.equal(new Set(raw.features.map(f=>f.name)).size,59);
  assert.ok(raw.features.every(f=>Array.isArray(f.manual)&&f.manual.every(Number.isFinite)));
  const polygons=raw.features.map(f=>({name:f.name,rings:E.parsePath(f.d)}));
  assert.equal(polygons.reduce((n,f)=>n+f.rings.length,0),60);
  assert.equal(polygons.filter(f=>f.rings.length===2).length,1);
  assert.equal(polygons.find(f=>f.rings.length===2).name,'南浜町');
});

test('automatic candidates stay inside their respective named regions',()=>{
  const {models}=E.buildModels(raw.features);
  for(const m of models){
    assert.ok(E.isInside(...m.polylabel,m.rings),'polylabel is outside: '+m.name);
    assert.ok(E.isInside(...m.manual,m.rings),'manual anchor is outside: '+m.name);
    assert.ok(Number.isFinite(m.polylabel[0])&&Number.isFinite(m.polylabel[1]));
  }
});

test('baseline overlap avoidance does not regress approximate metrics at tested font sizes',()=>{
  const {models}=E.buildModels(raw.features);
  for(const size of [7,10,14]){
    const widths=models.map(m=>m.name.length*size);
    const manual=E.choosePositions(models,widths,size,'manual');
    const auto=E.choosePositions(models,widths,size,'avoid');
    const base=E.evaluate(models,manual,widths,size);
    const next=E.evaluate(models,auto,widths,size);
    assert.equal(base.count,59);
    assert.equal(next.count,59);
    assert.equal(next.centerOutside,0);
    assert.ok(next.collisions<=base.collisions,'overlap regression, font size '+size);
    assert.ok(next.wholeOutside<=base.wholeOutside,'outside regression, font size '+size);
  }
});

test('automatic placement is deterministic for identical data and settings',()=>{
  const {models}=E.buildModels(raw.features);
  const widths=models.map(m=>m.name.length*10);
  const a=E.choosePositions(models,widths,10,'avoid');
  const b=E.choosePositions(models,widths,10,'avoid');
  assert.deepEqual(JSON.stringify(a),JSON.stringify(b));
});

test('zoom-responsive labels grow more slowly than the map geometry',()=>{
  const base=14;
  const two=E.zoomFontSize(base,2,0.4);
  const four=E.zoomFontSize(base,4,0.4);
  assert.ok(two<base && four<two);
  assert.ok(Math.abs((two*2/base)-Math.pow(2,0.4))<1e-10);
  assert.ok(Math.abs((four*4/base)-Math.pow(4,0.4))<1e-10);
});

test('viewport metrics change when panning, whole-map metrics do not',()=>{
  const {models}=E.buildModels(raw.features);
  const base=14, widths=models.map(m=>m.name.length*base);
  const positions=E.choosePositions(models,widths,base,'avoid');
  const whole=E.evaluate(models,positions,widths,base);
  const full=E.evaluateView(models,positions,widths,base,{x:0,y:0,w:1000,h:1581});
  const south=E.evaluateView(models,positions,widths,base,{x:400,y:950,w:400,h:400});
  assert.equal(whole.count,59);
  assert.equal(full.count,59);
  assert.ok(south.count>0 && south.count<59);
  assert.equal(south.total,59);
  assert.ok(south.collisions<=whole.collisions);
  assert.ok(south.wholeOutside<=whole.wholeOutside);
});

test('pixel-based font stays the same apparent size across zoom levels and devices',()=>{
  for(const width of [320,390,780]){
    for(const z of [1,2,5,10]){
      const units=E.screenPixelsToSvgUnits(16,1000/z,width);
      assert.ok(Math.abs(units/(1000/z)*width-16)<1e-10);
    }
  }
  assert.throws(()=>E.screenPixelsToSvgUnits(16,1000,0));
});

test('collision-aware visibility is deterministic and all regions remain in source',()=>{
  const {models}=E.buildModels(raw.features);
  const size=E.screenPixelsToSvgUnits(16,1000,360);
  const widths=models.map(m=>m.name.length*size);
  const positions=E.choosePositions(models,widths,size,'avoid');
  const view={x:0,y:0,w:1000,h:1581};
  const selected=E.selectVisibleLabels(models,positions,widths,size,view);
  const again=E.selectVisibleLabels(models,positions,widths,size,view);
  assert.equal(selected.length,59);
  assert.equal(JSON.stringify(selected),JSON.stringify(again));
  const indices=selected.flatMap((x,i)=>x?[i]:[]);
  assert.ok(indices.length>0&&indices.length<59);
  const score=E.subsetMetrics(models,positions,widths,size,indices);
  assert.equal(score.collisions,0);
  assert.equal(score.count,indices.length);
});

test('searched or tapped town remains visible even under label collisions',()=>{
  const {models}=E.buildModels(raw.features);
  const w=1000,px=16,size=E.screenPixelsToSvgUnits(px,w,360);
  const widths=models.map(m=>m.name.length*size);
  const positions=E.choosePositions(models,widths,size,'avoid');
  const view={x:0,y:0,w:1000,h:1581};
  const baseline=E.selectVisibleLabels(models,positions,widths,size,view);
  const hidden=baseline.findIndex(show=>!show);
  assert.ok(hidden>=0);
  const pinned=E.selectVisibleLabels(models,positions,widths,size,view,hidden);
  assert.ok(pinned[hidden]);
  const active=pinned.flatMap((x,i)=>x?[i]:[]);
  assert.equal(E.subsetMetrics(models,positions,widths,size,active).collisions,0);
});
