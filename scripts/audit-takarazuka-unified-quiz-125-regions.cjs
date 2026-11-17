'use strict';
// TOWNMAP-SSOT-001 R-TOWN-10/12/13/30/31/32/33/35/42/44
// Headless assessment on the isolated Takarazuka comparison page. Instrument
// quiz state in transient JS responses only; no changes to the live script.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root='http://127.0.0.1:8765',target='/v2/takarazuka-town-svg-unified-quiz-state-20261118-pilot.html';
const jsFile='/v2/common/js/town-map-unified-quiz-takarazuka-20261118-pilot.js';
const out='takarazuka-ssot-125-audit';fs.mkdirSync(out,{recursive:true});
const confs=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,720]];
async function run([name,engine,width,height]){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**'+jsFile,async route=>{
   const response=await route.fetch();let s=await response.text();
   const marker='function startQuiz(mode,forced){';
   assert.equal(s.split(marker).length,2,'instrument exactly one quiz initializer');
   s=s.replace(marker,"window.__townQuizProbe=()=>({mode:quizMode,order:[...quizOrder],index:quizIndex,score:quizScore,locked:quizLocked,wrong:[...quizWrong]});\n"+marker);
   await route.fulfill({response,body:s,headers:{...response.headers(),'content-type':'text/javascript; charset=utf-8'}});
  });
  await page.goto(root+target,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125'),null,{timeout:60000});
  const source=await page.evaluate(async()=>{const r=await fetch('/takarazuka/data/takarazuka-town-info.json');if(!r.ok)throw Error('source not available');return r.json()});
  const towns=source.towns,expected=new Map();
  assert.equal(towns.length,125);assert.equal(new Set(towns.map(t=>t.name)).size,125);
  for(const t of towns){assert.ok(t.reading);for(const c of t.communities)expected.set(c,(expected.get(c)||0)+1)}
  assert.equal(expected.size,20);
  assert.equal(await page.locator('#areas path.town').count(),125);
  await page.locator('#communityToggle').click();
  const regions=await page.evaluate(()=>[...document.querySelectorAll('#communityOptions button[data-community]')]
    .filter(e=>e.dataset.community).map(e=>({name:e.dataset.community,reading:e.querySelector('small')?.textContent||''})));
  assert.equal(regions.length,20);
  assert.deepEqual(new Set(regions.map(x=>x.name)),new Set(expected.keys()));
  const collator=new Intl.Collator('ja',{sensitivity:'base'});
  assert.deepEqual(regions,[...regions].sort((a,b)=>collator.compare(a.reading,b.reading)||collator.compare(a.name,b.name)),'20 community kana ordering');
  for(const r of regions){assert.ok(r.reading&&r.reading!=='読み確認中');
   await page.evaluate(n=>document.querySelectorAll('#communityOptions button[data-community]').forEach(b=>{if(b.dataset.community===n)b.click()}),r.name);
   assert.equal(await page.locator('#areas path.town').count(),expected.get(r.name),'region count '+r.name);
   await page.locator('#communityToggle').click();
  }
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community=""]').click());
  assert.equal(await page.locator('#areas path.town').count(),125);
  const geom=await page.evaluate(()=>{
   const svg=document.querySelector('#map'),paths=new Map([...document.querySelectorAll('#areas path.town')].map(el=>[el.dataset.name,el]));
   const rows=[...document.querySelectorAll('#labels g.label')].map(el=>{
    const d=el.__data__,p=svg.createSVGPoint();p.x=d.anchor[0];p.y=d.anchor[1];
    return {name:d.name,inside:Boolean(paths.get(d.name)?.isPointInFill(p)),secondary:Boolean(d.secondary)};
   });
   return {labels:rows.length,allInside:rows.every(r=>r.inside),unique:new Set(rows.map(r=>r.name)).size,
    special:Object.fromEntries(['鹿塩','切畑','長谷','芝辻新田','中筋','伊孑志','小林','中山五月台'].map(n=>[n,rows.filter(r=>r.name===n).length]))};
  });
  assert.equal(geom.allInside,true,'every generated label candidate in SVG fill');
  assert.equal(geom.unique,125,'every town has a label candidate');
  assert.equal(geom.special['長谷'],1,'holes must not turn into label islands');
  assert.ok(geom.special['鹿塩']>=2&&geom.special['切畑']>=2,'multiple area candidates must survive');

  const passes={quiz1:0,quiz2:0};
  for(const mode of [1,2]){
   await page.locator('#quiz'+(mode===1?'One':'Two')).click();
   for(let i=0;i<125;i++){
    const before=await page.evaluate(()=>window.__townQuizProbe());
    assert.equal(before.mode,mode);assert.equal(before.index,i);
    const town=before.order[i];assert.ok(town,'missing quiz town at '+i);
    const feedback=await page.evaluate(({mode,town})=>{
     if(mode===1){
      const p=[...document.querySelectorAll('#areas path.town')].find(e=>e.dataset.name===town);if(!p)throw Error('no path for '+town);
      p.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
     }else{
      const b=[...document.querySelectorAll('#quizChoices button')].find(e=>e.querySelector('.choice-name')?.textContent===town);
      if(!b)throw Error('correct choice missing for '+town);b.click();
     }
     return document.querySelector('#quizFeedback').textContent;
    },{mode,town});
    assert.match(feedback,/正解です！/,'correct answer expected '+town);
    assert.equal((await page.evaluate(()=>window.__townQuizProbe())).score,125,'unexpected score '+town);
    await page.evaluate(()=>document.querySelector('#quizNext').click());
    passes['quiz'+mode]++;
   }
   assert.equal(await page.locator('#quizResults').isVisible(),true);
   assert.match(await page.locator('#quizResult').innerText(),/125問中 125点/);
   await page.locator('#quizBack').click();
  }
  assert.deepEqual(errors,[]);
  const output={screen:name,towns:towns.length,communities:regions.length,labels:geom,passes,errors:errors.length};
  fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(output,null,2));
  console.log('TAKARAZUKA_SSOT_FULL_AUDIT '+JSON.stringify(output));
 }finally{await browser.close()}
}
(async()=>{for(const conf of confs)await run(conf)})().catch(e=>{console.error(e);process.exitCode=1});
