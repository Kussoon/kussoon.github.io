/* Kussoon V2: opt-in, geometry-aware local collision refinement.
 * Keeps all labels visible. Does not change established geographic anchors;
 * moves only labels that overlap, in small steps inside their own regions.
 */
(function(global){
'use strict';
function box(x,y,width,height){
 return {x1:x-width/2,y1:y-height/2,x2:x+width/2,y2:y+height/2};
}
function overlap(a,b){
 return Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*
        Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
}
const OFFSETS=[
 [0,-.45],[0,.45],[0,-.9],[0,.9],[0,-1.4],[0,1.4],
 [-.45,0],[.45,0],[-.9,0],[.9,0],[-1.5,0],[1.5,0],
 [-.6,-.6],[-.6,.6],[.6,-.6],[.6,.6],
 [-1,-.65],[-1,.65],[1,-.65],[1,.65],
 [-.65,-1],[-.65,1],[.65,-1],[.65,1],
 [-1.4,-1],[-1.4,1],[1.4,-1],[1.4,1]
];
function refine(models,initial,size,engine,options={}){
 if(models.length!==initial.length||!(size>0))throw Error('配置データが不正です');
 const laid=initial.map(l=>({...l,box:{...l.box}}));
 const view=options.view||null;
 // Only labels near the visible viewport should compete for screen space.
 // Offscreen towns must not displace an otherwise readable on-screen label.
 const margin=size*2;
 const active=laid.map((l,i)=>{
  if(!view)return i;
  const b=l.box;
  return b.x2>=view.x-margin&&b.x1<=view.x+view.w+margin&&
   b.y2>=view.y-margin&&b.y1<=view.y+view.h+margin?i:-1;
 }).filter(i=>i>=0);
 const pinned=Number.isInteger(options.pinned)?options.pinned:-1;
 function score(i,x,y){
  const l=laid[i],rect=box(x,y,l.width,l.height);
  let count=0,area=0;
  for(const j of active){
   if(j===i)continue;
   const a=overlap(rect,laid[j].box);
   if(a>.01){count++;area+=a;}
  }
  return {count,area};
 }
 function totals(){
  let count=0;
  for(let a=0;a<active.length;a++)
   for(let b=0;b<a;b++)
    if(overlap(laid[active[a]].box,laid[active[b]].box)>.01)count++;
  return count;
 }
 const before=totals();
 if(before===0)return {labels:laid,before,after:before,moved:0};
 const maxPasses=Math.max(1,Math.min(3,options.passes||2));
 for(let pass=0;pass<maxPasses;pass++){
  const counts=new Map(active.map(i=>[i,score(i,laid[i].x,laid[i].y).count]));
  const order=active.filter(i=>counts.get(i)>0&&i!==pinned).sort((a,b)=>
   counts.get(b)-counts.get(a)||
   models[b].box.w*models[b].box.h-models[a].box.w*models[a].box.h||a-b);
  let changed=false;
  for(const i of order){
   const l=laid[i],seed=initial[i],model=models[i];
   const previous=score(i,l.x,l.y);
   if(previous.count===0)continue;
   const depth=engine.signedDist(seed.x,seed.y,model.rings);
   const minDepth=depth>0?Math.min(size*.14,depth*.25):0;
   function cost(result,x,y){
    const drift=Math.hypot(x-seed.x,y-seed.y)/size;
    // A collision is much more expensive than a modest displacement.
    // Equal collision counts may improve when overlap *area* shrinks.
    return result.count*100+result.area/(size*size)*6+drift*.9;
   }
   let best={x:l.x,y:l.y,score:previous},bestCost=cost(previous,l.x,l.y);
   for(const [dx,dy] of OFFSETS){
    const x=seed.x+dx*size,y=seed.y+dy*size;
    if(!engine.isInside(x,y,model.rings))continue;
    if(minDepth>0&&engine.signedDist(x,y,model.rings)<minDepth)continue;
    const candidate=score(i,x,y);
    if(candidate.count>previous.count)continue;
    const value=cost(candidate,x,y);
    if(value<bestCost-1e-7){
     best={x,y,score:candidate};bestCost=value;
    }
   }
   if(Math.hypot(best.x-l.x,best.y-l.y)>1e-6){
    l.x=best.x;l.y=best.y;l.box=box(l.x,l.y,l.width,l.height);
    l.fit=undefined; // stale geographic fit from the original anchor
    l.step=(l.y-seed.y)/size;
    l.horizontalStep=(l.x-seed.x)/size;
    changed=true;
   }
  }
  if(!changed)break;
 }
 // A single-label greedy step may get stuck when two adjacent long names
 // need to move in *opposite directions*. Jointly test a small, deterministic
 // set of pairs at large zooms; never raise the number of overlapping pairs.
 if(options.pairwise&&active.length<=100){
  const colliding=[];
  for(let a=0;a<active.length;a++)for(let b=0;b<a;b++){
   const i=active[a],j=active[b],area=overlap(laid[i].box,laid[j].box);
   if(area>.01)colliding.push({i,j,area});
  }
  colliding.sort((a,b)=>b.area-a.area||a.i-b.i||a.j-b.j);
  function candidatePositions(i){
   const l=laid[i],seed=initial[i],model=models[i];
   if(i===pinned)return [{x:l.x,y:l.y,b:l.box}];
   const depth=engine.signedDist(seed.x,seed.y,model.rings);
   const minDepth=depth>0?Math.min(size*.14,depth*.25):0;
   const points=[{x:l.x,y:l.y,b:l.box}];
   for(const [dx,dy] of OFFSETS){
    const x=seed.x+dx*size,y=seed.y+dy*size;
    if(!engine.isInside(x,y,model.rings))continue;
    if(minDepth>0&&engine.signedDist(x,y,model.rings)<minDepth)continue;
    points.push({x,y,b:box(x,y,l.width,l.height)});
   }
   return points;
  }
  function pairQuality(i,j,a,b){
   const pairArea=overlap(a.b,b.b);
   let count=pairArea>.01?1:0,totalArea=pairArea;
   for(const k of active){
    if(k===i||k===j)continue;
    const q=laid[k].box,u=overlap(a.b,q),v=overlap(b.b,q);
    if(u>.01){count++;totalArea+=u;}
    if(v>.01){count++;totalArea+=v;}
   }
   const ai=initial[i],aj=initial[j];
   const drift=(Math.hypot(a.x-ai.x,a.y-ai.y)+Math.hypot(b.x-aj.x,b.y-aj.y))/size;
   return {count,pairArea,value:count*60+pairArea/(size*size)*25+
      totalArea/(size*size)*3+drift*.5};
  }
  for(const {i,j} of colliding.slice(0,24)){
   if(overlap(laid[i].box,laid[j].box)<=.01)continue;
   const oldI={x:laid[i].x,y:laid[i].y,b:laid[i].box};
   const oldJ={x:laid[j].x,y:laid[j].y,b:laid[j].box};
   const old=pairQuality(i,j,oldI,oldJ);
   let bestA=oldI,bestB=oldJ,best=old;
   const ci=candidatePositions(i),cj=candidatePositions(j);
   for(const a of ci)for(const b of cj){
    const result=pairQuality(i,j,a,b);
    if(result.count>old.count||result.pairArea>old.pairArea+.01)continue;
    if(result.value<best.value-1e-7){best=result;bestA=a;bestB=b;}
   }
   if(bestA!==oldI||bestB!==oldJ){
    for(const [index,p] of [[i,bestA],[j,bestB]]){
     const l=laid[index],seed=initial[index];
     l.x=p.x;l.y=p.y;l.box=p.b;
     l.step=(l.y-seed.y)/size;
     l.horizontalStep=(l.x-seed.x)/size;
    }
   }
  }
 }
 const after=totals();
 const moved=laid.reduce((n,l,i)=>n+(Math.hypot(l.x-initial[i].x,l.y-initial[i].y)>1e-5?1:0),0);
 return {labels:laid,before,after,moved};
}
global.KussoonCollisionRefinement={refine};
})(window);
