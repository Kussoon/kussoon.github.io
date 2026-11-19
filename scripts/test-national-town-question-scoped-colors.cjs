'use strict';
// TOWNMAP-SSOT-001: common visual color state must not leak across questions.
// This is data-neutral, so run against both certified municipality scopes.
const assert=require('node:assert/strict');
const feedback=require('../v2/common/js/town-svg-quiz-map-feedback.js');
function verify(city,names){
 const rows=names.map(name=>({name,classes:new Set()}));
 const areas={selectAll(selector){
  assert.equal(selector,'path.town');
  return {classed(cls,fn){for(const row of rows){
   if(fn(row))row.classes.add(cls);else row.classes.delete(cls);
  }return this}};
 }};
 const model=feedback.create({areas});
 const selected=cls=>rows.filter(r=>r.classes.has(cls)).map(r=>r.name);
 const [a,b,c,d]=names;
 model.startQuiz();
 model.wrong(a);model.wrong(b);
 assert.deepEqual(selected('wrong'),[a,b],city+' two wrongs within question');
 model.correct(c);
 assert.deepEqual(selected('wrong'),[a,b],city+' wrongs persist through correct answer');
 assert.deepEqual(selected('selected'),[c],city+' correct yellow during question');
 model.nextQuestion();
 for(const cls of ['wrong','selected','blink'])assert.deepEqual(selected(cls),[],city+' next question clears '+cls);
 assert.deepEqual(model.wrongNames(),[]);
 model.wrong(a);
 assert.deepEqual(selected('wrong'),[a],city+' wrong now belongs to new question only');
 model.blink(d,true);
 assert.deepEqual(selected('blink'),[d]);
 model.blink(d,false);
 assert.deepEqual(selected('blink'),[]);
 model.startQuiz();
 assert.deepEqual(selected('wrong'),[]);
 assert.deepEqual(selected('selected'),[]);
 console.log('PASS TOWN_QUESTION_SCOPED_COLORS '+JSON.stringify({city,count:names.length,withinQuestion:true,nextQuestionReset:true}));
}
verify('西宮市',['津田町','荒戎町','本町','浜脇町']);
verify('宝塚市',['仁川北','仁川高台','鹿塩','切畑']);
