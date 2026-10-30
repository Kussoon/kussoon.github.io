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
  let reflowFrame = null;
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
  function printMetrics(id,score,visible,shown) {
    const fields=[
      ['対象町名',models.length],
      ['表示範囲のラベル',visible.count],
      ['省略中のラベル',models.length-shown],
      ['表示中ラベルの重なり',score.collisions+'組'],
      ['表示範囲の重なり',visible.collisions+'組'],
      ['表示範囲で文字が区域外',visible.wholeOutside+'件']
    ];
    $(id).innerHTML=fields.map(([label,v])=>'<div><dt>'+label+'</dt><dd>'+v+'</dd></div>').join('');
  }
  function updateVisibleStats() {
    if(!layouts)return;
    for(const side of ['manual','auto']) {
      const l=layouts[side];
      const indices=l.shown.flatMap((v,i)=>v?[i]:[]);
      const score=E.subsetMetrics(models,l.positions,l.widths,l.size,indices);
      const inView=indices.filter(i=>{
        const [x,y]=l.positions[i];
        return x>=view.x&&x<=view.x+view.w&&y>=view.y&&y<=view.y+view.h;
      });
      const visible=E.subsetMetrics(models,l.positions,l.widths,l.size,inView);
      printMetrics(side+'-stats',score,visible,indices.length);
    }
  }
  function scheduleReflow() {
    if(reflowFrame!==null)return;
    reflowFrame=requestAnimationFrame(()=>{
      reflowFrame=null;
      relayout();
    });
  }
  function renderedMapWidth() {
    const visible=maps.find(svg=>svg.getBoundingClientRect().width>0);
    return visible?visible.getBoundingClientRect().width:360;
  }
  function drawLabels(svg,positions,problems,size,showProblems,shown) {
    const obj=mapObjects.get(svg);
    if(!obj)return;
    const set=new Set(problems);
    obj.texts.forEach((t,i)=>{
      t.setAttribute('x',positions[i][0].toFixed(2));
      t.setAttribute('y',positions[i][1].toFixed(2));
      t.setAttribute('font-size',String(size));
      t.setAttribute('stroke-width',String(size*.17));
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
    const auto=E.choosePositions(models,widths,size,mode);
    const manualShown=models.map(()=>true);
    const autoShown=$('declutter').checked
      ?E.selectVisibleLabels(models,auto,widths,size,view,selected)
      :models.map(()=>true);
    const allManual=manualShown.map((v,i)=>v?i:-1).filter(i=>i!==-1);
    const activeAuto=autoShown.map((v,i)=>v?i:-1).filter(i=>i!==-1);
    const manualScore=E.subsetMetrics(models,manual,widths,size,allManual);
    const autoScore=E.subsetMetrics(models,auto,widths,size,activeAuto);
    const elapsed=performance.now()-t0;
    layouts={
      manual:{positions:manual,widths,size,shown:manualShown},
      auto:{positions:auto,widths,size,shown:autoShown}
    };
    drawLabels(maps[0],manual,manualScore.problemIndices,size,showProblems,manualShown);
    drawLabels(maps[1],auto,autoScore.problemIndices.map(i=>activeAuto[i]),size,showProblems,autoShown);
    updateVisibleStats();
    renderCount++;
    $('status').textContent='59町名・60地図面／地図 '+(full.w/view.w).toFixed(2)+'倍。画面上の文字 '+px+'px（固定）／自動側は'+activeAuto.length+'件表示。再配置・計測 '+elapsed.toFixed(1)+'ms（端末参考値）。';
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
