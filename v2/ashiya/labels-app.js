/* Ashiya label placement benchmark UI — independently hosted under /v2/. */
(() => {
  'use strict';
  const E = window.KussoonLabelEngine;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const maps = [ $('map-manual'), $('map-auto') ];
  const full = {x:0,y:0,w:1000,h:1581};
  let view = {...full};
  let models = [], selected = null, activeWheelMap = null;
  let ringsBuildMs = 0, renderCount = 0;
  let layouts = null;
  let reflowFrame = null, adaptiveTimer = null;
  const mapObjects = new Map();
  const activePointers = new Map();
  let dragged = false, suppressClickUntil = 0;

  function element(tag, attrs = {}) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,String(v)));
    return n;
  }
  function paintMaps() {
    for (const svg of maps) {
      if (!svg) continue;
      svg.setAttribute('viewBox', [view.x,view.y,view.w,view.h].join(' '));
    }
  }
  function clampView() {
    view.w = Math.min(full.w,Math.max(75,view.w));
    view.h = view.w * full.h/full.w;
    const marginX=view.w*.15, marginY=view.h*.15;
    view.x=Math.max(-marginX,Math.min(full.w-view.w+marginX,view.x));
    view.y=Math.max(-marginY,Math.min(full.h-view.h+marginY,view.y));
  }
  function zoomAt(scale, rx=.5, ry=.5) {
    if (!Number.isFinite(scale)||scale<=0)return;
    const nextW=Math.min(full.w,Math.max(75,view.w/scale));
    const ratio=nextW/view.w;
    view.x+=(view.w-nextW)*rx;
    view.y+=(view.h-view.h*ratio)*ry;
    view.w=nextW;view.h*=ratio;
    clampView();paintMaps();
    scheduleReflow();
  }
  function moveView(dx,dy,svg) {
    const r=svg.getBoundingClientRect();
    if(!r.width||!r.height)return;
    view.x-=dx/r.width*view.w;
    view.y-=dy/r.height*view.h;
    clampView();paintMaps();
    scheduleReflow();
  }
  function wireMap(svg) {
    svg.addEventListener('wheel', e => {
      if (activeWheelMap!==svg) return;
      e.preventDefault();
      const rect=svg.getBoundingClientRect();
      zoomAt(e.deltaY<0?1.17:1/1.17,(e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height);
    },{passive:false});
    svg.addEventListener('pointerdown', e => {
      if(e.pointerType==='mouse'&&e.button!==0)return;
      activeWheelMap=svg;
      activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,svg});
      dragged=false;
      try{svg.setPointerCapture(e.pointerId);}catch(_){}
    });
    svg.addEventListener('pointermove',e=>{
      const previous=activePointers.get(e.pointerId);
      if(!previous||previous.svg!==svg)return;
      const dx=e.clientX-previous.x, dy=e.clientY-previous.y;
      if(Math.abs(dx)+Math.abs(dy)>2)dragged=true;
      if(activePointers.size===1){
        moveView(dx,dy,svg);
      } else if(activePointers.size===2) {
        const other=[...activePointers.entries()].find(([id,v])=>id!==e.pointerId&&v.svg===svg);
        if(other){
          const prevDist=Math.hypot(previous.x-other[1].x,previous.y-other[1].y);
          const nextDist=Math.hypot(e.clientX-other[1].x,e.clientY-other[1].y);
          const rect=svg.getBoundingClientRect();
          const rx=((e.clientX+other[1].x)/2-rect.left)/rect.width;
          const ry=((e.clientY+other[1].y)/2-rect.top)/rect.height;
          if(prevDist>0&&nextDist>0)zoomAt(nextDist/prevDist,rx,ry);
          moveView(dx*.5,dy*.5,svg);
        }
      }
      activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,svg});
      e.preventDefault();
    });
    function endPointer(e) {
      if(!activePointers.has(e.pointerId))return;
      activePointers.delete(e.pointerId);
      if(dragged)suppressClickUntil=performance.now()+200;
      if(activePointers.size===0)updateVisibleStats();
    }
    svg.addEventListener('pointerup',endPointer);
    svg.addEventListener('pointercancel',endPointer);
    svg.addEventListener('lostpointercapture',endPointer);
    svg.addEventListener('click',e=>{
      activeWheelMap=svg;
      if(performance.now()<suppressClickUntil)return;
      const path=e.target.closest('.town');
      if(path&&path.dataset.index!=null) {
        selected=Number(path.dataset.index);
        relayout();
        $('town-search-result').textContent=models[selected].name+'を地図から選択しました。';
      }
    });
  }
  document.addEventListener('pointerdown',e=>{
    if(!e.target.closest('.map-wrap'))activeWheelMap=null;
  });
  function highlightSelection() {
    for(const obj of mapObjects.values()) {
      obj.paths.forEach((p,i)=>p.classList.toggle('selected',i===selected));
    }
  }
  function makeMap(svg) {
    svg.replaceChildren();
    const shapes=element('g',{'aria-label':'町域'});
    const labels=element('g',{'aria-hidden':'true'});
    const paths=[],texts=[];
    for(let i=0;i<models.length;i++){
      const p=element('path',{class:'town',d:models[i].d,'data-index':i,'aria-label':models[i].name});
      const title=element('title');title.textContent=models[i].name;p.appendChild(title);
      shapes.appendChild(p);paths.push(p);
      const t=element('text',{class:'town-label','data-index':i});
      t.textContent=models[i].name;labels.appendChild(t);texts.push(t);
    }
    svg.append(shapes,labels);
    mapObjects.set(svg,{paths,texts});
    wireMap(svg);
  }
  function measureWidths(size) {
    const canvas=document.createElement('canvas');
    const context=canvas.getContext('2d');
    if(!context)return models.map(m=>m.name.length*size);
    context.font='900 '+size+'px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
    return models.map(m=>context.measureText(m.name).width);
  }
  function printMetrics(id,score,visible,eligible,hiddenByCollision,wrapped=0,shrunk=0) {
    const fields=[
      ['対象町名',models.length],
      ['表示範囲の候補',eligible+'件'],
      ['範囲内のラベル中心',visible.count+'件'],
      ['衝突のため省略',hiddenByCollision+'件'],
      ['表示中の重なり',score.collisions+'組'],
      ['範囲内で文字が区域外',visible.wholeOutside+'件'],
      ['表示中の2行ラベル',wrapped+'件'],
      ['表示中の縮小ラベル',shrunk+'件']
    ];
    $(id).innerHTML=fields.map(([label,v])=>'<div><dt>'+label+'</dt><dd>'+v+'</dd></div>').join('');
  }
  function updateVisibleStats() {
    if(!layouts)return;
    for(const side of ['manual','auto']) {
      const l=layouts[side];
      const indices=l.shown.flatMap((v,i)=>v?[i]:[]);
      const inView=indices.filter(i=>{
        const [x,y]=l.positions[i];
        return x>=view.x&&x<=view.x+view.w&&y>=view.y&&y<=view.y+view.h;
      });
      const score=l.labelLayouts
        ?E.evaluateLabelLayouts(models,l.labelLayouts,indices)
        :E.subsetMetrics(models,l.positions,l.widths,l.size,indices);
      const visible=l.labelLayouts
        ?E.evaluateLabelLayouts(models,l.labelLayouts,inView)
        :E.subsetMetrics(models,l.positions,l.widths,l.size,inView);
      const wrapped=l.labelLayouts?indices.filter(i=>l.labelLayouts[i].wrapped).length:0;
      const shrunk=l.labelLayouts?indices.filter(i=>l.labelLayouts[i].scale<1).length:0;
      printMetrics(side+'-stats',score,visible,l.eligible.filter(Boolean).length,l.hiddenByCollision,wrapped,shrunk);
    }
  }
  function scheduleReflow() {
    // Adaptive candidates are relatively expensive on mobile. Keep the map
    // continuously draggable but compute new multiline layouts after motion.
    if($('layout-mode').value!=='single'){
      if(adaptiveTimer!==null)clearTimeout(adaptiveTimer);
      adaptiveTimer=setTimeout(()=>{adaptiveTimer=null;relayout();},170);
      return;
    }
    if(reflowFrame!==null)return;
    reflowFrame=requestAnimationFrame(()=>{
      reflowFrame=null;relayout();
    });
  }
  function renderedMapWidth() {
    const visible=maps.find(svg=>svg.getBoundingClientRect().width>0);
    return visible?visible.getBoundingClientRect().width:360;
  }
  function drawLabels(svg,positions,problems,size,showProblems,shown,labelLayouts=null) {
    const obj=mapObjects.get(svg);
    if(!obj)return;
    const set=new Set(problems);
    obj.texts.forEach((t,i)=>{
      const l=labelLayouts?labelLayouts[i]:null;
      const font=l?l.fontSize:size;
      const x=positions[i][0], y=positions[i][1];
      t.setAttribute('x',x.toFixed(2));
      t.setAttribute('font-size',String(font));
      t.setAttribute('stroke-width',String(font*.17));
      if(l && l.lines.length===2){
        const lh=font*1.16;
        t.setAttribute('y',(y-lh/2).toFixed(2));
        const first=element('tspan',{x:x.toFixed(2)});
        first.textContent=l.lines[0];
        const second=element('tspan',{x:x.toFixed(2),dy:lh.toFixed(2)});
        second.textContent=l.lines[1];
        t.replaceChildren(first,second);
      } else {
        t.setAttribute('y',y.toFixed(2));
        if(t.children.length || t.textContent!==models[i].name)
          t.textContent=models[i].name;
      }
      t.style.display=shown[i]?'':'none';
      t.classList.toggle('problem',showProblems&&set.has(i));
      t.classList.toggle('selected',i===selected);
    });
  }
  function relayout() {
    if(!models.length)return;
    const px=Number($('font-size').value),mode=$('method').value;
    const showProblems=$('show-problems').checked;
    const width=renderedMapWidth();
    const size=E.screenPixelsToSvgUnits(px,view.w,width);
    const widths=measureWidths(size);
    const t0=performance.now();
    const manual=E.choosePositions(models,widths,size,'manual');
    const seed=E.choosePositions(models,widths,size,mode);
    const lineMode=$('layout-mode').value;
    const measuring=document.createElement('canvas').getContext('2d');
    const measureCache=new Map();
    function measureLine(str,lineSize){
      const key=str+'|'+lineSize;
      if(measureCache.has(key))return measureCache.get(key);
      let value=str.length*lineSize;
      if(measuring){
        measuring.font='900 '+lineSize+'px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
        value=measuring.measureText(str).width;
      }
      measureCache.set(key,value);
      return value;
    }
    // Shrink-only keeps precisely the baseline candidate anchor. This
    // isolates the effect of font size from changes in label placement.
    // Wrap modes can also search for a better interior anchor.
    const autoLayouts=lineMode==='single'?null:
      E.planAdaptiveLabels(models,seed,size,measureLine,{
        wrap:lineMode==='wrap'||lineMode==='wrap-shrink',
        shrink:lineMode==='shrink'||lineMode==='wrap-shrink',
        fixedPosition:lineMode==='shrink'
      });
    const auto=autoLayouts?autoLayouts.map(l=>[l.x,l.y]):seed;
    const autoWidths=autoLayouts?autoLayouts.map(l=>l.width):widths;
    const manualShown=models.map(()=>true);
    const priority=$('priority-mode').value;
    const eligibleManual=E.selectPriorityLabels(models,manual,widths,size,view,{strategy:'area'}).eligible;
    const previous=layouts&&layouts.auto.strategy===priority ? layouts.auto.shown : null;
    const priorityResult=E.selectPriorityLabels(models,auto,autoWidths,size,view,{
      strategy:priority,pinned:selected,previous,
      boxes:autoLayouts?autoLayouts.map(l=>l.box):undefined
    });
    const autoShown=$('declutter').checked ? priorityResult.shown : models.map(()=>true);
    const activeAuto=autoShown.flatMap((shown,i)=>shown?[i]:[]);
    const allManual=manualShown.map((v,i)=>v?i:-1).filter(i=>i!==-1);
    const manualScore=E.subsetMetrics(models,manual,widths,size,allManual);
    const autoScore=autoLayouts
      ?E.evaluateLabelLayouts(models,autoLayouts,activeAuto)
      :E.subsetMetrics(models,auto,autoWidths,size,activeAuto);
    const elapsed=performance.now()-t0;
    layouts={
      manual:{positions:manual,widths,size,shown:manualShown,eligible:eligibleManual,hiddenByCollision:0},
      auto:{
        positions:auto,widths:autoWidths,size,shown:autoShown,eligible:priorityResult.eligible,
        hiddenByCollision:$('declutter').checked?priorityResult.hiddenByCollision:0,
        strategy:priority,labelLayouts:autoLayouts
      }
    };
    drawLabels(maps[0],manual,manualScore.problemIndices,size,showProblems,manualShown);
    // subsetMetrics uses indices local to activeAuto; adaptive metrics use
    // original model indices. Convert before coloring the corresponding labels.
    const autoProblems=autoLayouts ? autoScore.problemIndices :
      autoScore.problemIndices.map(i=>activeAuto[i]);
    drawLabels(maps[1],auto,autoProblems,size,showProblems,autoShown,autoLayouts);
    updateVisibleStats();
    renderCount++;
    const inView=activeAuto.filter(i=>{
      const [x,y]=auto[i];
      return x>=view.x&&x<=view.x+view.w&&y>=view.y&&y<=view.y+view.h;
    }).length;
    $('status').textContent='59町名・60地図面／地図 '+(full.w/view.w).toFixed(2)+'倍。文字 '+px+'px（固定）／自動配置・範囲内'+inView+'件、衝突で省略'+layouts.auto.hiddenByCollision+'件。再配置・計測 '+elapsed.toFixed(1)+'ms（端末参考値）。';
    highlightSelection();
  }
  function setMobileView(mode){
    document.body.dataset.mobileView=mode;
    $('view-manual').setAttribute('aria-pressed',String(mode==='manual'));
    $('view-auto').setAttribute('aria-pressed',String(mode==='auto'));
    scheduleReflow();
  }
  function goToTown(name) {
    const key=name.replace(/[\s　]+/g,'').trim();
    let idx=models.findIndex(m=>m.name===key);
    if(idx<0){
      const candidates=models.map((m,i)=>({m,i})).filter(x=>x.m.name.includes(key));
      if(key && candidates.length===1)idx=candidates[0].i;
    }
    if(idx<0){
      $('town-search-result').textContent='町名が見つからないか、候補が複数あります。候補一覧から正式な町名を選んでください。';
      return;
    }
    selected=idx;
    const [x,y]=models[idx].polylabel;
    const w=Math.min(view.w,210);
    view={x:x-w/2,y:y-w*full.h/full.w/2,w,h:w*full.h/full.w};
    clampView();paintMaps();relayout();
    $('town-search-result').textContent=models[idx].name+'へ移動しました。地図の町域とラベルを確認できます。';
    document.querySelector('.maps').scrollIntoView({behavior:'smooth',block:'start'});
  }
  $('method').addEventListener('change',relayout);
  $('font-size').addEventListener('change',relayout);
  $('show-problems').addEventListener('change',relayout);
  $('declutter').addEventListener('change',relayout);
  $('priority-mode').addEventListener('change',()=>{layouts=null;relayout();});
  $('layout-mode').addEventListener('change',()=>{layouts=null;relayout();});
  $('zoom-in').addEventListener('click',()=>zoomAt(1.4));
  $('zoom-out').addEventListener('click',()=>zoomAt(1/1.4));
  $('reset-zoom').addEventListener('click',()=>{view={...full};paintMaps();scheduleReflow();});
  $('view-manual').addEventListener('click',()=>setMobileView('manual'));
  $('view-auto').addEventListener('click',()=>setMobileView('auto'));
  $('town-search-form').addEventListener('submit',e=>{
    e.preventDefault();
    if(models.length)goToTown($('town-search-input').value);
  });
  window.addEventListener('resize',scheduleReflow);

  fetch('../data/ashiya/labels-source.json')
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(data=>{
      if(!data.features||data.features.length!==59)throw new Error('59町名が揃っていません');
      if(data.features.some(f=>!Array.isArray(f.manual)||f.manual.length!==2||!f.d))throw new Error('座標データが不完全です');
      const built=E.buildModels(data.features);
      models=built.models;
      ringsBuildMs=built.elapsedMs;
      maps.forEach(makeMap);
      const choices=$('town-options');
      choices.replaceChildren(...models.map(m=>{
        const option=document.createElement('option');
        option.value=m.name;return option;
      }));
      relayout();
      paintMaps();
    })
    .catch(err=>{
      console.error('V2 labels benchmark:',err);
      $('status').textContent='地図データの読み込みに失敗しました：'+err.message;
    });
})();
