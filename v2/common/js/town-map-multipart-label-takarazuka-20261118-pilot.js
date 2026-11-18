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
// Verified district names and readings. Official municipal school kana and area names are
// the primary source; 宝小（ほうしょう） also checked against local school nickname sources.
// Source notes: v2/docs/town-map/TAKARAZUKA_20_REGION_READINGS_20261116.md.
const VERIFIED_COMMUNITY_READINGS=Object.freeze({"すみれガ丘":"すみれがおか","長尾台":"ながおだい","逆瀬台":"さかせだい","小浜":"こはま","西谷":"にしたに","中山台":"なかやまだい","長尾":"ながお","売布":"めふ","宝塚第一":"たからづかだいいち","良元":"りょうげん","末成":"すえなり","仁川":"にがわ","末広":"すえひろ","光明":"こうみょう","西山":"にしやま","高司":"たかつかさ","安倉":"あくら","宝小":"ほうしょう","美座":"みざ","山本山手":"やまもとやまて"});
let towns=[],byName=new Map(),communityNames=[],communityReadings={},communityChoice='',adjacency=new Map();
let zoom,transform=d3.zoomIdentity,mapW=390,mapH=600,baseScale=1;
let selected='',blinkTimer=null,blinkOn=false,readingOn=false,fontPct=100,anchorMode='svg';
// Nationwide shared quiz state: same contract used by Nishinomiya V34.
let quizSession=null;
let quizMode=0,quizLastMode=0,quizOrder=[],quizIndex=0,quizScore=0,quizWrong=new Set(),quizWrongPlaces=new Set(),quizLocked=false,quizTimer=null,quizBlinkOn=false;
function syncQuizFromSession(){
 quizMode=quizSession.mode;quizOrder=quizSession.order;quizIndex=quizSession.index;
 quizScore=quizSession.score;quizWrong=quizSession.wrong;quizWrongPlaces=quizSession.wrongPlaces;
 quizLocked=quizSession.locked;
}
const townLabel=name=>name+(byName.get(name)?.reading?'（'+byName.get(name).reading+'）':'');
function getSize(){const b=$('map').getBoundingClientRect();return [Math.max(1,b.width),Math.max(1,b.height)]}
function active(){return communityChoice?towns.filter(t=>t.communities.includes(communityChoice)):towns}
function clearTownStyles(){areas.selectAll('path.town').classed('selected',false).classed('dim',false).classed('wrong',false)}
function stopBlink(){if(blinkTimer!==null)clearInterval(blinkTimer);blinkTimer=null;selected='';blinkOn=false;clearTownStyles();updateLabels()}
function highlight(name,on,wrong=false){areas.selectAll('path.town').filter(t=>t.name===name).classed('selected',on&&!wrong).classed('dim',false).classed('wrong',wrong)}
function choose(name){
 if(quizMode)return;
 if(selected===name){stopBlink();$('status').textContent=name+' の点滅を停止しました。';return}
 stopBlink();selected=name;blinkOn=true;updateLabels();
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
 return 8*ratio*fontPct/100;
}
// All anchors derive from source SVG geometry: no named-town coordinates.
let candidateMode=true,sourceArea=1000*1700;
function verifiedCandidate(t,coords){
 if(!t.pathEl||typeof t.pathEl.isPointInFill!=='function')return null;
 const p=svg.node().createSVGPoint();p.x=coords[0];p.y=coords[1];
 try{return t.pathEl.isPointInFill(p)?coords:null}catch(_){return null}
}
function labelAnchor(t){
 const b=t.bbox,p=t.pathEl,cx=b.x+b.width/2,cy=b.y+b.height/2;
 if(typeof p.isPointInFill!=='function')return [cx,cy];
 const point=svg.node().createSVGPoint();
 for(const [x,y] of [[cx,cy],...([.15,.3,.45].flatMap(r=>
  [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]].map(([dx,dy])=>[cx+dx*b.width*r,cy+dy*b.height*r])))]){
  point.x=x;point.y=y;
  if(p.isPointInFill(point))return [x,y];
 }
 return [cx,cy];
}
function labelEntries(){
 if(!candidateMode)return active().map(t=>({name:t.name,reading:t.reading,anchor:t.legacyAnchor,key:t.name+':primary',secondary:false}));
 return active().flatMap(t=>t.autoCandidates.map((c,i)=>({
  name:t.name,reading:t.reading,anchor:c.point,key:t.name+':component:'+i,
  secondary:i>0,componentArea:c.area
 })));
}
// Visibility-first A/B pilot: a readable town name may overlap its neighbours.
// This mirrors the permanent-tooltip priority of Nishinomiya's approved C baseline.
// Keep every first (primary) component label as soon as its anchor enters the viewport.
// Additional detached components become eligible with a modest zoom, not 1.7x.
function updateLabels(){
 const fs=fontPixels(),relativeZoom=transform.k/Math.max(.001,baseScale);
 const all=labels.selectAll('g.label');
 all.attr('transform',d=>'translate('+d.anchor[0]+','+d.anchor[1]+') scale('+(1/transform.k)+')');
 all.selectAll('text.town-label').attr('font-size',fs);
 all.selectAll('tspan.town-name').attr('y',readingOn?(-.48*fs):0);
 all.selectAll('tspan.town-reading').attr('y',.54*fs).attr('font-size',fs*.78);
 if(!candidateMode){all.style('display',null).attr('data-visible','true');updateDensityStatus();return}
 const frame=$('map').getBoundingClientRect();
 for(const node of all.nodes()){
  const d=node.__data__;
  // Never hide a primary label merely because text overlaps another label.
  // One secondary label per independent SVG polygon may also overlap after 1.15x.
  node.style.display='';
  const rect=node.getBoundingClientRect();
  const visible=KussoonTownSvgLabelVisibility.visible({
   secondary:d.secondary,zoomRatio:relativeZoom,selected:d.name===selected,
   rect,frame,threshold:1.15,clipToViewport:true
  });
  node.style.display=visible?'':'none';
  node.dataset.visible=String(visible);
 }
 updateDensityStatus();
}
function updateDensityStatus(){
 const groups=labels.selectAll('g.label').nodes(),shown=groups.filter(el=>el.dataset.visible==='true');
 const unique=new Set(shown.map(el=>el.__data__.name));
 const info=$('densityStatus');
 if(info)info.textContent='ラベル表示優先 '+shown.length+' / 候補 '+groups.length+
  '　表示中の町名 '+unique.size+' / 学習範囲 '+active().length+
  '（文字の重なりを許容。町域が見える段階から早めに表示）';
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
 // R-TOWN-24/35: leaving a quiz or changing the study area invalidates
 // the interrupted-question notice. Never carry a previous quiz hint into
 // the ordinary map view.
 $('status').textContent=(communityChoice?regionName(communityChoice):'宝塚市全域')+'を表示しています。';
 $('communityToggle').textContent=(communityChoice?regionName(communityChoice):'宝塚市全域（125町名）')+' ▾';
 $('communityCount').textContent=(communityChoice?regionName(communityChoice):'市全域')+'：'+active().length+'町名';
 $('reset').textContent=communityChoice?'区域\n全体':'市の\n全体';
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
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('communityOptions').hidden){$('communityOptions').hidden=true;$('communityToggle').setAttribute('aria-expanded','false');$('communityToggle').focus()}});
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
$('smaller').onclick=()=>{fontPct=Math.max(75,fontPct-25);$('size').textContent='文字\n'+fontPct+'\n％';updateLabels()};
$('larger').onclick=()=>{fontPct=Math.min(200,fontPct+25);$('size').textContent='文字\n'+fontPct+'\n％';updateLabels()};
$('size').onclick=()=>{fontPct=100;$('size').textContent='文字\n100\n％';updateLabels()};
$('reading').onclick=()=>{readingOn=!readingOn;$('reading').textContent='よみ\nがな\n'+(readingOn?'ON':'OFF');$('reading').setAttribute('aria-pressed',String(readingOn));drawLabels()};
$('labelMode').onclick=()=>{
 candidateMode=!candidateMode;
 $('labelMode').textContent=candidateMode?'配置\n自動':'配置\n従来';
 $('status').textContent=candidateMode?'全125町名のSVGから独立区域とラベル候補を自動生成しました。':'従来の一地点ラベルと比較中です。';
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
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function buildAdjacency(){
 const owners=new Map();
 for(const t of towns)for(const part of t.d.match(/M[^M]+/g)||[]){
  const points=[...part.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m=>[+m[1],+m[2]]);
  if(points.length<3)continue;
  for(let i=0;i<points.length;i++){
   const a=points[i].map(v=>v.toFixed(3)).join(','),b=points[(i+1)%points.length].map(v=>v.toFixed(3)).join(',');
   if(a===b)continue;
   const k=a<b?a+'|'+b:b+'|'+a;
   if(!owners.has(k))owners.set(k,new Set());
   owners.get(k).add(t.name);
  }
 }
 adjacency=new Map(towns.map(t=>[t.name,new Set()]));
 for(const set of owners.values())if(set.size>1)for(const a of set)for(const b of set)if(a!==b)adjacency.get(a).add(b);
}
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
 // R-TOWN-34/35: never inherit the interrupted-town status from a prior quiz.
 $('status').textContent='クイズ'+mode+'を実施中です。';
 const pool=forced&&forced.length?forced:active().map(t=>t.name);
 if(!pool.length)return;
 quizSession=KussoonTownSvgQuizState.begin(mode,pool,shuffle);
 quizLastMode=mode;syncQuizFromSession();
 $('quizResults').hidden=true;$('quizPanel').hidden=false;
 document.body.classList.add('town-quiz-mode');
 loadQuestion();
}
function candidates(target){
 const town=byName.get(target);
 const center=x=>[x.bbox.x+x.bbox.width/2,x.bbox.y+x.bbox.height/2];
 const [cx,cy]=center(town);
 // Region membership can contain multiple regions; this is a nationwide
 // input-data capability, not a Takarazuka-specific choice algorithm.
 return KussoonTownSvgQuizChoices.select(target,{
  townNames:towns.map(t=>t.name),scopeNames:active().map(t=>t.name),
  adjacency,
  sameRegion:(name,other)=>byName.get(name).communities.some(c=>byName.get(other).communities.includes(c)),
  distance:name=>{const [x,y]=center(byName.get(name));return (cx-x)**2+(cy-y)**2},
  shuffle
 });
}
function startQuizBlink(name){
 stopQuizBlink();quizBlinkOn=true;highlight(name,true);
 quizTimer=setInterval(()=>{quizBlinkOn=!quizBlinkOn;highlight(name,quizBlinkOn)},500);
}
function loadQuestion(){
 if(quizIndex>=quizOrder.length){finishQuiz();return}
 quizSession.locked=false;syncQuizFromSession();resetQuestion();scoreLabel();
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
function quizMapAnswer(name){
 if(quizMode!==1||quizLocked)return;
 const grade=KussoonTownSvgQuizState.mapAnswer(quizSession,name);
 syncQuizFromSession();
 if(grade.kind==='ignored')return;
 if(grade.kind==='wrong'){
  highlight(name,false,true);
  $('quizFeedback').textContent='違います。そこは「'+townLabel(name)+'」です。';
  scoreLabel();return;
 }
 quizCorrect(name);
}
function quizChoiceAnswer(name,button){
 if(quizMode!==2||quizLocked||button.disabled)return;
 const grade=KussoonTownSvgQuizState.choiceAnswer(quizSession,name,button.disabled);
 syncQuizFromSession();
 if(grade.kind==='ignored')return;
 if(grade.kind==='wrong'){
  button.disabled=true;button.classList.add('quiz-wrong');
  $('quizFeedback').textContent='違います。「'+townLabel(name)+'」ではありません。';
  scoreLabel();return;
 }
 quizCorrect(name);button.classList.add('quiz-correct');
 for(const b of $('quizChoices').children)b.disabled=true;
}
function quizCorrect(target){
 KussoonTownSvgQuizState.markCorrect(quizSession);syncQuizFromSession();stopQuizBlink();highlight(target,true);
 $('quizFeedback').textContent='正解です！ '+townLabel(target);
 $('quizReveal').hidden=true;$('quizNext').hidden=false;
 $('quizNext').textContent=quizIndex===quizOrder.length-1?'結果発表':'次の問題へ';
 scoreLabel();
}
function quizReveal(){
 if(quizLocked)return;
 const grade=KussoonTownSvgQuizState.reveal(quizSession);
 syncQuizFromSession();
 if(grade.kind==='ignored')return;
 const target=quizOrder[quizIndex];quizCorrect(target);
 $('quizFeedback').textContent='答えは「'+townLabel(target)+'」です。';
}
function finishQuiz(quit=false){
 const result=KussoonTownSvgQuizState.result(quizSession,quit);
 const answered=result.answered;
 const target=result.interruptedTown;
 resetQuestion();quizMode=0;document.body.classList.remove('town-quiz-mode');
 $('quizPanel').hidden=true;$('quizResults').hidden=false;
 $('quizResult').textContent=quit?'途中終了：'+answered+' / '+quizOrder.length+'問終了（間違えた問題 '+quizWrong.size+'件）':
 quizOrder.length+'問中 '+quizScore+'点（間違えた問題 '+quizWrong.size+'件）';
 $('quizRetryWrong').hidden=false;$('quizRetryWrong').disabled=quizWrong.size===0;
 if(target&&byName.has(target)){
  choose(target);$('status').textContent='中断した問題：「'+townLabel(target)+'」を黄色く点滅表示しています。';
 }
}
$('quizOne').onclick=()=>startQuiz(1);
$('quizTwo').onclick=()=>startQuiz(2);
$('quizReveal').onclick=quizReveal;
$('quizNext').onclick=()=>{KussoonTownSvgQuizState.next(quizSession);syncQuizFromSession();loadQuestion()};
$('quizQuit').onclick=()=>finishQuiz(true);
$('quizRetryWrong').onclick=()=>startQuiz(quizLastMode,[...quizWrong]);
$('quizRetryAll').onclick=()=>startQuiz(quizLastMode);
$('quizBack').onclick=()=>stopQuiz(true);
zoom=KussoonTownSvgCore.attachZoom(svg,d3,event=>{
 transform=event.transform;world.attr('transform',transform.toString());updateLabels();
},.15,50);
// Wheel-B: clicks on map enable the wheel; outside pointer interaction disables it.
svg.on('wheel.zoom',null);
let wheelArmed=false;
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#map')){wheelArmed=false;svg.on('wheel.zoom',null)}});
svg.on('click',()=>{
 if(!wheelArmed){wheelArmed=true;svg.call(zoom)}
 if(!quizMode&&selected)stopBlink();
});
KussoonTownSvgDataContract.loadUnified({
 municipalityId:'jp-hyogo-takarazuka',
 sourceFormat:'svg',
 htmlPath:'/takarazuka/town-search.html',
 infoPath:'/takarazuka/data/takarazuka-town-info.json',
 expectedTownCount:125,expectedRegionCount:20
},{svgAdapter:KussoonTownSvgSourceAdapter}).then(data=>{
 towns=data.records.map(r=>({name:r.name,reading:r.reading,
  communities:r.communities,d:r.geometry.data}));
 byName=new Map(towns.map(t=>[t.name,t]));buildAdjacency();
 const vb=data.viewBox.split(/[ ,]+/).map(Number);sourceArea=(vb[2]||1000)*(vb[3]||1700);
 communityNames=[...new Set(towns.flatMap(t=>t.communities))];
 // Only source-confirmed readings may be used for the full 20-region kana sorting.
 if(communityNames.length!==20||communityNames.some(c=>!VERIFIED_COMMUNITY_READINGS[c]))
  throw Error('宝塚市の20地域と読み仮名台帳が一致しません');
 for(const c of communityNames)communityReadings[c]=VERIFIED_COMMUNITY_READINGS[c];
 areas.selectAll('path.town').data(towns,t=>t.name).join('path').attr('class','town').attr('d',t=>t.d);
 for(const t of towns){
  t.pathEl=[...areas.selectAll('path.town').nodes()].find(n=>n.__data__?.name===t.name);
  const b=t.pathEl.getBBox();t.bbox={x:b.x,y:b.y,width:b.width,height:b.height};
  t.legacyAnchor=labelAnchor(t);
  const filled=coords=>verifiedCandidate(t,coords)!==null;
  t.autoCandidates=KussoonTownMultipartLabels.fromSvg({name:t.name,reading:t.reading,path:t.d,isFilled:filled,viewBoxArea:sourceArea,autoLabels:KussoonAutoTownLabels}).map(c=>({point:c.point,area:c.area}));
  if(!t.autoCandidates.length)throw Error('自動候補点なし：'+t.name);
  t.anchor=t.autoCandidates[0].point;
 }
 draw();startCommunity();
 $('status').textContent='SVG描画：125町名・20地域、全自動ラベル候補を読み込みました（比較試作）。';
 const linked=new URLSearchParams(location.search).get('town');
 if(linked){
  if(byName.has(linked)){if(focusTown(linked)){
   $('status').textContent='階層ナビゲーションから「'+townLabel(linked)+'」を表示しています。';
   const back=$('hierarchyReturn');if(back)back.href='/v2/geography/#town:jp-hyogo-takarazuka:'+encodeURIComponent(linked);
  }}
  else $('status').textContent='指定の町名が見つかりませんでした。';
 }
 new ResizeObserver(()=>{
  const [w,h]=getSize();
  if(w!==mapW||h!==mapH){draw();fit(active())}
 }).observe($('map'));
}).catch(err=>{$('status').textContent='読み込み失敗：'+err.message;console.error(err)});
})();