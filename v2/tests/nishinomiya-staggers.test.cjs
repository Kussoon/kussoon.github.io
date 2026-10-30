// Reproducible Nishinomiya town-label overlap regressions.
// Run from repository root: node --test v2/tests/nishinomiya-staggers.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ctx={window:{},performance:{now:()=>0}};
for(const file of ['label-engine.js','readable-labels.js']){
  vm.runInNewContext(fs.readFileSync(path.join(root,'common/js',file),'utf8'),ctx,{filename:file});
}
const E=ctx.window.KussoonLabelEngine,R=ctx.window.KussoonReadableLabels;
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nishinomiya-adjacent.json'),'utf8'));
const groups=Object.fromEntries(data.groups.map(group=>{
  const models=group.features.map(f=>({
    name:f.name,reading:f.reading,rings:f.rings,
    box:E.bbox(f.rings),centroid:E.centroid(f.rings),polylabel:E.polylabel(f.rings)
  }));
  return [group.id,{...group,models,readings:Object.fromEntries(models.map(m=>[m.name,m.reading]))}];
}));
const measure=(s,size)=>Array.from(s).length*size;
const compare=(group,zoom,style='kanji',width=390)=>{
  const fontsize=E.screenPixelsToSvgUnits(18,1000/zoom,width);
  const old=R.planCenterFirstLabels(group.models,group.readings,style,fontsize,measure,E,
    {anchor:'safe',shift:'none'});
  const next=R.planCenterFirstLabels(group.models,group.readings,style,fontsize,measure,E,
    {anchor:'safe',shift:'adjacent'});
  return {fontsize,old,next};
};
function pairOverlaps(group,layouts){
  const overlapping=[];
  for(let i=0;i<group.models.length;i++)for(let j=0;j<i;j++){
    if(!group.focus.includes(group.models[i].name)||!group.focus.includes(group.models[j].name))continue;
    const a=layouts[i].box,b=layouts[j].box;
    const area=Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*
      Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
    if(area>.01)overlapping.push([group.models[i].name,group.models[j].name]);
  }
  return overlapping;
}
test('source metadata and focus set remain exactly six named towns',()=>{
  assert.match(data.source.credit,/CODH/);
  assert.equal(data.groups.length,2);
  assert.deepEqual(data.groups.map(g=>Array.from(g.focus)),[
    ['久保町','鞍掛町'],
    ['上ケ原七番町','上ケ原八番町','上ケ原九番町','上ケ原十番町']
  ]);
  assert.deepEqual(data.groups.map(g=>g.features.length),[19,30]);
  for(const g of data.groups){
    assert.equal(new Set(g.features.map(f=>f.name)).size,g.features.length);
    for(const name of g.focus){
      const f=g.features.find(f=>f.name===name);
      assert.ok(f,'missing '+name);
      assert.ok(f.rings.length>0);
      assert.match(f.reading,/^[ぁ-んー]+$/);
    }
  }
});
test('all six readings use the original Nishinomiya town search data',()=>{
  const expected={
    '久保町':'くぼちょう','鞍掛町':'くらかけちょう',
    '上ケ原七番町':'うえがはらななばんちょう',
    '上ケ原八番町':'うえがはらはちばんちょう',
    '上ケ原九番町':'うえがはらきゅうばんちょう',
    '上ケ原十番町':'うえがはらじゅうばんちょう'
  };
  for(const g of data.groups)for(const name of g.focus){
    assert.equal(g.readings[name],expected[name]);
  }
});
test('all regional centers remain inside their own CODH-derived polygons',()=>{
  for(const g of Object.values(groups))for(const m of g.models){
    const p=R.safeInteriorCenter(m,E);
    assert.ok(E.isInside(p[0],p[1],m.rings),m.name+' center outside region');
  }
});
test('Kurakake/Kubo collision resolves at the broad scale without hiding either label',()=>{
  const g=groups['kurakake-kubo'];
  const c=compare(g,1);
  assert.equal(pairOverlaps(g,c.old).length,1);
  assert.equal(pairOverlaps(g,c.next).length,0);
  const kubo=c.next[g.models.findIndex(m=>m.name==='久保町')];
  assert.ok(Math.abs(kubo.step-1)<1e-7,'Kubo should stagger one character downward');
  assert.equal(c.next.length,19);
});
test('Kurakake/Kubo both become non-overlapping on 2x zoom',()=>{
  const g=groups['kurakake-kubo'];
  assert.equal(pairOverlaps(g,compare(g,2).next).length,0);
});
test('Uegahara seventh through tenth: stagger reduces overlaps and preserves all four',()=>{
  const g=groups.uegahara;
  const original=compare(g,1);
  assert.equal(pairOverlaps(g,original.old).length,3);
  assert.equal(pairOverlaps(g,original.next).length,1);
  assert.equal(original.next.length,30);
  for(const name of g.focus){
    const label=original.next[g.models.findIndex(m=>m.name===name)];
    assert.ok(label,'missing '+name);
    assert.ok(E.isInside(label.x,label.y,g.models.find(m=>m.name===name).rings));
  }
  for(const name of ['上ケ原八番町','上ケ原九番町']){
    const label=original.next[g.models.findIndex(m=>m.name===name)];
    assert.ok(Math.abs(label.step)>1e-7,name+' should move vertically');
  }
});
test('Uegahara all four become non-overlapping from 1.5x zoom',()=>{
  const g=groups.uegahara;
  for(const zoom of [1.5,2,3])assert.equal(pairOverlaps(g,compare(g,zoom).next).length,0,
    'remaining collision at zoom '+zoom);
});
test('no horizontal push, no hiding and no increase of target-pair overlaps across zoom levels',()=>{
  for(const g of Object.values(groups))for(const zoom of [1,1.5,2,3,4,6]){
    const {old,next,fontsize}=compare(g,zoom);
    assert.equal(next.length,g.models.length);
    assert.ok(pairOverlaps(g,next).length<=pairOverlaps(g,old).length);
    for(let i=0;i<g.models.length;i++){
      assert.equal(next[i].name,old[i].name);
      assert.equal(next[i].x,old[i].x,g.models[i].name+' moved horizontally');
      assert.ok(Math.abs(next[i].y-old[i].y)<=fontsize+1e-7);
      assert.ok(E.isInside(next[i].x,next[i].y,g.models[i].rings));
    }
  }
});
test('furigana never changes placement of the kanji row for either neighborhood',()=>{
  for(const g of Object.values(groups))for(const zoom of [1,2,4]){
    const kanji=compare(g,zoom,'kanji').next;
    const both=compare(g,zoom,'both').next;
    assert.equal(both.length,kanji.length);
    for(let i=0;i<both.length;i++){
      assert.equal(both[i].x,kanji[i].x,g.models[i].name);
      assert.equal(both[i].y,kanji[i].y,g.models[i].name);
      assert.equal(both[i].width,kanji[i].width);
      assert.equal(both[i].height,kanji[i].height);
    }
  }
});
test('non-suppression: all affected towns stay visible in viewport metrics',()=>{
  for(const g of Object.values(groups)){
    const r=compare(g,1).next;
    const view={x:-1000,y:-1000,w:4000,h:4000};
    const summary=R.evaluateVisible(g.models,r,g.models.map(()=>true),E,view);
    assert.equal(summary.shown,g.models.length);
  }
});
