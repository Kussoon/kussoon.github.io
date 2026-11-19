/* TOWNMAP-SSOT-001 R-TOWN-00/06/12/13/30-35/44
 * Connect a complete, verified municipality dataset to existing generic
 * renderPaths, quiz-state and quiz-choices modules. Does not create a new
 * renderer, modify geography, infer readings, or own the browser UI.
 * The same adapter works for SVG paths and projected TopoJSON features.
 */
(function(root){
 'use strict';
 const valid=x=>typeof x==='string'&&x.trim().length>0;
 function create({dataset,render,quizState,quizChoices}={}){
  if(!dataset||!Array.isArray(dataset.records)||!Array.isArray(dataset.regions)
   ||!dataset.records.length||!dataset.regions.length)
   throw new TypeError('検証済みの自治体データが必要です');
  if(!render||typeof render.renderPaths!=='function'
   ||!quizState||typeof quizState.begin!=='function'
   ||!quizChoices||typeof quizChoices.select!=='function')
   throw new TypeError('共通描画・採点・選択肢の部品が必要です');
  const byName=new Map(dataset.records.map(t=>[t.name,t]));
  const regionNames=dataset.regions.map(r=>r.name);
  const regionSet=new Set(regionNames);
  if(byName.size!==dataset.records.length||regionSet.size!==regionNames.length
   ||dataset.records.some(t=>!valid(t.name)||!valid(t.reading)
    ||!Array.isArray(t.communities)||!t.communities.length
    ||t.communities.some(r=>!regionSet.has(r))))
   throw new Error('完全性検査済みのデータを渡してください');
  let currentRegion='';
  function selectRegion(name=''){
   if(name!==''&&!regionSet.has(name))throw new Error('存在しない地域です: '+name);
   currentRegion=name;
   return active();
  }
  function active(){
   return currentRegion?dataset.records.filter(r=>r.communities.includes(currentRegion))
    :[...dataset.records];
  }
  function names(){return active().map(r=>r.name)}
  function town(name){return byName.get(name)||null}
  function renderCurrent({areas,pathFor,onSelect}={}){
   if(typeof pathFor!=='function'||typeof onSelect!=='function')
    throw new TypeError('形状変換と選択時の動作を渡してください');
   return render.renderPaths({
    areas,records:active(),nameOf:r=>r.name,
    pathOf:r=>pathFor(r.geometry,r),ariaLabel:r=>r.name+'（'+r.reading+'）',
    onSelect
   });
  }
  function startQuiz(mode,shuffle){
   if(typeof shuffle!=='function')throw new TypeError('出題順シャッフルが必要です');
   return quizState.begin(mode,names(),shuffle);
  }
  function choices(target,{adjacency=new Map(),distance,shuffle}={}){
   if(!byName.has(target))throw new Error('出題対象がありません');
   if(typeof distance!=='function'||typeof shuffle!=='function')
    throw new TypeError('距離とシャッフルの関数が必要です');
   if(byName.size<4)throw new Error('4択には異なる町名が4件以上必要です');
   return quizChoices.select(target,{
    townNames:dataset.records.map(r=>r.name),scopeNames:names(),adjacency,
    sameRegion:(a,b)=>{
     const A=byName.get(a),B=byName.get(b);
     return A.communities.some(x=>B.communities.includes(x));
    },distance,shuffle
   });
  }
  return Object.freeze({
   municipalityId:dataset.municipalityId,
   regions:dataset.regions,
   selectRegion,currentRegion:()=>currentRegion,active,names,town,
   renderCurrent,startQuiz,choices
  });
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgReadyRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this);
