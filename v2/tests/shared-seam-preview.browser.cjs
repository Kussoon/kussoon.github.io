'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {start}=require('./helpers/nationwide-browser.cjs');
const pairs=['04-07','27-28','27-29','43-44'],out=process.env.KUSSOON_BROWSER_ARTIFACTS;
(async()=>{
 for(const engine of ['chromium','webkit']){
  const app=await start({engine,contextOptions:{viewport:{width:390,height:844}}}),{page}=app,errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await app.open();
   await page.goto(page.url().replace('official-2026-nationwide-pilot.html','shared-seam-test.html'),{waitUntil:'domcontentloaded'});
   for(const pref of pairs){
    await page.selectOption('#pair',pref);
    await page.waitForFunction(()=>/旧・県別データ.*線分/.test(document.querySelector('#status')?.textContent||''),{},{timeout:90000});
    const before=await page.locator('#map').getAttribute('viewBox');
    const oldD=await page.locator('#map .borders').getAttribute('d');
    assert(oldD.length>100,'old border path populated '+pref);
    assert.equal(await page.locator('#map .borders').count(),1,'single old stroke layer');
    await page.click('#new');
    await page.waitForFunction(()=>/新・全国共通境界.*線分/.test(document.querySelector('#status')?.textContent||''),{},{timeout:90000});
    assert.equal(await page.locator('#map').getAttribute('viewBox'),before,'toggle keeps exact viewport');
    assert.equal(await page.locator('#map .borders').count(),1,'single new stroke layer');
    const newD=await page.locator('#map .borders').getAttribute('d');
    assert(newD.length>100);
    assert.notEqual(oldD,newD,'trial must display materially different source geometry '+pref);
    const count=await page.locator('#map .land').count();assert(count>2,'two prefectures have municipalities '+pref);
    await page.click('#plus');
    assert.notEqual(await page.locator('#map').getAttribute('viewBox'),before,'zoom responds');
    await page.click('#old');
    assert.equal(await page.getAttribute('#old','aria-pressed'),'true','old button responds after zoom');
    await page.click('#reset');
    const restored=await page.locator('#map').getAttribute('viewBox');
    assert.equal(restored,'0 0 850 700');
    if(out){await fs.mkdir(out,{recursive:true});await page.screenshot({path:path.join(out,'shared-seam-'+engine+'-'+pref+'.png')});}
    console.log('PASS shared seam '+engine+' '+pref+' municipalities='+count+' old/new distinct; same camera');
   }
   assert.deepEqual(errors,[],'browser errors');
  }finally{await app.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
