// Browser regression for geography comparison A/B (not a physical iPhone).
"use strict";
const {chromium,webkit}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const base=process.argv[2]||"http://127.0.0.1:8765";
const output=path.resolve(process.env.GEOGRAPHY_AB_SCREENSHOTS||"geography-ab-screenshots");
fs.mkdirSync(output,{recursive:true});
const cities=[
 ["jp-hyogo-nishinomiya","西宮市","岡田山","おかだやま"],
 ["jp-hyogo-takarazuka","宝塚市","すみれガ丘","すみれがおか"],
 ["jp-hyogo-amagasaki","尼崎市","上食満","かみけま"],
 ["jp-hyogo-itami","伊丹市","東桑津","ひがしくわづ"],
 ["jp-hyogo-ashiya","芦屋市","南浜町","みなみはまちょう"]
];
const sizes=[{name:"320-webkit",width:320,height:700,engine:webkit,mobile:true},{name:"390-webkit",width:390,height:844,engine:webkit,mobile:true},{name:"768-chromium",width:768,height:1024,engine:chromium,mobile:false},{name:"1280-chromium",width:1280,height:800,engine:chromium,mobile:false}];
async function testSize(x){
 const browser=await x.engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:x.width,height:x.height},hasTouch:x.mobile,isMobile:x.mobile,deviceScaleFactor:2});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const [id,city,town,reading] of cities){
   const original="#towns:"+id;
   const checks=[];
   for(const [label,url,readingPx,aria] of [["A","/v2/geography/ui-before-b.html",11,false],["B","/v2/geography/",13,true]]){
    await page.goto(base+url+original,{waitUntil:"domcontentloaded",timeout:45000});
    await page.locator("#townFilter").waitFor();
    const v=await page.evaluate(()=>{
     const reading=document.querySelector("#towns a .reading"),links=[...document.querySelectorAll("#towns a")];
     return {px:parseFloat(getComputedStyle(reading).fontSize),
      bodyWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
      current:[...document.querySelectorAll("#breadcrumbs [aria-current='page']")].map(e=>e.textContent),
      layout:links.slice(0,35).map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))
     };
    });
    assert.equal(v.px,readingPx,city+" "+label+" text size");
    assert.deepEqual(v.current,aria?["町名"]:[],city+" "+label+" current breadcrumb");
    assert.ok(v.scrollWidth<=v.bodyWidth+2,city+" "+label+" horizontal scroll "+JSON.stringify(v));
    assert.ok(v.layout.every(a=>a.height>=44),city+" "+label+" town button tap target");
    assert.equal(await page.locator("#towns a").count(),35,"35-result cap");
    await page.locator("#townFilter").fill(town);
    await page.waitForFunction(name=>document.querySelector("#towns a")?.textContent.includes(name),town);
    await page.locator("#towns a").first().click();
    await page.waitForFunction(name=>document.querySelector("#placeName")?.textContent===name,town);
    assert.match(await page.locator("#placeReading").textContent(),new RegExp(reading));
    assert.deepEqual(await page.locator("#breadcrumbs [aria-current='page']").allTextContents(),aria?[town]:[],"town current");
    const urlA=await page.locator('a[href*="?"]').filter({hasText:town}).first().getAttribute("href");
    assert.ok(urlA,"Map action missing for "+city);
    await page.locator('a[href="#towns:'+id+'"]').last().click();
    await page.locator("#townFilter").waitFor();
    checks.push({label,selectedTown:town,referenceHref:urlA});
    if(city==="西宮市"&&x.width<=390)await page.screenshot({path:path.join(output,x.name+"-"+label.toLowerCase()+"-nishinomiya.png"),fullPage:true});
   }
   assert.equal(checks[0].referenceHref,checks[1].referenceHref,"A/B map destination changed: "+city);
  }
  await page.goto(base+"/v2/geography/ui-comparison.html",{waitUntil:"domcontentloaded"});
  await page.locator("#targetCity").selectOption("jp-hyogo-itami");
  assert.match(await page.locator("#linkB").getAttribute("href"),/towns:jp-hyogo-itami/);
  if(x.width<=700){
   await page.locator("#showB").click();
   assert.equal(await page.locator("#panelA").isVisible(),false);
   assert.equal(await page.locator("#panelB").isVisible(),true);
   await page.locator("#showA").click();
   assert.equal(await page.locator("#panelA").isVisible(),true);
   assert.equal(await page.locator("#panelB").isVisible(),false);
  }else{
   assert.equal(await page.locator("#panelA").isVisible(),true);
   assert.equal(await page.locator("#panelB").isVisible(),true);
  }
  assert.deepEqual(errors,[],"Unexpected JS errors: "+x.name);
  console.log("PASS "+x.name+": A/B sizes, current breadcrumbs, 35-limit, map links, 5-city return, comparison controls, no overflow");
 }finally{await browser.close()}
}
(async()=>{for(const x of sizes)await testSize(x)})().catch(e=>{console.error(e);process.exitCode=1});
