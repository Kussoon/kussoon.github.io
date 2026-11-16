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
  const isT=pageName.includes('takarazuka');
  await page.waitForFunction(t=>document.querySelector(t?'#communityCount':'#communityCount')?.textContent.includes(t?'125':'321'),isT,{timeout:60000});
  const rail=isT?'.controls':'.toolbar';
  const measure=()=>page.evaluate(rail=>{
   const rect=id=>{const b=document.querySelector(id).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};
   const ids=['#map','#fullscreen','#zoomOut','#zoomIn','#smaller','#larger','#reset','#size','#reading'];
   if(document.querySelector('#labelMode'))ids.push('#labelMode','#anchorMode');
   const result=Object.fromEntries(ids.map(id=>[id,rect(id)]));
   const buttons=[...document.querySelectorAll(rail+' button')];
   return {result,scrollHeight:document.querySelector(rail).scrollHeight,
    clientHeight:document.querySelector(rail).clientHeight,
    buttonWidths:buttons.map(el=>[el.id,el.getBoundingClientRect().width]),
    size:document.querySelector('#size').textContent,
    reading:document.querySelector('#reading').textContent,
    reset:document.querySelector('#reset').textContent};
  },rail);
  const check=async label=>{
   const x=await measure(),q=x.result;
   assert.ok(q['#map'].right<=q['#fullscreen'].left,label+' fullscreen button does not overlay town map');
   for(const id of ['#zoomOut','#zoomIn','#smaller','#larger','#reset','#size','#reading']){
    assert.ok(q['#map'].right<=q[id].left,label+' '+id+' outside map');
   }
   for(const [id,w] of x.buttonWidths){
    assert.ok(Math.abs(w-49)<=1,
     label+' width of '+id+' = '+w);
   }
   assert.ok(q['#zoomOut'].top<q['#zoomIn'].top,label+' zoom minus above plus');
   assert.ok(q['#smaller'].top<q['#larger'].top,label+' text minus above plus');
   assert.match(x.size,/^文字\n\d+\n％$/);
   assert.match(x.reading,/^よみ\nがな\n(ON|OFF)$/);
   assert.equal(x.size.split('\n').length,3,label+' three-line percentage');
   assert.equal(x.reading.split('\n').length,3,label+' three-line readings');
   assert.ok(x.reset.includes('\n'),label+' two-line region reset');
   const actual=await page.evaluate(rail=>{
    const targets=['#size','#reading','#reset','#fullscreen'];
    return targets.map(id=>{
      const el=document.querySelector(id),styles=getComputedStyle(el);
      const texts=el.innerText.split('\\n').filter(Boolean);
      const canvas=document.createElement('canvas');
      const ctx=canvas.getContext('2d');
      ctx.font=styles.font;
      const maxTextWidth=Math.max(...texts.map(t=>ctx.measureText(t).width));
      return {id,font:styles.font,maxTextWidth,contentWidth:el.clientWidth-
       parseFloat(styles.paddingLeft)-parseFloat(styles.paddingRight)};
    });
   },rail);
   for(const el of actual)assert.ok(el.maxTextWidth<=el.contentWidth+1,
     label+' no clipped text in '+el.id+': '+JSON.stringify(el));
   return x;
  };
  await check('initial');
  await page.locator('#smaller').click();
  await check('smaller');
  await page.locator('#larger').click();
  await page.locator('#reading').click();
  await check('reading');
  await page.locator('#size').click();
  await check('size reset');
  await page.locator('#fullscreen').click();
  await check('fullscreen');
  await page.locator('#fullscreen').click();
  assert.deepEqual(errors,[]);
  console.log('PASS town buttons reserved rail '+pageName+' '+width);
 }finally{await browser.close()}
}
(async()=>{
 for(const path of ['nishinomiya-town-controls-narrow-pilot.html','takarazuka-town-controls-narrow-pilot.html']){
  await run(chromium,1280,820,path);
  await run(webkit,390,844,path);
  await run(webkit,320,720,path);
 }
})().catch(e=>{console.error(e);process.exit(1)});
