// Independent automatic SVG label candidate regression.
'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:8765';
async function run(engine,width,height){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/v2/takarazuka-town-svg-early-label-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('全自動ラベル候補'),null,{timeout:60000});
  assert.equal(await page.locator('#areas path.town').count(),125);
  const status=await page.evaluate(()=>{
   const svg=document.querySelector('#map');
   const items=[...document.querySelectorAll('#labels g.label')].map(el=>el.__data__);
   const shape=new Map([...document.querySelectorAll('#areas path.town')].map(p=>[p.dataset.name,p]));
   const verified=items.every(d=>{
    const p=svg.createSVGPoint();p.x=d.anchor[0];p.y=d.anchor[1];
    return shape.get(d.name)?.isPointInFill(p);
   });
   const count=name=>items.filter(d=>d.name===name).length;
   return {total:items.length,verified,shikashio:count('鹿塩'),kirihata:count('切畑'),
    shibatsu:count('芝辻新田'),hase:count('長谷'),kobayashi:count('小林'),
    nakasuji:count('中筋'),smallAreas:items.filter(d=>d.name==='切畑').map(d=>d.componentArea)};
  });
  assert.equal(status.verified,true,'all automatic label anchors inside actual SVG fill');
  assert.ok(status.total>125,'all automatic candidates generated');
  assert.ok(status.kirihata>=2,'切畑 has automatic labels on more than one component');
  assert.equal(status.shibatsu,3,'芝辻新田 should have three geometric label candidates');
  assert.equal(status.hase,1,'holes in 長谷 must not become labels');
  assert.equal(status.shikashio,2,'鹿塩 two components');
  assert.ok(status.kobayashi>=2&&status.nakasuji>=2);
  assert.ok(status.smallAreas[0]<status.smallAreas.at(-1),'small 切畑 area precedes mountain area');
  const initial=await page.evaluate(()=>{
   const entries=[...document.querySelectorAll('#labels g.label')];
   const selectedNames=['花屋敷荘園','仁川月見ガ丘'];
   return selectedNames.map(name=>{
    const el=entries.find(e=>e.__data__?.name===name&&!e.__data__?.secondary);
    return {name,present:!!el,visible:el?.dataset.visible,
     anchors:entries.filter(e=>e.__data__?.name===name).length};
   });
  });
  assert.ok(initial.every(e=>e.present),'both example towns have automatic primary labels');
  // At 1.2x of the city base scale, second-component labels become eligible,
  // even with overlapping neighbours.
  await page.locator('#zoomIn').click();
  const visible=await page.evaluate(()=>[...document.querySelectorAll('#labels g.label')].filter(x=>x.dataset.visible==='true').length);
  assert.ok(visible>0,'early-visibility mode displays text on the map');
  // Testing is about label visibility, not collision-free packing.
  await page.locator('#labelMode').click();
  assert.equal(await page.locator('#labels g.label').count(),125,'return to original single-label mode');
  await page.locator('#labelMode').click();
  assert.equal(await page.locator('#labels g.label').count(),status.total,'automatic candidate count restores');
  const pos=await page.evaluate(()=>({
   mapMinus:document.querySelector('#zoomOut').getBoundingClientRect().left,
   mapPlus:document.querySelector('#zoomIn').getBoundingClientRect().left,
   textMinus:document.querySelector('#smaller').getBoundingClientRect().left,
   textPlus:document.querySelector('#larger').getBoundingClientRect().left
  }));
  assert.ok(pos.mapMinus<pos.mapPlus&&pos.textMinus<pos.textPlus);
  await page.locator('#zoomIn').click();
  await page.locator('#reading').click();
  await page.locator('#quizTwo').click();
  assert.equal(await page.locator('#quizChoices button').count(),4);
  await page.locator('#quizQuit').click();
  assert.match(await page.locator('#status').textContent(),/中断した問題/);
  await page.locator('#quizBack').click();
  assert.deepEqual(errors,[],'no browser script errors');
  console.log('PASS automatic town SVG labels '+width,JSON.stringify(status));
 }finally{await browser.close()}
}
(async()=>{await run(chromium,1280,820);await run(webkit,390,844);await run(webkit,320,720)})().catch(e=>{console.error(e);process.exit(1)});
