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

test('priority strategies keep a collision-free set at representative device widths',()=>{
  const {models}=E.buildModels(raw.features);
  for(const screenWidth of [320,390,700]){
    const fontSize=E.screenPixelsToSvgUnits(16,1000,screenWidth);
    const widths=models.map(m=>m.name.length*fontSize);
    const positions=E.choosePositions(models,widths,fontSize,'avoid');
    const view={x:0,y:0,w:1000,h:1581};
    const scores={};
    for(const strategy of ['area','balanced','density']){
      const result=E.selectPriorityLabels(models,positions,widths,fontSize,view,{strategy});
      assert.equal(result.shown.length,59);
      assert.equal(result.eligible.length,59);
      const visible=result.shown.flatMap((shown,i)=>shown?[i]:[]);
      const metrics=E.subsetMetrics(models,positions,widths,fontSize,visible);
      assert.equal(metrics.collisions,0,screenWidth+'px / '+strategy);
      assert.equal(result.hiddenByCollision,result.eligible.filter((e,i)=>e&&!result.shown[i]).length);
      scores[strategy]=visible.length;
    }
    assert.ok(scores.density>=scores.area,'density should be no worse than area baseline at '+screenWidth+'px');
  }
});

test('priority layout keeps selected hidden town visible and collision free',()=>{
  const {models}=E.buildModels(raw.features);
  const size=E.screenPixelsToSvgUnits(16,1000,390);
  const widths=models.map(m=>m.name.length*size);
  const positions=E.choosePositions(models,widths,size,'avoid');
  const view={x:0,y:0,w:1000,h:1581};
  for(const strategy of ['balanced','density','area']){
    const baseline=E.selectPriorityLabels(models,positions,widths,size,view,{strategy});
    const hidden=baseline.shown.findIndex(x=>!x);
    assert.ok(hidden>=0);
    const selected=E.selectPriorityLabels(models,positions,widths,size,view,{strategy,pinned:hidden});
    assert.ok(selected.shown[hidden],strategy+' must pin the selected town');
    const indices=selected.shown.flatMap((s,i)=>s?[i]:[]);
    assert.equal(E.subsetMetrics(models,positions,widths,size,indices).collisions,0);
  }
});

test('previously visible labels favour stable results without creating overlap',()=>{
  const {models}=E.buildModels(raw.features);
  const size=E.screenPixelsToSvgUnits(16,1000,390);
  const widths=models.map(m=>m.name.length*size);
  const positions=E.choosePositions(models,widths,size,'avoid');
  const view={x:0,y:0,w:1000,h:1581};
  const first=E.selectPriorityLabels(models,positions,widths,size,view,{strategy:'balanced'});
  const next=E.selectPriorityLabels(models,positions,widths,size,view,{strategy:'balanced',previous:first.shown});
  const again=E.selectPriorityLabels(models,positions,widths,size,view,{strategy:'balanced',previous:first.shown});
  assert.equal(JSON.stringify(next.shown),JSON.stringify(again.shown));
  const ids=next.shown.flatMap((s,i)=>s?[i]:[]);
  assert.equal(E.subsetMetrics(models,positions,widths,size,ids).collisions,0);
});

test('out-of-view labels do not count as labels hidden by collisions',()=>{
  const {models}=E.buildModels(raw.features);
  const size=E.screenPixelsToSvgUnits(16,1000,360);
  const widths=models.map(m=>m.name.length*size);
  const positions=E.choosePositions(models,widths,size,'avoid');
  const view={x:0,y:0,w:120,h:180};
  const layout=E.selectPriorityLabels(models,positions,widths,size,view,{strategy:'balanced'});
  assert.equal(layout.hiddenByCollision,layout.eligible.filter((e,i)=>e&&!layout.shown[i]).length);
  assert.ok(layout.eligible.filter(Boolean).length<59);
});

test('adaptive two-line variants retain every original character',()=>{
  for(const name of ['東芦屋町','打出小槌町','六麓荘町']){
    const variants=E.lineVariants(name,true);
    assert.equal(variants[0].join(''),name);
    assert.ok(variants.length>=2);
    for(const v of variants){
      assert.ok(v.length<=2);
      assert.equal(v.join(''),name);
    }
  }
  assert.ok(!E.lineVariants('東芦屋町',true).some(v=>v.join('/')==='東芦/屋町'));
  assert.ok(E.lineVariants('打出小槌町',true).some(v=>v.join('/')==='打出/小槌町'));
  assert.ok(E.lineVariants('六麓荘町',true).some(v=>v.join('/')==='六麓荘/町'));
});

test('adaptive layouts improve fit where possible without altering town shapes',()=>{
  const {models}=E.buildModels(raw.features);
  const size=E.screenPixelsToSvgUnits(16,1000,700);
  const measure=(name,font)=>Array.from(name).length*font;
  const widths=models.map(m=>measure(m.name,size));
  const seed=E.choosePositions(models,widths,size,'avoid');
  const base=E.planAdaptiveLabels(models,seed,size,measure,{wrap:false,shrink:false});
  const adapt=E.planAdaptiveLabels(models,seed,size,measure,{wrap:true,shrink:true});
  assert.equal(adapt.length,59);
  assert.ok(adapt.some(l=>l.wrapped));
  for(let i=0;i<59;i++){
    assert.equal(adapt[i].lines.join(''),models[i].name);
    assert.ok(adapt[i].lines.length<=2);
    assert.ok(adapt[i].fontSize>=size*.875-1e-8);
    assert.ok(adapt[i].fontSize<=size+1e-8);
    assert.ok(E.isInside(adapt[i].x,adapt[i].y,models[i].rings));
    assert.ok(adapt[i].insidePoints>=base[i].insidePoints,
      'adaptive fit cannot worsen measured 9-point shape fit: '+models[i].name);
  }
  for(const name of ['東芦屋町','六麓荘町']){
    const i=models.findIndex(m=>m.name===name);
    assert.ok(adapt[i].insidePoints>base[i].insidePoints,name+' should benefit');
  }
});

test('adaptive variable-height collision boxes preserve selection and collision freedom',()=>{
  const {models}=E.buildModels(raw.features);
  const measure=(name,size)=>Array.from(name).length*size;
  for(const width of [320,390,700]){
    const size=E.screenPixelsToSvgUnits(16,1000,width);
    const seed=E.choosePositions(models,models.map(m=>measure(m.name,size)),size,'avoid');
    const layouts=E.planAdaptiveLabels(models,seed,size,measure,{wrap:true,shrink:true});
    const positions=layouts.map(l=>[l.x,l.y]),sizes=layouts.map(l=>l.width);
    for(const strategy of ['area','balanced','density']){
      const out=E.selectPriorityLabels(models,positions,sizes,size,{x:0,y:0,w:1000,h:1581},
        {strategy,boxes:layouts.map(l=>l.box)});
      const indices=out.shown.flatMap((shown,i)=>shown?[i]:[]);
      assert.equal(E.evaluateLabelLayouts(models,layouts,indices).collisions,0);
      const hidden=out.shown.findIndex(s=>!s);
      if(hidden>=0){
        const forced=E.selectPriorityLabels(models,positions,sizes,size,{x:0,y:0,w:1000,h:1581},
          {strategy,boxes:layouts.map(l=>l.box),pinned:hidden});
        assert.ok(forced.shown[hidden]);
        const shown=forced.shown.flatMap((s,i)=>s?[i]:[]);
        assert.equal(E.evaluateLabelLayouts(models,layouts,shown).collisions,0);
      }
    }
  }
});
