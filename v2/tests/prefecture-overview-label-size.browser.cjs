'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {start}=require('./helpers/nationwide-browser.cjs');

const CASES=[
 {name:'大阪府',pref:'27',region:'27127'},
 {name:'京都府',pref:'26',region:'26109'},
 {name:'兵庫県',pref:'28',region:'28109'}
];
const SHOTS=process.env.KUSSOON_BROWSER_ARTIFACTS||'/tmp/prefecture-overview-label-size';

async function inspect(page){
 return page.locator('#map').evaluate(svg=>{
  const layer=svg.querySelector('[data-v2-labels]');
  const groups=[...(layer?.children||[])];
  const rects=groups.map(group=>group.getBoundingClientRect());
  let overlapPairs=0;
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
   const w=Math.min(rects[i].right,rects[j].right)-Math.max(rects[i].left,rects[j].left);
   const h=Math.min(rects[i].bottom,rects[j].bottom)-Math.max(rects[i].top,rects[j].top);
   if(w>1&&h>1)overlapPairs++;
  }
  const svgRect=svg.getBoundingClientRect();
  const clipped=rects.filter(r=>r.right<svgRect.left||r.left>svgRect.right||r.bottom<svgRect.top||r.top>svgRect.bottom).length;
  const transforms=groups.map(g=>g.getAttribute('transform')||'');
  const sizes=[...new Set([...layer.querySelectorAll('text')].map(t=>t.getAttribute('font-size')))].sort((a,b)=>Number(a)-Number(b));
  return {labelCount:groups.length,overlapPairs,clipped,transforms,sizes};
 });
}

(async()=>{
 await fs.mkdir(SHOTS,{recursive:true});
 const scenarios=[
  {name:'mobile-webkit',engine:'webkit',contextOptions:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}},
  {name:'desktop-chromium',engine:'chromium',contextOptions:{viewport:{width:1365,height:900},deviceScaleFactor:1}}
 ];
 for(const scenario of scenarios){
  const app=await start(scenario),page=app.page;
  try{
   await app.open();
   await page.goto(page.url().replace('/v2/national/official-2026-nationwide-pilot.html','/maps/national-municipalities.html'));
   await page.waitForFunction(()=>window.KussoonV2PlaceLabels&&window.KussoonV2EstablishedLabelAdapter&&document.querySelector('#prefTrigger')&&document.querySelector('#map .prefecture'));
   for(const item of CASES){
    await page.locator('#prefTrigger').click();
    await page.getByRole('button',{name:item.name,exact:true}).click();
    await page.waitForFunction(({pref})=>document.querySelector('#pref')?.value===pref&&
      document.querySelector('#regionTrigger')&&!document.querySelector('#regionTrigger').disabled&&
      !!document.querySelector('#map [data-v2-labels]'),item);
    const option=await page.locator('#region option[value="'+item.region+'"]').textContent();
    assert(option,'test municipality exists for '+item.name+' '+item.region);
    const overview=await inspect(page);
    assert.equal(overview.labelCount,Number(await page.locator('#region option:not([value=""])').count()),item.name+' labels shown in prefecture overview');
    assert(overview.transforms.length&&overview.transforms.every(t=>t.endsWith('scale(0.78)')),item.name+' overview applies 78% consistently');
    assert(overview.sizes.includes('14'),item.name+' source font remains unchanged before overview scaling');
    await page.locator('#map').screenshot({path:path.join(SHOTS,scenario.name+'-'+item.pref+'-overview.png')});

    await page.locator('#regionTrigger').click();
    await page.getByRole('button',{name:option,exact:true}).click();
    await page.waitForFunction(code=>document.querySelector('#region')?.value===code&&document.querySelector('#map .chosen[data-code="'+code+'"]'),item.region);
    const selected=await inspect(page);
    assert(selected.transforms.length&&selected.transforms.every(t=>!t.includes('scale(')),item.name+' selection restores 1.00x labels');
    assert(selected.sizes.includes('18'),item.name+' selected municipality retains established 18px label');
    await page.locator('#map').screenshot({path:path.join(SHOTS,scenario.name+'-'+item.pref+'-selected.png')});
    console.log('PASS',scenario.name,item.name,JSON.stringify({overview:{labels:overview.labelCount,overlaps:overview.overlapPairs,offscreen:overview.clipped,scale:'0.78'},selected:{labels:selected.labelCount,sizes:selected.sizes,scale:'1.00'}}));

    await page.locator('#prefBtn').click();
    await page.waitForFunction(pref=>document.querySelector('#region')?.value===''&&
      [...document.querySelectorAll('#map [data-v2-labels] > g')].every(g=>g.getAttribute('transform')?.endsWith('scale(0.78)')),item.pref);
   }
   assert.equal(app.errors.length,0,app.errors.join('; '));
  }finally{await app.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
