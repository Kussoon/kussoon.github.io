'use strict';
// Execute PR415's byte-identical regression as a negative control and on both fixed targets.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'v2/verification/bread-integration/20261111');
const out=process.env.KUSSOON_BROWSER_ARTIFACTS||path.join(root,'work/bread-integration');
const engine=process.env.KUSSOON_BROWSER_ENGINES||'chromium';assert(['chromium','webkit'].includes(engine));
fs.mkdirSync(out,{recursive:true});const sources=JSON.parse(fs.readFileSync(path.join(folder,'sources.json')));
const baseline=path.join(root,'v2/verification/bread-coordinate-audit/20261111-nine-fixes/unified-bread-map-v1.3.13-verification-20261111.html');
const fixed=path.join(folder,'unified-bread-map-v1.3.13-integrated-verification-20261111.html');
const production=path.join(out,'pr415-production-fixed.html');
fs.writeFileSync(production,cp.execFileSync('git',['show',sources.pr415+':maps/unified-bread-map.html'],{cwd:root}));
const summary=[];
for(const [name,target,negative] of [['before',baseline,true],['after',fixed,false],['pr415-regression',production,false]]){
 const evidence=path.join(out,name);fs.mkdirSync(evidence,{recursive:true});
 const run=cp.spawnSync(process.execPath,[path.join(__dirname,'bread-marker-refresh.browser.cjs')],{cwd:root,env:{...process.env,KUSSOON_BROWSER_ENGINES:engine,KUSSOON_BREAD_HTML:target,KUSSOON_BROWSER_ARTIFACTS:evidence},encoding:'utf8',maxBuffer:20*1024*1024});
 fs.writeFileSync(path.join(evidence,'run.log'),(run.stdout||'')+(run.stderr||''));
 assert(!run.error,run.error?.message);assert(fs.existsSync(path.join(evidence,'results.json')),name+' must produce browser evidence');
 const results=JSON.parse(fs.readFileSync(path.join(evidence,'results.json')));
 if(negative){
  assert.notEqual(run.status,0,'Unfixed baseline unexpectedly passed; reproduction must be reviewed');
  assert.equal(results.length,1);assert.equal(results[0].status,'FAIL');
  assert.match(results[0].message,/missing pin No\.111/);assert.deepEqual(results[0].errors,[]);
  assert(results[0].checkpoints.some(s=>s.no===107));
 }else{
  assert.equal(run.status,0,name+' failed; see '+evidence+'/run.log');assert.equal(results.length,4);assert(results.every(r=>r.status==='PASS'));
 }
 summary.push({name,engine,status:negative?'EXPECTED_FAILURE_CONFIRMED':'PASS',conditions:results.map(r=>({label:r.label,status:r.status,message:r.message}))});
 console.log(name+': '+summary.at(-1).status);
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
}
