'use strict';
// Browser-only instrumentation observes Leaflet objects; no production debug API is added.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium,webkit}=require(require.resolve('playwright',{paths:[path.join(__dirname,'browser')]}));
const root=path.resolve(__dirname,'../..'),target=process.env.KUSSOON_BREAD_HTML||path.join(root,'maps/unified-bread-map.html');
const out=process.env.KUSSOON_BROWSER_ARTIFACTS||path.join(root,'work/bread-marker-refresh');
const instrument=`L.Map.addInitHook(function(){window.testMap=this});window.testMarkers=[];const originalMarker=L.marker;L.marker=function(...args){const marker=originalMarker.apply(this,args);testMarkers.push(marker);return marker};if(L.markerClusterGroup){const originalGroup=L.markerClusterGroup;L.markerClusterGroup=function(...args){return window.testCluster=originalGroup.apply(this,args)}};`;
const result=[];
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const fixture=await fs.readFile(process.env.KUSSOON_CLUSTER_FIXTURE);
 assert.equal(crypto.createHash('sha256').update(fixture).digest('hex'),'1e4e1d22972a3926f48598e0caf14e3fe7049835d428a344fed4f9e3665b3508');
 const html=await fs.readFile(target,'utf8');
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html.replace("<script>\n(()=>{'use strict';",`<script>${instrument}</script><script>\n(()=>{'use strict';`))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{for(const engine of (process.env.KUSSOON_BROWSER_ENGINES||'chromium,webkit').split(','))for(const width of [1440,390])for(const failed of [false,true]){
 const browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'&&process.env.KUSSOON_CHROMIUM?{executablePath:process.env.KUSSOON_CHROMIUM,args:['--no-sandbox']}:{} )});
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],label=`${engine}-${width}-${failed?'fallback':'cluster'}`;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{const url=r.request().url();if(url.includes('/leaflet.markercluster.js'))return failed?r.abort():r.fulfill({contentType:'application/javascript',body:fixture});return url===origin+'/'?r.continue():r.abort()});
 const checkpoints=[];
 async function snapshot(){return page.evaluate(()=>({shown:__breadCheck().shown,zoom:testMap.getZoom(),animation:window.testCluster?._inZoomAnimation??null,clusterCount:window.testCluster?.getLayers().length??null,rendered:window.testCluster?._featureGroup.getLayers().length??null,markers:testMarkers.filter(m=>m.getElement()?.isConnected).map(m=>{const el=m.getElement(),p=testMap.latLngToContainerPoint(m.getLatLng()),size=testMap.getSize();return {lat:m.getLatLng().lat,lng:m.getLatLng().lng,title:m.options.title,inside:p.x>=0&&p.x<=size.x&&p.y>=0&&p.y<=size.y,opacity:getComputedStyle(el).opacity}})}))}
 async function open(){await page.goto(origin);await page.waitForFunction(()=>window.__breadCheck);await page.waitForTimeout(400)}
 try{
 await open();const data=JSON.parse(await page.locator('#bread-data').textContent()),byNo=n=>data.find(s=>s['No.']===n);
 assert.equal((await snapshot()).shown.length,262);assert.equal(await page.evaluate(()=>!!window.testCluster),!failed);
 if(failed){assert.equal(await page.locator('.mapnote').count(),1);assert.match(await page.locator('.mapnote').innerText(),/個別表示/)}
 // The final marker must be attached, visible and inside the map at its source coordinates.
 async function check(n){const x=byNo(n);const s=await snapshot();assert(s.shown.includes(n),label+' search No.'+n);assert(s.markers.some(m=>m.lat===x['緯度']&&m.lng===x['経度']&&m.inside&&m.opacity!=='0'),label+' missing pin No.'+n+' '+JSON.stringify(s));assert.match(await page.locator('#detail').innerText(),new RegExp(x['店名'].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));checkpoints.push({no:n,...s})}
 async function search(n,rapid=false){const x=byNo(n);if(rapid){await page.evaluate(name=>{const input=document.querySelector('#search');input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#list .item').click()},x['店名'])}else{await page.fill('#search',x['店名']);await page.locator('#list .item').filter({hasText:x['店名']}).first().click()}}
 for(const n of [17,97,107,111,112,113,114,207,209]){await open();await search(n);await page.waitForTimeout(400);await check(n)}
 // Reload before each burst to include the first fit from the five-city overview.
 for(const order of [[17,97,107,111],[111,107,97,17]])for(let repeat=0;repeat<3;repeat++){
 await open();for(const n of order){await search(n,true);await check(n)}await page.waitForTimeout(500);await check(order.at(-1));
 }
 // Real browser fill/click actions as well as the controlled sub-300ms burst above.
 await open();for(const n of [17,97,107,111]){await search(n);await check(n)}
 for(const city of ['西宮市','芦屋市','尼崎市','宝塚市','伊丹市']){
 await page.locator('#reset').click();for(const cb of await page.locator('#cities input').all()){if(await cb.inputValue()!==city)await cb.uncheck()}
 const s=await snapshot();assert(s.shown.length>0);assert(s.shown.every(n=>byNo(n).city===city));
 const x=data.find(x=>x.city===city&&x.status==='通常掲載'&&typeof x['緯度']==='number');await search(x['No.']);await page.waitForTimeout(400);await check(x['No.']);
 }
 await page.locator('#reset').click();await page.selectOption('#kind','施設内ベーカリー');assert((await snapshot()).shown.every(n=>byNo(n).type_group==='施設内ベーカリー'));
 await page.locator('#reset').click();const ref=data.find(s=>s.status==='参考候補'&&typeof s['緯度']==='number');await search(ref['No.']);await page.waitForTimeout(400);await check(ref['No.']);assert(await page.locator('#map .pin.ref').count()>0);assert.match(await page.locator('#detail').innerText(),/参考候補/);
 await page.locator('#reset').click();await search(111);await page.waitForTimeout(400);await check(111);
 await page.locator('#map .leaflet-marker-icon').first().click();await page.locator('.bread-pin-detail').click();await page.locator('#detail .detail-map-return').click();assert.equal(await page.locator('#breadPinPanel').isVisible(),true);
 for(const selector of ['.leaflet-control-zoom-in','.leaflet-control-zoom-out','.leaflet-control-all a']){await page.locator(selector).click();await page.waitForTimeout(500);await check(111)}
 await page.locator('#reset').click();await page.waitForTimeout(400);assert(await page.locator('#map .pin.multi').count()>0);if(!failed)assert(await page.locator('#map .marker-cluster').count()>0);
 await page.fill('#search','SAILOR');assert.equal((await snapshot()).shown.length,0);assert.equal((await snapshot()).markers.length,0);
 await page.fill('#search','存在しない店舗xyz');assert.equal((await snapshot()).shown.length,0);
 await search(111);await page.waitForTimeout(400);await check(111);assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(out,label+'.png'),fullPage:true});result.push({label,status:'PASS',checkpoints});console.log('PASS '+label);
 }catch(e){result.push({label,status:'FAIL',message:e.message,errors,checkpoints});await page.screenshot({path:path.join(out,label+'-failure.png'),fullPage:true});throw e}
 finally{await fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser.close()}
 }}finally{await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
