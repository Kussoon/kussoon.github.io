/* TOWNMAP-SSOT-001 / nationwide data-driven browser integration pilot.
 * One browser controller for any complete SVG municipality manifest.
 * Uses source data, common dataset/renderer/quiz modules; no city branches.
 * IMPORTANT: functional integration test, not a replacement for adopted UI.
 */
(async()=>{
'use strict';
const $=id=>document.getElementById(id);
const d3=window.d3;
const api=window.KussoonTownSvgReadyRuntime;
const state=window.KussoonTownSvgQuizState;
const ui=window.KussoonTownSvgQuizUI;
const configPath=new URLSearchParams(location.search).get('manifest')||'/v2/data/town-maps/28214-preview.json';
const allowed=/^\/v2\/data\/town-maps\/[0-9]{5}-preview\.json$/;
if(!allowed.test(configPath))throw Error('自治体台帳は登録済みのサイト内ファイルを指定してください');
const configResponse=await fetch(configPath,{credentials:'same-origin'});
if(!configResponse.ok)throw Error('自治体データ設定を読み込めません');
const config=await configResponse.json();
const unified=await window.KussoonTownSvgDataContract.loadUnified(config,{
 svgAdapter:window.KussoonTownSvgSourceAdapter
});
const prepared=window.KussoonTownSvgDatasetReady.prepare({unified,regionReadings:config.regionReadings});
const app=api.create({dataset:prepared,render:window.KussoonTownSvgRender,
 quizState:state,quizChoices:window.KussoonTownSvgQuizChoices});
if(app.active().length!==config.expectedTownCount)throw Error('町名の実数と台帳が一致しません');
$('title').textContent=config.name+'｜全国町名共通ページの接続試作';
$('pageCount').textContent=config.expectedTownCount+'町名・'+config.expectedRegionCount+'地域';
const svg=d3.select('#map'),world=d3.select('#world'),areas=d3.select('#areas'),labels=d3.select('#labels');
let zoom,transform=d3.zoomIdentity,readingOn=false,quiz=null,quizMode=0,lastMode=1,selected='',timer=null;
const geometry=new Map();
const townLabel=name=>{const t=app.town(name);return name+(t?'（'+t.reading+'）':'')};
const sortedRegions=window.KussoonTownSvgUI.sortRegionsByReading(
 prepared.regions.map(r=>r.name),Object.fromEntries(prepared.regions.map(r=>[r.name,r.reading])));
function stopBlink(){if(timer!==null){clearInterval(timer);timer=null}areas.selectAll('path.town').classed('blink',false).classed('wrong',false)}
function clearSelection(){selected='';areas.selectAll('path.town').classed('selected',false)}
function boundsOf(records){
 const b=records.map(r=>geometry.get(r.name)).filter(Boolean);
 if(!b.length)return null;
 return [[Math.min(...b.map(x=>x.x)),Math.min(...b.map(x=>x.y))],
 [Math.max(...b.map(x=>x.x+x.width)),Math.max(...b.map(x=>x.y+x.height))]];
}
function fit(){
 const bounds=boundsOf(app.active());if(!bounds)return;
 const rect=svg.node().getBoundingClientRect();
 const scale=window.KussoonTownSvgViewport.fitBounds(bounds,rect.width,rect.height,40,.15,50);
 if(scale)svg.call(zoom.transform,d3.zoomIdentity.translate(scale.x,scale.y).scale(scale.scale));
}
function updateLabels(){
 const k=transform.k;
 labels.selectAll('g.label').attr('transform',d=>
  'translate('+d.anchor[0]+','+d.anchor[1]+') scale('+(1/k)+')');
 labels.selectAll('text.town-label').attr('font-size',11);
 labels.selectAll('tspan.town-name').attr('y',readingOn?-5.3:0);
 labels.selectAll('tspan.town-reading').attr('y',5.9).attr('font-size',8.6);
}
function redrawLabels(){
 const entries=app.active().map(t=>{
  const b=geometry.get(t.name);
  return {name:t.name,reading:t.reading,id:t.name,anchor:[b.x+b.width/2,b.y+b.height/2]};
 });
 window.KussoonTownSvgLabels.render(labels,entries,d3,{},readingOn,{key:t=>t.id,reading:t=>t.reading});
 updateLabels();
}
function draw(){
 app.renderCurrent({areas,pathFor:g=>g.data,onSelect:onTownClick});
 redrawLabels();
}
function updateRegion(){
 const n=app.active().length;
 $('regionCount').textContent=(app.currentRegion()||config.name+'全域')+'：'+n+'町名';
 $('region').value=app.currentRegion();
}
function setRegion(name){
 endQuiz();
 app.selectRegion(name);
 clearSelection();draw();updateRegion();fit();
 $('status').textContent=(name||config.name+'全域')+'を表示しています。';
}
function selectTown(name){
 if(quizMode)return;
 clearSelection();selected=name;
 areas.selectAll('path.town').classed('selected',r=>r.name===name);
 $('status').textContent=townLabel(name)+'を選択しています。';
}
function onTownClick(name){
 if(quizMode===1){answer(name);return}
 if(!quizMode)selectTown(name);
}
function endQuiz(){
 stopBlink();quiz=null;quizMode=0;
 document.body.classList.remove('town-quiz-mode');
 $('quizPanel').hidden=true;$('quizResults').hidden=true;
 $('quizFeedback').textContent='';
}
const shuffle=input=>{const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function startQuiz(mode,forced){
 endQuiz();clearSelection();
 quiz=forced&&forced.length?state.begin(mode,forced,shuffle):app.startQuiz(mode,shuffle);
 quizMode=mode;lastMode=mode;
 ui.start({mode,status:$('status'),panel:$('quizPanel'),results:$('quizResults'),body:document.body});
 ask();
}
function markBlink(name){
 stopBlink();let on=true;areas.selectAll('path.town').classed('blink',r=>r.name===name);
 timer=setInterval(()=>{on=!on;areas.selectAll('path.town').classed('blink',r=>r.name===name&&on)},500);
}
function ask(){
 if(quiz.index>=quiz.order.length){finish(false);return}
 quiz.locked=false;
 ui.clearQuestion({stopBlink,wrongPlaces:quiz.wrongPlaces,choices:$('quizChoices'),
  next:$('quizNext'),reveal:$('quizReveal'),feedback:$('quizFeedback')});
 const target=state.question(quiz);
 $('quizProgress').textContent=(quiz.index+1)+' / '+quiz.order.length+'問　得点 '+quiz.score;
 ui.showQuestion({mode:quizMode,target,label:townLabel,feedback:$('quizFeedback'),
  question:$('quizQuestion'),reveal:$('quizReveal')});
 if(quizMode===2){
  const source=geometry.get(target),tx=source.x+source.width/2,ty=source.y+source.height/2;
  const options=app.choices(target,{distance:name=>{
   const g=geometry.get(name);
   return (g.x+g.width/2-tx)**2+(g.y+g.height/2-ty)**2;
  },shuffle});
  for(const name of options){
   $('quizChoices').append(window.KussoonTownSvgUI.makeQuizChoice(document,name,app.town(name).reading,
    (choice,button)=>answer(choice,button)));
  }
  markBlink(target);
 }
}
function answer(name,button){
 if(!quiz||quiz.locked)return;
 const target=state.question(quiz);
 const grade=quizMode===1?state.mapAnswer(quiz,name):state.choiceAnswer(quiz,name,Boolean(button?.disabled));
 if(grade.kind==='ignored')return;
 if(grade.kind==='wrong'){
  if(button){button.disabled=true;button.classList.add('quiz-wrong')}
  else areas.selectAll('path.town').filter(r=>r.name===name).classed('wrong',true);
  $('quizFeedback').textContent='違います。「'+townLabel(name)+'」ではありません。';
 }else{
  state.markCorrect(quiz);stopBlink();
  areas.selectAll('path.town').filter(r=>r.name===name).classed('selected',true);
  if(button){button.classList.add('quiz-correct');for(const b of $('quizChoices').children)b.disabled=true}
  ui.correct({feedback:$('quizFeedback'),reveal:$('quizReveal'),next:$('quizNext'),
   index:quiz.index,total:quiz.order.length,message:'正解です！ '+townLabel(target)});
 }
 $('quizProgress').textContent=(quiz.index+1)+' / '+quiz.order.length+'問　得点 '+quiz.score;
}
function reveal(){
 if(!quiz||quizMode!==1||quiz.locked)return;
 if(state.reveal(quiz).kind==='ignored')return;
 const name=state.question(quiz);
 state.markCorrect(quiz);stopBlink();
 areas.selectAll('path.town').filter(r=>r.name===name).classed('selected',true);
 ui.correct({feedback:$('quizFeedback'),reveal:$('quizReveal'),next:$('quizNext'),
  index:quiz.index,total:quiz.order.length,message:'答えは「'+townLabel(name)+'」です。'});
 $('quizProgress').textContent=(quiz.index+1)+' / '+quiz.order.length+'問　得点 '+quiz.score;
}
function finish(quit){
 if(!quiz)return;
 const result=state.result(quiz,quit);
 stopBlink();
 quizMode=0;
 ui.finish({body:document.body,panel:$('quizPanel'),results:$('quizResults'),
  result:$('quizResult'),quit,answered:result.answered,total:result.total,
  score:result.score,wrongCount:result.wrongCount});
 ui.syncWrongRetry({retryWrong:$('quizRetryWrong'),wrongCount:result.wrongCount});
}
$('region').replaceChildren(new Option(config.name+'全域',''),...sortedRegions.map(name=>
 new Option(name+'（'+config.regionReadings[name]+'）',name)));
$('region').addEventListener('change',e=>setRegion(e.target.value));
$('quizOne').onclick=()=>startQuiz(1);
$('quizTwo').onclick=()=>startQuiz(2);
$('quizReveal').onclick=reveal;
ui.bindResultActions({
 next:$('quizNext'),quit:$('quizQuit'),retryWrong:$('quizRetryWrong'),
 retryAll:$('quizRetryAll'),back:$('quizBack'),
 advanceQuestion:()=>{state.next(quiz);ask()},finishEarly:()=>finish(true),
 startQuiz,getLastMode:()=>lastMode,getWrongNames:()=>quiz.wrong,
 returnToRegions:()=>{endQuiz();setRegion(app.currentRegion())}
});
$('reading').onclick=()=>{readingOn=!readingOn;$('reading').textContent=readingOn?'よみがなON':'よみがなOFF';redrawLabels()};
$('zoomIn').onclick=()=>svg.transition().duration(150).call(zoom.scaleBy,1.35);
$('zoomOut').onclick=()=>svg.transition().duration(150).call(zoom.scaleBy,1/1.35);
$('reset').onclick=()=>{app.selectRegion('');setRegion('')};
zoom=window.KussoonTownSvgCore.attachZoom(svg,d3,event=>{
 transform=event.transform;world.attr('transform',transform.toString());updateLabels();
},.15,50);
window.KussoonTownSvgGestures.install({svg,zoom,document,getQuizMode:()=>quizMode,
 getSelected:()=>selected,stopBlink:clearSelection});
svg.on('dblclick.preview',e=>{e.preventDefault();svg.transition().duration(170)
 .call(zoom.scaleBy,1.5,d3.pointer(e,svg.node()))});
app.renderCurrent({areas,pathFor:g=>g.data,onSelect:onTownClick});
const townMap=new Map();
areas.selectAll('path.town').each(function(r){
 const b=this.getBBox();townMap.set(r.name,{x:b.x,y:b.y,width:b.width,height:b.height});
});
for(const [name,b] of townMap)geometry.set(name,b);
setRegion('');
$('quizOne').disabled=false;$('quizTwo').disabled=false;
$('readiness').textContent='検証済み '+prepared.records.length+'町名 / '+prepared.regions.length+'地域';
window.__townPreview=Object.freeze({
 townCount:prepared.records.length,regionCount:prepared.regions.length,
 currentRegion:()=>app.currentRegion(),quizMode:()=>quizMode,
 activeCount:()=>app.active().length,quizTarget:()=>quiz?state.question(quiz):null
});
})().catch(err=>{
 document.getElementById('status').textContent='データの読み込みに失敗しました：'+err.message;
 console.error(err);
});
