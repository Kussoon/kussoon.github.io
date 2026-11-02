#!/usr/bin/env node
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync('v2/shared/municipality-quiz.js','utf8'),ctx);
const quiz=ctx.window.KussoonV2MunicipalityQuiz;
const r=Array.from({length:12},(_,i)=>({code:String(27001+i),name:'区域'+(i+1),fullName:'大阪市第'+(i+1)+'区'}));
r.push({code:'27000',name:'所属未定地'});
const session=quiz.create(r,{count:10,random:()=>.27});
let seen=new Set();
for(let i=1;i<=10;i++){
 const state=session.state(),q=state.question;
 assert.equal(q.number,i);
 assert.equal(q.total,10);
 assert.equal(q.options.length,4);
 assert.equal(new Set(q.options.map(x=>x.code)).size,4);
 assert(!q.options.some(x=>x.name.includes('所属未定地')));
 assert(!seen.has(q.code),'repeated question');
 seen.add(q.code);
 assert(q.options.some(x=>x.code===q.code));
 const wrong=q.options.find(o=>o.code!==q.code);
 if(i===1){
  assert.equal(session.next().index,0,'cannot skip unanswered question');
  assert(!session.answer('99999').state.answered,'invalid option rejected');
  const ans=session.answer(wrong.code);
  assert(!ans.ok);
  assert(!session.answer(q.code).ok,'cannot answer twice');
  assert.equal(session.state().correct,0);
 }else{
  assert(session.answer(q.code).ok);
  assert.equal(session.state().correct,i-1);
 }
 session.next();
}
assert(session.state().finished);
assert.equal(session.state().correct,9);
assert.equal(session.state().question,null);
assert.equal(session.next().correct,9);
assert(!session.answer('27001').ok);
assert.equal(quiz.label({name:'葵区',fullName:'静岡市葵区'}),'静岡市葵区');
assert.throws(()=>quiz.create([{code:'28001',name:'同一'},{code:'28001',name:'同一'}]),/重複/);
assert.throws(()=>quiz.create(r.slice(0,3)),/4択/);
console.log('PASS official municipality quiz 10 distinct regions, four unique full-name choices, score and lifecycle');
