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

test('center-first full-display labels stay on the geographic centroid',()=>{
  const size=E.screenPixelsToSvgUnits(18,1000,390);
  const layouts=R.planCenterFirstLabels(models,readings,'both',size,measure,E,{shift:'none'});
  assert.equal(layouts.length,59);
  for(let i=0;i<models.length;i++){
    assert.equal(layouts[i].x,models[i].centroid[0],models[i].name+' center X');
    assert.equal(layouts[i].y,models[i].centroid[1],models[i].name+' center Y');
    assert.ok(E.isInside(layouts[i].x,layouts[i].y,models[i].rings),models[i].name+' inside');
    assert.equal(layouts[i].step,0);
  }
  const allVisible=models.map(()=>true);
  const metrics=R.evaluateVisible(models,layouts,allVisible,E,bounds);
  assert.equal(metrics.shown,59,'all town labels must be rendered');
  assert.equal(metrics.inView,59,'all label anchors must be on whole-city map');
  assert.equal(metrics.moved,0);
});

test('overlaps and border crossings never hide a label by default',()=>{
  for(const width of [320,390,700]){
    const size=E.screenPixelsToSvgUnits(18,1000,width);
    for(const style of ['kanji','both','kana']){
      const layouts=R.planCenterFirstLabels(models,readings,style,size,measure,E,{shift:'none'});
      const all=models.map(()=>true);
      const metrics=R.evaluateVisible(models,layouts,all,E,bounds);
      assert.equal(metrics.shown,59);
      assert.equal(metrics.inView,59);
      assert.equal(metrics.total,59);
      assert.equal(layouts.length,59);
      assert.ok(metrics.collisions>=0);
      assert.ok(metrics.outside>=0);
    }
  }
});

test('center-first optional vertical nudge preserves every name and anchor inside area',()=>{
  for(const width of [320,390,700]){
    const size=E.screenPixelsToSvgUnits(18,1000,width);
    const base=R.planCenterFirstLabels(models,readings,'both',size,measure,E,{shift:'none'});
    const nudge=R.planCenterFirstLabels(models,readings,'both',size,measure,E,{shift:'vertical'});
    for(let i=0;i<models.length;i++){
      assert.equal(nudge[i].x,base[i].x);
      assert.ok(Math.abs(nudge[i].y-base[i].y)<=1.5*size+1e-7);
      assert.ok(E.isInside(nudge[i].x,nudge[i].y,models[i].rings));
      assert.equal(nudge[i].name,models[i].name);
    }
  }
});

test('safe interior anchors correct the narrow-neck town without shifting ordinary centers',()=>{
  const oh=models.find(m=>m.name==='奥山');
  const east=models.find(m=>m.name==='東芦屋町');
  const oki=models.find(m=>m.name==='奥池町');
  for(const m of [oh,east]){
    const p=R.safeInteriorCenter(m,E);
    assert.ok(E.isInside(p[0],p[1],m.rings),m.name);
    assert.ok(E.signedDist(p[0],p[1],m.rings)>
      E.signedDist(m.centroid[0],m.centroid[1],m.rings),m.name+' should have more breathing room');
  }
  assert.deepEqual([...R.safeInteriorCenter(oki,E)],[...oki.centroid]);
});

test('outside centroid in a concave L-shaped region automatically returns an interior label point',()=>{
  const rings=E.parsePath('M0 0 L30 0 L30 170 L190 170 L190 200 L0 200 Z');
  const shape={rings,centroid:E.centroid(rings),polylabel:E.polylabel(rings)};
  assert.equal(E.isInside(shape.centroid[0],shape.centroid[1],rings),false);
  const pt=R.safeInteriorCenter(shape,E);
  assert.ok(E.isInside(pt[0],pt[1],rings));
  assert.ok(E.signedDist(pt[0],pt[1],rings)>0);
});

test('automatic vertical stagger only adjusts neighboring tall districts and never hides them',()=>{
  const model=(name,x,w,h)=>({
    name,
    centroid:[x,155],
    polylabel:[x,155],
    box:{w,h},
    rings:[[[x-w/2,5],[x+w/2,5],[x+w/2,5+h],[x-w/2,5+h]]]
  });
  const a=model('甲町',40,55,300),b=model('乙町',98,55,300);
  const data={甲町:'とてもながいまちなまえ',乙町:'となりのながいまちなまえ'};
  const initial=R.planCenterFirstLabels([a,b],data,'both',22,measure,E,{anchor:'safe',shift:'none'});
  const stagger=R.planCenterFirstLabels([a,b],data,'both',22,measure,E,{anchor:'safe',shift:'adjacent'});
  assert.equal(initial[0].y,initial[1].y);
  assert.ok(Math.abs(stagger[1].step)>.01,'second tall neighbor should stagger');
  assert.equal(stagger[1].x,b.centroid[0]);
  assert.ok(Math.abs(stagger[1].y-b.centroid[1])<=22);
  assert.ok(E.isInside(stagger[1].x,stagger[1].y,b.rings));
  const wide=[model('甲町',40,300,100),model('乙町',98,300,100)];
  assert.ok(R.planCenterFirstLabels(wide,data,'both',22,measure,E,{anchor:'safe',shift:'adjacent'})
    .every(l=>Math.abs(l.step)<.01),'wide neighboring regions must not move');
});

test('all 59 reading labels remain visible in auto-corrected and staggered mode at varying screen widths',()=>{
  for(const width of [320,390,700])for(const font of [14,18,22]){
    const size=E.screenPixelsToSvgUnits(font,1000,width);
    for(const style of ['kanji','both','kana']){
      const straight=R.planCenterFirstLabels(models,readings,style,size,measure,E,
        {anchor:'safe',shift:'none'});
      const staggered=R.planCenterFirstLabels(models,readings,style,size,measure,E,
        {anchor:'safe',shift:'adjacent'});
      assert.equal(staggered.length,59);
      for(let i=0;i<59;i++){
        assert.ok(E.isInside(staggered[i].x,staggered[i].y,models[i].rings));
        assert.equal(staggered[i].x,straight[i].x);
        assert.ok(Math.abs(staggered[i].step)<=1.001);
      }
      const all=models.map(()=>true);
      const m=R.evaluateVisible(models,staggered,all,E,bounds);
      assert.equal(m.shown,59);
      assert.equal(m.inView,59);
      assert.ok(m.collisions<=R.evaluateVisible(models,straight,all,E,bounds).collisions);
    }
  }
});

test('one-sided East Ashiya anchor is balanced inside its region without manually setting coordinates',()=>{
  const town=models.find(m=>m.name==='東芦屋町');
  const point=R.safeInteriorCenter(town,E);
  function corridor(x,y){
    const crossings=[];
    for(const ring of town.rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[j],b=ring[i];
      if((a[1]>y)!==(b[1]>y))
        crossings.push(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]));
    }
    const l=Math.max(...crossings.filter(v=>v<x-1e-7));
    const r=Math.min(...crossings.filter(v=>v>x+1e-7));
    return [x-l,r-x];
  }
  const oldCenter=[628.9,824.2]; // rounded diagnostic from the previous V2 revision
  const before=corridor(oldCenter[0],oldCenter[1]);
  const after=corridor(point[0],point[1]);
  assert.ok(before[0]<before[1]*.35,'former anchor crowded the left edge');
  assert.ok(after[0]>before[0]+10,'new anchor has more room on the left');
  assert.ok(Math.abs(after[0]-after[1])<.01,'horizontal margins are balanced');
  assert.ok(E.isInside(point[0],point[1],town.rings));
  assert.ok(Math.hypot(point[0]-town.centroid[0],point[1]-town.centroid[1])<town.box.w*.25);
});

test('only East Ashiya moves compared with the former safe-center calculation',()=>{
  const formerSafe=m=>{
    const c=m.centroid,p=m.polylabel,rings=m.rings;
    const cd=E.signedDist(c[0],c[1],rings),pd=E.signedDist(p[0],p[1],rings);
    if(cd>0&&cd>=pd*.26)return [...c];
    if(!(pd>0))return [...p];
    let best=[...p],bestDist=Math.hypot(p[0]-c[0],p[1]-c[1]);
    for(let k=0;k<=40;k++){
      const t=k/40,x=c[0]+(p[0]-c[0])*t,y=c[1]+(p[1]-c[1])*t;
      if(E.signedDist(x,y,rings)<pd*.35)continue;
      const d=Math.hypot(x-c[0],y-c[1]);
      if(d<bestDist-1e-9){best=[x,y];bestDist=d;}
    }
    return best;
  };
  const changed=[];
  for(const m of models){
    const prev=formerSafe(m),current=R.safeInteriorCenter(m,E);
    if(Math.hypot(prev[0]-current[0],prev[1]-current[1])>1e-7)changed.push(m.name);
  }
  assert.deepEqual(changed,['東芦屋町']);
});

test('readable East Ashiya label gains space at high zoom without hiding or moving other labels',()=>{
  const east=models.findIndex(m=>m.name==='東芦屋町');
  for(const viewWidth of [1000,500,250,125]){
    const font=E.screenPixelsToSvgUnits(18,viewWidth,390);
    for(const style of ['kanji','both','kana']){
      const base=R.planCenterFirstLabels(models,readings,style,font,measure,E,
        {anchor:'raw',shift:'none'});
      const fixed=R.planCenterFirstLabels(models,readings,style,font,measure,E,
        {anchor:'safe',shift:'none'});
      assert.equal(fixed.length,59);
      assert.equal(R.evaluateVisible(models,fixed,models.map(()=>true),E,bounds).shown,59);
      const eastLabel=fixed[east];
      assert.ok(E.isInside(eastLabel.x,eastLabel.y,models[east].rings));
      assert.ok(eastLabel.x>base[east].x,'corrected label center should be to the right');
    }
  }
});
