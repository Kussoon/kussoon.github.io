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

 // One-label greedy refinement may reach a local minimum: two neighboring
 // names sometimes have to move together before their collision disappears.
 // Apply joint moves only in magnified, bounded viewports.
 if(options.pairwise&&active.length<=105){
  const overlaps=[];
  for(let a=0;a<active.length;a++)for(let b=0;b<a;b++){
   const i=active[a],j=active[b],area=overlap(laid[i].box,laid[j].box);
   if(area>.01)overlaps.push({i,j,area});
  }
  overlaps.sort((a,b)=>b.area-a.area||a.i-b.i||a.j-b.j);
  function candidates(i){
   const current=laid[i],seed=initial[i],m=models[i];
   const baseline={x:current.x,y:current.y,box:current.box};
   if(i===pinned)return [baseline];
   const depth=engine.signedDist(seed.x,seed.y,m.rings);
   const minDepth=depth>0?Math.min(size*.14,depth*.25):0;
   const found=[baseline];
   for(const [dx,dy] of OFFSETS){
    const x=seed.x+dx*size,y=seed.y+dy*size;
    if(!engine.isInside(x,y,m.rings))continue;
    if(minDepth>0&&engine.signedDist(x,y,m.rings)<minDepth)continue;
    found.push({x,y,box:box(x,y,current.width,current.height)});
   }
   return found;
  }
  function quality(i,j,first,second){
   const pairArea=overlap(first.box,second.box);
   let pairs=pairArea>.01?1:0,area=pairArea;
   for(const k of active){
    if(k===i||k===j)continue;
    const b=laid[k].box,firstOverlap=overlap(first.box,b),secondOverlap=overlap(second.box,b);
    if(firstOverlap>.01){pairs++;area+=firstOverlap;}
    if(secondOverlap>.01){pairs++;area+=secondOverlap;}
   }
   const si=initial[i],sj=initial[j];
   const drift=(Math.hypot(first.x-si.x,first.y-si.y)+
     Math.hypot(second.x-sj.x,second.y-sj.y))/size;
   return {pairs,pairArea,cost:pairs*100+pairArea/(size*size)*20+area/(size*size)*5+drift*.4};
  }
  for(const {i,j} of overlaps.slice(0,25)){
   if(overlap(laid[i].box,laid[j].box)<=.01)continue;
   const beforeI={x:laid[i].x,y:laid[i].y,box:laid[i].box};
   const beforeJ={x:laid[j].x,y:laid[j].y,box:laid[j].box};
   const old=quality(i,j,beforeI,beforeJ);
   let bestI=beforeI,bestJ=beforeJ,best=old;
   for(const first of candidates(i))for(const second of candidates(j)){
    const next=quality(i,j,first,second);
    if(next.pairs>old.pairs||next.pairArea>old.pairArea+.01)continue;
    if(next.cost<best.cost-1e-7){
     best=next;bestI=first;bestJ=second;
    }
   }
   if(bestI!==beforeI||bestJ!==beforeJ){
    for(const [k,p] of [[i,bestI],[j,bestJ]]){
     const l=laid[k],seed=initial[k];
     l.x=p.x;l.y=p.y;l.box=p.box;
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
