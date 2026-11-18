// TOWNMAP-SSOT-001 R-TOWN-04/11/13/14: compare approved V34 against the
// isolated national multipart-label adapter, with no changes to V34.
'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const out=path.resolve('nishinomiya-v34-community-state-parity');fs.mkdirSync(out,{recursive:true});
const versions={
 BASE:'/v2/nishinomiya-town-svg-view-actions-20261118-pilot.html',
 ADAPTED:'/v2/nishinomiya-town-svg-community-state-20261118-pilot.html'
};
const cases=[{name:'chromium-1280',driver:chromium,w:1280,h:800},
 {name:'webkit-390',driver:webkit,w:390,h:844},
 {name:'webkit-320',driver:webkit,w:320,h:668}];
async function signature(page){
 return page.evaluate(()=>{
  const regions=[...document.querySelectorAll('#communityOptions button[data-community]')].map(x=>x.dataset.community);
  const paths=[...document.querySelectorAll('#areas path.town')].map(x=>({
   name:x.__data__?.properties?.S_NAME,outline:x.getAttribute('d'),className:x.getAttribute('class')
  }));
  const labels=[...document.querySelectorAll('#labels g.label')].map(g=>({
   name:g.querySelector('.town-name')?.textContent,
   reading:g.querySelector('.town-reading')?.textContent,
   transform:g.getAttribute('transform'),
   font:g.querySelector('text.town-label')?.getAttribute('font-size'),
   shift:g.getAttribute('data-edge-shift')
  }));
  const el=document.querySelector('#map');
  const r=el.getBoundingClientRect();
  return{regions,paths,labels,geometry:{width:r.width,height:r.height},
   status:document.querySelector('#communityCount')?.textContent,
   worldTransform:document.querySelector('#world')?.getAttribute('transform'),
   buttonLabels:['zoomIn','zoomOut','larger','smaller','reading','fullscreen','reset'].map(id=>document.getElementById(id)?.textContent.trim())};
 });
}
async function getContext(page){
 const sign={};
 sign.default=await signature(page);
 await page.locator('#zoomIn').click();await page.waitForTimeout(450);
 sign.zoom=await signature(page);
 await page.locator('#reset').click();await page.waitForTimeout(100);
 sign.reset=await signature(page);
 await page.locator('#reading').click();
 sign.reading=await signature(page);
 await page.locator('#larger').click();
 sign.font125=await signature(page);
 await page.evaluate(()=>{
  const b=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community==='山口');
  b.click();
 });
 sign.yamaguchi=await signature(page);
 await page.evaluate(()=>{
  const b=[...document.querySelectorAll('#communityOptions button')].find(x=>x.dataset.community==='上ヶ原');
  b.click();
 });
 sign.uegahara=await signature(page);
 return sign;
}
(async()=>{
 for(const c of cases){
  const browser=await c.driver.launch({headless:true});
  try{
   const collected={};
   for(const version of Object.keys(versions)){
    const page=await browser.newPage({viewport:{width:c.w,height:c.h},
      isMobile:c.w<600,hasTouch:c.w<600,deviceScaleFactor:2});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+versions[version],{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
    collected[version]=await getContext(page);
    await page.locator('#map').screenshot({path:path.join(out,c.name+'-'+version+'-uegahara.png')});
    assert.deepEqual(errors,[],version+' browser error');
    await page.close();
   }
   for(const key of Object.keys(collected.BASE)){
    const a=collected.BASE[key],b=collected.ADAPTED[key];
    assert.equal(a.paths.length,b.paths.length,key+' polygon count');
    assert.deepEqual(b,a,c.name+' '+key+' visual DOM parity differs');
   }
   assert.equal(collected.ADAPTED.default.paths.length,321);
   assert.equal(collected.ADAPTED.default.labels.length,324);
   assert.equal(collected.ADAPTED.default.regions.length,27,'whole-city plus 26 regions');
   fs.writeFileSync(path.join(out,c.name+'.json'),JSON.stringify({
    device:c.name,states:Object.keys(collected.BASE),towns:321,labels:324,regions:26,
    matchingStates:Object.keys(collected.BASE).length},null,2));
   console.log('PASS NATIONAL_V34_COMMUNITY_STATE_PARITY '+JSON.stringify({device:c.name,
    states:Object.keys(collected.BASE).length,towns:321,labels:324,regions:26}));
  }finally{await browser.close()}
 }
})().catch(err=>{console.error(err);process.exitCode=1});
