// Five-city geography visual and interaction audit; no production UI changes.
// Run under an HTTP server serving the Kussoon site, e.g. node scripts/audit-geography-ui.cjs.
"use strict";
const {chromium,webkit}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const base=process.argv[2]||"http://127.0.0.1:8765";
const outputDir=path.resolve(process.env.GEOGRAPHY_AUDIT_DIR||"geography-ui-audit");
fs.mkdirSync(outputDir,{recursive:true});
const testCases=[
 {name:"iPhone SE width",width:320,height:700,mode:"webkit",mobile:true},
 {name:"iPhone regular",width:390,height:844,mode:"webkit",mobile:true},
 {name:"tablet",width:768,height:1024,mode:"chromium",mobile:false},
 {name:"desktop",width:1280,height:800,mode:"chromium",mobile:false}
];
const cities=[
 {id:"jp-hyogo-nishinomiya",name:"西宮市",search:"岡田山",reading:"おかだやま"},
 {id:"jp-hyogo-takarazuka",name:"宝塚市",search:"すみれガ丘",reading:"すみれがおか"},
 {id:"jp-hyogo-amagasaki",name:"尼崎市",search:"上食満",reading:"かみけま"},
 {id:"jp-hyogo-itami",name:"伊丹市",search:"東桑津",reading:"ひがしくわづ"},
 {id:"jp-hyogo-ashiya",name:"芦屋市",search:"南浜町",reading:"みなみはまちょう"}
];
const results=[];
async function audit(item){
 const browser=await (item.mode==="webkit"?webkit:chromium).launch({headless:true});
 const page=await browser.newPage({viewport:{width:item.width,height:item.height},deviceScaleFactor:2,isMobile:item.mobile,hasTouch:item.mobile});
 const pageErrors=[];page.on("pageerror",e=>pageErrors.push(e.message));
 const issues=[];
 const record=(severity,code,detail)=>issues.push({severity,code,detail});
 const measure=()=>page.evaluate(()=>{
  const buttons=[...document.querySelectorAll("#children a,#towns a")].filter(e=>e.getClientRects().length);
  const input=document.querySelector("#townFilter");
  const linkWidths=buttons.map(e=>({label:e.textContent.trim(),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)}));
  const selected=document.querySelector("#breadcrumbs [aria-current='page']");
  return {clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
   links:linkWidths,searchHeight:input?.getBoundingClientRect().height||null,
   selectedBreadcrumb:!!selected,breadcrumbLinkCount:document.querySelectorAll("#breadcrumbs a").length,
   cityLinks:document.querySelectorAll("#children a").length,
   readingSizes:[...document.querySelectorAll("#towns a .reading")].slice(0,5).map(e=>parseFloat(getComputedStyle(e).fontSize))};
 });
 try{
  await page.goto(base+"/v2/geography/",{waitUntil:"domcontentloaded",timeout:45000});
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="世界");
  // Genuine click sequence, not direct deep linking.
  await page.locator('#children a[href="#jp"]').click();
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="日本");
  await page.locator('#children a[href="#jp-hyogo"]').click();
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="兵庫県");
  const hub=await measure();
  assert.equal(hub.cityLinks,5);
  if(hub.scrollWidth>hub.clientWidth+2)record("high","horizontal-overflow-province",hub);
  const filePrefix=item.name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  await page.screenshot({path:path.join(outputDir,filePrefix+"-province.png"),fullPage:true});
  const reports=[];
  for(const city of cities){
   await page.locator('#children a[href="#'+city.id+'"]').click();
   await page.waitForFunction(name=>document.querySelector("#placeName")?.textContent===name,city.name);
   let dimensions=await measure();
   if(dimensions.scrollWidth>dimensions.clientWidth+2)record("high","horizontal-overflow-city-"+city.id,dimensions);
   assert.ok(dimensions.links.every(e=>e.height>=44),"Municipality entry below 44 CSS px: "+city.id);
   await page.locator('#children a[href="#towns:'+city.id+'"]').click();
   await page.locator("#townFilter").waitFor();
   dimensions=await measure();
   if(dimensions.scrollWidth>dimensions.clientWidth+2)record("high","horizontal-overflow-towns-"+city.id,dimensions);
   if(dimensions.searchHeight<44)record("medium","search-tap-size-"+city.id,dimensions);
   if(!dimensions.selectedBreadcrumb)record("medium","missing-aria-current-"+city.id,"Current location is not indicated by aria-current in breadcrumb");
   if(dimensions.readingSizes.some(n=>n<12))record("medium","small-reading-size-"+city.id,dimensions.readingSizes);
   await page.locator("#townFilter").fill(city.search);
   await page.waitForFunction(name=>document.querySelector("#towns a")?.textContent.includes(name),city.search);
   const count=await page.locator("#towns a").count();
   assert.ok(count>=1,"Search did not find "+city.search);
   const hit=page.locator("#towns a").filter({hasText:city.search}).first();
   await hit.click();
   await page.waitForFunction(name=>document.querySelector("#placeName")?.textContent===name,city.search);
   assert.match(await page.locator("#placeReading").textContent(),new RegExp(city.reading));
   const townDetail=await measure();
   if(townDetail.scrollWidth>townDetail.clientWidth+2)record("high","horizontal-overflow-town-detail-"+city.id,townDetail);
   const back=page.locator('a[href="#towns:'+city.id+'"]').last();
   await back.click();
   await page.locator("#townFilter").waitFor();
   await page.locator("#breadcrumbs a[href='#jp-hyogo']").click();
   await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="兵庫県");
   reports.push({city:city.name,search:city.search,resultCount:count,townReadingsOk:true,layout:dimensions,detailLayout:townDetail});
  }
  // Keyboard behavior, using a direct page for predictable focus.
  await page.goto(base+"/v2/geography/#towns:jp-hyogo-ashiya",{waitUntil:"domcontentloaded"});
  await page.locator("#townFilter").waitFor();
  await page.locator("#townFilter").focus();
  await page.keyboard.type("南浜町");
  const keyboardResults=await page.locator("#towns a").count();
  assert.equal(keyboardResults,1,"Keyboard-driven town search failed");
  const current=await page.locator("#breadcrumbs [aria-current='page']").count();
  if(current===0)record("medium","missing-aria-current","Breadcrumb lacks an aria-current page indicator");
  assert.deepEqual(pageErrors,[],"Client-side JS error(s) in "+item.name);
  const result={viewport:item,name:item.name,result:"PASS",cities:reports.length,issues,hub,keyboardResults,pageErrors};
  results.push(result);
  console.log("PASS "+item.name+": 5 cities, user navigation, town search, back, keyboard, layout audit");
  for(const x of issues)console.log("AUDIT "+item.name+" "+x.severity+" "+x.code+": "+JSON.stringify(x.detail).slice(0,350));
 }finally{await browser.close()}
}
(async()=>{
 for(const item of testCases)await audit(item);
 fs.writeFileSync(path.join(outputDir,"report.json"),JSON.stringify({audit:"2026-11-14 geography five-city UI",results},null,2)+"\n");
 const summary={testedViewports:testCases.map(c=>c.name),cityNavigationFlows:results.length*cities.length,high:results.flatMap(x=>x.issues).filter(x=>x.severity==="high").length,medium:results.flatMap(x=>x.issues).filter(x=>x.severity==="medium").length};
 console.log("AUDIT SUMMARY "+JSON.stringify(summary));
})().catch(e=>{console.error(e);process.exitCode=1});
