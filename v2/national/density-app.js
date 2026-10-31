/* National municipality V2 - cross-prefecture foundation experiment.
 * Shared geometry, a 5-digit municipal-code registry and cross-prefecture overlays.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const E=window.KussoonLabelEngine,R=window.KussoonReadableLabels;
const C=window.KussoonCollisionRefinement,F=window.KussoonRegionFit,N=window.KussoonNationalBoundaries;
const L=window.KussoonAdministrativeLabels,NR=window.KussoonNationalReadings;
const D=window.KussoonDensityLabels,M=window.KussoonCenteredLabels;
const map=$('map');
const sourceCache=new Map(),pointers=new Map();
const SCOPES={kansai:{title:'関西2府4県',expected:{municipality:198,ward:245}},chugoku:{title:'中国地方5県',expected:{municipality:107,ward:117}},west:{title:'関西・中国11府県',expected:{municipality:305,ward:362}},shikoku:{title:'四国4県',expected:{municipality:95,ward:95}},'chugoku-shikoku':{title:'中国・四国9県',expected:{municipality:202,ward:212}},'west-shikoku':{title:'関西・中国・四国15府県',expected:{municipality:400,ward:457}},fuji:{title:'山梨県・静岡県',expected:{municipality:62,ward:70}}};
let catalog=null,readingData=null,countyData=null,models=[],bounds={x:0,y:0,w:900,h:900},view={...bounds};
let drawing=[],labelNodes=[],outlineNodes=[],selection=null,plate=null,plateShape=null;
let fixedCenters=new Map(),fixedCorrections=0;
let state={area:'kansai',mode:'municipality'},renderTimer=0,runId=0,skipClickUntil=0;
const tag=(name,attrs={})=>{
 const el=document.createElementNS(NS,name);
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
 return el;
};
const pathData=rings=>rings.map(ring=>'M'+ring.map(([x,y])=>x.toFixed(2)+','+y.toFixed(2)).join('L')+'Z').join('');
const nameOf=m=>m.fullName||m.name;
function setStatus(message){$('status').textContent=message;}
function fit(){view={...bounds};map.setAttribute('viewBox',[view.x,view.y,view.w,view.h].join(' '));}
function syncView(){map.setAttribute('viewBox',[view.x,view.y,view.w,view.h].join(' '));}
function clamp(){
 const padX=view.w*.13,padY=view.h*.13;
 view.x=Math.max(bounds.x-padX,Math.min(bounds.x+bounds.w-view.w+padX,view.x));
 view.y=Math.max(bounds.y-padY,Math.min(bounds.y+bounds.h-view.h+padY,view.y));
}
function zoomBy(factor,fx=.5,fy=.5){
 if(!models.length)return;
 // Wide-area maps need more than the legacy 18x cap to inspect a town.
 // Keep the already-tested limits for single-region and Fuji modes.
 const maxZoom=state.area==='west-shikoku'?96:
  state.area==='chugoku-shikoku'?72:state.area==='west'?72:18;
 const newWidth=Math.max(bounds.w/maxZoom,Math.min(bounds.w,view.w/factor));
 const newHeight=newWidth*bounds.h/bounds.w;
 view.x+=(view.w-newWidth)*fx;view.y+=(view.h-newHeight)*fy;
 view.w=newWidth;view.h=newHeight;clamp();syncView();scheduleLabels();
}
function pan(dx,dy){
 const rect=map.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 view.x-=dx*view.w/rect.width;view.y-=dy*view.h/rect.height;
 clamp();syncView();scheduleLabels();
}
function scheduleLabels(){
 clearTimeout(renderTimer);renderTimer=setTimeout(renderLabels,160);
}
function showSelection(){
 if(!models.length)return;
 const chosen=selection?.type==='model'?models.find(m=>m.id===selection.id):null;
 if(state.mode==='plate'&&plate){
  const included=new Set(plate.municipalityCodes);
  if(chosen){
   const matches=chosen.municipalityCodes.every(code=>included.has(code));
   $('selection').textContent=nameOf(chosen)+'：'+(matches?
    plate.name+'ナンバー':'富士山ナンバー対象外（他のナンバー地名はこの試験版では未収録）');
  }else{
   const members=N.plateMembers(models,plate),grouped={};
   for(const m of members)(grouped[m.prefecture]??=[]).push(m.name);
   const summary=Object.entries(grouped).map(([pref,values])=>pref+' '+values.length+'市町村').join('＋');
   $('selection').textContent='紫色の範囲：'+plate.name+'ナンバー（'+summary+'、合計'+members.length+'市町村）。青色は今回ナンバー地域を未収録の区域です。';
  }
  return;
 }
 if(chosen){
  const readings=(chosen.readingParts||[]).map(x=>x.reading).filter(Boolean);
  const name=nameOf(chosen),reading=readings.join('／')||chosen.reading||'';
  $('selection').replaceChildren();
  const strong=document.createElement('strong');strong.textContent=name;
  $('selection').append(strong);
  if(reading){
   const kana=document.createElement('div');kana.textContent='読み：'+reading;
   $('selection').append(kana);
  }
  const details=document.createElement('div');
  details.className='meta';
  details.textContent='所在地：'+chosen.prefecture+
   '　／　行政区域コード：'+chosen.code;
  $('selection').append(details);
  const note=document.createElement('div');
  note.className='meta';note.textContent='同じ区域をもう一度タップすると選択解除できます。';
  $('selection').append(note);
 }else $('selection').textContent='市町村をタップすると名前と読みを確認できます。';
}
function highlight(){
 // In plate mode the whole cross-prefecture plate region stays colored,
 // even if the user taps an individual municipality for details.
 const selectedPlate=state.mode==='plate'&&plate?new Set(plate.municipalityCodes):null;
 drawing.forEach(({node,model})=>{
  const focused=selection?.type==='model'&&model.id===selection.id;
  const show=selectedPlate?model.municipalityCodes.some(code=>selectedPlate.has(code)):focused;
  node.classList.toggle('selected',show);
  node.classList.toggle('focused',Boolean(focused));
 });
 labelNodes.forEach(({node,model})=>{
  node.classList.toggle('selected',selection?.type==='model'&&model?.id===selection.id);
 });
 showSelection();
}
function select(sel,scroll=false){
 selection=sel;highlight();
 // Re-run visibility so a tapped municipality becomes the pinned label.
 if(scroll){fit();renderLabels();map.scrollIntoView({behavior:'smooth',block:'center'});}
 else renderLabels();
}
function toggleMunicipality(id){
 select(selection?.type==='model'&&selection.id===id?null:{type:'model',id});
}
function buildPrefOutlines(topologies,projectPoint){
 const layer=tag('g',{'aria-hidden':'true'});
 for(const [prefCode,topo] of Object.entries(topologies)){
  const object=topo.objects[Object.keys(topo.objects)[0]];
  const merged=window.topojson.merge(topo,object.geometries);
  const rings=merged.coordinates.flatMap(poly=>poly.map(r=>r.map(projectPoint)));
  const p=tag('path',{d:pathData(rings),class:'outline'});
  const title=tag('title');title.textContent=catalog.prefectures.find(x=>x.code===prefCode)?.name||prefCode;
  p.append(title);layer.append(p);
 }
 return layer;
}
function drawMap(topologies,projectPoint){
 const shapeLayer=tag('g'),labelLayer=tag('g',{'aria-hidden':'true'}),outlines=buildPrefOutlines(topologies,projectPoint);
 drawing=[];labelNodes=[];outlineNodes=[];
 const isPlate=state.mode==='plate'&&Boolean(plate);
 map.classList.toggle('plate-mode',isPlate);
 for(const model of models){
  const attributes={d:pathData(model.rings),class:'land','aria-label':nameOf(model)};
  if(!isPlate)Object.assign(attributes,{tabindex:0,role:'button','data-id':model.id});
  const p=tag('path',attributes);
  const title=tag('title');title.textContent=nameOf(model);p.append(title);
  shapeLayer.append(p);drawing.push({node:p,model});
 }
 // In either mode keep the municipality names as geographic reference.
 // The plate mode adds one dedicated region label, not a detail popup per town.
 for(const model of models){
  const t=tag('text',{class:'place-label'});
  // Names are always stored independently of their display lines.
  if($('reading').value==='on')
   NR.paint(t,model,0,0,15,measure);
  else L.paint(t,model,0,15);
  labelLayer.append(t);
  labelNodes.push({node:t,model});
 }
 if(isPlate){
  const t=tag('text',{class:'place-label plate-label'});
  if($('reading').value==='on')NR.paint(t,plateShape,0,0,18,measure);
  else t.textContent=plate.name;
  labelLayer.append(t);
  labelNodes.push({node:t,model:plateShape});
 }
 map.replaceChildren(shapeLayer,outlines,labelLayer);
 highlight();
}
function labelSize(zoom,compact){
 // Full-label experiment: all labels are present from the beginning.
 // Small at overview and progressively legible when zooming in.
 // Font dimensions are screen pixels; the SVG units are recomputed per view.
 if(compact)return Math.min(18,7+2.6*Math.log2(Math.max(1,zoom)));
 return 15+Math.min(2,Math.max(0,zoom-1)*.18);
}
const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
function measure(value,size){
 if(!ctx)return [...value].length*size;
 ctx.font='850 '+size+'px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
 return ctx.measureText(value).width;
}
function renderLabels(){
 if(!models.length)return;
 const start=performance.now(),zoom=bounds.w/view.w;
 const compareMode=['center','fixed','light'].includes($('density-mode').value);
 const screenPx=labelSize(zoom,compareMode);
 const rect=map.getBoundingClientRect();
 const ratio=Math.min((rect.width||390)/view.w,(rect.height||390)/view.h);
 if(!(ratio>0))return;
 const size=screenPx/ratio;
 const readingEnabled=$('reading').value==='on' &&
  (compareMode||$('density-mode').value==='all'||zoom>=6);
 const workModels=state.mode==='plate'&&plateShape?[...models,plateShape]:models;
 // Measure whichever row is wider, not the concatenated county + town string.
 // Search and selection continue to use the complete administrative name.
 const layoutModels=workModels.map(m=>L.widestRowModel(m,size,measure));
 // A/B both start from a stable point belonging to the municipality.
 // Avoid the adaptive engine's adjacent-region shifts in the full-label trial.
 const planned=compareMode?layoutModels.map(m=>{
  const [x,y]=$('density-mode').value==='center'?
   (fixedCenters.get(m.id)||m.polylabel||m.centroid):
   (Array.isArray(m.polylabel)&&m.polylabel.every(Number.isFinite)
    ?m.polylabel : m.centroid);
  const width=measure(m.name,size)+size*.24,height=size*1.2;
  return {x,y,width,height,box:{
   x1:x-width/2,x2:x+width/2,y1:y-height/2,y2:y+height/2
  }};
 }):R.planCenterFirstLabels(layoutModels,null,'kanji',size,measure,E,{
  anchor:'balanced',shift:'adjacent'
 });
 // Collision checks must include both rendered rows of every county town
 // and designated-city ward, including in Fuji plate overview mode.
 const original=planned.map((l,i)=>{
  const m=workModels[i];
  if(m.id==='plate'&&readingEnabled)
   return NR.boxFor(m,l,size*1.2,measure);
  if(m.id==='plate'){
   const width=measure(m.name,size*1.2)+size*.3;
   const height=size*1.5;
   return {...l,width,height,box:{x1:l.x-width/2,y1:l.y-height/2,
    x2:l.x+width/2,y2:l.y+height/2}};
  }
  return readingEnabled?NR.boxFor(m,l,size,measure):L.boxFor(m,l,size,measure);
 });
 const pinned=state.mode==='plate'?layoutModels.length-1:
   selection?.type==='model'?models.findIndex(m=>m.id===selection.id):-1;
 // A: native, centered label anchors with no collision-driven movement.
 // B: same anchors, then at most 8px of movement to reduce collisions.
 // Both versions render all labels (no hiding).
 let resultLabels,containment=null,clearance=null,collisionResult={labels:original};
 if(compareMode){
  resultLabels=D.fullCompare(workModels,original,{
   mode:$('density-mode').value==='center'?'fixed':$('density-mode').value,view,
   screenWidth:rect.width||390,screenHeight:rect.height||390,
   selectedId:selection?.type==='model'?selection.id:null
  }).labels;
 }else{
  const collision=C.refine(layoutModels,original,size,E,{view,passes:3,pinned});
  collisionResult=collision;
  containment=state.mode!=='plate'&&zoom>=4
   ?F.refine(layoutModels,collision.labels,size,E,{
     view,passes:1,pinned,perimeter:false
    }):null;
  clearance=containment&&zoom>=6
   ?F.refine(layoutModels,containment.labels,size,E,{
     view,passes:1,pinned,perimeter:true
    }):null;
  resultLabels=clearance?clearance.labels:
   containment?containment.labels:collision.labels;
 }
 resultLabels.forEach((position,i)=>{
  const target=labelNodes[i]?.node;
  if(!target)return;
  target.setAttribute('x',position.x.toFixed(2));
  target.setAttribute('y',position.y.toFixed(2));
  if(readingEnabled)
   NR.paint(target,workModels[i],position.x,position.y,
    target.classList.contains('plate-label')?size*1.2:size,measure);
  else L.paint(target,workModels[i],position.x,size);
  const displayedSize=target.classList.contains('plate-label')?size*1.2:size;
  target.setAttribute('font-size',displayedSize.toFixed(2));
  target.setAttribute('stroke-width',(displayedSize*.18).toFixed(2));
 });
 const arrangement=compareMode?
  {visible:workModels.map(()=>true),labels:resultLabels}:
  D.arrange(workModels,resultLabels,{
   view,zoom,mode:$('density-mode').value,density:$('density-level').value,
   selectedId:selection?.type==='model'?selection.id:null,
   screenWidth:rect.width||390,screenHeight:rect.height||390
  });
 const visible=arrangement.visible;
 // The legacy declutter trial may choose an alternative label anchor.
 arrangement.labels.forEach((position,i)=>{
  if(!visible[i]||position===resultLabels[i])return;
  const target=labelNodes[i]?.node,m=workModels[i];
  if(!target)return;
  if(readingEnabled)NR.paint(target,m,position.x,position.y,
   target.classList.contains('plate-label')?size*1.2:size,measure);
  else L.paint(target,m,position.x,size);
  target.setAttribute('x',position.x.toFixed(2));
  target.setAttribute('y',position.y.toFixed(2));
 });
 labelNodes.forEach(({node},i)=>{node.style.display=visible[i]?'':'none';});
 const visibleCount=visible.reduce((n,x)=>n+(x?1:0),0);
 $('density-output').textContent='地名ラベル '+visibleCount+'／'+workModels.length+
  '件表示（倍率 '+zoom.toFixed(1)+'倍・'+
  ($('density-mode').value==='center'?'新A：中央基準・初期補正のみ':
   $('density-mode').value==='fixed'?'旧A：Polylabel固定':
   $('density-mode').value==='light'?'B：全件・軽い調整':
   $('density-mode').value==='all'?'旧・全件表示':
   '旧・自然な表示：'+$('density-level').selectedOptions[0].text)+
  '）。'+(readingEnabled?'読み仮名あり':'読み仮名なし')+
  '。非表示の市町村も検索・タップできます。';
 const before=R.evaluateVisible(layoutModels,original,layoutModels.map(()=>true),E,view);
 const after=R.evaluateVisible(layoutModels,arrangement.labels,visible,E,view);
 const moved=arrangement.labels.reduce((count,p,i)=>count+
   (Math.hypot(p.x-original[i].x,p.y-original[i].y)>1e-5?1:0),0);
 $('metrics').textContent='表示単位 '+models.length+'区域／画面内ラベル '+after.inView+
  '件／文字の重なり（概算）'+before.collisions+'→'+after.collisions+'組／追加移動'+
  moved+'件／区域境界またぎ（9点判定）'+after.outside+'件'+
  (containment?'／文字箱の区域外相当量 '+containment.beforeOutside.toFixed(1)+
    '→'+(clearance?clearance.afterOutside:containment.afterOutside).toFixed(1):'')+
  (clearance?'／境界近接ラベル '+clearance.edgeRiskBefore+
    '→'+clearance.edgeRiskAfter:'')+'。';
 setStatus('拡大 '+zoom.toFixed(2)+'倍・文字 '+screenPx.toFixed(1)+'px・配置 '+
  (performance.now()-start).toFixed(0)+'ms');
}
function suggest(){
 const q=$('search').value.trim(),kanaQuery=NR.kana(q),
  container=$('suggestions');container.replaceChildren();
 if(!q){container.hidden=true;return;}
 const options=[];
 if(plate&&(plate.name.includes(q)||plate.reading?.includes(kanaQuery)))options.push({text:plate.name,sub:'山梨県・静岡県を横断するナンバー地域',sel:{type:'plate'}});
 for(const m of models){
  if(nameOf(m).includes(q)||m.name.includes(q)||m.code===q||
    m.reading?.includes(kanaQuery))
   options.push({text:nameOf(m),sub:m.prefecture+'・'+m.reading,
    sel:{type:'model',id:m.id}});
  if(options.length>=40)break;
 }
 for(const option of options){
  const btn=document.createElement('button');btn.type='button';
  btn.textContent=option.text;
  const small=document.createElement('small');small.textContent=option.sub;btn.append(small);
  btn.addEventListener('click',()=>{$('search').value=option.text;container.hidden=true;select(option.sel,true);});
  container.append(btn);
 }
 container.hidden=options.length===0;
}
function setModeOptions(area){
 const option=$('mode').querySelector('option[value="plate"]');
 option.disabled=area!=='fuji';
 if(area!=='fuji'&&$('mode').value==='plate')$('mode').value='municipality';
}
async function getTopology(code){
 if(sourceCache.has(code))return sourceCache.get(code);
 const response=await fetch('../data/national/2021/'+code+'.topojson');
 if(!response.ok)throw Error('地図データ '+code+' HTTP '+response.status);
 const value=await response.json();sourceCache.set(code,value);return value;
}
async function load(area,mode){
 const token=++runId;clearTimeout(renderTimer);
 const needed=catalog.prefectures.filter(p=>p.scope.includes(area));
 if(!needed.length)throw Error('表示地域のデータ定義がありません');
 setStatus(needed.length+'府県の地図データを読み込んでいます…');
 const pairs=await Promise.all(needed.map(async p=>[p.code,await getTopology(p.code)]));
 if(token!==runId)return;
 const topologies=Object.fromEntries(pairs);
 const grouped=N.registry(topologies,catalog,mode==='ward'?'ward':'municipality');
 const projected=N.project(grouped,E);
 if(token!==runId)return;
 models=NR.attach(projected.models,readingData,countyData);
 bounds=projected.bounds;
 const count=SCOPES[area].expected[mode==='ward'?'ward':'municipality'];
 if(models.length!==count)throw Error('区域件数が一致しません：'+models.length+'（期待 '+count+'）');
 plate=area==='fuji'?catalog.plates.find(p=>p.id==='fuji'):null;
 plateShape=null;
 if(plate){
  const members=N.plateMembers(models,plate);
  plateShape=N.joinPlateShape(members,E);
  plateShape.name=plate.name;
  if(!/^[ぁ-ゖー]+$/.test(plate.reading||''))
   throw Error('ナンバー地域名の読みが未登録です：'+plate.name);
  plateShape.readingParts=[{name:plate.name,reading:plate.reading}];
 }
 state={area,mode};
 // Compute only when geometry or municipality/ward mode changes.
 // Never move labels in response to zoom, pan, reading toggle, or selection.
 const referenceFont=7*bounds.w/390;
 const built=M.build(models,{
  fontSize:referenceFont,measure,
  rows:m=>L.rows(m)
 });
 fixedCenters=new Map(models.map((m,i)=>[m.id,built.anchors[i]]));
 fixedCorrections=built.adjusted;

 $('map-title').textContent=SCOPES[area].title+' — '+(
  mode==='plate'?'富士山ナンバー':mode==='ward'?'市区町村単位':'市町村単位')+
  '（'+models.length+'区域）';
 selection=mode==='plate'&&plate?{type:'plate'}:null;
 $('reading').disabled=false;
 $('clear').hidden=mode==='plate';
 $('interaction-guide').textContent=mode==='plate'
  ?'紫色が富士山ナンバーの区域です。市町村名は位置確認用に表示し、地図のタップによる詳細表示はありません。検索では対象市町村のナンバー名を調べられます。'
  :'ドラッグ・ピンチで地図を操作できます。区域をタップすると地名と読みを表示します。同じ区域の再タップ、地図の空白タップ、または「選択解除」で色を戻せます。';
 $('legend-blue').textContent=mode==='plate'?'その他（地名未登録）':'市区町村';
 $('legend-selected').textContent=mode==='plate'?'富士山ナンバー':'選択区域';
 fit();drawMap(topologies,projected.projectPoint);renderLabels();
 $('search').value='';$('suggestions').hidden=true;
}
async function refresh(){
 if(!catalog)return;
 $('area').disabled=$('mode').disabled=true;
 const area=$('area').value;setModeOptions(area);
 const mode=$('mode').value;
 try{await load(area,mode);}
 catch(err){console.error('National V2',err);setStatus('表示に失敗しました：'+err.message);$('selection').textContent='地図データを確認してください。';}
 finally{$('area').disabled=$('mode').disabled=false;}
}
$('area').addEventListener('change',()=>{
 $('mode').value=$('area').value==='fuji'?'plate':'municipality';refresh();
});
$('mode').addEventListener('change',refresh);
function syncReadingButton(){
 const pressed=$('reading').value==='on';
 $('reading-toggle').setAttribute('aria-pressed',String(pressed));
 $('reading-toggle').textContent=pressed?'よみがな ON':'よみがな';
}
$('reading-toggle').addEventListener('click',()=>{
 $('reading').value=$('reading').value==='on'?'off':'on';
 syncReadingButton();renderLabels();
});
$('reading').addEventListener('change',()=>{syncReadingButton();renderLabels();});
syncReadingButton();
$('density-mode').addEventListener('change',()=>{
 $('density-level').disabled=$('density-mode').value!=='adaptive';
 renderLabels();
});
$('density-level').disabled=$('density-mode').value!=='adaptive';
$('density-level').addEventListener('change',renderLabels);
$('zoom-in').addEventListener('click',()=>zoomBy(1.5));
$('zoom-out').addEventListener('click',()=>zoomBy(1/1.5));
$('reset').addEventListener('click',()=>{fit();renderLabels();});
$('clear').addEventListener('click',()=>select(state.mode==='plate'&&plate?{type:'plate'}:null));
$('clear-below').addEventListener('click',()=>select(null));
$('search').addEventListener('input',suggest);
$('search').addEventListener('keydown',e=>{
 if(e.key==='Escape')$('suggestions').hidden=true;
 if(e.key==='Enter'){
  const candidate=$('suggestions').querySelector('button');
  if(candidate){e.preventDefault();candidate.click();}
 }
});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.searchbox'))$('suggestions').hidden=true;});
map.addEventListener('click',e=>{
 if(state.mode==='plate'||performance.now()<skipClickUntil)return;
 const p=e.target.closest('path[data-id]');
 if(p)toggleMunicipality(p.getAttribute('data-id'));
 else select(null);
});
map.addEventListener('keydown',e=>{
 if(state.mode==='plate'||!['Enter',' '].includes(e.key))return;
 const p=e.target.closest('path[data-id]');
 if(p){e.preventDefault();toggleMunicipality(p.getAttribute('data-id'));}
});
map.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 const target=e.target.closest('path[data-id]');
 // Pointer capture can retarget the final click to the SVG itself on iOS.
 // Remember the original polygon so a stationary tap still selects it.
 for(const other of pointers.values())other.moved=true;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:pointers.size>0,
  targetId:target?.getAttribute('data-id')||null});
 try{map.setPointerCapture(e.pointerId);}catch(_){}
});
map.addEventListener('pointermove',e=>{
 const p=pointers.get(e.pointerId);if(!p)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 if(Math.abs(dx)+Math.abs(dy)>.6)p.moved=true;
 if(pointers.size===1)pan(dx,dy);
 if(pointers.size===2){
  const other=[...pointers].find(([id])=>id!==e.pointerId)?.[1];
  if(other){
   const old=Math.hypot(p.x-other.x,p.y-other.y);
   const now=Math.hypot(e.clientX-other.x,e.clientY-other.y);
   const rect=map.getBoundingClientRect();
   if(old>5&&now>5)zoomBy(now/old,
    Math.max(0,Math.min(1,((e.clientX+other.x)/2-rect.left)/rect.width)),
    Math.max(0,Math.min(1,((e.clientY+other.y)/2-rect.top)/rect.height)));
   pan(dx/2,dy/2);
  }
 }
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:p.moved,targetId:p.targetId});e.preventDefault();
});
for(const type of ['pointerup','pointercancel','lostpointercapture']){
 map.addEventListener(type,e=>{
  const p=pointers.get(e.pointerId);if(!p)return;
  pointers.delete(e.pointerId);
  if(state.mode!=='plate'&&type==='pointerup'&&!p.moved){
   if(p.targetId)toggleMunicipality(p.targetId);
   else select(null);
  }
  // A synthesized click must not select twice after pointer capture.
  skipClickUntil=performance.now()+280;
 });
}
map.addEventListener('wheel',e=>{
 if(!e.ctrlKey&&!e.metaKey)return;
 e.preventDefault();const r=map.getBoundingClientRect();
 zoomBy(e.deltaY<0?1.2:1/1.2,
  (e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);
},{passive:false});
window.addEventListener('resize',scheduleLabels);
(async()=>{
 try{
  const [catalogResponse,municipalitiesResponse,countiesResponse]=await Promise.all([
   fetch('../data/national/catalog.json?v=20261031-density'),
   fetch('../data/national/municipality-readings.json?v=20261031-shikoku'),
   fetch('../data/national/county-readings.json?v=20261031-shikoku')
  ]);
  if(!catalogResponse.ok||!municipalitiesResponse.ok||!countiesResponse.ok)
   throw Error('全国区域・読み仮名データ定義が読み込めません');
  [catalog,readingData,countyData]=await Promise.all([
   catalogResponse.json(),municipalitiesResponse.json(),countiesResponse.json()
  ]);
  const params=new URLSearchParams(location.search);
  const requested=params.get('area');
  if(requested&&SCOPES[requested]){
   $('area').value=requested;
   if(requested==='fuji')$('mode').value='plate';
  }
  setModeOptions($('area').value);await refresh();
 }catch(e){console.error('National V2 setup',e);setStatus('読み込みエラー：'+e.message);}
})();
})();
