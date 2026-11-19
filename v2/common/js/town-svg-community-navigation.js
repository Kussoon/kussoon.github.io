/* TOWNMAP-SSOT-001 v1.4 R-TOWN-06/12/21/24/33/34/35.
 * Municipality-neutral region menu interaction and state coordination.
 * Geometry, municipality names, localized notices and fits remain injected.
 */
(function(root){
 'use strict';
 function bindMenu({document,menu,toggle,onSelect}){
  if(!document||!menu||!toggle||typeof onSelect!=='function')throw new TypeError('地域メニューの入力が不正です');
  function close(focus=false){
   menu.hidden=true;toggle.setAttribute('aria-expanded','false');
   if(focus)toggle.focus();
  }
  toggle.addEventListener('click',()=>{
   menu.hidden=!menu.hidden;
   toggle.setAttribute('aria-expanded',String(!menu.hidden));
  });
  menu.addEventListener('click',event=>{
   const button=event.target.closest('button[data-community]');
   if(!button||!menu.contains(button))return;
   onSelect(button.dataset.community);
   close(true);
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!menu.hidden)close(true);
  });
  document.addEventListener('pointerdown',event=>{
   if(!menu.contains(event.target)&&!toggle.contains(event.target))close();
  });
  return Object.freeze({close});
 }
 const api=Object.freeze({bindMenu});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgCommunityNavigation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
