'use strict';
const assert=require('node:assert/strict');
const {bindResultActions}=require('../v2/common/js/town-svg-quiz-ui.js');
const button=()=>({onclick:null});
const next=button(),quit=button(),retryWrong=button(),retryAll=button(),back=button();
let mode=1,wrong=new Set(['A','B']);const actions=[];
bindResultActions({next,quit,retryWrong,retryAll,back,
 advanceQuestion:()=>actions.push(['next']),finishEarly:()=>actions.push(['quit']),
 startQuiz:(m,pool)=>actions.push(['start',m,pool]),
 getLastMode:()=>mode,getWrongNames:()=>wrong,
 returnToRegions:()=>actions.push(['back'])});
next.onclick();quit.onclick();retryWrong.onclick();retryAll.onclick();back.onclick();
assert.deepEqual(actions,[['next'],['quit'],['start',1,['A','B']],['start',1,undefined],['back']]);
mode=2;wrong=new Set(['C']);retryWrong.onclick();
assert.deepEqual(actions.at(-1),['start',2,['C']],'result callbacks must read current quiz state');
assert.deepEqual([...wrong],['C'],'shared navigation must not mutate score or wrong-town set');
assert.throws(()=>bindResultActions({next,quit}),TypeError);
console.log('PASS NATIONAL_TOWN_RESULT_NAVIGATION_CONTRACT');
