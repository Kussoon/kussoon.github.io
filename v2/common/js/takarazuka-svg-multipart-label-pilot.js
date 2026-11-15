/* Kussoon Takarazuka town SVG C-layout comparison, not formally adopted.
 * Original SVG geometry and town-reading register remain source-of-truth.
 * Unverified community readings are NOT invented or used as sort keys.\n * Candidate labels are geometry-only: NOT evidence of built-up residential areas.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const svg=d3.select('#map'),world=d3.select('#world'),areas=d3.select('#areas'),labels=d3.select('#labels');
const kana=new Intl.Collator('ja',{usage:'sort',sensitivity:'base',numeric:false});
const normalize=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('ja').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
let towns=[],byName=new Map(),communityNames=[],communityReadings={},communityChoice='';
let zoom,transform=d3.zoomIdentity,mapW=390,mapH=600,baseScale=1;
let selected='',blinkTimer=null,blinkOn=false,readingOn=false,fontPct=100,anchorMode='svg';
let quizMode=0,quizLastMode=0,quizOrder=[],quizIndex=0,quizScore=0,quizWrong=new Set(),quizWrongPlaces=new Set(),quizLocked=false,quizTimer=null,quizBlinkOn=false;
const townLabel=name=>name+(byName.get(name)?.reading?'（'+byName.get(name).reading+'）':'');
function getSize(){const b=$('map').getBoundingClientRect();return [Math.max(1,b.width),Math.max(1,b.height)]}
function active(){return communityChoice?towns.filter(t=>t.communities.includes(communityChoice)):towns}
function clearTownStyles(){areas.selectAll('path.town').classed('selected',false).classed('dim',false).classed('wrong',false)}
function stopBlink(){if(blinkTimer!==null)clearInterval(blinkTimer);blinkTimer=null;selected='';blinkOn=false;clearTownStyles()}
function highlight(name,on,wrong=false){areas.selectAll('path.town').filter(t=>t.name===name).classed('selected',on&&!wrong).classed('dim',false).classed('wrong',wrong)}
function choose(name){
 if(quizMode)return;
 if(selected===name){stopBlink();$('status').textContent=name+' の点滅を停止しました。';return}
 stopBlink();selected=name;blinkOn=true;
 const apply=()=>areas.selectAll('path.town').classed('selected',t=>t.name===name).classed('dim',t=>t.name===name&&!blinkOn);
 apply();blinkTimer=setInterval(()=>{blinkOn=!blinkOn;apply()},500);
 $('status').textContent=townLabel(name)+' を選択中です。';
}
function visibleBounds(items){
 if(!items.length)return null;
 const bounds=items.map(t=>t.bbox);
 return [[Math.min(...bounds.map(b=>b.x)),Math.min(...bounds.map(b=>b.y))],
 [Math.max(...bounds.map(b=>b.x+b.width)),Math.max(...bounds.map(b=>b.y+b.height))]];
}
function fit(items,padding=44){
 const bounds=visibleBounds(items);if(!bounds)return;
 const fit=KussoonTownSvgViewport.fitBounds(bounds,mapW,mapH,padding,.15,50);
 if(fit){baseScale=fit.scale;svg.call(zoom.transform,d3.zoomIdentity.translate(fit.x,fit.y).scale(fit.scale))}
}
function reset(){stopBlink();fit(active())}
function fontPixels(){
 const ratio=Math.max(.75,Math.min(2,Math.pow(1.18,Math.log2(Math.max(.1,transform.k/baseScale)))));
 return 9.5*ratio*fontPct/100;
}
// Manual candidate points for the nine multipart towns identified in the original SVG.
// These are geometry-verified DISPLAY candidates, not claims about residential land use.
const multipartCandidatePoints=Object.freeze({
 '中山五月台':[[664.8,1104.5],[611.7,1059.2]],
 '中筋':[[711.7,1270.2],[690.9,1138.8]],
 '伊孑志':[[590.3,1414.4],[392.6,1351.3]],
 '切畑':[[546.4,1229.9],[603.9,1202.2],[506.4,937.5]],
 '小林':[[574.9,1461.3],[320.9,1408.8]],
 '山本西':[[749.5,1259.9],[736.4,1230.8]],
 '米谷':[[617.1,1311.9],[569.1,1217.9]],
 '芝辻新田':[[403.1,498.5],[462.6,494.6],[434,537.6]],
 '鹿塩':[[493.6,1556.6],[581.6,1559.8]]
});
let candidateMode=false;
function verifiedCandidate(t,coords){
 if(!t.pathEl||typeof t.pathEl.isPointInFill!=='function')return null;
 const p=svg.node().createSVGPoint();p.x=coords[0];p.y=coords[1];
 try{return t.pathEl.isPointInFill(p)?coords:null}catch(_){return null}
}
function labelAnchor(t){
 // Unapproved candidate position: SVG bbox center; try a nearby fill point if necessary.
 const b=t.bbox,p=t.pathEl,cx=b.x+b.width/2,cy=b.y+b.height/2;
 const preferred=candidateMode&&multipartCandidatePoints[t.name]?.[0];
 if(preferred){const inside=verifiedCandidate(t,preferred);if(inside)return inside}
 // Original single-label comparison keeps the PR #492 鹿塩 anchor.
 const legacy=t.name==='鹿塩'?[493.6,1556.6]:null;
 if(legacy){const inside=verifiedCandidate(t,legacy);if(inside)return inside}
 if(typeof p.isPointInFill!=='function')return [cx,cy];
 try{
  const point=svg.node().createSVGPoint();
  point.x=cx;point.y=cy;
  if(p.isPointInFill(point))return [cx,cy];
  for(const r of [.15,.3,.45]){
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]]){
    point.x=cx+dx*b.width*r;point.y=cy+dy*b.height*r;
    if(p.isPointInFill(point))return [point.x,point.y];
   }
  }
 }catch(_){}
 return [cx,cy];
}
function labelEntries(){
 const entries=active().filter(t=>t.anchor.every(Number.isFinite)).map(t=>({
  name:t.name,reading:t.reading,anchor:t.anchor,key:t.name+':primary',secondary:false
 }));
 if(!candidateMode)return entries;
 for(const t of active()){
  for(const [i,p] of (multipartCandidatePoints[t.name]||[]).entries()){
   if(i===0)continue;
   const point=verifiedCandidate(t,p);
   if(point)entries.push({name:t.name,reading:t.reading,anchor:point,key:t.name+':extra:'+i,secondary:true});
  }
 }
 return entries;
}
function updateLabels(){
 const fs=fontPixels(),relativeZoom=transform.k/Math.max(.001,baseScale);
 const all=labels.selectAll('g.label');
 all.attr('transform',d=>'translate('+d.anchor[0]+','+d.anchor[1]+') scale('+(1/transform.k)+')');
 all.selectAll('text.town-label').attr('font-size',fs);
 all.selectAll('tspan.town-name').attr('y',readingOn?(-.48*fs):0);
 all.selectAll('tspan.town-reading').attr('y',.54*fs).attr('font-size',fs*.78);
 if(!candidateMode){all.style('display',null);return}
 // Collision rejection is screen-space based; when zoom increases, more labels fit.
 const used=[];
 const estimate=d=>{
  const x=transform.applyX(d.anchor[0]),y=transform.applyY(d.anchor[1]);
  const width=Math.max(d.name.length*fs*.96,readingOn?d.reading.length*fs*.78:0)+5;
  const height=fs*(readingOn?2.0:1.35)+4;
  return {x1:x-width/2,y1:y-height/2,x2:x+width/2,y2:y+height/2};
 };
 all.each(function(d){
  const el=d3.select(this);
  if(d.secondary&&relativeZoom<1.7){el.style('display','none');return}
  const b=estimate(d);
  // Skip labels outside of the viewport, but keep the SVG geometry untouched.
  if(b.x2<0||b.y2<0||b.x1>mapW||b.y1>mapH){el.style('display','none');return}
  const overlap=used.some(a=>!(b.x2<a.x1||a.x2<b.x1||b.y2<a.y1||a.y2<b.y1));
  el.style('display',overlap?'none':null);
  if(!overlap)used.push(b);
 });
}
function drawLabels(){
 const entries=labelEntries();
 const g=labels.selectAll('g.label').data(entries,d=>d.key).join('g').attr('class','label');
 g.each(function(t){
  const d=d3.select(this);d.selectAll('*').remove();
  const label=d.append('text').attr('class','town-label');
  label.append('tspan').attr('class','town-name').attr('x',0).text(t.name);
  if(readingOn)label.append('tspan').attr('class','town-reading').attr('x',0).text(t.reading);
 });
 updateLabels();
}
function render(){
 areas.selectAll('path.town').data(active(),t=>t.name).join('path')
  .attr('class','town').attr('d',t=>t.d).attr('data-name',t=>t.name)
  .attr('aria-label',t=>townLabel(t.name))
  .on('click',(event,t)=>{
   event.stopPropagation();
   if(quizMode===1){quizMapAnswer(t.name);return}
   if(quizMode===2)return;
   choose(t.name);
  });
 drawLabels();
}
function draw(){
 [mapW,mapH]=getSize();svg.attr('viewBox','0 0 '+mapW+' '+mapH);
 render();world.attr('transform',transform.toString());
}
function regionName(name){const reading=communityReadings[name];return name+(reading?'（'+reading+'）':'')}
function showCommunity(){
 stopQuiz(false);stopBlink();render();
 $('communityToggle').textContent=(communityChoice?regionName(communityChoice):'宝塚市全域（125町名）')+' ▾';
 $('communityCount').textContent=(communityChoice?regionName(communityChoice):'市全域')+'：'+active().length+'町名';
 $('reset').textContent=communityChoice?'区域全体':'市の全体';
 for(const b of $('communityOptions').querySelectorAll('button')){
  const on=b.dataset.community===communityChoice;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
 }
 fit(active());
}
function startCommunity(){
 const menu=$('communityOptions');menu.replaceChildren();
 // Kana-sorting requires all confirmed readings. Until then the established
 // registry order is preserved; this is never a guessed Japanese kana order.
 if(communityNames.every(c=>communityReadings[c])){
  communityNames=KussoonTownSvgUI.sortRegionsByReading(communityNames,communityReadings);
 }
 for(const name of ['',...communityNames]){
  const button=document.createElement('button');button.type='button';button.dataset.community=name;
  if(name){
   const strong=document.createElement('strong');strong.textContent=name;
   const small=document.createElement('small');small.textContent=communityReadings[name]||'読み確認中';
   button.append(strong,small);
  }else button.textContent='宝塚市全域';
  button.onclick=()=>{
   communityChoice=name;menu.hidden=true;$('communityToggle').setAttribute('aria-expanded','false');
   showCommunity();$('communityToggle').focus();
  };
  menu.append(button);
 }
 $('communityToggle').disabled=false;$('quizOne').disabled=false;$('quizTwo').disabled=false;
 showCommunity();
}
$('communityToggle').onclick=()=>{
 const menu=$('communityOptions');menu.hidden=!menu.hidden;
 $('communityToggle').setAttribute('aria-expanded',String(!menu.hidden));
};
document.addEventListener('pointerdown',event=>{
 if(!event.target.closest('#communityOptions')&&!event.target.closest('#communityToggle')){
  $('communityOptions').hidden=true;$('communityToggle').setAttribute('aria-expanded','false');
 }
});
function focusTown(name){
 const t=byName.get(name);if(!t)return false;
 const b=t.bbox;
 const fit=KussoonTownSvgViewport.fitBounds([[b.x,b.y],[b.x+b.width,b.y+b.height]],mapW,mapH,100,.15,50);
 if(!fit)return false;
 svg.call(zoom.transform,d3.zoomIdentity.translate(fit.x,fit.y).scale(fit.scale));
 choose(name);return true;
}
function changeZoom(f){KussoonTownSvgCore.zoomBy(svg,zoom,f,150)}
$('zoomIn').onclick=()=>changeZoom(2);$('zoomOut').onclick=()=>changeZoom(.5);
$('reset').onclick=reset;
$('smaller').onclick=()=>{fontPct=Math.max(75,fontPct-25);$('size').textContent='文字 '+fontPct+'%';updateLabels()};
$('larger').onclick=()=>{fontPct=Math.min(200,fontPct+25);$('size').textContent='文字 '+fontPct+'%';updateLabels()};
$('size').onclick=()=>{fontPct=100;$('size').textContent='文字 100%';updateLabels()};
$('reading').onclick=()=>{readingOn=!readingOn;$('reading').textContent='よみがな '+(readingOn?'ON':'OFF');$('reading').setAttribute('aria-pressed',String(readingOn));drawLabels()};
$('labelMode').onclick=()=>{
 candidateMode=!candidateMode;
 for(const t of towns)t.anchor=labelAnchor(t);
 $('labelMode').textContent=candidateMode?'配置：複数候補（比較中）':'配置：既存（比較中）';
 $('status').textContent=candidateMode?'複数輪郭9町の候補点と、ズームに応じたラベル表示を比較中です。':'従来の一地点ラベルへ戻しました。';
 drawLabels();
};
$('anchorMode').onclick=()=>{
 // Do not misrepresent a rectangle-derived guess as the approved C method.
 $('status').textContent='ラベル位置は比較試作の仮配置です。正式なC版の配置調整はまだ移植していません。';
};
$('fullscreen').onclick=()=>{
 document.body.classList.toggle('fullscreen');
 $('fullscreen').textContent=document.body.classList.contains('fullscreen')?'戻る':'全画面';
 setTimeout(()=>{draw();fit(active())},60);
};
function shuffle(arr){return [...arr].sort(()=>Math.random()-.5)}
function scoreLabel(){$('quizProgress').textContent=(quizIndex+1)+' / '+quizOrder.length+'問　得点 '+quizScore}
function stopQuizBlink(){if(quizTimer!==null)clearInterval(quizTimer);quizTimer=null;clearTownStyles()}
function stopQuiz(returnToMap){
 stopQuizBlink();quizMode=0;quizLocked=false;
 document.body.classList.remove('town-quiz-mode');
 $('quizPanel').hidden=true;$('quizResults').hidden=true;
 $('quizFeedback').textContent='';
 if(returnToMap)showCommunity();
}
function resetQuestion(){
 stopQuizBlink();quizWrongPlaces.clear();$('quizChoices').replaceChildren();
 $('quizNext').hidden=true;$('quizReveal').hidden=true;
 $('quizNext').textContent='次の問題へ';$('quizFeedback').textContent='';
}
function startQuiz(mode,forced){
 stopQuiz(false);stopBlink();
 const pool=forced&&forced.length?forced:active().map(t=>t.name);
 if(!pool.length)return;
 quizMode=mode;quizLastMode=mode;quizOrder=shuffle(pool);
 quizIndex=0;quizScore=quizOrder.length;quizWrong=new Set();quizLocked=false;
 $('quizResults').hidden=true;$('quizPanel').hidden=false;
 document.body.classList.add('town-quiz-mode');
 loadQuestion();
}
function candidates(target){
 const t=byName.get(target);
 const center=x=>[x.bbox.x+x.bbox.width/2,x.bbox.y+x.bbox.height/2];
 const [cx,cy]=center(t);
 const proximity=x=>{const [x1,y1]=center(x);return (x1-cx)**2+(y1-cy)**2};
 const all=towns.filter(x=>x.name!==target).sort((a,b)=>
  Number(b.communities.some(c=>t.communities.includes(c)))-Number(a.communities.some(c=>t.communities.includes(c))) || proximity(a)-proximity(b));
 return shuffle([target,...all.slice(0,3).map(x=>x.name)]);
}
function startQuizBlink(name){
 stopQuizBlink();quizBlinkOn=true;highlight(name,true);
 quizTimer=setInterval(()=>{quizBlinkOn=!quizBlinkOn;highlight(name,quizBlinkOn)},500);
}
function loadQuestion(){
 if(quizIndex>=quizOrder.length){finishQuiz();return}
 quizLocked=false;resetQuestion();scoreLabel();
 if(quizIndex===0)fit(active());
 const target=quizOrder[quizIndex];
 if(quizMode===1){
  $('quizQuestion').textContent='「'+townLabel(target)+'」の場所を押してください。';
  $('quizFeedback').textContent='地図の区域を押してください。';
  $('quizReveal').hidden=false;
 }else{
  $('quizQuestion').textContent='黄色く点滅する町名を選んでください。';
  for(const name of candidates(target)){
   const b=KussoonTownSvgUI.makeQuizChoice(document,name,byName.get(name).reading,quizChoiceAnswer);
   $('quizChoices').append(b);
  }
  startQuizBlink(target);
 }
}
function penalty(target){
 if(quizWrong.has(target))return;
 quizWrong.add(target);quizScore=Math.max(0,quizScore-1);
}
function quizMapAnswer(name){
 if(quizMode!==1||quizLocked)return;
 const target=quizOrder[quizIndex];
 if(name!==target){
  if(quizWrongPlaces.has(name))return;
  quizWrongPlaces.add(name);penalty(target);highlight(name,false,true);
  $('quizFeedback').textContent='違います。そこは「'+townLabel(name)+'」です。';
  scoreLabel();return;
 }
 quizCorrect(target);
}
function quizChoiceAnswer(name,button){
 if(quizMode!==2||quizLocked||button.disabled)return;
 const target=quizOrder[quizIndex];
 if(name!==target){
  penalty(target);button.disabled=true;button.classList.add('quiz-wrong');
  $('quizFeedback').textContent='違います。「'+townLabel(name)+'」ではありません。';
  scoreLabel();return;
 }
 quizCorrect(target);button.classList.add('quiz-correct');
 for(const b of $('quizChoices').children)b.disabled=true;
}
function quizCorrect(target){
 quizLocked=true;stopQuizBlink();highlight(target,true);
 $('quizFeedback').textContent='正解です！ '+townLabel(target);
 $('quizReveal').hidden=true;$('quizNext').hidden=false;
 $('quizNext').textContent=quizIndex===quizOrder.length-1?'結果発表':'次の問題へ';
 scoreLabel();
}
function quizReveal(){
 if(quizLocked)return;
 const target=quizOrder[quizIndex];penalty(target);quizCorrect(target);
 $('quizFeedback').textContent='答えは「'+townLabel(target)+'」です。';
}
function finishQuiz(quit=false){
 const answered=quizIndex+(quizLocked?1:0);
 const target=quit?quizOrder[quizIndex]:null;
 resetQuestion();quizMode=0;document.body.classList.remove('town-quiz-mode');
 $('quizPanel').hidden=true;$('quizResults').hidden=false;
 $('quizResult').textContent=quit?'途中終了：'+answered+' / '+quizOrder.length+'問終了（間違えた問題 '+quizWrong.size+'件）':
 quizOrder.length+'問中 '+quizScore+'点（間違えた問題 '+quizWrong.size+'件）';
 $('quizRetryWrong').hidden=quizWrong.size===0;$('quizRetryWrong').disabled=quizWrong.size===0;
 if(target&&byName.has(target)){
  choose(target);$('status').textContent='中断した問題：「'+townLabel(target)+'」を黄色く点滅表示しています。';
 }
}
$('quizOne').onclick=()=>startQuiz(1);
$('quizTwo').onclick=()=>startQuiz(2);
$('quizReveal').onclick=quizReveal;
$('quizNext').onclick=()=>{quizIndex++;loadQuestion()};
$('quizQuit').onclick=()=>finishQuiz(true);
$('quizRetryWrong').onclick=()=>startQuiz(quizLastMode,[...quizWrong]);
$('quizRetryAll').onclick=()=>startQuiz(quizLastMode);
$('quizBack').onclick=()=>stopQuiz(true);
zoom=KussoonTownSvgCore.attachZoom(svg,d3,event=>{
 transform=event.transform;world.attr('transform',transform.toString());if(candidateMode)drawLabels();else updateLabels();
},.15,50);
svg.on('click',()=>{if(!quizMode&&selected)stopBlink()});
KussoonTownSvgSourceAdapter.loadSvgTownSource({
 htmlPath:'/takarazuka/town-search.html',
 infoPath:'/takarazuka/data/takarazuka-town-info.json',
 expectedCount:125
}).then(data=>{
 towns=data.towns;byName=new Map(towns.map(t=>[t.name,t]));
 communityNames=[...new Set(towns.flatMap(t=>t.communities))];
 // Only verified data may provide region readings.
 for(const c of communityNames){const t=byName.get(c);if(t)communityReadings[c]=t.reading}
 if(communityNames.length!==20)throw Error('20地域の登録数に不整合があります: '+communityNames.length);
 areas.selectAll('path.town').data(towns,t=>t.name).join('path').attr('class','town').attr('d',t=>t.d);
 for(const t of towns){
  t.pathEl=[...areas.selectAll('path.town').nodes()].find(n=>n.__data__?.name===t.name);
  const b=t.pathEl.getBBox();t.bbox={x:b.x,y:b.y,width:b.width,height:b.height};
  t.anchor=labelAnchor(t);
 }
 draw();startCommunity();
 $('status').textContent='SVG描画：125町名・20地域読み込み完了（比較試作・未採用）。町を押すと点滅します。';
 const linked=new URLSearchParams(location.search).get('town');
 if(linked){
  if(byName.has(linked)){if(focusTown(linked))$('status').textContent='階層ナビゲーションから「'+townLabel(linked)+'」を表示しています。';}
  else $('status').textContent='指定の町名が見つかりませんでした。';
 }
 new ResizeObserver(()=>{
  const [w,h]=getSize();
  if(w!==mapW||h!==mapH){draw();fit(active())}
 }).observe($('map'));
}).catch(err=>{$('status').textContent='読み込み失敗：'+err.message;console.error(err)});
})();