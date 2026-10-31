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
  const marginPx={sparse:8,normal:4,dense:0};
  const tilePx={sparse:150,normal:115,dense:90};
  const limit=Math.max(3,Math.ceil(width*height/(factors[density]||5900)));
  const gap=(marginPx[density]??4)/ratio;
  const tile=tilePx[density]||115;
  const countX=Math.max(1,Math.ceil(width/tile));
  const countY=Math.max(1,Math.ceil(height/tile));
  const taken=new Set(),active=[];
  const inView=b=>b.x2>=view.x&&b.x1<=view.x+view.w&&
   b.y2>=view.y&&b.y1<=view.y+view.h;
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
   taken.add(cellOf(p));return true;
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
  // Second pass: fill remaining gaps without allowing overlaps.
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
 global.KussoonDensityLabels={arrange,select:(models,labels,options)=>
  arrange(models,labels,options).visible};
})(window);
