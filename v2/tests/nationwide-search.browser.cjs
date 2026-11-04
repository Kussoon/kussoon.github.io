'use strict';
// S04/S28/S30/S31: exercise the actual national index and current 2026 routes.
const assert=require('node:assert/strict');
const {start}=require('./helpers/nationwide-browser.cjs');
async function query(page,text){
 await page.fill('#placeSearch',text);
 await page.waitForFunction(()=>{const t=document.querySelector('#searchResults').textContent;return t.length>0&&!t.includes('読み込み中');});
 return page.locator('#searchResults button');
}
(async()=>{
 const app=await start(),{page}=app;
 try{
  await app.open();
  for(const [name,reading,code] of [
   ['浜松市中央区','はままつしちゅうおうく','22138'],
   ['浜松市浜名区','はままつしはまなく','22139'],
   ['浜松市天竜区','はままつしてんりゅうく','22140'],
  ]){
   for(const term of [name,reading,code]){
    await page.click('#nationBtn');const results=await query(page,term);
    assert.equal(await results.count(),1,'current ward candidate for '+term);
    assert((await results.textContent()).includes('静岡県 ＞ '+name));await results.click();
    await page.locator('#map .chosen[data-code="'+code+'"]').waitFor();
    assert.equal(await page.inputValue('#pref'),'22');assert.equal(await page.inputValue('#region'),code);
    assert((await page.textContent('#popupName')).includes(name));assert.equal(await page.locator('#officePopup a').count(),6);
   }
  }
  await page.click('#nationBtn');
  for(const code of ['22131','22132','22133','22134','22135','22136','22137']){
   assert.equal(await (await query(page,code)).count(),0,'retired ward must not be a current candidate '+code);
  }
  const dates=await query(page,'伊達市'),texts=await dates.allTextContents();
  assert(texts.some(t=>t.includes('北海道'))&&texts.some(t=>t.includes('福島県')),'homonymous municipalities retain prefecture context');
  const city=await query(page,'なかつがわし');assert.equal(await city.count(),1);await city.click();
  await page.locator('#map .chosen[data-code="21206"]').waitFor();assert(await page.locator('#officePopup').isVisible());
  await page.fill('#placeSearch','中津川');assert.equal(await page.locator('#searchResults button').count(),1,'existing prefecture search still works');
  await page.click('#popupClose');await page.locator('#searchResults button').click();
  assert(await page.locator('#officePopup').isVisible(),'S04 search reopens a dismissed municipality');
  const different=await query(page,'岐阜市');assert.equal(await different.count(),1);await different.click();
  await page.locator('#map .chosen[data-code="21201"]').waitFor();assert((await page.textContent('#popupName')).includes('岐阜市'));
  assert.deepEqual(app.errors,[]);console.log('PASS S04/S28/S30/S31: 3 current Hamamatsu wards by name/reading/code, no 7 retired wards, homonyms and ordinary nationwide/prefecture search');
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
