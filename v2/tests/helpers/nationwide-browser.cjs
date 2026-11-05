'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const {chromium,webkit,devices}=require(require.resolve('playwright',{paths:[path.join(__dirname,'../browser')]}));
async function start({engine=process.env.KUSSOON_BROWSER_ENGINE||'chromium',contextOptions={},query=''}={}){
 assert(['chromium','webkit'].includes(engine),'supported browser engine');
 const server=http.createServer(async(req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.js')?'application/javascript':file.endsWith('.json')||file.endsWith('.topojson')||file.endsWith('.geojson')?'application/json':'application/octet-stream');res.end(data);}
  catch{res.writeHead(404).end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{...(process.env.KUSSOON_CHROMIUM?{executablePath:process.env.KUSSOON_CHROMIUM}:{}),args:['--no-sandbox']}:{} )});}
 catch(error){await new Promise(resolve=>server.close(resolve));throw error;}
 const context=await browser.newContext({viewport:{width:1280,height:1000},...contextOptions});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const open=async()=>{await page.goto(origin+'/v2/national/official-2026-nationwide-pilot.html'+(query?'?'+query:''));await page.locator('#map .prefecture').first().waitFor();assert.equal(await page.locator('#map .prefecture').count(),47);};
 async function choose(id,value){
  const owner=await page.locator('#'+id).evaluate(n=>n.closest('details')?.id||'');
  const unfold=owner&&!(await page.locator('#'+owner).evaluate(n=>n.open));
  if(unfold)await page.locator('#'+owner+' > summary').click();
  await page.selectOption('#'+id,value);
  if(unfold)await page.locator('#'+owner+' > summary').click();
 }
 const pref=async code=>{await choose('pref',code);await page.waitForFunction(code=>document.querySelector('#pref').value===code&&document.querySelector('#map [data-code]')&&!document.querySelector('#status').textContent.includes('読み込み中'),code);};
 const select=async code=>{await choose('region',code);await page.locator('#map .chosen[data-code="'+code+'"]').waitFor();await page.locator('#officePopup').waitFor();};
 const readings=async mode=>{if(await page.inputValue('#readingMode')!==mode)await page.click('#mapReadingToggle');};
 const snapshot=()=>page.locator('#map').evaluate(map=>({viewBox:map.getAttribute('viewBox'),paths:[...map.querySelectorAll('[data-code]')].map(p=>[p.dataset.code,p.getAttribute('d')]),selected:map.querySelector('.chosen')?.dataset.code||'',popupHidden:document.querySelector('#officePopup').hidden}));
 async function close(){
  if(process.env.KUSSOON_BROWSER_ARTIFACTS){const dir=process.env.KUSSOON_BROWSER_ARTIFACTS,name=path.basename(process.argv[1],'.cjs');await fs.mkdir(dir,{recursive:true});await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});await fs.writeFile(path.join(dir,name+'-errors.json'),JSON.stringify(errors,null,2));}
  await browser.close();await new Promise(resolve=>server.close(resolve));
 }
 return {browser,context,page,errors,open,pref,select,readings,snapshot,close};
}
module.exports={start,devices};
