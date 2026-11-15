// Takarazuka source-backed SVG adapter browser test.
// WebKit viewport emulation is not a substitute for iPhone Safari hardware.
'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve('takarazuka-svg-adapter-screenshots');fs.mkdirSync(out,{recursive:true});
const origin=process.argv[2]||'http://127.0.0.1:8765';
async function check(engine,width,height){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/v2/takarazuka-town-svg-adapter-pilot.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('125町域'),null,{timeout:60000});
  assert.equal(await page.locator('#towns path.town').count(),125);
  const names=await page.locator('#towns path.town').evaluateAll(ns=>ns.map(n=>n.dataset.name));
  assert.equal(new Set(names).size,125);
  const pageWidth=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  assert.ok(pageWidth[0]<=pageWidth[1]+2,'horizontal overflow');
  await page.locator('#search').fill('すみれ');
  assert.ok((await page.locator('#results button').count())>=1,'reading search results');
  await page.locator('#results button').first().click();
  assert.match(await page.locator('#selection').textContent(),/すみれガ丘（すみれがおか）/);
  assert.equal(await page.locator('#towns path.selected').count(),1);
  await page.locator('#plus').click();
  await page.locator('#minus').click();
  await page.locator('#reset').click();
  assert.equal(await page.locator('#towns path.selected').count(),0);
  await page.screenshot({path:path.join(out,(width<500?'webkit-':'chromium-')+width+'.png'),fullPage:true});
  await page.goto(origin+'/v2/takarazuka-town-svg-adapter-pilot.html?town='+encodeURIComponent('中山寺'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#selection')?.textContent.includes('中山寺'),null,{timeout:60000});
  assert.equal(await page.locator('#towns path.selected').count(),1);
  assert.deepEqual(errors,[],'browser runtime errors');
  await page.close();
 }finally{await browser.close()}
}
(async()=>{await check(chromium,1280,820);await check(webkit,390,844);await check(webkit,320,720);console.log('PASS Takarazuka 125 shape cross-city SVG adapter');})().catch(e=>{console.error(e);process.exit(1)});
