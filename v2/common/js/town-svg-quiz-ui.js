/* TOWNMAP-SSOT-001 R-TOWN-00/06/24/30-35.
 * Common, city-neutral quiz presentation transitions. Never owns grading,
 * town geometry, stopBlink, explanations or retry policy.
 */
(function(root){
 'use strict';
 function requireNode(node){if(!node||typeof node!=='object')throw new TypeError('クイズUI要素がありません')}
 function start({mode,status,panel,results,body}){
  if(mode!==1&&mode!==2)throw new TypeError('クイズ形式が不正です');
  for(const el of [status,panel,results,body])requireNode(el);
  // Regression PR #586: prior interrupted-town status cannot leak.
  status.textContent='クイズ'+mode+'を実施中です。';
  results.hidden=true;panel.hidden=false;body.classList.add('town-quiz-mode');
 }
 function clearQuestion({stopBlink,wrongPlaces,choices,next,reveal,feedback}){
  if(typeof stopBlink!=='function'||!wrongPlaces||typeof wrongPlaces.clear!=='function')throw new TypeError('クイズ状態が不足しています');
  for(const el of [choices,next,reveal,feedback])requireNode(el);
  stopBlink();wrongPlaces.clear();choices.replaceChildren();
  next.hidden=true;next.textContent='次の問題へ';
  reveal.hidden=true;feedback.textContent='';
 }
 function showQuestion({mode,target,label,feedback,question,reveal}){
  if((mode!==1&&mode!==2)||typeof label!=='function')throw new TypeError('出題情報が不足しています');
  for(const el of [feedback,question,reveal])requireNode(el);
  if(mode===1){
   question.textContent='「'+label(target)+'」の場所を押してください。';
   feedback.textContent='地図の区域を押してください。';
   reveal.hidden=false;
  }else question.textContent='黄色く点滅する町名を選んでください。';
 }
 function correct({feedback,reveal,next,index,total,message}){
  for(const el of [feedback,reveal,next])requireNode(el);
  if(!Number.isSafeInteger(index)||!Number.isSafeInteger(total)||index<0||total<1||index>=total||typeof message!=='string')
   throw new TypeError('正解表示の情報が不正です');
  feedback.textContent=message;
  reveal.hidden=true;next.hidden=false;
  next.textContent=index===total-1?'結果発表':'次の問題へ';
 }
 function finish({body,panel,results,result,quit,answered,total,score,wrongCount}){
  for(const el of [body,panel,results,result])requireNode(el);
  if(![answered,total,score,wrongCount].every(Number.isSafeInteger))throw new TypeError('集計値が不正です');
  body.classList.remove('town-quiz-mode');panel.hidden=true;results.hidden=false;
  result.textContent=quit?'途中終了：'+answered+' / '+total+'問終了（間違えた問題 '+wrongCount+'件）':
   total+'問中 '+score+'点（間違えた問題 '+wrongCount+'件）';
 }
 // National rule: if no wrong questions remain, the retry-wrong action
 // has no valid destination. Remove it from the visual and focus order.
 function syncWrongRetry({retryWrong,wrongCount}){
  requireNode(retryWrong);
  if(!Number.isSafeInteger(wrongCount)||wrongCount<0)throw new TypeError('誤答数が不正です');
  const available=wrongCount>0;
  retryWrong.hidden=!available;
  retryWrong.disabled=!available;
 }
 function bindResultActions({next,quit,retryWrong,retryAll,back,
                              advanceQuestion,finishEarly,startQuiz,getLastMode,getWrongNames,returnToRegions}){
  for(const button of [next,quit,retryWrong,retryAll,back])requireNode(button);
  for(const fn of [advanceQuestion,finishEarly,startQuiz,getLastMode,getWrongNames,returnToRegions])
   if(typeof fn!=='function')throw new TypeError('結果・復習操作の処理が不足しています');
  // Only the navigation/wiring is common. Municipality data, scoring and
  // the pre-existing full-marks retry-button visibility remain unchanged.
  next.onclick=()=>advanceQuestion();
  quit.onclick=()=>finishEarly();
  retryWrong.onclick=()=>startQuiz(getLastMode(),[...getWrongNames()]);
  retryAll.onclick=()=>startQuiz(getLastMode());
  back.onclick=()=>returnToRegions();
 }
 const api=Object.freeze({start,clearQuestion,showQuestion,correct,finish,bindResultActions,syncWrongRetry});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgQuizUI=api;
})(typeof globalThis!=='undefined'?globalThis:this);
