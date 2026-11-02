/* V2 2026 nationwide adapter for the EXISTING V2 label engine.
 * Reuse balanced center, collision refinement and full-text territory fit.
 * All positions are calculated in current SVG project coordinates. No
 * municipality-specific offsets and no modifications to administrative data.
 */
(function(global){
'use strict';
const E=global.KussoonLabelEngine,R=global.KussoonReadableLabels;
const C=global.KussoonCollisionRefinement,F=global.KussoonRegionFit;
if(!E||!R||!C||!F)throw Error('Original V2 label engine scripts are required');
function largestPolygon(polys,project){
 let picked=null,best=-1;
 for(const polygon of polys||[]){
  const ring=polygon[0]||[];
  if(ring.length<3)continue;
  let twice=0;
  for(let i=0;i<ring.length;i++){
   const p=project(ring[i]),q=project(ring[(i+1)%ring.length]);
   twice+=p[0]*q[1]-q[0]*p[1];
  }
  if(Math.abs(twice)>best){best=Math.abs(twice);picked=polygon;}
 }
 return picked;
}
function simplifiedRing(ring,project){
 const limit=300;
 const step=Math.max(1,Math.ceil(ring.length/limit));
 const pts=[];
 for(let i=0;i<ring.length;i+=step)pts.push(project(ring[i]));
 if(ring.length>2 && (ring.length-1)%step!==0)pts.push(project(ring[ring.length-1]));
 if(pts.length<3)return [];
 const first=pts[0],last=pts[pts.length-1];
 if(first[0]!==last[0]||first[1]!==last[1])pts.push(first);
 return pts;
}
function modelFor(region,project){
 const polygon=largestPolygon(region.polys,project);
 if(!polygon)return null;
 const rings=polygon.map(r=>simplifiedRing(r,project)).filter(r=>r.length>=4);
 if(!rings.length)return null;
 const d=rings.map(r=>'M'+r.map(p=>p[0].toFixed(3)+','+p[1].toFixed(3)).join('L')+'Z').join('');
 // This existing engine accepts SVG paths; keep read-only source geometry.
 const textParts=region.readingParts||[];
 const primary=textParts.length===2
   ?(textParts[0].name.length>=textParts[1].name.length?textParts[0].name:textParts[1].name)
   :region.name;
 return {d,name:primary,code:region.code,region};
}
function textBox(region,size,readings,measure){
 const hasReading=readings&&Boolean(region.reading);
 const parts=hasReading&&region.readingParts?.length===2?region.readingParts:null;
 const rows=parts?[
  {text:parts[0].name,size,y:-21},
  {text:parts[0].reading,size:11,y:-8},
  {text:parts[1].name,size,y:8},
  {text:parts[1].reading,size:11,y:21}
 ]:[{text:region.name,size,y:5}];
 if(hasReading&&!parts)rows.push({text:region.reading,size:11,y:19});
 const maxWidth=Math.max(...rows.map(r=>measure(r.text,r.size)),1)+size*.34;
 const top=Math.min(...rows.map(r=>r.y-r.size*.62))-2;
 const bottom=Math.max(...rows.map(r=>r.y+r.size*.42))+2;
 // The original collision/fit engines expect the label box centered on its
 // anchor, so conservatively cover all rows by a symmetric box.
 return {width:maxWidth,height:2*Math.max(Math.abs(top),Math.abs(bottom))};
}
const measure=(value,size)=>{
 // SVG labels have a consistent Japanese system font; canvas measures actual
 // rows so containment is based on the whole label, not only its centre.
 if(typeof document==='undefined'||!document.createElement)return [...String(value)].length*size;
 const canvas=measure.canvas||(measure.canvas=document.createElement('canvas'));
 const ctx=canvas?.getContext?.('2d');
 if(!ctx)return [...String(value)].length*size;
 ctx.font='600 '+size+'px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
 return ctx.measureText(String(value)).width;
};
function layout({regions,project,selected='',all=false,readings=false}){
 const visible=all?regions:regions.filter(r=>r.code===selected);
 const seeds=visible.map(r=>modelFor(r,project)).filter(Boolean);
 if(!seeds.length)return new Map();
 const models=E.buildModels(seeds).models;
 // Reuse the SAME established 2021-era balanced geometric anchor planning.
 // Deliberately do not pin the selected label during territory-fit repair:
 // an initial selected label can be incorrectly close to a border.
 const font=14;
 const placed=R.planCenterFirstLabels(models,null,'kanji',font,measure,E,
   {anchor:'balanced',shift:all?'adjacent':'none'});
 const full=placed.map((p,i)=>{
  const size=seeds[i].code===selected?18:14;
  const {width,height}=textBox(seeds[i].region,size,readings,measure);
  // The actual text rows have a minor Y-offset relative to the anchor.
  // Fit checks use this complete visual text rectangle (including furigana).
  return {...p,width,height,box:{
   x1:p.x-width/2,x2:p.x+width/2,
   y1:p.y-height/2,y2:p.y+height/2
  }};
 });
 // Keep the tested non-destructive collision pass when all labels are shown.
 const collisions=all&&models.length>1
  ?C.refine(models,full,font,E,{passes:2,pinned:models.findIndex(m=>m.code===selected)})
  :{labels:full};
 // Reuse whole-label 5x5 coverage + border-clearance refinement at the
 // CURRENT projection. Unlike a hard-coded x/y adjustment, this works for
 // Sapporo, Atami, all wards and all other mapped regions.
 const contained=F.refine(models,collisions.labels,font,E,
   {passes:1,perimeter:false,pinned:-1});
 const cleared=F.refine(models,contained.labels,font,E,
   {passes:1,perimeter:true,pinned:-1});
 return new Map(cleared.labels.map((p,i)=>[seeds[i].code,[p.x,p.y]]));
}
global.KussoonV2EstablishedLabelAdapter=Object.freeze({layout,largestPolygon,modelFor});
})(window);
