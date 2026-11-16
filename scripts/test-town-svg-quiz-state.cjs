'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={};sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v2/common/js/town-svg-quiz-state.js'),'utf8'),sandbox);
const Q=sandbox.KussoonTownSvgQuizState;
for(const mode of [1,2]){
 let st=Q.begin(mode,['甲','乙','丙'],x=>x);
 assert.equal(st.score,3);assert.equal(st.index,0);assert.equal(Q.question(st),'甲');
 assert.equal(Q.result(st,false).answered,0);
 if(mode===1){
  assert.equal(Q.mapAnswer(st,'乙').kind,'wrong');assert.equal(st.score,2);
  assert.equal(Q.mapAnswer(st,'乙').kind,'ignored');assert.equal(st.score,2);
  assert.equal(Q.mapAnswer(st,'丙').kind,'wrong');assert.equal(st.score,1);
  assert.equal(Q.mapAnswer(st,'甲').kind,'correct');Q.markCorrect(st);
  assert.equal(Q.mapAnswer(st,'乙').kind,'ignored');
 }else{
  assert.equal(Q.choiceAnswer(st,'乙',false).kind,'wrong');assert.equal(st.score,2);
  assert.equal(Q.choiceAnswer(st,'乙',true).kind,'ignored');assert.equal(st.score,2);
  assert.equal(Q.choiceAnswer(st,'丙',false).kind,'wrong');assert.equal(st.score,1);
  assert.equal(Q.choiceAnswer(st,'甲',false).kind,'correct');Q.markCorrect(st);
  assert.equal(Q.choiceAnswer(st,'乙',false).kind,'ignored');
 }
 assert.equal(Q.result(st,true).interruptedTown,'甲');
 assert.equal(Q.result(st,false).answered,1);
 assert.equal(Q.next(st).finished,false);
 assert.equal(Q.question(st),'乙');
 assert.equal(st.wrongPlaces.size,0);assert.equal(st.locked,false);
 if(mode===1){
  assert.equal(Q.reveal(st).kind,'reveal');assert.equal(st.score,0);
  assert.equal(Q.reveal(st).kind,'reveal');assert.equal(st.score,0); // V8 disallows double reveal after quizCorrect; core guards on lock.
  Q.markCorrect(st);assert.equal(Q.reveal(st).kind,'ignored');
 }else{
  assert.equal(Q.choiceAnswer(st,'乙',false).kind,'correct');Q.markCorrect(st);
 }
 assert.equal(Q.next(st).finished,false);
 assert.equal(Q.question(st),'丙');
 assert.equal(Q.next(st).finished,true);
 assert.equal(Q.result(st,false).total,3);
}
assert.throws(()=>Q.begin(3,['甲'],x=>x));
assert.throws(()=>Q.begin(1,['甲','甲'],x=>x));
assert.throws(()=>Q.begin(1,[],x=>x));
assert.throws(()=>Q.begin(1,['甲'],x=>[]));
console.log('PASS TOWN_SVG_QUIZ_STATE: correct, distinct wrong, disabled repeat, reveal, lock, next, quit, score floor');
