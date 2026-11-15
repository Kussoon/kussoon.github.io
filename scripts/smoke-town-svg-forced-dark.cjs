#!/usr/bin/env node
// Visual evidence of Chromium forced-dark behavior. Browser implementation
// is not a substitute for Microsoft Edge on the user's device.
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const dir=path.resolve('svg-town-edge-dark-screenshots');
fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-features=WebContentsForceDark']});
 try{
  for(const [label,pathname,guard] of [
   ['before','/v2/nishinomiya-town-svg-core-pilot.html',false],
   ['after','/v2/nishinomiya-town-svg-edge-dark-guard-pilot.html',true]
  ]){
   const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765'+pathname,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
   const scheme=await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme);
   if(guard)assert.ok(scheme.split(/\s+/).includes('light')&&scheme.split(/\s+/).includes('only'),'opt out of Chromium force dark theme at root');
   else assert.ok(!scheme.split(/\s+/).includes('only'),'control must remain without auto-dark opt-out');
   assert.equal(await page.locator('#areas path.town').count(),321,'all 321 geographic paths');
   assert.ok((await page.locator('#labels g.label').count())>=321,'town labels rendered');
   assert.deepEqual(errors,[],'no JS errors');
   await page.screenshot({path:path.join(dir,'chromium-force-dark-'+label+'.png'),fullPage:true});
   await page.close();
  }
  console.log('PASS forced-dark Chromium A/B capture; real Edge verification remains required');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
