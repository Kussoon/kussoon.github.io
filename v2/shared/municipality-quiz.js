/* Kussoon V2 municipality map quiz.
 * Pure state model: same official 2026 municipality records as the searchable map.
 * A question selects a territory; four alternatives use full administrative names.
 * No extra municipality dataset, geometry edits, or external dependencies.
 */
(function(global){
'use strict';
function label(region){return String(region.fullName||region.name||'');}
function eligible(region){return Boolean(region&&/^\d{5}$/.test(String(region.code||''))&&label(region)&&!label(region).includes('所属未定地'));}
function shuffle(items,random=Math.random){
 const result=items.slice();
 for(let i=result.length-1;i>0;i--){
  const n=Math.min(i,Math.floor(Math.max(0,Math.min(.999999999,random()))*(i+1)));
  [result[i],result[n]]=[result[n],result[i]];
 }
 return result;
}
function create(regions,{count=10,random=Math.random}={}){
 const available=(regions||[]).filter(eligible);
 const codes=new Set(available.map(r=>String(r.code)));
 if(codes.size!==available.length)throw Error('行政区域コードが重複しています');
 // Avoid ambiguous correct answers; unique 5-digit area code is not always
 // enough if a map source accidentally lists duplicate display names.
 const groups=new Map();
 for(const r of available){const name=label(r);groups.set(name,(groups.get(name)||0)+1);}
 const pool=available.filter(r=>groups.get(label(r))===1);
 if(pool.length<4)throw Error('4択クイズには異なる区域が4つ以上必要です');
 const limit=Math.max(1,Math.min(pool.length,Math.trunc(count)||10));
 const order=shuffle(pool,random).slice(0,limit);
 let index=0,correct=0,answered=false,choice=null,finished=false;
 function question(){
  if(finished)return null;
  const answer=order[index];
  const others=shuffle(pool.filter(r=>r.code!==answer.code),random).slice(0,3);
  const options=shuffle([answer,...others],random).map(r=>({code:r.code,name:label(r)}));
  return {code:answer.code,options,number:index+1,total:limit};
 }
 let current=question();
 function state(){return {question:current,index,correct,answered,choice,finished,total:limit};}
 function answer(code){
  if(finished||answered||!current)return {ok:false,state:state()};
  const selected=current.options.find(o=>o.code===code);
  if(!selected)return {ok:false,state:state()};
  answered=true;choice=code;
  if(code===current.code)correct++;
  return {ok:code===current.code,state:state()};
 }
 function next(){
  if(finished||!answered)return state();
  index++;answered=false;choice=null;
  if(index===limit){finished=true;current=null;}
  else current=question();
  return state();
 }
 return Object.freeze({state,answer,next});
}
global.KussoonV2MunicipalityQuiz=Object.freeze({create,eligible,label,shuffle});
})(window);
