'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {start}=require('./helpers/nationwide-browser.cjs');

const CASES=[
 {name:'大阪府',pref:'27',region:'27127',count:72},
 {name:'京都府',pref:'26',region:'26109',count:36},
 {name:'兵庫県',pref:'28',region:'28109',count:49}
];
const SHOTS=process.env.KUSSOON_BROWSER_ARTIFACTS||'/tmp/prefecture-overview-label-size';

async function inspect(page){
 return page.locator('#map').evaluate(svg=>{
  const layer=svg.querySelector('[data-v2-labels]');
  const groups=[...(layer?.children||[])];
  const groupRects=groups.map(group=>group.getBoundingClientRect());
  const texts=groups.flatMap((group,index)=>[...group.querySelectorAll('text')].map(node=>({group:index,rect:node.getBoundingClientRect()})));
  let overlapPairs=0;
  for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
   if(texts[i].group===texts[j].group)continue;
   const a=texts[i].rect,b=texts[j].rect;
   const w=Math.min(a.right,b.right)-Math.max(a.left,b.left);
   const h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
   if(w>1&&h>1)overlapPairs++;
  }
  const svgRect=svg.getBoundingClientRect();
  const clipped=groupRects.filter(r=>r.right<svgRect.left||r.left>svgRect.right||r.bottom<svgRect.top||r.top>svgRect.bottom).length;
  const transforms=groups.map(g=>g.getAttribute('transform')||'');
  const sizes=[...new Set([...layer.querySelectorAll('text')].map(t=>t.getAttribute('font-size')))].sort((a,b)=>Number(a)-Number(b));
  const matrix=svg.getScreenCTM();
  return {labelCount:groups.length,overlapPairs,clipped,transforms,sizes,screenScale:Math.abs(matrix?.a||1)};
 });
}
async function firstTextPixelHeight(page){
 return page.locator('#map [data-v2-labels] text').first().evaluate(node=>node.getBoundingClientRect().height);
}
function assertScreenSizeStaysFixed(result,baseScale,label){
 const scales=result.transforms.map(t=>Number(t.match(/scale\(([^)]+)\)$/)?.[1]||1));
 assert(scales.length&&scales.every(scale=>Math.abs(scale*result.screenScale-baseScale)<.002),label+' label render scale tracks the actual SVG screen scale');
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
    await page.waitForFunction(({pref,count})=>document.querySelector('#pref')?.value===pref&&
      document.querySelector('#regionTrigger')&&!document.querySelector('#regionTrigger').disabled&&
      document.querySelectorAll('#region option:not([value=\"\"])').length===count&&
      document.querySelectorAll('#map [data-v2-labels] > g').length===count,item);
    const option=await page.locator('#region option[value="'+item.region+'"]').textContent();
    assert(option,'test municipality exists for '+item.name+' '+item.region);
    const overview=await inspect(page);
    assert.equal(overview.labelCount,Number(await page.locator('#region option:not([value=""])').count()),item.name+' labels shown in prefecture overview');
    assertScreenSizeStaysFixed(overview,.78,item.name+' overview');
    assert(overview.sizes.includes('14'),item.name+' source font remains unchanged before overview scaling');
    await page.locator('#map').screenshot({path:path.join(SHOTS,scenario.name+'-'+item.pref+'-overview.png')});

    await page.locator('#mapReadingToggle').click();
    await page.waitForFunction(()=>document.querySelector('#readingMode')?.value==='on');
    const readingHeight=await firstTextPixelHeight(page);
    const reading=await inspect(page);
    assertScreenSizeStaysFixed(reading,.78,item.name+' overview with readings');
    for(let i=0;i<3;i++)await page.locator('#mapZoomIn').click();
    const zoomedHeight=await firstTextPixelHeight(page),zoomed=await inspect(page);
    assert(Math.abs(zoomedHeight-readingHeight)<.5,item.name+' reading text remains the same screen size while zooming');
    assertScreenSizeStaysFixed(zoomed,.78,item.name+' zoomed overview');
    await page.locator('#map').screenshot({path:path.join(SHOTS,scenario.name+'-'+item.pref+'-overview-zoomed.png')});
    for(let i=0;i<3;i++)await page.locator('#mapZoomOut').click();
    await page.locator('#mapReset').click();
    await page.waitForFunction(()=>document.querySelector('#readingMode')?.value==='on'&&
      Math.abs(850/Number(document.querySelector('#map').getAttribute('viewBox').split(/\s+/)[2])-1)<.001);
    await page.locator('#mapReadingToggle').click();
    await page.waitForFunction(()=>document.querySelector('#readingMode')?.value==='off');

    // Selecting a municipality while zoomed must reset before its label layout is measured.
    await page.locator('#mapZoomIn').click();
    await page.locator('#mapZoomIn').click();
    await page.locator('#regionTrigger').click();
    await page.getByRole('button',{name:option,exact:true}).click();
    await page.waitForFunction(code=>document.querySelector('#region')?.value===code&&document.querySelector('#map .chosen[data-code="'+code+'"]'),item.region);
    const selected=await inspect(page);
    assertScreenSizeStaysFixed(selected,1,item.name+' selection restores original label size');
    assert(selected.sizes.includes('18'),item.name+' selected municipality retains established 18px label');
    await page.locator('#map').screenshot({path:path.join(SHOTS,scenario.name+'-'+item.pref+'-selected.png')});
    const selectedTextHeight=await firstTextPixelHeight(page);
    await page.locator('#mapZoomIn').click();
    const selectedZoomHeight=await firstTextPixelHeight(page),selectedZoom=await inspect(page);
    assert(Math.abs(selectedZoomHeight-selectedTextHeight)<.5,item.name+' selected labels remain the same screen size while zooming');
    assertScreenSizeStaysFixed(selectedZoom,1,item.name+' zoomed selection');
    await page.locator('#map').screenshot({path:path.join(SHOTS,scenario.name+'-'+item.pref+'-selected-zoomed.png')});
    await page.locator('#mapReset').click();
    console.log('PASS',scenario.name,item.name,JSON.stringify({overview:{labels:overview.labelCount,overlaps:overview.overlapPairs,offscreen:overview.clipped,scale:'0.78'},selected:{labels:selected.labelCount,sizes:selected.sizes,scale:'1.00'}}));

    await page.locator('#prefBtn').click();
    await page.waitForFunction(pref=>document.querySelector('#region')?.value===''&&
      document.querySelectorAll('#map [data-v2-labels] > g').length>0,item.pref);
    assertScreenSizeStaysFixed(await inspect(page),.78,item.name+' prefecture return restores compact labels');
   }
   assert.equal(app.errors.length,0,app.errors.join('; '));
  }finally{await app.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
