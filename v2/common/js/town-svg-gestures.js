// Shared SVG town-map gesture policy.
// Preserves the accepted Nishinomiya SVG wheel arming and D3 drag/touch defaults.
(function(root){
 'use strict';
 function install({svg,zoom,document,getQuizMode,getSelected,stopBlink}){
  if(!svg||!zoom||!document||typeof getQuizMode!=='function'
    ||typeof getSelected!=='function'||typeof stopBlink!=='function')
    throw new TypeError('町名地図の操作ハンドラが不足しています');
  let wheelArmed=false;
  svg.node().addEventListener('click',()=>{wheelArmed=true},true);
  document.addEventListener('pointerdown',event=>{
   if(!svg.node().contains(event.target))wheelArmed=false;
  },true);
  zoom.filter(event=>(event.type!=='wheel'||wheelArmed)
   &&(!event.ctrlKey||event.type==='wheel')&&!event.button);
  svg.call(zoom);
  svg.on('click',()=>{if(!getQuizMode()&&getSelected())stopBlink()});
  return Object.freeze({isWheelArmed:()=>wheelArmed});
 }
 const api=Object.freeze({install});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgGestures=api;
})(typeof globalThis!=='undefined'?globalThis:this);
