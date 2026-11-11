'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('./browser/node_modules/playwright');
const root=path.resolve(__dirname,'../..');
const target='v2/verification/bread-coordinate-audit/20261111/index.html';
const out=process.env.KUSSOON_BROWSER_ARTIFACTS||path.join(root,'tmp/bread-coordinate-browser');
(async()=>{
 const source=await fs.readFile(path.join(root,target),'utf8');
 const data=JSON.parse(source.match(/id="audit-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.length,263);assert.equal(new Set(data.map(x=>x.no)).size,263);assert.equal(new Set(data.map(x=>x.key)).size,263);
 assert.deepEqual(Object.fromEntries('ABCDE'.split('').map(c=>[c,data.filter(x=>x.code===c).length])),{A:4,B:53,C:137,D:4,E:65});
 assert.equal(data.filter(x=>x.status==='通常掲載').length,245);assert.equal(data.filter(x=>x.status==='参考候補').length,17);assert.equal(data.filter(x=>x.status==='閉店履歴').length,1);
 assert.deepEqual(data.filter(x=>x.candidate_lat!==null).map(x=>x.no),[111,112,113,114]);
 assert(data.every(x=>x.candidate_lat===null||x.code==='A'&&x.evidence_urls.length>=3));
 assert.equal(data.filter(x=>x.distance_m===null).length,67);assert(source.includes('noindex,nofollow,noarchive'));
 const server=http.createServer((req,res)=>{if(req.url!=='/'+target){res.writeHead(404);return res.end('Not Found')}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(source)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));await fs.mkdir(out,{recursive:true});let results=[];
 try{for(const [engine,type]of Object.entries({chromium,webkit}))for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const browser=await type.launch({headless:true});let page;
  try{page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   // Deliberately test without network tiles; this is not a basemap or geolocation check.
   await page.route('https://*.tile.openstreetmap.org/**',r=>r.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}/${target}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.auditView);
   assert.equal((await page.evaluate(()=>window.auditView)).visible,263);
   await page.selectOption('#code','A');assert.equal((await page.evaluate(()=>window.auditView)).candidateCount,4);
   await page.fill('#search','114');await page.locator('.record').click();await page.waitForFunction(()=>document.querySelector('#detail').textContent.includes('202.9 m'));
   assert.equal((await page.evaluate(()=>window.auditView)).visible,1);assert((await page.locator('#detail').innerText()).includes('34.7241557'));
   await page.click('#candidate');assert.equal((await page.evaluate(()=>window.auditView)).markers,1);
   await page.click('#current');assert.equal((await page.evaluate(()=>window.auditView)).markers,1);
   await page.click('#both');assert.equal((await page.evaluate(()=>window.auditView)).markers,3);
   await page.screenshot({path:path.join(out,`${engine}-${viewport.width}-no114-offline.png`),fullPage:true});
   await page.fill('#search','');await page.selectOption('#code','E');assert.equal((await page.evaluate(()=>window.auditView)).visible,65);assert.equal((await page.evaluate(()=>window.auditView)).candidateCount,0);
   await page.selectOption('#code','');await page.selectOption('#city','宝塚市');assert.equal((await page.evaluate(()=>window.auditView)).visible,18);
   await page.click('#fit');await page.selectOption('#city','');await page.fill('#search','SAILOR');await page.locator('.record').click();assert((await page.locator('#detail').innerText()).includes('閉店履歴'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');assert.deepEqual(errors,[],'uncaught browser errors');
   results.push({engine,viewport,status:'passed',basemap:'deliberately offline',iphoneSafari:'not tested'});
  }finally{if(page)await page.screenshot({path:path.join(out,`${engine}-${viewport.width}-last-state.png`),fullPage:true}).catch(()=>{});await browser.close();}
 }}finally{await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
