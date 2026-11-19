/* TOWNMAP-SSOT-001 R-TOWN-00/06/14/40/41.
 * Match the actual name glyph's screen center to its accepted label anchor.
 * Uses approved text-node Range / getBBox fallback from shared V34 contract.
 * No municipality condition, no candidate/position regeneration.
 * Invoke only AFTER standard label geometry and visibility update.
 */
(function(root){
 'use strict';
 function align({labels,world,transform,document:doc,readingOn=false,
                 glyphRect=root.KussoonTownMultipartLabels?.glyphScreenRect}={}){
  if(!labels||!world||!transform||!Number.isFinite(transform.k)||transform.k<=0
    ||!doc||typeof glyphRect!=='function')
   throw new TypeError('町名ラベル・ズーム状態・文字範囲測定が必要です');
  // V34 has separately calibrated reading-ON placements; do not overwrite.
  if(readingOn)return {adjusted:0,skipped:'reading-on'};
  const matrix=world.node().getScreenCTM();
  if(!matrix)throw new Error('地図の画面変換行列がありません');
  const inverse=matrix.inverse();
  let adjusted=0;
  labels.selectAll('g.label').each(function(d){
   if(this.style.display==='none'||!d||!Array.isArray(d.point))return;
   const span=this.querySelector('tspan.town-name');
   if(!span)return;
   const rect=glyphRect(span,doc);
   if(!rect||rect.width<=0||rect.height<=0)return;
   const offset=Array.isArray(d.offset)?d.offset:[0,0];
   const originX=d.point[0]+offset[0]/transform.k;
   const originY=d.point[1]+offset[1]/transform.k;
   const screenX=matrix.a*originX+matrix.c*originY+matrix.e;
   const screenY=matrix.b*originX+matrix.d*originY+matrix.f;
   const dx=screenX-(rect.left+rect.width/2);
   const dy=screenY-(rect.top+rect.height/2);
   if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
   // Convert the observed pixel gap back to SVG local coordinates; unlike
   // a fixed pixel correction this also works with responsive SVG viewBox.
   const x=originX+inverse.a*dx+inverse.c*dy;
   const y=originY+inverse.b*dx+inverse.d*dy;
   this.setAttribute('transform','translate('+x+','+y+') scale('+(1/transform.k)+')');
   adjusted++;
  });
  return {adjusted};
 }
 const api=Object.freeze({align});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgGlyphCenter=api;
})(typeof globalThis!=='undefined'?globalThis:this);
