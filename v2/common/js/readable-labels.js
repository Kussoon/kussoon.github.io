/* Reusable Kussoon V2 label presentation experiment: reading layers and vertical nudges.
 * Pure geometry/text layout helpers; no network requests or DOM dependencies.
 */
(function (global) {
  'use strict';
  function normalizeReading(value) {
    return String(value||'').normalize('NFKC').toLowerCase()
      .replace(/[ァ-ヶ]/gu,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60))
      .replace(/[\s　]+/gu,'');
  }
  function validateReadings(models,records) {
    if(!records||typeof records!=='object')throw new Error('読み仮名データがありません');
    const expected=new Set(models.map(m=>m.name));
    const keys=Object.keys(records);
    if(keys.length!==models.length||new Set(keys).size!==keys.length)throw new Error('読み仮名件数が一致しません');
    for(const m of models){
      if(!Object.prototype.hasOwnProperty.call(records,m.name)||
        !/^[ぁ-ゖー]+$/u.test(records[m.name]))throw new Error('読み仮名未確認: '+m.name);
    }
    for(const k of keys)if(!expected.has(k))throw new Error('読み仮名対象外: '+k);
    return true;
  }
  function rect(x,y,w,h){return {x1:x-w/2,y1:y-h/2,x2:x+w/2,y2:y+h/2};}
  function overlapArea(a,b){
    return Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*
      Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
  }
  function sampleFit(box,rings,engine) {
    const xs=[box.x1,(box.x1+box.x2)/2,box.x2];
    const ys=[box.y1,(box.y1+box.y2)/2,box.y2];
    let count=0;
    for(const x of xs)for(const y of ys)if(engine.isInside(x,y,rings))count++;
    return count;
  }
  function labelSpec(name,reading,style,size,measure) {
    if(!['kanji','both','kana'].includes(style))throw new Error('表示方式が不正です');
    if(!reading)throw new Error('読み仮名がありません: '+name);
    const rubySize=size*.58, strokePad=size*.24;
    const primary=style==='kana'?reading:name;
    const width=style==='both'
      ?Math.max(measure(name,size),measure(reading,rubySize))
      :measure(primary,size);
    // Reserve outline/halo, and the full ruby line in the collision bounds.
    const height=style==='both'?size*1.17+rubySize*1.34:size*1.26;
    return {name,reading,style,primary,size,rubySize,
      width:width+strokePad,height:height+strokePad};
  }
  function planVerticalNudges(models,seeds,readings,style,size,measure,engine,options={}) {
    validateReadings(models,readings);
    const shift=options.shift || 'vertical';
    if(!['none','vertical'].includes(shift))throw new Error('上下調整の方式が不正です');
    const pinned=Number.isInteger(options.pinned)?options.pinned:null;
    const specs=models.map(m=>labelSpec(m.name,readings[m.name],style,size,measure));
    const orders=models.map((m,i)=>({i,area:m.box.w*m.box.h}))
      // Smaller town first so a narrow area isn't always displaced by a large one.
      .sort((a,b)=>(b.i===pinned)-(a.i===pinned) || a.area-b.area || a.i-b.i);
    const laid=new Array(models.length),committed=[];
    const steps=shift==='none'?[0]:[0,-.5,.5,-1,1,-1.5,1.5];
    for(const {i} of orders) {
      const [sx,sy]=seeds[i],spec=specs[i],m=models[i];
      let best=null;
      for(const step of steps) {
        const x=sx,y=sy+step*size;
        if(step!==0 && !engine.isInside(x,y,m.rings))continue;
        const box=rect(x,y,spec.width,spec.height);
        const overlap=committed.reduce((sum,j)=>sum+overlapArea(box,laid[j].box),0);
        const fit=sampleFit(box,m.rings,engine);
        // Preserve the initial anchor where it doesn't compete with others.
        const cost=overlap/(size*size)*180+(9-fit)*.85+Math.abs(step)*.18;
        const candidate={...spec,x,y,box,fit,step,overlap,cost};
        if(!best || cost<best.cost-1e-8)best=candidate;
        if(step===0 && overlap<.01)break;
      }
      if(!best)throw new Error('町名の配置候補がありません: '+m.name);
      laid[i]=best;
      committed.push(i);
    }
    return laid;
  }
  // Return the polygon center when it is visually safe. If the centroid
  // falls in a hole, outside, or inside a very narrow concave neck, find the
  // nearest point toward Polylabel with reasonable interior clearance.
  // Geometry-only: the anchor never changes just because the user zooms.
  // If a region anchor is unusually close to one side of its horizontal
  // interior corridor, balance the two available margins. This is not the
  // former "fit every glyph inside" constraint: it only corrects extreme
  // one-sided anchors, independent of font size, viewport and zoom.
  function balanceOneSidedAnchor(point,model,engine) {
    const [x,y]=point,intersections=[];
    for(const ring of model.rings){
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i];
        if((a[1]>y)!==(b[1]>y)){
          intersections.push(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]));
        }
      }
    }
    // The adjacent intersections bound the *contiguous* inside segment,
    // even for concave outlines or regions with holes.
    const left=Math.max(...intersections.filter(v=>v<x-1e-7));
    const right=Math.min(...intersections.filter(v=>v>x+1e-7));
    if(!Number.isFinite(left)||!Number.isFinite(right))return point;
    const leftRoom=x-left,rightRoom=right-x;
    if(Math.min(leftRoom,rightRoom)/Math.max(leftRoom,rightRoom)>=.35)return point;
    const candidateX=(left+right)/2;
    // Small, conservative correction; do not drag the label to another arm
    // of an irregular region, and never move its center outside the region.
    const regionWidth=Number.isFinite(model.box?.w)?model.box.w:engine.bbox(model.rings).w;
    if(Math.abs(candidateX-x)>regionWidth*.15)return point;
    if(!engine.isInside(candidateX,y,model.rings))return point;
    if(engine.signedDist(candidateX,y,model.rings)<=
       engine.signedDist(x,y,model.rings)*1.2)return point;
    return [candidateX,y];
  }
  function safeInteriorCenter(model,engine) {
    const c=model.centroid,p=model.polylabel,rings=model.rings;
    const cDepth=engine.signedDist(c[0],c[1],rings);
    const pDepth=engine.signedDist(p[0],p[1],rings);
    if(cDepth>0 && cDepth>=pDepth*.26)return balanceOneSidedAnchor([...c],model,engine);
    if(!(pDepth>0))return [...p];
    const minDepth=pDepth*.35;
    let best=[...p],bestDistance=Math.hypot(p[0]-c[0],p[1]-c[1]);
    // The segment to an interior point is not necessarily inside a concave
    // polygon. Check the *actual* rings for every candidate.
    for(let k=0;k<=40;k++) {
      const t=k/40,x=c[0]+(p[0]-c[0])*t,y=c[1]+(p[1]-c[1])*t;
      if(engine.signedDist(x,y,rings)<minDepth)continue;
      const distance=Math.hypot(x-c[0],y-c[1]);
      if(distance<bestDistance-1e-9){best=[x,y];bestDistance=distance;}
    }
    return balanceOneSidedAnchor(best,model,engine);
  }

  // Prefer stable, region-centered names to a collision-free map. All labels
  // remain visible even if they overlap or cross regional borders.
  // anchor:'safe' fixes concave-neck/outside centroids; 'raw' is the baseline.
  function planCenterFirstLabels(models,readings,style,size,measure,engine,options={}) {
    validateReadings(models,readings);
    const shift=options.shift || 'none';
    if(!['none','vertical','adjacent'].includes(shift))throw new Error('上下調整の方式が不正です');
    const anchorMode=options.anchor || 'raw';
    if(!['raw','safe'].includes(anchorMode))throw new Error('配置方式が不正です');
    const specs=models.map(m=>labelSpec(m.name,readings[m.name],style,size,measure));
    const anchors=models.map(m=>
      anchorMode==='safe'?safeInteriorCenter(m,engine):
        (engine.isInside(m.centroid[0],m.centroid[1],m.rings) ? [...m.centroid] : [...m.polylabel]));
    // Start with every label anchored at its center. Unlike the former
    // greedy placement, compare each shift against *all* neighbors, not only
    // the ones drawn earlier.
    const layout=models.map((m,i)=>{
      const [x,y]=anchors[i],spec=specs[i],box=rect(x,y,spec.width,spec.height);
      return {...spec,x,y,box,fit:sampleFit(box,m.rings,engine),step:0,overlap:0};
    });
    if(shift!=='none') {
      // Two deterministic sweeps are enough for this small training map.
      // Never accept a move that increases the number of overlapping pairs.
      for(let pass=0;pass<2;pass++){
        let changed=false;
        for(let i=0;i<models.length;i++){
          const m=models[i],spec=specs[i],anchor=anchors[i];
          const neighbors=layout.map((l,j)=>j).filter(j=>j!==i);
          const scoresAt=y=>{
            const box=rect(anchor[0],y,spec.width,spec.height);
            let pairs=0,area=0;
            for(const j of neighbors){
              const overlap=overlapArea(box,layout[j].box);
              if(overlap>.01){pairs++;area+=overlap;}
            }
            return {pairs,area};
          };
          const baseline=scoresAt(layout[i].y);
          if(baseline.area<=size*size*.45)continue;
          if(shift==='adjacent'){
            const nearParallel=neighbors.some(j=>{
              const other=models[j],a=anchors[j],otherSpec=specs[j];
              return m.box.h>m.box.w*1.35 && other.box.h>other.box.w*1.35 &&
                Math.abs(anchor[0]-a[0])<(spec.width+otherSpec.width)*.52 &&
                Math.abs(anchor[1]-a[1])<(spec.height+otherSpec.height)*.9 &&
                overlapArea(layout[i].box,layout[j].box)>.01;
            });
            if(!nearParallel)continue;
          }
          let bestY=layout[i].y,bestScore=baseline;
          const steps=shift==='adjacent'?[-.5,.5,-1,1]:[-.5,.5,-1,1,-1.5,1.5];
          for(const step of steps){
            const y=anchor[1]+step*size;
            if(!engine.isInside(anchor[0],y,m.rings))continue;
            const scores=scoresAt(y);
            if(scores.pairs>baseline.pairs)continue;
            const quality=scores.pairs*10+scores.area/(size*size)+Math.abs(step)*.75;
            const previous=bestScore.pairs*10+bestScore.area/(size*size)+Math.abs((bestY-anchor[1])/size)*.75;
            if(quality<previous-1e-7){
              bestY=y;bestScore=scores;
            }
          }
          if(Math.abs(bestY-layout[i].y)>1e-7){
            layout[i].y=bestY;
            layout[i].box=rect(anchor[0],bestY,spec.width,spec.height);
            layout[i].fit=sampleFit(layout[i].box,m.rings,engine);
            layout[i].step=(bestY-anchor[1])/size;
            changed=true;
          }
        }
        if(!changed)break;
      }
    }
    for(let i=0;i<layout.length;i++){
      layout[i].overlap=layout.reduce((sum,l,j)=>
        sum+(i===j?0:overlapArea(layout[i].box,l.box)),0);
    }
    return layout;
  }

  function evaluateVisible(models,laid,shown,engine,view) {
    const all=shown.flatMap((s,i)=>s?[i]:[]);
    const inView=all.filter(i=>laid[i].x>=view.x&&laid[i].x<=view.x+view.w&&
      laid[i].y>=view.y&&laid[i].y<=view.y+view.h);
    let pairs=0,outside=0;
    for(let ai=0;ai<inView.length;ai++) {
      const i=inView[ai],label=laid[i];
      if(sampleFit(label.box,models[i].rings,engine)<9)outside++;
      for(let aj=0;aj<ai;aj++)if(overlapArea(label.box,laid[inView[aj]].box)>.01)pairs++;
    }
    return {shown:all.length,inView:inView.length,collisions:pairs,outside,
      moved:all.filter(i=>Math.abs(laid[i].step)>.01).length,
      total:models.length};
  }
  global.KussoonReadableLabels={normalizeReading,validateReadings,labelSpec,
    planVerticalNudges,safeInteriorCenter,planCenterFirstLabels,evaluateVisible};
})(window);
