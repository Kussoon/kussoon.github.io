// Cross-city SVG C layout regression for Takarazuka, independent of Leaflet baseline.
'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve('takarazuka-svg-c-layout-screenshots');fs.mkdirSync(dir,{recursive:true});
const base=process.argv[2]||'http://127.0.0.1:8765';
async function run(browserType,width,height){
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/v2/takarazuka-town-svg-c-layout-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('125町名'),null,{timeout:60000});
  const pairPositions=await page.evaluate(()=>{
   const x=id=>document.getElementById(id).getBoundingClientRect().left;
   return {mapPlus:x('zoomIn'),mapMinus:x('zoomOut'),textMinus:x('smaller'),textPlus:x('larger')};
  });
  assert.ok(pairPositions.mapMinus<pairPositions.mapPlus,'map - must be on the left of +');
  assert.ok(pairPositions.textMinus<pairPositions.textPlus,'text + must be on the right of text -');
  assert.equal(await page.locator('#areas path.town').count(),125,'all source paths');
  assert.equal(await page.locator('#labels g.label').count(),125,'all 125 town labels');
  const root=page.locator('#communityOptions');
  await page.locator('#communityToggle').click();
  assert.equal(await root.locator('button').count(),21,'all area + 20 communities');
  assert.equal(await root.locator('button').first().textContent(),'宝塚市全域');
  const cols=await root.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  assert.equal(cols,width<=600?4:5,'matching Nishinomiya four/five column layout');
  assert.ok((await page.locator('#quizOne').isEnabled())&&(await page.locator('#quizTwo').isEnabled()),'both quizzes present');
  const screens=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  assert.ok(screens[0]<=screens[1]+2,'no horizontal overflow');
  await page.screenshot({path:path.join(dir,'overview-'+width+'.png'),fullPage:true});
  await root.locator('button[data-community="すみれガ丘"]').click();
  assert.match(await page.locator('#communityCount').textContent(),/2町名/);
  assert.equal(await page.locator('#areas path.town').count(),2,'region filtering');
  assert.equal(await page.locator('#labels g.label').count(),2);
  await page.locator('#reading').click();
  assert.equal(await page.locator('#labels tspan.town-reading').count(),2,'reading switch');
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4,'4 choices');
  assert.equal(await page.locator('#labels g.label').count(),2,'labels stay mounted while hidden');
  const choices=await page.locator('#quizChoices button').evaluateAll(items=>items.map(el=>({
   parts:el.querySelectorAll('.choice-name,.choice-reading').length,
   name:el.querySelector('.choice-name')?.textContent,
   reading:el.querySelector('.choice-reading')?.textContent,
   vertical:el.querySelector('.choice-reading').getBoundingClientRect().top>=el.querySelector('.choice-name').getBoundingClientRect().bottom
  })));
  assert.ok(choices.every(x=>x.parts===2&&x.name&&x.reading&&x.vertical),'quiz 2 C-style 2 lines');
  await page.locator('#quizQuit').click();
  assert.equal(await page.locator('body.town-quiz-mode').count(),0);
  assert.match(await page.locator('#status').textContent(),/中断した問題/);
  assert.equal(await page.locator('#areas path.selected').count(),1,'interrupted town selected');
  await page.locator('#quizBack').click();
  await page.locator('#quizOne').click();
  assert.match(await page.locator('#quizQuestion').textContent(),/場所を押してください/);
  await page.locator('#quizReveal').click();
  assert.equal(await page.locator('#quizNext').isVisible(),true);
  await page.locator('#quizQuit').click();
  assert.match(await page.locator('#status').textContent(),/中断した問題/);
  await page.locator('#quizBack').click();
  await page.locator('#communityToggle').click();
  await root.locator('button[data-community=""]').click();
  assert.equal(await page.locator('#labels g.label').count(),125,'full city labels restored');
  await page.locator('#larger').click();
  assert.equal(await page.locator('#size').textContent(),'文字 125%');
  await page.locator('#zoomIn').click();
  await page.locator('#zoomOut').click();
  await page.locator('#reset').click();
  assert.deepEqual(errors,[],'no JS errors');
  console.log('PASS Takarazuka C-layout '+width);
 }finally{await browser.close()}
}
(async()=>{await run(chromium,1280,820);await run(webkit,390,844);await run(webkit,320,720)})().catch(e=>{console.error(e);process.exit(1)});
