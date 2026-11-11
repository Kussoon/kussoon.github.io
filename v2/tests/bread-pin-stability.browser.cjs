'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {start}=require('./helpers/nationwide-browser.cjs');
const clusterUrl='https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
const target='/maps/unified-bread-map.html';
const screenshotDir=process.env.KUSSOON_BROWSER_ARTIFACTS;

(async()=>{
  const cluster=await fs.readFile(process.env.KUSSOON_CLUSTER_FIXTURE,'utf8');
  for(const engine of ['chromium','webkit'])for(const width of [1440,390]){
    const app=await start({engine,contextOptions:{viewport:{width,height:1000}}}),page=app.page;
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await page.route(clusterUrl,route=>route.fulfill({
        status:200,contentType:'application/javascript',
        body:cluster+'\nwindow.__breadMarkers=[];const __breadOriginalMarker=L.marker;L.marker=function(...args){const marker=__breadOriginalMarker.apply(this,args);window.__breadMarkers.push(marker);return marker;};'
      }));
      await app.open();
      const origin=new URL(page.url()).origin;
      await page.goto(origin+target,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>typeof window.__breadCheck==='function');
      assert.equal(await page.evaluate(()=>typeof L.markerClusterGroup),'function');
      let state=await page.evaluate(()=>window.__breadCheck());
      assert.equal(state.records,263);
      assert.equal(state.shown.length,262);
      assert.equal(state.normal,245);
      assert.equal(state.reference,17);
      assert(!state.shown.includes(135));
      const coords=await page.evaluate(()=>Object.fromEntries(JSON.parse(document.querySelector('#bread-data').textContent).filter(s=>[17,97,107,111].includes(s['No.'])).map(s=>[s['No.'],{name:s['店名'],lat:s['緯度'],lon:s['経度']}])));

      async function checkStore(no){
        const s=coords[no];
        await page.fill('#search',s.name);
        await page.waitForFunction(id=>window.__breadCheck().shown.length===1&&window.__breadCheck().shown[0]===id,no);
        await page.locator('#list .item').first().click();
        await page.waitForFunction(pt=>window.__breadMarkers.some(m=>{
          const pos=m.getLatLng(),el=m.getElement();
          return pos.lat===pt[0]&&pos.lng===pt[1]&&el&&el.isConnected&&el.getBoundingClientRect().width>0;
        }),[s.lat,s.lon],{timeout:5000});
        assert(await page.locator('#detail').isVisible());
      }
      for(const no of [17,97,107,111,107,17,111])await checkStore(no);
      await page.fill('#search','');
      await page.waitForFunction(()=>window.__breadCheck().shown.length===262);
      await checkStore(111);
      assert.deepEqual(errors,[]);

      // Simulate a genuine CDN failure, not a synthetic mock of the map's fallback.
      await page.unroute(clusterUrl);
      await page.route(clusterUrl,route=>route.abort('failed'));
      await page.goto(origin+target,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>typeof window.__breadCheck==='function');
      assert.equal(await page.evaluate(()=>typeof L.markerClusterGroup),'undefined');
      assert.equal(await page.locator('.mapnote[role="status"]').count(),1);
      assert((await page.locator('.mapnote').innerText()).includes('個別表示'));
      await page.fill('#search',coords[111].name);
      await page.waitForFunction(()=>window.__breadCheck().shown.length===1);
      await page.locator('#map .leaflet-marker-icon').first().waitFor({state:'visible',timeout:5000});
      await page.locator('#list .item').first().click();
      assert(await page.locator('#detail').isVisible());
      assert.deepEqual(errors,[]);
      if(screenshotDir){
        await fs.mkdir(screenshotDir,{recursive:true});
        await page.screenshot({path:path.join(screenshotDir,'fallback-'+engine+'-'+width+'.png'),fullPage:true});
      }
      console.log('PASS '+engine+' '+width+' rapid search 17/97/107/111; single pin visible; missing MarkerCluster fallback; 263/245/17/1');
    }finally{await app.close()}
  }
})().catch(e=>{console.error(e);process.exitCode=1});
