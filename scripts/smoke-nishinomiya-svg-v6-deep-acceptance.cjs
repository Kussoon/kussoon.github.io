// Browser-level deep acceptance regression for Nishinomiya SVG V4.
// Chrome automation is not an iPhone Safari hardware acceptance test.
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.NISHINOMIYA_DEEP_SHOTS||'nishinomiya-svg-v6-deep-shots');
fs.mkdirSync(root,{recursive:true});
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const route='/v2/nishinomiya-town-svg-master-v6-20261117-pilot.html';
const browserErrors=[];
function checkPage(page){page.on('pageerror',err=>browserErrors.push(err.message))}
async function loaded(page){await page.waitForFunction(()=>document.getElementById('communityCount')?.textContent.includes('321町名'),null,{timeout:60000})}
async function pickRegion(page,name){
 await page.locator('#communityToggle').click();
 await page.locator('#communityOptions button').filter({has:page.locator('strong', {hasText:name})}).first().click();
}
async function townPaths(page){return page.locator('#areas path.town').evaluateAll(nodes=>nodes.map(n=>n.__data__?.properties?.S_NAME).filter(Boolean))}
async function dispatchTown(page,town){
 const ok=await page.evaluate(town=>{
  const node=[...document.querySelectorAll('#areas path.town')].find(n=>n.__data__?.properties?.S_NAME===town);
  if(!node)return false;
  node.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  return true;
 },town);assert(ok,'No SVG path '+town);
}
const score=async page=>Number((await page.locator('#quizProgress').textContent()).match(/得点 (\d+)/)?.[1]);
(async()=>{
 const mobile=process.env.NISHINOMIYA_WEBKIT==='1';
 const browser=await (mobile?webkit:chromium).launch({headless:true});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:2,isMobile:mobile,hasTouch:mobile});
  checkPage(page);
  // Direct link: valid focus and invalid-name fallback.
  await page.goto(base+route+'?town='+encodeURIComponent('西宮浜'),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('階層ナビゲーション'),null,{timeout:60000});
  const focused=await page.evaluate(()=>({k:d3.zoomTransform(document.querySelector('#map')).k,
   font:Number(document.querySelector('#labels text.town-label')?.getAttribute('font-size'))}));
  assert(focused.k>1&&focused.font>8,'town direct-link must zoom and increase labels');
  assert.match(await page.locator('#hierarchyReturn').getAttribute('href'),/#town:jp-hyogo-nishinomiya:/);
  await page.goto(base+route+'?town='+encodeURIComponent('存在しない町名検査'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('指定された町名は見つかりません'),null,{timeout:60000});
  const invalidScale=await page.evaluate(()=>d3.zoomTransform(document.querySelector('#map')).k);
  assert(Math.abs(invalidScale-1)<.001,'invalid town must leave map at city extent');
  // All labels, region exceptions, and distinct split geometry.
  await page.goto(base+route,{waitUntil:'domcontentloaded'});await loaded(page);
  assert.equal(await page.locator('#labels g.label').count(),324,'321 towns + 2 multi labels + 1 extra label');
  await page.locator('#reading').click();
  assert.equal(await page.locator('#labels .town-reading').count(),324,'reading for every label');
  await page.locator('#reading').click();
  await pickRegion(page,'上ヶ原');
  const uekoto1=await page.locator('#areas path.town').evaluateAll(nodes=>nodes.find(n=>n.__data__?.properties?.S_NAME==='上甲東園')?.getAttribute('d'));
  assert(uekoto1,'Uekoto shape must show in Uegahara');
  assert.equal(await page.locator('#boundaryNote').isVisible(),true,'Okadayama note in Uegahara');
  await pickRegion(page,'甲東');
  const uekoto2=await page.locator('#areas path.town').evaluateAll(nodes=>nodes.find(n=>n.__data__?.properties?.S_NAME==='上甲東園')?.getAttribute('d'));
  assert(uekoto2&&uekoto1!==uekoto2,'Uekoto must be split into distinct community polygons');
  await pickRegion(page,'広田');
  assert((await townPaths(page)).includes('岡田山'),'Okadayama included in Hirota');
  assert.equal(await page.locator('#boundaryNote').isVisible(),true);
  await page.screenshot({path:path.join(root,'hirota-exception.png'),fullPage:true});
  // Quiz 1: repeated wrong town must not deduct twice.
  await pickRegion(page,'甲東');
  const names=await townPaths(page);assert(names.length>=3,'Kotoh has enough questions');
  await page.locator('#quizOne').click();
  const prompt=await page.locator('#quizQuestion').textContent();
  const target=prompt.match(/^「([^（]+)（/)?.[1];assert(target&&names.includes(target),'Quiz 1 question contains local town');
  const wrong=names.filter(n=>n!==target).slice(0,2);
  const initial=await score(page);assert.equal(initial,names.length);
  await dispatchTown(page,wrong[0]);assert.equal(await score(page),initial-1);
  await dispatchTown(page,wrong[0]);assert.equal(await score(page),initial-1,'same wrong place cannot deduct twice');
  await dispatchTown(page,wrong[1]);assert.equal(await score(page),initial-2,'different wrong place must deduct');
  await dispatchTown(page,target);assert.match(await page.locator('#quizFeedback').textContent(),/正解です！/);
  assert.equal(await page.locator('#quizNext').isVisible(),true);
  await page.screenshot({path:path.join(root,'quiz1-wrong-correct.png'),fullPage:true});
  await page.locator('#quizNext').click();
  await page.locator('#quizQuit').click();
  assert.match(await page.locator('#quizResult').textContent(),/途中終了/);
  assert.match(await page.locator('#status').textContent(),/中断した問題/);
  await page.locator('#quizBack').click();
  // Quiz 2: actual 4-choice DOM interaction; wrong disabled and right succeeds.
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  await page.waitForFunction(()=>!!document.querySelector('#areas path.town.selected'),null,{timeout:2500});
  const flashing=await page.locator('#areas path.town.selected').first().evaluate(n=>n.__data__.properties.S_NAME);
  const options=await page.locator('#quizChoices button').evaluateAll(nodes=>nodes.map(n=>n.querySelector('.choice-name')?.textContent));
  assert(options.includes(flashing),'flashing town must appear in 4 choices');
  const wrongOption=options.find(n=>n!==flashing);assert(wrongOption);
  const buttons=page.locator('#quizChoices button');
  const wrongIndex=options.indexOf(wrongOption),rightIndex=options.indexOf(flashing);
  await buttons.nth(wrongIndex).click();
  assert.equal(await buttons.nth(wrongIndex).isDisabled(),true);
  assert.match(await page.locator('#quizFeedback').textContent(),/違います/);
  await buttons.nth(rightIndex).click();
  assert.match(await page.locator('#quizFeedback').textContent(),/正解です！/);
  await page.screenshot({path:path.join(root,'quiz2-wrong-correct.png'),fullPage:true});
  await page.locator('#quizNext').click();
  await page.locator('#quizQuit').click();
  await page.locator('#quizBack').click();
  // One-town perfect score: retry-wrong must be absent.
  await pickRegion(page,'西宮浜');
  await page.locator('#quizOne').click();
  await dispatchTown(page,'西宮浜');
  await page.locator('#quizNext').click();
  assert.match(await page.locator('#quizResult').textContent(),/1問中 1点/);
  assert.equal(await page.locator('#quizRetryWrong').isVisible(),false,'full marks must hide wrong retry');
  assert.deepEqual(browserErrors,[],'no uncaught browser errors');
  console.log('PASS Nishinomiya SVG V6 '+(mobile?'WebKit390':'Chromium1280')+' deep browser audit: 321 labels, all readings, Uekoto split, Okadayama double assignment, direct link, quiz1 repeat wrong grading, quiz2 4-choice, quit, full marks.');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
