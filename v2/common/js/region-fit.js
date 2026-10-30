/* Kussoon V2 — opt-in containment-aware label refinement.
 * This is an algorithmic refinement, not a list of municipality offsets.
 * A label's WHOLE box (including multi-line county/ward labels) is sampled
 * against its owner polygon, not only its center point. All labels stay shown.
 */
(function(global){
'use strict';

function makeBox(x,y,w,h){
 return {x1:x-w/2,y1:y-h/2,x2:x+w/2,y2:y+h/2};
}
function areaOverlap(a,b){
 return Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*
        Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
}
function overlapsView(b,view,margin){
 if(!view)return true;
 return b.x2>=view.x-margin&&b.x1<=view.x+view.w+margin&&
        b.y2>=view.y-margin&&b.y1<=view.y+view.h+margin;
}
// 5 by 5 equal-area cell centers: approximates the fraction of the label
// rectangle lying inside the polygon, including holes and disconnected parts.
// Do not use corners alone; they misrepresent long, narrow administrative areas.
function fractionInside(box,rings,engine){
 const w=box.x2-box.x1,h=box.y2-box.y1;
 if(!(w>0&&h>0))return 0;
 let inside=0;
 for(let a=0;a<5;a++){
  const y=box.y1+(a+.5)*h/5;
  for(let b=0;b<5;b++){
   const x=box.x1+(b+.5)*w/5;
   if(engine.isInside(x,y,rings))inside++;
  }
 }
 return inside/25;
}
function candidates(seed,model,size,engine){
 const points=[],seen=new Set();
 function add(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  const key=x.toFixed(4)+':'+y.toFixed(4);
  if(seen.has(key))return;
  seen.add(key);
  if(engine.isInside(x,y,model.rings))points.push([x,y]);
 }
 // Preserve the original center-first anchor as a guaranteed candidate.
 add(seed.x,seed.y);
 if(Array.isArray(model.polylabel))add(model.polylabel[0],model.polylabel[1]);
 if(Array.isArray(model.centroid))add(model.centroid[0],model.centroid[1]);
 const steps=[-.5,.5,-1,1,-1.6,1.6,-2.5,2.5];
 for(const shift of steps){
  add(seed.x+shift*size,seed.y);
  add(seed.x,seed.y+shift*size);
 }
 for(const dx of [-1.6,-.85,.85,1.6])
  for(const dy of [-1.6,-.85,.85,1.6])
   add(seed.x+dx*size,seed.y+dy*size);
 // Search inside the polygon's own bounding box. This can move a label from
 // a narrow neck to a broader neighboring lobe, impossible with fixed px nudges.
 const box=model.box;
 if(box&&box.w>0&&box.h>0){
  for(const u of [.12,.30,.50,.70,.88])
   for(const v of [.12,.30,.50,.70,.88])
    add(box.minX+box.w*u,box.minY+box.h*v);
 }
 return points;
}
function refine(models,labels,size,engine,options={}){
 if(!Array.isArray(models)||!Array.isArray(labels)||models.length!==labels.length||!(size>0))
  throw Error('区域とラベルのデータが不正です');
 const view=options.view||null,selected=Number.isInteger(options.pinned)?options.pinned:-1;
 const result=labels.map(l=>({...l,box:{...l.box}}));
 const margin=size*2;
 // Labels whose centers are off-screen should not force shifts on this view.
 const active=result.map((label,i)=>overlapsView(label.box,view,margin)?i:-1).filter(i=>i>=0);
 const minGain=typeof options.minGain==='number'?options.minGain:.075;
 const maxPasses=Math.max(1,Math.min(2,options.passes||1));
 function scoreAt(i,box){
  let pairs=0,area=0;
  for(const j of active){
   if(j===i)continue;
   const a=areaOverlap(box,result[j].box);
   if(a>.01){pairs++;area+=a;}
  }
  return {pairs,area};
 }
 const originalInside=active.map(i=>fractionInside(result[i].box,models[i].rings,engine));
 let improved=0;
 for(let pass=0;pass<maxPasses;pass++){
  // Work on the worst-contained labels first, not just labels colliding
  // with another name (the previous algorithm's blind spot).
  const order=active.filter(i=>i!==selected).sort((a,b)=>
   fractionInside(result[a].box,models[a].rings,engine)-
   fractionInside(result[b].box,models[b].rings,engine)||a-b);
  let changed=false;
  for(const i of order){
   const current=result[i],model=models[i],origin=labels[i];
   const fit=fractionInside(current.box,model.rings,engine);
   if(fit>=.96)continue; // Already within the region; do not drift.
   const startOverlap=scoreAt(i,current.box);
   let best=null;
   const baseScore=(1-fit)*100+startOverlap.pairs*28+
     startOverlap.area/(size*size)*5+
     Math.hypot(current.x-origin.x,current.y-origin.y)/size*.8;
   let bestScore=baseScore,bestFit=fit;
   for(const [x,y] of candidates(origin,model,size,engine)){
    const candidateBox=makeBox(x,y,current.width,current.height);
    if(!overlapsView(candidateBox,view,margin))continue;
    const overlap=scoreAt(i,candidateBox);
    // Never trade an additional name collision for geometric containment.
    if(overlap.pairs>startOverlap.pairs)continue;
    const coverage=fractionInside(candidateBox,model.rings,engine);
    if(coverage<fit+minGain-1e-9)continue;
    const drift=Math.hypot(x-origin.x,y-origin.y)/size;
    const score=(1-coverage)*100+overlap.pairs*28+
      overlap.area/(size*size)*5+drift*.8;
    if(score<bestScore-1e-7){
     best={x,y,box:candidateBox};
     bestScore=score;bestFit=coverage;
    }
   }
   if(best){
    current.x=best.x;current.y=best.y;current.box=best.box;
    current.fit=undefined; // An old 9-point score is no longer valid.
    current.step=(current.y-origin.y)/size;
    current.horizontalStep=(current.x-origin.x)/size;
    current.regionFit=bestFit;
    improved++;changed=true;
   }
  }
  if(!changed)break;
 }
 const after=active.map(i=>fractionInside(result[i].box,models[i].rings,engine));
 const sum=values=>values.reduce((acc,n)=>acc+n,0);
 return {
  labels:result,
  moved:result.reduce((acc,l,i)=>acc+
   (Math.hypot(l.x-labels[i].x,l.y-labels[i].y)>1e-6?1:0),0),
  improved,
  beforeOutside:active.length-sum(originalInside),
  afterOutside:active.length-sum(after),
  poorlyContainedBefore:originalInside.filter(v=>v<.76).length,
  poorlyContainedAfter:after.filter(v=>v<.76).length
 };
}
global.KussoonRegionFit={refine,fractionInside,candidates};
})(window);
