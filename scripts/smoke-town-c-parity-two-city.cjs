'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:8765';
async function run(type,width,height){
 const browser=await type.launch({headless:true});
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,hasTouch:width<500,isMobile:width<500});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/v2/takarazuka-town-svg-c-parity-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125'),null,{timeout:60000});
  assert.equal(await page.locator('#areas path.town').count(),125);
  assert.equal(await page.locator('#labels g.label').filter({hasText:'鹿塩'}).count(),2);
  assert.ok(await page.locator('#zoomOut').evaluate(el=>el.getBoundingClientRect().left) < await page.locator('#zoomIn').evaluate(el=>el.getBoundingClientRect().left));
  assert.equal(await page.evaluate(()=>d3.select('#map').on('wheel.zoom')===undefined),true,'wheel off until click');
  await page.locator('#map').click({position:{x:12,y:12}});
  assert.equal(await page.evaluate(()=>typeof d3.select('#map').on('wheel.zoom')==='function'),true,'wheel armed after click');
  await page.locator('#communityCount').click();
  assert.equal(await page.evaluate(()=>d3.select('#map').on('wheel.zoom')===undefined),true,'wheel disarmed outside');
  await page.locator('#communityToggle').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#communityOptions').isHidden(),true);
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  assert.equal(await page.locator('#quizChoices .choice-name').count(),4);
  assert.equal(await page.locator('#quizChoices .choice-reading').count(),4);
  const current=await page.locator('#quizProgress').textContent(),initial=Number(current.match(/得点 (\d+)/)?.[1]);
  // Determine answer by the selected SVG polygon with the quiz blink class.
  const target=await page.evaluate(()=>[...document.querySelectorAll('#areas path.town')].find(el=>el.classList.contains('selected'))?.getAttribute('data-name'));
  const buttons=page.locator('#quizChoices button');
  let wrongIndices=[];
  for(let i=0;i<4;i++)if(!(await buttons.nth(i).locator('.choice-name').textContent()===target))wrongIndices.push(i);
  assert.ok(wrongIndices.length>=2);
  await buttons.nth(wrongIndices[0]).click();
  await buttons.nth(wrongIndices[1]).click();
  const points=Number((await page.locator('#quizProgress').textContent()).match(/得点 (\d+)/)?.[1]);
  assert.equal(points,initial-2,'two distinct wrong choices cost two points, as in C');
  await page.locator('#quizQuit').click();
  assert.equal(await page.locator('#quizRetryWrong').isVisible(),true);
  await page.locator('#quizBack').click();
  assert.deepEqual(errors,[]);
  await page.goto(base+'/v2/nishinomiya-town-c-parity-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321'),null,{timeout:60000});
  assert.ok(await page.locator('#zoomOut').evaluate(el=>el.getBoundingClientRect().left)<await page.locator('#zoomIn').evaluate(el=>el.getBoundingClientRect().left));
  assert.equal(await page.locator('#communityOptions button').count(),27);
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  assert.equal(await page.locator('#quizChoices .choice-name').count(),4);
  assert.equal(await page.locator('#quizChoices .choice-reading').count(),4);
  assert.ok((await page.locator('#quizChoices .choice-reading').allTextContents()).every(Boolean));
  assert.deepEqual(errors,[]);
  console.log('PASS two-city C parity comparison',type.name,width);
 }finally{await browser.close()}
}
(async()=>{await run(chromium,1280,820);await run(webkit,390,844)})().catch(e=>{console.error(e);process.exit(1)});
