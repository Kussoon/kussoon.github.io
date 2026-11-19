'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const cases=[
 {city:'nishinomiya',url:'nishinomiya-town-svg-community-b-20261119-pilot.html',total:321,region:'西宮浜',exception:'上ヶ原'},
 {city:'takarazuka',url:'takarazuka-town-svg-community-b-20261119-pilot.html',total:125,region:'西谷'}
];
async function run(driver,browserName,width,height,model){
 const browser=await driver.launch();
 try{
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/v2/'+model.url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(count=>document.querySelector('#communityCount')?.textContent.includes(count+'町名'),model.total,{timeout:60000});
  const menu=page.locator('#communityOptions'),toggle=page.locator('#communityToggle');
  const clickRegion=async name=>{
   await toggle.click();
   assert.equal(await menu.isVisible(),true,'menu opens');
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   await menu.locator('button').filter({has:page.locator('strong', {hasText:name})}).first().click();
   assert.equal(await menu.isVisible(),false,'menu closes after selection');
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   assert.equal(await toggle.evaluate(el=>el===document.activeElement),true,'focus returned to toggle');
  };
  await clickRegion(model.region);
  const regionalText=await page.locator('#communityCount').textContent();
  assert(regionalText.includes(model.region+'（'),'region label with reading');
  assert(!regionalText.includes('市全域：'+model.total+'町名'),'only regional count');
  const active=await menu.locator('button.active').getAttribute('data-community');
  assert.equal(active,model.region,'active region button');
  // Both maps must be able to close by Escape without changing region.
  await toggle.click();assert.equal(await menu.isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await menu.isVisible(),false);
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
  await toggle.click();assert.equal(await menu.isVisible(),true);
  await page.locator('h1').click();
  assert.equal(await menu.isVisible(),false,'outside pointer closes menu');
  assert.equal(await menu.locator('button.active').getAttribute('data-community'),model.region);
  if(model.exception){
   await clickRegion(model.exception);
   assert.equal(await page.locator('#boundaryNote').isVisible(),true,'岡田山 split jurisdiction note');
   assert.match(await page.locator('#boundaryNote').textContent(),/岡田山/);
  }
  // Returning all via slider minimum must not leave a regional scope.
  await page.locator('#zoomSlider').evaluate(el=>{
   el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForTimeout(250);
  assert.equal((await page.locator('#communityCount').textContent()).trim(),'市全域：'+model.total+'町名');
  assert.equal(await menu.locator('button.active').getAttribute('data-community'),'');
  assert.equal(await page.locator('#labels g.label').count(),model.total===321?324:136,'full-city labels preserved');
  assert.equal(await page.locator('#quizOne').isEnabled(),true,'quiz1 remains available');
  assert.equal(await page.locator('#quizTwo').isEnabled(),true,'quiz2 remains available');
  if(model.exception)assert.equal(await page.locator('#boundaryNote').isVisible(),false);
  assert.deepEqual(errors,[],browserName+'/'+model.city+' no runtime errors');
  console.log('PASS REGION_B '+JSON.stringify({city:model.city,browser:browserName,selected:model.region,escape:true,outside:true,focus:true,wholeCity:model.total}));
 }finally{await browser.close()}
}
(async()=>{
 for(const t of cases){
  await run(chromium,'chromium-1280',1280,800,t);
  await run(webkit,'webkit-390',390,844,t);
  await run(webkit,'webkit-320',320,668,t);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
