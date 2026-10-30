/* Nishinomiya V2 paired collision-regression visualizer. No edits to production. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const E=window.KussoonLabelEngine,R=window.KussoonReadableLabels;
const state={groups:new Map(),ready:false};
function node(tag,attrs={}){
 const n=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));
 return n;
}
function pathData(rings){
 return rings.map(ring=>
   'M'+ring.map(p=>p.map(x=>Number(x).toFixed(2)).join(',')).join('L')+'Z').join('');
}
function focusedOverlaps(group,layouts){
 let count=0;
 for(let i=0;i<layouts.length;i++)for(let j=0;j<i;j++){
  if(!group.focus.includes(group.models[i].name) || !group.focus.includes(group.models[j].name))continue;
  const a=layouts[i].box,b=layouts[j].box;
  const area=Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*
    Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
  if(area>.01)count++;
 }
 return count;
}
function drawMap(svg,group,layouts,style,neighbors){
 const fragment=document.createDocumentFragment();
 for(const m of group.models){
  const focus=group.focus.includes(m.name);
  const path=node('path',{d:pathData(m.rings),class:focus?'shape focus':'shape'});
  fragment.append(path);
 }
 for(let i=0;i<layouts.length;i++){
  const l=layouts[i],focus=group.focus.includes(l.name);
  if(!focus && !neighbors)continue;
  const t=node('text',{
    x:l.x.toFixed(2),y:l.y.toFixed(2),
    class:focus?'primary focus':'primary',
    'font-size':l.size.toFixed(2),
    'stroke-width':(l.size*.19).toFixed(2)
  });
  t.textContent=l.primary;fragment.append(t);
  if(style==='both'){
    const ruby=node('text',{
      x:l.x.toFixed(2),y:(l.y+l.size*.90).toFixed(2),
      class:focus?'ruby focus':'ruby',
      'font-size':l.rubySize.toFixed(2),
      'stroke-width':(l.rubySize*.18).toFixed(2)
    });
    ruby.textContent=l.reading;fragment.append(ruby);
  }
 }
 svg.replaceChildren(fragment);
}
function render(){
 if(!state.ready)return;
 const group=state.groups.get($('group').value);
 if(!group)return;
 const style=$('style').value,font=Number($('font-size').value),zoom=Number($('zoom').value);
 const viewWidth=$('map-before').getBoundingClientRect().width || 360;
 const size=E.screenPixelsToSvgUnits(font,900/zoom,viewWidth);
 const measure=(s,n)=>Array.from(s).length*n;
 const old=R.planCenterFirstLabels(group.models,group.readings,style,size,measure,E,{
   anchor:'safe',shift:'none'
 });
 const next=R.planCenterFirstLabels(group.models,group.readings,style,size,measure,E,{
   anchor:'safe',shift:'adjacent'
 });
 const showNeighbors=$('neighbors').checked;
 drawMap($('map-before'),group,old,style,showNeighbors);
 drawMap($('map-after'),group,next,style,showNeighbors);
 for(const [which,labels] of [['before',old],['after',next]]){
  const overlaps=focusedOverlaps(group,labels);
  const moved=labels.filter(l=>group.focus.includes(l.name)&&Math.abs(l.step)>1e-6);
  $('stats-'+which).textContent=
    '重点'+group.focus.length+'町名はすべて表示。重点町同士の重なり：'+overlaps+'組。'+
    '上下移動：'+(moved.length?moved.map(l=>l.name+'（'+(l.step>0?'+':'')+
      l.step.toFixed(1)+'文字）').join('、'):'なし')+'。';
 }
 $('status').textContent=group.title+'：周囲を含む'+group.models.length+
   '町名で配置計算。重点6町名のうちこの画面では'+group.focus.length+
   '町名を比較しています。境界またぎ・文字の重複は許容します。';
}
for(const id of ['group','style','font-size','zoom','neighbors'])$(id).addEventListener('change',render);
const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>render()):null;
if(resize)resize.observe($('map-before'));
window.addEventListener('resize',render);
fetch('../tests/fixtures/nishinomiya-adjacent.json')
 .then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.json()})
 .then(data=>{
   if(!Array.isArray(data.groups)||data.groups.length!==2)throw Error('対象町域データが不完全です');
   for(const g of data.groups){
     const models=g.features.map(f=>({
       name:f.name,reading:f.reading,rings:f.rings,
       box:E.bbox(f.rings),centroid:E.centroid(f.rings),polylabel:E.polylabel(f.rings)
     }));
     const readings=Object.fromEntries(models.map(m=>[m.name,m.reading]));
     R.validateReadings(models,readings);
     if(g.focus.some(n=>!readings[n]))throw Error('重点町名が見つかりません: '+g.id);
     state.groups.set(g.id,{...g,models,readings});
   }
   state.ready=true;render();
 })
 .catch(error=>{
   $('status').textContent='町域データの読み込みに失敗しました：'+error.message;
 });
})();
