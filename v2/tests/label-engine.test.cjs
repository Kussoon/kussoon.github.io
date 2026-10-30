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
