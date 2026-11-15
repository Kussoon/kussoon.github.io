#!/usr/bin/env node
'use strict';
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:8765';
const dest=path.resolve(process.env.KAWANISHI_AB_EVIDENCE||'kawanishi-ab-evidence');fs.mkdirSync(dest,{recursive:true});
const cases=[{engine:chromium,name:'chromium',width:1280,height:900},{engine:webkit,name:'webkit',width:390,height:844}];
(async()=>{const results=[];
for(const c of cases){const browser=await c.engine.launch({headless:true});try{
for(const variant of ['A','B']){const page=await browser.newPage({viewport:{width:c.width,height:c.height},deviceScaleFactor:2});
const errors=[];page.on('pageerror',err=>errors.push(err.message));
await page.goto(base+'/v2/town-map/compare/?code=28217&labelMode='+variant,{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForFunction(()=>document.querySelectorAll('[data-layer="shapes"] path').length===191&&document.querySelector('#labelStats')?.textContent?.includes('件表示'),null,{timeout:45000});
const capture=async stage=>{const v=await page.evaluate(()=>({labels:document.querySelectorAll('[data-layer="labels"] text').length,shapes:document.querySelectorAll('[data-layer="shapes"] path').length,stats:document.querySelector('#labelStats').textContent,view:document.querySelector('#map').getAttribute('viewBox'),status:document.querySelector('#status').textContent,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
assert.equal(v.shapes,191);assert.ok(v.labels>0);assert.match(v.stats,new RegExp('^'+variant+'案'));assert.ok(v.overflow<=2,'unexpected overflow');
await page.screenshot({path:path.join(dest,c.name+'-'+c.width+'-'+variant+'-'+stage+'.png'),fullPage:true});
return v;};
const initial=await capture('all');
await page.locator('#plus').click();await page.locator('#plus').click();
const zoom=await capture('zoom');assert.notEqual(zoom.view,initial.view);
await page.locator('#readings').check();const reading=await capture('reading-on');
await page.locator('#reset').click();const reset=await capture('reset');assert.equal(reset.view,initial.view);
assert.deepEqual(errors,[],'page runtime errors: '+JSON.stringify(errors));
results.push({browser:c.name,width:c.width,variant,initial,zoom,reading,reset});await page.close();
}}finally{await browser.close();}}
fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify({results},null,2)+'\n');
console.log('Kawanishi A/B browser trial PASS (not Safari device acceptance): '+results.length+' scenarios');
})().catch(e=>{console.error(e);process.exitCode=1;});