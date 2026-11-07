// Shared V2 municipality quiz UI: Osaka pilot, two modes, one runtime.
(async()=>{'use strict';
const config=await (await fetch(document.documentElement.dataset.regionConfig||'./regions.json')).json(),regions=config.regions,byId=id=>document.getElementById(id),svg=byId('map'),choices=byId('rangeChoices'),status=byId('status');
const Core=window.KussoonV2RegionalQuiz;if(!Core)throw Error('共通クイズエンジンが読み込めません');
const W=850,H=700,renderer=KussoonV2MunicipalRenderer;
let viewport=KussoonV2MapViewport.init({svg,width:W,height:H}),frameHeight=H,prefectureView=false;
const query=new URLSearchParams(location.search),wanted=query.get('range')||query.get('studyRegion'),mode=query.get('mode')==='1'?1:2;
byId('pageTitle').textContent=mode===1?'クイズ1：地名から場所を当てる（V2試作）':'クイズ2：光っている場所は？（V2試作）';
document.title=(mode===1?'クイズ1':'クイズ2')+'｜'+config.name+' V2｜Kussoon';
svg.setAttribute('aria-label',mode===1?'名前から場所を当てる地図':'光っている場所の名前を当てる地図');
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));
}
const COUNTY_BY_TOWN={
 '豊能町':['豊能郡','とよのぐん'],'能勢町':['豊能郡','とよのぐん'],
 '島本町':['三島郡','みしまぐん'],'忠岡町':['泉北郡','せんぼくぐん'],
 '熊取町':['泉南郡','せんなんぐん'],'田尻町':['泉南郡','せんなんぐん'],'岬町':['泉南郡','せんなんぐん'],
 '太子町':['南河内郡','みなみかわちぐん'],'河南町':['南河内郡','みなみかわちぐん'],'千早赤阪村':['南河内郡','みなみかわちぐん']
};
function formatQuestionName(item){
  const county = COUNTY_BY_TOWN[item.name];
  // Keep the official quiz answer/code untouched; only the question's displayed name changes.
  const name = county ? county[0] + item.name : item.name;
  const townReading = item.reading || '';
  const reading = county ? county[1] + townReading : townReading;
  if(!reading) return escapeHtml(name);
  return `<ruby>${escapeHtml(name)}<rt>${escapeHtml(reading)}</rt></ruby>`;
}
let selectedRange=regions.some(r=>r.key===wanted)?wanted:regions[0].key;
byId('mapRegionName').textContent=regions.find(r=>r.key===selectedRange).name;
function updateRangeButtons(){for(const button of choices.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.key===selectedRange));}
for(const region of regions){const button=document.createElement('button');button.type='button';button.dataset.key=region.key;button.textContent=region.name+'（'+region.codes.length+'区域）';button.addEventListener('click',()=>setRange(region.key));choices.append(button);}updateRangeButtons();
let all=[],arcs=[],current=[],projection=null,session=null,startedOnce=false,retryOrder=[],proximity=null;
function scrollToQuestion(){requestAnimationFrame(()=>byId('question').scrollIntoView({behavior:'smooth',block:'start'}));}
function decodeArcs(t){return t.arcs.map(a=>{let x=0,y=0;return a.map(q=>{if(t.transform){x+=q[0];y+=q[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];}return q;});});}
function points(ids,a){const out=[];for(const id of ids){const part=id<0?a[~id].slice().reverse():a[id];out.push(...(out.length?part.slice(1):part));}return out;}
function polys(g,a){return g.type==='Polygon'?[g.arcs.map(ids=>points(ids,a))]:g.arcs.map(poly=>poly.map(ids=>points(ids,a)));}
function bounds(items){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const r of items)for(const poly of r.polys)for(const ring of poly)for(const [x,y] of ring){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return [minX,minY,maxX,maxY];}
function project(box){const cos=Math.cos((box[1]+box[3])*Math.PI/360),bw=Math.max((box[2]-box[0])*cos,.04),bh=Math.max(box[3]-box[1],.04),scale=Math.min((W-60)/bw,(frameHeight-60)/bh),lon=(box[0]+box[2])/2,lat=(box[1]+box[3])/2;return p=>[W/2+(p[0]-lon)*cos*scale,frameHeight/2-(p[1]-lat)*scale];}
function render(){
 renderer.render({map:svg,regions:all,arcs,project:projection,hideTitles:true});
 const active=new Set(current.map(x=>x.code));
 for(const shape of svg.querySelectorAll('path.land')){const code=shape.dataset.code;shape.classList.toggle('outside',!active.has(code));shape.querySelector('title')?.remove();shape.setAttribute('aria-label',active.has(code)?'出題範囲内の区域':'出題範囲外');}
 if(session){
  if(mode===2){const target=svg.querySelector('path.land[data-code="'+session.answer+'"]');if(target)target.classList.add(session.answered?'correct':'target');}
  else {
   for(const code of session.wrongCodes)svg.querySelector('path.land[data-code="'+code+'"]')?.classList.add('wrong');
   if(session.answered)svg.querySelector('path.land[data-code="'+session.answer+'"]')?.classList.add('correct');
  }
 }
}
function fitMap(items,isPrefecture=false){
 if(!items.length)return;
 // Preserve the established region framing; use the visible map's real aspect
 // ratio only for prefecture-wide display, with no space reserved for controls.
 const rect=svg.getBoundingClientRect();
 const targetHeight=isPrefecture&&rect.width>0&&rect.height>0
  ?Math.max(1,Math.round(W*rect.height/rect.width)):H;
 if(prefectureView!==isPrefecture||frameHeight!==targetHeight){
  viewport.destroy();
  frameHeight=targetHeight;
  viewport=KussoonV2MapViewport.init({svg,width:W,height:frameHeight});
 }
 prefectureView=isPrefecture;
 projection=project(bounds(items));
 viewport.reset();
 render();
}
function focus(){const region=regions.find(x=>x.key===selectedRange);byId('mapRegionName').textContent=region.name;current=all.filter(r=>region.codes.includes(r.code));if(!current.length)return;fitMap(current);status.textContent='';status.hidden=true;}
function setRange(key){if(!regions.some(r=>r.key===key))return;selectedRange=key;updateRangeButtons();session=null;retryOrder=[];byId('question').style.minHeight='';byId('question').textContent='';byId('question').hidden=true;byId('feedback').textContent='';byId('answerArea').hidden=true;byId('choices').hidden=true;byId('next').hidden=true;byId('start').disabled=!all.length;byId('start').hidden=false;byId('replayArea').hidden=true;byId('quit').hidden=true;if(all.length)focus();
 // Before the first quiz, keep the start button available. Later region taps start a new regional quiz.
 if(startedOnce&&all.length){start();}else{
  requestAnimationFrame(()=>byId('quizStartAnchor').scrollIntoView({behavior:'smooth',block:'start'}));
 }}
function shuffle(items){let a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function finishQuiz(){
 if(!session)return;
 const question=byId('question');
 question.style.minHeight=question.getBoundingClientRect().height+'px';
 question.hidden=false;
 const result=Core.finish(session);
 question.textContent='終了：'+result.correct+' / '+result.total+'問正解';
 retryOrder=result.missed;
 byId('retryMissed').hidden=retryOrder.length===0;
 byId('feedback').textContent='';
 byId('next').hidden=true;
 byId('choices').hidden=true;
 byId('answerArea').hidden=true;
 byId('start').hidden=true;
 byId('quit').hidden=true;
 byId('replayArea').hidden=false;
 session=null;
 render();
}
function show(){
 if(!session)return;
 if(session.index>=session.order.length){finishQuiz();return;}
 const item=Core.question(session);
 byId('question').hidden=false;
 byId('question').innerHTML=mode===1?(session.index+1)+' / '+session.order.length+'問：'+formatQuestionName(item)+'はどこ？':
  (session.index+1)+' / '+session.order.length+'問：光っている場所は？';
 byId('answerArea').hidden=false;
 byId('feedback').textContent='';byId('next').hidden=true;
 const list=byId('choices');
 list.replaceChildren();list.hidden=mode===1;
 if(mode===2){
  for(const option of proximity.options(item,current)){
   const button=document.createElement('button');button.type='button';button.dataset.code=option.code;
   button.innerHTML=formatQuestionName(option);
   button.addEventListener('click',()=>answer(option.code,button));
   list.append(button);
  }
 }
 render();
}
function start(orderOverride){
 const order=Array.isArray(orderOverride)?orderOverride:current;if(!order.length)return;
 byId('question').style.minHeight='';byId('replayArea').hidden=true;startedOnce=true;retryOrder=[];
 session=Core.start(order);
 byId('start').hidden=true;byId('quit').hidden=false;show();scrollToQuestion();
}
function answer(code,button){
 if(!session||session.answered||(mode===2&&button?.disabled))return;
 const selected=(mode===1?current:all).find(r=>r.code===code);if(!selected)return;
 const result=Core.answer(session,code);if(!result.accepted)return;
 if(!result.correct){
  if(mode===2){button.classList.add('wrong-choice');button.disabled=true;byId('feedback').textContent='違います。';}
  else {byId('feedback').textContent='違います。\\nそこは'+selected.name+'です。';render();}
  byId('next').hidden=true;return;
 }
 if(mode===2){
  button.classList.add('correct-choice');
  for(const choice of byId('choices').querySelectorAll('button'))choice.disabled=true;
 }else render();
 byId('feedback').textContent='正解です！';
 byId('next').textContent=session.index===session.order.length-1?'結果を見る':'次の問題';
 byId('next').hidden=false;
 if(mode===2)render();
}
svg.addEventListener('click',e=>{if(mode!==1)return;const node=e.target.closest('path.land');if(node)answer(node.dataset.code);});
function returnToRegions(){
 session=null;
 retryOrder=[];
 startedOnce=false;
 const question=byId('question');
 question.style.minHeight='';
 question.textContent='';
 question.hidden=true;
 byId('feedback').textContent='';
 byId('answerArea').hidden=true;
 byId('choices').hidden=true;
 byId('next').hidden=true;
 byId('quit').hidden=true;
 byId('replayArea').hidden=true;
 byId('start').hidden=false;
 byId('start').disabled=!all.length;
 render();
 window.scrollTo(0,0);
}
byId('start').onclick=start;byId('replay').onclick=start;byId('retryMissed').onclick=()=>start(retryOrder);byId('quit').onclick=finishQuiz;byId('returnRegions').onclick=returnToRegions;byId('next').onclick=()=>{if(!session)return;Core.next(session);show();};

byId('plus').onclick=()=>viewport.zoomIn();byId('minus').onclick=()=>viewport.zoomOut();byId('reset').onclick=()=>fitMap(current);byId('prefReset').onclick=()=>fitMap(all,true);
try{
 const [manifestRes,indexRes]=await Promise.all([fetch('/v2/data/national/2026-common/national-2026-pilot/manifest.json'),fetch('/v2/progressive-preview/label-index.json')]);
 if(!manifestRes.ok||!indexRes.ok)throw Error('全国データ索引の読み込みに失敗');
 const manifest=await manifestRes.json(),idx=await indexRes.json(),entry=manifest.entries.find(e=>e.pref===config.prefecture);
 if(!entry||idx.count!==1905)throw Error('全国索引の構成が不正');
 const res=await fetch('/v2/data/national/2026-common/'+entry.source);if(!res.ok)throw Error('2026年データの読み込みに失敗');
 const topo=await res.json(),index=new Map(idx.entries.filter(x=>x.pref===config.prefecture).map(x=>[x.code,x]));
 const shapes=topo.objects.municipalities.geometries;arcs=decodeArcs(topo);

 all=shapes.map(g=>{
  const code=String(g.properties.N03_007),indexed=index.get(code);
  const name=indexed?.fullName||indexed?.name||g.properties.N03_004;
  const reading=indexed?.reading||indexed?.kana||indexed?.ruby||'';
  return {code,name,reading,polys:polys(g,arcs)};
});
 proximity=Core.proximity(all,shapes);
 const keys=new Set(regions.flatMap(r=>r.codes));
 if(all.length!==config.expectedAreaCount||keys.size!==config.expectedAreaCount||all.some(r=>!keys.has(r.code)||!index.has(r.code)))throw Error('地域の行政区域コードが2026年版と一致しません');
 byId('start').disabled=false;byId('question').textContent='';byId('question').hidden=true;byId('choices').hidden=true;byId('answerArea').hidden=true;focus();
}catch(err){console.error(err);status.hidden=false;status.textContent='読み込みエラー：'+err.message;byId('question').textContent='地図を読み込めませんでした。';}
})();
