// Reusable SVG town-label scaling and fitted-viewport edge correction.
// The calculations intentionally preserve Nishinomiya V12 semantics and order.
(function(root){
 'use strict';
 function fontPixels({zoomK,initialK,directLinkFontOffset=0,fontPct=100}){
  return 8*Math.min(2,Math.max(.75,Math.pow(1.18,Math.log2(zoomK/initialK)+directLinkFontOffset)))*fontPct/100;
 }
 function update({labels,svg,transform,fittedView,readingOn,fs}){
 labels.selectAll('g.label').attr('transform',d=>{
  const p=d.point;return 'translate('+(p[0]+d.offset[0]/transform.k)+','+(p[1]+d.offset[1]/transform.k)+') scale('+(1/transform.k)+')';
 });
 // Use explicit pixel offsets for the two lines. SVG tspan dy in em can
 // retain stale layout metrics after font-size changes during zoom.
 labels.selectAll('text.town-label').attr('font-size',fs);
 labels.selectAll('text.town-label').selectAll('tspan.town-name')
  .attr('y',readingOn?(-.48*fs):0).attr('dy',null);
 labels.selectAll('text.town-label').selectAll('tspan.town-reading')
  .attr('font-size',fs*.78).attr('y',.54*fs).attr('dy',null);
 // Fitted city/region views only: leave C-derived anchors intact unless
 // the rendered glyph rectangle would actually be cut off by the map edge.
 // Do not pin labels to screen edges while the user is dragging or zooming.
 const mapBounds=svg.node().getBoundingClientRect(),inset=2;
 labels.selectAll('g.label').each(function(d){
  this.removeAttribute('data-edge-shift');
  if(!fittedView)return;
  const text=this.querySelector('text.town-label');if(!text)return;
  const box=text.getBoundingClientRect();
  let dx=0,dy=0;
  if(box.left<mapBounds.left+inset)dx=mapBounds.left+inset-box.left;
  else if(box.right>mapBounds.right-inset)dx=mapBounds.right-inset-box.right;
  if(box.top<mapBounds.top+inset)dy=mapBounds.top+inset-box.top;
  else if(box.bottom>mapBounds.bottom-inset)dy=mapBounds.bottom-inset-box.bottom;
  if(!dx&&!dy)return;
  // A text box wider than the map is centred instead of oscillating.
  if(box.width>mapBounds.width-2*inset)dx=mapBounds.left+mapBounds.width/2-(box.left+box.width/2);
  if(box.height>mapBounds.height-2*inset)dy=mapBounds.top+mapBounds.height/2-(box.top+box.height/2);
  const px=d.point[0]+(d.offset[0]+dx)/transform.k;
  const py=d.point[1]+(d.offset[1]+dy)/transform.k;
  this.setAttribute('transform','translate('+px+','+py+') scale('+(1/transform.k)+')');
  this.setAttribute('data-edge-shift',dx.toFixed(2)+','+dy.toFixed(2));
 });
}

 const api=Object.freeze({fontPixels,update});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgLabelViewport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
