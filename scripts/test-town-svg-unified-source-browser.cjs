'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const before='/v2/takarazuka-town-svg-national-choices-20261118-pilot.html';
const after='/v2/takarazuka-town-svg-unified-source-20261118-pilot.html';
const tests=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,720]];
const base='http://127.0.0.1:8765';
async function inspect(browser,url,width,height){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  const data=await page.evaluate(()=>({
   map:[...document.querySelectorAll('#areas path.town')].map(p=>({name:p.getAttribute('data-name'),d:p.getAttribute('d')})),
   labels:[...document.querySelectorAll('#labels g.label')].map(g=>({name:g.__data__?.name,anchor:g.__data__?.anchor,
    secondary:g.__data__?.secondary||false})),
   region:[...document.querySelectorAll('#communityOptions button[data-community]')].map(x=>({name:x.dataset.community,
     reading:x.querySelector('small')?.textContent||''}))
  }));
  assert.equal(data.map.length,125);assert.equal(data.region.length,21);assert.equal(data.labels.length,136);
  for(const p of data.map)assert.ok(p.d);
  return {data,errors};
 }finally{await page.close()}
}
(async()=>{for(const [screen,type,width,height] of tests){
 const browser=await type.launch({headless:true});
 try{
  const [a,b]=await Promise.all([inspect(browser,before,width,height),inspect(browser,after,width,height)]);
  assert.deepEqual(b.data,a.data,'every town path, label anchor, secondary flag and region must match exactly');
  assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
  console.log('PASS NATIONAL_UNIFIED_SOURCE_PARITY '+JSON.stringify({screen,towns:125,labels:136,regions:20,pathsExact:true,anchorsExact:true,errors:0}));
 }finally{await browser.close()}}
})().catch(err=>{console.error(err);process.exitCode=1});
