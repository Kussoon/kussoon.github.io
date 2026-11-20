(async()=>{'use strict';
const requestedCode=new URLSearchParams(location.search).get('code')||'28214';
if(!/^[0-9]{5}$/.test(requestedCode))throw Error('自治体コードが不正です');
const response=await fetch('./data/'+requestedCode+'.json');
if(!response.ok)throw Error('自治体設定の読み込みに失敗しました');
const config=await response.json();
const READINGS=config.readings,LABEL_OFFSETS=config.labelOffsets||{},MULTI_LABELS=config.multiLabels||{},EXTRA_LABELS=config.extraLabels||{};
const $=id=>document.getElementById(id), svg=d3.select('#map'), world=d3.select('#world'), areas=d3.select('#areas'), labels=d3.select('#labels');
let features=[], projection,path,transform=d3.zoomIdentity,baseWidth=0,baseHeight=0,initialK=1,cityFitTransform=d3.zoomIdentity,cBaselineLabelShifts=new Map(),cLabelReflowMetrics=new Map(),cLabelMode='initial',cRebaseline=false,directLinkFontOffset=0,fittedView=true,selected='',blinkTimer=null,blinkOn=false,fontPct=100,readingOn=false,anchorMode='leaflet',zoom,communityChoice='',communityNames=[],communityByTown=new Map(),membership=null,regionalShapes=new Map(),adjacency=new Map(),quizGeography=null,quizSession=null,quizMode=0,quizLastMode=0,quizOrder=[],quizIndex=0,quizScore=0,quizWrong=new Set(),quizLocked=false,quizWrongPlaces=new Set(),quizTimer=null,quizBlinkOn=false,quizTarget='',quizWrongTownNames=new Set();
function size(){const r=$('map').getBoundingClientRect();return [Math.max(1,r.width),Math.max(1,r.height)]}
// Leaflet 1.9.x Polygon.getCenter uses the first exterior ring of a polygon
// and a projected shoelace centroid, rather than d3.geoPath's weighted
// multi-part centroid. This is a separate comparison option, not an
// approved replacement for the 2026-11-14 C baseline.
function leafletLikeCenter(feature){
 const geometry=feature.geometry;
 if(!geometry)return path.centroid(feature);
 const ring=geometry.type==='Polygon'?geometry.coordinates?.[0]:
  geometry.type==='MultiPolygon'?geometry.coordinates?.[0]?.[0]:null;
 if(!ring||ring.length<3)return path.centroid(feature);
 const points=ring.map(point=>projection(point));
 if(points.some(p=>!p||p.some(v=>!Number.isFinite(v))))return path.centroid(feature);
 let twiceArea=0,x=0,y=0;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i],cross=a[0]*b[1]-b[0]*a[1];
  twiceArea+=cross;x+=(a[0]+b[0])*cross;y+=(a[1]+b[1])*cross;
 }
 if(Math.abs(twiceArea)<1e-10)return points[0];
 return [x/(3*twiceArea),y/(3*twiceArea)];
}
function projectedAt(f){return anchorMode==='leaflet'?leafletLikeCenter(f):path.centroid(f)}
const COMMUNITY_READINGS=config.regionReadings;
function regionLabel(co){return co+'（'+COMMUNITY_READINGS[co]+'）'}
const groupedName=s=>String(s||'').replace(/[一二三四五六七八九十百]+丁目$/,'');
function inCommunity(name,co){return membership.belongs(name,co)}
function activeFeatures(){return communityChoice?features.filter(f=>inCommunity(f.properties.S_NAME,communityChoice)).map(f=>regionalShapes.get(communityChoice+':'+f.properties.S_NAME)||f):features}
function buildAdjacency(topology){
 quizGeography=KussoonTownSvgQuizGeography.create({
  topology,features,objectName:'town',nameProperty:'S_NAME',
  geoCentroid:feature=>d3.geoCentroid(feature),geoDistance:(a,b)=>d3.geoDistance(a,b)
 });
 adjacency=quizGeography.adjacency;
}
function initCommunityData(mapping,subtopology){
 communityNames=[...(mapping.communities||[])];
 if(communityNames.length!==config.expectedRegionCount||communityNames.some(co=>!COMMUNITY_READINGS[co]))throw Error('地域のデータまたは読みが不正です');
 // Nationwide display contract, now handled by the reusable SVG UI helper.
 // Only display order is changed; the source mapping remains immutable.
 communityNames=KussoonTownSvgUI.sortRegionsByReading(communityNames,COMMUNITY_READINGS);
 // Shared membership ranking with Nishinomiya-specific, explicit exceptions.
 // Keep the primary Map for existing same-region quiz distractor selection.
 membership=KussoonTownSvgMembership.build(mapping,{
  normalizeName:groupedName,
  ...(config.membership||{})
 });
 communityByTown=membership.primary;
 for(const split of config.regionalSplits||[]){
  const parts=subtopology.objects[config.objectName].geometries.filter(g=>g.properties[split.sourceProperty]===split.region);
  if(parts.length!==split.expectedParts)throw Error('地域別形状の件数が不一致: '+split.region);
  const region=topojson.merge(subtopology,parts);
  region.properties={S_NAME:split.town,community:split.region};
  regionalShapes.set(split.region+':'+split.town,region);
 }
 const menu=$('communityOptions');
 for(const co of ['',...communityNames]){
  const button=document.createElement('button');button.type='button';button.dataset.community=co;
  if(co){const strong=document.createElement('strong');strong.textContent=co;const small=document.createElement('small');small.textContent=COMMUNITY_READINGS[co];button.append(strong,small)}
  else button.textContent=config.name+'全域';
  button.onclick=()=>{cLabelReflow();communityChoice=co;menu.hidden=true;$('communityToggle').setAttribute('aria-expanded','false');showCommunity();$('communityToggle').focus()};
  menu.appendChild(button);
 }
 $('communityToggle').disabled=false;
 $('quizOne').disabled=false;
 $('quizTwo').disabled=false;
 showCommunity();
}
function regionFit(){
 if(cLabelMode==='centered')cRebaseline=true;
 fittedView=true;directLinkFontOffset=0;
 const active=activeFeatures();if(!active.length)return;
 // Compare regional fit with Leaflet C: geographic envelope, 22px padding,
 // zoomSnap=.1. Do not replace town geometry or label anchor settings.
 const env=[Infinity,Infinity,-Infinity,-Infinity];
 const visit=coords=>{
  if(!Array.isArray(coords))return;
  if(typeof coords[0]==='number'){
   env[0]=Math.min(env[0],coords[0]);env[1]=Math.min(env[1],coords[1]);
   env[2]=Math.max(env[2],coords[0]);env[3]=Math.max(env[3],coords[1]);
  }else for(const part of coords)visit(part);
 };
 for(const feature of active){
  const geometry=feature.geometry||feature;
  if(!geometry?.coordinates)throw Error('地域別形状に座標がありません');
  visit(geometry.coordinates);
 }
 const y=lat=>Math.log(Math.tan(Math.PI/4+Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/360));
 const atZeroX=256*(env[2]-env[0])/360;
 const atZeroY=256*(y(env[3])-y(env[1]))/(2*Math.PI);
 const rawZoom=Math.log2(Math.min(
  Math.max(1,baseWidth-44)/Math.max(1e-9,atZeroX),
  Math.max(1,baseHeight-44)/Math.max(1e-9,atZeroY)));
 const leafletZoom=Math.max(9,Math.min(19,Math.floor((rawZoom+1e-9)*10)/10));
 const factor=Math.max(.6,Math.min(40,256*Math.pow(2,leafletZoom)/(2*Math.PI*projection.scale())));
 const centerMercatorY=(y(env[1])+y(env[3]))/2;
 const centerLat=(2*Math.atan(Math.exp(centerMercatorY))-Math.PI/2)*180/Math.PI;
 const center=projection([(env[0]+env[2])/2,centerLat]);
 svg.call(zoom.transform,d3.zoomIdentity.translate(baseWidth/2-factor*center[0],baseHeight/2-factor*center[1]).scale(factor));
}
function showCommunity(){
 stopQuiz(false);
 stopBlink();
 renderLayers();
 $('communityToggle').textContent=(communityChoice?regionLabel(communityChoice):config.name+'全域（'+config.expectedTownCount+'町名）')+' ▾';
 const count=activeFeatures().length;
 $('communityCount').textContent=communityChoice?regionLabel(communityChoice)+'：'+count+'町名':'市全域：'+count+'町名';
 const note=$('boundaryNote'),notes=Object.values(config.annotations||{}).filter(a=>a.regions.includes(communityChoice)).map(a=>a.note);
 note.hidden=notes.length===0;note.textContent=notes.join(' ');
 for(const btn of $('communityOptions').querySelectorAll('button')){const current=btn.dataset.community===communityChoice;btn.classList.toggle('active',current);btn.setAttribute('aria-pressed',String(current))}
 if(communityChoice)regionFit();else reset();
}
$('communityToggle').onclick=()=>{const x=$('communityOptions');x.hidden=!x.hidden;$('communityToggle').setAttribute('aria-expanded',String(!x.hidden))};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#communityOptions')&&!e.target.closest('#communityToggle')){$('communityOptions').hidden=true;$('communityToggle').setAttribute('aria-expanded','false')}});

function fontPixels(){return KussoonTownSvgLabelViewport.fontPixels({zoomK:transform.k,initialK,directLinkFontOffset,fontPct})}
function labelPositions(f){
 return KussoonTownSvgLabels.positions(f,{
  nameProperty:'S_NAME',multiLabels:MULTI_LABELS,extraLabels:EXTRA_LABELS,
  labelOffsets:LABEL_OFFSETS,projection,projectedAt
 });
}
// SVG tspan.getBoundingClientRect() can include the parent <text> extent in WebKit.
// Convert the glyph's own SVG local getBBox() into viewport coordinates instead.
function townTspanScreenRect(el){
 // V34 isolated comparison: Browser text-node Range returns the real line box.
 // WebKit's tspan getBBox() can return the entire parent text dimensions,
 // making the C-style name anchor shift whenever reading is toggled.
 const range=document.createRange();
 range.selectNodeContents(el);
 const actual=range.getBoundingClientRect();
 if(actual.width>0&&actual.height>0)return actual;
 const b=el.getBBox(),m=el.getScreenCTM();
 if(!m)return el.getBoundingClientRect();
 const corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]]
  .map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
 const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x));
 const top=Math.min(...corners.map(p=>p.y)),bottom=Math.max(...corners.map(p=>p.y));
 return {left,right,top,bottom,width:right-left,height:bottom-top};
}
function cLabelReflow(){cLabelMode='centered';cRebaseline=true}
// Cache glyph geometry relative to its anchor at a known font size.
// Translation and uniform font scaling do not require new DOM measurements.
const labelGlyphMetrics=new Map();
let labelMeasureCount=0;
function updateLabelSize(){
 // V16 comparison: retain shared font/reading layout, but put the rendered
 // label's bottom-right at the same polygon anchor as Leaflet C tooltip.
 KussoonTownSvgLabelViewport.update({labels,svg,transform,fittedView:false,readingOn,fs:fontPixels()});
 const mapBounds=svg.node().getBoundingClientRect();
 labels.selectAll('g.label').each(function(d){
  const text=this.querySelector('text.town-label');if(!text)return;
  const targetX=mapBounds.left+d.point[0]*transform.k+transform.x+d.offset[0];
  const targetY=mapBounds.top+d.point[1]*transform.k+transform.y+d.offset[1];
  const fs=fontPixels();
  let metrics=labelGlyphMetrics.get(d.id);
  if(!metrics){
   const b=text.getBoundingClientRect();
   const nameTspan=text.querySelector('tspan.town-name');
   const n=nameTspan?townTspanScreenRect(nameTspan):null;
   metrics={fs,box:{left:b.left-targetX,top:b.top-targetY,width:b.width,height:b.height},
    name:n?{left:n.left-targetX,top:n.top-targetY,width:n.width,height:n.height}:null};
   labelGlyphMetrics.set(d.id,metrics);labelMeasureCount++;
  }
  const ratio=fs/metrics.fs;
  const rect=m=>m?{left:targetX+m.left*ratio,top:targetY+m.top*ratio,
   right:targetX+(m.left+m.width)*ratio,bottom:targetY+(m.top+m.height)*ratio,
   width:m.width*ratio,height:m.height*ratio}:null;
  const box=rect(metrics.box),nameRect=rect(metrics.name);
  // Retain the original 8px label's placement correction. C tooltip
  // content/size changes do not necessarily recenter its anchor each time.
  let baseline=cBaselineLabelShifts.get(d.id);
  if(!baseline){
   baseline={dx:targetX-box.right,dy:targetY-box.bottom,width:box.width,height:box.height};
   cBaselineLabelShifts.set(d.id,baseline);
  }
  // Leaflet C tooltip's element origin stays fixed as content/font grows.
  // Preserve its initial top/left corner instead of recentering the new box.
  let dx=baseline.dx+(box.width-baseline.width)/2;
  let dy=baseline.dy+(box.height-baseline.height)/2;
  if(cLabelMode==='centered'&&nameRect){
   let ref=cLabelReflowMetrics.get(d.id);
   if(!ref||cRebaseline){
    ref={width:box.width,height:box.height};
    cLabelReflowMetrics.set(d.id,ref);
   }
   // Reflow after reading change or a map fit centers C's name glyph at
   // the town anchor. Only subsequent pure font changes grow from that anchor.
   const desiredCenter=targetX+(box.width-ref.width)/2;
   const desiredBottom=targetY+(box.height-ref.height)/2;
   dx=desiredCenter-(nameRect.left+nameRect.width/2);
   dy=desiredBottom-nameRect.bottom;
   // V34: Leaflet C re-centers its tooltip glyph at the town coordinate
   // during region/full-city fit when reading is OFF. The V34 name-bottom
   // anchor incorrectly leaves it half a glyph-height above that point.
   // Preserve the carefully validated V34 reading-ON name/reading layout.
   if(!readingOn){
    dx=targetX-(nameRect.left+nameRect.width/2);
    dy=targetY-(nameRect.top+nameRect.height/2);
   }
  }
  this.setAttribute('transform','translate('+
   (d.point[0]+(d.offset[0]+dx)/transform.k)+','+
   (d.point[1]+(d.offset[1]+dy)/transform.k)+') scale('+(1/transform.k)+')');
 });
 cRebaseline=false;
 svg.attr('data-label-measurements',labelMeasureCount);
}
function refreshLabels(){
 labelGlyphMetrics.clear();
 const data=KussoonTownSvgLabels.makeData(activeFeatures(),labelPositions,'S_NAME');
 KussoonTownSvgLabels.render(labels,data,d3,READINGS,readingOn);
 updateLabelSize();
}
function clearTownStyles(){
 areas.selectAll('path.town').classed('selected',false).classed('dim',false).classed('wrong',false);
}
function stopBlink(){
 if(blinkTimer!==null)clearInterval(blinkTimer);
 blinkTimer=null;selected='';blinkOn=false;clearTownStyles();
}
function renderLayers(){
 KussoonTownSvgRender.render({
  areas,features:activeFeatures(),path,nameProperty:'S_NAME',
  isSpecial:d=>Boolean(communityChoice&&config.annotations?.[d.properties.S_NAME]?.regions.includes(communityChoice)),
  onSelect:name=>{
   if(quizMode===1){quizMapAnswer(name);return}
   if(quizMode===2)return;
   choose(name);
  }
 });
 refreshLabels();
}
function choose(name){
 if(quizMode)return;
 if(selected===name){stopBlink();$('status').textContent=name+' の点滅を停止しました。';return}
 stopBlink();selected=name;blinkOn=true;const display=()=>areas.selectAll('path.town').classed('selected',d=>d.properties.S_NAME===name).classed('dim',d=>d.properties.S_NAME===name&&!blinkOn);
 display();blinkTimer=setInterval(()=>{blinkOn=!blinkOn;display()},500);
 $('status').textContent=name+(READINGS[name]?'（'+READINGS[name]+'）':'')+' を選択中です。';
}
function draw(){
 [baseWidth,baseHeight]=size();
 const frame=KussoonTownSvgRender.frame({
  svg,world,d3,features,width:baseWidth,height:baseHeight,padding:22,transform
 });
 projection=frame.projection;path=frame.path;
 // Leaflet C: fitBounds({padding:[22,22]}) and zoomSnap=.1.
 // Round down the geographic fit zoom to 0.1, center on geographic bbox.
 const env=[Infinity,Infinity,-Infinity,-Infinity];
 const visit=coords=>{
  if(!Array.isArray(coords))return;
  if(typeof coords[0]==='number'){
   env[0]=Math.min(env[0],coords[0]);env[1]=Math.min(env[1],coords[1]);
   env[2]=Math.max(env[2],coords[0]);env[3]=Math.max(env[3],coords[1]);
  }else for(const item of coords)visit(item);
 };
 for(const feature of features)visit(feature.geometry.coordinates);
 const mercatorY=lat=>Math.log(Math.tan(Math.PI/4+Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/360));
 const w0=256*(env[2]-env[0])/360,h0=256*(mercatorY(env[3])-mercatorY(env[1]))/(2*Math.PI);
 const rawZoom=Math.log2(Math.min(
  Math.max(1,baseWidth-44)/Math.max(1e-9,w0),
  Math.max(1,baseHeight-44)/Math.max(1e-9,h0)));
 const cZoom=Math.max(9,Math.min(19,Math.floor((rawZoom+1e-9)*10)/10));
 const cScale=Math.min(40,Math.max(.6,256*Math.pow(2,cZoom)/(2*Math.PI*projection.scale())));
 const cCenter=projection([(env[0]+env[2])/2,(env[1]+env[3])/2]);
 cityFitTransform=d3.zoomIdentity.translate(baseWidth/2-cScale*cCenter[0],baseHeight/2-cScale*cCenter[1]).scale(cScale);
 initialK=cScale;
 renderLayers();
 frame.applyWorld();
}
function onZoom(event){
 const previousK=transform.k;
 if(event.sourceEvent){fittedView=false;if(cLabelMode!=='centered')cLabelReflow()}
 transform=event.transform;world.attr('transform',transform.toString());
 if(transform.k!==previousK||cRebaseline)updateLabelSize();
 sliderController.setValue(Math.log(transform.k/.6)/Math.log(40/.6)*100);
}
zoom=KussoonTownSvgCore.attachZoom(svg,d3,onZoom,.6,40);
// N-GESTURE-04/05: shared gestures preserve Leaflet C's wheel arming,
// background click, D3 double-click, touch/drag, and zoom filter behavior.
KussoonTownSvgGestures.install({
 svg,zoom,document,
 getQuizMode:()=>quizMode,getSelected:()=>selected,stopBlink
});
function reset(){fittedView=true;directLinkFontOffset=0;if(communityChoice)regionFit();else svg.call(zoom.transform,cityFitTransform)}
$('anchorMode').onclick=()=>{
 anchorMode=anchorMode==='svg'?'leaflet':'svg';
 $('anchorMode').textContent=anchorMode==='leaflet'?'配置：C方式':'配置：現行SVG';
 $('anchorMode').setAttribute('aria-pressed',String(anchorMode==='leaflet'));
 refreshLabels();
 $('status').textContent=anchorMode==='leaflet'
  ?'C版の多角形中心計算を参考にしたラベル位置です（比較試作・未採用）。'
  :'初期SVGのラベル位置です（比較試作・未採用）。';
};
function focusTown(name){
 cLabelReflow();fittedView=false;
 const town=features.find(f=>f.properties.S_NAME===name);
 if(!town)return false;
 // Keep the geographic projection stable, and zoom the SVG view to the selected town.
 const bounds=path.bounds(town);
 if(bounds.some(p=>p.some(v=>!Number.isFinite(v))))return false;
 // C baseline direct-link maxZoom:15. Convert that geographic zoom cap into
 // the SVG projection's relative scale, without introducing Leaflet runtime.
 // Leaflet's geographic zoom 0 uses 256 world pixels, D3's Mercator scale
 // uses world circumference 2*PI*projection.scale().
 const fit=KussoonTownSvgViewport.fitBounds(bounds,baseWidth,baseHeight,100,.6,40);
 if(!fit)return false;
 // Compute the Leaflet C absolute geographic zoom from each polygon's
 // lat/lon envelope, then express it as a scale on the current D3 Mercator.
 // This avoids the 0.1-step initial-zoom discrepancy on narrow viewports.
 const getEnvelope=shapes=>{
  const env=[Infinity,Infinity,-Infinity,-Infinity];
  const visit=coords=>{
   if(!Array.isArray(coords))return;
   if(typeof coords[0]==='number'){
    env[0]=Math.min(env[0],coords[0]);env[1]=Math.min(env[1],coords[1]);
    env[2]=Math.max(env[2],coords[0]);env[3]=Math.max(env[3],coords[1]);
   }else for(const item of coords)visit(item);
  };
  for(const shape of shapes)visit(shape.geometry.coordinates);
  return env;
 };
 const mercatorY=lat=>Math.log(Math.tan(Math.PI/4+Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/360));
 const leafletFitZoom=(envelope,totalPadding,maxZoom)=>{
  const widthAtZero=256*(envelope[2]-envelope[0])/360;
  const heightAtZero=256*(mercatorY(envelope[3])-mercatorY(envelope[1]))/(2*Math.PI);
  const raw=Math.log2(Math.min(
   Math.max(1,baseWidth-totalPadding)/Math.max(1e-9,widthAtZero),
   Math.max(1,baseHeight-totalPadding)/Math.max(1e-9,heightAtZero)));
  return Math.max(9,Math.min(maxZoom,Math.floor((raw+1e-9)*10)/10));
 };
 const cInitialZoom=leafletFitZoom(getEnvelope(features),44,19);
 const cTargetZoom=leafletFitZoom(getEnvelope([town]),100,15);
 const targetScale=Math.min(40,(256/(2*Math.PI))*Math.pow(2,cTargetZoom)/projection.scale());
 // At a direct link, align the text size with C's zoom delta while keeping
 // the SVG's initial 8px label size unchanged in ordinary map mode.
 directLinkFontOffset=cTargetZoom-cInitialZoom-Math.log2(targetScale/initialK);
 const cx=(bounds[0][0]+bounds[1][0])/2;
 const cy=(bounds[0][1]+bounds[1][1])/2;
 svg.call(zoom.transform,d3.zoomIdentity.translate(baseWidth/2-targetScale*cx,baseHeight/2-targetScale*cy).scale(targetScale));
 choose(name);
 return true;
}
function changeZoom(factor){fittedView=false;KussoonTownSvgCore.zoomBy(svg,zoom,factor,150)}
const sliderController=KussoonTownMapZoomSlider.install({
 element:$('zoomSlider'),
 onStart:()=>{cLabelReflow();fittedView=false;svg.interrupt()},
 onChange:value=>{
  fittedView=false;
  const k=.6*Math.pow(40/.6,value/100),cx=baseWidth/2,cy=baseHeight/2;
  svg.interrupt().call(zoom.transform,d3.zoomIdentity
   .translate(cx-(cx-transform.x)*k/transform.k,cy-(cy-transform.y)*k/transform.k).scale(k));
 }
});
new ResizeObserver(entries=>{
 $('frame').style.setProperty('--control-height',entries[0].target.getBoundingClientRect().height+'px');
}).observe(document.querySelector('.controls'));
$('zoomIn').onclick=()=>changeZoom(2);$('zoomOut').onclick=()=>changeZoom(.5);
$('smaller').onclick=()=>{fontPct=Math.max(75,fontPct-25);updateLabelSize()};
$('larger').onclick=()=>{fontPct=Math.min(200,fontPct+25);updateLabelSize()};
$('size').onclick=()=>{fontPct=100;$('size').textContent='文字\n100\n％';updateLabelSize()};
$('reading').onclick=()=>{cLabelReflow();readingOn=!readingOn;$('reading').textContent='よみ\nがな\n'+(readingOn?'ON':'OFF');$('reading').setAttribute('aria-pressed',String(readingOn));refreshLabels()};
$('fullscreen').onclick=()=>{cLabelReflow();document.body.classList.toggle('fullscreen');$('fullscreen').textContent=document.body.classList.contains('fullscreen')?'戻る':'全画面';setTimeout(()=>{draw();reset()},60)};

/* Quiz controls adapted from the PR #470 Leaflet C baseline:
   grading, 0.5s flashing, missed-question retry and region scope. */
function shuffleQuiz(values){
 const result=[...values];
 for(let i=result.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}
function townLabel(name){return name+'（'+(READINGS[name]||'読み未登録')+'）'}
function townExplanation(name){return config.annotations?.[name]?.quiz||''}
function scoreLabel(){
 $('quizProgress').textContent=(quizIndex+1)+' / '+quizOrder.length+'問　得点 '+quizScore;
}
function highlightQuizTown(name,on,wrong=false){
 areas.selectAll('path.town').filter(d=>d.properties.S_NAME===name)
  .classed('selected',on&&!wrong)
  .classed('dim',false)
  .classed('wrong',wrong);
}
function stopQuizBlink(){
 if(quizTimer!==null)clearInterval(quizTimer);
 quizTimer=null;quizTarget='';quizBlinkOn=false;
 clearTownStyles();
}
function stopQuiz(returnToMap){
 stopQuizBlink();quizMode=0;quizLocked=false;quizSession=null;
 document.body.classList.remove('town-quiz-mode');
 $('quizPanel').hidden=true;$('quizResults').hidden=true;
 $('quizFeedback').textContent='';
 if(returnToMap){showCommunity();}
}
function resetQuestion(){
 stopQuizBlink();quizWrongPlaces.clear();
 $('quizChoices').replaceChildren();$('quizNext').hidden=true;
 $('quizNext').textContent='次の問題へ';
 $('quizReveal').hidden=true;$('quizFeedback').textContent='';
}
function scopeNames(){return activeFeatures().map(f=>f.properties.S_NAME)}
function syncQuizFromSession(){
 quizMode=quizSession.mode;quizOrder=quizSession.order;
 quizIndex=quizSession.index;quizScore=quizSession.score;
 quizWrong=quizSession.wrong;quizWrongPlaces=quizSession.wrongPlaces;
 quizLocked=quizSession.locked;
}
function startQuiz(mode,forcedNames){
 stopQuiz(false);stopBlink();
 // Status belongs to map navigation, not a new quiz session.
 // In particular clear the interrupted-town message left by finishQuiz(true).
 $('status').textContent='クイズ'+mode+'を実施中です。';
 const pool=forcedNames?.length?forcedNames:scopeNames();
 if(!pool.length)return;
 quizSession=KussoonTownSvgQuizState.begin(mode,pool,shuffleQuiz);
 quizLastMode=mode;syncQuizFromSession();
 $('quizResults').hidden=true;$('quizPanel').hidden=false;
 document.body.classList.add('town-quiz-mode');
 loadQuizQuestion();
}
function choiceCandidates(target){
 return KussoonTownSvgQuizChoices.select(target,{
  townNames:features.map(f=>f.properties.S_NAME),
  scopeNames:scopeNames(),
  adjacency,
  primaryRegion:communityByTown,
  distance:quizGeography.distanceFrom(target),
  shuffle:shuffleQuiz
 });
}
function loadQuizQuestion(){
 if(quizIndex>=quizOrder.length){finishQuiz(false);return}
 quizSession.locked=false;syncQuizFromSession();resetQuestion();
 scoreLabel();
 if(quizIndex===0)reset();
 const target=quizOrder[quizIndex];
 if(quizMode===1){
  $('quizQuestion').textContent='「'+townLabel(target)+'」の場所を押してください。';
  $('quizFeedback').textContent='地図の区域を押してください。';
  $('quizReveal').hidden=false;
 }else{
  $('quizQuestion').textContent='黄色く点滅する町名を選んでください。';
  for(const name of choiceCandidates(target)){
   const button=KussoonTownSvgUI.makeQuizChoice(document,name,READINGS[name],quizChoiceAnswer);
   $('quizChoices').append(button);
  }
  startQuizBlink(target);
 }
}
function startQuizBlink(name){
 stopQuizBlink();quizTarget=name;quizBlinkOn=true;
 highlightQuizTown(name,true);
 quizTimer=setInterval(()=>{
  quizBlinkOn=!quizBlinkOn;
  highlightQuizTown(name,quizBlinkOn);
 },500);
}
function quizMapAnswer(name){
 if(quizMode!==1||quizLocked)return;
 const grade=KussoonTownSvgQuizState.mapAnswer(quizSession,name);
 syncQuizFromSession();
 if(grade.kind==='ignored')return;
 if(grade.kind==='wrong'){
  highlightQuizTown(name,false,true);
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
  $('quizFeedback').textContent='違います。「'+townLabel(name)+'」ではありません。もう一度選んでください。';
  scoreLabel();return;
 }
 quizCorrect(name);
 button.classList.add('quiz-correct');
 for(const child of $('quizChoices').children)child.disabled=true;
}
function quizCorrect(name){
 KussoonTownSvgQuizState.markCorrect(quizSession);syncQuizFromSession();
 stopQuizBlink();highlightQuizTown(name,true);
 $('quizFeedback').textContent='正解です！ '+townLabel(name)+(communityChoice&&townExplanation(name)?' '+townExplanation(name):'');
 $('quizReveal').hidden=true;$('quizNext').hidden=false;
 $('quizNext').textContent=quizIndex===quizOrder.length-1?'結果発表':'次の問題へ';
 scoreLabel();
}
function quizReveal(){
 if(quizLocked)return;
 const grade=KussoonTownSvgQuizState.reveal(quizSession);
 syncQuizFromSession();
 if(grade.kind==='ignored')return;
 const target=quizOrder[quizIndex];
 quizCorrect(target);
 $('quizFeedback').textContent='答えは「'+townLabel(target)+'」です。'+(communityChoice&&townExplanation(target)?' '+townExplanation(target):'');
}
function finishQuiz(quitEarly=false){
 const summary=KussoonTownSvgQuizState.result(quizSession,quitEarly);
 const answered=summary.answered;
 // Preserve the question active at the moment "ここでやめる" is pressed.
 const quitTown=summary.interruptedTown;
 resetQuestion();quizMode=0;document.body.classList.remove('town-quiz-mode');
 $('quizPanel').hidden=true;$('quizResults').hidden=false;
 $('quizResult').textContent=quitEarly
  ?'途中終了：'+answered+' / '+quizOrder.length+'問終了（間違えた問題 '+quizWrong.size+'件）'
  :quizOrder.length+'問中 '+quizScore+'点（間違えた問題 '+quizWrong.size+'件）';
 // Full marks: there is no missed question to retry; hide this action entirely.
 $('quizRetryWrong').hidden=quizWrong.size===0;
 $('quizRetryWrong').disabled=quizWrong.size===0;
 // Labels are visible again. Flash only the interrupted question's town;
 // normal map selection can stop the flash, and restarting a quiz cleans it up.
 if(quitTown&&activeFeatures().some(f=>f.properties.S_NAME===quitTown)){
  choose(quitTown);
  $('status').textContent='中断した問題：「'+townLabel(quitTown)+'」を黄色く点滅表示しています。';
 }
}
$('quizOne').onclick=()=>startQuiz(1);
$('quizTwo').onclick=()=>startQuiz(2);
$('quizReveal').onclick=quizReveal;
$('quizNext').onclick=()=>{KussoonTownSvgQuizState.next(quizSession);syncQuizFromSession();loadQuizQuestion()};
$('quizQuit').onclick=()=>finishQuiz(true);
$('quizRetryWrong').onclick=()=>startQuiz(quizLastMode,[...quizWrong]);
$('quizRetryAll').onclick=()=>startQuiz(quizLastMode);
$('quizBack').onclick=()=>stopQuiz(true);

KussoonTownSvgDataContract.load(config,{
 fetchJSON:async url=>{
  const response=await fetch(url);
  if(!response.ok)throw new Error(url+'：HTTP '+response.status);
  return response.json();
 },
 topojsonClient:topojson
}).then(({topology,mapping,subtopology,features:loadedFeatures})=>{
 features=loadedFeatures;
 document.title=config.name+'｜共通町名マップ比較試作';
 $('pageTitle').textContent=document.title;
 $('hierarchyReturn').href='/v2/geography/#'+config.municipalityId;
 $('map').setAttribute('aria-label',config.name+'の町名マップ');
 $('frame').setAttribute('aria-label',config.name+'町名マップ');
 buildAdjacency(topology);
 draw();initCommunityData(mapping,subtopology);
 $('status').textContent='SVG描画：'+config.expectedTownCount+'町名・'+config.expectedRegionCount+'地域読み込み完了（比較試作・未採用）。町を押すと点滅します。';
 const linkedTown=new URLSearchParams(location.search).get('town');
 if(linkedTown){
  if(features.some(f=>f.properties.S_NAME===linkedTown)){
   $('hierarchyReturn').href='/v2/geography/#town:'+config.municipalityId+':'+encodeURIComponent(linkedTown);
   if(focusTown(linkedTown))$('status').textContent='階層ナビゲーションから「'+townLabel(linkedTown)+'」を表示しています。地図を押すと点滅を操作できます。';
  }else $('status').textContent='指定された町名は見つかりません。'+config.name+'全域を表示しています。';
 }
 new ResizeObserver(()=>{const [w,h]=size();if(w!==baseWidth||h!==baseHeight){draw();reset()}}).observe($('map'));
}).catch(e=>{$('status').textContent='読み込み失敗：'+e.message;console.error(e)});
})().catch(e=>{document.getElementById('status').textContent='読み込み失敗：'+e.message;console.error(e)});
