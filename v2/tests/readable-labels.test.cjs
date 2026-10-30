// Run from repository root: node --test v2/tests/readable-labels.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{},performance:{now:()=>Date.now()}};
for(const file of ['label-engine.js','readable-labels.js']){
  vm.runInNewContext(fs.readFileSync(path.join(root,'common/js',file),'utf8'),
    context,{filename:file});
}
const E=context.window.KussoonLabelEngine;
const R=context.window.KussoonReadableLabels;
const shapes=JSON.parse(fs.readFileSync(path.join(root,'data/ashiya/labels-source.json'),'utf8'));
const readingsData=JSON.parse(fs.readFileSync(path.join(root,'data/ashiya/readings.json'),'utf8'));
const {models}=E.buildModels(shapes.features);
const readings=readingsData.readings;
const measure=(s,size)=>Array.from(s).length*size;
const bounds={x:0,y:0,w:1000,h:1581};

test('readings cover all 59 towns exactly, with 60 geographic rings',()=>{
  assert.equal(models.length,59);
  assert.equal(models.reduce((s,m)=>s+m.rings.length,0),60);
  assert.equal(Object.keys(readings).length,59);
  assert.equal(R.validateReadings(models,readings),true);
  assert.equal(readings['大桝町'],'おおますちょう');
  assert.equal(readings['業平町'],'なりひらちょう');
  assert.equal(readings['剱谷'],'けんたに');
  assert.equal(readings['打出小槌町'],'うちでこづちちょう');
});

test('incomplete, unexpected or invalid readings fail closed',()=>{
  const short={...readings};
  delete short['大桝町'];
  assert.throws(()=>R.validateReadings(models,short));
  const bad={...readings,['大桝町']:'オオマスチョウ'};
  assert.throws(()=>R.validateReadings(models,bad));
  const extra={...readings, ['存在しない町']:'そんざいしないまち'};
  assert.throws(()=>R.validateReadings(models,extra));
});

test('search normalization supports katakana and mixed width',()=>{
  assert.equal(R.normalizeReading(' ナリヒラチョウ '),'なりひらちょう');
  assert.equal(R.normalizeReading('なりひらちょう'),'なりひらちょう');
  assert.equal(R.normalizeReading('　業平町　'),'業平町');
});

test('all three label styles preserve town identity and show ruby on its own line',()=>{
  const font=14;
  const a=R.labelSpec('業平町','なりひらちょう','kanji',font,measure);
  const b=R.labelSpec('業平町','なりひらちょう','both',font,measure);
  const c=R.labelSpec('業平町','なりひらちょう','kana',font,measure);
  assert.equal(a.primary,'業平町');
  assert.equal(b.primary,'業平町');
  assert.equal(c.primary,'なりひらちょう');
  assert.equal(b.height>a.height,true);
  assert.equal(b.rubySize,font*.58);
  assert.ok(c.width>a.width);
  assert.throws(()=>R.labelSpec('業平町','', 'kanji',font,measure));
});

test('vertical nudges keep the names on one line and do not shift horizontally',()=>{
  for(const width of [320,390,700]){
    const font=E.screenPixelsToSvgUnits(16,1000,width);
    for(const style of ['kanji','both','kana']){
      const ws=models.map(m=>R.labelSpec(m.name,readings[m.name],style,font,measure).width);
      const seed=E.choosePositions(models,ws,font,'avoid');
      const fixed=R.planVerticalNudges(models,seed,readings,style,font,measure,E,{shift:'none'});
      const moved=R.planVerticalNudges(models,seed,readings,style,font,measure,E,{shift:'vertical'});
      for(let i=0;i<models.length;i++){
        assert.equal(fixed[i].x,seed[i][0]);
        assert.equal(fixed[i].y,seed[i][1]);
        assert.equal(moved[i].x,seed[i][0]);
        assert.ok(Math.abs(moved[i].y-seed[i][1])<=1.5*font+1e-8);
        assert.ok(E.isInside(moved[i].x,moved[i].y,models[i].rings));
        assert.equal(moved[i].name,models[i].name);
        assert.equal(moved[i].reading,readings[models[i].name]);
      }
    }
  }
});

test('priority selection uses multiline ruby bounds and keeps touched town visible',()=>{
  for(const width of [320,390,700]){
    const size=E.screenPixelsToSvgUnits(16,1000,width);
    for(const style of ['kanji','both','kana']){
      const ws=models.map(m=>R.labelSpec(m.name,readings[m.name],style,size,measure).width);
      const seeds=E.choosePositions(models,ws,size,'avoid');
      const layouts=R.planVerticalNudges(models,seeds,readings,style,size,measure,E,{shift:'vertical'});
      const pos=layouts.map(l=>[l.x,l.y]);
      const opts={strategy:'balanced',boxes:layouts.map(l=>l.box)};
      const shown=E.selectPriorityLabels(models,pos,layouts.map(l=>l.width),size,bounds,opts);
      const metrics=R.evaluateVisible(models,layouts,shown.shown,E,bounds);
      assert.equal(metrics.collisions,0,style);
      assert.equal(metrics.total,59);
      const hidden=shown.shown.findIndex(x=>!x);
      if(hidden!==-1){
        const force=E.selectPriorityLabels(models,pos,layouts.map(l=>l.width),size,bounds,
          {...opts,pinned:hidden});
        assert.equal(force.shown[hidden],true);
        assert.equal(R.evaluateVisible(models,layouts,force.shown,E,bounds).collisions,0);
      }
    }
  }
});

test('text-box pixel conversion is independent of map zoom',()=>{
  for(const width of [320,390,700])for(const zoom of [1,2,5,10]){
    const size=E.screenPixelsToSvgUnits(16,1000/zoom,width);
    assert.ok(Math.abs(size*width/(1000/zoom)-16)<1e-9);
  }
});
