'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:8765';
async function run(engine,width,height,pageName){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/v2/'+pageName,{waitUntil:'domcontentloaded',timeout:60000});
  const isT=pageName.includes('takarazuka'),rail=isT?'.controls':'.toolbar';
  await page.waitForFunction(t=>document.querySelector('#communityCount')?.textContent.includes(t?'125':'321'),isT,{timeout:60000});
  async function check(label){
   const x=await page.evaluate(rail=>{
    const r=id=>{const b=document.querySelector(id).getBoundingClientRect();
     return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};
    const ids=['#frame','#map','#fullscreen','#zoomIn','#zoomOut','#larger','#smaller','#reset','#size','#reading'];
    if(document.querySelector('#labelMode'))ids.push('#labelMode','#anchorMode');
    const rs=Object.fromEntries(ids.map(id=>[id,r(id)]));
    const buttons=[...document.querySelectorAll(rail+' button')];
    const measures=buttons.map(el=>{
     const cs=getComputedStyle(el),texts=el.textContent.split(String.fromCharCode(10)).filter(Boolean);
     const ctx=document.createElement('canvas').getContext('2d');ctx.font=cs.font;
     return {id:el.id,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,
       maxTextWidth:Math.max(...texts.map(t=>ctx.measureText(t).width)),
       contentWidth:el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)};
    });
    return {rs,buttons:measures,rail:r(rail),railScroll:document.querySelector(rail).scrollHeight,
      railClient:document.querySelector(rail).clientHeight,reading:document.querySelector('#reading').textContent,
      size:document.querySelector('#size').textContent,reset:document.querySelector('#reset').textContent};
   },rail);
   const q=x.rs;
   // Main map extends to both frame edges (no side gutter), including fullscreen.
   assert.ok(Math.abs(q['#map'].width-q['#frame'].width)<=4,label+' full width map');
   assert.ok(q['#map'].left<=q['#fullscreen'].left&&q['#map'].right>=q['#fullscreen'].right,
     label+' fullscreen overlays the map');
   assert.ok(Math.abs(q['#fullscreen'].top-q['#frame'].top)<=9,label+' fullscreen remains at map top');
   assert.ok(Math.abs(q['#reading'].bottom-q['#frame'].bottom)<=13,label+' lower controls sit at map bottom');
   assert.ok(q['#fullscreen'].bottom<q['#zoomIn'].top,label+' fullscreen separate from bottom controls');
   for(const id of ['#zoomIn','#zoomOut','#larger','#smaller','#reset','#size','#reading']){
    assert.ok(q['#map'].left<=q[id].left&&q['#map'].right>=q[id].right,label+' '+id+' overlays inside map');
   }
   assert.ok(q['#zoomIn'].top<q['#zoomOut'].top,label+' map plus must be above minus');
   assert.ok(q['#larger'].top<q['#smaller'].top,label+' text plus must be above minus');
   for(const b of x.buttons){
    assert.ok(Math.abs(b.width-49)<=1,label+' width '+b.id+' '+b.width);
    assert.ok(b.maxTextWidth<=b.contentWidth+1,label+' text fit '+b.id+' '+JSON.stringify(b));
   }
   assert.ok(q['#fullscreen'].height<=32,label+' fullscreen compact height');
   assert.ok(q['#zoomIn'].height<=32&&q['#zoomOut'].height<=32,label+' compact zoom buttons');
   assert.ok(q['#size'].height<=50&&q['#reading'].height<=50,label+' compact three-line heights');
   assert.ok(x.railScroll<=x.railClient+2,label+' bottom controls fit without rail scrolling');
   assert.match(x.size,/^文字\n\d+\n％$/);
   assert.match(x.reading,/^よみ\nがな\n(ON|OFF)$/);
   assert.ok(x.reset.includes('\n'),label+' region reset remains two lines');
   return x;
  }
  await check('initial');
  await page.locator('#zoomIn').click();
  await page.locator('#zoomOut').click();
  await page.locator('#larger').click();
  await check('larger');
  await page.locator('#smaller').click();
  await page.locator('#size').click();
  await page.locator('#reading').click();
  await check('reading on');
  await page.locator('#fullscreen').click();
  await page.waitForTimeout(160);
  await check('fullscreen');
  await page.locator('#fullscreen').click();
  await page.waitForTimeout(160);
  await check('after fullscreen');
  assert.deepEqual(errors,[],pageName+' browser script errors');
  console.log('PASS full-width compact overlay '+pageName+' '+width+'x'+height);
 }finally{await browser.close()}
}
(async()=>{
 for(const path of ['nishinomiya-town-overlay-bottom-pilot.html','takarazuka-town-overlay-bottom-pilot.html']){
  await run(chromium,1280,820,path);
  await run(webkit,390,844,path);
  await run(webkit,320,720,path);
 }
})().catch(e=>{console.error(e);process.exit(1)});
