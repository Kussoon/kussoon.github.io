/* Kussoon Amagasaki V2 clean SVG implementation (comparison pilot).
 * Based on adopted Takarazuka SVG label, gesture, and quiz behavior.
 * Old Amagasaki HTML & event handlers are NOT loaded or copied.
 * 140-town geometry/readings are data only; district grouping awaits verification.
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
const VERIFIED_COMMUNITY_READINGS=Object.freeze({});
let towns=[],byName=new Map(),communityNames=[],communityReadings={},communityChoice='',adjacency=new Map();
let zoom,transform=d3.zoomIdentity,mapW=390,mapH=600,baseScale=1;
let selected='',blinkTimer=null,blinkOn=false,readingOn=false,fontPct=100,anchorMode='svg';
let quizMode=0,quizLastMode=0,quizOrder=[],quizIndex=0,quizScore=0,quizWrong=new Set(),quizWrongPlaces=new Set(),quizLocked=false,quizTimer=null,quizBlinkOn=false;
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
let candidateMode=true,sourceArea=1000*1365;
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
 const fs=fontPixels();
 const all=labels.selectAll('g.label');
 const frame=$('map').getBoundingClientRect();
 all.each(function(d){
  const t=byName.get(d.name),r=t.bbox,k=transform.k;
  const vx=-transform.x/k,vy=-transform.y/k;
  const left=Math.max(vx,r.x),top=Math.max(vy,r.y);
  const right=Math.min(vx+mapW/k,r.x+r.width),bottom=Math.min(vy+mapH/k,r.y+r.height);
  let p=d.anchor;
  if(right<=left||bottom<=top)p=null;
  else if(p[0]<left||p[0]>right||p[1]<top||p[1]>bottom){
   const probe=svg.node().createSVGPoint(),coords=[];
   coords.push([(left+right)/2,(top+bottom)/2]);
   for(let y=1;y<=12;y++)for(let x=1;x<=12;x++)
    coords.push([left+(right-left)*x/13,top+(bottom-top)*y/13]);
   p=coords.find(q=>{probe.x=q[0];probe.y=q[1];return t.pathEl.isPointInFill(probe)})||null;
  }
  const n=d3.select(this);
  n.style('display',p?'':'none').attr('data-visible',String(!!p));
  if(p)n.attr('transform','translate('+p[0]+','+p[1]+') scale('+(1/k)+')');
 });
 all.selectAll('text.town-label').attr('font-size',fs);
 all.selectAll('tspan.town-name').attr('y',readingOn?(-.48*fs):0);
 all.selectAll('tspan.town-reading').attr('y',.54*fs).attr('font-size',fs*.78);
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
 $('communityToggle').textContent=(communityChoice?regionName(communityChoice):'尼崎市全域（140町名）')+' ▾';
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
  }else button.textContent='尼崎市全域';
  button.onclick=()=>{
   communityChoice=name;menu.hidden=true;$('communityToggle').setAttribute('aria-expanded','false');
   showCommunity();$('communityToggle').focus();
  };
  menu.append(button);
 }
 $('communityToggle').disabled=true;$('quizOne').disabled=false;$('quizTwo').disabled=false;
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
 $('status').textContent=candidateMode?'全140町名のSVGから独立区域とラベル候補を自動生成しました。':'従来の一地点ラベルと比較中です。';
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
 const pool=forced&&forced.length?forced:active().map(t=>t.name);
 if(!pool.length)return;
 quizMode=mode;quizLastMode=mode;quizOrder=shuffle(pool);
 quizIndex=0;quizScore=quizOrder.length;quizWrong=new Set();quizLocked=false;
 $('quizResults').hidden=true;$('quizPanel').hidden=false;
 document.body.classList.add('town-quiz-mode');
 loadQuestion();
}
function candidates(target){
 const t=byName.get(target),scoped=active();
 const center=x=>[x.bbox.x+x.bbox.width/2,x.bbox.y+x.bbox.height/2];
 const [cx,cy]=center(t),distance=x=>{const [a,b]=center(x);return (cx-a)**2+(cy-b)**2};
 const same=x=>x.communities.some(c=>t.communities.includes(c)),direct=x=>adjacency.get(target)?.has(x.name);
 const order=[],seen=new Set([target]),add=a=>{for(const x of [...a].sort((a,b)=>distance(a)-distance(b)))if(!seen.has(x.name)){seen.add(x.name);order.push(x.name)}};
 const all=towns.filter(x=>x.name!==target),subset=scoped.filter(x=>x.name!==target);
 add(all.filter(x=>direct(x)&&same(x)));add(all.filter(direct));
 add(subset.filter(same));add(subset);add(all);
 return shuffle([target,...order.slice(0,3)]);
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
  quizWrongPlaces.add(name);quizScore=Math.max(0,quizScore-1);quizWrong.add(target);highlight(name,false,true);
  $('quizFeedback').textContent='違います。そこは「'+townLabel(name)+'」です。';
  scoreLabel();return;
 }
 quizCorrect(target);
}
function quizChoiceAnswer(name,button){
 if(quizMode!==2||quizLocked||button.disabled)return;
 const target=quizOrder[quizIndex];
 if(name!==target){
  quizScore=Math.max(0,quizScore-1);quizWrong.add(target);button.disabled=true;button.classList.add('quiz-wrong');
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
 const target=quizOrder[quizIndex];quizScore=Math.max(0,quizScore-1);quizWrong.add(target);quizCorrect(target);
 $('quizFeedback').textContent='答えは「'+townLabel(target)+'」です。';
}
function finishQuiz(quit=false){
 const answered=quizIndex+(quizLocked?1:0);
 const target=quit?quizOrder[quizIndex]:null;
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
$('quizNext').onclick=()=>{quizIndex++;loadQuestion()};
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
fetch('/v2/data/amagasaki-town-svg-v2-20261116.json',{cache:'no-store'})
.then(response=>{if(!response.ok)throw Error('尼崎市町域データの取得失敗 HTTP '+response.status);return response.json()})
.then(data=>{
 if(!Array.isArray(data.towns)||data.towns.length!==140||data.municipalityCode!=='28202')
  throw Error('尼崎市140町名のデータ契約が不一致です');
 towns=data.towns;byName=new Map(towns.map(t=>[t.name,t]));buildAdjacency();
 const vb=data.viewBox.split(/[ ,]+/).map(Number);sourceArea=(vb[2]||1000)*(vb[3]||1700);
 communityNames=[...new Set(towns.flatMap(t=>t.communities))];
 // Only source-confirmed readings may be used for the full 20-region kana sorting.
 // 地域区分の正式資料が未確認のため、今回は全域のみで比較する。
 if(communityNames.length)throw Error('地域区分が未検証です');
 areas.selectAll('path.town').data(towns,t=>t.name).join('path').attr('class','town').attr('d',t=>t.d);
 for(const t of towns){
  t.pathEl=[...areas.selectAll('path.town').nodes()].find(n=>n.__data__?.name===t.name);
  const b=t.pathEl.getBBox();t.bbox={x:b.x,y:b.y,width:b.width,height:b.height};
  t.legacyAnchor=labelAnchor(t);
  const filled=coords=>verifiedCandidate(t,coords)!==null;
  t.autoCandidates=KussoonConnectedTownLabels.representative(t.d,KussoonAutoTownLabels,filled,sourceArea);
  if(!t.autoCandidates.length)throw Error('自動候補点なし：'+t.name);
  t.anchor=t.autoCandidates[0].point;
 }
 draw();startCommunity();
 $('status').textContent='SVG描画：140町名・全域、町域形状から自動ラベル候補を生成しました（比較試作）。';
 const linked=new URLSearchParams(location.search).get('town');
 if(linked){
  if(byName.has(linked)){if(focusTown(linked)){
   $('status').textContent='階層ナビゲーションから「'+townLabel(linked)+'」を表示しています。';
   const back=$('hierarchyReturn');if(back)back.href='/v2/geography/#town:jp-hyogo-amagasaki:'+encodeURIComponent(linked);
  }}
  else $('status').textContent='指定の町名が見つかりませんでした。';
 }
 new ResizeObserver(()=>{
  const [w,h]=getSize();
  if(w!==mapW||h!==mapH){draw();fit(active())}
 }).observe($('map'));
}).catch(err=>{$('status').textContent='読み込み失敗：'+err.message;console.error(err)});
})();