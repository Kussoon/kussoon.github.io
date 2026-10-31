/* Run against a local static server: BASE_URL=http://127.0.0.1:8000 node v2/tests/office-popup.browser.cjs
 * Requires Playwright + Chromium. TOPOJSON_PATH can supply a local CDN script for offline runs. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const data=require('../data/offices/28.json');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cloud.umami.is/**',r=>r.abort());
  if(process.env.TOPOJSON_PATH)await page.route('https://unpkg.com/**',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.env.TOPOJSON_PATH,'utf8')}));
  const base=process.env.BASE_URL||'http://127.0.0.1:8000';
  for(const width of [375,768,1280]){
   await page.setViewportSize({width,height:800});
   await page.goto(base+'/v2/national/density.html?area=kansai');
   await page.waitForSelector('#map path[data-id]',{timeout:30000});
   await page.waitForFunction(()=>!document.getElementById('area').disabled);
   assert.equal(await page.locator('#reading').inputValue(),'on');
   assert.equal(await page.locator('#density-mode').inputValue(),'proposal5');
   const select=async code=>page.locator('#map path[data-id="28:'+code+'"]').dispatchEvent('keydown',{key:'Enter'});
   for(const code of ['28110','28204','28214','28215','28446','28365']){
    await select(code);
    const popup=page.locator('#municipal-popup');assert.ok(await popup.isVisible());
    assert.equal(await popup.locator('.popup-facility').count(),code==='28110'?2:1);
    assert.equal(await popup.getByRole('link',{name:/公式サイト/}).count(),1);
    assert.equal(await popup.getByRole('link',{name:/Wikipedia/}).count(),1);
    assert.equal(await popup.getByRole('link',{name:/ここへ行く|庁舎案内/}).count(),0);
    assert.equal(await popup.locator('.popup-actions.region-links a').count(),2);
    if(code==='28365'){
     assert.match(await popup.innerText(),/679-1192/);
     assert.match(await popup.innerText(),/兵庫県多可郡多可町中区中村町123番地/);
     assert.equal(await popup.getByRole('link',{name:/公式サイト/}).getAttribute('href'),data.regions['28365'].official);
    }
    if(code==='28110'){
     assert.ok((await popup.innerText()).includes('651-8570'));assert.ok((await popup.innerText()).includes('650-8570'));
     const text=await popup.innerText();
     assert.ok(text.includes('神戸市中央区役所')&&text.includes('神戸市役所（1号館）'));
     assert.equal(await popup.getByRole('link',{name:/公式サイト/}).getAttribute('href'),data.regions['28110'].official);
     assert.equal(await popup.getByRole('link',{name:/Wikipedia/}).getAttribute('href'),data.regions['28110'].wikipedia);
     const p=await popup.boundingBox(),t=await page.locator('.map-toolbar').boundingBox();assert.ok(p.x+p.width<=t.x,'popup overlaps controls');
     await page.locator('#popup-close').click();assert.equal(await popup.isVisible(),false);
     assert.equal(await page.locator('#map path.selected').count(),1);
     await select(code);assert.equal(await page.locator('#map path.selected').count(),0);
     await select(code);assert.ok(await popup.isVisible());
    }
   }
   await page.selectOption('#mode','municipality');await page.waitForFunction(()=>!document.getElementById('mode').disabled);
   await select('28100');assert.equal(await page.locator('.popup-facility').count(),1);
  }
  // Partial directory: an unconfirmed ward still leaves the shared city hall usable.
  const partial=structuredClone(data);partial.offices['28110-ward']={name:'神戸市中央区役所',status:'missing'};
  await page.route('**/data/offices/28.json*',r=>r.fulfill({json:partial}));
  await page.reload();await page.waitForSelector('#map path[data-id]');await page.waitForFunction(()=>!document.getElementById('area').disabled);
  await page.locator('#map path[aria-label="神戸市中央区"]').dispatchEvent('keydown',{key:'Enter'});
  assert.equal(await page.locator('#municipal-popup').locator('.popup-facility').count(),2);
  assert.equal(await page.locator('#municipal-popup').getByRole('link',{name:/ここへ行く|庁舎案内/}).count(),0);
  assert.equal(await page.locator('#municipal-popup').getByRole('link',{name:/公式サイト|Wikipedia/}).count(),2);
  assert.match(await page.locator('#municipal-popup').innerText(),/未確認/);
  await page.unroute('**/data/offices/28.json*');
  await page.route('**/data/offices/28.json*',r=>r.fulfill({status:503,body:'unavailable'}));
  await page.reload();await page.waitForSelector('#map path[data-id]');await page.waitForFunction(()=>!document.getElementById('area').disabled);
  assert.ok(await page.locator('#map path[data-id]').count()>0);
  await page.locator('#map path[data-id="28:28110"]').dispatchEvent('keydown',{key:'Enter'});
  assert.equal(await page.locator('#municipal-popup').getByRole('link',{name:/ここへ行く|庁舎案内/}).count(),0);
  await page.unroute('**/data/offices/28.json*');
  let officeRequests=0;
  await page.route('**/data/offices/28.json*',r=>{officeRequests++;return r.continue();});
  await page.goto(base+'/v2/national/density.html?area=shikoku');
  await page.waitForSelector('#map path[data-id]');
  await page.waitForFunction(()=>!document.getElementById('area').disabled);
  assert.equal(officeRequests,0);
  assert.deepEqual(errors,[]);console.log('PASS: 3 viewport sizes, initial 6 regions + Taka, regional links, close/reselect, partial ward, load failure, lazy loading');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
