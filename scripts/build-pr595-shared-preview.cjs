const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'v2/verify-town-map-pr595');
fs.mkdirSync(path.join(out,'data'),{recursive:true});
const original=fs.readFileSync(path.join(root,'v2/verify-pr595-one-label/index.html'),'utf8');
let code=original.slice(original.indexOf("(()=>{'use strict';"),original.lastIndexOf('</script><script defer'));
const decl=code.match(/const READINGS=.*?;\n/)[0];
const config=vm.runInNewContext(decl+'({readings:READINGS,labelOffsets:LABEL_OFFSETS,multiLabels:MULTI_LABELS,extraLabels:EXTRA_LABELS})');
config.regionReadings=vm.runInNewContext(code.match(/const COMMUNITY_READINGS=.*?;\n/)[0]+'COMMUNITY_READINGS');
Object.assign(config,{municipalityId:'jp-hyogo-nishinomiya',name:'西宮市',code:'28204',expectedTownCount:321,expectedRegionCount:26,
 topologyUrl:'/v2/verify-pr595-one-label/data/nishinomiya-town-v2-premerged.topojson',mappingUrl:'/nishinomiya/data/community-town-map.json',exceptionUrl:'/v2/verify-pr595-one-label/data/nishinomiya-uekoto-community.topojson',objectName:'town',townNameProperty:'S_NAME',
 membership:{primaryOverrides:{'岡田山':'上ヶ原'},additionalRegions:{'岡田山':['広田'],'上甲東園':['甲東']}},
 regionalSplits:[{town:'上甲東園',region:'上ヶ原',sourceProperty:'community',expectedParts:4},{town:'上甲東園',region:'甲東',sourceProperty:'community',expectedParts:2}],
 annotations:{'岡田山':{regions:['上ヶ原','広田'],note:'岡田山（おかだやま）は町全体を対象にしています。1〜3番は広田、4〜7番は上ヶ原です。番地単位の境界線は描かず、紫色で町全体を表示します。',quiz:'岡田山は町全体を出題しています。1〜3番は広田（ひろた）、4〜7番は上ヶ原（うえがはら）の区域です。'}}});
fs.writeFileSync(path.join(out,'data/28204.json'),JSON.stringify(config,null,2)+'\n');
function replace(a,b){if(code.split(a).length!==2)throw Error('Extraction anchor changed: '+a.slice(0,120));code=code.replace(a,b)}
replace("(()=>{'use strict';","(async()=>{'use strict';\nconst requestedCode=new URLSearchParams(location.search).get('code')||'28214';\nif(!/^[0-9]{5}$/.test(requestedCode))throw Error('自治体コードが不正です');\nconst response=await fetch('./data/'+requestedCode+'.json');\nif(!response.ok)throw Error('自治体設定の読み込みに失敗しました');\nconst config=await response.json();");
replace(decl,"const READINGS=config.readings,LABEL_OFFSETS=config.labelOffsets||{},MULTI_LABELS=config.multiLabels||{},EXTRA_LABELS=config.extraLabels||{};\n");
replace(code.match(/const COMMUNITY_READINGS=.*?;\n/)[0],'const COMMUNITY_READINGS=config.regionReadings;\n');
replace("if(communityNames.length!==26||communityNames.some(co=>!COMMUNITY_READINGS[co]))throw Error('26コミュニティのデータまたは読みが不正です');","if(communityNames.length!==config.expectedRegionCount||communityNames.some(co=>!COMMUNITY_READINGS[co]))throw Error('地域のデータまたは読みが不正です');");
replace("primaryOverrides:{'岡田山':'上ヶ原'},\n  additionalRegions:{'岡田山':['広田'],'上甲東園':['甲東']}","...(config.membership||{})");
const splitStart=code.indexOf(" const expected={'上ヶ原':4,'甲東':2};"),splitEnd=code.indexOf(" const menu=$('communityOptions');",splitStart);
replace(code.slice(splitStart,splitEnd),` for(const split of config.regionalSplits||[]){
  const parts=subtopology.objects[config.objectName].geometries.filter(g=>g.properties[split.sourceProperty]===split.region);
  if(parts.length!==split.expectedParts)throw Error('地域別形状の件数が不一致: '+split.region);
  const region=topojson.merge(subtopology,parts);
  region.properties={S_NAME:split.town,community:split.region};
  regionalShapes.set(split.region+':'+split.town,region);
 }
`);
replace("else button.textContent='西宮市全域';","else button.textContent=config.name+'全域';");
replace("'西宮市全域（321町名）'","config.name+'全域（'+config.expectedTownCount+'町名）'");
replace("const note=$('boundaryNote'),special=communityChoice==='上ヶ原'||communityChoice==='広田';\n note.hidden=!special;\n if(special)note.textContent='岡田山（おかだやま）は町全体を対象にしています。1〜3番は広田、4〜7番は上ヶ原です。番地単位の境界線は描かず、紫色で町全体を表示します。';",`const note=$('boundaryNote'),notes=Object.values(config.annotations||{}).filter(a=>a.regions.includes(communityChoice)).map(a=>a.note);
 note.hidden=notes.length===0;note.textContent=notes.join(' ');`);
replace("isSpecial:d=>Boolean(communityChoice&&d.properties.S_NAME==='岡田山'),","isSpecial:d=>Boolean(communityChoice&&config.annotations?.[d.properties.S_NAME]?.regions.includes(communityChoice)),");
replace("function okadaExplanation(){\n return '岡田山は町全体を出題しています。1〜3番は'+regionLabel('広田')+'、4〜7番は'+regionLabel('上ヶ原')+'の区域です。';\n}","function townExplanation(name){return config.annotations?.[name]?.quiz||''}");
replace("(name==='岡田山'&&communityChoice?' '+okadaExplanation():'')","(communityChoice&&townExplanation(name)?' '+townExplanation(name):'')");
replace("(target==='岡田山'&&communityChoice?' '+okadaExplanation():'')","(communityChoice&&townExplanation(target)?' '+townExplanation(target):'')");
replace(code.slice(code.indexOf('KussoonTownSvgDataContract.load({'),code.indexOf(' fetchJSON:async url=>{')),`KussoonTownSvgDataContract.load(config,{
`);
replace("'SVG描画：321町名・26コミュニティ読み込み完了（比較試作・未採用）。町を押すと点滅します。'","'SVG描画：'+config.expectedTownCount+'町名・'+config.expectedRegionCount+'地域読み込み完了（比較試作・未採用）。町を押すと点滅します。'");
replace("'/v2/geography/#town:jp-hyogo-nishinomiya:'","'/v2/geography/#town:'+config.municipalityId+':'");
replace("'指定された町名は見つかりません。西宮市全域を表示しています。'","'指定された町名は見つかりません。'+config.name+'全域を表示しています。'");
replace(" features=loadedFeatures;",` features=loadedFeatures;
 document.title=config.name+'｜共通町名マップ比較試作';
 $('pageTitle').textContent=document.title;
 $('hierarchyReturn').href='/v2/geography/#'+config.municipalityId;
 $('map').setAttribute('aria-label',config.name+'の町名マップ');
 $('frame').setAttribute('aria-label',config.name+'町名マップ');`);
code=code.replace(/\}\)\(\);\s*$/,"})().catch(e=>{document.getElementById('status').textContent='読み込み失敗：'+e.message;console.error(e)});\n");
replace(" $('zoomSlider').value=String(Math.log(transform.k/.6)/Math.log(40/.6)*100);\n document.querySelector('.zoom-slider-track').style.setProperty('--zoom-percent',$('zoomSlider').value);",
 " sliderController.setValue(Math.log(transform.k/.6)/Math.log(40/.6)*100);");
const sliderStart=code.indexOf('let sliderFrame=0,sliderValue=0;'),sliderEnd=code.indexOf('new ResizeObserver(entries=>{',sliderStart);
replace(code.slice(sliderStart,sliderEnd),`const sliderController=KussoonTownMapZoomSlider.install({
 element:$('zoomSlider'),
 onStart:()=>{cLabelReflow();fittedView=false;svg.interrupt()},
 onChange:value=>{
  fittedView=false;
  const k=.6*Math.pow(40/.6,value/100),cx=baseWidth/2,cy=baseHeight/2;
  svg.interrupt().call(zoom.transform,d3.zoomIdentity
   .translate(cx-(cx-transform.x)*k/transform.k,cy-(cy-transform.y)*k/transform.k).scale(k));
 }
});
`);
// Preserve per-question mistake colors when stopping/restarting the answer timer.
// Keep scoring in the existing shared quiz-state module; no city-specific grading.
replace(" quizTimer=null;quizTarget='';quizBlinkOn=false;\n clearTownStyles();",
 " quizTimer=null;quizTarget='';quizBlinkOn=false;\n areas.selectAll('path.town').classed('selected',false).classed('dim',false);");
replace(" stopQuizBlink();quizMode=0;quizLocked=false;quizSession=null;",
 " stopQuizBlink();clearTownStyles();quizMode=0;quizLocked=false;quizSession=null;");
replace(" stopQuizBlink();quizWrongPlaces.clear();",
 " stopQuizBlink();clearTownStyles();quizWrongPlaces.clear();");
replace(" stopQuizBlink();highlightQuizTown(name,true);"," startQuizBlink(name);");
replace("'答えは「'+townLabel(target)+'」です。'","'点滅している場所が「'+townLabel(target)+'」です。'");
replace(" refreshLabels();\n}\nfunction choose(name){",` refreshLabels();
 // SVG redraw/fullscreen must restore current-question feedback from shared state.
 if(quizMode){
  for(const name of quizWrongPlaces)highlightQuizTown(name,false,true);
  if(quizTarget)highlightQuizTown(quizTarget,quizBlinkOn);
 }
}
function choose(name){`);
// Reuse the established city fit and direct-link town focus; only their callers change.
replace(" initialK=cScale;", " initialK=cScale;\n zoom.scaleExtent([initialK,40]);");
replace("function onZoom(event){", `function onZoom(event){
 // At the lower bound show the complete municipality, even after a pan/focus.
 if(event.transform.k<=initialK+1e-9&&(Math.abs(event.transform.k-initialK)>1e-9||Math.abs(event.transform.x-cityFitTransform.x)>1e-6||Math.abs(event.transform.y-cityFitTransform.y)>1e-6)){
  svg.call(zoom.transform,cityFitTransform);return;
 }`);
replace("Math.log(transform.k/.6)/Math.log(40/.6)*100", "Math.log(transform.k/initialK)/Math.max(1e-9,Math.log(40/initialK))*100");
replace("const k=.6*Math.pow(40/.6,value/100)", "const k=initialK*Math.pow(40/initialK,value/100)");
replace("const targetScale=Math.min(40,(256/(2*Math.PI))*Math.pow(2,cTargetZoom)/projection.scale());", "const targetScale=Math.max(initialK,Math.min(40,(256/(2*Math.PI))*Math.pow(2,cTargetZoom)/projection.scale()));");
replace(" quizCorrect(target);", " quizCorrect(target);\n focusTown(target);");
replace("  choose(quitTown);", "  focusTown(quitTown);");
if(/西宮|宝塚|岡田山|上甲東園/.test(code))throw Error('City-specific runtime remains');
fs.writeFileSync(path.join(out,'town-map.js'),code);
let html=original.slice(0,original.indexOf('<script>\n(()=>'));
html=html.replace(/<title>.*?<\/title>/,'<title>全国共通町名マップ｜共通化実装PR681</title>');
html=html.replace(/<nav class="nav">.*?<\/nav>/s,'<nav class="nav"><a href="?code=28214">宝塚市</a><a href="?code=28204">西宮市・共通化比較</a><a href="/v2/verify-pr595-one-label/">承認済み西宮市基準版</a><a id="hierarchyReturn" href="/v2/geography/">世界から町へ</a></nav>');
html=html.replace(/<h1>.*?<\/h1>/,'<h1 id="pageTitle">全国共通町名マップ｜比較試作</h1>');
const updated=new Date(process.env.TOWN_MAP_UPDATED_AT||Date.now());
if(!Number.isFinite(updated.getTime()))throw Error('Invalid update timestamp');
const display=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(updated).replace(/-/g,'/');
const release=updated.toISOString().replace(/[^0-9]/g,'');
html=html.replace(/<time.*?<\/time>/s,'<time class="updated-at" id="updatedAt" datetime="'+updated.toISOString()+'">更新：'+display+'（JST）</time>');
html=html.replace(/<p class="notice">.*?<\/p>/s,'<p class="notice"><strong>共通化の実装元は<a href="https://github.com/Kussoon/kussoon.github.io/pull/681">PR #681</a>です。</strong>仕様の起点はPR #595で、承認済みの1ラベル化・操作・性能改善を引き継いでいます。同じ描画・ラベル・操作・採点コードへ自治体別データを接続しています。正式ページは変更していません。</p>');
html=html.replace(/<p class="small">ラベル文字.*?<\/p>/s,'<p class="small">境界：CODH「国勢調査町丁・字等別境界データセット」（e-Stat 2020年国勢調査を加工）、CC BY 4.0、<a href="https://doi.org/10.20676/00000450">DOI:10.20676/00000450</a>。2020年統計境界と現行住所境界は異なります。町名・読み・地域所属は既存の各市台帳を継承しています。</p>');
html=html.replace(/26コミュニティ学習範囲/g,'地域学習範囲').replace(/西宮市全域（321町名）/g,'自治体データ準備中').replace(/SVG版 西宮市町名マップ|西宮市の町域SVG比較試作/g,'町名マップ比較試作');
html=html.replace(/<p class="small">検証ポイント：.*?<\/p>/s,'<p class="small">比較試作：1町名1ラベル。初期の重なりは許容します。拡大・読み仮名・地域切替・クイズ1/2・再タップ解除を確認できます。</p>');
const oldStyles=html.indexOf('.zoom-slider-slot{position:absolute;right:7px;');
if(oldStyles<0)throw Error('Missing native slider styles');
html=html.slice(0,oldStyles)+html.slice(html.indexOf('</style>',oldStyles));
html=html.replace('</style>','</style><link rel="stylesheet" href="./controls.css?rev='+release+'">');
html=html.replace(/<input id="zoomSlider"[^>]+>/,'<div id="zoomSlider" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="地図の拡大縮小" aria-orientation="vertical"></div>');
html+='\n<script src="./zoom-slider.js?rev='+release+'"></script><script src="./town-map.js?rev='+release+'"></script><script defer src="/common/site-footer.js"></script>\n</body></html>\n';
fs.writeFileSync(path.join(out,'index.html'),html);
console.log('Extracted same shared runtime and Nishinomiya configuration');
