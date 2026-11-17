'use strict';
// TOWNMAP-SSOT-001 multipart-town real pointer and quiz acceptance.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out='takarazuka-ssot-multipart-click-results';fs.mkdirSync(out,{recursive:true});
const origin=process.env.TOWN_TEST_BASE||'http://127.0.0.1:8765';
const mapUrl='/v2/takarazuka-town-svg-ssot-quiz-crossover-20261118-pilot.html';
const jsUrl='/v2/common/js/takarazuka-svg-ssot-quiz-crossover-20261118-pilot.js';
const towns=['鹿塩','切畑','長谷','芝辻新田','中筋','伊孑志','小林','中山五月台','米谷','山本西'];
const configs=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,720]];
const hook=`window.__townAuditParts={
 count(name){const t=byName.get(name);if(!t)throw Error('unknown '+name);return t.autoCandidates.length},
 focus(name,index){
  const t=byName.get(name);if(!t)throw Error('no town '+name);
  const c=t.autoCandidates[index];if(!c)throw Error('no component '+name+' '+index);
  stopBlink();
  const [x,y]=c.point;
  const k=Math.min(10,Math.max(baseScale*3,1.5));
  svg.call(zoom.transform,d3.zoomIdentity.translate(mapW/2-x*k,mapH/2-y*k).scale(k));
  const point=svg.node().createSVGPoint();point.x=x;point.y=y;
  const hit=t.pathEl.isPointInFill(point);
  const q=point.matrixTransform(t.pathEl.getScreenCTM());
  const actual=document.elementFromPoint(q.x,q.y);
  return {town:name,index,filled:hit,x:q.x,y:q.y,
   hitName:actual?.closest('path.town')?.getAttribute('data-name')||null};
 },
 selected(){return selected},
 quizOne(name){startQuiz(1,[name])},
 quiz(){return {mode:quizMode,order:[...quizOrder],index:quizIndex,score:quizScore}}
};\n`;
async function run([screen,engine,width,height]){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
  let errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**'+jsUrl,async route=>{
   let response=await route.fetch(),s=await response.text(),mark='function startQuiz(mode,forced){';
   assert.equal(s.split(mark).length,2);
   s=s.replace(mark,hook+mark);
   await route.fulfill({response,body:s,headers:{...response.headers(),'content-type':'text/javascript; charset=utf-8'}});
  });
  await page.goto(origin+mapUrl,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125'),null,{timeout:60000});
  await page.waitForTimeout(150);
  const records=[];
  for(const name of towns){
   const count=await page.evaluate(n=>window.__townAuditParts.count(n),name);
   for(let index=0;index<count;index++){
    // Result screens and the initial page both place the SVG below other UI.
    // Always scroll before mapping an SVG-space point to viewport pixels.
    await page.locator('#map').scrollIntoViewIfNeeded();
    const {x,y,filled,hitName}=await page.evaluate(p=>window.__townAuditParts.focus(p.name,p.index),{name,index});
    assert.equal(filled,true,name+' component not in fill '+index);
    assert.equal(hitName,name,name+' real hit test map path '+index);
    assert.ok(x>=0&&x<=width&&y>=0&&y<=height,'hit outside viewport '+name);
    await page.mouse.click(x,y);
    const selected=await page.evaluate(()=>window.__townAuditParts.selected());
    assert.equal(selected,name,'normal map click must select same town '+name+' part '+index);
    await page.evaluate(n=>window.__townAuditParts.quizOne(n),name);
    const before=await page.evaluate(()=>window.__townAuditParts.quiz());
    assert.equal(before.order.length,1);assert.equal(before.order[0],name);
    // Starting quiz1 expands the panel above the SVG and can push the map
    // out of the physical viewport. Scroll first, then reproject the click
    // point using the current SVG screen transform.
    await page.locator('#map').scrollIntoViewIfNeeded();
    const pos=await page.evaluate(p=>window.__townAuditParts.focus(p.name,p.index),{name,index});
    // focus resets only selection blinking; quiz state must stay in quiz1.
    assert.equal(pos.hitName,name,'quiz hit target '+name);
    await page.mouse.click(pos.x,pos.y);
    assert.match(await page.locator('#quizFeedback').innerText(),/正解です！/,'quiz1 real click '+name+' part '+index);
    const after=await page.evaluate(()=>window.__townAuditParts.quiz());
    assert.equal(after.score,1,'score remains 1 '+name);
    await page.locator('#quizNext').click();
    assert.equal(await page.locator('#quizResults').isVisible(),true);
    await page.locator('#quizBack').click();
    records.push({name,component:index,count,point:[+x.toFixed(1),+y.toFixed(1)],selected,quiz1Correct:true});
   }
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,screen+'.json'),JSON.stringify(records,null,2));
  console.log('TAKARAZUKA_MULTIPART_CLICKS '+JSON.stringify({screen,towns:towns.length,components:records.length,
   counts:Object.fromEntries(towns.map(n=>[n,records.filter(r=>r.name===n).length])),allSelected:true,allQuiz1Correct:true,errors:0}));
  await page.close();
 }finally{await browser.close()}
}
(async()=>{for(const cfg of configs)await run(cfg)})().catch(e=>{console.error(e);process.exitCode=1});
