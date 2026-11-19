'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const url='http://127.0.0.1:8765/v2/town-map-label-rule-audit-20261120-pilot.html';
async function test(browserType,device,width,height){
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},isMobile:width<600,
   hasTouch:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__labelAudit?.summary?.towns===321,null,{timeout:90000});
  const actual=await page.evaluate(()=>window.__labelAudit);
  const s=actual.summary;
  assert.equal(s.towns,321);
  assert.equal(s.approvedLabels,324,'approved 324 labels from immutable V34 data');
  assert.equal(s.automaticLabels,323,'raw geometry has 323 candidate components');
  assert.equal(s.mismatchTowns,1,'only broad continuous 上山口 needs extra non-island label');
  assert.equal(s.missingComparedToApproved,1);
  assert.equal(s.additionalComparedToApproved,0);
  assert.equal(s.disjoint,2);
  assert.equal(s.withHoles,3);
  const rows=Object.fromEntries(actual.rows.map(r=>[r.name,r]));
  for(const name of ['塩瀬町名塩','山口町上山口','山口町下山口']){
   assert.equal(rows[name].acceptedCount,2,name+' approved label count');
  }
  assert.equal(rows['山口町上山口'].automaticCount,1);
  assert.equal(rows['塩瀬町名塩'].automaticCount,2);
  assert.equal(rows['山口町下山口'].automaticCount,2);
  assert.equal(rows['塩瀬町名塩'].parts,2);
  assert.equal(rows['山口町下山口'].parts,2);
  assert.equal(rows['山口町上山口'].parts,1);
  assert.equal(await page.locator('#body tr').count(),1,'default shows only mismatches');
  await page.locator('#filter').selectOption('approved-multi');
  assert.equal(await page.locator('#body tr').count(),3);
  await page.locator('#filter').selectOption('multipart');
  assert.equal(await page.locator('#body tr').count(),2);
  await page.locator('#filter').selectOption('holes');
  assert.equal(await page.locator('#body tr').count(),3);
  await page.locator('#filter').selectOption('all');
  assert.equal(await page.locator('#body tr').count(),321);
  await page.locator('#query').fill('上山口');
  assert.equal(await page.locator('#body tr').count(),1);
  await page.locator('#body button').first().click();
  assert.equal(await page.locator('#selected').textContent(),'山口町上山口');
  assert.equal(await page.locator('#markers circle.approved').count(),2);
  assert.equal(await page.locator('#markers circle.automatic').count(),1);
  await page.locator('#query').fill('下山口');
  await page.locator('#body button').first().click();
  assert.equal(await page.locator('#markers circle.approved').count(),2);
  assert.equal(await page.locator('#markers circle.automatic').count(),2);
  assert.equal(await page.locator('#quizOne').count(),0,'audit never touches quiz');
  assert.deepEqual(errors,[],device+' browser errors');
  console.log('PASS NISHINOMIYA_321_LABEL_RULE_AUDIT '+JSON.stringify({
   device,...s,focus:[
    {name:'山口町上山口',approved:2,automatic:1},
    {name:'山口町下山口',approved:2,automatic:2},
    {name:'塩瀬町名塩',approved:2,automatic:2}
   ],maxDistance:Math.max(...actual.rows.map(r=>r.maximumAnchorDeviation)),
   topDistance:actual.rows.slice(0,8).map(r=>({name:r.name,d:r.maximumAnchorDeviation,
    approved:r.acceptedCount,automatic:r.automaticCount}))}));
 }finally{await browser.close()}
}
(async()=>{
 await test(chromium,'chromium-1280',1280,800);
 await test(webkit,'webkit-390',390,844);
 await test(webkit,'webkit-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
