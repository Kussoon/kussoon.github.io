'use strict';
// TOWNMAP-SSOT-001 R-TOWN-01/04/05/11/14/20/21/40/41/44.
// Cross-city real browser comparison diagnostics. Never infer that the two
// cities must have identical label coordinates or polygon geometries.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const cases=[
 {name:'nishinomiya',path:'/v2/nishinomiya-town-svg-master-v34-20261117-pilot.html',towns:321,region:'西宮浜'},
 {name:'takarazuka',path:'/v2/takarazuka-town-svg-result-navigation-20261118-pilot.html',towns:125,region:'仁川'}
];
const screens=[['chromium-desktop',chromium,1280,800],['webkit-mobile',webkit,390,844],['webkit-small',webkit,320,668]];
const out=process.env.TOWN_LABEL_ARTIFACT_DIR||'artifacts/national-town-label-comparison';
fs.mkdirSync(out,{recursive:true});
const results=[];
async function snapshot(page,stage,item,screen){
 const values=await page.evaluate(()=>{
  const map=document.querySelector('#map'),labels=[...document.querySelectorAll('#labels g.label')];
  const mr=map.getBoundingClientRect();
  const visible=labels.filter(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0);
  const unique=new Set(visible.map(el=>el.__data__?.name||el.querySelector('.town-name')?.textContent));
  const entries=visible.map(el=>{
   const r=el.getBoundingClientRect(),text=el.querySelector('.town-name');
   return {name:text?.textContent||'',reading:!!el.querySelector('.town-reading'),
    left:r.left,top:r.top,right:r.right,bottom:r.bottom};
  });
  const controls=[...document.querySelectorAll('#zoomIn,#zoomOut,#larger,#smaller,#size,#reset,#reading,#fullscreen')];
  return {
   map:{width:mr.width,height:mr.height},
   townPaths:document.querySelectorAll('#areas path.town').length,
   labelElements:labels.length,visibleLabels:visible.length,visibleNames:unique.size,
   readingLabels:visible.filter(el=>!!el.querySelector('.town-reading')).length,
   controls:controls.map(el=>({id:el.id,inMap:!!el.closest('#frame'),
    hidden:getComputedStyle(el).display==='none'})),
   overflow:entries.filter(e=>e.right<mr.left||e.left>mr.right||e.bottom<mr.top||e.top>mr.bottom).map(e=>e.name),
   status:document.querySelector('#status')?.textContent||'',
   community:document.querySelector('#communityCount')?.textContent||''
  };
 });
 assert.equal(values.townPaths>0,true,item.name+' '+stage+' has map geometry');
 assert.equal(values.labelElements>0,true,item.name+' '+stage+' has label elements');
 assert.equal(values.overflow.length,0,item.name+' '+stage+' renders off-frame labels');
 assert.equal(values.controls.length,8,item.name+' shared controls present');
 assert.ok(values.controls.every(c=>c.inMap),item.name+' all controls inside map frame');
 if(stage==='initial') assert.equal(values.townPaths,item.towns,item.name+' full-town path count');
 if(stage==='reading-on') assert.ok(values.readingLabels>0,item.name+' reading toggle produces visible readings');
 const file=path.join(out,item.name+'-'+screen+'-'+stage+'.png');
 await page.locator('#frame').screenshot({path:file,animations:'disabled'});
 results.push({city:item.name,screen,stage,...values,screenshot:file});
 console.log('PASS NATIONAL_TOWN_LABEL_BROWSER '+JSON.stringify({city:item.name,screen,stage,townPaths:values.townPaths,labelElements:values.labelElements,visibleLabels:values.visibleLabels,visibleNames:values.visibleNames,readingLabels:values.readingLabels}));
}
(async()=>{
 for(const [screen,engine,w,h] of screens){
  const browser=await engine.launch({headless:true});
  try{
   for(const item of cases){
    const page=await browser.newPage({viewport:{width:w,height:h},isMobile:w<600,hasTouch:w<600,deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto('http://127.0.0.1:8765'+item.path,{waitUntil:'domcontentloaded',timeout:60000});
     await page.waitForFunction(count=>(document.querySelector('#communityCount')?.textContent||'').includes(count+'町名'),item.towns,{timeout:60000});
     await snapshot(page,'initial',item,screen);
     await page.locator('#reading').click();await snapshot(page,'reading-on',item,screen);
     await page.locator('#reading').click();
     await page.locator('#larger').click();await snapshot(page,'text-plus',item,screen);
     await page.locator('#size').click();
     await page.locator('#zoomIn').click();await snapshot(page,'zoom-in',item,screen);
     await page.evaluate(region=>document.querySelector('#communityOptions button[data-community="'+region+'"]').click(),item.region);
     await snapshot(page,'selected-region',item,screen);
     assert.deepEqual(errors,[],item.name+' browser errors');
    }finally{await page.close()}
   }
  }finally{await browser.close()}
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');
})().catch(err=>{console.error(err);process.exitCode=1});
