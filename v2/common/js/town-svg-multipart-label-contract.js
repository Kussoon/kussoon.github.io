/* TOWNMAP-SSOT-001 R-TOWN-00/06/11/13/14/44
 * Normalize approved point labels and geometry-derived multipart candidates
 * without city-name branches. This opt-in module does not alter existing pages.
 */
(function(root){
 'use strict';
 const pointOk=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
 function normalize({name,reading='',candidates}){
  if(typeof name!=='string'||!name.trim()||!Array.isArray(candidates)||!candidates.length)
   throw new TypeError('町名と1件以上のラベル候補が必要です');
  const seen=new Set();
  return candidates.map((candidate,index)=>{
   const point=candidate.point,offset=candidate.offset||[0,0];
   if(!pointOk(point)||!pointOk(offset))throw new TypeError('候補座標が不正です');
   const key=candidate.key==null?name+':component:'+index:String(candidate.key);
   if(!key||seen.has(key))throw new Error('ラベル候補キーが重複しています');
   seen.add(key);
   return Object.freeze({name,reading,key,point:[...point],offset:[...offset],
    secondary:index>0,area:Number.isFinite(candidate.area)?candidate.area:null});
  });
 }
 function fromApproved({name,reading='',positions}){
  if(!Array.isArray(positions))throw new TypeError('採用済みラベル座標が必要です');
  return normalize({name,reading,candidates:positions.map((p,index)=>({
   point:p.point,offset:p.offset||[0,0],key:p.key||name+':'+index
  }))});
 }
 function fromSvg({name,reading='',path,isFilled,viewBoxArea,autoLabels}){
  if(typeof path!=='string'||typeof isFilled!=='function'
    ||!Number.isFinite(viewBoxArea)||viewBoxArea<=0
    ||!autoLabels||typeof autoLabels.candidates!=='function')
   throw new TypeError('SVG形状と塗り領域の検査関数が必要です');
  const entries=autoLabels.candidates(path,isFilled,viewBoxArea);
  return normalize({name,reading,candidates:entries.map((c,i)=>({
   point:c.point,area:c.area,key:name+':component:'+i
  }))});
 }
 // V34: text-node Range measures a glyph line accurately on WebKit;
 // retain the previously accepted getBBox/CTM fallback.
 function glyphScreenRect(el,doc){
  if(!el||!doc||typeof doc.createRange!=='function')throw new TypeError('文字要素が必要です');
  const range=doc.createRange();range.selectNodeContents(el);
  const actual=range.getBoundingClientRect();
  if(actual.width>0&&actual.height>0)return actual;
  const b=el.getBBox(),m=el.getScreenCTM();
  if(!m)return el.getBoundingClientRect();
  const pts=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]]
    .map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
  const left=Math.min(...pts.map(p=>p.x)),right=Math.max(...pts.map(p=>p.x));
  const top=Math.min(...pts.map(p=>p.y)),bottom=Math.max(...pts.map(p=>p.y));
  return {left,right,top,bottom,width:right-left,height:bottom-top};
 }
 const api=Object.freeze({normalize,fromApproved,fromSvg,glyphScreenRect});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownMultipartLabels=api;
})(typeof globalThis!=='undefined'?globalThis:this);
