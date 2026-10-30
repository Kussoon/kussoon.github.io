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
  }
  function moveView(dx,dy,svg) {
    const r=svg.getBoundingClientRect();
    if(!r.width||!r.height)return;
    view.x-=dx/r.width*view.w;
    view.y-=dy/r.height*view.h;
    clampView();paintMaps();
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
        highlightSelection();
        $('status').textContent=models[selected].name+'を選択しました。';
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
  function printMetrics(id,metrics) {
    const fields=[
      ['対象町名',metrics.count],
      ['ラベルの重なり',metrics.collisions+'組'],
      ['中心が区域外',metrics.centerOutside+'件'],
      ['文字が区域外（概算）',metrics.wholeOutside+'件']
    ];
    $(id).innerHTML=fields.map(([label,v])=>'<div><dt>'+label+'</dt><dd>'+v+'</dd></div>').join('');
  }
  function drawLabels(svg,positions,problems,size,showProblems) {
    const obj=mapObjects.get(svg);
    if(!obj)return;
    const set=new Set(problems);
    obj.texts.forEach((t,i)=>{
      t.setAttribute('x',positions[i][0].toFixed(2));
      t.setAttribute('y',positions[i][1].toFixed(2));
      t.setAttribute('font-size',String(size));
      t.classList.toggle('problem',showProblems&&set.has(i));
    });
  }
  function relayout() {
    if(!models.length)return;
    const size=Number($('font-size').value),mode=$('method').value;
    const showProblems=$('show-problems').checked;
    const widths=measureWidths(size);
    const t0=performance.now();
    const manual=E.choosePositions(models,widths,size,'manual');
    const manualScore=E.evaluate(models,manual,widths,size);
    const auto=E.choosePositions(models,widths,size,mode);
    const autoScore=E.evaluate(models,auto,widths,size);
    const elapsed=performance.now()-t0;
    drawLabels(maps[0],manual,manualScore.problemIndices,size,showProblems);
    drawLabels(maps[1],auto,autoScore.problemIndices,size,showProblems);
    printMetrics('manual-stats',manualScore);
    printMetrics('auto-stats',autoScore);
    renderCount++;
    $('status').textContent='59町名・60地図面。候補点計算 '+ringsBuildMs.toFixed(1)+'ms、今回の配置＋計測 '+elapsed.toFixed(1)+'ms（この端末での参考値）。';
    highlightSelection();
  }
  function setMobileView(mode){
    document.body.dataset.mobileView=mode;
    $('view-manual').setAttribute('aria-pressed',String(mode==='manual'));
    $('view-auto').setAttribute('aria-pressed',String(mode==='auto'));
  }
  $('method').addEventListener('change',relayout);
  $('font-size').addEventListener('change',relayout);
  $('show-problems').addEventListener('change',relayout);
  $('zoom-in').addEventListener('click',()=>zoomAt(1.4));
  $('zoom-out').addEventListener('click',()=>zoomAt(1/1.4));
  $('reset-zoom').addEventListener('click',()=>{view={...full};paintMaps();});
  $('view-manual').addEventListener('click',()=>setMobileView('manual'));
  $('view-auto').addEventListener('click',()=>setMobileView('auto'));

  fetch('../data/ashiya/labels-source.json')
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(data=>{
      if(!data.features||data.features.length!==59)throw new Error('59町名が揃っていません');
      if(data.features.some(f=>!Array.isArray(f.manual)||f.manual.length!==2||!f.d))throw new Error('座標データが不完全です');
      const built=E.buildModels(data.features);
      models=built.models;
      ringsBuildMs=built.elapsedMs;
      maps.forEach(makeMap);
      relayout();
      paintMaps();
    })
    .catch(err=>{
      console.error('V2 labels benchmark:',err);
      $('status').textContent='地図データの読み込みに失敗しました：'+err.message;
    });
})();
