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
const configPath=new URLSearchParams(location.search).get('manifest')||'/v2/data/town-maps/28204-approved-preview.json';
const allowed=/^\/v2\/data\/town-maps\/[0-9]{5}-(?:preview|approved-preview)\.json$/;
if(!allowed.test(configPath))throw Error('自治体台帳は登録済みのサイト内ファイルを指定してください');
const configResponse=await fetch(configPath,{credentials:'same-origin'});
if(!configResponse.ok)throw Error('自治体データ設定を読み込めません');
const config=await configResponse.json();
const unified=await window.KussoonTownSvgDataContract.loadUnified(config,{
 svgAdapter:window.KussoonTownSvgSourceAdapter,
 fetchJSON:async url=>{
  const response=await fetch(url,{credentials:'same-origin'});
  if(!response.ok)throw Error('町域・地域台帳の取得失敗: '+url+' '+response.status);
  return response.json();
 },topojsonClient:window.topojson
});
const verified=config.sourceFormat==='topojson'
 ?window.KussoonTownSvgVerifiedMembership.apply({unified,manifest:config}):unified;
const prepared=window.KussoonTownSvgDatasetReady.prepare({
 unified:verified,townMetadata:config.townMetadata||{},regionReadings:config.regionReadings
});
const projected=config.sourceFormat==='topojson'
 ?window.KussoonTownSvgTopoProjection.create({
  unified,prepared,d3,topojsonClient:window.topojson,
  normalizeSubName:name=>name.replace(/[一二三四五六七八九十百]+丁目$/,'')
 }):null;
const shownDataset=projected?Object.freeze({...prepared,records:projected.records}):prepared;
const labelResource=config.approvedLabelsUrl||null;
const labelData=labelResource?await (async()=>{
 const r=await fetch(labelResource,{credentials:'same-origin'});
 if(!r.ok)throw Error('確定ラベルの位置情報が取得できません');
 return r.json();
})():null;
const approvedAnchors=labelData&&projected
 ?window.KussoonTownSvgApprovedAnchors.create({
  data:labelData,municipalityId:config.municipalityId,records:prepared.records,
  projection:projected.projection,path:projected.path,
  featureFor:projected.featureFor
 }):null;
const app=api.create({dataset:shownDataset,render:window.KussoonTownSvgRender,
 quizState:state,quizChoices:window.KussoonTownSvgQuizChoices});
if(app.active().length!==config.expectedTownCount)throw Error('町名の実数と台帳が一致しません');
$('title').textContent=config.name+'｜全国町名共通ページの接続試作';
$('pageCount').textContent=config.expectedTownCount+'町名・'+config.expectedRegionCount+'地域';
const svg=d3.select('#map'),world=d3.select('#world'),areas=d3.select('#areas'),labels=d3.select('#labels');
let zoom,transform=d3.zoomIdentity,readingOn=false,fontPct=100,quiz=null,quizMode=0,lastMode=1,selected='',timer=null;
const controlRail=window.KussoonTownSvgControlRail.mount($('townControlMount'));
const geometry=new Map(),regionGeometry=new Map(),labelCandidates=new Map();
const sourceViewBox=(projected?projected.viewBox:unified.viewBox).split(/[ ,]+/).map(Number);
const sourceArea=(sourceViewBox[2]||0)*(sourceViewBox[3]||0);
if(!(sourceArea>0))throw Error('元SVGの表示範囲が不正です');
svg.attr('viewBox',sourceViewBox.join(' '));
let baseScale=1;
const townLabel=name=>{const t=app.town(name);return name+(t?'（'+t.reading+'）':'')};
const sortedRegions=window.KussoonTownSvgUI.sortRegionsByReading(
 prepared.regions.map(r=>r.name),Object.fromEntries(prepared.regions.map(r=>[r.name,r.reading])));
function stopBlink(){if(timer!==null){clearInterval(timer);timer=null}areas.selectAll('path.town').classed('blink',false).classed('wrong',false)}
function clearSelection(){selected='';areas.selectAll('path.town').classed('selected',false)}
function boundsOf(records){
 const b=records.map(r=>regionGeometry.get(r.name)||geometry.get(r.name)).filter(Boolean);
 if(!b.length)return null;
 return [[Math.min(...b.map(x=>x.x)),Math.min(...b.map(x=>x.y))],
 [Math.max(...b.map(x=>x.x+x.width)),Math.max(...b.map(x=>x.y+x.height))]];
}
function fit(){
 const bounds=boundsOf(app.active());if(!bounds)return;
 const rect=window.KussoonTownSvgResponsiveViewBox.sync(svg.node());
 const scale=window.KussoonTownSvgViewport.fitBounds(bounds,rect.width,rect.height,40,.15,50);
 if(scale){baseScale=scale.scale;svg.call(zoom.transform,d3.zoomIdentity.translate(scale.x,scale.y).scale(scale.scale));}
}
function updateLabels(){
 const fs=window.KussoonTownSvgLabelViewport.fontPixels({
  zoomK:transform.k,initialK:Math.max(.001,baseScale),fontPct
 });
 window.KussoonTownSvgLabelUpdate.update({
  labels,transform,fs,readingOn,anchorOf:d=>d.point,
  candidateMode:true,frame:svg.node().getBoundingClientRect(),
  zoomRatio:transform.k/Math.max(.001,baseScale),selected,threshold:1.15
 });
 // V34 text-node Range correction: used only for reading-OFF candidates.
 window.KussoonTownSvgGlyphCenter.align({
  labels,world,transform,document,readingOn
 });
}
function redrawLabels(){
 const entries=app.active().flatMap(t=>labelCandidates.get(t.name)||[]);
 window.KussoonTownSvgLabels.render(labels,entries,d3,{},readingOn,{
  key:d=>d.key,reading:d=>d.reading
 });
 updateLabels();
}
function draw(){
 regionGeometry.clear();
 labelCandidates.clear();
 app.renderCurrent({areas,
  pathFor:(g,r)=>projected?projected.pathFor(r.name,app.currentRegion()):g.data,
  onSelect:onTownClick
 });
 areas.selectAll('path.town').each(function(t){
  const path=this,b=path.getBBox();
  regionGeometry.set(t.name,{x:b.x,y:b.y,width:b.width,height:b.height});
  if(!app.currentRegion())geometry.set(t.name,{x:b.x,y:b.y,width:b.width,height:b.height});
  const isFilled=point=>{
   const p=svg.node().createSVGPoint();p.x=point[0];p.y=point[1];
   return typeof path.isPointInFill==='function'&&path.isPointInFill(p);
  };
  const entries=approvedAnchors
   ?approvedAnchors.candidates(t.name,app.currentRegion())
   :window.KussoonTownMultipartLabels.fromSvg({
    name:t.name,reading:t.reading,path:path.getAttribute('d'),
    isFilled,viewBoxArea:sourceArea,autoLabels:window.KussoonAutoTownLabels
   });
  if(!entries.length)throw Error('表示候補がありません: '+t.name);
  labelCandidates.set(t.name,entries);
 });
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

const labelScheduler=window.KussoonTownSvgLabelUpdateScheduler.create({update:updateLabels});
zoom=window.KussoonTownSvgCore.attachZoom(svg,d3,event=>{
 transform=event.transform;world.attr('transform',transform.toString());labelScheduler.request();
},.15,50);
window.KussoonTownSvgGestures.install({svg,zoom,document,getQuizMode:()=>quizMode,
 getSelected:()=>selected,stopBlink:clearSelection});
const fullscreenViewport=window.KussoonTownSvgFullscreenViewport.create({
 svg,zoom,d3,button:controlRail.querySelector('#fullscreen'),
 afterRestore:()=>{labelScheduler.flush()}
});
window.KussoonTownSvgControlRail.bind({
 root:controlRail,document,body:document.body,
 getFontPct:()=>fontPct,setFontPct:value=>{fontPct=value},onFontChange:updateLabels,
 getReadingOn:()=>readingOn,setReadingOn:value=>{readingOn=value},onReadingChange:redrawLabels,
 onFullscreenChange:()=>{
 window.KussoonTownSvgResponsiveViewBox.sync(svg.node());
 fullscreenViewport.onFullscreenChange();
}
});
window.KussoonTownSvgZoomSliderDrag.install({
 svg,zoom,d3,input:$('zoomSlider'),
 well:controlRail.querySelector('.zoom-slider-well'),
 plus:$('zoomPlus'),minus:$('zoomMinus'),
 getMinimumTransform:()=>{
  const bounds=boundsOf(prepared.records);
  const box=window.KussoonTownSvgResponsiveViewBox.sync(svg.node());
  const fitted=window.KussoonTownSvgViewport.fitBounds(bounds,box.width,box.height,40,.15,50);
  return {k:fitted?.scale||.15};
 },
 onMinimum:()=>setRegion('')
});
svg.on('dblclick.preview',e=>{e.preventDefault();svg.transition().duration(170)
 .call(zoom.scaleBy,1.5,d3.pointer(e,svg.node()))});
setRegion('');
$('quizOne').disabled=false;$('quizTwo').disabled=false;
$('readiness').textContent='検証済み '+prepared.records.length+'町名 / '+prepared.regions.length+'地域';
window.__townPreview=Object.freeze({
 townCount:prepared.records.length,regionCount:prepared.regions.length,
 labelCandidateCount:()=>[...labelCandidates.values()].reduce((n,a)=>n+a.length,0),
 regionPathCount:projected?.regionPathCount||0,
 sourceGeometryCount:projected?.sourceGeometryCount||0,
 hasRegionPath:(name,region)=>Boolean(projected?.hasRegionPath(name,region)),
 pathFor:(name,region='')=>projected?.pathFor(name,region)||null,
 currentRegion:()=>app.currentRegion(),quizMode:()=>quizMode,
 activeCount:()=>app.active().length,quizTarget:()=>quiz?state.question(quiz):null
});
})().catch(err=>{
 document.getElementById('status').textContent='データの読み込みに失敗しました：'+err.message;
 console.error(err);
});
