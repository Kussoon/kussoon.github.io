/* Kussoon SVG municipality-town source adapter (experimental).
 * Reads a trusted first-party SVG map embedded in a legacy HTML page and
 * cross-checks every shape against the original town/reading JSON.
 * No layout guesses, region-reading guesses, or changes to source maps.
 */
(function(root){
 'use strict';
 async function getSource(path,asJSON){
  if(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//')||path.includes('..'))throw new Error('サイト内パスが不正です');
  const response=await fetch(path,{credentials:'same-origin'});
  if(!response.ok)throw new Error(path+'：HTTP '+response.status);
  return asJSON?response.json():response.text();
 }
 async function loadSvgTownSource({htmlPath,infoPath,expectedCount}){
  const [html,info]=await Promise.all([getSource(htmlPath,false),getSource(infoPath,true)]);
  const doc=new DOMParser().parseFromString(html,'text/html');
  const sourceSvg=doc.querySelector('svg#map[viewBox]');
  if(!sourceSvg)throw new Error('元ページにSVG町域がありません');
  const metadata=info.towns;
  if(!Array.isArray(metadata)||metadata.length!==expectedCount)throw new Error('町名台帳の件数が不一致です');
  const readings=new Map();
  for(const item of metadata){
   if(!item.name||!item.reading||readings.has(item.name))throw new Error('重複町名または未確認読みがあります');
   readings.set(item.name,{reading:item.reading,communities:[...(item.communities||[])]});
  }
  const shapes=[...sourceSvg.querySelectorAll('path.town[data-name]')];
  if(shapes.length!==expectedCount)throw new Error('元SVGの町域数が不一致です');
  const seen=new Set(),towns=[];
  for(const path of shapes){
   const name=path.getAttribute('data-name'),d=path.getAttribute('d'),info=readings.get(name);
   if(!info||!d||seen.has(name))throw new Error('町域・町名台帳の対応が不正です：'+name);
   seen.add(name);
   towns.push({name,reading:info.reading,communities:info.communities,d});
  }
  if(seen.size!==readings.size)throw new Error('町名台帳にSVG未収録の町があります');
  return {towns,viewBox:sourceSvg.getAttribute('viewBox'),sourceHtml:htmlPath,sourceInfo:infoPath};
 }
 root.KussoonTownSvgSourceAdapter=Object.freeze({loadSvgTownSource});
})(window);
