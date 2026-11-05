// Run: node --test v2/pokemon-type/tests/regression.test.mjs
// Pokemon type trainer v1.0 invariant checks. No external dependencies.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const paths=['index.html','advanced.html','advanced-practice.html','advanced-quiz.html'];
const pages=Object.fromEntries(paths.map(name=>[name,readFileSync(join(here,'..',name),'utf8')]));
const TYPE_COUNT=18;
const EXPECTED_SINGLE={0:8,0.5:61,1:204,2:51};
const EXPECTED_DUAL={0:136,0.25:97,0.5:636,1:1285,2:539,4:61};

function scripts(page){
 return [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
}
function readRules(page){
 const found=page.match(/const RULES=(\{[\s\S]*?\});\s*const MATRIX=/);
 assert.ok(found,'RULES and MATRIX remain together');
 return JSON.parse(found[1]);
}
function chart(rules){
 const names=Object.keys(rules);
 assert.equal(names.length,TYPE_COUNT,'18 attacking types');
 for(const [name,values] of Object.entries(rules)){
  assert.equal(values.length,3,name+' requires effective/resisted/immune lists');
  const seen=new Set();
  for(const group of values)for(const defender of group){
   assert.ok(names.includes(defender),'unknown defending type: '+defender);
   assert.ok(!seen.has(defender),'duplicate matchup: '+name+' -> '+defender);
   seen.add(defender);
  }
 }
 const multiplier=(attack,defense)=>{
  const [twice,half,zero]=rules[attack];
  return twice.includes(defense)?2:half.includes(defense)?0.5:zero.includes(defense)?0:1;
 };
 return {names,multiplier};
}
function distributionAsObject(map){return Object.fromEntries([...map.entries()].sort((a,b)=>a[0]-b[0]).map(([k,v])=>[String(k),v]))}

test('All four published pages parse as JavaScript and remain publicly indexable',()=>{
 for(const [name,page] of Object.entries(pages)){
  for(const [i,script] of scripts(page).entries())new Script(script,{filename:name+'#'+i});
  assert.match(page,/<meta name="robots" content="index,follow">/,name);
  assert.match(page,/<meta name="description"/,name);
 }
});
test('All study and quiz modes remain reachable by ordinary links',()=>{
 const main=pages['index.html'];
 for(const id of ['tab-study','tab-practice','tab-quiz'])assert.ok(main.includes('id="'+id+'"'),id);
 for(const name of paths.slice(1))assert.ok(main.includes('href="./'+name+'"'),'missing link to '+name);
 for(const name of paths.slice(1))assert.ok(pages[name].includes('href="./"'),'missing link back: '+name);
 assert.ok(main.includes('function quizStart('),'beginner quiz missing');
 assert.ok(main.includes('function renderPractice()'),'beginner practice missing');
 assert.match(pages['advanced-quiz.html'],/kussoon-pokemon-type-advanced-quiz-mistakes-v1/);
 assert.match(main,/kussoon-type-quiz-mistakes-v1/);
});
test('All pages agree on the canonical 18-type matchup chart',()=>{
 const baseline=JSON.stringify(readRules(pages['index.html']));
 for(const [name,page] of Object.entries(pages))assert.equal(JSON.stringify(readRules(page)),baseline,'chart mismatch: '+name);
});
test('Exactly 324 single-type matchups with expected categories',()=>{
 const {names,multiplier}=chart(readRules(pages['index.html']));
 const freq=new Map();
 for(const attack of names)for(const defense of names){
  const value=multiplier(attack,defense);
  assert.ok([0,.5,1,2].includes(value));
  freq.set(value,(freq.get(value)||0)+1);
 }
 assert.deepEqual(distributionAsObject(freq),EXPECTED_SINGLE);
 assert.equal([...freq.values()].reduce((a,b)=>a+b,0),324);
});
test('Exactly 2754 unique dual-type matchups in the six expected categories',()=>{
 const {names,multiplier}=chart(readRules(pages['advanced-quiz.html']));
 const freq=new Map(),keys=new Set();
 for(const attack of names){
  for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){
   const first=names[i],second=names[j],key=[attack,first,second].join('|');
   assert.ok(!keys.has(key),'duplicate quiz question: '+key);
   keys.add(key);
   const value=multiplier(attack,first)*multiplier(attack,second);
   assert.ok([0,.25,.5,1,2,4].includes(value));
   freq.set(value,(freq.get(value)||0)+1);
  }
 }
 assert.equal(keys.size,2754);
 assert.deepEqual(distributionAsObject(freq),EXPECTED_DUAL);
 assert.equal(multiplier('いわ','ほのお')*multiplier('いわ','ひこう'),4);
 assert.equal(multiplier('でんき','じめん')*multiplier('でんき','ひこう'),0);
});
test('Advanced six-choice quiz and ten-question review remain present',()=>{
 const q=pages['advanced-quiz.html'];
 assert.match(q,/const MULTIPLIERS=\[4,2,1,0\.5,0\.25,0\]/);
 assert.match(q,/const QUESTION_COUNT=10/);
 for(const fn of ['begin','render','choose','next','readMistakes','writeMistakes','updateMistake'])
  assert.ok(q.includes('function '+fn+'('),'missing '+fn);
 assert.match(q,/state\.answered=true/,'double-answer guard');
 assert.match(q,/localStorage/);
});
