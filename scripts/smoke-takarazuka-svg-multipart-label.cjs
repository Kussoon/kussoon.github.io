// Cross-city SVG C layout regression for Takarazuka, independent of Leaflet baseline.
'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve('takarazuka-multipart-label-screenshots');fs.mkdirSync(dir,{recursive:true});
const base=process.argv[2]||'http://127.0.0.1:8765';
async function run(browserType,width,height){
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/v2/takarazuka-town-svg-multipart-label-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('125町名'),null,{timeout:60000});
  const pairPositions=await page.evaluate(()=>{
   const x=id=>document.getElementById(id).getBoundingClientRect().left;
   return {mapPlus:x('zoomIn'),mapMinus:x('zoomOut'),textMinus:x('smaller'),textPlus:x('larger')};
  });
  assert.ok(pairPositions.mapMinus<pairPositions.mapPlus,'map - must be on the left of +');
  assert.ok(pairPositions.textMinus<pairPositions.textPlus,'text + must be on the right of text -');
  assert.equal(await page.locator('#areas path.town').count(),125,'all source paths');
  assert.equal(await page.locator('#labels g.label').count(),125,'all 125 town labels');
  await page.locator('#labelMode').click();
  const experimental=await page.evaluate(()=>{
   const svg=document.querySelector('#map');
   const shapes=new Map([...document.querySelectorAll('#areas path.town')].map(el=>[el.getAttribute('data-name'),el]));
   const all=[...document.querySelectorAll('#labels g.label')].map(el=>el.__data__);
   const specials=['鹿塩','伊孑志','小林','中筋','中山五月台','切畑','米谷','山本西','芝辻新田'];
   const report=specials.map(name=>{
    const shape=shapes.get(name),entries=all.filter(e=>e.name===name);
    const inside=entries.map(e=>{
     const p=svg.createSVGPoint();p.x=e.anchor[0];p.y=e.anchor[1];
     return shape.isPointInFill(p);
    });
    return {name,labels:entries.length,inside:inside.every(Boolean)};
   });
   return {total:all.length,report};
  });
  assert.ok(experimental.total>125,'multipart mode should create additional label candidates');
  assert.ok(experimental.report.every(r=>r.labels>=1&&r.inside),'all candidate labels must be inside town fill');
  assert.ok(experimental.report.filter(r=>r.labels>1).length>=6,'most multipart towns should show multiple candidate anchors');
  await page.locator('#zoomIn').click();
  const afterZoom=await page.locator('#labels g.label').count();
  assert.equal(afterZoom,experimental.total,'zoom must preserve labels and their town identities');
  await page.locator('#labelMode').click();
  assert.equal(await page.locator('#labels g.label').count(),125,'original comparison restored without changing source geometry');
  await page.locator('#reset').click();

  // 鹿塩: two large, separated pieces are one original SVG path and one quiz town.
  const shikashio=await page.evaluate(()=>{
   const p=[...document.querySelectorAll('#areas path.town')].find(x=>x.getAttribute('data-name')==='鹿塩');
   const label=[...document.querySelectorAll('#labels g.label')].find(x=>x.__data__?.name==='鹿塩');
   const anchor=label?.__data__?.anchor||[];
   const point=document.querySelector('#map').createSVGPoint();
   point.x=anchor[0];point.y=anchor[1];
   return {paths:[...document.querySelectorAll('#areas path.town')].filter(x=>x.getAttribute('data-name')==='鹿塩').length,
    subpaths:(p?.getAttribute('d')?.match(/M/g)||[]).length,
    labelCount:[...document.querySelectorAll('#labels g.label')].filter(x=>x.__data__?.name==='鹿塩').length,
    anchor,inside:p?.isPointInFill(point)};
  });
  assert.equal(shikashio.paths,1,'鹿塩 must stay a single selectable town path');
  assert.ok(shikashio.subpaths>=2,'鹿塩 contains separate component shapes');
  assert.equal(shikashio.labelCount,1,'鹿塩 remains one label in current pilot');
  assert.ok(shikashio.anchor[0]>455&&shikashio.anchor[0]<522,'鹿塩 label must anchor in western component');
  assert.equal(shikashio.inside,true,'鹿塩 label must sit in the actual SVG fill');
  await page.locator('#areas path.town[data-name="鹿塩"]').dispatchEvent('click');
  assert.match(await page.locator('#status').textContent(),/鹿塩.*選択中/,'鹿塩 path selects both components by the same town name');
  await page.locator('#areas path.town[data-name="鹿塩"]').dispatchEvent('click');
  assert.match(await page.locator('#status').textContent(),/鹿塩.*停止/,'tapping selected 鹿塩 again stops blink');
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
  console.log('PASS Takarazuka multipart-label '+width);
 }finally{await browser.close()}
}
(async()=>{await run(chromium,1280,820);await run(webkit,390,844);await run(webkit,320,720)})().catch(e=>{console.error(e);process.exit(1)});
