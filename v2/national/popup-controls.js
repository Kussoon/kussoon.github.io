(function(){
'use strict';
if(new URLSearchParams(location.search).get('popupControlsCurrent')==='1')return;
if(window.KussoonPopupControlsReady)return;
const popup=document.getElementById('officePopup');
const head=popup?.querySelector('.popup-head');
const heading=popup?.querySelector('.popup-heading');
const close=popup?.querySelector('#popupClose');
const scroll=popup?.querySelector('#popupScroll');
const scrollControls=popup?.querySelector('#popupScrollControls');
if(!popup||!head||!heading||!close||!scroll)throw Error('自治体情報の吹き出し要素が見つかりません');

const style=document.createElement('style');
style.textContent=`
.office-popup{transform:translate3d(0,calc(var(--popup-drag-y,0px) + var(--popup-collapse-y,0px)),0)!important}
.popup-head{display:flex;justify-content:flex-start;align-items:stretch;gap:4px;padding:4px;background:#dceaf2;border:1px solid #b5cad7}
.popup-head::before{content:none!important;display:none!important}
.popup-grip{flex:0 0 28px;width:28px;min-height:44px;display:grid;grid-template-columns:repeat(2,4px);grid-auto-rows:4px;gap:4px;place-content:center;border-radius:6px;color:#214f68;cursor:ns-resize}
.popup-grip i{display:block;width:4px;height:4px;border-radius:50%;background:#214f68}
.popup-heading{flex:1 1 auto;min-width:0;align-self:center;padding:2px 0}
.popup-heading strong,.popup-reading{overflow-wrap:anywhere;word-break:normal}
.popup-head .popup-control{box-sizing:border-box;flex:0 0 44px;width:44px;min-width:44px;height:44px;min-height:44px;padding:0;border:1px solid #83a6b8;border-radius:8px;background:#fff;color:#163f56;font-size:22px;line-height:1;font-weight:800;touch-action:manipulation}
.popup-head .popup-control:focus-visible{outline:3px solid #d59b21;outline-offset:2px}
.popup-body{display:flex;flex:1 1 auto;flex-direction:column;min-height:0;overflow:hidden}
.popup-body[hidden]{display:none!important}
`;
document.head.append(style);
const grip=document.createElement('span');
grip.className='popup-grip';
grip.setAttribute('role','img');
grip.setAttribute('aria-label','ここをつかんで上下に移動できます');
grip.title='つかんで上下に移動';
grip.innerHTML='<i></i><i></i><i></i><i></i><i></i><i></i>';

const fold=document.createElement('button');
fold.type='button';
fold.className='popup-control popup-collapse';
fold.id='popupCollapse';
fold.setAttribute('aria-controls','popupBody');
fold.setAttribute('aria-expanded','true');
fold.setAttribute('aria-label','吹き出し本文を折り畳む');
fold.title='本文を折り畳む';

const body=document.createElement('div');
body.className='popup-body';
body.id='popupBody';
if(scrollControls)body.append(scrollControls);
body.append(scroll);
head.replaceChildren(grip,heading,fold,close);
popup.append(body);
close.classList.add('popup-control');

let collapsed=false,previousName='';
function syncFoldControl(){
 fold.textContent=collapsed?'⌄':'−';
 fold.setAttribute('aria-expanded',String(!collapsed));
 fold.setAttribute('aria-label',collapsed?'吹き出し本文を展開':'吹き出し本文を折り畳む');
 fold.title=collapsed?'本文を展開':'本文を折り畳む';
}
function setCorrection(value){popup.style.setProperty('--popup-collapse-y',value+'px');}
function keepTop(anchorTop){
 let correction=parseFloat(popup.style.getPropertyValue('--popup-collapse-y'))||0;
 let rect=popup.getBoundingClientRect();
 correction+=anchorTop-rect.top;
 setCorrection(correction);
 rect=popup.getBoundingClientRect();
 const area=(popup.offsetParent||popup.parentElement).getBoundingClientRect();
 let nudge=0;
 if(rect.top<area.top+8)nudge=area.top+8-rect.top;
 else if(rect.bottom>area.bottom-8)nudge=area.bottom-8-rect.bottom;
 if(nudge){correction+=nudge;setCorrection(correction);}
}
fold.addEventListener('click',()=>{
 const top=popup.getBoundingClientRect().top;
 collapsed=!collapsed;
 body.hidden=collapsed;
 syncFoldControl();
 keepTop(top);
});
fold.addEventListener('pointerdown',event=>event.stopPropagation());
close.addEventListener('pointerdown',event=>event.stopPropagation());
const name=popup.querySelector('#popupName');
new MutationObserver(()=>{
 const value=name.textContent.trim();
 if(value&&value!==previousName){
  previousName=value;
  if(collapsed){collapsed=false;body.hidden=false;syncFoldControl();}
  setCorrection(0);
 }
}).observe(name,{subtree:true,childList:true,characterData:true});
const map=document.querySelector('#map');
let previousCode=map?.querySelector('.chosen[data-code]')?.getAttribute('data-code')||'';
if(map)new MutationObserver(()=>{
 const code=map.querySelector('.chosen[data-code]')?.getAttribute('data-code')||'';
 if(code&&code!==previousCode){
  previousCode=code;
  if(collapsed){collapsed=false;body.hidden=false;syncFoldControl();}
  setCorrection(0);
 }
}).observe(map,{subtree:true,attributes:true,attributeFilter:['class']});
syncFoldControl();
window.KussoonPopupControlsReady=true;
})();