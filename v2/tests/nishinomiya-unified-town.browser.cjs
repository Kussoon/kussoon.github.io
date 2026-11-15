#!/usr/bin/env node
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=process.argv[2]||'http://127.0.0.1:8765';
const dir=path.resolve(process.env.NISHINOMIYA_UNIFIED_EVIDENCE||'nishinomiya-unified-evidence');
fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const results=[];
 for(const item of [{kind:'chromium',browser:chromium,width:1280,height:900},{kind:'webkit',browser:webkit,width:390,height:844}]){
  const browser=await item.browser.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:item.width,height:item.height},deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url+'/v2/town-map/?code=28204',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.querySelectorAll('path.region').length===321,{timeout:90000});
   await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('321'),{timeout:90000});
   const initial=await page.evaluate(()=>({shapes:document.querySelectorAll('path.region').length,labels:document.querySelectorAll('text.label').length,status:document.querySelector('#status').textContent,view:document.querySelector('#map').getAttribute('viewBox'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
   assert.equal(initial.shapes,321);assert.ok(initial.labels>0);assert.ok(initial.overflow<=2);
   await page.screenshot({path:path.join(dir,item.kind+'-'+item.width+'-initial.png'),fullPage:true});
   await page.locator('#search').fill('岡田山');
   await page.locator('#matches button').first().click();
   const selected=await page.evaluate(()=>({selected:document.querySelector('#selected')?.textContent,active:document.querySelectorAll('path.region.active').length,view:document.querySelector('#map').getAttribute('viewBox')}));
   assert.match(selected.selected,/岡田山/);assert.ok(selected.active>0);
   await page.screenshot({path:path.join(dir,item.kind+'-'+item.width+'-selected.png'),fullPage:true});
   await page.locator('#reset').click();
   await page.locator('#readings').check();
   const readingLabels=await page.locator('tspan.reading').count();
   await page.locator('#plus').click();
   await page.screenshot({path:path.join(dir,item.kind+'-'+item.width+'-zoom-reading.png'),fullPage:true});
   assert.deepEqual(errors,[]);
   results.push({kind:item.kind,width:item.width,initial,selected,readingLabels});
   await page.close();
  }finally{await browser.close()}
 }
 fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({results},null,2)+'\n');
 console.log('nishinomiya unified SVG browser smoke: PASS; actual iPhone Safari review outstanding');
})().catch(e=>{console.error(e);process.exitCode=1});
