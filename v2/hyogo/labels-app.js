/* Hyogo 49 municipality/ward label V2 trial. Shapes use frozen source TopoJSON. */
(()=>{
'use strict';
const E=window.KussoonLabelEngine,R=window.KussoonReadableLabels,A=window.KussoonTopoRegionAdapter;
const NS='http://www.w3.org/2000/svg',$=id=>document.getElementById(id);
const svg=$('map'),pointers=new Map();
let models=[],items=[],selected=null,plateCodes=new Set(),allView={x:0,y:0,w:900,h:900},view={...allView};
let layoutTimer=null,zoomWheelArmed=false,dragged=false,suppressTapUntil=0;
function element(tag,attr={}){
 const el=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attr))el.setAttribute(k,String(v));
 return el;
}
function asPath(rings){
 return rings.map(r=>'M'+r.map(p=>p[0].toFixed(2)+','+p[1].toFixed(2)).join('L')+'Z').join('');
}
function clamp(){
 const minWidth=allView.w/16;
 view.w=Math.max(minWidth,Math.min(allView.w,view.w));
 view.h=view.w*allView.h/allView.w;
 const marginX=view.w*.12,marginY=view.h*.12;
 view.x=Math.max(-marginX,Math.min(allView.w-view.w+marginX,view.x));
 view.y=Math.max(-marginY,Math.min(allView.h-view.h+marginY,view.y));
}
function repaintView(){svg.setAttribute('viewBox',[view.x,view.y,view.w,view.h].join(' '));}
function schedule(){
 if(layoutTimer!==null)clearTimeout(layoutTimer);
 layoutTimer=setTimeout(()=>{layoutTimer=null;relayout()},140);
}
function zoom(factor,ax=.5,ay=.5){
 if(!Number.isFinite(factor)||factor<=0)return;
 const nextWidth=Math.max(allView.w/16,Math.min(allView.w,view.w/factor));
 const nextHeight=nextWidth*allView.h/allView.w;
 view.x+=(view.w-nextWidth)*ax;
 view.y+=(view.h-nextHeight)*ay;
 view.w=nextWidth;view.h=nextHeight;clamp();repaintView();schedule();
}
function pan(dx,dy){
 const rect=svg.getBoundingClientRect();
 if(rect.width<=0||rect.height<=0)return;
 view.x-=dx*view.w/rect.width;view.y-=dy*view.h/rect.height;
 clamp();repaintView();schedule();
}
const readings={
'神戸市':'こうべし','北区':'きたく','東灘区':'ひがしなだく','灘区':'なだく','中央区':'ちゅうおうく','兵庫区':'ひょうごく','長田区':'ながたく','須磨区':'すまく','垂水区':'たるみく','西区':'にしく',
'姫路市':'ひめじし','尼崎市':'あまがさきし','明石市':'あかしし','西宮市':'にしのみやし','洲本市':'すもとし','芦屋市':'あしやし','伊丹市':'いたみし','相生市':'あいおいし','豊岡市':'とよおかし','加古川市':'かこがわし','赤穂市':'あこうし','西脇市':'にしわきし','宝塚市':'たからづかし','三木市':'みきし','高砂市':'たかさごし','川西市':'かわにしし','小野市':'おのし','三田市':'さんだし','加西市':'かさいし','丹波篠山市':'たんばささやまし','養父市':'やぶし','丹波市':'たんばし','南あわじ市':'みなみあわじし','朝来市':'あさごし','淡路市':'あわじし','宍粟市':'しそうし','加東市':'かとうし','たつの市':'たつのし',
'猪名川町':'いながわちょう','多可町':'たかちょう','稲美町':'いなみちょう','播磨町':'はりまちょう','市川町':'いちかわちょう','福崎町':'ふくさきちょう','神河町':'かみかわちょう','太子町':'たいしちょう','上郡町':'かみごおりちょう','佐用町':'さようちょう','香美町':'かみちょう','新温泉町':'しんおんせんちょう'
};
function hiragana(value){return value.normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/\s+/g,'').toLowerCase();}
function reading(m){return m.major==='神戸市'?'こうべし'+(readings[m.name]||''):readings[m.name]||'';}
function matches(m,q){if(!q)return false;return displayName(m).includes(q)||hiragana(reading(m)).includes(hiragana(q))||m.code===q;}
function closeSuggestions(){const box=$('suggestions');box.hidden=true;box.replaceChildren();$('find').setAttribute('aria-expanded','false');}
function showSuggestions(){
 const q=$('find').value.trim(),box=$('suggestions');
 box.replaceChildren();
 if(!q){closeSuggestions();return;}
 const hits=models.map((m,i)=>({m,i})).filter(({m})=>matches(m,q)).slice(0,49);
 for(const {m,i} of hits){
  const button=document.createElement('button');button.type='button';button.className='suggestion';
  button.textContent=displayName(m);
  const sub=document.createElement('small');sub.textContent=reading(m);button.append(sub);
  button.addEventListener('click',()=>{$('find').value=displayName(m);closeSuggestions();setSelected(i,true);});
  box.append(button);
 }
 box.hidden=hits.length===0;$('find').setAttribute('aria-expanded',String(hits.length>0));
}
function displayName(m){
 if(m.major==='神戸市')return '神戸市'+m.name;
 if(m.major?.endsWith('郡'))return m.major+m.name;
 return m.name;
}
function setSelected(i,focus){
 if(!Number.isInteger(i)||i<0||i>=models.length)return;
 selected=i;
 if(focus){
  // Search selection should preserve geographic context instead of zooming into dense labels.
  view={...allView};
  repaintView();
  svg.scrollIntoView({behavior:'smooth',block:'center'});
 }
 items.forEach((item,j)=>{
  item.path.classList.toggle('selected',j===selected);
  item.text.classList.toggle('selected',j===selected);
 });
 const m=models[i];
 $('selection').textContent=displayName(m)+
   ($('use-case').value==='plate'?'／ナンバー地域名：'+(plateCodes.has(m.code)?'姫路':'神戸'):'')+
   '／行政区域コード '+m.code;
 schedule();
}
function applyMapTheme(){
 const plateMode=$('use-case').value==='plate';
 $('legend').hidden=!plateMode;
 svg.classList.toggle('plate-mode',plateMode);
 for(let i=0;i<models.length;i++){
  const path=items[i].path,code=models[i].code;
  path.classList.toggle('plate-kobe',plateMode&&!plateCodes.has(code));
  path.classList.toggle('plate-himeji',plateMode&&plateCodes.has(code));
  if(plateMode){path.removeAttribute('tabindex');path.removeAttribute('role');}
  else{path.setAttribute('tabindex','0');path.setAttribute('role','button');}
 }
 if(plateMode&&selected===null)
  $('selection').textContent='市町村名と凡例の色分けから、神戸・姫路のナンバー地域を直接確認できます。地図のタップ操作は不要です。';
}
function initMap(){
 svg.replaceChildren();
 const shapes=element('g'),labels=element('g',{'aria-hidden':'true'});
 items=models.map((m,i)=>{
  const path=element('path',{d:asPath(m.rings),
    class:m.major==='神戸市'?'shape ward':'shape',
    'data-index':i,tabindex:0,role:'button',
    'aria-label':m.major==='神戸市'?'神戸市'+m.name:m.name});
  const title=element('title');
  title.textContent=m.major==='神戸市'?'神戸市'+m.name:m.name;path.append(title);shapes.append(path);
  const text=element('text',{class:'name'});
  text.textContent=m.name;labels.append(text);
  return {path,text};
 });
 svg.append(shapes,labels);
 applyMapTheme();
 svg.addEventListener('click',event=>{
  zoomWheelArmed=true;
  if($('use-case').value==='plate'||performance.now()<suppressTapUntil)return;
  const target=event.target.closest('.shape');
  if(target)setSelected(Number(target.dataset.index),false);
 });
 svg.addEventListener('keydown',event=>{
  if($('use-case').value==='plate'||(event.key!=='Enter'&&event.key!==' '))return;
  const target=event.target.closest('.shape');
  if(!target)return;
  event.preventDefault();setSelected(Number(target.dataset.index),false);
 });
 svg.addEventListener('wheel',event=>{
  if(!zoomWheelArmed)return;
  event.preventDefault();
  const rect=svg.getBoundingClientRect();
  zoom(event.deltaY<0?1.2:1/1.2,
    (event.clientX-rect.left)/rect.width,
    (event.clientY-rect.top)/rect.height);
 },{passive:false});
 svg.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  zoomWheelArmed=true;dragged=false;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  try{svg.setPointerCapture(event.pointerId)}catch(_){}
 });
 svg.addEventListener('pointermove',event=>{
  const old=pointers.get(event.pointerId);if(!old)return;
  const dx=event.clientX-old.x,dy=event.clientY-old.y;
  if(Math.abs(dx)+Math.abs(dy)>.7)dragged=true;
  if(pointers.size===1)pan(dx,dy);
  else if(pointers.size===2){
   const other=[...pointers].find(([id])=>id!==event.pointerId)?.[1];
   if(other){
    const prev=Math.hypot(old.x-other.x,old.y-other.y);
    const next=Math.hypot(event.clientX-other.x,event.clientY-other.y);
    const rect=svg.getBoundingClientRect();
    if(prev>1&&next>1)zoom(next/prev,
      ((event.clientX+other.x)/2-rect.left)/rect.width,
      ((event.clientY+other.y)/2-rect.top)/rect.height);
    pan(dx/2,dy/2);
   }
  }
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  event.preventDefault();
 });
 function end(event){
  if(!pointers.has(event.pointerId))return;
  pointers.delete(event.pointerId);
  if(dragged)suppressTapUntil=performance.now()+230;
 }
 for(const event of ['pointerup','pointercancel','lostpointercapture'])
  svg.addEventListener(event,end);
 document.addEventListener('pointerdown',event=>{
  if(!event.target.closest('#map'))zoomWheelArmed=false;
 });
}
function textMeasure(){
 const ctx=document.createElement('canvas').getContext('2d');
 const memo=new Map();
 return (value,size)=>{
  const key=value+'|'+size;
  if(memo.has(key))return memo.get(key);
  let width=[...value].length*size;
  if(ctx){
   ctx.font='850 '+size+'px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
   width=ctx.measureText(value).width;
  }
  memo.set(key,width);return width;
 };
}
// Measure the actually rendered SVG text, including Kobe's two-line tspans.
function visualLabelStats(labels,shown){
 const boxes=items.map((item,i)=>{
  if(!shown[i])return null;
  const t=item.text;
  try{
   const b=t.getBBox(),padding=Number(t.getAttribute('stroke-width')||0)/2;
   if(!Number.isFinite(b.width)||!Number.isFinite(b.height)||b.width<=0||b.height<=0)return null;
   return {x1:b.x-padding,y1:b.y-padding,x2:b.x+b.width+padding,y2:b.y+b.height+padding};
  }catch(_){return null;}
 });
 const visible=boxes.map((b,i)=>b&&b.x2>=view.x&&b.x1<=view.x+view.w&&
  b.y2>=view.y&&b.y1<=view.y+view.h?i:-1).filter(i=>i>=0);
 let collisions=0,outside=0;
 for(let a=0;a<visible.length;a++){
  const i=visible[a],b=boxes[i],m=models[i];
  const xs=[b.x1,(b.x1+b.x2)/2,b.x2],ys=[b.y1,(b.y1+b.y2)/2,b.y2];
  if(xs.some(x=>ys.some(y=>!E.isInside(x,y,m.rings))))outside++;
  for(let c=0;c<a;c++){
   const other=boxes[visible[c]];
   if(Math.min(b.x2,other.x2)-Math.max(b.x1,other.x1)>.01&&
      Math.min(b.y2,other.y2)-Math.max(b.y1,other.y1)>.01)collisions++;
  }
 }
 return {visible:visible.length,collisions,outside};
}
function relayout(){
 if(models.length===0)return;
 const start=performance.now(),rect=svg.getBoundingClientRect();
 const px=Number($('font').value);
 const fontSize=E.screenPixelsToSvgUnits(px,view.w,rect.width||390);
 const measure=textMeasure();
 // Measure the complete county-and-town label (e.g. 川辺郡猪名川町);
 // keep the original short name and administrative codes in the data model.
 const measuredModels=models.map(m=>m.major?.endsWith('郡')?{...m,name:displayName(m)}:m);
 const labels=R.planCenterFirstLabels(measuredModels,null,'kanji',fontSize,measure,E,{
  anchor:$('anchor').value,shift:$('shift').value
 });
 const mode=$('names').value,show=models.map(m=>mode==='all'||
  (mode==='wards'?m.major==='神戸市':m.major!=='神戸市'));
 const flag=$('boundaries').checked;
 labels.forEach((l,i)=>{
  const t=items[i].text;
  t.style.display=show[i]?'':'none';
  const kobeWard=models[i].major==='神戸市';
  if(kobeWard){
   // Keep the geographic anchor at the midpoint of both rows.
   const top=element('tspan',{x:l.x.toFixed(2),dy:(-l.size*.58).toFixed(2)});
   top.textContent='神戸市';
   const bottom=element('tspan',{x:l.x.toFixed(2),dy:(l.size*1.16).toFixed(2)});
   bottom.textContent=models[i].name;
   t.replaceChildren(top,bottom);
  }else{
   t.textContent=l.primary;
  }
  t.setAttribute('x',l.x.toFixed(2));
  t.setAttribute('y',l.y.toFixed(2));
  t.setAttribute('font-size',l.size.toFixed(2));
  t.setAttribute('stroke-width',(l.size*.17).toFixed(2));
  t.style.fill=flag&&l.fit<9?'#b13c34':'';
 });
 const stats=R.evaluateVisible(models,labels,show,E,view);
 const visual=visualLabelStats(labels,show);
 const vals=[
  ['県内の対象区域',models.length+'件'],
  ['表示対象ラベル',stats.shown+'件'],
  ['表示範囲内のラベル',visual.visible+'件'],
  ['表示文字の重なり（2段含む・概算）',visual.collisions+'組'],
  ['表示文字の境界またぎ（概算）',visual.outside+'件'],
  ['上下位置を微調整',stats.moved+'件']
 ];
 const cells=vals.map(([title,value])=>{
  const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
  dt.textContent=title;dd.textContent=value;div.append(dt,dd);return div;
 });
 $('metrics').replaceChildren(...cells);
 $('status').textContent='文字'+px+'px（画面上で固定）、拡大'+
   (allView.w/view.w).toFixed(2)+'倍。配置計算'+
   (performance.now()-start).toFixed(1)+'ms。重複による非表示なし。';
}
function wire(){
 $('find').addEventListener('input',showSuggestions);
 $('find').addEventListener('keydown',event=>{if(event.key==='Escape')closeSuggestions();});
 document.addEventListener('pointerdown',event=>{if(!event.target.closest('.search-field'))closeSuggestions();});
 for(const id of ['anchor','shift','font','names','boundaries'])$(id).addEventListener('change',relayout);
 $('use-case').addEventListener('change',()=>{
  applyMapTheme();
  if($('use-case').value==='plate'){
    // No municipality tap-to-reveal UI in plate mode; colors are self-explanatory.
    selected=null;
    items.forEach(item=>{
      item.path.classList.remove('selected');
      item.text.classList.remove('selected');
    });
    $('selection').textContent='市町村名と凡例の色分けから、神戸・姫路のナンバー地域を直接確認できます。地図のタップ操作は不要です。';
  }else if(selected!==null)setSelected(selected,false);
  else $('selection').textContent='市町・区の形をタップすると名前が分かります。';
  relayout();
 });
 $('zoom-in').addEventListener('click',()=>zoom(1.4));
 $('zoom-out').addEventListener('click',()=>zoom(1/1.4));
 $('reset').addEventListener('click',()=>{view={...allView};repaintView();relayout()});
 $('find-form').addEventListener('submit',event=>{
  event.preventDefault();
  const query=$('find').value.trim();
  const exact=models.findIndex(m=>displayName(m)===query||m.name===query||m.code===query||hiragana(reading(m))===hiragana(query));
  if(exact!==-1){closeSuggestions();setSelected(exact,true);return}
  const hits=models.flatMap((m,i)=>matches(m,query)?[i]:[]);
  if(hits.length===1){closeSuggestions();setSelected(hits[0],true)}
  else $('selection').textContent=hits.length?'候補：'+hits.map(i=>displayName(models[i])).join('、'):'該当する区域がありません。';
 });
 window.addEventListener('resize',schedule);
}
// Open the existing shared test directly in plate mode when requested.
if(new URLSearchParams(window.location.search).get('mode')==='plate'){
 $('use-case').value='plate';
}
wire();
Promise.all([
 fetch('../data/hyogo/hyogo-city.topojson').then(r=>{
  if(!r.ok)throw Error('境界 HTTP '+r.status);return r.json();
 }),
 fetch('../data/hyogo/plate-assignment.json').then(r=>{
  if(!r.ok)throw Error('ナンバー地域名 HTTP '+r.status);return r.json();
 })
]).then(([topo,plate])=>{
 const regions=A.decodeTopology(topo,'city');
 const projected=A.projectRegions(regions,E,{width:900,padding:30,referenceLatitude:35});
 models=projected.models;
 if(models.length!==49||models.filter(m=>m.major==='神戸市').length!==9)
  throw Error('49区域または神戸市9区のデータが一致しません');
 if(plate.defaultPlate!=='神戸'||plate.otherPlate!=='姫路'||
    !Array.isArray(plate.otherPlateMunicipalityCodes))
  throw Error('ナンバー地域名のデータ構造が不正です');
 plateCodes=new Set(plate.otherPlateMunicipalityCodes);
 if(plateCodes.size!==plate.otherPlateMunicipalityCodes.length ||
    [...plateCodes].some(code=>!models.some(m=>m.code===code)))
  throw Error('ナンバー地域名コードと市町・区が一致しません');
 allView=projected.bounds;view={...allView};repaintView();

 initMap();relayout();
}).catch(e=>{
 console.error('Hyogo 49 V2 label trial',e);
 $('status').textContent='地図の読込みに失敗しました：'+e.message;
});
})();
