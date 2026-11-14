// Shared Hyogo region-top pilot: browser navigation, layout and missing-feature smoke.
"use strict";
const {chromium,webkit}=require("playwright"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const base=process.argv[2]||"http://127.0.0.1:8765";
const out=path.resolve(process.env.REGION_TOP_SCREENSHOTS||"region-top-screenshots");
fs.mkdirSync(out,{recursive:true});
const views=[
 {label:"webkit-320",browser:webkit,width:320,height:700,mobile:true},
 {label:"webkit-390",browser:webkit,width:390,height:844,mobile:true},
 {label:"chromium-768",browser:chromium,width:768,height:1024,mobile:false},
 {label:"chromium-1280",browser:chromium,width:1280,height:800,mobile:false}
];
const cases=[
 {id:"jp-hyogo",name:"兵庫県",existing:true,features:5},
 {id:"jp-hyogo-nishinomiya",name:"西宮市",existing:true,features:7,counts:321},
 {id:"jp-hyogo-takarazuka",name:"宝塚市",existing:true,features:4,counts:125},
 {id:"jp-hyogo-amagasaki",name:"尼崎市",existing:true,features:3,counts:140},
 {id:"jp-hyogo-itami",name:"伊丹市",existing:true,features:2,counts:76},
 {id:"jp-hyogo-ashiya",name:"芦屋市",existing:true,features:2,counts:59},
 {id:"jp-hyogo-kawanishi",name:"川西市",existing:false,features:0},
 {id:"jp-hyogo-sanda",name:"三田市",existing:false,features:0},
 {id:"jp-hyogo-inagawa",name:"猪名川町",existing:false,features:0}
];
async function run(view){
 const browser=await view.browser.launch({headless:true});
 const page=await browser.newPage({viewport:{width:view.width,height:view.height},isMobile:view.mobile,hasTouch:view.mobile,deviceScaleFactor:2});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const c of cases){
   await page.goto(base+"/v2/region-top/?region="+c.id,{waitUntil:"domcontentloaded"});
   await page.waitForFunction(name=>document.querySelector("#regionName")?.textContent===name,c.name);
   const links=page.locator("#featureList a.action");
   assert.equal(await links.count(),c.features,c.name+" link count");
   assert.equal(await page.locator("#breadcrumbs [aria-current='page']").count(),1,c.name+" current breadcrumb");
   assert.equal(await page.locator('#regionMenu a[aria-current="page"]').count(),1,c.name+" selected menu");
   if(c.existing){
    assert.equal(await page.locator("#comparison a").count(),2,c.name+" existing top compare links");
    if(c.counts){
     assert.equal(await page.locator("#townLinks a").count(),1,c.name+" town hierarchy link");
     assert.match(await page.locator("#townDescription").textContent(),new RegExp(String(c.counts)));
    }else assert.equal(await page.locator("#townSection").isVisible(),false);
   }else{
    assert.equal(await page.locator("#comparison a").count(),0,c.name+" must not invent original top");
    assert.equal(await page.locator("#townLinks a").count(),0,c.name+" must not invent town map");
    assert.match(await page.locator("#townDescription").textContent(),/未接続/);
    assert.match(await page.locator("#featureStatus").textContent(),/未接続/);
   }
   const rect=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,
    rootWidth:document.querySelector("main").getBoundingClientRect().width
   }));
   assert.ok(rect.scroll<=rect.width+2,view.label+" "+c.name+" overflow "+JSON.stringify(rect));
   if(["jp-hyogo-nishinomiya","jp-hyogo-kawanishi"].includes(c.id)){
    await page.screenshot({path:path.join(out,view.label+"-"+c.id+".png"),fullPage:true});
   }
  }
  // Mouse/touch path through UI, including switching city and back to compare.
  await page.goto(base+"/v2/region-top/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#regionName")?.textContent==="西宮市");
  await page.locator('#regionMenu a[href*="jp-hyogo-sanda"]').click();
  await page.waitForFunction(()=>document.querySelector("#regionName")?.textContent==="三田市");
  await page.locator('#regionMenu a[href*="jp-hyogo-nishinomiya"]').click();
  await page.waitForFunction(()=>document.querySelector("#regionName")?.textContent==="西宮市");
  assert.equal(await page.locator("#comparison a").first().getAttribute("href"),"/nishinomiya/");
  assert.deepEqual(errors,[],view.label+" JS exceptions");
  console.log("PASS "+view.label+": 9 region tops, existing links, unconnected regions marked, horizontal layout, navigation");
 }finally{await browser.close()}
}
(async()=>{for(const v of views)await run(v)})().catch(e=>{console.error(e);process.exitCode=1});
