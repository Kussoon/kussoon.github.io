'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const{start}=require('./helpers/nationwide-browser.cjs');const out=process.env.KUSSOON_BROWSER_ARTIFACTS;
(async()=>{for(const engine of['chromium','webkit'])for(const width of[1440,390]){
 const app=await start({engine,contextOptions:{viewport:{width,height:1000}}}),{page}=app;let errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 const cluster=await fs.readFile(process.env.KUSSOON_CLUSTER_FIXTURE,'utf8');
 await page.route('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:cluster}));
 // The helper supplies a page but its open() targets a different map. Open a local path using the server origin from its first request.
 await app.open();const origin=new URL(page.url()).origin;
 await page.goto(origin+'/v2/verification/bread-coordinate-audit/20261111-ikari-fix/unified-bread-map-v1.3.12-verification-20261111.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__breadCheck).catch(e=>{throw Error(e.message+' startup errors='+JSON.stringify(errors))});assert.equal(await page.evaluate(()=>typeof L.markerClusterGroup),'function');let state=await page.evaluate(()=>window.__breadCheck());assert.equal(state.records,263);assert.equal(state.shown.length,262);assert.equal(state.normal,245);assert.equal(state.reference,17);assert(!state.shown.includes(135));
 const coords={111:[34.7610821,135.3296146],112:[34.7491001,135.3264789],113:[34.756458,135.3574459],114:[34.7241557,135.3640379]};
 const data=await page.locator('#bread-data').textContent();for(const[no,pt]of Object.entries(coords)){let x=JSON.parse(data).find(x=>x['No.']===+no);assert.deepEqual([x['緯度'],x['経度']],pt)}
 await page.fill('#search','いかり甲子園');await page.waitForFunction(()=>window.__breadCheck().shown.length===1);assert.deepEqual((await page.evaluate(()=>window.__breadCheck())).shown,[114]);
 await page.locator('#list .item').first().click();await page.locator('#detail').waitFor({state:'visible'});assert((await page.locator('#detail').innerText()).includes('甲子園六番町17-10'));assert.equal(await page.locator('#list .selected').count(),1);
 await page.locator('#map .leaflet-marker-icon').first().click();await page.locator('.bread-pin-detail').waitFor({state:'visible'});await page.locator('.bread-pin-detail').click();await page.locator('#detail').waitFor({state:'visible'});
 await page.locator('#detail .detail-map-return').click();await page.locator('.leaflet-control-zoom-in').click();await page.locator('.leaflet-control-zoom-out').click();await page.locator('.leaflet-control-all a').click();
 await page.click('#reset');await page.locator('#cities input').first().uncheck();await page.waitForFunction(()=>window.__breadCheck().shown.length<262);await page.click('#reset');await page.selectOption('#kind','施設内ベーカリー');assert((await page.evaluate(()=>window.__breadCheck())).shown.length<262);await page.click('#reset');
 const ref=JSON.parse(data).find(x=>x.status==='参考候補');await page.fill('#search',ref['店名']);await page.locator('#list .item').first().click();assert((await page.locator('#detail').innerText()).includes('参考候補'));assert(await page.locator('#map .pin.ref').count()>0);
 await page.fill('#search','SAILOR');assert.equal((await page.evaluate(()=>window.__breadCheck())).shown.length,0);
 await page.fill('#search','いかり甲子園');await page.locator('#list .item').first().click();await fs.mkdir(out,{recursive:true});await page.screenshot({path:path.join(out,`ikari-${engine}-${width}.png`),fullPage:true});assert.deepEqual(errors,[]);console.log('PASS corrected map '+engine+' '+width+'; 263/245/17/1; search/pin/detail/list/reference/zoom; external tiles offline; Safari device not tested');
 }finally{await app.close()}
}})().catch(e=>{console.error(e);process.exitCode=1});
