#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,webkit}=require(path.resolve(__dirname,'../../tests/browser/node_modules/playwright'));
const root=path.resolve(__dirname,'../../..'),engine=process.env.KUSSOON_BROWSER_ENGINE||'chromium',browserType=engine==='webkit'?webkit:chromium;
const output=process.env.KUSSOON_BROWSER_ARTIFACTS||path.join(root,'artifacts/coastline-trial');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.topojson':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(pathname.endsWith('/'))file=path.join(file,'index.html');fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);});});
(async()=>{
 await fs.promises.mkdir(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();let browser;
 try{
  browser=await browserType.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${address.port}/v2/verification/coastline-accessibility/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelectorAll('.map-card').length===3,{timeout:60000});
  const cases=[['miyako','沖縄県・宮古諸島'],['okinawa','沖縄県・全域'],['amami','鹿児島県・奄美諸島'],['goto','長崎県・五島列島'],['hiroshima','広島県・瀬戸内海'],['kagawa','香川県・瀬戸内海'],['tokyo','東京都・東京湾周辺'],['hyogo','兵庫県・西宮周辺'],['hokkaido','北海道・全域']];
  for(const [key,label] of cases){
   await page.selectOption('#place',key);await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('共有TopoJSONアーク'),{timeout:60000});
   assert((await page.locator('.map-card svg path.land').count())>0,engine+' '+label+' has no polygons');
   for(let i=0;i<3;i++){assert.equal(await page.locator('.map-card').nth(i).locator('svg path.borders').count(),1,engine+' '+label+' has a single shared border path');assert.equal(await page.locator('.map-card').nth(i).locator('svg path.land[stroke]').count(),0,'polygons must remain fill-only');}
   assert.equal(await page.locator('.map-card.existing path.coast-candidate').count(),0);
   assert.equal(await page.locator('.map-card.coast-only path.coast-candidate').count(),1);
   assert.equal(await page.locator('.map-card.all-dark path.coast-candidate').count(),1);
   const boxes=await page.locator('.map-card svg').evaluateAll(nodes=>nodes.map(x=>{const r=x.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];}));assert(boxes.every(b=>b[0]===boxes[0][0]&&b[1]===boxes[0][1]),engine+' '+label+' variants must have identical dimensions');
   const before=await page.locator('.map-card svg').first().getAttribute('viewBox');await page.locator('#zoomIn').click();let views=await page.locator('.map-card svg').evaluateAll(xs=>xs.map(x=>x.getAttribute('viewBox')));assert.equal(new Set(views).size,1,engine+' zoom must synchronize');assert.notEqual(views[0],before,engine+' zoom must change the viewport');await page.locator('#reset').click();
   const first=await page.locator('.map-card svg').first().boundingBox();await page.mouse.move(first.x+first.width/2,first.y+first.height/2);await page.mouse.down();await page.mouse.move(first.x+first.width/2+18,first.y+first.height/2+9);await page.mouse.up();views=await page.locator('.map-card svg').evaluateAll(xs=>xs.map(x=>x.getAttribute('viewBox')));assert.equal(new Set(views).size,1,engine+' drag must synchronize');await page.locator('#reset').click();
   const safe=key.replace(/[^a-z0-9-]/gi,'-');await page.screenshot({path:path.join(output,`coastline-${engine}-${safe}.png`),fullPage:true});console.log(`PASS ${engine}: ${label}`);
  }
  assert.deepEqual(errors,[],engine+' browser errors');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
