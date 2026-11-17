'use strict';
// V37: confirm whether Leaflet C ghost tooltips persist after the synchronous
// region-select DOM update, and show their actual Leaflet layer ownership.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out='nishinomiya-v37-tooltip-settle';fs.mkdirSync(out,{recursive:true});
const origin=process.env.NISHINOMIYA_TEST_BASE||'http://127.0.0.1:8765';
const configs=[['pc-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
const url='/v2/nishinomiya-town-study-c.html';
const hook=`window.__townTooltipAudit=()=>{
 const rect=document.querySelector('#map').getBoundingClientRect();
 const all=[...document.querySelectorAll('.leaflet-tooltip.town-label')];
 const rows=all.map(el=>{
  const name=el.querySelector('span')?.firstChild?.textContent||'';
  const town=items.find(it=>it.name===name);
  const matches=(town?.labels||[]).filter(m=>m.getElement()===el);
  const r=el.getBoundingClientRect();
  return {name,dom:!!el.isConnected,mapLayer:matches.some(m=>map.hasLayer(m)),
   boundToActive:matches.some(m=>town.layer.getTooltip()===m),
   boundToFull:matches.some(m=>town.fullLayer?.getTooltip()===m),
   boundToRegional:matches.some(m=>Object.values(town.regionLayers||{}).some(l=>l.getTooltip()===m)),
   parentClass:el.parentElement?.className||'',
   center:[+(r.left+r.width/2-rect.left).toFixed(2),+(r.top+r.height/2-rect.top).toFixed(2)]};
 });
 return {region:communityChoice,count:rows.length,active:scopeItems().length,upper:rows.filter(x=>x.name==='上甲東園'),
  unbound:rows.filter(x=>!x.boundToActive),unregistered:rows.filter(x=>!x.mapLayer),rows:rows.filter(x=>x.name==='上甲東園')};
};\n`;
async function load(browser,cfg){
 const page=await browser.newPage({viewport:{width:cfg[2],height:cfg[3]},deviceScaleFactor:2,isMobile:cfg[2]<600,hasTouch:cfg[2]<600});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**'+url+'*',async route=>{
  const response=await route.fetch(),html=await response.text(),marker="Promise.all([fetch('/v2/data/nishinomiya-town-v2-premerged.topojson')";
  assert.equal(html.split(marker).length,2,'unique hook marker');
  await route.fulfill({response,body:html.replace(marker,hook+marker),headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 await page.goto(origin+url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('321町名'),null,{timeout:60000});
 return {page,errors};
}
(async()=>{
 for(const cfg of configs){
  const browser=await cfg[1].launch({headless:true});
  try{
   const {page,errors}=await load(browser,cfg),result=[];
   const snap=async label=>{result.push({stage:label,...await page.evaluate(()=>window.__townTooltipAudit())})};
   const pick=async region=>page.evaluate(n=>{const btn=[...document.querySelectorAll('#communityOptions button[data-community]')].find(b=>b.dataset.community===n);if(!btn)throw Error('missing '+n);btn.click()},region);
   await snap('initial');
   await pick('上ヶ原');await snap('uekoto-immediate');
   for(const wait of [50,300,800]){await page.waitForTimeout(wait);await snap('uekoto-after-'+wait)}
   await pick('今津');await snap('imazu-immediate');
   await page.waitForTimeout(500);await snap('imazu-after-500');
   await pick('');await snap('whole-immediate');
   await page.waitForTimeout(600);await snap('whole-after-600');
   await pick('上ヶ原');await snap('uekoto-second-immediate');
   await page.waitForTimeout(500);await snap('uekoto-second-after-500');
   assert.deepEqual(errors,[]);
   fs.writeFileSync(path.join(out,cfg[0]+'.json'),JSON.stringify(result,null,2));
   console.log('V37_TOOLTIP_SETTLE '+JSON.stringify({screen:cfg[0],states:result.map(({stage,region,count,active,upper,unregistered,unbound})=>({stage,region,count,active,upper,unregistered:unregistered.length,unbound:unbound.length}))}));
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
