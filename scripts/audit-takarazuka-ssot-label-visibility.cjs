'use strict';
// Diagnostic only. Counts actual rendered SVG text, not candidate totals.
// TOWNMAP-SSOT-001 R-TOWN-13/14/20/21/23/40/44.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const host=process.env.TOWN_TEST_BASE||'http://127.0.0.1:8765';
const targets=[
 ['takarazuka','/v2/takarazuka-town-svg-ssot-quiz-crossover-20261118-pilot.html'],
 ['nishinomiya','/v2/nishinomiya-town-svg-master-v34-20261117-pilot.html']
];
const confs=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,720]];
const output='takarazuka-ssot-visibility-evidence';fs.mkdirSync(output,{recursive:true});
function fixed(v){return Math.round(v*100)/100}
async function analyze(page,scope,stage){
 const result=await page.evaluate(({scope,stage})=>{
  const map=document.querySelector('#map'),frame=document.querySelector('#frame');
  const m=map.getBoundingClientRect(),f=frame.getBoundingClientRect();
  const labels=[...document.querySelectorAll('#labels g.label')];
  const items=labels.map(el=>{
   const text=el.querySelector('text.town-label');
   const child=text?.querySelector('.town-name');
   const range=document.createRange();
   if(child)range.selectNodeContents(child);
   const g=child?range.getBoundingClientRect():el.getBoundingClientRect();
   const shown=el.dataset.visible==='true'&&getComputedStyle(el).display!=='none'&&g.width>0&&g.height>0;
   const clipped=shown&&(g.left<m.left||g.top<m.top||g.right>m.right||g.bottom>m.bottom);
   const intersects=shown&&g.right>m.left&&g.left<m.right&&g.bottom>m.top&&g.top<m.bottom;
   return {name:el.__data__?.name||child?.textContent||'',secondary:!!el.__data__?.secondary,shown,clipped,intersects,
    x:+(g.left-m.left).toFixed(2),y:+(g.top-m.top).toFixed(2),w:+g.width.toFixed(2),h:+g.height.toFixed(2),
    area:el.__data__?.componentArea??null};
  });
  const shown=items.filter(x=>x.shown);
  const clipped=shown.filter(x=>x.clipped);
  const visible=shown.filter(x=>x.intersects);
  const primaries=items.filter(x=>!x.secondary);
  const missingPrimary=primaries.filter(x=>!x.shown&&x.intersects);
  const overlaps=[];
  for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
   const a=visible[i],b=visible[j];
   const ox=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
   const oy=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
   if(ox>.5&&oy>.5){
    const area=ox*oy,ratio=area/Math.max(1,Math.min(a.w*a.h,b.w*b.h));
    if(ratio>.25)overlaps.push({a:a.name,b:b.name,ratio:+ratio.toFixed(3),area:+area.toFixed(1)});
   }
  }
  overlaps.sort((a,b)=>b.ratio-a.ratio);
  const controls=['fullscreen','zoomIn','zoomOut','larger','smaller','size','reset','reading']
    .map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return {id,top:+r.top.toFixed(2),left:+r.left.toFixed(2),bottom:+r.bottom.toFixed(2),
     width:+r.width.toFixed(2),height:+r.height.toFixed(2),inFrame:r.top>=f.top-2&&r.bottom<=f.bottom+2&&r.left>=f.left-2&&r.right<=f.right+2}});
  const countByName=Object.fromEntries(['鹿塩','切畑','長谷','芝辻新田','中筋','伊孑志','小林','中山五月台','花屋敷荘園','仁川月見ガ丘'].map(n=>[n,{
   candidates:items.filter(x=>x.name===n).length,shown:items.filter(x=>x.name===n&&x.shown).length,
   onscreen:items.filter(x=>x.name===n&&x.shown&&x.intersects).length}]));
  return {scope,stage,map:{width:+m.width.toFixed(2),height:+m.height.toFixed(2),frameWidth:+f.width.toFixed(2)},
   counts:{candidates:items.length,primary:primaries.length,shown:shown.length,intersecting:visible.length,clipped:clipped.length,
    uniqueShown:new Set(shown.map(x=>x.name)).size,overlaps25:overlaps.length,missingPrimary:missingPrimary.length},
   controlPosition:controls,clippedLabels:clipped.slice(0,25),topOverlaps:overlaps.slice(0,20),special:countByName};
 },{scope,stage});
 return result;
}
async function run([screen,engine,width,height]){
 const browser=await engine.launch({headless:true});
 try{
  for(const [scope,url] of targets){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(host+url,{waitUntil:'domcontentloaded',timeout:60000});
    const townCount=scope==='takarazuka'?125:321;
    await page.waitForFunction(n=>document.querySelector('#communityCount')?.textContent.includes(n+'町名'),townCount,{timeout:60000});
    await page.waitForTimeout(300);
    const states=[];
    async function snap(stage){
     let o=await analyze(page,scope,stage);states.push(o);
     console.log('TOWN_SSOT_LABEL_DIAG '+JSON.stringify({screen,...o}));
    }
    await snap('whole-initial');
    await page.locator('#zoomIn').click();await page.waitForTimeout(350);await snap('whole-zoom-plus');
    await page.locator('#reset').click();await page.waitForTimeout(250);await snap('whole-reset');
    await page.locator('#reading').click();await page.waitForTimeout(150);await snap('reading-on');
    await page.locator('#larger').click();await page.waitForTimeout(150);await snap('reading-plus-font');
    await page.locator('#reading').click();
    await page.locator('#size').click();
    if(scope==='takarazuka'){
     for(const region of ['仁川','西谷','長尾台','山本山手','宝塚第一']){
      await page.locator('#communityToggle').click();
      await page.evaluate(name=>{const b=[...document.querySelectorAll('#communityOptions button[data-community]')].find(b=>b.dataset.community===name);if(!b)throw Error('no region '+name);b.click()},region);
      await page.waitForTimeout(250);
      await snap('region-'+region);
     }
     await page.locator('#communityToggle').click();
     await page.evaluate(()=>document.querySelector('#communityOptions button[data-community=""]').click());
     await page.waitForTimeout(250);await snap('whole-restored');
    }else{
     for(const region of ['上ヶ原','甲東','山口']){
      await page.locator('#communityToggle').click();
      await page.evaluate(name=>{const b=[...document.querySelectorAll('#communityOptions button[data-community]')].find(b=>b.dataset.community===name);if(!b)throw Error('no region '+name);b.click()},region);
      await page.waitForTimeout(350);await snap('region-'+region);
     }
    }
    await page.locator('#fullscreen').click();await page.waitForTimeout(250);await snap('fullscreen');
    await page.locator('#fullscreen').click();
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,scope+'-'+screen+'.json'),JSON.stringify(states,null,2));
    await page.screenshot({path:path.join(output,scope+'-'+screen+'.png'),fullPage:true});
   }finally{await page.close()}
  }
 }finally{await browser.close()}
}
(async()=>{for(const c of confs)await run(c)})().catch(e=>{console.error(e);process.exitCode=1});
