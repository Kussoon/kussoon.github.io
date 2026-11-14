// Browser smoke tests for Nishinomiya V2 C. Requires "playwright" and a local HTTP server.
// Usage: node scripts/smoke-nishinomiya-town-v2.cjs [base-url]
// Runs Chromium desktop and WebKit mobile emulation (not a physical iPhone).
"use strict";
const {chromium,webkit}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const screenshotDir=path.resolve(process.env.SMOKE_SCREENSHOTS||"site-smoke-screenshots");
fs.mkdirSync(screenshotDir,{recursive:true});
const base=process.argv[2]||"http://127.0.0.1:8765";
const URL=base+"/v2/nishinomiya-town-study-c.html";

async function chooseRegion(page,name){
 const menu=page.locator("#communitySelect");
 await menu.click();
 await page.locator('#communityOptions button[data-community="'+name+'"]').click();
 await page.waitForFunction(label=>document.querySelector("#communitySelected").textContent.includes(label),name||"西宮市");
}
async function basicFlow(browserType,title,viewport,columns){
 const browser=await browserType.launch({headless:true});
 const page=await browser.newPage({viewport,deviceScaleFactor:2,hasTouch:columns===4,isMobile:columns===4});
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 try{
  await page.goto(URL,{waitUntil:"domcontentloaded",timeout:40000});
  await page.waitForFunction(()=>document.querySelector("#communityCount")?.textContent.includes("321"),null,{timeout:40000});
  assert.equal(await page.locator("#communityOptions button").count(),27);
  await page.locator("#communitySelect").click();
  assert.equal(await page.locator("#communityOptions").evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(" ").length),columns);
  const allReadings=await page.locator("#communityOptions button[data-community]:not([data-community='']) .community-reading").allTextContents();
  await page.screenshot({path:path.join(screenshotDir,columns===4?"mobile-regions.png":"desktop-regions.png"),fullPage:true});
  const pickerLayout=await page.locator("#communityOptions").evaluate(panel=>({
    bodyWidth:document.documentElement.clientWidth,
    bodyScrollWidth:document.documentElement.scrollWidth,
    columns:getComputedStyle(panel).gridTemplateColumns.split(" ").length,
    buttonCount:panel.querySelectorAll("button").length
  }));
  assert.ok(pickerLayout.bodyScrollWidth<=pickerLayout.bodyWidth+2,
    "region picker creates horizontal page overflow: "+JSON.stringify(pickerLayout));
  assert.equal(allReadings.length,26);assert.ok(allReadings.every(t=>t.trim()));
  await page.locator("#communityOptions button[data-community='上ヶ原']").click();
  await page.waitForFunction(()=>document.querySelector("#communityCount").textContent.includes("18町名"));
  assert.match(await page.locator("#communitySelected").textContent(),/うえがはら/);
  assert.match(await page.locator("#regionBoundaryNote").textContent(),/岡田山/);
  await page.screenshot({path:path.join(screenshotDir,columns===4?"mobile-uegahara.png":"desktop-uegahara.png"),fullPage:true});
  const polygon=page.locator("#map path.leaflet-interactive").first();
  await polygon.waitFor();
  const bounds=await polygon.boundingBox();
  await page.locator("#quizOne").click();
  assert.match(await page.locator("#quizQuestion").textContent(),/（.+）/);
  assert.equal(await page.locator("#reading").isVisible(),false);
  const inQuiz=await polygon.boundingBox();
  assert.ok(bounds&&inQuiz&&Math.abs(bounds.width-inQuiz.width)<=2,"quiz 1 changed map scale");
  await page.locator("#quizReveal").click();
  assert.match(await page.locator("#quizFeedback").textContent(),/答えは/);
  await page.locator("#quizQuit").click();
  assert.match(await page.locator("#quizResult").textContent(),/途中終了/);
  assert.equal(await page.locator("#quizRetryWrong").isEnabled(),true);
  await page.locator("#quizRetryWrong").click();
  assert.match(await page.locator("#quizProgress").textContent(),/1 \/ 1問/);
  await page.locator("#quizQuit").click();
  await page.locator("#quizTwo").click();
  assert.equal(await page.locator("#quizChoices button").count(),4);
  assert.ok((await page.locator("#quizChoices button").allTextContents()).every(t=>/（.+）/.test(t)));
  await page.locator("#quizQuit").click();
  await chooseRegion(page,"広田");
  assert.match(await page.locator("#communitySelected").textContent(),/ひろた/);
  assert.match(await page.locator("#regionBoundaryNote").textContent(),/1〜3番/);
  const purple=page.locator('#map path[fill="#ad91d4"]');
  assert.ok(await purple.count()>0,"Okadayama purple geometry missing in Hirota");
  await page.screenshot({path:path.join(screenshotDir,columns===4?"mobile-hirota.png":"desktop-hirota.png"),fullPage:true});
  await page.locator("#fullscreen").click();
  assert.ok(await page.locator("body").evaluate(node=>node.classList.contains("map-full")));
  await page.locator("#fullscreen").click();
  assert.ok(!await page.locator("body").evaluate(node=>node.classList.contains("map-full")));
  await chooseRegion(page,"");
  await page.locator("#quizOne").click();
  const cityBounds=await page.locator("#map path.leaflet-interactive").first().boundingBox();
  assert.ok(cityBounds&&cityBounds.width>0);
  await page.locator("#quizQuit").click();
  assert.deepEqual(errors,[],"page runtime errors");
  console.log("PASS "+title+": regions, readings, 4/5 columns, zoom, quiz 1/2, retry, Okadayama, fullscreen");
 }finally{await browser.close()}
}
async function hierarchyFlow(browserType,title,viewport){
 const browser=await browserType.launch({headless:true});
 const page=await browser.newPage({viewport,deviceScaleFactor:2,hasTouch:viewport.width<620,isMobile:viewport.width<620});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(base+"/v2/geography/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="世界");
  await page.locator('a[href="#jp"]').click();
  await page.locator('a[href="#jp-hyogo"]').click();
  await page.locator('a[href="#jp-hyogo-nishinomiya"]').last().click();
  await page.locator('a[href="#towns:jp-hyogo-nishinomiya"]').last().click();
  await page.locator("#townFilter").waitFor();
  await page.locator("#townFilter").fill("岡田山");
  assert.equal(await page.locator("#towns a").count(),1);
  await page.locator("#towns a").click();
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="岡田山");
  assert.equal(await page.locator("#placeName").textContent(),"岡田山");
  assert.match(await page.locator("#placeReading").textContent(),/おかだやま/);
  const focus=page.locator('a[href*="nishinomiya-town-study-c.html?town="]');
  assert.equal(await focus.count(),1);
  await focus.click();
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("階層ナビゲーションから"));
  assert.match(await page.locator("#status").textContent(),/岡田山/);
  assert.ok((await page.locator("#hierarchyReturn").getAttribute("href")).includes("town:jp-hyogo-nishinomiya"));
  await page.locator("#hierarchyReturn").click();
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="岡田山");
  assert.deepEqual(errors,[],"browser errors in hierarchy flow");
  console.log("PASS "+title+": world > Japan > Hyogo > Nishinomiya > Okadayama > focused C map > return");
 }finally{await browser.close()}
}
async function takarazukaFlow(browserType,title,viewport){
 const browser=await browserType.launch({headless:true});
 const page=await browser.newPage({viewport,deviceScaleFactor:2,hasTouch:viewport.width<620,isMobile:viewport.width<620});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(base+"/v2/geography/#jp-hyogo-takarazuka",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="宝塚市");
  await page.locator('a[href="#towns:jp-hyogo-takarazuka"]').last().click();
  await page.locator("#townFilter").waitFor();
  await page.locator("#townFilter").fill("すみれガ丘");
  await page.waitForFunction(()=>document.querySelector("#towns a")?.textContent.includes("すみれガ丘"));
  assert.equal(await page.locator("#towns a").count(),1);
  await page.locator("#towns a").click();
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="すみれガ丘");
  assert.match(await page.locator("#placeReading").textContent(),/すみれがおか/);
  const focus=page.locator('a[href*="takarazuka/town-search.html?q="]');
  assert.equal(await focus.count(),1);
  await focus.click();
  await page.waitForFunction(()=>document.querySelector("#townSearch")?.value==="すみれガ丘");
  await page.waitForFunction(()=>document.querySelector("#selectedName")?.textContent.includes("すみれガ丘"));
  assert.deepEqual(errors,[],"browser errors in Takarazuka flow");
  console.log("PASS "+title+": Takarazuka 125-town reading list > unique town > existing q-search auto-focus");
 }finally{await browser.close()}
}
async function amagasakiFlow(browserType,title,viewport){
 const browser=await browserType.launch({headless:true});
 const page=await browser.newPage({viewport,deviceScaleFactor:2,hasTouch:viewport.width<620,isMobile:viewport.width<620});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(base+"/v2/geography/#jp-hyogo-amagasaki",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="尼崎市");
  await page.locator('a[href="#towns:jp-hyogo-amagasaki"]').last().click();
  await page.locator("#townFilter").waitFor();
  await page.locator("#townFilter").fill("かみけま");
  await page.waitForFunction(()=>document.querySelector("#towns a")?.textContent.includes("上食満"));
  assert.equal(await page.locator("#towns a").count(),1);
  await page.locator("#towns a").click();
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="上食満");
  assert.match(await page.locator("#placeReading").textContent(),/かみけま/);
  const focus=page.locator('a[href*="/v2/geography/amagasaki-focus.html?town="]');
  assert.equal(await focus.count(),1);
  await focus.click();
  await page.waitForFunction(()=>document.querySelector("#bridgeStatus")?.textContent.includes("元の地図で拡大・点滅表示"));
  const frame=page.frameLocator("#legacyMap");
  assert.equal(await frame.locator("#selectedName").textContent(),"上食満");
  assert.match(await frame.locator("#status").textContent(),/上食満を地図に表示/);
  await page.locator("#backTown").click();
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="上食満");
  assert.deepEqual(errors,[],"browser errors in Amagasaki flow");
  console.log("PASS "+title+": Amagasaki 140-town list > 上食満 > unchanged legacy SVG selected > hierarchy return");
 }finally{await browser.close()}
}
async function itamiFlow(browserType,title,viewport){
 const browser=await browserType.launch({headless:true});
 const page=await browser.newPage({viewport,deviceScaleFactor:2,hasTouch:viewport.width<620,isMobile:viewport.width<620});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(base+"/v2/geography/#jp-hyogo-itami",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="伊丹市");
  await page.locator('a[href="#towns:jp-hyogo-itami"]').last().click();
  await page.locator("#townFilter").waitFor();
  for(const [town,reading] of [["東桑津","ひがしくわづ"],["小阪田","おさかでん"]]){
   await page.locator("#townFilter").fill(town);
   await page.waitForFunction(name=>document.querySelector("#towns a")?.textContent.includes(name),town);
   assert.equal(await page.locator("#towns a").count(),1);
   await page.locator("#towns a").click();
   await page.waitForFunction(name=>document.querySelector("#placeName")?.textContent===name,town);
   assert.match(await page.locator("#placeReading").textContent(),new RegExp(reading));
   const focus=page.locator('a[href*="/v2/geography/itami-focus.html?town="]');
   assert.equal(await focus.count(),1);
   await focus.click();
   await page.waitForFunction(name=>document.querySelector("#bridgeStatus")?.textContent.includes(name)&&document.querySelector("#bridgeStatus")?.textContent.includes("文字アンカー"),town);
   const frame=page.frameLocator("#legacyMap");
   assert.equal(await frame.locator("#selectedName").textContent(),town);
   assert.equal(await frame.locator('.town.selected').count(),0);
   assert.equal(await frame.locator('text[data-name].selected').count(),1);
   await page.locator("#backTown").click();
   await page.waitForFunction(name=>document.querySelector("#placeName")?.textContent===name,town);
   await page.locator('a[href="#towns:jp-hyogo-itami"]').last().click();
   await page.locator("#townFilter").waitFor();
  }
  assert.deepEqual(errors,[],"browser errors in Itami flow");
  console.log("PASS "+title+": Itami 76 towns > two text-only towns > old SVG text-anchor focused > return");
 }finally{await browser.close()}
}
async function ashiyaFlow(browserType,title,viewport){
 const browser=await browserType.launch({headless:true});
 const page=await browser.newPage({viewport,deviceScaleFactor:2,hasTouch:viewport.width<620,isMobile:viewport.width<620});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(base+"/v2/geography/#jp-hyogo-ashiya",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="芦屋市");
  await page.locator('a[href="#towns:jp-hyogo-ashiya"]').last().click();
  await page.locator("#townFilter").waitFor();
  await page.locator("#townFilter").fill("南浜町");
  await page.waitForFunction(()=>document.querySelector("#towns a")?.textContent.includes("南浜町"));
  assert.equal(await page.locator("#towns a").count(),1);
  await page.locator("#towns a").click();
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="南浜町");
  assert.match(await page.locator("#placeReading").textContent(),/みなみはまちょう/);
  const focus=page.locator('a[href*="/v2/geography/ashiya-focus.html?town="]');
  assert.equal(await focus.count(),1);
  await focus.click();
  await page.waitForFunction(()=>document.querySelector("#bridgeStatus")?.textContent.includes("芦屋市の既存地図で拡大・点滅表示"));
  const frame=page.frameLocator("#legacyMap");
  assert.equal(await frame.locator("#selectedName").textContent(),"南浜町");
  assert.match(await frame.locator("#status").textContent(),/南浜町を地図に表示/);
  assert.equal(await frame.locator(".town.selected").count(),1);
  await page.locator("#backTown").click();
  await page.waitForFunction(()=>document.querySelector("#placeName")?.textContent==="南浜町");
  assert.deepEqual(errors,[],"browser errors in Ashiya flow");
  console.log("PASS "+title+": Ashiya 59 towns > 南浜町 > unchanged SVG selection > hierarchy return");
 }finally{await browser.close()}
}
(async()=>{
 await basicFlow(chromium,"Chromium desktop",{width:1280,height:820},5);
 await basicFlow(webkit,"WebKit mobile viewport",{width:390,height:844},4);
 await hierarchyFlow(chromium,"Chromium desktop",{width:1280,height:820});
 await hierarchyFlow(webkit,"WebKit mobile viewport",{width:390,height:844});
 await takarazukaFlow(chromium,"Chromium desktop",{width:1280,height:820});
 await takarazukaFlow(webkit,"WebKit mobile viewport",{width:390,height:844});
 await amagasakiFlow(chromium,"Chromium desktop",{width:1280,height:820});
 await amagasakiFlow(webkit,"WebKit mobile viewport",{width:390,height:844});
 await itamiFlow(chromium,"Chromium desktop",{width:1280,height:820});
 await itamiFlow(webkit,"WebKit mobile viewport",{width:390,height:844});
 await ashiyaFlow(chromium,"Chromium desktop",{width:1280,height:820});
 await ashiyaFlow(webkit,"WebKit mobile viewport",{width:390,height:844});
})().catch(e=>{console.error(e);process.exitCode=1});
