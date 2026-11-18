/* TOWNMAP-SSOT-001: municipality-neutral continuous SVG zoom slider.
 * Call install on an existing D3 zoom behavior. Zoom buttons, pinch, wheel,
 * drag, reset and any fit operation remain the source of truth.
 */
(function(root){
 'use strict';
 function install({svg,zoom,input,d3}){
  if(!svg||!zoom||!input||!d3)throw new TypeError('Zoom slider inputs are incomplete');
  const extent=zoom.scaleExtent();
  const lower=extent[0],upper=extent[1];
  if(!(lower>0&&upper>lower))throw new RangeError('Zoom extent must have positive bounds');
  const scaleFromValue=value=>lower*Math.pow(upper/lower,Math.max(0,Math.min(100,Number(value)))/100);
  const valueFromScale=k=>100*Math.log(Math.max(lower,Math.min(upper,k))/lower)/Math.log(upper/lower);
  let adjusting=false;
  function sync(event){
   if(adjusting)return;
   const k=event?.transform?.k??d3.zoomTransform(svg.node()).k;
   input.value=String(Math.max(0,Math.min(100,valueFromScale(k))));
   input.setAttribute('aria-valuetext','地図の拡大率 '+Math.round(k*100)+'％');
   // Optional stable visual thumb for vertical Safari/WebKit. The display
   // follows the actual native range value and does not affect zoom input.
   const thumb=input.parentElement?.querySelector('.zoom-slider-visual-thumb');
   if(thumb){
    const down=100-Number(input.value);
    const fraction=down/100;
    thumb.style.top='calc('+down+'% - '+(fraction*27).toFixed(3)+'px)';
   }
  }
  zoom.on('zoom.townZoomSlider',sync);
  input.addEventListener('input',()=>{
   adjusting=true;
   try{
    // D3 zoom.scaleTo automatically keeps the visual center stationary.
    svg.interrupt();
    svg.call(zoom.scaleTo,scaleFromValue(input.value));
   }finally{adjusting=false}
   sync();
  });
  sync();
  return Object.freeze({sync});
 }
 const api=Object.freeze({install});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgZoomSlider=api;
})(typeof globalThis!=='undefined'?globalThis:this);
