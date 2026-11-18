'use strict';
// Browser source-data comparison against unchanged approved SVG map pages.
// No map rendering change; source-load and read-only validation only.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const base=process.env.TOWNMAP_TEST_BASE||'http://127.0.0.1:8765';
const cases=[
 {id:'nishinomiya',url:'/v2/nishinomiya-town-svg-common-update-20261118-pilot.html',towns:321,regions:26,labels:324,
  manifest:{municipalityId:'jp-hyogo-nishinomiya',sourceFormat:'topojson',
  topologyUrl:'/v2/data/nishinomiya-town-v2-premerged.topojson',
  mappingUrl:'/nishinomiya/data/community-town-map.json',
  exceptionUrl:'/v2/data/nishinomiya-uekoto-community.topojson',
  objectName:'town',townNameProperty:'S_NAME',expectedTownCount:321,expectedRegionCount:26}},
 {id:'takarazuka',url:'/v2/takarazuka-town-svg-common-update-20261118-pilot.html',towns:125,regions:20,labels:136,
  manifest:{municipalityId:'jp-hyogo-takarazuka',sourceFormat:'svg',
  htmlPath:'/takarazuka/town-search.html',infoPath:'/takarazuka/data/takarazuka-town-info.json',
  expectedTownCount:125,expectedRegionCount:20}}
];
async function check(browser,city,device){
 const page=await browser.newPage({viewport:{width:device.width,height:device.height},isMobile:device.width<500,hasTouch:device.width<500});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+city.url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(n=>document.getElementById('communityCount')?.textContent.includes(n+'町名'),city.towns,{timeout:60000});
  await page.addScriptTag({url:base+'/v2/common/js/town-svg-source-view.js'});
  const result=await page.evaluate(async manifest=>{
   const fetchJSON=async url=>{const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status+' '+url);return r.json()};
   const raw=await KussoonTownSvgDataContract.loadUnified(manifest,{
    fetchJSON,topojsonClient:window.topojson,svgAdapter:window.KussoonTownSvgSourceAdapter
   });
   const snapshot=KussoonTownSvgSourceView.create(raw,{requireMembership:manifest.sourceFormat==='svg'});
   const mapNames=[...document.querySelectorAll('#areas path.town')].map(el=>el.getAttribute('data-name')||el.__data__?.properties?.S_NAME||el.__data__?.name);
   const labelNames=[...document.querySelectorAll('#labels g.label')].map(el=>el.querySelector('.town-name')?.textContent);
   return {
    towns:snapshot.validation.towns,regions:snapshot.validation.regions,
    format:snapshot.sourceFormat,names:snapshot.records.map(r=>r.name),
    mapNames,labelNames,missingMembership:snapshot.validation.unresolvedMembership.length,
    missingReading:snapshot.validation.unresolvedReading.length,
    missingCandidates:snapshot.validation.unresolvedCandidates.length,
    allShapeReferencesPreserved:snapshot.records.every((r,i)=>r.geometry===raw.records[i].geometry),
    allPathsPreserved:snapshot.records.every((r,i)=>r.geometry.data===raw.records[i].geometry.data),
    originalGeometryTypes:snapshot.records.map(r=>r.geometry.format==='geojson'?r.geometry.data.geometry.type:'svg-path')
   };
  },city.manifest);
  assert.equal(result.towns,city.towns,city.id+': town count');
  assert.equal(result.regions,city.regions,city.id+': region count');
  assert.equal(result.mapNames.length,city.towns,city.id+': rendered town paths');
  assert.equal(result.labelNames.length,city.labels,city.id+': approved/candidate label elements');
  assert.deepEqual([...new Set(result.names)].sort(),[...new Set(result.mapNames)].sort(),city.id+': map town IDs');
  assert.ok(result.labelNames.every(n=>result.names.includes(n)),city.id+': every label belongs to a source town');
  assert.equal(result.allShapeReferencesPreserved,true);
  assert.equal(result.allPathsPreserved,true);
  assert.equal(result.missingCandidates,city.towns,'source loading does not invent approved labels');
  if(city.id==='takarazuka')assert.equal(result.missingMembership,0,'all SVG memberships supplied');
  // TopoJSON mapping may contain grouped town names; leave unresolved IDs visible.
  assert.deepEqual(errors,[],'page errors');
  console.log('PASS TOWN_SOURCE_VIEW '+JSON.stringify({city:city.id,device:device.id,towns:result.towns,regions:result.regions,
   labelElements:result.labelNames.length,unresolvedMembership:result.missingMembership,unresolvedReading:result.missingReading,
   intactGeometry:result.allPathsPreserved}));
 }finally{await page.close()}
}
(async()=>{
 for(const device of [{id:'chromium-1280',driver:chromium,width:1280,height:800},{id:'webkit-390',driver:webkit,width:390,height:844}]){
  const browser=await device.driver.launch({headless:true});
  try{for(const city of cases)await check(browser,city,device)}
  finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
