// Kussoon V2: Hyogo 40 municipalities + 9 Kobe wards, real boundary regression.
// Run: node --test v2/tests/hyogo49-labels.test.cjs
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{},performance:{now:()=>0}};
for(const file of ['label-engine.js','readable-labels.js','topo-region-adapter.js','administrative-labels.js']){
  vm.runInNewContext(fs.readFileSync(path.join(root,'common/js',file),'utf8'),context,{filename:file});
}
const E=context.window.KussoonLabelEngine;
const R=context.window.KussoonReadableLabels;
const A=context.window.KussoonTopoRegionAdapter;
const L=context.window.KussoonAdministrativeLabels;
const data=JSON.parse(fs.readFileSync(path.join(root,'data/hyogo/hyogo-city.topojson'),'utf8'));
const plateData=JSON.parse(fs.readFileSync(path.join(root,'data/hyogo/plate-assignment.json'),'utf8'));
const source=A.decodeTopology(data,'city');
const projected=A.projectRegions(source,E,{width:900,padding:30,referenceLatitude:35});
const models=projected.models;
const measure=(str,font)=>Array.from(str).length*font;
const labels=(width,font,anchor='safe',shift='adjacent')=>{
  const size=E.screenPixelsToSvgUnits(font,projected.width,width);
  return R.planCenterFirstLabels(models,null,'kanji',size,measure,E,{anchor,shift});
};
const allVisible=models.map(()=>true);
const full=projected.bounds;

test('source 49 region set: 40 municipalities plus 9 Kobe wards',()=>{
  assert.equal(data.type,'Topology');
  assert.equal(source.length,49);
  assert.equal(models.length,49);
  assert.equal(new Set(models.map(x=>x.code)).size,49);
  assert.equal(models.filter(m=>m.major==='神戸市').length,9);
  assert.equal(models.filter(m=>m.major!=='神戸市').length,40);
  assert.equal(models.find(m=>m.code==='28204').name,'西宮市');
  assert.equal(models.find(m=>m.code==='28106').name,'長田区');
  assert.equal(models.find(m=>m.code==='28301').name,'猪名川町');
  assert.equal(models.find(m=>m.code==='28301').major,'川辺郡');
  assert.equal(models.find(m=>m.name==='神河町').major,'神崎郡');
  assert.equal(models.find(m=>m.name==='播磨町').major,'加古郡');
  assert.ok(models.some(m=>m.name==='丹波篠山市'));
});

test('TopoJSON reverse and delta decoding reconstruct a rectangle exactly',()=>{
  const demo={type:'Topology',transform:{scale:[1,1],translate:[0,0]},
    objects:{city:{type:'GeometryCollection',geometries:[
      {type:'Polygon',properties:{N03_007:'28204',N03_004:'西宮市'},
       arcs:[[0,~1,2,3]]}
    ]}},arcs:[
      [[0,0],[10,0]],    // eastbound
      [[10,10],[0,-10]], // southbound, must be reversed with ~1
      [[10,10],[-10,0]], // westbound
      [[0,10],[0,-10]]   // northbound
    ]};
  const result=A.decodeTopology(demo,'city');
  assert.equal(result.length,1);
  assert.deepEqual(Array.from(result[0].rings[0],p=>Array.from(p)),
    [[0,0],[10,0],[10,10],[0,10]]);
  assert.throws(()=>A.decodeTopology({},'city'));
});

test('all 49 projected geometries have valid finite extents and distinct codes',()=>{
  assert.ok(projected.width>0&&projected.height>0);
  for(const m of models){
    assert.match(m.code,/^28\d{3}$/);
    assert.ok(m.rings.length>=1);
    assert.ok(m.box.w>0 && m.box.h>0,m.name);
    assert.ok(m.centroid.every(Number.isFinite),m.name);
    assert.ok(m.polylabel.every(Number.isFinite),m.name);
    for(const ring of m.rings){
      assert.ok(ring.length>=3,m.name);
      for(const p of ring)assert.ok(p.every(Number.isFinite),m.name);
    }
  }
  assert.ok(models.find(m=>m.name==='姫路市').polygonCount>1);
  assert.ok(models.find(m=>m.name==='播磨町').polygonCount>1);
});

test('all 49 safe-center and universal anchors remain inside their own geometry',()=>{
  for(const m of models){
    const safe=R.safeInteriorCenter(m,E),universal=R.universalInteriorAnchor(m,E);
    assert.ok(E.isInside(safe[0],safe[1],m.rings),m.name+' safe outside');
    assert.ok(E.isInside(universal[0],universal[1],m.rings),m.name+' universal outside');
    assert.ok(E.signedDist(...safe,m.rings)>0,m.name+' safe on border');
    assert.ok(E.signedDist(...universal,m.rings)>0,m.name+' universal on border');
  }
});

test('kanji-only administrative labels need no synthetic kana readings',()=>{
  assert.equal(R.labelSpec('西宮市',null,'kanji',14,measure).primary,'西宮市');
  assert.throws(()=>R.labelSpec('西宮市',null,'both',14,measure));
  assert.throws(()=>R.labelSpec('西宮市',null,'kana',14,measure));
  assert.equal(labels(390,14).length,49);
});

test('all 49 labels are drawn from the full map at mobile and PC widths',()=>{
  for(const width of [320,390,700])for(const font of [12,14,18]){
    for(const anchor of ['raw','safe','universal','balanced']){
      for(const shift of ['none','adjacent']){
        const placed=labels(width,font,anchor,shift);
        assert.equal(placed.length,49);
        assert.equal(placed.filter(l=>l.name.length>0).length,49);
        const info=R.evaluateVisible(models,placed,allVisible,E,full);
        assert.equal(info.shown,49);
        assert.equal(info.inView,49);
        for(let i=0;i<49;i++)
          assert.ok(E.isInside(placed[i].x,placed[i].y,models[i].rings),models[i].name);
      }
    }
  }
});

test('staggering does not push labels horizontally',()=>{
  for(const width of [320,390,700])for(const font of [12,14,18]){
    const no=labels(width,font,'safe','none');
    const yes=labels(width,font,'safe','adjacent');
    const unit=E.screenPixelsToSvgUnits(font,900,width);
    for(let i=0;i<49;i++){
      assert.equal(no[i].x,yes[i].x,models[i].name+' horizontal drift');
      assert.ok(Math.abs(no[i].y-yes[i].y)<=unit+1e-7,models[i].name+' vertical drift');
    }
  }
});

test('focus areas preserve stable administrative IDs for cross-map navigation',()=>{
  const ids=['28101','28102','28105','28106','28107','28108','28109','28110','28111',
    '28201','28204','28205','28214','28224'];
  for(const id of ids)assert.equal(models.filter(m=>m.id===id).length,1,id);
});

test('safe and universal mode do not mutate geometry or another model on repeated calls',()=>{
  const originals=models.map(m=>[...m.centroid]);
  for(let i=0;i<2;i++){
    labels(390,14,'safe','adjacent');
    labels(390,14,'universal','adjacent');
  }
  for(let i=0;i<49;i++){
    assert.equal(models[i].centroid[0],originals[i][0]);
    assert.equal(models[i].centroid[1],originals[i][1]);
  }
});

test('the plate-region trial reuses 21 Himeji codes from the existing Hyogo map',()=>{
  const codes=plateData.otherPlateMunicipalityCodes;
  assert.equal(plateData.defaultPlate,'神戸');
  assert.equal(plateData.otherPlate,'姫路');
  assert.equal(codes.length,21);
  assert.equal(new Set(codes).size,21);
  for(const code of codes){
    const m=models.find(x=>x.code===code);
    assert.ok(m,'plate code missing from 49 regions: '+code);
    assert.notEqual(m.major,'神戸市');
  }
  assert.equal(models.filter(m=>codes.includes(m.code)).length,21);
  assert.equal(models.filter(m=>!codes.includes(m.code)).length,28);
  assert.ok(codes.includes('28201'),'姫路市');
  assert.ok(!codes.includes('28204'),'西宮市');
  assert.ok(!codes.includes('28106'),'神戸市長田区');
});

function horizontalSegmentAt(model,[x,y]){
  const crossings=[];
  for(const ring of model.rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i];
    if((a[1]>y)!==(b[1]>y))
      crossings.push(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]));
  }
  crossings.sort((a,b)=>a-b);
  for(let i=0;i+1<crossings.length;i+=2){
    if(x>crossings[i]&&x<crossings[i+1])return [crossings[i],crossings[i+1]];
  }
  throw new Error('No interior horizontal segment for '+model.name);
}

test('Sumoto, Tatsuno and Aioi automatically balance the LEFT and RIGHT margins at their existing height',()=>{
  const baseline=labels(390,14,'safe','none');
  const adjusted=labels(390,14,'balanced','none');
  const names=['洲本市','たつの市','相生市'];
  const expectedDirection={'洲本市':1,'たつの市':1,'相生市':-1};
  for(const name of names){
    const i=models.findIndex(m=>m.name===name),model=models[i];
    const old=baseline[i],now=adjusted[i];
    assert.equal(old.y,now.y,name+' height changed unexpectedly');
    const [left,right]=horizontalSegmentAt(model,[now.x,now.y]);
    const beforeDifference=Math.abs((old.x-left)-(right-old.x));
    const afterDifference=Math.abs((now.x-left)-(right-now.x));
    assert.ok(afterDifference<.0001,name+' not horizontally centered');
    assert.ok(beforeDifference>5,name+' original imbalance missing');
    assert.ok((now.x-old.x)*expectedDirection[name]>4,name+' did not move toward vacant side');
    assert.ok(E.signedDist(now.x,now.y,model.rings)>0,name+' outside region');
  }
});

test('Nishinomiya moves to the substantial southern lobe instead of the northern polylabel area',()=>{
  const m=models.find(x=>x.code==='28204');
  const old=R.safeInteriorCenter(m,E),now=R.locallyBalancedCenter(m,E);
  assert.ok(now[1]-old[1]>18,'label did not leave the upper lobe');
  assert.ok(now[1]<m.box.maxY-20,'label is too close to the southern edge');
  assert.ok(E.signedDist(...now,m.rings)>=E.signedDist(...m.polylabel,m.rings)*.6,
    'new lobe is too narrow for a stable anchor');
  assert.ok(E.isInside(now[0],now[1],m.rings));
  assert.ok(Math.abs(now[0]-old[0])<m.box.w*.25);
});

test('balanced mode preserves valid centers and leaves unrelated 41 administrative centers untouched',()=>{
  const baseline=labels(390,14,'safe','none'),balanced=labels(390,14,'balanced','none');
  assert.equal(balanced.length,49);
  const changed=models.flatMap((m,i)=>{
    const a=baseline[i],b=balanced[i];
    assert.ok(E.isInside(b.x,b.y,m.rings),m.name+' outside');
    return Math.hypot(a.x-b.x,a.y-b.y)>1e-5?[m.name]:[];
  });
  assert.equal(changed.length,8);
  for(const name of ['西宮市','洲本市','相生市','たつの市'])
    assert.ok(changed.includes(name),name+' not moved');
  assert.equal(models.length-changed.length,41);
});

test('balanced mode is insensitive to zoom, font size and plate-map color classes',()=>{
  const fixed=labels(390,14,'balanced','none');
  for(const width of [320,390,700])for(const font of [12,14,18]){
    const actual=labels(width,font,'balanced','none');
    for(let i=0;i<49;i++){
      assert.equal(actual[i].x,fixed[i].x,models[i].name+' moved x on zoom');
      assert.equal(actual[i].y,fixed[i].y,models[i].name+' moved y on zoom');
    }
  }
  // Both uses render the same labels. The plate switch only colors region paths.
  const app=fs.readFileSync(path.join(root,'hyogo/labels-app.js'),'utf8');
  assert.ok(app.includes("anchor:$('anchor').value"));
  assert.ok(app.includes("plateMode=$('use-case').value==='plate'"));
});

test('adjacent-label staggering cannot pull Nishinomiya back into its northern narrow area',()=>{
  const index=models.findIndex(m=>m.name==='西宮市');
  const anchor=R.locallyBalancedCenter(models[index],E);
  for(const width of [320,390,700])for(const zoom of [1,2,4]){
    const size=E.screenPixelsToSvgUnits(14,900/zoom,width);
    const positioned=R.planCenterFirstLabels(models,null,'kanji',size,measure,E,
      {anchor:'balanced',shift:'adjacent'});
    const p=positioned[index];
    assert.ok(p.y>=anchor[1]-4,'Nishinomiya was moved north into its narrow neck');
    assert.ok(E.signedDist(p.x,p.y,models[index].rings)>=
      E.signedDist(...anchor,models[index].rings)*.75,'shallow-neck placement');
    assert.equal(positioned.length,49);
  }
});

test('Hyogo county/town and Kobe city/ward labels use the same 2-row rule',()=>{
 const examples=[
  ['猪名川町','川辺郡'],['神河町','神崎郡'],['播磨町','加古郡'],
  ['太子町','揖保郡']
 ];
 for(const [name,county] of examples){
  const model=models.find(m=>m.name===name);
  assert.ok(model);
  assert.deepEqual([...L.rows(model)],[county,name]);
  const measured=L.widestRowModel(model,14,measure);
  const layout=R.planCenterFirstLabels([measured],null,'kanji',14,measure,E,
    {anchor:'balanced',shift:'none'})[0];
  const expanded=L.boxFor(model,layout,14,measure);
  assert.ok(expanded.box.y2-expanded.box.y1>layout.box.y2-layout.box.y1);
 }
 const kobe=models.find(m=>m.name==='東灘区');
 assert.deepEqual([...L.rows(kobe)],['神戸市','東灘区']);
 assert.equal(L.rows(models.find(m=>m.name==='西宮市')),null);
});
