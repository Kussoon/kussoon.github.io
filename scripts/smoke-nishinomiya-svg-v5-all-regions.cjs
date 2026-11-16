// Complete 26-community switch and quiz lifecycle regression for Nishinomiya V5.
// Automated WebKit is NOT the user's actual iPhone Safari.
'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.NISHINOMIYA_REGIONS_SHOTS||'nishinomiya-v5-all-regions-shots');
fs.mkdirSync(root,{recursive:true});
const base=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const route='/v2/nishinomiya-town-svg-master-v5-20261116-pilot.html';
const scenarios=[
 {name:'chromium-1280',browser:chromium,width:1280,height:800},
 {name:'webkit-390',browser:webkit,width:390,height:844}
];
async function regionClick(page,region){
 await page.locator('#communityToggle').click();
 await page.locator('#communityOptions button').evaluateAll((nodes,region)=>{
  const button=nodes.find(n=>n.dataset.community===region);
  if(!button)throw Error('Missing region '+region);
  button.click();
 },region);
}
async function run(scenario){
 const browser=await scenario.browser.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:scenario.width,height:scenario.height},
   deviceScaleFactor:2,isMobile:scenario.width<=390,hasTouch:scenario.width<=390});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
  await page.locator('#communityToggle').click();
  const communities=await page.locator('#communityOptions button').evaluateAll(nodes=>nodes.map(n=>n.dataset.community));
  assert.equal(communities.length,27,'26 named regions and all-city option');
  assert.equal(communities[0],'','all-city is first');
  await page.locator('#communityToggle').click();
  const results=[];
  for(const region of communities.slice(1)){
   await regionClick(page,region);
   const snapshot=await page.evaluate(()=>{
    const geos=[...document.querySelectorAll('#areas path.town')];
    const labs=[...document.querySelectorAll('#labels g.label')];
    const expected=Number(document.getElementById('communityCount').textContent.match(/：(\d+)町名/)?.[1]);
    const names=geos.map(n=>n.__data__?.properties?.S_NAME);
    const labelNames=labs.map(n=>n.__data__?.name);
    const geomOkay=geos.every(n=>n.getAttribute('d')&&!/NaN|Infinity/.test(n.getAttribute('d')));
    const t=d3.zoomTransform(document.getElementById('map'));
    return {expected,geoCount:geos.length,labels:labs.length,
     uniqueGeo:new Set(names).size,allLabeled:names.every(n=>labelNames.includes(n)),
     geomOkay,zoom:Number.isFinite(t.k)&&t.k>=.6&&t.k<=40,
     info:document.getElementById('communityCount').textContent};
   });
   assert(Number.isInteger(snapshot.expected)&&snapshot.expected>=1,region+' no towns');
   assert.equal(snapshot.geoCount,snapshot.expected,region+' path count mismatch');
   assert.equal(snapshot.uniqueGeo,snapshot.geoCount,region+' duplicate geometry');
   assert(snapshot.allLabeled&&snapshot.labels>=snapshot.expected,region+' missing town labels');
   assert(snapshot.geomOkay&&snapshot.zoom,region+' invalid geometry or zoom');
   await page.locator('#quizOne').click();
   assert.match(await page.locator('#quizQuestion').textContent(),/の場所を押してください/);
   await page.locator('#quizQuit').click();
   assert.match(await page.locator('#quizResult').textContent(),/途中終了/);
   await page.locator('#quizBack').click();
   await page.locator('#quizTwo').click();
   assert.equal(await page.locator('#quizChoices button').count(),4,region+' quiz 2 choices');
   await page.locator('#quizQuit').click();
   await page.locator('#quizBack').click();
   results.push({region,scope:snapshot.expected,labelCount:snapshot.labels});
  }
  await regionClick(page,'');
  assert.equal(await page.locator('#areas path.town').count(),321);
  assert.equal(await page.locator('#labels g.label').count(),324);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=2,'horizontal overflow after visiting all 26');
  assert.deepEqual(errors,[],'page JavaScript errors');
  await page.screenshot({path:path.join(root,scenario.name+'-after-all-regions.png'),fullPage:true});
  fs.writeFileSync(path.join(root,scenario.name+'-26-region-results.json'),JSON.stringify(results,null,2));
  console.log('PASS '+scenario.name+': all 26 named region geometry/labels, 52 quiz lifecycles, all-city restoration, no horizontal overflow');
 }finally{await browser.close()}
}
(async()=>{for(const scenario of scenarios)await run(scenario)})().catch(e=>{console.error(e);process.exitCode=1});
