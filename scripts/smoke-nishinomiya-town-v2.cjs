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
(async()=>{
 await basicFlow(chromium,"Chromium desktop",{width:1280,height:820},5);
 await basicFlow(webkit,"WebKit mobile viewport",{width:390,height:844},4);
 await hierarchyFlow(chromium,"Chromium desktop",{width:1280,height:820});
 await hierarchyFlow(webkit,"WebKit mobile viewport",{width:390,height:844});
})().catch(e=>{console.error(e);process.exitCode=1});
