'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..'),audit=path.join(root,'v2/audit');
const spec=fs.readFileSync(path.join(audit,'v2-national-current-spec-20261104.md'),'utf8');
const summary=fs.readFileSync(path.join(audit,'v2-national-audit-summary-20261104.md'),'utf8');
const ledger=fs.readFileSync(path.join(audit,'v2-national-pr-ledger-20261104.md'),'utf8');
const ids=new Set(),counts={A:0,B:0,C:0,'要確認':0};
for(const row of spec.matchAll(/^\|(S\d+)\|([^|]+)\|/gm)){
 assert(!ids.has(row[1]),'duplicate specification '+row[1]);ids.add(row[1]);
 assert(Object.hasOwn(counts,row[2]),'explicit specification disposition required');counts[row[2]]++;
}
const totals=summary.match(/現在の(\d+)仕様: A(\d+)／B(\d+)／C(\d+)／要確認(\d+)/);
assert(totals,'current totals distinct from archived audit');assert.equal(ids.size,Number(totals[1]));
assert.deepEqual(Object.values(counts),totals.slice(2).map(Number));
const legacy=new Set();
for(const row of spec.matchAll(/^\|246:S(\d+)\|([^|]+)\|/gm)){
 assert(!legacy.has(row[1]),'duplicate legacy mapping');legacy.add(row[1]);
 for(const id of row[2].match(/S\d+/g)||[])assert(ids.has(id),'unknown successor '+id);
}
assert.equal(legacy.size,30,'all PR #246 contracts retain a successor');
const prs=[...ledger.matchAll(/^### PR #(\d+)$/gm)].map(m=>Number(m[1]));
assert.equal(new Set(prs).size,245);assert.equal(prs.length,245);
for(let n=1;n<=245;n++)assert(prs.includes(n),'missing historical PR '+n);
for(const file of ['v2/national/MAINTENANCE_RULES.md',...fs.readdirSync(audit).filter(f=>/^v2-national-.*\.md$/.test(f)).map(f=>'v2/audit/'+f)]){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
  const target=match[1].split('#')[0];if(!target||/^https?:/.test(target))continue;
  assert(fs.existsSync(path.resolve(root,path.dirname(file),target)),file+' broken relative link '+target);
 }
}
console.log('PASS formal ledger: '+ids.size+' unique specifications, all 30 legacy mappings, 245 PR records and document links');
