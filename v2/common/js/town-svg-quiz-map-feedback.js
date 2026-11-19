/* TOWNMAP-SSOT-001 R-TOWN-15/31/32/35
 * Municipality-neutral quiz map feedback: wrong taps accumulate ONLY within
 * the current question, and yellow correct-answer/blinking highlight also
 * belongs only to that question. Do not clear the separate scoring history.
 */
(function(root){
 'use strict';
 function create({areas}={}){
  if(!areas||typeof areas.selectAll!=='function')
   throw new TypeError('SVGの町域レイヤーが必要です');
  const wrongPlaces=new Set();
  let currentCorrect='',blinkName='';
  function paint(){
   areas.selectAll('path.town')
    .classed('wrong',r=>wrongPlaces.has(r.name)&&r.name!==currentCorrect&&r.name!==blinkName)
    .classed('selected',r=>r.name===currentCorrect)
    .classed('blink',r=>r.name===blinkName);
  }
  function startQuiz(){wrongPlaces.clear();currentCorrect='';blinkName='';paint()}
  function nextQuestion(){wrongPlaces.clear();currentCorrect='';blinkName='';paint()}
  function wrong(name){
   if(typeof name!=='string'||!name)throw new TypeError('不正解の町名が必要です');
   wrongPlaces.add(name);paint();
  }
  function correct(name){
   if(typeof name!=='string'||!name)throw new TypeError('正解の町名が必要です');
   currentCorrect=name;blinkName='';paint();
  }
  function blink(name,on){
   blinkName=on?name:'';paint();
  }
  function stopBlink(){blinkName='';paint()}
  return Object.freeze({
   startQuiz,nextQuestion,wrong,correct,blink,stopBlink,
   wrongNames:()=>Object.freeze([...wrongPlaces]),
   state:()=>Object.freeze({currentCorrect,blinkName,wrongCount:wrongPlaces.size})
  });
 }
 const api=Object.freeze({create});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgQuizMapFeedback=api;
})(typeof globalThis!=='undefined'?globalThis:this);
