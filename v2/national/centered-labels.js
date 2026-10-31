/* V2 fixed-label pilot: vertical midpoint / horizontal interior centre.
 * Build ONCE when the administrative geometry is loaded.
 * Screen zoom and label visibility never change the chosen anchors.
 */
(function(global){
 'use strict';
 const E=global.KussoonLabelEngine;
 const finite=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
 const round=x=>Math.round(x*10000)/10000;
 function horizontalRuns(rings,y){
  const xs=[];
  for(const ring of rings||[]){
   for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i];
    if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))
     xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
   }
  }
  xs.sort((a,b)=>a-b);
  const runs=[];
  for(let i=0;i+1<xs.length;i+=2){
   if(xs[i+1]-xs[i]>1e-6)runs.push([xs[i],xs[i+1]]);
  }
  return runs;
 }
 function point(model){
  const b=model.box;
  const fallback=finite(model.polylabel)?model.polylabel:
   finite(model.centroid)?model.centroid:[(b.minX+b.maxX)/2,(b.minY+b.maxY)/2];
  if(!b||!(b.w>0&&b.h>0)||!model.rings?.length)return fallback;
  const mid=(b.minY+b.maxY)/2;
  // Avoid exactly passing through vertices; keep the chosen height practically central.
  const candidates=[0,-.002,.002,-.03,.03,-.08,.08,-.16,.16];
  for(const fraction of candidates){
   const y=mid+b.h*fraction, runs=horizontalRuns(model.rings,y);
   const feasible=runs.filter(([left,right])=>E.isInside((left+right)/2,y,model.rings));
   if(!feasible.length)continue;
   const [left,right]=feasible.sort((runA,runB)=>
    (runB[1]-runB[0])-(runA[1]-runA[0])||
    Math.abs((runA[0]+runA[1])/2-(b.minX+b.maxX)/2)-
    Math.abs((runB[0]+runB[1])/2-(b.minX+b.maxX)/2))[0];
   return [round((left+right)/2),round(y)];
  }
  return fallback;
 }
 function pointMulti(model){
  const b=model.box;
  if(!b||!(b.w>0&&b.h>0)||!model.rings?.length)return point(model);
  const mid=(b.minY+b.maxY)/2;
  const candidates=[];
  // The same 61 height slices used in the Nishinomiya four-town trial.
  for(let step=-30;step<=30;step++){
   const y=mid+b.h*step/100;
   for(const [left,right] of horizontalRuns(model.rings,y)){
    const x=(left+right)/2,width=right-left;
    if(!(width>0)||!E.isInside(x,y,model.rings))continue;
    // Center-biased score: the usable width is tested at THIS y,
    // not against the overall longitude span of a municipality.
    const score=Math.abs(y-mid)/b.h*2+
     12/(width+8)+3/(width/2+5);
    candidates.push({x,y,width,score});
   }
  }
  candidates.sort((a,b)=>a.score-b.score||
   Math.abs(a.y-mid)-Math.abs(b.y-mid)||
   b.width-a.width||a.x-b.x);
  return candidates.length?[round(candidates[0].x),round(candidates[0].y)]:point(model);
 }
 function centerAtHeight(model,y,nearX){
  const runs=horizontalRuns(model.rings,y).filter(([a,b])=>
   E.isInside((a+b)/2,y,model.rings));
  if(!runs.length)return null;
  runs.sort((a,b)=>
   Math.abs((a[0]+a[1])/2-nearX)-
   Math.abs((b[0]+b[1])/2-nearX)||
   (b[1]-b[0])-(a[1]-a[0]));
  return [(runs[0][0]+runs[0][1])/2,y];
 }
 function build(models,options={}){
  const {fontSize=13,measure=(s,sz)=>[...s].length*sz,rows=()=>null,strategy='center'}=options;
  const anchors=models.map(m=>strategy==='multi'?pointMulti(m):point(m));
  // Initial-only, conservative correction for adjacent municipality labels.
  // Never move farther than a small fraction of each municipality's height.
  const placed=[];
  const result=anchors.map(p=>p.slice());
  const order=models.map((m,i)=>i).sort((i,j)=>
   models[i].box.w*models[i].box.h-models[j].box.w*models[j].box.h||
   String(models[i].id).localeCompare(String(models[j].id)));
  let adjusted=0;
  const overlap=(a,b)=>Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*
    Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
  const rect=(x,y,w,h)=>({x1:x-w/2,x2:x+w/2,y1:y-h/2,y2:y+h/2});
  for(const i of order){
   const m=models[i],anchor=anchors[i],r=rows(m);
   const labelWidth=Math.max(...(r||[m.name]).map(s=>measure(s,fontSize)))+fontSize*.2;
   const labelHeight=fontSize*(r?.length||1)*1.2;
   const original=rect(anchor[0],anchor[1],labelWidth,labelHeight);
   let best=anchor,bestCost=placed.reduce((sum,b)=>sum+overlap(original,b),0);
   if(bestCost>.01){
    // Move up/down first to preserve the east-west midpoint of long regions.
    const limit=Math.min(m.box.h*.10,fontSize*.95);
    const moves=[[0,-.5],[0,.5],[0,-1],[0,1],[-.5,0],[.5,0],
     [-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]];
    for(const [dx,dy] of moves){
     const y=anchor[1]+dy*limit;
     // For multi-section labels, recompute the east-west centre at the
     // FINAL height after a vertical collision correction.
     const newCenter=strategy==='multi'&&dy!==0?
      centerAtHeight(m,y,anchor[0]):null;
     const x=newCenter?newCenter[0]:anchor[0]+dx*limit;
     if(!E.isInside(x,y,m.rings))continue;
     const box=rect(x,y,labelWidth,labelHeight);
     const cost=placed.reduce((sum,b)=>sum+overlap(box,b),0);
     if(cost+.01<bestCost){best=[x,y];bestCost=cost;}
    }
   }
   if(best!==anchor){result[i]=best.map(round);adjusted++;}
   placed.push(rect(result[i][0],result[i][1],labelWidth,labelHeight));
  }
  return {anchors:result,adjusted,original:anchors};
 }
 global.KussoonCenteredLabels={point,pointMulti,horizontalRuns,centerAtHeight,build};
})(window);
