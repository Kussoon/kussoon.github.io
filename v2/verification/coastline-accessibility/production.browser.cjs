#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,webkit}=require(path.resolve(__dirname,'../../tests/browser/node_modules/playwright'));
const root=path.resolve(__dirname,'../../..'),engine=process.env.KUSSOON_BROWSER_ENGINE||'chromium',type=engine==='webkit'?webkit:chromium;
const output=process.env.KUSSOON_BROWSER_ARTIFACTS||path.join(root,'artifacts/coastline-trial');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.topojson':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(pathname.endsWith('/'))file=path.join(file,'index.html');fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);});});
(async()=>{
 await fs.promises.mkdir(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();let browser;
 try{
  browser=await type.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const base='http://127.0.0.1:'+addr.port;
  for(const geometry of ['main','worker']){
   await page.goto(base+'/maps/national-municipalities.html'+(geometry==='main'?'?geometry=main':''),{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>{const p=document.querySelector('#map path.coastlines');return p&&p.getAttribute('d')?.length>0;},{timeout:90000});
   assert.equal(await page.locator('#map path.coastlines').count(),1,engine+' national '+geometry+' should render one exterior path');
   assert.equal(await page.locator('#map path.borders').count(),1,engine+' national '+geometry+' should render one shared border path');
   assert.equal(await page.locator('#map path.land[stroke]:not([stroke="none"])').count(),0,'municipality polygons must remain fill-only');
   const stroke=await page.locator('#map path.coastlines').evaluate(node=>getComputedStyle(node).stroke);
   assert.equal(stroke,'rgb(72, 101, 116)',engine+' national coastline color');
   await page.screenshot({path:path.join(output,'official-national-'+engine+'-'+geometry+'.png'),fullPage:true});
   console.log('PASS '+engine+' national map '+geometry+' renderer');
  }
  for(const mode of ['1','2']){
   await page.goto(base+'/v2/municipalities/hyogo/quiz.html?mode='+mode,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>{const p=document.querySelector('#map path.coastlines');return p&&p.getAttribute('d')?.length>0;},{timeout:90000});
   assert.equal(await page.locator('#map path.coastlines').count(),1,engine+' quiz '+mode+' one exterior path');
   assert.equal(await page.locator('#map path.borders').count(),1,engine+' quiz '+mode+' one internal border path');
   assert.equal(await page.locator('#map path.land[stroke]:not([stroke="none"])').count(),0,'quiz polygons must remain fill-only');
   const ocean=await page.locator('#map').evaluate(node=>getComputedStyle(node).backgroundColor);
   assert.equal(ocean,'rgb(216, 235, 247)',engine+' quiz sea color');
   await page.screenshot({path:path.join(output,'quiz-'+engine+'-'+mode+'.png'),fullPage:true});
   console.log('PASS '+engine+' Hyogo quiz '+mode);
  }
  assert.deepEqual(errors,[],engine+' production coastline browser errors');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
