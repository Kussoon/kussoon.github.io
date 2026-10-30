/* Kussoon V2 label-engine prototype, 2026-10-30.
 * Polygon inputs are from already-edited SVG paths, not geographic coordinates.
 * No third-party runtime dependency. Metrics are SVG-coordinate estimates.
 */
(function (global) {
  'use strict';
  const SQRT2 = Math.SQRT2;
  function parsePath(d) {
    const rings = [];
    let ring = [];
    for (const m of String(d).matchAll(/([MLZ])([^MLZ]*)/g)) {
      if (m[1] === 'Z') {
        if (ring.length >= 3) rings.push(ring);
        ring = [];
        continue;
      }
      const nums = (m[2].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      if (m[1] === 'M' && ring.length >= 3) {
        rings.push(ring);
        ring = [];
      }
      for (let i = 0; i + 1 < nums.length; i += 2) {
        ring.push([nums[i], nums[i + 1]]);
      }
    }
    if (ring.length >= 3) rings.push(ring);
    return rings;
  }
  function bbox(rings) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ring of rings) for (const [x, y] of ring) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return {minX, minY, maxX, maxY, w: maxX-minX, h: maxY-minY};
  }
  function isInside(x, y, rings) {
    let inside = false;
    for (const ring of rings) {
      for (let i=0, j=ring.length-1; i<ring.length; j=i++) {
        const a=ring[i], b=ring[j];
        if (((a[1]>y)!==(b[1]>y)) && x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
      }
    }
    return inside;
  }
  function segDistSq(px,py,a,b) {
    let x=a[0], y=a[1], dx=b[0]-x, dy=b[1]-y;
    if (dx!==0 || dy!==0) {
      let t=((px-x)*dx+(py-y)*dy)/(dx*dx+dy*dy);
      t=Math.max(0,Math.min(1,t));
      x+=dx*t; y+=dy*t;
    }
    dx=px-x;dy=py-y;
    return dx*dx+dy*dy;
  }
  function signedDist(x,y,rings) {
    let inside=false,minSq=Infinity;
    for(const ring of rings) {
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[i],b=ring[j];
        if(((a[1]>y)!==(b[1]>y)) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
        const d=segDistSq(x,y,a,b);
        if(d<minSq)minSq=d;
      }
    }
    const val=Math.sqrt(minSq);
    return inside ? val:-val;
  }
  function centroid(rings) {
    let best=null, bestArea=-Infinity;
    for(const ring of rings) {
      let area=0,cx=0,cy=0;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
        const a=ring[j], b=ring[i], cross=a[0]*b[1]-b[0]*a[1];
        area+=cross;cx+=(a[0]+b[0])*cross;cy+=(a[1]+b[1])*cross;
      }
      if(Math.abs(area)>bestArea && Math.abs(area)>1e-9) {
        bestArea=Math.abs(area);best=[cx/(3*area),cy/(3*area)];
      }
    }
    if(best)return best;
    const box=bbox(rings);return [(box.minX+box.maxX)/2,(box.minY+box.maxY)/2];
  }
  class Heap {
    constructor(){this.data=[];}
    push(v){
      const a=this.data;let i=a.length;a.push(v);
      while(i>0){const p=(i-1)>>1;if(a[p].max>=v.max)break;a[i]=a[p];i=p;}a[i]=v;
    }
    pop(){
      const a=this.data;if(!a.length)return null;
      const top=a[0], end=a.pop();if(!a.length)return top;
      let i=0;
      while(true){
        let child=i*2+1;if(child>=a.length)break;
        if(child+1<a.length && a[child+1].max>a[child].max)child++;
        if(a[child].max<=end.max)break;
        a[i]=a[child];i=child;
      }
      a[i]=end;return top;
    }
    get size(){return this.data.length;}
  }
  function polylabel(rings, precision=1.4) {
    const box=bbox(rings);let size=Math.min(box.w,box.h);
    if(!(size>0))return centroid(rings);
    const heap=new Heap();
    function cell(x,y,h){
      const d=signedDist(x,y,rings);
      return {x,y,h,d,max:d+h*SQRT2};
    }
    let seed=centroid(rings);
    let best=cell(seed[0],seed[1],0);
    const b=cell((box.minX+box.maxX)/2,(box.minY+box.maxY)/2,0);
    if(b.d>best.d)best=b;
    for(let x=box.minX;x<box.maxX;x+=size){
      for(let y=box.minY;y<box.maxY;y+=size)heap.push(cell(x+size/2,y+size/2,size/2));
    }
    let iterations=0;
    while(heap.size && iterations<14000){
      const c=heap.pop();iterations++;
      if(c.d>best.d)best=c;
      if(c.max-best.d<=precision)continue;
      const h=c.h/2;
      heap.push(cell(c.x-h,c.y-h,h));heap.push(cell(c.x+h,c.y-h,h));
      heap.push(cell(c.x-h,c.y+h,h));heap.push(cell(c.x+h,c.y+h,h));
    }
    return [best.x,best.y];
  }
  function buildModels(features) {
    const t0=performance.now();
    const models=features.map(f=>{
      const rings=parsePath(f.d);
      if(!rings.length)throw new Error('Polygon path not found: '+f.name);
      return {...f,rings,box:bbox(rings),centroid:centroid(rings),polylabel:polylabel(rings)};
    });
    return {models,elapsedMs:performance.now()-t0};
  }
  function rect(x,y,w,h){return {x1:x-w/2,y1:y-h/2,x2:x+w/2,y2:y+h/2};}
  function overlapArea(a,b) {
    return Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*
      Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
  }
  function insideSamples(r,rings) {
    const x0=r.x1,x1=r.x2,y0=r.y1,y1=r.y2;
    const pts=[[x0,y0],[x1,y0],[x0,y1],[x1,y1],[(x0+x1)/2,y0],[(x0+x1)/2,y1],[x0,(y0+y1)/2],[x1,(y0+y1)/2],[(x0+x1)/2,(y0+y1)/2]];
    return pts.filter(p=>isInside(p[0],p[1],rings)).length;
  }
  function choosePositions(models, widths, fontSize, mode) {
    const result=new Array(models.length);
    const order=models.map((m,i)=>({i,area:m.box.w*m.box.h})).sort((a,b)=>a.area-b.area);
    const placed=[];
    for (const {i} of order) {
      const m=models[i],w=widths[i],h=fontSize*1.15;
      if(mode==='manual') {
        const [x,y]=m.manual;result[i]=[x,y];placed.push(rect(x,y,w,h));continue;
      }
      if(mode==='centroid' || mode==='polylabel') {
        const [x,y]=mode==='centroid'?m.centroid:m.polylabel;
        result[i]=[x,y];placed.push(rect(x,y,w,h));continue;
      }
      const [px,py]=m.polylabel;
      const options=[[px,py],m.centroid,[(m.box.minX+m.box.maxX)/2,(m.box.minY+m.box.maxY)/2]];
      const step=Math.max(4,fontSize*.7);
      for(const r of [1,2,3,5,8]) for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]]){
        options.push([px+dx*r*step,py+dy*r*step]);
      }
      let best=Infinity, chosen=options[0];
      for(const [x,y] of options){
        if(!isInside(x,y,m.rings))continue;
        const box=rect(x,y,w,h);
        const inside=insideSamples(box,m.rings);
        const overlaps=placed.reduce((a,b)=>a+overlapArea(box,b),0);
        const dist=Math.hypot(x-px,y-py);
        const score=(9-inside)*160+overlaps*6+dist*.055;
        if(score<best){best=score;chosen=[x,y];}
        if(score===0)break;
      }
      result[i]=chosen;
      placed.push(rect(chosen[0],chosen[1],w,h));
    }
    return result;
  }
  function evaluate(models,positions,widths,fontSize) {
    const boxes=positions.map(([x,y],i)=>rect(x,y,widths[i],fontSize*1.15));
    let centerOutside=0,wholeOutside=0,collisions=0;
    const problemIndices=new Set();
    for(let i=0;i<models.length;i++){
      if(!isInside(positions[i][0],positions[i][1],models[i].rings)){
        centerOutside++;problemIndices.add(i);
      }
      if(insideSamples(boxes[i],models[i].rings)<9){
        wholeOutside++;problemIndices.add(i);
      }
      for(let j=0;j<i;j++) if(overlapArea(boxes[i],boxes[j])>0.01){
        collisions++;problemIndices.add(i);problemIndices.add(j);
      }
    }
    return {count:models.length,centerOutside,wholeOutside,collisions,problemIndices:[...problemIndices],boxes};
  }
  // A view-local metric covers labels whose *centres* are within the current SVG
  // viewport. This is intentionally distinct from the whole-map metric.
  function evaluateView(models,positions,widths,fontSize,view) {
    const selected=[];
    for(let i=0;i<models.length;i++) {
      const [x,y]=positions[i];
      if(x>=view.x && x<=view.x+view.w && y>=view.y && y<=view.y+view.h)selected.push(i);
    }
    return {
      ...evaluate(selected.map(i=>models[i]),selected.map(i=>positions[i]),selected.map(i=>widths[i]),fontSize),
      total:models.length
    };
  }
  // On a zoomed SVG viewBox, the geometry grows by z. To grow labels by
  // z^exponent instead, scale their unprojected font size by z^(exponent-1).
  function zoomFontSize(baseFont,zoom,exponent=0.4) {
    if(!(baseFont>0) || !(zoom>0))throw new Error('Invalid label font size or zoom');
    return baseFont*Math.pow(zoom,exponent-1);
  }
  // Convert a readable screen size in CSS pixels to SVG units. With a viewBox,
  // geometry changes scale but labels must retain their screen size.
  function screenPixelsToSvgUnits(px, viewWidth, renderedWidth) {
    if(!(px>0)||!(viewWidth>0)||!(renderedWidth>0))throw new Error('Invalid viewport dimensions');
    return px*viewWidth/renderedWidth;
  }
  function subsetMetrics(models,positions,widths,fontSize,indices) {
    return evaluate(
      indices.map(i=>models[i]),
      indices.map(i=>positions[i]),
      indices.map(i=>widths[i]),fontSize
    );
  }
  // A chosen label remains visible even if it collides. Other labels are
  // deterministic, larger regions first. Hidden labels stay searchable.
  function selectVisibleLabels(models,positions,widths,fontSize,view,pinned=null) {
    const boxes=positions.map(([x,y],i)=>rect(x,y,widths[i],fontSize*1.15));
    const ordered=models.map((m,i)=>({i,area:m.box.w*m.box.h}))
      .sort((a,b)=>(b.i===pinned)-(a.i===pinned) || b.area-a.area || a.i-b.i);
    const shown=new Array(models.length).fill(false),accepted=[];
    for(const {i} of ordered) {
      const r=boxes[i];
      if(i!==pinned && (r.x2<view.x||r.x1>view.x+view.w||r.y2<view.y||r.y1>view.y+view.h))continue;
      if(i!==pinned && accepted.some(j=>overlapArea(r,boxes[j])>0.01))continue;
      shown[i]=true;accepted.push(i);
    }
    return shown;
  }
  // Compare competing collision-free label sets without editing source geometry.
  // In addition to the previous area-first baseline this supports a visual-fit
  // mode and a name-count mode. A selected name always wins a collision.
  function selectPriorityLabels(models,positions,widths,fontSize,view,options={}) {
    const strategy=['balanced','density','area'].includes(options.strategy) ? options.strategy : 'balanced';
    const pinned=Number.isInteger(options.pinned)&&options.pinned>=0&&options.pinned<models.length ? options.pinned : null;
    const boxes=Array.isArray(options.boxes) ? options.boxes :
      positions.map(([x,y],i)=>rect(x,y,widths[i],fontSize*1.15));
    const eligible=models.map((m,i)=>{
      const r=boxes[i];
      return i===pinned || (r.x2>=view.x&&r.x1<=view.x+view.w&&r.y2>=view.y&&r.y1<=view.y+view.h);
    });
    const shown=new Array(models.length).fill(false);
    if(strategy==='area'){
      // Use the actual multiline/shrunk boxes when they are supplied.
      const order=models.map((m,i)=>({i,area:m.box.w*m.box.h}))
        .filter(x=>eligible[x.i]).sort((a,b)=>
          (b.i===pinned)-(a.i===pinned)||b.area-a.area||a.i-b.i);
      const accepted=[];
      for(const {i} of order){
        if(accepted.some(j=>overlapArea(boxes[i],boxes[j])>0.01))continue;
        shown[i]=true;accepted.push(i);
      }
      return {shown,eligible,hiddenByCollision:eligible.filter((yes,i)=>yes&&!shown[i]).length,strategy};
    }
    const candidates=models.map((m,i)=>i).filter(i=>eligible[i]);
    const conflicts=Array.from({length:models.length},()=>[]);
    for(let a=0;a<candidates.length;a++) for(let b=0;b<a;b++){
      const i=candidates[a],j=candidates[b];
      if(overlapArea(boxes[i],boxes[j])>0.01){
        conflicts[i].push(j);
        conflicts[j].push(i);
      }
    }
    const wasVisible=Array.isArray(options.previous) ? options.previous : [];
    function priority(i){
      const m=models[i];
      // The rectangle-in-polygon sample score is a *relative* visual-fit
      // estimate, not a guarantee that the full glyph outline is inside.
      const fit=insideSamples(boxes[i],m.rings)/9;
      const area=Math.log1p(Math.max(0,m.box.w*m.box.h));
      const isolation=1/(1+conflicts[i].length);
      const stable=wasVisible[i] ? 1:0;
      return strategy==='density'
        ? 10*isolation + .9*fit + .10*area + .25*stable
        : 4*fit + 3*isolation + .30*area + .8*stable;
    }
    const order=candidates.sort((a,b)=>{
      if(a===pinned)return -1;
      if(b===pinned)return 1;
      return priority(b)-priority(a)||a-b;
    });
    for(const i of order){
      if(conflicts[i].some(j=>shown[j]))continue;
      shown[i]=true;
    }
    // Density mode can swap one accepted label for two non-overlapping names,
    // improving coverage without introducing overlaps. The pinned label is protected.
    if(strategy==='density'){
      for(let pass=0;pass<4;pass++){
        let changed=false;
        for(const i of order){
          if(!shown[i] || i===pinned)continue;
          const alternatives=order.filter(j=>!shown[j] &&
            conflicts[j].filter(k=>shown[k]).length===1 &&
            conflicts[j].includes(i));
          let pair=null;
          for(let a=0;a<alternatives.length&&!pair;a++){
            for(let b=a+1;b<alternatives.length;b++){
              if(!conflicts[alternatives[a]].includes(alternatives[b])){
                pair=[alternatives[a],alternatives[b]];
                break;
              }
            }
          }
          if(pair){
            shown[i]=false;
            shown[pair[0]]=true;
            shown[pair[1]]=true;
            changed=true;
          }
        }
        if(!changed)break;
      }
    }
    return {shown,eligible,hiddenByCollision:eligible.filter((yes,i)=>yes&&!shown[i]).length,strategy};
  }

  // Infer conservative place-name stems from *other* entities in this dataset.
  // For example 打出町 gives the stem 打出, which licenses 打出／小槌町.
  // No arbitrary char-count break or isolated 町 is ever generated.
  function deriveNameStems(models) {
    return new Set(models.map(m=>String(m.name).replace(/[町村市区]$/u,''))
      .filter(s=>Array.from(s).length>=2));
  }
  function lineVariants(name,allowWrap=true,knownStems=new Set()) {
    const chars=Array.from(name);
    const variants=[[name]];
    if(!allowWrap || chars.length<4)return variants;
    const stems=knownStems instanceof Set?knownStems:new Set(knownStems);
    for(let cut=2;cut<=chars.length-2;cut++){
      const left=chars.slice(0,cut).join(''),right=chars.slice(cut).join('');
      // Reject breaks immediately adjacent to a small kana, separator,
      // or an unsupported semantic boundary (e.g. 朝日／ヶ丘町).
      if(/[ヶケがノの・･]$/u.test(left)||/^[ヶケがノの・･]/u.test(right))continue;
      if(!stems.has(left))continue;
      variants.push([left,right]);
    }
    return variants;
  }
  // The boxes contain screen-font dimensions expressed in the same SVG units
  // as viewBox. Preserve every source town; only label layout changes.
  function makeLabelBox(x,y,w,h){return rect(x,y,w,h);}
  function planAdaptiveLabels(models,seedPositions,fontSize,measure,options={}) {
    const useWrap=options.wrap!==false, useShrink=options.shrink===true;
    const fixedPosition=options.fixedPosition===true;
    const scales=useShrink?[1,0.875]:[1];
    const stems=options.knownStems || deriveNameStems(models);
    const result=[];
    const offsets=[[0,0],[-.55,0],[.55,0],[0,-.55],[0,.55],
      [-1.1,0],[1.1,0],[0,-1.1],[0,1.1]];
    for(let i=0;i<models.length;i++){
      const m=models[i],seed=seedPositions[i];
      let best=null;
      const lines=lineVariants(m.name,useWrap,stems);
      for(const scale of scales){
        const size=fontSize*scale, lineHeight=size*1.16;
        for(const variant of lines){
          const width=Math.max(...variant.map(x=>measure(x,size)));
          const height=lineHeight*variant.length;
          const orphan=(variant.length>1 && Math.min(...variant.map(x=>Array.from(x).length))===1)?1:0;
          const shapeChoices=fixedPosition?[seed]:[seed,m.polylabel,m.centroid];
          for(const center of shapeChoices){
            for(const [dx,dy] of (fixedPosition?[[0,0]]:offsets)){
              const x=center[0]+dx*Math.max(width*.45,size*.5);
              const y=center[1]+dy*Math.max(height*.45,size*.5);
              if(!isInside(x,y,m.rings))continue;
              const box=makeLabelBox(x,y,width,height);
              const n=insideSamples(box,m.rings);
              const drift=Math.hypot(x-seed[0],y-seed[1])/Math.max(fontSize,1);
              // "Fully within" means the nine sample points are inside,
              // not that every glyph pixel is inside the polygon.
              // One-line is the default. Require roughly three extra
              // in-polygon samples before accepting a two-line candidate.
              // This discourages switching lines for tiny visual gains.
              const score=(9-n)*18 + drift*.10 +
                (variant.length===2?40:0) + orphan*40 +
                (1-scale)*30;
              if(!best || score<best.score){
                best={x,y,lines:variant,fontSize:size,width,height,box,insidePoints:n,
                  score,scale,wrapped:variant.length>1};
              }
            }
          }
        }
      }
      if(!best){
        const x=seed[0],y=seed[1],size=fontSize;
        const width=measure(m.name,size),height=size*1.16;
        const box=makeLabelBox(x,y,width,height);
        best={x,y,lines:[m.name],fontSize:size,width,height,box,
          insidePoints:insideSamples(box,m.rings),score:Infinity,scale:1,wrapped:false};
      }
      result.push(best);
    }
    return result;
  }
  function evaluateLabelLayouts(models,layouts,indices=null) {
    const ids=indices || layouts.map((_,i)=>i);
    let collisions=0,centerOutside=0,wholeOutside=0;
    const problemIndices=new Set();
    for(let p=0;p<ids.length;p++){
      const i=ids[p],l=layouts[i];
      if(!isInside(l.x,l.y,models[i].rings)){centerOutside++;problemIndices.add(i);}
      if(insideSamples(l.box,models[i].rings)<9){wholeOutside++;problemIndices.add(i);}
      for(let q=0;q<p;q++){
        const j=ids[q];
        if(overlapArea(l.box,layouts[j].box)>0.01){
          collisions++;problemIndices.add(i);problemIndices.add(j);
        }
      }
    }
    return {count:ids.length,collisions,centerOutside,wholeOutside,problemIndices:[...problemIndices]};
  }
  global.KussoonLabelEngine={parsePath,bbox,isInside,signedDist,centroid,polylabel,buildModels,choosePositions,evaluate,evaluateView,zoomFontSize,screenPixelsToSvgUnits,subsetMetrics,selectVisibleLabels,selectPriorityLabels,deriveNameStems,lineVariants,planAdaptiveLabels,evaluateLabelLayouts};
})(window);
