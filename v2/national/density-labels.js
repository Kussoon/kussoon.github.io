/* Experimental national label visibility: balanced screen coverage.
 * Geometry and administrative records stay untouched.
 */
(function(global){
 'use strict';
 const capitals={
  '19':'19201','22':'22100','25':'25201','26':'26100','27':'27100',
  '28':'28100','29':'29201','30':'30201','31':'31201','32':'32201',
  '33':'33100','34':'34100','35':'35201','36':'36201','37':'37201',
  '38':'38201','39':'39201'
 };
 const overlaps=(a,b,g)=>
  a.x1-g<b.x2&&a.x2+g>b.x1&&a.y1-g<b.y2&&a.y2+g>b.y1;
 function shift(label,x,y){
  const dx=x-label.x,dy=y-label.y;
  const b=label.box;
  return {...label,x,y,box:{
   x1:b.x1+dx,x2:b.x2+dx,y1:b.y1+dy,y2:b.y2+dy
  }};
 }
 function arrange(models,labels,options){
  const {view,mode,density,selectedId,screenWidth,screenHeight}=options;
  if(mode==='all')return {visible:models.map(()=>true),labels};
  const width=screenWidth||390,height=screenHeight||390;
  const ratio=Math.min(width/view.w,height/view.h);
  if(!(ratio>0))return {visible:models.map(()=>false),labels};
  const result=models.map(()=>false),placed=labels.slice();
  const factors={sparse:9500,normal:5900,dense:3100};
  const marginPx={sparse:9,normal:3,dense:0};
  const tilePx={sparse:150,normal:115,dense:90};
  // Dense and standard modes show every non-overlapping eligible label.
  // A global count ceiling used to leave obvious blank municipal areas.
  const limit=density==='sparse'?Math.max(3,Math.ceil(width*height/factors.sparse)):
   Infinity;
  const gap=(marginPx[density]??4)/ratio;
  const tile=tilePx[density]||115;
  const countX=Math.max(1,Math.ceil(width/tile));
  const countY=Math.max(1,Math.ceil(height/tile));
  const active=[];
  const inView=b=>b.x2>=view.x&&b.x1<=view.x+view.w&&
   b.y2>=view.y&&b.y1<=view.y+view.h;
  // In a zoomed/panned viewport the map's original anchor may be offscreen
  // even though a substantial part of the municipality is visible.
  // Test real polygon-interior anchors within the visible intersection.
  const E=global.KussoonLabelEngine;
  function viewportAnchors(m,p){
   const box=m.box;
   if(!box?.w||!box?.h||!Array.isArray(m.rings)||!E?.isInside)return [];
   const left=Math.max(view.x,box.minX),right=Math.min(view.x+view.w,box.maxX);
   const top=Math.max(view.y,box.minY),bottom=Math.min(view.y+view.h,box.maxY);
   if(!(right>left&&bottom>top))return [];
   const steps=5,candidates=[];
   for(let iy=0;iy<steps;iy++)for(let ix=0;ix<steps;ix++){
    const x=left+(right-left)*(ix+.5)/steps;
    const y=top+(bottom-top)*(iy+.5)/steps;
    if(!E.isInside(x,y,m.rings))continue;
    // Prefer interior points near the visible region's centre, without
    // forcing the label outside its own municipality.
    const score=Math.hypot((x-(left+right)/2)/(right-left),
     (y-(top+bottom)/2)/(bottom-top));
    candidates.push({x,y,score});
   }
   candidates.sort((a,b)=>a.score-b.score);
   return candidates.slice(0,12).map(({x,y})=>shift(p,x,y));
  }
  const candidates=models.map((m,i)=>{
   const p=labels[i];if(!p?.box)return null;
   const code=m.code||'',pref=m.prefectureCode||code.slice(0,2);
   const priority=(code===capitals[pref]?100000:0)+
    Math.pow(Math.max(0,(m.box?.w||0)*(m.box?.h||0)),.3);
   const anchors=[p];
   if(Array.isArray(m.polylabel)&&m.polylabel.every(Number.isFinite)){
    const alt=shift(p,m.polylabel[0],m.polylabel[1]);
    if(Math.hypot(p.x-alt.x,p.y-alt.y)>p.height*.3)anchors.push(alt);
   }
   // Try locally visible parts of long, clipped or irregular regions, too.
   for(const alt of viewportAnchors(m,p)){
    if(anchors.every(a=>Math.hypot(a.x-alt.x,a.y-alt.y)>p.height*.4))
     anchors.push(alt);
   }
   return {i,priority,pref,code,selected:m.id===selectedId,anchors};
  }).filter(Boolean);
  function cellOf(p){
   const cx=Math.max(0,Math.min(countX-1,Math.floor((p.x-view.x)*ratio/tile)));
   const cy=Math.max(0,Math.min(countY-1,Math.floor((p.y-view.y)*ratio/tile)));
   return cy*countX+cx;
  }
  function claim(c,p,allowCollision=false){
   if(!inView(p.box))return false;
   if(!allowCollision&&active.some(a=>overlaps(a.box,p.box,gap)))return false;
   result[c.i]=true;placed[c.i]=p;
   active.push({box:p.box,cell:cellOf(p)});
   return true;
  }
  // A selected municipality must survive decluttering even if it overlaps.
  for(const c of candidates)if(c.selected)claim(c,c.anchors.find(p=>inView(p.box))||c.anchors[0],true);
  // Choose candidates from under-represented screen cells first.
  const byCell=Array.from({length:countX*countY},()=>[]);
  for(const c of candidates){
   if(c.selected)continue;
   for(const p of c.anchors)if(inView(p.box))byCell[cellOf(p)].push({c,p});
  }
  for(const cell of byCell){
   cell.sort((a,b)=>b.c.priority-a.c.priority||a.c.code.localeCompare(b.c.code));
  }
  // First pass: distribute a label to each available cell before clustering.
  for(let cellId=0;cellId<byCell.length&&active.length<limit;cellId++){
   for(const {c,p} of byCell[cellId]){
    if(result[c.i])continue;
    if(claim(c,p))break;
   }
  }
  // Second pass: fill ALL remaining non-overlapping areas, without the
  // previous global cap that delayed place names until excessive zoom.
  const rest=candidates.filter(c=>!result[c.i])
   .sort((a,b)=>b.priority-a.priority||a.code.localeCompare(b.code));
  for(const c of rest){
   if(active.length>=limit)break;
   for(const p of c.anchors){
    if(claim(c,p))break;
   }
  }
  return {visible:result,labels:placed};
 }
 // A / B experiment: every administrative unit retains its label.
 // B may move a label only a few screen pixels, only to reduce overlaps,
 // and only if its anchor remains inside its *own* polygon.
 function fullCompare(models,labels,options){
  const {mode,view,screenWidth,screenHeight,selectedId}=options;
  const visible=models.map(()=>true);
  if(mode!=='light')return {visible,labels:labels.slice(),moved:0};
  const ratio=Math.min((screenWidth||390)/view.w,(screenHeight||390)/view.h);
  if(!(ratio>0))return {visible,labels:labels.slice(),moved:0};
  const engine=global.KussoonLabelEngine;
  if(typeof engine?.isInside!=='function')return {visible,labels:labels.slice(),moved:0};
  const movedLabels=labels.slice();
  const maxShift=8/ratio;
  const offsets=[[0,0],[-1,0],[1,0],[0,-1],[0,1],
   [-1,-1],[1,-1],[-1,1],[1,1]];
  // The current displayed viewport is all that can have visible collisions.
  const candidates=labels.map((p,i)=>({i,p,m:models[i]})).filter(({p})=>
   p?.box&&p.box.x2>=view.x&&p.box.x1<=view.x+view.w&&
   p.box.y2>=view.y&&p.box.y1<=view.y+view.h);
  function collisionCost(box,index){
   let sum=0;
   for(const {i} of candidates){
    if(i===index)continue;
    const other=movedLabels[i]?.box;if(!other)continue;
    sum+=Math.max(0,Math.min(box.x2,other.x2)-Math.max(box.x1,other.x1))*
     Math.max(0,Math.min(box.y2,other.y2)-Math.max(box.y1,other.y1));
   }
   return sum;
  }
  let moved=0;
  // Smaller polygons get their first opportunity, without hiding large ones.
  candidates.sort((a,b)=>(a.m.box?.w||0)*(a.m.box?.h||0)-
   (b.m.box?.w||0)*(b.m.box?.h||0)||a.i-b.i);
  for(const {i,m,p} of candidates){
   if(m.id===selectedId||!Array.isArray(m.rings))continue;
   let best=p,bestOverlap=collisionCost(p.box,i);
   if(bestOverlap<=.01)continue;
   for(const radius of [0.5,1]){
    for(const [dx,dy] of offsets.slice(1)){
     const x=p.x+dx*maxShift*radius,y=p.y+dy*maxShift*radius;
     if(!engine.isInside(x,y,m.rings))continue;
     const test=shift(p,x,y);
     const overlap=collisionCost(test.box,i);
     if(overlap+.01<bestOverlap){
      best=test;bestOverlap=overlap;
     }
    }
   }
   if(best!==p){movedLabels[i]=best;moved++;}
  }
  return {visible,labels:movedLabels,moved};
 }

 global.KussoonDensityLabels={arrange,fullCompare,select:(models,labels,options)=>
  arrange(models,labels,options).visible};
})(window);
