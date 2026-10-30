/* Kussoon V2 Ashiya 59-town reading mode / one-line vertical nudge comparison. */
(() => {
  'use strict';
  const E=window.KussoonLabelEngine,R=window.KussoonReadableLabels;
  const SVG_NS='http://www.w3.org/2000/svg';
  const $=id=>document.getElementById(id);
  const svg=$('map'),full={x:0,y:0,w:1000,h:1581};
  let view={...full},models=[],readings={},selected=null;
  let nameMode='both';
  let nodes=[],activeWheel=false,layoutTimer=null;
  const pointers=new Map();
  let suppressClickUntil=0,wasDragged=false,viewVersion=0;
  function make(tag,attrs={}) {
    const el=document.createElementNS(SVG_NS,tag);
    for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
    return el;
  }
  function clamp() {
    view.w=Math.max(75,Math.min(1000,view.w));
    view.h=view.w*1.581;
    const mx=view.w*.15,my=view.h*.15;
    view.x=Math.max(-mx,Math.min(1000-view.w+mx,view.x));
    view.y=Math.max(-my,Math.min(1581-view.h+my,view.y));
  }
  function repaint() {
    svg.setAttribute('viewBox',[view.x,view.y,view.w,view.h].join(' '));
  }
  function schedule() {
    if(layoutTimer!==null)clearTimeout(layoutTimer);
    layoutTimer=setTimeout(()=>{layoutTimer=null;relayout();},120);
  }
  function zoom(mult,px=.5,py=.5) {
    if(!Number.isFinite(mult)||mult<=0)return;
    const oldW=view.w,w=Math.max(75,Math.min(1000,oldW/mult));
    const h=w*1.581;
    view.x+=(view.w-w)*px;
    view.y+=(view.h-h)*py;
    view.w=w;view.h=h;clamp();repaint();schedule();
  }
  function pan(dx,dy) {
    const r=svg.getBoundingClientRect();
    if(r.width<=0||r.height<=0)return;
    view.x-=dx*view.w/r.width;
    view.y-=dy*view.h/r.height;
    clamp();repaint();schedule();
  }
  function highlight() {
    nodes.forEach((n,i)=>{
      n.path.classList.toggle('chosen',i===selected);
      n.main.classList.toggle('chosen',i===selected);
      n.ruby.classList.toggle('chosen',i===selected);
    });
    if(selected!==null){
      $('selected-town').replaceChildren();
      const name=document.createElement('strong');
      name.textContent=models[selected].name;
      const kana=document.createElement('span');
      kana.textContent='（'+readings[models[selected].name]+'）';
      $('selected-town').append(name,' ',kana);
    }
  }
  function selectTown(i,focus=false) {
    if(!Number.isInteger(i)||i<0||i>=models.length)return;
    selected=i;
    if(focus){
      const [x,y]=models[i].polylabel;
      const w=Math.min(view.w,270);
      view={x:x-w/2,y:y-w*1.581/2,w,h:w*1.581};
      clamp();repaint();
      svg.scrollIntoView({behavior:'smooth',block:'center'});
    }
    relayout();
    highlight();
  }
  function wireMap() {
    svg.addEventListener('click',event=>{
      activeWheel=true;
      if(performance.now()<suppressClickUntil)return;
      const p=event.target.closest('.area');
      if(p&&p.dataset.index!==undefined)selectTown(Number(p.dataset.index));
    });
    svg.addEventListener('keydown',event=>{
      if(event.key!=='Enter' && event.key!==' ')return;
      const target=event.target.closest('.area');
      if(!target)return;
      event.preventDefault();
      selectTown(Number(target.dataset.index));
    });
    svg.addEventListener('wheel',event=>{
      if(!activeWheel)return;
      event.preventDefault();
      const r=svg.getBoundingClientRect();
      zoom(event.deltaY<0?1.17:1/1.17,
        (event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height);
    },{passive:false});
    svg.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      activeWheel=true;wasDragged=false;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      try{svg.setPointerCapture(event.pointerId);}catch(_){}
    });
    svg.addEventListener('pointermove',event=>{
      const old=pointers.get(event.pointerId);
      if(!old)return;
      const dx=event.clientX-old.x,dy=event.clientY-old.y;
      if(Math.abs(dx)+Math.abs(dy)>.5)wasDragged=true;
      if(pointers.size===1)pan(dx,dy);
      if(pointers.size===2){
        const entry=[...pointers].find(([key])=>key!==event.pointerId);
        if(entry){
          const other=entry[1];
          const before=Math.hypot(old.x-other.x,old.y-other.y);
          const after=Math.hypot(event.clientX-other.x,event.clientY-other.y);
          const r=svg.getBoundingClientRect();
          if(before>1&&after>1)zoom(after/before,
            ((event.clientX+other.x)/2-r.left)/r.width,
            ((event.clientY+other.y)/2-r.top)/r.height);
          pan(dx/2,dy/2);
        }
      }
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      event.preventDefault();
    });
    function end(event){
      if(!pointers.has(event.pointerId))return;
      pointers.delete(event.pointerId);
      if(wasDragged)suppressClickUntil=performance.now()+230;
    }
    svg.addEventListener('pointerup',end);
    svg.addEventListener('pointercancel',end);
    svg.addEventListener('lostpointercapture',end);
    document.addEventListener('pointerdown',event=>{
      if(!event.target.closest('.map'))activeWheel=false;
    });
  }
  function prepareMap() {
    svg.replaceChildren();
    const areas=make('g',{'aria-label':'芦屋市の町域'});
    const captions=make('g',{'aria-hidden':'true'});
    nodes=models.map((m,i)=>{
      const p=make('path',{class:'area',d:m.d,'data-index':i,
        'aria-label':m.name+'（'+readings[m.name]+'）',tabindex:0});
      const title=make('title');
      title.textContent=m.name+'（'+readings[m.name]+'）';
      p.append(title);areas.append(p);
      const group=make('g');
      const main=make('text',{class:'name-label'});
      const ruby=make('text',{class:'name-label ruby'});
      group.append(main,ruby);captions.append(group);
      return {path:p,group,main,ruby};
    });
    svg.append(areas,captions);wireMap();
    repaint();
  }
  function measurements() {
    const context=document.createElement('canvas').getContext('2d');
    const cache=new Map();
    return (str,size)=>{
      const key=str+'|'+size;
      if(cache.has(key))return cache.get(key);
      let width=Array.from(str).length*size;
      if(context){
        context.font='900 '+size+'px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
        width=context.measureText(str).width;
      }
      cache.set(key,width);
      return width;
    };
  }
  function renderLabels(laid,visible) {
    const flagged=$('show-problems').checked;
    nodes.forEach((node,i)=>{
      const l=laid[i],isRuby=l.style==='both';
      node.group.style.display=visible[i]?'':'none';
      node.main.textContent=l.primary;
      node.main.setAttribute('x',l.x.toFixed(2));
      node.main.setAttribute('y',(l.y-(isRuby?l.rubySize*.62:0)).toFixed(2));
      node.main.setAttribute('font-size',String(l.size));
      node.main.setAttribute('stroke-width',String(l.size*.17));
      node.main.classList.toggle('flag',flagged&&l.fit<9);
      node.ruby.style.display=isRuby?'':'none';
      if(isRuby){
        node.ruby.textContent=l.reading;
        node.ruby.setAttribute('x',l.x.toFixed(2));
        node.ruby.setAttribute('y',(l.y+l.size*.60).toFixed(2));
        node.ruby.setAttribute('font-size',String(l.rubySize));
        node.ruby.setAttribute('stroke-width',String(l.rubySize*.16));
        node.ruby.classList.toggle('flag',flagged&&l.fit<9);
      }
    });
    highlight();
  }
  function printStats(metrics,priority) {
    const fields=[
      ['対象町名',metrics.total+'件'],
      ['画面内のラベル',metrics.inView+'件'],
      ['非表示にしたラベル（比較用）',priority.hiddenByCollision+'件'],
      ['ラベルの重なり（許容）',metrics.collisions+'組'],
      ['境界またぎ（許容・概算）',metrics.outside+'件'],
      ['上下微調整した名前',metrics.moved+'件']
    ];
    $('stats').replaceChildren(...fields.map(([name,value])=>{
      const cell=document.createElement('div');
      const dt=document.createElement('dt');dt.textContent=name;
      const dd=document.createElement('dd');dd.textContent=value;
      cell.append(dt,dd);
      return cell;
    }));
  }
  function relayout() {
    if(models.length===0)return;
    const start=performance.now();
    const screenWidth=svg.getBoundingClientRect().width||360;
    const size=E.screenPixelsToSvgUnits(Number($('font-size').value),view.w,screenWidth);
    const mode=nameMode,shift=$('shift-mode').value;
    const measure=measurements();
    const baseWidths=models.map(m=>{
      const reading=readings[m.name];
      return R.labelSpec(m.name,reading,mode,size,measure).width;
    });
    const anchorMode=$('anchor-mode').value;
    const laid=anchorMode!=='legacy'
      ?R.planCenterFirstLabels(models,readings,mode,size,measure,E,{
        anchor:anchorMode==='universal'?'universal':anchorMode==='smart'?'safe':'raw',shift
      })
      :R.planVerticalNudges(models,
          E.choosePositions(models,baseWidths,size,'avoid'),
          readings,mode,size,measure,E,{
            shift:shift==='none'?'none':'vertical',pinned:selected
          });
    // Learning default: all names appear immediately, irrespective of
    // collisions or glyphs crossing a polygon border.
    const hide=$('declutter').checked;
    const result=hide ?E.selectPriorityLabels(models,laid.map(l=>[l.x,l.y]),
      laid.map(l=>l.width),size,view,{
        strategy:'balanced',pinned:selected,boxes:laid.map(l=>l.box)
      }):null;
    const visible=hide?result.shown:models.map(()=>true);
    const metrics=R.evaluateVisible(models,laid,visible,E,view);
    renderLabels(laid,visible);
    printStats(metrics,{hiddenByCollision:hide?result.hiddenByCollision:0});
    $('status').textContent='文字 '+$('font-size').value+'px（画面上で固定）、拡大 '+(1000/view.w).toFixed(2)+
      '倍。全59町名'+(hide?'から衝突に応じて一部省略':'を表示（重なり・境界またぎ許容）')+
      '。配置計算 '+(performance.now()-start).toFixed(1)+'ms（端末参考値）。';
  }
  function chooseByQuery(text) {
    const query=R.normalizeReading(text);
    if(!query)return [];
    const exact=models.flatMap((m,i)=>{
      const name=R.normalizeReading(m.name),reading=R.normalizeReading(readings[m.name]);
      return (name===query||reading===query)?[i]:[];
    });
    if(exact.length)return exact;
    return models.flatMap((m,i)=>{
      const name=R.normalizeReading(m.name),reading=R.normalizeReading(readings[m.name]);
      return (name.includes(query)||reading.includes(query))?[i]:[];
    });
  }
  $('town-search-form').addEventListener('submit',event=>{
    event.preventDefault();
    const hits=chooseByQuery($('town-search-input').value);
    if(hits.length===1){
      selectTown(hits[0],true);
      $('town-search-result').textContent=models[hits[0]].name+'（'+
        readings[models[hits[0]].name]+'）へ移動しました。';
    }else if(!hits.length){
      $('town-search-result').textContent='該当する町名がありません。';
    }else{
      $('town-search-result').textContent=hits.length+'件の候補があります：'+
        hits.slice(0,8).map(i=>models[i].name).join('、')+
        '。町名を詳しく入力してください。';
    }
  });
  for(const btn of document.querySelectorAll('[data-label-style]')){
    btn.addEventListener('click',()=>{
      nameMode=btn.dataset.labelStyle;
      for(const other of document.querySelectorAll('[data-label-style]')){
        const active=other===btn;
        other.classList.toggle('active',active);
        other.setAttribute('aria-pressed',String(active));
      }
      relayout();
    });
  }
  for(const id of ['anchor-mode','shift-mode','font-size','declutter','show-problems'])
    $(id).addEventListener('change',relayout);
  $('zoom-in').addEventListener('click',()=>zoom(1.4));
  $('zoom-out').addEventListener('click',()=>zoom(1/1.4));
  $('reset-zoom').addEventListener('click',()=>{
    view={...full};repaint();relayout();
  });
  window.addEventListener('resize',schedule);
  Promise.all([
    fetch('../data/ashiya/labels-source.json').then(r=>{
      if(!r.ok)throw new Error('町域データの取得に失敗: HTTP '+r.status);
      return r.json();
    }),
    fetch('../data/ashiya/readings.json').then(r=>{
      if(!r.ok)throw new Error('読み仮名データの取得に失敗: HTTP '+r.status);
      return r.json();
    })
  ]).then(([areas,kana])=>{
    if(areas.features?.length!==59 || !kana.readings)
      throw new Error('芦屋市59町名のデータが揃っていません');
    models=E.buildModels(areas.features).models;
    readings=kana.readings;
    R.validateReadings(models,readings);
    const options=$('town-options');
    options.replaceChildren(...models.map(m=>{
      const option=document.createElement('option');
      option.value=m.name;option.label=readings[m.name];return option;
    }));
    prepareMap();relayout();
  }).catch(err=>{
    console.error('V2 Ashiya reading experiment:',err);
    $('status').textContent='試験データを読み込めませんでした：'+err.message;
  });
})();
