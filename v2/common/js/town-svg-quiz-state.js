/* Kussoon reusable town quiz state/score contract.
 * No DOM, mapping, geometry, timeouts or municipality specific behavior.
 * Preserves V8 scoring: each distinct erroneous map choice costs one point;
 * a disabled incorrect 4-choice answer cannot score twice; revealing an
 * answer costs one point even if the question has prior penalties.
 */
(function(root){
 'use strict';
 const clamp=n=>Math.max(0,n);
 function begin(mode,pool,shuffle){
  if(mode!==1&&mode!==2)throw new Error('Invalid quiz mode');
  if(!Array.isArray(pool)||!pool.length||new Set(pool).size!==pool.length)
   throw new Error('Invalid quiz pool');
  if(typeof shuffle!=='function')throw new Error('Quiz shuffle is required');
  const order=shuffle([...pool]);
  if(!Array.isArray(order)||order.length!==pool.length||new Set(order).size!==pool.length)
   throw new Error('Quiz shuffle returned invalid town names');
  return {mode,order,index:0,score:order.length,wrong:new Set(),wrongPlaces:new Set(),locked:false};
 }
 function question(state){return state.order[state.index]}
 function valid(state,mode){return state.mode===mode&&!state.locked&&question(state)!==undefined}
 function mapAnswer(state,name){
  if(!valid(state,1))return {kind:'ignored'};
  if(name===question(state))return {kind:'correct'};
  if(state.wrongPlaces.has(name))return {kind:'ignored'};
  state.wrongPlaces.add(name);
  state.wrong.add(question(state));
  state.score=clamp(state.score-1);
  return {kind:'wrong',score:state.score};
 }
 function choiceAnswer(state,name,disabled){
  if(!valid(state,2)||disabled)return {kind:'ignored'};
  if(name===question(state))return {kind:'correct'};
  state.wrong.add(question(state));
  state.score=clamp(state.score-1);
  return {kind:'wrong',score:state.score};
 }
 function reveal(state){
  if(!valid(state,1))return {kind:'ignored'};
  state.score=clamp(state.score-1);
  state.wrong.add(question(state));
  return {kind:'reveal',score:state.score};
 }
 function markCorrect(state){state.locked=true}
 function next(state){
  state.index+=1;
  state.locked=false;
  state.wrongPlaces.clear();
  return {finished:state.index>=state.order.length,target:question(state)};
 }
 function result(state,quitEarly){
  return {answered:state.index+(state.locked?1:0),total:state.order.length,
   score:state.score,wrongCount:state.wrong.size,
   interruptedTown:quitEarly?question(state):null};
 }
 root.KussoonTownSvgQuizState=Object.freeze({begin,question,mapAnswer,choiceAnswer,reveal,markCorrect,next,result});
})(typeof window!=='undefined'?window:globalThis);
