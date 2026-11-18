'use strict';
// TOWNMAP-SSOT-001 R-TOWN-00/04/06/11/12/13/14/20/21/23/40/41/44
// One operation/state audit for ANY municipality with the common SVG town-map DOM.
// Town counts, independent regions, and candidate labels are data expectations.
// A label is intentionally allowed to overlap another label.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const base=process.env.TOWNMAP_TEST_BASE||'http://127.0.0.1:8765';
const output=path.resolve('national-town-cross-city-audit');
fs.mkdirSync(output,{recursive:true});
const towns=[
 {id:'nishinomiya',url:'/v2/nishinomiya-town-svg-multipart-label-20261118-pilot.html',towns:321,labels:324,regions:26,chosen:'山口',other:'上ヶ原'},
 {id:'takarazuka',url:'/v2/takarazuka-town-svg-multipart-label-20261118-pilot.html',towns:125,labels:136,regions:20,chosen:'仁川',other:'西谷'}
];
const devices=[
 {id:'chromium-1280',driver:chromium,width:1280,height:800},
 {id:'webkit-390',driver:webkit,width:390,height:844},
 {id:'webkit-320',driver:webkit,width:320,height:720}
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function snapshot(page){
 return page.evaluate(()=>{
  const $=id=>document.getElementById(id);
  const pos=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
  const nodes=[...document.querySelectorAll('#labels g.label')];
  return {
   pathCount:document.querySelectorAll('#areas path.town').length,
   pathNames:[...document.querySelectorAll('#areas path.town')].map(p=>p.dataset.name||p.__data__?.properties?.S_NAME||p.__data__?.name),
   labelCount:nodes.length,
   labelNames:nodes.map(g=>g.querySelector('.town-name')?.textContent),
   readCount:nodes.filter(g=>!!g.querySelector('.town-reading')).length,
   regionCount:document.querySelectorAll('#communityOptions button[data-community]').length-1,
   mapTransform:$('world').getAttribute('transform')||'',
   fontText:$('size').textContent,
   readingText:$('reading').textContent,
   regionText:$('communityCount').textContent,
   fullscreen:document.body.classList.contains('fullscreen'),
   map:pos($('map')),frame:pos($('frame')),
   controls:pos(document.querySelector('.controls')),
   full:pos($('fullscreen')),
   labelsWithEmptyName:nodes.filter(g=>!g.querySelector('.town-name')?.textContent.trim()).length
  };
 });
}
function validate(s,d,stage){
 assert.ok(s.pathCount>0&&s.pathCount<=d.towns,d.id+':'+stage+':pathCount '+s.pathCount);
 assert.equal(new Set(s.pathNames).size,s.pathCount,d.id+':'+stage+':distinct town paths');
 assert.ok(s.labelCount>0&&s.labelCount<=d.labels,d.id+':'+stage+':labelCount '+s.labelCount);
 assert.equal(s.labelsWithEmptyName,0,d.id+':'+stage+':empty labels');
 assert.equal(s.regionCount,d.regions,d.id+':'+stage+':regions');
 assert.ok(s.map.w>0&&s.map.h>0,d.id+':'+stage+':map size');
 const tol=4;
 assert.ok(s.controls.x>=s.frame.x-tol&&s.controls.x+s.controls.w<=s.frame.x+s.frame.w+tol,d.id+':'+stage+':controls inside map');
 assert.ok(s.full.x>=s.frame.x-tol&&s.full.x+s.full.w<=s.frame.x+s.frame.w+tol,d.id+':'+stage+':fullscreen inside map');
}
async function selectRegion(page,name){
 await page.locator('#communityToggle').click();
 await page.evaluate(target=>{
  const b=[...document.querySelectorAll('#communityOptions button[data-community]')].find(x=>x.dataset.community===target);
  if(!b)throw Error('Missing requested region '+target);
  b.click();
 },name);
 await page.waitForTimeout(450);
}
async function collect(page,d){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const results={};
 await page.goto(base+d.url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(expected=>document.getElementById('communityCount')?.textContent.includes(expected+'町名'),d.towns,{timeout:60000});
 await page.waitForTimeout(450);
 async function record(name){const s=await snapshot(page);validate(s,d,name);results[name]=s;}
 await record('initial');
 assert.equal(results.initial.pathCount,d.towns);
 assert.equal(results.initial.labelCount,d.labels);
 assert.equal(results.initial.readCount,0,'initial readings OFF');
 await page.locator('#reading').click();await record('reading-on');
 assert.equal(results['reading-on'].readCount,results['reading-on'].labelCount,'reading ON includes reading tspan');
 await page.locator('#larger').click();await record('text-125');
 assert.match(results['text-125'].fontText,/125/,'125 percent');
 await page.locator('#zoomIn').click();await page.waitForTimeout(550);await record('zoom-in');
 assert.notEqual(results['zoom-in'].mapTransform,results['text-125'].mapTransform,'zoom changes map transform');
 await page.locator('#zoomOut').click();await page.waitForTimeout(550);await record('zoom-out');
 await page.locator('#reading').click();await record('reading-off');
 assert.equal(results['reading-off'].readCount,0,'reading OFF removes reading tspan');
 await selectRegion(page,d.chosen);await record('region-one');
 assert.ok(results['region-one'].pathCount<d.towns,'region filters towns');
 await selectRegion(page,d.other);await record('region-two');
 assert.ok(results['region-two'].pathCount<d.towns,'second region filters towns');
 await selectRegion(page,'');await record('city-return');
 assert.equal(results['city-return'].pathCount,d.towns);
 assert.equal(results['city-return'].labelCount,d.labels);
 await page.locator('#fullscreen').click();await page.waitForTimeout(160);await record('fullscreen');
 assert.equal(results.fullscreen.fullscreen,true,'fullscreen enters');
 await page.locator('#fullscreen').click();await page.waitForTimeout(160);await record('fullscreen-return');
 assert.equal(results['fullscreen-return'].fullscreen,false,'fullscreen leaves');
 assert.deepEqual(errors,[],d.id+' browser errors');
 return results;
}
(async()=>{
 for(const dev of devices){
  const browser=await dev.driver.launch({headless:true});
  try{
   const report={device:dev.id,cities:[],states:[]};
   for(const d of towns){
    const page=await browser.newPage({viewport:{width:dev.width,height:dev.height},isMobile:dev.width<500,hasTouch:dev.width<500,deviceScaleFactor:2});
    try{
     const results=await collect(page,d);
     report.cities.push({id:d.id,towns:d.towns,candidates:d.labels,regions:d.regions,
      stages:Object.keys(results),initial:results.initial,region:results['region-one'],
      afterReset:results['city-return']});
     if(!report.states.length)report.states=Object.keys(results);
     assert.deepEqual(Object.keys(results),report.states,'Cross-city operation states');
    }finally{await page.close()}
   }
   fs.writeFileSync(path.join(output,dev.id+'.json'),JSON.stringify(report,null,2));
   console.log('PASS NATIONAL_TOWN_CROSS_CITY '+JSON.stringify({
     device:dev.id,cities:report.cities.map(c=>({id:c.id,towns:c.towns,candidates:c.candidates,regions:c.regions})),
     states:report.states,errors:0}));
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
