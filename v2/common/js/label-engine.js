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
  global.KussoonLabelEngine={parsePath,bbox,isInside,signedDist,centroid,polylabel,buildModels,choosePositions,evaluate};
})(window);
