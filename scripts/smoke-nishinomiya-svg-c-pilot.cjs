// Browser smoke test: Nishinomiya SVG comparison pilot.
// Playwright Chromium and WebKit emulation are NOT equivalent to physical iPhone Safari.
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(process.env.SVG_SMOKE_SCREENSHOTS||'svg-town-smoke-screenshots');
fs.mkdirSync(dir,{recursive:true});
const base=process.argv[2]||'http://127.0.0.1:8765';
async function run(type,name,width,height,columns){
 const browser=await type.launch({headless:true});
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<=390,hasTouch:width<=390});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/v2/nishinomiya-town-svg-c-render-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
  await page.locator('#communityToggle').click();
  const buttons=page.locator('#communityOptions button');
  assert.equal(await buttons.count(),27,'all area and 26 communities');
  const order=await buttons.evaluateAll(nodes=>nodes.map(n=>n.dataset.community));
  assert.equal(order[0],'','all-area first');
  const readings=await page.locator('#communityOptions button[data-community]:not([data-community=""]) small').allTextContents();
  const collator=new Intl.Collator('ja',{usage:'sort',sensitivity:'base',numeric:false});
  for(let i=1;i<readings.length;i++)assert.ok(collator.compare(readings[i-1],readings[i])<=0,'kana sequence');
  assert.equal(order[1],'芦原');assert.equal(order[26],'用海');
  const cols=await page.locator('#communityOptions').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  assert.equal(cols,columns);
  const widths=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  assert.ok(widths[0]<=widths[1]+2,'horizontal overflow');
  await page.screenshot({path:path.join(dir,name+'-communities.png'),fullPage:true});
  await page.locator('#communityOptions button[data-community="西宮浜"]').click();
  assert.match(await page.locator('#communityCount').textContent(),/1町名/);
  await page.locator('#quizOne').click();
  await page.locator('#quizReveal').click();
  assert.equal(await page.locator('#quizNext').textContent(),'結果発表');
  await page.locator('#quizNext').click();
  assert.equal(await page.locator('#quizRetryWrong').isVisible(),true,'retry when missed');
  await page.locator('#quizBack').click();
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  const choiceLayout=await page.locator('#quizChoices button').evaluateAll(nodes=>nodes.map(node=>{
   const parts=[...node.querySelectorAll('.choice-name,.choice-reading')];
   return {parts:parts.length,name:parts[0]?.textContent,reading:parts[1]?.textContent,
    vertical:parts.length===2&&parts[1].getBoundingClientRect().top>=parts[0].getBoundingClientRect().bottom,
    fits:node.scrollHeight<=node.clientHeight+1};
  }));
  assert.ok(choiceLayout.every(v=>v.parts===2&&v.name&&v.reading&&v.vertical&&v.fits),
   'quiz choices must show separate readable lines without clipping: '+JSON.stringify(choiceLayout));
  await page.locator('#quizQuit').click();
  await page.locator('#quizBack').click();
  await page.locator('#quizOne').click();
  await page.locator('#areas path.town').click();
  assert.equal(await page.locator('#quizNext').textContent(),'結果発表');
  await page.locator('#quizNext').click();
  assert.equal(await page.locator('#quizRetryWrong').isVisible(),false,'hide retry on full marks');
  assert.equal(await page.locator('#quizRetryAll').isVisible(),true);
  assert.equal(await page.locator('#quizBack').isVisible(),true);
  await page.screenshot({path:path.join(dir,name+'-perfect-score.png'),fullPage:true});
  const lines=await page.locator('#smaller,#larger').evaluateAll(nodes=>nodes.map(n=>[...n.querySelectorAll('span')].map(x=>x.textContent)));
  assert.deepEqual(lines,[['文字','−'],['文字','＋']]);
  await page.locator('#quizBack').click();
  await page.locator('#communityToggle').click();
  await page.locator('#communityOptions button[data-community="広田"]').click();
  assert.match(await page.locator('#boundaryNote').textContent(),/岡田山/);
  await page.locator('#fullscreen').click();
  assert.equal(await page.locator('body.fullscreen').count(),1);
  await page.locator('#fullscreen').click();
  assert.equal(await page.locator('body.fullscreen').count(),0);
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log('PASS SVG '+name+': kana order, controls, quiz completion, region and fullscreen');
 }finally{await browser.close()}
}
(async()=>{
 await run(chromium,'desktop-1280',1280,820,5);
 await run(webkit,'mobile-390',390,844,4);
 await run(webkit,'mobile-320',320,720,4);
})().catch(e=>{console.error(e);process.exit(1)});
