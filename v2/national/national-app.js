/* National municipality V2 - eight-prefecture foundation experiment.
 * Shared geometry, a 5-digit municipal-code registry and cross-prefecture overlays.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const E=window.KussoonLabelEngine,R=window.KussoonReadableLabels;
const C=window.KussoonCollisionRefinement,N=window.KussoonNationalBoundaries;
const map=$('map');
const sourceCache=new Map(),pointers=new Map();
const SCOPES={kansai:{title:'関西2府4県',expected:{municipality:198,ward:245}},fuji:{title:'山梨県・静岡県',expected:{municipality:62,ward:70}}};
let catalog=null,models=[],bounds={x:0,y:0,w:900,h:900},view={...bounds};
let drawing=[],labelNodes=[],outlineNodes=[],selection=null,plate=null,plateShape=null;
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
 const newWidth=Math.max(bounds.w/18,Math.min(bounds.w,view.w/factor));
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
 if(chosen){
  $('selection').textContent=nameOf(chosen)+'（'+chosen.prefecture+'・行政区域コード '+chosen.code+'）';
 }else if(selection?.type==='plate'&&plate){
  const members=N.plateMembers(models,plate);
  const grouped={};
  for(const m of members)(grouped[m.prefecture]??=[]).push(m.name);
  const summary=Object.entries(grouped).map(([pref,values])=>pref+' '+values.length+'市町村').join('＋');
  $('selection').textContent='富士山ナンバー：'+summary+'。合計'+members.length+'市町村を県境を越えて一つの地域として表示しています。';
 }else $('selection').textContent='市区町村をタップすると選択できます。';
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
 if(scroll){fit();renderLabels();map.scrollIntoView({behavior:'smooth',block:'center'});}
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
 for(const model of models){
  const p=tag('path',{d:pathData(model.rings),class:'land',tabindex:0,role:'button',
   'aria-label':nameOf(model),'data-id':model.id});
  const title=tag('title');title.textContent=nameOf(model);p.append(title);
  shapeLayer.append(p);drawing.push({node:p,model});
 }
 if(state.mode==='plate'&&plate){
  const t=tag('text',{class:'place-label'});
  t.textContent=plate.name;labelLayer.append(t);
  labelNodes.push({node:t,model:null});
 }else{
  for(const model of models){
   const t=tag('text',{class:'place-label'});
   t.textContent=model.name;labelLayer.append(t);
   labelNodes.push({node:t,model});
  }
 }
 map.replaceChildren(shapeLayer,outlines,labelLayer);
 highlight();
}
function labelSize(zoom){
 return Math.min(24,16+Math.min(2,Math.max(0,zoom-1)*.18));
}
const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
function measure(value,size){
 if(!ctx)return [...value].length*size;
 ctx.font='850 '+size+'px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
 return ctx.measureText(value).width;
}
function renderLabels(){
 if(!models.length)return;
 const start=performance.now(),zoom=bounds.w/view.w,screenPx=labelSize(zoom);
 const rect=map.getBoundingClientRect();
 const ratio=Math.min((rect.width||390)/view.w,(rect.height||390)/view.h);
 if(!(ratio>0))return;
 const size=screenPx/ratio;
 let workModels=state.mode==='plate'&&plateShape?[plateShape]:models;
 // Plate labels and administrative labels use the same centroid-first engine.
 const original=R.planCenterFirstLabels(workModels,null,'kanji',size,measure,E,{
  anchor:'balanced',shift:'adjacent'
 });
 const result=C.refine(workModels,original,size,E,{view,passes:3,
  pinned:selection?.type==='model'?models.findIndex(m=>m.id===selection.id):-1
 });
 result.labels.forEach((position,i)=>{
  const target=labelNodes[i]?.node;
  if(!target)return;
  target.setAttribute('x',position.x.toFixed(2));
  target.setAttribute('y',position.y.toFixed(2));
  target.setAttribute('font-size',size.toFixed(2));
  target.setAttribute('stroke-width',(size*.18).toFixed(2));
 });
 const before=R.evaluateVisible(workModels,original,workModels.map(()=>true),E,view);
 const after=R.evaluateVisible(workModels,result.labels,workModels.map(()=>true),E,view);
 $('metrics').textContent='表示単位 '+models.length+'区域／画面内ラベル '+after.inView+
  '件／文字の重なり（概算）'+before.collisions+'→'+after.collisions+'組／追加移動'+
  result.moved+'件／区域外 '+after.outside+'件。';
 setStatus('拡大 '+zoom.toFixed(2)+'倍・文字 '+screenPx.toFixed(1)+'px・配置 '+
  (performance.now()-start).toFixed(0)+'ms');
}
function suggest(){
 const q=$('search').value.trim(),container=$('suggestions');container.replaceChildren();
 if(!q){container.hidden=true;return;}
 const options=[];
 if(plate&&plate.name.includes(q))options.push({text:plate.name,sub:'山梨県・静岡県を横断するナンバー地域',sel:{type:'plate'}});
 for(const m of models){
  if(nameOf(m).includes(q)||m.name.includes(q)||m.code===q)
   options.push({text:nameOf(m),sub:m.prefecture,sel:{type:'model',id:m.id}});
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
 models=projected.models;bounds=projected.bounds;
 const count=SCOPES[area].expected[mode==='ward'?'ward':'municipality'];
 if(models.length!==count)throw Error('区域件数が一致しません：'+models.length+'（期待 '+count+'）');
 plate=area==='fuji'?catalog.plates.find(p=>p.id==='fuji'):null;
 plateShape=null;
 if(plate){
  const members=N.plateMembers(models,plate);
  plateShape=N.joinPlateShape(members,E);
  plateShape.name=plate.name;
 }
 state={area,mode};
 $('map-title').textContent=SCOPES[area].title+' — '+(
  mode==='plate'?'富士山ナンバー':mode==='ward'?'市区町村単位':'市町村単位')+
  '（'+models.length+'区域）';
 selection=mode==='plate'&&plate?{type:'plate'}:null;
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
$('zoom-in').addEventListener('click',()=>zoomBy(1.5));
$('zoom-out').addEventListener('click',()=>zoomBy(1/1.5));
$('reset').addEventListener('click',()=>{fit();renderLabels();});
$('clear').addEventListener('click',()=>select(state.mode==='plate'&&plate?{type:'plate'}:null));
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
 if(performance.now()<skipClickUntil)return;
 const p=e.target.closest('path[data-id]');
 if(p)select({type:'model',id:p.getAttribute('data-id')});
});
map.addEventListener('keydown',e=>{
 if(!['Enter',' '].includes(e.key))return;
 const p=e.target.closest('path[data-id]');
 if(p){e.preventDefault();select({type:'model',id:p.getAttribute('data-id')});}
});
map.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:false});
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
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:p.moved});e.preventDefault();
});
for(const type of ['pointerup','pointercancel','lostpointercapture']){
 map.addEventListener(type,e=>{
  const p=pointers.get(e.pointerId);if(!p)return;
  pointers.delete(e.pointerId);
  if(p.moved)skipClickUntil=performance.now()+280;
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
  const response=await fetch('../data/national/catalog.json');
  if(!response.ok)throw Error('全国区域データ定義がありません');
  catalog=await response.json();
  const params=new URLSearchParams(location.search);
  if(params.get('area')==='fuji'){$('area').value='fuji';$('mode').value='plate';}
  setModeOptions($('area').value);await refresh();
 }catch(e){console.error('National V2 setup',e);setStatus('読み込みエラー：'+e.message);}
})();
})();
