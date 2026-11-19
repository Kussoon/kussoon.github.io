/* TOWNMAP-SSOT-001 v1.4 / R-TOWN-00,20,21,23:
 * One nationwide map control rail and operation state binder.
 * Geometry, quiz, font layout and redraw remain injected from data adapters.
 * No municipality-name branches or page-specific behavior here.
 */
(function(root){
 'use strict';
 const html="<div class=\"map-right-rail\" aria-label=\"地図右側の操作\">\n<button class=\"full\" id=\"fullscreen\" type=\"button\">全画面</button>\n<div class=\"map-zoom-slider\" aria-label=\"地図の連続拡大縮小\">\n <button class=\"zoom-mark zoom-step\" id=\"zoomPlus\" type=\"button\" aria-label=\"地図を拡大\">＋</button>\n <div class=\"zoom-slider-well\">\n  <div class=\"zoom-slider-visual-track\" aria-hidden=\"true\"><span class=\"zoom-slider-visual-thumb\"></span></div>\n  <input id=\"zoomSlider\" type=\"range\" min=\"0\" max=\"100\" step=\"0.1\" value=\"50\" aria-label=\"地図の拡大縮小スライダー\">\n </div>\n <button class=\"zoom-mark zoom-step\" id=\"zoomMinus\" type=\"button\" aria-label=\"地図を縮小\">−</button>\n</div>\n<div class=\"controls\" aria-label=\"文字・表示操作\">\n<div class=\"pair\"><button id=\"larger\" type=\"button\"><span>文字</span><span>＋</span></button><button id=\"smaller\" type=\"button\"><span>文字</span><span>−</span></button></div>\n<button id=\"size\" type=\"button\">文字\n100\n％</button>\n<button id=\"reading\" type=\"button\" aria-pressed=\"false\">よみ\nがな\nOFF</button>\n<button id=\"labelMode\" type=\"button\" hidden aria-hidden=\"true\" tabindex=\"-1\">配置\n自動</button><button id=\"anchorMode\" type=\"button\" hidden disabled aria-hidden=\"true\" tabindex=\"-1\">配置\n仮</button>\n</div>\n</div>";
 const byId=(root,id)=>root.querySelector('#'+id);
 function mount(placeholder){
  if(!placeholder||!placeholder.parentNode)throw new TypeError('control rail mount missing');
  const template=placeholder.ownerDocument.createElement('template');
  template.innerHTML=html;
  const rail=template.content.firstElementChild;
  if(!rail||!rail.classList.contains('map-right-rail'))throw Error('invalid national control rail');
  placeholder.replaceWith(rail);
  return rail;
 }
 function bind({root:rail,document:doc,body,getFontPct,setFontPct,onFontChange,
  getReadingOn,setReadingOn,onReadingChange,onFullscreenChange}){
  if(!rail||!doc||!body||typeof getFontPct!=='function'||typeof setFontPct!=='function'||
   typeof onFontChange!=='function'||typeof getReadingOn!=='function'||
   typeof setReadingOn!=='function'||typeof onReadingChange!=='function'||
   typeof onFullscreenChange!=='function')
   throw new TypeError('national control rail requires complete callbacks');
  const find=id=>{const el=byId(rail,id);if(!el)throw Error('missing map control: '+id);return el};
  const size=find('size'),reading=find('reading'),fullscreen=find('fullscreen');
  find('smaller').onclick=()=>{setFontPct(Math.max(75,getFontPct()-25));onFontChange()};
  find('larger').onclick=()=>{setFontPct(Math.min(200,getFontPct()+25));onFontChange()};
  size.onclick=()=>{setFontPct(100);size.textContent='文字\n100\n％';onFontChange()};
  reading.onclick=()=>{
   const next=!getReadingOn();setReadingOn(next);
   reading.textContent='よみ\nがな\n'+(next?'ON':'OFF');
   reading.setAttribute('aria-pressed',String(next));
   onReadingChange(next);
  };
  fullscreen.onclick=()=>{
   body.classList.toggle('fullscreen');
   const enabled=body.classList.contains('fullscreen');
   fullscreen.textContent=enabled?'戻る':'全画面';
   onFullscreenChange(enabled);
  };
  const button=rail.querySelector('#larger'),controls=rail.querySelector('.controls');
  const ctx=doc.createElement('canvas').getContext('2d');
  if(ctx&&button&&controls){
   const style=getComputedStyle(button);
   ctx.font=[style.fontStyle,style.fontVariant,style.fontWeight,style.fontSize,style.fontFamily].join(' ');
   const width=Math.min(54,Math.max(45,Math.ceil(Math.max(...['文字','よみ','がな','OFF','ON','100','全体','配置','自動','仮','＋','－','−'].map(v=>ctx.measureText(v).width))+13)));
   controls.style.setProperty('--compact-width',width+'px');
  }
  return Object.freeze({root:rail});
 }
 const api=Object.freeze({mount,bind});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgControlRail=api;
})(typeof globalThis!=='undefined'?globalThis:this);
