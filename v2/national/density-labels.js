/* V2 national label visibility experiment. No changes to administrative geometry. */
(function(global){
 'use strict';
 const capitals={
  '19':'19201','22':'22100','25':'25201','26':'26100','27':'27100',
  '28':'28100','29':'29201','30':'30201','31':'31201','32':'32201',
  '33':'33100','34':'34100','35':'35201','36':'36201','37':'37201',
  '38':'38201','39':'39201'
 };
 function overlaps(a,b,gap){
  return a.x1-gap<b.x2 && a.x2+gap>b.x1 &&
   a.y1-gap<b.y2 && a.y2+gap>b.y1;
 }
 function select(models,labels,options){
  const {view,zoom,mode,density,selectedId,screenWidth,screenHeight}=options;
  if(mode==='all')return models.map(()=>true);
  const result=models.map(()=>false);
  const ratio=Math.min((screenWidth||390)/view.w,(screenHeight||390)/view.h);
  const factors={sparse:10500,normal:6500,dense:3600};
  const marginPx={sparse:8,normal:5,dense:2};
  const budget=Math.max(3,Math.round((screenWidth||390)*(screenHeight||390)/
    (factors[density]||factors.normal)));
  const gap=(marginPx[density]||5)/ratio;
  const active=[];
  const candidates=models.map((m,i)=>{
   const p=labels[i],b=p?.box;
   if(!b)return null;
   const code=m.code||'',pref=m.prefectureCode||code.slice(0,2);
   const main=capitals[pref];
   const priority=(m.id===selectedId?1000000:0)+
    (code===main||m.major&&m.major===m.name?300000:0)+
    (Math.max(0,(m.box?.w||0)*(m.box?.h||0))**.35);
   return {i,code,pref,priority,box:b,selected:m.id===selectedId};
  }).filter(Boolean).sort((a,b)=>b.priority-a.priority||
    a.pref.localeCompare(b.pref)||a.code.localeCompare(b.code));
  // The chosen municipality never disappears from the map when selected.
  for(const c of candidates){
   if(!c.selected)continue;
   result[c.i]=true;active.push(c.box);
  }
  let count=0;
  for(const c of candidates){
   if(c.selected)continue;
   const b=c.box;
   if(b.x2<view.x||b.x1>view.x+view.w||
      b.y2<view.y||b.y1>view.y+view.h)continue;
   if(count>=budget)break;
   if(active.some(other=>overlaps(b,other,gap)))continue;
   result[c.i]=true;active.push(b);count++;
  }
  return result;
 }
 global.KussoonDensityLabels={select};
})(window);
