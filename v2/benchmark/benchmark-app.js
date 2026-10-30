/* Cross-region layout regression benchmark, V2 only.
 * Tests the production V2 geometry and refinement modules without modifying maps.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const E=window.KussoonLabelEngine,R=window.KussoonReadableLabels;
const A=window.KussoonTopoRegionAdapter,C=window.KussoonCollisionRefinement;
const L=window.KussoonAdministrativeLabels;
const REGIONS={
 ashiya:{label:'芦屋市',expected:59,max:12,spots:['大原町','宮塚町','三条町']},
 nishinomiya:{label:'西宮市',expected:322,max:18,spots:['寿町','今在家町','甲子園砂田町']},
 hyogo:{label:'兵庫県',expected:49,max:16,spots:['中央区','西宮市','洲本市']}
};
let running=false,lastOutput='';
const measureCanvas=document.createElement('canvas'),measureCtx=measureCanvas.getContext('2d');
const memo=new Map();
function measure(text,fontSize){
 const key=text+'|'+fontSize.toFixed(5);
 if(memo.has(key))return memo.get(key);
 let width=[...text].length*fontSize;
 if(measureCtx){measureCtx.font='850 '+fontSize+'px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';width=measureCtx.measureText(text).width;}
 memo.set(key,width);return width;
}
function groupName(name){return String(name||'').replace(/[一二三四五六七八九十百]+丁目$/,'');}
function loadJson(url){return fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(url+' HTTP '+r.status);return r.json();});}
function nishinomiya(topo){
 if(topo?.type!=='Topology'||!Array.isArray(topo.objects?.town?.geometries)||typeof window.topojson?.merge!=='function')
  throw Error('西宮の境界データまたは結合処理が利用できません');
 const groups=new Map();
 for(const g of topo.objects.town.geometries){
  const name=groupName(g.properties?.S_NAME);
  if(!name)throw Error('無名の区域があります');
  if(!groups.has(name))groups.set(name,[]);
  groups.get(name).push(g);
 }
 const merged=[...groups].map(([name,entries])=>{
  const shape=window.topojson.merge(topo,entries);
  const rings=shape.coordinates.flatMap(polygon=>polygon.filter(r=>r.length>=4));
  return {name,rings};
 });
 const lonScale=Math.cos(34.75*Math.PI/180),points=merged.flatMap(o=>o.rings.flat());
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const [lon,lat] of points){
  const x=lon*lonScale,y=-lat;
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 }
 const scale=840/Math.max(maxX-minX,maxY-minY);
 const width=(maxX-minX)*scale+60,height=(maxY-minY)*scale+60;
 const models=merged.map((m,i)=>{
  const rings=m.rings.map(r=>r.map(([lon,lat])=>[
   30+(lon*lonScale-minX)*scale,30+(-lat-minY)*scale
  ]));
  return {name:m.name,id:String(i),rings,box:E.bbox(rings),
   centroid:E.centroid(rings),polylabel:E.polylabel(rings)};
 });
 return {models,bounds:{x:0,y:0,w:width,h:height}};
}
async function loadRegion(id){
 let loaded;
 if(id==='ashiya'){
  const data=await loadJson('../data/ashiya/labels-source.json');
  const models=E.buildModels(data.features).models;
  loaded={models,bounds:{x:0,y:0,w:data.viewBox[2],h:data.viewBox[3]}};
 }else if(id==='hyogo'){
  const data=await loadJson('../data/hyogo/hyogo-city.topojson');
  const projected=A.projectRegions(A.decodeTopology(data,'city'),E,{width:900,padding:30,referenceLatitude:35});
  loaded={models:projected.models,bounds:projected.bounds};
 }else if(id==='nishinomiya'){
  const data=await loadJson('/nishinomiya/data/nishinomiya-towns.topojson');
  loaded=nishinomiya(data);
 }else throw Error('不明な地域です');
 if(loaded.models.length!==REGIONS[id].expected)throw Error('町名数が一致しません：'+id+' '+loaded.models.length);
 if(new Set(loaded.models.map(m=>m.name)).size!==loaded.models.length)
  throw Error('同じ町名の重複があります：'+id);
 return loaded;
}
function textStyle(id,models,laid,size){
 if(id!=='hyogo')return laid;
 // Match the shared two-line geometry for Kobe wards AND county towns.
 return laid.map((l,i)=>L.boxFor(models[i],l,size,measure));
}
function boxesOverlap(a,b){
 return Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*
        Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1))>.01;
}
function intersects(b,v){
 return b.x2>=v.x&&b.x1<=v.x+v.w&&b.y2>=v.y&&b.y1<=v.y+v.h;
}
function evaluate(models,layout,view){
 const active=layout.map((l,i)=>intersects(l.box,view)?i:-1).filter(i=>i>=0);
 let collisions=0,centerOutside=0;
 const conflicts=[];
 for(let a=0;a<active.length;a++){
  const i=active[a],l=layout[i];
  if(!E.isInside(l.x,l.y,models[i].rings))centerOutside++;
  for(let b=0;b<a;b++){
   const j=active[b],other=layout[j];
   if(!boxesOverlap(l.box,other.box))continue;
   collisions++;
   const width=Math.max(0,Math.min(l.box.x2,other.box.x2)-Math.max(l.box.x1,other.box.x1));
   const height=Math.max(0,Math.min(l.box.y2,other.box.y2)-Math.max(l.box.y1,other.box.y1));
   conflicts.push({a:models[i].name,b:models[j].name,area:width*height});
  }
 }
 conflicts.sort((a,b)=>b.area-a.area);
 return {active:active.length,collisions,centerOutside,examples:conflicts.slice(0,3)
   .map(c=>c.a+'・'+c.b)};
}
function screenSize(z){return Math.min(24,16+Math.min(2,Math.max(0,z-1)*.18));}
function caseAt(id,region,baseline,z,spot){
 const bounds=region.bounds;
 const w=bounds.w/z,h=bounds.h/z;
 const center=spot===null
  ?[bounds.x+bounds.w/2,bounds.y+bounds.h/2]
  :(()=>{
    const m=region.models.find(m=>m.name===spot);
    if(!m)throw Error('検証地点の町名がありません：'+spot);
    const [x,y]=m.polylabel;
    return [x,y];
   })();
 const view={x:center[0]-w/2,y:center[1]-h/2,w,h};
 const start=performance.now();
 const initial=baseline.get(z);
 const before=evaluate(region.models,initial,view);
 // Existing V2 refiner; all labels remain visible, no location-specific overrides.
 const adjusted=C.refine(region.models,initial,initial[0].size,E,{view,passes:3});
 const after=evaluate(region.models,adjusted.labels,view);
 const elapsed=performance.now()-start;
 const scalePx=screenSize(z);
 return {region:REGIONS[id].label,spot:spot||'全域',zoom:z,
  screenPx:scalePx,targets:after.active,before:before.collisions,
  after:after.collisions,centerOutside:after.centerOutside,moved:adjusted.moved,ms:elapsed,examples:after.examples};
}
function createTd(textValue,className){
 const td=document.createElement('td');td.textContent=String(textValue);
 if(className)td.className=className;return td;
}
function showResult(r){
 const tr=document.createElement('tr');
 const values=[r.region,r.spot,r.zoom.toFixed(1)+'倍',r.screenPx.toFixed(1)+'px',
  r.targets,r.before,r.after,r.centerOutside,r.moved,r.ms.toFixed(0)+'ms',r.examples.join('／')||'—'];
 for(let i=0;i<values.length;i++)tr.append(createTd(values[i],
  i===6&&r.after>0?'num over':i===6?'num good':i>=2?'num':''));
 $('results').append(tr);
}
const nextPaint=()=>new Promise(resolve=>setTimeout(resolve,16));
async function start(){
 if(running)return;
 running=true;$('run').disabled=true;$('region').disabled=true;$('copy').disabled=true;
 $('results').replaceChildren();$('totals').textContent='';lastOutput='';
 const requested=$('region').value;
 const regions=requested==='all'?['ashiya','nishinomiya','hyogo']:[requested];
 const output=[],failures=[];
 try{
  for(const id of regions){
   $('status').textContent=REGIONS[id].label+'の境界を読み込んでいます…';await nextPaint();
   let loaded;
   try{loaded=await loadRegion(id);}catch(err){
    failures.push(REGIONS[id].label+'：'+err.message);continue;
   }
   const config=REGIONS[id],zoomLevels=[1,6,config.max],baseline=new Map();
   for(const z of zoomLevels){
    $('status').textContent=config.label+' '+z+'倍の共通配置を計算中…';await nextPaint();
    const b=loaded.bounds,screenPx=screenSize(z);
    const size=screenPx/Math.min(390/(b.w/z),390/(b.h/z));
    const plannedModels=loaded.models.map(m=>L.widestRowModel(m,size,measure));
    const initial=R.planCenterFirstLabels(plannedModels,null,'kanji',size,measure,E,
     {anchor:'balanced',shift:'adjacent'});
    baseline.set(z,textStyle(id,loaded.models,initial,size));
   }
   const jobs=[{z:1,spot:null},...config.spots.flatMap(spot=>[
    {z:6,spot},{z:config.max,spot}
   ])];
   for(const job of jobs){
    $('status').textContent=config.label+'・'+(job.spot||'全域')+'／'+job.z+'倍を計測中…';
    await nextPaint();
    const result=caseAt(id,loaded,baseline,job.z,job.spot);
    output.push(result);showResult(result);
   }
  }
  const improved=output.filter(r=>r.after<r.before).length;
  const zero=output.filter(r=>r.after===0).length;
  const negatives=output.filter(r=>r.after>r.before).length;
  $('totals').textContent=output.length+'条件中、重なり減少：'+improved+'条件、重なり0：'+zero+
   '条件、重なり増加：'+negatives+'条件。'+
   (failures.length?' 読込失敗：'+failures.join('／'):'');
  $('status').textContent=failures.length?'一部の地域を計測できませんでした。':'計測完了。結果は同じ条件で再現できます。';
  lastOutput='Kussoon V2 ラベル配置検証\n'+
   ['地域','地点','拡大倍率','画面文字px','対象件数','重なり前','重なり後','区域外中心','移動数','時間ms','残存する重なり例'].join('\t')+'\n'+
   output.map(r=>[r.region,r.spot,r.zoom,r.screenPx.toFixed(1),r.targets,r.before,r.after,
     r.centerOutside,r.moved,r.ms.toFixed(0),r.examples.join('／')].join('\t')).join('\n')+'\n'+
   $('totals').textContent;
  $('copy').disabled=!output.length;
 }catch(err){
  console.error('Kussoon V2 regression benchmark',err);
  $('status').textContent='計測エラー：'+err.message;
 }finally{
  running=false;$('run').disabled=false;$('region').disabled=false;
 }
}
$('run').addEventListener('click',start);
$('copy').addEventListener('click',()=>{
 if(lastOutput&&navigator.clipboard?.writeText){
  navigator.clipboard.writeText(lastOutput).then(()=>
   $('status').textContent='結果をコピーしました。').catch(()=>
   $('status').textContent='このブラウザではコピーできませんでした。');
 }else if(lastOutput){
  $('status').textContent='このブラウザではコピー機能が利用できません。表の内容を選択してください。';
 }
});
})();
